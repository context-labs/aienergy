"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { ModelCombobox } from "@/components/model-combobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { Loader2, DollarSign, Leaf, Settings, BarChart3, AlertCircle, Github, Twitter } from "lucide-react"
import Latex from "react-latex-next"

interface ModelData {
  name: string
  parameters_in_billions: number
  emissions_per_token_kWh: number
}

interface RegionData {
  name: string
  carbonIntensity: number // kg CO2/kWh
}

const regions: RegionData[] = [
  { name: "Iceland (Renewable Heavy)", carbonIntensity: 0.028 },
  { name: "Norway (Hydroelectric)",      carbonIntensity: 0.032 },
  { name: "France (Nuclear Heavy)",      carbonIntensity: 0.027 },
  { name: "Sweden (Mixed Renewable)",    carbonIntensity: 0.039 },
  { name: "Canada (Mixed)",              carbonIntensity: 0.137 },
  { name: "Google europe-north1",        carbonIntensity: 0.088 }, // Finland grid
  { name: "Brazil (Hydro Heavy)",        carbonIntensity: 0.103 },
  { name: "United Kingdom",              carbonIntensity: 0.237 },
  { name: "United States (Average)",     carbonIntensity: 0.345 },
  { name: "Google us-central1",          carbonIntensity: 0.243 }, // Iowa grid
  { name: "Japan",                       carbonIntensity: 0.463 },
  { name: "Germany",                     carbonIntensity: 0.321 },
  { name: "China (Coal Heavy)",          carbonIntensity: 0.510 },
  { name: "India (Coal Heavy)",          carbonIntensity: 0.636 },
  { name: "Australia (Coal Heavy)",      carbonIntensity: 0.482 },
  { name: "South Africa (Coal Heavy)",   carbonIntensity: 0.687 },
];

export default function AIEmissionsCalculator() {
  const [models, setModels] = useState<ModelData[]>([])
  // removed filteredModels and searchQuery; we will rely on combobox internal search
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ModelData | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<RegionData>(regions[9]) // US Average default
  // Default electricity price set to US average residential cost (~$0.152 per kWh)
  const [electricityPrice, setElectricityPrice] = useState([0.152])
  const [tokenCount, setTokenCount] = useState(1000000) // Default 1M tokens
  const [precision, setPrecision] = useState("FP16") // FP32, FP16, FP8
  const [pue, setPue] = useState([1.2]) // Power Usage Effectiveness

  useEffect(() => {
    fetchModels()
  }, [])

  // No longer maintaining filteredModels; selection handled within combobox

  const fetchModels = async () => {
    try {
      setError(null)
      const response = await fetch("/api/models")

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!Array.isArray(data)) {
        throw new Error("Invalid data format received")
      }

      setModels(data)
      if (data.length > 0) {
        setSelectedModel(data[0])
      }
    } catch (error) {
      console.error("Error fetching models:", error)
      setError("Failed to load models. Using fallback data.")

      // Set fallback data directly in the client if API fails completely
      const fallbackData: ModelData[] = [
        { name: "GPT-4 Turbo", parameters_in_billions: 175, emissions_per_token_kWh: 1.329e-6 },
        { name: "Claude-3 Opus", parameters_in_billions: 175, emissions_per_token_kWh: 1.329e-6 },
        { name: "Llama 2 70B", parameters_in_billions: 70, emissions_per_token_kWh: 5.316e-7 },
        { name: "Mixtral 8x7B", parameters_in_billions: 7, emissions_per_token_kWh: 5.316e-8 },
        { name: "Llama 2 13B", parameters_in_billions: 13, emissions_per_token_kWh: 9.872e-8 },
        { name: "Llama 2 7B", parameters_in_billions: 7, emissions_per_token_kWh: 5.316e-8 },
        { name: "Mistral 7B", parameters_in_billions: 7, emissions_per_token_kWh: 5.316e-8 },
      ]

      setModels(fallbackData)
      if (fallbackData.length > 0) {
        setSelectedModel(fallbackData[0])
      }
    } finally {
      setLoading(false)
    }
  }

  const calculateAdvancedMetrics = () => {
    if (!selectedModel)
      return {
        totalCost: 0,
        costPer1M: 0,
        totalEnergyKwh: 0,
        carbonEmissionsKg: 0,
        totalFlops: 0,
        energyPerToken: 0,
      }

    // Ensure parameter count is a valid positive number
    if (!Number.isFinite(selectedModel.parameters_in_billions) || selectedModel.parameters_in_billions <= 0) {
      return {
        totalCost: 0,
        costPer1M: 0,
        totalEnergyKwh: 0,
        carbonEmissionsKg: 0,
        totalFlops: 0,
        energyPerToken: 0,
      }
    }

    // FLOP-based calculation: ~2 FLOPs per parameter per token
    const totalFlops = 2 * selectedModel.parameters_in_billions * 1e9 * tokenCount

    // Hardware efficiency based on precision (FLOPs per Joule)
    // Based on NVIDIA H100 specs: ~9.89e14 FLOPs/sec at ~1500W including overhead
    const baseEfficiency = 6.59e11 // FLOPs per Joule (conservative estimate)

    // Precision multipliers
    const precisionMultipliers = {
      FP32: 1.0,
      FP16: 2.0, // Roughly double efficiency
      FP8: 4.0, // Roughly quadruple efficiency
    }

    const efficiency = baseEfficiency * precisionMultipliers[precision as keyof typeof precisionMultipliers]

    // Energy calculation in Joules, then convert to kWh
    const energyJoules = totalFlops / efficiency
    const energyKwhBase = energyJoules / 3.6e6 // Convert J to kWh

    // Apply PUE (Power Usage Effectiveness) for data center overhead
    const totalEnergyKwh = energyKwhBase * pue[0]

    // Cost calculation
    const totalCost = totalEnergyKwh * electricityPrice[0]
    const energyPer1M = (totalEnergyKwh / tokenCount) * 1000000
    const costPer1M = energyPer1M * electricityPrice[0]

    // Carbon emissions calculation
    const carbonEmissionsKg = totalEnergyKwh * selectedRegion.carbonIntensity

    const energyPerToken = totalEnergyKwh / tokenCount

    return {
      totalCost,
      costPer1M,
      totalEnergyKwh,
      carbonEmissionsKg,
      totalFlops,
      energyPerToken,
    }
  }

  const { totalCost, costPer1M, totalEnergyKwh, carbonEmissionsKg, totalFlops, energyPerToken } =
    calculateAdvancedMetrics()

  if (loading) {
    return (
      <div className="min-h-screen bg-color-1 flex items-center justify-center">
        <Card className="w-96 border-0 bg-white">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mr-3 text-color-3" />
            <span className="text-gray-600">Loading models...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-color-1">
        {/* Header */}
      <header className="bg-color-3 px-4 sm:px-8 py-6 sm:py-10 mx-5 my-4 rounded-xl">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-2">
            <span className="p-2 bg-color-2/20 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-7 w-7 sm:h-8 sm:w-8 text-color-2" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-color-2 tracking-tight">
              LLM Token Production Energy Cost Calculator
            </h1>
          </div>
          <p className="text-secondary-foreground text-base sm:text-lg max-w-2xl">
            Research-based calculations using FLOP analysis and geographic carbon intensity to estimate the environmental impact of AI model inference.
            <span className="ml-2 text-xs align-middle">
              <a
                href="https://github.com/mrmps/aienergy"
                className="underline text-color-3 hover:text-color-2"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View source on GitHub"
              >
                (GitHub)
              </a>
            </span>
          </p>
          {/* Inference.net call-to-action and social links */}
          <div className="mt-2 flex flex-col gap-1">
            <span className="bg-foreground/90 text-white text-xs sm:text-sm px-3 py-1.5 rounded-lg inline-block">
              Brought to you by{" "}
              <a
                href="https://inference.net"
                className="underline font-medium"
                target="_blank"
                rel="noopener noreferrer"
              >
                Inference.net
              </a>
            </span>
            <div className="flex items-center gap-3 pl-1 pt-1 text-color-2 text-sm">
              <a
                href="https://github.com/context-labs/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Inference.net GitHub"
                className="hover:text-color-3 transition-colors"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/inference_net"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Inference.net Twitter/X"
                className="hover:text-color-3 transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
            </div>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-color-2 bg-color-2/10 px-3 py-2 rounded-lg border border-color-2/20">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm break-words">{error}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Configuration Panel */}
          <Card className="lg:col-span-1 border border-color-7 bg-white">
            <CardHeader className="pb-4 bg-color-6 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Settings className="h-5 w-5 text-color-3" />
                Configuration
              </CardTitle>
              <CardDescription className="text-muted-foreground">Model parameters and infrastructure settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Model Combobox */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">Select Model ({models.length} available)</Label>
                <ModelCombobox
                  options={models.map((m) => ({ value: m.name, label: m.name }))}
                  value={selectedModel?.name || ""}
                  onValueChange={(value) => {
                    const model = models.find((m) => m.name === value)
                    setSelectedModel(model || null)
                  }}
                />
                {selectedModel && (
                  <p className="text-xs text-muted-foreground pt-0.5">
                    {selectedModel.parameters_in_billions.toLocaleString()}B parameters
                  </p>
                )}
                <p className="text-xs text-muted-foreground pt-1">
                  Models fetched from{" "}
                  <a
                    href="https://openrouter.ai/models"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-color-3"
                  >
                    OpenRouter
                  </a>
                </p>
              </div>

              {/* Token Count Input */}
              <div className="space-y-2">
                <Label htmlFor="token-count" className="text-sm font-medium text-muted-foreground">
                  Number of Tokens
                </Label>
                <Input
                  id="token-count"
                  type="number"
                  value={tokenCount}
                  onChange={(e) => setTokenCount(Number(e.target.value) || 0)}
                  placeholder="Enter token count"
                  className="border-color-7 focus:border-color-3 focus:ring-color-3 bg-white"
                />
              </div>

              {/* Precision Selection */}
              <div className="space-y-2">
                <Label htmlFor="precision" className="text-sm font-medium text-muted-foreground">
                  Floating Point{" "}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="underline cursor-help">Precision</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Precision refers to the number of bits used to represent floating-point numbers.
                        Lower precision (FP16/FP8) increases efficiency but may reduce numerical accuracy.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Select value={precision} onValueChange={setPrecision}>
                  <SelectTrigger className="border-color-7 focus:border-color-3 focus:ring-color-3 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-color-7">
                    <SelectItem value="FP32">FP32 (Full Precision)</SelectItem>
                    <SelectItem value="FP16">FP16 (Half Precision) - 2x efficiency</SelectItem>
                    <SelectItem value="FP8">FP8 (Quarter Precision) - 4x efficiency</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* PUE Slider */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">
                  Data Center{" "}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="underline cursor-help">PUE</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Power Usage Effectiveness — ratio of total facility energy to IT equipment energy.
                        1.0 is ideal; higher values indicate additional overhead.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  : {pue[0].toFixed(2)}
                </Label>
                <Slider
                  value={pue}
                  onValueChange={setPue}
                  max={2.5}
                  min={1.0}
                  step={0.1}
                  className="w-full [&_[role=slider]]:bg-color-3 [&_[role=slider]]:border-color-3"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1.0 (Perfect)</span>
                  <span>2.5 (Poor)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Economic Panel */}
          <Card className="lg:col-span-1 border border-color-7 bg-white">
            <CardHeader className="pb-4 bg-color-6 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <DollarSign className="h-5 w-5 text-color-3" />
                Economic Impact
              </CardTitle>
              <CardDescription className="text-muted-foreground">Electricity pricing and cost calculations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Electricity Price Slider */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-muted-foreground">
                  Electricity Price: ${electricityPrice[0].toFixed(3)} per kWh
                </Label>
                <Slider
                  value={electricityPrice}
                  onValueChange={setElectricityPrice}
                  max={0.5}
                  min={0.05}
                  step={0.001}
                  className="w-full [&_[role=slider]]:bg-color-3 [&_[role=slider]]:border-color-3"
                />
                {/* Min/Max labels */}
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>$0.05</span>
                  <span>$0.50</span>
                  </div>
                {/* US electricity price reference points */}
                <div className="flex justify-between mt-1">
                  <div className="flex flex-col items-center flex-1">
                    <span className="rounded px-1 py-0.5 bg-color-6 text-[0.7rem] font-mono text-color-3 mb-0.5">$0.094</span>
                    <span className="text-[0.65rem] text-muted-foreground">US Low</span>
                  </div>
                  <div className="flex flex-col items-center flex-1">
                    <span className="rounded px-1 py-0.5 bg-color-6 text-[0.7rem] font-mono text-color-3 mb-0.5">$0.152</span>
                    <span className="text-[0.65rem] text-muted-foreground">US Avg</span>
                  </div>
                  <div className="flex flex-col items-center flex-1">
                    <span className="rounded px-1 py-0.5 bg-color-6 text-[0.7rem] font-mono text-color-3 mb-0.5">$0.379</span>
                    <span className="text-[0.65rem] text-muted-foreground">US High</span>
                  </div>
                </div>
              </div>
              {selectedModel && (
                <>
                  {/* Cost Results */}
                  <div className="space-y-4">
                    <div className="p-4 bg-color-5 border border-color-7 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-color-3" />
                        <span className="font-semibold text-color-3">Total Cost</span>
                      </div>
                      {/* Mobile precision (<= md) */}
                      <p className="text-2xl font-bold text-foreground md:hidden">${totalCost.toFixed(6)}</p>
                      {/* Desktop high precision (>= md) */}
                      <p className="text-2xl font-bold text-foreground hidden md:block">${totalCost.toFixed(9)}</p>
                      <p className="text-sm text-muted-foreground">for {tokenCount.toLocaleString()} tokens</p>
                    </div>

                    <div className="p-4 bg-color-5 border border-color-7 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-4 w-4 text-color-3" />
                        <span className="font-semibold text-color-3">Cost per 1M Tokens</span>
                      </div>
                      {/* Mobile precision (<= md) */}
                      <p className="text-2xl font-bold text-foreground md:hidden">${costPer1M.toFixed(6)}</p>
                      {/* Desktop high precision (>= md) */}
                      <p className="text-2xl font-bold text-foreground hidden md:block">${costPer1M.toFixed(9)}</p>
                      <p className="text-sm text-muted-foreground">per million tokens</p>
                    </div>
                  </div>

                  {/* Energy Breakdown */}
                  <div className="p-4 bg-color-5 border border-color-7 rounded-xl">
                    <h4 className="font-semibold text-color-3 mb-2">Energy Analysis</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      {/* Mobile precision (<= md) */}
                      <p className="md:hidden">Total Energy: {totalEnergyKwh.toFixed(6)} kWh</p>
                      {/* Desktop high precision (>= md) */}
                      <p className="hidden md:block">Total Energy: {totalEnergyKwh.toFixed(9)} kWh</p>
                      <p>Energy per Token: {energyPerToken.toExponential(3)} kWh</p>
                      <p>
                        Total{" "}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline cursor-help">FLOPs</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Floating-Point Operations — fundamental arithmetic operations performed by the model.</p>
                          </TooltipContent>
                        </Tooltip>
                        : {totalFlops.toExponential(2)}
                      </p>
                      <p>Precision: {precision}</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Environmental Panel */}
          <Card className="lg:col-span-1 border border-color-7 bg-white">
            <CardHeader className="pb-4 bg-color-6 rounded-t-lg">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Leaf className="h-5 w-5 text-color-3" />
                Environmental Impact
              </CardTitle>
              <CardDescription className="text-muted-foreground">Carbon emissions based on grid location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              {/* Region Selection */}
              <div className="space-y-2">
                <Label htmlFor="region-select" className="text-sm font-medium text-muted-foreground">
                  Grid Region
                </Label>
                <Select
                  value={selectedRegion.name}
                  onValueChange={(value) => {
                    const region = regions.find((r) => r.name === value)
                    if (region) setSelectedRegion(region)
                  }}
                >
                  <SelectTrigger className="border-color-7 focus:border-color-3 focus:ring-color-3 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-color-7">
                    {regions.map((region) => (
                      <SelectItem key={region.name} value={region.name}>
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate">{region.name}</span>
                          <Badge variant="outline" className="ml-2 border-color-7 text-muted-foreground">
                            {region.carbonIntensity.toFixed(3)} kg/kWh
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedModel && (
                <>
                  {/* Carbon Emissions */}
                  <div className="p-4 bg-color-5 border border-color-7 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className="h-4 w-4 text-color-3" />
                      <span className="font-semibold text-color-3">Carbon Emissions</span>
                    </div>
                    {/* Mobile precision (<= md) */}
                    <p className="text-2xl font-bold text-foreground md:hidden">{carbonEmissionsKg.toFixed(6)} kg CO₂</p>
                    {/* Desktop high precision (>= md) */}
                    <p className="text-2xl font-bold text-foreground hidden md:block">{carbonEmissionsKg.toFixed(9)} kg CO₂</p>
                    <p className="text-sm text-muted-foreground">for {tokenCount.toLocaleString()} tokens</p>
                  </div>

                  {/* Emissions per 1M tokens */}
                  <div className="p-4 bg-color-5 border border-color-7 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Leaf className="h-4 w-4 text-color-3" />
                      <span className="font-semibold text-color-3">CO₂ per 1M Tokens</span>
                    </div>
                    {/* Mobile precision (<= md) */}
                    <p className="text-2xl font-bold text-foreground md:hidden">
                      {((carbonEmissionsKg / tokenCount) * 1000000).toFixed(6)} kg CO₂
                    </p>
                    {/* Desktop high precision (>= md) */}
                    <p className="text-2xl font-bold text-foreground hidden md:block">
                      {((carbonEmissionsKg / tokenCount) * 1000000).toFixed(9)} kg CO₂
                    </p>
                    <p className="text-sm text-muted-foreground">per million tokens</p>
                  </div>

                  {/* Grid Info */}
                  <div className="p-4 bg-color-7 border border-color-7 rounded-xl">
                    <h4 className="font-semibold text-foreground mb-2">Grid Information</h4>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>Region: {selectedRegion.name}</p>
                      <p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="underline cursor-help">Carbon&nbsp;Intensity</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Amount of CO₂ emitted per kilowatt-hour of electricity in this region.</p>
                          </TooltipContent>
                        </Tooltip>
                        : {selectedRegion.carbonIntensity.toFixed(3)} kg CO₂/kWh
                      </p>
                      <p>PUE Factor: {pue[0].toFixed(2)}x</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Import 'katex/dist/katex.min.css' at the top-level of your app, e.g. in _app.tsx or layout.tsx */}
        <Card className="mt-8 border border-color-7 bg-color-2">
          <CardContent className="p-6">
            <h3 className="font-semibold text-foreground mb-3">
              Calculation Methodology
            </h3>
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Energy Calculation:</strong>{" "}
                Uses FLOP-based analysis where each token requires approximately 2 FLOPs per model parameter.
                Energy consumption is calculated as:{" "}
                <Latex>{"$E = \\frac{2 \\times N_{params} \\times T}{\\eta}$"}</Latex>,
                where η is hardware efficiency in FLOPs/Joule.
              </p>
              <p>
                <strong>Carbon Emissions:</strong>{" "}
                Calculated as <Latex>{"$E_{kWh} \\times I_{grid}$"}</Latex>, where I<sub>grid</sub> is the region-specific carbon intensity in kg CO₂/kWh.
                Geographic variation accounts for different energy mixes (renewable vs. fossil fuels).
              </p>
              <p>
                <strong>Hardware Assumptions:</strong>{" "}
                Based on NVIDIA H100 specifications (~<Latex>{"$6.59 \\times 10^{11}$"}</Latex> FLOPs/Joule, conservative estimate).
                Precision improvements (FP16/FP8) increase efficiency by 2×/4× respectively.
              </p>
              <span className="text-xs mt-3 text-muted-foreground block">
                Sources:{" "}
                <a
                  href="https://www.arxiv.org/pdf/2507.11417.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-blue-600 transition-colors"
                >
                  Özcan et al. (2023), &quot;Quantifying the Energy Consumption and Carbon Emissions of LLM Inference via Simulations&quot;
                </a>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

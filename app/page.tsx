"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { ModelCombobox } from "@/components/model-combobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { DollarSign, Leaf, Settings, Github, Twitter } from "lucide-react"
import Latex from "react-latex-next"
import { ModelData, RegionData, regions, calculateMetrics } from "@/lib/energy-metrics"
import { models as localModels } from "@/lib/models"

// (Interfaces and regions constant were moved to '@/lib/energy-metrics')

export default function AIEmissionsCalculator() {
  // Static model catalogue (dense & MoE aware)
  const models = localModels

  const [selectedModel, setSelectedModel] = useState<ModelData | null>(models[0] ?? null)
  const [selectedRegion, setSelectedRegion] = useState<RegionData>(regions[9]) // US Average default
  // Default electricity price set to US average residential cost (~$0.152 per kWh)
  const [electricityPrice, setElectricityPrice] = useState([0.152])
  const [tokenCount, setTokenCount] = useState(1000000) // Default 1M tokens
  const [precision, setPrecision] = useState("FP16") // FP32, FP16, FP8
  const [pue, setPue] = useState([1.2]) // Power Usage Effectiveness

  // No useEffect / remote fetch needed – catalogue is bundled.

  const {
    totalCost,
    costPer1M,
    totalEnergyKwh,
    carbonEmissionsKg,
    totalFlops,
    energyPerToken,
  } = calculateMetrics({
    model: selectedModel,
    tokenCount,
    precision: precision as "FP32" | "FP16" | "FP8",
    pue: pue[0],
    electricityPrice: electricityPrice[0],
    region: selectedRegion,
  })

  return (
    <div className="min-h-screen bg-color-1">
        {/* Header */}
      <header className="bg-color-3 px-4 sm:px-8 py-6 sm:py-10 mx-5 my-4 rounded-xl">
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-color-2 tracking-tight">
              LLM Token Production Energy Cost Calculator
            </h1>
          </div>
          <p className="text-secondary-foreground text-base sm:text-lg max-w-2xl flex flex-wrap items-center gap-2">
            Research-based calculations using FLOP analysis and geographic carbon intensity to estimate the environmental impact of AI model inference.
          </p>
          {/* Inference.net call-to-action and social links */}
          <div className="mt-2 flex items-center flex-wrap gap-2">
            <span className="bg-foreground/90 text-white text-xs sm:text-sm px-3 py-1.5 rounded-lg inline-flex items-center gap-1">
              Brought to you by{" "}
              <a
                href="https://inference.net"
                className="underline font-medium whitespace-nowrap"
                target="_blank"
                rel="noopener noreferrer"
              >
                Inference.net
              </a>
            </span>
            <a
              href="https://github.com/context-labs/aienergy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Inference.net GitHub"
              className="text-color-2 hover:text-color-3 transition-colors"
            >
              <Github className="h-4 w-4" />
            </a>
            <a
              href="https://x.com/inference_net"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Inference.net Twitter/X"
              className="text-color-2 hover:text-color-3 transition-colors"
            >
              <Twitter className="h-4 w-4" />
            </a>
          </div>

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
                  <>
                    <p className="text-xs text-muted-foreground pt-0.5">
                      <strong>Active Parameters:</strong> {selectedModel.active_parameters_in_billions.toLocaleString()}B
                    </p>
                    <p className="text-xs text-muted-foreground pt-0.5">
                      Overall Parameters: {selectedModel.overall_parameters_in_billions.toLocaleString()}B
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground pt-1">
                      Calculations use <strong>active parameters</strong> — the subset actually involved in each token’s computation. Dense models have active == overall, while Mixture-of-Experts (MoE) models use fewer experts per token, lowering energy and cost estimates. Since MoE models need to load all parameters into memory, their energy use is higher than what we estimated, but it should still be a good approximation.
                    </p>
                  </>
                )}
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
                The calculator uses the <em>active parameter count</em> when estimating compute.  Each token
                triggers roughly <Latex>{"$2 \\times N_{active}$"}</Latex> floating-point operations, so total energy is {" "}
                <Latex>{"$E = \\frac{2 \\times N_{active} \\times T}{\\eta}$"}</Latex>, where <Latex>{"$\\eta$"}</Latex> is hardware
                efficiency in FLOPs/Joule.
              </p>
              <p className="text-sm">
                • <strong>Overall parameters</strong> represent the full model size (all experts for MoE). <br />
                • <strong>Active parameters</strong> are the subset actually multiplied for a single token.  Dense models have
                <em>active = overall</em>; MoE models often have <em>active ≪ overall</em>.
              </p>
              <p className="text-sm">
                This distinction means MoE models show lower compute-energy and cost here than equally sized
                dense models.  We do not currently account for memory bandwidth or expert-routing overhead, so
                real-world MoE energy can be somewhat higher.
              </p>

              <p>
                <strong>Carbon Emissions:</strong>{" "}
                <Latex>{"$E_{\\text{kWh}} \\times I_{\\text{grid}}$"}</Latex>, where <Latex>{"$I_{\\text{grid}}$"}</Latex> is the region-specific
                carbon intensity (kg CO₂/kWh).  Selecting cleaner grids (lower <Latex>{"$I_{grid}$"}</Latex>) therefore
                reduces emissions even when energy use is unchanged.
              </p>
              <p>
                <strong>Hardware Assumptions:</strong>{" "}
                Based on NVIDIA H100 specifications (~<Latex>{"$6.59 \\times 10^{11}$"}</Latex> FLOPs/Joule, conservative estimate).
                Precision improvements (FP16/FP8) increase efficiency by 2×/4× respectively.
              </p>

              <p className="text-xs">
                <em>Variable definitions:</em>{" "}
                <Latex>{"$N_{active}$"}</Latex> – active parameters (billions);{" "}
                <Latex>{"$T$"}</Latex> – token count;{" "}
                <Latex>{"$E_{\\text{kWh}}$"}</Latex> – total energy in kilowatt-hours;{" "}
                <Latex>{"$I_{\\text{grid}}$"}</Latex> – regional carbon intensity (kg CO₂/kWh);{" "}
                <Latex>{"$\\eta$"}</Latex> – hardware efficiency (FLOPs/J).
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

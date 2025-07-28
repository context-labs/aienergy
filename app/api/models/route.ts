import { NextResponse } from "next/server"

interface ModelData {
  name: string
  parameters_in_billions: number
  emissions_per_token_kWh: number
}

// Add caching variables at top of file
// eslint-disable-next-line prefer-const
let cachedModels: ModelData[] | null = null;
// eslint-disable-next-line prefer-const
let lastFetched = 0; // Unix ms timestamp of last successful fetch

// Fallback model data in case the API is unavailable
const fallbackModels: ModelData[] = [
  { name: "GPT-4 Turbo", parameters_in_billions: 175, emissions_per_token_kWh: 1.329e-6 },
  { name: "Claude-3 Opus", parameters_in_billions: 175, emissions_per_token_kWh: 1.329e-6 },
  { name: "Llama 2 70B", parameters_in_billions: 70, emissions_per_token_kWh: 5.316e-7 },
  { name: "Mixtral 8x7B", parameters_in_billions: 7, emissions_per_token_kWh: 5.316e-8 },
  { name: "Llama 2 13B", parameters_in_billions: 13, emissions_per_token_kWh: 9.872e-8 },
  { name: "Llama 2 7B", parameters_in_billions: 7, emissions_per_token_kWh: 5.316e-8 },
  { name: "Mistral 7B", parameters_in_billions: 7, emissions_per_token_kWh: 5.316e-8 },
  { name: "CodeLlama 34B", parameters_in_billions: 34, emissions_per_token_kWh: 2.582e-7 },
  { name: "Vicuna 13B", parameters_in_billions: 13, emissions_per_token_kWh: 9.872e-8 },
  { name: "WizardLM 70B", parameters_in_billions: 70, emissions_per_token_kWh: 5.316e-7 },
  // Newly added large-scale models
  { name: "DeepSeek V3 0324", parameters_in_billions: 675, emissions_per_token_kWh: 675 * 7.594e-9 },
  { name: "Kimi K2", parameters_in_billions: 1000, emissions_per_token_kWh: 1000 * 7.594e-9 },
]

export async function GET() {
  const oneDay = 24 * 60 * 60 * 1000;
  if (cachedModels && Date.now() - lastFetched < oneDay) {
    // Re-clean cached models in case filter logic has changed
    const cleanedCache = cachedModels.filter(
      (m) => Number.isFinite(m.parameters_in_billions) && m.parameters_in_billions > 0
    )
    if (cleanedCache.length === cachedModels.length) {
      return NextResponse.json(cachedModels)
    }
    // Otherwise fall through to refetch
  }

  try {
    // Try to fetch from OpenRouter API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "AI-Energy-Calculator/1.0",
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      console.warn(`OpenRouter API returned ${response.status}, using fallback data`)
      return NextResponse.json(fallbackModels)
    }

    const contentType = response.headers.get("content-type")
    if (!contentType || !contentType.includes("application/json")) {
      console.warn("OpenRouter API returned non-JSON response, using fallback data")
      return NextResponse.json(fallbackModels)
    }

    const data = await response.json()

    if (!data || !data.data || !Array.isArray(data.data)) {
      console.warn("OpenRouter API returned invalid data structure, using fallback data")
      return NextResponse.json(fallbackModels)
    }

    const modelsWithEmissions: ModelData[] = []

    // Constant for energy consumption in kWh per output token per billion parameters
    const energyConsumptionFactor = 7.594e-9

    for (const model of data.data) {
      const rawName: string = model.name || ""

      // Skip known problematic Baidu ERNIE entries
      const blacklistPatterns = [/\bbaidu\b/i, /\bernie\b/i]
      if (blacklistPatterns.some((re) => re.test(rawName))) {
        continue
      }

      const modelName = rawName

      // Skip models advertised as free tiers
      if (/\(\s*free\s*\)/i.test(modelName)) {
        continue
      }

      // Match counts suffixed with B/b (billions) or T/t (trillions)
      const parameterRegex = /\b(\d+(?:\.\d+)?)\s*([bBtT])\b/g
      const matches = [...modelName.matchAll(parameterRegex)]

      if (matches.length > 0) {
        try {
          // Extract all parameter counts and take the largest
          const parameterCounts = matches.map((match) => {
            const value = Number.parseFloat(match[1])
            const unit = match[2].toLowerCase()
            return unit === "t" ? value * 1000 : value // convert trillions -> billions
          })
          const parametersInBillions = Math.max(...parameterCounts)

          if (parametersInBillions > 0) {
            // Calculate the estimated emissions per token
            const emissionsPerTokenKwh = parametersInBillions * energyConsumptionFactor

            modelsWithEmissions.push({
              name: modelName,
              parameters_in_billions: parametersInBillions,
              emissions_per_token_kWh: emissionsPerTokenKwh,
            })
          }
        } catch {
          // Skip if conversion fails
          continue
        }
      }
    }

    // Ensure critical large-scale models are present even if API didn't list them
    const essentialModels: ModelData[] = [
      { name: "DeepSeek V3 0324", parameters_in_billions: 675, emissions_per_token_kWh: 675 * energyConsumptionFactor },
      { name: "Kimi K2", parameters_in_billions: 1000, emissions_per_token_kWh: 1000 * energyConsumptionFactor },
    ]

    for (const essential of essentialModels) {
      if (!modelsWithEmissions.some((m) => m.name.toLowerCase() === essential.name.toLowerCase())) {
        modelsWithEmissions.push(essential)
      }
    }

    // Remove any models lacking a valid parameter count
    const cleanModels = modelsWithEmissions.filter(
      (m) => Number.isFinite(m.parameters_in_billions) && m.parameters_in_billions > 0
    )

    // If we got valid models from the API, use them
    if (cleanModels.length > 0) {
      // Sort by parameter count (largest first)
      cleanModels.sort((a, b) => b.parameters_in_billions - a.parameters_in_billions)
      cachedModels = cleanModels;
      lastFetched = Date.now();
      return NextResponse.json(cleanModels)
    } else {
      // If no valid models found in API response, use fallback
      console.warn("No valid models found in OpenRouter API response, using fallback data")
      cachedModels = fallbackModels;
      lastFetched = Date.now();
      return NextResponse.json(fallbackModels)
    }
  } catch (error) {
    console.error("Error fetching from OpenRouter API:", error)
    console.log("Using fallback model data")
    cachedModels = fallbackModels;
    lastFetched = Date.now();
    return NextResponse.json(fallbackModels)
  }
}

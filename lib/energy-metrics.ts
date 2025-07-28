export interface ModelData {
  name: string;
  parameters_in_billions: number;
  emissions_per_token_kWh: number;
}

export interface RegionData {
  name: string;
  carbonIntensity: number; // kg CO2/kWh
}

// Geographic grid carbon intensities (kg CO2 per kWh)
export const regions: RegionData[] = [
  { name: "Iceland (Renewable Heavy)", carbonIntensity: 0.028 },
  { name: "Norway (Hydroelectric)", carbonIntensity: 0.032 },
  { name: "France (Nuclear Heavy)", carbonIntensity: 0.027 },
  { name: "Sweden (Mixed Renewable)", carbonIntensity: 0.039 },
  { name: "Canada (Mixed)", carbonIntensity: 0.137 },
  { name: "Google europe-north1", carbonIntensity: 0.088 }, // Finland grid
  { name: "Brazil (Hydro Heavy)", carbonIntensity: 0.103 },
  { name: "United Kingdom", carbonIntensity: 0.237 },
  { name: "United States (Average)", carbonIntensity: 0.345 },
  { name: "Google us-central1", carbonIntensity: 0.243 }, // Iowa grid
  { name: "Japan", carbonIntensity: 0.463 },
  { name: "Germany", carbonIntensity: 0.321 },
  { name: "China (Coal Heavy)", carbonIntensity: 0.510 },
  { name: "India (Coal Heavy)", carbonIntensity: 0.636 },
  { name: "Australia (Coal Heavy)", carbonIntensity: 0.482 },
  { name: "South Africa (Coal Heavy)", carbonIntensity: 0.687 },
];

export interface MetricsResult {
  totalCost: number;
  costPer1M: number;
  totalEnergyKwh: number;
  carbonEmissionsKg: number;
  totalFlops: number;
  energyPerToken: number;
}

type Precision = "FP32" | "FP16" | "FP8";

export function calculateMetrics({
  model,
  tokenCount,
  precision,
  pue,
  electricityPrice,
  region,
}: {
  model: ModelData | null;
  tokenCount: number;
  precision: Precision;
  pue: number;
  electricityPrice: number;
  region: RegionData;
}): MetricsResult {
  const zeroResult: MetricsResult = {
    totalCost: 0,
    costPer1M: 0,
    totalEnergyKwh: 0,
    carbonEmissionsKg: 0,
    totalFlops: 0,
    energyPerToken: 0,
  };

  if (!model) return zeroResult;
  if (!Number.isFinite(model.parameters_in_billions) || model.parameters_in_billions <= 0) {
    return zeroResult;
  }

  // FLOP-based calculation: ~2 FLOPs per parameter per token
  const totalFlops = 2 * model.parameters_in_billions * 1e9 * tokenCount;

  // Hardware efficiency based on precision (FLOPs per Joule)
  const baseEfficiency = 6.59e11; // FLOPs per Joule (conservative estimate)

  const precisionMultipliers: Record<Precision, number> = {
    FP32: 1.0,
    FP16: 2.0,
    FP8: 4.0,
  };

  const efficiency = baseEfficiency * precisionMultipliers[precision];

  // Energy calculation in Joules, then convert to kWh
  const energyJoules = totalFlops / efficiency;
  const energyKwhBase = energyJoules / 3.6e6; // Convert J to kWh

  // Apply PUE (Power Usage Effectiveness) for data center overhead
  const totalEnergyKwh = energyKwhBase * pue;

  // Cost calculation
  const totalCost = totalEnergyKwh * electricityPrice;
  const energyPer1M = (totalEnergyKwh / tokenCount) * 1_000_000;
  const costPer1M = energyPer1M * electricityPrice;

  // Carbon emissions calculation
  const carbonEmissionsKg = totalEnergyKwh * region.carbonIntensity;

  const energyPerToken = totalEnergyKwh / tokenCount;

  return {
    totalCost,
    costPer1M,
    totalEnergyKwh,
    carbonEmissionsKg,
    totalFlops,
    energyPerToken,
  };
} 
export interface APIUsage {
  provider: 'openai' | 'anthropic' | 'google';
  model: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PricingRate {
  inputTokensPer1k: number;
  outputTokensPer1k: number;
}

export interface ModelPricing {
  [model: string]: PricingRate;
}

export interface APIProvider {
  name: string;
  getUsage(startDate: Date, endDate: Date): Promise<APIUsage[]>;
  getPricing(): ModelPricing;
}

export interface CostSummary {
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
}

export interface ProviderCredentials {
  openai?: {
    apiKey: string;
    organizationId?: string;
  };
  anthropic?: {
    apiKey: string;
  };
  google?: {
    projectId: string;
    apiKey?: string;
    keyFilePath?: string;
  };
}
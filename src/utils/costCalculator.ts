import { APIUsage, CostSummary, ModelPricing } from '../types';
import { BaseAPIProvider } from '../providers/base';

export class CostCalculator {
  constructor(private providers: BaseAPIProvider[]) {}

  calculateCosts(usageData: APIUsage[]): CostSummary[] {
    const summaries: CostSummary[] = [];
    const groupedUsage = this.groupUsageByProviderAndModel(usageData);

    for (const [providerName, modelData] of Object.entries(groupedUsage)) {
      const provider = this.providers.find(p => p.name.toLowerCase() === providerName);
      if (!provider) continue;

      const pricing = provider.getPricing();

      for (const [model, usage] of Object.entries(modelData)) {
        const modelPricing = pricing[model];
        if (!modelPricing) {
          console.warn(`No pricing found for model: ${model} from ${providerName}`);
          continue;
        }

        const inputCost = (usage.inputTokens / 1000) * modelPricing.inputTokensPer1k;
        const outputCost = (usage.outputTokens / 1000) * modelPricing.outputTokensPer1k;

        summaries.push({
          provider: providerName,
          model,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          inputCost: Math.round(inputCost * 10000) / 10000,
          outputCost: Math.round(outputCost * 10000) / 10000,
          totalCost: Math.round((inputCost + outputCost) * 10000) / 10000
        });
      }
    }

    return summaries;
  }

  private groupUsageByProviderAndModel(usageData: APIUsage[]): Record<string, Record<string, { inputTokens: number, outputTokens: number }>> {
    const grouped: Record<string, Record<string, { inputTokens: number, outputTokens: number }>> = {};

    for (const usage of usageData) {
      if (!grouped[usage.provider]) {
        grouped[usage.provider] = {};
      }

      if (!grouped[usage.provider][usage.model]) {
        grouped[usage.provider][usage.model] = { inputTokens: 0, outputTokens: 0 };
      }

      grouped[usage.provider][usage.model].inputTokens += usage.inputTokens;
      grouped[usage.provider][usage.model].outputTokens += usage.outputTokens;
    }

    return grouped;
  }

  getTotalCost(summaries: CostSummary[]): number {
    const total = summaries.reduce((sum, summary) => sum + summary.totalCost, 0);
    return Math.round(total * 10000) / 10000;
  }

  getProviderBreakdown(summaries: CostSummary[]): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const summary of summaries) {
      if (!breakdown[summary.provider]) {
        breakdown[summary.provider] = 0;
      }
      breakdown[summary.provider] += summary.totalCost;
    }

    // Round values
    for (const provider in breakdown) {
      breakdown[provider] = Math.round(breakdown[provider] * 10000) / 10000;
    }

    return breakdown;
  }
}
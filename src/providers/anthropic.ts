import Anthropic from '@anthropic-ai/sdk';
import axios from 'axios';
import { BaseAPIProvider } from './base';
import { APIUsage, ModelPricing } from '../types';

export class AnthropicProvider extends BaseAPIProvider {
  name = 'Anthropic';
  private client: Anthropic;

  constructor(apiKey: string) {
    super();
    this.client = new Anthropic({ apiKey });
  }

  async getUsage(startDate: Date, endDate: Date): Promise<APIUsage[]> {
    this.validateDateRange(startDate, endDate);
    
    try {
      // Anthropic provides usage data through their admin API
      // Note: This requires admin API access which is separate from regular API keys
      const apiKey = this.client.apiKey;
      
      // First, try the admin API endpoint if available
      const headers = {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      };

      // Anthropic's usage endpoint (requires admin access)
      // Format: YYYY-MM-DD
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      try {
        // Attempt to use the admin API for usage data
        const response = await axios.get(
          `https://api.anthropic.com/v1/organizations/usage`,
          {
            headers,
            params: {
              start_date: startDateStr,
              end_date: endDateStr
            }
          }
        );

        if (response.data && response.data.usage) {
          return this.parseAnthropicUsageData(response.data.usage);
        }
      } catch (adminError) {
        // Admin API might not be available, try alternative approach
        console.warn('Anthropic admin API not available, trying alternative methods');
      }

      // Alternative: Try to get usage from billing endpoint if available
      try {
        const billingResponse = await axios.get(
          `https://api.anthropic.com/v1/billing/usage`,
          {
            headers,
            params: {
              from: startDateStr,
              to: endDateStr
            }
          }
        );

        if (billingResponse.data) {
          return this.parseBillingData(billingResponse.data);
        }
      } catch (billingError) {
        console.warn('Billing API also not available');
      }

      // If no API access is available, return empty array with warning
      console.warn(
        'Anthropic usage data requires admin API access or manual tracking. ' +
        'Consider using the trackUsage() method to manually record usage.'
      );
      return [];
      
    } catch (error) {
      console.error('Failed to fetch Anthropic usage:', error);
      throw new Error(
        `Unable to fetch Anthropic usage data. This typically requires admin API access. ` +
        `Error: ${error instanceof Error ? error.message : error}`
      );
    }
  }

  private parseAnthropicUsageData(usageData: any[]): APIUsage[] {
    const usage: APIUsage[] = [];
    
    for (const item of usageData) {
      if (item.model && (item.input_tokens || item.output_tokens)) {
        usage.push({
          provider: 'anthropic',
          model: item.model,
          inputTokens: item.input_tokens || 0,
          outputTokens: item.output_tokens || 0,
          timestamp: new Date(item.date || item.timestamp),
          metadata: {
            requestId: item.request_id,
            userId: item.user_id,
            cost: item.cost
          }
        });
      }
    }
    
    return usage;
  }

  private parseBillingData(billingData: any): APIUsage[] {
    const usage: APIUsage[] = [];
    
    // Parse billing data format
    if (billingData.usage_by_model) {
      for (const [model, modelData] of Object.entries(billingData.usage_by_model)) {
        if (modelData && typeof modelData === 'object') {
          const data = modelData as any;
          usage.push({
            provider: 'anthropic',
            model,
            inputTokens: data.input_tokens || 0,
            outputTokens: data.output_tokens || 0,
            timestamp: new Date(billingData.period_end || new Date()),
            metadata: {
              totalCost: data.cost,
              requests: data.requests
            }
          });
        }
      }
    }
    
    return usage;
  }

  getPricing(): ModelPricing {
    // Pricing as of June 2025 (per 1K tokens)
    // Note: Anthropic pricing is per 1M tokens, converted to per 1K here
    return {
      // Claude 3.7 models (latest)
      'claude-3.7-sonnet': { inputTokensPer1k: 0.003, outputTokensPer1k: 0.015 }, // $3/$15 per 1M
      'claude-3-7-sonnet-20241205': { inputTokensPer1k: 0.003, outputTokensPer1k: 0.015 },
      
      // Claude 3.5 models
      'claude-3.5-sonnet': { inputTokensPer1k: 0.003, outputTokensPer1k: 0.015 }, // $3/$15 per 1M
      'claude-3-5-sonnet-20241022': { inputTokensPer1k: 0.003, outputTokensPer1k: 0.015 },
      'claude-3-5-sonnet-20240620': { inputTokensPer1k: 0.003, outputTokensPer1k: 0.015 },
      'claude-3.5-haiku': { inputTokensPer1k: 0.001, outputTokensPer1k: 0.005 }, // $1/$5 per 1M
      'claude-3-5-haiku-20241022': { inputTokensPer1k: 0.001, outputTokensPer1k: 0.005 },
      // Claude 3.5 Opus - not yet released as of June 2025
      
      // Claude 3 models
      'claude-3-opus': { inputTokensPer1k: 0.015, outputTokensPer1k: 0.075 }, // $15/$75 per 1M
      'claude-3-opus-20240229': { inputTokensPer1k: 0.015, outputTokensPer1k: 0.075 },
      'claude-3-sonnet': { inputTokensPer1k: 0.003, outputTokensPer1k: 0.015 },
      'claude-3-sonnet-20240229': { inputTokensPer1k: 0.003, outputTokensPer1k: 0.015 },
      'claude-3-haiku': { inputTokensPer1k: 0.00025, outputTokensPer1k: 0.00125 },
      'claude-3-haiku-20240307': { inputTokensPer1k: 0.00025, outputTokensPer1k: 0.00125 },
      
      // Legacy Claude 2 models (deprecated)
      'claude-2.1': { inputTokensPer1k: 0.008, outputTokensPer1k: 0.024 },
      'claude-2.0': { inputTokensPer1k: 0.008, outputTokensPer1k: 0.024 },
      'claude-2': { inputTokensPer1k: 0.008, outputTokensPer1k: 0.024 },
      
      // Claude Instant models (deprecated)
      'claude-instant-1.2': { inputTokensPer1k: 0.0008, outputTokensPer1k: 0.0024 },
      'claude-instant-1.1': { inputTokensPer1k: 0.0008, outputTokensPer1k: 0.0024 },
      'claude-instant-1': { inputTokensPer1k: 0.0008, outputTokensPer1k: 0.0024 }
    };
  }

  // Helper method to track usage manually
  trackUsage(model: string, inputTokens: number, outputTokens: number): APIUsage {
    return {
      provider: 'anthropic',
      model,
      inputTokens,
      outputTokens,
      timestamp: new Date()
    };
  }
}
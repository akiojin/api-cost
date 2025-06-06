import OpenAI from 'openai';
import axios from 'axios';
import { BaseAPIProvider } from './base';
import { APIUsage, ModelPricing } from '../types';

export class OpenAIProvider extends BaseAPIProvider {
  name = 'OpenAI';
  private client: OpenAI;
  private organizationId?: string;

  constructor(apiKey: string, organizationId?: string) {
    super();
    this.client = new OpenAI({ apiKey });
    this.organizationId = organizationId;
  }

  async getUsage(startDate: Date, endDate: Date): Promise<APIUsage[]> {
    this.validateDateRange(startDate, endDate);
    
    try {
      // OpenAI provides usage data through their usage endpoint
      // Note: This requires the API key to have appropriate permissions
      const apiKey = this.client.apiKey;
      const headers: any = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      };

      if (this.organizationId) {
        headers['OpenAI-Organization'] = this.organizationId;
      }

      // Format dates as YYYY-MM-DD
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // OpenAI's usage endpoint provides daily aggregated data
      const response = await axios.get(
        `https://api.openai.com/v1/usage?date=${startDateStr}`,
        { headers }
      );

      // Note: OpenAI's usage API returns aggregated data by day
      // We need to fetch data for each day in the range
      const usage: APIUsage[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        try {
          const dailyResponse = await axios.get(
            `https://api.openai.com/v1/usage?date=${dateStr}`,
            { headers }
          );

          if (dailyResponse.data && dailyResponse.data.data) {
            // Process the usage data
            for (const item of dailyResponse.data.data) {
              // OpenAI usage data includes model and token counts
              if (item.n_generated_tokens_total || item.n_context_tokens_total) {
                usage.push({
                  provider: 'openai',
                  model: item.snapshot_id || 'unknown',
                  inputTokens: item.n_context_tokens_total || 0,
                  outputTokens: item.n_generated_tokens_total || 0,
                  timestamp: new Date(dateStr),
                  metadata: {
                    requests: item.n_requests || 0,
                    apiKeyId: item.api_key_id,
                    organizationId: item.organization_id
                  }
                });
              }
            }
          }
        } catch (error) {
          // Log error but continue with other days
          console.error(`Failed to fetch usage for ${dateStr}:`, error instanceof Error ? error.message : error);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return usage;
    } catch (error) {
      console.error('Failed to fetch OpenAI usage:', error);
      // Fallback: try alternative approach using the SDK's built-in methods if available
      try {
        // Some OpenAI SDK versions might have usage methods
        const clientWithUsage = this.client as any;
        if (clientWithUsage.usage && typeof clientWithUsage.usage.list === 'function') {
          const usageData = await clientWithUsage.usage.list({
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
          });
          
          return this.parseSDKUsageData(usageData);
        }
      } catch (sdkError) {
        console.error('SDK usage method also failed:', sdkError);
      }
      
      throw new Error(`Unable to fetch OpenAI usage data: ${error instanceof Error ? error.message : error}`);
    }
  }

  private parseSDKUsageData(usageData: any): APIUsage[] {
    const usage: APIUsage[] = [];
    
    if (usageData && usageData.data) {
      for (const item of usageData.data) {
        if (item.usage) {
          for (const modelUsage of item.usage) {
            usage.push({
              provider: 'openai',
              model: modelUsage.model || 'unknown',
              inputTokens: modelUsage.prompt_tokens || 0,
              outputTokens: modelUsage.completion_tokens || 0,
              timestamp: new Date(item.date),
              metadata: {
                totalTokens: modelUsage.total_tokens,
                requests: modelUsage.n_requests
              }
            });
          }
        }
      }
    }
    
    return usage;
  }

  getPricing(): ModelPricing {
    // Pricing as of June 2025 (per 1K tokens)
    // Note: OpenAI pricing is per 1M tokens, converted to per 1K here
    return {
      // GPT-4o models - Latest flagship models
      'gpt-4o': { inputTokensPer1k: 0.0025, outputTokensPer1k: 0.01 }, // $2.50/$10.00 per 1M
      'gpt-4o-2024-08-06': { inputTokensPer1k: 0.0025, outputTokensPer1k: 0.01 },
      'gpt-4o-2024-05-13': { inputTokensPer1k: 0.0025, outputTokensPer1k: 0.01 },
      'gpt-4o-mini': { inputTokensPer1k: 0.00015, outputTokensPer1k: 0.0006 }, // $0.15/$0.60 per 1M
      'gpt-4o-mini-2024-07-18': { inputTokensPer1k: 0.00015, outputTokensPer1k: 0.0006 },
      
      // GPT-4o audio/realtime
      'gpt-4o-realtime': { inputTokensPer1k: 0.005, outputTokensPer1k: 0.02 }, // $5/$20 per 1M for text
      'gpt-4o-audio': { inputTokensPer1k: 0.1, outputTokensPer1k: 0.2 }, // $100/$200 per 1M for audio
      
      // o-series reasoning models
      'o1': { inputTokensPer1k: 0.015, outputTokensPer1k: 0.06 }, // $15/$60 per 1M
      'o1-preview': { inputTokensPer1k: 0.015, outputTokensPer1k: 0.06 },
      'o1-preview-2024-09-12': { inputTokensPer1k: 0.015, outputTokensPer1k: 0.06 },
      'o1-mini': { inputTokensPer1k: 0.003, outputTokensPer1k: 0.012 }, // $3/$12 per 1M
      'o1-mini-2024-09-12': { inputTokensPer1k: 0.003, outputTokensPer1k: 0.012 },
      
      // o3 models - Latest reasoning models
      'o3-mini': { inputTokensPer1k: 0.0011, outputTokensPer1k: 0.0044 }, // $1.10/$4.40 per 1M
      'o3-mini-2025-01-31': { inputTokensPer1k: 0.0011, outputTokensPer1k: 0.0044 },
      
      // GPT-4.1 models (if they exist, use GPT-4o pricing as baseline)
      'gpt-4.1': { inputTokensPer1k: 0.0025, outputTokensPer1k: 0.01 },
      'gpt-4.1-2025-04-14': { inputTokensPer1k: 0.0025, outputTokensPer1k: 0.01 },
      'gpt-4.1-mini': { inputTokensPer1k: 0.00015, outputTokensPer1k: 0.0006 },
      'gpt-4.1-mini-2025-04-14': { inputTokensPer1k: 0.00015, outputTokensPer1k: 0.0006 },
      'gpt-4.1-nano': { inputTokensPer1k: 0.00015, outputTokensPer1k: 0.0006 },
      'gpt-4.1-nano-2025-04-14': { inputTokensPer1k: 0.00015, outputTokensPer1k: 0.0006 },
      
      // o4 models (if they exist, use o3-mini pricing as baseline)
      'o4-mini': { inputTokensPer1k: 0.0011, outputTokensPer1k: 0.0044 },
      'o4-mini-2025-04-16': { inputTokensPer1k: 0.0011, outputTokensPer1k: 0.0044 },
      
      // Legacy GPT-4 models (deprecated but may still appear in usage)
      'gpt-4-turbo': { inputTokensPer1k: 0.01, outputTokensPer1k: 0.03 },
      'gpt-4-turbo-preview': { inputTokensPer1k: 0.01, outputTokensPer1k: 0.03 },
      'gpt-4': { inputTokensPer1k: 0.03, outputTokensPer1k: 0.06 },
      'gpt-4-32k': { inputTokensPer1k: 0.06, outputTokensPer1k: 0.12 },
      
      // GPT-3.5 models (deprecated)
      'gpt-3.5-turbo': { inputTokensPer1k: 0.0005, outputTokensPer1k: 0.0015 },
      'gpt-3.5-turbo-16k': { inputTokensPer1k: 0.003, outputTokensPer1k: 0.004 },
      'gpt-3.5-turbo-0125': { inputTokensPer1k: 0.0005, outputTokensPer1k: 0.0015 },
      
      // Embedding models
      'text-embedding-3-small': { inputTokensPer1k: 0.00002, outputTokensPer1k: 0 },
      'text-embedding-3-large': { inputTokensPer1k: 0.00013, outputTokensPer1k: 0 },
      'text-embedding-ada-002': { inputTokensPer1k: 0.0001, outputTokensPer1k: 0 },
      
      // Image models
      'dall-e-3': { inputTokensPer1k: 0.04, outputTokensPer1k: 0.08 },
      'dall-e-2': { inputTokensPer1k: 0.02, outputTokensPer1k: 0.02 },
      
      // Audio models
      'whisper-1': { inputTokensPer1k: 0.006, outputTokensPer1k: 0 },
      'tts-1': { inputTokensPer1k: 0.015, outputTokensPer1k: 0 },
      'tts-1-hd': { inputTokensPer1k: 0.03, outputTokensPer1k: 0 }
    };
  }

  // Helper method to track usage manually
  trackUsage(model: string, inputTokens: number, outputTokens: number): APIUsage {
    return {
      provider: 'openai',
      model,
      inputTokens,
      outputTokens,
      timestamp: new Date()
    };
  }
}
import { BaseAPIProvider } from './base';
import { APIUsage, ModelPricing } from '../types';
import axios from 'axios';

export class GoogleProvider extends BaseAPIProvider {
  name = 'Google';
  private projectId: string;
  private apiKey?: string;

  constructor(projectId: string, apiKey?: string) {
    super();
    this.projectId = projectId;
    this.apiKey = apiKey;
  }

  async getUsage(startDate: Date, endDate: Date): Promise<APIUsage[]> {
    this.validateDateRange(startDate, endDate);
    
    // Note: Google Gemini API doesn't provide direct usage tracking via API key
    // You would need to use Google Cloud Billing API or track manually
    console.warn('Google Gemini usage tracking requires Google Cloud Billing API access or manual tracking');
    
    // For API key-based usage, we would need to implement manual tracking
    // or use Google Cloud Console to check usage
    
    return [];
  }

  // Helper method for making direct API calls with API key
  private async makeGeminiAPICall(model: string, prompt: string): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Google API key not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    
    try {
      const response = await axios.post(url, {
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Gemini API call failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  getPricing(): ModelPricing {
    // Pricing as of June 2025 (per 1K tokens)
    // Note: Google pricing is per 1M tokens, converted to per 1K here
    return {
      // Gemini 2.5 models (latest)
      'gemini-2.5-pro': { inputTokensPer1k: 0.00125, outputTokensPer1k: 0.01 }, // $1.25/$10 per 1M (≤200K tokens)
      'gemini-2.5-pro-001': { inputTokensPer1k: 0.00125, outputTokensPer1k: 0.01 },
      'gemini-2.5-pro-long': { inputTokensPer1k: 0.0025, outputTokensPer1k: 0.015 }, // $2.50/$15 per 1M (>200K tokens)
      'gemini-2.5-flash': { inputTokensPer1k: 0.000075, outputTokensPer1k: 0.0003 }, // Estimated similar to 1.5 Flash
      'gemini-2.5-flash-001': { inputTokensPer1k: 0.000075, outputTokensPer1k: 0.0003 },
      
      // Gemini 2.0 models
      'gemini-2.0-flash': { inputTokensPer1k: 0.0001, outputTokensPer1k: 0.0004 }, // $0.10/$0.40 per 1M
      'gemini-2.0-flash-002': { inputTokensPer1k: 0.0001, outputTokensPer1k: 0.0004 },
      'gemini-2.0-flash-exp': { inputTokensPer1k: 0.0001, outputTokensPer1k: 0.0004 },
      
      // Gemini 1.5 models
      'gemini-1.5-pro': { inputTokensPer1k: 0.00125, outputTokensPer1k: 0.005 }, // Updated pricing
      'gemini-1.5-pro-001': { inputTokensPer1k: 0.00125, outputTokensPer1k: 0.005 },
      'gemini-1.5-pro-002': { inputTokensPer1k: 0.00125, outputTokensPer1k: 0.005 },
      'gemini-1.5-flash': { inputTokensPer1k: 0.000075, outputTokensPer1k: 0.0003 }, // $0.075/$0.3 per 1M (reduced price)
      'gemini-1.5-flash-001': { inputTokensPer1k: 0.000075, outputTokensPer1k: 0.0003 },
      'gemini-1.5-flash-002': { inputTokensPer1k: 0.000075, outputTokensPer1k: 0.0003 },
      'gemini-1.5-flash-8b': { inputTokensPer1k: 0.0000375, outputTokensPer1k: 0.00015 },
      
      // Gemini 1.0 models (legacy)
      'gemini-1.0-pro': { inputTokensPer1k: 0.0005, outputTokensPer1k: 0.0015 },
      'gemini-1.0-pro-vision': { inputTokensPer1k: 0.0005, outputTokensPer1k: 0.0015 },
      'gemini-1.0-ultra': { inputTokensPer1k: 0.01, outputTokensPer1k: 0.03 }, // Estimated
      
      // PaLM models (deprecated)
      'text-bison-001': { inputTokensPer1k: 0.000125, outputTokensPer1k: 0.000125 },
      'text-unicorn-001': { inputTokensPer1k: 0.01, outputTokensPer1k: 0.028 },
      'code-bison-001': { inputTokensPer1k: 0.000125, outputTokensPer1k: 0.000125 },
      'code-gecko-001': { inputTokensPer1k: 0.000125, outputTokensPer1k: 0.000125 },
      
      // Embedding models
      'embedding-gecko-001': { inputTokensPer1k: 0.0000625, outputTokensPer1k: 0 },
      'textembedding-gecko': { inputTokensPer1k: 0.0000625, outputTokensPer1k: 0 },
      'textembedding-gecko-003': { inputTokensPer1k: 0.0000625, outputTokensPer1k: 0 },
      'text-embedding-004': { inputTokensPer1k: 0.0000625, outputTokensPer1k: 0 }
    };
  }

  // Helper method to track usage manually
  trackUsage(model: string, inputTokens: number, outputTokens: number): APIUsage {
    return {
      provider: 'google',
      model,
      inputTokens,
      outputTokens,
      timestamp: new Date()
    };
  }
}
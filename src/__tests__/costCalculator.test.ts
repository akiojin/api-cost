import { CostCalculator } from '../utils/costCalculator';
import { OpenAIProvider, AnthropicProvider, GoogleProvider } from '../providers';
import { APIUsage } from '../types';

describe('CostCalculator', () => {
  let calculator: CostCalculator;

  beforeEach(() => {
    const providers = [
      new OpenAIProvider('test-key'),
      new AnthropicProvider('test-key'),
      new GoogleProvider('test-project', undefined)
    ];
    calculator = new CostCalculator(providers);
  });

  describe('calculateCosts', () => {
    it('should calculate costs correctly for OpenAI usage', () => {
      const usage: APIUsage[] = [
        {
          provider: 'openai',
          model: 'gpt-4o',
          inputTokens: 1000,
          outputTokens: 500,
          timestamp: new Date()
        }
      ];

      const costs = calculator.calculateCosts(usage);

      expect(costs).toHaveLength(1);
      expect(costs[0].provider).toBe('openai');
      expect(costs[0].model).toBe('gpt-4o');
      expect(costs[0].inputCost).toBe(0.0025); // 1000/1000 * 0.0025
      expect(costs[0].outputCost).toBe(0.005);  // 500/1000 * 0.01
      expect(costs[0].totalCost).toBe(0.0075);
    });

    it('should calculate costs correctly for multiple providers', () => {
      const usage: APIUsage[] = [
        {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          inputTokens: 2000,
          outputTokens: 1000,
          timestamp: new Date()
        },
        {
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          inputTokens: 3000,
          outputTokens: 1500,
          timestamp: new Date()
        },
        {
          provider: 'google',
          model: 'gemini-1.5-flash',
          inputTokens: 4000,
          outputTokens: 2000,
          timestamp: new Date()
        }
      ];

      const costs = calculator.calculateCosts(usage);

      expect(costs).toHaveLength(3);
      
      // OpenAI
      expect(costs[0].totalCost).toBe(0.0025); // (2000/1000 * 0.0005) + (1000/1000 * 0.0015)
      
      // Anthropic
      expect(costs[1].totalCost).toBe(0.0026); // (3000/1000 * 0.00025) + (1500/1000 * 0.00125)
      
      // Google
      expect(costs[2].totalCost).toBe(0.0009); // (4000/1000 * 0.000075) + (2000/1000 * 0.0003)
    });

    it('should aggregate usage for the same model', () => {
      const usage: APIUsage[] = [
        {
          provider: 'openai',
          model: 'gpt-4o',
          inputTokens: 1000,
          outputTokens: 500,
          timestamp: new Date()
        },
        {
          provider: 'openai',
          model: 'gpt-4o',
          inputTokens: 2000,
          outputTokens: 1000,
          timestamp: new Date()
        }
      ];

      const costs = calculator.calculateCosts(usage);

      expect(costs).toHaveLength(1);
      expect(costs[0].inputTokens).toBe(3000);
      expect(costs[0].outputTokens).toBe(1500);
      expect(costs[0].totalCost).toBe(0.0225); // (3000/1000 * 0.0025) + (1500/1000 * 0.01)
    });
  });

  describe('getTotalCost', () => {
    it('should calculate total cost correctly', () => {
      const usage: APIUsage[] = [
        {
          provider: 'openai',
          model: 'gpt-4o',
          inputTokens: 1000,
          outputTokens: 500,
          timestamp: new Date()
        },
        {
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          inputTokens: 2000,
          outputTokens: 1000,
          timestamp: new Date()
        }
      ];

      const costs = calculator.calculateCosts(usage);
      const total = calculator.getTotalCost(costs);

      expect(total).toBe(0.0093); // 0.0075 + 0.00175 (claude-3-haiku: 2000/1000 * 0.00025 + 1000/1000 * 0.00125)
    });
  });

  describe('getProviderBreakdown', () => {
    it('should return provider breakdown correctly', () => {
      const usage: APIUsage[] = [
        {
          provider: 'openai',
          model: 'gpt-4o',
          inputTokens: 1000,
          outputTokens: 500,
          timestamp: new Date()
        },
        {
          provider: 'openai',
          model: 'gpt-3.5-turbo',
          inputTokens: 2000,
          outputTokens: 1000,
          timestamp: new Date()
        },
        {
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          inputTokens: 3000,
          outputTokens: 1500,
          timestamp: new Date()
        }
      ];

      const costs = calculator.calculateCosts(usage);
      const breakdown = calculator.getProviderBreakdown(costs);

      expect(breakdown['openai']).toBe(0.01); // 0.0075 + 0.0025
      expect(breakdown['anthropic']).toBe(0.0026);
    });
  });
});
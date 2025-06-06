import { OpenAIProvider, AnthropicProvider, GoogleProvider } from '../providers';

describe('Providers', () => {
  describe('OpenAIProvider', () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider('test-key');
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('OpenAI');
    });

    it('should return pricing for all models', () => {
      const pricing = provider.getPricing();
      
      expect(pricing['gpt-4o']).toBeDefined();
      expect(pricing['gpt-4o'].inputTokensPer1k).toBe(0.0025);
      expect(pricing['gpt-4o'].outputTokensPer1k).toBe(0.01);
      
      expect(pricing['gpt-3.5-turbo']).toBeDefined();
      expect(pricing['text-embedding-3-small']).toBeDefined();
    });

    it('should create usage tracking object correctly', () => {
      const usage = provider.trackUsage('gpt-4o', 1000, 500);
      
      expect(usage.provider).toBe('openai');
      expect(usage.model).toBe('gpt-4o');
      expect(usage.inputTokens).toBe(1000);
      expect(usage.outputTokens).toBe(500);
      expect(usage.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('AnthropicProvider', () => {
    let provider: AnthropicProvider;

    beforeEach(() => {
      provider = new AnthropicProvider('test-key');
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('Anthropic');
    });

    it('should return pricing for all models', () => {
      const pricing = provider.getPricing();
      
      expect(pricing['claude-3-5-sonnet-20241022']).toBeDefined();
      expect(pricing['claude-3-5-sonnet-20241022'].inputTokensPer1k).toBe(0.003);
      expect(pricing['claude-3-5-sonnet-20241022'].outputTokensPer1k).toBe(0.015);
      
      expect(pricing['claude-3-haiku-20240307']).toBeDefined();
      expect(pricing['claude-instant-1.2']).toBeDefined();
    });

    it('should create usage tracking object correctly', () => {
      const usage = provider.trackUsage('claude-3-haiku-20240307', 2000, 1000);
      
      expect(usage.provider).toBe('anthropic');
      expect(usage.model).toBe('claude-3-haiku-20240307');
      expect(usage.inputTokens).toBe(2000);
      expect(usage.outputTokens).toBe(1000);
    });
  });

  describe('GoogleProvider', () => {
    let provider: GoogleProvider;

    beforeEach(() => {
      provider = new GoogleProvider('test-project', undefined);
    });

    it('should have correct name', () => {
      expect(provider.name).toBe('Google');
    });

    it('should return pricing for all models', () => {
      const pricing = provider.getPricing();
      
      expect(pricing['gemini-1.5-pro']).toBeDefined();
      expect(pricing['gemini-1.5-pro'].inputTokensPer1k).toBe(0.00125);
      expect(pricing['gemini-1.5-pro'].outputTokensPer1k).toBe(0.005);
      
      expect(pricing['gemini-1.5-flash']).toBeDefined();
      expect(pricing['text-bison-001']).toBeDefined();
    });

    it('should create usage tracking object correctly', () => {
      const usage = provider.trackUsage('gemini-1.5-flash', 3000, 1500);
      
      expect(usage.provider).toBe('google');
      expect(usage.model).toBe('gemini-1.5-flash');
      expect(usage.inputTokens).toBe(3000);
      expect(usage.outputTokens).toBe(1500);
    });
  });

  describe('Date validation', () => {
    it('should throw error for invalid date range', async () => {
      const provider = new OpenAIProvider('test-key');
      const startDate = new Date('2024-01-02');
      const endDate = new Date('2024-01-01');
      
      await expect(provider.getUsage(startDate, endDate)).rejects.toThrow('Start date must be before end date');
    });

    it('should throw error for future end date', async () => {
      const provider = new OpenAIProvider('test-key');
      const startDate = new Date();
      const endDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      
      await expect(provider.getUsage(startDate, endDate)).rejects.toThrow('End date cannot be in the future');
    });
  });
});
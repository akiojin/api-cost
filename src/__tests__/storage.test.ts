import { UsageStorage } from '../utils/storage';
import { APIUsage } from '../types';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('UsageStorage', () => {
  let storage: UsageStorage;
  const testDataDir = path.join(os.tmpdir(), 'test-api-cost-tracker');

  beforeEach(() => {
    storage = new UsageStorage(testDataDir);
    jest.clearAllMocks();
  });

  describe('ensureDataDir', () => {
    it('should create directory if it does not exist', async () => {
      mockFs.access.mockRejectedValue(new Error('Not found'));
      mockFs.mkdir.mockResolvedValue(undefined);

      await storage.ensureDataDir();

      expect(mockFs.mkdir).toHaveBeenCalledWith(testDataDir, { recursive: true });
    });

    it('should not create directory if it exists', async () => {
      mockFs.access.mockResolvedValue(undefined);

      await storage.ensureDataDir();

      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe('saveUsage', () => {
    it('should save usage data correctly', async () => {
      const usage: APIUsage[] = [
        {
          provider: 'openai',
          model: 'gpt-4o',
          inputTokens: 1000,
          outputTokens: 500,
          timestamp: new Date('2024-01-01')
        }
      ];

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('[]');
      mockFs.writeFile.mockResolvedValue(undefined);

      await storage.saveUsage(usage);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(testDataDir, 'usage-data.json'),
        expect.stringContaining('"provider": "openai"')
      );
    });
  });

  describe('loadUsage', () => {
    it('should load usage data correctly', async () => {
      const mockData = JSON.stringify([
        {
          provider: 'openai',
          model: 'gpt-4o',
          inputTokens: 1000,
          outputTokens: 500,
          timestamp: '2024-01-01T00:00:00.000Z'
        }
      ]);

      mockFs.readFile.mockResolvedValue(mockData);

      const usage = await storage.loadUsage();

      expect(usage).toHaveLength(1);
      expect(usage[0].provider).toBe('openai');
      expect(usage[0].timestamp).toBeInstanceOf(Date);
    });

    it('should return empty array if file does not exist', async () => {
      mockFs.readFile.mockRejectedValue(new Error('Not found'));

      const usage = await storage.loadUsage();

      expect(usage).toEqual([]);
    });
  });

  describe('filterUsageByDateRange', () => {
    it('should filter usage by date range correctly', async () => {
      const mockData = JSON.stringify([
        {
          provider: 'openai',
          model: 'gpt-4o',
          inputTokens: 1000,
          outputTokens: 500,
          timestamp: '2024-01-01T00:00:00.000Z'
        },
        {
          provider: 'anthropic',
          model: 'claude-3-haiku-20240307',
          inputTokens: 2000,
          outputTokens: 1000,
          timestamp: '2024-01-15T00:00:00.000Z'
        },
        {
          provider: 'google',
          model: 'gemini-1.5-flash',
          inputTokens: 3000,
          outputTokens: 1500,
          timestamp: '2024-02-01T00:00:00.000Z'
        }
      ]);

      mockFs.readFile.mockResolvedValue(mockData);

      const startDate = new Date('2024-01-10');
      const endDate = new Date('2024-01-31');
      const filtered = await storage.filterUsageByDateRange(startDate, endDate);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].provider).toBe('anthropic');
    });
  });

  describe('exportUsage', () => {
    const mockUsage = [
      {
        provider: 'openai' as const,
        model: 'gpt-4o',
        inputTokens: 1000,
        outputTokens: 500,
        timestamp: new Date('2024-01-01')
      }
    ];

    beforeEach(() => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockUsage));
      mockFs.writeFile.mockResolvedValue(undefined);
    });

    it('should export data as JSON', async () => {
      await storage.exportUsage('/tmp/export.json', 'json');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/tmp/export.json',
        expect.stringContaining('"provider": "openai"')
      );
    });

    it('should export data as CSV', async () => {
      await storage.exportUsage('/tmp/export.csv', 'csv');

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/tmp/export.csv',
        expect.stringContaining('timestamp,provider,model,inputTokens,outputTokens')
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        '/tmp/export.csv',
        expect.stringContaining('openai,gpt-4o,1000,500')
      );
    });
  });
});
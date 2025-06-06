import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { APIUsage } from '../types';

export class UsageStorage {
  private dataDir: string;
  private dataFile: string;

  constructor(dataDir?: string) {
    this.dataDir = dataDir || path.join(os.homedir(), '.api-cost-tracker');
    this.dataFile = path.join(this.dataDir, 'usage-data.json');
  }

  async ensureDataDir(): Promise<void> {
    try {
      await fs.access(this.dataDir);
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true });
    }
  }

  async saveUsage(usage: APIUsage[]): Promise<void> {
    await this.ensureDataDir();
    const existingData = await this.loadUsage();
    const combinedData = [...existingData, ...usage];
    await fs.writeFile(this.dataFile, JSON.stringify(combinedData, null, 2));
  }

  async loadUsage(): Promise<APIUsage[]> {
    try {
      const data = await fs.readFile(this.dataFile, 'utf-8');
      const parsed = JSON.parse(data);
      // Convert timestamp strings back to Date objects
      return parsed.map((item: any) => ({
        ...item,
        timestamp: new Date(item.timestamp)
      }));
    } catch {
      return [];
    }
  }

  async filterUsageByDateRange(startDate: Date, endDate: Date): Promise<APIUsage[]> {
    const allUsage = await this.loadUsage();
    return allUsage.filter(usage => {
      const usageDate = new Date(usage.timestamp);
      return usageDate >= startDate && usageDate <= endDate;
    });
  }

  async clearUsage(): Promise<void> {
    await this.ensureDataDir();
    await fs.writeFile(this.dataFile, '[]');
  }

  async addSingleUsage(usage: APIUsage): Promise<void> {
    const existingData = await this.loadUsage();
    existingData.push(usage);
    await fs.writeFile(this.dataFile, JSON.stringify(existingData, null, 2));
  }

  async addBatchUsage(usage: APIUsage[]): Promise<void> {
    await this.saveUsage(usage);
  }

  async exportUsage(outputPath: string, format: 'json' | 'csv' = 'json'): Promise<void> {
    const usage = await this.loadUsage();
    
    if (format === 'json') {
      await fs.writeFile(outputPath, JSON.stringify(usage, null, 2));
    } else if (format === 'csv') {
      const csv = this.convertToCSV(usage);
      await fs.writeFile(outputPath, csv);
    }
  }

  private convertToCSV(usage: APIUsage[]): string {
    if (usage.length === 0) return '';
    
    const headers = ['timestamp', 'provider', 'model', 'inputTokens', 'outputTokens'];
    const rows = usage.map(u => [
      u.timestamp.toISOString(),
      u.provider,
      u.model,
      u.inputTokens.toString(),
      u.outputTokens.toString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}
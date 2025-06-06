import { APIProvider, APIUsage, ModelPricing } from '../types';

export abstract class BaseAPIProvider implements APIProvider {
  abstract name: string;
  
  abstract getUsage(startDate: Date, endDate: Date): Promise<APIUsage[]>;
  abstract getPricing(): ModelPricing;
  
  protected validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }
    if (endDate > new Date()) {
      throw new Error('End date cannot be in the future');
    }
  }
}
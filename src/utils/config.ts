import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { ProviderCredentials } from '../types';
import * as dotenv from 'dotenv';

export class ConfigManager {
  private configDir: string;
  private configFile: string;

  constructor(configDir?: string) {
    this.configDir = configDir || path.join(os.homedir(), '.api-cost-tracker');
    this.configFile = path.join(this.configDir, 'config.json');
    
    // Load .env file if it exists
    dotenv.config();
  }

  async ensureConfigDir(): Promise<void> {
    try {
      await fs.access(this.configDir);
    } catch {
      await fs.mkdir(this.configDir, { recursive: true });
    }
  }

  async saveCredentials(credentials: ProviderCredentials): Promise<void> {
    await this.ensureConfigDir();
    const existingConfig = await this.loadCredentials();
    const mergedConfig = { ...existingConfig, ...credentials };
    await fs.writeFile(this.configFile, JSON.stringify(mergedConfig, null, 2));
  }

  async loadCredentials(): Promise<ProviderCredentials> {
    try {
      const data = await fs.readFile(this.configFile, 'utf-8');
      return JSON.parse(data);
    } catch {
      // Fall back to environment variables
      return this.getCredentialsFromEnv();
    }
  }

  private getCredentialsFromEnv(): ProviderCredentials {
    const credentials: ProviderCredentials = {};

    if (process.env.OPENAI_API_KEY) {
      credentials.openai = {
        apiKey: process.env.OPENAI_API_KEY,
        organizationId: process.env.OPENAI_ORGANIZATION_ID
      };
    }

    if (process.env.ANTHROPIC_API_KEY) {
      credentials.anthropic = {
        apiKey: process.env.ANTHROPIC_API_KEY
      };
    }

    if (process.env.GOOGLE_PROJECT_ID) {
      credentials.google = {
        projectId: process.env.GOOGLE_PROJECT_ID,
        apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
        keyFilePath: process.env.GOOGLE_APPLICATION_CREDENTIALS
      };
    }

    return credentials;
  }

  async clearCredentials(): Promise<void> {
    await this.ensureConfigDir();
    try {
      await fs.unlink(this.configFile);
    } catch {
      // File doesn't exist, ignore
    }
  }

  async hasCredentials(): Promise<boolean> {
    const credentials = await this.loadCredentials();
    return !!(credentials.openai || credentials.anthropic || credentials.google);
  }
}
#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { OpenAIProvider, AnthropicProvider, GoogleProvider } from './providers';
import { CostCalculator, UsageStorage, ConfigManager } from './utils';
import { APIUsage, CostSummary } from './types';

const storage = new UsageStorage();
const config = new ConfigManager();

async function fetchAndShowCosts(startDate: Date, endDate: Date, providerFilter?: string, exportPath?: string, exportFormat?: string) {
  const credentials = await config.loadCredentials();
  const providers = [];
  
  if (credentials.openai) {
    providers.push(new OpenAIProvider(credentials.openai.apiKey, credentials.openai.organizationId));
  }
  if (credentials.anthropic) {
    providers.push(new AnthropicProvider(credentials.anthropic.apiKey));
  }
  if (credentials.google) {
    providers.push(new GoogleProvider(credentials.google.projectId, credentials.google.apiKey));
  }

  if (providers.length === 0) {
    console.log(chalk.yellow('No API credentials configured. Run with --config to set up.'));
    return;
  }

  // Fetch usage data
  console.log(chalk.blue(`Fetching usage data from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...\n`));
  
  let totalFetched = 0;
  for (const provider of providers) {
    if (providerFilter && provider.name.toLowerCase() !== providerFilter.toLowerCase()) {
      continue;
    }
    
    try {
      console.log(`Fetching from ${provider.name.toLowerCase()}...`);
      const usage = await provider.getUsage(startDate, endDate);
      
      if (usage.length > 0) {
        await storage.addBatchUsage(usage);
        console.log(chalk.green(`✓ Fetched ${usage.length} usage records from ${provider.name.toLowerCase()}`));
        totalFetched += usage.length;
      } else {
        console.log(chalk.yellow(`No usage data available from ${provider.name.toLowerCase()}`));
      }
    } catch (error) {
      console.error(chalk.red(`✗ Failed to fetch from ${provider.name.toLowerCase()}: ${error instanceof Error ? error.message : error}`));
    }
  }

  if (totalFetched === 0) {
    console.log(chalk.yellow('\nNo usage data was fetched from any provider.'));
    return;
  }

  console.log(chalk.green(`\n✓ Total fetched: ${totalFetched} usage records\n`));

  // Show costs
  let usage = await storage.filterUsageByDateRange(startDate, endDate);
  
  if (providerFilter) {
    usage = usage.filter(u => u.provider === providerFilter.toLowerCase());
  }
  
  if (usage.length === 0) {
    console.log(chalk.yellow('No usage data found for the specified period'));
    return;
  }
  
  const calculator = new CostCalculator(providers);
  const costs = calculator.calculateCosts(usage);
  
  displayCostTable(costs);
  
  const totalCost = calculator.getTotalCost(costs);
  const providerBreakdown = calculator.getProviderBreakdown(costs);
  
  console.log(chalk.bold('\nProvider Breakdown:'));
  for (const [provider, cost] of Object.entries(providerBreakdown)) {
    console.log(`  ${provider}: $${cost.toFixed(4)}`);
  }
  
  console.log(chalk.bold.green(`\nTotal Cost: $${totalCost.toFixed(4)}`));
  
  if (exportPath) {
    await storage.exportUsage(exportPath, exportFormat as 'json' | 'csv' || 'json');
    console.log(chalk.green(`\n✓ Data exported to ${exportPath}`));
  }
}

function displayCostTable(costs: CostSummary[]) {
  const table = new Table({
    head: ['Provider', 'Model', 'Input Tokens', 'Output Tokens', 'Input Cost', 'Output Cost', 'Total Cost'],
    style: { head: ['cyan'] }
  });
  
  for (const cost of costs) {
    table.push([
      cost.provider,
      cost.model,
      cost.inputTokens.toLocaleString(),
      cost.outputTokens.toLocaleString(),
      `$${cost.inputCost.toFixed(4)}`,
      `$${cost.outputCost.toFixed(4)}`,
      chalk.bold(`$${cost.totalCost.toFixed(4)}`)
    ]);
  }
  
  console.log(table.toString());
}

async function showPricing(providerFilter?: string) {
  const providers = [
    new OpenAIProvider('dummy-key'),
    new AnthropicProvider('dummy-key'),
    new GoogleProvider('dummy-project', 'dummy-key')
  ];
  
  for (const provider of providers) {
    if (providerFilter && provider.name.toLowerCase() !== providerFilter.toLowerCase()) {
      continue;
    }
    
    console.log(chalk.bold.blue(`\n${provider.name} Pricing:`));
    const pricing = provider.getPricing();
    
    const table = new Table({
      head: ['Model', 'Input (per 1K tokens)', 'Output (per 1K tokens)'],
      style: { head: ['cyan'] }
    });
    
    for (const [model, rates] of Object.entries(pricing)) {
      table.push([
        model,
        `$${rates.inputTokensPer1k.toFixed(6)}`,
        `$${rates.outputTokensPer1k.toFixed(6)}`
      ]);
    }
    
    console.log(table.toString());
  }
}

async function configureCredentials(options: any) {
  const credentials: any = {};
  
  if (options.openaiKey) {
    credentials.openai = { apiKey: options.openaiKey };
    if (options.openaiOrg) {
      credentials.openai.organizationId = options.openaiOrg;
    }
  }
  
  if (options.anthropicKey) {
    credentials.anthropic = { apiKey: options.anthropicKey };
  }
  
  if (options.googleProject) {
    credentials.google = { projectId: options.googleProject };
    if (options.googleKey) {
      credentials.google.apiKey = options.googleKey;
    }
    if (options.googleKeyFile) {
      credentials.google.keyFilePath = options.googleKeyFile;
    }
  }
  
  await config.saveCredentials(credentials);
  console.log(chalk.green('✓ Credentials saved successfully'));
}

const program = new Command();

program
  .name('api-cost')
  .description('Track and display API usage costs for OpenAI, Anthropic, and Google AI')
  .version('1.0.0')
  .option('-s, --start-date <date>', 'Start date (YYYY-MM-DD)', (value) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) throw new Error('Invalid start date format');
    return date;
  })
  .option('-e, --end-date <date>', 'End date (YYYY-MM-DD)', (value) => {
    const date = new Date(value);
    if (isNaN(date.getTime())) throw new Error('Invalid end date format');
    return date;
  })
  .option('-p, --provider <provider>', 'Filter by provider (openai, anthropic, google)')
  .option('--export <path>', 'Export data to file')
  .option('--format <format>', 'Export format (json, csv)', 'json')
  .option('--pricing [provider]', 'Show pricing information')
  .option('--config', 'Configure API credentials')
  .option('--openai-key <key>', 'OpenAI API key')
  .option('--openai-org <org>', 'OpenAI organization ID')
  .option('--anthropic-key <key>', 'Anthropic API key')
  .option('--google-project <project>', 'Google Cloud project ID')
  .option('--google-key <key>', 'Google Gemini API key')
  .option('--google-key-file <path>', 'Google Cloud service account key file path')
  .option('--clear', 'Clear all tracked usage data')
  .action(async (options) => {
    try {
      // Handle configuration
      if (options.config || options.openaiKey || options.anthropicKey || options.googleProject) {
        await configureCredentials(options);
        return;
      }

      // Handle pricing display
      if (options.pricing !== undefined) {
        await showPricing(typeof options.pricing === 'string' ? options.pricing : undefined);
        return;
      }

      // Handle clear data
      if (options.clear) {
        await storage.clearUsage();
        console.log(chalk.green('✓ All usage data cleared'));
        return;
      }

      // Default action: fetch and show costs
      const endDate = options.endDate || new Date();
      const startDate = options.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
      
      await fetchAndShowCosts(startDate, endDate, options.provider, options.export, options.format);
    } catch (error) {
      console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
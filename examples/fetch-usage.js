#!/usr/bin/env node

// Example: Fetch usage data from provider APIs

const { execSync } = require('child_process');

// Helper function to run commands and display output
function runCommand(cmd) {
  console.log(`\n> ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error('Command failed:', error.message);
  }
}

console.log('=== API Cost Tracker - Fetch Usage Example ===\n');

// Note: Make sure you have configured your credentials first:
// api-cost config --openai-key YOUR_KEY --anthropic-key YOUR_KEY --google-project YOUR_PROJECT

console.log('1. Fetching usage data from all configured providers (last 7 days):');
runCommand('api-cost fetch');

console.log('\n2. Fetching usage for specific date range:');
runCommand('api-cost fetch --start-date 2024-01-01 --end-date 2024-01-31');

console.log('\n3. Fetching from specific provider:');
runCommand('api-cost fetch --provider openai --start-date 2024-01-15');

console.log('\n4. Viewing fetched usage costs:');
runCommand('api-cost show');

console.log('\n5. Exporting usage data:');
runCommand('api-cost show --export usage-report.json');
runCommand('api-cost show --export usage-report.csv --format csv');

console.log('\n=== Example Complete ===');
console.log('\nNotes:');
console.log('- OpenAI: Requires API key with usage permissions');
console.log('- Anthropic: Requires admin API access for usage data');
console.log('- Google: Requires Cloud Monitoring API enabled and proper service account permissions');
console.log('\nFor manual tracking when API access is not available:');
console.log('api-cost track --provider openai --model gpt-4 --input-tokens 1000 --output-tokens 500');
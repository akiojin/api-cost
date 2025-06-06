const { OpenAIProvider, AnthropicProvider, GoogleProvider } = require('../dist/providers');
const { UsageStorage, CostCalculator } = require('../dist/utils');

async function trackAndDisplayUsage() {
  const storage = new UsageStorage();
  
  // プロバイダーのセットアップ
  const providers = [
    new OpenAIProvider(process.env.OPENAI_API_KEY),
    new AnthropicProvider(process.env.ANTHROPIC_API_KEY),
    new GoogleProvider(process.env.GOOGLE_PROJECT_ID, process.env.GOOGLE_APPLICATION_CREDENTIALS)
  ];
  
  // 使用量を手動で追跡
  const usage = [
    providers[0].trackUsage('gpt-4o', 10000, 5000),
    providers[0].trackUsage('gpt-3.5-turbo', 50000, 25000),
    providers[1].trackUsage('claude-3-haiku-20240307', 30000, 15000),
    providers[2].trackUsage('gemini-1.5-flash', 100000, 50000)
  ];
  
  // 使用量を保存
  await storage.saveUsage(usage);
  
  // コスト計算
  const calculator = new CostCalculator(providers);
  const costs = calculator.calculateCosts(usage);
  
  // 結果を表示
  console.log('API Usage Summary:');
  console.log('==================');
  
  costs.forEach(cost => {
    console.log(`
Provider: ${cost.provider}
Model: ${cost.model}
Input Tokens: ${cost.inputTokens.toLocaleString()}
Output Tokens: ${cost.outputTokens.toLocaleString()}
Input Cost: $${cost.inputCost.toFixed(4)}
Output Cost: $${cost.outputCost.toFixed(4)}
Total Cost: $${cost.totalCost.toFixed(4)}
    `);
  });
  
  const totalCost = calculator.getTotalCost(costs);
  console.log(`Total Cost: $${totalCost.toFixed(4)}`);
}

// 実行
trackAndDisplayUsage().catch(console.error);
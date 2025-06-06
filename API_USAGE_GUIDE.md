# API Usage Data Fetching Guide

This guide explains how to fetch actual usage data from OpenAI, Anthropic, and Google Cloud APIs.

## Prerequisites

### OpenAI
- API key with appropriate permissions
- Organization ID (optional)
- Note: OpenAI's usage API may require specific account permissions

### Anthropic
- API key with admin access (for usage data)
- Standard API keys may not have access to usage endpoints
- Consider contacting Anthropic for admin API access if needed

### Google Cloud
- Project ID
- Service account with appropriate permissions:
  - `monitoring.timeSeries.list` permission for Cloud Monitoring API
  - `billing.accounts.getSpendingInformation` permission for billing data (optional)
- Service account key file (JSON format)
- Enable the following APIs in your Google Cloud project:
  - Cloud Monitoring API
  - Cloud Billing API (optional, for more detailed data)

## Configuration

First, configure your credentials:

```bash
# OpenAI
api-cost config --openai-key YOUR_API_KEY --openai-org YOUR_ORG_ID

# Anthropic
api-cost config --anthropic-key YOUR_API_KEY

# Google Cloud
api-cost config --google-project YOUR_PROJECT_ID --google-key-file /path/to/service-account-key.json
```

Alternatively, you can use environment variables:
- `OPENAI_API_KEY` and `OPENAI_ORGANIZATION_ID`
- `ANTHROPIC_API_KEY`
- `GOOGLE_PROJECT_ID` and `GOOGLE_APPLICATION_CREDENTIALS`

## Fetching Usage Data

Use the `fetch` command to retrieve usage data from the APIs:

```bash
# Fetch from all configured providers (last 7 days by default)
api-cost fetch

# Fetch from specific provider
api-cost fetch --provider openai

# Fetch for specific date range
api-cost fetch --start-date 2024-01-01 --end-date 2024-01-31

# Fetch from specific provider for specific dates
api-cost fetch --provider google --start-date 2024-01-15 --end-date 2024-01-20
```

## API-Specific Notes

### OpenAI
- Usage data is aggregated daily
- May have delays (data might not be immediately available)
- Returns data grouped by model
- Includes request counts and token usage

### Anthropic
- Requires admin API access for usage data
- If admin access is not available, you'll need to track usage manually
- Use the `track` command to manually record usage after each API call

### Google Cloud
- Uses Cloud Monitoring API to fetch metrics
- Data granularity depends on your monitoring setup
- For detailed billing data, consider setting up Cloud Billing export to BigQuery
- Token metrics may not be available for all models

## Viewing Fetched Data

After fetching, view your usage and costs:

```bash
# Show all usage
api-cost show

# Show usage for specific date range
api-cost show --start-date 2024-01-01 --end-date 2024-01-31

# Filter by provider
api-cost show --provider openai

# Export data
api-cost show --export usage-report.json
api-cost show --export usage-report.csv --format csv
```

## Troubleshooting

### No data returned
1. Check your API credentials have the necessary permissions
2. Verify you've made API calls within the date range
3. Some providers may have delays in usage data availability

### Permission errors
- **OpenAI**: Ensure your API key has usage read permissions
- **Anthropic**: Admin API access may be required
- **Google**: Check service account permissions and enabled APIs

### Manual tracking fallback
If automatic fetching doesn't work, you can manually track usage:

```bash
api-cost track --provider openai --model gpt-4 --input-tokens 1000 --output-tokens 500
```

## Best Practices

1. **Regular fetching**: Set up a cron job to fetch usage data daily
2. **Data retention**: Export important data regularly as backup
3. **Cost monitoring**: Use the `show` command regularly to monitor costs
4. **API limits**: Be aware of rate limits when fetching historical data

## Example Workflow

```bash
# 1. Configure credentials
api-cost config --openai-key sk-... --anthropic-key ant-... 

# 2. Fetch recent usage
api-cost fetch --start-date 2024-01-01

# 3. View costs
api-cost show

# 4. Export for reporting
api-cost show --export monthly-report.csv --format csv
```
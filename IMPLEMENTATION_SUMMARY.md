# Implementation Summary - API Usage Fetching

## Overview
This document summarizes the implementation of actual API usage data fetching for OpenAI, Anthropic, and Google Cloud providers.

## Changes Made

### 1. OpenAI Provider (`src/providers/openai.ts`)
- **Implementation**: Uses OpenAI's `/v1/usage` endpoint to fetch daily usage data
- **Authentication**: Bearer token with optional organization ID header
- **Data Format**: Fetches daily aggregated data for the specified date range
- **Fallback**: Attempts to use SDK methods if available
- **Error Handling**: Graceful error handling with informative messages

Key features:
- Iterates through each day in the date range
- Parses usage data including input/output tokens
- Includes metadata like request counts and organization ID

### 2. Anthropic Provider (`src/providers/anthropic.ts`)
- **Implementation**: Attempts to use admin API endpoints for usage data
- **Authentication**: Uses `x-api-key` header with Anthropic API key
- **Endpoints Tried**:
  1. `/v1/organizations/usage` (admin API)
  2. `/v1/billing/usage` (billing API fallback)
- **Limitations**: Requires admin API access which may not be available for all users
- **Error Handling**: Falls back gracefully with helpful messages about manual tracking

Key features:
- Parses both organization usage and billing data formats
- Includes cost information in metadata when available
- Clear messaging about API access requirements

### 3. Google Provider (`src/providers/google.ts`)
- **Implementation**: Uses Google Cloud Monitoring API to fetch metrics
- **Authentication**: Service account with JSON key file
- **Dependencies**: Added `@google-cloud/billing` and `@google-cloud/monitoring`
- **Metrics Queried**:
  - `aiplatform.googleapis.com/prediction/online/request_count`
  - Token count metrics when available
- **Error Handling**: Provides helpful setup instructions

Key features:
- Supports service account authentication
- Queries Cloud Monitoring for AI Platform metrics
- Normalizes Google model IDs to friendly names
- Suggests BigQuery export for detailed billing data

### 4. CLI Updates (`src/cli.ts`)
- Added new `fetch` command to retrieve usage data from APIs
- Updated configuration to support Google service account key file
- Enhanced error messages with provider-specific details
- Added batch processing for fetched usage data

### 5. Storage Updates (`src/utils/storage.ts`)
- Added `addBatchUsage()` method for bulk inserting fetched data
- Maintains compatibility with existing single usage tracking

### 6. Type Updates
- Updated `ProviderCredentials` to include `keyFilePath` for Google
- Maintained backward compatibility with existing types

## Usage Examples

### Configuration
```bash
# OpenAI
api-cost config --openai-key YOUR_KEY --openai-org YOUR_ORG

# Anthropic
api-cost config --anthropic-key YOUR_KEY

# Google
api-cost config --google-project PROJECT_ID --google-key-file /path/to/key.json
```

### Fetching Usage
```bash
# Fetch from all providers
api-cost fetch

# Fetch specific date range
api-cost fetch --start-date 2024-01-01 --end-date 2024-01-31

# Fetch from specific provider
api-cost fetch --provider openai
```

## API Requirements

### OpenAI
- API key with usage read permissions
- Organization ID (optional but recommended)
- Usage data may have delays

### Anthropic
- Admin API access required for usage data
- Standard API keys cannot access usage endpoints
- Consider contacting Anthropic for admin access

### Google Cloud
- Service account with proper permissions:
  - `monitoring.timeSeries.list`
  - `billing.accounts.getSpendingInformation` (optional)
- Enabled APIs:
  - Cloud Monitoring API
  - Cloud Billing API (optional)

## Testing
- All existing tests updated to handle new constructor parameters
- Tests passing successfully
- Maintains backward compatibility

## Documentation
- Created `API_USAGE_GUIDE.md` with detailed setup instructions
- Updated `README.md` with fetch functionality
- Added example script `examples/fetch-usage.js`

## Future Enhancements
1. Add support for pagination in API responses
2. Implement caching to reduce API calls
3. Add support for more granular time periods
4. Implement BigQuery integration for Google Cloud billing data
5. Add webhook support for real-time usage tracking
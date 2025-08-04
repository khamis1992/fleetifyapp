# Legal AI API Edge Function

## Overview
This edge function provides intelligent legal consultation services with automatic query classification and system data integration.

## Features

### Query Classification
The system automatically classifies incoming queries into two types:
- **Legal Advice**: General legal questions requiring expert consultation
- **System Data**: Questions about customers, payments, contracts, and financial data

### Supported Endpoints

#### 1. Legal Advice (`/legal-advice`)
Handles both general legal advice and system data queries through intelligent routing.

**Classification Patterns:**
- Payment-related queries (Arabic/English)
- Customer information requests
- Contract status inquiries
- Financial reporting questions

#### 2. System Data Integration
When a query is classified as system data, the function:
- Fetches relevant data from the database
- Provides AI analysis with actual numbers
- Returns structured data alongside the response

#### 3. Security & Permissions
- User authentication required for system data access
- Company-based data isolation
- Role-based access control
- Comprehensive audit logging

## Usage Examples

### System Data Queries (Arabic)
- "هل يوجد عميل لم يدفع؟" (Is there a client who hasn't paid?)
- "معلومات العميل" (Customer information)
- "حالة العقود" (Contract status)
- "تقرير مالي" (Financial report)

### System Data Queries (English)
- "Show me unpaid customers"
- "Customer statistics"
- "Contract overview"
- "Financial summary"

## Response Format

### System Data Response
```json
{
  "success": true,
  "advice": "AI-generated analysis based on system data",
  "system_data": {
    "outstanding_summary": {
      "total_outstanding": 15000,
      "customers_count": 5
    },
    "customer_statistics": {...},
    "contract_statistics": {...}
  },
  "metadata": {
    "source": "system_data_with_ai",
    "query_type": "system_data",
    "data_sources": ["customers", "invoices", "contracts"],
    "confidence": 0.95,
    "response_time": 1200
  }
}
```

## Configuration

Ensure the following environment variables are set:
- `OPENAI_API_KEY`: OpenAI API key for AI responses
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access
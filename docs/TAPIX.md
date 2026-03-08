# Tapix Integration

This project integrates with [Tapix](https://developers.tapix.io/documentation) to enrich card payment data with processor and store information.

## Features

- **Card Enrichment**: Get detailed information about card processors and merchants
- **Transaction Details**: Fetch transaction metadata from Tapix
- **Store Information**: Access store location and category data

## Configuration

The Tapix authentication token is stored securely as an environment variable:
- `TAPIX_TOKEN` - JWT bearer token for Tapix API authentication

## Usage

### Frontend Integration

Use the `enrichWithTapix` helper function:

```typescript
import { enrichWithTapix } from '@/lib/tapix';

// Basic card enrichment
const result = await enrichWithTapix('4111111111111111', 100.00);

// With transaction ID
const result = await enrichWithTapix(
  '4111111111111111',
  100.00,
  'tapix_transaction_id'
);

if (result.success) {
  console.log('Processor:', result.enrichment?.processor);
  console.log('Store:', result.enrichment?.store);
  console.log('Transaction:', result.transaction);
}
```

### Edge Function

The `tapix-enrich` edge function handles secure API calls to Tapix:

**Endpoint**: `/functions/v1/tapix-enrich`

**Request Body**:
```json
{
  "cardNumber": "4111111111111111",
  "amount": 100.00,
  "transactionId": "optional_tapix_transaction_id"
}
```

**Response**:
```json
{
  "success": true,
  "enrichment": {
    "processor": "Visa",
    "store": "Example Store",
    "merchant_name": "Example Merchant",
    "category": "Retail",
    "location": {
      "city": "New York",
      "state": "NY",
      "country": "US"
    }
  },
  "transaction": {
    "id": "tapix_transaction_id",
    "amount": 100.00,
    "currency": "USD",
    "status": "completed"
  }
}
```

## API Endpoints

### Enrich Endpoint
- **URL**: `https://api.tapix.io/v1/enrich`
- **Method**: POST
- **Headers**: `Authorization: Bearer {TAPIX_TOKEN}`
- **Body**: `{ card_number, amount }`

### Transaction Endpoint
- **URL**: `https://api.tapix.io/v1/transactions/{transactionId}`
- **Method**: GET
- **Headers**: `Authorization: Bearer {TAPIX_TOKEN}`

## Security

- The Tapix token is never exposed to the frontend
- All API calls are proxied through the secure edge function
- Token is stored as an encrypted environment variable

## Error Handling

The enrichment function returns a structured response with error information:

```typescript
if (!result.success) {
  console.error('Enrichment failed:', result.error);
}
```

## Resources

- [Tapix Developer Documentation](https://developers.tapix.io/documentation)
- [Tapix API Reference](https://api.tapix.io/docs)

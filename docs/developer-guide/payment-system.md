# Developer Guide - Payment System

## Getting Started

هذا الدليل للمطورين الجدد على نظام المدفوعات في FleetifyApp.

---

## Quick Start

### 1. Creating Your First Payment

```typescript
import { paymentService } from '@/services/PaymentService';

const paymentData = {
  company_id: 'your-company-id',
  customer_id: 'customer-id',
  payment_date: new Date().toISOString(),
  amount: 1000,
  payment_method: 'cash',
  payment_type: 'rental_income',
  transaction_type: 'income',
  idempotency_key: 'unique-key-' + Date.now()
};

const result = await paymentService.createPayment(paymentData);
```

### 2. Processing a Payment

```typescript
import { paymentService } from '@/services/PaymentService';

const result = await paymentService.processPayment(paymentId);
```

### 3. Linking Payments

```typescript
import { paymentLinkingService } from '@/services/PaymentLinkingService';

// Auto-match
const result = await paymentLinkingService.attemptAutoMatch(payment);

// Manual match
await paymentLinkingService.matchPayment(payment.id, 'invoice', 'target-invoice-id');
```

---

## Best Practices

1. **Always use idempotency keys**
2. **Validate before processing**
3. **Use transactions for complex operations**
4. **Handle errors gracefully**
5. **Monitor payment queues**

---

## Troubleshooting

### Common Issues

- **Payment Not Created**: Check validation errors
- **Payment Stuck**: Check payment queue
- **Duplicate Payments**: Verify idempotency_key
- **Late Fees Not Applied**: Check late fee rules

---

## Resources

- **Architecture**: `docs/architecture/payment-system.md`
- **API**: `docs/api/payment-service.md`
- **Database**: `.claude/DATABASE_SCHEMA_REFERENCE.md`

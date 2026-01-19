# 📚 دليل المطور - FleetifyApp

<div align="center">

# 🚀 FleetifyApp Developer Guide

**دليلك الشامل للتطوير في FleetifyApp**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)]()
[![React](https://img.shields.io/badge/React-19-61DAFB)]()
[![Zustand](https://img.shields.io/badge/Zustand-4.0-orange)]()
[![React Query](https://img.shields.io/badge/React_Query-5.0-red)]()

</div>

---

## 📖 جدول المحتويات

1. [بنية المشروع](#بنية-المشروع)
2. [أنماط التصميم](#أنماط-التصميم)
3. [معايير الكود](#معايير-الكود)
4. [أمثلة عملية](#أمثلة-عملية)
5. [الاختبار](#الاختبار)
6. [الأداء](#الأداء)

---

## 🏗️ بنية المشروع

### الهيكل العام
```
src/
├── services/              # Business Logic Layer
│   ├── core/             # Base classes
│   ├── repositories/     # Data Access Layer
│   ├── ContractService.ts
│   ├── PaymentService.ts
│   └── InvoiceService.ts
│
├── hooks/                # React Hooks
│   ├── company/         # Company-related hooks
│   ├── data/            # Data fetching hooks
│   └── useBackgroundJob.ts
│
├── stores/               # Zustand State Management
│   └── appStore.ts
│
├── events/              # Event System
│   ├── EventBus.ts
│   ├── types.ts
│   └── handlers/
│
├── workflows/           # Workflow Engine
│   ├── WorkflowEngine.ts
│   ├── templates.ts
│   └── types.ts
│
├── jobs/                # Background Jobs
│   └── JobQueue.ts
│
├── workers/             # Web Workers
│   └── ReportGenerationWorker.ts
│
├── components/          # React Components
│   ├── contracts/
│   ├── payments/
│   ├── approval/
│   └── ui/
│
├── lib/                 # Utilities
│   ├── AppError.ts
│   ├── enhancedErrorHandler.ts
│   ├── queryClient.ts
│   └── logger.ts
│
└── types/               # TypeScript Types
    ├── contracts.ts
    ├── payment.ts
    └── invoice.ts
```

---

## 🎯 أنماط التصميم

### 1. Service Layer Pattern

#### البنية:
```
Component → Service → Repository → Database
```

#### المثال:
```typescript
// ❌ قبل: منطق تجاري في Component
const MyComponent = () => {
  const handleCreate = async () => {
    // 100+ lines of business logic
    const { data, error } = await supabase.from('contracts').insert(...);
    // More logic...
  };
};

// ✅ بعد: استخدام Service
const MyComponent = () => {
  const createContract = useCreateContract();
  
  const handleCreate = async (data) => {
    await createContract.mutateAsync({
      data,
      userId: user.id,
      companyId: company.id
    });
  };
};
```

---

### 2. Repository Pattern

#### الهدف:
عزل منطق الوصول للبيانات عن المنطق التجاري.

#### المثال:
```typescript
// ✅ Repository: Data Access Only
export class ContractRepository extends BaseRepository<Contract> {
  async findByCompany(companyId: string): Promise<Contract[]> {
    return this.findWhere({ company_id: companyId });
  }
}

// ✅ Service: Business Logic
export class ContractService extends BaseService<Contract> {
  async createContract(data, userId, companyId): Promise<Contract> {
    // Validation
    // Business rules
    // Call repository
    return this.repository.create(data);
  }
}
```

---

### 3. Event-Driven Pattern

#### الهدف:
فصل العمليات المترابطة بدلاً من coupling مباشر.

#### المثال:
```typescript
// ✅ Publish event after creating contract
const contract = await contractService.createContract(data, userId, companyId);

eventBus.publish(createEvent(
  EventType.CONTRACT_CREATED,
  contract,
  companyId,
  userId
));

// ✅ Subscribe to handle the event
eventBus.subscribe(EventType.CONTRACT_CREATED, async (event) => {
  // Generate payment schedule
  // Send notifications
  // Update statistics
});
```

---

### 4. State Machine Pattern

#### الهدف:
إدارة حالات معقدة بوضوح.

#### المثال:
```typescript
// ✅ Workflow states
enum WorkflowStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// ✅ Valid transitions
const transitions = {
  pending: ['in_progress', 'cancelled'],
  in_progress: ['approved', 'rejected'],
  approved: [],
  rejected: []
};
```

---

## 📝 معايير الكود

### 1. التسمية

```typescript
// ✅ Components: PascalCase
const ContractForm = () => { ... }
const PaymentList = () => { ... }

// ✅ Functions: camelCase
const handleSubmit = () => { ... }
const validateData = () => { ... }

// ✅ Constants: UPPER_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = '...';

// ✅ Types/Interfaces: PascalCase
interface Contract { ... }
type PaymentStatus = '...';

// ✅ Files: kebab-case or PascalCase for components
contract-service.ts
ContractForm.tsx
```

---

### 2. TypeScript

```typescript
// ✅ استخدم أنواع قوية
interface CreateContractData {
  customer_id: string;
  amount: number;
  // ...
}

async function createContract(data: CreateContractData): Promise<Contract> {
  // ...
}

// ❌ تجنب any
const data: any = { ... }; // ❌

// ✅ استخدم unknown إذا لزم
const data: unknown = { ... }; // ✅
if (typeof data === 'object') { ... }
```

---

### 3. معالجة الأخطاء

```typescript
// ✅ استخدم AppError للأخطاء المتوقعة
throw new AppError(
  ErrorType.VALIDATION,
  'Invalid data',
  { field: 'amount' },
  'البيانات غير صحيحة'
);

// ✅ استخدم try-catch
try {
  await service.create(data);
} catch (error) {
  ErrorHandler.handle(error);
  // معالجة محددة
}

// ✅ استخدم Factory methods
throw AppError.notFound('Contract', contractId);
throw AppError.unauthorized('delete contract');
```

---

### 4. React Hooks

```typescript
// ✅ استخدم Hooks المتخصصة
const { companyId } = useCompanyAccess();
const { hasGlobalAccess } = useCompanyPermissions();

// ✅ استخدم React Query للبيانات
const { data: contracts, isLoading } = useContracts(companyId);

// ✅ استخدم Zustand للحالة العامة
const user = useUser();
const notifications = useNotifications();

// ❌ تجنب Context API للبيانات المتغيرة
// ✅ Context API فقط للبيانات الثابتة (theme, auth)
```

---

## 💻 أمثلة عملية

### مثال 1: إنشاء Service جديد

```typescript
// 1. Create Repository
import { BaseRepository } from '@/services/core/BaseRepository';

export class ProductRepository extends BaseRepository<Product> {
  constructor() {
    super('products');
  }
  
  // Add custom queries
  async findByCategory(category: string): Promise<Product[]> {
    return this.findWhere({ category });
  }
}

// 2. Create Service
import { BaseService } from '@/services/core/BaseService';

export class ProductService extends BaseService<Product> {
  constructor() {
    super(new ProductRepository(), 'ProductService');
  }
  
  // Override lifecycle hooks
  protected async beforeCreate(data: Omit<Product, 'id'>) {
    // Custom validation
    if (data.price <= 0) {
      throw AppError.validation('Price must be positive');
    }
    return data;
  }
  
  protected async afterCreate(product: Product) {
    // Emit event
    eventBus.publish(createEvent(
      EventType.PRODUCT_CREATED,
      product,
      product.company_id
    ));
  }
}

// 3. Export singleton
export const productService = new ProductService();
```

---

### مثال 2: استخدام React Query

```typescript
// في hooks/data/useProducts.ts
import { useQuery, useMutation } from '@tanstack/react-query';
import { productService } from '@/services';
import { queryKeys } from '@/lib/queryClient';

export function useProducts(companyId: string) {
  return useQuery({
    queryKey: ['products', companyId],
    queryFn: () => productService.getByCompany(companyId),
    enabled: !!companyId
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => productService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('تم الإنشاء بنجاح');
    }
  });
}

// في Component
const ProductList = () => {
  const { companyId } = useCompanyAccess();
  const { data: products, isLoading } = useProducts(companyId!);
  const createProduct = useCreateProduct();
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      {products?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
};
```

---

### مثال 3: استخدام Event System

```typescript
// 1. تعريف Event Type
export enum EventType {
  PRODUCT_CREATED = 'product.created',
  PRODUCT_UPDATED = 'product.updated'
}

// 2. تسجيل Handler
eventBus.subscribe(EventType.PRODUCT_CREATED, async (event) => {
  const product = event.data;
  
  // Update inventory
  await inventoryService.update(product.id);
  
  // Send notification
  await notificationService.send({
    type: 'product_created',
    recipients: [product.created_by],
    data: product
  });
});

// 3. إصدار Event
const product = await productService.create(data);

eventBus.publish(createEvent(
  EventType.PRODUCT_CREATED,
  product,
  companyId,
  userId
));
```

---

### مثال 4: استخدام Workflow System

```typescript
// إنشاء workflow للموافقة
const workflow = await workflowEngine.createWorkflow({
  entity_type: WorkflowEntityType.CONTRACT,
  entity_id: contract.id,
  company_id: companyId,
  steps: [
    {
      step_number: 1,
      name: 'مراجعة مدير المبيعات',
      approver_role: ['sales_manager'],
      required: true
    },
    {
      step_number: 2,
      name: 'موافقة المدير المالي',
      approver_role: ['financial_manager'],
      required: true
    }
  ],
  created_by: userId
});

// الموافقة
await workflowEngine.approve({
  workflow_id: workflow.id,
  user_id: userId,
  comments: 'موافق'
});
```

---

### مثال 5: Background Jobs

```typescript
// 1. تسجيل Handler
jobQueue.registerHandler('generate-report', async (job) => {
  // Heavy computation
  const report = await generateHeavyReport(job.data);
  return report;
});

// 2. استخدام في Component
const ReportGenerator = () => {
  const { startJob, job, isRunning, progress, result } = useBackgroundJob();
  
  const handleGenerate = async () => {
    await startJob(
      'تقرير المبيعات',
      'generate-report',
      { month: '2025-11' },
      JobPriority.HIGH
    );
  };
  
  return (
    <div>
      <Button onClick={handleGenerate} disabled={isRunning}>
        توليد التقرير
      </Button>
      
      {isRunning && (
        <Progress value={progress} />
      )}
      
      {result && (
        <ReportView data={result} />
      )}
    </div>
  );
};
```

---

## 🧪 الاختبار

### Unit Tests

```typescript
// ContractService.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ContractService } from '@/services/ContractService';

describe('ContractService', () => {
  let service: ContractService;
  
  beforeEach(() => {
    service = new ContractService();
  });
  
  it('should create contract successfully', async () => {
    const data = {
      customer_id: '123',
      contract_amount: 5000,
      start_date: '2025-01-01',
      end_date: '2025-12-31',
      contract_type: 'monthly_rental'
    };
    
    const result = await service.createContract(data, 'user-1', 'company-1');
    
    expect(result.success).toBe(true);
    expect(result.contract_id).toBeDefined();
  });
  
  it('should validate contract data', async () => {
    const invalidData = {
      customer_id: '',
      contract_amount: -100
    };
    
    await expect(
      service.createContract(invalidData as any, 'user-1', 'company-1')
    ).rejects.toThrow();
  });
});
```

---

## ⚡ الأداء

### Best Practices

```typescript
// ✅ useMemo للحسابات المكلفة
const expensiveValue = useMemo(() => {
  return data.reduce((sum, item) => sum + item.value, 0);
}, [data]);

// ✅ useCallback للدوال
const handleClick = useCallback((id: string) => {
  doSomething(id);
}, []);

// ✅ React.memo للمكونات
export const ExpensiveComponent = React.memo(({ data }) => {
  return <div>{/* render */}</div>;
});

// ✅ React Query للتخزين المؤقت
const { data } = useContracts(companyId);
// ✅ Cached for 5 minutes!

// ✅ Specialized Hooks للتقليل من re-renders
const { companyId } = useCompanyAccess(); // فقط ما تحتاج
```

---

## 📊 الملخص

### الأنماط المعتمدة:
- ✅ Service Layer Pattern
- ✅ Repository Pattern
- ✅ Event-Driven Architecture
- ✅ State Machine Pattern
- ✅ Hook Composition Pattern

### التقنيات:
- ✅ TypeScript (strict mode)
- ✅ React Query (caching & server state)
- ✅ Zustand (global state)
- ✅ Web Workers (background jobs)
- ✅ Event System (decoupling)

### المبادئ:
- ✅ SOLID Principles
- ✅ Clean Code
- ✅ DRY (Don't Repeat Yourself)
- ✅ Single Responsibility
- ✅ Separation of Concerns

---

**تاريخ الإنشاء:** نوفمبر 2025  
**الإصدار:** 1.0  
**الحالة:** ✅ مكتمل

---

> **"الكود الجيد هو كود يمكن قراءته وفهمه بسهولة. اتبع المعايير!"**

**🎯 للمزيد من التفاصيل، راجع أمثلة الكود في المشروع.**

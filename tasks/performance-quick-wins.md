# Performance Quick Wins - Immediate Actions
**Implementation Guide with Code Examples**

## 1. Icon Tree-Shaking (30 min, -400KB)

### Current Problem
```typescript
// Currently importing all 500+ icons
import { Home, User, Settings, /* ...500 more */ } from 'lucide-react';
// Bundle size: 538KB (136KB gzip)
```

### Solution: Create Custom Icon Bundle
```typescript
// src/components/ui/icons.ts
// Export ONLY the icons you actually use
export {
  // Navigation (10 icons)
  Home,
  Menu,
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Plus,

  // Finance (15 icons)
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  CreditCard,
  Calendar,
  FileText,
  Download,
  Upload,
  Check,
  X,
  AlertCircle,
  Info,
  Loader,
  Save,

  // Fleet (15 icons)
  Truck,
  Car,
  MapPin,
  Navigation,
  Fuel,
  Tool,
  AlertTriangle,
  Clock,
  Users,
  Building,
  Package,
  Clipboard,
  Edit,
  Trash,
  Eye,

  // Add only icons you use...
} from 'lucide-react';
```

```typescript
// Update all imports across the app
// Before:
import { Home } from 'lucide-react';

// After:
import { Home } from '@/components/ui/icons';
```

**Expected savings:** 400KB → 50KB (90% reduction)

---

## 2. Lazy Load Heavy Libraries (1 hour, -1.4MB)

### html2canvas (566KB)
```typescript
// src/hooks/useExportToPDF.ts
// Before:
import html2canvas from 'html2canvas';

export const useExportToPDF = () => {
  const exportToPDF = async (element: HTMLElement) => {
    const canvas = await html2canvas(element);
    // ...
  };
};

// After:
export const useExportToPDF = () => {
  const exportToPDF = async (element: HTMLElement) => {
    // Lazy load only when needed
    const { default: html2canvas } = await import('html2canvas');
    const canvas = await html2canvas(element);
    // ...
  };
};
```

### xlsx (404KB)
```typescript
// src/hooks/useExcelExport.ts
// Before:
import * as XLSX from 'xlsx';

// After:
export const useExcelExport = () => {
  const exportToExcel = async (data: any[]) => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    // ...
  };
};
```

### recharts (402KB)
```typescript
// src/pages/Dashboard.tsx
// Before:
import { LineChart, BarChart } from 'recharts';

// After:
const LineChart = lazy(() =>
  import('recharts').then(module => ({ default: module.LineChart }))
);
const BarChart = lazy(() =>
  import('recharts').then(module => ({ default: module.BarChart }))
);

// Use with Suspense
<Suspense fallback={<ChartSkeleton />}>
  <LineChart data={data} />
</Suspense>
```

**Expected savings:** 1.4MB → loaded on demand

---

## 3. Enhanced Code Splitting (2 hours, -500KB)

### Update vite.config.ts
```typescript
// vite.config.ts
export default defineConfig(({ mode }) => ({
  // ... existing config ...

  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separate vendor libraries
          if (id.includes('node_modules')) {
            // PDF/Export libraries
            if (id.includes('html2canvas') || id.includes('jspdf') || id.includes('html2pdf')) {
              return 'pdf-vendor';
            }
            // Excel libraries
            if (id.includes('xlsx') || id.includes('papaparse')) {
              return 'excel-vendor';
            }
            // Chart libraries
            if (id.includes('recharts')) {
              return 'charts-vendor';
            }
            // Map libraries
            if (id.includes('leaflet')) {
              return 'map-vendor';
            }
            // Icons
            if (id.includes('lucide-react')) {
              return 'icons-vendor';
            }
            // React ecosystem
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'react-vendor';
            }
            // UI components
            if (id.includes('@radix-ui') || id.includes('framer-motion')) {
              return 'ui-vendor';
            }
            // Data/API
            if (id.includes('supabase') || id.includes('@tanstack/react-query')) {
              return 'data-vendor';
            }

            // Everything else
            return 'common-vendor';
          }

          // Split large pages
          if (id.includes('/pages/Contracts')) return 'page-contracts';
          if (id.includes('/pages/Dashboard')) return 'page-dashboard';
          if (id.includes('/pages/ChartOfAccounts')) return 'page-chart-accounts';
        },

        // Better file naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          if (facadeModuleId) {
            if (facadeModuleId.includes('pages/')) {
              return 'pages/[name]-[hash].js';
            }
            if (facadeModuleId.includes('vendor')) {
              return 'vendor/[name]-[hash].js';
            }
          }
          return 'chunks/[name]-[hash].js';
        }
      },

      // Better tree-shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    }
  }
}));
```

---

## 4. Service Worker Setup (3 hours)

### Install Workbox
```bash
npm install -D workbox-core workbox-precaching workbox-routing workbox-strategies workbox-expiration
npm install -D vite-plugin-pwa
```

### Configure PWA Plugin
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],

      manifest: {
        name: 'Fleetify - إدارة الأساطيل',
        short_name: 'Fleetify',
        description: 'نظام متكامل لإدارة الأساطيل والمركبات',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },

      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 7 * 24 * 60 * 60 // 7 days
              }
            }
          },
          {
            urlPattern: /\.(?:js|css)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources'
            }
          }
        ]
      }
    })
  ]
});
```

### Register Service Worker
```typescript
// src/main.tsx
import { registerSW } from 'virtual:pwa-register';

// Register service worker
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('تحديث جديد متاح. هل تريد تحديث التطبيق الآن؟')) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log('App ready to work offline');
  }
});
```

---

## 5. Virtual Scrolling for Large Lists (2 hours)

### Install (Already in dependencies)
```bash
# Already installed: @tanstack/react-virtual
```

### Implement for Contracts List
```typescript
// src/components/contracts/ContractsVirtualList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

interface Props {
  contracts: Contract[];
  onContractClick: (contract: Contract) => void;
}

export function ContractsVirtualList({ contracts, onContractClick }: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: contracts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimate row height
    overscan: 5 // Render 5 extra items above/below viewport
  });

  return (
    <div
      ref={parentRef}
      className="h-[600px] overflow-auto" // Fixed height container
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const contract = contracts[virtualRow.index];

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`
              }}
            >
              <ContractCard
                contract={contract}
                onClick={() => onContractClick(contract)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Use in Page
```typescript
// src/pages/Contracts.tsx
// Before:
{contracts.map(contract => (
  <ContractCard key={contract.id} contract={contract} />
))}

// After:
<ContractsVirtualList
  contracts={contracts}
  onContractClick={handleContractClick}
/>
```

**Expected improvement:** 60-80% faster rendering for 1000+ items

---

## 6. React.memo for Heavy Components (1 hour)

### Identify Heavy Components
```typescript
// src/components/contracts/ContractCard.tsx
// Before:
export function ContractCard({ contract }: Props) {
  // ... component logic
}

// After:
export const ContractCard = memo(function ContractCard({ contract }: Props) {
  // ... component logic
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if contract data changed
  return prevProps.contract.id === nextProps.contract.id &&
         prevProps.contract.updated_at === nextProps.contract.updated_at;
});
```

### Memoize Expensive Calculations
```typescript
// src/hooks/useFinancialMetrics.ts
import { useMemo } from 'react';

export function useFinancialMetrics(payments: Payment[]) {
  const metrics = useMemo(() => {
    // Expensive calculation
    const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
    const avgPayment = totalRevenue / payments.length;
    const monthlyBreakdown = calculateMonthlyBreakdown(payments);

    return {
      totalRevenue,
      avgPayment,
      monthlyBreakdown
    };
  }, [payments]); // Only recalculate when payments change

  return metrics;
}
```

---

## 7. IndexedDB Offline Storage (4 hours)

### Install idb
```bash
npm install idb
```

### Create Database
```typescript
// src/lib/offline-db.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface FleetifyDB extends DBSchema {
  contracts: {
    key: string;
    value: Contract & { _offline_synced: boolean };
    indexes: {
      'by-company': string;
      'by-sync-status': boolean;
    };
  };
  customers: {
    key: string;
    value: Customer & { _offline_synced: boolean };
    indexes: { 'by-company': string };
  };
  sync_queue: {
    key: string;
    value: {
      id: string;
      table: string;
      action: 'create' | 'update' | 'delete';
      data: any;
      timestamp: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<FleetifyDB>>;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<FleetifyDB>('fleetify-offline', 1, {
      upgrade(db) {
        // Contracts store
        const contractStore = db.createObjectStore('contracts', {
          keyPath: 'id'
        });
        contractStore.createIndex('by-company', 'company_id');
        contractStore.createIndex('by-sync-status', '_offline_synced');

        // Customers store
        const customerStore = db.createObjectStore('customers', {
          keyPath: 'id'
        });
        customerStore.createIndex('by-company', 'company_id');

        // Sync queue
        const queueStore = db.createObjectStore('sync_queue', {
          keyPath: 'id'
        });
        queueStore.createIndex('by-timestamp', 'timestamp');
      }
    });
  }
  return dbPromise;
}

// Save data offline
export async function saveOffline<K extends keyof FleetifyDB>(
  storeName: K,
  data: FleetifyDB[K]['value']
) {
  const db = await getDB();
  await db.put(storeName, data);
}

// Get offline data
export async function getOffline<K extends keyof FleetifyDB>(
  storeName: K,
  key: string
) {
  const db = await getDB();
  return db.get(storeName, key);
}

// Get all offline data
export async function getAllOffline<K extends keyof FleetifyDB>(
  storeName: K
) {
  const db = await getDB();
  return db.getAll(storeName);
}

// Queue for sync
export async function queueForSync(
  table: string,
  action: 'create' | 'update' | 'delete',
  data: any
) {
  const db = await getDB();
  await db.add('sync_queue', {
    id: crypto.randomUUID(),
    table,
    action,
    data,
    timestamp: Date.now()
  });
}
```

### Use in React Query
```typescript
// src/hooks/useContracts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDB, saveOffline, queueForSync, getAllOffline } from '@/lib/offline-db';

export function useContracts(companyId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['contracts', companyId],
    queryFn: async () => {
      // Try online first
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('company_id', companyId);

        if (data) {
          // Cache offline
          const db = await getDB();
          const tx = db.transaction('contracts', 'readwrite');
          await Promise.all([
            ...data.map(contract =>
              tx.store.put({ ...contract, _offline_synced: true })
            ),
            tx.done
          ]);

          return data;
        }
      }

      // Fallback to offline
      const offlineContracts = await getAllOffline('contracts');
      return offlineContracts.filter(c => c.company_id === companyId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    networkMode: 'offlineFirst'
  });

  const createMutation = useMutation({
    mutationFn: async (newContract: Contract) => {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('contracts')
          .insert(newContract)
          .select()
          .single();

        if (data) {
          await saveOffline('contracts', { ...data, _offline_synced: true });
          return data;
        }
        throw error;
      } else {
        // Offline mode - queue for sync
        const tempContract = {
          ...newContract,
          id: crypto.randomUUID(),
          _offline_synced: false
        };

        await saveOffline('contracts', tempContract);
        await queueForSync('contracts', 'create', newContract);

        return tempContract;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', companyId] });
    }
  });

  return {
    contracts: query.data ?? [],
    isLoading: query.isLoading,
    createContract: createMutation.mutate
  };
}
```

---

## 8. Error Tracking with Sentry (30 min)

### Install
```bash
npm install @sentry/react
```

### Configure
```typescript
// src/lib/sentry.ts
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

export function initSentry() {
  if (import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new BrowserTracing(),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],

      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      beforeSend(event) {
        // Add mobile context
        event.contexts = {
          ...event.contexts,
          device: {
            online: navigator.onLine,
            userAgent: navigator.userAgent
          }
        };
        return event;
      }
    });
  }
}
```

```typescript
// src/main.tsx
import { initSentry } from '@/lib/sentry';

initSentry();

// Wrap app with Sentry ErrorBoundary
import * as Sentry from '@sentry/react';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
    <App />
  </Sentry.ErrorBoundary>
);
```

---

## Implementation Checklist

### Day 1 (4 hours)
- [ ] Icon tree-shaking setup (30 min)
- [ ] Update all icon imports (1 hour)
- [ ] Lazy load html2canvas, xlsx, recharts (1 hour)
- [ ] Enhanced code splitting in vite.config.ts (1.5 hours)

### Day 2 (4 hours)
- [ ] Service worker setup with vite-plugin-pwa (2 hours)
- [ ] Virtual scrolling for Contracts list (1 hour)
- [ ] Virtual scrolling for Customers list (1 hour)

### Day 3 (4 hours)
- [ ] IndexedDB setup (2 hours)
- [ ] Integrate offline storage with useContracts (1 hour)
- [ ] Integrate offline storage with useCustomers (1 hour)

### Day 4 (3 hours)
- [ ] Add React.memo to heavy components (1.5 hours)
- [ ] Setup Sentry error tracking (30 min)
- [ ] Test all changes (1 hour)

### Day 5 (2 hours)
- [ ] Build and measure improvements
- [ ] Document changes
- [ ] Create PR

---

## Expected Results

### Before
- Bundle: 20MB / 5MB gzip
- Icons: 538KB
- Contracts page load: ~500ms for 1000 items
- No offline support
- No error tracking

### After
- Bundle: 17.5MB / 4.4MB gzip (↓12%)
- Icons: ~50KB (↓90%)
- Contracts page load: ~50ms for 1000 items (↓90%)
- Full offline support with sync
- Comprehensive error tracking

---

## Testing

```bash
# Build and analyze
npm run build
npm run build:analyze

# Test coverage
npm run test

# Mobile preview
npm run build:mobile
npm run android:run

# Performance test
npm run lighthouse
```

---

**Total implementation time:** ~17 hours (1 week)
**Expected performance gain:** 30-40% improvement

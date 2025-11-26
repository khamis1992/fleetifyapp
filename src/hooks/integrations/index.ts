/**
 * Integration Hooks Index
 *
 * Central export point for all integration hooks connecting:
 * - Inventory ↔ Purchase Orders
 * - Inventory ↔ Sales Orders
 * - Vendors ↔ Purchase Orders
 */

// Inventory → Purchase Orders Integration
export {
  useCreatePOFromLowStock,
  useReceivePOToInventory,
  useInventoryPurchaseHistory,
  usePreferredVendorForItem,
  type PreferredVendor,
  type POFromLowStockData,
  type ReceivePOData,
} from './useInventoryPurchaseOrders';

// Inventory → Sales Orders Integration
export {
  useCreateSalesOrderFromInventory,
  useFulfillSalesOrder,
  useInventorySalesHistory,
  useSalesOrderInventoryCheck,
  type SalesOrderFromInventoryData,
  type FulfillSalesOrderData,
  type InventoryAvailability,
} from './useInventorySalesOrders';

// Vendors → Purchase Orders Integration
export {
  useVendorPurchaseHistory,
  useVendorPerformanceMetrics,
  useUpdateVendorPerformanceFromPO,
  usePreferredVendorsForItem,
  useVendorsRankedByPerformance,
  type VendorPurchaseHistory,
  type VendorPerformanceMetrics,
  type UpdateVendorPerformanceData,
} from './useVendorPurchaseOrders';

// Inventory → Purchase Orders Summary (Dashboard Views)
export {
  useInventoryPOSummary,
  useItemsWithPendingPOs,
  useItemPOSummary,
  type InventoryPOSummary,
  type InventoryPOSummaryFilters,
} from './useInventoryPOSummary';

// Sales → Inventory Availability (Dashboard Views)
export {
  useSalesInventoryAvailability,
  useInventoryAvailabilityCheck,
  useAvailableItems,
  useLowStockItems,
  useOutOfStockItems,
  type SalesInventoryAvailability,
  type InventoryAvailabilityCheckParams,
  type InventoryAvailabilityResult,
} from './useSalesInventoryAvailability';

// Vendor Performance Scorecard (Dashboard Views)
export {
  useVendorPerformanceScorecard,
  useTopVendorsByPerformance,
  useVendorPerformanceMetrics as useVendorPerformanceMetricsView,
  useActiveVendors,
  useVendorsByPurchaseValue,
  type VendorPerformanceScorecard,
  type VendorPerformanceFilters,
} from './useVendorPerformanceScorecard';

// Customer Order Fulfillment (Dashboard Views)
export {
  useCustomerOrderFulfillment,
  usePendingOrders,
  useFulfilledOrders,
  useCancelledOrders,
  useCustomerOrders,
  useFulfillmentSummary,
  useDelayedOrders,
  type CustomerOrderFulfillment,
  type OrderFulfillmentFilters,
  type FulfillmentSummary,
} from './useCustomerOrderFulfillment';

// Purchase Order Financial Integration
export {
  usePurchaseAccountMappings,
  useCreatePOReceiptJournalEntry,
  useCreateVendorPaymentJournalEntry,
  useAutoCreatePOJournalEntry,
  useAccountsPayableByVendor,
  type POJournalEntryData,
  type VendorPaymentJournalData,
  type PurchaseAccountMapping,
} from './usePurchaseOrderFinancialIntegration';
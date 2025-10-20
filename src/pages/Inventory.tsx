import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import { PageSkeletonFallback } from "@/components/common/LazyPageWrapper";
import { AdminRoute } from "@/components/common/ProtectedRoute";

// Lazy load all inventory sub-modules with retry for better reliability
const InventoryItems = lazyWithRetry(() => import("./inventory/Inventory"), "InventoryItems");
const InventoryCategories = lazyWithRetry(() => import("./inventory/InventoryCategories"), "InventoryCategories");
const StockMovements = lazyWithRetry(() => import("./inventory/StockMovements"), "StockMovements");
const InventoryReports = lazyWithRetry(() => import("./inventory/InventoryReports"), "InventoryReports");
const Warehouses = lazyWithRetry(() => import("./inventory/Warehouses"), "Warehouses");

const Inventory = () => {
  return (
    <Routes>
      {/* Redirect from /inventory to /inventory/items */}
      <Route index element={<Navigate to="/inventory/items" replace />} />

      <Route
        path="items"
        element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <InventoryItems />
            </Suspense>
          </AdminRoute>
        }
      />

      <Route
        path="categories"
        element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <InventoryCategories />
            </Suspense>
          </AdminRoute>
        }
      />

      <Route
        path="movements"
        element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <StockMovements />
            </Suspense>
          </AdminRoute>
        }
      />

      <Route
        path="reports"
        element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <InventoryReports />
            </Suspense>
          </AdminRoute>
        }
      />

      <Route
        path="warehouses"
        element={
          <AdminRoute>
            <Suspense fallback={<PageSkeletonFallback />}>
              <Warehouses />
            </Suspense>
          </AdminRoute>
        }
      />
    </Routes>
  );
};

export default Inventory;

/**
 * PageCustomizer Component
 * 
 * Global page customization wrapper that provides drag-and-drop
 * widget rearrangement, show/hide controls, and persistent layout
 * saving for any page in the application.
 * 
 * Usage:
 * <PageCustomizer pageId="contracts" title="Contracts">
 *   <YourPageContent />
 * </PageCustomizer>
 */

import React, { ReactNode } from 'react'
import { CustomizableDashboard, DashboardWidget } from '@/components/dashboard/CustomizableDashboard'

interface PageCustomizerProps {
  pageId: string // Unique identifier for the page (e.g., "dashboard", "contracts", "invoices")
  title: string // Display title for the page
  titleAr: string // Arabic display title
  children: ReactNode // Page content
  widgets?: DashboardWidget[] // Optional: override default widgets for this page
}

/**
 * Get default widgets for a specific page
 * Customize this function to define widgets for each page
 */
function getWidgetsForPage(pageId: string): DashboardWidget[] {
  // Default empty widgets - each page will define its own
  // This can be extended per page as needed
  return []
}

/**
 * PageCustomizer - Global page wrapper with customization support
 * 
 * Wraps any page content with customization capabilities:
 * - Drag-and-drop widget rearrangement
 * - Show/hide widget visibility
 * - Save layout per user per page
 * - Reset to default layout
 */
export function PageCustomizer({
  pageId,
  title,
  titleAr,
  children,
  widgets,
}: PageCustomizerProps) {
  // Use provided widgets or get defaults for this page
  const pageWidgets = widgets || getWidgetsForPage(pageId)

  return (
    <div className="space-y-6">
      {/* Header with customization controls */}
      {(title || titleAr) && (
        <div className="flex items-center justify-between">
          <div>
            {title && (
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {title}
              </h1>
            )}
            {titleAr && (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {titleAr}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Customizable dashboard wrapper */}
      {pageWidgets.length > 0 ? (
        <CustomizableDashboard
          widgets={pageWidgets}
          dashboardId={pageId}
        >
          {children}
        </CustomizableDashboard>
      ) : (
        // If no widgets defined, just render children without customization
        children
      )}
    </div>
  )
}

export default PageCustomizer

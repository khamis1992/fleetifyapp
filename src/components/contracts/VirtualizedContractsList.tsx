/**
 * Virtualized Contracts List Component
 * 
 * Performance optimized list for handling large contract datasets
 * Uses @tanstack/react-virtual for efficient rendering with dynamic heights
 * 
 * Features:
 * - Dynamic height calculation (no hardcoded heights)
 * - Only renders visible items
 * - Smooth scrolling without jumps
 * - Memory efficient
 * - Auto-adjusts for content size
 */

import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ContractCard } from './ContractCard';
import { ContractsEmptyState } from './ContractsEmptyState';

interface VirtualizedContractsListProps {
  contracts: any[];
  onRenewContract: (contract: any) => void;
  onManageStatus: (contract: any) => void;
  onViewDetails: (contract: any) => void;
  onCancelContract: (contract: any) => void;
  onDeleteContract: (contract: any) => void;
  onCreateContract: () => void;
  onClearFilters: () => void;
  hasFilters: boolean;
  hasContracts: boolean;
  height?: number;
}

export const VirtualizedContractsList: React.FC<VirtualizedContractsListProps> = ({
  contracts,
  onRenewContract,
  onManageStatus,
  onViewDetails,
  onCancelContract,
  onDeleteContract,
  onCreateContract,
  onClearFilters,
  hasFilters,
  hasContracts,
  height = 800
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Dynamic height measurement - measures actual rendered height
  const measureElement = useCallback((el: Element | null) => {
    if (!el) return 200; // Default estimate for contract card
    const height = el.getBoundingClientRect().height;
    return height > 0 ? height : 200; // Ensure minimum height
  }, []);

  // Virtual scrolling configuration
  const virtualizer = useVirtualizer({
    count: contracts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Initial estimate - will auto-adjust
    overscan: 5, // Render 5 extra items for smooth scrolling
    measureElement, // Enable dynamic measurement
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Empty state handling
  if (contracts.length === 0) {
    if (hasContracts && hasFilters) {
      return (
        <ContractsEmptyState
          type="no-results"
          onClearFilters={onClearFilters}
        />
      );
    } else {
      return (
        <ContractsEmptyState
          type="no-contracts"
          onCreateContract={onCreateContract}
        />
      );
    }
  }

  return (
    <div className="w-full">
      {/* Virtualized scrollable container */}
      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ 
          height: `${height}px`,
          contain: 'strict', // Optimize rendering
        }}
      >
        {/* Virtual items container */}
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualRow) => {
            const contract = contracts[virtualRow.index];
            
            return (
              <div
                key={contract.id || `contract-${virtualRow.index}`}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement} // Measure actual height
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="px-1 py-2" // Spacing between cards
              >
                <ContractCard
                  contract={contract}
                  onRenew={onRenewContract}
                  onManageStatus={onManageStatus}
                  onViewDetails={onViewDetails}
                  onCancelContract={onCancelContract}
                  onDeleteContract={onDeleteContract}
                  showRenewButton={contract.status === 'active'}
                  showCancelButton={contract.status === 'active'}
                  showDeleteButton={true}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Virtual scroll info (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs text-muted-foreground text-center">
          عرض {virtualItems.length} من {contracts.length} عقد
        </div>
      )}
    </div>
  );
};

VirtualizedContractsList.displayName = 'VirtualizedContractsList';

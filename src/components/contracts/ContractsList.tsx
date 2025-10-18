import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSimpleBreakpoint } from '@/hooks/use-mobile-simple';
import { ContractCard } from './ContractCard';
import { ContractsEmptyState } from './ContractsEmptyState';

interface ContractsListProps {
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
}

export const ContractsList: React.FC<ContractsListProps> = ({
  contracts,
  onRenewContract,
  onManageStatus,
  onViewDetails,
  onCancelContract,
  onDeleteContract,
  onCreateContract,
  onClearFilters,
  hasFilters,
  hasContracts
}) => {
  const { isMobile } = useSimpleBreakpoint();
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual scrolling implementation
  const rowVirtualizer = useVirtualizer({
    count: contracts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isMobile ? 200 : 120,
    overscan: 5,
  });

  if (contracts.length > 0) {
    return (
      <div ref={parentRef} className="w-full h-[calc(100vh-200px)] overflow-auto">
        <div 
          className="relative w-full" 
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const contract = contracts[virtualItem.index];
            return (
              <div
                key={virtualItem.key}
                className="absolute top-0 left-0 w-full"
                style={{
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
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
    );
  }

  // Empty state handling
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
};
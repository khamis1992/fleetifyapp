/**
 * Virtualized Contract List Component
 * High-performance list rendering for large contract datasets
 */

import React, { memo, useMemo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { FileText, Calendar, DollarSign } from 'lucide-react';

// Types
interface Contract {
  id: string;
  contract_number?: string;
  customer_name?: string;
  vehicle_info?: string;
  start_date?: string;
  end_date?: string;
  monthly_rental?: number;
  total_value?: number;
  status?: string;
  payment_status?: string;
  created_at?: string;
}

interface VirtualizedContractListProps {
  contracts: Contract[];
  onContractClick?: (contract: Contract) => void;
  height?: number;
  itemHeight?: number;
  searchQuery?: string;
}

/**
 * Individual contract row component - memoized for performance
 */
const ContractRow = memo<ListChildComponentProps<Contract[]>>(({ index, style, data }) => {
  const contract = data[index];
  
  if (!contract) return null;

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-success';
      case 'pending':
        return 'bg-warning';
      case 'expired':
        return 'bg-destructive';
      case 'cancelled':
        return 'bg-muted';
      default:
        return 'bg-primary';
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-success text-success-foreground';
      case 'partially_paid':
        return 'bg-warning text-warning-foreground';
      case 'overdue':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted';
    }
  };

  return (
    <div style={style} className="px-2">
      <Card className="mb-2 hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
            </div>

            {/* Contract Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">
                  {contract.contract_number || `Contract #${contract.id.slice(0, 8)}`}
                </h3>
                {contract.status && (
                  <Badge className={getStatusColor(contract.status)} variant="secondary">
                    {contract.status}
                  </Badge>
                )}
                {contract.payment_status && (
                  <Badge className={getPaymentStatusColor(contract.payment_status)}>
                    {contract.payment_status}
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                {contract.customer_name && (
                  <span className="truncate">Customer: {contract.customer_name}</span>
                )}
                {contract.vehicle_info && (
                  <span className="truncate">Vehicle: {contract.vehicle_info}</span>
                )}
              </div>
            </div>

            {/* Contract Dates */}
            {(contract.start_date || contract.end_date) && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  {contract.start_date && (
                    <div>{format(new Date(contract.start_date), 'MMM d, yyyy')}</div>
                  )}
                  {contract.end_date && (
                    <div className="text-muted-foreground">
                      to {format(new Date(contract.end_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Financial Info */}
            {(contract.monthly_rental || contract.total_value) && (
              <div className="text-right">
                {contract.monthly_rental && (
                  <div className="flex items-center gap-1 font-semibold">
                    <DollarSign className="h-4 w-4" />
                    {contract.monthly_rental.toLocaleString()} SAR/mo
                  </div>
                )}
                {contract.total_value && (
                  <div className="text-sm text-muted-foreground">
                    Total: {contract.total_value.toLocaleString()} SAR
                  </div>
                )}
              </div>
            )}

            {/* Created Date */}
            {contract.created_at && (
              <div className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(contract.created_at), { addSuffix: true })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

ContractRow.displayName = 'ContractRow';

/**
 * Virtualized Contract List Component
 * Efficiently renders large lists of contracts with virtual scrolling
 */
export const VirtualizedContractList: React.FC<VirtualizedContractListProps> = memo(({
  contracts,
  onContractClick,
  height = 600,
  itemHeight = 96,
  searchQuery = '',
}) => {
  // Filter contracts based on search query
  const filteredContracts = useMemo(() => {
    if (!searchQuery) return contracts;
    
    const query = searchQuery.toLowerCase();
    return contracts.filter(contract => 
      contract.contract_number?.toLowerCase().includes(query) ||
      contract.customer_name?.toLowerCase().includes(query) ||
      contract.vehicle_info?.toLowerCase().includes(query) ||
      contract.status?.toLowerCase().includes(query)
    );
  }, [contracts, searchQuery]);

  // Sort contracts by most recent first
  const sortedContracts = useMemo(() => {
    return [...filteredContracts].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });
  }, [filteredContracts]);

  // Handle contract click
  const handleClick = React.useCallback((contract: Contract) => {
    if (onContractClick) {
      onContractClick(contract);
    }
  }, [onContractClick]);

  // Empty state
  if (sortedContracts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchQuery ? 'No contracts found matching your search' : 'No contracts available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Summary stats
  const stats = useMemo(() => {
    const active = sortedContracts.filter(c => c.status?.toLowerCase() === 'active').length;
    const total = sortedContracts.reduce((sum, c) => sum + (c.total_value || 0), 0);
    return { active, total };
  }, [sortedContracts]);

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{sortedContracts.length}</div>
            <p className="text-xs text-muted-foreground">Total Contracts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Active Contracts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total.toLocaleString()} SAR</div>
            <p className="text-xs text-muted-foreground">Total Value</p>
          </CardContent>
        </Card>
      </div>

      {/* Virtualized List */}
      <div className="rounded-lg border bg-card">
        <List
          height={height}
          itemCount={sortedContracts.length}
          itemSize={itemHeight}
          width="100%"
          itemData={sortedContracts}
          overscanCount={5}
        >
          {ContractRow}
        </List>
        
        {/* Results count */}
        <div className="px-4 py-2 border-t bg-muted/50 text-sm text-muted-foreground">
          Showing {sortedContracts.length} of {contracts.length} contracts
          {searchQuery && ` (filtered by "${searchQuery}")`}
        </div>
      </div>
    </div>
  );
});

VirtualizedContractList.displayName = 'VirtualizedContractList';

export default VirtualizedContractList;

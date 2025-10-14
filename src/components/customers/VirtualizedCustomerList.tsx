/**
 * Virtualized Customer List Component
 * High-performance list rendering for large customer datasets using react-window
 * 
 * Installation required:
 * npm install react-window @types/react-window
 */

import React, { memo, useMemo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

// Types
interface Customer {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  commercial_register?: string;
  status?: string;
  is_active?: boolean;
  created_at?: string;
  credit_limit?: number;
  current_balance?: number;
}

interface VirtualizedCustomerListProps {
  customers: Customer[];
  onCustomerClick?: (customer: Customer) => void;
  height?: number;
  itemHeight?: number;
  searchQuery?: string;
}

/**
 * Individual customer row component - memoized for performance
 */
const CustomerRow = memo<ListChildComponentProps<Customer[]>>(({ index, style, data }) => {
  const customer = data[index];
  
  if (!customer) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-success';
      case 'inactive':
        return 'bg-muted';
      case 'suspended':
        return 'bg-destructive';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div style={style} className="px-2">
      <Card className="mb-2 hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-primary/10">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>

            {/* Customer Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold truncate">{customer.name}</h3>
                {customer.status && (
                  <Badge className={getStatusColor(customer.status)} variant="secondary">
                    {customer.status}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {customer.commercial_register && (
                  <span className="truncate">CR: {customer.commercial_register}</span>
                )}
                {customer.email && (
                  <span className="truncate">{customer.email}</span>
                )}
                {customer.phone && (
                  <span className="truncate">{customer.phone}</span>
                )}
              </div>
            </div>

            {/* Financial Info */}
            {(customer.credit_limit || customer.current_balance !== undefined) && (
              <div className="text-right">
                {customer.current_balance !== undefined && (
                  <div className="font-semibold">
                    {customer.current_balance.toLocaleString()} SAR
                  </div>
                )}
                {customer.credit_limit && (
                  <div className="text-sm text-muted-foreground">
                    Limit: {customer.credit_limit.toLocaleString()} SAR
                  </div>
                )}
              </div>
            )}

            {/* Created Date */}
            {customer.created_at && (
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(customer.created_at), { addSuffix: true })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

CustomerRow.displayName = 'CustomerRow';

/**
 * Virtualized Customer List Component
 * Efficiently renders large lists of customers with virtual scrolling
 */
export const VirtualizedCustomerList: React.FC<VirtualizedCustomerListProps> = memo(({
  customers,
  onCustomerClick,
  height = 600,
  itemHeight = 88,
  searchQuery = '',
}) => {
  // Filter customers based on search query
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    
    const query = searchQuery.toLowerCase();
    return customers.filter(customer => 
      customer.name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.commercial_register?.toLowerCase().includes(query) ||
      customer.phone?.includes(query)
    );
  }, [customers, searchQuery]);

  // Handle customer click
  const handleClick = React.useCallback((customer: Customer) => {
    if (onCustomerClick) {
      onCustomerClick(customer);
    }
  }, [onCustomerClick]);

  // Empty state
  if (filteredCustomers.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            {searchQuery ? 'No customers found matching your search' : 'No customers available'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <List
        height={height}
        itemCount={filteredCustomers.length}
        itemSize={itemHeight}
        width="100%"
        itemData={filteredCustomers}
        overscanCount={5} // Render 5 extra items for smoother scrolling
      >
        {CustomerRow}
      </List>
      
      {/* Results count */}
      <div className="px-4 py-2 border-t bg-muted/50 text-sm text-muted-foreground">
        Showing {filteredCustomers.length} of {customers.length} customers
        {searchQuery && ` (filtered by "${searchQuery}")`}
      </div>
    </div>
  );
});

VirtualizedCustomerList.displayName = 'VirtualizedCustomerList';

/**
 * Usage Example:
 * 
 * import { VirtualizedCustomerList } from '@/components/customers/VirtualizedCustomerList';
 * 
 * function CustomersPage() {
 *   const [searchQuery, setSearchQuery] = useState('');
 *   const { data: customers } = useCustomers();
 * 
 *   return (
 *     <div>
 *       <Input
 *         placeholder="Search customers..."
 *         value={searchQuery}
 *         onChange={(e) => setSearchQuery(e.target.value)}
 *       />
 *       <VirtualizedCustomerList
 *         customers={customers}
 *         searchQuery={searchQuery}
 *         height={600}
 *         onCustomerClick={(customer) => navigate(`/customers/${customer.id}`)}
 *       />
 *     </div>
 *   );
 * }
 */

export default VirtualizedCustomerList;

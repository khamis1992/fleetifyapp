import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface CustomerRefreshButtonProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
}

export const CustomerRefreshButton: React.FC<CustomerRefreshButtonProps> = ({
  variant = 'outline',
  size = 'sm',
  className
}) => {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 [REFRESH] Manual refresh triggered for customers');
      
      // Invalidate and refetch all customer-related queries immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.refetchQueries({ queryKey: ['customers'] }),
        queryClient.refetchQueries({ 
          queryKey: ['customer'],
          type: 'active' 
        })
      ]);
      
      console.log('✅ [REFRESH] Manual refresh completed successfully');
      toast.success('تم تحديث قائمة العملاء بنجاح');
    } catch (error) {
      console.error('❌ [REFRESH] Error refreshing customers:', error);
      toast.error('حدث خطأ أثناء تحديث القائمة');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={className}
    >
      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {size !== 'sm' && <span className="mr-2">تحديث</span>}
    </Button>
  );
};
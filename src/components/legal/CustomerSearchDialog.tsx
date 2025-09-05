import React, { useState } from 'react';
import { Search, User, Building, AlertTriangle, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useLegalMemos, CustomerSearchResult } from '@/hooks/useLegalMemos';

interface CustomerSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerSelect: (customer: CustomerSearchResult) => void;
}

export const CustomerSearchDialog: React.FC<CustomerSearchDialogProps> = ({
  open,
  onOpenChange,
  onCustomerSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<CustomerSearchResult[]>([]);
  const { searchCustomers, isLoading } = useLegalMemos();

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      const results = await searchCustomers(searchTerm);
      setCustomers(results);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handleCustomerClick = (customer: CustomerSearchResult) => {
    onCustomerSelect(customer);
    onOpenChange(false);
    setCustomers([]);
    setSearchTerm('');
  };

  const getCustomerName = (customer: CustomerSearchResult) => {
    return customer.customer_type === 'individual'
      ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
      : customer.company_name || '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            البحث عن العملاء
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* شريط البحث */}
          <div className="flex gap-2">
            <Input
              placeholder="ابحث بالاسم، الشركة، الإيميل، أو رقم الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch} 
              disabled={!searchTerm.trim() || isLoading}
            >
              {isLoading ? 'جاري البحث...' : 'بحث'}
            </Button>
          </div>

          {/* نتائج البحث */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {customers.length === 0 && searchTerm && !isLoading && (
              <Card>
                <CardContent className="p-4 text-center text-muted-foreground">
                  لا توجد نتائج للبحث "{searchTerm}"
                </CardContent>
              </Card>
            )}

            {customers.map((customer) => (
              <Card 
                key={customer.id} 
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => handleCustomerClick(customer)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        {customer.customer_type === 'individual' ? (
                          <User className="w-4 h-4 text-primary" />
                        ) : (
                          <Building className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="font-medium">
                          {getCustomerName(customer)}
                        </h3>
                        
                        <div className="text-sm text-muted-foreground space-y-1">
                          {customer.email && (
                            <div>📧 {customer.email}</div>
                          )}
                          {customer.phone && (
                            <div>📱 {customer.phone}</div>
                          )}
                          {customer.national_id && (
                            <div>🆔 {customer.national_id}</div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={customer.customer_type === 'individual' ? 'default' : 'secondary'}>
                        {customer.customer_type === 'individual' ? 'فرد' : 'شركة'}
                      </Badge>
                      
                      {customer.is_blacklisted && (
                        <Badge variant="destructive" className="flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          محظور
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* رسالة الحماية */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="w-4 h-4" />
                جميع عمليات البحث والوصول للبيانات مسجلة لأغراض الأمان والمراجعة
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
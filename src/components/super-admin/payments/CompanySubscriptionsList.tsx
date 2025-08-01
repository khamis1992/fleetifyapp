import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Search, Calendar, DollarSign, Users, Settings, Eye } from 'lucide-react';
import { useCompanies } from '@/hooks/useCompanies';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export const CompanySubscriptionsList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  
  const { data: companies, isLoading } = useCompanies();

  const getStatusBadge = (status: string) => {
    const variants = {
      'active': { variant: 'default' as const, text: 'نشط', class: 'bg-green-100 text-green-800' },
      'trial': { variant: 'secondary' as const, text: 'تجريبي', class: 'bg-blue-100 text-blue-800' },
      'suspended': { variant: 'destructive' as const, text: 'معلق', class: 'bg-red-100 text-red-800' },
      'expired': { variant: 'outline' as const, text: 'منتهي', class: 'bg-gray-100 text-gray-800' }
    };
    
    const config = variants[status as keyof typeof variants] || variants.active;
    return (
      <Badge variant={config.variant} className={config.class}>
        {config.text}
      </Badge>
    );
  };

  const getPlanBadge = (plan: string) => {
    const variants = {
      'basic': { text: 'أساسي', class: 'bg-gray-100 text-gray-800' },
      'premium': { text: 'مميز', class: 'bg-blue-100 text-blue-800' },
      'enterprise': { text: 'مؤسسي', class: 'bg-purple-100 text-purple-800' }
    };
    
    const config = variants[plan as keyof typeof variants] || variants.basic;
    return (
      <Badge variant="outline" className={config.class}>
        {config.text}
      </Badge>
    );
  };

  const filteredCompanies = companies?.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || company.subscription_status === statusFilter;
    const matchesPlan = planFilter === 'all' || company.subscription_plan === planFilter;
    
    return matchesSearch && matchesStatus && matchesPlan;
  }) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              اشتراكات الشركات
            </CardTitle>
            <CardDescription>
              إدارة ومراقبة اشتراكات جميع الشركات
            </CardDescription>
          </div>
          <Button>
            إضافة شركة جديدة
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث في الشركات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="حالة الاشتراك" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الحالات</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="trial">تجريبي</SelectItem>
              <SelectItem value="suspended">معلق</SelectItem>
              <SelectItem value="expired">منتهي</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="نوع الخطة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الخطط</SelectItem>
              <SelectItem value="basic">أساسي</SelectItem>
              <SelectItem value="premium">مميز</SelectItem>
              <SelectItem value="enterprise">مؤسسي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الشركة</TableHead>
                <TableHead>حالة الاشتراك</TableHead>
                <TableHead>نوع الخطة</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
                <TableHead>القيمة الشهرية</TableHead>
                <TableHead>عدد المستخدمين</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow key={company.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div>
                      <div className="font-medium">{company.name}</div>
                      <div className="text-sm text-muted-foreground">{company.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(company.subscription_status || 'active')}
                  </TableCell>
                  <TableCell>
                    {getPlanBadge(company.subscription_plan || 'basic')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Calendar className="h-3 w-3" />
                      {company.created_at ? formatDistanceToNow(new Date(company.created_at), { 
                        addSuffix: true, 
                        locale: ar 
                      }) : 'غير محدد'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-medium">
                      <DollarSign className="h-3 w-3" />
                      {company.subscription_plan === 'enterprise' ? '100' : 
                       company.subscription_plan === 'premium' ? '50' : '25'} د.ك
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>5</span> {/* Mock data - should come from users count */}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredCompanies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لم يتم العثور على شركات</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
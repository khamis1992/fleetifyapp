import React, { useState } from 'react';
import { useCompanies, Company } from '@/hooks/useCompanies';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CompanyForm } from '@/components/super-admin/CompanyForm';
import { CompanyDetailsDialog } from '@/components/super-admin/CompanyDetailsDialog';
import { 
  Plus, 
  Building2, 
  Users, 
  DollarSign, 
  Edit, 
  Eye,
  Search,
  Filter
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';


const Companies: React.FC = () => {
  const { data: companies = [], isLoading: loading, refetch } = useCompanies();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'inactive': return 'غير نشط';
      case 'suspended': return 'معلق';
      default: return 'غير محدد';
    }
  };

  const getPlanLabel = (plan?: string) => {
    switch (plan) {
      case 'basic': return 'أساسي';
      case 'premium': return 'مميز';
      case 'enterprise': return 'مؤسسي';
      default: return 'غير محدد';
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = !searchTerm || 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.name_ar && company.name_ar.includes(searchTerm)) ||
      (company.email && company.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || company.subscription_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
    refetch();
  };

  const handleViewCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowDetailsDialog(true);
  };

  const handleEditCompany = (company: Company) => {
    setSelectedCompany(company);
    setShowCreateForm(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة الشركات</h1>
          <p className="text-muted-foreground mt-2">
            إدارة جميع الشركات المسجلة في النظام
          </p>
        </div>
        <Button 
          onClick={() => {
            setSelectedCompany(null);
            setShowCreateForm(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          إضافة شركة جديدة
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">إجمالي الشركات</p>
                <p className="text-2xl font-bold">{companies.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <Building2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">الشركات النشطة</p>
                <p className="text-2xl font-bold">
                  {companies.filter(c => c.subscription_status === 'active').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-warning/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">خطة مميزة</p>
                <p className="text-2xl font-bold">
                  {companies.filter(c => c.subscription_plan === 'premium').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-info/10 rounded-lg">
                <Users className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">خطة مؤسسية</p>
                <p className="text-2xl font-bold">
                  {companies.filter(c => c.subscription_plan === 'enterprise').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="البحث في الشركات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 ml-2" />
                  <SelectValue placeholder="فلترة حسب الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="active">نشط</SelectItem>
                  <SelectItem value="inactive">غير نشط</SelectItem>
                  <SelectItem value="suspended">معلق</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Companies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((company) => (
          <Card key={company.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  {company.name_ar && (
                    <p className="text-sm text-muted-foreground mt-1">{company.name_ar}</p>
                  )}
                </div>
                <Badge variant={getStatusVariant(company.subscription_status)}>
                  {getStatusLabel(company.subscription_status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                {company.email && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium">البريد:</span>
                    {company.email}
                  </p>
                )}
                {company.phone && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium">الهاتف:</span>
                    {company.phone}
                  </p>
                )}
                <p className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-medium">الخطة:</span>
                  {getPlanLabel(company.subscription_plan)}
                </p>
                {company.city && (
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <span className="font-medium">المدينة:</span>
                    {company.city}
                  </p>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewCompany(company)}
                  className="flex-1 gap-2"
                >
                  <Eye className="h-4 w-4" />
                  عرض
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditCompany(company)}
                  className="flex-1 gap-2"
                >
                  <Edit className="h-4 w-4" />
                  تعديل
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCompanies.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد شركات</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'لم يتم العثور على شركات تطابق معايير البحث'
                : 'لم يتم إضافة أي شركات بعد'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Button 
                onClick={() => {
                  setSelectedCompany(null);
                  setShowCreateForm(true);
                }}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                إضافة شركة جديدة
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Form Dialog */}
      <CompanyForm
        open={showCreateForm}
        onOpenChange={setShowCreateForm}
        company={selectedCompany}
        onSuccess={handleCreateSuccess}
      />

      {/* Company Details Dialog */}
      <CompanyDetailsDialog
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
        company={selectedCompany}
        onEdit={() => {
          setShowDetailsDialog(false);
          setShowCreateForm(true);
        }}
      />
    </div>
  );
};

export default Companies;
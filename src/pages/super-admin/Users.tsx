import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdminUsers } from '@/hooks/useSuperAdminUsers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserPlusIcon, SearchIcon, FilterIcon, AlertTriangleIcon, WrenchIcon, CheckCircleIcon } from 'lucide-react';
import { CreateUserDialog } from '@/components/super-admin/CreateUserDialog';
import { UserDetailsDialog } from '@/components/super-admin/UserDetailsDialog';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const SuperAdminUsers: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);

  const {
    users,
    companies,
    loading,
    createUser,
    updateUserRoles,
    deleteUser,
    resetUserPassword,
    isCreating,
    isUpdating,
    isDeleting,
    isResettingPassword,
    isFixingOrphans,
    fixOrphanedUsers
  } = useSuperAdminUsers();

  // Filter users based on search and filters, including orphaned users
  const filteredUsers = users?.filter(user => {
    const firstName = user.profiles?.first_name || user.orphaned_employee?.first_name || '';
    const lastName = user.profiles?.last_name || user.orphaned_employee?.last_name || '';
    const firstNameAr = user.profiles?.first_name_ar || user.orphaned_employee?.first_name_ar || '';
    const lastNameAr = user.profiles?.last_name_ar || user.orphaned_employee?.last_name_ar || '';
    
    const matchesSearch = 
      firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      firstNameAr.includes(searchTerm) ||
      lastNameAr.includes(searchTerm);

    const companyId = user.profiles?.company_id || user.orphaned_employee?.company_id;
    const matchesCompany = selectedCompany === 'all' || companyId === selectedCompany;
    
    const matchesRole = selectedRole === 'all' || user.user_roles?.some(role => role.role === selectedRole);

    return matchesSearch && matchesCompany && matchesRole;
  }) || [];

  // Get orphaned users count and companies with orphans
  const orphanedData = useMemo(() => {
    const orphaned = users?.filter(user => !user.profiles && user.orphaned_employee) || [];
    const companiesWithOrphans = new Set(
      orphaned.map(user => user.orphaned_employee?.company_id).filter(Boolean)
    );
    
    return {
      count: orphaned.length,
      users: orphaned,
      companiesWithOrphans: Array.from(companiesWithOrphans)
    };
  }, [users]);

  const handleCreateUser = async (userData: any) => {
    try {
      await createUser(userData);
      setCreateUserOpen(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setUserDetailsOpen(true);
  };

  const getRolesBadges = (roles: any[]) => {
    if (!roles || roles.length === 0) return <Badge variant="secondary">بدون أدوار</Badge>;
    
    return roles.map((roleObj, index) => (
      <Badge key={index} variant="outline" className="mr-1">
        {roleObj.role === 'super_admin' && 'مدير عام'}
        {roleObj.role === 'company_admin' && 'مدير شركة'}
        {roleObj.role === 'manager' && 'مدير'}
        {roleObj.role === 'accountant' && 'محاسب'}
        {roleObj.role === 'fleet_manager' && 'مدير الأسطول'}
        {roleObj.role === 'sales_agent' && 'موظف مبيعات'}
        {roleObj.role === 'employee' && 'موظف'}
      </Badge>
    ));
  };

  const getStatusBadge = (user: any) => {
    if (!user.profiles && user.orphaned_employee) {
      return <Badge variant="destructive" className="bg-orange-100 text-orange-800 border-orange-300">
        <AlertTriangleIcon className="ml-1 h-3 w-3" />
        حساب متضرر
      </Badge>;
    }
    
    if (!user.profiles) {
      return <Badge variant="destructive">بدون ملف شخصي</Badge>;
    }
    
    if (user.profiles.company_id) {
      return <Badge variant="default">نشط</Badge>;
    }
    
    return <Badge variant="secondary">غير مفعل</Badge>;
  };

  const handleFixOrphansForCompany = async (companyId: string) => {
    try {
      await fixOrphanedUsers(companyId);
    } catch (error) {
      console.error('Failed to fix orphaned users:', error);
    }
  };

  const handleCompleteUserSetup = async (user: any) => {
    if (user.orphaned_employee) {
      await handleFixOrphansForCompany(user.orphaned_employee.company_id);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة المستخدمين</h1>
          <p className="text-muted-foreground">
            إدارة جميع المستخدمين في النظام ({filteredUsers.length} مستخدم)
          </p>
        </div>
        <div className="flex gap-2">
          {orphanedData.count > 0 && (
            <Button 
              onClick={() => {
                orphanedData.companiesWithOrphans.forEach(companyId => {
                  handleFixOrphansForCompany(companyId);
                });
              }}
              disabled={isFixingOrphans}
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <WrenchIcon className="ml-2 h-4 w-4" />
              {isFixingOrphans ? 'جاري الإصلاح...' : `إصلاح الحسابات المتضررة (${orphanedData.count})`}
            </Button>
          )}
          <Button 
            onClick={() => setCreateUserOpen(true)}
            disabled={isCreating}
          >
            <UserPlusIcon className="ml-2 h-4 w-4" />
            إضافة مستخدم جديد
          </Button>
        </div>
      </div>

      {/* Orphaned Users Alert */}
      {orphanedData.count > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            تم العثور على {orphanedData.count} حساب مستخدم متضرر (يحتوي على بيانات موظف ولكن بدون ملف شخصي أو أدوار). 
            يُنصح بإصلاح هذه الحسابات لضمان عمل النظام بشكل صحيح.
          </AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FilterIcon className="ml-2 h-5 w-5" />
            فلاتر البحث
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <SearchIcon className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالاسم أو البريد الإلكتروني..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger>
                <SelectValue placeholder="فلترة حسب الشركة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الشركات</SelectItem>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="فلترة حسب الدور" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأدوار</SelectItem>
                <SelectItem value="super_admin">مدير عام</SelectItem>
                <SelectItem value="company_admin">مدير شركة</SelectItem>
                <SelectItem value="manager">مدير</SelectItem>
                <SelectItem value="accountant">محاسب</SelectItem>
                <SelectItem value="fleet_manager">مدير الأسطول</SelectItem>
                <SelectItem value="sales_agent">موظف مبيعات</SelectItem>
                <SelectItem value="employee">موظف</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستخدم</TableHead>
                <TableHead>الشركة</TableHead>
                <TableHead>الأدوار</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>تاريخ التسجيل</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow 
                  key={user.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleViewUser(user)}
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {user.profiles?.first_name || user.orphaned_employee?.first_name || 'غير محدد'} {user.profiles?.last_name || user.orphaned_employee?.last_name || ''}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.profiles?.first_name_ar || user.orphaned_employee?.first_name_ar || ''} {user.profiles?.last_name_ar || user.orphaned_employee?.last_name_ar || ''}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                      {user.orphaned_employee && (
                        <div className="text-xs text-orange-600 font-medium">
                          حساب متضرر - يحتاج إصلاح
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.profiles?.companies?.name || user.orphaned_employee?.companies?.name || 'غير محدد'}
                  </TableCell>
                  <TableCell>
                    {getRolesBadges(user.user_roles)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(user)}
                  </TableCell>
                  <TableCell>
                    {user.created_at ? format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ar }) : 'غير محدد'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {user.orphaned_employee ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteUserSetup(user);
                          }}
                          disabled={isFixingOrphans}
                          className="border-green-300 text-green-700 hover:bg-green-50"
                        >
                          <CheckCircleIcon className="ml-1 h-3 w-3" />
                          إكمال الإعداد
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewUser(user);
                          }}
                        >
                          عرض التفاصيل
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    لا توجد مستخدمين تطابق معايير البحث
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <CreateUserDialog
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        onCreateUser={handleCreateUser}
        companies={companies || []}
        isLoading={isCreating}
      />

      {/* User Details Dialog */}
      <UserDetailsDialog
        open={userDetailsOpen}
        onOpenChange={setUserDetailsOpen}
        user={selectedUser}
        companies={companies || []}
        onUpdateRoles={updateUserRoles}
        onDeleteUser={deleteUser}
        onResetPassword={resetUserPassword}
        isUpdating={isUpdating}
        isDeleting={isDeleting}
        isResettingPassword={isResettingPassword}
      />
    </div>
  );
};

export default SuperAdminUsers;
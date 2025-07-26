import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSuperAdminUsers } from '@/hooks/useSuperAdminUsers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { UserPlusIcon, SearchIcon, FilterIcon } from 'lucide-react';
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
    isResettingPassword
  } = useSuperAdminUsers();

  // Filter users based on search and filters
  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.profiles?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profiles?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profiles?.first_name_ar?.includes(searchTerm) ||
      user.profiles?.last_name_ar?.includes(searchTerm);

    const matchesCompany = selectedCompany === 'all' || user.profiles?.company_id === selectedCompany;
    
    const matchesRole = selectedRole === 'all' || user.user_roles?.some(role => role.role === selectedRole);

    return matchesSearch && matchesCompany && matchesRole;
  }) || [];

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
        {roleObj.role === 'sales_agent' && 'موظف مبيعات'}
      </Badge>
    ));
  };

  const getStatusBadge = (user: any) => {
    if (!user.profiles) {
      return <Badge variant="destructive">بدون ملف شخصي</Badge>;
    }
    
    if (user.profiles.company_id) {
      return <Badge variant="default">نشط</Badge>;
    }
    
    return <Badge variant="secondary">غير مفعل</Badge>;
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
        <Button 
          onClick={() => setCreateUserOpen(true)}
          disabled={isCreating}
        >
          <UserPlusIcon className="ml-2 h-4 w-4" />
          إضافة مستخدم جديد
        </Button>
      </div>

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
                <SelectItem value="sales_agent">موظف مبيعات</SelectItem>
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
                        {user.profiles?.first_name} {user.profiles?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.profiles?.first_name_ar} {user.profiles?.last_name_ar}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.profiles?.companies?.name || 'غير محدد'}
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
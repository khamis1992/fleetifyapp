import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Users, Key, Search, Plus, Edit, Trash2, Check, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRolePermissions } from '@/hooks/useRolePermissions';

// Types
interface Role {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
  created_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role_id: string;
  users: {
    email: string;
  };
  roles: Role;
}

const PermissionsManagement = () => {
  const { user } = useAuth();
  const { hasPermission } = useRolePermissions();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);

  // Check if user can manage permissions
  const canManagePermissions = hasPermission('manage_permissions') || hasPermission('manage_roles');

  // Fetch all roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Role[];
    },
  });

  // Fetch all permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category, name');
      
      if (error) throw error;
      return data as Permission[];
    },
  });

  // Fetch role permissions
  const { data: rolePermissions } = useQuery({
    queryKey: ['role-permissions', selectedRole?.id],
    queryFn: async () => {
      if (!selectedRole) return [];
      
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .eq('role_id', selectedRole.id);
      
      if (error) throw error;
      return data.map(rp => rp.permission_id);
    },
    enabled: !!selectedRole,
  });

  // Fetch user roles
  const { data: userRoles, isLoading: userRolesLoading } = useQuery({
    queryKey: ['user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role_id,
          users (email),
          roles (id, name, description)
        `);
      
      if (error) throw error;
      return data as UserRole[];
    },
  });

  // Update role permissions mutation
  const updateRolePermissionsMutation = useMutation({
    mutationFn: async ({ roleId, permissionIds }: { roleId: string; permissionIds: string[] }) => {
      // Delete existing permissions
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId);

      // Insert new permissions
      if (permissionIds.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .insert(
            permissionIds.map(permissionId => ({
              role_id: roleId,
              permission_id: permissionId,
            }))
          );

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('تم تحديث صلاحيات الدور بنجاح');
      setIsPermissionDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`خطأ في تحديث الصلاحيات: ${error.message}`);
    },
  });

  // Group permissions by category
  const permissionsByCategory = permissions?.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredRoles = roles?.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const RolePermissionsDialog = () => {
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(rolePermissions || []);

    const handleTogglePermission = (permissionId: string) => {
      setSelectedPermissions(prev =>
        prev.includes(permissionId)
          ? prev.filter(id => id !== permissionId)
          : [...prev, permissionId]
      );
    };

    const handleSave = () => {
      if (selectedRole) {
        updateRolePermissionsMutation.mutate({
          roleId: selectedRole.id,
          permissionIds: selectedPermissions,
        });
      }
    };

    return (
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              إدارة صلاحيات: {selectedRole?.name}
            </DialogTitle>
            <DialogDescription>
              اختر الصلاحيات التي تريد منحها لهذا الدور
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              {permissionsByCategory && Object.entries(permissionsByCategory).map(([category, perms]) => (
                <div key={category} className="space-y-3">
                  <h3 className="font-semibold text-lg border-b pb-2">
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {perms.map(permission => (
                      <div key={permission.id} className="flex items-start space-x-3 space-x-reverse">
                        <Checkbox
                          id={permission.id}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() => handleTogglePermission(permission.id)}
                        />
                        <div className="flex-1">
                          <Label
                            htmlFor={permission.id}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {permission.name}
                          </Label>
                          {permission.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {permission.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsPermissionDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateRolePermissionsMutation.isPending}
            >
              {updateRolePermissionsMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (!canManagePermissions) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">غير مصرح</h2>
            <p className="text-muted-foreground text-center">
              ليس لديك صلاحية للوصول إلى هذه الصفحة
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8" />
            إدارة الصلاحيات والأدوار
          </h1>
          <p className="text-muted-foreground mt-2">
            إدارة الأدوار والصلاحيات وتعيينها للمستخدمين
          </p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            الأدوار
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Key className="h-4 w-4" />
            الصلاحيات
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            المستخدمون
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>الأدوار</CardTitle>
                  <CardDescription>
                    إدارة الأدوار وصلاحياتها
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="بحث..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {rolesLoading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم الدور</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead>النوع</TableHead>
                      <TableHead>الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles?.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell>{role.description}</TableCell>
                        <TableCell>
                          {role.is_system_role ? (
                            <Badge variant="secondary">نظام</Badge>
                          ) : (
                            <Badge>مخصص</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRole(role);
                              setIsPermissionDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            إدارة الصلاحيات
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>جميع الصلاحيات</CardTitle>
              <CardDescription>
                قائمة بجميع الصلاحيات المتاحة في النظام
              </CardDescription>
            </CardHeader>
            <CardContent>
              {permissionsLoading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : (
                <div className="space-y-6">
                  {permissionsByCategory && Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category}>
                      <h3 className="font-semibold text-lg mb-3 border-b pb-2">
                        {category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {perms.map(permission => (
                          <Card key={permission.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <Key className="h-5 w-5 text-primary mt-0.5" />
                                <div>
                                  <h4 className="font-medium">{permission.name}</h4>
                                  {permission.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {permission.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>أدوار المستخدمين</CardTitle>
              <CardDescription>
                عرض وإدارة أدوار المستخدمين
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userRolesLoading ? (
                <div className="text-center py-8">جاري التحميل...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>البريد الإلكتروني</TableHead>
                      <TableHead>الدور</TableHead>
                      <TableHead>الوصف</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userRoles?.map((userRole) => (
                      <TableRow key={userRole.id}>
                        <TableCell className="font-medium">
                          {userRole.users.email}
                        </TableCell>
                        <TableCell>
                          <Badge>{userRole.roles.name}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {userRole.roles.description}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Role Permissions Dialog */}
      {selectedRole && <RolePermissionsDialog />}
    </div>
  );
};

export default PermissionsManagement;

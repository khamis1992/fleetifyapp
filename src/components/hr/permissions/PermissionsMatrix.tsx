import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Users, 
  DollarSign, 
  Settings, 
  BarChart3,
  Eye,
  Edit,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { 
  PERMISSION_CATEGORIES, 
  PERMISSIONS, 
  ROLE_PERMISSIONS, 
  UserRole,
  Permission,
  PermissionCategory 
} from '@/types/permissions';

interface PermissionsMatrixProps {
  selectedUser?: {
    id: string;
    name: string;
    roles: UserRole[];
    customPermissions?: string[];
  };
  onPermissionChange?: (permission: string, granted: boolean) => void;
  onRoleChange?: (role: UserRole, assigned: boolean) => void;
  readOnly?: boolean;
  showRoleComparison?: boolean;
}

const getIconForCategory = (iconName: string) => {
  const icons = {
    Users,
    DollarSign,
    Settings,
    BarChart3,
    Shield
  };
  return icons[iconName as keyof typeof icons] || Shield;
};

const getPermissionLevelIcon = (level: string) => {
  switch (level) {
    case 'read':
      return <Eye className="w-3 h-3" />;
    case 'write':
      return <Edit className="w-3 h-3" />;
    case 'admin':
      return <ShieldCheck className="w-3 h-3" />;
    default:
      return <Eye className="w-3 h-3" />;
  }
};

const getPermissionLevelColor = (level: string) => {
  switch (level) {
    case 'read':
      return 'text-blue-600';
    case 'write':
      return 'text-green-600';
    case 'admin':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

export default function PermissionsMatrix({ 
  selectedUser, 
  onPermissionChange, 
  onRoleChange,
  readOnly = false,
  showRoleComparison = false 
}: PermissionsMatrixProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const getUserPermissions = () => {
    if (!selectedUser) return new Set<string>();
    
    const rolePermissions = new Set<string>();
    selectedUser.roles.forEach(role => {
      ROLE_PERMISSIONS[role]?.permissions.forEach(permission => {
        rolePermissions.add(permission);
      });
    });
    
    // Add custom permissions
    selectedUser.customPermissions?.forEach(permission => {
      rolePermissions.add(permission);
    });
    
    return rolePermissions;
  };

  const getFilteredPermissions = () => {
    let filtered = PERMISSIONS;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(permission => 
        permission.category.id === selectedCategory
      );
    }
    
    return filtered;
  };

  const getRolePermissions = (role: UserRole) => {
    return new Set(ROLE_PERMISSIONS[role]?.permissions || []);
  };

  const userPermissions = getUserPermissions();
  const filteredPermissions = getFilteredPermissions();

  const hasPermission = (permissionId: string): boolean => {
    return userPermissions.has(permissionId);
  };

  const isPermissionInRole = (permissionId: string, role: UserRole): boolean => {
    return getRolePermissions(role).has(permissionId);
  };

  const handlePermissionToggle = (permission: string, checked: boolean) => {
    if (!readOnly && onPermissionChange) {
      onPermissionChange(permission, checked);
    }
  };

  const handleRoleToggle = (role: UserRole, checked: boolean) => {
    if (!readOnly && onRoleChange) {
      onRoleChange(role, checked);
    }
  };

  return (
    <div className="space-y-6">
      {/* Role Selection */}
      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="w-5 h-5 mr-2" />
              أدوار المستخدم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.keys(ROLE_PERMISSIONS).map(role => {
                const roleKey = role as UserRole;
                const isAssigned = selectedUser.roles.includes(roleKey);
                const roleData = ROLE_PERMISSIONS[roleKey];
                
                const roleLabels: Record<UserRole, string> = {
                  super_admin: 'مدير النظام',
                  company_admin: 'مدير الشركة',
                  manager: 'مدير',
                  sales_agent: 'مندوب مبيعات',
                  employee: 'موظف'
                };
                
                return (
                  <Card key={role} className={`cursor-pointer transition-all ${
                    isAssigned ? 'ring-2 ring-primary' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={isAssigned}
                            onCheckedChange={(checked) => 
                              handleRoleToggle(roleKey, checked as boolean)
                            }
                            disabled={readOnly}
                          />
                          <div>
                            <p className="font-medium">{roleLabels[roleKey]}</p>
                            <p className="text-xs text-muted-foreground">
                              {roleData.permissions.length} صلاحية
                            </p>
                          </div>
                        </div>
                        {isAssigned && (
                          <Badge variant="default" size="sm">نشط</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            مصفوفة الصلاحيات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">الكل</TabsTrigger>
              {PERMISSION_CATEGORIES.map(category => {
                const IconComponent = getIconForCategory(category.icon);
                return (
                  <TabsTrigger key={category.id} value={category.id}>
                    <IconComponent className="w-4 h-4 mr-1" />
                    {category.nameAr}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value={selectedCategory} className="mt-6">
              <ScrollArea className="h-[600px]">
                <div className="space-y-6">
                  {PERMISSION_CATEGORIES
                    .filter(cat => selectedCategory === 'all' || cat.id === selectedCategory)
                    .map(category => {
                      const categoryPermissions = filteredPermissions.filter(
                        p => p.category.id === category.id
                      );
                      
                      if (categoryPermissions.length === 0) return null;
                      
                      const IconComponent = getIconForCategory(category.icon);
                      
                      return (
                        <Card key={category.id}>
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center text-lg">
                              <IconComponent className="w-5 h-5 mr-2" />
                              {category.nameAr}
                              <Badge variant="outline" className="mr-2">
                                {categoryPermissions.length}
                              </Badge>
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {categoryPermissions.map(permission => {
                                const isGranted = hasPermission(permission.id);
                                const isSystemLevel = permission.isSystemLevel;
                                
                                return (
                                  <div
                                    key={permission.id}
                                    className={`flex items-center justify-between p-3 rounded-lg border ${
                                      isGranted ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                                    } ${isSystemLevel ? 'ring-1 ring-red-200' : ''}`}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <Checkbox
                                        checked={isGranted}
                                        onCheckedChange={(checked) =>
                                          handlePermissionToggle(permission.id, checked as boolean)
                                        }
                                        disabled={readOnly || (isSystemLevel && !selectedUser?.roles.includes('super_admin'))}
                                      />
                                      <div className="flex items-center space-x-2">
                                        <div className={getPermissionLevelColor(permission.level)}>
                                          {getPermissionLevelIcon(permission.level)}
                                        </div>
                                        <div>
                                          <p className="font-medium">{permission.name}</p>
                                          <p className="text-xs text-muted-foreground">
                                            {permission.description}
                                          </p>
                                        </div>
                                      </div>
                                      {isSystemLevel && (
                                        <Badge variant="destructive" size="sm">
                                          <AlertTriangle className="w-3 h-3 mr-1" />
                                          صلاحية نظام
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    <div className="flex items-center space-x-2">
                                      <Badge
                                        variant={permission.level === 'read' ? 'secondary' : 
                                               permission.level === 'write' ? 'default' : 'destructive'}
                                        size="sm"
                                      >
                                        {permission.level === 'read' ? 'قراءة' : 
                                         permission.level === 'write' ? 'كتابة' : 'إدارة'}
                                      </Badge>
                                      
                                      {/* Show which roles have this permission */}
                                      <div className="flex space-x-1">
                                        {Object.entries(ROLE_PERMISSIONS).map(([role, data]) => {
                                          if (data.permissions.includes(permission.id)) {
                                            const roleLabels: Record<UserRole, string> = {
                                              super_admin: 'س',
                                              company_admin: 'ش',
                                              manager: 'م',
                                              sales_agent: 'ب',
                                              employee: 'ع'
                                            };
                                            
                                            return (
                                              <Badge
                                                key={role}
                                                variant="outline"
                                                size="sm"
                                                className="text-xs px-1"
                                              >
                                                {roleLabels[role as UserRole]}
                                              </Badge>
                                            );
                                          }
                                          return null;
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Role Comparison */}
      {showRoleComparison && (
        <Card>
          <CardHeader>
            <CardTitle>مقارنة الأدوار</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(ROLE_PERMISSIONS).map(([role, data]) => {
                const roleKey = role as UserRole;
                const roleLabels: Record<UserRole, string> = {
                  super_admin: 'مدير النظام',
                  company_admin: 'مدير الشركة',
                  manager: 'مدير',
                  sales_agent: 'مندوب مبيعات',
                  employee: 'موظف'
                };
                
                return (
                  <Card key={role} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{roleLabels[roleKey]}</h3>
                          <Badge>{data.permissions.length}</Badge>
                        </div>
                        
                        <div className="space-y-2">
                          {PERMISSION_CATEGORIES.map(category => {
                            const categoryPerms = data.permissions.filter(permId =>
                              PERMISSIONS.find(p => p.id === permId)?.category.id === category.id
                            );
                            
                            if (categoryPerms.length === 0) return null;
                            
                            return (
                              <div key={category.id} className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                  {category.nameAr}
                                </span>
                                <Badge variant="outline" size="sm">
                                  {categoryPerms.length}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                        
                        {data.canAssignRoles && data.canAssignRoles.length > 0 && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              يمكن تعيين: {data.canAssignRoles.length} أدوار
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
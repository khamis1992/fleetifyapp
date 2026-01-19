import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { User, Mail, Building, Lock, Eye, EyeOff } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const profileSchema = z.object({
  first_name: z.string().min(2, 'الاسم الأول يجب أن يكون على الأقل حرفين'),
  last_name: z.string().min(2, 'الاسم الأخير يجب أن يكون على الأقل حرفين'),
  first_name_ar: z.string().optional(),
  last_name_ar: z.string().optional(),
  position: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  // إذا تم ادخال كلمة مرور جديدة، يجب أن تكون على الأقل 6 أحرف
  if (data.newPassword && data.newPassword.length > 0) {
    return data.newPassword.length >= 6;
  }
  return true;
}, {
  message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  path: ["newPassword"]
}).refine((data) => {
  // إذا تم ادخال كلمة مرور جديدة، يجب تأكيدها
  if (data.newPassword && data.newPassword.length > 0) {
    return data.newPassword === data.confirmPassword;
  }
  return true;
}, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"]
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const Profile: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.profile?.first_name || '',
      last_name: user?.profile?.last_name || '',
      first_name_ar: user?.profile?.first_name_ar || '',
      last_name_ar: user?.profile?.last_name_ar || '',
      position: user?.profile?.position || '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // تحديث الملف الشخصي
      const profileData = {
        first_name: data.first_name,
        last_name: data.last_name,
        first_name_ar: data.first_name_ar,
        last_name_ar: data.last_name_ar,
        position: data.position,
      };

      const { error: profileError } = await updateProfile(profileData);
      
      if (profileError) {
        toast({
          title: "خطأ في التحديث",
          description: profileError.message,
          variant: "destructive",
        });
        return;
      }

      // إذا تم إدخال كلمة مرور جديدة، قم بتحديثها
      if (data.newPassword && data.newPassword.length > 0) {
        const { error: passwordError } = await changePassword(data.newPassword);
        if (passwordError) {
          toast({
            title: "تم تحديث الملف الشخصي",
            description: "تم تحديث الملف الشخصي، ولكن حدث خطأ في تغيير كلمة المرور: " + passwordError.message,
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "تم التحديث بنجاح",
        description: data.newPassword && data.newPassword.length > 0 
          ? "تم تحديث الملف الشخصي وكلمة المرور بنجاح" 
          : "تم تحديث الملف الشخصي بنجاح",
      });

      // إعادة تعيين حقول كلمة المرور
      form.setValue('newPassword', '');
      form.setValue('confirmPassword', '');
      
      // تحديث الصفحة لإظهار البيانات المحدثة
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">
              {(user?.profile?.first_name_ar || user?.profile?.first_name || 'م')[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold text-foreground">الملف الشخصي</h1>
            <p className="text-muted-foreground">إدارة معلوماتك الشخصية</p>
          </div>
        </div>

        <Separator />

        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              المعلومات الأساسية
            </CardTitle>
            <CardDescription>
              عرض المعلومات الأساسية للحساب
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-sm font-medium">البريد الإلكتروني</Label>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              {user?.company && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">الشركة</Label>
                    <p className="text-sm text-muted-foreground">
                      {user.company.name_ar || user.company.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unified Profile & Password Form */}
        <Card>
          <CardHeader>
            <CardTitle>تحديث الملف الشخصي</CardTitle>
            <CardDescription>
              قم بتحديث معلوماتك الشخصية والوظيفية. تحديث كلمة المرور اختياري
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <User className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-medium">المعلومات الشخصية</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الاسم الأول (بالإنجليزية)</FormLabel>
                          <FormControl>
                            <Input placeholder="First Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الاسم الأخير (بالإنجليزية)</FormLabel>
                          <FormControl>
                            <Input placeholder="Last Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="first_name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الاسم الأول (بالعربية)</FormLabel>
                          <FormControl>
                            <Input placeholder="الاسم الأول" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="last_name_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الاسم الأخير (بالعربية)</FormLabel>
                          <FormControl>
                            <Input placeholder="الاسم الأخير" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المنصب الوظيفي</FormLabel>
                          <FormControl>
                            <Input placeholder="المنصب الوظيفي" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Password Update (Optional) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Lock className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-medium">تغيير كلمة المرور (اختياري)</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    اتركها فارغة إذا كنت لا تريد تغيير كلمة المرور
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>كلمة المرور الجديدة (اختياري)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="أدخل كلمة المرور الجديدة"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تأكيد كلمة المرور</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="أكد كلمة المرور الجديدة"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute left-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={isLoading}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "جاري الحفظ..." : "حفظ التغييرات"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
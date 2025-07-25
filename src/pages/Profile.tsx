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
import { User, Mail, Building, Briefcase, Lock, Eye, EyeOff } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const profileSchema = z.object({
  first_name: z.string().min(2, 'الاسم الأول يجب أن يكون على الأقل حرفين'),
  last_name: z.string().min(2, 'الاسم الأخير يجب أن يكون على الأقل حرفين'),
  first_name_ar: z.string().optional(),
  last_name_ar: z.string().optional(),
  position: z.string().optional(),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string().min(6, "تأكيد كلمة المرور مطلوب")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "كلمات المرور غير متطابقة",
  path: ["confirmPassword"]
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

const Profile: React.FC = () => {
  const { user, updateProfile, changePassword } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.profile?.first_name || '',
      last_name: user?.profile?.last_name || '',
      first_name_ar: user?.profile?.first_name_ar || '',
      last_name_ar: user?.profile?.last_name_ar || '',
      position: user?.profile?.position || '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: ""
    }
  });

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await updateProfile(data);
      
      if (error) {
        toast({
          title: "خطأ في التحديث",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "تم التحديث بنجاح",
          description: "تم تحديث الملف الشخصي بنجاح",
        });
        // Refresh the page to show updated data
        window.location.reload();
      }
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

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsChangingPassword(true);
    try {
      const { error } = await changePassword(data.newPassword);
      if (error) {
        toast({
          title: "خطأ",
          description: error.message || "حدث خطأ أثناء تغيير كلمة المرور",
          variant: "destructive"
        });
      } else {
        toast({
          title: "تم التحديث",
          description: "تم تغيير كلمة المرور بنجاح"
        });
        passwordForm.reset();
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
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
              تحديث المعلومات الشخصية والوظيفية
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

        {/* Edit Profile Form */}
        <Card>
          <CardHeader>
            <CardTitle>تحديث الملف الشخصي</CardTitle>
            <CardDescription>
              قم بتحديث معلوماتك الشخصية والوظيفية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

                <div className="flex justify-end gap-3">
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

        <Separator />

        {/* Password Change Section */}
        <Card id="password-section">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-md">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>تغيير كلمة المرور</CardTitle>
                <CardDescription>
                  قم بتحديث كلمة المرور الخاصة بك لضمان أمان حسابك
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>كلمة المرور الجديدة</FormLabel>
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
                    control={passwordForm.control}
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

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => passwordForm.reset()}
                    disabled={isChangingPassword}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={isChangingPassword}>
                    {isChangingPassword ? "جاري التحديث..." : "تغيير كلمة المرور"}
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
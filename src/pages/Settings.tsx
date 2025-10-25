import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Lock,
  ChevronRight,
  Crown,
  CreditCard,
  FileSignature,
  GraduationCap
} from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from 'sonner';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { restart: restartOnboardingTour } = useOnboarding();

  const settingsOptions = [
    {
      title: "الملف الشخصي",
      description: "إدارة معلوماتك الشخصية والوظيفية",
      icon: User,
      action: () => navigate('/profile'),
      available: true
    },
    {
      title: "الإشعارات",
      description: "إعدادات الإشعارات والتنبيهات",
      icon: Bell,
      action: () => {},
      available: false
    },
    {
      title: "الأمان والخصوصية",
      description: "إعدادات كلمة المرور والأمان",
      icon: Shield,
      action: () => navigate('/profile#password-section'),
      available: true
    },
    {
      title: "إعادة جولة التعريف",
      description: "ابدأ جولة تعريفية سريعة بميزات التطبيق",
      icon: GraduationCap,
      action: () => {
        restartOnboardingTour();
        toast.success('تم بدء جولة التعريف', {
          description: 'سيتم توجيهك خلال الميزات الرئيسية للتطبيق'
        });
        navigate('/dashboard');
      },
      available: true
    },
    {
      title: "إعدادات الهوية البصرية",
      description: "تخصيص الشعار والألوان والعناصر البصرية",
      icon: Palette,
      action: () => navigate('/settings/advanced'),
      available: true
    },
    {
      title: "اللغة والمنطقة",
      description: "إعدادات اللغة والمنطقة الزمنية",
      icon: Globe,
      action: () => {},
      available: false
    },
    {
      title: "الصلاحيات",
      description: "عرض صلاحياتك في النظام",
      icon: Lock,
      action: () => navigate('/hr/user-management'),
      available: true
    },
    {
      title: "إدارة الاشتراك",
      description: "إدارة خطة الاشتراك والميزات",
      icon: Crown,
      action: () => navigate('/subscription'),
      available: true
    },
    {
      title: "إعدادات الحسابات المحاسبية",
      description: "إدارة إعدادات الحسابات المحاسبية للعملاء",
      icon: CreditCard,
      action: () => navigate('/settings/customer-accounts'),
      available: true
    },
    {
      title: "إعدادات التوقيع الإلكتروني",
      description: "تحكم في إعدادات التوقيع الإلكتروني للعقود والمستندات",
      icon: FileSignature,
      action: () => navigate('/settings/electronic-signature'),
      available: true
    }
  ];

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <SettingsIcon className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
            <p className="text-muted-foreground">إدارة إعدادات حسابك والتطبيق</p>
          </div>
        </div>

        <Separator />

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات المستخدم</CardTitle>
            <CardDescription>معلومات أساسية عن حسابك</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">الاسم</p>
                <p className="text-lg">
                  {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</p>
                <p className="text-lg">{user?.email}</p>
              </div>
              {user?.profile?.position && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">المنصب</p>
                  <p className="text-lg">{user.profile.position}</p>
                </div>
              )}
              {user?.company && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">الشركة</p>
                  <p className="text-lg">{user.company.name_ar || user.company.name}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Settings Options */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات التطبيق</CardTitle>
            <CardDescription>خيارات تخصيص التطبيق وإعداداته</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {settingsOptions.map((option, index) => {
                const IconComponent = option.icon;
                return (
                  <div key={index}>
                    <Button
                      variant="ghost"
                      className="w-full justify-between h-auto p-4"
                      onClick={option.action}
                      disabled={!option.available}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md ${option.available ? 'bg-primary/10' : 'bg-muted'}`}>
                          <IconComponent className={`h-4 w-4 ${option.available ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="text-right flex-1">
                          <div className={`font-medium ${!option.available && 'text-muted-foreground'}`}>
                            {option.title}
                            {!option.available && <span className="text-xs ml-2">(قريباً)</span>}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </div>
                      {option.available && <ChevronRight className="h-4 w-4" />}
                    </Button>
                    {index < settingsOptions.length - 1 && <Separator className="my-2" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
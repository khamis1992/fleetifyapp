import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Palette,
  Lock,
  ChevronDown,
  ChevronUp,
  Crown,
  CreditCard,
  FileSignature,
  GraduationCap,
  Bell,
  Plug,
  Building2
} from 'lucide-react';
import { useOnboarding } from '@/hooks/useOnboarding';
import { toast } from 'sonner';

interface SettingsSection {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  items: SettingsItem[];
}

interface SettingsItem {
  title: string;
  description: string;
  icon: React.ElementType;
  action: () => void;
  available: boolean;
}

const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { restart: restartOnboardingTour } = useOnboarding();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    company: false,
    notifications: false,
    security: false,
    integrations: false,
  });

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const sections: SettingsSection[] = [
    {
      id: 'general',
      title: 'الإعدادات العامة',
      icon: SettingsIcon,
      description: 'إعدادات الملف الشخصي والتفضيلات',
      items: [
        {
          title: "الملف الشخصي",
          description: "إدارة معلوماتك الشخصية والوظيفية",
          icon: User,
          action: () => navigate('/profile'),
          available: true
        },
        {
          title: "إعادة جولة التعريف",
          description: "ابدأ جولة تعريفية سريعة بميزات التطبيق",
          icon: GraduationCap,
          action: () => {
            restartOnboardingTour();
            toast.success('تم بدء جولة التعريف');
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
      ]
    },
    {
      id: 'company',
      title: 'معلومات الشركة',
      icon: Building2,
      description: 'إعدادات الشركة والنشاط التجاري',
      items: [
        {
          title: "إعدادات الحسابات المحاسبية",
          description: "إدارة إعدادات الحسابات المحاسبية للعملاء",
          icon: CreditCard,
          action: () => navigate('/settings/customer-accounts'),
          available: true
        },
      ]
    },
    {
      id: 'notifications',
      title: 'الإشعارات',
      icon: Bell,
      description: 'إعدادات التنبيهات والإشعارات',
      items: []
    },
    {
      id: 'security',
      title: 'الأمان',
      icon: Shield,
      description: 'إعدادات كلمة المرور والأمان',
      items: [
        {
          title: "الأمان والخصوصية",
          description: "إعدادات كلمة المرور والأمان",
          icon: Lock,
          action: () => navigate('/profile#password-section'),
          available: true
        },
        {
          title: "الصلاحيات",
          description: "عرض صلاحياتك في النظام",
          icon: Shield,
          action: () => navigate('/hr/users'),
          available: true
        },
      ]
    },
    {
      id: 'integrations',
      title: 'التكاملات',
      icon: Plug,
      description: 'ربط النظام مع الخدمات الخارجية',
      items: [
        {
          title: "إدارة الاشتراك",
          description: "إدارة خطة الاشتراك والميزات",
          icon: Crown,
          action: () => navigate('/subscription'),
          available: true
        },
        {
          title: "إعدادات التوقيع الإلكتروني",
          description: "تحكم في إعدادات التوقيع الإلكتروني للعقود والمستندات",
          icon: FileSignature,
          action: () => navigate('/settings/electronic-signature'),
          available: true
        },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-6 space-y-4 md:space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-teal-500 rounded-xl shadow-sm">
          <SettingsIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">الإعدادات</h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">إدارة إعدادات حسابك والتطبيق</p>
        </div>
      </div>

      {/* User Info Card */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {user?.profile?.first_name_ar || user?.profile?.first_name} {user?.profile?.last_name_ar || user?.profile?.last_name}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{user?.email}</p>
              {user?.company && (
                <p className="text-xs text-slate-500 dark:text-slate-500">{user.company.name_ar || user.company.name}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Collapsible Settings Sections */}
      {sections.map(section => (
        <Card key={section.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500 rounded-lg">
                <section.icon className="h-4 w-4 text-white" />
              </div>
              <div className="text-right">
                <p className="font-medium text-slate-900 dark:text-slate-100">{section.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{section.description}</p>
              </div>
            </div>
            {expandedSections[section.id] ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
          {expandedSections[section.id] && (
            <div className="border-t border-slate-200 dark:border-slate-700">
              {section.items.length > 0 ? (
                section.items.map((item, index) => (
                  <button
                    key={index}
                    onClick={item.action}
                    disabled={!item.available}
                    className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className={`p-2 rounded-lg ${item.available ? 'bg-slate-100 dark:bg-slate-800' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <item.icon className={`h-4 w-4 ${item.available ? 'text-slate-600 dark:text-slate-400' : 'text-slate-400'}`} />
                    </div>
                    <div className="flex-1 text-right">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {item.title}
                        {!item.available && <span className="text-xs ml-2 text-slate-400">(قريباً)</span>}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                    {item.available && (
                      <ChevronDown className="h-4 w-4 text-slate-400 rotate-[-90deg]" />
                    )}
                  </button>
                ))
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">لا توجد إعدادات متاحة حالياً</p>
                </div>
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default Settings;
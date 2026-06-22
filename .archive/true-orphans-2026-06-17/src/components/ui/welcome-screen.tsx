import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  Users, 
  FileText, 
  Settings,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface WelcomeScreenProps {
  companyName?: string;
  onGetStarted?: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  companyName, 
  onGetStarted 
}) => {
  const setupSteps = [
    {
      icon: Car,
      title: 'إضافة المركبات',
      description: 'ابدأ بإضافة مركبات الشركة إلى النظام',
      action: 'إضافة مركبة',
      route: '/fleet',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Users,
      title: 'إضافة العملاء',
      description: 'أضف عملاءك لبدء إنشاء العقود',
      action: 'إضافة عميل',
      route: '/customers',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: FileText,
      title: 'إنشاء العقود',
      description: 'أنشئ عقود الإيجار وإدارة الأعمال',
      action: 'إنشاء عقد',
      route: '/contracts',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: Settings,
      title: 'إعداد النظام',
      description: 'اضبط إعدادات الشركة والموظفين',
      action: 'الإعدادات',
      route: '/settings',
      color: 'from-amber-500 to-amber-600'
    }
  ];

  return (
    <div className="min-h-[600px] flex items-center justify-center">
      <div className="max-w-4xl mx-auto p-8">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl blur-xl"></div>
            <div className="relative bg-gradient-to-r from-primary to-primary/80 p-6 rounded-2xl">
              <Sparkles className="h-12 w-12 text-primary-foreground mx-auto mb-4" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            مرحباً بك في نظام إدارة الأسطول
          </h1>
          
          {companyName && (
            <p className="text-xl text-muted-foreground mb-2">
              أهلاً وسهلاً بشركة <span className="font-semibold text-foreground">{companyName}</span>
            </p>
          )}
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            نظام شامل لإدارة أسطول المركبات والعقود والعملاء. ابدأ الآن بإعداد بياناتك الأساسية
          </p>
        </div>

        {/* Setup Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {setupSteps.map((step, index) => (
            <Card key={index} className="group border-0 bg-gradient-to-br from-background to-background/50 backdrop-blur-sm shadow-card hover:shadow-elevated transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
              <CardContent className="p-0 overflow-hidden">
                <div className="p-6 relative">
                  {/* Background Pattern */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  
                  <div className="relative z-10">
                    <div className="flex items-start gap-4 mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${step.color} shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                        <step.icon className="h-6 w-6 text-white drop-shadow-sm" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{step.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {index + 1}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          {step.description}
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full gap-2 group-hover:gap-3 transition-all duration-300"
                      variant="outline"
                      onClick={() => onGetStarted?.()}
                    >
                      {step.action}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Bottom Accent Line */}
                  <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${step.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Start Tips */}
        <Card className="border-0 shadow-card bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              نصائح للبدء السريع
            </CardTitle>
            <CardDescription>
              اتبع هذه الخطوات للحصول على أفضل تجربة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-success rounded-full mt-2 flex-shrink-0"></div>
                <p>ابدأ بإضافة 2-3 مركبات كمثال لتجربة النظام</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-success rounded-full mt-2 flex-shrink-0"></div>
                <p>أضف عميل واحد على الأقل لإنشاء أول عقد</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-success rounded-full mt-2 flex-shrink-0"></div>
                <p>تصفح الإعدادات لتخصيص النظام حسب احتياجاتك</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 bg-success rounded-full mt-2 flex-shrink-0"></div>
                <p>راجع التقارير لمتابعة أداء أعمالك</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
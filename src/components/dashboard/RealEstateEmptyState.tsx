import React from 'react';
import { motion } from 'framer-motion';
import { Building2, Plus, FileText, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface RealEstateEmptyStateProps {
  companyName?: string;
}

export const RealEstateEmptyState: React.FC<RealEstateEmptyStateProps> = ({ 
  companyName = "شركتك" 
}) => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: "إضافة عقار جديد",
      description: "ابدأ بإضافة أول عقار لشركتك",
      icon: Building2,
      path: "/properties/add",
      color: "bg-primary/10 text-primary",
      primary: true
    },
    {
      title: "إضافة ملاك العقارات",
      description: "أضف ملاك العقارات للنظام",
      icon: Users,
      path: "/property-owners",
      color: "bg-secondary/10 text-secondary"
    },
    {
      title: "إنشاء عقد إيجار",
      description: "أنشئ عقد إيجار جديد",
      icon: FileText,
      path: "/property-contracts/add",
      color: "bg-accent/10 text-accent"
    }
  ];

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <div className="max-w-4xl mx-auto text-center">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="mb-6">
            <div className="mx-auto w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-3">
              مرحباً بك في نظام إدارة العقارات
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              ابدأ رحلتك في إدارة العقارات مع {companyName}. أضف عقاراتك الأولى وابدأ في تتبع الإيجارات والعقود.
            </p>
          </div>
        </motion.div>

        {/* Quick Actions Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
        >
          {quickActions.map((action, index) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
            >
              <Card 
                className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 border-2 ${
                  action.primary ? 'border-primary/20 bg-primary/5' : 'border-border hover:border-primary/30'
                }`}
                onClick={() => navigate(action.path)}
              >
                <CardHeader className="text-center pb-4">
                  <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${action.color}`}>
                    <action.icon className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {action.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button 
                    variant={action.primary ? "default" : "outline"} 
                    className="w-full"
                    size="sm"
                  >
                    <Plus className="w-4 h-4 ml-2" />
                    ابدأ الآن
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Benefits Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-center"
        >
          {[
            { 
              icon: Building2, 
              title: "إدارة العقارات", 
              description: "تتبع جميع عقاراتك في مكان واحد" 
            },
            { 
              icon: FileText, 
              title: "العقود الذكية", 
              description: "إنشاء وإدارة عقود الإيجار بسهولة" 
            },
            { 
              icon: Users, 
              title: "إدارة المستأجرين", 
              description: "تتبع بيانات المستأجرين والملاك" 
            },
            { 
              icon: TrendingUp, 
              title: "التقارير المالية", 
              description: "تحليلات مفصلة للإيرادات والأرباح" 
            }
          ].map((feature, index) => (
            <div key={feature.title} className="p-4">
              <feature.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold text-sm mb-2">{feature.title}</h3>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-12 p-6 bg-muted/50 rounded-lg"
        >
          <h3 className="font-semibold mb-2">هل تحتاج مساعدة؟</h3>
          <p className="text-sm text-muted-foreground mb-4">
            فريق الدعم جاهز لمساعدتك في البداية. تواصل معنا للحصول على إرشادات مفصلة.
          </p>
          <Button variant="outline" size="sm">
            تواصل مع الدعم
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default RealEstateEmptyState;
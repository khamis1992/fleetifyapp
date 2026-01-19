/**
 * Demo Dashboard Access Component
 * Allows users to try the system directly from dashboard
 * without logging out or navigating away
 */

import React, { useState } from 'react';
import { Rocket, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { signInToDemo } from '@/lib/demo';
import { cn } from '@/lib/utils';

interface DemoDashboardAccessProps {
  className?: string;
  variant?: 'card' | 'banner' | 'dialog';
}

/**
 * Demo Dashboard Access Card
 * Displays a prominent card encouraging users to try demo mode
 */
const DemoDashboardAccessCard: React.FC<DemoDashboardAccessProps> = ({ className }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDemoAccess = async () => {
    setIsLoading(true);
    try {
      const result = await signInToDemo();
      
      if (result.error) {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء الوصول للنسخة التجريبية. يرجى المحاولة مرة أخرى.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'مرحباً بك!',
        description: 'لديك 7 أيام لتجربة جميع ميزات النظام مجاناً',
      });

      // Redirect to dashboard after short delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Demo access error:', error);
      toast({
        title: 'خطأ',
        description: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={cn('border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10', className)}>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              تجربة النظام مجاناً
            </CardTitle>
            <CardDescription>
              جرب جميع ميزات Fleetify لمدة 7 أيام بدون الحاجة لبطاقة ائتمان
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>بيانات تجريبية واقعية جاهزة للاستخدام</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>الوصول الكامل لجميع الميزات</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>لا توجد قيود أو حدود على الاستخدام</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-primary" />
            <span>يمكن البدء فوراً بدون أي إعدادات</span>
          </div>
        </div>

        <Button
          onClick={handleDemoAccess}
          disabled={isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          size="lg"
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              جاري الدخول...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              ابدأ التجربة الآن
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          بلا بريد إلكتروني • بلا كلمة مرور • بيانات تجريبية فوراً
        </p>
      </CardContent>
    </Card>
  );
};

/**
 * Demo Dashboard Access Banner
 * Compact banner for inline display
 */
const DemoDashboardAccessBanner: React.FC<DemoDashboardAccessProps> = ({ className }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDemoAccess = async () => {
    setIsLoading(true);
    try {
      const result = await signInToDemo();
      
      if (result.error) {
        toast({
          title: 'خطأ',
          description: 'حدث خطأ أثناء الوصول للنسخة التجريبية.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'مرحباً بك!',
        description: 'لديك 7 أيام لتجربة جميع ميزات النظام مجاناً',
      });

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Demo access error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('bg-primary/10 border border-primary/30 rounded-lg p-4', className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Rocket className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-sm">تجربة النظام مجاناً لمدة 7 أيام</p>
            <p className="text-xs text-muted-foreground">بلا بريد إلكتروني • بيانات تجريبية جاهزة</p>
          </div>
        </div>
        <Button
          onClick={handleDemoAccess}
          disabled={isLoading}
          variant="default"
          size="sm"
          className="flex-shrink-0 gap-2"
        >
          {isLoading ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <>
              ابدأ الآن
              <ArrowRight className="h-3 w-3" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export { DemoDashboardAccessCard, DemoDashboardAccessBanner };

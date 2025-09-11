import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ForcePasswordChangeDialog: React.FC = () => {
  const { user } = useAuth();
  const requiresChange = React.useMemo(() => {
    const meta = user?.user_metadata?.requires_password_change;
    return meta === true || meta === 'true' || meta === 1;
  }, [user]);
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [completed, setCompleted] = React.useState(false);
  const { toast } = useToast();

  if (!requiresChange || completed) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: 'تنبيه', description: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'تنبيه', description: 'كلمتا المرور غير متطابقتين', variant: 'destructive' });
      return;
    }

    try {
      setSubmitting(true);
      
      // Step 1: Update password
      const passwordResult = await supabase.auth.updateUser({
        password: newPassword
      });
      if (passwordResult.error) throw passwordResult.error;
      
      // Step 2: Update metadata
      const metadataResult = await supabase.auth.updateUser({
        data: { requires_password_change: false }
      });
      if (metadataResult.error) throw metadataResult.error;
      
      // Step 3: Refresh user to ensure metadata is updated
      await supabase.auth.getUser();
      
      toast({ title: 'تم التحديث', description: 'تم تغيير كلمة المرور بنجاح' });
      setCompleted(true);
      
      // Force refresh as fallback
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (err: any) {
      const errorMessage = err?.message || 'تعذر تغيير كلمة المرور';
      toast({ title: 'خطأ', description: errorMessage, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تحديث كلمة المرور</DialogTitle>
          <DialogDescription>
            يجب تغيير كلمة المرور المؤقتة قبل استخدام النظام.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
            <Input id="newPassword" type="password" dir="ltr" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <Input id="confirmPassword" type="password" dir="ltr" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? 'جاري الحفظ...' : 'حفظ وتابع'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ForcePasswordChangeDialog;

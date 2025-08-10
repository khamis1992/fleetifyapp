import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const ForcePasswordChangeDialog: React.FC = () => {
  const { user } = useAuth();
  const requiresChange = useMemo(() => Boolean(user?.user_metadata?.requires_password_change), [user]);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        data: { requires_password_change: false }
      });
      if (error) throw error;
      toast({ title: 'تم التحديث', description: 'تم تغيير كلمة المرور بنجاح' });
      setCompleted(true);
    } catch (err) {
      toast({ title: 'خطأ', description: 'تعذر تغيير كلمة المرور', variant: 'destructive' });
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
          <Button type="submit" disabled={submitting} className="w-full">حفظ وتابع</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ForcePasswordChangeDialog;

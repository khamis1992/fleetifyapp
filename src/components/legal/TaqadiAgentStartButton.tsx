import { useEffect, useRef, useState } from 'react';
import { Loader2, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const LAUNCH_URL = 'fleetify-taqadi://start';
const WAITING_TIMEOUT_MS = 90_000;

/**
 * يشغّل وكيل تقاضي على جهاز المكتب عبر بروتوكول fleetify-taqadi:// المسجَّل
 * في Windows (npm run taqadi:agent:launcher:install). يعمل الزر فقط من متصفح
 * الجهاز المثبَّت عليه الوكيل؛ من أي جهاز آخر لن يحدث شيء ويظهر الإرشاد.
 */
export function TaqadiAgentStartButton() {
  const [waiting, setWaiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const handleStart = () => {
    window.location.href = LAUNCH_URL;
    setWaiting(true);
    toast.info('تم إرسال أمر تشغيل الوكيل إلى جهاز المكتب', {
      description:
        'إن ظهر مربع حوار من المتصفح فاختر «فتح». يعمل الزر فقط من متصفح جهاز المكتب المثبَّت عليه الوكيل؛ ' +
        'وإن لم يستجب فشغّل مرة واحدة: npm run taqadi:agent:launcher:install',
      duration: 12_000,
    });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setWaiting(false), WAITING_TIMEOUT_MS);
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleStart}
      disabled={waiting}
      className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
    >
      {waiting
        ? <Loader2 className="ml-1.5 h-4 w-4 animate-spin" />
        : <Power className="ml-1.5 h-4 w-4" />}
      {waiting ? 'جارٍ تشغيل الوكيل...' : 'تشغيل الوكيل الآن'}
    </Button>
  );
}

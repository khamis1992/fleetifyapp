/**
 * مكون إعادة التوجيه لصفحة تفاصيل العميل
 * يعيد التوجيه إلى قائمة العملاء مع فتح Side Panel للعميل المحدد
 */

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

export default function CustomerDetailsRedirect() {
  const navigate = useNavigate();
  const { customerId } = useParams<{ customerId: string }>();

  useEffect(() => {
    // إعادة التوجيه إلى صفحة العملاء مع معرف العميل في query string
    // سيتم فتح Side Panel تلقائياً
    if (customerId) {
      navigate(`/customers?open=${customerId}`, { replace: true });
    } else {
      navigate('/customers', { replace: true });
    }
  }, [customerId, navigate]);

  // عرض شاشة تحميل أثناء إعادة التوجيه
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500 mx-auto mb-4"></div>
        <p className="text-gray-600">جاري إعادة التوجيه...</p>
      </div>
    </div>
  );
}


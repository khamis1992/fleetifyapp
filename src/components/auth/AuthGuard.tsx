import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * مكون حماية المصادقة - يدير حالة المصادقة لكامل التطبيق
 * يمنع الوميش ويضمن تهيئة AuthProvider قبل رسم أي مكون
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback = <AuthLoadingScreen /> 
}) => {
  const { loading, sessionError } = useAuth();

  // أثناء التحميل الأولي، اعرض شاشة التحميل
  if (loading) {
    return <>{fallback}</>;
  }

  // إذا كان هناك خطأ في الجلسة، سجل الخطأ ولكن اعرض المحتوى
  // لأن بعض الصفحات (مثل الصفحة الرئيسية وتسجيل الدخول) لا تتطلب مصادقة
  if (sessionError) {
    console.error('📝 [AUTH_GUARD] Session error:', sessionError);
  }

  // اعرض المحتوى بعد اكتمال تهيئة المصادقة
  return <>{children}</>;
};

/**
 * شاشة التحميل الافتراضية للمصادقة
 */
const AuthLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-lg">جاري التحقق من حالة تسجيل الدخول...</p>
        <p className="text-gray-400 text-sm mt-2">يرجى الانتظار</p>
      </div>
    </div>
  );
};

export default AuthGuard;

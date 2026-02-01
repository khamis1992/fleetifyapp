/**
 * Mobile Diagnostics Page
 * صفحة تشخيص المشاكل في تطبيق الجوال
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Wifi,
  Database,
  Lock,
  Smartphone
} from 'lucide-react';
import { supabase, supabaseConfig } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

interface DiagnosticCheck {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const MobileDiagnostics: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [checks, setChecks] = useState<DiagnosticCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const updateCheck = (name: string, status: DiagnosticCheck['status'], message: string, details?: any) => {
    setChecks(prev => {
      const existing = prev.find(c => c.name === name);
      if (existing) {
        return prev.map(c => c.name === name ? { name, status, message, details } : c);
      }
      return [...prev, { name, status, message, details }];
    });
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setChecks([]);

    // 1. Check Platform
    updateCheck('platform', 'pending', 'فحص المنصة...', null);
    try {
      const platform = Capacitor.getPlatform();
      const isNative = Capacitor.isNativePlatform();
      updateCheck('platform', 'success', `المنصة: ${platform}`, { platform, isNative });
    } catch (error) {
      updateCheck('platform', 'error', 'فشل فحص المنصة', error);
    }

    // 2. Check Supabase Config
    updateCheck('config', 'pending', 'فحص إعدادات Supabase...', null);
    try {
      const hasUrl = !!supabaseConfig.url;
      const hasKey = !!supabaseConfig.anonKey;
      const urlPreview = supabaseConfig.url?.substring(0, 30) + '...';
      
      if (hasUrl && hasKey) {
        updateCheck('config', 'success', 'إعدادات Supabase صحيحة', { 
          urlPreview,
          hasUrl,
          hasKey 
        });
      } else {
        updateCheck('config', 'error', 'إعدادات Supabase ناقصة', { hasUrl, hasKey });
      }
    } catch (error) {
      updateCheck('config', 'error', 'فشل فحص الإعدادات', error);
    }

    // 3. Check Network Connection
    updateCheck('network', 'pending', 'فحص الاتصال بالإنترنت...', null);
    try {
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      updateCheck('network', 'success', 'الاتصال بالإنترنت يعمل', null);
    } catch (error) {
      updateCheck('network', 'error', 'لا يوجد اتصال بالإنترنت', error);
    }

    // 4. Check Supabase Connection
    updateCheck('supabase', 'pending', 'فحص الاتصال بـ Supabase...', null);
    try {
      const { data, error } = await supabase.from('companies').select('id').limit(1);
      
      if (error) {
        updateCheck('supabase', 'error', `خطأ في الاتصال: ${error.message}`, error);
      } else {
        updateCheck('supabase', 'success', 'الاتصال بـ Supabase يعمل', { recordsFound: data?.length || 0 });
      }
    } catch (error: any) {
      updateCheck('supabase', 'error', `فشل الاتصال: ${error.message}`, error);
    }

    // 5. Check Auth Session
    updateCheck('auth-session', 'pending', 'فحص جلسة المصادقة...', null);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        updateCheck('auth-session', 'error', `خطأ في الجلسة: ${error.message}`, error);
      } else if (session) {
        updateCheck('auth-session', 'success', 'جلسة نشطة موجودة', { 
          user: session.user.email,
          expiresAt: new Date(session.expires_at! * 1000).toLocaleString('ar')
        });
      } else {
        updateCheck('auth-session', 'warning', 'لا توجد جلسة نشطة', null);
      }
    } catch (error: any) {
      updateCheck('auth-session', 'error', `فشل فحص الجلسة: ${error.message}`, error);
    }

    // 6. Check Storage
    updateCheck('storage', 'pending', 'فحص التخزين المحلي...', null);
    try {
      // Test localStorage
      localStorage.setItem('test', 'value');
      const testValue = localStorage.getItem('test');
      localStorage.removeItem('test');

      // Test Capacitor Preferences
      await Preferences.set({ key: 'test', value: 'value' });
      const { value } = await Preferences.get({ key: 'test' });
      await Preferences.remove({ key: 'test' });

      if (testValue === 'value' && value === 'value') {
        updateCheck('storage', 'success', 'التخزين المحلي يعمل', null);
      } else {
        updateCheck('storage', 'warning', 'مشكلة في التخزين المحلي', { testValue, value });
      }
    } catch (error: any) {
      updateCheck('storage', 'error', `فشل فحص التخزين: ${error.message}`, error);
    }

    // 7. Check AuthContext
    updateCheck('auth-context', 'pending', 'فحص سياق المصادقة...', null);
    try {
      if (user) {
        updateCheck('auth-context', 'success', 'المستخدم مسجل الدخول', { 
          email: user.email,
          id: user.id 
        });
      } else if (authLoading) {
        updateCheck('auth-context', 'warning', 'جاري تحميل بيانات المستخدم...', null);
      } else {
        updateCheck('auth-context', 'warning', 'المستخدم غير مسجل الدخول', null);
      }
    } catch (error: any) {
      updateCheck('auth-context', 'error', `فشل فحص السياق: ${error.message}`, error);
    }

    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  const getStatusIcon = (status: DiagnosticCheck['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <div className="w-5 h-5 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />;
    }
  };

  const getStatusColor = (status: DiagnosticCheck['status']) => {
    switch (status) {
      case 'success':
        return 'border-green-500/30 bg-green-500/5';
      case 'error':
        return 'border-red-500/30 bg-red-500/5';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/5';
      default:
        return 'border-gray-500/30 bg-gray-500/5';
    }
  };

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      dir="rtl"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">تشخيص التطبيق</h1>
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="px-4 py-2 rounded-xl bg-teal-500 text-white text-sm font-semibold disabled:opacity-50"
          >
            {isRunning ? 'جاري الفحص...' : 'إعادة الفحص'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {checks.map((check, index) => (
          <motion.div
            key={check.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-2xl border ${getStatusColor(check.status)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(check.status)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white mb-1">{check.name}</h3>
                <p className="text-sm text-white/70">{check.message}</p>
                {check.details && (
                  <pre className="mt-2 p-2 bg-black/30 rounded-lg text-xs text-white/60 overflow-x-auto">
                    {JSON.stringify(check.details, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          </motion.div>
        ))}

        {checks.length === 0 && !isRunning && (
          <div className="text-center py-12 text-white/50">
            <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>اضغط "إعادة الفحص" لبدء التشخيص</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileDiagnostics;

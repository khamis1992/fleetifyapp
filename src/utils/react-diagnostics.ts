/**
 * أداة تشخيص شاملة لمشاكل React
 * تساعد في تحديد سبب خطأ "Cannot read properties of null (reading 'useState')"
 */

export interface ReactDiagnosticResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, any>;
}

export const runReactDiagnostics = (): ReactDiagnosticResult => {
  const result: ReactDiagnosticResult = {
    success: true,
    errors: [],
    warnings: [],
    details: {}
  };

  console.log('🔍 Starting comprehensive React diagnostics...');

  try {
    // 1. فحص وجود React
    const reactModule = require('react');
    result.details.reactModule = {
      exists: !!reactModule,
      type: typeof reactModule,
      keys: reactModule ? Object.keys(reactModule).slice(0, 10) : []
    };

    if (!reactModule) {
      result.errors.push('React module not found');
      result.success = false;
    }

    // 2. فحص hooks الأساسية
    const requiredHooks = [
      'useState', 'useEffect', 'useContext', 'createContext',
      'useCallback', 'useMemo', 'useRef', 'useReducer'
    ];

    const hookStatus: Record<string, string> = {};
    requiredHooks.forEach(hook => {
      hookStatus[hook] = typeof (reactModule as any)?.[hook];
      if (typeof (reactModule as any)?.[hook] !== 'function') {
        result.errors.push(`React.${hook} is not a function (${hookStatus[hook]})`);
        result.success = false;
      }
    });
    result.details.hooks = hookStatus;

    // 3. فحص React DOM
    try {
      const reactDom = require('react-dom/client');
      result.details.reactDom = {
        exists: !!reactDom,
        createRoot: typeof reactDom?.createRoot,
        keys: reactDom ? Object.keys(reactDom) : []
      };
    } catch (error) {
      result.errors.push(`ReactDOM import failed: ${error}`);
      result.success = false;
    }

    // 4. فحص البيئة العالمية
    if (typeof window !== 'undefined') {
      result.details.globalReact = {
        windowReact: typeof (window as any).React,
        windowReactKeys: (window as any).React ? Object.keys((window as any).React).slice(0, 10) : [],
        devtools: !!(window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__
      };
    }

    // 5. فحص Vite/bundler
    result.details.bundler = {
      viteClient: typeof (window as any).__vite__,
      hmr: typeof (window as any).__vite_plugin_react_preamble_installed__,
      nodeEnv: process.env.NODE_ENV
    };

    // 6. فحص تكرار React
    const reactVersions: string[] = [];
    try {
      // محاولة الكشف عن نسخ متعددة من React
      const packageJson = require('../../package.json');
      if (packageJson.dependencies?.react) {
        reactVersions.push(`dependencies: ${packageJson.dependencies.react}`);
      }
      if (packageJson.devDependencies?.react) {
        reactVersions.push(`devDependencies: ${packageJson.devDependencies.react}`);
      }
    } catch {
      // تجاهل الخطأ
    }
    result.details.versions = reactVersions;

    // 7. تشخيص محدد لخطأ useState
    if (reactModule) {
      const testHook = reactModule.useState;
      result.details.useStateDiagnostic = {
        exists: !!testHook,
        type: typeof testHook,
        isFunction: typeof testHook === 'function',
        toString: testHook?.toString?.()?.substring(0, 100),
        prototype: testHook?.prototype,
        length: testHook?.length
      };

      // محاولة استدعاء useState خارج مكون (سيفشل لكن نرى نوع الخطأ)
      try {
        testHook(null);
        result.warnings.push('useState call outside component succeeded (unexpected)');
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        result.details.useStateTestError = errorMsg;
        
        if (errorMsg.includes('Invalid hook call')) {
          result.warnings.push('useState works but called outside component (expected)');
        } else if (errorMsg.includes('Cannot read properties of null')) {
          result.errors.push('useState itself is broken - this is the root cause');
          result.success = false;
        } else {
          result.warnings.push(`Unexpected useState error: ${errorMsg}`);
        }
      }
    }

  } catch (error: any) {
    result.errors.push(`Diagnostic failed: ${error?.message || String(error)}`);
    result.success = false;
  }

  // طباعة النتائج
  console.log('🔍 React Diagnostics Results:');
  console.log('Success:', result.success);
  if (result.errors.length > 0) {
    console.error('❌ Errors:', result.errors);
  }
  if (result.warnings.length > 0) {
    console.warn('⚠️ Warnings:', result.warnings);
  }
  console.log('📊 Details:', result.details);

  return result;
};

// تشغيل التشخيص تلقائياً في development
if (process.env.NODE_ENV === 'development') {
  // تأخير قصير للسماح لـ React بالتحميل
  setTimeout(() => {
    runReactDiagnostics();
  }, 100);
}

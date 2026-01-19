// مكتبة للتحقق من التوافق وإدارة الترقيات
import { logger } from './logger';
import { performanceMonitor } from './performanceMonitor';

interface CompatibilityCheck {
  name: string;
  version: string;
  compatible: boolean;
  issues?: string[];
  recommendations?: string[];
}

export class CompatibilityManager {
  private checks: Map<string, CompatibilityCheck> = new Map();

  // فحص توافق مكتبة معينة
  checkLibraryCompatibility(name: string, version: string): CompatibilityCheck {
    const endTiming = performanceMonitor.startTiming(`Compatibility check: ${name}`);
    
    let check: CompatibilityCheck = {
      name,
      version,
      compatible: true,
      issues: [],
      recommendations: []
    };

    // فحص Radix UI
    if (name.startsWith('@radix-ui/')) {
      check = this.checkRadixCompatibility(name, version);
    }
    
    // فحص Framer Motion
    if (name === 'framer-motion') {
      check = this.checkFramerMotionCompatibility(version);
    }
    
    // فحص React Hook Form
    if (name === 'react-hook-form') {
      check = this.checkReactHookFormCompatibility(version);
    }

    this.checks.set(name, check);
    endTiming();
    
    return check;
  }

  private checkRadixCompatibility(name: string, version: string): CompatibilityCheck {
    // معظم مكتبات Radix UI متوافقة مع React 18
    const compatible = !version.includes('alpha') && !version.includes('beta');
    
    return {
      name,
      version,
      compatible,
      issues: compatible ? [] : ['إصدار غير مستقر'],
      recommendations: compatible ? [] : ['استخدم إصدار مستقر']
    };
  }

  private checkFramerMotionCompatibility(version: string): CompatibilityCheck {
    // Framer Motion لديه مشاكل معروفة مع React 19
    const majorVersion = parseInt(version.split('.')[0]);
    
    return {
      name: 'framer-motion',
      version,
      compatible: majorVersion >= 12, // الإصدارات الحديثة أكثر استقراراً
      issues: majorVersion < 12 ? ['مشاكل أداء مع React 18+'] : [],
      recommendations: majorVersion < 12 ? ['ترقية إلى الإصدار 12+'] : ['استخدم المكونات المتوافقة']
    };
  }

  private checkReactHookFormCompatibility(version: string): CompatibilityCheck {
    const majorVersion = parseInt(version.split('.')[0]);
    
    return {
      name: 'react-hook-form',
      version,
      compatible: majorVersion >= 7,
      issues: majorVersion < 7 ? ['مشاكل أداء معروفة'] : [],
      recommendations: majorVersion >= 7 ? ['يمكن استخدام useCompatibleForm للتحسين الإضافي'] : ['ترقية إلى الإصدار 7+']
    };
  }

  // تقرير شامل عن التوافق
  generateCompatibilityReport(): {
    summary: { total: number; compatible: number; issues: number };
    details: CompatibilityCheck[];
    criticalIssues: string[];
    recommendations: string[];
  } {
    const details = Array.from(this.checks.values());
    const compatible = details.filter(c => c.compatible).length;
    const issues = details.filter(c => !c.compatible).length;
    
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];
    
    details.forEach(check => {
      if (check.issues) {
        criticalIssues.push(...check.issues.map(issue => `${check.name}: ${issue}`));
      }
      if (check.recommendations) {
        recommendations.push(...check.recommendations.map(rec => `${check.name}: ${rec}`));
      }
    });

    return {
      summary: {
        total: details.length,
        compatible,
        issues
      },
      details,
      criticalIssues,
      recommendations
    };
  }

  // تسجيل تقرير التوافق
  logCompatibilityReport() {
    const report = this.generateCompatibilityReport();
    
    logger.info('Compatibility Report:', {
      summary: report.summary,
      criticalIssues: report.criticalIssues,
      recommendations: report.recommendations
    });
    
    if (report.criticalIssues.length > 0) {
      logger.warn('Critical compatibility issues found:', report.criticalIssues);
    }
    
    return report;
  }
}

export const compatibilityManager = new CompatibilityManager();
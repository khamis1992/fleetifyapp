import { ChartOfAccount } from '@/hooks/useChartOfAccounts';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  warnings: string[];
  suggestions: string[];
}

export class AccountMoveValidator {
  private accounts: ChartOfAccount[];
  private accountMap: Map<string, ChartOfAccount>;

  constructor(accounts: ChartOfAccount[]) {
    this.accounts = accounts;
    this.accountMap = new Map(accounts.map(acc => [acc.id, acc]));
  }

  validateMove(accountId: string, newParentId: string): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      issues: [],
      warnings: [],
      suggestions: []
    };

    const account = this.accountMap.get(accountId);
    const newParent = newParentId ? this.accountMap.get(newParentId) : null;

    if (!account) {
      result.isValid = false;
      result.issues.push('الحساب المحدد غير موجود');
      return result;
    }

    // تحقق من عدم جعل الحساب أباً لنفسه
    if (accountId === newParentId) {
      result.isValid = false;
      result.issues.push('لا يمكن جعل الحساب أباً لنفسه');
      return result;
    }

    // تحقق من عدم إنشاء دائرة في التسلسل الهرمي
    if (newParentId && this.wouldCreateCycle(accountId, newParentId)) {
      result.isValid = false;
      result.issues.push('هذا النقل سينشئ دائرة في التسلسل الهرمي');
      result.suggestions.push('اختر حساب أب من مستوى أعلى');
      return result;
    }

    // تحقق من صحة نوع الحساب الأب
    if (newParent) {
      if (!newParent.is_header) {
        result.isValid = false;
        result.issues.push('الحساب الأب يجب أن يكون حساب رئيسي');
        result.suggestions.push('اختر حساب رئيسي كحساب أب');
        return result;
      }

      // تحقق من توافق نوع الحساب
      if (!this.areTypesCompatible(account.account_type, newParent.account_type)) {
        result.isValid = false;
        result.issues.push(`نوع الحساب (${this.getAccountTypeLabel(account.account_type)}) غير متوافق مع نوع الحساب الأب (${this.getAccountTypeLabel(newParent.account_type)})`);
        result.suggestions.push('اختر حساب أب من نفس النوع أو نوع متوافق');
        return result;
      }

      // تحقق من المستوى
      const newLevel = this.calculateNewLevel(newParentId);
      if (newLevel > 6) {
        result.isValid = false;
        result.issues.push('هذا النقل سيجعل الحساب في مستوى أعمق من المسموح (أقصى 6 مستويات)');
        result.suggestions.push('اختر حساب أب في مستوى أعلى');
        return result;
      }

      // تحذيرات
      if (newLevel > 4 && account.is_header) {
        result.warnings.push('الحسابات الرئيسية عادة لا تكون في مستوى أعمق من المستوى 4');
        result.suggestions.push('فكر في تغيير نوع الحساب إلى حساب فرعي');
      }

      // تحقق من تأثير النقل على الحسابات الفرعية
      const childrenCount = this.getChildrenCount(accountId);
      if (childrenCount > 0) {
        result.warnings.push(`هذا الحساب له ${childrenCount} حساب فرعي سيتأثر بالنقل`);
        result.suggestions.push('تأكد من أن المستوى الجديد مناسب للحسابات الفرعية');
      }
    }

    // تحقق من وجود قيود محاسبية
    if (this.hasJournalEntries(accountId)) {
      result.warnings.push('هذا الحساب يحتوي على قيود محاسبية. النقل قد يؤثر على التقارير السابقة');
      result.suggestions.push('راجع التقارير المالية بعد النقل للتأكد من صحتها');
    }

    return result;
  }

  private wouldCreateCycle(accountId: string, newParentId: string): boolean {
    let currentParentId = newParentId;
    
    while (currentParentId) {
      if (currentParentId === accountId) {
        return true;
      }
      
      const currentParent = this.accountMap.get(currentParentId);
      currentParentId = currentParent?.parent_account_id || null;
    }
    
    return false;
  }

  private areTypesCompatible(childType: string, parentType: string): boolean {
    // نفس النوع دائماً متوافق
    if (childType === parentType) return true;

    // قواعد التوافق المحاسبية
    const compatibilityMatrix: Record<string, string[]> = {
      'assets': ['assets'],
      'liabilities': ['liabilities'],
      'equity': ['equity'],
      'revenue': ['revenue'],
      'expenses': ['expenses']
    };

    return compatibilityMatrix[childType]?.includes(parentType) || false;
  }

  private calculateNewLevel(parentId: string | null): number {
    if (!parentId) return 1;
    
    let level = 1;
    let currentId = parentId;
    
    while (currentId) {
      level++;
      const parent = this.accountMap.get(currentId);
      currentId = parent?.parent_account_id || null;
    }
    
    return level;
  }

  private getChildrenCount(accountId: string): number {
    return this.accounts.filter(acc => acc.parent_account_id === accountId).length;
  }

  private hasJournalEntries(accountId: string): boolean {
    // في التطبيق الحقيقي، هذا سيتحقق من قاعدة البيانات
    // هنا نفترض أن الحسابات في المستوى 5 و 6 لديها قيود
    const account = this.accountMap.get(accountId);
    return account ? (account.account_level || 0) >= 5 : false;
  }

  private getAccountTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'assets': 'الأصول',
      'liabilities': 'الخصوم', 
      'equity': 'حقوق الملكية',
      'revenue': 'الإيرادات',
      'expenses': 'المصروفات'
    };
    return labels[type] || type;
  }

  // اقتراحات ذكية لأفضل مكان للحساب
  suggestBestParent(account: ChartOfAccount): ChartOfAccount[] {
    const suggestions: ChartOfAccount[] = [];
    
    // ابحث عن الحسابات الرئيسية من نفس النوع
    const compatibleParents = this.accounts.filter(acc => 
      acc.is_header &&
      acc.id !== account.id &&
      this.areTypesCompatible(account.account_type, acc.account_type) &&
      (acc.account_level || 0) < 4 // لا نقترح حسابات في مستوى عميق
    );

    // رتب حسب المستوى والاسم
    return compatibleParents
      .sort((a, b) => {
        const levelDiff = (a.account_level || 0) - (b.account_level || 0);
        if (levelDiff !== 0) return levelDiff;
        return a.account_name.localeCompare(b.account_name);
      })
      .slice(0, 5); // أعلى 5 اقتراحات
  }

  // تحليل الأثر المحتمل للنقل
  analyzeImpact(accountId: string, newParentId: string): {
    affectedAccounts: ChartOfAccount[];
    levelChanges: Array<{ account: ChartOfAccount; oldLevel: number; newLevel: number }>;
    reportingImpact: string[];
  } {
    const account = this.accountMap.get(accountId);
    if (!account) {
      return {
        affectedAccounts: [],
        levelChanges: [],
        reportingImpact: []
      };
    }

    // احصل على جميع الحسابات الفرعية
    const affectedAccounts = this.getAllDescendants(accountId);
    
    // احسب تغييرات المستوى
    const oldLevel = account.account_level || 1;
    const newLevel = this.calculateNewLevel(newParentId);
    const levelDifference = newLevel - oldLevel;

    const levelChanges = affectedAccounts.map(acc => ({
      account: acc,
      oldLevel: acc.account_level || 1,
      newLevel: (acc.account_level || 1) + levelDifference
    }));

    // تحليل تأثير التقارير
    const reportingImpact: string[] = [];
    
    if (levelChanges.some(lc => lc.newLevel > 6)) {
      reportingImpact.push('بعض الحسابات ستصل لمستوى أعمق من المسموح');
    }
    
    if (affectedAccounts.length > 10) {
      reportingImpact.push(`سيتأثر ${affectedAccounts.length} حساب فرعي بهذا التغيير`);
    }
    
    if (levelDifference > 2) {
      reportingImpact.push('تغيير كبير في المستوى قد يؤثر على التقارير الهرمية');
    }

    return {
      affectedAccounts,
      levelChanges,
      reportingImpact
    };
  }

  private getAllDescendants(accountId: string): ChartOfAccount[] {
    const descendants: ChartOfAccount[] = [];
    
    const collectDescendants = (parentId: string) => {
      const children = this.accounts.filter(acc => acc.parent_account_id === parentId);
      children.forEach(child => {
        descendants.push(child);
        collectDescendants(child.id);
      });
    };
    
    collectDescendants(accountId);
    return descendants;
  }
}
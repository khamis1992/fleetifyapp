export type FinanceActionId =
  | "finance.invoice.create"
  | "finance.invoice.edit_amount"
  | "finance.invoice.edit_date"
  | "finance.invoice.edit_customer"
  | "finance.invoice.cancel"
  | "finance.payment.create"
  | "finance.payment.edit_amount"
  | "finance.payment.edit_date"
  | "finance.payment.edit_bank"
  | "finance.payment.cancel"
  | "finance.payment.cancel_own"
  | "finance.payment.reconcile"
  | "finance.journal.create_draft"
  | "finance.journal.submit_for_review"
  | "finance.journal.review"
  | "finance.journal.approve"
  | "finance.journal.post"
  | "finance.journal.reverse"
  | "finance.journal.cancel"
  | "finance.journal.edit_date"
  | "finance.journal.edit_lines"
  | "finance.period.close"
  | "finance.period.reopen"
  | "finance.bank.import_statement"
  | "finance.bank.reconcile"
  | "finance.budget.override"
  | "finance.budget.approve"
  | "finance.audit.view"
  | "finance.audit.export";

export type FinanceEntity = "invoice" | "payment" | "journal_entry" | "period" | "bank_reconciliation" | "budget" | "audit";

export interface FinancePermissionDefinition {
  id: FinanceActionId;
  entity: FinanceEntity;
  label: string;
  description: string;
  level: "read" | "write" | "approve" | "admin";
  fallbackPermissions: string[];
  risk: "low" | "medium" | "high" | "critical";
}

export interface FinanceFieldPermissionDefinition {
  entity: Extract<FinanceEntity, "invoice" | "payment" | "journal_entry" | "budget">;
  field: string;
  label: string;
  permission: FinanceActionId;
  risk: "medium" | "high" | "critical";
}

export interface SegregationOfDutiesRule {
  id: string;
  action: FinanceActionId;
  label: string;
  description: string;
  bypassPermission?: FinanceActionId;
}

export interface SegregationContext {
  action: FinanceActionId;
  actorId?: string | null;
  creatorId?: string | null;
  requesterId?: string | null;
  reviewerId?: string | null;
  approverId?: string | null;
  bypassPermissions?: string[];
}

export interface SegregationDecision {
  allowed: boolean;
  ruleId?: string;
  reason?: string;
}

export interface PermissionConflictRule {
  id: string;
  primaryAction: FinanceActionId;
  conflictingAction: FinanceActionId;
  severity: "high" | "critical";
  label: string;
}

export interface PermissionConflictFinding {
  ruleId: string;
  actions: [FinanceActionId, FinanceActionId];
  severity: PermissionConflictRule["severity"];
  label: string;
}

export const FINANCE_PERMISSION_MATRIX: FinancePermissionDefinition[] = [
  {
    id: "finance.invoice.create",
    entity: "invoice",
    label: "إنشاء فاتورة",
    description: "إنشاء فاتورة مالية وربطها بمصدرها التشغيلي.",
    level: "write",
    fallbackPermissions: ["finance.invoices.write"],
    risk: "high",
  },
  {
    id: "finance.invoice.edit_amount",
    entity: "invoice",
    label: "تعديل مبلغ الفاتورة",
    description: "تعديل المبلغ أو الإجمالي أو الضريبة بعد إنشاء الفاتورة.",
    level: "admin",
    fallbackPermissions: ["finance.invoices.write"],
    risk: "critical",
  },
  {
    id: "finance.invoice.edit_date",
    entity: "invoice",
    label: "تعديل تاريخ الفاتورة",
    description: "تغيير تاريخ الإصدار أو الاستحقاق بما يؤثر على التقارير والفترات.",
    level: "admin",
    fallbackPermissions: ["finance.invoices.write"],
    risk: "high",
  },
  {
    id: "finance.invoice.edit_customer",
    entity: "invoice",
    label: "تغيير العميل",
    description: "نقل الفاتورة إلى عميل أو عقد مختلف.",
    level: "admin",
    fallbackPermissions: ["finance.invoices.write"],
    risk: "critical",
  },
  {
    id: "finance.invoice.cancel",
    entity: "invoice",
    label: "إلغاء فاتورة",
    description: "إلغاء فاتورة وإنتاج أثر عكسي بدل الحذف.",
    level: "approve",
    fallbackPermissions: ["finance.invoices.write"],
    risk: "critical",
  },
  {
    id: "finance.payment.create",
    entity: "payment",
    label: "تسجيل دفعة",
    description: "تسجيل تحصيل أو دفعة وربطها بالفاتورة والخزينة.",
    level: "write",
    fallbackPermissions: ["finance.payments.write"],
    risk: "high",
  },
  {
    id: "finance.payment.edit_amount",
    entity: "payment",
    label: "تعديل مبلغ الدفعة",
    description: "تغيير قيمة دفعة بعد التسجيل.",
    level: "admin",
    fallbackPermissions: ["finance.payments.write"],
    risk: "critical",
  },
  {
    id: "finance.payment.edit_date",
    entity: "payment",
    label: "تعديل تاريخ الدفعة",
    description: "تغيير تاريخ التحصيل أو تاريخ البنك.",
    level: "admin",
    fallbackPermissions: ["finance.payments.write"],
    risk: "high",
  },
  {
    id: "finance.payment.edit_bank",
    entity: "payment",
    label: "تغيير حساب البنك",
    description: "نقل الدفعة بين الخزينة أو الحسابات البنكية.",
    level: "admin",
    fallbackPermissions: ["finance.treasury.write"],
    risk: "critical",
  },
  {
    id: "finance.payment.cancel",
    entity: "payment",
    label: "إلغاء دفعة",
    description: "إلغاء دفعة مكتملة بقيد عكسي وسجل موافقة.",
    level: "approve",
    fallbackPermissions: ["finance.payments.write"],
    risk: "critical",
  },
  {
    id: "finance.payment.cancel_own",
    entity: "payment",
    label: "تجاوز فصل المهام لإلغاء دفعة",
    description: "يسمح للمدير بإلغاء دفعة أنشأها نفس المستخدم عند تصحيح أخطاء مالية موثقة.",
    level: "admin",
    fallbackPermissions: [],
    risk: "critical",
  },
  {
    id: "finance.payment.reconcile",
    entity: "payment",
    label: "مطابقة دفعة",
    description: "ربط الدفعة بحركة بنكية مؤكدة.",
    level: "approve",
    fallbackPermissions: ["finance.treasury.write"],
    risk: "high",
  },
  {
    id: "finance.journal.create_draft",
    entity: "journal_entry",
    label: "إنشاء قيد مسودة",
    description: "إنشاء قيد محاسبي غير مرحل.",
    level: "write",
    fallbackPermissions: ["finance.ledger.write"],
    risk: "medium",
  },
  {
    id: "finance.journal.submit_for_review",
    entity: "journal_entry",
    label: "إرسال قيد للمراجعة",
    description: "تحويل القيد من مسودة إلى مراجعة.",
    level: "write",
    fallbackPermissions: ["finance.ledger.write"],
    risk: "medium",
  },
  {
    id: "finance.journal.review",
    entity: "journal_entry",
    label: "مراجعة قيد",
    description: "فحص القيد قبل الاعتماد.",
    level: "approve",
    fallbackPermissions: ["finance.journal.review"],
    risk: "high",
  },
  {
    id: "finance.journal.approve",
    entity: "journal_entry",
    label: "اعتماد قيد",
    description: "اعتماد قيد تمت مراجعته.",
    level: "approve",
    fallbackPermissions: ["finance.journal.approve"],
    risk: "critical",
  },
  {
    id: "finance.journal.post",
    entity: "journal_entry",
    label: "ترحيل قيد",
    description: "ترحيل القيد إلى دفتر الأستاذ.",
    level: "admin",
    fallbackPermissions: ["finance.journal.post"],
    risk: "critical",
  },
  {
    id: "finance.journal.reverse",
    entity: "journal_entry",
    label: "عكس قيد مرحل",
    description: "إنشاء قيد عكسي لقيد مرحل.",
    level: "admin",
    fallbackPermissions: ["finance.journal.reverse"],
    risk: "critical",
  },
  {
    id: "finance.journal.cancel",
    entity: "journal_entry",
    label: "إلغاء قيد",
    description: "إلغاء قيد غير مرحل.",
    level: "approve",
    fallbackPermissions: ["finance.journal.cancel"],
    risk: "high",
  },
  {
    id: "finance.journal.edit_date",
    entity: "journal_entry",
    label: "تعديل تاريخ القيد",
    description: "تغيير تاريخ قيد غير مرحل.",
    level: "admin",
    fallbackPermissions: ["finance.ledger.write"],
    risk: "critical",
  },
  {
    id: "finance.journal.edit_lines",
    entity: "journal_entry",
    label: "تعديل أطراف القيد",
    description: "تغيير الحسابات أو المدين أو الدائن قبل الترحيل.",
    level: "admin",
    fallbackPermissions: ["finance.ledger.write"],
    risk: "critical",
  },
  {
    id: "finance.period.close",
    entity: "period",
    label: "إقفال فترة",
    description: "إغلاق فترة مالية ومنع الحركات داخلها.",
    level: "admin",
    fallbackPermissions: ["finance.ledger.write"],
    risk: "critical",
  },
  {
    id: "finance.period.reopen",
    entity: "period",
    label: "فتح فترة مغلقة",
    description: "فتح فترة مغلقة مؤقتًا مع سبب وموافقة.",
    level: "admin",
    fallbackPermissions: ["finance.ledger.write"],
    risk: "critical",
  },
  {
    id: "finance.bank.import_statement",
    entity: "bank_reconciliation",
    label: "استيراد كشف بنكي",
    description: "رفع كشف بنك وإدخاله في التسوية.",
    level: "write",
    fallbackPermissions: ["finance.treasury.write"],
    risk: "high",
  },
  {
    id: "finance.bank.reconcile",
    entity: "bank_reconciliation",
    label: "اعتماد التسوية البنكية",
    description: "مطابقة واعتماد كشف البنك مع الدفعات والقيود.",
    level: "approve",
    fallbackPermissions: ["finance.treasury.write"],
    risk: "critical",
  },
  {
    id: "finance.budget.override",
    entity: "budget",
    label: "تجاوز الميزانية",
    description: "السماح بحركة تتجاوز الميزانية بعد موافقة.",
    level: "approve",
    fallbackPermissions: ["finance.budgets.write"],
    risk: "critical",
  },
  {
    id: "finance.budget.approve",
    entity: "budget",
    label: "اعتماد ميزانية",
    description: "اعتماد ميزانية أو تعديل سقف.",
    level: "approve",
    fallbackPermissions: ["finance.budgets.write"],
    risk: "high",
  },
  {
    id: "finance.audit.view",
    entity: "audit",
    label: "عرض سجل التدقيق",
    description: "عرض سجل التعديلات المالية.",
    level: "read",
    fallbackPermissions: ["finance.reports.view"],
    risk: "medium",
  },
  {
    id: "finance.audit.export",
    entity: "audit",
    label: "تصدير سجل التدقيق",
    description: "تصدير سجل التدقيق للمدققين.",
    level: "admin",
    fallbackPermissions: ["finance.reports.view"],
    risk: "high",
  },
];

export const FINANCE_FIELD_PERMISSION_MATRIX: FinanceFieldPermissionDefinition[] = [
  { entity: "invoice", field: "amount", label: "مبلغ الفاتورة", permission: "finance.invoice.edit_amount", risk: "critical" },
  { entity: "invoice", field: "total_amount", label: "إجمالي الفاتورة", permission: "finance.invoice.edit_amount", risk: "critical" },
  { entity: "invoice", field: "tax_amount", label: "ضريبة الفاتورة", permission: "finance.invoice.edit_amount", risk: "high" },
  { entity: "invoice", field: "invoice_date", label: "تاريخ الفاتورة", permission: "finance.invoice.edit_date", risk: "high" },
  { entity: "invoice", field: "due_date", label: "تاريخ الاستحقاق", permission: "finance.invoice.edit_date", risk: "high" },
  { entity: "invoice", field: "customer_id", label: "العميل", permission: "finance.invoice.edit_customer", risk: "critical" },
  { entity: "payment", field: "amount", label: "مبلغ الدفعة", permission: "finance.payment.edit_amount", risk: "critical" },
  { entity: "payment", field: "payment_date", label: "تاريخ الدفعة", permission: "finance.payment.edit_date", risk: "high" },
  { entity: "payment", field: "bank_account_id", label: "حساب البنك", permission: "finance.payment.edit_bank", risk: "critical" },
  { entity: "payment", field: "treasury_account_id", label: "حساب الخزينة", permission: "finance.payment.edit_bank", risk: "critical" },
  { entity: "journal_entry", field: "entry_date", label: "تاريخ القيد", permission: "finance.journal.edit_date", risk: "critical" },
  { entity: "journal_entry", field: "lines", label: "بنود القيد", permission: "finance.journal.edit_lines", risk: "critical" },
  { entity: "budget", field: "limit_amount", label: "حد الميزانية", permission: "finance.budget.approve", risk: "high" },
];

export const SEGREGATION_OF_DUTIES_RULES: SegregationOfDutiesRule[] = [
  {
    id: "journal_creator_cannot_approve",
    action: "finance.journal.approve",
    label: "منشئ القيد لا يعتمده",
    description: "لا يسمح لمن أنشأ القيد أن يكون هو نفس الشخص الذي يعتمده.",
  },
  {
    id: "journal_creator_cannot_post",
    action: "finance.journal.post",
    label: "منشئ القيد لا يرحله",
    description: "ترحيل القيود الحساسة يحتاج شخصًا مختلفًا عن المنشئ.",
  },
  {
    id: "payment_creator_cannot_cancel",
    action: "finance.payment.cancel",
    label: "مسجل الدفعة لا يلغيها",
    description: "إلغاء الدفعات المكتملة يحتاج مراجعة منفصلة عن منفذ التحصيل.",
    bypassPermission: "finance.payment.cancel_own",
  },
  {
    id: "invoice_creator_cannot_cancel",
    action: "finance.invoice.cancel",
    label: "منشئ الفاتورة لا يلغيها",
    description: "إلغاء الفاتورة يحتاج موافقة شخص مختلف عن المنشئ.",
  },
  {
    id: "period_reopen_requires_independent_requester",
    action: "finance.period.reopen",
    label: "فتح الفترة لا يعتمد ذاتيًا",
    description: "طالب فتح الفترة المغلقة لا يكون هو المعتمد النهائي.",
  },
  {
    id: "budget_requester_cannot_approve_override",
    action: "finance.budget.override",
    label: "طالب التجاوز لا يعتمده",
    description: "تجاوز الميزانية يحتاج اعتمادًا مستقلًا عن طالب الحركة.",
  },
  {
    id: "bank_importer_cannot_reconcile",
    action: "finance.bank.reconcile",
    label: "مستورد الكشف لا يعتمد التسوية",
    description: "من رفع كشف البنك لا يعتمد المطابقة النهائية له.",
  },
];

export const FINANCE_PERMISSION_CONFLICT_RULES: PermissionConflictRule[] = [
  {
    id: "payment_create_cancel_conflict",
    primaryAction: "finance.payment.create",
    conflictingAction: "finance.payment.cancel",
    severity: "critical",
    label: "Payment creator cannot also cancel payments without controlled approval",
  },
  {
    id: "invoice_create_cancel_conflict",
    primaryAction: "finance.invoice.create",
    conflictingAction: "finance.invoice.cancel",
    severity: "critical",
    label: "Invoice creator cannot also cancel invoices without controlled approval",
  },
  {
    id: "journal_create_approve_conflict",
    primaryAction: "finance.journal.create_draft",
    conflictingAction: "finance.journal.approve",
    severity: "critical",
    label: "Journal creator cannot also approve journal entries",
  },
  {
    id: "journal_create_post_conflict",
    primaryAction: "finance.journal.create_draft",
    conflictingAction: "finance.journal.post",
    severity: "critical",
    label: "Journal creator cannot also post journal entries",
  },
  {
    id: "bank_import_reconcile_conflict",
    primaryAction: "finance.bank.import_statement",
    conflictingAction: "finance.bank.reconcile",
    severity: "high",
    label: "Bank statement importer cannot also approve reconciliation",
  },
  {
    id: "budget_override_approve_conflict",
    primaryAction: "finance.budget.override",
    conflictingAction: "finance.budget.approve",
    severity: "high",
    label: "Budget override requester should be separated from budget approval",
  },
  {
    id: "period_close_reopen_conflict",
    primaryAction: "finance.period.close",
    conflictingAction: "finance.period.reopen",
    severity: "critical",
    label: "Period closer should be separated from controlled reopening approval",
  },
];

export const requiredCriticalFinanceActions: FinanceActionId[] = [
  "finance.invoice.edit_amount",
  "finance.invoice.cancel",
  "finance.payment.create",
  "finance.payment.edit_amount",
  "finance.payment.cancel",
  "finance.journal.approve",
  "finance.journal.post",
  "finance.journal.reverse",
  "finance.period.close",
  "finance.period.reopen",
  "finance.bank.reconcile",
  "finance.budget.override",
];

export function getFinancePermission(action: FinanceActionId) {
  return FINANCE_PERMISSION_MATRIX.find((permission) => permission.id === action);
}

export function getFinanceFieldPermission(entity: FinanceFieldPermissionDefinition["entity"], field: string) {
  return FINANCE_FIELD_PERMISSION_MATRIX.find((permission) => permission.entity === entity && permission.field === field);
}

export function permissionMatches(grantedPermissions: string[], action: FinanceActionId): boolean {
  const definition = getFinancePermission(action);
  if (!definition) return false;

  return [definition.id, ...definition.fallbackPermissions].some((permission) => grantedPermissions.includes(permission));
}

export function evaluateSegregationOfDuties(context: SegregationContext): SegregationDecision {
  const bypassPermissions = context.bypassPermissions || [];
  const rule = SEGREGATION_OF_DUTIES_RULES.find((item) => item.action === context.action);

  if (!rule) {
    return { allowed: true };
  }

  if (rule.bypassPermission && bypassPermissions.includes(rule.bypassPermission)) {
    return { allowed: true };
  }

  const actorId = context.actorId || "";
  if (!actorId) {
    return { allowed: false, ruleId: rule.id, reason: "تعذر تحديد المستخدم المنفذ للعملية." };
  }

  const blockedIds = [context.creatorId, context.requesterId, context.reviewerId, context.approverId]
    .filter(Boolean)
    .filter((id) => id === actorId);

  if (blockedIds.length > 0) {
    return {
      allowed: false,
      ruleId: rule.id,
      reason: rule.description,
    };
  }

  return { allowed: true };
}

export function findFinancePermissionConflicts(grantedPermissions: string[]): PermissionConflictFinding[] {
  return FINANCE_PERMISSION_CONFLICT_RULES
    .filter((rule) => (
      permissionMatches(grantedPermissions, rule.primaryAction)
      && permissionMatches(grantedPermissions, rule.conflictingAction)
    ))
    .map((rule) => ({
      ruleId: rule.id,
      actions: [rule.primaryAction, rule.conflictingAction],
      severity: rule.severity,
      label: rule.label,
    }));
}

export function getFinanceAccessCoverage() {
  const actionIds = new Set(FINANCE_PERMISSION_MATRIX.map((permission) => permission.id));
  const fieldActionIds = new Set(FINANCE_FIELD_PERMISSION_MATRIX.map((permission) => permission.permission));
  const ruleActionIds = new Set(SEGREGATION_OF_DUTIES_RULES.map((rule) => rule.action));
  const conflictActionIds = new Set(
    FINANCE_PERMISSION_CONFLICT_RULES.flatMap((rule) => [rule.primaryAction, rule.conflictingAction]),
  );

  return {
    actionCount: actionIds.size,
    fieldCount: FINANCE_FIELD_PERMISSION_MATRIX.length,
    segregationRuleCount: SEGREGATION_OF_DUTIES_RULES.length,
    permissionConflictRuleCount: FINANCE_PERMISSION_CONFLICT_RULES.length,
    missingCriticalActions: requiredCriticalFinanceActions.filter((action) => !actionIds.has(action)),
    fieldsWithoutKnownAction: [...fieldActionIds].filter((action) => !actionIds.has(action)),
    rulesWithoutKnownAction: [...ruleActionIds].filter((action) => !actionIds.has(action)),
    conflictRulesWithoutKnownAction: [...conflictActionIds].filter((action) => !actionIds.has(action)),
  };
}

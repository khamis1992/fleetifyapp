import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle, Car, CheckCircle2, Coins, FileClock, Info, Landmark, RefreshCw, Wallet,
} from 'lucide-react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useChartOfAccounts, useUpdateAccount, type ChartOfAccount } from '@/hooks/useChartOfAccounts';
import {
  useAccountMappingChecklist,
  useCreateBridgeDrafts,
  useFleetBridgeCandidates,
  usePostBridgeEntry,
  useSetAccountMapping,
} from '@/hooks/finance/useFleetBridge';
import { fleetBridgeErrorMessage } from '@/services/fleetBridge';
import { PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';
import {
  FLEET_BRIDGE_ROLES,
  ROLE_SUGGESTED_SUBTYPES,
  buildDepreciationBackfillDraft,
  buildFinancingObligationDraft,
  buildFinancingReclassDraft,
  buildVehicleCapitalizationDraft,
  computeDepreciationBackfillAmount,
  draftsAreBalanced,
  resolveBridgeAccounts,
  round2,
  vehicleLabel,
  type BridgeAccount,
  type BridgeEntryDraft,
  type FleetBridgeRole,
} from '@/components/finance/fleetBridge/buildFleetBridgeDrafts';
import './fleet-bridge.css';

interface PostableAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_name_ar?: string | null;
  account_type?: string | null;
  account_subtype?: string | null;
}

type AccountRow = ChartOfAccount & Partial<PostableAccount>;

type RoleKey = FleetBridgeRole | 'CASH';

const ROLE_LABELS: Record<RoleKey, string> = {
  VEHICLES_ASSET: 'أصول المركبات (مدين الرسملة)',
  VEHICLE_INSTALLMENT_PAYABLE: 'التزام أقساط المركبات (متداول)',
  VEHICLE_FINANCE_LONG_TERM: 'تمويل المركبات طويل الأجل',
  ACCUMULATED_DEPRECIATION: 'مجمع إهلاك المركبات',
  OPENING_EQUITY: 'حقوق بدء الدفتر (توازن الجسر)',
  CASH: 'النقد / البنك (الجزء المدفوع)',
};

const money = (value: number) =>
  new Intl.NumberFormat('ar-QA', { style: 'currency', currency: 'QAR', maximumFractionDigits: 2 }).format(value);

const defaultAsOf = () => {
  const today = new Date();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0)).toISOString().slice(0, 10);
};

export default function FleetBridge() {
  const [params] = useSearchParams();
  const { companyId } = useUnifiedCompanyAccess();

  const [asOfInput, setAsOfInput] = useState(params.get('asOf') || defaultAsOf());
  const [roleOverrides, setRoleOverrides] = useState<Partial<Record<RoleKey, string>>>({});
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string> | null>(null);
  const [selectedAgreements, setSelectedAgreements] = useState<Set<string> | null>(null);
  const [includeRegistrationFees, setIncludeRegistrationFees] = useState(false);
  const [withDepreciation, setWithDepreciation] = useState(true);
  const [bestuneOnly, setBestuneOnly] = useState(false);
  const [generated, setGenerated] = useState<Array<{ id: string; entry_number: string; description: string }>>([]);
  const [ackChecked, setAckChecked] = useState(false);
  const [ackNote, setAckNote] = useState('');

  const candidatesQuery = useFleetBridgeCandidates(asOfInput);
  const accountsQuery = useChartOfAccounts(false);
  const createDrafts = useCreateBridgeDrafts();
  const postEntry = usePostBridgeEntry();
  const updateAccount = useUpdateAccount();

  const candidates = candidatesQuery.data;

  const accounts = useMemo<PostableAccount[]>(() => {
    const rows = (accountsQuery.data as AccountRow[] | undefined) || [];
    return rows
      .filter(row => row.is_header === false && (row.account_level ?? 0) >= 3)
      .map(row => ({
        id: row.id,
        account_code: row.account_code,
        account_name: row.account_name,
        account_name_ar: row.account_name_ar ?? null,
        account_type: row.account_type ?? null,
        account_subtype: row.account_subtype ?? null,
      }));
  }, [accountsQuery.data]);

  const resolved = useMemo(
    () => (candidates ? resolveBridgeAccounts(candidates, roleOverrides) : {}),
    [candidates, roleOverrides],
  );

  const bridgedRoles = useMemo(() => {
    const found: Partial<Record<RoleKey, BridgeAccount | null>> = {};
    for (const role of FLEET_BRIDGE_ROLES) {
      found[role] = candidates?.accounts.roles[role] ?? null;
    }
    return found;
  }, [candidates]);

  const roleValue = (role: RoleKey): string => roleOverrides[role] || bridgedRoles[role]?.id || '';

  const eligibleVehicles = useMemo(
    () => (candidates?.vehicles ?? []).filter(vehicle => !vehicle.hasCapitalizationEntry),
    [candidates],
  );
  const vehicleSelection = useMemo(() => {
    if (selectedVehicles) return selectedVehicles;
    return new Set(eligibleVehicles.filter(v => !v.hasAnyVehicleReference).map(v => v.id));
  }, [selectedVehicles, eligibleVehicles]);

  const visibleAgreements = useMemo(() => {
    const list = candidates?.agreements ?? [];
    if (!bestuneOnly) return list;
    return list.filter(agreement =>
      agreement.vehicles.some(vehicle => /bestune/i.test(vehicle.make || '')));
  }, [candidates, bestuneOnly]);

  const agreementSelection = useMemo(() => {
    if (selectedAgreements) return selectedAgreements;
    return new Set((candidates?.agreements ?? []).filter(a => !a.hasObligationEntry).map(a => a.id));
  }, [selectedAgreements, candidates]);

  const missingRoles = FLEET_BRIDGE_ROLES.filter(role => !resolved[role]);
  const totalCapitalizable = round2(eligibleVehicles.reduce((sum, v) => sum + v.purchaseCost, 0));
  const totalDepreciation = round2(
    eligibleVehicles.reduce((sum, v) => sum + computeDepreciationBackfillAmount(v), 0));
  const totalFinanced = round2(
    (candidates?.agreements ?? []).filter(a => !a.hasObligationEntry)
      .reduce((sum, a) => sum + Math.max(a.financedPrincipal, a.totalAmount - a.downPayment, 0), 0));
  const totalLongTerm = round2(
    (candidates?.agreements ?? []).filter(a => !a.hasReclassEntry)
      .reduce((sum, a) => sum + Math.min(a.longTermPortion, a.principalRemaining), 0));

  const applySuggestedSubtypes = async () => {
    if (!candidates) return;
    let applied = 0;
    try {
      for (const role of FLEET_BRIDGE_ROLES) {
        const account = resolved[role]
          ? accounts.find(row => row.id === resolved[role])
          : undefined;
        if (!account) continue;
        if ((account.account_subtype || '') === ROLE_SUGGESTED_SUBTYPES[role]) continue;
        await updateAccount.mutateAsync({
          id: account.id,
          updates: { account_subtype: ROLE_SUGGESTED_SUBTYPES[role] },
        });
        applied += 1;
      }
      toast.success(
        applied > 0
          ? `طُبّق التصنيف المقترح على ${applied} حساب — أعد فتح الميزانية لتحديث الفحوص.`
          : 'حسابات الجسر مصنفة مسبقاً وفق الاقتراح.',
      );
      void candidatesQuery.refetch();
    } catch (error) {
      toast.error(fleetBridgeErrorMessage(error));
    }
  };

  const generateVehicleDrafts = async () => {
    if (!candidates || missingRoles.length > 0) return;
    const drafts: BridgeEntryDraft[] = [];
    for (const vehicle of eligibleVehicles) {
      if (!vehicleSelection.has(vehicle.id)) continue;
      const capitalization = buildVehicleCapitalizationDraft(vehicle, resolved, { includeRegistrationFees });
      if (capitalization) drafts.push(capitalization);
      if (withDepreciation) {
        const depreciation = buildDepreciationBackfillDraft(vehicle, resolved, asOfInput);
        if (depreciation) drafts.push(depreciation);
      }
    }
    if (drafts.length === 0) {
      toast.info('لا توجد مركبات محددة جاهزة للترحيل.');
      return;
    }
    if (!draftsAreBalanced(drafts)) {
      toast.error('إحدى المسودات غير متوازنة — راجع بطاقة الحسابات ثم أعد المحاولة.');
      return;
    }
    try {
      const created = await createDrafts.mutateAsync(drafts);
      setGenerated(current => [...created, ...current]);
      toast.success(`وُلّدت ${created.length} مسودة قيد (رسملة${withDepreciation ? ' + إهلاك' : ''}) — راجعها ثم رحّلها.`);
    } catch {
      // useCreateBridgeDrafts surfaces its own error toast.
    }
  };

  const generateFinancingDrafts = async (mode: 'obligation' | 'reclass') => {
    if (!candidates || missingRoles.length > 0) return;
    const drafts: BridgeEntryDraft[] = [];
    for (const agreement of visibleAgreements) {
      if (!agreementSelection.has(agreement.id)) continue;
      if (mode === 'obligation') {
        if (agreement.hasObligationEntry) continue;
        const obligation = buildFinancingObligationDraft(agreement, resolved, asOfInput);
        if (obligation) drafts.push(obligation);
      } else {
        if (agreement.hasReclassEntry) continue;
        const reclass = buildFinancingReclassDraft(agreement, resolved, asOfInput);
        if (reclass) drafts.push(reclass);
      }
    }
    if (drafts.length === 0) {
      toast.info(mode === 'obligation' ? 'لا توجد اتفاقيات محددة بانتظار قيد الالتزام.' : 'لا توجد شريحة طويلة الأجل بانتظار إعادة تصنيف.');
      return;
    }
    if (!draftsAreBalanced(drafts)) {
      toast.error('إحدى المسودات غير متوازنة — راجع بطاقة الحسابات ثم أعد المحاولة.');
      return;
    }
    try {
      const created = await createDrafts.mutateAsync(drafts);
      setGenerated(current => [...created, ...current]);
      toast.success(
        mode === 'obligation'
          ? `وُلّدت ${created.length} مسودة التزام تمويل — الأصل الكلي، لتستقر على المتبقي بعد السدادات المسجلة.`
          : `وُلّدت ${created.length} مسودة إعادة تصنيف قصير/طويل الأجل بتاريخ التقرير.`,
      );
    } catch {
      // surfaced by the hook
    }
  };

  const postGenerated = async () => {
    if (!ackChecked || ackNote.trim().length < 20 || generated.length === 0) return;
    let posted = 0;
    let failed = 0;
    for (const entry of generated) {
      try {
        await postEntry.mutateAsync({ entryId: entry.id, selfReviewAcknowledged: true });
        posted += 1;
      } catch {
        failed += 1;
      }
    }
    if (posted > 0) {
      toast.success(`رُحّلت ${posted} قيداً إلى الدفتر.`);
      setGenerated(current => current.slice(posted));
      void candidatesQuery.refetch();
    }
    if (failed > 0) {
      toast.error(`${failed} قيداً لم يُرحّل — راجع سجل القيود لمعرفة السبب.`);
    }
  };

  const toggleVehicle = (id: string) => {
    const next = new Set(vehicleSelection);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedVehicles(next);
  };

  const toggleAgreement = (id: string) => {
    const next = new Set(agreementSelection);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedAgreements(next);
  };

  const roleSelect = (role: RoleKey) => {
    const suggestions = role === 'CASH' ? [] : candidates?.accounts.suggestions[role] ?? [];
    const suggestionIds = new Set(suggestions.map(account => account.id));
    const ordered: PostableAccount[] = [
      ...suggestions.map(account => ({
        id: account.id,
        account_code: account.code,
        account_name: account.name,
        account_name_ar: account.nameAr,
        account_type: null,
        account_subtype: account.subtype,
      })),
      ...accounts.filter(account => !suggestionIds.has(account.id)),
    ];
    const chosen = roleValue(role);
    const isMissing = !chosen;
    return (
      <div key={role} className={`fb-role-field${isMissing ? ' is-missing' : ''}`}>
        <label htmlFor={`fb-role-${role}`}>{ROLE_LABELS[role]}</label>
        <select
          id={`fb-role-${role}`}
          className="ob-account-select"
          value={chosen}
          onChange={event => setRoleOverrides(current => ({ ...current, [role]: event.target.value }))}
        >
          <option value="">— اختر الحساب —</option>
          {ordered.map(account => (
            <option key={account.id} value={account.id}>
              {account.account_code} — {account.account_name_ar || account.account_name}
              {suggestionIds.has(account.id) ? ' ★' : ''}
            </option>
          ))}
        </select>
        <span className="fb-role-hint">
          {role === 'CASH'
            ? 'يُستخدم للجزء النقدي من سعر الشراء إن وُجد.'
            : `التصنيف المقترح: ${ROLE_SUGGESTED_SUBTYPES[role]}`}
        </span>
      </div>
    );
  };

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المالية <span>/</span> الترحيل إلى الدفتر
            </div>
            <h1>ترحيل الأسطول والتمويل إلى الدفتر</h1>
            <p>
              يُنشئ قيوداً فعلية في دفتر الأستاذ من بيانات المركبات وعقود التمويل — رسملة المركبات، التزام التمويل، إعادة التصنيف قصير/طويل الأجل، والإهلاك التراكمي حتى تاريخ التقرير. الميزانية العمومية تبقى تقرأ الدفتر وحده ولا تقرأ جداول الأسطول مباشرة.
            </p>
          </div>
          <div className="dw-header-tools">
            <Link to="/finance/journal-entries?status=draft" className="dw-button">القيود المسودة</Link>
            <Link to="/finance/reports/balance-sheet" className="dw-button">الميزانية العمومية</Link>
          </div>
        </header>

        <PagePanel
          number="01"
          title="نطاق الترحيل وتاريخ التقرير"
          subtitle="القيود تُؤرَّخ بتواريخها الطبيعية: الرسملة بتاريخ الشراء، الالتزام بتاريخ الاتفاقية، والإهلاك وإعادة التصنيف بتاريخ التقرير"
          className="wk-panel-full"
        >
          <div className="fb-toolbar">
            <div className="fb-date-field">
              <label htmlFor="fb-asof">تاريخ التقرير</label>
              <input
                id="fb-asof"
                type="date"
                value={asOfInput}
                onChange={event => {
                  setAsOfInput(event.target.value);
                  setSelectedVehicles(null);
                  setSelectedAgreements(null);
                  setGenerated([]);
                }}
              />
            </div>
            <button type="button" className="dw-button" onClick={() => void candidatesQuery.refetch()} disabled={candidatesQuery.isFetching}>
              <RefreshCw size={15} />
              {candidatesQuery.isFetching ? 'جارٍ التحديث…' : 'تحديث المرشحين'}
            </button>
            <p className="fb-note-inline">
              {candidates?.earliestEntryDate
                ? <>أقدم قيد في النظام: <bdi>{candidates.earliestEntryDate}</bdi></>
                : 'لا توجد قيود مسجلة بعد.'}
            </p>
          </div>
          {candidates && (
            <div className="fb-summary">
              <span className="wk-badge is-info"><Car size={12} /> {eligibleVehicles.length} مركبة مؤهلة</span>
              <span className="wk-badge is-warn"><AlertTriangle size={12} /> {candidates.vehiclesMissingData} نشطة بلا تكلفة/تاريخ</span>
              <span className="wk-badge is-info"><Coins size={12} /> {candidates.agreements.length} اتفاقية تمويل</span>
              <span className="wk-badge is-neutral">قابل للرسملة: <bdi>{money(totalCapitalizable)}</bdi></span>
              <span className="wk-badge is-neutral">إهلاك افتتاحي مقدر: <bdi>{money(totalDepreciation)}</bdi></span>
              <span className="wk-badge is-neutral">أصل تمويلي بانتظار الإثبات: <bdi>{money(totalFinanced)}</bdi></span>
            </div>
          )}
          {candidatesQuery.isError && (
            <p role="alert" className="fb-alert is-error">{fleetBridgeErrorMessage(candidatesQuery.error)}</p>
          )}
        </PagePanel>

        <PagePanel
          number="02"
          title="حسابات الجسر"
          subtitle="اربط كل دور بحساب من دليل الشركة (لا ترميز ثابت — النجمة تعني اقتراحاً بالاسم المطابق)، ثم طبّق التصنيفات المقترحة"
          className="wk-panel-full"
          action={
            <button type="button" className="dw-button" onClick={() => void applySuggestedSubtypes()} disabled={missingRoles.length > 0 || updateAccount.isPending}>
              <CheckCircle2 size={15} />
              تطبيق التصنيفات المقترحة
            </button>
          }
        >
          <div className="fb-roles-grid">
            {(['VEHICLES_ASSET', 'VEHICLE_INSTALLMENT_PAYABLE', 'VEHICLE_FINANCE_LONG_TERM', 'ACCUMULATED_DEPRECIATION', 'OPENING_EQUITY', 'CASH'] as RoleKey[]).map(roleSelect)}
          </div>
          {missingRoles.length > 0 && (
            <p role="alert" className="fb-alert is-warn">
              <AlertTriangle size={13} style={{ marginInlineEnd: 6, verticalAlign: '-2px' }} />
              ينقص ربط {missingRoles.length} من أدوار الحسابات قبل توليد أي قيود.
            </p>
          )}
          <p className="fb-note">
            <Info size={13} />
            «تطبيق التصنيفات المقترحة» يضبط account_subtype للحسابات المربوطة (متداول/غير متداول) — وهو ما يزيل حاجب الاعتماد من فحص التصنيف الناقص في الميزانية.
          </p>
        </PagePanel>

        <PagePanel
          number="03"
          title="رسملة المركبات"
          subtitle="لكل مركبة لها تكلفة شراء وتاريخ: مدين أصول المركبات، دائن النقد للجزء المدفوع، والفارق عبر حقوق بدء الدفتر"
          className="wk-panel-full"
        >
          <div className="fb-toolbar">
            <label className="fb-check-row">
              <input type="checkbox" checked={includeRegistrationFees} onChange={e => setIncludeRegistrationFees(e.target.checked)} />
              إدراج رسوم التسجيل في مدين الرسملة
            </label>
            <label className="fb-check-row">
              <input type="checkbox" checked={withDepreciation} onChange={e => setWithDepreciation(e.target.checked)} />
              توليد قيد الإهلاك التراكمي الافتتاحي حتى تاريخ التقرير
            </label>
            <button
              type="button"
              className="dw-button dw-button-primary"
              disabled={missingRoles.length > 0 || createDrafts.isPending || eligibleVehicles.length === 0}
              onClick={() => void generateVehicleDrafts()}
            >
              <Landmark size={16} />
              {createDrafts.isPending ? 'جارٍ التوليد…' : `توليد مسودات الرسملة (${vehicleSelection.size})`}
            </button>
          </div>
          <div className="wk-table-wrap fb-table-wrap">
            <table className="fb-table">
              <caption className="sr-only">مركبات ترحيل الرسملة</caption>
              <thead>
                <tr>
                  <th scope="col">تحديد</th>
                  <th scope="col">المركبة</th>
                  <th scope="col">تاريخ الشراء</th>
                  <th scope="col">التكلفة</th>
                  <th scope="col">الجزء النقدي</th>
                  <th scope="col">الإهلاك الافتتاحي</th>
                  <th scope="col">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {(candidates?.vehicles ?? []).map(vehicle => {
                  const bridged = vehicle.hasCapitalizationEntry;
                  const checked = vehicleSelection.has(vehicle.id);
                  const cash = round2(Math.max(
                    vehicle.depositAmount,
                    vehicle.linkedDownPayment && vehicle.linkedDownPayment > 0
                      ? Math.min(vehicle.linkedDownPayment, vehicle.purchaseCost) : 0, 0));
                  return (
                    <tr key={vehicle.id} className={bridged ? 'is-done' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          disabled={bridged}
                          checked={bridged ? false : checked}
                          onChange={() => toggleVehicle(vehicle.id)}
                          aria-label={`تحديد ${vehicleLabel(vehicle)}`}
                        />
                      </td>
                      <td>
                        <strong>{vehicleLabel(vehicle)}</strong>
                        {vehicle.linkedAgreementNumber && (
                          <div className="fb-sub">مرتبطة بالاتفاقية {vehicle.linkedAgreementNumber}</div>
                        )}
                        {!vehicle.isActive && <div className="fb-sub">غير نشطة</div>}
                      </td>
                      <td><bdi>{vehicle.purchaseDate}</bdi></td>
                      <td className="fb-num"><bdi>{money(vehicle.purchaseCost)}</bdi></td>
                      <td className="fb-num"><bdi>{money(cash)}</bdi></td>
                      <td className="fb-num"><bdi>{money(computeDepreciationBackfillAmount(vehicle))}</bdi></td>
                      <td>
                        {bridged
                          ? <span className="wk-badge is-ok"><CheckCircle2 size={11} /> رُسملت</span>
                          : vehicle.hasAnyVehicleReference
                            ? <span className="wk-badge is-warn"><AlertTriangle size={11} /> له قيود مرتبطة</span>
                            : <span className="wk-badge is-info">جاهزة</span>}
                        {vehicle.hasDepreciationEntry && !bridged && (
                          <span className="wk-badge is-neutral">إهلاك مرحّل</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {(candidates?.vehicles ?? []).length === 0 && (
                  <tr><td colSpan={7} className="fb-sub" style={{ padding: '12px 24px' }}>
                    لا توجد مركبات بتكلفة شراء وتاريخ — أكمل بياناتها من صفحة الأسطول لتظهر هنا.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="fb-note">
            <Info size={13} />
            قيد الرسملة يُؤرَّخ بتاريخ الشراء؛ إن كانت الفترة المحاسبية لتاريخ ما مقفلة فسيرفض النظام الإنشاء — اختر وقتها معالجة يدوية بمستخدم خدمة أو عدّل بيانات المصدر.
          </p>
        </PagePanel>

        <PagePanel
          number="04"
          title="التزامات التمويل (عقود الأقساط)"
          subtitle="قيد الالتزام بأصل التمويل الكلي — لتستقر الذممة على المتبقي بعد السدادات المسجلة — ثم إعادة تصنيف ما يستحق بعد ١٢ شهراً إلى طويل الأجل"
          className="wk-panel-full"
        >
          <div className="fb-toolbar">
            <label className="fb-check-row">
              <input type="checkbox" checked={bestuneOnly} onChange={e => setBestuneOnly(e.target.checked)} />
              عرض اتفاقيات Bestune فقط
            </label>
            <button
              type="button"
              className="dw-button dw-button-primary"
              disabled={missingRoles.length > 0 || createDrafts.isPending}
              onClick={() => void generateFinancingDrafts('obligation')}
            >
              <Wallet size={15} />
              توليد قيود الالتزام
            </button>
            <button
              type="button"
              className="dw-button"
              disabled={missingRoles.length > 0 || createDrafts.isPending}
              onClick={() => void generateFinancingDrafts('reclass')}
            >
              <Coins size={15} />
              توليد إعادة التصنيف قصير/طويل
            </button>
            <span className="fb-note-inline">الشريحة طويلة الأجل الإجمالية: <bdi>{money(totalLongTerm)}</bdi></span>
          </div>
          <div className="wk-table-wrap fb-table-wrap">
            <table className="fb-table">
              <caption className="sr-only">اتفاقيات تمويل المركبات</caption>
              <thead>
                <tr>
                  <th scope="col">تحديد</th>
                  <th scope="col">الاتفاقية</th>
                  <th scope="col">البداية</th>
                  <th scope="col">أصل التمويل</th>
                  <th scope="col">المسدد</th>
                  <th scope="col">المتبقي</th>
                  <th scope="col">طويل الأجل</th>
                  <th scope="col">المركبات</th>
                  <th scope="col">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {visibleAgreements.map(agreement => {
                  const obligationDone = agreement.hasObligationEntry;
                  const checked = agreementSelection.has(agreement.id);
                  const isBestune = agreement.vehicles.some(v => /bestune/i.test(v.make || ''));
                  return (
                    <tr key={agreement.id} className={obligationDone ? 'is-done' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAgreement(agreement.id)}
                          aria-label={`تحديد اتفاقية ${agreement.agreementNumber || ''}`}
                        />
                      </td>
                      <td>
                        <strong>{agreement.agreementNumber || '—'}</strong>
                        <div className="fb-sub">{agreement.vendorName}</div>
                      </td>
                      <td><bdi>{agreement.startDate || '—'}</bdi></td>
                      <td className="fb-num"><bdi>{money(Math.max(agreement.financedPrincipal, agreement.totalAmount - agreement.downPayment, 0))}</bdi></td>
                      <td className="fb-num"><bdi>{money(agreement.principalPaid)}</bdi></td>
                      <td className="fb-num"><bdi>{money(agreement.principalRemaining)}</bdi></td>
                      <td className="fb-num"><bdi>{money(Math.min(agreement.longTermPortion, agreement.principalRemaining))}</bdi></td>
                      <td className="fb-sub">
                        {agreement.vehicles.map(v => `${v.make || ''} ${v.plateNumber || ''}`.trim()).filter(Boolean).join('، ') || '—'}
                      </td>
                      <td>
                        {obligationDone
                          ? <span className="wk-badge is-ok"><CheckCircle2 size={11} /> مُثبتة</span>
                          : <span className="wk-badge is-info">بانتظار الإثبات</span>}
                        {agreement.hasReclassEntry
                          ? <span className="wk-badge is-neutral">مُعاد تصنيفها</span>
                          : agreement.longTermPortion > 0.005
                            ? <span className="wk-badge is-warn"><AlertTriangle size={11} /> تحتاج إعادة تصنيف</span>
                            : null}
                        {isBestune && <span className="wk-badge is-neutral">Bestune</span>}
                      </td>
                    </tr>
                  );
                })}
                {visibleAgreements.length === 0 && (
                  <tr><td colSpan={9} className="fb-sub" style={{ padding: '12px 24px' }}>
                    لا توجد اتفاقيات تمويل بقسط متبقٍّ — أو فعّل فلتر Bestune.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="fb-note">
            <Info size={13} />
            السدادات المسجلة سابقاً تخفض حساب الأقساط تلقائياً؛ إثبات الأصل الكلي يُطفئ الرصيد المدين التاريخي ويستقر على المتبقي. أعد توليد إعادة التصنيف عند كل تاريخ تقرير جديد.
          </p>
        </PagePanel>

        <PagePanel
          number="05"
          title="المسودات والترحيل"
          subtitle="كل ما يولّده الجسر يبدأ مسودة قابلة للمراجعة — والترحيل الافتراضي من سجل القيود"
          className="wk-panel-full"
        >
          {generated.length > 0 ? (
            <>
              <ul className="fb-generated-list">
                {generated.map(entry => (
                  <li key={entry.id}>
                    <bdi>{entry.entry_number}</bdi> — {entry.description}
                  </li>
                ))}
              </ul>
              <div className="fb-ack-box">
                <label className="fb-check-row">
                  <input
                    type="checkbox"
                    checked={ackChecked}
                    onChange={e => setAckChecked(e.target.checked)}
                  />
                  أقر بأنني راجعت هذه المسودات بنفسي وأتحمل توثيق الترحيل الذاتي (استثناء موثق من قاعدة فصل المهام — يُسجَّل في سجل القيد).
                </label>
                <textarea
                  value={ackNote}
                  onChange={e => setAckNote(e.target.value)}
                  placeholder="سبب الترحيل الذاتي (٢٠ حرفاً على الأقل) — يُحفظ مع القيد…"
                  aria-label="ملاحظة الإقرار الذاتي"
                />
                <button
                  type="button"
                  className="dw-button dw-button-primary"
                  disabled={!ackChecked || ackNote.trim().length < 20 || postEntry.isPending}
                  onClick={() => void postGenerated()}
                >
                  <Landmark size={16} />
                  {postEntry.isPending ? 'جارٍ الترحيل…' : `ترحيل ${generated.length} مسودة بإقرار ذاتي`}
                </button>
                <span className="fb-note-inline">أو اتركها مسودة ورحّلها من <Link to="/finance/journal-entries?status=draft" className="fb-inline-link">سجل القيود</Link> بمستخدم آخر.</span>
              </div>
            </>
          ) : (
            <p className="fb-note">
              <FileClock size={13} />
              لم تُولَّد مسودات في هذه الجلسة بعد. كل ما تولده يظهر هنا مع رقم قيده، ويمكن ترحيله بإقرار ذاتي موثق أو تركه لسجل القيود. القيود المولّدة سابقاً تجدها في{' '}
              <Link to="/finance/journal-entries?status=draft" className="fb-inline-link">القيود المسودة</Link>.
            </p>
          )}
        </PagePanel>

        <PagePanel
          number="06"
          title="قائمة مراجعة خرائط الحسابات"
          subtitle="كل دور محاسبي غير مربوط بحساب من دليل الشركة — اربطه قبل تفعيل موديول الأسطول أو التمويل"
          className="wk-panel-full"
        >
          <MappingChecklist accounts={accounts} />
        </PagePanel>
      </div>
    </div>
  );
}

function MappingChecklist({ accounts }: { accounts: PostableAccount[] }) {
  const checklistQuery = useAccountMappingChecklist();
  const setMapping = useSetAccountMapping();
  const [picks, setPicks] = useState<Record<string, string>>({});
  const unmapped = (checklistQuery.data || []).filter(type => !type.mapped);
  return (
    <>
      <div className="fb-summary">
        <span className="wk-badge is-info">إجمالي الأدوار: {(checklistQuery.data || []).length}</span>
        <span className={unmapped.length ? 'wk-badge is-warn' : 'wk-badge is-ok'}>
          <AlertTriangle size={12} /> غير مربوط: {unmapped.length}
        </span>
      </div>
      {checklistQuery.isLoading ? (
        <p className="fb-note">جارٍ قراءة الخرائط…</p>
      ) : unmapped.length === 0 ? (
        <p className="fb-note"><CheckCircle2 size={13} /> كل الأدوار المحاسبية مربوطة — جاهز لتفعيل أي موديول.</p>
      ) : (
        <div className="fb-roles-grid">
          {unmapped.map(type => {
            const chosen = picks[type.type_code] || '';
            return (
              <div key={type.type_code} className="fb-role-field is-missing">
                <label htmlFor={`map-${type.type_code}`}>
                  {type.type_name_ar || type.type_name} <span className="fb-role-hint">({type.type_code})</span>
                </label>
                <select
                  id={`map-${type.type_code}`}
                  className="ob-account-select"
                  value={chosen}
                  onChange={event =>
                    setPicks(current => ({ ...current, [type.type_code]: event.target.value }))
                  }
                >
                  <option value="">— اختر الحساب —</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.account_code} — {account.account_name_ar || account.account_name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="dw-button"
                  style={{ minHeight: 30, padding: '0 10px', fontSize: 11 }}
                  disabled={!chosen || setMapping.isPending}
                  onClick={() => setMapping.mutate({ typeCode: type.type_code, chartAccountId: chosen })}
                >
                  <CheckCircle2 size={13} />
                  ربط الدور
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p className="fb-note">
        <Info size={13} />
        الأدوار الحرجة للأسطول والتمويل: VEHICLES_ASSET، VEHICLE_INSTALLMENT_PAYABLE، VEHICLE_FINANCE_LONG_TERM، ACCUMULATED_DEPRECIATION، OPENING_EQUITY، VEHICLE_INSTALLMENT_INTEREST_EXPENSE، DEPRECIATION_EXPENSE.
      </p>
    </>
  );
}

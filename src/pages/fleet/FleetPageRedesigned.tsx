import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Car, Plus, Search, SlidersHorizontal, Copy, Edit3, Trash2, ChevronLeft, ChevronRight, Wrench, Upload, Download, Layers3, RotateCcw, FileText, MoreHorizontal, X, LayoutGrid, List, ArrowUpLeft, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useVehiclesPaginated, type VehicleFilters } from '@/hooks/useVehiclesPaginated';
import { useFleetStatus } from '@/hooks/useFleetStatus';
import { useDeleteVehicle, type Vehicle } from '@/hooks/useVehicles';
import { useAuth } from '@/contexts/AuthContext';
import { useSyncVehicleStatus } from '@/hooks/useSyncVehicleStatus';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { VehicleForm } from '@/components/fleet/VehicleForm';
import { VehicleGroupManagement } from '@/components/fleet/VehicleGroupManagement';
import { VehicleCSVUpload } from '@/components/fleet/VehicleCSVUpload';
import { VehicleStatusChangeDialog } from '@/components/fleet/VehicleStatusChangeDialog';
import VehicleDocumentDistributionDialog from '@/components/fleet/VehicleDocumentDistributionDialog';
import { supabase } from '@/integrations/supabase/client';
import { exportVehiclesToHTML, exportVehiclesToExcel } from './fleetRegisterExports';
import './fleet-register.css';

const statuses: Record<string, string> = {
  available: 'متاحة', rented: 'مؤجرة', maintenance: 'صيانة', out_of_service: 'خارج الخدمة',
  reserved: 'محجوزة', reserved_employee: 'محجوزة لموظف', accident: 'حادث', stolen: 'مسروقة',
  street_52: 'شارع 52', police_station: 'مركز الشرطة', municipality: 'البلدية',
};
const number = (value?: number) => value == null ? '—' : new Intl.NumberFormat('en-US').format(value);
function DocumentDate({ label, value }: { label: string; value?: string }) {
  const date = value ? new Date(value.slice(0, 10) + 'T00:00:00') : null;
  const valid = date && Number.isFinite(date.getTime());
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = valid ? Math.ceil((date.getTime() - today.getTime()) / 86400000) : null;
  return <div className="fr-document" data-warning={days != null && days <= 30}>
    <span>{label}</span><strong>{days == null ? 'غير مسجل' : days < 0 ? 'منتهية' : days === 0 ? 'تنتهي اليوم' : days <= 30 ? `خلال ${days} يوم` : date?.toLocaleDateString('en-GB')}</strong>
  </div>;
}
function VehiclePhoto({ vehicle }: { vehicle: Vehicle }) {
  const [failed, setFailed] = useState(false);
  const photo = vehicle.images?.[0];
  return <div className="fr-photo">{typeof photo === 'string' && photo && !failed
    ? <img src={photo} alt={`${vehicle.make} ${vehicle.model}`} loading="lazy" onError={() => setFailed(true)} />
    : <Car aria-hidden="true" />}<span>{vehicle.year || '—'}</span></div>;
}

export default function FleetPageRedesigned() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<VehicleFilters['status']>('all');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);
  const [groups, setGroups] = useState(false);
  const [csv, setCsv] = useState(false);
  const [documents, setDocuments] = useState(false);
  const [changingStatus, setChangingStatus] = useState<Vehicle | null>(null);
  const [exporting, setExporting] = useState(false);
  const fleet = useFleetStatus();
  const vehicles = useVehiclesPaginated(page, pageSize, { status, search: search || undefined, excludeMaintenanceStatus: false });
  const deleteVehicle = useDeleteVehicle();
  const { isSyncing, handleSync } = useSyncVehicleStatus();
  const stats = fleet.data;
  const count = vehicles.data?.count || 0;
  const totalPages = Math.max(1, vehicles.data?.totalPages || 1);
  const filtered = status !== 'all' || !!search;
  const chooseStatus = (value: VehicleFilters['status']) => { setStatus(value); setPage(1); };
  const reset = () => { setSearch(''); chooseStatus('all'); };
  const refresh = () => { void vehicles.refetch(); void fleet.refetch(); };
  const refreshAll = () => {
    void queryClient.invalidateQueries({ queryKey: ['vehicles-paginated'] });
    void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    void queryClient.invalidateQueries({ queryKey: ['fleet-status'] });
  };
  const closeForm = (open: boolean) => { setShowForm(open); if (!open) { setEditing(null); refreshAll(); } };
  const add = () => { setEditing(null); setShowForm(true); };
  const exportData = async (format: 'excel' | 'html') => {
    if (!user?.profile?.company_id) { toast.error('تعذر تحديد الشركة'); return; }
    setExporting(true);
    try {
      await (format === 'excel' ? exportVehiclesToExcel : exportVehiclesToHTML)(
        vehicles.data?.data || [], user.profile.company_id,
        { status, search: search || undefined }, supabase);
    } finally { setExporting(false); }
  };
  const remove = async () => {
    if (!deleting) return;
    try { await deleteVehicle.mutateAsync(deleting.id); setDeleting(null); refreshAll(); }
    catch { toast.error('تعذر حذف المركبة'); }
  };
  const summary = [
    { label: 'كامل الأسطول', value: stats?.total, status: 'all', note: 'المركبات المسجلة', icon: Car },
    { label: 'جاهزة للتأجير', value: stats?.available, status: 'available', note: 'متاحة للتشغيل', icon: ArrowUpLeft },
    { label: 'على الطريق', value: stats?.rented, status: 'rented', note: 'مركبات مؤجرة', icon: FileText },
    { label: 'في الصيانة', value: stats?.maintenance, status: 'maintenance', note: 'متابعة أعمال الصيانة', icon: Wrench },
  ];
  const ready = stats?.total ? Math.round(stats.available / stats.total * 100) : 0;

  const actions = (vehicle: Vehicle) => <DropdownMenu dir="rtl">
    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`إجراءات المركبة ${vehicle.plate_number}`}><MoreHorizontal size={18} /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onSelect={() => navigate(`/contracts?vehicle=${vehicle.id}`)}><FileText size={16} />عقد جديد</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => navigate(`/fleet/maintenance?vehicle=${vehicle.id}`)}><Wrench size={16} />جدولة صيانة</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => { setEditing(vehicle); setShowForm(true); }}><Edit3 size={16} />تعديل البيانات</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => {
        const copy: Partial<Vehicle> = { ...vehicle }; delete copy.id;
        setEditing({ ...copy, plate_number: `${vehicle.plate_number} (نسخة)` } as Vehicle); setShowForm(true);
      }}><Copy size={16} />نسخ المركبة</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => setDeleting(vehicle)} className="text-red-600"><Trash2 size={16} />حذف المركبة</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;

  return <div className="fleet-register" dir="rtl" lang="ar">
    <div className="fr-workspace">
      <header className="fr-header">
        <div><p className="fr-eyebrow"><span />العراف لتأجير السيارات <span className="fr-slash">/</span> إدارة الأسطول</p>
          <h1>الأسطول، تحت نظرك<span>.</span></h1>
          <p className="fr-subtitle">من جاهزية المركبة إلى موعد تجديدها. كل ما تحتاجه لتشغيل يومك.</p>
        </div>
        <div className="fr-header-actions">
          <Button className="fr-primary" onClick={add}><Plus size={17} />إضافة مركبة</Button>
          <DropdownMenu dir="rtl"><DropdownMenuTrigger asChild><Button variant="outline" disabled={exporting}><Download size={16} />{exporting ? 'جارٍ التصدير…' : 'تصدير السجل'}</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => void exportData('excel')}>ملف Excel</DropdownMenuItem><DropdownMenuItem onSelect={() => void exportData('html')}>تقرير للطباعة</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu dir="rtl"><DropdownMenuTrigger asChild><Button variant="outline" size="icon" aria-label="أدوات الأسطول"><MoreHorizontal size={19} /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setGroups(true)}><Layers3 size={16} />مجموعات المركبات</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setCsv(true)}><Upload size={16} />استيراد CSV</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDocuments(true)}><FileText size={16} />توزيع المستندات</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={isSyncing} onSelect={async () => { if (user?.profile?.company_id) { await handleSync(user.profile.company_id); refreshAll(); } }}><RotateCcw size={16} />{isSyncing ? 'جارٍ مزامنة الحالات…' : 'مزامنة حالات المركبات'}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <section className="fr-overview" aria-label="مؤشرات الأسطول">
        <div className="fr-metrics">{summary.map(item => <button key={item.status} onClick={() => chooseStatus(item.status as VehicleFilters['status'])} aria-pressed={status === item.status} data-status={item.status}>
          <span className="fr-metric-label"><item.icon size={17} />{item.label}</span>
          <strong>{fleet.isLoading ? '…' : fleet.isError ? '—' : number(item.value)}</strong><small>{item.note}</small>
        </button>)}</div>
        <div className="fr-readiness"><div className="fr-ring" style={{ background: `conic-gradient(#147d69 ${ready}%, #dce8df 0)` }}><strong>{fleet.isLoading || fleet.isError ? '—' : `${ready}%`}</strong></div><div><strong>جاهزية الأسطول</strong><p>نسبة المركبات المتاحة<br />من إجمالي الأسطول</p></div></div>
      </section>
      {fleet.isError && <div role="alert" className="fr-error">تعذر تحميل مؤشرات الأسطول. <button onClick={() => void fleet.refetch()}>إعادة المحاولة</button></div>}
      <section className="fr-register" aria-label="سجل المركبات">
        <div className="fr-register-heading"><div><span className="fr-eyebrow">سجل المركبات</span><h2>كل مركبة، وملفها.</h2></div>
          <div className="fr-register-controls"><span aria-live="polite">{vehicles.isLoading ? 'جارٍ التحميل…' : `${number(count)} مركبة`}</span><Button variant="ghost" size="icon" onClick={refresh} disabled={vehicles.isFetching} aria-label="تحديث الأسطول"><RotateCcw size={16} className={vehicles.isFetching ? 'animate-spin' : ''} /></Button></div>
        </div>
        <div className="fr-toolbar"><label className="fr-search"><Search size={19} /><input aria-label="البحث في المركبات" placeholder="ابحث باللوحة، الماركة، الموديل أو رقم الهيكل…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} />{search && <button aria-label="مسح البحث" onClick={() => { setSearch(''); setPage(1); }}><X size={15} /></button>}</label>
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-controls="fleet-filters"><SlidersHorizontal size={16} />الفلاتر{status !== 'all' && <span className="fr-filter-dot" />}</Button>
          <div className="fr-view" role="group" aria-label="طريقة عرض المركبات"><button aria-label="عرض القائمة" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={18} /></button><button aria-label="عرض البطاقات" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={17} /></button></div>
        </div>
        <nav className="fr-tabs" aria-label="تصفية حسب حالة المركبة">{[{ status: 'all', label: 'كل المركبات' }, ...['available', 'rented', 'maintenance', 'out_of_service'].map(key => ({ status: key, label: statuses[key] }))].map(item => <button key={item.status} aria-pressed={status === item.status} onClick={() => chooseStatus(item.status as VehicleFilters['status'])}>{item.status !== 'all' && <i data-status={item.status} />}{item.label}</button>)}</nav>
        {showFilters && <div id="fleet-filters" className="fr-filters"><label>الحالة التشغيلية<select aria-label="الحالة التشغيلية" value={status} onChange={event => chooseStatus(event.target.value as VehicleFilters['status'])}><option value="all">كل الحالات</option>{Object.entries(statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>عدد المركبات في الصفحة<select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={20}>20 مركبة</option><option value={40}>40 مركبة</option><option value={60}>60 مركبة</option></select></label><Button variant="ghost" onClick={reset}><X size={15} />مسح الفلاتر</Button></div>}
        {filtered && <div className="fr-applied"><span>النتائج حسب: {status !== 'all' ? statuses[status || ''] : 'كل الحالات'}{search && ` · «${search}»`}</span><button onClick={reset}>إظهار الكل <X size={13} /></button></div>}
        {vehicles.isError ? <div className="fr-empty" role="alert"><AlertTriangle /><h3>تعذر تحميل المركبات</h3><p>أعد المحاولة للحصول على الحالة الحالية للأسطول.</p><Button onClick={() => void vehicles.refetch()}>إعادة المحاولة</Button></div>
        : vehicles.isLoading ? <div className="fr-skeleton" role="status" aria-label="جارٍ تحميل المركبات">{[1,2,3,4,5].map(i => <div key={i} />)}</div>
        : !vehicles.data?.data.length ? <div className="fr-empty"><Car /><h3>{filtered ? 'لا توجد مركبات مطابقة' : 'ابدأ بإضافة مركبات الأسطول'}</h3><p>{filtered ? 'جرّب لوحة أخرى أو أزل أحد الفلاتر.' : 'أضف المركبة وبياناتها لتبدأ متابعة تشغيلها.'}</p><Button onClick={filtered ? reset : add}>{filtered ? 'مسح البحث والفلاتر' : 'إضافة مركبة'}</Button></div>
        : <div className={`fr-vehicles fr-${view}`}>
          {view === 'list' && <div className="fr-columns" aria-hidden="true"><span>المركبة</span><span>الحالة</span><span>السعر اليومي / العداد</span><span>الاستمارة / التأمين</span><span>الإجراءات</span></div>}
          {vehicles.data.data.map(vehicle => <article className="fr-vehicle" key={vehicle.id} aria-label={`المركبة ${vehicle.plate_number}`}>
            <div className="fr-identity"><VehiclePhoto vehicle={vehicle} /><div><Link className="fr-plate" to={`/fleet/vehicles/${vehicle.id}`}><small>قطر</small><strong>{vehicle.plate_number || 'بدون لوحة'}</strong></Link><Link className="fr-name" to={`/fleet/vehicles/${vehicle.id}`}>{vehicle.make} {vehicle.model}</Link><p>{vehicle.color_ar || vehicle.color || 'اللون غير مسجل'}<span>·</span>{vehicle.year || 'السنة غير مسجلة'}</p></div></div>
            <div className="fr-state"><button data-status={vehicle.status} onClick={() => setChangingStatus(vehicle)} aria-label={`تغيير حالة المركبة ${vehicle.plate_number}: ${statuses[vehicle.status || ''] || 'غير محددة'}`}><i />{statuses[vehicle.status || ''] || 'غير محددة'}</button></div>
            <dl className="fr-values"><div><dt>السعر اليومي</dt><dd>{number(vehicle.daily_rate)} <small>ر.ق</small></dd></div><div><dt>العداد</dt><dd>{number(vehicle.current_mileage)} <small>كم</small></dd></div></dl>
            <div className="fr-documents"><DocumentDate label="الاستمارة" value={vehicle.registration_expiry} /><DocumentDate label="التأمين" value={vehicle.insurance_expiry} /></div>
            <div className="fr-row-actions"><Link to={`/fleet/vehicles/${vehicle.id}`} aria-label={`فتح ملف المركبة ${vehicle.plate_number}`}>الملف <ArrowUpLeft size={16} /></Link>{actions(vehicle)}</div>
          </article>)}
        </div>}
        <footer className="fr-pagination"><p>{count ? `عرض ${number((page - 1) * pageSize + 1)}–${number(Math.min(page * pageSize, count))} من ${number(count)}` : 'لا توجد نتائج'}<span>مرتبة حسب رقم اللوحة</span></p><div><Button variant="outline" size="icon" aria-label="الصفحة السابقة" disabled={page <= 1 || vehicles.isFetching} onClick={() => setPage(page - 1)}><ChevronRight size={17} /></Button><span>الصفحة <b>{page}</b> من {totalPages}</span><Button variant="outline" size="icon" aria-label="الصفحة التالية" disabled={page >= totalPages || vehicles.isFetching} onClick={() => setPage(page + 1)}><ChevronLeft size={17} /></Button></div></footer>
      </section>
      <div className="fr-footnote"><ShieldCheck size={15} /><span>حالات التشغيل مرتبطة بسجل المركبة. افتح الملف لمراجعة العقود والصيانة والمستندات.</span><Link to="/fleet/maintenance">إدارة الصيانة <ArrowUpLeft size={14} /></Link></div>
    </div>
    <VehicleForm vehicle={editing || undefined} open={showForm} onOpenChange={closeForm} />
    <Dialog open={groups} onOpenChange={setGroups}><DialogContent className="max-w-4xl" dir="rtl"><DialogHeader><DialogTitle>مجموعات المركبات</DialogTitle></DialogHeader>{user?.profile?.company_id && <VehicleGroupManagement companyId={user.profile.company_id} />}</DialogContent></Dialog>
    <VehicleCSVUpload open={csv} onOpenChange={setCsv} onUploadComplete={() => { setCsv(false); refreshAll(); }} />
    <VehicleDocumentDistributionDialog open={documents} onOpenChange={setDocuments} />
    {changingStatus && <VehicleStatusChangeDialog open onOpenChange={open => { if (!open) setChangingStatus(null); }} vehicleId={changingStatus.id} currentStatus={changingStatus.status} currentNotes={changingStatus.notes} onSuccess={refreshAll} />}
    <AlertDialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }}><AlertDialogContent dir="rtl"><AlertDialogHeader><AlertDialogTitle>حذف المركبة {deleting?.plate_number}</AlertDialogTitle><AlertDialogDescription>هذا إجراء نهائي. راجع المركبة وسجلاتها المرتبطة قبل تأكيد الحذف. لتغيير وضعها التشغيلي استخدم تغيير الحالة.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleteVehicle.isPending}>تراجع</AlertDialogCancel><AlertDialogAction className="bg-red-600 hover:bg-red-700" disabled={deleteVehicle.isPending} onClick={event => { event.preventDefault(); void remove(); }}>{deleteVehicle.isPending ? 'جارٍ الحذف…' : 'تأكيد الحذف'}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

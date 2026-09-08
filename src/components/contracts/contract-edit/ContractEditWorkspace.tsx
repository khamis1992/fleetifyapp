import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CalendarDays, Car, Check, CheckCheck, FilePenLine, FileText, Info, Loader2, LockKeyhole, RotateCcw, Search, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { supabase } from '@/integrations/supabase/client';
import { saveContractNotes, saveContractVehicleAndExtension } from '@/services/contractQuickEditService';
import { refreshContractFinancialQueries } from '@/utils/contractFinancialQueries';
import { notifyRecordChange } from '@/services/recordQuerySynchronization';
import type { ContractFormData } from '../SimpleContractWizard';
import { editCopy } from './copy';
import { currentEditVehicle, editChanges, editCustomerName, editPreviewAmount, initialEditDraft, isValidEditDate, type EditableContract, type EditDraft, type EditVehicle } from './model';
import './contract-edit.css';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract: EditableContract;
  onSubmit?: (data: ContractFormData) => Promise<void>;
}

const typeNames: Record<string, [string, string]> = {
  daily: ['يومي', 'Daily'], daily_rental: ['يومي', 'Daily'], weekly: ['أسبوعي', 'Weekly'], weekly_rental: ['أسبوعي', 'Weekly'],
  monthly: ['شهري', 'Monthly'], monthly_rental: ['شهري', 'Monthly'], yearly: ['سنوي', 'Yearly'], yearly_rental: ['سنوي', 'Yearly'],
  corporate: ['شركات', 'Corporate'], rental: ['تأجير', 'Rental'], rent_to_own: ['تأجير منتهٍ بالتملك', 'Rent to own'],
};
const statusNames: Record<string, [string, string]> = {
  active: ['نشط', 'Active'], draft: ['مسودة', 'Draft'], expired: ['منتهي', 'Expired'], cancelled: ['ملغي', 'Cancelled'],
  under_legal_procedure: ['إجراء قانوني', 'Legal procedure'], completed: ['مكتمل', 'Completed'], suspended: ['معلق', 'Suspended'],
  closed: ['مغلق', 'Closed'], renewed: ['مجدد', 'Renewed'], pending: ['قيد الانتظار', 'Pending'],
};

function Section({ number, title, hint, icon, children }: { number: string; title: string; hint: string; icon: ReactNode; children: ReactNode }) {
  return <section className="contract-edit-section" aria-label={title}>
    <div className="contract-edit-section-heading"><span className="contract-edit-number">{number}</span>
      <div><h3>{title}</h3><p>{hint}</p></div><span className="contract-edit-section-icon" aria-hidden="true">{icon}</span>
    </div>{children}
  </section>;
}

export function ContractEditWorkspace({ open, onOpenChange, contract, onSubmit }: Props) {
  const [editorLanguage, setEditorLanguage] = useState<'ar' | 'en'>('ar');
  const english = editorLanguage === 'en';
  const copy = editCopy[english ? 'en' : 'ar'];
  const companyId = useCurrentCompanyId();
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrencyFormatter();
  const [snapshot, setSnapshot] = useState(contract);
  const [draft, setDraft] = useState(() => initialEditDraft(contract));
  const [selectedVehicle, setSelectedVehicle] = useState(() => currentEditVehicle(contract));
  const [reviewing, setReviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [choosingVehicle, setChoosingVehicle] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicles, setVehicles] = useState<EditVehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [vehiclesError, setVehiclesError] = useState(false);
  const [vehicleRetry, setVehicleRetry] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setEditorLanguage('ar');
    // The values and optimistic version are one snapshot. Background refetches
    // must never silently replace either half of an employee's open draft.
    setSnapshot(contract);
    setDraft(initialEditDraft(contract));
    setSelectedVehicle(currentEditVehicle(contract));
    setReviewing(false); setSaveError(''); setConfirmDiscard(false);
    setChoosingVehicle(false); setVehicleSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contract.id]);

  const changes = editChanges(snapshot, draft);
  const count = Object.values(changes).filter(Boolean).length;
  const dirty = count > 0;
  const operational = snapshot.status === 'active' && Number(snapshot.monthly_amount) > 0;
  const operationsChanged = changes.vehicle || changes.endDate;
  const dateError = changes.endDate
    ? !isValidEditDate(draft.endDate) ? copy.invalidDate
      : draft.endDate < snapshot.end_date.slice(0, 10) ? copy.earlierDate : '' : '';
  const validationError = operationsChanged && !operational ? copy.operationalLocked
    : dateError || (operationsChanged && !draft.vehicleId ? copy.noVehicle : '');
  const updatedAmount = dateError ? Number(snapshot.contract_amount) : editPreviewAmount(snapshot, draft);
  const difference = updatedAmount - Number(snapshot.contract_amount);
  const oldVehicle = currentEditVehicle(snapshot);
  const vehicleName = (vehicle: EditVehicle | null) => [vehicle?.make, vehicle?.model, vehicle?.year].filter(Boolean).join(' ') || copy.currentVehicle;
  const vehicleValue = (vehicle: EditVehicle | null) => [vehicleName(vehicle), vehicle?.plate_number].filter(Boolean).join(' · ');
  const dateLabel = (date: string) => isValidEditDate(date?.slice(0, 10))
    ? new Intl.DateTimeFormat(english ? 'en-GB' : 'ar-QA', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`)) : '—';
  const backgroundChanged = contract.id === snapshot.id && contract.updated_at !== snapshot.updated_at;
  const contextChanged = contract.id !== snapshot.id || !companyId || companyId !== snapshot.company_id;

  useEffect(() => {
    if (!open || !dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [open, dirty]);

  useEffect(() => {
    if (!open || !choosingVehicle || !companyId || contextChanged) return;
    let cancelled = false;
    setLoadingVehicles(true); setVehiclesError(false);
    const timer = setTimeout(async () => {
      try {
        let query = supabase.from('vehicles').select('id,plate_number,make,model,year,status')
          .eq('company_id', companyId).eq('is_active', true).in('status', ['available']);
        const search = vehicleSearch.trim().replace(/[%,().\\]/g, ' ').trim();
        if (search) query = query.or(`plate_number.ilike.%${search}%,make.ilike.%${search}%,model.ilike.%${search}%`);
        const { data, error } = await query.order('make').limit(30);
        if (error) throw error;
        if (!cancelled) setVehicles(((data || []) as EditVehicle[]).filter(vehicle => vehicle.id !== snapshot.vehicle_id));
      } catch { if (!cancelled) setVehiclesError(true); }
      finally { if (!cancelled) setLoadingVehicles(false); }
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [open, choosingVehicle, companyId, contextChanged, vehicleSearch, vehicleRetry, snapshot.vehicle_id]);

  const update = (value: Partial<EditDraft>) => { setDraft(previous => ({ ...previous, ...value })); setSaveError(''); };
  const resetVehicle = () => { update({ vehicleId: snapshot.vehicle_id || '' }); setSelectedVehicle(oldVehicle); setChoosingVehicle(false); };
  const requestClose = (nextOpen: boolean) => {
    if (nextOpen || savingRef.current) return;
    if (dirty) setConfirmDiscard(true); else onOpenChange(false);
  };
  const goToReview = () => {
    if (!dirty || validationError || contextChanged || savingRef.current) return;
    setReviewing(true); setChoosingVehicle(false);
    scrollRef.current?.scrollTo?.({ top: 0 });
    mainRef.current?.scrollTo?.({ top: 0 });
  };

  const save = async () => {
    if (savingRef.current || !reviewing || !dirty || validationError) return;
    if (contextChanged || !snapshot.updated_at) { setSaveError(copy.companyChanged); return; }
    savingRef.current = true; setSaving(true); setSaveError('');
    try {
      if (onSubmit) {
        await onSubmit({
          customer_id: snapshot.customer_id, vehicle_id: draft.vehicleId,
          contract_type: snapshot.contract_type as ContractFormData['contract_type'],
          start_date: snapshot.start_date.slice(0, 10), end_date: draft.endDate,
          rental_days: Math.max(1, Math.ceil((Date.parse(draft.endDate) - Date.parse(snapshot.start_date)) / 86_400_000)),
          monthly_amount: Number(snapshot.monthly_amount), contract_amount: updatedAmount, notes: draft.notes,
        });
      } else if (operationsChanged) {
        await saveContractVehicleAndExtension({
          companyId: snapshot.company_id, contractId: snapshot.id, expectedUpdatedAt: snapshot.updated_at,
          vehicleId: draft.vehicleId, endDate: draft.endDate, notes: draft.notes || null,
        });
      } else {
        await saveContractNotes({ companyId: snapshot.company_id, contractId: snapshot.id,
          expectedUpdatedAt: snapshot.updated_at, notes: draft.notes || null });
      }
      toast.success(copy.saved);
      // A failed read after a confirmed write must not offer to submit again.
      void Promise.all([
        notifyRecordChange(queryClient, { entity: 'contract', companyId: snapshot.company_id, recordId: snapshot.id }),
        refreshContractFinancialQueries(queryClient, { companyId: snapshot.company_id,
          contractId: snapshot.id, contractNumber: snapshot.contract_number || snapshot.id }),
        ...[['contracts'], ['contract-amendments', snapshot.id], ['vehicles']].map(queryKey => queryClient.invalidateQueries({ queryKey })),
      ]).catch(() => toast.warning(copy.refreshFailed));
      onOpenChange(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : copy.failed;
      setSaveError(message); toast.error(message);
    } finally { savingRef.current = false; setSaving(false); }
  };

  const changeRows = [
    ...(changes.vehicle ? [{ key: 'vehicle', label: copy.vehicle, before: vehicleValue(oldVehicle), after: vehicleValue(selectedVehicle), undo: resetVehicle }] : []),
    ...(changes.endDate ? [{ key: 'endDate', label: copy.newEnd, before: dateLabel(snapshot.end_date), after: dateLabel(draft.endDate), undo: () => update({ endDate: initialEditDraft(snapshot).endDate }) }] : []),
    ...(changes.notes ? [{ key: 'notes', label: copy.notes, before: initialEditDraft(snapshot).notes || copy.emptyNotes, after: draft.notes || copy.emptyNotes, undo: () => update({ notes: initialEditDraft(snapshot).notes }) }] : []),
  ];

  return <>
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent className="contract-edit-workspace" lang={editorLanguage} dir={english ? 'ltr' : 'rtl'}>
        <header className="contract-edit-header">
          <div className="contract-edit-eyebrow"><FilePenLine size={15} aria-hidden="true" />{copy.eyebrow}<button type="button" className="contract-edit-language" onClick={() => setEditorLanguage(english ? 'ar' : 'en')} aria-label={english ? 'عرض بالعربية' : 'View in English'}>{english ? 'العربية' : 'English'}</button></div>
          <div className="contract-edit-title-row"><DialogTitle>{copy.title}</DialogTitle><span className="contract-edit-contract-number" dir="ltr">{snapshot.contract_number || '—'}</span>
            {snapshot.status && <span className="contract-edit-status">{statusNames[snapshot.status]?.[english ? 1 : 0] || snapshot.status}</span>}
          </div>
          <DialogDescription>{copy.intro}</DialogDescription>
          <nav className="contract-edit-steps" aria-label={copy.title}>
            <button type="button" aria-current={!reviewing ? 'step' : undefined} disabled={saving} onClick={() => setReviewing(false)}><span>{reviewing ? <Check size={14} /> : '01'}</span>{copy.edit}</button>
            <span className="contract-edit-step-line" aria-hidden="true" />
            <button type="button" aria-current={reviewing ? 'step' : undefined} disabled={!dirty || !!validationError || contextChanged || saving} onClick={goToReview}><span>02</span>{copy.review}</button>
          </nav>
        </header>

        <div className="contract-edit-scroll" ref={scrollRef}>
          <div className="contract-edit-layout">
            <div className="contract-edit-main" ref={mainRef}>
              {contextChanged && <div className="contract-edit-error" role="alert">{copy.companyChanged}</div>}
              {backgroundChanged && <div className="contract-edit-notice" role="status"><Info size={18} />{copy.newerVersion}</div>}
              {saveError && <div className="contract-edit-error" role="alert">{saveError}</div>}
              {reviewing ? <section className="contract-edit-review" aria-label={copy.review}>
                <div className="contract-edit-review-icon"><CheckCheck size={26} /></div>
                <h3>{copy.reviewTitle}</h3><p>{copy.reviewHint}</p>
                <div className="contract-edit-review-labels"><span /><span>{copy.before}</span><span>{copy.after}</span></div>
                {changeRows.map(row => <div className="contract-edit-comparison" key={row.key}>
                  <strong>{row.label}</strong><div><small>{copy.before}</small><p>{row.before}</p></div><div><small>{copy.after}</small><p>{row.after}</p></div>
                </div>)}
                {difference !== 0 && <div className="contract-edit-comparison"><strong>{copy.newAmount}</strong><div><small>{copy.before}</small><p>{formatCurrency(Number(snapshot.contract_amount))}</p></div><div><small>{copy.after}</small><p>{formatCurrency(updatedAmount)}</p></div></div>}
              </section> : <fieldset disabled={saving || contextChanged} className="contract-edit-fields">
                <Section number="01" title={copy.basics} hint={copy.basicsHint} icon={<UserRound size={19} />}>
                  <dl className="contract-edit-facts">
                    <div><dt>{copy.customer}</dt><dd>{editCustomerName(snapshot, english) || copy.currentCustomer}</dd></div>
                    <div><dt>{copy.type}</dt><dd>{typeNames[snapshot.contract_type]?.[english ? 1 : 0] || snapshot.contract_type}</dd></div>
                    <div><dt>{copy.start}</dt><dd>{dateLabel(snapshot.start_date)}</dd></div>
                    <div><dt>{copy.monthly}</dt><dd>{formatCurrency(Number(snapshot.monthly_amount || 0))}</dd></div>
                  </dl>
                  <p className="contract-edit-hint"><LockKeyhole size={13} aria-hidden="true" />{copy.fixedTerms}</p>
                </Section>
                {!operational && <div className="contract-edit-notice"><Info size={18} aria-hidden="true" /><p>{copy.operationalLocked}</p></div>}
                <Section number="02" title={copy.vehicle} hint={copy.vehicleHint} icon={<Car size={19} />}>
                  <div className="contract-edit-vehicle">
                    <div className="contract-edit-car-icon"><Car size={28} aria-hidden="true" /></div>
                    <div className="contract-edit-vehicle-info"><span>{changes.vehicle ? copy.selectedVehicle : copy.currentVehicle}</span><strong>{vehicleName(selectedVehicle)}</strong></div>
                    <span className="contract-edit-plate" dir="ltr">{selectedVehicle?.plate_number || '—'}</span>
                  </div>
                  {operational && <div className="contract-edit-vehicle-actions"><Button variant="outline" type="button" onClick={() => setChoosingVehicle(!choosingVehicle)}><Search size={15} />{choosingVehicle ? copy.closeSearch : copy.changeVehicle}</Button>
                    {changes.vehicle && <button type="button" className="contract-edit-text-action" onClick={resetVehicle}>{copy.backToCurrent}</button>}</div>}
                  {choosingVehicle && operational && <div className="contract-edit-picker">
                    <label className="sr-only" htmlFor="contract-edit-vehicle-search">{copy.vehicleSearch}</label>
                    <div className="contract-edit-search"><Search size={17} aria-hidden="true" /><Input id="contract-edit-vehicle-search" value={vehicleSearch} onChange={event => setVehicleSearch(event.target.value)} placeholder={copy.vehicleSearch} /></div>
                    <p className="contract-edit-hint">{copy.searchHelp}</p>
                    <div className="contract-edit-vehicle-options" aria-live="polite" aria-busy={loadingVehicles}>
                      {loadingVehicles ? <p className="contract-edit-picker-message"><Loader2 size={18} className="animate-spin" />{copy.loadVehicles}</p>
                        : vehiclesError ? <div role="alert" className="contract-edit-picker-message">{copy.vehicleError}<Button variant="outline" size="sm" onClick={() => setVehicleRetry(value => value + 1)}>{copy.retry}</Button></div>
                        : vehicles.length === 0 ? <p className="contract-edit-picker-message">{copy.noVehicles}</p>
                          : vehicles.map(vehicle => <button key={vehicle.id} type="button" className="contract-edit-vehicle-option" onClick={() => { setSelectedVehicle(vehicle); update({ vehicleId: vehicle.id }); setChoosingVehicle(false); }}>
                            <Car size={18} aria-hidden="true" /><span><strong>{vehicleName(vehicle)}</strong><small>{copy.available}</small></span><b dir="ltr">{vehicle.plate_number}</b>
                          </button>)}
                    </div>
                  </div>}
                </Section>
                <Section number="03" title={copy.extension} hint={copy.extensionHint} icon={<CalendarDays size={19} />}>
                  <div className="contract-edit-dates"><div><span>{copy.currentEnd}</span><strong>{dateLabel(snapshot.end_date)}</strong></div>
                    <div><label htmlFor="contract-edit-end-date">{copy.newEnd}</label><Input id="contract-edit-end-date" type="date" dir="ltr" aria-label={copy.datePlaceholder} value={draft.endDate} min={snapshot.end_date?.slice(0, 10)} disabled={!operational} onChange={event => update({ endDate: event.target.value })} aria-invalid={!!dateError} aria-describedby={dateError ? 'contract-edit-date-error' : 'contract-edit-date-hint'} /></div>
                  </div>
                  {dateError ? <p id="contract-edit-date-error" className="contract-edit-field-error" role="alert">{dateError}</p>
                    : <p id="contract-edit-date-hint" className="contract-edit-hint">{changes.endDate && difference === 0 ? copy.sameMonth : copy.extensionRule}</p>}
                </Section>
                <Section number="04" title={copy.notes} hint={copy.notesHint} icon={<FileText size={19} />}>
                  <label htmlFor="contract-edit-notes" className="sr-only">{copy.notes}</label><Textarea id="contract-edit-notes" value={draft.notes} onChange={event => update({ notes: event.target.value })} placeholder={copy.notesPlaceholder} rows={4} />
                  <div className="contract-edit-notes-footer"><span>{copy.noFinancialChanges}</span><span>{draft.notes.length}</span></div>
                </Section>
              </fieldset>}
            </div>

            <aside className="contract-edit-summary" aria-label={copy.summary}>
              <div className="contract-edit-summary-heading"><span className="contract-edit-summary-mark"><FilePenLine size={19} /></span><h3>{copy.summary}</h3><span className="contract-edit-count">{count.toString().padStart(2, '0')}</span></div>
              <div className="contract-edit-total"><span>{copy.newAmount}</span><strong>{formatCurrency(updatedAmount)}</strong><small>{copy.currentAmount}: {formatCurrency(Number(snapshot.contract_amount))}</small></div>
              <div className={`contract-edit-difference ${difference > 0 ? 'has-increase' : ''}`}><span>{difference > 0 ? copy.difference : copy.noDifference}</span>{difference > 0 && <strong>+{formatCurrency(difference)}</strong>}</div>
              {dirty ? <div className="contract-edit-change-list" aria-live="polite"><p>{count} {copy.changes}</p>{changeRows.map(row => <div className="contract-edit-change" key={row.key}><span><Check size={14} />{row.label}</span>{!reviewing && <button type="button" disabled={saving} aria-label={`${copy.undo}: ${row.label}`} onClick={row.undo}><RotateCcw size={14} /></button>}</div>)}</div>
                : <div className="contract-edit-empty"><FilePenLine size={24} aria-hidden="true" /><strong>{copy.noChanges}</strong><p>{copy.noChangesHint}</p></div>}
              <p className="contract-edit-summary-note"><Info size={15} aria-hidden="true" />{copy.previewHint}</p>
            </aside>
          </div>
        </div>

        <footer className="contract-edit-footer"><div className="contract-edit-save-state" role="status"><span className={dirty ? 'is-dirty' : ''} />{saving ? copy.saving : dirty ? copy.unsaved : copy.unchanged}<small>{copy.changesSaved}</small></div>
          <div className="contract-edit-footer-actions"><Button type="button" variant="outline" disabled={saving} onClick={() => reviewing ? setReviewing(false) : requestClose(false)}>{reviewing ? copy.back : copy.cancel}</Button>
            <Button type="button" className="contract-edit-primary" disabled={saving || !dirty || !!validationError || contextChanged} onClick={reviewing ? save : goToReview}>
              {saving ? <Loader2 size={17} className="animate-spin" /> : reviewing ? <Check size={17} /> : null}{saving ? copy.saving : reviewing ? copy.save : copy.review}
              {!saving && !reviewing && (english ? <ArrowRight size={17} /> : <ArrowLeft size={17} />)}
            </Button></div>
        </footer>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}><AlertDialogContent lang={editorLanguage} dir={english ? 'ltr' : 'rtl'} className="contract-edit-discard">
      <AlertDialogHeader><AlertDialogTitle>{copy.discardTitle}</AlertDialogTitle><AlertDialogDescription>{copy.discardText}</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>{copy.keepEditing}</AlertDialogCancel><AlertDialogAction onClick={() => { setConfirmDiscard(false); onOpenChange(false); }}>{copy.discard}</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </>;
}

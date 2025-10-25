# Task: Desktop UX Enhancements - Car Rental Focus

## Objective
Improve user experience for car rental company owners by reducing clicks, streamlining workflows, and adding industry-specific features. Focus on desktop/web experience with measurable improvements in task completion time and user satisfaction.

**Business Impact:**
- Reduce contract creation time from 3-5 minutes to 1-2 minutes (60% improvement)
- Decrease clicks from 12-15 to 5-7 for complete rental workflow (50% reduction)
- Improve user task completion rate from ~70% to >90%
- Reduce training time for new users by 40%

## Acceptance Criteria
- [ ] Quick action buttons added to dashboard cards (reduce 2 clicks per action)
- [ ] Inline customer actions implemented (reduce 3-4 clicks for contract creation)
- [ ] Vehicle availability calendar view created
- [ ] Smart pricing suggestions integrated into contract wizard
- [ ] Contract draft save/resume functionality working
- [ ] Unified payments dashboard created
- [ ] Centralized reports hub implemented
- [ ] Type-ahead search working across all modules
- [ ] All features work on desktop browsers (Chrome, Firefox, Edge, Safari)
- [ ] Build passes with zero errors
- [ ] Tests pass for new features
- [ ] Documentation updated

## Scope & Impact Radius

### Modules/files likely touched:

**Phase 1: Quick Wins (Week 1) - 7 files**
- `src/pages/dashboards/CarRentalDashboard.tsx` - Add quick action buttons
- `src/pages/Customers.tsx` - Add inline "Create Contract" button
- `src/components/customers/CustomersList.tsx` - Add quick actions menu
- `src/pages/Fleet.tsx` - Add "Rent Now" buttons on available vehicles
- `src/components/ui/type-ahead-search.tsx` - NEW: Reusable type-ahead component
- `src/hooks/useCustomerSearch.ts` - NEW: Customer search with debouncing
- `src/utils/navigationHelpers.ts` - NEW: Cross-module navigation utilities

**Phase 2: Workflow Improvements (Week 2) - 12 files**
- `src/components/contracts/ContractWizard.tsx` - Add draft save functionality
- `src/components/contracts/ContractDraftManager.tsx` - NEW: Draft management component
- `src/components/contracts/ContractDuplicator.tsx` - NEW: Contract duplication feature
- `src/components/contracts/SmartPricingEngine.tsx` - NEW: AI pricing suggestions
- `src/hooks/useContractDrafts.ts` - NEW: Draft CRUD operations
- `src/hooks/usePricingSuggestions.ts` - NEW: Historical pricing analysis
- `src/pages/Contracts.tsx` - Add "Resume Draft" section
- `src/components/fleet/VehicleCalendar.tsx` - NEW: Availability calendar view
- `src/components/fleet/VehicleAvailabilityChecker.tsx` - NEW: Real-time availability
- `src/hooks/useVehicleAvailability.ts` - NEW: Availability calculation hook
- `supabase/migrations/[timestamp]_create_contract_drafts_table.sql` - NEW: Drafts table
- `src/types/contracts.types.ts` - Add ContractDraft interface

**Phase 3: Unified Dashboards (Week 3) - 10 files**
- `src/pages/finance/PaymentsDashboard.tsx` - NEW: Unified payments view
- `src/components/finance/PaymentStatusCard.tsx` - NEW: Payment status widgets
- `src/components/finance/PaymentQuickActions.tsx` - NEW: Record payment, send reminder
- `src/hooks/usePaymentsSummary.ts` - NEW: Aggregate payment data
- `src/pages/ReportsHub.tsx` - NEW: Centralized reports dashboard
- `src/components/reports/QuickReports.tsx` - NEW: One-click common reports
- `src/components/reports/ReportFavorites.tsx` - NEW: Saved reports management
- `src/hooks/useReportTemplates.ts` - NEW: Report template management
- `src/pages/Finance.tsx` - Add payments dashboard route
- `supabase/migrations/[timestamp]_create_report_favorites_table.sql` - NEW: Report favorites

**Phase 4: Advanced Features (Week 4) - 8 files**
- `src/components/customers/DriverLicenseManager.tsx` - NEW: License upload/tracking
- `src/components/contracts/VehicleCheckInOut.tsx` - NEW: Check-in/out workflow
- `src/components/fleet/VehicleConditionPhotos.tsx` - NEW: Photo documentation
- `src/hooks/useDriverLicenses.ts` - NEW: License CRUD operations
- `src/hooks/useVehicleInspections.ts` - NEW: Inspection records
- `supabase/migrations/[timestamp]_create_driver_licenses_table.sql` - NEW
- `supabase/migrations/[timestamp]_create_vehicle_inspections_table.sql` - NEW
- `src/types/customer.types.ts` - Add DriverLicense interface

**Total Impact:**
- **37 files** to be created/modified
- **8 new database tables**
- **15 new React components**
- **12 new custom hooks**
- **~4,500 lines of code**

### Out-of-scope:
- Mobile-specific features (bottom navigation, touch targets, offline mode)
- PWA enhancements
- Mobile responsive design changes (keep existing responsiveness)
- Tablet-specific layouts
- Gesture controls and swipe features
- Mobile performance optimizations

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Breaking existing contract creation flow | High | Medium | Implement behind feature flag `ENABLE_DRAFT_SAVE`, comprehensive testing |
| Performance degradation with calendar view | Medium | Medium | Implement virtual scrolling, lazy load months, cache availability data |
| Type-ahead search too slow | Medium | Low | Debounce to 300ms, limit results to 10, use indexes on search columns |
| Dashboard widgets load slowly | Medium | Low | Implement skeleton loaders, parallel data fetching, cache aggressively |
| Complex pricing algorithm impacts UX | Low | Medium | Keep it simple: average of last 5 similar rentals, allow manual override |
| Database migration fails | High | Low | Test migrations on staging, include rollback scripts, validate data before constraints |
| User confusion with too many features | Medium | Medium | Add tooltips, create onboarding tour, provide documentation |

**Mitigation Strategy:**
- Feature flags for all major changes (`ENABLE_DRAFT_SAVE`, `ENABLE_PRICING_SUGGESTIONS`, `ENABLE_CALENDAR_VIEW`)
- Incremental rollout: 10% → 50% → 100%
- Comprehensive testing before merge
- Database migrations with reversible down scripts
- User feedback collection after each phase
- Rollback plan for each feature

## Steps

### Pre-flight: typecheck/lint/tests/build green on main
- [ ] Run `npm run typecheck` - must pass
- [ ] Run `npm run lint` - must pass
- [ ] Run `npm run test:run` - must pass
- [ ] Run `npm run build` - must complete successfully
- [ ] Verify .env variables configured
- [ ] No hardcoded secrets in codebase
- [ ] Database backup created
- [ ] Git branch created: `feat/ux-improvements-desktop`

---

## Phase 1: Quick Wins (Week 1) ⚡

### Task 1.1: Dashboard Quick Actions
**Objective:** Add action buttons to dashboard cards for one-click navigation

**Implementation:**
```tsx
// src/pages/dashboards/CarRentalDashboard.tsx
// Add to each widget:
<Card>
  <CardHeader>
    <CardTitle>المركبات المتاحة</CardTitle>
    <Button
      size="sm"
      onClick={() => navigate('/contracts', { state: { autoOpen: true } })}
    >
      إنشاء عقد جديد
    </Button>
  </CardHeader>
  ...
</Card>
```

**Acceptance Criteria:**
- [ ] "Available Vehicles" card → "Create New Rental" button
- [ ] "Active Contracts" card → "View All Contracts" button
- [ ] "Revenue This Month" card → "View Financial Report" button
- [ ] "Overdue Payments" card → "View Payments Dashboard" button
- [ ] All buttons navigate with proper state
- [ ] Buttons styled consistently
- [ ] Hover states work correctly

**Files Changed:** 1 (`CarRentalDashboard.tsx`)
**Lines Added:** ~50
**Time Estimate:** 2-3 hours

---

### Task 1.2: Customer Inline Actions
**Objective:** Add "Create Contract" button directly in customer list

**Implementation:**
```tsx
// src/components/customers/CustomersList.tsx
<DropdownMenu>
  <DropdownMenuTrigger>...</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem onClick={() => handleQuickRent(customer)}>
      <Car className="mr-2 h-4 w-4" />
      إنشاء عقد إيجار
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleViewHistory(customer)}>
      <History className="mr-2 h-4 w-4" />
      عرض السجل
    </DropdownMenuItem>
    ...
  </DropdownMenuContent>
</DropdownMenu>
```

**Acceptance Criteria:**
- [ ] "Quick Rent" action in customer row dropdown
- [ ] Opens contract wizard with customer pre-filled
- [ ] "View History" shows rental history in sidebar
- [ ] "Send Message" opens quick email/SMS dialog
- [ ] Actions disabled for inactive customers
- [ ] Loading states during navigation
- [ ] Toast notification on success

**Files Changed:** 2 (`CustomersList.tsx`, `Customers.tsx`)
**Files Created:** 1 (`CustomerQuickActions.tsx`)
**Lines Added:** ~120
**Time Estimate:** 4-5 hours

---

### Task 1.3: Type-Ahead Search Component
**Objective:** Create reusable type-ahead search with instant results

**Implementation:**
```tsx
// src/components/ui/type-ahead-search.tsx
export function TypeAheadSearch({
  onSearch,
  onSelect,
  placeholder,
  searchFn
}: TypeAheadSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const debouncedSearch = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedSearch) {
      searchFn(debouncedSearch).then(setResults)
    }
  }, [debouncedSearch])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Input value={query} onChange={(e) => setQuery(e.target.value)} />
      </PopoverTrigger>
      {results.length > 0 && (
        <PopoverContent>
          {results.map(result => (
            <div onClick={() => onSelect(result)}>
              {result.label}
            </div>
          ))}
        </PopoverContent>
      )}
    </Popover>
  )
}
```

**Acceptance Criteria:**
- [ ] Debounced search (300ms delay)
- [ ] Shows top 10 results
- [ ] Keyboard navigation (arrow keys, enter)
- [ ] Highlight matching text
- [ ] Loading indicator while searching
- [ ] "No results" state
- [ ] Integrates with Customers, Vehicles, Contracts pages

**Files Created:** 3 (`type-ahead-search.tsx`, `useCustomerSearch.ts`, `useDebounce.ts`)
**Lines Added:** ~200
**Time Estimate:** 5-6 hours

---

## Phase 2: Workflow Improvements (Week 2) 🚀

### Task 2.1: Contract Draft Save/Resume
**Objective:** Allow users to save incomplete contracts and resume later

**Database Migration:**
```sql
-- supabase/migrations/[timestamp]_create_contract_drafts_table.sql
CREATE TABLE contract_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  draft_data JSONB NOT NULL,
  customer_id UUID REFERENCES customers(id),
  vehicle_id UUID REFERENCES vehicles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days',
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_contract_drafts_company ON contract_drafts(company_id);
CREATE INDEX idx_contract_drafts_user ON contract_drafts(user_id);
CREATE INDEX idx_contract_drafts_expires ON contract_drafts(expires_at);

-- RLS policies
ALTER TABLE contract_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company drafts"
  ON contract_drafts FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create own drafts"
  ON contract_drafts FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update own drafts"
  ON contract_drafts FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own drafts"
  ON contract_drafts FOR DELETE
  USING (user_id = auth.uid());

-- Auto-update trigger
CREATE TRIGGER update_contract_drafts_updated_at
  BEFORE UPDATE ON contract_drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Hook Implementation:**
```tsx
// src/hooks/useContractDrafts.ts
export function useContractDrafts() {
  const { user } = useAuth()
  const { company } = useCompanyContext()

  const saveDraft = useMutation({
    mutationFn: async (draftData: Partial<Contract>) => {
      const { data, error } = await supabase
        .from('contract_drafts')
        .upsert({
          company_id: company.id,
          user_id: user.id,
          draft_data: draftData,
          customer_id: draftData.customer_id,
          vehicle_id: draftData.vehicle_id,
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('تم حفظ المسودة بنجاح')
      queryClient.invalidateQueries(['contract-drafts'])
    }
  })

  const loadDrafts = useQuery({
    queryKey: ['contract-drafts', company.id, user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_drafts')
        .select('*')
        .eq('company_id', company.id)
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as ContractDraft[]
    }
  })

  const deleteDraft = useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase
        .from('contract_drafts')
        .delete()
        .eq('id', draftId)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('تم حذف المسودة')
      queryClient.invalidateQueries(['contract-drafts'])
    }
  })

  return { saveDraft, loadDrafts, deleteDraft }
}
```

**Component Implementation:**
```tsx
// src/components/contracts/ContractWizard.tsx
// Add auto-save functionality
const { saveDraft } = useContractDrafts()

useEffect(() => {
  const autoSaveTimer = setInterval(() => {
    if (formData && !isSubmitting) {
      saveDraft.mutate(formData)
    }
  }, 30000) // Auto-save every 30 seconds

  return () => clearInterval(autoSaveTimer)
}, [formData, isSubmitting])

// Add manual save button
<Button variant="outline" onClick={() => saveDraft.mutate(formData)}>
  <Save className="mr-2 h-4 w-4" />
  حفظ كمسودة
</Button>
```

**Acceptance Criteria:**
- [ ] Database table created with RLS policies
- [ ] Auto-save every 30 seconds
- [ ] Manual "Save as Draft" button
- [ ] "Resume Draft" section on Contracts page
- [ ] Draft preview shows customer name, vehicle, last updated
- [ ] Can delete drafts
- [ ] Drafts expire after 30 days (auto-cleanup)
- [ ] Loading states during save/load
- [ ] Error handling with user-friendly messages

**Files Changed:** 3 (ContractWizard.tsx, Contracts.tsx, contracts.types.ts)
**Files Created:** 3 (useContractDrafts.ts, ContractDraftManager.tsx, migration file)
**Lines Added:** ~400
**Time Estimate:** 8-10 hours

---

### Task 2.2: Smart Pricing Suggestions
**Objective:** Suggest rental prices based on historical data

**Implementation:**
```tsx
// src/hooks/usePricingSuggestions.ts
export function usePricingSuggestions(vehicleId: string, duration: number) {
  return useQuery({
    queryKey: ['pricing-suggestions', vehicleId, duration],
    queryFn: async () => {
      // Get last 5 similar rentals
      const { data: similarRentals, error } = await supabase
        .from('contracts')
        .select('daily_rate, rental_duration, start_date')
        .eq('vehicle_id', vehicleId)
        .eq('status', 'completed')
        .gte('rental_duration', duration - 2)
        .lte('rental_duration', duration + 2)
        .order('start_date', { ascending: false })
        .limit(5)

      if (error) throw error

      if (similarRentals.length === 0) {
        // Fallback to vehicle base rate
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('daily_rate')
          .eq('id', vehicleId)
          .single()

        return {
          suggested_rate: vehicle.daily_rate,
          confidence: 'low',
          based_on: 'base_rate'
        }
      }

      // Calculate average
      const avgRate = similarRentals.reduce((sum, r) => sum + r.daily_rate, 0) / similarRentals.length

      // Seasonal adjustment (peak months: Dec, Jan, Jul, Aug)
      const currentMonth = new Date().getMonth()
      const isPeakSeason = [0, 6, 7, 11].includes(currentMonth)
      const seasonalRate = isPeakSeason ? avgRate * 1.15 : avgRate

      // Duration discount
      const durationDiscountRate = duration >= 7 ? seasonalRate * 0.9 :
                                   duration >= 30 ? seasonalRate * 0.8 :
                                   seasonalRate

      return {
        suggested_rate: Math.round(durationDiscountRate),
        confidence: similarRentals.length >= 3 ? 'high' : 'medium',
        based_on: 'historical_data',
        sample_size: similarRentals.length,
        peak_season: isPeakSeason,
        duration_discount: duration >= 7
      }
    },
    enabled: !!vehicleId && duration > 0
  })
}
```

**UI Integration:**
```tsx
// In ContractWizard - Pricing Step
const { data: pricingSuggestion } = usePricingSuggestions(selectedVehicle, rentalDuration)

<div className="space-y-4">
  {pricingSuggestion && (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">السعر المقترح</p>
            <p className="text-2xl font-bold text-blue-600">
              {pricingSuggestion.suggested_rate} ريال/يوم
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {pricingSuggestion.confidence === 'high' && 'ثقة عالية - بناءً على بيانات تاريخية'}
              {pricingSuggestion.confidence === 'medium' && 'ثقة متوسطة'}
              {pricingSuggestion.confidence === 'low' && 'السعر الأساسي للمركبة'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDailyRate(pricingSuggestion.suggested_rate)}
          >
            تطبيق
          </Button>
        </div>
      </CardContent>
    </Card>
  )}

  <div className="grid grid-cols-3 gap-2">
    <Button
      variant="outline"
      onClick={() => setDailyRate(pricingSuggestion.suggested_rate - 10)}
    >
      -10 ريال
    </Button>
    <Input
      type="number"
      value={dailyRate}
      onChange={(e) => setDailyRate(Number(e.target.value))}
    />
    <Button
      variant="outline"
      onClick={() => setDailyRate(pricingSuggestion.suggested_rate + 10)}
    >
      +10 ريال
    </Button>
  </div>
</div>
```

**Acceptance Criteria:**
- [ ] Calculates average from last 5 similar rentals
- [ ] Applies 15% peak season markup (Dec, Jan, Jul, Aug)
- [ ] Applies 10% discount for 7+ days, 20% for 30+ days
- [ ] Shows confidence level (high/medium/low)
- [ ] "Apply" button sets suggested price
- [ ] +/- adjustment buttons work
- [ ] Fallback to base vehicle rate if no history
- [ ] Shows sample size and reasoning

**Files Created:** 2 (usePricingSuggestions.ts, SmartPricingEngine.tsx)
**Lines Added:** ~250
**Time Estimate:** 6-8 hours

---

### Task 2.3: Vehicle Availability Calendar
**Objective:** Visual calendar showing vehicle availability

**Implementation:**
```tsx
// src/components/fleet/VehicleCalendar.tsx
export function VehicleCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const { data: vehicles } = useVehicles()
  const { data: contracts } = useContractsForMonth(currentMonth)

  const getVehicleStatus = (vehicle: Vehicle, date: Date) => {
    const contract = contracts?.find(c =>
      c.vehicle_id === vehicle.id &&
      isWithinInterval(date, { start: new Date(c.start_date), end: new Date(c.end_date) })
    )

    if (contract) return 'rented'
    if (vehicle.status === 'maintenance') return 'maintenance'
    return 'available'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 bg-white">المركبة</th>
            {getDaysInMonth(currentMonth).map(date => (
              <th key={date.toString()} className="text-xs p-1">
                {format(date, 'd')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicles?.map(vehicle => (
            <tr key={vehicle.id}>
              <td className="sticky left-0 bg-white font-medium">
                {vehicle.make} {vehicle.model}
              </td>
              {getDaysInMonth(currentMonth).map(date => {
                const status = getVehicleStatus(vehicle, date)
                return (
                  <td
                    key={date.toString()}
                    className={cn(
                      'p-1 text-center cursor-pointer hover:opacity-80',
                      status === 'available' && 'bg-green-200',
                      status === 'rented' && 'bg-red-200',
                      status === 'maintenance' && 'bg-yellow-200'
                    )}
                    onClick={() => handleDateClick(vehicle, date)}
                  >
                    {/* Empty cell, color indicates status */}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] Shows all vehicles in rows
- [ ] Shows days of month in columns
- [ ] Color coding: Green (available), Red (rented), Yellow (maintenance)
- [ ] Click on date opens "Create Rental" dialog with vehicle and date pre-filled
- [ ] Month navigation (previous/next)
- [ ] Legend showing color meanings
- [ ] Tooltip on hover showing contract details (if rented)
- [ ] Virtual scrolling for many vehicles (>20)
- [ ] Responsive to container width

**Files Created:** 2 (VehicleCalendar.tsx, useContractsForMonth.ts)
**Lines Added:** ~350
**Time Estimate:** 8-10 hours

---

## Phase 3: Unified Dashboards (Week 3) 📊

### Task 3.1: Payments Dashboard
**Objective:** Create unified view of all payment statuses

**Implementation:**
```tsx
// src/pages/finance/PaymentsDashboard.tsx
export function PaymentsDashboard() {
  const { data: summary } = usePaymentsSummary()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">لوحة المدفوعات</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">المبلغ الإجمالي المستحق</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary?.total_outstanding} ريال</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-sm text-red-700">متأخر</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {summary?.overdue_amount} ريال
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.overdue_count} عقد
            </p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm text-yellow-700">مستحق هذا الأسبوع</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {summary?.due_this_week} ريال
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-sm text-green-700">مدفوع هذا الشهر</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {summary?.paid_this_month} ريال
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button onClick={() => openRecordPaymentDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            تسجيل دفعة
          </Button>
          <Button variant="outline" onClick={() => sendPaymentReminders()}>
            <Mail className="mr-2 h-4 w-4" />
            إرسال تذكيرات
          </Button>
          <Button variant="outline" onClick={() => generatePaymentReport()}>
            <FileText className="mr-2 h-4 w-4" />
            تقرير المدفوعات
          </Button>
        </CardContent>
      </Card>

      {/* Overdue Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>المدفوعات المتأخرة</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>العقد</TableHead>
                <TableHead>العميل</TableHead>
                <TableHead>المبلغ</TableHead>
                <TableHead>تاريخ الاستحقاق</TableHead>
                <TableHead>الأيام المتأخرة</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary?.overdue_payments?.map(payment => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.contract_number}</TableCell>
                  <TableCell>{payment.customer_name}</TableCell>
                  <TableCell>{payment.amount} ريال</TableCell>
                  <TableCell>{format(new Date(payment.due_date), 'yyyy-MM-dd')}</TableCell>
                  <TableCell>
                    <Badge variant="destructive">{payment.days_overdue} يوم</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => recordPayment(payment)}>
                          تسجيل دفعة
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => sendReminder(payment)}>
                          إرسال تذكير
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => viewContract(payment)}>
                          عرض العقد
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

**Hook Implementation:**
```tsx
// src/hooks/usePaymentsSummary.ts
export function usePaymentsSummary() {
  const { company } = useCompanyContext()

  return useQuery({
    queryKey: ['payments-summary', company.id],
    queryFn: async () => {
      // Get all active contracts with payment info
      const { data: contracts, error } = await supabase
        .from('contracts')
        .select(`
          id,
          contract_number,
          customer_id,
          total_amount,
          paid_amount,
          customers(name),
          start_date,
          end_date
        `)
        .eq('company_id', company.id)
        .in('status', ['active', 'pending'])

      if (error) throw error

      const now = new Date()
      const oneWeekFromNow = addDays(now, 7)

      let total_outstanding = 0
      let overdue_amount = 0
      let overdue_count = 0
      let due_this_week = 0
      let paid_this_month = 0
      const overdue_payments = []

      for (const contract of contracts) {
        const remaining = contract.total_amount - contract.paid_amount
        total_outstanding += remaining

        const endDate = new Date(contract.end_date)
        const daysOverdue = differenceInDays(now, endDate)

        if (daysOverdue > 0 && remaining > 0) {
          overdue_amount += remaining
          overdue_count++
          overdue_payments.push({
            id: contract.id,
            contract_number: contract.contract_number,
            customer_name: contract.customers.name,
            amount: remaining,
            due_date: contract.end_date,
            days_overdue: daysOverdue
          })
        }

        if (isWithinInterval(endDate, { start: now, end: oneWeekFromNow })) {
          due_this_week += remaining
        }
      }

      // Get paid this month
      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', company.id)
        .gte('payment_date', startOfMonth(now).toISOString())
        .lte('payment_date', endOfMonth(now).toISOString())

      paid_this_month = payments?.reduce((sum, p) => sum + p.amount, 0) || 0

      return {
        total_outstanding,
        overdue_amount,
        overdue_count,
        due_this_week,
        paid_this_month,
        overdue_payments: overdue_payments.sort((a, b) => b.days_overdue - a.days_overdue)
      }
    },
    refetchInterval: 60000 // Refresh every minute
  })
}
```

**Acceptance Criteria:**
- [ ] 4 summary cards showing key metrics
- [ ] Overdue payments highlighted in red
- [ ] Quick action buttons: Record Payment, Send Reminders, Generate Report
- [ ] Overdue payments table with sorting
- [ ] Days overdue badge
- [ ] Inline actions per payment (record, remind, view contract)
- [ ] Auto-refresh every 60 seconds
- [ ] Loading states
- [ ] Error handling

**Files Created:** 3 (PaymentsDashboard.tsx, usePaymentsSummary.ts, PaymentQuickActions.tsx)
**Lines Added:** ~500
**Time Estimate:** 10-12 hours

---

### Task 3.2: Reports Hub
**Objective:** Centralized dashboard for all reports

**Database Migration:**
```sql
-- supabase/migrations/[timestamp]_create_report_favorites_table.sql
CREATE TABLE report_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  report_type VARCHAR(50) NOT NULL,
  report_config JSONB NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE INDEX idx_report_favorites_company ON report_favorites(company_id);
CREATE INDEX idx_report_favorites_user ON report_favorites(user_id);

-- RLS policies
ALTER TABLE report_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company report favorites"
  ON report_favorites FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create own report favorites"
  ON report_favorites FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own report favorites"
  ON report_favorites FOR DELETE
  USING (user_id = auth.uid());
```

**Implementation:**
```tsx
// src/pages/ReportsHub.tsx
export function ReportsHub() {
  const { data: favorites } = useReportFavorites()
  const { data: recentReports } = useRecentReports()

  const quickReports = [
    {
      id: 'daily-revenue',
      name: 'الإيرادات اليومية',
      description: 'تقرير سريع بإيرادات اليوم',
      icon: <DollarSign />,
      onClick: () => generateDailyRevenue()
    },
    {
      id: 'fleet-utilization',
      name: 'استغلال الأسطول',
      description: 'نسبة المركبات المؤجرة حالياً',
      icon: <Car />,
      onClick: () => generateFleetUtilization()
    },
    {
      id: 'outstanding-payments',
      name: 'المدفوعات المعلقة',
      description: 'قائمة بجميع المدفوعات المتأخرة',
      icon: <AlertCircle />,
      onClick: () => generateOutstandingPayments()
    },
    {
      id: 'contract-expirations',
      name: 'انتهاء العقود',
      description: 'العقود المنتهية خلال 30 يوم',
      icon: <Calendar />,
      onClick: () => generateContractExpirations()
    }
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">مركز التقارير</h1>

      {/* Quick Reports */}
      <section>
        <h2 className="text-xl font-semibold mb-4">تقارير سريعة</h2>
        <div className="grid grid-cols-4 gap-4">
          {quickReports.map(report => (
            <Card
              key={report.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={report.onClick}
            >
              <CardContent className="pt-6">
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    {report.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{report.name}</h3>
                    <p className="text-xs text-muted-foreground">{report.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Favorites */}
      {favorites && favorites.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">التقارير المفضلة</h2>
          <div className="grid grid-cols-3 gap-4">
            {favorites.map(fav => (
              <Card key={fav.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{fav.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {fav.report_type}
                      </p>
                    </div>
                    <Button size="sm" onClick={() => runReport(fav)}>
                      تشغيل
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Recent Reports */}
      {recentReports && recentReports.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">التقارير الأخيرة</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم التقرير</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>التاريخ</TableHead>
                <TableHead>إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentReports.map(report => (
                <TableRow key={report.id}>
                  <TableCell>{report.name}</TableCell>
                  <TableCell>{report.type}</TableCell>
                  <TableCell>{format(new Date(report.created_at), 'yyyy-MM-dd HH:mm')}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => viewReport(report)}>
                      عرض
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] Quick Reports section with 4 one-click reports
- [ ] Favorites section showing saved report configurations
- [ ] Recent Reports showing last 5 generated reports
- [ ] "Run Report" button for favorites
- [ ] "Save to Favorites" option after generating report
- [ ] Report preview before export
- [ ] Export options: PDF, Excel, CSV
- [ ] Loading states during report generation
- [ ] Error handling with retry option

**Files Created:** 4 (ReportsHub.tsx, useReportFavorites.ts, QuickReports.tsx, migration file)
**Lines Added:** ~450
**Time Estimate:** 10-12 hours

---

## Phase 4: Advanced Features (Week 4) 🎯

### Task 4.1: Driver License Management
**Objective:** Upload, track, and verify driver licenses

**Database Migration:**
```sql
-- supabase/migrations/[timestamp]_create_driver_licenses_table.sql
CREATE TABLE driver_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  license_number VARCHAR(50) NOT NULL,
  issue_date DATE,
  expiry_date DATE NOT NULL,
  issuing_country VARCHAR(100),
  front_image_url TEXT,
  back_image_url TEXT,
  verification_status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT unique_license_per_customer UNIQUE (customer_id, license_number)
);

CREATE INDEX idx_driver_licenses_company ON driver_licenses(company_id);
CREATE INDEX idx_driver_licenses_customer ON driver_licenses(customer_id);
CREATE INDEX idx_driver_licenses_expiry ON driver_licenses(expiry_date);

-- RLS policies
ALTER TABLE driver_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company driver licenses"
  ON driver_licenses FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create driver licenses"
  ON driver_licenses FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update driver licenses"
  ON driver_licenses FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Auto-update trigger
CREATE TRIGGER update_driver_licenses_updated_at
  BEFORE UPDATE ON driver_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check for expiring licenses (cron job candidate)
CREATE OR REPLACE FUNCTION get_expiring_licenses(days_threshold INT DEFAULT 30)
RETURNS TABLE (
  customer_id UUID,
  customer_name VARCHAR,
  license_number VARCHAR,
  expiry_date DATE,
  days_until_expiry INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    dl.customer_id,
    c.name AS customer_name,
    dl.license_number,
    dl.expiry_date,
    (dl.expiry_date - CURRENT_DATE) AS days_until_expiry
  FROM driver_licenses dl
  JOIN customers c ON c.id = dl.customer_id
  WHERE dl.expiry_date <= CURRENT_DATE + days_threshold
    AND dl.expiry_date >= CURRENT_DATE
  ORDER BY dl.expiry_date ASC;
END;
$$ LANGUAGE plpgsql;
```

**Component Implementation:**
```tsx
// src/components/customers/DriverLicenseManager.tsx
export function DriverLicenseManager({ customerId }: { customerId: string }) {
  const { data: licenses, isLoading } = useDriverLicenses(customerId)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const uploadLicense = useUploadDriverLicense()

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">رخص القيادة</h3>
        <Button onClick={() => setShowUploadDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          إضافة رخصة
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <LoadingSpinner />
        </div>
      ) : licenses && licenses.length > 0 ? (
        <div className="space-y-4">
          {licenses.map(license => (
            <Card key={license.id}>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* License Details */}
                  <div>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">رقم الرخصة</dt>
                        <dd className="font-medium">{license.license_number}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">تاريخ الإصدار</dt>
                        <dd>{format(new Date(license.issue_date), 'yyyy-MM-dd')}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">تاريخ الانتهاء</dt>
                        <dd className={cn(
                          differenceInDays(new Date(license.expiry_date), new Date()) < 30 && 'text-red-600 font-semibold'
                        )}>
                          {format(new Date(license.expiry_date), 'yyyy-MM-dd')}
                          {differenceInDays(new Date(license.expiry_date), new Date()) < 30 && (
                            <Badge variant="destructive" className="mr-2">
                              تنتهي قريباً
                            </Badge>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">الحالة</dt>
                        <dd>
                          <Badge
                            variant={
                              license.verification_status === 'verified' ? 'success' :
                              license.verification_status === 'rejected' ? 'destructive' :
                              'default'
                            }
                          >
                            {license.verification_status === 'verified' && 'موثقة'}
                            {license.verification_status === 'pending' && 'قيد المراجعة'}
                            {license.verification_status === 'rejected' && 'مرفوضة'}
                          </Badge>
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* License Images */}
                  <div className="space-y-2">
                    {license.front_image_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">الوجه الأمامي</p>
                        <img
                          src={license.front_image_url}
                          alt="License Front"
                          className="w-full rounded-md cursor-pointer hover:opacity-80"
                          onClick={() => openImageViewer(license.front_image_url)}
                        />
                      </div>
                    )}
                    {license.back_image_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">الوجه الخلفي</p>
                        <img
                          src={license.back_image_url}
                          alt="License Back"
                          className="w-full rounded-md cursor-pointer hover:opacity-80"
                          onClick={() => openImageViewer(license.back_image_url)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {license.verification_status === 'pending' && (
                  <div className="flex gap-2 mt-4 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => verifyLicense(license.id, 'verified')}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      توثيق
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => verifyLicense(license.id, 'rejected')}
                    >
                      <X className="mr-2 h-4 w-4" />
                      رفض
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
            <p>لا توجد رخص قيادة مسجلة</p>
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إضافة رخصة قيادة</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpload}>
            <div className="space-y-4">
              <div>
                <Label>رقم الرخصة</Label>
                <Input required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>تاريخ الإصدار</Label>
                  <Input type="date" required />
                </div>
                <div>
                  <Label>تاريخ الانتهاء</Label>
                  <Input type="date" required />
                </div>
              </div>
              <div>
                <Label>بلد الإصدار</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر البلد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SA">السعودية</SelectItem>
                    <SelectItem value="AE">الإمارات</SelectItem>
                    <SelectItem value="KW">الكويت</SelectItem>
                    <SelectItem value="QA">قطر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>صورة الوجه الأمامي</Label>
                <Input type="file" accept="image/*" required />
              </div>
              <div>
                <Label>صورة الوجه الخلفي</Label>
                <Input type="file" accept="image/*" />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowUploadDialog(false)}>
                  إلغاء
                </Button>
                <Button type="submit">
                  حفظ
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] Database table created with RLS policies
- [ ] Upload front and back images of license
- [ ] Store license number, issue date, expiry date, issuing country
- [ ] Verification workflow (pending → verified/rejected)
- [ ] Expiry date warnings (< 30 days)
- [ ] Image viewer for uploaded licenses
- [ ] Function to get expiring licenses
- [ ] Integration with customer details page
- [ ] Prevent contract creation if license expired or not verified (optional toggle)

**Files Created:** 4 (DriverLicenseManager.tsx, useDriverLicenses.ts, useUploadDriverLicense.ts, migration file)
**Lines Added:** ~450
**Time Estimate:** 10-12 hours

---

### Task 4.2: Vehicle Check-In/Check-Out Workflow
**Objective:** Document vehicle condition at rental start and end

**Database Migration:**
```sql
-- supabase/migrations/[timestamp]_create_vehicle_inspections_table.sql
CREATE TABLE vehicle_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  contract_id UUID NOT NULL REFERENCES contracts(id),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  inspection_type VARCHAR(20) NOT NULL, -- 'check_in' or 'check_out'
  inspected_by UUID REFERENCES profiles(id),
  inspection_date TIMESTAMPTZ DEFAULT now(),

  -- Vehicle condition
  fuel_level INT CHECK (fuel_level >= 0 AND fuel_level <= 100),
  odometer_reading INT,
  cleanliness_rating INT CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),

  -- Damages
  exterior_condition JSONB, -- Array of damage objects with location, severity, photos
  interior_condition JSONB,

  -- Photos
  photo_urls TEXT[], -- Array of photo URLs

  -- Notes
  notes TEXT,
  customer_signature TEXT, -- Base64 signature image

  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
  CONSTRAINT fk_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

CREATE INDEX idx_vehicle_inspections_company ON vehicle_inspections(company_id);
CREATE INDEX idx_vehicle_inspections_contract ON vehicle_inspections(contract_id);
CREATE INDEX idx_vehicle_inspections_vehicle ON vehicle_inspections(vehicle_id);
CREATE INDEX idx_vehicle_inspections_type ON vehicle_inspections(inspection_type);

-- RLS policies
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company inspections"
  ON vehicle_inspections FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create inspections"
  ON vehicle_inspections FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
```

**Component Implementation (simplified - full implementation is longer):**
```tsx
// src/components/contracts/VehicleCheckInOut.tsx
export function VehicleCheckInOut({
  contractId,
  vehicleId,
  type
}: {
  contractId: string
  vehicleId: string
  type: 'check_in' | 'check_out'
}) {
  const [formData, setFormData] = useState({
    fuel_level: 100,
    odometer_reading: 0,
    cleanliness_rating: 5,
    exterior_damages: [],
    interior_damages: [],
    photos: [],
    notes: '',
    customer_signature: null
  })

  const createInspection = useCreateVehicleInspection()

  const handleSubmit = async () => {
    await createInspection.mutateAsync({
      contract_id: contractId,
      vehicle_id: vehicleId,
      inspection_type: type,
      ...formData
    })
    toast.success(type === 'check_in' ? 'تم تسجيل الاستلام بنجاح' : 'تم تسجيل التسليم بنجاح')
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        {type === 'check_in' ? 'استلام المركبة' : 'تسليم المركبة'}
      </h2>

      {/* Fuel Level */}
      <div>
        <Label>مستوى الوقود (%)</Label>
        <Slider
          min={0}
          max={100}
          step={5}
          value={[formData.fuel_level]}
          onValueChange={([value]) => setFormData({ ...formData, fuel_level: value })}
        />
        <p className="text-sm text-muted-foreground mt-1">{formData.fuel_level}%</p>
      </div>

      {/* Odometer */}
      <div>
        <Label>قراءة العداد (كم)</Label>
        <Input
          type="number"
          value={formData.odometer_reading}
          onChange={(e) => setFormData({ ...formData, odometer_reading: Number(e.target.value) })}
        />
      </div>

      {/* Cleanliness */}
      <div>
        <Label>تقييم النظافة</Label>
        <div className="flex gap-1 mt-2">
          {[1, 2, 3, 4, 5].map(rating => (
            <Button
              key={rating}
              variant={formData.cleanliness_rating >= rating ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFormData({ ...formData, cleanliness_rating: rating })}
            >
              <Star className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>

      {/* Photo Upload */}
      <div>
        <Label>صور المركبة</Label>
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotoUpload}
        />
        <div className="grid grid-cols-4 gap-2 mt-2">
          {formData.photos.map((photo, index) => (
            <div key={index} className="relative">
              <img src={photo} alt={`Photo ${index + 1}`} className="rounded-md" />
              <Button
                size="sm"
                variant="destructive"
                className="absolute top-1 right-1"
                onClick={() => removePhoto(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Damage Report */}
      <div>
        <Label>تقرير الأضرار</Label>
        <VehicleDamageMapper
          damages={formData.exterior_damages}
          onChange={(damages) => setFormData({ ...formData, exterior_damages: damages })}
        />
      </div>

      {/* Notes */}
      <div>
        <Label>ملاحظات</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={4}
        />
      </div>

      {/* Customer Signature */}
      <div>
        <Label>توقيع العميل</Label>
        <SignatureCanvas
          onSignatureChange={(signature) => setFormData({ ...formData, customer_signature: signature })}
        />
      </div>

      <Button onClick={handleSubmit} className="w-full" size="lg">
        {type === 'check_in' ? 'تأكيد الاستلام' : 'تأكيد التسليم'}
      </Button>
    </div>
  )
}
```

**Acceptance Criteria:**
- [ ] Database table created
- [ ] Check-in workflow: fuel level, odometer, photos, damages, signature
- [ ] Check-out workflow: same fields + comparison with check-in
- [ ] Photo upload (multiple photos)
- [ ] Interactive vehicle damage mapper (click on car diagram to mark damages)
- [ ] Signature canvas for customer
- [ ] Automatic damage charge calculation (if damages found at check-out)
- [ ] PDF report generation of inspection
- [ ] Integration with contract workflow

**Files Created:** 6 (VehicleCheckInOut.tsx, VehicleDamageMapper.tsx, SignatureCanvas.tsx, useVehicleInspections.ts, useCreateVehicleInspection.ts, migration file)
**Lines Added:** ~600
**Time Estimate:** 12-15 hours

---

## Phase 5: Testing & Documentation (Week 5) 📝

### Task 5.1: Integration Testing
- [ ] Test complete rental workflow (customer → vehicle → contract → payment)
- [ ] Test draft save/resume functionality
- [ ] Test pricing suggestions accuracy
- [ ] Test calendar availability updates
- [ ] Test driver license verification flow
- [ ] Test check-in/check-out workflow
- [ ] Cross-browser testing (Chrome, Firefox, Edge, Safari)
- [ ] Performance testing (Lighthouse scores)

### Task 5.2: Documentation Updates
- [ ] Update SYSTEM_REFERENCE.md with new features
- [ ] Document new database tables
- [ ] Document new hooks and components
- [ ] Create user guide for new features
- [ ] Update API documentation
- [ ] Create video tutorials (optional)

---

## Review (fill after merge)

**Summary of changes:**

**Known limitations:**

**Follow-ups:**

---

## PR Checklist (paste into PR)

 Conventional commit title & clear description

 Acceptance criteria met & demonstrated

 Tests added/updated and passing

 Build passes in CI

 Feature flag or non-breaking path

 Rollback plan included

 Docs updated (SYSTEM_REFERENCE.md)

 Screenshots/video for UI changes

 Performance impact measured

 Database migrations tested with rollback

---

## Suggested Commit Message Style

```
feat: add desktop UX improvements for car rental workflow

Phase 1: Quick Wins
- Add quick action buttons to dashboard cards
- Implement inline customer actions (Create Contract, View History)
- Create reusable type-ahead search component
- Reduce clicks by 40% for common workflows

Phase 2: Workflow Improvements
- Implement contract draft save/resume (auto-save every 30s)
- Add smart pricing suggestions based on historical data
- Create vehicle availability calendar view
- Improve contract creation time by 60%

Phase 3: Unified Dashboards
- Create unified payments dashboard with overdue alerts
- Implement centralized reports hub with favorites
- Add one-click quick reports
- Reduce navigation between modules

Phase 4: Advanced Features
- Add driver license management with expiry tracking
- Implement vehicle check-in/check-out workflow
- Add photo documentation and damage tracking
- Industry-specific car rental features

Database:
- 8 new tables (contract_drafts, driver_licenses, vehicle_inspections, report_favorites, etc.)
- All tables with RLS policies and proper indexes
- Migration rollback scripts included

Components:
- 15 new reusable components
- 12 new custom hooks
- ~4,500 lines of production code
- Zero breaking changes

Testing:
- All existing tests passing
- New tests for critical workflows
- Cross-browser compatibility verified
- Performance benchmarks met

Refs: tasks/UX_IMPROVEMENTS_DESKTOP.md
```

---

**Plan Created By:** Claude Code AI Assistant
**Date:** 2025-10-25
**Version:** 1.0
**Estimated Duration:** 4-5 weeks
**Total Files:** 37 created/modified
**Total Lines:** ~4,500 lines
**Impact:** 60% reduction in task completion time, 50% reduction in clicks

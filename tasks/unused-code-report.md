# Unused Code Analysis Report - Fleetify

**Generated:** 2026-01-12T07:51:29.307Z
**Analysis Scope:** src/ directory
**Total Files Analyzed:** 1953
**Files with Issues:** 1953
**Total Unused Imports:** 2
**Total Unused Variables/Functions:** 3125

---

## Executive Summary

This report identifies unused code across the Fleetify codebase, including:
- Unused imports
- Unused variables and constants
- Unused function declarations
- Unused React components (where detectable)

### Impact Assessment

| Severity | Count | Description |
|----------|-------|-------------|
| **High** | 470 | Unused exports/components affecting bundle size |
| **Medium** | 1095 | Unused internal functions/variables |
| **Low** | 1563 | Unused imports in single files |

### Potential Impact

- **Bundle Size:** Removing unused code could reduce the bundle size by approximately 1564KB
- **Build Time:** Fewer files to process = faster builds
- **Maintainability:** Less code to maintain and understand
- **Developer Experience:** Cleaner codebase with fewer distractions

### Recommendations

1. **Immediate Actions (High Priority)**
   - Remove unused exported components to reduce bundle size
   - Clean up unused utility functions that are no longer referenced
   - Remove unused dependencies from package.json

2. **Short-term Actions (Medium Priority)**
   - Clean up unused variables within files
   - Remove commented-out code blocks
   - Consolidate duplicate utilities

3. **Long-term Actions (Low Priority)**
   - Implement ESLint auto-fix for unused imports
   - Add pre-commit hooks to catch unused code
   - Regular code review cycles for dead code elimination

---

## Top Files with Most Issues

1. **src\components\customers\CustomerDetailsPage.tsx** - 56 issues
2. **src\lib\contract-workflow.ts** - 51 issues
3. **src\components\finance\charts\EnhancedAccountsVisualization.tsx** - 36 issues
4. **src\components\finance\EnhancedChartOfAccountsManagement.tsx** - 35 issues
5. **src\components\customers\CustomerDetailsPageNew.tsx** - 33 issues
6. **src\components\contracts\ContractDetailsPageRedesigned.tsx** - 25 issues
7. **src\components\dashboard\bento\EnhancedBentoDashboard.tsx** - 25 issues
8. **src\pages\FinancialTracking.tsx** - 24 issues
9. **src\components\admin\AuditLogViewer.tsx** - 23 issues
10. **src\components\super-admin\landing\LandingContentManager.tsx** - 22 issues
11. **src\components\contracts\ContractDetailsPage.tsx** - 20 issues
12. **src\components\payments\PaymentPlansManager.tsx** - 20 issues
13. **src\hooks\useUnifiedReports.ts** - 20 issues
14. **src\components\analytics\SmartAnalyticsPanel.tsx** - 19 issues
15. **src\components\finance\wizard\AccountsMapping.tsx** - 18 issues
16. **src\components\legal\DelinquentCustomersTab.tsx** - 18 issues
17. **src\pages\legal\LegalCasesTracking.tsx** - 18 issues
18. **src\components\dashboard\customization\MobileEnhancements.tsx** - 17 issues
19. **src\pages\ContractsRedesigned.tsx** - 17 issues
20. **src\components\payments\QuickPaymentRecording.tsx** - 16 issues

---

## Detailed Findings by Category

### 1. Unused Imports (2 found)

These are imports that are declared but never referenced in the file.

#### src\components\contracts\SimpleContractWizard.tsx

- Line 60: 'contractSchema' is assigned a value but only used as a type.

#### src\hooks\use-toast.ts

- Line 18: 'actionTypes' is assigned a value but only used as a type.


### 2. Unused Variables/Functions (3125 found)

These are variables, constants, or functions that are defined but never used.

#### src\components\customers\CustomerDetailsPage.tsx

- Line 21: 'CustomerActivity' is defined but never used.
- Line 21: 'AddActivityInput' is defined but never used.
- Line 30: 'Archive' is defined but never used.
- Line 33: 'Hash' is defined but never used.
- Line 35: 'Clock' is defined but never used.
- Line 40: 'CreditCard' is defined but never used.
- Line 43: 'Users' is defined but never used.
- Line 48: 'Eye' is defined but never used.
- Line 51: 'Landmark' is defined but never used.
- Line 52: 'Banknote' is defined but never used.
- Line 54: 'ChevronRight' is defined but never used.
- Line 55: 'ChevronLeft' is defined but never used.
- Line 58: 'Folder' is defined but never used.
- Line 63: 'Globe' is defined but never used.
- Line 67: 'MoreVertical' is defined but never used.
- Line 68: 'Printer' is defined but never used.
- Line 69: 'Share2' is defined but never used.
- Line 71: 'PhoneOff' is defined but never used.
- Line 72: 'PhoneIncoming' is defined but never used.
- Line 75: 'Sparkles' is defined but never used.
- Line 85: 'AvatarImage' is defined but never used.
- Line 86: 'Progress' is defined but never used.
- Line 94: 'DialogDescription' is defined but never used.
- Line 95: 'DialogFooter' is defined but never used.
- Line 100: 'AlertDialog' is defined but never used.
- Line 101: 'AlertDialogAction' is defined but never used.
- Line 102: 'AlertDialogCancel' is defined but never used.
- Line 103: 'AlertDialogContent' is defined but never used.
- Line 104: 'AlertDialogDescription' is defined but never used.
- Line 105: 'AlertDialogFooter' is defined but never used.
- Line 106: 'AlertDialogHeader' is defined but never used.
- Line 107: 'AlertDialogTitle' is defined but never used.
- Line 110: 'DropdownMenu' is defined but never used.
- Line 111: 'DropdownMenuContent' is defined but never used.
- Line 112: 'DropdownMenuItem' is defined but never used.
- Line 113: 'DropdownMenuSeparator' is defined but never used.
- Line 114: 'DropdownMenuTrigger' is defined but never used.
- Line 118: 'Tooltip' is defined but never used.
- Line 119: 'TooltipContent' is defined but never used.
- Line 120: 'TooltipProvider' is defined but never used.
- Line 121: 'TooltipTrigger' is defined but never used.
- Line 254: 'stats' is defined but never used.
- Line 367: 'customer' is defined but never used.
- Line 663: 'idx' is defined but never used.
- Line 761: 'idx' is defined but never used.
- Line 848: 'idx' is defined but never used.
- Line 849: 'outstanding' is assigned a value but never used.
- Line 944: 'idx' is defined but never used.
- Line 967: 'navigate' is defined but never used.
- Line 995: 'idx' is defined but never used.
- Line 1183: 'idx' is defined but never used.
- Line 1387: 'idx' is defined but never used.
- Line 1544: 'idx' is defined but never used.
- Line 1625: 'idx' is defined but never used.
- Line 1704: 'setSelectedDocumentType' is assigned a value but never used.
- Line 1844: 'error' is defined but never used.

#### src\lib\contract-workflow.ts

- Line 8: 'addWeeks' is defined but never used.
- Line 8: 'addMonths' is defined but never used.
- Line 8: 'addYears' is defined but never used.
- Line 8: 'differenceInDays' is defined but never used.
- Line 8: 'isBefore' is defined but never used.
- Line 8: 'startOfDay' is defined but never used.
- Line 397: 'contractId' is defined but never used.
- Line 397: 'metadata' is defined but never used.
- Line 402: 'contractId' is defined but never used.
- Line 402: 'metadata' is defined but never used.
- Line 407: 'contractId' is defined but never used.
- Line 407: 'metadata' is defined but never used.
- Line 412: 'contractId' is defined but never used.
- Line 412: 'metadata' is defined but never used.
- Line 417: 'contractId' is defined but never used.
- Line 417: 'metadata' is defined but never used.
- Line 422: 'contractId' is defined but never used.
- Line 422: 'metadata' is defined but never used.
- Line 427: 'contractId' is defined but never used.
- Line 427: 'metadata' is defined but never used.
- Line 432: 'contractId' is defined but never used.
- Line 432: 'metadata' is defined but never used.
- Line 437: 'contractId' is defined but never used.
- Line 437: 'metadata' is defined but never used.
- Line 442: 'contractId' is defined but never used.
- Line 442: 'metadata' is defined but never used.
- Line 447: 'contractId' is defined but never used.
- Line 447: 'metadata' is defined but never used.
- Line 452: 'contractId' is defined but never used.
- Line 452: 'metadata' is defined but never used.
- Line 457: 'contractId' is defined but never used.
- Line 457: 'metadata' is defined but never used.
- Line 462: 'contractId' is defined but never used.
- Line 462: 'metadata' is defined but never used.
- Line 467: 'contractId' is defined but never used.
- Line 467: 'metadata' is defined but never used.
- Line 472: 'contractId' is defined but never used.
- Line 477: 'contractId' is defined but never used.
- Line 477: 'metadata' is defined but never used.
- Line 482: 'contractId' is defined but never used.
- Line 482: 'metadata' is defined but never used.
- Line 487: 'contractId' is defined but never used.
- Line 492: 'contractId' is defined but never used.
- Line 492: 'metadata' is defined but never used.
- Line 497: 'contractId' is defined but never used.
- Line 497: 'metadata' is defined but never used.
- Line 502: 'contractId' is defined but never used.
- Line 507: 'contractId' is defined but never used.
- Line 512: 'contractId' is defined but never used.
- Line 517: 'contractId' is defined but never used.
- Line 517: 'metadata' is defined but never used.

#### src\components\finance\charts\EnhancedAccountsVisualization.tsx

- Line 8: 'Tooltip' is defined but never used.
- Line 8: 'TooltipContent' is defined but never used.
- Line 8: 'TooltipTrigger' is defined but never used.
- Line 9: 'Separator' is defined but never used.
- Line 10: 'Progress' is defined but never used.
- Line 27: 'Download' is defined but never used.
- Line 28: 'BarChart3' is defined but never used.
- Line 29: 'Settings' is defined but never used.
- Line 30: 'Keyboard' is defined but never used.
- Line 31: 'Zap' is defined but never used.
- Line 32: 'Clock' is defined but never used.
- Line 33: 'User' is defined but never used.
- Line 34: 'Calendar' is defined but never used.
- Line 35: 'ArrowUp' is defined but never used.
- Line 36: 'ArrowDown' is defined but never used.
- Line 38: 'Info' is defined but never used.
- Line 39: 'Sparkles' is defined but never used.
- Line 40: 'CheckCircle' is defined but never used.
- Line 42: 'Filter' is defined but never used.
- Line 43: 'SortAsc' is defined but never used.
- Line 44: 'SortDesc' is defined but never used.
- Line 59: 'DragOverEvent' is defined but never used.
- Line 65: 'AccountSummaryPanel' is defined but never used.
- Line 66: 'KeyboardShortcutsHelp' is defined but never used.
- Line 67: 'AccountTooltip' is defined but never used.
- Line 68: 'ExportAccountsUtility' is defined but never used.
- Line 101: 'setViewMode' is assigned a value but never used.
- Line 104: 'setSortBy' is assigned a value but never used.
- Line 107: 'setSortOrder' is assigned a value but never used.
- Line 112: 'dragPreview' is assigned a value but never used.
- Line 114: 'hoveredAccount' is assigned a value but never used.
- Line 114: 'setHoveredAccount' is assigned a value but never used.
- Line 118: 'showKeyboardHelp' is assigned a value but never used.
- Line 119: 'recentChanges' is assigned a value but never used.
- Line 127: 'treeContainerRef' is assigned a value but never used.
- Line 128: 'focusedNodeId' is assigned a value but never used.

#### src\components\finance\EnhancedChartOfAccountsManagement.tsx

- Line 3: 'Input' is defined but never used.
- Line 5: 'Select' is defined but never used.
- Line 5: 'SelectContent' is defined but never used.
- Line 5: 'SelectItem' is defined but never used.
- Line 5: 'SelectTrigger' is defined but never used.
- Line 5: 'SelectValue' is defined but never used.
- Line 6: 'Table' is defined but never used.
- Line 6: 'TableBody' is defined but never used.
- Line 6: 'TableHead' is defined but never used.
- Line 6: 'TableHeader' is defined but never used.
- Line 7: 'Card' is defined but never used.
- Line 7: 'CardContent' is defined but never used.
- Line 7: 'CardDescription' is defined but never used.
- Line 7: 'CardHeader' is defined but never used.
- Line 7: 'CardTitle' is defined but never used.
- Line 9: 'DialogTrigger' is defined but never used.
- Line 11: 'Switch' is defined but never used.
- Line 13: 'Search' is defined but never used.
- Line 13: 'FileText' is defined but never used.
- Line 13: 'CheckCircle' is defined but never used.
- Line 13: 'Settings' is defined but never used.
- Line 16: 'AccountBalanceHistory' is defined but never used.
- Line 19: 'ChartValidationPanel' is defined but never used.
- Line 48: 'setSearchTerm' is assigned a value but never used.
- Line 49: 'setFilterType' is assigned a value but never used.
- Line 50: 'setFilterLevel' is assigned a value but never used.
- Line 51: 'setFilterStatus' is assigned a value but never used.
- Line 52: 'setShowInactiveAccounts' is assigned a value but never used.
- Line 53: 'showForm' is assigned a value but never used.
- Line 72: 'authUser' is assigned a value but never used.
- Line 118: 'updateAccount' is assigned a value but never used.
- Line 124: 'childLevel' is assigned a value but never used.
- Line 253: 'handleCreateAccount' is assigned a value but never used.
- Line 289: 'buildAccountTree' is assigned a value but never used.
- Line 313: 'renderAccountRow' is assigned a value but never used.

#### src\components\customers\CustomerDetailsPageNew.tsx

- Line 17: 'useDeleteCustomerDocument' is defined but never used.
- Line 18: 'useDownloadCustomerDocument' is defined but never used.
- Line 20: 'CustomerActivity' is defined but never used.
- Line 20: 'AddActivityInput' is defined but never used.
- Line 29: 'Archive' is defined but never used.
- Line 32: 'Hash' is defined but never used.
- Line 34: 'Clock' is defined but never used.
- Line 50: 'Landmark' is defined but never used.
- Line 51: 'Banknote' is defined but never used.
- Line 52: 'Smartphone' is defined but never used.
- Line 53: 'ChevronRight' is defined but never used.
- Line 62: 'Globe' is defined but never used.
- Line 64: 'IdCard' is defined but never used.
- Line 66: 'MoreVertical' is defined but never used.
- Line 78: 'AvatarImage' is defined but never used.
- Line 79: 'Progress' is defined but never used.
- Line 87: 'DialogDescription' is defined but never used.
- Line 88: 'DialogFooter' is defined but never used.
- Line 93: 'AlertDialog' is defined but never used.
- Line 94: 'AlertDialogAction' is defined but never used.
- Line 95: 'AlertDialogCancel' is defined but never used.
- Line 96: 'AlertDialogContent' is defined but never used.
- Line 97: 'AlertDialogDescription' is defined but never used.
- Line 98: 'AlertDialogFooter' is defined but never used.
- Line 99: 'AlertDialogHeader' is defined but never used.
- Line 100: 'AlertDialogTitle' is defined but never used.
- Line 663: 'outstanding' is assigned a value but never used.
- Line 734: 'navigate' is defined but never used.
- Line 1450: 'companyId' is defined but never used.
- Line 1627: 'setSelectedDocumentType' is assigned a value but never used.
- Line 1628: 'isDeleteDialogOpen' is assigned a value but never used.
- Line 1628: 'setIsDeleteDialogOpen' is assigned a value but never used.
- Line 1811: 'error' is defined but never used.

#### src\components\contracts\ContractDetailsPageRedesigned.tsx

- Line 8: 'Fragment' is defined but never used.
- Line 10: 'useMutation' is defined but never used.
- Line 16: 'Download' is defined but never used.
- Line 26: 'CalendarCheck' is defined but never used.
- Line 27: 'CalendarX' is defined but never used.
- Line 29: 'ClipboardCheck' is defined but never used.
- Line 32: 'LogIn' is defined but never used.
- Line 33: 'LogOut' is defined but never used.
- Line 39: 'CheckCircle' is defined but never used.
- Line 41: 'Circle' is defined but never used.
- Line 44: 'Upload' is defined but never used.
- Line 47: 'ChevronDown' is defined but never used.
- Line 54: 'Dialog' is defined but never used.
- Line 54: 'DialogContent' is defined but never used.
- Line 54: 'DialogHeader' is defined but never used.
- Line 54: 'DialogTitle' is defined but never used.
- Line 54: 'DialogDescription' is defined but never used.
- Line 100: 'TURQUOISE' is assigned a value but never used.
- Line 101: 'TURQUOISE_DARK' is assigned a value but never used.
- Line 102: 'TURQUOISE_LIGHT' is assigned a value but never used.
- Line 298: 'formatCurrency' is defined but never used.
- Line 367: 'contractId' is defined but never used.
- Line 368: 'companyId' is defined but never used.
- Line 549: 'contractId' is defined but never used.
- Line 550: 'companyId' is defined but never used.

#### src\components\dashboard\bento\EnhancedBentoDashboard.tsx

- Line 1: 'useMemo' is defined but never used.
- Line 4: 'SkeletonWidget' is defined but never used.
- Line 7: 'useQueryClient' is defined but never used.
- Line 12: 'Sparkline' is defined but never used.
- Line 17: 'MobileOptimizedDashboard' is defined but never used.
- Line 25: 'TrendingDown' is defined but never used.
- Line 26: 'Wrench' is defined but never used.
- Line 27: 'AlertTriangle' is defined but never used.
- Line 28: 'Clock' is defined but never used.
- Line 29: 'Calendar' is defined but never used.
- Line 30: 'Brain' is defined but never used.
- Line 31: 'ArrowUp' is defined but never used.
- Line 38: 'ChevronLeft' is defined but never used.
- Line 39: 'ExternalLink' is defined but never used.
- Line 43: 'Smartphone' is defined but never used.
- Line 48: 'PieChart' is defined but never used.
- Line 49: 'Pie' is defined but never used.
- Line 50: 'Cell' is defined but never used.
- Line 153: 'activeFleetIndex' is assigned a value but never used.
- Line 153: 'setActiveFleetIndex' is assigned a value but never used.
- Line 186: 'fleetLoading' is assigned a value but never used.
- Line 209: 'maintenanceData' is assigned a value but never used.
- Line 257: 'occupancyRate' is assigned a value but never used.
- Line 266: 'fleetChartData' is assigned a value but never used.
- Line 288: 'weekDays' is assigned a value but never used.

#### src\pages\FinancialTracking.tsx

- Line 20: 'startOfMonth' is defined but never used.
- Line 20: 'endOfMonth' is defined but never used.
- Line 35: 'CustomerVehicle' is defined but never used.
- Line 53: 'DELAY_FINE_PER_DAY' is assigned a value but never used.
- Line 54: 'MAX_FINE_PER_MONTH' is assigned a value but never used.
- Line 65: 'companyId' is defined but never used.
- Line 67: 'selectedMonth' is assigned a value but never used.
- Line 376: 'user' is assigned a value but never used.
- Line 389: 'dateFilterEnabled' is assigned a value but never used.
- Line 389: 'setDateFilterEnabled' is assigned a value but never used.
- Line 390: 'startDate' is assigned a value but never used.
- Line 390: 'setStartDate' is assigned a value but never used.
- Line 391: 'endDate' is assigned a value but never used.
- Line 391: 'setEndDate' is assigned a value but never used.
- Line 456: 'eventType' is assigned a value but never used.
- Line 456: 'newRecord' is assigned a value but never used.
- Line 456: 'oldRecord' is assigned a value but never used.
- Line 508: 'loadingReceipts' is assigned a value but never used.
- Line 514: 'outstandingBalance' is assigned a value but never used.
- Line 514: 'loadingBalance' is assigned a value but never used.
- Line 517: 'loadingUnpaid' is assigned a value but never used.
- Line 618: 'formatDisplayDate' is assigned a value but never used.
- Line 1131: 'error' is defined but never used.
- Line 1492: 'stringifyError' is defined but never used.

#### src\components\admin\AuditLogViewer.tsx

- Line 9: 'Table' is defined but never used.
- Line 9: 'TableBody' is defined but never used.
- Line 9: 'TableCell' is defined but never used.
- Line 9: 'TableHead' is defined but never used.
- Line 9: 'TableHeader' is defined but never used.
- Line 9: 'TableRow' is defined but never used.
- Line 10: 'Dialog' is defined but never used.
- Line 10: 'DialogContent' is defined but never used.
- Line 10: 'DialogHeader' is defined but never used.
- Line 10: 'DialogTitle' is defined but never used.
- Line 11: 'ScrollArea' is defined but never used.
- Line 12: 'Skeleton' is defined but never used.
- Line 13: 'Alert' is defined but never used.
- Line 13: 'AlertDescription' is defined but never used.
- Line 16: 'Filter' is defined but never used.
- Line 26: 'Users' is defined but never used.
- Line 27: 'Car' is defined but never used.
- Line 28: 'Building2' is defined but never used.
- Line 29: 'CreditCard' is defined but never used.
- Line 30: 'BarChart3' is defined but never used.
- Line 31: 'Archive' is defined but never used.
- Line 32: 'CheckCircle' is defined but never used.
- Line 33: 'Info' is defined but never used.

#### src\components\super-admin\landing\LandingContentManager.tsx

- Line 5: 'Textarea' is defined but never used.
- Line 11: 'Tabs' is defined but never used.
- Line 11: 'TabsContent' is defined but never used.
- Line 11: 'TabsList' is defined but never used.
- Line 11: 'TabsTrigger' is defined but never used.
- Line 12: 'Globe' is defined but never used.
- Line 12: 'Languages' is defined but never used.
- Line 12: 'FileText' is defined but never used.
- Line 12: 'Image' is defined but never used.
- Line 12: 'Video' is defined but never used.
- Line 12: 'Link2' is defined but never used.
- Line 31: 'content' is assigned a value but never used.
- Line 31: 'contentLoading' is assigned a value but never used.
- Line 31: 'createContent' is assigned a value but never used.
- Line 31: 'updateContent' is assigned a value but never used.
- Line 31: 'deleteContent' is assigned a value but never used.
- Line 36: 'activeTab' is assigned a value but never used.
- Line 36: 'setActiveTab' is assigned a value but never used.
- Line 58: 'error' is defined but never used.
- Line 69: 'error' is defined but never used.
- Line 79: 'error' is defined but never used.
- Line 104: 'error' is defined but never used.

#### src\components\contracts\ContractDetailsPage.tsx

- Line 8: 'useEffect' is defined but never used.
- Line 10: 'useMutation' is defined but never used.
- Line 40: 'Upload' is defined but never used.
- Line 41: 'IdCard' is defined but never used.
- Line 42: 'FileBadge' is defined but never used.
- Line 43: 'PlusCircle' is defined but never used.
- Line 66: 'Alert' is defined but never used.
- Line 66: 'AlertDescription' is defined but never used.
- Line 119: 'isEditDialogOpen' is assigned a value but never used.
- Line 119: 'setIsEditDialogOpen' is assigned a value but never used.
- Line 441: 'handleInvoiceDownload' is assigned a value but never used.
- Line 444: 'exportToPDF' is assigned a value but never used.
- Line 472: 'handleInvoicePrint' is assigned a value but never used.
- Line 628: 'getStatusColor' is assigned a value but never used.
- Line 639: 'getStatusText' is assigned a value but never used.
- Line 650: 'getPaymentStatusColor' is assigned a value but never used.
- Line 660: 'getPaymentStatusText' is assigned a value but never used.
- Line 2334: 'getPaymentStatusLabel' is assigned a value but never used.
- Line 2344: 'getPaymentStatusColor' is assigned a value but never used.
- Line 2729: 'TimelineTab' is assigned a value but never used.

#### src\components\payments\PaymentPlansManager.tsx

- Line 15: 'useMutation' is defined but never used.
- Line 19: 'CardDescription' is defined but never used.
- Line 51: 'Calendar' is defined but never used.
- Line 52: 'DollarSign' is defined but never used.
- Line 54: 'XCircle' is defined but never used.
- Line 55: 'Clock' is defined but never used.
- Line 58: 'Phone' is defined but never used.
- Line 59: 'Mail' is defined but never used.
- Line 60: 'MessageSquare' is defined but never used.
- Line 61: 'User' is defined but never used.
- Line 63: 'TrendingUp' is defined but never used.
- Line 70: 'addDays' is defined but never used.
- Line 70: 'differenceInDays' is defined but never used.
- Line 70: 'isBefore' is defined but never used.
- Line 70: 'isAfter' is defined but never used.
- Line 114: 'user' is assigned a value but never used.
- Line 118: 'selectedPromise' is assigned a value but never used.
- Line 118: 'setSelectedPromise' is assigned a value but never used.
- Line 122: 'setPromises' is assigned a value but never used.
- Line 138: 'setPlans' is assigned a value but never used.

#### src\hooks\useUnifiedReports.ts

- Line 33: 'employeesCount' is assigned a value but never used.
- Line 34: 'vehiclesCount' is assigned a value but never used.
- Line 35: 'customersCount' is assigned a value but never used.
- Line 36: 'contractsCount' is assigned a value but never used.
- Line 37: 'invoicesCount' is assigned a value but never used.
- Line 38: 'legalCasesCount' is assigned a value but never used.
- Line 131: 'companyId' is defined but never used.
- Line 131: 'filters' is defined but never used.
- Line 145: 'reportId' is defined but never used.
- Line 145: 'companyId' is defined but never used.
- Line 145: 'filters' is defined but never used.
- Line 150: 'reportId' is defined but never used.
- Line 150: 'companyId' is defined but never used.
- Line 150: 'filters' is defined but never used.
- Line 155: 'reportId' is defined but never used.
- Line 155: 'companyId' is defined but never used.
- Line 155: 'filters' is defined but never used.
- Line 160: 'reportId' is defined but never used.
- Line 160: 'companyId' is defined but never used.
- Line 160: 'filters' is defined but never used.

#### src\components\analytics\SmartAnalyticsPanel.tsx

- Line 8: 'LineChart' is defined but never used.
- Line 8: 'Line' is defined but never used.
- Line 8: 'PieChart' is defined but never used.
- Line 8: 'Pie' is defined but never used.
- Line 8: 'Cell' is defined but never used.
- Line 8: 'AreaChart' is defined but never used.
- Line 8: 'Area' is defined but never used.
- Line 15: 'BarChart3' is defined but never used.
- Line 17: 'DollarSign' is defined but never used.
- Line 18: 'Zap' is defined but never used.
- Line 20: 'Clock' is defined but never used.
- Line 23: 'XCircle' is defined but never used.
- Line 27: 'RiskIndicator' is defined but never used.
- Line 27: 'PredictiveInsight' is defined but never used.
- Line 29: 'StatCardPercentage' is defined but never used.
- Line 87: 'monitorRisks' is assigned a value but never used.
- Line 88: 'getBenchmarks' is assigned a value but never used.
- Line 89: 'forecastTrends' is assigned a value but never used.
- Line 92: 'clearError' is assigned a value but never used.

#### src\components\finance\wizard\AccountsMapping.tsx

- Line 2: 'CardContent' is defined but never used.
- Line 2: 'CardDescription' is defined but never used.
- Line 2: 'CardHeader' is defined but never used.
- Line 2: 'CardTitle' is defined but never used.
- Line 5: 'Tabs' is defined but never used.
- Line 5: 'TabsContent' is defined but never used.
- Line 5: 'TabsList' is defined but never used.
- Line 5: 'TabsTrigger' is defined but never used.
- Line 6: 'Input' is defined but never used.
- Line 7: 'useToast' is defined but never used.
- Line 8: 'useUnifiedCompanyAccess' is defined but never used.
- Line 10: 'Download' is defined but never used.
- Line 11: 'FileText' is defined but never used.
- Line 12: 'CheckCircle' is defined but never used.
- Line 13: 'AlertTriangle' is defined but never used.
- Line 14: 'Clock' is defined but never used.
- Line 15: 'Building' is defined but never used.
- Line 16: 'Users' is defined but never used.

#### src\components\legal\DelinquentCustomersTab.tsx

- Line 9: 'Card' is defined but never used.
- Line 9: 'CardContent' is defined but never used.
- Line 21: 'Table' is defined but never used.
- Line 22: 'TableBody' is defined but never used.
- Line 23: 'TableCell' is defined but never used.
- Line 24: 'TableHead' is defined but never used.
- Line 25: 'TableHeader' is defined but never used.
- Line 26: 'TableRow' is defined but never used.
- Line 30: 'DropdownMenu' is defined but never used.
- Line 31: 'DropdownMenuContent' is defined but never used.
- Line 32: 'DropdownMenuItem' is defined but never used.
- Line 33: 'DropdownMenuSeparator' is defined but never used.
- Line 34: 'DropdownMenuTrigger' is defined but never used.
- Line 44: 'TrendingUp' is defined but never used.
- Line 48: 'MoreVertical' is defined but never used.
- Line 185: 'RiskBadge' is assigned a value but never used.
- Line 346: 'handleCreateCase' is assigned a value but never used.
- Line 989: 'color' is defined but never used.

#### src\pages\legal\LegalCasesTracking.tsx

- Line 67: 'Tabs' is defined but never used.
- Line 67: 'TabsContent' is defined but never used.
- Line 67: 'TabsList' is defined but never used.
- Line 67: 'TabsTrigger' is defined but never used.
- Line 72: 'Alert' is defined but never used.
- Line 72: 'AlertDescription' is defined but never used.
- Line 79: 'AlertCircle' is defined but never used.
- Line 90: 'Car' is defined but never used.
- Line 94: 'Printer' is defined but never used.
- Line 96: 'ChevronLeft' is defined but never used.
- Line 97: 'ChevronRight' is defined but never used.
- Line 108: 'addDays' is defined but never used.
- Line 652: 'error' is assigned a value but never used.
- Line 662: 'isLoadingStats' is assigned a value but never used.
- Line 1287: 'pastHearings' is assigned a value but never used.
- Line 1433: 'i' is defined but never used.
- Line 1471: 'collectionStats' is assigned a value but never used.
- Line 1762: 'document' is defined but never used.

#### src\components\dashboard\customization\MobileEnhancements.tsx

- Line 4: 'Smartphone' is defined but never used.
- Line 5: 'Tablet' is defined but never used.
- Line 6: 'Monitor' is defined but never used.
- Line 10: 'ChevronDown' is defined but never used.
- Line 11: 'ChevronUp' is defined but never used.
- Line 12: 'Bell' is defined but never used.
- Line 14: 'Search' is defined but never used.
- Line 19: 'Grid3x3' is defined but never used.
- Line 20: 'BarChart3' is defined but never used.
- Line 35: 'MOBILE_PERFORMANCE_SETTINGS' is assigned a value but never used.
- Line 164: 'onToggle' is defined but never used.
- Line 206: 'user' is assigned a value but never used.
- Line 208: 'isLoading' is assigned a value but never used.
- Line 208: 'error' is assigned a value but never used.
- Line 208: 'refetch' is assigned a value but never used.
- Line 217: 'searchQuery' is assigned a value but never used.
- Line 217: 'setSearchQuery' is assigned a value but never used.

#### src\pages\ContractsRedesigned.tsx

- Line 1: 'useLayoutEffect' is defined but never used.
- Line 12: 'Filter' is defined but never used.
- Line 18: 'Calendar' is defined but never used.
- Line 19: 'User' is defined but never used.
- Line 25: 'Eye' is defined but never used.
- Line 38: 'BulkInvoiceGenerationDialog' is defined but never used.
- Line 77: 'draftIdToLoad' is assigned a value but never used.
- Line 94: 'showMobileFilters' is assigned a value but never used.
- Line 94: 'setShowMobileFilters' is assigned a value but never used.
- Line 96: 'setPageSize' is assigned a value but never used.
- Line 117: 'isCreating' is assigned a value but never used.
- Line 119: 'formatCurrencyAmount' is assigned a value but never used.
- Line 148: 'isFetching' is assigned a value but never used.
- Line 148: 'pagination' is assigned a value but never used.
- Line 283: 'handleManageStatus' is assigned a value but never used.
- Line 309: 'handleDeleteContract' is assigned a value but never used.
- Line 336: 'error' is defined but never used.

#### src\components\payments\QuickPaymentRecording.tsx

- Line 4: 'startOfMonth' is defined but never used.
- Line 4: 'endOfMonth' is defined but never used.
- Line 4: 'addMonths' is defined but never used.
- Line 4: 'isBefore' is defined but never used.
- Line 4: 'isWithinInterval' is defined but never used.
- Line 16: 'generateReceiptPDF' is defined but never used.
- Line 16: 'downloadPDF' is defined but never used.
- Line 67: 'isCreating' is assigned a value but never used.
- Line 76: 'navigate' is assigned a value but never used.
- Line 107: 'amountError' is assigned a value but never used.
- Line 107: 'setAmountError' is assigned a value but never used.
- Line 117: 'setDateRange' is assigned a value but never used.
- Line 118: 'setPaymentStatusFilter' is assigned a value but never used.
- Line 119: 'showFilters' is assigned a value but never used.
- Line 119: 'setShowFilters' is assigned a value but never used.
- Line 139: 'exportSelectedInvoices' is assigned a value but never used.

#### src\hooks\useFinancialObligations.ts

- Line 62: 'companyId' is assigned a value but never used.
- Line 74: 'companyId' is assigned a value but never used.
- Line 86: 'companyId' is assigned a value but never used.
- Line 112: 'companyId' is assigned a value but never used.
- Line 115: 'contractId' is defined but never used.
- Line 138: 'companyId' is assigned a value but never used.
- Line 142: 'paymentId' is defined but never used.
- Line 143: 'customerId' is defined but never used.
- Line 144: 'amount' is defined but never used.
- Line 145: 'strategy' is assigned a value but never used.
- Line 184: 'paymentId' is defined but never used.
- Line 185: 'allocations' is defined but never used.
- Line 219: 'companyId' is assigned a value but never used.
- Line 225: 'paidAmount' is defined but never used.
- Line 226: 'notes' is defined but never used.
- Line 257: 'companyId' is assigned a value but never used.

#### src\lib\api-monitoring\analytics.ts

- Line 8: 'APIEndpoint' is defined but never used.
- Line 245: 'timeRange' is defined but never used.
- Line 306: 'timeRange' is defined but never used.
- Line 337: 'timeRange' is defined but never used.
- Line 338: 'endpoints' is defined but never used.
- Line 366: 'endpoints' is defined but never used.
- Line 439: 'errors' is defined but never used.
- Line 440: 'categories' is assigned a value but never used.
- Line 452: 'errors' is defined but never used.
- Line 453: 'statusGroups' is assigned a value but never used.
- Line 466: 'errors' is defined but never used.
- Line 747: 'timeRange' is defined but never used.
- Line 747: 'endpoints' is defined but never used.
- Line 756: 'timeRange' is defined but never used.
- Line 756: 'endpoints' is defined but never used.
- Line 762: 'timeRange' is defined but never used.

#### src\pages\finance\FinancialAnalysis.tsx

- Line 6: 'AnimatePresence' is defined but never used.
- Line 7: 'Card' is defined but never used.
- Line 7: 'CardContent' is defined but never used.
- Line 7: 'CardDescription' is defined but never used.
- Line 7: 'CardHeader' is defined but never used.
- Line 7: 'CardTitle' is defined but never used.
- Line 17: 'Calculator' is defined but never used.
- Line 30: 'CheckCircle2' is defined but never used.
- Line 31: 'Clock' is defined but never used.
- Line 32: 'ChevronRight' is defined but never used.
- Line 34: 'LoadingSpinner' is defined but never used.
- Line 54: 'StatCard' is assigned a value but never used.
- Line 104: 'AnalysisCard' is assigned a value but never used.
- Line 108: 'trend' is assigned a value but never used.
- Line 140: 'balanceSheetData' is assigned a value but never used.
- Line 141: 'incomeStatementData' is assigned a value but never used.

#### src\pages\finance\GeneralAccounting.tsx

- Line 6: 'useState' is defined but never used.
- Line 8: 'AnimatePresence' is defined but never used.
- Line 13: 'Progress' is defined but never used.
- Line 20: 'RefreshCw' is defined but never used.
- Line 24: 'Wallet' is defined but never used.
- Line 25: 'BarChart3' is defined but never used.
- Line 26: 'CheckCircle2' is defined but never used.
- Line 27: 'Clock' is defined but never used.
- Line 28: 'DollarSign' is defined but never used.
- Line 29: 'Building2' is defined but never used.
- Line 30: 'PieChart' is defined but never used.
- Line 31: 'Activity' is defined but never used.
- Line 126: 'accountsLoading' is assigned a value but never used.
- Line 127: 'entriesLoading' is assigned a value but never used.
- Line 181: 'activeTabConfig' is assigned a value but never used.
- Line 285: 'index' is defined but never used.

#### src\pages\fleet\MaintenanceRedesigned.tsx

- Line 8: 'useCallback' is defined but never used.
- Line 11: 'AnimatePresence' is defined but never used.
- Line 29: 'LoadingSpinner' is defined but never used.
- Line 35: 'Edit' is defined but never used.
- Line 48: 'Filter' is defined but never used.
- Line 55: 'useVehicleStatusUpdate' is defined but never used.
- Line 55: 'useScheduleMaintenanceStatus' is defined but never used.
- Line 59: 'supabase' is defined but never used.
- Line 138: 'onCancel' is defined but never used.
- Line 171: 'navigate' is assigned a value but never used.
- Line 206: 'maintenanceVehicles' is assigned a value but never used.
- Line 206: 'maintenanceVehiclesLoading' is assigned a value but never used.
- Line 214: 'formatCurrency' is assigned a value but never used.
- Line 259: 'error' is defined but never used.
- Line 272: 'error' is defined but never used.
- Line 284: 'error' is defined but never used.

#### src\components\contracts\EnhancedContractDashboard.tsx

- Line 41: 'Settings' is defined but never used.
- Line 43: 'Edit' is defined but never used.
- Line 45: 'Pause' is defined but never used.
- Line 47: 'PieChart' is defined but never used.
- Line 50: 'Users' is defined but never used.
- Line 51: 'Calendar' is defined but never used.
- Line 53: 'Zap' is defined but never used.
- Line 54: 'Database' is defined but never used.
- Line 55: 'GitBranch' is defined but never used.
- Line 56: 'FileCheck' is defined but never used.
- Line 84: 'analytics' is assigned a value but never used.
- Line 98: 'generateAnalytics' is assigned a value but never used.
- Line 104: 'workflowEngine' is assigned a value but never used.
- Line 105: 'complianceEngine' is assigned a value but never used.
- Line 106: 'analyticsEngine' is assigned a value but never used.

#### src\components\invoices\InvoiceDisputeManagement.tsx

- Line 15: 'useMutation' is defined but never used.
- Line 21: 'Input' is defined but never used.
- Line 22: 'Textarea' is defined but never used.
- Line 24: 'DialogTrigger' is defined but never used.
- Line 24: 'DialogFooter' is defined but never used.
- Line 25: 'Label' is defined but never used.
- Line 26: 'Tabs' is defined but never used.
- Line 26: 'TabsContent' is defined but never used.
- Line 26: 'TabsList' is defined but never used.
- Line 26: 'TabsTrigger' is defined but never used.
- Line 34: 'TrendingUp' is defined but never used.
- Line 36: 'XCircle' is defined but never used.
- Line 37: 'AlertTriangle' is defined but never used.
- Line 74: 'toast' is assigned a value but never used.
- Line 75: 'queryClient' is assigned a value but never used.

#### src\lib\reminderTemplates.ts

- Line 9: 'addDays' is defined but never used.
- Line 9: 'isWeekend' is defined but never used.
- Line 155: 'error' is defined but never used.
- Line 211: 'companyName' is defined but never used.
- Line 406: 'companyId' is defined but never used.
- Line 407: 'filters' is defined but never used.
- Line 433: 'template' is defined but never used.
- Line 438: 'templateId' is defined but never used.
- Line 439: 'updates' is defined but never used.
- Line 444: 'templateId' is defined but never used.
- Line 448: 'companyId' is defined but never used.
- Line 454: 'companyId' is defined but never used.
- Line 455: 'filters' is defined but never used.
- Line 469: 'companyId' is defined but never used.
- Line 470: 'templateId' is defined but never used.

#### src\pages\dashboards\DashboardV2.tsx

- Line 3: 'AnimatePresence' is defined but never used.
- Line 18: 'Clock' is defined but never used.
- Line 19: 'AlertTriangle' is defined but never used.
- Line 21: 'ArrowRight' is defined but never used.
- Line 22: 'Calendar' is defined but never used.
- Line 25: 'Search' is defined but never used.
- Line 31: 'PieChart' is defined but never used.
- Line 35: 'ArrowUpRight' is defined but never used.
- Line 38: 'Shield' is defined but never used.
- Line 46: 'BarChart' is defined but never used.
- Line 47: 'Bar' is defined but never used.
- Line 48: 'LineChart' is defined but never used.
- Line 49: 'Line' is defined but never used.
- Line 58: 'Legend' is defined but never used.
- Line 229: 'ActivityItem' is assigned a value but never used.

#### src\pages\PaymentRegistration.tsx

- Line 29: 'Calendar' is defined but never used.
- Line 70: 'showAdvancedSearch' is assigned a value but never used.
- Line 70: 'setShowAdvancedSearch' is assigned a value but never used.
- Line 71: 'advancedSearch' is assigned a value but never used.
- Line 71: 'setAdvancedSearch' is assigned a value but never used.
- Line 79: 'setVisibleColumns' is assigned a value but never used.
- Line 157: 'setCurrentPage' is assigned a value but never used.
- Line 158: 'setItemsPerPage' is assigned a value but never used.
- Line 166: 'setSortBy' is assigned a value but never used.
- Line 205: 'isMobileView' is assigned a value but never used.
- Line 205: 'setIsMobileView' is assigned a value but never used.
- Line 537: 'data' is assigned a value but never used.
- Line 559: 'filteredAndSortedContracts' is assigned a value but never used.
- Line 632: 'paidCount' is assigned a value but never used.
- Line 633: 'pendingCount' is assigned a value but never used.

#### src\pages\Reports.tsx

- Line 1: 'useCallback' is defined but never used.
- Line 5: 'Badge' is defined but never used.
- Line 10: 'Calendar' is defined but never used.
- Line 11: 'TrendingUp' is defined but never used.
- Line 12: 'Users' is defined but never used.
- Line 13: 'Car' is defined but never used.
- Line 14: 'DollarSign' is defined but never used.
- Line 15: 'Building' is defined but never used.
- Line 16: 'Scale' is defined but never used.
- Line 17: 'AlertTriangle' is defined but never used.
- Line 37: 'isTablet' is assigned a value but never used.
- Line 37: 'isDesktop' is assigned a value but never used.
- Line 67: 'reportsData' is assigned a value but never used.
- Line 67: 'isLoading' is assigned a value but never used.

#### src\components\navigation\CarRentalSidebar.tsx

- Line 15: 'Calculator' is defined but never used.
- Line 16: 'Receipt' is defined but never used.
- Line 18: 'Building' is defined but never used.
- Line 19: 'Target' is defined but never used.
- Line 20: 'PieChart' is defined but never used.
- Line 22: 'BookOpen' is defined but never used.
- Line 23: 'Landmark' is defined but never used.
- Line 30: 'Link' is defined but never used.
- Line 32: 'Zap' is defined but never used.
- Line 33: 'Activity' is defined but never used.
- Line 34: 'Wallet' is defined but never used.
- Line 35: 'Package' is defined but never used.
- Line 181: 'isActive' is assigned a value but never used.

#### src\hooks\useEnhancedSmartAlerts.ts

- Line 52: 'companyId' is assigned a value but never used.
- Line 67: 'companyId' is assigned a value but never used.
- Line 80: 'companyId' is assigned a value but never used.
- Line 109: 'data' is defined but never used.
- Line 125: 'alertId' is defined but never used.
- Line 129: 'success' is defined but never used.
- Line 129: 'alertId' is defined but never used.
- Line 143: 'companyId' is assigned a value but never used.
- Line 156: 'data' is defined but never used.
- Line 170: 'companyId' is assigned a value but never used.
- Line 176: 'triggerConditions' is defined but never used.
- Line 177: 'notificationSettings' is defined but never used.
- Line 200: 'companyId' is assigned a value but never used.

#### src\pages\legal\LawsuitPreparation.tsx

- Line 14: 'Separator' is defined but never used.
- Line 28: 'DollarSign' is defined but never used.
- Line 29: 'Building2' is defined but never used.
- Line 31: 'FileCheck' is defined but never used.
- Line 52: 'DAILY_LATE_FEE' is defined but never used.
- Line 53: 'DAMAGES_FEE' is defined but never used.
- Line 58: 'DOCUMENT_TYPE_NAMES' is defined but never used.
- Line 104: 'isAutomating' is assigned a value but never used.
- Line 429: 'error' is defined but never used.
- Line 524: 'vehicle' is assigned a value but never used.
- Line 555: 'startAutomation' is assigned a value but never used.
- Line 655: 'error' is defined but never used.
- Line 858: 'result' is assigned a value but never used.

#### src\lib\contract-analytics.ts

- Line 15: 'startOfYear' is defined but never used.
- Line 16: 'endOfYear' is defined but never used.
- Line 18: 'subWeeks' is defined but never used.
- Line 20: 'subYears' is defined but never used.
- Line 21: 'differenceInDays' is defined but never used.
- Line 22: 'differenceInWeeks' is defined but never used.
- Line 23: 'differenceInMonths' is defined but never used.
- Line 24: 'differenceInYears' is defined but never used.
- Line 468: 'contracts' is defined but never used.
- Line 479: 'period' is defined but never used.
- Line 861: 'contract' is defined but never used.
- Line 934: 'addYears' is defined but never used.

#### src\pages\fleet\Maintenance.tsx

- Line 15: 'Plus' is defined but never used.
- Line 19: 'Edit' is defined but never used.
- Line 32: 'supabase' is defined but never used.
- Line 33: 'cn' is defined but never used.
- Line 95: 'selectedMaintenanceId' is assigned a value but never used.
- Line 95: 'setSelectedMaintenanceId' is assigned a value but never used.
- Line 123: 'maintenanceVehiclesLoading' is assigned a value but never used.
- Line 131: 'formatCurrency' is assigned a value but never used.
- Line 132: 'completeMaintenanceStatus' is assigned a value but never used.
- Line 133: 'vehicleStatusUpdate' is assigned a value but never used.
- Line 134: 'scheduleMaintenanceStatus' is assigned a value but never used.
- Line 136: 'updateMaintenance' is assigned a value but never used.

#### src\pages\fleet\Reservations.tsx

- Line 12: 'Badge' is defined but never used.
- Line 16: 'Select' is defined but never used.
- Line 17: 'SelectContent' is defined but never used.
- Line 18: 'SelectItem' is defined but never used.
- Line 19: 'SelectTrigger' is defined but never used.
- Line 20: 'SelectValue' is defined but never used.
- Line 22: 'LoadingSpinner' is defined but never used.
- Line 32: 'User' is defined but never used.
- Line 41: 'AlertCircle' is defined but never used.
- Line 44: 'MapPin' is defined but never used.
- Line 48: 'useVehicleStatusUpdate' is defined but never used.
- Line 51: 'supabase' is defined but never used.

#### src\pages\fleet\TrafficViolationsRedesigned.tsx

- Line 8: 'FileText' is defined but never used.
- Line 9: 'DollarSign' is defined but never used.
- Line 24: 'Gavel' is defined but never used.
- Line 28: 'Card' is defined but never used.
- Line 28: 'CardContent' is defined but never used.
- Line 28: 'CardDescription' is defined but never used.
- Line 28: 'CardHeader' is defined but never used.
- Line 28: 'CardTitle' is defined but never used.
- Line 29: 'Badge' is defined but never used.
- Line 188: 'error' is defined but never used.
- Line 194: 'handleMarkAsPaid' is assigned a value but never used.
- Line 201: 'error' is defined but never used.

#### src\components\contracts\SmartSuggestions.tsx

- Line 2: 'Card' is defined but never used.
- Line 2: 'CardContent' is defined but never used.
- Line 2: 'CardHeader' is defined but never used.
- Line 2: 'CardTitle' is defined but never used.
- Line 3: 'Button' is defined but never used.
- Line 4: 'Badge' is defined but never used.
- Line 5: 'AlertTriangle' is defined but never used.
- Line 21: 'getSuggestionIcon' is assigned a value but never used.
- Line 36: 'getPriorityColor' is assigned a value but never used.
- Line 50: 'suggestions' is defined but never used.
- Line 51: 'onApplySuggestion' is defined but never used.

#### src\components\customers\CustomerImportWizard.tsx

- Line 15: 'CardDescription' is defined but never used.
- Line 18: 'Progress' is defined but never used.
- Line 35: 'XCircle' is defined but never used.
- Line 87: 'onComplete' is defined but never used.
- Line 95: 'progress' is assigned a value but never used.
- Line 100: 'customerFieldTypes' is assigned a value but never used.
- Line 100: 'customerRequiredFields' is assigned a value but never used.
- Line 125: 'idx' is defined but never used.
- Line 142: 'error' is defined but never used.
- Line 270: 'error' is defined but never used.
- Line 305: 'i' is defined but never used.

#### src\components\customers\CustomerSplitView.tsx

- Line 18: 'Building2' is defined but never used.
- Line 22: 'Calendar' is defined but never used.
- Line 24: 'CreditCard' is defined but never used.
- Line 26: 'TrendingUp' is defined but never used.
- Line 27: 'AlertTriangle' is defined but never used.
- Line 28: 'CheckCircle' is defined but never used.
- Line 29: 'XCircle' is defined but never used.
- Line 38: 'format' is defined but never used.
- Line 39: 'ar' is defined but never used.
- Line 84: 'customerDetails' is assigned a value but never used.
- Line 84: 'detailsLoading' is assigned a value but never used.

#### src\components\dashboard\QuickActionsDashboard.tsx

- Line 4: 'CardHeader' is defined but never used.
- Line 4: 'CardTitle' is defined but never used.
- Line 5: 'Button' is defined but never used.
- Line 8: 'Plus' is defined but never used.
- Line 18: 'Zap' is defined but never used.
- Line 42: 'user' is assigned a value but never used.
- Line 146: 'availableRecentActions' is assigned a value but never used.
- Line 185: 'customer' is defined but never used.
- Line 195: 'handleContractCreated' is assigned a value but never used.
- Line 195: 'contract' is defined but never used.
- Line 200: 'ActionButton' is assigned a value but never used.

#### src\components\finance\charts\AccountTemplateManager.tsx

- Line 5: 'Tabs' is defined but never used.
- Line 5: 'TabsContent' is defined but never used.
- Line 5: 'TabsList' is defined but never used.
- Line 5: 'TabsTrigger' is defined but never used.
- Line 10: 'FileText' is defined but never used.
- Line 15: 'Users' is defined but never used.
- Line 35: 'getAccountsByType' is assigned a value but never used.
- Line 45: 'copyDefaultAccounts' is assigned a value but never used.
- Line 51: 'existingAccounts' is assigned a value but never used.
- Line 103: 'stats' is assigned a value but never used.
- Line 104: 'metadata' is assigned a value but never used.

#### src\components\finance\MonthlyRentTracker.tsx

- Line 7: 'Card' is defined but never used.
- Line 7: 'CardContent' is defined but never used.
- Line 12: 'Progress' is defined but never used.
- Line 34: 'CalendarDays' is defined but never used.
- Line 35: 'Wallet' is defined but never used.
- Line 36: 'DollarSign' is defined but never used.
- Line 37: 'ArrowLeft' is defined but never used.
- Line 41: 'ChevronDown' is defined but never used.
- Line 116: 'navigate' is assigned a value but never used.
- Line 124: 'setDateFilter' is assigned a value but never used.
- Line 231: 'selectedMonthName' is assigned a value but never used.

#### src\components\payments\ReminderTemplatesManager.tsx

- Line 12: 'CardDescription' is defined but never used.
- Line 38: 'Tabs' is defined but never used.
- Line 39: 'TabsContent' is defined but never used.
- Line 40: 'TabsList' is defined but never used.
- Line 41: 'TabsTrigger' is defined but never used.
- Line 52: 'Play' is defined but never used.
- Line 53: 'BarChart3' is defined but never used.
- Line 57: 'AlertCircle' is defined but never used.
- Line 155: 'getChannelIcon' is assigned a value but never used.
- Line 165: 'getStageBadgeColor' is assigned a value but never used.
- Line 175: 'getToneBadgeColor' is assigned a value but never used.

#### src\components\RealWorldTestingInfrastructure.tsx

- Line 12: 'Textarea' is defined but never used.
- Line 13: 'Label' is defined but never used.
- Line 14: 'Input' is defined but never used.
- Line 17: 'Separator' is defined but never used.
- Line 24: 'CheckCircle' is defined but never used.
- Line 25: 'XCircle' is defined but never used.
- Line 27: 'TrendingUp' is defined but never used.
- Line 29: 'Users' is defined but never used.
- Line 35: 'Eye' is defined but never used.
- Line 36: 'ThumbsUp' is defined but never used.
- Line 37: 'ThumbsDown' is defined but never used.

#### src\hooks\useEnhancedCustomers.ts

- Line 12: 'filter' is assigned a value but never used.
- Line 19: 'error' is defined but never used.
- Line 103: 'validateCompanyAccess' is assigned a value but never used.
- Line 103: 'browsedCompany' is assigned a value but never used.
- Line 103: 'isBrowsingMode' is assigned a value but never used.
- Line 103: 'filter' is assigned a value but never used.
- Line 110: 'error' is defined but never used.
- Line 344: 'error' is defined but never used.
- Line 399: 'companyId' is assigned a value but never used.
- Line 825: 'validateCompanyAccess' is assigned a value but never used.
- Line 835: '_' is defined but never used.

#### src\pages\finance\ReportsAndAnalysis.tsx

- Line 8: 'AnimatePresence' is defined but never used.
- Line 13: 'Progress' is defined but never used.
- Line 24: 'PieChart' is defined but never used.
- Line 25: 'RefreshCw' is defined but never used.
- Line 26: 'Download' is defined but never used.
- Line 27: 'Activity' is defined but never used.
- Line 30: 'Sparkles' is defined but never used.
- Line 31: 'LineChart' is defined but never used.
- Line 32: 'LayoutGrid' is defined but never used.
- Line 128: 'isLoading' is assigned a value but never used.
- Line 293: 'index' is defined but never used.

#### src\pages\finance\Treasury.tsx

- Line 8: 'Card' is defined but never used.
- Line 8: 'CardContent' is defined but never used.
- Line 8: 'CardDescription' is defined but never used.
- Line 8: 'CardHeader' is defined but never used.
- Line 8: 'CardTitle' is defined but never used.
- Line 19: 'Progress' is defined but never used.
- Line 24: 'CreditCard' is defined but never used.
- Line 33: 'Wallet' is defined but never used.
- Line 34: 'PiggyBank' is defined but never used.
- Line 39: 'DollarSign' is defined but never used.
- Line 43: 'LoadingSpinner' is defined but never used.

#### src\pages\fleet\FleetPageRedesigned.tsx

- Line 8: 'useMemo' is defined but never used.
- Line 8: 'useCallback' is defined but never used.
- Line 25: 'Eye' is defined but never used.
- Line 31: 'AlertTriangle' is defined but never used.
- Line 32: 'CheckCircle' is defined but never used.
- Line 33: 'Clock' is defined but never used.
- Line 34: 'Fuel' is defined but never used.
- Line 46: 'Calendar' is defined but never used.
- Line 47: 'MapPin' is defined but never used.
- Line 424: 'error' is defined but never used.
- Line 463: 'handleSelectAll' is assigned a value but never used.

#### src\pages\help\HelpHub.tsx

- Line 7: 'ScrollArea' is defined but never used.
- Line 8: 'Separator' is defined but never used.
- Line 24: 'Settings' is defined but never used.
- Line 29: 'Calendar' is defined but never used.
- Line 30: 'Target' is defined but never used.
- Line 34: 'Eye' is defined but never used.
- Line 37: 'Download' is defined but never used.
- Line 38: 'Play' is defined but never used.
- Line 39: 'ChevronRight' is defined but never used.
- Line 40: 'Lightbulb' is defined but never used.
- Line 43: 'Filter' is defined but never used.

#### src\test\mobile\MobileTestingSuite.tsx

- Line 1: 'useEffect' is defined but never used.
- Line 20: 'Clock' is defined but never used.
- Line 25: 'Upload' is defined but never used.
- Line 26: 'Zap' is defined but never used.
- Line 30: 'FileText' is defined but never used.
- Line 87: 'getSessionInfo' is assigned a value but never used.
- Line 610: 'originalBattery' is assigned a value but never used.
- Line 640: 'error' is defined but never used.
- Line 716: 'e' is defined but never used.
- Line 717: 'e' is defined but never used.
- Line 1108: 'index' is defined but never used.

#### src\components\finance\FinanceSystemDiagnostics.tsx

- Line 4: 'Badge' is defined but never used.
- Line 12: 'User' is defined but never used.
- Line 13: 'Building' is defined but never used.
- Line 14: 'Shield' is defined but never used.
- Line 15: 'Database' is defined but never used.
- Line 34: 'moduleLoading' is assigned a value but never used.
- Line 78: 'error' is defined but never used.
- Line 109: 'error' is defined but never used.
- Line 120: 'data' is assigned a value but never used.
- Line 131: 'error' is defined but never used.

#### src\components\IntelligentInvoiceScanner.tsx

- Line 10: 'Alert' is defined but never used.
- Line 10: 'AlertDescription' is defined but never used.
- Line 14: 'Input' is defined but never used.
- Line 19: 'quickPreprocess' is defined but never used.
- Line 19: 'analyzeImage' is defined but never used.
- Line 104: 'getJobs' is assigned a value but never used.
- Line 104: 'getStatistics' is assigned a value but never used.
- Line 133: 'processedFile' is assigned a value but never used.
- Line 134: 'improvements' is assigned a value but never used.
- Line 327: 'processInvoiceFile' is assigned a value but never used.

#### src\components\legal\BulkRemindersDialog.tsx

- Line 7: 'motion' is defined but never used.
- Line 7: 'AnimatePresence' is defined but never used.
- Line 18: 'Checkbox' is defined but never used.
- Line 22: 'Select' is defined but never used.
- Line 23: 'SelectContent' is defined but never used.
- Line 24: 'SelectItem' is defined but never used.
- Line 25: 'SelectTrigger' is defined but never used.
- Line 26: 'SelectValue' is defined but never used.
- Line 34: 'AlertCircle' is defined but never used.
- Line 162: 'setPreviewCustomer' is assigned a value but never used.

#### src\hooks\useEnhancedContractManagement.ts

- Line 17: 'BillingFrequency' is defined but never used.
- Line 18: 'PricingModel' is defined but never used.
- Line 34: 'ContractComplianceEngine' is defined but never used.
- Line 36: 'ComplianceRule' is defined but never used.
- Line 38: 'ComplianceSeverity' is defined but never used.
- Line 42: 'ContractAnalyticsEngine' is defined but never used.
- Line 130: 'contractLoading' is assigned a value but never used.
- Line 131: 'contractError' is assigned a value but never used.
- Line 552: 'options' is assigned a value but never used.
- Line 554: 'queryClient' is assigned a value but never used.

#### src\pages\finance\FinancialRatios.tsx

- Line 9: 'Badge' is defined but never used.
- Line 10: 'Progress' is defined but never used.
- Line 14: 'TrendingDown' is defined but never used.
- Line 19: 'DollarSign' is defined but never used.
- Line 22: 'Target' is defined but never used.
- Line 25: 'PiggyBank' is defined but never used.
- Line 28: 'Info' is defined but never used.
- Line 53: 'trend' is assigned a value but never used.
- Line 128: 'formatCurrency' is assigned a value but never used.
- Line 339: 'index' is defined but never used.

#### src\pages\finance\PurchaseOrders.tsx

- Line 1: 'useMemo' is defined but never used.
- Line 16: 'ChevronDown' is defined but never used.
- Line 19: 'X' is defined but never used.
- Line 23: 'Card' is defined but never used.
- Line 23: 'CardContent' is defined but never used.
- Line 24: 'Badge' is defined but never used.
- Line 30: 'CreatePurchaseOrderData' is defined but never used.
- Line 31: 'Vendor' is defined but never used.
- Line 197: 'createPurchaseOrder' is assigned a value but never used.
- Line 324: 'statusToTab' is assigned a value but never used.

#### src\pages\Search.tsx

- Line 17: 'Calendar' is defined but never used.
- Line 19: 'Download' is defined but never used.
- Line 20: 'Eye' is defined but never used.
- Line 49: 'CustomerRelation' is defined but never used.
- Line 55: 'VehicleRelation' is defined but never used.
- Line 83: 'user' is assigned a value but never used.
- Line 85: 'searchDebug' is assigned a value but never used.
- Line 90: 'setIsLoading' is assigned a value but never used.
- Line 271: 'type' is defined but never used.
- Line 300: 'SearchDebugPanel' is assigned a value but never used.

#### src\components\contracts\SimpleContractWizard.tsx

- Line 13: 'useForm' is defined but never used.
- Line 14: 'zodResolver' is defined but never used.
- Line 24: 'Select' is defined but never used.
- Line 25: 'SelectContent' is defined but never used.
- Line 26: 'SelectItem' is defined but never used.
- Line 27: 'SelectTrigger' is defined but never used.
- Line 28: 'SelectValue' is defined but never used.
- Line 57: 'FormField' is defined but never used.
- Line 1212: 'assistantData' is assigned a value but never used.

#### src\components\customers\AccountingSettings.tsx

- Line 3: 'Select' is defined but never used.
- Line 3: 'SelectContent' is defined but never used.
- Line 3: 'SelectItem' is defined but never used.
- Line 3: 'SelectTrigger' is defined but never used.
- Line 3: 'SelectValue' is defined but never used.
- Line 7: 'Separator' is defined but never used.
- Line 9: 'CreditCard' is defined but never used.
- Line 9: 'DollarSign' is defined but never used.
- Line 9: 'Percent' is defined but never used.

#### src\components\finance\ProfessionalPaymentSystem.tsx

- Line 17: 'Link' is defined but never used.
- Line 22: 'toast' is defined but never used.
- Line 28: 'queryClient' is assigned a value but never used.
- Line 35: 'pendingLoading' is assigned a value but never used.
- Line 36: 'isProcessing' is assigned a value but never used.
- Line 39: 'isLinking' is assigned a value but never used.
- Line 44: 'selectedPayment' is assigned a value but never used.
- Line 46: 'handleProcessPayment' is assigned a value but never used.
- Line 83: 'handleSmartLink' is assigned a value but never used.

#### src\components\fleet\VehicleSplitView.tsx

- Line 15: 'Progress' is defined but never used.
- Line 23: 'CreditCard' is defined but never used.
- Line 26: 'AlertTriangle' is defined but never used.
- Line 27: 'CheckCircle' is defined but never used.
- Line 28: 'XCircle' is defined but never used.
- Line 33: 'MapPin' is defined but never used.
- Line 35: 'Clock' is defined but never used.
- Line 38: 'ImageIcon' is defined but never used.
- Line 43: 'differenceInDays' is defined but never used.

#### src\components\hr\permissions\ApprovalWorkflow.tsx

- Line 4: 'CardHeader' is defined but never used.
- Line 4: 'CardTitle' is defined but never used.
- Line 8: 'Input' is defined but never used.
- Line 10: 'DialogTrigger' is defined but never used.
- Line 19: 'Send' is defined but never used.
- Line 20: 'MessageSquare' is defined but never used.
- Line 23: 'Filter' is defined but never used.
- Line 28: 'UserRole' is defined but never used.
- Line 64: 'showRequestDialog' is assigned a value but never used.

#### src\components\legal\SettlementTracking.tsx

- Line 5: 'Input' is defined but never used.
- Line 26: 'Select' is defined but never used.
- Line 27: 'SelectContent' is defined but never used.
- Line 28: 'SelectItem' is defined but never used.
- Line 29: 'SelectTrigger' is defined but never used.
- Line 30: 'SelectValue' is defined but never used.
- Line 32: 'Plus' is defined but never used.
- Line 32: 'Edit' is defined but never used.
- Line 66: 'showDetails' is assigned a value but never used.

#### src\components\monitoring\MonitoringDashboard.tsx

- Line 134: 'setRefreshInterval' is assigned a value but never used.
- Line 135: 'setAutoRefresh' is assigned a value but never used.
- Line 138: 'performance' is assigned a value but never used.
- Line 139: 'healthStatus' is assigned a value but never used.
- Line 144: 'selectedTimeRange' is assigned a value but never used.
- Line 144: 'setSelectedTimeRange' is assigned a value but never used.
- Line 208: 'formatDuration' is assigned a value but never used.
- Line 317: 'errorId' is defined but never used.
- Line 478: 'errorId' is defined but never used.

#### src\components\subscription\SubscriptionManagement.tsx

- Line 12: 'Users' is defined but never used.
- Line 13: 'Car' is defined but never used.
- Line 14: 'FileText' is defined but never used.
- Line 15: 'Calendar' is defined but never used.
- Line 17: 'XCircle' is defined but never used.
- Line 18: 'TrendingUp' is defined but never used.
- Line 19: 'Clock' is defined but never used.
- Line 21: 'format' is defined but never used.
- Line 22: 'ar' is defined but never used.

#### src\hooks\useCustomers.ts

- Line 12: 'useOptimisticUpdate' is defined but never used.
- Line 12: 'createOptimisticAdd' is defined but never used.
- Line 12: 'createOptimisticUpdate' is defined but never used.
- Line 18: 'user' is assigned a value but never used.
- Line 377: 'selectedCompanyId' is assigned a value but never used.
- Line 484: 'selectedCompanyId' is assigned a value but never used.
- Line 486: '_' is defined but never used.
- Line 695: 'options' is defined but never used.
- Line 756: 'customerData' is assigned a value but never used.

#### src\pages\customers\CustomerCRMRedesigned.tsx

- Line 9: 'useQuery' is defined but never used.
- Line 24: 'MoreHorizontal' is defined but never used.
- Line 29: 'Filter' is defined but never used.
- Line 34: 'TrendingUp' is defined but never used.
- Line 35: 'CheckCircle' is defined but never used.
- Line 37: 'Calendar' is defined but never used.
- Line 38: 'Activity' is defined but never used.
- Line 39: 'Bell' is defined but never used.
- Line 42: 'ChevronDownIcon' is defined but never used.

#### src\pages\finance\AuditAndSettings.tsx

- Line 4: 'useState' is defined but never used.
- Line 4: 'useMemo' is defined but never used.
- Line 6: 'AnimatePresence' is defined but never used.
- Line 17: 'RefreshCw' is defined but never used.
- Line 18: 'Clock' is defined but never used.
- Line 19: 'Activity' is defined but never used.
- Line 24: 'AlertTriangle' is defined but never used.
- Line 25: 'CheckCircle' is defined but never used.
- Line 203: 'index' is defined but never used.

#### src\pages\hr\UserManagement.tsx

- Line 7: 'Badge' is defined but never used.
- Line 13: 'Shield' is defined but never used.
- Line 15: 'Settings' is defined but never used.
- Line 25: 'Mail' is defined but never used.
- Line 26: 'Building2' is defined but never used.
- Line 27: 'KeyRound' is defined but never used.
- Line 28: 'Crown' is defined but never used.
- Line 204: 'user' is assigned a value but never used.
- Line 211: 'setSelectedEmployeeForPermissions' is assigned a value but never used.

#### src\components\customers\EnhancedCustomerFinancialDashboard.tsx

- Line 8: 'Dialog' is defined but never used.
- Line 8: 'DialogContent' is defined but never used.
- Line 8: 'DialogHeader' is defined but never used.
- Line 8: 'DialogTitle' is defined but never used.
- Line 8: 'DialogTrigger' is defined but never used.
- Line 39: 'selectedPeriod' is assigned a value but never used.
- Line 39: 'setSelectedPeriod' is assigned a value but never used.
- Line 45: 'balanceData' is assigned a value but never used.

#### src\components\filters\FilterPresets.tsx

- Line 17: 'X' is defined but never used.
- Line 41: 'Select' is defined but never used.
- Line 42: 'SelectContent' is defined but never used.
- Line 43: 'SelectItem' is defined but never used.
- Line 44: 'SelectTrigger' is defined but never used.
- Line 45: 'SelectValue' is defined but never used.
- Line 260: 'error' is defined but never used.
- Line 303: 'error' is defined but never used.

#### src\components\finance\AccountingAlerts.tsx

- Line 5: 'Alert' is defined but never used.
- Line 5: 'AlertDescription' is defined but never used.
- Line 5: 'AlertTitle' is defined but never used.
- Line 8: 'AlertCircle' is defined but never used.
- Line 15: 'Calendar' is defined but never used.
- Line 16: 'DollarSign' is defined but never used.
- Line 23: 'format' is defined but never used.
- Line 24: 'ar' is defined but never used.

#### src\components\finance\charts\ExportAccountsUtility.tsx

- Line 4: 'Select' is defined but never used.
- Line 4: 'SelectContent' is defined but never used.
- Line 4: 'SelectItem' is defined but never used.
- Line 4: 'SelectTrigger' is defined but never used.
- Line 4: 'SelectValue' is defined but never used.
- Line 8: 'Image' is defined but never used.
- Line 24: 'expandedNodes' is defined but never used.
- Line 54: 'error' is defined but never used.

#### src\components\finance\EnhancedFinancialReportsViewer.tsx

- Line 4: 'Tabs' is defined but never used.
- Line 4: 'TabsContent' is defined but never used.
- Line 4: 'TabsList' is defined but never used.
- Line 4: 'TabsTrigger' is defined but never used.
- Line 12: 'FileText' is defined but never used.
- Line 14: 'Calendar' is defined but never used.
- Line 15: 'Filter' is defined but never used.
- Line 17: 'DollarSign' is defined but never used.

#### src\components\fleet\CarRentalScheduler.tsx

- Line 14: 'Calendar' is defined but never used.
- Line 30: 'Phone' is defined but never used.
- Line 32: 'MapPin' is defined but never used.
- Line 35: 'RefreshCw' is defined but never used.
- Line 43: 'ar' is defined but never used.
- Line 151: 'user' is assigned a value but never used.
- Line 571: 'getDriverName' is assigned a value but never used.
- Line 822: 'id' is defined but never used.

#### src\components\fleet\TrafficViolationsSmartDashboard.tsx

- Line 8: 'Clock' is defined but never used.
- Line 11: 'Car' is defined but never used.
- Line 12: 'Users' is defined but never used.
- Line 15: 'Bell' is defined but never used.
- Line 19: 'LoadingSpinner' is defined but never used.
- Line 78: 'bg' is assigned a value but never used.
- Line 207: 'isLoadingStats' is assigned a value but never used.
- Line 219: 'partiallyPaidViolations' is assigned a value but never used.

#### src\components\vehicles\IntegratedVehicleInspection.tsx

- Line 20: 'Label' is defined but never used.
- Line 28: 'DialogHeader' is defined but never used.
- Line 28: 'DialogTitle' is defined but never used.
- Line 28: 'DialogDescription' is defined but never used.
- Line 31: 'Upload' is defined but never used.
- Line 115: 'showComparison' is assigned a value but never used.
- Line 115: 'setShowComparison' is assigned a value but never used.
- Line 130: 'comparison' is assigned a value but never used.

#### src\hooks\useContractCreation.ts

- Line 7: 'createContractWithFallback' is defined but never used.
- Line 8: 'generateContractPdf' is defined but never used.
- Line 52: 'ContractCreationResult' is defined but never used.
- Line 71: 'createDocument' is assigned a value but never used.
- Line 72: 'isDocumentSaving' is assigned a value but never used.
- Line 77: 'isAutoConfiguring' is assigned a value but never used.
- Line 225: 'errorMessage' is assigned a value but never used.
- Line 689: 'errorMessage' is assigned a value but never used.

#### src\hooks\useDuplicateContracts.ts

- Line 147: '_' is defined but never used.
- Line 244: '_' is defined but never used.
- Line 247: '_' is defined but never used.
- Line 248: '_' is defined but never used.
- Line 250: '_' is defined but never used.
- Line 261: '_' is defined but never used.
- Line 264: '_' is defined but never used.
- Line 267: '_' is defined but never used.

#### src\pages\finance\ComplianceDashboard.tsx

- Line 9: 'useEffect' is defined but never used.
- Line 17: 'TrendingUp' is defined but never used.
- Line 18: 'TrendingDown' is defined but never used.
- Line 33: 'CurrencyExposureReport' is defined but never used.
- Line 33: 'ComplianceCalendar' is defined but never used.
- Line 33: 'RegulatoryReport' is defined but never used.
- Line 72: 'error' is defined but never used.
- Line 83: 'error' is defined but never used.

#### src\pages\finance\Payments.tsx

- Line 8: 'Button' is defined but never used.
- Line 10: 'Badge' is defined but never used.
- Line 20: 'Clock' is defined but never used.
- Line 20: 'Home' is defined but never used.
- Line 21: 'Link' is defined but never used.
- Line 23: 'LoadingSpinner' is defined but never used.
- Line 122: 'isMobile' is assigned a value but never used.
- Line 138: 'pendingPayments' is assigned a value but never used.

#### src\pages\mobile\MobileContractWizard.tsx

- Line 6: 'ChevronRight' is defined but never used.
- Line 10: 'CreditCard' is defined but never used.
- Line 11: 'FileText' is defined but never used.
- Line 20: 'useMutation' is defined but never used.
- Line 71: 'queryClient' is assigned a value but never used.
- Line 374: 'selectedCustomer' is defined but never used.
- Line 374: 'selectedVehicle' is defined but never used.
- Line 491: 'selectedVehicle' is defined but never used.

#### src\pages\PermissionsManagement.tsx

- Line 8: 'Plus' is defined but never used.
- Line 8: 'Trash2' is defined but never used.
- Line 8: 'Check' is defined but never used.
- Line 8: 'X' is defined but never used.
- Line 19: 'DialogTrigger' is defined but never used.
- Line 53: 'user' is assigned a value but never used.
- Line 58: 'isRoleDialogOpen' is assigned a value but never used.
- Line 58: 'setIsRoleDialogOpen' is assigned a value but never used.

#### src\services\complianceEngine.ts

- Line 16: 'ComplianceAuditTrail' is defined but never used.
- Line 529: 'reportType' is defined but never used.
- Line 529: 'jurisdiction' is defined but never used.
- Line 556: 'reportType' is defined but never used.
- Line 557: 'jurisdiction' is defined but never used.
- Line 558: 'data' is defined but never used.
- Line 571: 'companyId' is defined but never used.
- Line 581: 'entityData' is defined but never used.

#### src\services\core\BaseService.ts

- Line 13: 'createOptimizedQueryFn' is defined but never used.
- Line 13: 'createOptimizedMutationFn' is defined but never used.
- Line 233: 'entity' is defined but never used.
- Line 249: 'existing' is defined but never used.
- Line 249: 'updated' is defined but never used.
- Line 257: 'entity' is defined but never used.
- Line 265: 'entity' is defined but never used.
- Line 275: 'data' is defined but never used.

#### src\components\contracts\InteractiveVehicleInspectionForm.tsx

- Line 1: 'useCallback' is defined but never used.
- Line 8: 'Slider' is defined but never used.
- Line 15: 'Calendar' is defined but never used.
- Line 45: 'isDrawing' is assigned a value but never used.
- Line 46: 'currentTool' is assigned a value but never used.
- Line 46: 'setCurrentTool' is assigned a value but never used.
- Line 102: 'e' is defined but never used.

#### src\components\contracts\PaymentFilters.tsx

- Line 6: 'useMemo' is defined but never used.
- Line 8: 'Badge' is defined but never used.
- Line 11: 'Select' is defined but never used.
- Line 12: 'SelectContent' is defined but never used.
- Line 13: 'SelectItem' is defined but never used.
- Line 14: 'SelectTrigger' is defined but never used.
- Line 15: 'SelectValue' is defined but never used.

#### src\components\csv\CSVArchiveManager.tsx

- Line 4: 'CardDescription' is defined but never used.
- Line 4: 'CardHeader' is defined but never used.
- Line 4: 'CardTitle' is defined but never used.
- Line 6: 'DialogTrigger' is defined but never used.
- Line 17: 'User' is defined but never used.
- Line 23: 'Filter' is defined but never used.
- Line 29: 'toast' is defined but never used.

#### src\components\customers\CRMActivityPanel.tsx

- Line 6: 'useCallback' is defined but never used.
- Line 17: 'Calendar' is defined but never used.
- Line 21: 'AlertTriangle' is defined but never used.
- Line 22: 'CheckCircle' is defined but never used.
- Line 30: 'CreditCard' is defined but never used.
- Line 42: 'BRAND_COLOR' is assigned a value but never used.
- Line 222: 'error' is defined but never used.

#### src\components\customers\CustomerCSVUpload.tsx

- Line 8: 'Card' is defined but never used.
- Line 8: 'CardContent' is defined but never used.
- Line 8: 'CardDescription' is defined but never used.
- Line 8: 'CardHeader' is defined but never used.
- Line 8: 'CardTitle' is defined but never used.
- Line 11: 'XCircle' is defined but never used.
- Line 73: 'error' is defined but never used.

#### src\components\dashboard\EnhancedAlertsSystem.tsx

- Line 10: 'Separator' is defined but never used.
- Line 23: 'Users' is defined but never used.
- Line 24: 'X' is defined but never used.
- Line 25: 'ExternalLink' is defined but never used.
- Line 34: 'UserNotification' is defined but never used.
- Line 64: 'markAllNotificationsAsRead' is assigned a value but never used.
- Line 261: 'IconComponent' is assigned a value but never used.

#### src\components\finance\EnhancedJournalEntriesTab.tsx

- Line 9: 'CardDescription' is defined but never used.
- Line 32: 'Dialog' is defined but never used.
- Line 32: 'DialogContent' is defined but never used.
- Line 32: 'DialogDescription' is defined but never used.
- Line 32: 'DialogHeader' is defined but never used.
- Line 32: 'DialogTitle' is defined but never used.
- Line 458: 'formatCurrency' is assigned a value but never used.

#### src\components\finance\FinancialAlertsSystem.tsx

- Line 8: 'AlertDescription' is defined but never used.
- Line 9: 'TrendingDown' is defined but never used.
- Line 9: 'TrendingUp' is defined but never used.
- Line 12: 'BudgetAlert' is defined but never used.
- Line 28: 'FinancialAlert' is defined but never used.
- Line 82: 'severity' is defined but never used.
- Line 93: 'getAlertVariant' is assigned a value but never used.

#### src\components\layouts\EnhancedSidebar.tsx

- Line 5: 'AdminOnly' is defined but never used.
- Line 5: 'SuperAdminOnly' is defined but never used.
- Line 16: 'Shield' is defined but never used.
- Line 20: 'Tooltip' is defined but never used.
- Line 21: 'TooltipContent' is defined but never used.
- Line 22: 'TooltipProvider' is defined but never used.
- Line 23: 'TooltipTrigger' is defined but never used.

#### src\components\super-admin\landing\LandingABTesting.tsx

- Line 11: 'Eye' is defined but never used.
- Line 34: 'deleteTest' is assigned a value but never used.
- Line 51: 'error' is defined but never used.
- Line 62: 'error' is defined but never used.
- Line 75: 'error' is defined but never used.
- Line 87: 'error' is defined but never used.
- Line 101: 'error' is defined but never used.

#### src\examples\i18n-usage-example.tsx

- Line 23: 'ChevronRight' is defined but never used.
- Line 27: 'Settings' is defined but never used.
- Line 28: 'Globe' is defined but never used.
- Line 29: 'Calendar' is defined but never used.
- Line 64: 'currentLocale' is assigned a value but never used.
- Line 108: 'getMirroredIcon' is assigned a value but never used.
- Line 363: 'selectedLanguage' is assigned a value but never used.

#### src\hooks\usePaymentsCSVUpload.ts

- Line 45: 'isBrowsingMode' is assigned a value but never used.
- Line 45: 'browsedCompany' is assigned a value but never used.
- Line 51: 'bulkUploadPayments' is assigned a value but never used.
- Line 434: 'findContractId' is assigned a value but never used.
- Line 486: 'hasRequiredPaymentFields' is assigned a value but never used.
- Line 493: 'findMissingRequiredFields' is assigned a value but never used.
- Line 832: 'isRentPayment' is assigned a value but never used.

#### src\hooks\useVehicles.ts

- Line 76: 'plateNumbers' is assigned a value but never used.
- Line 298: 'toast' is assigned a value but never used.
- Line 299: 'user' is assigned a value but never used.
- Line 907: 'vehicleId' is defined but never used.
- Line 1369: 'data' is defined but never used.
- Line 1429: 'data' is defined but never used.
- Line 1493: 'data' is defined but never used.

---

## Complete File-by-File Breakdown

The following files contain unused code:

### src\components\customers\CustomerDetailsPage.tsx (56 issues)

- [ERROR] Line 21: 'CustomerActivity' is defined but never used.
- [ERROR] Line 21: 'AddActivityInput' is defined but never used.
- [ERROR] Line 30: 'Archive' is defined but never used.
- [ERROR] Line 33: 'Hash' is defined but never used.
- [ERROR] Line 35: 'Clock' is defined but never used.
- [ERROR] Line 40: 'CreditCard' is defined but never used.
- [ERROR] Line 43: 'Users' is defined but never used.
- [ERROR] Line 48: 'Eye' is defined but never used.
- [ERROR] Line 51: 'Landmark' is defined but never used.
- [ERROR] Line 52: 'Banknote' is defined but never used.
- [ERROR] Line 54: 'ChevronRight' is defined but never used.
- [ERROR] Line 55: 'ChevronLeft' is defined but never used.
- [ERROR] Line 58: 'Folder' is defined but never used.
- [ERROR] Line 63: 'Globe' is defined but never used.
- [ERROR] Line 67: 'MoreVertical' is defined but never used.
- [ERROR] Line 68: 'Printer' is defined but never used.
- [ERROR] Line 69: 'Share2' is defined but never used.
- [ERROR] Line 71: 'PhoneOff' is defined but never used.
- [ERROR] Line 72: 'PhoneIncoming' is defined but never used.
- [ERROR] Line 75: 'Sparkles' is defined but never used.
- ... and 36 more issues

### src\lib\contract-workflow.ts (51 issues)

- [ERROR] Line 8: 'addWeeks' is defined but never used.
- [ERROR] Line 8: 'addMonths' is defined but never used.
- [ERROR] Line 8: 'addYears' is defined but never used.
- [ERROR] Line 8: 'differenceInDays' is defined but never used.
- [ERROR] Line 8: 'isBefore' is defined but never used.
- [ERROR] Line 8: 'startOfDay' is defined but never used.
- [ERROR] Line 397: 'contractId' is defined but never used.
- [ERROR] Line 397: 'metadata' is defined but never used.
- [ERROR] Line 402: 'contractId' is defined but never used.
- [ERROR] Line 402: 'metadata' is defined but never used.
- [ERROR] Line 407: 'contractId' is defined but never used.
- [ERROR] Line 407: 'metadata' is defined but never used.
- [ERROR] Line 412: 'contractId' is defined but never used.
- [ERROR] Line 412: 'metadata' is defined but never used.
- [ERROR] Line 417: 'contractId' is defined but never used.
- [ERROR] Line 417: 'metadata' is defined but never used.
- [ERROR] Line 422: 'contractId' is defined but never used.
- [ERROR] Line 422: 'metadata' is defined but never used.
- [ERROR] Line 427: 'contractId' is defined but never used.
- [ERROR] Line 427: 'metadata' is defined but never used.
- ... and 31 more issues

### src\components\finance\charts\EnhancedAccountsVisualization.tsx (36 issues)

- [ERROR] Line 8: 'Tooltip' is defined but never used.
- [ERROR] Line 8: 'TooltipContent' is defined but never used.
- [ERROR] Line 8: 'TooltipTrigger' is defined but never used.
- [ERROR] Line 9: 'Separator' is defined but never used.
- [ERROR] Line 10: 'Progress' is defined but never used.
- [ERROR] Line 27: 'Download' is defined but never used.
- [ERROR] Line 28: 'BarChart3' is defined but never used.
- [ERROR] Line 29: 'Settings' is defined but never used.
- [ERROR] Line 30: 'Keyboard' is defined but never used.
- [ERROR] Line 31: 'Zap' is defined but never used.
- [ERROR] Line 32: 'Clock' is defined but never used.
- [ERROR] Line 33: 'User' is defined but never used.
- [ERROR] Line 34: 'Calendar' is defined but never used.
- [ERROR] Line 35: 'ArrowUp' is defined but never used.
- [ERROR] Line 36: 'ArrowDown' is defined but never used.
- [ERROR] Line 38: 'Info' is defined but never used.
- [ERROR] Line 39: 'Sparkles' is defined but never used.
- [ERROR] Line 40: 'CheckCircle' is defined but never used.
- [ERROR] Line 42: 'Filter' is defined but never used.
- [ERROR] Line 43: 'SortAsc' is defined but never used.
- ... and 16 more issues

### src\components\finance\EnhancedChartOfAccountsManagement.tsx (35 issues)

- [ERROR] Line 3: 'Input' is defined but never used.
- [ERROR] Line 5: 'Select' is defined but never used.
- [ERROR] Line 5: 'SelectContent' is defined but never used.
- [ERROR] Line 5: 'SelectItem' is defined but never used.
- [ERROR] Line 5: 'SelectTrigger' is defined but never used.
- [ERROR] Line 5: 'SelectValue' is defined but never used.
- [ERROR] Line 6: 'Table' is defined but never used.
- [ERROR] Line 6: 'TableBody' is defined but never used.
- [ERROR] Line 6: 'TableHead' is defined but never used.
- [ERROR] Line 6: 'TableHeader' is defined but never used.
- [ERROR] Line 7: 'Card' is defined but never used.
- [ERROR] Line 7: 'CardContent' is defined but never used.
- [ERROR] Line 7: 'CardDescription' is defined but never used.
- [ERROR] Line 7: 'CardHeader' is defined but never used.
- [ERROR] Line 7: 'CardTitle' is defined but never used.
- [ERROR] Line 9: 'DialogTrigger' is defined but never used.
- [ERROR] Line 11: 'Switch' is defined but never used.
- [ERROR] Line 13: 'Search' is defined but never used.
- [ERROR] Line 13: 'FileText' is defined but never used.
- [ERROR] Line 13: 'CheckCircle' is defined but never used.
- ... and 15 more issues

### src\components\customers\CustomerDetailsPageNew.tsx (33 issues)

- [ERROR] Line 17: 'useDeleteCustomerDocument' is defined but never used.
- [ERROR] Line 18: 'useDownloadCustomerDocument' is defined but never used.
- [ERROR] Line 20: 'CustomerActivity' is defined but never used.
- [ERROR] Line 20: 'AddActivityInput' is defined but never used.
- [ERROR] Line 29: 'Archive' is defined but never used.
- [ERROR] Line 32: 'Hash' is defined but never used.
- [ERROR] Line 34: 'Clock' is defined but never used.
- [ERROR] Line 50: 'Landmark' is defined but never used.
- [ERROR] Line 51: 'Banknote' is defined but never used.
- [ERROR] Line 52: 'Smartphone' is defined but never used.
- [ERROR] Line 53: 'ChevronRight' is defined but never used.
- [ERROR] Line 62: 'Globe' is defined but never used.
- [ERROR] Line 64: 'IdCard' is defined but never used.
- [ERROR] Line 66: 'MoreVertical' is defined but never used.
- [ERROR] Line 78: 'AvatarImage' is defined but never used.
- [ERROR] Line 79: 'Progress' is defined but never used.
- [ERROR] Line 87: 'DialogDescription' is defined but never used.
- [ERROR] Line 88: 'DialogFooter' is defined but never used.
- [ERROR] Line 93: 'AlertDialog' is defined but never used.
- [ERROR] Line 94: 'AlertDialogAction' is defined but never used.
- ... and 13 more issues

### src\components\contracts\ContractDetailsPageRedesigned.tsx (25 issues)

- [ERROR] Line 8: 'Fragment' is defined but never used.
- [ERROR] Line 10: 'useMutation' is defined but never used.
- [ERROR] Line 16: 'Download' is defined but never used.
- [ERROR] Line 26: 'CalendarCheck' is defined but never used.
- [ERROR] Line 27: 'CalendarX' is defined but never used.
- [ERROR] Line 29: 'ClipboardCheck' is defined but never used.
- [ERROR] Line 32: 'LogIn' is defined but never used.
- [ERROR] Line 33: 'LogOut' is defined but never used.
- [ERROR] Line 39: 'CheckCircle' is defined but never used.
- [ERROR] Line 41: 'Circle' is defined but never used.
- [ERROR] Line 44: 'Upload' is defined but never used.
- [ERROR] Line 47: 'ChevronDown' is defined but never used.
- [ERROR] Line 54: 'Dialog' is defined but never used.
- [ERROR] Line 54: 'DialogContent' is defined but never used.
- [ERROR] Line 54: 'DialogHeader' is defined but never used.
- [ERROR] Line 54: 'DialogTitle' is defined but never used.
- [ERROR] Line 54: 'DialogDescription' is defined but never used.
- [ERROR] Line 100: 'TURQUOISE' is assigned a value but never used.
- [ERROR] Line 101: 'TURQUOISE_DARK' is assigned a value but never used.
- [ERROR] Line 102: 'TURQUOISE_LIGHT' is assigned a value but never used.
- ... and 5 more issues

### src\components\dashboard\bento\EnhancedBentoDashboard.tsx (25 issues)

- [ERROR] Line 1: 'useMemo' is defined but never used.
- [ERROR] Line 4: 'SkeletonWidget' is defined but never used.
- [ERROR] Line 7: 'useQueryClient' is defined but never used.
- [ERROR] Line 12: 'Sparkline' is defined but never used.
- [ERROR] Line 17: 'MobileOptimizedDashboard' is defined but never used.
- [ERROR] Line 25: 'TrendingDown' is defined but never used.
- [ERROR] Line 26: 'Wrench' is defined but never used.
- [ERROR] Line 27: 'AlertTriangle' is defined but never used.
- [ERROR] Line 28: 'Clock' is defined but never used.
- [ERROR] Line 29: 'Calendar' is defined but never used.
- [ERROR] Line 30: 'Brain' is defined but never used.
- [ERROR] Line 31: 'ArrowUp' is defined but never used.
- [ERROR] Line 38: 'ChevronLeft' is defined but never used.
- [ERROR] Line 39: 'ExternalLink' is defined but never used.
- [ERROR] Line 43: 'Smartphone' is defined but never used.
- [ERROR] Line 48: 'PieChart' is defined but never used.
- [ERROR] Line 49: 'Pie' is defined but never used.
- [ERROR] Line 50: 'Cell' is defined but never used.
- [ERROR] Line 153: 'activeFleetIndex' is assigned a value but never used.
- [ERROR] Line 153: 'setActiveFleetIndex' is assigned a value but never used.
- ... and 5 more issues

### src\pages\FinancialTracking.tsx (24 issues)

- [ERROR] Line 20: 'startOfMonth' is defined but never used.
- [ERROR] Line 20: 'endOfMonth' is defined but never used.
- [ERROR] Line 35: 'CustomerVehicle' is defined but never used.
- [ERROR] Line 53: 'DELAY_FINE_PER_DAY' is assigned a value but never used.
- [ERROR] Line 54: 'MAX_FINE_PER_MONTH' is assigned a value but never used.
- [ERROR] Line 65: 'companyId' is defined but never used.
- [ERROR] Line 67: 'selectedMonth' is assigned a value but never used.
- [ERROR] Line 376: 'user' is assigned a value but never used.
- [ERROR] Line 389: 'dateFilterEnabled' is assigned a value but never used.
- [ERROR] Line 389: 'setDateFilterEnabled' is assigned a value but never used.
- [ERROR] Line 390: 'startDate' is assigned a value but never used.
- [ERROR] Line 390: 'setStartDate' is assigned a value but never used.
- [ERROR] Line 391: 'endDate' is assigned a value but never used.
- [ERROR] Line 391: 'setEndDate' is assigned a value but never used.
- [ERROR] Line 456: 'eventType' is assigned a value but never used.
- [ERROR] Line 456: 'newRecord' is assigned a value but never used.
- [ERROR] Line 456: 'oldRecord' is assigned a value but never used.
- [ERROR] Line 508: 'loadingReceipts' is assigned a value but never used.
- [ERROR] Line 514: 'outstandingBalance' is assigned a value but never used.
- [ERROR] Line 514: 'loadingBalance' is assigned a value but never used.
- ... and 4 more issues

### src\components\admin\AuditLogViewer.tsx (23 issues)

- [ERROR] Line 9: 'Table' is defined but never used.
- [ERROR] Line 9: 'TableBody' is defined but never used.
- [ERROR] Line 9: 'TableCell' is defined but never used.
- [ERROR] Line 9: 'TableHead' is defined but never used.
- [ERROR] Line 9: 'TableHeader' is defined but never used.
- [ERROR] Line 9: 'TableRow' is defined but never used.
- [ERROR] Line 10: 'Dialog' is defined but never used.
- [ERROR] Line 10: 'DialogContent' is defined but never used.
- [ERROR] Line 10: 'DialogHeader' is defined but never used.
- [ERROR] Line 10: 'DialogTitle' is defined but never used.
- [ERROR] Line 11: 'ScrollArea' is defined but never used.
- [ERROR] Line 12: 'Skeleton' is defined but never used.
- [ERROR] Line 13: 'Alert' is defined but never used.
- [ERROR] Line 13: 'AlertDescription' is defined but never used.
- [ERROR] Line 16: 'Filter' is defined but never used.
- [ERROR] Line 26: 'Users' is defined but never used.
- [ERROR] Line 27: 'Car' is defined but never used.
- [ERROR] Line 28: 'Building2' is defined but never used.
- [ERROR] Line 29: 'CreditCard' is defined but never used.
- [ERROR] Line 30: 'BarChart3' is defined but never used.
- ... and 3 more issues

### src\components\super-admin\landing\LandingContentManager.tsx (22 issues)

- [ERROR] Line 5: 'Textarea' is defined but never used.
- [ERROR] Line 11: 'Tabs' is defined but never used.
- [ERROR] Line 11: 'TabsContent' is defined but never used.
- [ERROR] Line 11: 'TabsList' is defined but never used.
- [ERROR] Line 11: 'TabsTrigger' is defined but never used.
- [ERROR] Line 12: 'Globe' is defined but never used.
- [ERROR] Line 12: 'Languages' is defined but never used.
- [ERROR] Line 12: 'FileText' is defined but never used.
- [ERROR] Line 12: 'Image' is defined but never used.
- [ERROR] Line 12: 'Video' is defined but never used.
- [ERROR] Line 12: 'Link2' is defined but never used.
- [ERROR] Line 31: 'content' is assigned a value but never used.
- [ERROR] Line 31: 'contentLoading' is assigned a value but never used.
- [ERROR] Line 31: 'createContent' is assigned a value but never used.
- [ERROR] Line 31: 'updateContent' is assigned a value but never used.
- [ERROR] Line 31: 'deleteContent' is assigned a value but never used.
- [ERROR] Line 36: 'activeTab' is assigned a value but never used.
- [ERROR] Line 36: 'setActiveTab' is assigned a value but never used.
- [ERROR] Line 58: 'error' is defined but never used.
- [ERROR] Line 69: 'error' is defined but never used.
- ... and 2 more issues

### src\components\contracts\ContractDetailsPage.tsx (20 issues)

- [ERROR] Line 8: 'useEffect' is defined but never used.
- [ERROR] Line 10: 'useMutation' is defined but never used.
- [ERROR] Line 40: 'Upload' is defined but never used.
- [ERROR] Line 41: 'IdCard' is defined but never used.
- [ERROR] Line 42: 'FileBadge' is defined but never used.
- [ERROR] Line 43: 'PlusCircle' is defined but never used.
- [ERROR] Line 66: 'Alert' is defined but never used.
- [ERROR] Line 66: 'AlertDescription' is defined but never used.
- [ERROR] Line 119: 'isEditDialogOpen' is assigned a value but never used.
- [ERROR] Line 119: 'setIsEditDialogOpen' is assigned a value but never used.
- [ERROR] Line 441: 'handleInvoiceDownload' is assigned a value but never used.
- [ERROR] Line 444: 'exportToPDF' is assigned a value but never used.
- [ERROR] Line 472: 'handleInvoicePrint' is assigned a value but never used.
- [ERROR] Line 628: 'getStatusColor' is assigned a value but never used.
- [ERROR] Line 639: 'getStatusText' is assigned a value but never used.
- [ERROR] Line 650: 'getPaymentStatusColor' is assigned a value but never used.
- [ERROR] Line 660: 'getPaymentStatusText' is assigned a value but never used.
- [ERROR] Line 2334: 'getPaymentStatusLabel' is assigned a value but never used.
- [ERROR] Line 2344: 'getPaymentStatusColor' is assigned a value but never used.
- [ERROR] Line 2729: 'TimelineTab' is assigned a value but never used.

### src\components\payments\PaymentPlansManager.tsx (20 issues)

- [ERROR] Line 15: 'useMutation' is defined but never used.
- [ERROR] Line 19: 'CardDescription' is defined but never used.
- [ERROR] Line 51: 'Calendar' is defined but never used.
- [ERROR] Line 52: 'DollarSign' is defined but never used.
- [ERROR] Line 54: 'XCircle' is defined but never used.
- [ERROR] Line 55: 'Clock' is defined but never used.
- [ERROR] Line 58: 'Phone' is defined but never used.
- [ERROR] Line 59: 'Mail' is defined but never used.
- [ERROR] Line 60: 'MessageSquare' is defined but never used.
- [ERROR] Line 61: 'User' is defined but never used.
- [ERROR] Line 63: 'TrendingUp' is defined but never used.
- [ERROR] Line 70: 'addDays' is defined but never used.
- [ERROR] Line 70: 'differenceInDays' is defined but never used.
- [ERROR] Line 70: 'isBefore' is defined but never used.
- [ERROR] Line 70: 'isAfter' is defined but never used.
- [ERROR] Line 114: 'user' is assigned a value but never used.
- [ERROR] Line 118: 'selectedPromise' is assigned a value but never used.
- [ERROR] Line 118: 'setSelectedPromise' is assigned a value but never used.
- [ERROR] Line 122: 'setPromises' is assigned a value but never used.
- [ERROR] Line 138: 'setPlans' is assigned a value but never used.

### src\hooks\useUnifiedReports.ts (20 issues)

- [ERROR] Line 33: 'employeesCount' is assigned a value but never used.
- [ERROR] Line 34: 'vehiclesCount' is assigned a value but never used.
- [ERROR] Line 35: 'customersCount' is assigned a value but never used.
- [ERROR] Line 36: 'contractsCount' is assigned a value but never used.
- [ERROR] Line 37: 'invoicesCount' is assigned a value but never used.
- [ERROR] Line 38: 'legalCasesCount' is assigned a value but never used.
- [ERROR] Line 131: 'companyId' is defined but never used.
- [ERROR] Line 131: 'filters' is defined but never used.
- [ERROR] Line 145: 'reportId' is defined but never used.
- [ERROR] Line 145: 'companyId' is defined but never used.
- [ERROR] Line 145: 'filters' is defined but never used.
- [ERROR] Line 150: 'reportId' is defined but never used.
- [ERROR] Line 150: 'companyId' is defined but never used.
- [ERROR] Line 150: 'filters' is defined but never used.
- [ERROR] Line 155: 'reportId' is defined but never used.
- [ERROR] Line 155: 'companyId' is defined but never used.
- [ERROR] Line 155: 'filters' is defined but never used.
- [ERROR] Line 160: 'reportId' is defined but never used.
- [ERROR] Line 160: 'companyId' is defined but never used.
- [ERROR] Line 160: 'filters' is defined but never used.

### src\components\analytics\SmartAnalyticsPanel.tsx (19 issues)

- [ERROR] Line 8: 'LineChart' is defined but never used.
- [ERROR] Line 8: 'Line' is defined but never used.
- [ERROR] Line 8: 'PieChart' is defined but never used.
- [ERROR] Line 8: 'Pie' is defined but never used.
- [ERROR] Line 8: 'Cell' is defined but never used.
- [ERROR] Line 8: 'AreaChart' is defined but never used.
- [ERROR] Line 8: 'Area' is defined but never used.
- [ERROR] Line 15: 'BarChart3' is defined but never used.
- [ERROR] Line 17: 'DollarSign' is defined but never used.
- [ERROR] Line 18: 'Zap' is defined but never used.
- [ERROR] Line 20: 'Clock' is defined but never used.
- [ERROR] Line 23: 'XCircle' is defined but never used.
- [ERROR] Line 27: 'RiskIndicator' is defined but never used.
- [ERROR] Line 27: 'PredictiveInsight' is defined but never used.
- [ERROR] Line 29: 'StatCardPercentage' is defined but never used.
- [ERROR] Line 87: 'monitorRisks' is assigned a value but never used.
- [ERROR] Line 88: 'getBenchmarks' is assigned a value but never used.
- [ERROR] Line 89: 'forecastTrends' is assigned a value but never used.
- [ERROR] Line 92: 'clearError' is assigned a value but never used.

### src\components\finance\wizard\AccountsMapping.tsx (18 issues)

- [ERROR] Line 2: 'CardContent' is defined but never used.
- [ERROR] Line 2: 'CardDescription' is defined but never used.
- [ERROR] Line 2: 'CardHeader' is defined but never used.
- [ERROR] Line 2: 'CardTitle' is defined but never used.
- [ERROR] Line 5: 'Tabs' is defined but never used.
- [ERROR] Line 5: 'TabsContent' is defined but never used.
- [ERROR] Line 5: 'TabsList' is defined but never used.
- [ERROR] Line 5: 'TabsTrigger' is defined but never used.
- [ERROR] Line 6: 'Input' is defined but never used.
- [ERROR] Line 7: 'useToast' is defined but never used.
- [ERROR] Line 8: 'useUnifiedCompanyAccess' is defined but never used.
- [ERROR] Line 10: 'Download' is defined but never used.
- [ERROR] Line 11: 'FileText' is defined but never used.
- [ERROR] Line 12: 'CheckCircle' is defined but never used.
- [ERROR] Line 13: 'AlertTriangle' is defined but never used.
- [ERROR] Line 14: 'Clock' is defined but never used.
- [ERROR] Line 15: 'Building' is defined but never used.
- [ERROR] Line 16: 'Users' is defined but never used.

### src\components\legal\DelinquentCustomersTab.tsx (18 issues)

- [ERROR] Line 9: 'Card' is defined but never used.
- [ERROR] Line 9: 'CardContent' is defined but never used.
- [ERROR] Line 21: 'Table' is defined but never used.
- [ERROR] Line 22: 'TableBody' is defined but never used.
- [ERROR] Line 23: 'TableCell' is defined but never used.
- [ERROR] Line 24: 'TableHead' is defined but never used.
- [ERROR] Line 25: 'TableHeader' is defined but never used.
- [ERROR] Line 26: 'TableRow' is defined but never used.
- [ERROR] Line 30: 'DropdownMenu' is defined but never used.
- [ERROR] Line 31: 'DropdownMenuContent' is defined but never used.
- [ERROR] Line 32: 'DropdownMenuItem' is defined but never used.
- [ERROR] Line 33: 'DropdownMenuSeparator' is defined but never used.
- [ERROR] Line 34: 'DropdownMenuTrigger' is defined but never used.
- [ERROR] Line 44: 'TrendingUp' is defined but never used.
- [ERROR] Line 48: 'MoreVertical' is defined but never used.
- [ERROR] Line 185: 'RiskBadge' is assigned a value but never used.
- [ERROR] Line 346: 'handleCreateCase' is assigned a value but never used.
- [ERROR] Line 989: 'color' is defined but never used.

### src\pages\legal\LegalCasesTracking.tsx (18 issues)

- [ERROR] Line 67: 'Tabs' is defined but never used.
- [ERROR] Line 67: 'TabsContent' is defined but never used.
- [ERROR] Line 67: 'TabsList' is defined but never used.
- [ERROR] Line 67: 'TabsTrigger' is defined but never used.
- [ERROR] Line 72: 'Alert' is defined but never used.
- [ERROR] Line 72: 'AlertDescription' is defined but never used.
- [ERROR] Line 79: 'AlertCircle' is defined but never used.
- [ERROR] Line 90: 'Car' is defined but never used.
- [ERROR] Line 94: 'Printer' is defined but never used.
- [ERROR] Line 96: 'ChevronLeft' is defined but never used.
- [ERROR] Line 97: 'ChevronRight' is defined but never used.
- [ERROR] Line 108: 'addDays' is defined but never used.
- [ERROR] Line 652: 'error' is assigned a value but never used.
- [ERROR] Line 662: 'isLoadingStats' is assigned a value but never used.
- [ERROR] Line 1287: 'pastHearings' is assigned a value but never used.
- [ERROR] Line 1433: 'i' is defined but never used.
- [ERROR] Line 1471: 'collectionStats' is assigned a value but never used.
- [ERROR] Line 1762: 'document' is defined but never used.

### src\components\dashboard\customization\MobileEnhancements.tsx (17 issues)

- [ERROR] Line 4: 'Smartphone' is defined but never used.
- [ERROR] Line 5: 'Tablet' is defined but never used.
- [ERROR] Line 6: 'Monitor' is defined but never used.
- [ERROR] Line 10: 'ChevronDown' is defined but never used.
- [ERROR] Line 11: 'ChevronUp' is defined but never used.
- [ERROR] Line 12: 'Bell' is defined but never used.
- [ERROR] Line 14: 'Search' is defined but never used.
- [ERROR] Line 19: 'Grid3x3' is defined but never used.
- [ERROR] Line 20: 'BarChart3' is defined but never used.
- [ERROR] Line 35: 'MOBILE_PERFORMANCE_SETTINGS' is assigned a value but never used.
- [ERROR] Line 164: 'onToggle' is defined but never used.
- [ERROR] Line 206: 'user' is assigned a value but never used.
- [ERROR] Line 208: 'isLoading' is assigned a value but never used.
- [ERROR] Line 208: 'error' is assigned a value but never used.
- [ERROR] Line 208: 'refetch' is assigned a value but never used.
- [ERROR] Line 217: 'searchQuery' is assigned a value but never used.
- [ERROR] Line 217: 'setSearchQuery' is assigned a value but never used.

### src\pages\ContractsRedesigned.tsx (17 issues)

- [ERROR] Line 1: 'useLayoutEffect' is defined but never used.
- [ERROR] Line 12: 'Filter' is defined but never used.
- [ERROR] Line 18: 'Calendar' is defined but never used.
- [ERROR] Line 19: 'User' is defined but never used.
- [ERROR] Line 25: 'Eye' is defined but never used.
- [ERROR] Line 38: 'BulkInvoiceGenerationDialog' is defined but never used.
- [ERROR] Line 77: 'draftIdToLoad' is assigned a value but never used.
- [ERROR] Line 94: 'showMobileFilters' is assigned a value but never used.
- [ERROR] Line 94: 'setShowMobileFilters' is assigned a value but never used.
- [ERROR] Line 96: 'setPageSize' is assigned a value but never used.
- [ERROR] Line 117: 'isCreating' is assigned a value but never used.
- [ERROR] Line 119: 'formatCurrencyAmount' is assigned a value but never used.
- [ERROR] Line 148: 'isFetching' is assigned a value but never used.
- [ERROR] Line 148: 'pagination' is assigned a value but never used.
- [ERROR] Line 283: 'handleManageStatus' is assigned a value but never used.
- [ERROR] Line 309: 'handleDeleteContract' is assigned a value but never used.
- [ERROR] Line 336: 'error' is defined but never used.

### src\components\payments\QuickPaymentRecording.tsx (16 issues)

- [ERROR] Line 4: 'startOfMonth' is defined but never used.
- [ERROR] Line 4: 'endOfMonth' is defined but never used.
- [ERROR] Line 4: 'addMonths' is defined but never used.
- [ERROR] Line 4: 'isBefore' is defined but never used.
- [ERROR] Line 4: 'isWithinInterval' is defined but never used.
- [ERROR] Line 16: 'generateReceiptPDF' is defined but never used.
- [ERROR] Line 16: 'downloadPDF' is defined but never used.
- [ERROR] Line 67: 'isCreating' is assigned a value but never used.
- [ERROR] Line 76: 'navigate' is assigned a value but never used.
- [ERROR] Line 107: 'amountError' is assigned a value but never used.
- [ERROR] Line 107: 'setAmountError' is assigned a value but never used.
- [ERROR] Line 117: 'setDateRange' is assigned a value but never used.
- [ERROR] Line 118: 'setPaymentStatusFilter' is assigned a value but never used.
- [ERROR] Line 119: 'showFilters' is assigned a value but never used.
- [ERROR] Line 119: 'setShowFilters' is assigned a value but never used.
- [ERROR] Line 139: 'exportSelectedInvoices' is assigned a value but never used.

### src\hooks\useFinancialObligations.ts (16 issues)

- [ERROR] Line 62: 'companyId' is assigned a value but never used.
- [ERROR] Line 74: 'companyId' is assigned a value but never used.
- [ERROR] Line 86: 'companyId' is assigned a value but never used.
- [ERROR] Line 112: 'companyId' is assigned a value but never used.
- [ERROR] Line 115: 'contractId' is defined but never used.
- [ERROR] Line 138: 'companyId' is assigned a value but never used.
- [ERROR] Line 142: 'paymentId' is defined but never used.
- [ERROR] Line 143: 'customerId' is defined but never used.
- [ERROR] Line 144: 'amount' is defined but never used.
- [ERROR] Line 145: 'strategy' is assigned a value but never used.
- [ERROR] Line 184: 'paymentId' is defined but never used.
- [ERROR] Line 185: 'allocations' is defined but never used.
- [ERROR] Line 219: 'companyId' is assigned a value but never used.
- [ERROR] Line 225: 'paidAmount' is defined but never used.
- [ERROR] Line 226: 'notes' is defined but never used.
- [ERROR] Line 257: 'companyId' is assigned a value but never used.

### src\lib\api-monitoring\analytics.ts (16 issues)

- [ERROR] Line 8: 'APIEndpoint' is defined but never used.
- [ERROR] Line 245: 'timeRange' is defined but never used.
- [ERROR] Line 306: 'timeRange' is defined but never used.
- [ERROR] Line 337: 'timeRange' is defined but never used.
- [ERROR] Line 338: 'endpoints' is defined but never used.
- [ERROR] Line 366: 'endpoints' is defined but never used.
- [ERROR] Line 439: 'errors' is defined but never used.
- [ERROR] Line 440: 'categories' is assigned a value but never used.
- [ERROR] Line 452: 'errors' is defined but never used.
- [ERROR] Line 453: 'statusGroups' is assigned a value but never used.
- [ERROR] Line 466: 'errors' is defined but never used.
- [ERROR] Line 747: 'timeRange' is defined but never used.
- [ERROR] Line 747: 'endpoints' is defined but never used.
- [ERROR] Line 756: 'timeRange' is defined but never used.
- [ERROR] Line 756: 'endpoints' is defined but never used.
- [ERROR] Line 762: 'timeRange' is defined but never used.

### src\pages\finance\FinancialAnalysis.tsx (16 issues)

- [ERROR] Line 6: 'AnimatePresence' is defined but never used.
- [ERROR] Line 7: 'Card' is defined but never used.
- [ERROR] Line 7: 'CardContent' is defined but never used.
- [ERROR] Line 7: 'CardDescription' is defined but never used.
- [ERROR] Line 7: 'CardHeader' is defined but never used.
- [ERROR] Line 7: 'CardTitle' is defined but never used.
- [ERROR] Line 17: 'Calculator' is defined but never used.
- [ERROR] Line 30: 'CheckCircle2' is defined but never used.
- [ERROR] Line 31: 'Clock' is defined but never used.
- [ERROR] Line 32: 'ChevronRight' is defined but never used.
- [ERROR] Line 34: 'LoadingSpinner' is defined but never used.
- [ERROR] Line 54: 'StatCard' is assigned a value but never used.
- [ERROR] Line 104: 'AnalysisCard' is assigned a value but never used.
- [ERROR] Line 108: 'trend' is assigned a value but never used.
- [ERROR] Line 140: 'balanceSheetData' is assigned a value but never used.
- [ERROR] Line 141: 'incomeStatementData' is assigned a value but never used.

### src\pages\finance\GeneralAccounting.tsx (16 issues)

- [ERROR] Line 6: 'useState' is defined but never used.
- [ERROR] Line 8: 'AnimatePresence' is defined but never used.
- [ERROR] Line 13: 'Progress' is defined but never used.
- [ERROR] Line 20: 'RefreshCw' is defined but never used.
- [ERROR] Line 24: 'Wallet' is defined but never used.
- [ERROR] Line 25: 'BarChart3' is defined but never used.
- [ERROR] Line 26: 'CheckCircle2' is defined but never used.
- [ERROR] Line 27: 'Clock' is defined but never used.
- [ERROR] Line 28: 'DollarSign' is defined but never used.
- [ERROR] Line 29: 'Building2' is defined but never used.
- [ERROR] Line 30: 'PieChart' is defined but never used.
- [ERROR] Line 31: 'Activity' is defined but never used.
- [ERROR] Line 126: 'accountsLoading' is assigned a value but never used.
- [ERROR] Line 127: 'entriesLoading' is assigned a value but never used.
- [ERROR] Line 181: 'activeTabConfig' is assigned a value but never used.
- [ERROR] Line 285: 'index' is defined but never used.

### src\pages\fleet\MaintenanceRedesigned.tsx (16 issues)

- [ERROR] Line 8: 'useCallback' is defined but never used.
- [ERROR] Line 11: 'AnimatePresence' is defined but never used.
- [ERROR] Line 29: 'LoadingSpinner' is defined but never used.
- [ERROR] Line 35: 'Edit' is defined but never used.
- [ERROR] Line 48: 'Filter' is defined but never used.
- [ERROR] Line 55: 'useVehicleStatusUpdate' is defined but never used.
- [ERROR] Line 55: 'useScheduleMaintenanceStatus' is defined but never used.
- [ERROR] Line 59: 'supabase' is defined but never used.
- [ERROR] Line 138: 'onCancel' is defined but never used.
- [ERROR] Line 171: 'navigate' is assigned a value but never used.
- [ERROR] Line 206: 'maintenanceVehicles' is assigned a value but never used.
- [ERROR] Line 206: 'maintenanceVehiclesLoading' is assigned a value but never used.
- [ERROR] Line 214: 'formatCurrency' is assigned a value but never used.
- [ERROR] Line 259: 'error' is defined but never used.
- [ERROR] Line 272: 'error' is defined but never used.
- [ERROR] Line 284: 'error' is defined but never used.

### src\components\contracts\EnhancedContractDashboard.tsx (15 issues)

- [ERROR] Line 41: 'Settings' is defined but never used.
- [ERROR] Line 43: 'Edit' is defined but never used.
- [ERROR] Line 45: 'Pause' is defined but never used.
- [ERROR] Line 47: 'PieChart' is defined but never used.
- [ERROR] Line 50: 'Users' is defined but never used.
- [ERROR] Line 51: 'Calendar' is defined but never used.
- [ERROR] Line 53: 'Zap' is defined but never used.
- [ERROR] Line 54: 'Database' is defined but never used.
- [ERROR] Line 55: 'GitBranch' is defined but never used.
- [ERROR] Line 56: 'FileCheck' is defined but never used.
- [ERROR] Line 84: 'analytics' is assigned a value but never used.
- [ERROR] Line 98: 'generateAnalytics' is assigned a value but never used.
- [ERROR] Line 104: 'workflowEngine' is assigned a value but never used.
- [ERROR] Line 105: 'complianceEngine' is assigned a value but never used.
- [ERROR] Line 106: 'analyticsEngine' is assigned a value but never used.

### src\components\invoices\InvoiceDisputeManagement.tsx (15 issues)

- [ERROR] Line 15: 'useMutation' is defined but never used.
- [ERROR] Line 21: 'Input' is defined but never used.
- [ERROR] Line 22: 'Textarea' is defined but never used.
- [ERROR] Line 24: 'DialogTrigger' is defined but never used.
- [ERROR] Line 24: 'DialogFooter' is defined but never used.
- [ERROR] Line 25: 'Label' is defined but never used.
- [ERROR] Line 26: 'Tabs' is defined but never used.
- [ERROR] Line 26: 'TabsContent' is defined but never used.
- [ERROR] Line 26: 'TabsList' is defined but never used.
- [ERROR] Line 26: 'TabsTrigger' is defined but never used.
- [ERROR] Line 34: 'TrendingUp' is defined but never used.
- [ERROR] Line 36: 'XCircle' is defined but never used.
- [ERROR] Line 37: 'AlertTriangle' is defined but never used.
- [ERROR] Line 74: 'toast' is assigned a value but never used.
- [ERROR] Line 75: 'queryClient' is assigned a value but never used.

### src\lib\reminderTemplates.ts (15 issues)

- [ERROR] Line 9: 'addDays' is defined but never used.
- [ERROR] Line 9: 'isWeekend' is defined but never used.
- [ERROR] Line 155: 'error' is defined but never used.
- [ERROR] Line 211: 'companyName' is defined but never used.
- [ERROR] Line 406: 'companyId' is defined but never used.
- [ERROR] Line 407: 'filters' is defined but never used.
- [ERROR] Line 433: 'template' is defined but never used.
- [ERROR] Line 438: 'templateId' is defined but never used.
- [ERROR] Line 439: 'updates' is defined but never used.
- [ERROR] Line 444: 'templateId' is defined but never used.
- [ERROR] Line 448: 'companyId' is defined but never used.
- [ERROR] Line 454: 'companyId' is defined but never used.
- [ERROR] Line 455: 'filters' is defined but never used.
- [ERROR] Line 469: 'companyId' is defined but never used.
- [ERROR] Line 470: 'templateId' is defined but never used.

### src\pages\dashboards\DashboardV2.tsx (15 issues)

- [ERROR] Line 3: 'AnimatePresence' is defined but never used.
- [ERROR] Line 18: 'Clock' is defined but never used.
- [ERROR] Line 19: 'AlertTriangle' is defined but never used.
- [ERROR] Line 21: 'ArrowRight' is defined but never used.
- [ERROR] Line 22: 'Calendar' is defined but never used.
- [ERROR] Line 25: 'Search' is defined but never used.
- [ERROR] Line 31: 'PieChart' is defined but never used.
- [ERROR] Line 35: 'ArrowUpRight' is defined but never used.
- [ERROR] Line 38: 'Shield' is defined but never used.
- [ERROR] Line 46: 'BarChart' is defined but never used.
- [ERROR] Line 47: 'Bar' is defined but never used.
- [ERROR] Line 48: 'LineChart' is defined but never used.
- [ERROR] Line 49: 'Line' is defined but never used.
- [ERROR] Line 58: 'Legend' is defined but never used.
- [ERROR] Line 229: 'ActivityItem' is assigned a value but never used.

### src\pages\PaymentRegistration.tsx (15 issues)

- [ERROR] Line 29: 'Calendar' is defined but never used.
- [ERROR] Line 70: 'showAdvancedSearch' is assigned a value but never used.
- [ERROR] Line 70: 'setShowAdvancedSearch' is assigned a value but never used.
- [ERROR] Line 71: 'advancedSearch' is assigned a value but never used.
- [ERROR] Line 71: 'setAdvancedSearch' is assigned a value but never used.
- [ERROR] Line 79: 'setVisibleColumns' is assigned a value but never used.
- [ERROR] Line 157: 'setCurrentPage' is assigned a value but never used.
- [ERROR] Line 158: 'setItemsPerPage' is assigned a value but never used.
- [ERROR] Line 166: 'setSortBy' is assigned a value but never used.
- [ERROR] Line 205: 'isMobileView' is assigned a value but never used.
- [ERROR] Line 205: 'setIsMobileView' is assigned a value but never used.
- [ERROR] Line 537: 'data' is assigned a value but never used.
- [ERROR] Line 559: 'filteredAndSortedContracts' is assigned a value but never used.
- [ERROR] Line 632: 'paidCount' is assigned a value but never used.
- [ERROR] Line 633: 'pendingCount' is assigned a value but never used.

### src\pages\Reports.tsx (14 issues)

- [ERROR] Line 1: 'useCallback' is defined but never used.
- [ERROR] Line 5: 'Badge' is defined but never used.
- [ERROR] Line 10: 'Calendar' is defined but never used.
- [ERROR] Line 11: 'TrendingUp' is defined but never used.
- [ERROR] Line 12: 'Users' is defined but never used.
- [ERROR] Line 13: 'Car' is defined but never used.
- [ERROR] Line 14: 'DollarSign' is defined but never used.
- [ERROR] Line 15: 'Building' is defined but never used.
- [ERROR] Line 16: 'Scale' is defined but never used.
- [ERROR] Line 17: 'AlertTriangle' is defined but never used.
- [ERROR] Line 37: 'isTablet' is assigned a value but never used.
- [ERROR] Line 37: 'isDesktop' is assigned a value but never used.
- [ERROR] Line 67: 'reportsData' is assigned a value but never used.
- [ERROR] Line 67: 'isLoading' is assigned a value but never used.

### src\components\navigation\CarRentalSidebar.tsx (13 issues)

- [ERROR] Line 15: 'Calculator' is defined but never used.
- [ERROR] Line 16: 'Receipt' is defined but never used.
- [ERROR] Line 18: 'Building' is defined but never used.
- [ERROR] Line 19: 'Target' is defined but never used.
- [ERROR] Line 20: 'PieChart' is defined but never used.
- [ERROR] Line 22: 'BookOpen' is defined but never used.
- [ERROR] Line 23: 'Landmark' is defined but never used.
- [ERROR] Line 30: 'Link' is defined but never used.
- [ERROR] Line 32: 'Zap' is defined but never used.
- [ERROR] Line 33: 'Activity' is defined but never used.
- [ERROR] Line 34: 'Wallet' is defined but never used.
- [ERROR] Line 35: 'Package' is defined but never used.
- [ERROR] Line 181: 'isActive' is assigned a value but never used.

### src\hooks\useEnhancedSmartAlerts.ts (13 issues)

- [ERROR] Line 52: 'companyId' is assigned a value but never used.
- [ERROR] Line 67: 'companyId' is assigned a value but never used.
- [ERROR] Line 80: 'companyId' is assigned a value but never used.
- [ERROR] Line 109: 'data' is defined but never used.
- [ERROR] Line 125: 'alertId' is defined but never used.
- [ERROR] Line 129: 'success' is defined but never used.
- [ERROR] Line 129: 'alertId' is defined but never used.
- [ERROR] Line 143: 'companyId' is assigned a value but never used.
- [ERROR] Line 156: 'data' is defined but never used.
- [ERROR] Line 170: 'companyId' is assigned a value but never used.
- [ERROR] Line 176: 'triggerConditions' is defined but never used.
- [ERROR] Line 177: 'notificationSettings' is defined but never used.
- [ERROR] Line 200: 'companyId' is assigned a value but never used.

### src\pages\legal\LawsuitPreparation.tsx (13 issues)

- [ERROR] Line 14: 'Separator' is defined but never used.
- [ERROR] Line 28: 'DollarSign' is defined but never used.
- [ERROR] Line 29: 'Building2' is defined but never used.
- [ERROR] Line 31: 'FileCheck' is defined but never used.
- [ERROR] Line 52: 'DAILY_LATE_FEE' is defined but never used.
- [ERROR] Line 53: 'DAMAGES_FEE' is defined but never used.
- [ERROR] Line 58: 'DOCUMENT_TYPE_NAMES' is defined but never used.
- [ERROR] Line 104: 'isAutomating' is assigned a value but never used.
- [ERROR] Line 429: 'error' is defined but never used.
- [ERROR] Line 524: 'vehicle' is assigned a value but never used.
- [ERROR] Line 555: 'startAutomation' is assigned a value but never used.
- [ERROR] Line 655: 'error' is defined but never used.
- [ERROR] Line 858: 'result' is assigned a value but never used.

### src\lib\contract-analytics.ts (12 issues)

- [ERROR] Line 15: 'startOfYear' is defined but never used.
- [ERROR] Line 16: 'endOfYear' is defined but never used.
- [ERROR] Line 18: 'subWeeks' is defined but never used.
- [ERROR] Line 20: 'subYears' is defined but never used.
- [ERROR] Line 21: 'differenceInDays' is defined but never used.
- [ERROR] Line 22: 'differenceInWeeks' is defined but never used.
- [ERROR] Line 23: 'differenceInMonths' is defined but never used.
- [ERROR] Line 24: 'differenceInYears' is defined but never used.
- [ERROR] Line 468: 'contracts' is defined but never used.
- [ERROR] Line 479: 'period' is defined but never used.
- [ERROR] Line 861: 'contract' is defined but never used.
- [ERROR] Line 934: 'addYears' is defined but never used.

### src\pages\fleet\Maintenance.tsx (12 issues)

- [ERROR] Line 15: 'Plus' is defined but never used.
- [ERROR] Line 19: 'Edit' is defined but never used.
- [ERROR] Line 32: 'supabase' is defined but never used.
- [ERROR] Line 33: 'cn' is defined but never used.
- [ERROR] Line 95: 'selectedMaintenanceId' is assigned a value but never used.
- [ERROR] Line 95: 'setSelectedMaintenanceId' is assigned a value but never used.
- [ERROR] Line 123: 'maintenanceVehiclesLoading' is assigned a value but never used.
- [ERROR] Line 131: 'formatCurrency' is assigned a value but never used.
- [ERROR] Line 132: 'completeMaintenanceStatus' is assigned a value but never used.
- [ERROR] Line 133: 'vehicleStatusUpdate' is assigned a value but never used.
- [ERROR] Line 134: 'scheduleMaintenanceStatus' is assigned a value but never used.
- [ERROR] Line 136: 'updateMaintenance' is assigned a value but never used.

### src\pages\fleet\Reservations.tsx (12 issues)

- [ERROR] Line 12: 'Badge' is defined but never used.
- [ERROR] Line 16: 'Select' is defined but never used.
- [ERROR] Line 17: 'SelectContent' is defined but never used.
- [ERROR] Line 18: 'SelectItem' is defined but never used.
- [ERROR] Line 19: 'SelectTrigger' is defined but never used.
- [ERROR] Line 20: 'SelectValue' is defined but never used.
- [ERROR] Line 22: 'LoadingSpinner' is defined but never used.
- [ERROR] Line 32: 'User' is defined but never used.
- [ERROR] Line 41: 'AlertCircle' is defined but never used.
- [ERROR] Line 44: 'MapPin' is defined but never used.
- [ERROR] Line 48: 'useVehicleStatusUpdate' is defined but never used.
- [ERROR] Line 51: 'supabase' is defined but never used.

### src\pages\fleet\TrafficViolationsRedesigned.tsx (12 issues)

- [ERROR] Line 8: 'FileText' is defined but never used.
- [ERROR] Line 9: 'DollarSign' is defined but never used.
- [ERROR] Line 24: 'Gavel' is defined but never used.
- [ERROR] Line 28: 'Card' is defined but never used.
- [ERROR] Line 28: 'CardContent' is defined but never used.
- [ERROR] Line 28: 'CardDescription' is defined but never used.
- [ERROR] Line 28: 'CardHeader' is defined but never used.
- [ERROR] Line 28: 'CardTitle' is defined but never used.
- [ERROR] Line 29: 'Badge' is defined but never used.
- [ERROR] Line 188: 'error' is defined but never used.
- [ERROR] Line 194: 'handleMarkAsPaid' is assigned a value but never used.
- [ERROR] Line 201: 'error' is defined but never used.

### src\components\contracts\SmartSuggestions.tsx (11 issues)

- [ERROR] Line 2: 'Card' is defined but never used.
- [ERROR] Line 2: 'CardContent' is defined but never used.
- [ERROR] Line 2: 'CardHeader' is defined but never used.
- [ERROR] Line 2: 'CardTitle' is defined but never used.
- [ERROR] Line 3: 'Button' is defined but never used.
- [ERROR] Line 4: 'Badge' is defined but never used.
- [ERROR] Line 5: 'AlertTriangle' is defined but never used.
- [ERROR] Line 21: 'getSuggestionIcon' is assigned a value but never used.
- [ERROR] Line 36: 'getPriorityColor' is assigned a value but never used.
- [ERROR] Line 50: 'suggestions' is defined but never used.
- [ERROR] Line 51: 'onApplySuggestion' is defined but never used.

### src\components\customers\CustomerImportWizard.tsx (11 issues)

- [ERROR] Line 15: 'CardDescription' is defined but never used.
- [ERROR] Line 18: 'Progress' is defined but never used.
- [ERROR] Line 35: 'XCircle' is defined but never used.
- [ERROR] Line 87: 'onComplete' is defined but never used.
- [ERROR] Line 95: 'progress' is assigned a value but never used.
- [ERROR] Line 100: 'customerFieldTypes' is assigned a value but never used.
- [ERROR] Line 100: 'customerRequiredFields' is assigned a value but never used.
- [ERROR] Line 125: 'idx' is defined but never used.
- [ERROR] Line 142: 'error' is defined but never used.
- [ERROR] Line 270: 'error' is defined but never used.
- [ERROR] Line 305: 'i' is defined but never used.

### src\components\customers\CustomerSplitView.tsx (11 issues)

- [ERROR] Line 18: 'Building2' is defined but never used.
- [ERROR] Line 22: 'Calendar' is defined but never used.
- [ERROR] Line 24: 'CreditCard' is defined but never used.
- [ERROR] Line 26: 'TrendingUp' is defined but never used.
- [ERROR] Line 27: 'AlertTriangle' is defined but never used.
- [ERROR] Line 28: 'CheckCircle' is defined but never used.
- [ERROR] Line 29: 'XCircle' is defined but never used.
- [ERROR] Line 38: 'format' is defined but never used.
- [ERROR] Line 39: 'ar' is defined but never used.
- [ERROR] Line 84: 'customerDetails' is assigned a value but never used.
- [ERROR] Line 84: 'detailsLoading' is assigned a value but never used.

### src\components\dashboard\QuickActionsDashboard.tsx (11 issues)

- [ERROR] Line 4: 'CardHeader' is defined but never used.
- [ERROR] Line 4: 'CardTitle' is defined but never used.
- [ERROR] Line 5: 'Button' is defined but never used.
- [ERROR] Line 8: 'Plus' is defined but never used.
- [ERROR] Line 18: 'Zap' is defined but never used.
- [ERROR] Line 42: 'user' is assigned a value but never used.
- [ERROR] Line 146: 'availableRecentActions' is assigned a value but never used.
- [ERROR] Line 185: 'customer' is defined but never used.
- [ERROR] Line 195: 'handleContractCreated' is assigned a value but never used.
- [ERROR] Line 195: 'contract' is defined but never used.
- [ERROR] Line 200: 'ActionButton' is assigned a value but never used.

### src\components\finance\charts\AccountTemplateManager.tsx (11 issues)

- [ERROR] Line 5: 'Tabs' is defined but never used.
- [ERROR] Line 5: 'TabsContent' is defined but never used.
- [ERROR] Line 5: 'TabsList' is defined but never used.
- [ERROR] Line 5: 'TabsTrigger' is defined but never used.
- [ERROR] Line 10: 'FileText' is defined but never used.
- [ERROR] Line 15: 'Users' is defined but never used.
- [ERROR] Line 35: 'getAccountsByType' is assigned a value but never used.
- [ERROR] Line 45: 'copyDefaultAccounts' is assigned a value but never used.
- [ERROR] Line 51: 'existingAccounts' is assigned a value but never used.
- [ERROR] Line 103: 'stats' is assigned a value but never used.
- [ERROR] Line 104: 'metadata' is assigned a value but never used.

### src\components\finance\MonthlyRentTracker.tsx (11 issues)

- [ERROR] Line 7: 'Card' is defined but never used.
- [ERROR] Line 7: 'CardContent' is defined but never used.
- [ERROR] Line 12: 'Progress' is defined but never used.
- [ERROR] Line 34: 'CalendarDays' is defined but never used.
- [ERROR] Line 35: 'Wallet' is defined but never used.
- [ERROR] Line 36: 'DollarSign' is defined but never used.
- [ERROR] Line 37: 'ArrowLeft' is defined but never used.
- [ERROR] Line 41: 'ChevronDown' is defined but never used.
- [ERROR] Line 116: 'navigate' is assigned a value but never used.
- [ERROR] Line 124: 'setDateFilter' is assigned a value but never used.
- [ERROR] Line 231: 'selectedMonthName' is assigned a value but never used.

### src\components\payments\ReminderTemplatesManager.tsx (11 issues)

- [ERROR] Line 12: 'CardDescription' is defined but never used.
- [ERROR] Line 38: 'Tabs' is defined but never used.
- [ERROR] Line 39: 'TabsContent' is defined but never used.
- [ERROR] Line 40: 'TabsList' is defined but never used.
- [ERROR] Line 41: 'TabsTrigger' is defined but never used.
- [ERROR] Line 52: 'Play' is defined but never used.
- [ERROR] Line 53: 'BarChart3' is defined but never used.
- [ERROR] Line 57: 'AlertCircle' is defined but never used.
- [ERROR] Line 155: 'getChannelIcon' is assigned a value but never used.
- [ERROR] Line 165: 'getStageBadgeColor' is assigned a value but never used.
- [ERROR] Line 175: 'getToneBadgeColor' is assigned a value but never used.

### src\components\RealWorldTestingInfrastructure.tsx (11 issues)

- [ERROR] Line 12: 'Textarea' is defined but never used.
- [ERROR] Line 13: 'Label' is defined but never used.
- [ERROR] Line 14: 'Input' is defined but never used.
- [ERROR] Line 17: 'Separator' is defined but never used.
- [ERROR] Line 24: 'CheckCircle' is defined but never used.
- [ERROR] Line 25: 'XCircle' is defined but never used.
- [ERROR] Line 27: 'TrendingUp' is defined but never used.
- [ERROR] Line 29: 'Users' is defined but never used.
- [ERROR] Line 35: 'Eye' is defined but never used.
- [ERROR] Line 36: 'ThumbsUp' is defined but never used.
- [ERROR] Line 37: 'ThumbsDown' is defined but never used.

### src\hooks\useEnhancedCustomers.ts (11 issues)

- [ERROR] Line 12: 'filter' is assigned a value but never used.
- [ERROR] Line 19: 'error' is defined but never used.
- [ERROR] Line 103: 'validateCompanyAccess' is assigned a value but never used.
- [ERROR] Line 103: 'browsedCompany' is assigned a value but never used.
- [ERROR] Line 103: 'isBrowsingMode' is assigned a value but never used.
- [ERROR] Line 103: 'filter' is assigned a value but never used.
- [ERROR] Line 110: 'error' is defined but never used.
- [ERROR] Line 344: 'error' is defined but never used.
- [ERROR] Line 399: 'companyId' is assigned a value but never used.
- [ERROR] Line 825: 'validateCompanyAccess' is assigned a value but never used.
- [ERROR] Line 835: '_' is defined but never used.

### src\pages\finance\ReportsAndAnalysis.tsx (11 issues)

- [ERROR] Line 8: 'AnimatePresence' is defined but never used.
- [ERROR] Line 13: 'Progress' is defined but never used.
- [ERROR] Line 24: 'PieChart' is defined but never used.
- [ERROR] Line 25: 'RefreshCw' is defined but never used.
- [ERROR] Line 26: 'Download' is defined but never used.
- [ERROR] Line 27: 'Activity' is defined but never used.
- [ERROR] Line 30: 'Sparkles' is defined but never used.
- [ERROR] Line 31: 'LineChart' is defined but never used.
- [ERROR] Line 32: 'LayoutGrid' is defined but never used.
- [ERROR] Line 128: 'isLoading' is assigned a value but never used.
- [ERROR] Line 293: 'index' is defined but never used.

### src\pages\finance\Treasury.tsx (11 issues)

- [ERROR] Line 8: 'Card' is defined but never used.
- [ERROR] Line 8: 'CardContent' is defined but never used.
- [ERROR] Line 8: 'CardDescription' is defined but never used.
- [ERROR] Line 8: 'CardHeader' is defined but never used.
- [ERROR] Line 8: 'CardTitle' is defined but never used.
- [ERROR] Line 19: 'Progress' is defined but never used.
- [ERROR] Line 24: 'CreditCard' is defined but never used.
- [ERROR] Line 33: 'Wallet' is defined but never used.
- [ERROR] Line 34: 'PiggyBank' is defined but never used.
- [ERROR] Line 39: 'DollarSign' is defined but never used.
- [ERROR] Line 43: 'LoadingSpinner' is defined but never used.

### src\pages\fleet\FleetPageRedesigned.tsx (11 issues)

- [ERROR] Line 8: 'useMemo' is defined but never used.
- [ERROR] Line 8: 'useCallback' is defined but never used.
- [ERROR] Line 25: 'Eye' is defined but never used.
- [ERROR] Line 31: 'AlertTriangle' is defined but never used.
- [ERROR] Line 32: 'CheckCircle' is defined but never used.
- [ERROR] Line 33: 'Clock' is defined but never used.
- [ERROR] Line 34: 'Fuel' is defined but never used.
- [ERROR] Line 46: 'Calendar' is defined but never used.
- [ERROR] Line 47: 'MapPin' is defined but never used.
- [ERROR] Line 424: 'error' is defined but never used.
- [ERROR] Line 463: 'handleSelectAll' is assigned a value but never used.

### src\pages\help\HelpHub.tsx (11 issues)

- [ERROR] Line 7: 'ScrollArea' is defined but never used.
- [ERROR] Line 8: 'Separator' is defined but never used.
- [ERROR] Line 24: 'Settings' is defined but never used.
- [ERROR] Line 29: 'Calendar' is defined but never used.
- [ERROR] Line 30: 'Target' is defined but never used.
- [ERROR] Line 34: 'Eye' is defined but never used.
- [ERROR] Line 37: 'Download' is defined but never used.
- [ERROR] Line 38: 'Play' is defined but never used.
- [ERROR] Line 39: 'ChevronRight' is defined but never used.
- [ERROR] Line 40: 'Lightbulb' is defined but never used.
- [ERROR] Line 43: 'Filter' is defined but never used.

### src\test\mobile\MobileTestingSuite.tsx (11 issues)

- [ERROR] Line 1: 'useEffect' is defined but never used.
- [ERROR] Line 20: 'Clock' is defined but never used.
- [ERROR] Line 25: 'Upload' is defined but never used.
- [ERROR] Line 26: 'Zap' is defined but never used.
- [ERROR] Line 30: 'FileText' is defined but never used.
- [ERROR] Line 87: 'getSessionInfo' is assigned a value but never used.
- [ERROR] Line 610: 'originalBattery' is assigned a value but never used.
- [ERROR] Line 640: 'error' is defined but never used.
- [ERROR] Line 716: 'e' is defined but never used.
- [ERROR] Line 717: 'e' is defined but never used.
- [ERROR] Line 1108: 'index' is defined but never used.

### src\components\contracts\SimpleContractWizard.tsx (10 issues)

- [ERROR] Line 60: 'contractSchema' is assigned a value but only used as a type.
- [ERROR] Line 13: 'useForm' is defined but never used.
- [ERROR] Line 14: 'zodResolver' is defined but never used.
- [ERROR] Line 24: 'Select' is defined but never used.
- [ERROR] Line 25: 'SelectContent' is defined but never used.
- [ERROR] Line 26: 'SelectItem' is defined but never used.
- [ERROR] Line 27: 'SelectTrigger' is defined but never used.
- [ERROR] Line 28: 'SelectValue' is defined but never used.
- [ERROR] Line 57: 'FormField' is defined but never used.
- [ERROR] Line 1212: 'assistantData' is assigned a value but never used.

### src\components\finance\FinanceSystemDiagnostics.tsx (10 issues)

- [ERROR] Line 4: 'Badge' is defined but never used.
- [ERROR] Line 12: 'User' is defined but never used.
- [ERROR] Line 13: 'Building' is defined but never used.
- [ERROR] Line 14: 'Shield' is defined but never used.
- [ERROR] Line 15: 'Database' is defined but never used.
- [ERROR] Line 34: 'moduleLoading' is assigned a value but never used.
- [ERROR] Line 78: 'error' is defined but never used.
- [ERROR] Line 109: 'error' is defined but never used.
- [ERROR] Line 120: 'data' is assigned a value but never used.
- [ERROR] Line 131: 'error' is defined but never used.

### src\components\IntelligentInvoiceScanner.tsx (10 issues)

- [ERROR] Line 10: 'Alert' is defined but never used.
- [ERROR] Line 10: 'AlertDescription' is defined but never used.
- [ERROR] Line 14: 'Input' is defined but never used.
- [ERROR] Line 19: 'quickPreprocess' is defined but never used.
- [ERROR] Line 19: 'analyzeImage' is defined but never used.
- [ERROR] Line 104: 'getJobs' is assigned a value but never used.
- [ERROR] Line 104: 'getStatistics' is assigned a value but never used.
- [ERROR] Line 133: 'processedFile' is assigned a value but never used.
- [ERROR] Line 134: 'improvements' is assigned a value but never used.
- [ERROR] Line 327: 'processInvoiceFile' is assigned a value but never used.

### src\components\legal\BulkRemindersDialog.tsx (10 issues)

- [ERROR] Line 7: 'motion' is defined but never used.
- [ERROR] Line 7: 'AnimatePresence' is defined but never used.
- [ERROR] Line 18: 'Checkbox' is defined but never used.
- [ERROR] Line 22: 'Select' is defined but never used.
- [ERROR] Line 23: 'SelectContent' is defined but never used.
- [ERROR] Line 24: 'SelectItem' is defined but never used.
- [ERROR] Line 25: 'SelectTrigger' is defined but never used.
- [ERROR] Line 26: 'SelectValue' is defined but never used.
- [ERROR] Line 34: 'AlertCircle' is defined but never used.
- [ERROR] Line 162: 'setPreviewCustomer' is assigned a value but never used.

### src\hooks\useEnhancedContractManagement.ts (10 issues)

- [ERROR] Line 17: 'BillingFrequency' is defined but never used.
- [ERROR] Line 18: 'PricingModel' is defined but never used.
- [ERROR] Line 34: 'ContractComplianceEngine' is defined but never used.
- [ERROR] Line 36: 'ComplianceRule' is defined but never used.
- [ERROR] Line 38: 'ComplianceSeverity' is defined but never used.
- [ERROR] Line 42: 'ContractAnalyticsEngine' is defined but never used.
- [ERROR] Line 130: 'contractLoading' is assigned a value but never used.
- [ERROR] Line 131: 'contractError' is assigned a value but never used.
- [ERROR] Line 552: 'options' is assigned a value but never used.
- [ERROR] Line 554: 'queryClient' is assigned a value but never used.

### src\pages\finance\FinancialRatios.tsx (10 issues)

- [ERROR] Line 9: 'Badge' is defined but never used.
- [ERROR] Line 10: 'Progress' is defined but never used.
- [ERROR] Line 14: 'TrendingDown' is defined but never used.
- [ERROR] Line 19: 'DollarSign' is defined but never used.
- [ERROR] Line 22: 'Target' is defined but never used.
- [ERROR] Line 25: 'PiggyBank' is defined but never used.
- [ERROR] Line 28: 'Info' is defined but never used.
- [ERROR] Line 53: 'trend' is assigned a value but never used.
- [ERROR] Line 128: 'formatCurrency' is assigned a value but never used.
- [ERROR] Line 339: 'index' is defined but never used.

### src\pages\finance\PurchaseOrders.tsx (10 issues)

- [ERROR] Line 1: 'useMemo' is defined but never used.
- [ERROR] Line 16: 'ChevronDown' is defined but never used.
- [ERROR] Line 19: 'X' is defined but never used.
- [ERROR] Line 23: 'Card' is defined but never used.
- [ERROR] Line 23: 'CardContent' is defined but never used.
- [ERROR] Line 24: 'Badge' is defined but never used.
- [ERROR] Line 30: 'CreatePurchaseOrderData' is defined but never used.
- [ERROR] Line 31: 'Vendor' is defined but never used.
- [ERROR] Line 197: 'createPurchaseOrder' is assigned a value but never used.
- [ERROR] Line 324: 'statusToTab' is assigned a value but never used.

### src\pages\Search.tsx (10 issues)

- [ERROR] Line 17: 'Calendar' is defined but never used.
- [ERROR] Line 19: 'Download' is defined but never used.
- [ERROR] Line 20: 'Eye' is defined but never used.
- [ERROR] Line 49: 'CustomerRelation' is defined but never used.
- [ERROR] Line 55: 'VehicleRelation' is defined but never used.
- [ERROR] Line 83: 'user' is assigned a value but never used.
- [ERROR] Line 85: 'searchDebug' is assigned a value but never used.
- [ERROR] Line 90: 'setIsLoading' is assigned a value but never used.
- [ERROR] Line 271: 'type' is defined but never used.
- [ERROR] Line 300: 'SearchDebugPanel' is assigned a value but never used.

### src\components\customers\AccountingSettings.tsx (9 issues)

- [ERROR] Line 3: 'Select' is defined but never used.
- [ERROR] Line 3: 'SelectContent' is defined but never used.
- [ERROR] Line 3: 'SelectItem' is defined but never used.
- [ERROR] Line 3: 'SelectTrigger' is defined but never used.
- [ERROR] Line 3: 'SelectValue' is defined but never used.
- [ERROR] Line 7: 'Separator' is defined but never used.
- [ERROR] Line 9: 'CreditCard' is defined but never used.
- [ERROR] Line 9: 'DollarSign' is defined but never used.
- [ERROR] Line 9: 'Percent' is defined but never used.

### src\components\finance\ProfessionalPaymentSystem.tsx (9 issues)

- [ERROR] Line 17: 'Link' is defined but never used.
- [ERROR] Line 22: 'toast' is defined but never used.
- [ERROR] Line 28: 'queryClient' is assigned a value but never used.
- [ERROR] Line 35: 'pendingLoading' is assigned a value but never used.
- [ERROR] Line 36: 'isProcessing' is assigned a value but never used.
- [ERROR] Line 39: 'isLinking' is assigned a value but never used.
- [ERROR] Line 44: 'selectedPayment' is assigned a value but never used.
- [ERROR] Line 46: 'handleProcessPayment' is assigned a value but never used.
- [ERROR] Line 83: 'handleSmartLink' is assigned a value but never used.

### src\components\fleet\VehicleSplitView.tsx (9 issues)

- [ERROR] Line 15: 'Progress' is defined but never used.
- [ERROR] Line 23: 'CreditCard' is defined but never used.
- [ERROR] Line 26: 'AlertTriangle' is defined but never used.
- [ERROR] Line 27: 'CheckCircle' is defined but never used.
- [ERROR] Line 28: 'XCircle' is defined but never used.
- [ERROR] Line 33: 'MapPin' is defined but never used.
- [ERROR] Line 35: 'Clock' is defined but never used.
- [ERROR] Line 38: 'ImageIcon' is defined but never used.
- [ERROR] Line 43: 'differenceInDays' is defined but never used.

### src\components\hr\permissions\ApprovalWorkflow.tsx (9 issues)

- [ERROR] Line 4: 'CardHeader' is defined but never used.
- [ERROR] Line 4: 'CardTitle' is defined but never used.
- [ERROR] Line 8: 'Input' is defined but never used.
- [ERROR] Line 10: 'DialogTrigger' is defined but never used.
- [ERROR] Line 19: 'Send' is defined but never used.
- [ERROR] Line 20: 'MessageSquare' is defined but never used.
- [ERROR] Line 23: 'Filter' is defined but never used.
- [ERROR] Line 28: 'UserRole' is defined but never used.
- [ERROR] Line 64: 'showRequestDialog' is assigned a value but never used.

### src\components\legal\SettlementTracking.tsx (9 issues)

- [ERROR] Line 5: 'Input' is defined but never used.
- [ERROR] Line 26: 'Select' is defined but never used.
- [ERROR] Line 27: 'SelectContent' is defined but never used.
- [ERROR] Line 28: 'SelectItem' is defined but never used.
- [ERROR] Line 29: 'SelectTrigger' is defined but never used.
- [ERROR] Line 30: 'SelectValue' is defined but never used.
- [ERROR] Line 32: 'Plus' is defined but never used.
- [ERROR] Line 32: 'Edit' is defined but never used.
- [ERROR] Line 66: 'showDetails' is assigned a value but never used.

### src\components\monitoring\MonitoringDashboard.tsx (9 issues)

- [ERROR] Line 134: 'setRefreshInterval' is assigned a value but never used.
- [ERROR] Line 135: 'setAutoRefresh' is assigned a value but never used.
- [ERROR] Line 138: 'performance' is assigned a value but never used.
- [ERROR] Line 139: 'healthStatus' is assigned a value but never used.
- [ERROR] Line 144: 'selectedTimeRange' is assigned a value but never used.
- [ERROR] Line 144: 'setSelectedTimeRange' is assigned a value but never used.
- [ERROR] Line 208: 'formatDuration' is assigned a value but never used.
- [ERROR] Line 317: 'errorId' is defined but never used.
- [ERROR] Line 478: 'errorId' is defined but never used.

### src\components\subscription\SubscriptionManagement.tsx (9 issues)

- [ERROR] Line 12: 'Users' is defined but never used.
- [ERROR] Line 13: 'Car' is defined but never used.
- [ERROR] Line 14: 'FileText' is defined but never used.
- [ERROR] Line 15: 'Calendar' is defined but never used.
- [ERROR] Line 17: 'XCircle' is defined but never used.
- [ERROR] Line 18: 'TrendingUp' is defined but never used.
- [ERROR] Line 19: 'Clock' is defined but never used.
- [ERROR] Line 21: 'format' is defined but never used.
- [ERROR] Line 22: 'ar' is defined but never used.

### src\hooks\useCustomers.ts (9 issues)

- [ERROR] Line 12: 'useOptimisticUpdate' is defined but never used.
- [ERROR] Line 12: 'createOptimisticAdd' is defined but never used.
- [ERROR] Line 12: 'createOptimisticUpdate' is defined but never used.
- [ERROR] Line 18: 'user' is assigned a value but never used.
- [ERROR] Line 377: 'selectedCompanyId' is assigned a value but never used.
- [ERROR] Line 484: 'selectedCompanyId' is assigned a value but never used.
- [ERROR] Line 486: '_' is defined but never used.
- [ERROR] Line 695: 'options' is defined but never used.
- [ERROR] Line 756: 'customerData' is assigned a value but never used.

### src\pages\customers\CustomerCRMRedesigned.tsx (9 issues)

- [ERROR] Line 9: 'useQuery' is defined but never used.
- [ERROR] Line 24: 'MoreHorizontal' is defined but never used.
- [ERROR] Line 29: 'Filter' is defined but never used.
- [ERROR] Line 34: 'TrendingUp' is defined but never used.
- [ERROR] Line 35: 'CheckCircle' is defined but never used.
- [ERROR] Line 37: 'Calendar' is defined but never used.
- [ERROR] Line 38: 'Activity' is defined but never used.
- [ERROR] Line 39: 'Bell' is defined but never used.
- [ERROR] Line 42: 'ChevronDownIcon' is defined but never used.

### src\pages\finance\AuditAndSettings.tsx (9 issues)

- [ERROR] Line 4: 'useState' is defined but never used.
- [ERROR] Line 4: 'useMemo' is defined but never used.
- [ERROR] Line 6: 'AnimatePresence' is defined but never used.
- [ERROR] Line 17: 'RefreshCw' is defined but never used.
- [ERROR] Line 18: 'Clock' is defined but never used.
- [ERROR] Line 19: 'Activity' is defined but never used.
- [ERROR] Line 24: 'AlertTriangle' is defined but never used.
- [ERROR] Line 25: 'CheckCircle' is defined but never used.
- [ERROR] Line 203: 'index' is defined but never used.

### src\pages\hr\UserManagement.tsx (9 issues)

- [ERROR] Line 7: 'Badge' is defined but never used.
- [ERROR] Line 13: 'Shield' is defined but never used.
- [ERROR] Line 15: 'Settings' is defined but never used.
- [ERROR] Line 25: 'Mail' is defined but never used.
- [ERROR] Line 26: 'Building2' is defined but never used.
- [ERROR] Line 27: 'KeyRound' is defined but never used.
- [ERROR] Line 28: 'Crown' is defined but never used.
- [ERROR] Line 204: 'user' is assigned a value but never used.
- [ERROR] Line 211: 'setSelectedEmployeeForPermissions' is assigned a value but never used.

### src\components\customers\EnhancedCustomerFinancialDashboard.tsx (8 issues)

- [ERROR] Line 8: 'Dialog' is defined but never used.
- [ERROR] Line 8: 'DialogContent' is defined but never used.
- [ERROR] Line 8: 'DialogHeader' is defined but never used.
- [ERROR] Line 8: 'DialogTitle' is defined but never used.
- [ERROR] Line 8: 'DialogTrigger' is defined but never used.
- [ERROR] Line 39: 'selectedPeriod' is assigned a value but never used.
- [ERROR] Line 39: 'setSelectedPeriod' is assigned a value but never used.
- [ERROR] Line 45: 'balanceData' is assigned a value but never used.

### src\components\filters\FilterPresets.tsx (8 issues)

- [ERROR] Line 17: 'X' is defined but never used.
- [ERROR] Line 41: 'Select' is defined but never used.
- [ERROR] Line 42: 'SelectContent' is defined but never used.
- [ERROR] Line 43: 'SelectItem' is defined but never used.
- [ERROR] Line 44: 'SelectTrigger' is defined but never used.
- [ERROR] Line 45: 'SelectValue' is defined but never used.
- [ERROR] Line 260: 'error' is defined but never used.
- [ERROR] Line 303: 'error' is defined but never used.

### src\components\finance\AccountingAlerts.tsx (8 issues)

- [ERROR] Line 5: 'Alert' is defined but never used.
- [ERROR] Line 5: 'AlertDescription' is defined but never used.
- [ERROR] Line 5: 'AlertTitle' is defined but never used.
- [ERROR] Line 8: 'AlertCircle' is defined but never used.
- [ERROR] Line 15: 'Calendar' is defined but never used.
- [ERROR] Line 16: 'DollarSign' is defined but never used.
- [ERROR] Line 23: 'format' is defined but never used.
- [ERROR] Line 24: 'ar' is defined but never used.

### src\components\finance\charts\ExportAccountsUtility.tsx (8 issues)

- [ERROR] Line 4: 'Select' is defined but never used.
- [ERROR] Line 4: 'SelectContent' is defined but never used.
- [ERROR] Line 4: 'SelectItem' is defined but never used.
- [ERROR] Line 4: 'SelectTrigger' is defined but never used.
- [ERROR] Line 4: 'SelectValue' is defined but never used.
- [ERROR] Line 8: 'Image' is defined but never used.
- [ERROR] Line 24: 'expandedNodes' is defined but never used.
- [ERROR] Line 54: 'error' is defined but never used.

### src\components\finance\EnhancedFinancialReportsViewer.tsx (8 issues)

- [ERROR] Line 4: 'Tabs' is defined but never used.
- [ERROR] Line 4: 'TabsContent' is defined but never used.
- [ERROR] Line 4: 'TabsList' is defined but never used.
- [ERROR] Line 4: 'TabsTrigger' is defined but never used.
- [ERROR] Line 12: 'FileText' is defined but never used.
- [ERROR] Line 14: 'Calendar' is defined but never used.
- [ERROR] Line 15: 'Filter' is defined but never used.
- [ERROR] Line 17: 'DollarSign' is defined but never used.

### src\components\fleet\CarRentalScheduler.tsx (8 issues)

- [ERROR] Line 14: 'Calendar' is defined but never used.
- [ERROR] Line 30: 'Phone' is defined but never used.
- [ERROR] Line 32: 'MapPin' is defined but never used.
- [ERROR] Line 35: 'RefreshCw' is defined but never used.
- [ERROR] Line 43: 'ar' is defined but never used.
- [ERROR] Line 151: 'user' is assigned a value but never used.
- [ERROR] Line 571: 'getDriverName' is assigned a value but never used.
- [ERROR] Line 822: 'id' is defined but never used.

### src\components\fleet\TrafficViolationsSmartDashboard.tsx (8 issues)

- [ERROR] Line 8: 'Clock' is defined but never used.
- [ERROR] Line 11: 'Car' is defined but never used.
- [ERROR] Line 12: 'Users' is defined but never used.
- [ERROR] Line 15: 'Bell' is defined but never used.
- [ERROR] Line 19: 'LoadingSpinner' is defined but never used.
- [ERROR] Line 78: 'bg' is assigned a value but never used.
- [ERROR] Line 207: 'isLoadingStats' is assigned a value but never used.
- [ERROR] Line 219: 'partiallyPaidViolations' is assigned a value but never used.

### src\components\vehicles\IntegratedVehicleInspection.tsx (8 issues)

- [ERROR] Line 20: 'Label' is defined but never used.
- [ERROR] Line 28: 'DialogHeader' is defined but never used.
- [ERROR] Line 28: 'DialogTitle' is defined but never used.
- [ERROR] Line 28: 'DialogDescription' is defined but never used.
- [ERROR] Line 31: 'Upload' is defined but never used.
- [ERROR] Line 115: 'showComparison' is assigned a value but never used.
- [ERROR] Line 115: 'setShowComparison' is assigned a value but never used.
- [ERROR] Line 130: 'comparison' is assigned a value but never used.

### src\hooks\useContractCreation.ts (8 issues)

- [ERROR] Line 7: 'createContractWithFallback' is defined but never used.
- [ERROR] Line 8: 'generateContractPdf' is defined but never used.
- [ERROR] Line 52: 'ContractCreationResult' is defined but never used.
- [ERROR] Line 71: 'createDocument' is assigned a value but never used.
- [ERROR] Line 72: 'isDocumentSaving' is assigned a value but never used.
- [ERROR] Line 77: 'isAutoConfiguring' is assigned a value but never used.
- [ERROR] Line 225: 'errorMessage' is assigned a value but never used.
- [ERROR] Line 689: 'errorMessage' is assigned a value but never used.

### src\hooks\useDuplicateContracts.ts (8 issues)

- [ERROR] Line 147: '_' is defined but never used.
- [ERROR] Line 244: '_' is defined but never used.
- [ERROR] Line 247: '_' is defined but never used.
- [ERROR] Line 248: '_' is defined but never used.
- [ERROR] Line 250: '_' is defined but never used.
- [ERROR] Line 261: '_' is defined but never used.
- [ERROR] Line 264: '_' is defined but never used.
- [ERROR] Line 267: '_' is defined but never used.

### src\pages\finance\ComplianceDashboard.tsx (8 issues)

- [ERROR] Line 9: 'useEffect' is defined but never used.
- [ERROR] Line 17: 'TrendingUp' is defined but never used.
- [ERROR] Line 18: 'TrendingDown' is defined but never used.
- [ERROR] Line 33: 'CurrencyExposureReport' is defined but never used.
- [ERROR] Line 33: 'ComplianceCalendar' is defined but never used.
- [ERROR] Line 33: 'RegulatoryReport' is defined but never used.
- [ERROR] Line 72: 'error' is defined but never used.
- [ERROR] Line 83: 'error' is defined but never used.

### src\pages\finance\Payments.tsx (8 issues)

- [ERROR] Line 8: 'Button' is defined but never used.
- [ERROR] Line 10: 'Badge' is defined but never used.
- [ERROR] Line 20: 'Clock' is defined but never used.
- [ERROR] Line 20: 'Home' is defined but never used.
- [ERROR] Line 21: 'Link' is defined but never used.
- [ERROR] Line 23: 'LoadingSpinner' is defined but never used.
- [ERROR] Line 122: 'isMobile' is assigned a value but never used.
- [ERROR] Line 138: 'pendingPayments' is assigned a value but never used.

### src\pages\mobile\MobileContractWizard.tsx (8 issues)

- [ERROR] Line 6: 'ChevronRight' is defined but never used.
- [ERROR] Line 10: 'CreditCard' is defined but never used.
- [ERROR] Line 11: 'FileText' is defined but never used.
- [ERROR] Line 20: 'useMutation' is defined but never used.
- [ERROR] Line 71: 'queryClient' is assigned a value but never used.
- [ERROR] Line 374: 'selectedCustomer' is defined but never used.
- [ERROR] Line 374: 'selectedVehicle' is defined but never used.
- [ERROR] Line 491: 'selectedVehicle' is defined but never used.

### src\pages\PermissionsManagement.tsx (8 issues)

- [ERROR] Line 8: 'Plus' is defined but never used.
- [ERROR] Line 8: 'Trash2' is defined but never used.
- [ERROR] Line 8: 'Check' is defined but never used.
- [ERROR] Line 8: 'X' is defined but never used.
- [ERROR] Line 19: 'DialogTrigger' is defined but never used.
- [ERROR] Line 53: 'user' is assigned a value but never used.
- [ERROR] Line 58: 'isRoleDialogOpen' is assigned a value but never used.
- [ERROR] Line 58: 'setIsRoleDialogOpen' is assigned a value but never used.

### src\services\complianceEngine.ts (8 issues)

- [ERROR] Line 16: 'ComplianceAuditTrail' is defined but never used.
- [ERROR] Line 529: 'reportType' is defined but never used.
- [ERROR] Line 529: 'jurisdiction' is defined but never used.
- [ERROR] Line 556: 'reportType' is defined but never used.
- [ERROR] Line 557: 'jurisdiction' is defined but never used.
- [ERROR] Line 558: 'data' is defined but never used.
- [ERROR] Line 571: 'companyId' is defined but never used.
- [ERROR] Line 581: 'entityData' is defined but never used.

### src\services\core\BaseService.ts (8 issues)

- [ERROR] Line 13: 'createOptimizedQueryFn' is defined but never used.
- [ERROR] Line 13: 'createOptimizedMutationFn' is defined but never used.
- [ERROR] Line 233: 'entity' is defined but never used.
- [ERROR] Line 249: 'existing' is defined but never used.
- [ERROR] Line 249: 'updated' is defined but never used.
- [ERROR] Line 257: 'entity' is defined but never used.
- [ERROR] Line 265: 'entity' is defined but never used.
- [ERROR] Line 275: 'data' is defined but never used.

### src\components\contracts\InteractiveVehicleInspectionForm.tsx (7 issues)

- [ERROR] Line 1: 'useCallback' is defined but never used.
- [ERROR] Line 8: 'Slider' is defined but never used.
- [ERROR] Line 15: 'Calendar' is defined but never used.
- [ERROR] Line 45: 'isDrawing' is assigned a value but never used.
- [ERROR] Line 46: 'currentTool' is assigned a value but never used.
- [ERROR] Line 46: 'setCurrentTool' is assigned a value but never used.
- [ERROR] Line 102: 'e' is defined but never used.

### src\components\contracts\PaymentFilters.tsx (7 issues)

- [ERROR] Line 6: 'useMemo' is defined but never used.
- [ERROR] Line 8: 'Badge' is defined but never used.
- [ERROR] Line 11: 'Select' is defined but never used.
- [ERROR] Line 12: 'SelectContent' is defined but never used.
- [ERROR] Line 13: 'SelectItem' is defined but never used.
- [ERROR] Line 14: 'SelectTrigger' is defined but never used.
- [ERROR] Line 15: 'SelectValue' is defined but never used.

### src\components\csv\CSVArchiveManager.tsx (7 issues)

- [ERROR] Line 4: 'CardDescription' is defined but never used.
- [ERROR] Line 4: 'CardHeader' is defined but never used.
- [ERROR] Line 4: 'CardTitle' is defined but never used.
- [ERROR] Line 6: 'DialogTrigger' is defined but never used.
- [ERROR] Line 17: 'User' is defined but never used.
- [ERROR] Line 23: 'Filter' is defined but never used.
- [ERROR] Line 29: 'toast' is defined but never used.

### src\components\customers\CRMActivityPanel.tsx (7 issues)

- [ERROR] Line 6: 'useCallback' is defined but never used.
- [ERROR] Line 17: 'Calendar' is defined but never used.
- [ERROR] Line 21: 'AlertTriangle' is defined but never used.
- [ERROR] Line 22: 'CheckCircle' is defined but never used.
- [ERROR] Line 30: 'CreditCard' is defined but never used.
- [ERROR] Line 42: 'BRAND_COLOR' is assigned a value but never used.
- [ERROR] Line 222: 'error' is defined but never used.

### src\components\customers\CustomerCSVUpload.tsx (7 issues)

- [ERROR] Line 8: 'Card' is defined but never used.
- [ERROR] Line 8: 'CardContent' is defined but never used.
- [ERROR] Line 8: 'CardDescription' is defined but never used.
- [ERROR] Line 8: 'CardHeader' is defined but never used.
- [ERROR] Line 8: 'CardTitle' is defined but never used.
- [ERROR] Line 11: 'XCircle' is defined but never used.
- [ERROR] Line 73: 'error' is defined but never used.

### src\components\dashboard\EnhancedAlertsSystem.tsx (7 issues)

- [ERROR] Line 10: 'Separator' is defined but never used.
- [ERROR] Line 23: 'Users' is defined but never used.
- [ERROR] Line 24: 'X' is defined but never used.
- [ERROR] Line 25: 'ExternalLink' is defined but never used.
- [ERROR] Line 34: 'UserNotification' is defined but never used.
- [ERROR] Line 64: 'markAllNotificationsAsRead' is assigned a value but never used.
- [ERROR] Line 261: 'IconComponent' is assigned a value but never used.

### src\components\finance\EnhancedJournalEntriesTab.tsx (7 issues)

- [ERROR] Line 9: 'CardDescription' is defined but never used.
- [ERROR] Line 32: 'Dialog' is defined but never used.
- [ERROR] Line 32: 'DialogContent' is defined but never used.
- [ERROR] Line 32: 'DialogDescription' is defined but never used.
- [ERROR] Line 32: 'DialogHeader' is defined but never used.
- [ERROR] Line 32: 'DialogTitle' is defined but never used.
- [ERROR] Line 458: 'formatCurrency' is assigned a value but never used.

### src\components\finance\FinancialAlertsSystem.tsx (7 issues)

- [ERROR] Line 8: 'AlertDescription' is defined but never used.
- [ERROR] Line 9: 'TrendingDown' is defined but never used.
- [ERROR] Line 9: 'TrendingUp' is defined but never used.
- [ERROR] Line 12: 'BudgetAlert' is defined but never used.
- [ERROR] Line 28: 'FinancialAlert' is defined but never used.
- [ERROR] Line 82: 'severity' is defined but never used.
- [ERROR] Line 93: 'getAlertVariant' is assigned a value but never used.

### src\components\layouts\EnhancedSidebar.tsx (7 issues)

- [ERROR] Line 5: 'AdminOnly' is defined but never used.
- [ERROR] Line 5: 'SuperAdminOnly' is defined but never used.
- [ERROR] Line 16: 'Shield' is defined but never used.
- [ERROR] Line 20: 'Tooltip' is defined but never used.
- [ERROR] Line 21: 'TooltipContent' is defined but never used.
- [ERROR] Line 22: 'TooltipProvider' is defined but never used.
- [ERROR] Line 23: 'TooltipTrigger' is defined but never used.

### src\components\super-admin\landing\LandingABTesting.tsx (7 issues)

- [ERROR] Line 11: 'Eye' is defined but never used.
- [ERROR] Line 34: 'deleteTest' is assigned a value but never used.
- [ERROR] Line 51: 'error' is defined but never used.
- [ERROR] Line 62: 'error' is defined but never used.
- [ERROR] Line 75: 'error' is defined but never used.
- [ERROR] Line 87: 'error' is defined but never used.
- [ERROR] Line 101: 'error' is defined but never used.

### src\examples\i18n-usage-example.tsx (7 issues)

- [ERROR] Line 23: 'ChevronRight' is defined but never used.
- [ERROR] Line 27: 'Settings' is defined but never used.
- [ERROR] Line 28: 'Globe' is defined but never used.
- [ERROR] Line 29: 'Calendar' is defined but never used.
- [ERROR] Line 64: 'currentLocale' is assigned a value but never used.
- [ERROR] Line 108: 'getMirroredIcon' is assigned a value but never used.
- [ERROR] Line 363: 'selectedLanguage' is assigned a value but never used.

### src\hooks\usePaymentsCSVUpload.ts (7 issues)

- [ERROR] Line 45: 'isBrowsingMode' is assigned a value but never used.
- [ERROR] Line 45: 'browsedCompany' is assigned a value but never used.
- [ERROR] Line 51: 'bulkUploadPayments' is assigned a value but never used.
- [ERROR] Line 434: 'findContractId' is assigned a value but never used.
- [ERROR] Line 486: 'hasRequiredPaymentFields' is assigned a value but never used.
- [ERROR] Line 493: 'findMissingRequiredFields' is assigned a value but never used.
- [ERROR] Line 832: 'isRentPayment' is assigned a value but never used.

### src\hooks\useVehicles.ts (7 issues)

- [ERROR] Line 76: 'plateNumbers' is assigned a value but never used.
- [ERROR] Line 298: 'toast' is assigned a value but never used.
- [ERROR] Line 299: 'user' is assigned a value but never used.
- [ERROR] Line 907: 'vehicleId' is defined but never used.
- [ERROR] Line 1369: 'data' is defined but never used.
- [ERROR] Line 1429: 'data' is defined but never used.
- [ERROR] Line 1493: 'data' is defined but never used.

### src\pages\dashboard\DashboardLanding.tsx (7 issues)

- [ERROR] Line 33: 'ExternalLink' is defined but never used.
- [ERROR] Line 35: 'Zap' is defined but never used.
- [ERROR] Line 37: 'Bell' is defined but never used.
- [ERROR] Line 38: 'Settings' is defined but never used.
- [ERROR] Line 39: 'MapPin' is defined but never used.
- [ERROR] Line 65: 'statsLoading' is assigned a value but never used.
- [ERROR] Line 77: 'fleetLoading' is assigned a value but never used.

### src\pages\finance\FinanceHub.tsx (7 issues)

- [ERROR] Line 11: 'AnimatePresence' is defined but never used.
- [ERROR] Line 40: 'History' is defined but never used.
- [ERROR] Line 44: 'Clock' is defined but never used.
- [ERROR] Line 54: 'ScrollArea' is defined but never used.
- [ERROR] Line 267: 'ActivityItemCard' is assigned a value but never used.
- [ERROR] Line 309: 'activitiesLoading' is assigned a value but never used.
- [ERROR] Line 323: 'activities' is assigned a value but never used.

### src\pages\finance\GeneralLedger.tsx (7 issues)

- [ERROR] Line 7: 'Card' is defined but never used.
- [ERROR] Line 7: 'CardContent' is defined but never used.
- [ERROR] Line 7: 'CardDescription' is defined but never used.
- [ERROR] Line 7: 'CardHeader' is defined but never used.
- [ERROR] Line 7: 'CardTitle' is defined but never used.
- [ERROR] Line 20: 'AlertCircle' is defined but never used.
- [ERROR] Line 118: 'layout' is assigned a value but never used.

### src\pages\fleet\reports\components\ReportGeneratorRedesigned.tsx (7 issues)

- [ERROR] Line 8: 'AnimatePresence' is defined but never used.
- [ERROR] Line 24: 'ArrowRight' is defined but never used.
- [ERROR] Line 25: 'ChevronDown' is defined but never used.
- [ERROR] Line 219: 'isDark' is defined but never used.
- [ERROR] Line 223: 'expandedCategory' is assigned a value but never used.
- [ERROR] Line 223: 'setExpandedCategory' is assigned a value but never used.
- [ERROR] Line 911: 'popularReports' is assigned a value but never used.

### src\pages\hr\Payroll.tsx (7 issues)

- [ERROR] Line 2: 'CardDescription' is defined but never used.
- [ERROR] Line 2: 'CardHeader' is defined but never used.
- [ERROR] Line 2: 'CardTitle' is defined but never used.
- [ERROR] Line 7: 'Check' is defined but never used.
- [ERROR] Line 7: 'Users' is defined but never used.
- [ERROR] Line 7: 'Calculator' is defined but never used.
- [ERROR] Line 28: 'PayrollReview' is defined but never used.

### src\pages\legal\FinancialDelinquency.tsx (7 issues)

- [ERROR] Line 12: 'Badge' is defined but never used.
- [ERROR] Line 16: 'DollarSign' is defined but never used.
- [ERROR] Line 17: 'AlertTriangle' is defined but never used.
- [ERROR] Line 19: 'Eye' is defined but never used.
- [ERROR] Line 36: 'ar' is defined but never used.
- [ERROR] Line 46: 'stats' is assigned a value but never used.
- [ERROR] Line 60: 'contractStats' is assigned a value but never used.

### src\pages\mobile\MobileCustomerForm.tsx (7 issues)

- [ERROR] Line 9: 'Mail' is defined but never used.
- [ERROR] Line 10: 'MapPin' is defined but never used.
- [ERROR] Line 12: 'Calendar' is defined but never used.
- [ERROR] Line 14: 'Camera' is defined but never used.
- [ERROR] Line 21: 'Customer' is defined but never used.
- [ERROR] Line 46: 'loading' is assigned a value but never used.
- [ERROR] Line 46: 'setLoading' is assigned a value but never used.

### src\pages\mobile\MobileOverdue.tsx (7 issues)

- [ERROR] Line 5: 'User' is defined but never used.
- [ERROR] Line 11: 'X' is defined but never used.
- [ERROR] Line 12: 'Check' is defined but never used.
- [ERROR] Line 17: 'useQuery' is defined but never used.
- [ERROR] Line 17: 'useMutation' is defined but never used.
- [ERROR] Line 36: 'navigate' is assigned a value but never used.
- [ERROR] Line 38: 'queryClient' is assigned a value but never used.

### src\components\ai-chat-assistant\AIChatWidget.tsx (6 issues)

- [ERROR] Line 14: 'MessageCircle' is defined but never used.
- [ERROR] Line 15: 'X' is defined but never used.
- [ERROR] Line 25: 'HelpCircle' is defined but never used.
- [ERROR] Line 26: 'ExternalLink' is defined but never used.
- [ERROR] Line 28: 'Navigation' is defined but never used.
- [ERROR] Line 422: 'navigateTo' is assigned a value but never used.

### src\components\contracts\ContractStatusManagement.tsx (6 issues)

- [ERROR] Line 3: 'Input' is defined but never used.
- [ERROR] Line 7: 'Card' is defined but never used.
- [ERROR] Line 7: 'CardContent' is defined but never used.
- [ERROR] Line 7: 'CardDescription' is defined but never used.
- [ERROR] Line 7: 'CardHeader' is defined but never used.
- [ERROR] Line 7: 'CardTitle' is defined but never used.

### src\components\contracts\ContractTemplateSelector.tsx (6 issues)

- [ERROR] Line 20: 'CardDescription' is defined but never used.
- [ERROR] Line 36: 'Clock' is defined but never used.
- [ERROR] Line 41: 'Edit' is defined but never used.
- [ERROR] Line 73: 'selectedTemplate' is assigned a value but never used.
- [ERROR] Line 351: 'selectedVehicle' is defined but never used.
- [ERROR] Line 352: 'formatCurrency' is defined but never used.

### src\components\contracts\EnhancedContractValidation.tsx (6 issues)

- [ERROR] Line 5: 'Progress' is defined but never used.
- [ERROR] Line 12: 'Clock' is defined but never used.
- [ERROR] Line 14: 'TrendingUp' is defined but never used.
- [ERROR] Line 17: 'ValidationAlert' is defined but never used.
- [ERROR] Line 72: 'retryCount' is assigned a value but never used.
- [ERROR] Line 74: 'validationProgress' is assigned a value but never used.

### src\components\contracts\InspectionReminders.tsx (6 issues)

- [ERROR] Line 18: 'DialogHeader' is defined but never used.
- [ERROR] Line 18: 'DialogTitle' is defined but never used.
- [ERROR] Line 18: 'DialogDescription' is defined but never used.
- [ERROR] Line 23: 'isAfter' is defined but never used.
- [ERROR] Line 350: 'selectedContract' is assigned a value but never used.
- [ERROR] Line 353: 'contractIds' is assigned a value but never used.

### src\components\dashboard\customization\SmartInsights.tsx (6 issues)

- [ERROR] Line 3: 'Calendar' is defined but never used.
- [ERROR] Line 3: 'DollarSign' is defined but never used.
- [ERROR] Line 3: 'Car' is defined but never used.
- [ERROR] Line 3: 'Users' is defined but never used.
- [ERROR] Line 3: 'FileText' is defined but never used.
- [ERROR] Line 83: 'ImpactIcon' is assigned a value but never used.

### src\components\finance\DepartmentIntegrationSummary.tsx (6 issues)

- [ERROR] Line 6: 'Building2' is defined but never used.
- [ERROR] Line 7: 'TrendingUp' is defined but never used.
- [ERROR] Line 9: 'Package' is defined but never used.
- [ERROR] Line 10: 'FileText' is defined but never used.
- [ERROR] Line 14: 'Wrench' is defined but never used.
- [ERROR] Line 16: 'Calendar' is defined but never used.

### src\components\finance\FleetifyAI_Dashboard.tsx (6 issues)

- [ERROR] Line 4: 'CardHeader' is defined but never used.
- [ERROR] Line 4: 'CardTitle' is defined but never used.
- [ERROR] Line 28: 'LoadingSpinner' is defined but never used.
- [ERROR] Line 29: 'SmartCSVUpload' is defined but never used.
- [ERROR] Line 57: 'formatCurrency' is assigned a value but never used.
- [ERROR] Line 59: 'isProcessing' is assigned a value but never used.

### src\components\fleet\PDFViewer.tsx (6 issues)

- [ERROR] Line 2: 'Card' is defined but never used.
- [ERROR] Line 2: 'CardContent' is defined but never used.
- [ERROR] Line 2: 'CardDescription' is defined but never used.
- [ERROR] Line 2: 'CardHeader' is defined but never used.
- [ERROR] Line 2: 'CardTitle' is defined but never used.
- [ERROR] Line 6: 'Eye' is defined but never used.

### src\components\fleet\VehicleSidePanel.tsx (6 issues)

- [ERROR] Line 26: 'Clock' is defined but never used.
- [ERROR] Line 27: 'ChevronLeft' is defined but never used.
- [ERROR] Line 29: 'Eye' is defined but never used.
- [ERROR] Line 31: 'Phone' is defined but never used.
- [ERROR] Line 32: 'Mail' is defined but never used.
- [ERROR] Line 33: 'Receipt' is defined but never used.

### src\components\hr\LeaveRequestForm.tsx (6 issues)

- [ERROR] Line 5: 'parseISO' is defined but never used.
- [ERROR] Line 11: 'Label' is defined but never used.
- [ERROR] Line 15: 'CardDescription' is defined but never used.
- [ERROR] Line 15: 'CardHeader' is defined but never used.
- [ERROR] Line 15: 'CardTitle' is defined but never used.
- [ERROR] Line 44: 'toast' is assigned a value but never used.

### src\components\hr\permissions\PermissionsMatrix.tsx (6 issues)

- [ERROR] Line 4: 'Button' is defined but never used.
- [ERROR] Line 25: 'Permission' is defined but never used.
- [ERROR] Line 26: 'PermissionCategory' is defined but never used.
- [ERROR] Line 93: 'selectedRole' is assigned a value but never used.
- [ERROR] Line 93: 'setSelectedRole' is assigned a value but never used.
- [ERROR] Line 192: 'isPermissionInRole' is assigned a value but never used.

### src\components\layouts\CompanyBrowserLayout.tsx (6 issues)

- [ERROR] Line 1: 'useState' is defined but never used.
- [ERROR] Line 11: 'Sheet' is defined but never used.
- [ERROR] Line 11: 'SheetContent' is defined but never used.
- [ERROR] Line 11: 'SheetHeader' is defined but never used.
- [ERROR] Line 11: 'SheetTitle' is defined but never used.
- [ERROR] Line 11: 'SheetTrigger' is defined but never used.

### src\components\monitoring\PerformanceMonitor.tsx (6 issues)

- [ERROR] Line 10: 'Progress' is defined but never used.
- [ERROR] Line 12: 'BarChart' is defined but never used.
- [ERROR] Line 12: 'Bar' is defined but never used.
- [ERROR] Line 12: 'AreaChart' is defined but never used.
- [ERROR] Line 12: 'Area' is defined but never used.
- [ERROR] Line 191: 'getSeverityColor' is assigned a value but never used.

### src\components\navigation\RealEstateSidebar.tsx (6 issues)

- [ERROR] Line 31: 'TrendingUp' is defined but never used.
- [ERROR] Line 36: 'Mail' is defined but never used.
- [ERROR] Line 37: 'Phone' is defined but never used.
- [ERROR] Line 38: 'Key' is defined but never used.
- [ERROR] Line 41: 'MessageSquare' is defined but never used.
- [ERROR] Line 277: 'isActive' is assigned a value but never used.

### src\components\payments\PaymentRegistrationTable.tsx (6 issues)

- [ERROR] Line 4: 'Search' is defined but never used.
- [ERROR] Line 5: 'Filter' is defined but never used.
- [ERROR] Line 9: 'Users' is defined but never used.
- [ERROR] Line 10: 'DollarSign' is defined but never used.
- [ERROR] Line 11: 'Calendar' is defined but never used.
- [ERROR] Line 22: 'Input' is defined but never used.

### src\components\performance\mobile\MobilePerformanceDashboard.tsx (6 issues)

- [ERROR] Line 15: 'AlertTriangle' is defined but never used.
- [ERROR] Line 16: 'CheckCircle' is defined but never used.
- [ERROR] Line 25: 'Info' is defined but never used.
- [ERROR] Line 32: 'Shield' is defined but never used.
- [ERROR] Line 33: 'Gauge' is defined but never used.
- [ERROR] Line 94: 'isOnline' is assigned a value but never used.

### src\components\reports\PropertyExportManager.tsx (6 issues)

- [ERROR] Line 15: 'Mail' is defined but never used.
- [ERROR] Line 16: 'Calendar' is defined but never used.
- [ERROR] Line 17: 'Settings' is defined but never used.
- [ERROR] Line 48: 'reportData' is defined but never used.
- [ERROR] Line 49: 'reportType' is defined but never used.
- [ERROR] Line 104: 'error' is defined but never used.

### src\components\shared\SmartCSVUpload.tsx (6 issues)

- [ERROR] Line 11: 'TabsList' is defined but never used.
- [ERROR] Line 11: 'TabsTrigger' is defined but never used.
- [ERROR] Line 18: 'AlertTriangle' is defined but never used.
- [ERROR] Line 19: 'FileSpreadsheet' is defined but never used.
- [ERROR] Line 23: 'Trash2' is defined but never used.
- [ERROR] Line 32: 'validateAccountHierarchy' is defined but never used.

### src\components\super-admin\landing\LandingMediaLibrary.tsx (6 issues)

- [ERROR] Line 2: 'CardTitle' is defined but never used.
- [ERROR] Line 8: 'Textarea' is defined but never used.
- [ERROR] Line 9: 'Filter' is defined but never used.
- [ERROR] Line 58: 'error' is defined but never used.
- [ERROR] Line 71: 'error' is defined but never used.
- [ERROR] Line 81: 'error' is defined but never used.

### src\components\taqadi\TaqadiControlPanel.tsx (6 issues)

- [ERROR] Line 43: 'isPreparing' is assigned a value but never used.
- [ERROR] Line 44: 'isReady' is assigned a value but never used.
- [ERROR] Line 45: 'isRunning' is assigned a value but never used.
- [ERROR] Line 46: 'isCompleted' is assigned a value but never used.
- [ERROR] Line 47: 'isFailed' is assigned a value but never used.
- [ERROR] Line 48: 'isCancelled' is assigned a value but never used.

### src\components\tasks\TaskKanbanBoard.tsx (6 issues)

- [ERROR] Line 20: 'Card' is defined but never used.
- [ERROR] Line 20: 'CardContent' is defined but never used.
- [ERROR] Line 20: 'CardHeader' is defined but never used.
- [ERROR] Line 20: 'CardTitle' is defined but never used.
- [ERROR] Line 37: 'MessageSquare' is defined but never used.
- [ERROR] Line 40: 'Flag' is defined but never used.

### src\components\ui\responsive-table.tsx (6 issues)

- [ERROR] Line 6: 'Button' is defined but never used.
- [ERROR] Line 7: 'Badge' is defined but never used.
- [ERROR] Line 9: 'MoreVertical' is defined but never used.
- [ERROR] Line 73: 'isTablet' is assigned a value but never used.
- [ERROR] Line 74: 'currentPage' is assigned a value but never used.
- [ERROR] Line 74: 'setCurrentPage' is assigned a value but never used.

### src\components\vehicle-installments\VehicleInstallmentDetails.tsx (6 issues)

- [ERROR] Line 2: 'Card' is defined but never used.
- [ERROR] Line 2: 'CardContent' is defined but never used.
- [ERROR] Line 2: 'CardDescription' is defined but never used.
- [ERROR] Line 2: 'CardHeader' is defined but never used.
- [ERROR] Line 2: 'CardTitle' is defined but never used.
- [ERROR] Line 8: 'X' is defined but never used.

### src\hooks\business\useContractCalculations.ts (6 issues)

- [ERROR] Line 10: 'FinancialTerms' is defined but never used.
- [ERROR] Line 12: 'calculateMonthlyPayment' is defined but never used.
- [ERROR] Line 13: 'calculateTotalRevenue' is defined but never used.
- [ERROR] Line 14: 'calculateLateFees' is defined but never used.
- [ERROR] Line 15: 'calculateEarlyTerminationFee' is defined but never used.
- [ERROR] Line 16: 'calculateProRatedRevenue' is defined but never used.

### src\hooks\useBudgetIntegration.ts (6 issues)

- [ERROR] Line 51: 'companyId' is assigned a value but never used.
- [ERROR] Line 72: 'error' is defined but never used.
- [ERROR] Line 107: 'error' is defined but never used.
- [ERROR] Line 172: 'companyId' is assigned a value but never used.
- [ERROR] Line 200: 'companyId' is assigned a value but never used.
- [ERROR] Line 309: 'companyId' is assigned a value but never used.

### src\hooks\useFinancialAnalysis.ts (6 issues)

- [ERROR] Line 4: 'startOfYear' is defined but never used.
- [ERROR] Line 4: 'endOfYear' is defined but never used.
- [ERROR] Line 4: 'subYears' is defined but never used.
- [ERROR] Line 4: 'format' is defined but never used.
- [ERROR] Line 155: 'revenue' is assigned a value but never used.
- [ERROR] Line 156: 'expenses' is assigned a value but never used.

### src\hooks\useGeneralLedger.ts (6 issues)

- [ERROR] Line 74: 'user' is assigned a value but never used.
- [ERROR] Line 485: 'filter' is assigned a value but never used.
- [ERROR] Line 651: 'entriesError' is assigned a value but never used.
- [ERROR] Line 836: 'reason' is defined but never used.
- [ERROR] Line 908: 'user' is assigned a value but never used.
- [ERROR] Line 913: 'filters' is defined but never used.

### src\hooks\useReportExport.ts (6 issues)

- [ERROR] Line 8: 'generateReportContent' is defined but never used.
- [ERROR] Line 9: 'generateDataTable' is defined but never used.
- [ERROR] Line 10: 'getTableHeaders' is defined but never used.
- [ERROR] Line 11: 'getTableCells' is defined but never used.
- [ERROR] Line 335: 'generateReportHTML' is assigned a value but never used.
- [ERROR] Line 670: 'index' is defined but never used.

### src\pages\audit\AuditDashboard.tsx (6 issues)

- [ERROR] Line 18: 'Search' is defined but never used.
- [ERROR] Line 20: 'Eye' is defined but never used.
- [ERROR] Line 22: 'XCircle' is defined but never used.
- [ERROR] Line 39: 'RealTimeAlerts' is defined but never used.
- [ERROR] Line 51: 'summary' is assigned a value but never used.
- [ERROR] Line 59: 'metricsLoading' is assigned a value but never used.

### src\pages\customers\CustomerCRMNew.tsx (6 issues)

- [ERROR] Line 9: 'useQuery' is defined but never used.
- [ERROR] Line 33: 'Button' is defined but never used.
- [ERROR] Line 87: 'Invoice' is defined but never used.
- [ERROR] Line 279: 'setExpandedId' is assigned a value but never used.
- [ERROR] Line 295: 'error' is assigned a value but never used.
- [ERROR] Line 611: 'handleQuickUpdate' is assigned a value but never used.

### src\pages\finance\FixedAssets.tsx (6 issues)

- [ERROR] Line 7: 'Card' is defined but never used.
- [ERROR] Line 7: 'CardContent' is defined but never used.
- [ERROR] Line 18: 'Building' is defined but never used.
- [ERROR] Line 32: 'Layers' is defined but never used.
- [ERROR] Line 42: 'LoadingSpinner' is defined but never used.
- [ERROR] Line 106: 'accounts' is assigned a value but never used.

### src\pages\finance\InvoiceReports.tsx (6 issues)

- [ERROR] Line 4: 'Input' is defined but never used.
- [ERROR] Line 16: 'Calendar' is defined but never used.
- [ERROR] Line 17: 'FileText' is defined but never used.
- [ERROR] Line 26: 'selectedPeriod' is assigned a value but never used.
- [ERROR] Line 26: 'setSelectedPeriod' is assigned a value but never used.
- [ERROR] Line 31: 'costCenters' is assigned a value but never used.

### src\pages\fleet\reports\FleetReportsPage.tsx (6 issues)

- [ERROR] Line 28: 'Calendar' is defined but never used.
- [ERROR] Line 29: 'Download' is defined but never used.
- [ERROR] Line 30: 'Filter' is defined but never used.
- [ERROR] Line 35: 'ArrowUpRight' is defined but never used.
- [ERROR] Line 62: 'FleetKPICards' is defined but never used.
- [ERROR] Line 232: 'financialLoading' is assigned a value but never used.

### src\pages\legal\LegalReportsRedesigned.tsx (6 issues)

- [ERROR] Line 13: 'Card' is defined but never used.
- [ERROR] Line 13: 'CardContent' is defined but never used.
- [ERROR] Line 30: 'AlertTriangle' is defined but never used.
- [ERROR] Line 32: 'Calendar' is defined but never used.
- [ERROR] Line 35: 'HelpCircle' is defined but never used.
- [ERROR] Line 41: 'TrendingUp' is defined but never used.

### src\pages\payments\QuickPayment.tsx (6 issues)

- [ERROR] Line 13: 'Users' is defined but never used.
- [ERROR] Line 14: 'TrendingUp' is defined but never used.
- [ERROR] Line 15: 'CreditCard' is defined but never used.
- [ERROR] Line 16: 'CheckCircle' is defined but never used.
- [ERROR] Line 17: 'Clock' is defined but never used.
- [ERROR] Line 18: 'AlertCircle' is defined but never used.

### src\pages\payments\QuickPaymentRedesigned.tsx (6 issues)

- [ERROR] Line 11: 'DollarSign' is defined but never used.
- [ERROR] Line 13: 'Users' is defined but never used.
- [ERROR] Line 14: 'TrendingUp' is defined but never used.
- [ERROR] Line 19: 'ArrowLeft' is defined but never used.
- [ERROR] Line 20: 'X' is defined but never used.
- [ERROR] Line 24: 'CardHeader' is defined but never used.

### src\pages\super-admin\Payments.tsx (6 issues)

- [ERROR] Line 21: 'DollarSign' is defined but never used.
- [ERROR] Line 23: 'Users' is defined but never used.
- [ERROR] Line 25: 'FileText' is defined but never used.
- [ERROR] Line 26: 'Download' is defined but never used.
- [ERROR] Line 32: 'PieChart' is defined but never used.
- [ERROR] Line 34: 'Globe' is defined but never used.

### src\pages\tasks\TasksPage.tsx (6 issues)

- [ERROR] Line 2: 'AnimatePresence' is defined but never used.
- [ERROR] Line 53: 'Filter' is defined but never used.
- [ERROR] Line 59: 'AlertTriangle' is defined but never used.
- [ERROR] Line 61: 'Users' is defined but never used.
- [ERROR] Line 109: 'showFilters' is assigned a value but never used.
- [ERROR] Line 109: 'setShowFilters' is assigned a value but never used.

### src\scripts\import-traffic-violations-from-pdf.ts (6 issues)

- [ERROR] Line 67: 'e' is defined but never used.
- [ERROR] Line 121: 'cleanText' is assigned a value but never used.
- [ERROR] Line 126: 'violationNumbers' is assigned a value but never used.
- [ERROR] Line 129: 'plateNumberPattern' is assigned a value but never used.
- [ERROR] Line 132: 'datePattern' is assigned a value but never used.
- [ERROR] Line 135: 'finePattern' is assigned a value but never used.

### src\utils\legal-document-generator.ts (6 issues)

- [ERROR] Line 37: 'ones' is assigned a value but never used.
- [ERROR] Line 38: 'tens' is assigned a value but never used.
- [ERROR] Line 39: 'hundreds' is assigned a value but never used.
- [ERROR] Line 40: 'thousands' is assigned a value but never used.
- [ERROR] Line 41: 'tenThousands' is assigned a value but never used.
- [ERROR] Line 186: 'today' is assigned a value but never used.

### src\App.tsx (5 issues)

- [ERROR] Line 13: 'ThemeProvider' is defined but never used.
- [ERROR] Line 23: 'TooltipProvider' is defined but never used.
- [ERROR] Line 40: 'performanceMonitor' is defined but never used.
- [ERROR] Line 41: 'performanceLogger' is defined but never used.
- [ERROR] Line 45: 'preloadRelatedRoutes' is defined but never used.

### src\components\audit\ComplianceMetrics.tsx (5 issues)

- [ERROR] Line 18: 'TrendingUp' is defined but never used.
- [ERROR] Line 19: 'TrendingDown' is defined but never used.
- [ERROR] Line 21: 'Eye' is defined but never used.
- [ERROR] Line 26: 'format' is defined but never used.
- [ERROR] Line 55: 'getComplianceScoreColor' is assigned a value but never used.

### src\components\contracts\ContractInvoiceDialog.tsx (5 issues)

- [ERROR] Line 9: 'DollarSign' is defined but never used.
- [ERROR] Line 9: 'Calendar' is defined but never used.
- [ERROR] Line 34: 'paymentScheduleCreated' is assigned a value but never used.
- [ERROR] Line 68: 'costCenters' is assigned a value but never used.
- [ERROR] Line 91: 'calculateTotals' is assigned a value but never used.

### src\components\contracts\DuplicateContractsManager.tsx (5 issues)

- [ERROR] Line 12: 'Eye' is defined but never used.
- [ERROR] Line 16: 'Users' is defined but never used.
- [ERROR] Line 20: 'Bug' is defined but never used.
- [ERROR] Line 22: 'DuplicateGroup' is defined but never used.
- [ERROR] Line 31: 'resetProgress' is assigned a value but never used.

### src\components\customers\CreateCustomerWithDuplicateCheck.tsx (5 issues)

- [ERROR] Line 15: 'Tabs' is defined but never used.
- [ERROR] Line 15: 'TabsContent' is defined but never used.
- [ERROR] Line 15: 'TabsList' is defined but never used.
- [ERROR] Line 15: 'TabsTrigger' is defined but never used.
- [ERROR] Line 16: 'Separator' is defined but never used.

### src\components\customers\CustomerSidePanel.tsx (5 issues)

- [ERROR] Line 32: 'ChevronRight' is defined but never used.
- [ERROR] Line 36: 'Shield' is defined but never used.
- [ERROR] Line 278: 'vehicles' is assigned a value but never used.
- [ERROR] Line 279: 'tasks' is assigned a value but never used.
- [ERROR] Line 869: 'index' is defined but never used.

### src\components\dashboard\FinancialAnalyticsSection.tsx (5 issues)

- [ERROR] Line 1: 'useMemo' is defined but never used.
- [ERROR] Line 3: 'TrendingUp' is defined but never used.
- [ERROR] Line 3: 'Users' is defined but never used.
- [ERROR] Line 25: 'financialData' is assigned a value but never used.
- [ERROR] Line 112: 'dayNames' is assigned a value but never used.

### src\components\dashboard\customization\OptimizedDashboard.tsx (5 issues)

- [ERROR] Line 1: 'useMemo' is defined but never used.
- [ERROR] Line 3: 'Cache' is defined but never used.
- [ERROR] Line 28: 'PERFORMANCE_SETTINGS' is assigned a value but never used.
- [ERROR] Line 267: 'paymentsResponse' is assigned a value but never used.
- [ERROR] Line 423: 'totalStages' is assigned a value but never used.

### src\components\finance\CashReceiptVoucher.tsx (5 issues)

- [ERROR] Line 6: 'Button' is defined but never used.
- [ERROR] Line 8: 'Separator' is defined but never used.
- [ERROR] Line 12: 'Printer' is defined but never used.
- [ERROR] Line 13: 'FileText' is defined but never used.
- [ERROR] Line 30: 'onPrint' is defined but never used.

### src\components\finance\HierarchicalAccountsList.tsx (5 issues)

- [ERROR] Line 9: 'AccountDeleteConfirmDialog' is defined but never used.
- [ERROR] Line 39: 'onDeleteAccount' is defined but never used.
- [ERROR] Line 46: 'deleteDialogOpen' is assigned a value but never used.
- [ERROR] Line 47: 'accountToDelete' is assigned a value but never used.
- [ERROR] Line 62: 'handleDeleteSuccess' is assigned a value but never used.

### src\components\finance\InvoiceEditDialog.tsx (5 issues)

- [ERROR] Line 10: 'TestTube' is defined but never used.
- [ERROR] Line 13: 'ChartOfAccount' is defined but never used.
- [ERROR] Line 40: 'costCentersLoading' is assigned a value but never used.
- [ERROR] Line 41: 'fixedAssets' is assigned a value but never used.
- [ERROR] Line 41: 'assetsLoading' is assigned a value but never used.

### src\components\finance\payment-upload\FastProcessingMode.tsx (5 issues)

- [ERROR] Line 24: 'CheckCircle' is defined but never used.
- [ERROR] Line 41: 'fieldTypes' is defined but never used.
- [ERROR] Line 42: 'requiredFields' is defined but never used.
- [ERROR] Line 68: 'isBulkProcessing' is assigned a value but never used.
- [ERROR] Line 150: 'index' is defined but never used.

### src\components\finance\ProfessionalAccountStatement.tsx (5 issues)

- [ERROR] Line 9: 'Separator' is defined but never used.
- [ERROR] Line 11: 'Calendar' is defined but never used.
- [ERROR] Line 21: 'Eye' is defined but never used.
- [ERROR] Line 23: 'Settings' is defined but never used.
- [ERROR] Line 62: 'isLoading' is assigned a value but never used.

### src\components\finance\ProtectedFinanceRoute.tsx (5 issues)

- [ERROR] Line 10: 'Shield' is defined but never used.
- [ERROR] Line 10: 'Building' is defined but never used.
- [ERROR] Line 10: 'Settings' is defined but never used.
- [ERROR] Line 34: 'diagnostics' is assigned a value but never used.
- [ERROR] Line 123: 'hasAllPermissions' is assigned a value but never used.

### src\components\finance\VendorDetailsDialog.tsx (5 issues)

- [ERROR] Line 1: 'useState' is defined but never used.
- [ERROR] Line 5: 'Input' is defined but never used.
- [ERROR] Line 10: 'Building2' is defined but never used.
- [ERROR] Line 10: 'Edit' is defined but never used.
- [ERROR] Line 10: 'Trash2' is defined but never used.

### src\components\fleet\DispatchPermitDetailsDialog.tsx (5 issues)

- [ERROR] Line 13: 'MessageSquare' is defined but never used.
- [ERROR] Line 123: 'error' is defined but never used.
- [ERROR] Line 156: 'error' is defined but never used.
- [ERROR] Line 177: 'error' is defined but never used.
- [ERROR] Line 198: 'error' is defined but never used.

### src\components\landing\enterprise\EnterpriseTrustedBy.tsx (5 issues)

- [ERROR] Line 2: 'MapPin' is defined but never used.
- [ERROR] Line 2: 'Users' is defined but never used.
- [ERROR] Line 2: 'Building2' is defined but never used.
- [ERROR] Line 2: 'FileText' is defined but never used.
- [ERROR] Line 2: 'TrendingUp' is defined but never used.

### src\components\legal\CaseDashboard.tsx (5 issues)

- [ERROR] Line 5: 'BarChart' is defined but never used.
- [ERROR] Line 6: 'Bar' is defined but never used.
- [ERROR] Line 22: 'TrendingUp' is defined but never used.
- [ERROR] Line 59: 'priorityColors' is assigned a value but never used.
- [ERROR] Line 69: 'stats' is assigned a value but never used.

### src\components\payments\CollectionsDashboard.tsx (5 issues)

- [ERROR] Line 8: 'useEffect' is defined but never used.
- [ERROR] Line 10: 'supabase' is defined but never used.
- [ERROR] Line 27: 'Calendar' is defined but never used.
- [ERROR] Line 34: 'XCircle' is defined but never used.
- [ERROR] Line 45: 'CollectionsSummary' is defined but never used.

### src\components\performance\PerformanceTestSuite.tsx (5 issues)

- [ERROR] Line 1: 'useEffect' is defined but never used.
- [ERROR] Line 2: 'PerformanceLog' is defined but never used.
- [ERROR] Line 4: 'useQuery' is defined but never used.
- [ERROR] Line 127: 'queryKey' is assigned a value but never used.
- [ERROR] Line 130: 'mockQueryFn' is assigned a value but never used.

### src\components\super-admin\landing\LandingThemeSettings.tsx (5 issues)

- [ERROR] Line 29: 'loading' is assigned a value but never used.
- [ERROR] Line 71: 'error' is defined but never used.
- [ERROR] Line 83: 'error' is defined but never used.
- [ERROR] Line 105: 'error' is defined but never used.
- [ERROR] Line 145: 'error' is defined but never used.

### src\hooks\useContractCSVUploadFixed.ts (5 issues)

- [ERROR] Line 4: 'toast' is defined but never used.
- [ERROR] Line 18: 'companyId' is assigned a value but never used.
- [ERROR] Line 19: 'setIsUploading' is assigned a value but never used.
- [ERROR] Line 20: 'setProgress' is assigned a value but never used.
- [ERROR] Line 21: 'setResults' is assigned a value but never used.

### src\hooks\useFinancialOverview.ts (5 issues)

- [ERROR] Line 57: 'oneMonthAgo' is assigned a value but never used.
- [ERROR] Line 220: 'generateSimpleMonthlyTrend' is defined but never used.
- [ERROR] Line 243: 'calculateMonthlyTrend' is defined but never used.
- [ERROR] Line 295: 'year' is assigned a value but never used.
- [ERROR] Line 349: 'calculateExpenseCategories' is defined but never used.

### src\hooks\useOptimizedRecentActivities.ts (5 issues)

- [ERROR] Line 164: 'enhanceActivityMessage' is defined but never used.
- [ERROR] Line 361: 'enhanceVehicleMessage' is defined but never used.
- [ERROR] Line 415: 'getTableIcon' is defined but never used.
- [ERROR] Line 427: 'getTableColor' is defined but never used.
- [ERROR] Line 439: 'generateDescription' is defined but never used.

### src\hooks\useUniversalDataReader.ts (5 issues)

- [ERROR] Line 254: 'setIsLoading' is assigned a value but never used.
- [ERROR] Line 255: 'setError' is assigned a value but never used.
- [ERROR] Line 256: 'setDataCache' is assigned a value but never used.
- [ERROR] Line 563: 'companyId' is defined but never used.
- [ERROR] Line 564: 'aggregation' is defined but never used.

### src\lib\i18n\config.ts (5 issues)

- [ERROR] Line 17: 'LocaleConfig' is defined but never used.
- [ERROR] Line 239: 'error' is defined but never used.
- [ERROR] Line 254: 'error' is defined but never used.
- [ERROR] Line 280: 'error' is defined but never used.
- [ERROR] Line 314: 'error' is defined but never used.

### src\modules\core\components\DynamicSidebar.tsx (5 issues)

- [ERROR] Line 1: 'useState' is defined but never used.
- [ERROR] Line 24: 'ModuleRoute' is defined but never used.
- [ERROR] Line 24: 'ModuleName' is defined but never used.
- [ERROR] Line 27: 'useUnifiedCompanyAccess' is defined but never used.
- [ERROR] Line 75: 'currentPath' is assigned a value but never used.

### src\navigation\navigationConfig.ts (5 issues)

- [ERROR] Line 15: 'CreditCard' is defined but never used.
- [ERROR] Line 25: 'Activity' is defined but never used.
- [ERROR] Line 30: 'UserCog' is defined but never used.
- [ERROR] Line 31: 'AlertCircle' is defined but never used.
- [ERROR] Line 38: 'LayoutDashboard' is defined but never used.

### src\pages\dashboards\IntegrationDashboard.tsx (5 issues)

- [ERROR] Line 12: 'LinkIcon' is defined but never used.
- [ERROR] Line 48: 'user' is assigned a value but never used.
- [ERROR] Line 73: 'outOfStockLoading' is assigned a value but never used.
- [ERROR] Line 75: 'fulfillmentLoading' is assigned a value but never used.
- [ERROR] Line 76: 'delayedLoading' is assigned a value but never used.

### src\pages\finance\Calculator.tsx (5 issues)

- [ERROR] Line 1: 'useEffect' is defined but never used.
- [ERROR] Line 15: 'Calendar' is defined but never used.
- [ERROR] Line 16: 'Percent' is defined but never used.
- [ERROR] Line 19: 'Save' is defined but never used.
- [ERROR] Line 22: 'Info' is defined but never used.

### src\pages\finance\Ledger.tsx (5 issues)

- [ERROR] Line 8: 'CardTitle' is defined but never used.
- [ERROR] Line 25: 'Download' is defined but never used.
- [ERROR] Line 31: 'TrendingUp' is defined but never used.
- [ERROR] Line 32: 'TrendingDown' is defined but never used.
- [ERROR] Line 100: 'isLoadingAccounts' is assigned a value but never used.

### src\pages\finance\Reports.tsx (5 issues)

- [ERROR] Line 18: 'Clock' is defined but never used.
- [ERROR] Line 19: 'Filter' is defined but never used.
- [ERROR] Line 20: 'PieChart' is defined but never used.
- [ERROR] Line 22: 'RefreshCw' is defined but never used.
- [ERROR] Line 241: 'index' is defined but never used.

### src\pages\finance\UnifiedFinance.tsx (5 issues)

- [ERROR] Line 3: 'Card' is defined but never used.
- [ERROR] Line 3: 'CardContent' is defined but never used.
- [ERROR] Line 3: 'CardDescription' is defined but never used.
- [ERROR] Line 3: 'CardHeader' is defined but never used.
- [ERROR] Line 3: 'CardTitle' is defined but never used.

### src\pages\fleet\reports\components\FleetCharts.tsx (5 issues)

- [ERROR] Line 11: 'AreaChart' is defined but never used.
- [ERROR] Line 15: 'LineChart' is defined but never used.
- [ERROR] Line 33: 'BarChart3' is defined but never used.
- [ERROR] Line 34: 'PieChartIcon' is defined but never used.
- [ERROR] Line 35: 'Activity' is defined but never used.

### src\pages\hr\Employees.tsx (5 issues)

- [ERROR] Line 3: 'CardDescription' is defined but never used.
- [ERROR] Line 3: 'CardHeader' is defined but never used.
- [ERROR] Line 3: 'CardTitle' is defined but never used.
- [ERROR] Line 7: 'Eye' is defined but never used.
- [ERROR] Line 63: 'user' is assigned a value but never used.

### src\pages\inventory\Inventory.tsx (5 issues)

- [ERROR] Line 13: 'useItemStockLevels' is defined but never used.
- [ERROR] Line 21: 'PageHelp' is defined but never used.
- [ERROR] Line 22: 'InventoryPageHelpContent' is defined but never used.
- [ERROR] Line 30: 'isEditDialogOpen' is assigned a value but never used.
- [ERROR] Line 78: 'getStockBadgeVariant' is assigned a value but never used.

### src\pages\sales\SalesAnalytics.tsx (5 issues)

- [ERROR] Line 16: 'comparisonPeriod' is assigned a value but never used.
- [ERROR] Line 16: 'setComparisonPeriod' is assigned a value but never used.
- [ERROR] Line 19: 'pipelineMetrics' is assigned a value but never used.
- [ERROR] Line 34: 'totalRevenue' is assigned a value but never used.
- [ERROR] Line 193: 'index' is defined but never used.

### src\pages\settings\ElectronicSignatureSettings.tsx (5 issues)

- [ERROR] Line 2: 'Card' is defined but never used.
- [ERROR] Line 2: 'CardContent' is defined but never used.
- [ERROR] Line 2: 'CardDescription' is defined but never used.
- [ERROR] Line 2: 'CardHeader' is defined but never used.
- [ERROR] Line 2: 'CardTitle' is defined but never used.

### src\pages\super-admin\Dashboard.tsx (5 issues)

- [ERROR] Line 11: 'Target' is defined but never used.
- [ERROR] Line 11: 'Zap' is defined but never used.
- [ERROR] Line 11: 'Building2' is defined but never used.
- [ERROR] Line 11: 'Users' is defined but never used.
- [ERROR] Line 11: 'DollarSign' is defined but never used.

### src\services\auditService.ts (5 issues)

- [ERROR] Line 686: 'record' is defined but never used.
- [ERROR] Line 767: 'companyId' is defined but never used.
- [ERROR] Line 767: 'startDate' is defined but never used.
- [ERROR] Line 767: 'endDate' is defined but never used.
- [ERROR] Line 930: 'error' is assigned a value but never used.

### src\services\PaymentLinkingService.ts (5 issues)

- [ERROR] Line 12: 'ValidationResult' is defined but never used.
- [ERROR] Line 16: 'logger' is defined but never used.
- [ERROR] Line 18: 'paymentStateMachine' is defined but never used.
- [ERROR] Line 747: 'confidence' is defined but never used.
- [ERROR] Line 772: 'confidence' is defined but never used.

### src\utils\csvAutoFix.ts (5 issues)

- [ERROR] Line 286: 'fieldTypes' is defined but never used.
- [ERROR] Line 286: 'requiredFields' is defined but never used.
- [ERROR] Line 286: 'locale' is defined but never used.
- [ERROR] Line 312: 'fieldTypes' is defined but never used.
- [ERROR] Line 312: 'requiredFields' is defined but never used.

### src\utils\exports\excelExport.ts (5 issues)

- [ERROR] Line 73: 'ExcelJS' is assigned a value but never used.
- [ERROR] Line 102: 'colNumber' is defined but never used.
- [ERROR] Line 342: 'index' is defined but never used.
- [ERROR] Line 352: 'index' is defined but never used.
- [ERROR] Line 458: 'error' is defined but never used.

### src\components\admin\BackupManagement.tsx (4 issues)

- [ERROR] Line 7: 'Progress' is defined but never used.
- [ERROR] Line 17: 'AlertTriangle' is defined but never used.
- [ERROR] Line 70: 'error' is defined but never used.
- [ERROR] Line 81: 'backupId' is defined but never used.

### src\components\audit\AuditLogDetailsDialog.tsx (4 issues)

- [ERROR] Line 21: 'Calendar' is defined but never used.
- [ERROR] Line 22: 'Globe' is defined but never used.
- [ERROR] Line 28: 'Hash' is defined but never used.
- [ERROR] Line 36: 'cn' is defined but never used.

### src\components\contracts\ContractTemplates.tsx (4 issues)

- [ERROR] Line 11: 'RadioGroup' is defined but never used.
- [ERROR] Line 11: 'RadioGroupItem' is defined but never used.
- [ERROR] Line 12: 'Label' is defined but never used.
- [ERROR] Line 20: 'DialogFooter' is defined but never used.

### src\components\contracts\ExpressContractForm.tsx (4 issues)

- [ERROR] Line 12: 'Input' is defined but never used.
- [ERROR] Line 33: 'FileText' is defined but never used.
- [ERROR] Line 43: 'ContractTemplate' is defined but never used.
- [ERROR] Line 56: 'user' is assigned a value but never used.

### src\components\contracts\IntelligentContractPreview.tsx (4 issues)

- [ERROR] Line 8: 'Separator' is defined but never used.
- [ERROR] Line 9: 'Progress' is defined but never used.
- [ERROR] Line 22: 'ProcessingResult' is defined but never used.
- [ERROR] Line 181: 'index' is defined but never used.

### src\components\contracts\VehicleConditionWizardStep.tsx (4 issues)

- [ERROR] Line 128: 'updateConditionReport' is assigned a value but never used.
- [ERROR] Line 130: 'exportDiagram' is assigned a value but never used.
- [ERROR] Line 212: 'profile' is assigned a value but never used.
- [ERROR] Line 402: 'imageBlob' is defined but never used.

### src\components\customers\AccountLinking.tsx (4 issues)

- [ERROR] Line 2: 'FormLabel' is defined but never used.
- [ERROR] Line 26: 'selectedAccounts' is assigned a value but never used.
- [ERROR] Line 26: 'setSelectedAccounts' is assigned a value but never used.
- [ERROR] Line 35: 'accountType' is defined but never used.

### src\components\customers\CustomerAccountStatement.tsx (4 issues)

- [ERROR] Line 10: 'CalendarIcon' is defined but never used.
- [ERROR] Line 16: 'Mail' is defined but never used.
- [ERROR] Line 17: 'Settings' is defined but never used.
- [ERROR] Line 18: 'Eye' is defined but never used.

### src\components\dashboard\Enhanced3DStatsGrid.tsx (4 issues)

- [ERROR] Line 14: 'Target' is defined but never used.
- [ERROR] Line 16: 'Zap' is defined but never used.
- [ERROR] Line 17: 'Shield' is defined but never used.
- [ERROR] Line 20: 'StatCardNumber' is defined but never used.

### src\components\dashboard\EnhancedStatsCard.tsx (4 issues)

- [ERROR] Line 9: 'Tooltip' is defined but never used.
- [ERROR] Line 10: 'TooltipContent' is defined but never used.
- [ERROR] Line 11: 'TooltipTrigger' is defined but never used.
- [ERROR] Line 45: 'getTrendColor' is assigned a value but never used.

### src\components\dashboard\RealEstateQuickActions.tsx (4 issues)

- [ERROR] Line 7: 'Plus' is defined but never used.
- [ERROR] Line 12: 'Calculator' is defined but never used.
- [ERROR] Line 13: 'Search' is defined but never used.
- [ERROR] Line 150: 'user' is assigned a value but never used.

### src\components\dashboard\real-estate\LeaseExpiryWidget.tsx (4 issues)

- [ERROR] Line 13: 'EmptyStateCompact' is defined but never used.
- [ERROR] Line 14: 'EnhancedTooltip' is defined but never used.
- [ERROR] Line 14: 'kpiDefinitions' is defined but never used.
- [ERROR] Line 210: 'index' is defined but never used.

### src\components\dashboard\retail\TopProductsWidget.tsx (4 issues)

- [ERROR] Line 6: 'DollarSign' is defined but never used.
- [ERROR] Line 20: 'Skeleton' is defined but never used.
- [ERROR] Line 32: 'EnhancedTooltip' is defined but never used.
- [ERROR] Line 32: 'kpiDefinitions' is defined but never used.

### src\components\EnhancedMobileCamera.tsx (4 issues)

- [ERROR] Line 10: 'Progress' is defined but never used.
- [ERROR] Line 18: 'Maximize2' is defined but never used.
- [ERROR] Line 21: 'Settings' is defined but never used.
- [ERROR] Line 48: 'setAutoFocusEnabled' is assigned a value but never used.

### src\components\finance\ARAgingReport.tsx (4 issues)

- [ERROR] Line 32: 'TrendingDown' is defined but never used.
- [ERROR] Line 33: 'TrendingUp' is defined but never used.
- [ERROR] Line 37: 'FileText' is defined but never used.
- [ERROR] Line 100: 'summaryLoading' is assigned a value but never used.

### src\components\finance\AdvancedFinancialReports.tsx (4 issues)

- [ERROR] Line 9: 'Calendar' is defined but never used.
- [ERROR] Line 13: 'PieChart' is defined but never used.
- [ERROR] Line 26: 'AccountLevelBadge' is defined but never used.
- [ERROR] Line 49: 'reportingAccounts' is assigned a value but never used.

### src\components\finance\charts\AccountSelectionDialog.tsx (4 issues)

- [ERROR] Line 9: 'Separator' is defined but never used.
- [ERROR] Line 10: 'Alert' is defined but never used.
- [ERROR] Line 10: 'AlertDescription' is defined but never used.
- [ERROR] Line 77: 'getAccountTypeLabel' is assigned a value but never used.

### src\components\finance\JournalEntryForm.tsx (4 issues)

- [ERROR] Line 13: 'DialogTrigger' is defined but never used.
- [ERROR] Line 18: 'ChartOfAccount' is defined but never used.
- [ERROR] Line 81: 'accountSearchOpen' is assigned a value but never used.
- [ERROR] Line 81: 'setAccountSearchOpen' is assigned a value but never used.

### src\components\finance\PaymentTracking.tsx (4 issues)

- [ERROR] Line 22: 'Checkbox' is defined but never used.
- [ERROR] Line 45: 'TrendingUp' is defined but never used.
- [ERROR] Line 47: 'Receipt' is defined but never used.
- [ERROR] Line 613: 'index' is defined but never used.

### src\components\finance\SimpleDeleteAllAccountsDialog.tsx (4 issues)

- [ERROR] Line 63: 'directTestLoading' is assigned a value but never used.
- [ERROR] Line 65: 'testDirectFetch' is assigned a value but never used.
- [ERROR] Line 115: 'isSuperAdmin' is assigned a value but never used.
- [ERROR] Line 119: 'regularAccounts' is assigned a value but never used.

### src\components\finance\wizard\AccountsCustomization.tsx (4 issues)

- [ERROR] Line 3: 'CardHeader' is defined but never used.
- [ERROR] Line 3: 'CardTitle' is defined but never used.
- [ERROR] Line 11: 'CheckCircle' is defined but never used.
- [ERROR] Line 12: 'Plus' is defined but never used.

### src\components\fleet\VehicleAlertPanel.tsx (4 issues)

- [ERROR] Line 20: 'Car' is defined but never used.
- [ERROR] Line 21: 'Clock' is defined but never used.
- [ERROR] Line 22: 'X' is defined but never used.
- [ERROR] Line 25: 'Button' is defined but never used.

### src\components\fleet\VehicleForm.tsx (4 issues)

- [ERROR] Line 22: 'AccountLevelBadge' is defined but never used.
- [ERROR] Line 36: 'entryAllowedAccounts' is assigned a value but never used.
- [ERROR] Line 36: 'accountsLoading' is assigned a value but never used.
- [ERROR] Line 37: 'costCentersLoading' is assigned a value but never used.

### src\components\InvoiceScannerAnalytics.tsx (4 issues)

- [ERROR] Line 18: 'Users' is defined but never used.
- [ERROR] Line 56: 'setAnalytics' is assigned a value but never used.
- [ERROR] Line 80: 'setDailyStats' is assigned a value but never used.
- [ERROR] Line 265: 'index' is defined but never used.

### src\components\invoices\InvoiceScannerDashboard.tsx (4 issues)

- [ERROR] Line 1: 'useEffect' is defined but never used.
- [ERROR] Line 12: 'Camera' is defined but never used.
- [ERROR] Line 12: 'ArrowRight' is defined but never used.
- [ERROR] Line 94: 'uploadData' is assigned a value but never used.

### src\components\layouts\AppSidebar.tsx (4 issues)

- [ERROR] Line 6: 'AdminOnly' is defined but never used.
- [ERROR] Line 14: 'ChevronLeft' is defined but never used.
- [ERROR] Line 18: 'Headphones' is defined but never used.
- [ERROR] Line 39: 'TooltipProvider' is defined but never used.

### src\components\layouts\ResponsiveDashboardLayout.tsx (4 issues)

- [ERROR] Line 7: 'SidebarTrigger' is defined but never used.
- [ERROR] Line 8: 'SheetHeader' is defined but never used.
- [ERROR] Line 8: 'SheetTitle' is defined but never used.
- [ERROR] Line 22: 'isDesktop' is assigned a value but never used.

### src\components\layouts\ResponsiveHeader.tsx (4 issues)

- [ERROR] Line 9: 'Badge' is defined but never used.
- [ERROR] Line 10: 'SheetHeader' is defined but never used.
- [ERROR] Line 10: 'SheetTitle' is defined but never used.
- [ERROR] Line 38: 'isTablet' is assigned a value but never used.

### src\components\legal\LegalCaseCreationWizard.tsx (4 issues)

- [ERROR] Line 16: 'DialogDescription' is defined but never used.
- [ERROR] Line 27: 'Checkbox' is defined but never used.
- [ERROR] Line 134: 'lastSaved' is assigned a value but never used.
- [ERROR] Line 582: 'setFormData' is defined but never used.

### src\components\legal\SettlementCompliance.tsx (4 issues)

- [ERROR] Line 23: 'addMonths' is defined but never used.
- [ERROR] Line 23: 'isBefore' is defined but never used.
- [ERROR] Line 23: 'isSameDay' is defined but never used.
- [ERROR] Line 23: 'isAfter' is defined but never used.

### src\components\legal\document-generator\DocumentWizard.tsx (4 issues)

- [ERROR] Line 6: 'useEffect' is defined but never used.
- [ERROR] Line 10: 'motion' is defined but never used.
- [ERROR] Line 16: 'Calendar' is defined but never used.
- [ERROR] Line 404: '_' is defined but never used.

### src\components\mobile\MobileDataList.tsx (4 issues)

- [ERROR] Line 21: 'Filter' is defined but never used.
- [ERROR] Line 30: 'useTransform' is defined but never used.
- [ERROR] Line 282: 'showFilters' is assigned a value but never used.
- [ERROR] Line 282: 'setShowFilters' is assigned a value but never used.

### src\components\notifications\NotificationItem.tsx (4 issues)

- [ERROR] Line 2: 'motion' is defined but never used.
- [ERROR] Line 13: 'ExternalLink' is defined but never used.
- [ERROR] Line 14: 'ChevronRight' is defined but never used.
- [ERROR] Line 48: 'getVariant' is assigned a value but never used.

### src\components\reports\PropertyReportViewer.tsx (4 issues)

- [ERROR] Line 10: 'Users' is defined but never used.
- [ERROR] Line 15: 'Calendar' is defined but never used.
- [ERROR] Line 16: 'MapPin' is defined but never used.
- [ERROR] Line 24: 'PropertyReportFilters' is defined but never used.

### src\components\reports\UnifiedReportViewer.tsx (4 issues)

- [ERROR] Line 12: 'Download' is defined but never used.
- [ERROR] Line 12: 'Printer' is defined but never used.
- [ERROR] Line 35: 'isExporting' is assigned a value but never used.
- [ERROR] Line 42: 'handleExport' is assigned a value but never used.

### src\components\ui\SuccessAnimation.tsx (4 issues)

- [ERROR] Line 38: 'sizeClasses' is assigned a value but never used.
- [ERROR] Line 44: 'iconSizes' is assigned a value but never used.
- [ERROR] Line 137: 'size' is defined but never used.
- [ERROR] Line 169: 'size' is defined but never used.

### src\components\vehicles\VehicleGallery.tsx (4 issues)

- [ERROR] Line 22: 'Filter' is defined but never used.
- [ERROR] Line 28: 'ChevronLeft' is defined but never used.
- [ERROR] Line 29: 'ChevronRight' is defined but never used.
- [ERROR] Line 31: 'ImageOff' is defined but never used.

### src\hooks\useContractVehicleReturn.ts (4 issues)

- [ERROR] Line 89: 'data' is defined but never used.
- [ERROR] Line 118: 'data' is defined but never used.
- [ERROR] Line 156: 'data' is defined but never used.
- [ERROR] Line 195: 'data' is defined but never used.

### src\hooks\useCurrencyFormatter.ts (4 issues)

- [ERROR] Line 3: 'formatNumberWithPreferences' is defined but never used.
- [ERROR] Line 3: 'getNumberPreferences' is defined but never used.
- [ERROR] Line 3: 'convertToArabicDigits' is defined but never used.
- [ERROR] Line 17: 'formatter' is assigned a value but never used.

### src\hooks\useExecutiveAISystem.ts (4 issues)

- [ERROR] Line 1: 'useEffect' is defined but never used.
- [ERROR] Line 67: 'setSecurityLevel' is assigned a value but never used.
- [ERROR] Line 344: 'contract' is assigned a value but never used.
- [ERROR] Line 814: 'error' is defined but never used.

### src\hooks\useFinancialAudit.ts (4 issues)

- [ERROR] Line 12: 'FinancialAuditSummary' is defined but never used.
- [ERROR] Line 13: 'TransactionLineage' is defined but never used.
- [ERROR] Line 14: 'DataIntegrityReport' is defined but never used.
- [ERROR] Line 15: 'ComplianceReport' is defined but never used.

### src\hooks\useFleetifyAI_Engine.ts (4 issues)

- [ERROR] Line 1: 'useMemo' is defined but never used.
- [ERROR] Line 93: 'startTime' is assigned a value but never used.
- [ERROR] Line 117: 'index' is defined but never used.
- [ERROR] Line 230: 'error' is defined but never used.

### src\hooks\useMonitoring.ts (4 issues)

- [ERROR] Line 62: 'previousPropsRef' is assigned a value but never used.
- [ERROR] Line 63: 'setMetrics' is assigned a value but never used.
- [ERROR] Line 250: 'setMetrics' is assigned a value but never used.
- [ERROR] Line 494: 'duration' is assigned a value but never used.

### src\hooks\useWhatsAppReports.ts (4 issues)

- [ERROR] Line 213: 'refetch' is assigned a value but never used.
- [ERROR] Line 366: 'settings' is assigned a value but never used.
- [ERROR] Line 458: 'error' is defined but never used.
- [ERROR] Line 539: 'error' is defined but never used.

### src\lib\api-monitoring\middleware.ts (4 issues)

- [ERROR] Line 7: 'APIRequest' is defined but never used.
- [ERROR] Line 7: 'APIResponse' is defined but never used.
- [ERROR] Line 25: 'excludeStatusCodes' is assigned a value but never used.
- [ERROR] Line 291: 'clonedResponse' is assigned a value but never used.

### src\lib\contract-calculations.ts (4 issues)

- [ERROR] Line 18: 'addDays' is defined but never used.
- [ERROR] Line 18: 'isLeapYear' is defined but never used.
- [ERROR] Line 384: 'billingPeriod' is defined but never used.
- [ERROR] Line 417: 'billingPeriod' is defined but never used.

### src\lib\monitoring\infrastructure.ts (4 issues)

- [ERROR] Line 6: 'PerformanceMetric' is defined but never used.
- [ERROR] Line 273: 'error' is defined but never used.
- [ERROR] Line 326: 'error' is defined but never used.
- [ERROR] Line 379: 'error' is defined but never used.

### src\pages\admin\QualityDashboard.tsx (4 issues)

- [ERROR] Line 20: 'FileText' is defined but never used.
- [ERROR] Line 59: 'COLORS' is assigned a value but never used.
- [ERROR] Line 63: 'selectedAgent' is assigned a value but never used.
- [ERROR] Line 63: 'setSelectedAgent' is assigned a value but never used.

### src\pages\dashboards\CarRentalDashboard.tsx (4 issues)

- [ERROR] Line 28: 'user' is assigned a value but never used.
- [ERROR] Line 29: 'isBrowsingMode' is assigned a value but never used.
- [ERROR] Line 29: 'browsedCompany' is assigned a value but never used.
- [ERROR] Line 30: 'exitBrowseMode' is assigned a value but never used.

### src\pages\dashboards\RetailDashboard.tsx (4 issues)

- [ERROR] Line 1: 'useRef' is defined but never used.
- [ERROR] Line 6: 'useOptimizedDashboardStats' is defined but never used.
- [ERROR] Line 31: 'user' is assigned a value but never used.
- [ERROR] Line 37: 'formatCurrency' is assigned a value but never used.

### src\pages\finance\BillingCenter.tsx (4 issues)

- [ERROR] Line 6: 'useEffect' is defined but never used.
- [ERROR] Line 58: 'AlertCircle' is defined but never used.
- [ERROR] Line 61: 'FileText' is defined but never used.
- [ERROR] Line 125: 'navigate' is assigned a value but never used.

### src\pages\finance\PaymentsDashboard.tsx (4 issues)

- [ERROR] Line 14: 'useState' is defined but never used.
- [ERROR] Line 53: 'TrendingUp' is defined but never used.
- [ERROR] Line 62: 'companyId' is assigned a value but never used.
- [ERROR] Line 79: 'payment' is defined but never used.

### src\pages\finance\settings\AccountRecoveryManager.tsx (4 issues)

- [ERROR] Line 1: 'Card' is defined but never used.
- [ERROR] Line 1: 'CardContent' is defined but never used.
- [ERROR] Line 1: 'CardHeader' is defined but never used.
- [ERROR] Line 1: 'CardTitle' is defined but never used.

### src\pages\finance\Vendors.tsx (4 issues)

- [ERROR] Line 7: 'Card' is defined but never used.
- [ERROR] Line 7: 'CardContent' is defined but never used.
- [ERROR] Line 16: 'LoadingSpinner' is defined but never used.
- [ERROR] Line 29: 'Star' is defined but never used.

### src\pages\fleet\FleetFinancialAnalysisNew.tsx (4 issues)

- [ERROR] Line 79: 'selectedVehicle' is assigned a value but never used.
- [ERROR] Line 79: 'setSelectedVehicle' is assigned a value but never used.
- [ERROR] Line 91: 'isValidationLoading' is assigned a value but never used.
- [ERROR] Line 147: 'error' is defined but never used.

### src\pages\legal\LegalDocumentGenerator.tsx (4 issues)

- [ERROR] Line 14: 'Badge' is defined but never used.
- [ERROR] Line 15: 'Separator' is defined but never used.
- [ERROR] Line 30: 'navigate' is assigned a value but never used.
- [ERROR] Line 34: 'formData' is assigned a value but never used.

### src\pages\mobile\MobileContracts.tsx (4 issues)

- [ERROR] Line 7: 'Filter' is defined but never used.
- [ERROR] Line 13: 'ChevronLeft' is defined but never used.
- [ERROR] Line 49: 'showFilters' is assigned a value but never used.
- [ERROR] Line 49: 'setShowFilters' is assigned a value but never used.

### src\pages\Quotations.tsx (4 issues)

- [ERROR] Line 2: 'Edit' is defined but never used.
- [ERROR] Line 37: 'selectedQuotation' is assigned a value but never used.
- [ERROR] Line 37: 'setSelectedQuotation' is assigned a value but never used.
- [ERROR] Line 343: 'customerName' is assigned a value but never used.

### src\pages\Support.tsx (4 issues)

- [ERROR] Line 10: 'Filter' is defined but never used.
- [ERROR] Line 10: 'User' is defined but never used.
- [ERROR] Line 17: 'toast' is defined but never used.
- [ERROR] Line 34: 'watch' is assigned a value but never used.

### src\pages\settings\WhatsAppSettings.tsx (4 issues)

- [ERROR] Line 8: 'AnimatePresence' is defined but never used.
- [ERROR] Line 307: 'isLoading' is assigned a value but never used.
- [ERROR] Line 307: 'isSaving' is assigned a value but never used.
- [ERROR] Line 354: 'error' is defined but never used.

### src\pages\super-admin\Support.tsx (4 issues)

- [ERROR] Line 4: 'Button' is defined but never used.
- [ERROR] Line 12: 'Users' is defined but never used.
- [ERROR] Line 16: 'TrendingUp' is defined but never used.
- [ERROR] Line 17: 'MessageSquare' is defined but never used.

### src\server\routes\auth.ts (4 issues)

- [ERROR] Line 8: 'bcrypt' is defined but never used.
- [ERROR] Line 36: 'resetPasswordSchema' is assigned a value but never used.
- [ERROR] Line 40: 'confirmResetSchema' is assigned a value but never used.
- [ERROR] Line 342: 'error' is defined but never used.

### src\services\LawsuitService.ts (4 issues)

- [ERROR] Line 154: 'uploadData' is assigned a value but never used.
- [ERROR] Line 422: 'tens' is assigned a value but never used.
- [ERROR] Line 423: 'teens' is assigned a value but never used.
- [ERROR] Line 424: 'hundreds' is assigned a value but never used.

### src\services\NotificationService.ts (4 issues)

- [ERROR] Line 258: 'channelConfig' is defined but never used.
- [ERROR] Line 279: 'channelConfig' is defined but never used.
- [ERROR] Line 300: 'channelConfig' is defined but never used.
- [ERROR] Line 387: 'options' is defined but never used.

### src\services\PaymentQueueService.ts (4 issues)

- [ERROR] Line 13: 'PaymentState' is defined but never used.
- [ERROR] Line 212: 'payment' is assigned a value but never used.
- [ERROR] Line 215: 'currentState' is assigned a value but never used.
- [ERROR] Line 425: 'processInterval' is assigned a value but never used.

### src\services\violationMatchingService.ts (4 issues)

- [ERROR] Line 259: 'customerName' is assigned a value but never used.
- [ERROR] Line 284: 'customerName' is assigned a value but never used.
- [ERROR] Line 314: 'customerName' is assigned a value but never used.
- [ERROR] Line 331: 'customerName' is assigned a value but never used.

### src\utils\accountingIntegration.ts (4 issues)

- [ERROR] Line 176: 'companyId' is defined but never used.
- [ERROR] Line 352: 'invoiceId' is defined but never used.
- [ERROR] Line 357: 'contractId' is defined but never used.
- [ERROR] Line 384: 'error' is defined but never used.

### src\components\approval\WorkflowManager.tsx (3 issues)

- [ERROR] Line 2: 'Play' is defined but never used.
- [ERROR] Line 2: 'Pause' is defined but never used.
- [ERROR] Line 2: 'Trash2' is defined but never used.

### src\components\audit\ExportDialog.tsx (3 issues)

- [ERROR] Line 18: 'CardDescription' is defined but never used.
- [ERROR] Line 25: 'User' is defined but never used.
- [ERROR] Line 26: 'Calendar' is defined but never used.

### src\components\common\PermissionGuard.tsx (3 issues)

- [ERROR] Line 36: 'hasCompanyAdminAccess' is assigned a value but never used.
- [ERROR] Line 39: 'isBrowsingAsCompanyAdmin' is assigned a value but never used.
- [ERROR] Line 41: 'context' is assigned a value but never used.

### src\components\contracts\ContractAlerts.tsx (3 issues)

- [ERROR] Line 7: 'Card' is defined but never used.
- [ERROR] Line 7: 'CardContent' is defined but never used.
- [ERROR] Line 12: 'AlertCircle' is defined but never used.

### src\components\contracts\ContractAmendmentsList.tsx (3 issues)

- [ERROR] Line 27: 'X' is defined but never used.
- [ERROR] Line 58: 'isApplying' is assigned a value but never used.
- [ERROR] Line 60: 'isCancelling' is assigned a value but never used.

### src\components\contracts\ContractApprovalWorkflow.tsx (3 issues)

- [ERROR] Line 19: 'Send' is defined but never used.
- [ERROR] Line 34: 'ApprovalStep' is defined but never used.
- [ERROR] Line 293: 'index' is defined but never used.

### src\components\contracts\ContractDocuments.tsx (3 issues)

- [ERROR] Line 6: 'Label' is defined but never used.
- [ERROR] Line 8: 'Upload' is defined but never used.
- [ERROR] Line 59: 'retryStep' is assigned a value but never used.

### src\components\contracts\ContractInvoiceGenerator.tsx (3 issues)

- [ERROR] Line 15: 'CheckCircle' is defined but never used.
- [ERROR] Line 150: 'handleGeneratePeriodicInvoices' is assigned a value but never used.
- [ERROR] Line 182: 'isEligibleForPeriodicInvoice' is assigned a value but never used.

### src\components\contracts\ContractSummary.tsx (3 issues)

- [ERROR] Line 10: 'Calendar' is defined but never used.
- [ERROR] Line 12: 'format' is defined but never used.
- [ERROR] Line 13: 'ar' is defined but never used.

### src\components\contracts\DocumentOperationMonitor.tsx (3 issues)

- [ERROR] Line 5: 'Progress' is defined but never used.
- [ERROR] Line 61: 'cleanupOrphanedFiles' is assigned a value but never used.
- [ERROR] Line 83: 'error' is defined but never used.

### src\components\contracts\DocumentUploadDialog.tsx (3 issues)

- [ERROR] Line 155: 'handleDragOver' is assigned a value but never used.
- [ERROR] Line 160: 'handleDragLeave' is assigned a value but never used.
- [ERROR] Line 223: 'error' is defined but never used.

### src\components\contracts\VehicleHandoverUnified.tsx (3 issues)

- [ERROR] Line 156: 'pickupColor' is assigned a value but never used.
- [ERROR] Line 181: 'nextStep' is assigned a value but never used.
- [ERROR] Line 187: 'prevStep' is assigned a value but never used.

### src\components\csv\SmartCSVUpload.tsx (3 issues)

- [ERROR] Line 60: 'archiveFileLocal' is assigned a value but never used.
- [ERROR] Line 60: 'setArchiveFileLocal' is assigned a value but never used.
- [ERROR] Line 137: 'parseCSV' is assigned a value but never used.

### src\components\customers\CustomerAccountSelector.tsx (3 issues)

- [ERROR] Line 1: 'useEffect' is defined but never used.
- [ERROR] Line 29: 'AdvancedAccountSelector' is defined but never used.
- [ERROR] Line 324: 'refreshKey' is assigned a value but never used.

### src\components\customers\CustomersSmartDashboard.tsx (3 issues)

- [ERROR] Line 19: 'CreditCard' is defined but never used.
- [ERROR] Line 20: 'Calendar' is defined but never used.
- [ERROR] Line 29: 'DocumentAlertsBadge' is defined but never used.

### src\components\customers\DocumentAlertsPanel.tsx (3 issues)

- [ERROR] Line 7: 'differenceInDays' is defined but never used.
- [ERROR] Line 8: 'ar' is defined but never used.
- [ERROR] Line 16: 'X' is defined but never used.

### src\components\dashboard\bento\BentoDashboardRedesigned.tsx (3 issues)

- [ERROR] Line 33: 'UserCheck' is defined but never used.
- [ERROR] Line 37: 'Zap' is defined but never used.
- [ERROR] Line 326: 'fleetLoading' is assigned a value but never used.

### src\components\dashboard\customization\MobileOptimizedDashboard.tsx (3 issues)

- [ERROR] Line 20: 'Bell' is defined but never used.
- [ERROR] Line 207: 'user' is assigned a value but never used.
- [ERROR] Line 436: 'index' is defined but never used.

### src\components\dashboard\real-estate\MaintenanceRequestsWidget.tsx (3 issues)

- [ERROR] Line 8: 'Legend' is defined but never used.
- [ERROR] Line 14: 'EnhancedTooltip' is defined but never used.
- [ERROR] Line 14: 'kpiDefinitions' is defined but never used.

### src\components\dashboard\real-estate\RentCollectionWidget.tsx (3 issues)

- [ERROR] Line 7: 'Legend' is defined but never used.
- [ERROR] Line 12: 'EmptyStateCompact' is defined but never used.
- [ERROR] Line 109: 'topLatePayers' is assigned a value but never used.

### src\components\dashboard\real-estate\TenantSatisfactionWidget.tsx (3 issues)

- [ERROR] Line 12: 'EmptyStateCompact' is defined but never used.
- [ERROR] Line 13: 'EnhancedTooltip' is defined but never used.
- [ERROR] Line 13: 'kpiDefinitions' is defined but never used.

### src\components\dashboard\real-estate\VacancyAnalysisWidget.tsx (3 issues)

- [ERROR] Line 11: 'EmptyStateCompact' is defined but never used.
- [ERROR] Line 12: 'EnhancedTooltip' is defined but never used.
- [ERROR] Line 12: 'kpiDefinitions' is defined but never used.

### src\components\dashboard\retail\SalesForecastWidget.tsx (3 issues)

- [ERROR] Line 7: 'LineChart' is defined but never used.
- [ERROR] Line 8: 'Line' is defined but never used.
- [ERROR] Line 19: 'Skeleton' is defined but never used.

### src\components\finance\AccountBalanceHistory.tsx (3 issues)

- [ERROR] Line 28: 'accountId' is defined but never used.
- [ERROR] Line 31: 'accountType' is defined but never used.
- [ERROR] Line 112: 'index' is defined but never used.

### src\components\finance\AdvancedFinancialRatios.tsx (3 issues)

- [ERROR] Line 18: 'LineChart' is defined but never used.
- [ERROR] Line 18: 'Line' is defined but never used.
- [ERROR] Line 20: 'ar' is defined but never used.

### src\components\finance\charts\TemplatePreviewDialog.tsx (3 issues)

- [ERROR] Line 17: 'TreePine' is defined but never used.
- [ERROR] Line 18: 'BarChart3' is defined but never used.
- [ERROR] Line 43: 'template' is assigned a value but never used.

### src\components\finance\EnhancedInvoiceActions.tsx (3 issues)

- [ERROR] Line 13: 'Building2' is defined but never used.
- [ERROR] Line 14: 'Calendar' is defined but never used.
- [ERROR] Line 15: 'AlertTriangle' is defined but never used.

### src\components\finance\enhanced-editing\EnhancedAccountEditDialog.tsx (3 issues)

- [ERROR] Line 19: 'Lightbulb' is defined but never used.
- [ERROR] Line 65: 'previewChanges' is assigned a value but never used.
- [ERROR] Line 65: 'setPreviewChanges' is assigned a value but never used.

### src\components\finance\InvoiceForm.tsx (3 issues)

- [ERROR] Line 13: 'ChartOfAccount' is defined but never used.
- [ERROR] Line 45: 'costCentersLoading' is assigned a value but never used.
- [ERROR] Line 46: 'assetsLoading' is assigned a value but never used.

### src\components\finance\InvoiceIntegrationPanel.tsx (3 issues)

- [ERROR] Line 18: 'Calendar' is defined but never used.
- [ERROR] Line 19: 'AlertTriangle' is defined but never used.
- [ERROR] Line 38: 'invoiceId' is defined but never used.

### src\components\finance\PendingPaymentsReviewSystem.tsx (3 issues)

- [ERROR] Line 1: 'useCallback' is defined but never used.
- [ERROR] Line 17: 'DollarSign' is defined but never used.
- [ERROR] Line 18: 'Clock' is defined but never used.

### src\components\finance\SimpleAccountDeleteDialog.tsx (3 issues)

- [ERROR] Line 19: 'XCircle' is defined but never used.
- [ERROR] Line 38: 'accountName' is defined but never used.
- [ERROR] Line 88: 'error' is defined but never used.

### src\components\fleet\DriverAssignmentModule.tsx (3 issues)

- [ERROR] Line 46: 'showNewAssignment' is assigned a value but never used.
- [ERROR] Line 47: 'selectedDriver' is assigned a value but never used.
- [ERROR] Line 47: 'setSelectedDriver' is assigned a value but never used.

### src\components\fleet\VehicleDetailsPage.tsx (3 issues)

- [ERROR] Line 12: 'useCurrentCompanyId' is defined but never used.
- [ERROR] Line 29: 'Upload' is defined but never used.
- [ERROR] Line 215: 'handleMaintenanceSuccess' is assigned a value but never used.

### src\components\hr\EmployeeForm.tsx (3 issues)

- [ERROR] Line 9: 'Send' is defined but never used.
- [ERROR] Line 9: 'Settings' is defined but never used.
- [ERROR] Line 164: 'accountRoles' is assigned a value but never used.

### src\components\hr\permissions\SmartPermissionSuggestions.tsx (3 issues)

- [ERROR] Line 11: 'AlertTriangle' is defined but never used.
- [ERROR] Line 20: 'PERMISSIONS' is defined but never used.
- [ERROR] Line 62: 'currentRoles' is assigned a value but never used.

### src\components\InvoiceScannerDemo.tsx (3 issues)

- [ERROR] Line 30: 'detectLanguage' is defined but never used.
- [ERROR] Line 30: 'extractKeyInformation' is defined but never used.
- [ERROR] Line 41: 'scanInvoice' is assigned a value but never used.

### src\components\layouts\DashboardLayout.tsx (3 issues)

- [ERROR] Line 1: 'useState' is defined but never used.
- [ERROR] Line 6: 'AppSidebar' is defined but never used.
- [ERROR] Line 11: 'Button' is defined but never used.

### src\components\legal\NotificationsPanel.tsx (3 issues)

- [ERROR] Line 18: 'Separator' is defined but never used.
- [ERROR] Line 27: 'X' is defined but never used.
- [ERROR] Line 57: 'user' is assigned a value but never used.

### src\components\legal\ScheduleCallsDialog.tsx (3 issues)

- [ERROR] Line 18: 'Checkbox' is defined but never used.
- [ERROR] Line 135: 'summaryStats' is assigned a value but never used.
- [ERROR] Line 259: 'getNextAvailableDate' is assigned a value but never used.

### src\components\mobile\BottomNavigation.tsx (3 issues)

- [ERROR] Line 19: 'Menu' is defined but never used.
- [ERROR] Line 22: 'Badge' is defined but never used.
- [ERROR] Line 23: 'AnimatePresence' is defined but never used.

### src\components\mobile\TouchOptimization.tsx (3 issues)

- [ERROR] Line 136: 'error' is defined but never used.
- [ERROR] Line 523: 'setTouchState' is assigned a value but never used.
- [ERROR] Line 565: 'error' is defined but never used.

### src\components\notifications\UnifiedNotificationBell.tsx (3 issues)

- [ERROR] Line 3: 'Filter' is defined but never used.
- [ERROR] Line 8: 'TabsContent' is defined but never used.
- [ERROR] Line 33: 'highPriorityAlerts' is assigned a value but never used.

### src\components\payments\PaymentStatsCardsRedesigned.tsx (3 issues)

- [ERROR] Line 8: 'CreditCard' is defined but never used.
- [ERROR] Line 12: 'Zap' is defined but never used.
- [ERROR] Line 204: 'index' is defined but never used.

### src\components\performance\PerformanceMonitor.tsx (3 issues)

- [ERROR] Line 3: 'QueryPerformanceMetrics' is defined but never used.
- [ERROR] Line 11: 'CacheStatistics' is defined but never used.
- [ERROR] Line 18: 'SlowOperation' is defined but never used.

### src\components\reports\ReportDataDisplay.tsx (3 issues)

- [ERROR] Line 13: 'reportId' is defined but never used.
- [ERROR] Line 13: 'moduleType' is defined but never used.
- [ERROR] Line 14: 'formatCurrency' is assigned a value but never used.

### src\components\settings\TemplateManagement.tsx (3 issues)

- [ERROR] Line 8: 'DialogTrigger' is defined but never used.
- [ERROR] Line 11: 'FileText' is defined but never used.
- [ERROR] Line 17: 'Upload' is defined but never used.

### src\components\super-admin\CompanyForm.tsx (3 issues)

- [ERROR] Line 17: 'Phone' is defined but never used.
- [ERROR] Line 17: 'MapPin' is defined but never used.
- [ERROR] Line 17: 'Users' is defined but never used.

### src\components\super-admin\QuickActions.tsx (3 issues)

- [ERROR] Line 9: 'FileText' is defined but never used.
- [ERROR] Line 11: 'CreditCard' is defined but never used.
- [ERROR] Line 23: 'user' is assigned a value but never used.

### src\components\super-admin\UserDetailsDialog.tsx (3 issues)

- [ERROR] Line 109: 'error' is defined but never used.
- [ERROR] Line 120: 'error' is defined but never used.
- [ERROR] Line 136: 'error' is defined but never used.

### src\components\super-admin\settings\GlobalNotificationSettings.tsx (3 issues)

- [ERROR] Line 7: 'Textarea' is defined but never used.
- [ERROR] Line 10: 'Phone' is defined but never used.
- [ERROR] Line 35: 'setTemplates' is assigned a value but never used.

### src\components\super-admin\settings\SystemIntegrations.tsx (3 issues)

- [ERROR] Line 8: 'Textarea' is defined but never used.
- [ERROR] Line 10: 'Database' is defined but never used.
- [ERROR] Line 97: 'webhookId' is defined but never used.

### src\components\tasks\MyTasksDashboard.tsx (3 issues)

- [ERROR] Line 7: 'useTaskStatistics' is defined but never used.
- [ERROR] Line 13: 'CheckCircle2' is defined but never used.
- [ERROR] Line 16: 'TrendingUp' is defined but never used.

### src\components\ui\enhanced-account-selector.tsx (3 issues)

- [ERROR] Line 3: 'filterAccountsBySearch' is defined but never used.
- [ERROR] Line 30: 'isLoading' is assigned a value but never used.
- [ERROR] Line 30: 'error' is assigned a value but never used.

### src\components\vehicle-installments\MultiVehicleContractForm.tsx (3 issues)

- [ERROR] Line 28: 'useQuery' is defined but never used.
- [ERROR] Line 67: 'distributionMode' is assigned a value but never used.
- [ERROR] Line 67: 'setDistributionMode' is assigned a value but never used.

### src\components\vehicle-installments\VehicleInstallmentsDashboard.tsx (3 issues)

- [ERROR] Line 41: 'CreditCard' is defined but never used.
- [ERROR] Line 159: 'value' is defined but never used.
- [ERROR] Line 159: 'color' is defined but never used.

### src\components\vehicle-installments\wizard\VehicleBulkSelector.tsx (3 issues)

- [ERROR] Line 17: 'Trash2' is defined but never used.
- [ERROR] Line 149: 'someFilteredSelected' is assigned a value but never used.
- [ERROR] Line 398: '_' is defined but never used.

### src\components\whatsapp\WhatsAppMessagesReport.tsx (3 issues)

- [ERROR] Line 2: 'CardHeader' is defined but never used.
- [ERROR] Line 2: 'CardTitle' is defined but never used.
- [ERROR] Line 11: 'TrendingUp' is defined but never used.

### src\hooks\business\useContractOperations.ts (3 issues)

- [ERROR] Line 85: 'autoGenerateSchedule' is assigned a value but never used.
- [ERROR] Line 87: 'enableNotifications' is assigned a value but never used.
- [ERROR] Line 218: 'contract' is defined but never used.

### src\hooks\business\usePaymentOperations.ts (3 issues)

- [ERROR] Line 43: 'validateBalance' is assigned a value but never used.
- [ERROR] Line 628: 'validatePaymentData' is assigned a value but never used.
- [ERROR] Line 675: 'validateAccountBalance' is assigned a value but never used.

### src\hooks\contracts\useSignedAgreementUpload.ts (3 issues)

- [ERROR] Line 574: 'ZAI_API_URL' is assigned a value but never used.
- [ERROR] Line 575: 'ZAI_API_KEY' is assigned a value but never used.
- [ERROR] Line 576: 'MODEL' is assigned a value but never used.

### src\hooks\integrations\useInventoryPurchaseOrders.ts (3 issues)

- [ERROR] Line 5: 'InventoryItem' is defined but never used.
- [ERROR] Line 6: 'PurchaseOrder' is defined but never used.
- [ERROR] Line 6: 'PurchaseOrderItem' is defined but never used.

### src\hooks\useContractCSVUpload.ts (3 issues)

- [ERROR] Line 5: 'ContractCreationData' is defined but never used.
- [ERROR] Line 585: 'error' is defined but never used.
- [ERROR] Line 722: 'rowNumber' is defined but never used.

### src\hooks\useContractValidation.ts (3 issues)

- [ERROR] Line 39: 'lastValidationTime' is assigned a value but never used.
- [ERROR] Line 40: 'validationHistory' is assigned a value but never used.
- [ERROR] Line 136: 'enhancedResult' is assigned a value but never used.

### src\hooks\useEnhancedAccountSuggestions.ts (3 issues)

- [ERROR] Line 37: 'analytics' is assigned a value but never used.
- [ERROR] Line 37: 'setAnalytics' is assigned a value but never used.
- [ERROR] Line 169: 'currentParentId' is defined but never used.

### src\hooks\useFinance.ts (3 issues)

- [ERROR] Line 724: 'currentMonth' is assigned a value but never used.
- [ERROR] Line 725: 'nextMonth' is assigned a value but never used.
- [ERROR] Line 1070: 'newSalvageValue' is assigned a value but never used.

### src\hooks\useMaintenanceJournalIntegration.ts (3 issues)

- [ERROR] Line 2: 'Sentry' is defined but never used.
- [ERROR] Line 10: 'toast' is assigned a value but never used.
- [ERROR] Line 170: 'newPaymentAmount' is defined but never used.

### src\hooks\useOptimizedDashboardStats.ts (3 issues)

- [ERROR] Line 168: 'hasGlobalAccess' is assigned a value but never used.
- [ERROR] Line 209: 'formatChange' is defined but never used.
- [ERROR] Line 215: 'formatPercentageChange' is defined but never used.

### src\hooks\useSimpleAccountDeletion.ts (3 issues)

- [ERROR] Line 117: 'user' is assigned a value but never used.
- [ERROR] Line 332: 'e' is defined but never used.
- [ERROR] Line 342: 'e' is defined but never used.

### src\hooks\useSmartLegalClassifier.ts (3 issues)

- [ERROR] Line 30: 'userContext' is defined but never used.
- [ERROR] Line 132: 'complexity' is defined but never used.
- [ERROR] Line 187: 'history' is defined but never used.

### src\hooks\useTaskWhatsAppIntegration.ts (3 issues)

- [ERROR] Line 16: 'WhatsAppMessage' is defined but never used.
- [ERROR] Line 97: 'sendResult' is assigned a value but never used.
- [ERROR] Line 229: 'e' is defined but never used.

### src\hooks\useUnifiedContractUpload.ts (3 issues)

- [ERROR] Line 5: 'CustomerSearchData' is defined but never used.
- [ERROR] Line 6: 'ContractError' is defined but never used.
- [ERROR] Line 179: 'aiError' is defined but never used.

### src\lib\api-monitoring\integration.ts (3 issues)

- [ERROR] Line 27: 'monitoredSupabase' is assigned a value but never used.
- [ERROR] Line 188: 'renderer' is defined but never used.
- [ERROR] Line 188: 'id' is defined but never used.

### src\lib\api-monitoring\monitor.ts (3 issues)

- [ERROR] Line 13: 'ErrorType' is defined but never used.
- [ERROR] Line 14: 'ErrorSeverity' is defined but never used.
- [ERROR] Line 656: 'key' is assigned a value but never used.

### src\lib\inventory\demandForecasting.ts (3 issues)

- [ERROR] Line 1: 'InventoryItem' is defined but never used.
- [ERROR] Line 440: 'gamma' is defined but never used.
- [ERROR] Line 474: 'itemCategory' is defined but never used.

### src\lib\legalAIPerformance.ts (3 issues)

- [ERROR] Line 224: 'metric' is defined but never used.
- [ERROR] Line 234: 'dailyCost' is defined but never used.
- [ERROR] Line 244: 'hourlyQueries' is defined but never used.

### src\modules\properties\components\PropertyForm.tsx (3 issues)

- [ERROR] Line 26: 'PropertyType' is defined but never used.
- [ERROR] Line 26: 'PropertyStatus' is defined but never used.
- [ERROR] Line 26: 'PropertyCondition' is defined but never used.

### src\modules\properties\hooks\usePropertyOwners.ts (3 issues)

- [ERROR] Line 3: 'PropertyOwner' is defined but never used.
- [ERROR] Line 105: '_' is defined but never used.
- [ERROR] Line 163: '_' is defined but never used.

### src\pages\dashboards\CarRentalDashboard.backup.tsx (3 issues)

- [ERROR] Line 26: 'user' is assigned a value but never used.
- [ERROR] Line 30: 'financialLoading' is assigned a value but never used.
- [ERROR] Line 32: 'formatCurrency' is assigned a value but never used.

### src\pages\dashboards\RealEstateDashboard.tsx (3 issues)

- [ERROR] Line 36: 'statsError' is assigned a value but never used.
- [ERROR] Line 38: 'financialOverview' is assigned a value but never used.
- [ERROR] Line 39: 'formatCurrency' is assigned a value but never used.

### src\pages\finance\ChartOfAccounts.tsx (3 issues)

- [ERROR] Line 10: 'Badge' is defined but never used.
- [ERROR] Line 21: 'PiggyBank' is defined but never used.
- [ERROR] Line 64: 'isLoading' is assigned a value but never used.

### src\pages\finance\JournalEntriesDemo.tsx (3 issues)

- [ERROR] Line 2: 'CardDescription' is defined but never used.
- [ERROR] Line 3: 'Button' is defined but never used.
- [ERROR] Line 10: 'isMobile' is assigned a value but never used.

### src\pages\finance\operations\ReceivePaymentWorkflow.tsx (3 issues)

- [ERROR] Line 19: 'Separator' is defined but never used.
- [ERROR] Line 38: 'Calendar' is defined but never used.
- [ERROR] Line 256: 'data' is defined but never used.

### src\pages\fleet\VehicleConditionCheck.tsx (3 issues)

- [ERROR] Line 5: 'Input' is defined but never used.
- [ERROR] Line 11: 'Fuel' is defined but never used.
- [ERROR] Line 11: 'Gauge' is defined but never used.

### src\pages\hr\EmployeeDetails.tsx (3 issues)

- [ERROR] Line 22: 'Shield' is defined but never used.
- [ERROR] Line 72: 'companyFilter' is assigned a value but never used.
- [ERROR] Line 464: 'data' is defined but never used.

### src\pages\inventory\StockMovements.tsx (3 issues)

- [ERROR] Line 8: 'StockMovement' is defined but never used.
- [ERROR] Line 12: 'Calendar' is defined but never used.
- [ERROR] Line 59: 'uniqueItemsThisMonth' is assigned a value but never used.

### src\pages\mobile\MobileContractDetails.tsx (3 issues)

- [ERROR] Line 11: 'CheckCircle' is defined but never used.
- [ERROR] Line 12: 'XCircle' is defined but never used.
- [ERROR] Line 13: 'AlertCircle' is defined but never used.

### src\pages\PropertyOwners.tsx (3 issues)

- [ERROR] Line 2: 'Eye' is defined but never used.
- [ERROR] Line 38: 'PageHelp' is defined but never used.
- [ERROR] Line 39: 'PropertyOwnersPageHelpContent' is defined but never used.

### src\pages\properties\PropertyContracts.tsx (3 issues)

- [ERROR] Line 6: 'Trash2' is defined but never used.
- [ERROR] Line 40: 'error' is defined but never used.
- [ERROR] Line 63: 'error' is defined but never used.

### src\pages\properties\PropertyMaintenance.tsx (3 issues)

- [ERROR] Line 11: 'XCircle' is defined but never used.
- [ERROR] Line 14: 'AlertTriangle' is defined but never used.
- [ERROR] Line 44: 'cancelledMaintenance' is assigned a value but never used.

### src\pages\super-admin\Users.tsx (3 issues)

- [ERROR] Line 17: 'PageHelp' is defined but never used.
- [ERROR] Line 18: 'UsersPageHelpContent' is defined but never used.
- [ERROR] Line 30: 'currentUser' is assigned a value but never used.

### src\routes\index.ts (3 issues)

- [ERROR] Line 7: 'LazyRouteComponent' is defined but never used.
- [ERROR] Line 12: 'Index' is defined but never used.
- [ERROR] Line 58: 'VehicleDetailsPageRedesigned' is assigned a value but never used.

### src\services\core\BatchProcessor.ts (3 issues)

- [ERROR] Line 559: 'batchIndex' is defined but never used.
- [ERROR] Line 633: 'batchIndex' is defined but never used.
- [ERROR] Line 653: 'batchIndex' is defined but never used.

### src\services\OverdueManagementService.ts (3 issues)

- [ERROR] Line 13: 'lateFeeCalculator' is defined but never used.
- [ERROR] Line 13: 'OverdueContractInfo' is defined but never used.
- [ERROR] Line 426: 'contractId' is assigned a value but never used.

### src\services\whatsapp\WhatsAppService.ts (3 issues)

- [ERROR] Line 10: 'MessageStatus' is defined but never used.
- [ERROR] Line 264: 'error' is defined but never used.
- [ERROR] Line 292: 'error' is defined but never used.

### src\utils\paymentAllocationEngine.ts (3 issues)

- [ERROR] Line 132: 'paymentData' is defined but never used.
- [ERROR] Line 232: 'companyId' is defined but never used.
- [ERROR] Line 243: 'companyId' is defined but never used.

### src\components\auth\AuthForm.tsx (2 issues)

- [ERROR] Line 59: 'error' is defined but never used.
- [ERROR] Line 80: 'error' is defined but never used.

### src\components\contracts\ContractAmendmentForm.tsx (2 issues)

- [ERROR] Line 84: 'getAmendmentTypeLabel' is assigned a value but never used.
- [ERROR] Line 165: 'Icon' is assigned a value but never used.

### src\components\contracts\ContractCancellationDialog.tsx (2 issues)

- [ERROR] Line 20: 'cn' is defined but never used.
- [ERROR] Line 104: 'getConditionLabel' is assigned a value but never used.

### src\components\contracts\ContractCSVUploadWithArchive.tsx (2 issues)

- [ERROR] Line 11: 'Upload' is defined but never used.
- [ERROR] Line 34: 'isUploading' is assigned a value but never used.

### src\components\contracts\ContractDataValidator.tsx (2 issues)

- [ERROR] Line 12: 'ContractValidationResult' is defined but never used.
- [ERROR] Line 114: 'calculatedDays' is assigned a value but never used.

### src\components\contracts\ContractDetailsDialog.tsx (2 issues)

- [ERROR] Line 13: 'Calendar' is defined but never used.
- [ERROR] Line 45: 'VehicleConditionReportData' is defined but never used.

### src\components\contracts\ContractHealthDashboard.tsx (2 issues)

- [ERROR] Line 32: 'processFailedJournals' is assigned a value but never used.
- [ERROR] Line 35: 'isProcessingJournals' is assigned a value but never used.

### src\components\contracts\ContractJournalEntryStatus.tsx (2 issues)

- [ERROR] Line 3: 'XCircle' is defined but never used.
- [ERROR] Line 12: 'contractId' is defined but never used.

### src\components\contracts\ContractsEnhancedHeader.tsx (2 issues)

- [ERROR] Line 14: 'Search' is defined but never used.
- [ERROR] Line 50: 'isTablet' is assigned a value but never used.

### src\components\contracts\ContractTemplateManager.tsx (2 issues)

- [ERROR] Line 15: 'Copy' is defined but never used.
- [ERROR] Line 50: 'accounts' is assigned a value but never used.

### src\components\contracts\DuplicateContractsDiagnostic.tsx (2 issues)

- [ERROR] Line 67: '_' is defined but never used.
- [ERROR] Line 86: '_' is defined but never used.

### src\components\contracts\LateFinesTab.tsx (2 issues)

- [ERROR] Line 11: 'Calendar' is defined but never used.
- [ERROR] Line 12: 'DollarSign' is defined but never used.

### src\components\contracts\SendRemindersDialog.tsx (2 issues)

- [ERROR] Line 27: 'Info' is defined but never used.
- [ERROR] Line 35: 'useSendManualReminders' is defined but never used.

### src\components\contracts\TenantSelector.tsx (2 issues)

- [ERROR] Line 3: 'DialogTrigger' is defined but never used.
- [ERROR] Line 4: 'Input' is defined but never used.

### src\components\contracts\TimelineView.tsx (2 issues)

- [ERROR] Line 11: 'CheckCircle2' is defined but never used.
- [ERROR] Line 14: 'RefreshCw' is defined but never used.

### src\components\contracts\UnifiedContractUpload.tsx (2 issues)

- [ERROR] Line 32: 'companyId' is assigned a value but never used.
- [ERROR] Line 85: 'result' is assigned a value but never used.

### src\components\contracts\payment-schedules\PaymentSchedulesList.tsx (2 issues)

- [ERROR] Line 1: 'CardHeader' is defined but never used.
- [ERROR] Line 1: 'CardTitle' is defined but never used.

### src\components\crm\ScheduledFollowupsPanel.tsx (2 issues)

- [ERROR] Line 16: 'XCircle' is defined but never used.
- [ERROR] Line 19: 'ChevronUp' is defined but never used.

### src\components\customers\AccountingSummary.tsx (2 issues)

- [ERROR] Line 6: 'Shield' is defined but never used.
- [ERROR] Line 15: 'onEdit' is defined but never used.

### src\components\customers\CustomerDetailsDialog.tsx (2 issues)

- [ERROR] Line 68: 'currency' is assigned a value but never used.
- [ERROR] Line 80: 'watch' is assigned a value but never used.

### src\components\customers\DriverLicenseManager.tsx (2 issues)

- [ERROR] Line 42: 'Upload' is defined but never used.
- [ERROR] Line 43: 'Calendar' is defined but never used.

### src\components\customers\EnhancedCustomerForm.tsx (2 issues)

- [ERROR] Line 27: 'createCustomerSchema' is defined but never used.
- [ERROR] Line 188: 'onCancel' is defined but never used.

### src\components\dashboard\bento\BentoDashboard.tsx (2 issues)

- [ERROR] Line 4: 'SkeletonWidget' is defined but never used.
- [ERROR] Line 273: 'fleetLoading' is assigned a value but never used.

### src\components\dashboard\bento\BentoSidebar.tsx (2 issues)

- [ERROR] Line 29: 'Scale' is defined but never used.
- [ERROR] Line 31: 'Building2' is defined but never used.

### src\components\dashboard\car-rental\RentalTimelineWidget.tsx (2 issues)

- [ERROR] Line 4: 'Badge' is defined but never used.
- [ERROR] Line 8: 'Skeleton' is defined but never used.

### src\components\dashboard\InventoryAlertsWidget.tsx (2 issues)

- [ERROR] Line 14: 'formatCurrency' is assigned a value but never used.
- [ERROR] Line 24: 'totalInventoryValue' is assigned a value but never used.

### src\components\dashboard\SalesPipelineWidget.tsx (2 issues)

- [ERROR] Line 6: 'Loader2' is defined but never used.
- [ERROR] Line 20: 'metrics' is assigned a value but never used.

### src\components\dashboard\retail\CategoryPerformanceWidget.tsx (2 issues)

- [ERROR] Line 6: 'Package' is defined but never used.
- [ERROR] Line 21: 'Skeleton' is defined but never used.

### src\components\dashboard\retail\CustomerInsightsWidget.tsx (2 issues)

- [ERROR] Line 18: 'Skeleton' is defined but never used.
- [ERROR] Line 190: 'COLORS' is assigned a value but never used.

### src\components\dashboard\retail\InventoryLevelsWidget.tsx (2 issues)

- [ERROR] Line 18: 'Skeleton' is defined but never used.
- [ERROR] Line 22: 'EmptyStateCompact' is defined but never used.

### src\components\dashboard\retail\ReorderRecommendationsWidget.tsx (2 issues)

- [ERROR] Line 7: 'Package' is defined but never used.
- [ERROR] Line 11: 'Skeleton' is defined but never used.

### src\components\dashboard\retail\SalesAnalyticsWidget.tsx (2 issues)

- [ERROR] Line 23: 'Skeleton' is defined but never used.
- [ERROR] Line 26: 'EmptyStateCompact' is defined but never used.

### src\components\docs\DocumentationSearch.tsx (2 issues)

- [ERROR] Line 1: 'useMemo' is defined but never used.
- [ERROR] Line 185: 'getCategoryIcon' is assigned a value but never used.

### src\components\exports\ExportDialog.tsx (2 issues)

- [ERROR] Line 61: 'contentSelection' is assigned a value but never used.
- [ERROR] Line 126: 'ChartExportData' is assigned a value but never used.

### src\components\features\WhatsNewBadge.tsx (2 issues)

- [ERROR] Line 6: 'useState' is defined but never used.
- [ERROR] Line 6: 'useEffect' is defined but never used.

### src\components\features\WhatsNewModal.tsx (2 issues)

- [ERROR] Line 7: 'DialogHeader' is defined but never used.
- [ERROR] Line 11: 'TabsContent' is defined but never used.

### src\components\finance\AccountingSystemWizard.tsx (2 issues)

- [ERROR] Line 3: 'Button' is defined but never used.
- [ERROR] Line 12: 'ArrowRight' is defined but never used.

### src\components\finance\CashFlowStatementReport.tsx (2 issues)

- [ERROR] Line 14: 'TrendingUp' is defined but never used.
- [ERROR] Line 30: 'ar' is defined but never used.

### src\components\finance\ChartOfAccountsCSVUpload.tsx (2 issues)

- [ERROR] Line 44: 'processCSVFile' is assigned a value but never used.
- [ERROR] Line 63: 'result' is assigned a value but never used.

### src\components\finance\CostCenterReports.tsx (2 issues)

- [ERROR] Line 12: 'TrendingDown' is defined but never used.
- [ERROR] Line 34: 'selectedCenter' is assigned a value but never used.

### src\components\finance\charts\AccountSummaryPanel.tsx (2 issues)

- [ERROR] Line 10: 'Users' is defined but never used.
- [ERROR] Line 12: 'EyeOff' is defined but never used.

### src\components\finance\charts\SmartAccountWizardTab.tsx (2 issues)

- [ERROR] Line 11: 'Wand2' is defined but never used.
- [ERROR] Line 21: 'Search' is defined but never used.

### src\components\finance\csv-import\AccountsPreviewTable.tsx (2 issues)

- [ERROR] Line 15: 'Filter' is defined but never used.
- [ERROR] Line 42: 'onDataChange' is defined but never used.

### src\components\finance\DepositDetailsDialog.tsx (2 issues)

- [ERROR] Line 11: 'Separator' is defined but never used.
- [ERROR] Line 12: 'CardDescription' is defined but never used.

### src\components\finance\EnhancedSmartAlertsPanel.tsx (2 issues)

- [ERROR] Line 30: 'Input' is defined but never used.
- [ERROR] Line 53: 'SmartAlertConfig' is defined but never used.

### src\components\finance\hub\ActivityTimeline.tsx (2 issues)

- [ERROR] Line 9: 'DollarSign' is defined but never used.
- [ERROR] Line 10: 'TrendingUp' is defined but never used.

### src\components\finance\PaymentLinkingTroubleshooter.tsx (2 issues)

- [ERROR] Line 46: 'diagnosticResults' is assigned a value but never used.
- [ERROR] Line 46: 'setDiagnosticResults' is assigned a value but never used.

### src\components\finance\payment-upload\UnifiedPaymentUpload.tsx (2 issues)

- [ERROR] Line 6: 'useState' is defined but never used.
- [ERROR] Line 30: 'data' is defined but never used.

### src\components\finance\ProfessionalInvoiceTemplate.tsx (2 issues)

- [ERROR] Line 2: 'CardHeader' is defined but never used.
- [ERROR] Line 2: 'CardTitle' is defined but never used.

### src\components\finance\SmartPaymentAllocation.tsx (2 issues)

- [ERROR] Line 41: 'UnpaidObligation' is defined but never used.
- [ERROR] Line 47: 'OBLIGATION_STATUS_LABELS' is defined but never used.

### src\components\finance\VendorAccountManager.tsx (2 issues)

- [ERROR] Line 12: 'VendorAccount' is defined but never used.
- [ERROR] Line 33: 'getAccountTypeLabel' is assigned a value but never used.

### src\components\fleet\DispatchPermitForm.tsx (2 issues)

- [ERROR] Line 32: 'conditionReportCompleted' is assigned a value but never used.
- [ERROR] Line 156: 'error' is defined but never used.

### src\components\fleet\DispatchPermitsList.tsx (2 issues)

- [ERROR] Line 97: 'permitToEdit' is assigned a value but never used.
- [ERROR] Line 125: 'error' is defined but never used.

### src\components\fleet\EnhancedVehicleInsurancePanel.tsx (2 issues)

- [ERROR] Line 10: 'Textarea' is defined but never used.
- [ERROR] Line 43: 'watch' is assigned a value but never used.

### src\components\fleet\EnhancedVehiclePricingPanel.tsx (2 issues)

- [ERROR] Line 10: 'Textarea' is defined but never used.
- [ERROR] Line 46: 'watch' is assigned a value but never used.

### src\components\fleet\FleetSmartDashboard.tsx (2 issues)

- [ERROR] Line 11: 'Car' is defined but never used.
- [ERROR] Line 17: 'Gauge' is defined but never used.

### src\components\fleet\MaintenanceAlertsPanel.tsx (2 issues)

- [ERROR] Line 12: 'Clock' is defined but never used.
- [ERROR] Line 167: 'threeDaysLaterStr' is assigned a value but never used.

### src\components\fleet\MaintenanceSidePanel.tsx (2 issues)

- [ERROR] Line 12: 'Calendar' is defined but never used.
- [ERROR] Line 13: 'Clock' is defined but never used.

### src\components\fleet\ReservationsCalendar.tsx (2 issues)

- [ERROR] Line 7: 'Clock' is defined but never used.
- [ERROR] Line 7: 'Car' is defined but never used.

### src\components\fleet\TrafficViolationPDFImport.tsx (2 issues)

- [ERROR] Line 21: 'Building' is defined but never used.
- [ERROR] Line 38: 'MatchedViolation' is defined but never used.

### src\components\fleet\TrafficViolationReports.tsx (2 issues)

- [ERROR] Line 72: 'unpaidViolations' is assigned a value but never used.
- [ERROR] Line 163: 'bankTransfers' is assigned a value but never used.

### src\components\fleet\TrafficViolationStats.tsx (2 issues)

- [ERROR] Line 10: 'TrendingDown' is defined but never used.
- [ERROR] Line 11: 'Calendar' is defined but never used.

### src\components\fleet\VehicleConditionDiagram.tsx (2 issues)

- [ERROR] Line 37: 'pendingPoint' is assigned a value but never used.
- [ERROR] Line 70: 'rect' is assigned a value but never used.

### src\components\fleet\VehicleReservationSystem.tsx (2 issues)

- [ERROR] Line 9: 'Calendar' is defined but never used.
- [ERROR] Line 45: 'user' is assigned a value but never used.

### src\components\hr\AccountCreatedDialog.tsx (2 issues)

- [ERROR] Line 79: 'err' is defined but never used.
- [ERROR] Line 110: 'e' is defined but never used.

### src\components\hr\UserAccountForm.tsx (2 issues)

- [ERROR] Line 20: 'Badge' is defined but never used.
- [ERROR] Line 120: 'emailData' is assigned a value but never used.

### src\components\hr\permissions\UserPermissionsDialog.tsx (2 issues)

- [ERROR] Line 24: 'XCircle' is defined but never used.
- [ERROR] Line 54: 'customPermissions' is assigned a value but never used.

### src\components\invoices\InvoiceApprovalWorkflow.tsx (2 issues)

- [ERROR] Line 19: 'Separator' is defined but never used.
- [ERROR] Line 29: 'DollarSign' is defined but never used.

### src\components\legal\AutoCreateCaseTriggersConfig.tsx (2 issues)

- [ERROR] Line 31: 'LoadingSpinner' is defined but never used.
- [ERROR] Line 63: 'isLoading' is assigned a value but never used.

### src\components\legal\CaseStatusManager.tsx (2 issues)

- [ERROR] Line 143: 'caseId' is defined but never used.
- [ERROR] Line 175: 'error' is defined but never used.

### src\components\legal\DelinquentDetailsDialog.tsx (2 issues)

- [ERROR] Line 15: 'Clock' is defined but never used.
- [ERROR] Line 19: 'User' is defined but never used.

### src\components\legal\DelinquentSummaryCards.tsx (2 issues)

- [ERROR] Line 6: 'Alert' is defined but never used.
- [ERROR] Line 6: 'AlertDescription' is defined but never used.

### src\components\legal\LegalComplaintGenerator.tsx (2 issues)

- [ERROR] Line 17: 'Textarea' is defined but never used.
- [ERROR] Line 228: 'error' is defined but never used.

### src\components\legal\document-generator\AIAssistant.tsx (2 issues)

- [ERROR] Line 7: 'ChevronDown' is defined but never used.
- [ERROR] Line 118: 'handleAIAction' is assigned a value but never used.

### src\components\legal\TimelineEntryDialog.tsx (2 issues)

- [ERROR] Line 61: 'caseId' is defined but never used.
- [ERROR] Line 128: 'error' is defined but never used.

### src\components\mobile\MobileFormWrapper.tsx (2 issues)

- [ERROR] Line 8: 'Card' is defined but never used.
- [ERROR] Line 108: 'clearDraft' is assigned a value but never used.

### src\components\monitoring\APIHealthDashboard.tsx (2 issues)

- [ERROR] Line 10: 'TabsContent' is defined but never used.
- [ERROR] Line 15: 'apiAnalytics' is defined but never used.

### src\components\navigation\QuickSearch.tsx (2 issues)

- [ERROR] Line 30: 'Package' is defined but never used.
- [ERROR] Line 170: 'typePaths' is assigned a value but never used.

### src\components\navigation\SidebarFavorites.tsx (2 issues)

- [ERROR] Line 11: 'StarOff' is defined but never used.
- [ERROR] Line 28: 'cn' is defined but never used.

### src\components\navigation\UnifiedSidebar.tsx (2 issues)

- [ERROR] Line 54: 'Button' is defined but never used.
- [ERROR] Line 257: 'onCloseMobile' is defined but never used.

### src\components\payments\CustomerPaymentIntelligence.tsx (2 issues)

- [ERROR] Line 17: 'Button' is defined but never used.
- [ERROR] Line 40: 'DollarSign' is defined but never used.

### src\components\payments\PaymentCalendar.tsx (2 issues)

- [ERROR] Line 42: 'DollarSign' is defined but never used.
- [ERROR] Line 67: 'isFuture' is defined but never used.

### src\components\payments\PaymentRegistrationTableRedesigned.tsx (2 issues)

- [ERROR] Line 4: 'Search' is defined but never used.
- [ERROR] Line 5: 'Filter' is defined but never used.

### src\components\payments\PaymentStatsCards.tsx (2 issues)

- [ERROR] Line 8: 'CreditCard' is defined but never used.
- [ERROR] Line 192: 'index' is defined but never used.

### src\components\payments\SmartPaymentMatching.tsx (2 issues)

- [ERROR] Line 12: 'PaymentMatchSuggestion' is defined but never used.
- [ERROR] Line 16: 'CardDescription' is defined but never used.

### src\components\performance\TestRunner.tsx (2 issues)

- [ERROR] Line 1: 'useMemo' is defined but never used.
- [ERROR] Line 3: 'PerformanceTestSuite' is defined but never used.

### src\components\property\AdvancedPropertyAlerts.tsx (2 issues)

- [ERROR] Line 19: 'TrendingUp' is defined but never used.
- [ERROR] Line 21: 'XCircle' is defined but never used.

### src\components\settings\CompanyBrandingSettings.tsx (2 issues)

- [ERROR] Line 11: 'Upload' is defined but never used.
- [ERROR] Line 89: 'user' is assigned a value but never used.

### src\components\settings\ElectronicSignatureSettings.tsx (2 issues)

- [ERROR] Line 5: 'Button' is defined but never used.
- [ERROR] Line 14: 'toast' is assigned a value but never used.

### src\components\super-admin\CreateUserDialog.tsx (2 issues)

- [ERROR] Line 45: 'isValid' is assigned a value but never used.
- [ERROR] Line 81: 'error' is defined but never used.

### src\components\super-admin\landing\LandingAnalytics.tsx (2 issues)

- [ERROR] Line 31: 'setDateRange' is assigned a value but never used.
- [ERROR] Line 451: 'index' is defined but never used.

### src\components\ui\CommandPalette.tsx (2 issues)

- [ERROR] Line 65: 'actionCommands' is assigned a value but never used.
- [ERROR] Line 66: 'themeCommands' is assigned a value but never used.

### src\components\ui\responsive-grid.tsx (2 issues)

- [ERROR] Line 57: 'isTablet' is assigned a value but never used.
- [ERROR] Line 57: 'isDesktop' is assigned a value but never used.

### src\components\ui\swipeable-components.tsx (2 issues)

- [ERROR] Line 4: 'useSwipeGesture' is defined but never used.
- [ERROR] Line 5: 'Archive' is defined but never used.

### src\components\vehicles\VehicleCheckInOut.tsx (2 issues)

- [ERROR] Line 17: 'useEffect' is defined but never used.
- [ERROR] Line 97: 'comparison' is assigned a value but never used.

### src\events\handlers\ContractEventHandlers.ts (2 issues)

- [ERROR] Line 7: 'createEvent' is defined but never used.
- [ERROR] Line 9: 'Event' is defined but never used.

### src\hooks\business\useCustomerOperations.ts (2 issues)

- [ERROR] Line 5: 'useCustomerDuplicateCheck' is defined but never used.
- [ERROR] Line 422: 'checkCustomerActiveRelations' is assigned a value but never used.

### src\hooks\finance\usePaymentValidation.ts (2 issues)

- [ERROR] Line 38: 'currency' is assigned a value but never used.
- [ERROR] Line 40: 'companyId' is assigned a value but never used.

### src\hooks\useAdvancedLateFineSystem.ts (2 issues)

- [ERROR] Line 1: 'useMemo' is defined but never used.
- [ERROR] Line 408: 'amount' is defined but never used.

### src\hooks\useAutomaticInvoiceGenerator.ts (2 issues)

- [ERROR] Line 2: 'Sentry' is defined but never used.
- [ERROR] Line 79: 'timestamp' is assigned a value but never used.

### src\hooks\useBiometricAuth.ts (2 issues)

- [ERROR] Line 85: 'user' is assigned a value but never used.
- [ERROR] Line 94: 'userHandle' is assigned a value but never used.

### src\hooks\useChartOfAccountsCSVUpload.ts (2 issues)

- [ERROR] Line 34: 'user' is assigned a value but never used.
- [ERROR] Line 178: 'rowNumber' is defined but never used.

### src\hooks\useContextualMemory.ts (2 issues)

- [ERROR] Line 146: 'type' is defined but never used.
- [ERROR] Line 288: '_' is defined but never used.

### src\hooks\useContractCustomerIntegration.ts (2 issues)

- [ERROR] Line 283: '_' is defined but never used.
- [ERROR] Line 283: 'variables' is defined but never used.

### src\hooks\useContractDocumentSaving.ts (2 issues)

- [ERROR] Line 357: 'companyName' is assigned a value but never used.
- [ERROR] Line 358: 'createdDate' is assigned a value but never used.

### src\hooks\useContractRecovery.ts (2 issues)

- [ERROR] Line 84: 'contractId' is defined but never used.
- [ERROR] Line 92: 'contractId' is defined but never used.

### src\hooks\useCSVUpload.ts (2 issues)

- [ERROR] Line 18: 'queryClient' is assigned a value but never used.
- [ERROR] Line 19: 'companyId' is assigned a value but never used.

### src\hooks\useCurrencyManager.ts (2 issues)

- [ERROR] Line 19: 'CurrencyExposureReport' is defined but never used.
- [ERROR] Line 20: 'ComplianceValidation' is defined but never used.

### src\hooks\useDashboardLayout.improved.ts (2 issues)

- [ERROR] Line 164: 'e' is defined but never used.
- [ERROR] Line 169: 'error' is defined but never used.

### src\hooks\useDashboardLayout.ts (2 issues)

- [ERROR] Line 170: 'e' is defined but never used.
- [ERROR] Line 175: 'error' is defined but never used.

### src\hooks\useDefaultPermissions.ts (2 issues)

- [ERROR] Line 34: 'adminPermissions' is assigned a value but never used.
- [ERROR] Line 57: 'basicPermissions' is assigned a value but never used.

### src\hooks\useDocumentGenerations.ts (2 issues)

- [ERROR] Line 12: 'GeneratedDocument' is defined but never used.
- [ERROR] Line 14: 'ApprovalStatus' is defined but never used.

### src\hooks\useDocumentTemplates.ts (2 issues)

- [ERROR] Line 11: 'TemplatesResponse' is defined but never used.
- [ERROR] Line 143: 'queryClient' is assigned a value but never used.

### src\hooks\useEnhancedDashboardStats.ts (2 issues)

- [ERROR] Line 54: 'user' is assigned a value but never used.
- [ERROR] Line 67: 'lastMonth' is assigned a value but never used.

### src\hooks\useEnhancedPerformanceMonitor.ts (2 issues)

- [ERROR] Line 49: 'queryPerformanceData' is assigned a value but never used.
- [ERROR] Line 149: 'vehiclesCount' is assigned a value but never used.

### src\hooks\useExport.ts (2 issues)

- [ERROR] Line 8: 'useRef' is defined but never used.
- [ERROR] Line 124: 'format' is defined but never used.

### src\hooks\useMaintenanceStats.ts (2 issues)

- [ERROR] Line 67: 'todayStr' is assigned a value but never used.
- [ERROR] Line 70: 'sevenDaysLaterStr' is assigned a value but never used.

### src\hooks\useMobilePerformance.ts (2 issues)

- [ERROR] Line 72: 'isOnline' is assigned a value but never used.
- [ERROR] Line 196: 'memoryInfo' is assigned a value but never used.

### src\hooks\useNumericalQueryHandler.ts (2 issues)

- [ERROR] Line 298: 'parsedQuery' is defined but never used.
- [ERROR] Line 318: 'arabic_context' is assigned a value but never used.

### src\hooks\useOptimizedDeleteCustomer.ts (2 issues)

- [ERROR] Line 80: 'customer' is defined but never used.
- [ERROR] Line 80: 'context' is defined but never used.

### src\hooks\usePaymentLegalIntegration.ts (2 issues)

- [ERROR] Line 5: 'isAfter' is defined but never used.
- [ERROR] Line 97: 'totalPaid' is assigned a value but never used.

### src\hooks\useSimpleUpdateCustomer.ts (2 issues)

- [ERROR] Line 15: 'key' is defined but never used.
- [ERROR] Line 30: 'selectedCompanyId' is assigned a value but never used.

### src\hooks\useTaqadiAutomation.ts (2 issues)

- [ERROR] Line 87: 'onComplete' is assigned a value but never used.
- [ERROR] Line 351: 'summary' is assigned a value but never used.

### src\hooks\useTaskNotifications.ts (2 issues)

- [ERROR] Line 138: 'phoneNumber' is defined but never used.
- [ERROR] Line 139: 'message' is defined but never used.

### src\hooks\useTouchInteraction.ts (2 issues)

- [ERROR] Line 108: 'e' is defined but never used.
- [ERROR] Line 153: 'e' is defined but never used.

### src\hooks\useTrafficViolationPayments.ts (2 issues)

- [ERROR] Line 204: 'data' is defined but never used.
- [ERROR] Line 267: 'data' is defined but never used.

### src\hooks\useTrafficViolationWhatsApp.ts (2 issues)

- [ERROR] Line 7: 'formatPhoneForWhatsApp' is defined but never used.
- [ERROR] Line 355: 'e' is defined but never used.

### src\hooks\useVehicleCSVUpload.ts (2 issues)

- [ERROR] Line 4: 'Vehicle' is defined but never used.
- [ERROR] Line 152: 'rowNumber' is defined but never used.

### src\hooks\useVehicleDetails.ts (2 issues)

- [ERROR] Line 188: 'maintenanceError' is assigned a value but never used.
- [ERROR] Line 208: 'penaltiesError' is assigned a value but never used.

### src\hooks\useVehicleStats.ts (2 issues)

- [ERROR] Line 146: 'maintenanceError' is assigned a value but never used.
- [ERROR] Line 156: 'insuranceError' is assigned a value but never used.

### src\hooks\useVendors.ts (2 issues)

- [ERROR] Line 6: 'usePermissions' is defined but never used.
- [ERROR] Line 451: 'vendor_id' is defined but never used.

### src\hooks\useVoiceInput.ts (2 issues)

- [ERROR] Line 7: 'VoiceInputConfig' is defined but never used.
- [ERROR] Line 63: 'error' is defined but never used.

### src\lib\contract-compliance.ts (2 issues)

- [ERROR] Line 566: 'contractData' is defined but never used.
- [ERROR] Line 652: 'result' is assigned a value but never used.

### src\lib\demo.ts (2 issues)

- [ERROR] Line 107: 'signUpData' is assigned a value but never used.
- [ERROR] Line 477: 'error' is defined but never used.

### src\lib\errorHandler.ts (2 issues)

- [ERROR] Line 58: 'name' is assigned a value but never used.
- [ERROR] Line 118: 'errorMessage' is assigned a value but never used.

### src\lib\i18n\businessRules.ts (2 issues)

- [ERROR] Line 517: 'params' is assigned a value but never used.
- [ERROR] Line 616: 'config' is assigned a value but never used.

### src\lib\inventory\optimization.ts (2 issues)

- [ERROR] Line 222: 'leadTimeDemand' is assigned a value but never used.
- [ERROR] Line 513: 'demandStats' is defined but never used.

### src\lib\inventory\supplierIntegration.ts (2 issues)

- [ERROR] Line 1: 'InventoryItem' is defined but never used.
- [ERROR] Line 332: 'criteria' is defined but never used.

### src\lib\mobile\MemoryLeakDetector.ts (2 issues)

- [ERROR] Line 236: 'error' is defined but never used.
- [ERROR] Line 336: 'error' is defined but never used.

### src\lib\permissions\permissions.ts (2 issues)

- [ERROR] Line 10: 'roleHasAllPermissions' is defined but never used.
- [ERROR] Line 10: 'roleHasAnyPermission' is defined but never used.

### src\lib\query-client.ts (2 issues)

- [ERROR] Line 6: 'QueryClientProvider' is defined but never used.
- [ERROR] Line 65: 'handleQueryError' is assigned a value but never used.

### src\lib\queryClient.ts (2 issues)

- [ERROR] Line 13: 'createDeduplicationKey' is defined but never used.
- [ERROR] Line 83: 'context' is defined but never used.

### src\lib\vite-security-plugin.ts (2 issues)

- [ERROR] Line 27: 'options' is defined but never used.
- [ERROR] Line 27: 'bundle' is defined but never used.

### src\modules\properties\components\PropertyDetailsView.tsx (2 issues)

- [ERROR] Line 31: 'Star' is defined but never used.
- [ERROR] Line 67: 'conditionLabels' is assigned a value but never used.

### src\modules\properties\components\PropertyFilters.tsx (2 issues)

- [ERROR] Line 19: 'PropertyType' is defined but never used.
- [ERROR] Line 19: 'PropertyStatus' is defined but never used.

### src\pages\AuditLogsPage.tsx (2 issues)

- [ERROR] Line 34: 'Calendar' is defined but never used.
- [ERROR] Line 80: 'severityColors' is assigned a value but never used.

### src\pages\admin\MonitoringDashboard.tsx (2 issues)

- [ERROR] Line 16: 'apiMonitor' is defined but never used.
- [ERROR] Line 20: 'setSelectedEndpoint' is assigned a value but never used.

### src\pages\customers\CustomersPageRedesigned.tsx (2 issues)

- [ERROR] Line 29: 'Star' is defined but never used.
- [ERROR] Line 500: 'vipCount' is assigned a value but never used.

### src\pages\finance\BudgetsAndCostCenters.tsx (2 issues)

- [ERROR] Line 5: 'useState' is defined but never used.
- [ERROR] Line 13: 'Wallet' is defined but never used.

### src\pages\finance\Deposits.tsx (2 issues)

- [ERROR] Line 3: 'CardDescription' is defined but never used.
- [ERROR] Line 37: 'toast' is assigned a value but never used.

### src\pages\finance\FinanceHubOld.tsx (2 issues)

- [ERROR] Line 14: 'Clock' is defined but never used.
- [ERROR] Line 60: 'isLoading' is assigned a value but never used.

### src\pages\finance\PaymentTracking.tsx (2 issues)

- [ERROR] Line 16: 'PageHelp' is defined but never used.
- [ERROR] Line 17: 'PaymentTrackingPageHelpContent' is defined but never used.

### src\pages\fleet\Drivers.tsx (2 issues)

- [ERROR] Line 4: 'PageHelp' is defined but never used.
- [ERROR] Line 5: 'DriversPageHelpContent' is defined but never used.

### src\pages\Index.tsx (2 issues)

- [ERROR] Line 1: 'motion' is defined but never used.
- [ERROR] Line 2: 'LoadingSpinner' is defined but never used.

### src\pages\hr\UnifiedSettings.tsx (2 issues)

- [ERROR] Line 15: 'Calendar' is defined but never used.
- [ERROR] Line 36: 'leaveTypesLoading' is assigned a value but never used.

### src\pages\legal\LegalCasesTrackingV2Final.tsx (2 issues)

- [ERROR] Line 58: 'showCaseWizard' is assigned a value but never used.
- [ERROR] Line 64: 'statsLoading' is assigned a value but never used.

### src\pages\mobile\MobileCars.tsx (2 issues)

- [ERROR] Line 4: 'MapPin' is defined but never used.
- [ERROR] Line 320: 'color' is defined but never used.

### src\pages\Properties.tsx (2 issues)

- [ERROR] Line 14: 'PageHelp' is defined but never used.
- [ERROR] Line 15: 'PropertiesPageHelpContent' is defined but never used.

### src\pages\QuotationApproval.tsx (2 issues)

- [ERROR] Line 1: 'useCallback' is defined but never used.
- [ERROR] Line 2: 'useParams' is defined but never used.

### src\pages\sales\SalesLeads.tsx (2 issues)

- [ERROR] Line 24: 'isEditDialogOpen' is assigned a value but never used.
- [ERROR] Line 25: 'selectedLead' is assigned a value but never used.

### src\pages\sales\SalesOrders.tsx (2 issues)

- [ERROR] Line 21: 'isEditDialogOpen' is assigned a value but never used.
- [ERROR] Line 22: 'selectedOrder' is assigned a value but never used.

### src\pages\Settings.tsx (2 issues)

- [ERROR] Line 23: 'PageHelp' is defined but never used.
- [ERROR] Line 24: 'SettingsPageHelpContent' is defined but never used.

### src\pages\SuperAdmin.tsx (2 issues)

- [ERROR] Line 6: 'PageHelp' is defined but never used.
- [ERROR] Line 7: 'SuperAdminPageHelpContent' is defined but never used.

### src\pages\Tenants.tsx (2 issues)

- [ERROR] Line 4: 'PageHelp' is defined but never used.
- [ERROR] Line 5: 'TenantsPageHelpContent' is defined but never used.

### src\pages\super-admin\Companies.tsx (2 issues)

- [ERROR] Line 24: 'PageHelp' is defined but never used.
- [ERROR] Line 25: 'CompaniesPageHelpContent' is defined but never used.

### src\server\middleware\auth.ts (2 issues)

- [ERROR] Line 32: 'supabaseAnon' is assigned a value but never used.
- [ERROR] Line 234: 'error' is defined but never used.

### src\server\services\rbac.ts (2 issues)

- [ERROR] Line 197: 'Permission' is defined but never used.
- [ERROR] Line 349: 'customPermissions' is assigned a value but never used.

### src\services\AccountingService.ts (2 issues)

- [ERROR] Line 347: 'previousBalanceDue' is assigned a value but never used.
- [ERROR] Line 575: 'companyId' is defined but never used.

### src\services\core\QueryOptimizer.ts (2 issues)

- [ERROR] Line 324: 'params' is defined but never used.
- [ERROR] Line 341: 'params' is defined but never used.

### src\services\taqadi\TaqadiDataExtractor.ts (2 issues)

- [ERROR] Line 14: 'TaqadiDocumentType' is defined but never used.
- [ERROR] Line 127: 'contract' is assigned a value but never used.

### src\services\whatsapp\ReportScheduler.ts (2 issues)

- [ERROR] Line 10: 'generateMonthlyReport' is defined but never used.
- [ERROR] Line 20: 'MessageLog' is defined but never used.

### src\stores\index.ts (2 issues)

- [ERROR] Line 232: 'removed' is assigned a value but never used.
- [ERROR] Line 284: 'state' is defined but never used.

### src\types\enhanced\customer.types.ts (2 issues)

- [ERROR] Line 6: 'ContactInfo' is defined but never used.
- [ERROR] Line 6: 'FinancialMetrics' is defined but never used.

### src\types\enhanced\vehicle.types.ts (2 issues)

- [ERROR] Line 6: 'Money' is defined but never used.
- [ERROR] Line 6: 'Address' is defined but never used.

### src\utils\backgroundProcessingQueue.ts (2 issues)

- [ERROR] Line 461: 'testCase' is defined but never used.
- [ERROR] Line 461: 'ocrResult' is defined but never used.

### src\utils\enhancedCurrencyUtils.ts (2 issues)

- [ERROR] Line 11: 'CURRENCY_CONFIGS' is defined but never used.
- [ERROR] Line 309: 'locale' is assigned a value but never used.

### src\utils\fuzzyMatching.ts (2 issues)

- [ERROR] Line 62: 'levenshteinDistance' is defined but never used.
- [ERROR] Line 236: 'rawText' is defined but never used.

### src\utils\mobileSpacing.ts (2 issues)

- [ERROR] Line 210: 'unit' is assigned a value but never used.
- [ERROR] Line 332: 'rect' is assigned a value but never used.

### src\utils\performanceValidation.ts (2 issues)

- [ERROR] Line 54: 'initialLogCount' is assigned a value but never used.
- [ERROR] Line 281: 'metrics' is assigned a value but never used.

### src\utils\receiptGenerator.ts (2 issues)

- [ERROR] Line 22: 'filename' is defined but never used.
- [ERROR] Line 95: 'computedStyle' is assigned a value but never used.

### src\utils\responsiveTesting.ts (2 issues)

- [ERROR] Line 734: '_' is defined but never used.
- [ERROR] Line 735: '_' is defined but never used.

### src\utils\whatsappWebSender.ts (2 issues)

- [ERROR] Line 46: '_config' is defined but never used.
- [ERROR] Line 278: 'dueDate' is defined but never used.

### src\hooks\use-toast.ts (1 issue)

- [ERROR] Line 18: 'actionTypes' is assigned a value but only used as a type.

### src\components\admin\ApiPerformanceDashboard.tsx (1 issue)

- [ERROR] Line 24: 'TrendingDown' is defined but never used.

### src\components\ai-chat-assistant\AssistantContext.tsx (1 issue)

- [ERROR] Line 6: 'useEffect' is defined but never used.

### src\components\approval\WorkflowForm.tsx (1 issue)

- [ERROR] Line 1: 'useState' is defined but never used.

### src\components\audit\AuditFilters.tsx (1 issue)

- [ERROR] Line 78: 'handleMultiSelect' is assigned a value but never used.

### src\components\audit\AuditTrailTable.tsx (1 issue)

- [ERROR] Line 31: 'Download' is defined but never used.

### src\components\audit\IntegrityReport.tsx (1 issue)

- [ERROR] Line 32: 'getIntegrityScoreColor' is assigned a value but never used.

### src\components\audit\RealTimeAlerts.tsx (1 issue)

- [ERROR] Line 6: 'useEffect' is defined but never used.

### src\components\command-palette\CommandPalette.tsx (1 issue)

- [ERROR] Line 15: 'TrendingUp' is defined but never used.

### src\components\common\LazyImage.tsx (1 issue)

- [ERROR] Line 94: 'error' is assigned a value but never used.

### src\components\common\LazyLoad.tsx (1 issue)

- [ERROR] Line 12: 'cn' is defined but never used.

### src\components\common\ProtectedRoute.tsx (1 issue)

- [ERROR] Line 38: 'companyId' is assigned a value but never used.

### src\components\contracts\AlarafOfficialContractComplete.tsx (1 issue)

- [ERROR] Line 84: 'todayHijriFormatted' is assigned a value but never used.

### src\components\contracts\CheckInChargesBreakdown.tsx (1 issue)

- [ERROR] Line 103: 'inspectionComparison' is defined but never used.

### src\components\contracts\CompanyDocumentSettings.tsx (1 issue)

- [ERROR] Line 8: 'FileText' is defined but never used.

### src\components\contracts\ContractDeleteDialog.tsx (1 issue)

- [ERROR] Line 38: 'error' is defined but never used.

### src\components\contracts\ContractExportDialog.tsx (1 issue)

- [ERROR] Line 22: 'AlertTriangle' is defined but never used.

### src\components\contracts\ContractHtmlViewer.tsx (1 issue)

- [ERROR] Line 5: 'formatDateForDocument' is defined but never used.

### src\components\contracts\ContractOperationsLog.tsx (1 issue)

- [ERROR] Line 16: 'supabase' is defined but never used.

### src\components\contracts\ContractRecoveryManager.tsx (1 issue)

- [ERROR] Line 8: 'cn' is defined but never used.

### src\components\contracts\ContractVehicleConditionReport.tsx (1 issue)

- [ERROR] Line 7: 'VehicleConditionItem' is defined but never used.

### src\components\contracts\ContractVehicleReturnForm.tsx (1 issue)

- [ERROR] Line 126: 'updateAutomaticNotes' is assigned a value but never used.

### src\components\contracts\ContractsList.tsx (1 issue)

- [ERROR] Line 33: 'isMobile' is assigned a value but never used.

### src\components\contracts\ContractsTabsContent.tsx (1 issue)

- [ERROR] Line 21: 'onManageStatus' is defined but never used.

### src\components\contracts\ConvertToLegalDialog.tsx (1 issue)

- [ERROR] Line 45: 'Clock' is defined but never used.

### src\components\contracts\ElectronicSignatureStatus.tsx (1 issue)

- [ERROR] Line 4: 'Settings' is defined but never used.

### src\components\contracts\LateFinesSettings.tsx (1 issue)

- [ERROR] Line 19: 'statistics' is assigned a value but never used.

### src\components\contracts\MobileTabsNavigation.tsx (1 issue)

- [ERROR] Line 12: 'activeTab' is defined but never used.

### src\components\contracts\OfficialContractView.tsx (1 issue)

- [ERROR] Line 10: 'Download' is defined but never used.

### src\components\contracts\ProactiveAlertSystem.tsx (1 issue)

- [ERROR] Line 2: 'CheckCircle' is defined but never used.

### src\components\contracts\payment-schedules\PaymentScheduleManager.tsx (1 issue)

- [ERROR] Line 6: 'Badge' is defined but never used.

### src\components\csv-archive\CSVArchiveSelector.tsx (1 issue)

- [ERROR] Line 21: 'downloadArchivedFile' is assigned a value but never used.

### src\components\csv\CSVFixPreview.tsx (1 issue)

- [ERROR] Line 158: 'index' is defined but never used.

### src\components\customers\CallDialog.tsx (1 issue)

- [ERROR] Line 10: 'User' is defined but never used.

### src\components\customers\CustomerAgingReport.tsx (1 issue)

- [ERROR] Line 33: 'updateAgingMutation' is assigned a value but never used.

### src\components\customers\CustomerDetailsPage.example.tsx (1 issue)

- [ERROR] Line 194: 'data' is assigned a value but never used.

### src\components\customers\CustomerInvoicesTab.tsx (1 issue)

- [ERROR] Line 54: 'getStatusBadge' is assigned a value but never used.

### src\components\customers\FixCustomerAccountsUtility.tsx (1 issue)

- [ERROR] Line 6: 'Progress' is defined but never used.

### src\components\dashboard\CustomizableDashboard.tsx (1 issue)

- [ERROR] Line 32: 'dashboardId' is defined but never used.

### src\components\dashboard\DashboardActivitySection.tsx (1 issue)

- [ERROR] Line 15: 'financialLoading' is assigned a value but never used.

### src\components\dashboard\EnhancedActivityFeed.tsx (1 issue)

- [ERROR] Line 5: 'Badge' is defined but never used.

### src\components\dashboard\EnhancedSecurityDashboard.tsx (1 issue)

- [ERROR] Line 12: 'CheckCircle' is defined but never used.

### src\components\dashboard\car-rental\FleetAvailabilityWidget.tsx (1 issue)

- [ERROR] Line 6: 'AlertTriangle' is defined but never used.

### src\components\dashboard\car-rental\InsuranceAlertsWidget.tsx (1 issue)

- [ERROR] Line 12: 'Skeleton' is defined but never used.

### src\components\dashboard\car-rental\MaintenanceScheduleWidget.tsx (1 issue)

- [ERROR] Line 9: 'Skeleton' is defined but never used.

### src\components\dashboard\car-rental\RentalAnalyticsWidget.tsx (1 issue)

- [ERROR] Line 9: 'Skeleton' is defined but never used.

### src\components\dashboard\car-rental\RevenueOptimizationWidget.tsx (1 issue)

- [ERROR] Line 10: 'Skeleton' is defined but never used.

### src\components\dashboard\customization\HierarchicalDashboard.tsx (1 issue)

- [ERROR] Line 3: 'ChevronDown' is defined but never used.

### src\components\dashboard\ForecastingSection.tsx (1 issue)

- [ERROR] Line 14: 'financialData' is assigned a value but never used.

### src\components\dashboard\QuickStatsRow.tsx (1 issue)

- [ERROR] Line 105: 'StatCard' is assigned a value but never used.

### src\components\dashboard\RealEstateEmptyState.tsx (1 issue)

- [ERROR] Line 137: 'index' is defined but never used.

### src\components\dashboard\UnifiedAlertsSystem.tsx (1 issue)

- [ERROR] Line 90: 'error' is defined but never used.

### src\components\demo\DemoDashboardAccess.tsx (1 issue)

- [ERROR] Line 28: 'navigate' is assigned a value but never used.

### src\components\demo\DemoTrialBanner.tsx (1 issue)

- [ERROR] Line 29: 'error' is defined but never used.

### src\components\empty-states\EmptyDashboard.tsx (1 issue)

- [ERROR] Line 2: 'BarChart3' is defined but never used.

### src\components\empty-states\EmptyInventory.tsx (1 issue)

- [ERROR] Line 2: 'PackageX' is defined but never used.

### src\components\error\ImprovedErrorDisplay.tsx (1 issue)

- [ERROR] Line 15: 'CardDescription' is defined but never used.

### src\components\error\ImprovedRouteErrorBoundary.tsx (1 issue)

- [ERROR] Line 113: 'fallbackPath' is defined but never used.

### src\components\FeedbackForm.tsx (1 issue)

- [ERROR] Line 20: 'AlertCircle' is defined but never used.

### src\components\filters\FilterBar.tsx (1 issue)

- [ERROR] Line 136: 'filtersLabel' is assigned a value but never used.

### src\components\filters\MultiSelectFilter.tsx (1 issue)

- [ERROR] Line 53: 'label' is defined but never used.

### src\components\finance\AccountChangeHistory.tsx (1 issue)

- [ERROR] Line 117: 'index' is defined but never used.

### src\components\finance\AccountDeleteConfirmDialog.tsx (1 issue)

- [ERROR] Line 1: 'React' is defined but never used.

### src\components\finance\AccountDeletionLogViewer.tsx (1 issue)

- [ERROR] Line 1: 'React' is defined but never used.

### src\components\finance\AccountsListWithActions.tsx (1 issue)

- [ERROR] Line 23: 'Filter' is defined but never used.

### src\components\finance\AuditTrailViewer.tsx (1 issue)

- [ERROR] Line 25: 'Filter' is defined but never used.

### src\components\finance\advanced-reports\FinancialTrendsReport.tsx (1 issue)

- [ERROR] Line 23: 'periodType' is defined but never used.

### src\components\finance\BalanceSheetReport.tsx (1 issue)

- [ERROR] Line 28: 'Legend' is defined but never used.

### src\components\finance\BudgetAlertsPanel.tsx (1 issue)

- [ERROR] Line 5: 'X' is defined but never used.

### src\components\finance\BudgetExecutionSummary.tsx (1 issue)

- [ERROR] Line 4: 'AlertCircle' is defined but never used.

### src\components\finance\DemoDataGenerator.tsx (1 issue)

- [ERROR] Line 4: 'Badge' is defined but never used.

### src\components\finance\charts\AccountTooltip.tsx (1 issue)

- [ERROR] Line 7: 'User' is defined but never used.

### src\components\finance\charts\KeyboardShortcutsHelp.tsx (1 issue)

- [ERROR] Line 14: 'Option' is defined but never used.

### src\components\finance\csv-import\CSVDragDropUpload.tsx (1 issue)

- [ERROR] Line 5: 'Badge' is defined but never used.

### src\components\finance\DetailedJournalEntryView.tsx (1 issue)

- [ERROR] Line 60: 'index' is defined but never used.

### src\components\finance\EnhancedAccountDeleteDialog.tsx (1 issue)

- [ERROR] Line 1: 'React' is defined but never used.

### src\components\finance\EnhancedCustomerAccountSelector.tsx (1 issue)

- [ERROR] Line 29: 'customerType' is assigned a value but never used.

### src\components\finance\FinancialObligationsTable.tsx (1 issue)

- [ERROR] Line 34: 'HookFinancialObligation' is defined but never used.

### src\components\finance\FixMissingInvoices.tsx (1 issue)

- [ERROR] Line 18: 'Calendar' is defined but never used.

### src\components\finance\enhanced-editing\AISmartParentSelector.tsx (1 issue)

- [ERROR] Line 6: 'Separator' is defined but never used.

### src\components\finance\enhanced-editing\AccountMoveValidator.ts (1 issue)

- [ERROR] Line 170: 'suggestions' is assigned a value but never used.

### src\components\finance\enhanced-editing\SmartSuggestionsShowcase.tsx (1 issue)

- [ERROR] Line 3: 'Button' is defined but never used.

### src\components\finance\JournalVoucherDisplay.tsx (1 issue)

- [ERROR] Line 3: 'Separator' is defined but never used.

### src\components\finance\PayInvoiceDialog.tsx (1 issue)

- [ERROR] Line 1: 'useState' is defined but never used.

### src\components\finance\payments\BulkDeletePaymentsDialog.tsx (1 issue)

- [ERROR] Line 42: 'companyId' is assigned a value but never used.

### src\components\finance\SimpleAccountDeleteStub.tsx (1 issue)

- [ERROR] Line 1: 'React' is defined but never used.

### src\components\finance\UnifiedPaymentForm.tsx (1 issue)

- [ERROR] Line 164: 'validationResult' is assigned a value but never used.

### src\components\finance\smart-allocation\SmartPaymentAllocation.tsx (1 issue)

- [ERROR] Line 80: 'error' is defined but never used.

### src\components\finance\wizard\WizardCompletion.tsx (1 issue)

- [ERROR] Line 14: 'TrendingUp' is defined but never used.

### src\components\fleet\FleetAnalytics.tsx (1 issue)

- [ERROR] Line 9: 'TrendingDown' is defined but never used.

### src\components\fleet\MaintenanceAccountMappingDialog.tsx (1 issue)

- [ERROR] Line 7: 'Input' is defined but never used.

### src\components\fleet\MaintenanceForm.tsx (1 issue)

- [ERROR] Line 20: 'cn' is defined but never used.

### src\components\fleet\MaintenanceList.tsx (1 issue)

- [ERROR] Line 71: 'cancelledMaintenance' is assigned a value but never used.

### src\components\fleet\TrafficViolationPaymentsDialog.tsx (1 issue)

- [ERROR] Line 5: 'CardDescription' is defined but never used.

### src\components\fleet\TrafficViolationReportDialog.tsx (1 issue)

- [ERROR] Line 3: 'ar' is defined but never used.

### src\components\fleet\TrafficViolationsAlertsPanel.tsx (1 issue)

- [ERROR] Line 10: 'ExternalLink' is defined but never used.

### src\components\fleet\VehicleConditionAlert.tsx (1 issue)

- [ERROR] Line 83: 'index' is defined but never used.

### src\components\fleet\VehicleConditionComparisonReport.tsx (1 issue)

- [ERROR] Line 4: 'Separator' is defined but never used.

### src\components\fleet\VehicleConditionReport.tsx (1 issue)

- [ERROR] Line 4: 'Input' is defined but never used.

### src\components\fleet\VehicleConditionReportDialog.tsx (1 issue)

- [ERROR] Line 22: 'vehicleId' is defined but never used.

### src\components\fleet\VehicleFilters.tsx (1 issue)

- [ERROR] Line 2: 'Calendar' is defined but never used.

### src\components\fleet\VehicleGroupManagement.tsx (1 issue)

- [ERROR] Line 23: 'companyId' is defined but never used.

### src\components\fleet\VehiclePricingPanel.tsx (1 issue)

- [ERROR] Line 9: 'Edit' is defined but never used.

### src\components\fleet\ViolationImportReport.tsx (1 issue)

- [ERROR] Line 10: 'Calendar' is defined but never used.

### src\components\help\content\ContractsPageHelp.tsx (1 issue)

- [ERROR] Line 4: 'HelpStep' is defined but never used.

### src\components\help\content\CustomersPageHelp.tsx (1 issue)

- [ERROR] Line 4: 'HelpStep' is defined but never used.

### src\components\help\HelpButton.tsx (1 issue)

- [ERROR] Line 7: 'DialogDescription' is defined but never used.

### src\components\help\content\QuickPaymentPageHelpContent.tsx (1 issue)

- [ERROR] Line 2: 'Download' is defined but never used.

### src\components\hr\HeaderAttendanceButton.tsx (1 issue)

- [ERROR] Line 14: 'user' is assigned a value but never used.

### src\components\hr\LeaveRequestDetailsDialog.tsx (1 issue)

- [ERROR] Line 4: 'Button' is defined but never used.

### src\components\hr\LeaveRequestReviewDialog.tsx (1 issue)

- [ERROR] Line 13: 'Badge' is defined but never used.

### src\components\hr\LeaveRequestsList.tsx (1 issue)

- [ERROR] Line 6: 'CardDescription' is defined but never used.

### src\components\hr\PayrollDetailsModal.tsx (1 issue)

- [ERROR] Line 14: 'Calendar' is defined but never used.

### src\components\hr\PayrollForm.tsx (1 issue)

- [ERROR] Line 149: 'total_deductions' is assigned a value but never used.

### src\components\hr\UserAccountsList.tsx (1 issue)

- [ERROR] Line 1: 'useState' is defined but never used.

### src\components\hr\permissions\AdvancedPermissionTemplates.tsx (1 issue)

- [ERROR] Line 22: 'ROLE_PERMISSIONS' is defined but never used.

### src\components\hr\permissions\PermissionAnalytics.tsx (1 issue)

- [ERROR] Line 11: 'TrendingDown' is defined but never used.

### src\components\hr\permissions\PermissionsDashboard.tsx (1 issue)

- [ERROR] Line 11: 'CheckCircle' is defined but never used.

### src\components\hr\reports\PayrollReportModal.tsx (1 issue)

- [ERROR] Line 51: 'error' is defined but never used.

### src\components\i18n\I18nProvider.tsx (1 issue)

- [ERROR] Line 12: 'initReactI18next' is defined but never used.

### src\components\i18n\LanguageSwitcher.tsx (1 issue)

- [ERROR] Line 33: 'getTextDirection' is assigned a value but never used.

### src\components\i18n\MirroredIcon.tsx (1 issue)

- [ERROR] Line 117: 'shouldMirrorIcon' is assigned a value but never used.

### src\components\integrations\InventoryAvailabilityBadge.tsx (1 issue)

- [ERROR] Line 85: 'isOutOfStock' is assigned a value but never used.

### src\components\integrations\QuickQuoteButton.tsx (1 issue)

- [ERROR] Line 21: 'AlertTriangle' is defined but never used.

### src\components\invoices\InvoiceLineItemBreakdown.tsx (1 issue)

- [ERROR] Line 218: 'index' is defined but never used.

### src\components\landing\BusinessTypesSection.tsx (1 issue)

- [ERROR] Line 138: 'index' is defined but never used.

### src\components\landing\enterprise\EnterpriseHowItWorks.tsx (1 issue)

- [ERROR] Line 2: 'ArrowLeft' is defined but never used.

### src\components\landing\enterprise\EnterpriseLiveDemo.tsx (1 issue)

- [ERROR] Line 2: 'Users' is defined but never used.

### src\components\landing\enterprise\EnterpriseNavbar.tsx (1 issue)

- [ERROR] Line 1: 'useEffect' is defined but never used.

### src\components\landing\FeatureShowcase.tsx (1 issue)

- [ERROR] Line 97: 'index' is defined but never used.

### src\components\landing\HeroSection.tsx (1 issue)

- [ERROR] Line 2: 'Play' is defined but never used.

### src\components\landing\TestimonialsSection.tsx (1 issue)

- [ERROR] Line 82: 'index' is defined but never used.

### src\components\landing\TrustedCompanies.tsx (1 issue)

- [ERROR] Line 55: 'index' is defined but never used.

### src\components\landing\enterprise\EnterpriseVideo.tsx (1 issue)

- [ERROR] Line 3: 'useEffect' is defined but never used.

### src\components\layouts\MobileNavigation.tsx (1 issue)

- [ERROR] Line 8: 'HelpCircle' is defined but never used.

### src\components\layouts\UnifiedLayout.tsx (1 issue)

- [ERROR] Line 13: 'Home' is defined but never used.

### src\components\legal\CaseListTable.tsx (1 issue)

- [ERROR] Line 36: 'Filter' is defined but never used.

### src\components\legal\CaseTimeline.tsx (1 issue)

- [ERROR] Line 77: 'caseId' is defined but never used.

### src\components\legal\CasesFilters.tsx (1 issue)

- [ERROR] Line 42: 'Plus' is defined but never used.

### src\components\legal\CreateLegalCaseDialog.tsx (1 issue)

- [ERROR] Line 40: 'Download' is defined but never used.

### src\components\legal\DeadlineAlerts.tsx (1 issue)

- [ERROR] Line 18: 'toast' is defined but never used.

### src\components\legal\LegalDocumentGenerator.tsx (1 issue)

- [ERROR] Line 6: 'Textarea' is defined but never used.

### src\components\legal\NoticeAutoFiller.tsx (1 issue)

- [ERROR] Line 7: 'AlertCircle' is defined but never used.

### src\components\legal\NoticeTemplateManager.tsx (1 issue)

- [ERROR] Line 1: 'React' is defined but never used.

### src\components\legal\SettlementProposal.tsx (1 issue)

- [ERROR] Line 7: 'Badge' is defined but never used.

### src\components\legal\document-generator\CategorySelector.tsx (1 issue)

- [ERROR] Line 26: 'Icon' is assigned a value but never used.

### src\components\legal\document-generator\DocumentHistory.tsx (1 issue)

- [ERROR] Line 8: 'Clock' is defined but never used.

### src\components\legal\document-generator\DocumentPreview.tsx (1 issue)

- [ERROR] Line 119: 'handleMarkAsSent' is assigned a value but never used.

### src\components\mobile\FloatingActionButton.tsx (1 issue)

- [ERROR] Line 14: 'ChevronUp' is defined but never used.

### src\components\mobile\VoiceInput.tsx (1 issue)

- [ERROR] Line 7: 'Loader2' is defined but never used.

### src\components\PageCustomizer.tsx (1 issue)

- [ERROR] Line 29: 'pageId' is defined but never used.

### src\components\onboarding\TourStep.tsx (1 issue)

- [ERROR] Line 2: 'AnimatePresence' is defined but never used.

### src\components\onboarding\WelcomeTour.tsx (1 issue)

- [ERROR] Line 41: 'autoStart' is assigned a value but never used.

### src\components\payments\PaymentReceipt.tsx (1 issue)

- [ERROR] Line 65: 'imagesLoaded' is assigned a value but never used.

### src\components\premium-landing\PricingSection.tsx (1 issue)

- [ERROR] Line 83: 'discount' is assigned a value but never used.

### src\components\property\PropertyAccountingIntegration.tsx (1 issue)

- [ERROR] Line 10: 'Calendar' is defined but never used.

### src\components\pwa\InstallPrompt.tsx (1 issue)

- [ERROR] Line 18: 'cn' is defined but never used.

### src\components\reports\ReportFilters.tsx (1 issue)

- [ERROR] Line 4: 'Input' is defined but never used.

### src\components\settings\ImageUploadField.tsx (1 issue)

- [ERROR] Line 5: 'X' is defined but never used.

### src\components\super-admin\SystemStatsCards.tsx (1 issue)

- [ERROR] Line 6: 'StatCardPercentage' is defined but never used.

### src\components\super-admin\landing\LandingPreview.tsx (1 issue)

- [ERROR] Line 247: 'index' is defined but never used.

### src\components\super-admin\payments\PaymentsDashboardStats.tsx (1 issue)

- [ERROR] Line 3: 'Badge' is defined but never used.

### src\components\super-admin\payments\RevenueAnalyticsChart.tsx (1 issue)

- [ERROR] Line 173: 'index' is defined but never used.

### src\components\super-admin\settings\BulkOperations.tsx (1 issue)

- [ERROR] Line 94: 'input' is defined but never used.

### src\components\super-admin\settings\DatabaseManagement.tsx (1 issue)

- [ERROR] Line 64: 'backupId' is defined but never used.

### src\components\super-admin\settings\SystemSecuritySettings.tsx (1 issue)

- [ERROR] Line 9: 'Clock' is defined but never used.

### src\components\tasks\PersonalReminders.tsx (1 issue)

- [ERROR] Line 56: 'X' is defined but never used.

### src\components\tasks\TaskDetailsSheet.tsx (1 issue)

- [ERROR] Line 29: 'Clock' is defined but never used.

### src\components\tasks\TaskForm.tsx (1 issue)

- [ERROR] Line 49: 'AlertTriangle' is defined but never used.

### src\components\tasks\UserGoals.tsx (1 issue)

- [ERROR] Line 42: 'TrendingUp' is defined but never used.

### src\components\ui\aspect-ratio.tsx (1 issue)

- [ERROR] Line 1: 'React' is defined but never used.

### src\components\ui\EmptyState.tsx (1 issue)

- [ERROR] Line 7: 'FileX' is defined but never used.

### src\components\ui\chart.tsx (1 issue)

- [ERROR] Line 70: '_' is defined but never used.

### src\components\ui\collapsible-section.tsx (1 issue)

- [ERROR] Line 9: 'Button' is defined but never used.

### src\components\ui\collapsible.tsx (1 issue)

- [ERROR] Line 1: 'React' is defined but never used.

### src\components\ui\form-field-with-validation.tsx (1 issue)

- [ERROR] Line 55: 'selectOptions' is assigned a value but never used.

### src\components\ui\native-bottom-sheet.tsx (1 issue)

- [ERROR] Line 78: 'isDragging' is assigned a value but never used.

### src\components\ui\native-button.tsx (1 issue)

- [ERROR] Line 9: 'HTMLMotionProps' is defined but never used.

### src\components\ui\responsive-card.tsx (1 issue)

- [ERROR] Line 43: 'isDesktop' is assigned a value but never used.

### src\components\ui\responsive-container.tsx (1 issue)

- [ERROR] Line 98: 'headerHeight' is assigned a value but never used.

### src\components\ui\responsive-form.tsx (1 issue)

- [ERROR] Line 5: 'ResponsiveGrid' is defined but never used.

### src\components\ui\sidebar.tsx (1 issue)

- [ERROR] Line 17: 'TooltipProvider' is defined but never used.

### src\components\ui\simple-toaster.tsx (1 issue)

- [ERROR] Line 1: 'React' is defined but never used.

### src\components\ui\VisualTestWrapper.tsx (1 issue)

- [ERROR] Line 82: 'getTestValue' is assigned a value but never used.

### src\components\ui\unified-account-selector.tsx (1 issue)

- [ERROR] Line 9: 'UnifiedAccount' is defined but never used.

### src\components\vehicle-installments\wizard\InstallmentCalendar.tsx (1 issue)

- [ERROR] Line 70: 'index' is defined but never used.

### src\components\vehicle-installments\wizard\MultiVehicleWizard.tsx (1 issue)

- [ERROR] Line 106: 'vehiclesError' is assigned a value but never used.

### src\components\vehicles\VehicleAvailabilityCalendar.tsx (1 issue)

- [ERROR] Line 4: 'Badge' is defined but never used.

### src\components\vehicles\VehicleGallerySelector.tsx (1 issue)

- [ERROR] Line 23: 'format' is defined but never used.

### src\contexts\AccessibilityContext.tsx (1 issue)

- [ERROR] Line 289: 'e' is defined but never used.

### src\contexts\AuthContext.tsx (1 issue)

- [ERROR] Line 299: 'currentLoadingState' is assigned a value but never used.

### src\contexts\FABContext.tsx (1 issue)

- [ERROR] Line 20: 'prev' is defined but never used.

### src\examples\api-monitoring-example.tsx (1 issue)

- [ERROR] Line 27: 'isHealthLoading' is assigned a value but never used.

### src\hooks\finance\useInvoices.ts (1 issue)

- [ERROR] Line 17: '_permission' is defined but never used.

### src\hooks\integrations\useInventorySalesOrders.ts (1 issue)

- [ERROR] Line 5: 'SalesOrder' is defined but never used.

### src\hooks\integrations\useVendorPurchaseOrders.ts (1 issue)

- [ERROR] Line 5: 'PurchaseOrder' is defined but never used.

### src\hooks\useAPIMonitoring.ts (1 issue)

- [ERROR] Line 18: 'AlertRule' is defined but never used.

### src\hooks\useAccountStatement.ts (1 issue)

- [ERROR] Line 160: 'referenceType' is assigned a value but never used.

### src\hooks\useAccountingWizard.ts (1 issue)

- [ERROR] Line 345: 'wizardData' is defined but never used.

### src\hooks\useAdaptiveContent.ts (1 issue)

- [ERROR] Line 207: 'isTablet' is assigned a value but never used.

### src\hooks\useAdvancedFinancialAnalytics.ts (1 issue)

- [ERROR] Line 173: 'payments' is defined but never used.

### src\hooks\useAuditLog.ts (1 issue)

- [ERROR] Line 18: 'toast' is defined but never used.

### src\hooks\useBadDebtProvision.ts (1 issue)

- [ERROR] Line 9: 'toast' is assigned a value but never used.

### src\hooks\useBulkDeleteContracts.ts (1 issue)

- [ERROR] Line 149: 'error' is defined but never used.

### src\hooks\useBulkDeleteCustomers.ts (1 issue)

- [ERROR] Line 196: 'error' is defined but never used.

### src\hooks\useBulkDeleteDuplicateContracts.ts (1 issue)

- [ERROR] Line 101: 'error' is defined but never used.

### src\hooks\useBulkPaymentOperations.ts (1 issue)

- [ERROR] Line 172: 'autoCreateCustomers' is assigned a value but never used.

### src\hooks\useCompanyCurrency.ts (1 issue)

- [ERROR] Line 10: 'currencyLocaleMap' is assigned a value but never used.

### src\hooks\useContractCalculations.ts (1 issue)

- [ERROR] Line 374: 'getPeriodLabel' is defined but never used.

### src\hooks\useContractDrafts.ts (1 issue)

- [ERROR] Line 6: 'ContractDraftUpdateInput' is defined but never used.

### src\hooks\useContractFormValidation.ts (1 issue)

- [ERROR] Line 42: 'validateOnBlur' is assigned a value but never used.

### src\hooks\useContractRenewal.ts (1 issue)

- [ERROR] Line 224: 'user' is assigned a value but never used.

### src\hooks\useContractsData.tsx (1 issue)

- [ERROR] Line 8: 'ContractWithVehicle' is defined but never used.

### src\hooks\useConvertToLegalCase.ts (1 issue)

- [ERROR] Line 32: 'attachments' is assigned a value but never used.

### src\hooks\useCSVArchive.ts (1 issue)

- [ERROR] Line 207: 'uploadData' is assigned a value but never used.

### src\hooks\useCSVTemplates.ts (1 issue)

- [ERROR] Line 1: 'useState' is defined but never used.

### src\hooks\useCostCenterReports.ts (1 issue)

- [ERROR] Line 64: 'journalLines' is assigned a value but never used.

### src\hooks\useCostCenters.ts (1 issue)

- [ERROR] Line 6: 'filter' is assigned a value but never used.

### src\hooks\useCreateInspection.ts (1 issue)

- [ERROR] Line 41: 'PhotoUploadResult' is defined but never used.

### src\hooks\useCustomerDocuments.ts (1 issue)

- [ERROR] Line 143: 'filePath' is assigned a value but never used.

### src\hooks\useCustomerPDFReport.ts (1 issue)

- [ERROR] Line 5: 'ar' is defined but never used.

### src\hooks\useCustomerSearch.ts (1 issue)

- [ERROR] Line 4: 'Customer' is defined but never used.

### src\hooks\useDashboardStats.ts (1 issue)

- [ERROR] Line 71: 'error' is defined but never used.

### src\hooks\useDelinquentCustomers.ts (1 issue)

- [ERROR] Line 7: 'calculateMonthsUnpaid' is defined but never used.

### src\hooks\useDepreciationSystem.ts (1 issue)

- [ERROR] Line 9: 'toast' is assigned a value but never used.

### src\hooks\useDirectAccountDeletion.ts (1 issue)

- [ERROR] Line 143: 'accountsToProcess' is assigned a value but never used.

### src\hooks\useDynamicCurrencyFormat.ts (1 issue)

- [ERROR] Line 4: 'formatNumberWithPreferences' is defined but never used.

### src\hooks\useDynamicLandingContent.ts (1 issue)

- [ERROR] Line 4: 'content' is assigned a value but never used.

### src\hooks\useEnhancedChartOfAccountsCSVUpload.ts (1 issue)

- [ERROR] Line 42: 'user' is assigned a value but never used.

### src\hooks\useEnhancedContextAnalyzer.ts (1 issue)

- [ERROR] Line 128: 'relationshipKey' is assigned a value but never used.

### src\hooks\useEnhancedContractDocuments.ts (1 issue)

- [ERROR] Line 23: 'DocumentCreationProgress' is defined but never used.

### src\hooks\useEnhancedCustomerAccounts.ts (1 issue)

- [ERROR] Line 203: 'customerId' is defined but never used.

### src\hooks\useEnhancedCustomerFinancials.ts (1 issue)

- [ERROR] Line 204: 'error' is defined but never used.

### src\hooks\useEnhancedFinancialOverview.ts (1 issue)

- [ERROR] Line 29: 'EnhancedFinancialOverview' is defined but never used.

### src\hooks\useErrorBoundary.ts (1 issue)

- [ERROR] Line 197: 'e' is defined but never used.

### src\hooks\useFABActions.ts (1 issue)

- [ERROR] Line 11: 'Users' is defined but never used.

### src\hooks\useFilterState.ts (1 issue)

- [ERROR] Line 112: 'searchParams' is assigned a value but never used.

### src\hooks\useFinancialFixes.ts (1 issue)

- [ERROR] Line 73: 'data' is defined but never used.

### src\hooks\useFleetStatus.ts (1 issue)

- [ERROR] Line 19: 'filter' is assigned a value but never used.

### src\hooks\useFleetVehicleGroups.ts (1 issue)

- [ERROR] Line 74: 'data' is defined but never used.

### src\hooks\useFleetVehicleInsurance.ts (1 issue)

- [ERROR] Line 84: 'data' is defined but never used.

### src\hooks\useInteractiveClarification.ts (1 issue)

- [ERROR] Line 2: 'supabase' is defined but never used.

### src\hooks\useInventoryAdjustment.ts (1 issue)

- [ERROR] Line 9: 'toast' is assigned a value but never used.

### src\hooks\useInventoryReporting.ts (1 issue)

- [ERROR] Line 328: 'generateSummary' is defined but never used.

### src\hooks\useLandingAnalytics.ts (1 issue)

- [ERROR] Line 25: 'companyId' is defined but never used.

### src\hooks\useLegalDocuments.ts (1 issue)

- [ERROR] Line 171: 'file' is assigned a value but never used.

### src\hooks\useLocalStorage.ts (1 issue)

- [ERROR] Line 1: 'useEffect' is defined but never used.

### src\hooks\useMonitoredQuery.ts (1 issue)

- [ERROR] Line 1: 'useQuery' is defined but never used.

### src\hooks\useMonthlyRentTracking.ts (1 issue)

- [ERROR] Line 97: 'daysInMonth' is assigned a value but never used.

### src\hooks\useOptimizedReservations.ts (1 issue)

- [ERROR] Line 5: 'useEffect' is defined but never used.

### src\hooks\usePaymentSchedules.ts (1 issue)

- [ERROR] Line 12: 'PaymentScheduleWithContract' is defined but never used.

### src\hooks\usePayrollJournalIntegration.ts (1 issue)

- [ERROR] Line 9: 'toast' is assigned a value but never used.

### src\hooks\usePerformanceMonitor.ts (1 issue)

- [ERROR] Line 155: 'startTime' is assigned a value but never used.

### src\hooks\usePerformanceOptimization.ts (1 issue)

- [ERROR] Line 32: 'renderStartTime' is assigned a value but never used.

### src\hooks\usePermissionCheck.ts (1 issue)

- [ERROR] Line 6: 'UserPermissionData' is defined but never used.

### src\hooks\useProfessionalPaymentSystem.ts (1 issue)

- [ERROR] Line 16: 'calculateLinkingConfidence' is assigned a value but never used.

### src\hooks\usePropertyReports.ts (1 issue)

- [ERROR] Line 134: 'ownersData' is assigned a value but never used.

### src\hooks\useQuotePDFGenerator.ts (1 issue)

- [ERROR] Line 5: 'SalesQuote' is defined but never used.

### src\hooks\useRentalPaymentJournalIntegration.ts (1 issue)

- [ERROR] Line 7: 'toast' is defined but never used.

### src\hooks\useScrollDirection.ts (1 issue)

- [ERROR] Line 1: 'RefObject' is defined but never used.

### src\hooks\useSmartAnalytics.ts (1 issue)

- [ERROR] Line 262: 'periods' is assigned a value but never used.

### src\hooks\useStatisticalQueryClassifier.ts (1 issue)

- [ERROR] Line 240: 'normalizedQuery' is defined but never used.

### src\hooks\useStatisticalQueryHandler.ts (1 issue)

- [ERROR] Line 380: 'data' is assigned a value but never used.

### src\hooks\useSubscriptionsAnalytics.ts (1 issue)

- [ERROR] Line 73: 'lastMonth' is assigned a value but never used.

### src\hooks\useTasks.ts (1 issue)

- [ERROR] Line 333: 'checklists' is assigned a value but never used.

### src\hooks\useTenants.ts (1 issue)

- [ERROR] Line 102: '_' is defined but never used.

### src\hooks\useTrafficViolationJournalIntegration.ts (1 issue)

- [ERROR] Line 9: 'toast' is assigned a value but never used.

### src\hooks\useTrafficViolationStats.ts (1 issue)

- [ERROR] Line 4: 'format' is defined but never used.

### src\hooks\useUserGoals.ts (1 issue)

- [ERROR] Line 298: 'today' is assigned a value but never used.

### src\hooks\useVehicleGroups.ts (1 issue)

- [ERROR] Line 75: 'data' is defined but never used.

### src\hooks\useVehicleStatusIntegration.ts (1 issue)

- [ERROR] Line 20: 'reason' is defined but never used.

### src\lib\compatibleForm.ts (1 issue)

- [ERROR] Line 1: 'React' is defined but never used.

### src\lib\i18n\validation.ts (1 issue)

- [ERROR] Line 322: 'language' is defined but never used.

### src\lib\monitoring\errorTracking.ts (1 issue)

- [ERROR] Line 480: 'alert' is defined but never used.

### src\lib\performance\apm.ts (1 issue)

- [ERROR] Line 6: 'PerformanceMetric' is defined but never used.

### src\lib\request-signing.ts (1 issue)

- [ERROR] Line 212: 'newRequest' is assigned a value but never used.

### src\lib\security-test.ts (1 issue)

- [ERROR] Line 9: 'sanitizeHtml' is defined but never used.

### src\lib\security.ts (1 issue)

- [ERROR] Line 8: 'AppType' is defined but never used.

### src\lib\sentry.ts (1 issue)

- [ERROR] Line 47: 'hint' is defined but never used.

### src\lib\supabaseStorageKeys.ts (1 issue)

- [ERROR] Line 66: 'authStateKey' is assigned a value but never used.

### src\modules\properties\components\PropertyImageUpload.tsx (1 issue)

- [ERROR] Line 45: 'setUploading' is assigned a value but never used.

### src\modules\properties\components\PropertyStatusBadge.tsx (1 issue)

- [ERROR] Line 9: 'XCircle' is defined but never used.

### src\modules\properties\components\contracts\PropertyContractWizard.tsx (1 issue)

- [ERROR] Line 76: 'watch' is assigned a value but never used.

### src\modules\properties\hooks\useProperty.ts (1 issue)

- [ERROR] Line 3: 'Property' is defined but never used.

### src\modules\properties\hooks\usePropertyContracts.ts (1 issue)

- [ERROR] Line 4: 'PropertyContract' is defined but never used.

### src\modules\properties\hooks\usePropertyMaintenance.ts (1 issue)

- [ERROR] Line 205: 'property' is assigned a value but never used.

### src\modules\tenants\components\TenantForm.tsx (1 issue)

- [ERROR] Line 7: 'Label' is defined but never used.

### src\modules\tenants\components\TenantTable.tsx (1 issue)

- [ERROR] Line 1: 'useState' is defined but never used.

### src\modules\tenants\pages\Tenants.tsx (1 issue)

- [ERROR] Line 3: 'Badge' is defined but never used.

### src\pages\AboutUs.tsx (1 issue)

- [ERROR] Line 2: 'Phone' is defined but never used.

### src\pages\AddProperty.tsx (1 issue)

- [ERROR] Line 9: 'Property' is defined but never used.

### src\pages\AuditPage.tsx (1 issue)

- [ERROR] Line 4: 'CardContent' is defined but never used.

### src\pages\BackupPage.tsx (1 issue)

- [ERROR] Line 4: 'CardContent' is defined but never used.

### src\pages\DemoTrial.tsx (1 issue)

- [ERROR] Line 14: 'cn' is defined but never used.

### src\pages\finance\AccountingWizard.tsx (1 issue)

- [ERROR] Line 3: 'HelpIcon' is defined but never used.

### src\pages\finance\CostCenters.tsx (1 issue)

- [ERROR] Line 14: 'TooltipProvider' is defined but never used.

### src\pages\finance\NewEntry.tsx (1 issue)

- [ERROR] Line 170: 'index' is defined but never used.

### src\pages\finance\settings\AccountsSettings.tsx (1 issue)

- [ERROR] Line 6: 'toast' is defined but never used.

### src\pages\Finance.tsx (1 issue)

- [ERROR] Line 24: 'InvoiceScannerDashboard' is assigned a value but never used.

### src\pages\finance\settings\CostCentersSettings.tsx (1 issue)

- [ERROR] Line 4: 'Settings' is defined but never used.

### src\pages\finance\settings\FinancialSystemAnalysis.tsx (1 issue)

- [ERROR] Line 1: 'useState' is defined but never used.

### src\pages\fleet\DispatchPermits.tsx (1 issue)

- [ERROR] Line 3: 'Button' is defined but never used.

### src\pages\fleet\reports\components\FleetKPICards.tsx (1 issue)

- [ERROR] Line 18: 'Target' is defined but never used.

### src\pages\fleet\reports\components\ReportFilters.tsx (1 issue)

- [ERROR] Line 26: 'Filter' is defined but never used.

### src\pages\fleet\reports\components\ReportGenerator.tsx (1 issue)

- [ERROR] Line 10: 'Badge' is defined but never used.

### src\pages\Import.tsx (1 issue)

- [ERROR] Line 48: 'user' is assigned a value but never used.

### src\pages\InvoiceScannerPage.tsx (1 issue)

- [ERROR] Line 8: 'Button' is defined but never used.

### src\pages\fleet\TrafficViolationPayments.tsx (1 issue)

- [ERROR] Line 2: 'Filter' is defined but never used.

### src\pages\hr\Attendance.tsx (1 issue)

- [ERROR] Line 18: 'AttendanceRecord' is defined but never used.

### src\pages\hr\LeaveManagement.tsx (1 issue)

- [ERROR] Line 9: 'usePermissionCheck' is defined but never used.

### src\pages\inventory\InventoryReports.tsx (1 issue)

- [ERROR] Line 3: 'Button' is defined but never used.

### src\pages\legal\CompanyLegalDocuments.tsx (1 issue)

- [ERROR] Line 7: 'AnimatePresence' is defined but never used.

### src\pages\legal\DefaultersList.tsx (1 issue)

- [ERROR] Line 27: 'differenceInDays' is defined but never used.

### src\pages\legal\LegalReports.tsx (1 issue)

- [ERROR] Line 21: 'Calendar' is defined but never used.

### src\pages\mobile\MobileCustomerDetails.tsx (1 issue)

- [ERROR] Line 15: 'Building' is defined but never used.

### src\pages\mobile\MobileCustomers.tsx (1 issue)

- [ERROR] Line 10: 'ChevronLeft' is defined but never used.

### src\pages\NativeMobileDemo.tsx (1 issue)

- [ERROR] Line 30: 'Plus' is defined but never used.

### src\pages\PremiumLanding.tsx (1 issue)

- [ERROR] Line 2: 'useTransform' is defined but never used.

### src\pages\Profile.tsx (1 issue)

- [ERROR] Line 120: 'error' is defined but never used.

### src\pages\PropertyContractDetails.tsx (1 issue)

- [ERROR] Line 3: 'Trash2' is defined but never used.

### src\pages\PropertyPayments.tsx (1 issue)

- [ERROR] Line 28: 'ar' is defined but never used.

### src\pages\ResetPassword.tsx (1 issue)

- [ERROR] Line 37: 'err' is defined but never used.

### src\pages\reports\ReportsHub.tsx (1 issue)

- [ERROR] Line 54: 'reportId' is defined but never used.

### src\pages\sales\SalesOpportunities.tsx (1 issue)

- [ERROR] Line 14: 'ArrowRight' is defined but never used.

### src\pages\SubscriptionPage.tsx (1 issue)

- [ERROR] Line 4: 'CardContent' is defined but never used.

### src\pages\SupportTicketDetail.tsx (1 issue)

- [ERROR] Line 16: 'useUserPermissions' is defined but never used.

### src\pages\sales\SalesPipeline.tsx (1 issue)

- [ERROR] Line 23: 'selectedOpportunity' is assigned a value but never used.

### src\pages\sales\SalesQuotes.tsx (1 issue)

- [ERROR] Line 40: 'convertQuoteToContract' is assigned a value but never used.

### src\pages\super-admin\Reports.tsx (1 issue)

- [ERROR] Line 9: 'FileText' is defined but never used.

### src\scripts\delete-duplicate-violations.ts (1 issue)

- [ERROR] Line 172: 'totalDuplicates' is assigned a value but never used.

### src\scripts\delete-violations-without-vehicles.ts (1 issue)

- [ERROR] Line 200: 'reason' is assigned a value but never used.

### src\scripts\sync-agreement-numbers.ts (1 issue)

- [ERROR] Line 88: 'data' is assigned a value but never used.

### src\scripts\syncVehicleContractStatus.ts (1 issue)

- [ERROR] Line 134: 'plateNumbers' is assigned a value but never used.

### src\server\middleware\cache.ts (1 issue)

- [ERROR] Line 100: 'responseData' is assigned a value but never used.

### src\server\middleware\error-handler.ts (1 issue)

- [ERROR] Line 395: 'monitoringPeriod' is assigned a value but never used.

### src\server\middleware\errorHandler.ts (1 issue)

- [ERROR] Line 44: 'next' is defined but never used.

### src\server\routes\contracts.ts (1 issue)

- [ERROR] Line 10: 'requireCompanyAccess' is defined but never used.

### src\services\BankReconciliationService.ts (1 issue)

- [ERROR] Line 599: 'userId' is defined but never used.

### src\services\ContractService.ts (1 issue)

- [ERROR] Line 391: 'contract' is defined but never used.

### src\services\CustomerDetailsService.ts (1 issue)

- [ERROR] Line 417: 'totalPayments' is defined but never used.

### src\services\DataQualityService.ts (1 issue)

- [ERROR] Line 174: 'defaultRules' is assigned a value but never used.

### src\services\core\ApiCache.ts (1 issue)

- [ERROR] Line 378: 'reason' is defined but never used.

### src\services\core\PerformanceMonitor.ts (1 issue)

- [ERROR] Line 450: 'stats' is assigned a value but never used.

### src\services\core\RequestDeduplicator.ts (1 issue)

- [ERROR] Line 197: 'key' is assigned a value but never used.

### src\services\taqadi\TaqadiBrowserAutomation.ts (1 issue)

- [ERROR] Line 414: 'optionSelector' is assigned a value but never used.

### src\services\taqadi\TaqadiService.ts (1 issue)

- [ERROR] Line 399: '_' is defined but never used.

### src\stores\appStore.ts (1 issue)

- [ERROR] Line 71: 'get' is defined but never used.

### src\types\enhanced\contracts.types.ts (1 issue)

- [ERROR] Line 6: 'Money' is defined but never used.

### src\types\signed-agreements.ts (1 issue)

- [ERROR] Line 593: 'fileId' is defined but never used.

### src\utils\accessibilityTesting.ts (1 issue)

- [ERROR] Line 57: 'error' is defined but never used.

### src\utils\addVehicleFieldsToContracts.ts (1 issue)

- [ERROR] Line 8: 'testData' is assigned a value but never used.

### src\utils\businessTypeReports.ts (1 issue)

- [ERROR] Line 9: 'TrendingUp' is defined but never used.

### src\utils\contractValidationMessages.ts (1 issue)

- [ERROR] Line 89: 'isRequired' is assigned a value but never used.

### src\utils\csv.ts (1 issue)

- [ERROR] Line 399: 'index' is defined but never used.

### src\utils\currencyHelper.ts (1 issue)

- [ERROR] Line 41: 'companyId' is defined but never used.

### src\utils\dateFormatter.ts (1 issue)

- [ERROR] Line 1: 'convertToArabicDigits' is defined but never used.

### src\utils\exports\csvExport.ts (1 issue)

- [ERROR] Line 371: 'error' is defined but never used.

### src\utils\exports\pdfExport.ts (1 issue)

- [ERROR] Line 61: 'CONTENT_HEIGHT' is assigned a value but never used.

### src\utils\filterUrlSync.ts (1 issue)

- [ERROR] Line 8: 'FilterUrlParams' is defined but never used.

### src\utils\htmlSanitizer.ts (1 issue)

- [ERROR] Line 163: 'variable' is defined but never used.

### src\utils\imagePreprocessing.ts (1 issue)

- [ERROR] Line 21: 'contrast' is assigned a value but never used.

### src\utils\lazyWithRetry.ts (1 issue)

- [ERROR] Line 84: 'e' is defined but never used.

### src\utils\official-letter-generator.ts (1 issue)

- [ERROR] Line 673: 'currentDate' is assigned a value but never used.

### src\utils\printHelper.tsx (1 issue)

- [ERROR] Line 110: 'data' is defined but never used.

### src\utils\professionalPaymentLinking.ts (1 issue)

- [ERROR] Line 119: 'tolerance' is assigned a value but never used.

### src\utils\reportFormatters.ts (1 issue)

- [ERROR] Line 301: 'index' is defined but never used.

### src\utils\taqadiBookmarklet.ts (1 issue)

- [ERROR] Line 6: 'TaqadiSubmissionData' is defined but never used.

### src\utils\voiceInputHelpers.ts (1 issue)

- [ERROR] Line 76: 'error' is defined but never used.

### src\workflows\WorkflowEngine.ts (1 issue)

- [ERROR] Line 129: 'nextStep' is assigned a value but never used.

---

## Cleanup Commands

### Auto-fix unused imports (safe):
```bash
npx eslint --ext .ts,.tsx src --fix
```

### Manually review and fix:
```bash
# Review all unused code issues
npx eslint --ext .ts,.tsx src --rule "@typescript-eslint/no-unused-vars: error"

# Review specific directory
npx eslint src/components/contracts/ --rule "@typescript-eslint/no-unused-vars: error"
```

### Find potentially unused exports:
```bash
# Use ts-prune to find unused exports (requires installation)
npm install -D ts-prune
npx ts-prune -e "^_"
```

---

## Analysis Methodology

1. **Tool Used:** ESLint with @typescript-eslint/no-unused-vars rule
2. **Scope:** All .ts and .tsx files in src/ directory
3. **Exclusions:** Test files (.test., .spec.), type definitions (.d.ts), node_modules
4. **Limitations:**
   - Dynamic imports (import(), require()) not analyzed
   - Reflection-based usage not detected
   - Some false positives possible for type-only imports
   - React component prop types may be flagged

---

## Notes

- This is a **static analysis** - some dynamically used code may be flagged
- Before removing any code, verify it's not used in:
  - Test files
  - Storybook stories
  - Documentation examples
  - External integrations
- Consider the **age of the code** - recent unused code might be work-in-progress
- Check **git history** before deleting to understand why code was added

---

**Report generated by unused-code-analysis.mjs**

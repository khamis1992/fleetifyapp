# Dashboard and Contracts Management Documentation

## Overview
This document provides detailed documentation of the Dashboard and Contracts management features in the Fleetify system, with screenshots captured on October 27, 2025.

---

## Dashboard Features

### 1. Dashboard Overview
**Screenshot:** `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\dashboard-overview.png`

The Dashboard provides a comprehensive overview of the company's operations with:

#### Header Section
- **Welcome Message**: "صباح الخير, خميس" (Good morning, Khamis)
- **Description**: Overview of company performance today
- **Date Display**: Shows current date (Monday, October 27, 2025)
- **User Status**: Shows attendance status (غير مسجل - Not registered) with clock-in button

#### Key Components
1. **Quick Actions Section** - Most frequently used operations
2. **Recent Activities** - Timeline of system activities
3. **Financial Overview** - Comprehensive financial statistics

---

### 2. Quick Actions Section
**Screenshot:** `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\dashboard-quick-actions.png`

A time-saving feature providing quick access to common operations:

**Available Actions:**
1. **إضافة عميل جديد** (Add New Customer)
   - Badge: "شائع" (Popular)
   - Description: Register a new customer in the system

2. **إضافة مركبة** (Add Vehicle)
   - Badge: "سريع" (Fast)
   - Description: Register a new vehicle in the fleet

3. **إنشاء عقد** (Create Contract)
   - Description: Create a new rental contract

4. **تسجيل دفعة** (Record Payment)
   - Description: Record a new financial payment

5. **الحاسبة المالية** (Financial Calculator)
   - Description: Calculate costs and profits

6. **البحث المتقدم** (Advanced Search)
   - Description: Search all system records

**Design Features:**
- Clean card-based layout
- Icon-based visual indicators
- Hover effects for better UX
- "Time-saver" badge indicator

---

### 3. Financial Overview
**Screenshot:** `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\dashboard-financial-overview.png`

Comprehensive financial statistics showing:

#### Revenue Metrics
1. **الإيرادات الشهرية** (Monthly Revenue)
   - Amount: QAR 2,905,558
   - Change: 0.0%
   - Action: "عرض التقرير المالي" (View Financial Report)

2. **إجمالي الأرباح** (Total Profits)
   - Amount: QAR 8,716,675
   - Change: +100.0%
   - Action: "التحليل المالي" (Financial Analysis)

#### Contract Statistics
3. **العقود النشطة** (Active Contracts)
   - Count: 0
   - Action: "عرض جميع العقود" (View All Contracts)

#### Payment Status
4. **حالة المدفوعات** (Payment Status)
   - Pending Payments: 0
   - Action: "عرض الكل" (View All)

**Design Features:**
- Color-coded metrics
- Percentage change indicators with arrows
- Quick action buttons for each metric
- Clean, organized card layout

---

## Contracts Management Features

### 1. Contracts Main Page
**Screenshot:** `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\contracts-main.png`

The main contracts management interface with:

#### Page Header
- **Title**: "إدارة العقود" (Contracts Management)
- **Subtitle**: "إدارة عقود الإيجار والتحديات مع العملاء" (Manage rental contracts and customer challenges)

#### Action Buttons
1. **حذف جميع العقود** (Delete All Contracts) - Red destructive button
2. **تصدير التقرير** (Export Report)
3. **رفع CSV** (Upload CSV)
4. **القوالب** (Templates)

---

### 2. Contract Statistics
**Screenshots:**
- `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\contracts-statistics.png`
- `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\contracts-page-top.png`
- `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\contracts-header-actions.png`

#### Statistics Cards (إنشاء فواتير للعقود المفقودة)
Five statistical cards showing:

1. **العقود النشطة** (Active Contracts)
   - Count: 101
   - Status: "قيد التنفيذ" (In Progress)
   - Badge: Green checkmark

2. **قيد المراجعة** (Under Review)
   - Count: 0
   - Status: "تحتاج موافقة" (Needs Approval)
   - Badge: Orange indicator

3. **مسودات العقود** (Contract Drafts)
   - Count: 0
   - Status: "تحتاج إكمال" (Needs Completion)
   - Badge: Yellow indicator

4. **العقود المنتهية** (Expired Contracts)
   - Count: 409
   - Status: "عقود منتهية" (Expired Contracts)
   - Badge: Red indicator

5. **إجمالي الإيرادات** (Total Revenue)
   - Amount: QAR 0
   - Description: "من العقود النشطة والمراجعة" (From active and review contracts)
   - Badge: Blue indicator

---

### 3. Search and Filter Section
**Screenshot:** `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\contracts-filters-and-search.png`

#### البحث والتصفية (Search and Filter)

**Filter Options:**
1. **البحث العام** (General Search)
   - Placeholder: "رقم العقد، اسم..."
   - Search icon with input field

2. **حالة العقد** (Contract Status)
   - Dropdown: "جميع الحالات" (All Statuses)
   - Allows filtering by contract status

3. **نوع العقد** (Contract Type)
   - Dropdown: "جميع الأنواع" (All Types)
   - Allows filtering by contract type

**Display Options Button:**
- "عرض الخيارات المتقدمة" (Show Advanced Options)

---

### 4. Contract List View
**Screenshots:**
- `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\contracts-list-view.png`
- `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\contracts-list-multiple.png`
- `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\contract-card-actions.png`

#### Contract Tabs
- **جميع العقود** (All Contracts) - Default active tab
- **النشطة** (Active)
- **ملغي** (Cancelled)
- **ثبيت الانتهاء** (Fixed Completion)
- **إعدادات العركات** (Vehicle Settings)

#### Contract Card Layout
Each contract card displays:

**Header:**
- Contract number (e.g., "عقد رقم CNT-1760811949736-H60Z96")
- Status badge (نشط - Active) with green indicator

**Contract Information:**
1. **نوع العقد** (Contract Type)
   - Type: "إيجار" (Rental)

2. **العميل** (Customer)
   - Customer name (e.g., "حسام حسام")

3. **فترة العقد** (Contract Period)
   - Start and end dates (e.g., "18 أكتوبر 2025 - 18 أكتوبر 2026")

4. **قيمة العقد** (Contract Value)
   - Amount: QAR 0
   - Monthly rental: QAR 2,200

5. **مركز التكلفة** (Cost Center)
   - Display: "Monthly Rental • CC002"
   - Red indicator dot

**Action Buttons:**
1. **عرض** (View) - View contract details
2. **تجديد** (Renew) - Renew contract
3. **إلغاء** (Cancel) - Cancel contract (red button)
4. **حذف** (Delete) - Delete contract (red button with trash icon)

**Design Features:**
- Clean card-based layout
- Color-coded status indicators
- Icon-based information display
- Responsive action buttons
- Clear hierarchy of information

---

### 5. Contract Details Dialog
**Screenshot:** `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\contract-details-dialog.png`

The contract details view shows additional contracts in the scrollable list, demonstrating:
- Multiple contract cards visible simultaneously
- Consistent formatting across all contracts
- Easy scanning of contract information
- Quick access to actions for each contract

---

## Design System Observations

### Color Scheme
1. **Primary Red**: Used for main actions and destructive operations
2. **Green**: Active/success status indicators
3. **Orange**: Warning/review status
4. **Yellow**: Draft/pending status
5. **Blue**: Information and revenue indicators
6. **Gray**: Neutral elements and backgrounds

### Typography
- **Arabic RTL Layout**: Proper right-to-left text alignment
- **Clear Hierarchy**: H1 for page titles, H3 for section headers
- **Readable Font Sizes**: Good contrast and spacing

### UI Components
1. **Buttons**: Rounded corners with clear hover states
2. **Cards**: White background with subtle shadows
3. **Badges**: Colored indicators for status
4. **Icons**: Consistent icon set throughout
5. **Input Fields**: Clean design with search icons

### Navigation
- **Sidebar**: Left navigation panel (visible in screenshots)
- **Top Bar**: User information and quick actions
- **Breadcrumbs**: Clear page location indicators

---

## Key Features Summary

### Dashboard
1. Personalized welcome message
2. Real-time date display
3. Attendance tracking
4. Quick actions for common tasks
5. Financial overview with metrics
6. Recent activities feed
7. Active contracts count
8. Payment status monitoring

### Contracts Management
1. Comprehensive statistics dashboard
2. Multi-filter search capability
3. Contract status categorization
4. Batch operations (export, delete)
5. Individual contract actions (view, renew, cancel, delete)
6. Template management
7. CSV import functionality
8. Detailed contract information display

---

## Screenshot File Paths

All screenshots are located in: `C:\Users\khamis\Desktop\fleetifyapp-3\.playwright-mcp\`

### Dashboard Screenshots
1. `dashboard-overview.png` - Full dashboard page
2. `dashboard-quick-actions.png` - Quick actions section
3. `dashboard-financial-overview.png` - Financial metrics

### Contracts Screenshots
1. `contracts-main.png` - Contracts page overview
2. `contracts-statistics.png` - Statistics cards
3. `contracts-page-top.png` - Page header and actions
4. `contracts-header-actions.png` - Action buttons detail
5. `contracts-filters-and-search.png` - Filter section
6. `contracts-list-view.png` - Contract list
7. `contracts-list-multiple.png` - Multiple contracts view
8. `contract-card-actions.png` - Contract card with actions
9. `contract-details-dialog.png` - Contract details view

---

## Notes
- All screenshots captured on October 27, 2025
- System accessed at: https://fleetifyapp.vercel.app
- User: khamis-1992@hotmail.com
- Company: العراف لتاجير السيارات (Al-Arraf Car Rental)
- System supports Arabic (RTL) interface
- Responsive design for different screen sizes

---

## End of Documentation

# User Guide - Phase 7B

**Version:** 1.0
**Date:** 2025-10-19
**For:** Sales, Inventory, and Warehouse Staff

## Table of Contents

1. [Getting Started](#getting-started)
2. [Sales Module Tutorials](#sales-module-tutorials)
3. [Inventory Module Tutorials](#inventory-module-tutorials)
4. [Common Workflows](#common-workflows)
5. [Tips & Best Practices](#tips--best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### What's New in Phase 7B

Fleetify now includes two powerful new modules:

**Sales & CRM:**
- Track leads from initial contact to conversion
- Manage sales pipeline with visual stages
- Generate professional quotes
- Process orders and track fulfillment

**Inventory Management:**
- Track stock across multiple warehouses
- Real-time inventory levels
- Automated low stock alerts
- Comprehensive reporting and analytics

### Accessing the New Features

After logging into Fleetify, you'll find new menu items:

**Main Navigation:**
```
Dashboard
├── Sales
│   ├── Leads (القوائم)
│   ├── Opportunities (الفرص)
│   ├── Quotes (العروض)
│   └── Orders (الطلبات)
├── Inventory
│   ├── Categories (الفئات)
│   ├── Items (الأصناف)
│   ├── Warehouses (المستودعات)
│   ├── Stock Levels (مستويات المخزون)
│   ├── Movements (الحركات)
│   ├── Stock Takes (الجرد)
│   └── Reports (التقارير)
└── ... (existing modules)
```

---

## Sales Module Tutorials

### Tutorial 1: Creating Your First Lead

**Goal:** Capture a potential customer inquiry

**Steps:**

1. **Navigate to Leads**
   - Click **Sales** in main menu
   - Click **Leads** (القوائم)

2. **Click "New Lead" Button**
   - Located at top-right of leads list

3. **Fill in Lead Information**
   - **Lead Name*** (required): "Ahmed Al-Rashid"
   - **Lead Name (Arabic)**: "أحمد الراشد"
   - **Email**: "ahmed@example.com"
   - **Phone**: "+966 50 123 4567"
   - **Source**: Select from dropdown
     - Website
     - Referral
     - Cold Call
     - Trade Show
     - Social Media
   - **Status**: Will default to "New"
   - **Assign To**: Select sales representative (optional)
   - **Notes**: "Interested in fleet management for 20 vehicles"

4. **Click "Create Lead"**

**Result:** Lead appears in your leads list with status "New"

**Next Steps:**
- Sales rep will contact the lead
- Update status to "Contacted" after first outreach
- Move to "Qualified" if they meet criteria

---

### Tutorial 2: Converting Lead to Opportunity

**Goal:** Move a qualified lead into your sales pipeline

**Prerequisites:** Have a lead with status "Qualified"

**Steps:**

1. **Navigate to Lead Details**
   - Go to **Sales → Leads**
   - Click on qualified lead

2. **Click "Convert to Opportunity"**
   - Button appears in lead detail view

3. **Fill in Opportunity Details**
   - **Opportunity Name***: "Ahmed Al-Rashid - 20 Vehicle Fleet"
   - **Opportunity Name (Arabic)**: "أحمد الراشد - أسطول 20 مركبة"
   - **Estimated Value***: 240,000 SAR
   - **Probability**: 25% (for newly qualified leads)
   - **Expected Close Date**: 2025-12-31
   - **Assigned To**: Sales rep responsible
   - **Notes**: Copy any relevant notes from lead

4. **Click "Create Opportunity"**

**Result:**
- New opportunity created in "Qualified" stage
- Original lead status changes to "Converted"
- Lead remains in system for reference

---

### Tutorial 3: Generating a Quote

**Goal:** Create a professional quotation for a customer

**Prerequisites:** Have a sales opportunity or customer

**Steps:**

1. **Navigate to Quotes**
   - Go to **Sales → Quotes**
   - Click **"New Quote"**

2. **Select Customer**
   - Choose from existing customers dropdown
   - Or create new customer inline

3. **Enter Quote Header**
   - **Quote Number**: Auto-generated (e.g., Q-2025-001)
     - Can override if needed
   - **Link to Opportunity** (optional): Select opportunity
   - **Valid Until**: 30 days from today (adjustable)

4. **Add Line Items**
   - Click **"Add Item"**
   - For each item:
     - **Item Name**: "Toyota Camry 2024 - Monthly Rental"
     - **Description**: "Full insurance, maintenance included"
     - **Quantity**: 12 (months)
     - **Unit Price**: 1,200 SAR
     - **Total**: Auto-calculates (14,400 SAR)

   - Add more items:
     - "GPS Tracking Service" - 12 × 50 = 600 SAR
     - "Extended Warranty" - 12 × 100 = 1,200 SAR

5. **Review Totals**
   - **Subtotal**: Auto-calculated (16,200 SAR)
   - **Tax**: 15% VAT = 2,430 SAR
   - **Total**: 18,630 SAR

6. **Add Notes** (optional)
   - Payment terms
   - Special conditions
   - Validity period details

7. **Set Status**
   - **Draft**: Still working on it
   - **Sent**: Ready to send to customer

8. **Click "Create Quote"**

**Result:**
- Quote saved in system
- Can be exported to PDF
- Can be emailed to customer

---

### Tutorial 4: Converting Quote to Order

**Goal:** Process an accepted quote into a confirmed order

**Prerequisites:** Quote with status "Accepted"

**Steps:**

1. **Navigate to Quote**
   - Go to **Sales → Quotes**
   - Filter by status = "Sent"
   - Find quote customer accepted

2. **Update Quote Status**
   - Click on quote
   - Change status to **"Accepted"**
   - Click **Save**

3. **Click "Generate Order"**
   - Button appears when status is "Accepted"

4. **Review Order Details**
   - **Order Number**: Auto-generated (O-2025-001)
   - **Order Date**: Today's date
   - **Delivery Date**: Set expected delivery
   - **Items**: Copied from quote
   - **Total**: Copied from quote

5. **Check Stock Availability** (if applicable)
   - System shows availability status for each item
   - Green checkmark = Available
   - Yellow warning = Low stock
   - Red X = Out of stock

6. **Click "Create Order"**

**Result:**
- Order created with status "Pending"
- If items are tracked in inventory:
  - Stock is automatically reserved
  - Quantity Available decreases
  - Quantity Reserved increases

---

## Inventory Module Tutorials

### Tutorial 5: Setting Up Warehouse

**Goal:** Create your first warehouse location

**Steps:**

1. **Navigate to Warehouses**
   - Go to **Inventory → Warehouses**

2. **Click "New Warehouse"**

3. **Fill in Warehouse Details**
   - **Warehouse Name***: "Main Warehouse - Riyadh"
   - **Warehouse Name (Arabic)***: "المستودع الرئيسي - الرياض"
   - **Warehouse Code**: "RYD-01" (for quick reference)
   - **Location Address**: "Industrial City, District 3"
   - **City**: "Riyadh"
   - **Country**: "Saudi Arabia" (default)
   - **Manager**: Select warehouse manager from dropdown
   - **Phone**: "+966 11 234 5678"
   - **Email**: "warehouse.riyadh@company.com"
   - **Is Default**: ✓ Check if this is your primary warehouse

4. **Click "Create Warehouse"**

**Result:**
- Warehouse is now available for stock management
- Will appear in all warehouse selection dropdowns
- If marked as default, will be pre-selected when adding stock

---

### Tutorial 6: Creating Item Categories

**Goal:** Organize inventory with hierarchical categories

**Steps:**

1. **Navigate to Categories**
   - Go to **Inventory → Categories**

2. **Create Top-Level Category**
   - Click **"New Category"**
   - **Category Name**: "Vehicle Parts"
   - **Category Name (Arabic)**: "قطع غيار المركبات"
   - **Description**: "All parts and accessories for fleet vehicles"
   - **Parent Category**: Leave blank (top-level)
   - Click **"Create"**

3. **Create Subcategories**
   - Click **"New Category"** again
   - **Category Name**: "Engine Parts"
   - **Category Name (Arabic)**: "قطع المحرك"
   - **Parent Category**: Select "Vehicle Parts"
   - Click **"Create"**

   - Repeat for more subcategories:
     - "Brake Parts" (قطع الفرامل)
     - "Electrical Parts" (قطع كهربائية)
     - "Body Parts" (قطع الهيكل)

4. **View Category Tree**
   - Categories display in hierarchical tree
   ```
   Vehicle Parts (قطع غيار المركبات)
   ├── Engine Parts (قطع المحرك)
   ├── Brake Parts (قطع الفرامل)
   ├── Electrical Parts (قطع كهربائية)
   └── Body Parts (قطع الهيكل)
   ```

**Result:**
- Organized category structure
- Can be used when creating inventory items
- Helps with reporting and analysis

---

### Tutorial 7: Adding Inventory Items

**Goal:** Create your first inventory item with proper stock control

**Steps:**

1. **Navigate to Items**
   - Go to **Inventory → Items**

2. **Click "New Item"**

3. **Fill in Item Identification**
   - **Item Name***: "Brake Pads - Front"
   - **Item Name (Arabic)**: "فحمات الفرامل - أمامي"
   - **Item Code***: "BP-001" (unique code)
   - **SKU**: "BP-FRONT-001" (stock keeping unit)
   - **Barcode**: "1234567890123" (if you use barcode scanners)
   - **Category**: Select "Brake Parts"

4. **Fill in Item Details**
   - **Description**: "Front brake pads for Toyota Camry 2020-2024"
   - **Unit of Measure**: "Set" (or Unit, Box, Pair, etc.)
   - **Item Type**: "Product" (vs. Service or Component)

5. **Set Pricing**
   - **Cost Price***: 80.00 SAR (what you pay)
   - **Unit Price***: 120.00 SAR (what you charge)
   - Profit Margin: System calculates (33%)

6. **Configure Stock Control**
   - **Track Inventory**: ✓ Checked
   - **Minimum Stock Level**: 10 sets
   - **Maximum Stock Level**: 100 sets
   - **Reorder Point**: 15 sets (when to reorder)
   - **Reorder Quantity**: 50 sets (how much to reorder)

7. **Add Image** (optional)
   - Upload product image for easy identification

8. **Add Notes** (optional)
   - "Compatible with: Camry 2020, 2021, 2022, 2023, 2024"
   - "Supplier: ABC Auto Parts"

9. **Click "Create Item"**

**Result:**
- Item is now in your inventory master data
- Stock levels initialized to 0 (until you receive stock)
- Ready to track across warehouses

---

### Tutorial 8: Receiving Stock (Purchase)

**Goal:** Record receipt of goods from supplier

**Prerequisites:** Have warehouse and inventory item created

**Steps:**

1. **Navigate to Stock Movements**
   - Go to **Inventory → Movements**

2. **Click "New Movement"**

3. **Select Movement Type**
   - Choose **"PURCHASE"** from dropdown

4. **Fill in Movement Details**
   - **Item***: Select "Brake Pads - Front"
   - **Warehouse***: Select "Main Warehouse - Riyadh"
   - **Quantity***: 50 (positive number)
   - **Movement Date**: Today (or actual receipt date)
   - **Unit Cost**: 80.00 SAR
   - **Total Cost**: Auto-calculates (4,000 SAR)

5. **Add Reference** (optional but recommended)
   - **Reference Type**: "Purchase Order"
   - **Reference Number**: "PO-2025-001"
   - **Notes**: "Received from ABC Auto Parts, Invoice #INV-12345"

6. **Click "Record Movement"**

**Result:**
- Stock level auto-updates:
  - Before: 0 units
  - After: 50 units
- Movement recorded in audit trail
- Inventory value increases by 4,000 SAR
- Can view in **Stock Levels** screen

---

### Tutorial 9: Checking Stock Levels

**Goal:** View current inventory across all warehouses

**Steps:**

1. **Navigate to Stock Levels**
   - Go to **Inventory → Stock Levels**

2. **View Stock Summary**
   - See all items with current quantities
   - Columns displayed:
     - Item Name
     - Warehouse
     - Quantity on Hand (total physical stock)
     - Quantity Reserved (allocated to orders)
     - Quantity Available (on hand - reserved)
     - Last Movement Date

3. **Filter Stock Levels**
   - **By Warehouse**: Select specific warehouse
   - **By Category**: Filter to category
   - **Low Stock Only**: Show items below minimum
   - **Search**: Search by item name, code, or SKU

4. **View Item Details**
   - Click on any item to see:
     - Stock across all warehouses
     - Recent movements
     - Stock alerts (if any)
     - Reorder recommendations

**Result:**
- Complete visibility of inventory
- Can quickly identify low stock items
- Make informed restocking decisions

---

### Tutorial 10: Conducting Physical Stock Take

**Goal:** Verify physical stock matches system records

**Steps:**

1. **Navigate to Stock Takes**
   - Go to **Inventory → Stock Takes**

2. **Click "New Stock Take"**

3. **Set Up Stock Take**
   - **Stock Take Number**: "ST-2025-Q1-001" (your format)
   - **Warehouse***: Select warehouse to count
   - **Stock Take Date**: Today
   - **Status**: "DRAFT" (while preparing)
   - **Counted By**: Select staff member

4. **Add Items to Count**
   - Click **"Add Items"**
   - System pre-fills with all items in warehouse
   - Shows **System Quantity** for each item

5. **Perform Physical Count**
   - Change status to **"IN PROGRESS"**
   - For each item:
     - Go to physical location
     - Count actual units
     - Enter **Counted Quantity**
     - System calculates **Variance** (Counted - System)

6. **Review Variances**
   - Items with variances highlighted
   - Positive variance = Found extra stock (green)
   - Negative variance = Missing stock (red)
   - Add notes explaining discrepancies

7. **Approve Stock Take**
   - **Status**: Change to "COMPLETED"
   - **Approved By**: Select approver
   - **Approved At**: Auto-set to now
   - Click **"Approve and Adjust Stock"**

**Result:**
- System creates ADJUSTMENT movements for each variance
- Stock levels updated to match physical count
- Audit trail created for all adjustments
- Can generate stock take report

---

## Common Workflows

### Workflow A: Complete Sales Process

**From Lead to Delivered Order**

```
Step 1: Capture Lead
└→ Sales → Leads → New Lead
   Enter contact details, source, notes
   Status: "New"

Step 2: Contact & Qualify
└→ Update lead status to "Contacted" after first call
   Assess if they meet criteria
   Status: "Qualified" or "Unqualified"

Step 3: Convert to Opportunity
└→ Click "Convert to Opportunity"
   Enter estimated value, close date, probability
   Stage: "Qualified"

Step 4: Move Through Pipeline
└→ Proposal stage: Create and send quote
   Negotiation stage: Discuss terms
   Won stage: Customer accepts

Step 5: Generate Quote
└→ Sales → Quotes → New Quote
   Add line items, pricing
   Status: "Sent"

Step 6: Follow Up
└→ Check if quote expired
   Follow up before expiration
   Customer response: Accept/Reject

Step 7: Create Order
└→ Update quote status to "Accepted"
   Click "Generate Order"
   Check stock availability

Step 8: Fulfill Order
└→ Status: Pending → Confirmed
   System reserves stock
   Status: Confirmed → Processing
   Warehouse picks and packs

Step 9: Ship Order
└→ Status: Processing → Shipped
   System creates SALE movement
   Stock automatically deducted
   Set delivery date

Step 10: Complete
└→ Customer receives goods
   Status: Shipped → Delivered
   Order complete ✓
```

---

### Workflow B: Inventory Reordering

**From Low Stock Alert to Receipt**

```
Step 1: Monitor Stock Alerts
└→ Inventory → Reports → Stock Alerts
   View low stock items
   Priority: Out of Stock > Below Min > Reorder Point

Step 2: Review Alert Details
└→ Click alert row
   Current: 8 units
   Minimum: 10 units
   Reorder Point: 15 units
   Suggested Order: 50 units

Step 3: Create Purchase Order
└→ Click "Create PO" button
   System pre-fills:
   - Item details
   - Suggested quantity
   - Preferred vendor (if set)

Step 4: Adjust & Submit PO
└→ Review quantity (adjust if needed)
   Select vendor
   Enter expected delivery date
   Status: Draft → Sent
   Email or print PO

Step 5: Track PO
└→ Purchasing → Purchase Orders
   Monitor status
   Update tracking number

Step 6: Receive Goods
└→ When shipment arrives:
   Click "Receive Goods"
   Enter actual quantity received
   Status: Sent → Received

Step 7: Record Receipt
└→ System creates PURCHASE movement
   Stock level auto-updates
   Alert cleared (if above reorder point)
   Stock available for sale ✓
```

---

### Workflow C: Inter-Warehouse Transfer

**Moving Stock Between Locations**

```
Step 1: Initiate Transfer
└→ Inventory → Movements → New Movement
   Type: "TRANSFER_OUT"

Step 2: Enter Transfer Details
└→ Item: Select item to transfer
   From Warehouse: "Main Warehouse - Riyadh"
   To Warehouse: "Branch Warehouse - Jeddah"
   Quantity: 20 units
   Date: Today

Step 3: Validate Stock
└→ System checks quantity available in source
   Must have ≥ 20 units available
   If insufficient: Error shown

Step 4: Record Transfer
└→ Click "Record Movement"
   System creates 2 movements automatically:
   1. TRANSFER_OUT (Main Warehouse)
   2. TRANSFER_IN (Branch Warehouse)

Step 5: Verify Results
└→ Main Warehouse stock: -20 units
   Branch Warehouse stock: +20 units
   Both movements linked by reference ID
   Transfer complete ✓
```

---

## Tips & Best Practices

### Sales Management Tips

**1. Lead Qualification Criteria**
Define clear criteria before marking leads as "Qualified":
- Budget available? (>= minimum order value)
- Decision maker identified?
- Timeframe realistic? (< 12 months)
- Need confirmed?

**2. Probability Guidelines**
Use consistent probability estimates:
- Lead: 10-20%
- Qualified: 25-40%
- Proposal: 50-60%
- Negotiation: 70-90%
- Won: 100%

**3. Quote Validity Periods**
Recommended validity periods:
- Small orders (<10k SAR): 15 days
- Medium orders (10k-100k SAR): 30 days
- Large orders (>100k SAR): 45 days

**4. Regular Pipeline Reviews**
- Daily: Check new leads
- Weekly: Review aging quotes (>7 days no response)
- Monthly: Analyze win/loss ratios

---

### Inventory Management Tips

**1. Setting Min/Max Levels**

**Fast-Moving Items:**
- Min: 2 weeks of average sales
- Max: 8 weeks of average sales
- Reorder Point: 3 weeks

**Slow-Moving Items:**
- Min: 1 week of average sales
- Max: 12 weeks
- Reorder Point: 2 weeks

**Seasonal Items:**
- Adjust min/max before peak season
- Reduce after season ends

**2. ABC Analysis**

Categorize your inventory:
- **A Items** (20% of items, 70% of value):
  - Weekly stock reviews
  - Tight stock control
  - Accurate forecasting

- **B Items** (30% of items, 20% of value):
  - Monthly reviews
  - Moderate control

- **C Items** (50% of items, 10% of value):
  - Quarterly reviews
  - Simple reorder rules

**3. Stock Take Frequency**

Recommended schedule:
- High-value items: Monthly
- Medium-value: Quarterly
- Low-value: Annually
- Full warehouse: At least once per year

**4. Movement Documentation**

Always include:
- Reference number (PO, invoice, transfer ID)
- Reason for adjustment
- Who authorized the movement
- Supporting documentation

---

### Data Quality Best Practices

**1. Consistent Naming**
```
GOOD:
- Item Code: BP-001
- Item Name: Brake Pads - Front
- SKU: BP-FRONT-001

BAD:
- Item Code: bp001
- Item Name: front brake pads
- SKU: BrakePads_Front
```

**2. Complete Information**
Fill in all relevant fields:
- Both English and Arabic names
- Detailed descriptions
- All applicable codes (item code, SKU, barcode)
- Category assignment

**3. Regular Data Cleanup**
- Monthly: Review inactive items
- Quarterly: Update pricing
- Annually: Archive old data

---

## Troubleshooting

### Issue 1: "Insufficient Stock" Error

**Problem:** Cannot ship order because stock is insufficient

**Cause:** Trying to ship more than available quantity

**Solution:**
1. Check **Stock Levels** for the item
2. Look at **Quantity Available** (not just On Hand)
3. Options:
   - Reduce order quantity to match available stock
   - Transfer stock from another warehouse
   - Create backorder and wait for new stock
   - Cancel order

---

### Issue 2: Stock Level Not Updating

**Problem:** Recorded movement but stock didn't change

**Cause:** Movement recorded with wrong type or trigger didn't fire

**Solution:**
1. Go to **Inventory → Movements**
2. Find your movement record
3. Verify:
   - Movement type is correct (PURCHASE, SALE, etc.)
   - Quantity has correct sign (positive for incoming, negative for outgoing)
   - Item and warehouse are correct
4. If movement exists but stock didn't update:
   - Contact system administrator
   - May need manual stock adjustment

---

### Issue 3: Cannot Find Item in Dropdown

**Problem:** Item exists but doesn't appear in selection lists

**Cause:** Item may be inactive or not properly saved

**Solution:**
1. Go to **Inventory → Items**
2. Search for the item
3. Check **Is Active** checkbox is checked
4. Verify item has a warehouse assigned
5. If still not appearing, try refreshing page

---

### Issue 4: Quote Won't Convert to Order

**Problem:** "Generate Order" button is disabled

**Cause:** Quote status is not "Accepted"

**Solution:**
1. Open the quote
2. Change status from "Sent" to "Accepted"
3. Save the quote
4. "Generate Order" button will become active
5. Click to create order

---

### Issue 5: Stock Alert Not Showing

**Problem:** Stock is below minimum but no alert appears

**Cause:** Item may not have minimum stock level set

**Solution:**
1. Go to **Inventory → Items**
2. Find and edit the item
3. Set:
   - Minimum Stock Level (e.g., 10)
   - Reorder Point (e.g., 15)
   - Reorder Quantity (e.g., 50)
4. Save item
5. Alert will appear in **Stock Alerts** report

---

## Getting Help

### Documentation Resources

- **Feature Guide:** [PHASE_7B_FEATURES.md](PHASE_7B_FEATURES.md)
  - Detailed feature descriptions
  - Field-by-field explanations

- **Integration Guide:** [MODULE_INTEGRATIONS.md](MODULE_INTEGRATIONS.md)
  - How modules work together
  - Workflow diagrams

- **API Reference:** [API_REFERENCE_PHASE_7B.md](API_REFERENCE_PHASE_7B.md)
  - For developers
  - Hook documentation

- **Migration Guide:** [../supabase/migrations/README_PHASE_7B.md](../supabase/migrations/README_PHASE_7B.md)
  - Database schema
  - For system administrators

### Quick Reference Cards

**Sales Pipeline Stages:**
```
Lead → Qualified → Proposal → Negotiation → Won/Lost
10%      25-40%      50-60%      70-90%      100%/0%
```

**Inventory Movement Types:**
```
PURCHASE: Receiving from supplier (+)
SALE: Selling to customer (-)
ADJUSTMENT: Manual correction (+/-)
TRANSFER_OUT: Sending to another warehouse (-)
TRANSFER_IN: Receiving from another warehouse (+)
RETURN: Customer return (+)
```

**Stock Level Formulas:**
```
Quantity Available = Quantity on Hand - Quantity Reserved

Reorder Point = (Daily Usage × Lead Time) + Safety Stock

Economic Order Quantity = √(2 × Annual Demand × Order Cost / Holding Cost)
```

---

## Appendix: Keyboard Shortcuts

**Global:**
- `Ctrl + K`: Quick search
- `Ctrl + /`: Show keyboard shortcuts
- `Esc`: Close modal

**Forms:**
- `Ctrl + S`: Save
- `Ctrl + Enter`: Submit
- `Esc`: Cancel

**Lists:**
- `↑` / `↓`: Navigate rows
- `Enter`: Open selected item
- `Ctrl + N`: New item
- `/`: Search

---

**Document Version:** 1.0
**Last Updated:** 2025-10-19
**Maintained By:** Fleetify Development Team
**For Support:** Refer to your system administrator or Fleetify documentation portal

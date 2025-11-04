# Task: Update Customer and Contract Information from JSON

## Objective
Update all customer information (phone numbers), vehicle information (plate numbers), and contract details (start dates, monthly amounts) according to the data provided in `vehicles_rental_data_enhanced.json`.

## Acceptance Criteria
- [ ] All customers in the JSON file have their phone numbers updated
- [ ] All vehicles in the JSON file have their plate numbers updated if different
- [ ] All contracts linked to customers/vehicles in the JSON file have start dates updated
- [ ] All contracts linked to customers/vehicles in the JSON file have monthly amounts updated
- [ ] Matching is done accurately by customer name and vehicle number
- [ ] A report is generated showing what was updated

## Scope & Impact Radius
Modules/files likely touched:
- Database: `customers`, `contracts`, `vehicles` tables
- New script: `scripts/update-from-json.ts` or SQL migration
- Report file: `.cursor/update-report.md`

Out-of-scope:
- Creating new customers if they don't exist (only update existing)
- Creating new vehicles if they don't exist (only update existing)
- Creating new contracts if they don't exist (only update existing)

## Risks & Mitigations
- Risk: Incorrect matching of customers by name (Arabic names, typos, variations)
  → Mitigation: Use fuzzy matching, try multiple name combinations (first+last, full name), log all matches for review
- Risk: Multiple customers with same name
  → Mitigation: Use vehicle number as additional matching criteria, prioritize exact matches
- Risk: Date format inconsistencies (different formats in JSON)
  → Mitigation: Parse multiple date formats, validate before updating
- Risk: Updating wrong records
  → Mitigation: Create backup before updates, generate detailed report, use transactions

## Steps
- [ ] Pre-flight: Review JSON structure and current database state
- [ ] Design matching algorithm (customer name + vehicle number)
- [ ] Create SQL migration script with matching logic
- [ ] Implement date parsing for various formats
- [ ] Add phone number normalization
- [ ] Execute updates in transaction
- [ ] Generate report of updates
- [ ] Verify updates in database

## Implementation Plan

### 1. Data Matching Strategy
- Match customers by: `first_name + last_name` (Arabic or English) OR `customer_name` (full name)
- Match vehicles by: `plate_number` (exact match or normalized)
- Match contracts by: `customer_id + vehicle_id` combination

### 2. Update Operations
- **Customers**: Update `phone` field
- **Vehicles**: Update `plate_number` if different
- **Contracts**: Update `start_date` and `monthly_amount`

### 3. Date Parsing
Handle multiple date formats:
- `DD/MM/YYYY` (e.g., "15/4/2025")
- `DD-MM-YYYY` (e.g., "02-01-2025")
- `YYYY-MM-DD` (ISO format)
- Skip invalid dates (e.g., "-", " ")

### 4. Phone Number Normalization
- Remove spaces and special characters
- Handle Kuwait format (8 digits starting with 3, 5, 6, 7, 9)
- Ensure consistent format

## Review (after execution)
Summary of changes:  
Known limitations:  
Follow-ups:


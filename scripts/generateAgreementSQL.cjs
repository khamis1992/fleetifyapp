/**
 * Generate SQL script from Excel file
 * This creates SQL statements to process agreements
 */

const XLSX = require('xlsx');
const fs = require('fs');

const EXCEL_FILE = 'C:/Users/khamis/Desktop/بيانات_المركبات_نظيف.xlsx';
const OUTPUT_FILE = 'C:/Users/khamis/Desktop/fleetifyapp-3/scripts/process_agreements.sql';
const LATE_FEE = 3000;

function parseExcelDate(dateValue) {
  if (!dateValue) return null;

  if (typeof dateValue === 'string') {
    const parts = dateValue.split('/');
    if (parts.length === 3) {
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

function escapeSQL(str) {
  if (!str) return '';
  return str.toString().replace(/'/g, "''");
}

console.log('Reading Excel file...');
const workbook = XLSX.readFile(EXCEL_FILE);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

console.log(`Found ${data.length} rows`);

let sql = `-- ===============================================
-- Process Agreements from Excel
-- Generated: ${new Date().toISOString()}
-- Source: بيانات_المركبات_نظيف.xlsx
-- Total rows: ${data.length}
-- ===============================================

-- This script will:
-- 1. Find cancelled contracts by vehicle number
-- 2. Update customer names to Arabic
-- 3. Reactivate contracts with new dates
-- 4. Generate historical invoices (monthly + ${LATE_FEE} SAR late fee)

DO $$
DECLARE
    v_company_id UUID;
    v_vehicle_id UUID;
    v_contract_id UUID;
    v_customer_id UUID;
    v_old_end_date DATE;
    v_new_start_date DATE;
    v_monthly_amount NUMERIC;
    v_invoice_date DATE;
    v_contracts_updated INTEGER := 0;
    v_customers_updated INTEGER := 0;
    v_invoices_created INTEGER := 0;
BEGIN
    -- Get company ID for العراف
    SELECT id INTO v_company_id
    FROM companies
    WHERE name_ar LIKE '%العراف%' OR name LIKE '%العراف%'
    LIMIT 1;

    IF v_company_id IS NULL THEN
        RAISE EXCEPTION 'Company العراف not found';
    END IF;

    RAISE NOTICE 'Processing agreements for company: %', v_company_id;
    RAISE NOTICE '';

`;

data.forEach((row, index) => {
  const vehicleNum = row['رقم المركبة'];
  const customerName = row['اسم العميل'];
  const phone = row['رقم الجوال'];
  const startDate = parseExcelDate(row['تاريخ بداية العقد']);
  const monthlyAmount = row['القسط الشهري'];

  if (!vehicleNum || !customerName || !monthlyAmount || !startDate) {
    console.log(`Skipping row ${index + 1}: Missing data`);
    return;
  }

  sql += `    -- =====================================
    -- Row ${index + 1}: Vehicle ${vehicleNum}
    -- Customer: ${customerName}
    -- Start Date: ${startDate}, Monthly: ${monthlyAmount}
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '${escapeSQL(vehicleNum)}'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row ${index + 1}: Vehicle plate ${escapeSQL(vehicleNum)} not found, skipping';
        ELSE
            RAISE NOTICE 'Row ${index + 1}: Found vehicle plate ${escapeSQL(vehicleNum)} (ID: %)', v_vehicle_id;

            -- Find most recent cancelled contract
            SELECT id, customer_id, end_date, monthly_amount
            INTO v_contract_id, v_customer_id, v_old_end_date, v_monthly_amount
            FROM contracts
            WHERE company_id = v_company_id
            AND vehicle_id = v_vehicle_id
            AND status = 'cancelled'
            ORDER BY created_at DESC
            LIMIT 1;

            IF v_contract_id IS NULL THEN
                RAISE NOTICE 'Row ${index + 1}: No cancelled contract found for vehicle ${escapeSQL(vehicleNum)}';
            ELSE
                RAISE NOTICE 'Row ${index + 1}: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = '${escapeSQL(customerName)}',
                    last_name = '',
                    phone = '${escapeSQL(phone)}',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row ${index + 1}: Updated customer name to: ${escapeSQL(customerName)}';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '${startDate}'::DATE,
                    monthly_amount = ${monthlyAmount},
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row ${index + 1}: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '${startDate}'::DATE;
                    v_invoice_date := DATE_TRUNC('month', v_old_end_date) + INTERVAL '1 month';

                    WHILE v_invoice_date < v_new_start_date LOOP
                        INSERT INTO invoices (
                            company_id,
                            customer_id,
                            contract_id,
                            invoice_number,
                            invoice_date,
                            due_date,
                            total_amount,
                            status,
                            notes,
                            created_at
                        ) VALUES (
                            v_company_id,
                            v_customer_id,
                            v_contract_id,
                            'INV-' || TO_CHAR(v_invoice_date, 'YYYYMMDD') || '-' || v_contract_id::TEXT,
                            v_invoice_date,
                            v_invoice_date,
                            v_monthly_amount + ${LATE_FEE},
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: ${LATE_FEE}',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row ${index + 1}: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row ${index + 1}: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

`;
});

sql += `    -- =====================================
    -- SUMMARY
    -- =====================================
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'PROCESSING COMPLETE';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Contracts Updated:   %', v_contracts_updated;
    RAISE NOTICE 'Customers Updated:   %', v_customers_updated;
    RAISE NOTICE 'Invoices Created:    %', v_invoices_created;
    RAISE NOTICE '===========================================';
END $$;
`;

fs.writeFileSync(OUTPUT_FILE, sql);
console.log(`\nSQL script written to: ${OUTPUT_FILE}`);
console.log(`Total rows processed: ${data.length}`);
console.log('\nYou can now run this SQL script in Supabase dashboard SQL Editor');

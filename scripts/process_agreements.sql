-- ===============================================
-- Process Agreements from Excel
-- Generated: 2025-10-25T15:16:42.852Z
-- Source: بيانات_المركبات_نظيف.xlsx
-- Total rows: 77
-- ===============================================

-- This script will:
-- 1. Find cancelled contracts by vehicle number
-- 2. Update customer names to Arabic
-- 3. Reactivate contracts with new dates
-- 4. Generate historical invoices (monthly + 3000 SAR late fee)

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

    -- =====================================
    -- Row 1: Vehicle 2766
    -- Customer: محمد محمد احمد
    -- Start Date: 2025-02-05, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2766'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 1: Vehicle plate 2766 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 1: Found vehicle plate 2766 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 1: No cancelled contract found for vehicle 2766';
            ELSE
                RAISE NOTICE 'Row 1: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمد محمد احمد',
                    last_name = '',
                    phone = '70007983',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 1: Updated customer name to: محمد محمد احمد';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-02-05'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 1: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-02-05'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 1: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 1: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 2: Vehicle 2767
    -- Customer: عبد الغفور دوار
    -- Start Date: 2025-02-09, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2767'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 2: Vehicle plate 2767 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 2: Found vehicle plate 2767 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 2: No cancelled contract found for vehicle 2767';
            ELSE
                RAISE NOTICE 'Row 2: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عبد الغفور دوار',
                    last_name = '',
                    phone = '77122519',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 2: Updated customer name to: عبد الغفور دوار';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-02-09'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 2: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-02-09'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 2: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 2: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 3: Vehicle 2768
    -- Customer: عبد العزيز محمد
    -- Start Date: 2025-09-01, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2768'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 3: Vehicle plate 2768 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 3: Found vehicle plate 2768 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 3: No cancelled contract found for vehicle 2768';
            ELSE
                RAISE NOTICE 'Row 3: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عبد العزيز محمد',
                    last_name = '',
                    phone = '70342655',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 3: Updated customer name to: عبد العزيز محمد';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-09-01'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 3: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-09-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 3: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 3: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 4: Vehicle 2769
    -- Customer: وضاح عبد الله
    -- Start Date: 2024-12-21, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2769'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 4: Vehicle plate 2769 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 4: Found vehicle plate 2769 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 4: No cancelled contract found for vehicle 2769';
            ELSE
                RAISE NOTICE 'Row 4: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'وضاح عبد الله',
                    last_name = '',
                    phone = '71953163',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 4: Updated customer name to: وضاح عبد الله';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-12-21'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 4: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-12-21'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 4: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 4: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 5: Vehicle 2770
    -- Customer: خديرب رضا السحامي
    -- Start Date: 2025-08-01, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2770'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 5: Vehicle plate 2770 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 5: Found vehicle plate 2770 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 5: No cancelled contract found for vehicle 2770';
            ELSE
                RAISE NOTICE 'Row 5: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'خديرب رضا السحامي',
                    last_name = '',
                    phone = '70220390',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 5: Updated customer name to: خديرب رضا السحامي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-08-01'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 5: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-08-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 5: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 5: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 6: Vehicle 2772
    -- Customer: إسماعيل احمد عبد الله
    -- Start Date: 2024-07-14, Monthly: 1750
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2772'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 6: Vehicle plate 2772 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 6: Found vehicle plate 2772 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 6: No cancelled contract found for vehicle 2772';
            ELSE
                RAISE NOTICE 'Row 6: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'إسماعيل احمد عبد الله',
                    last_name = '',
                    phone = '30400511',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 6: Updated customer name to: إسماعيل احمد عبد الله';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-07-14'::DATE,
                    monthly_amount = 1750,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 6: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-07-14'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 6: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 6: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 7: Vehicle 2773
    -- Customer: مجدي يحيث
    -- Start Date: 2025-09-01, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2773'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 7: Vehicle plate 2773 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 7: Found vehicle plate 2773 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 7: No cancelled contract found for vehicle 2773';
            ELSE
                RAISE NOTICE 'Row 7: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'مجدي يحيث',
                    last_name = '',
                    phone = '50246458',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 7: Updated customer name to: مجدي يحيث';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-09-01'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 7: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-09-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 7: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 7: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 8: Vehicle 2774
    -- Customer: ابراهيم رطوب
    -- Start Date: 2025-01-02, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2774'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 8: Vehicle plate 2774 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 8: Found vehicle plate 2774 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 8: No cancelled contract found for vehicle 2774';
            ELSE
                RAISE NOTICE 'Row 8: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'ابراهيم رطوب',
                    last_name = '',
                    phone = '30882244',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 8: Updated customer name to: ابراهيم رطوب';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-01-02'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 8: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-01-02'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 8: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 8: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 9: Vehicle 2775
    -- Customer: انور جيتوبر
    -- Start Date: 2025-02-01, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2775'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 9: Vehicle plate 2775 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 9: Found vehicle plate 2775 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 9: No cancelled contract found for vehicle 2775';
            ELSE
                RAISE NOTICE 'Row 9: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'انور جيتوبر',
                    last_name = '',
                    phone = '51476442',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 9: Updated customer name to: انور جيتوبر';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-02-01'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 9: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-02-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 9: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 9: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 10: Vehicle 2776
    -- Customer: هيثم خليفة يعلي
    -- Start Date: 2025-09-04, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2776'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 10: Vehicle plate 2776 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 10: Found vehicle plate 2776 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 10: No cancelled contract found for vehicle 2776';
            ELSE
                RAISE NOTICE 'Row 10: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'هيثم خليفة يعلي',
                    last_name = '',
                    phone = '50529648',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 10: Updated customer name to: هيثم خليفة يعلي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-09-04'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 10: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-09-04'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 10: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 10: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 11: Vehicle 2778
    -- Customer: بلال البوقري
    -- Start Date: 2025-07-15, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2778'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 11: Vehicle plate 2778 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 11: Found vehicle plate 2778 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 11: No cancelled contract found for vehicle 2778';
            ELSE
                RAISE NOTICE 'Row 11: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'بلال البوقري',
                    last_name = '',
                    phone = '70400898',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 11: Updated customer name to: بلال البوقري';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-07-15'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 11: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-07-15'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 11: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 11: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 12: Vehicle 2780
    -- Customer: كمال ياسين سرحان
    -- Start Date: 2023-12-29, Monthly: 2100
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2780'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 12: Vehicle plate 2780 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 12: Found vehicle plate 2780 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 12: No cancelled contract found for vehicle 2780';
            ELSE
                RAISE NOTICE 'Row 12: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'كمال ياسين سرحان',
                    last_name = '',
                    phone = '71002048',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 12: Updated customer name to: كمال ياسين سرحان';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2023-12-29'::DATE,
                    monthly_amount = 2100,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 12: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2023-12-29'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 12: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 12: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 13: Vehicle 2783
    -- Customer: صدام مصطفى سعد
    -- Start Date: 2025-07-01, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2783'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 13: Vehicle plate 2783 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 13: Found vehicle plate 2783 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 13: No cancelled contract found for vehicle 2783';
            ELSE
                RAISE NOTICE 'Row 13: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'صدام مصطفى سعد',
                    last_name = '',
                    phone = '77068310',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 13: Updated customer name to: صدام مصطفى سعد';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-07-01'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 13: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-07-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 13: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 13: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 14: Vehicle 2784
    -- Customer: عثمان عويريزة
    -- Start Date: 2024-08-01, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '2784'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 14: Vehicle plate 2784 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 14: Found vehicle plate 2784 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 14: No cancelled contract found for vehicle 2784';
            ELSE
                RAISE NOTICE 'Row 14: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عثمان عويريزة',
                    last_name = '',
                    phone = '30770117',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 14: Updated customer name to: عثمان عويريزة';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-08-01'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 14: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-08-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 14: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 14: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 15: Vehicle 5889
    -- Customer: ايمن خليفة جلاب
    -- Start Date: 2023-11-20, Monthly: 2100
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '5889'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 15: Vehicle plate 5889 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 15: Found vehicle plate 5889 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 15: No cancelled contract found for vehicle 5889';
            ELSE
                RAISE NOTICE 'Row 15: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'ايمن خليفة جلاب',
                    last_name = '',
                    phone = '30303088',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 15: Updated customer name to: ايمن خليفة جلاب';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2023-11-20'::DATE,
                    monthly_amount = 2100,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 15: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2023-11-20'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 15: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 15: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 16: Vehicle 5890
    -- Customer: عبد العزيز جرلان
    -- Start Date: 2024-12-01, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '5890'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 16: Vehicle plate 5890 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 16: Found vehicle plate 5890 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 16: No cancelled contract found for vehicle 5890';
            ELSE
                RAISE NOTICE 'Row 16: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عبد العزيز جرلان',
                    last_name = '',
                    phone = '33767961',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 16: Updated customer name to: عبد العزيز جرلان';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-12-01'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 16: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-12-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 16: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 16: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 17: Vehicle 5893
    -- Customer: ايمن محمد شوشان
    -- Start Date: 2024-09-16, Monthly: 1750
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '5893'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 17: Vehicle plate 5893 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 17: Found vehicle plate 5893 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 17: No cancelled contract found for vehicle 5893';
            ELSE
                RAISE NOTICE 'Row 17: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'ايمن محمد شوشان',
                    last_name = '',
                    phone = '50131342',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 17: Updated customer name to: ايمن محمد شوشان';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-09-16'::DATE,
                    monthly_amount = 1750,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 17: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-09-16'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 17: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 17: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 18: Vehicle 5896
    -- Customer: مختار الامين
    -- Start Date: 2025-09-01, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '5896'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 18: Vehicle plate 5896 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 18: Found vehicle plate 5896 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 18: No cancelled contract found for vehicle 5896';
            ELSE
                RAISE NOTICE 'Row 18: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'مختار الامين',
                    last_name = '',
                    phone = '50129848',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 18: Updated customer name to: مختار الامين';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-09-01'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 18: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-09-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 18: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 18: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 19: Vehicle 5898
    -- Customer: محمد سراج الدين
    -- Start Date: 2024-08-05, Monthly: 1700
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '5898'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 19: Vehicle plate 5898 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 19: Found vehicle plate 5898 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 19: No cancelled contract found for vehicle 5898';
            ELSE
                RAISE NOTICE 'Row 19: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمد سراج الدين',
                    last_name = '',
                    phone = '31184659',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 19: Updated customer name to: محمد سراج الدين';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-08-05'::DATE,
                    monthly_amount = 1700,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 19: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-08-05'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 19: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 19: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 20: Vehicle 5901
    -- Customer: حسام سلمي الطاهري
    -- Start Date: 2023-12-23, Monthly: 2100
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '5901'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 20: Vehicle plate 5901 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 20: Found vehicle plate 5901 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 20: No cancelled contract found for vehicle 5901';
            ELSE
                RAISE NOTICE 'Row 20: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'حسام سلمي الطاهري',
                    last_name = '',
                    phone = '31115657',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 20: Updated customer name to: حسام سلمي الطاهري';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2023-12-23'::DATE,
                    monthly_amount = 2100,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 20: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2023-12-23'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 20: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 20: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 21: Vehicle 7034
    -- Customer: محمد احمد عمر متعافي
    -- Start Date: 2025-07-10, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7034'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 21: Vehicle plate 7034 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 21: Found vehicle plate 7034 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 21: No cancelled contract found for vehicle 7034';
            ELSE
                RAISE NOTICE 'Row 21: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمد احمد عمر متعافي',
                    last_name = '',
                    phone = '50225055',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 21: Updated customer name to: محمد احمد عمر متعافي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-07-10'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 21: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-07-10'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 21: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 21: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 22: Vehicle 7036
    -- Customer: عصام ابراهيم عبد الله
    -- Start Date: 2024-12-12, Monthly: 1550
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7036'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 22: Vehicle plate 7036 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 22: Found vehicle plate 7036 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 22: No cancelled contract found for vehicle 7036';
            ELSE
                RAISE NOTICE 'Row 22: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عصام ابراهيم عبد الله',
                    last_name = '',
                    phone = '30777645',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 22: Updated customer name to: عصام ابراهيم عبد الله';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-12-12'::DATE,
                    monthly_amount = 1550,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 22: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-12-12'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 22: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 22: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 23: Vehicle 7039
    -- Customer: عبد الله عمر برهان
    -- Start Date: 2025-04-01, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7039'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 23: Vehicle plate 7039 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 23: Found vehicle plate 7039 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 23: No cancelled contract found for vehicle 7039';
            ELSE
                RAISE NOTICE 'Row 23: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عبد الله عمر برهان',
                    last_name = '',
                    phone = '30945601',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 23: Updated customer name to: عبد الله عمر برهان';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-04-01'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 23: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-04-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 23: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 23: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 24: Vehicle 7041
    -- Customer: الصحبي البشير اليماني
    -- Start Date: 2025-09-01, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7041'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 24: Vehicle plate 7041 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 24: Found vehicle plate 7041 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 24: No cancelled contract found for vehicle 7041';
            ELSE
                RAISE NOTICE 'Row 24: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'الصحبي البشير اليماني',
                    last_name = '',
                    phone = '33173763',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 24: Updated customer name to: الصحبي البشير اليماني';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-09-01'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 24: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-09-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 24: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 24: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 25: Vehicle 7043
    -- Customer: حمزة البشير يحيى
    -- Start Date: 2024-08-21, Monthly: 1750
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7043'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 25: Vehicle plate 7043 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 25: Found vehicle plate 7043 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 25: No cancelled contract found for vehicle 7043';
            ELSE
                RAISE NOTICE 'Row 25: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'حمزة البشير يحيى',
                    last_name = '',
                    phone = '55260218',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 25: Updated customer name to: حمزة البشير يحيى';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-08-21'::DATE,
                    monthly_amount = 1750,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 25: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-08-21'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 25: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 25: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 26: Vehicle 7053
    -- Customer: مهدي اسامة حامد
    -- Start Date: 2024-07-30, Monthly: 1800
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7053'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 26: Vehicle plate 7053 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 26: Found vehicle plate 7053 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 26: No cancelled contract found for vehicle 7053';
            ELSE
                RAISE NOTICE 'Row 26: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'مهدي اسامة حامد',
                    last_name = '',
                    phone = '30138501',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 26: Updated customer name to: مهدي اسامة حامد';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-07-30'::DATE,
                    monthly_amount = 1800,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 26: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-07-30'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 26: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 26: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 27: Vehicle 7054
    -- Customer: محمود جاسم الصالح
    -- Start Date: 2025-01-16, Monthly: 1650
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7054'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 27: Vehicle plate 7054 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 27: Found vehicle plate 7054 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 27: No cancelled contract found for vehicle 7054';
            ELSE
                RAISE NOTICE 'Row 27: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمود جاسم الصالح',
                    last_name = '',
                    phone = '66684460',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 27: Updated customer name to: محمود جاسم الصالح';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-01-16'::DATE,
                    monthly_amount = 1650,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 27: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-01-16'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 27: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 27: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 28: Vehicle 7056
    -- Customer: مجدي محمد عيس
    -- Start Date: 2025-05-01, Monthly: 1650
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7056'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 28: Vehicle plate 7056 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 28: Found vehicle plate 7056 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 28: No cancelled contract found for vehicle 7056';
            ELSE
                RAISE NOTICE 'Row 28: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'مجدي محمد عيس',
                    last_name = '',
                    phone = '33557425',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 28: Updated customer name to: مجدي محمد عيس';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-05-01'::DATE,
                    monthly_amount = 1650,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 28: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-05-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 28: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 28: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 29: Vehicle 7058
    -- Customer: محمد فؤاد شوشان
    -- Start Date: 2024-09-25, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7058'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 29: Vehicle plate 7058 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 29: Found vehicle plate 7058 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 29: No cancelled contract found for vehicle 7058';
            ELSE
                RAISE NOTICE 'Row 29: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمد فؤاد شوشان',
                    last_name = '',
                    phone = '55146873',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 29: Updated customer name to: محمد فؤاد شوشان';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-09-25'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 29: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-09-25'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 29: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 29: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 30: Vehicle 7059
    -- Customer: عمر مرابحي
    -- Start Date: 2025-01-15, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7059'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 30: Vehicle plate 7059 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 30: Found vehicle plate 7059 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 30: No cancelled contract found for vehicle 7059';
            ELSE
                RAISE NOTICE 'Row 30: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عمر مرابحي',
                    last_name = '',
                    phone = '31299557',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 30: Updated customer name to: عمر مرابحي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-01-15'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 30: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-01-15'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 30: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 30: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 31: Vehicle 7061
    -- Customer: في عبد الحنان الحجز
    -- Start Date: 2025-03-16, Monthly: 2100
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7061'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 31: Vehicle plate 7061 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 31: Found vehicle plate 7061 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 31: No cancelled contract found for vehicle 7061';
            ELSE
                RAISE NOTICE 'Row 31: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'في عبد الحنان الحجز',
                    last_name = '',
                    phone = '55222976',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 31: Updated customer name to: في عبد الحنان الحجز';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-03-16'::DATE,
                    monthly_amount = 2100,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 31: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-03-16'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 31: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 31: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 32: Vehicle 7062
    -- Customer: محمد المختار بشاشة
    -- Start Date: 2025-05-10, Monthly: 1700
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7062'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 32: Vehicle plate 7062 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 32: Found vehicle plate 7062 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 32: No cancelled contract found for vehicle 7062';
            ELSE
                RAISE NOTICE 'Row 32: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمد المختار بشاشة',
                    last_name = '',
                    phone = '30788438',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 32: Updated customer name to: محمد المختار بشاشة';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-05-10'::DATE,
                    monthly_amount = 1700,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 32: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-05-10'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 32: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 32: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 33: Vehicle 7063
    -- Customer: مهند حمودة الظاهر
    -- Start Date: 2025-12-01, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7063'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 33: Vehicle plate 7063 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 33: Found vehicle plate 7063 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 33: No cancelled contract found for vehicle 7063';
            ELSE
                RAISE NOTICE 'Row 33: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'مهند حمودة الظاهر',
                    last_name = '',
                    phone = '30623322',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 33: Updated customer name to: مهند حمودة الظاهر';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-12-01'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 33: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-12-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 33: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 33: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 34: Vehicle 7069
    -- Customer: عصام الدزوقي
    -- Start Date: 2024-08-26, Monthly: 1800
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7069'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 34: Vehicle plate 7069 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 34: Found vehicle plate 7069 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 34: No cancelled contract found for vehicle 7069';
            ELSE
                RAISE NOTICE 'Row 34: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عصام الدزوقي',
                    last_name = '',
                    phone = '74700503',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 34: Updated customer name to: عصام الدزوقي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-08-26'::DATE,
                    monthly_amount = 1800,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 34: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-08-26'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 34: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 34: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 35: Vehicle 7072
    -- Customer: يوسف العويدي لخليل
    -- Start Date: 2024-07-28, Monthly: 1750
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7072'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 35: Vehicle plate 7072 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 35: Found vehicle plate 7072 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 35: No cancelled contract found for vehicle 7072';
            ELSE
                RAISE NOTICE 'Row 35: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'يوسف العويدي لخليل',
                    last_name = '',
                    phone = '72119703',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 35: Updated customer name to: يوسف العويدي لخليل';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-07-28'::DATE,
                    monthly_amount = 1750,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 35: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-07-28'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 35: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 35: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 36: Vehicle 7074
    -- Customer: محمود جاسم الصالح
    -- Start Date: 2024-11-14, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7074'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 36: Vehicle plate 7074 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 36: Found vehicle plate 7074 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 36: No cancelled contract found for vehicle 7074';
            ELSE
                RAISE NOTICE 'Row 36: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمود جاسم الصالح',
                    last_name = '',
                    phone = '30531131',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 36: Updated customer name to: محمود جاسم الصالح';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-11-14'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 36: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-11-14'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 36: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 36: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 37: Vehicle 7075
    -- Customer: مطلوب الابراهيم
    -- Start Date: 2024-02-05, Monthly: 1800
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7075'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 37: Vehicle plate 7075 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 37: Found vehicle plate 7075 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 37: No cancelled contract found for vehicle 7075';
            ELSE
                RAISE NOTICE 'Row 37: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'مطلوب الابراهيم',
                    last_name = '',
                    phone = '50446192',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 37: Updated customer name to: مطلوب الابراهيم';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-02-05'::DATE,
                    monthly_amount = 1800,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 37: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-02-05'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 37: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 37: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 38: Vehicle 7077
    -- Customer: ادم صالح جبريل
    -- Start Date: 2023-12-22, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '7077'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 38: Vehicle plate 7077 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 38: Found vehicle plate 7077 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 38: No cancelled contract found for vehicle 7077';
            ELSE
                RAISE NOTICE 'Row 38: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'ادم صالح جبريل',
                    last_name = '',
                    phone = '50066411',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 38: Updated customer name to: ادم صالح جبريل';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2023-12-22'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 38: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2023-12-22'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 38: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 38: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 39: Vehicle 185 513
    -- Customer: الصادق دياب
    -- Start Date: 2024-03-01, Monthly: 1800
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '185 513'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 39: Vehicle plate 185 513 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 39: Found vehicle plate 185 513 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 39: No cancelled contract found for vehicle 185 513';
            ELSE
                RAISE NOTICE 'Row 39: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'الصادق دياب',
                    last_name = '',
                    phone = '70075544',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 39: Updated customer name to: الصادق دياب';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-03-01'::DATE,
                    monthly_amount = 1800,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 39: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-03-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 39: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 39: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 40: Vehicle 185 573
    -- Customer: ايهاب عبد الله
    -- Start Date: 2025-04-01, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '185 573'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 40: Vehicle plate 185 573 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 40: Found vehicle plate 185 573 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 40: No cancelled contract found for vehicle 185 573';
            ELSE
                RAISE NOTICE 'Row 40: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'ايهاب عبد الله',
                    last_name = '',
                    phone = '3100 966',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 40: Updated customer name to: ايهاب عبد الله';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-04-01'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 40: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-04-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 40: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 40: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 41: Vehicle 603 353
    -- Customer: 5892مصطفى بالقايد
    -- Start Date: 2025-07-01, Monthly: 1700
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '603 353'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 41: Vehicle plate 603 353 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 41: Found vehicle plate 603 353 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 41: No cancelled contract found for vehicle 603 353';
            ELSE
                RAISE NOTICE 'Row 41: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = '5892مصطفى بالقايد',
                    last_name = '',
                    phone = '31245752',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 41: Updated customer name to: 5892مصطفى بالقايد';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-07-01'::DATE,
                    monthly_amount = 1700,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 41: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-07-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 41: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 41: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 42: Vehicle 599 720
    -- Customer: 7055 انور الدهبي
    -- Start Date: 2025-05-01, Monthly: 1800
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '599 720'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 42: Vehicle plate 599 720 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 42: Found vehicle plate 599 720 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 42: No cancelled contract found for vehicle 599 720';
            ELSE
                RAISE NOTICE 'Row 42: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = '7055 انور الدهبي',
                    last_name = '',
                    phone = '50234083',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 42: Updated customer name to: 7055 انور الدهبي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-05-01'::DATE,
                    monthly_amount = 1800,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 42: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-05-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 42: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 42: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 43: Vehicle 153 974
    -- Customer: 7065زهري حكيم
    -- Start Date: 2025-01-01, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '153 974'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 43: Vehicle plate 153 974 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 43: Found vehicle plate 153 974 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 43: No cancelled contract found for vehicle 153 974';
            ELSE
                RAISE NOTICE 'Row 43: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = '7065زهري حكيم',
                    last_name = '',
                    phone = '55578515',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 43: Updated customer name to: 7065زهري حكيم';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-01-01'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 43: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-01-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 43: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 43: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 44: Vehicle 21849
    -- Customer: فادي السعيد
    -- Start Date: 2025-02-08, Monthly: 1750
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '21849'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 44: Vehicle plate 21849 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 44: Found vehicle plate 21849 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 44: No cancelled contract found for vehicle 21849';
            ELSE
                RAISE NOTICE 'Row 44: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'فادي السعيد',
                    last_name = '',
                    phone = '66043445',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 44: Updated customer name to: فادي السعيد';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-02-08'::DATE,
                    monthly_amount = 1750,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 44: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-02-08'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 44: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 44: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 45: Vehicle 21860
    -- Customer: محمد العريشي
    -- Start Date: 2025-02-16, Monthly: 1700
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '21860'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 45: Vehicle plate 21860 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 45: Found vehicle plate 21860 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 45: No cancelled contract found for vehicle 21860';
            ELSE
                RAISE NOTICE 'Row 45: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمد العريشي',
                    last_name = '',
                    phone = '66816813',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 45: Updated customer name to: محمد العريشي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-02-16'::DATE,
                    monthly_amount = 1700,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 45: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-02-16'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 45: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 45: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 46: Vehicle 381247
    -- Customer: قصعادي عقبة
    -- Start Date: 2025-07-01, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '381247'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 46: Vehicle plate 381247 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 46: Found vehicle plate 381247 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 46: No cancelled contract found for vehicle 381247';
            ELSE
                RAISE NOTICE 'Row 46: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'قصعادي عقبة',
                    last_name = '',
                    phone = '50409220',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 46: Updated customer name to: قصعادي عقبة';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-07-01'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 46: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-07-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 46: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 46: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 47: Vehicle 556199
    -- Customer: محمد جمعة
    -- Start Date: 2025-08-01, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '556199'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 47: Vehicle plate 556199 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 47: Found vehicle plate 556199 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 47: No cancelled contract found for vehicle 556199';
            ELSE
                RAISE NOTICE 'Row 47: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمد جمعة',
                    last_name = '',
                    phone = '66816813',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 47: Updated customer name to: محمد جمعة';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-08-01'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 47: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-08-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 47: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 47: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 48: Vehicle 706150
    -- Customer: مروان باكير
    -- Start Date: 2025-07-11, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '706150'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 48: Vehicle plate 706150 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 48: Found vehicle plate 706150 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 48: No cancelled contract found for vehicle 706150';
            ELSE
                RAISE NOTICE 'Row 48: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'مروان باكير',
                    last_name = '',
                    phone = '51024665',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 48: Updated customer name to: مروان باكير';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-07-11'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 48: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-07-11'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 48: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 48: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 49: Vehicle 856715
    -- Customer: دانور الجيتوني (حمزة)
    -- Start Date: 2025-04-01, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '856715'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 49: Vehicle plate 856715 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 49: Found vehicle plate 856715 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 49: No cancelled contract found for vehicle 856715';
            ELSE
                RAISE NOTICE 'Row 49: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'دانور الجيتوني (حمزة)',
                    last_name = '',
                    phone = '66934949',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 49: Updated customer name to: دانور الجيتوني (حمزة)';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-04-01'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 49: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-04-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 49: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 49: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 50: Vehicle 856718
    -- Customer: حسان بو علاقي
    -- Start Date: 2025-02-14, Monthly: 1700
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '856718'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 50: Vehicle plate 856718 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 50: Found vehicle plate 856718 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 50: No cancelled contract found for vehicle 856718';
            ELSE
                RAISE NOTICE 'Row 50: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'حسان بو علاقي',
                    last_name = '',
                    phone = '66553638',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 50: Updated customer name to: حسان بو علاقي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-02-14'::DATE,
                    monthly_amount = 1700,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 50: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-02-14'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 50: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 50: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 51: Vehicle 856878
    -- Customer: محمد مسلم
    -- Start Date: 2025-08-01, Monthly: 2100
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '856878'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 51: Vehicle plate 856878 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 51: Found vehicle plate 856878 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 51: No cancelled contract found for vehicle 856878';
            ELSE
                RAISE NOTICE 'Row 51: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمد مسلم',
                    last_name = '',
                    phone = '55001662',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 51: Updated customer name to: محمد مسلم';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-08-01'::DATE,
                    monthly_amount = 2100,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 51: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-08-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 51: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 51: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 52: Vehicle 856925
    -- Customer: عاطف منصور
    -- Start Date: 2024-08-05, Monthly: 1850
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '856925'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 52: Vehicle plate 856925 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 52: Found vehicle plate 856925 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 52: No cancelled contract found for vehicle 856925';
            ELSE
                RAISE NOTICE 'Row 52: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عاطف منصور',
                    last_name = '',
                    phone = '74446588',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 52: Updated customer name to: عاطف منصور';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-08-05'::DATE,
                    monthly_amount = 1850,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 52: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-08-05'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 52: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 52: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 53: Vehicle 857045
    -- Customer: عميرة الخروبي
    -- Start Date: 2024-01-02, Monthly: 2000
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '857045'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 53: Vehicle plate 857045 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 53: Found vehicle plate 857045 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 53: No cancelled contract found for vehicle 857045';
            ELSE
                RAISE NOTICE 'Row 53: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عميرة الخروبي',
                    last_name = '',
                    phone = '30122896',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 53: Updated customer name to: عميرة الخروبي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-01-02'::DATE,
                    monthly_amount = 2000,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 53: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-01-02'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 53: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 53: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 54: Vehicle 893406
    -- Customer: سيف الدين محمد صالح
    -- Start Date: 2025-04-01, Monthly: 1700
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '893406'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 54: Vehicle plate 893406 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 54: Found vehicle plate 893406 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 54: No cancelled contract found for vehicle 893406';
            ELSE
                RAISE NOTICE 'Row 54: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'سيف الدين محمد صالح',
                    last_name = '',
                    phone = '70692947',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 54: Updated customer name to: سيف الدين محمد صالح';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-04-01'::DATE,
                    monthly_amount = 1700,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 54: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-04-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 54: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 54: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 55: Vehicle 893409
    -- Customer: عبد الصمد بن عزوز
    -- Start Date: 2025-03-01, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '893409'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 55: Vehicle plate 893409 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 55: Found vehicle plate 893409 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 55: No cancelled contract found for vehicle 893409';
            ELSE
                RAISE NOTICE 'Row 55: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عبد الصمد بن عزوز',
                    last_name = '',
                    phone = '33478097',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 55: Updated customer name to: عبد الصمد بن عزوز';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-03-01'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 55: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-03-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 55: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 55: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 56: Vehicle 893410
    -- Customer: عمار عبد العزيز الغزي
    -- Start Date: 2024-09-04, Monthly: 1750
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '893410'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 56: Vehicle plate 893410 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 56: Found vehicle plate 893410 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 56: No cancelled contract found for vehicle 893410';
            ELSE
                RAISE NOTICE 'Row 56: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عمار عبد العزيز الغزي',
                    last_name = '',
                    phone = '30403800',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 56: Updated customer name to: عمار عبد العزيز الغزي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-09-04'::DATE,
                    monthly_amount = 1750,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 56: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-09-04'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 56: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 56: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 57: Vehicle 9255
    -- Customer: علام الدين حسين
    -- Start Date: 2023-06-21, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '9255'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 57: Vehicle plate 9255 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 57: Found vehicle plate 9255 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 57: No cancelled contract found for vehicle 9255';
            ELSE
                RAISE NOTICE 'Row 57: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'علام الدين حسين',
                    last_name = '',
                    phone = '77456423',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 57: Updated customer name to: علام الدين حسين';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2023-06-21'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 57: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2023-06-21'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 57: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 57: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 58: Vehicle 10172
    -- Customer: انور محمد ابراهيم
    -- Start Date: 2025-04-15, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '10172'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 58: Vehicle plate 10172 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 58: Found vehicle plate 10172 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 58: No cancelled contract found for vehicle 10172';
            ELSE
                RAISE NOTICE 'Row 58: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'انور محمد ابراهيم',
                    last_name = '',
                    phone = '70561365',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 58: Updated customer name to: انور محمد ابراهيم';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-04-15'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 58: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-04-15'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 58: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 58: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 59: Vehicle 10197
    -- Customer: احمد الشاعر الصديق
    -- Start Date: 2024-08-10, Monthly: 1250
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '10197'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 59: Vehicle plate 10197 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 59: Found vehicle plate 10197 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 59: No cancelled contract found for vehicle 10197';
            ELSE
                RAISE NOTICE 'Row 59: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'احمد الشاعر الصديق',
                    last_name = '',
                    phone = '50118063',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 59: Updated customer name to: احمد الشاعر الصديق';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-08-10'::DATE,
                    monthly_amount = 1250,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 59: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-08-10'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 59: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 59: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 60: Vehicle 11473
    -- Customer: عمد العواري
    -- Start Date: 2025-09-19, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '11473'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 60: Vehicle plate 11473 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 60: Found vehicle plate 11473 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 60: No cancelled contract found for vehicle 11473';
            ELSE
                RAISE NOTICE 'Row 60: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عمد العواري',
                    last_name = '',
                    phone = '66071051',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 60: Updated customer name to: عمد العواري';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-09-19'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 60: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-09-19'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 60: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 60: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 61: Vehicle 721894
    -- Customer: شرف الدين الموجود
    -- Start Date: 2025-06-03, Monthly: 1000
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '721894'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 61: Vehicle plate 721894 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 61: Found vehicle plate 721894 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 61: No cancelled contract found for vehicle 721894';
            ELSE
                RAISE NOTICE 'Row 61: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'شرف الدين الموجود',
                    last_name = '',
                    phone = '71101506',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 61: Updated customer name to: شرف الدين الموجود';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-06-03'::DATE,
                    monthly_amount = 1000,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 61: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-06-03'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 61: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 61: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 62: Vehicle 862169
    -- Customer: عبد الرحيم شاكر
    -- Start Date: 2025-07-01, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '862169'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 62: Vehicle plate 862169 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 62: Found vehicle plate 862169 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 62: No cancelled contract found for vehicle 862169';
            ELSE
                RAISE NOTICE 'Row 62: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عبد الرحيم شاكر',
                    last_name = '',
                    phone = '31310330',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 62: Updated customer name to: عبد الرحيم شاكر';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-07-01'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 62: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-07-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 62: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 62: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 63: Vehicle 862165
    -- Customer: مهدي الشريف
    -- Start Date: 2025-09-01, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '862165'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 63: Vehicle plate 862165 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 63: Found vehicle plate 862165 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 63: No cancelled contract found for vehicle 862165';
            ELSE
                RAISE NOTICE 'Row 63: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'مهدي الشريف',
                    last_name = '',
                    phone = '33670129',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 63: Updated customer name to: مهدي الشريف';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-09-01'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 63: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-09-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 63: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 63: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 64: Vehicle 10665
    -- Customer: احمد الطاهر الريس
    -- Start Date: 2024-08-14, Monthly: 1750
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '10665'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 64: Vehicle plate 10665 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 64: Found vehicle plate 10665 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 64: No cancelled contract found for vehicle 10665';
            ELSE
                RAISE NOTICE 'Row 64: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'احمد الطاهر الريس',
                    last_name = '',
                    phone = '77013644',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 64: Updated customer name to: احمد الطاهر الريس';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-08-14'::DATE,
                    monthly_amount = 1750,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 64: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-08-14'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 64: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 64: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 65: Vehicle 10666
    -- Customer: جاسم محمد الصالح
    -- Start Date: 2025-07-01, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '10666'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 65: Vehicle plate 10666 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 65: Found vehicle plate 10666 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 65: No cancelled contract found for vehicle 10666';
            ELSE
                RAISE NOTICE 'Row 65: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'جاسم محمد الصالح',
                    last_name = '',
                    phone = '30047797',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 65: Updated customer name to: جاسم محمد الصالح';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-07-01'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 65: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-07-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 65: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 65: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 66: Vehicle 10667
    -- Customer: وليد شراس اجار عادي
    -- Start Date: 2025-07-09, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '10667'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 66: Vehicle plate 10667 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 66: Found vehicle plate 10667 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 66: No cancelled contract found for vehicle 10667';
            ELSE
                RAISE NOTICE 'Row 66: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'وليد شراس اجار عادي',
                    last_name = '',
                    phone = '31308631',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 66: Updated customer name to: وليد شراس اجار عادي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-07-09'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 66: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-07-09'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 66: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 66: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 67: Vehicle 10668
    -- Customer: عبد المنعم حمدي
    -- Start Date: 2025-03-01, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '10668'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 67: Vehicle plate 10668 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 67: Found vehicle plate 10668 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 67: No cancelled contract found for vehicle 10668';
            ELSE
                RAISE NOTICE 'Row 67: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عبد المنعم حمدي',
                    last_name = '',
                    phone = '70184904',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 67: Updated customer name to: عبد المنعم حمدي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-03-01'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 67: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-03-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 67: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 67: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 68: Vehicle 10669
    -- Customer: اجار ورداد مسعودي عادي
    -- Start Date: 2025-09-02, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '10669'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 68: Vehicle plate 10669 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 68: Found vehicle plate 10669 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 68: No cancelled contract found for vehicle 10669';
            ELSE
                RAISE NOTICE 'Row 68: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'اجار ورداد مسعودي عادي',
                    last_name = '',
                    phone = '50818558',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 68: Updated customer name to: اجار ورداد مسعودي عادي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-09-02'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 68: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-09-02'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 68: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 68: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 70: Vehicle 4016
    -- Customer: سلمى عبد الله
    -- Start Date: 2025-01-19, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '4016'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 70: Vehicle plate 4016 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 70: Found vehicle plate 4016 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 70: No cancelled contract found for vehicle 4016';
            ELSE
                RAISE NOTICE 'Row 70: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'سلمى عبد الله',
                    last_name = '',
                    phone = '30534902',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 70: Updated customer name to: سلمى عبد الله';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-01-19'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 70: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-01-19'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 70: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 70: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 71: Vehicle 4018
    -- Customer: عبد الرحيم شاكر
    -- Start Date: 2024-02-08, Monthly: 1700
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '4018'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 71: Vehicle plate 4018 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 71: Found vehicle plate 4018 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 71: No cancelled contract found for vehicle 4018';
            ELSE
                RAISE NOTICE 'Row 71: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عبد الرحيم شاكر',
                    last_name = '',
                    phone = '31310330',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 71: Updated customer name to: عبد الرحيم شاكر';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2024-02-08'::DATE,
                    monthly_amount = 1700,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 71: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2024-02-08'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 71: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 71: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 72: Vehicle 8203
    -- Customer: محمد عماد النعماني
    -- Start Date: 2025-10-04, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '8203'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 72: Vehicle plate 8203 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 72: Found vehicle plate 8203 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 72: No cancelled contract found for vehicle 8203';
            ELSE
                RAISE NOTICE 'Row 72: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمد عماد النعماني',
                    last_name = '',
                    phone = '51230549',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 72: Updated customer name to: محمد عماد النعماني';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-10-04'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 72: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-10-04'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 72: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 72: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 73: Vehicle 8206
    -- Customer: محمد صالح فرج حامد
    -- Start Date: 2025-07-10, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '8206'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 73: Vehicle plate 8206 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 73: Found vehicle plate 8206 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 73: No cancelled contract found for vehicle 8206';
            ELSE
                RAISE NOTICE 'Row 73: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمد صالح فرج حامد',
                    last_name = '',
                    phone = '55449463',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 73: Updated customer name to: محمد صالح فرج حامد';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-07-10'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 73: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-07-10'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 73: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 73: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 74: Vehicle 8207
    -- Customer: حسن الفكي
    -- Start Date: 2025-04-15, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '8207'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 74: Vehicle plate 8207 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 74: Found vehicle plate 8207 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 74: No cancelled contract found for vehicle 8207';
            ELSE
                RAISE NOTICE 'Row 74: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'حسن الفكي',
                    last_name = '',
                    phone = '51060253',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 74: Updated customer name to: حسن الفكي';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-04-15'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 74: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-04-15'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 74: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 74: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 75: Vehicle 8208
    -- Customer: عصام احمد عيد الدابر
    -- Start Date: 2025-02-02, Monthly: 1500
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '8208'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 75: Vehicle plate 8208 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 75: Found vehicle plate 8208 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 75: No cancelled contract found for vehicle 8208';
            ELSE
                RAISE NOTICE 'Row 75: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'عصام احمد عيد الدابر',
                    last_name = '',
                    phone = '66276263',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 75: Updated customer name to: عصام احمد عيد الدابر';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-02-02'::DATE,
                    monthly_amount = 1500,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 75: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-02-02'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 75: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 75: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 76: Vehicle 8211
    -- Customer: محمد سالم
    -- Start Date: 2025-07-01, Monthly: 1600
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '8211'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 76: Vehicle plate 8211 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 76: Found vehicle plate 8211 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 76: No cancelled contract found for vehicle 8211';
            ELSE
                RAISE NOTICE 'Row 76: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'محمد سالم',
                    last_name = '',
                    phone = '30757703',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 76: Updated customer name to: محمد سالم';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-07-01'::DATE,
                    monthly_amount = 1600,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 76: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-07-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 76: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 76: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
    -- Row 77: Vehicle 8213
    -- Customer: يحي هلال الصغري
    -- Start Date: 2025-06-01, Monthly: 1700
    -- =====================================

    BEGIN
        -- Find vehicle by plate_number
        SELECT id INTO v_vehicle_id
        FROM vehicles
        WHERE company_id = v_company_id
        AND plate_number = '8213'
        LIMIT 1;

        IF v_vehicle_id IS NULL THEN
            RAISE NOTICE 'Row 77: Vehicle plate 8213 not found, skipping';
        ELSE
            RAISE NOTICE 'Row 77: Found vehicle plate 8213 (ID: %)', v_vehicle_id;

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
                RAISE NOTICE 'Row 77: No cancelled contract found for vehicle 8213';
            ELSE
                RAISE NOTICE 'Row 77: Found cancelled contract (ID: %)', v_contract_id;

                -- Update customer with Arabic name
                UPDATE customers
                SET
                    first_name = 'يحي هلال الصغري',
                    last_name = '',
                    phone = '504P47989',
                    updated_at = now()
                WHERE id = v_customer_id;

                v_customers_updated := v_customers_updated + 1;
                RAISE NOTICE 'Row 77: Updated customer name to: يحي هلال الصغري';

                -- Update contract to active
                UPDATE contracts
                SET
                    status = 'active',
                    start_date = '2025-06-01'::DATE,
                    monthly_amount = 1700,
                    updated_at = now()
                WHERE id = v_contract_id;

                v_contracts_updated := v_contracts_updated + 1;
                RAISE NOTICE 'Row 77: Reactivated contract';

                -- Generate historical invoices if there's a gap
                IF v_old_end_date IS NOT NULL THEN
                    v_new_start_date := '2025-06-01'::DATE;
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
                            v_monthly_amount + 3000,
                            'overdue',
                            'فاتورة تاريخية - الإيجار: ' || v_monthly_amount || ' + غرامة تأخير: 3000',
                            now()
                        );

                        v_invoices_created := v_invoices_created + 1;
                        v_invoice_date := v_invoice_date + INTERVAL '1 month';
                    END LOOP;

                    RAISE NOTICE 'Row 77: Generated invoices from % to %', v_old_end_date, v_new_start_date;
                END IF;
            END IF;
        END IF;

        RAISE NOTICE '';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Row 77: ERROR - %', SQLERRM;
            RAISE NOTICE '';
    END;

    -- =====================================
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

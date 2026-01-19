# Fleetify Database Reference

> **Generated**: 2026-01-12T13:30:37.587Z
> **Total Tables**: 285
> **Database**: PostgreSQL 17.6 (Supabase)

## Table of Contents

### Core
- [`companies`](#companies)
- [`users`](#users)
- [`profiles`](#profiles)
- [`tenants`](#tenants)
- [`company_usage`](#company_usage)
- [`system_settings`](#system_settings)

### Finance
- [`account_creation_requests`](#account_creation_requests)
- [`account_deletion_log`](#account_deletion_log)
- [`account_mappings`](#account_mappings)
- [`account_movement_settings`](#account_movement_settings)
- [`accounting_periods`](#accounting_periods)
- [`accounting_templates`](#accounting_templates)
- [`bank_transactions`](#bank_transactions)
- [`banks`](#banks)
- [`budgets`](#budgets)
- [`chart_of_accounts`](#chart_of_accounts)
- [`contract_payment_schedules`](#contract_payment_schedules)
- [`cost_centers`](#cost_centers)
- [`customer_account_types`](#customer_account_types)
- [`customer_accounts`](#customer_accounts)
- [`customer_payment_scores`](#customer_payment_scores)
- [`default_account_types`](#default_account_types)
- [`default_chart_of_accounts`](#default_chart_of_accounts)
- [`depreciation_records`](#depreciation_records)
- [`essential_account_mappings`](#essential_account_mappings)
- [`fixed_assets`](#fixed_assets)
- [`invoice_cost_center_analysis`](#invoice_cost_center_analysis)
- [`invoice_items`](#invoice_items)
- [`invoice_ocr_logs`](#invoice_ocr_logs)
- [`invoices`](#invoices)
- [`journal_entries`](#journal_entries)
- [`journal_entry_lines`](#journal_entry_lines)
- [`journal_entry_status_history`](#journal_entry_status_history)
- [`legal_case_account_mappings`](#legal_case_account_mappings)
- [`legal_case_payments`](#legal_case_payments)
- [`maintenance_account_mappings`](#maintenance_account_mappings)
- [`payment_ai_analysis`](#payment_ai_analysis)
- [`payment_allocation_rules`](#payment_allocation_rules)
- [`payment_allocations`](#payment_allocations)
- [`payment_attempts`](#payment_attempts)
- [`payment_behavior_analytics`](#payment_behavior_analytics)
- [`payment_contract_linking_attempts`](#payment_contract_linking_attempts)
- [`payment_contract_matching`](#payment_contract_matching)
- [`payment_installments`](#payment_installments)
- [`payment_plans`](#payment_plans)
- [`payment_promises`](#payment_promises)
- [`payment_reminders`](#payment_reminders)
- [`payments`](#payments)
- [`pending_journal_entries`](#pending_journal_entries)
- [`property_payments`](#property_payments)
- [`rental_payment_receipts`](#rental_payment_receipts)
- [`traffic_violation_payments`](#traffic_violation_payments)
- [`user_account_audit`](#user_account_audit)
- [`vendor_accounts`](#vendor_accounts)
- [`vendor_payments`](#vendor_payments)

### Contracts
- [`contract_amendments`](#contract_amendments)
- [`contract_approval_steps`](#contract_approval_steps)
- [`contract_creation_log`](#contract_creation_log)
- [`contract_document_operation_log`](#contract_document_operation_log)
- [`contract_documents`](#contract_documents)
- [`contract_drafts`](#contract_drafts)
- [`contract_notifications`](#contract_notifications)
- [`contract_number_history`](#contract_number_history)
- [`contract_operations_log`](#contract_operations_log)
- [`contract_payment_schedules`](#contract_payment_schedules)
- [`contract_templates`](#contract_templates)
- [`contract_vehicle_returns`](#contract_vehicle_returns)
- [`contract_vehicles`](#contract_vehicles)
- [`contracts`](#contracts)
- [`payment_contract_linking_attempts`](#payment_contract_linking_attempts)
- [`payment_contract_matching`](#payment_contract_matching)
- [`property_contracts`](#property_contracts)

### Customers
- [`customer_account_types`](#customer_account_types)
- [`customer_accounts`](#customer_accounts)
- [`customer_aging_analysis`](#customer_aging_analysis)
- [`customer_balances`](#customer_balances)
- [`customer_credit_history`](#customer_credit_history)
- [`customer_deposits`](#customer_deposits)
- [`customer_documents`](#customer_documents)
- [`customer_notes`](#customer_notes)
- [`customer_payment_scores`](#customer_payment_scores)
- [`customers`](#customers)
- [`delinquent_customers`](#delinquent_customers)

### Fleet
- [`contract_vehicle_returns`](#contract_vehicle_returns)
- [`contract_vehicles`](#contract_vehicles)
- [`dispatch_permit_attachments`](#dispatch_permit_attachments)
- [`dispatch_permit_tracking`](#dispatch_permit_tracking)
- [`drivers`](#drivers)
- [`fleet_vehicle_groups`](#fleet_vehicle_groups)
- [`fleet_vehicle_insurance`](#fleet_vehicle_insurance)
- [`fuel_records`](#fuel_records)
- [`odometer_readings`](#odometer_readings)
- [`vehicle_activity_log`](#vehicle_activity_log)
- [`vehicle_alerts`](#vehicle_alerts)
- [`vehicle_categories`](#vehicle_categories)
- [`vehicle_condition_reports`](#vehicle_condition_reports)
- [`vehicle_dispatch_permits`](#vehicle_dispatch_permits)
- [`vehicle_documents`](#vehicle_documents)
- [`vehicle_groups`](#vehicle_groups)
- [`vehicle_inspections`](#vehicle_inspections)
- [`vehicle_installment_schedules`](#vehicle_installment_schedules)
- [`vehicle_installments`](#vehicle_installments)
- [`vehicle_insurance`](#vehicle_insurance)
- [`vehicle_insurance_policies`](#vehicle_insurance_policies)
- [`vehicle_maintenance`](#vehicle_maintenance)
- [`vehicle_operating_costs`](#vehicle_operating_costs)
- [`vehicle_pricing`](#vehicle_pricing)
- [`vehicle_reservations`](#vehicle_reservations)
- [`vehicle_return_forms`](#vehicle_return_forms)
- [`vehicle_transfers`](#vehicle_transfers)
- [`vehicles`](#vehicles)

### Inventory
- [`inventory_alert_history`](#inventory_alert_history)
- [`inventory_alert_rules`](#inventory_alert_rules)
- [`inventory_categories`](#inventory_categories)
- [`inventory_demand_forecasts`](#inventory_demand_forecasts)
- [`inventory_items`](#inventory_items)
- [`inventory_movements`](#inventory_movements)
- [`inventory_optimization_metrics`](#inventory_optimization_metrics)
- [`inventory_purchase_order_items`](#inventory_purchase_order_items)
- [`inventory_purchase_orders`](#inventory_purchase_orders)
- [`inventory_purchasing_rules`](#inventory_purchasing_rules)
- [`inventory_replenishment_requests`](#inventory_replenishment_requests)
- [`inventory_replenishment_rules`](#inventory_replenishment_rules)
- [`inventory_reports`](#inventory_reports)
- [`inventory_snapshots`](#inventory_snapshots)
- [`inventory_stock_levels`](#inventory_stock_levels)
- [`inventory_stock_take_lines`](#inventory_stock_take_lines)
- [`inventory_stock_takes`](#inventory_stock_takes)
- [`inventory_supplier_categories`](#inventory_supplier_categories)
- [`inventory_supplier_category_mapping`](#inventory_supplier_category_mapping)
- [`inventory_supplier_performance`](#inventory_supplier_performance)
- [`inventory_supplier_products`](#inventory_supplier_products)
- [`inventory_suppliers`](#inventory_suppliers)
- [`inventory_warehouse_transfer_items`](#inventory_warehouse_transfer_items)
- [`inventory_warehouse_transfers`](#inventory_warehouse_transfers)
- [`inventory_warehouses`](#inventory_warehouses)
- [`purchase_order_items`](#purchase_order_items)
- [`purchase_orders`](#purchase_orders)

### Legal
- [`company_legal_documents`](#company_legal_documents)
- [`lawsuit_preparations`](#lawsuit_preparations)
- [`legal_ai_access_logs`](#legal_ai_access_logs)
- [`legal_ai_feedback`](#legal_ai_feedback)
- [`legal_ai_queries`](#legal_ai_queries)
- [`legal_case_account_mappings`](#legal_case_account_mappings)
- [`legal_case_activities`](#legal_case_activities)
- [`legal_case_auto_triggers`](#legal_case_auto_triggers)
- [`legal_case_correspondence`](#legal_case_correspondence)
- [`legal_case_documents`](#legal_case_documents)
- [`legal_case_payments`](#legal_case_payments)
- [`legal_cases`](#legal_cases)
- [`legal_consultations`](#legal_consultations)
- [`legal_document_generations`](#legal_document_generations)
- [`legal_document_templates`](#legal_document_templates)
- [`legal_knowledge_base`](#legal_knowledge_base)
- [`legal_memo_templates`](#legal_memo_templates)
- [`legal_memos`](#legal_memos)
- [`qatar_legal_texts`](#qatar_legal_texts)
- [`traffic_violation_payments`](#traffic_violation_payments)
- [`traffic_violations`](#traffic_violations)

### HR
- [`attendance_records`](#attendance_records)
- [`employees`](#employees)
- [`hr_settings`](#hr_settings)
- [`leave_balances`](#leave_balances)
- [`leave_requests`](#leave_requests)
- [`leave_types`](#leave_types)
- [`payroll`](#payroll)
- [`payroll_reviews`](#payroll_reviews)
- [`payroll_settings`](#payroll_settings)
- [`payroll_slips`](#payroll_slips)

### System
- [`approval_notifications`](#approval_notifications)
- [`audit_logs`](#audit_logs)
- [`audit_trail`](#audit_trail)
- [`background_jobs`](#background_jobs)
- [`compliance_audit_trail`](#compliance_audit_trail)
- [`contract_notifications`](#contract_notifications)
- [`cto_agent_audit`](#cto_agent_audit)
- [`notification_settings`](#notification_settings)
- [`notifications`](#notifications)
- [`system_alerts`](#system_alerts)
- [`system_analytics`](#system_analytics)
- [`system_logs`](#system_logs)
- [`system_notifications`](#system_notifications)
- [`system_settings`](#system_settings)
- [`task_notifications`](#task_notifications)
- [`user_account_audit`](#user_account_audit)
- [`user_notifications`](#user_notifications)

### Other
- [`adaptive_rules`](#adaptive_rules)
- [`advanced_late_fee_calculations`](#advanced_late_fee_calculations)
- [`agreements_with_details`](#agreements_with_details)
- [`ai_activity_logs`](#ai_activity_logs)
- [`ai_analysis_results`](#ai_analysis_results)
- [`ai_clarification_sessions`](#ai_clarification_sessions)
- [`ai_learning_feedback`](#ai_learning_feedback)
- [`ai_learning_patterns`](#ai_learning_patterns)
- [`ai_performance_metrics`](#ai_performance_metrics)
- [`ai_query_intents`](#ai_query_intents)
- [`amendment_change_log`](#amendment_change_log)
- [`aml_kyc_diligence`](#aml_kyc_diligence)
- [`approval_requests`](#approval_requests)
- [`approval_steps`](#approval_steps)
- [`approval_templates`](#approval_templates)
- [`approval_workflows`](#approval_workflows)
- [`backup_logs`](#backup_logs)
- [`branches`](#branches)
- [`budget_alerts`](#budget_alerts)
- [`budget_items`](#budget_items)
- [`business_templates`](#business_templates)
- [`company_branding_settings`](#company_branding_settings)
- [`compliance_calendar`](#compliance_calendar)
- [`compliance_rules`](#compliance_rules)
- [`compliance_validations`](#compliance_validations)
- [`csv_file_archives`](#csv_file_archives)
- [`csv_templates`](#csv_templates)
- [`cto_deploy_gates`](#cto_deploy_gates)
- [`cto_quality_metrics`](#cto_quality_metrics)
- [`cto_waivers`](#cto_waivers)
- [`dashboard_widgets`](#dashboard_widgets)
- [`default_cost_centers`](#default_cost_centers)
- [`demo_sessions`](#demo_sessions)
- [`document_expiry_alerts`](#document_expiry_alerts)
- [`driver_assignments`](#driver_assignments)
- [`event_subscriptions`](#event_subscriptions)
- [`events`](#events)
- [`feature_gates`](#feature_gates)
- [`fleet_reports`](#fleet_reports)
- [`goods_receipt_items`](#goods_receipt_items)
- [`goods_receipts`](#goods_receipts)
- [`knowledge_base_articles`](#knowledge_base_articles)
- [`landing_ab_tests`](#landing_ab_tests)
- [`landing_analytics`](#landing_analytics)
- [`landing_content`](#landing_content)
- [`landing_media`](#landing_media)
- [`landing_sections`](#landing_sections)
- [`landing_settings`](#landing_settings)
- [`landing_themes`](#landing_themes)
- [`late_fee_history`](#late_fee_history)
- [`late_fee_rules`](#late_fee_rules)
- [`late_fees`](#late_fees)
- [`late_fine_settings`](#late_fine_settings)
- [`learning_interactions`](#learning_interactions)
- [`learning_patterns`](#learning_patterns)
- [`maintenance_checklist`](#maintenance_checklist)
- [`module_settings`](#module_settings)
- [`orders`](#orders)
- [`parts`](#parts)
- [`penalties`](#penalties)
- [`performance_metrics`](#performance_metrics)
- [`permission_change_requests`](#permission_change_requests)
- [`properties`](#properties)
- [`property_maintenance`](#property_maintenance)
- [`property_owners`](#property_owners)
- [`quotation_approval_log`](#quotation_approval_log)
- [`quotations`](#quotations)
- [`rate_limits`](#rate_limits)
- [`regulatory_reports`](#regulatory_reports)
- [`reminder_history`](#reminder_history)
- [`reminder_schedules`](#reminder_schedules)
- [`reminder_templates`](#reminder_templates)
- [`report_templates`](#report_templates)
- [`sales_leads`](#sales_leads)
- [`sales_opportunities`](#sales_opportunities)
- [`sales_orders`](#sales_orders)
- [`sales_quotes`](#sales_quotes)
- [`saved_conversations`](#saved_conversations)
- [`saved_csv_files`](#saved_csv_files)
- [`scheduled_followups`](#scheduled_followups)
- [`scheduled_report_logs`](#scheduled_report_logs)
- [`scheduled_reports`](#scheduled_reports)
- [`service_ratings`](#service_ratings)
- [`shops`](#shops)
- [`subscription_plans`](#subscription_plans)
- [`subscription_transactions`](#subscription_transactions)
- [`support_ticket_categories`](#support_ticket_categories)
- [`support_ticket_replies`](#support_ticket_replies)
- [`support_tickets`](#support_tickets)
- [`task_activity_log`](#task_activity_log)
- [`task_checklists`](#task_checklists)
- [`task_comments`](#task_comments)
- [`task_templates`](#task_templates)
- [`tasks`](#tasks)
- [`template_variables`](#template_variables)
- [`transactions`](#transactions)
- [`user_dashboard_layouts`](#user_dashboard_layouts)
- [`user_permissions`](#user_permissions)
- [`user_profiles`](#user_profiles)
- [`user_roles`](#user_roles)
- [`user_transfer_logs`](#user_transfer_logs)
- [`vendor_categories`](#vendor_categories)
- [`vendor_contacts`](#vendor_contacts)
- [`vendor_documents`](#vendor_documents)
- [`vendor_performance`](#vendor_performance)
- [`vendors`](#vendors)
- [`whatsapp_connection_status`](#whatsapp_connection_status)
- [`whatsapp_message_logs`](#whatsapp_message_logs)
- [`whatsapp_settings`](#whatsapp_settings)
- [`workflow_configurations`](#workflow_configurations)
- [`workflow_history`](#workflow_history)
- [`workflow_templates`](#workflow_templates)
- [`workflows`](#workflows)

---

## Core Domain

### `companies`

**Columns**: 35

#### Required Columns

| Column | Type |
|--------|------|
| `created_at` | string |
| `id` | string |
| `name` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `active_modules` | string[] | Yes |
| `address` | string | Yes |
| `address_ar` | string | Yes |
| `allowed_radius` | number | Yes |
| `auto_checkout_enabled` | boolean | Yes |
| `business_type` | string | Yes |
| `city` | string | Yes |
| `commercial_register` | string | Yes |
| `company_template` | string | Yes |
| `country` | string | Yes |
| `currency` | string | Yes |
| `current_plan_id` | string | Yes |
| `custom_branding` | Json | Yes |
| `customer_account_settings` | Json | Yes |
| `email` | string | Yes |
| `industry_config` | Json | Yes |
| `is_demo` | boolean | Yes |
| `license_number` | string | Yes |
| `logo_url` | string | Yes |
| `name_ar` | string | Yes |
| `number_format_preferences` | Json | Yes |
| `office_latitude` | number | Yes |
| `office_longitude` | number | Yes |
| `phone` | string | Yes |
| `settings` | Json | Yes |
| `subscription_expires_at` | string | Yes |
| `subscription_plan` | string | Yes |
| `subscription_status` | string | Yes |
| `trial_end_date` | string | Yes |
| `work_end_time` | string | Yes |
| `work_start_time` | string | Yes |

---

### `users`

**Columns**: 4

#### Required Columns

| Column | Type |
|--------|------|
| `id` | number |
| `role` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `email` | string | Yes |
| `name` | string | Yes |

---

### `profiles`

**Columns**: 19

#### Required Columns

| Column | Type |
|--------|------|
| `created_at` | string |
| `email` | string |
| `first_name` | string |
| `id` | string |
| `last_name` | string |
| `updated_at` | string |
| `user_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `avatar_url` | string | Yes |
| `company_id` | string | Yes |
| `first_name_ar` | string | Yes |
| `is_active` | boolean | Yes |
| `is_demo_user` | boolean | Yes |
| `language_preference` | string | Yes |
| `last_name_ar` | string | Yes |
| `national_id` | string | Yes |
| `phone` | string | Yes |
| `position` | string | Yes |
| `position_ar` | string | Yes |
| `timezone` | string | Yes |

---

### `tenants`

**Columns**: 27

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `full_name` | string |
| `id` | string |
| `status` | string |
| `tenant_code` | string |
| `tenant_type` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `civil_id` | string | Yes |
| `created_by` | string | Yes |
| `current_address` | string | Yes |
| `current_address_ar` | string | Yes |
| `date_of_birth` | string | Yes |
| `documents` | Json | Yes |
| `email` | string | Yes |
| `emergency_contact_name` | string | Yes |
| `emergency_contact_phone` | string | Yes |
| `employer_name` | string | Yes |
| `full_name_ar` | string | Yes |
| `is_active` | boolean | Yes |
| `monthly_income` | number | Yes |
| `nationality` | string | Yes |
| `notes` | string | Yes |
| `occupation` | string | Yes |
| `passport_number` | string | Yes |
| `phone` | string | Yes |
| `updated_by` | string | Yes |

---

### `company_usage`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `usage_date` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `api_calls_count` | number | Yes |
| `contracts_count` | number | Yes |
| `created_at` | string | Yes |
| `customers_count` | number | Yes |
| `storage_used_mb` | number | Yes |
| `users_count` | number | Yes |
| `vehicles_count` | number | Yes |

---

### `system_settings`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `category` | string |
| `id` | string |
| `setting_key` | string |
| `setting_type` | string |
| `setting_value` | Json |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `description` | string | Yes |
| `description_ar` | string | Yes |
| `is_public` | boolean | Yes |
| `requires_restart` | boolean | Yes |
| `updated_at` | string | Yes |
| `updated_by` | string | Yes |

---

## Finance Domain

### `account_creation_requests`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `employee_id` | string |
| `id` | string |
| `request_date` | string |
| `requested_by` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `direct_creation` | boolean | Yes |
| `notes` | string | Yes |
| `password_expires_at` | string | Yes |
| `processed_at` | string | Yes |
| `processed_by` | string | Yes |
| `rejection_reason` | string | Yes |
| `requested_roles` | string[] | Yes |
| `temporary_password` | string | Yes |

---

### `account_deletion_log`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `deletion_type` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `affected_records` | Json | Yes |
| `deleted_account_code` | string | Yes |
| `deleted_account_id` | string | Yes |
| `deleted_account_name` | string | Yes |
| `deleted_by` | string | Yes |
| `deletion_reason` | string | Yes |
| `transfer_to_account_id` | string | Yes |

---

### `account_mappings`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `chart_of_accounts_id` | string |
| `company_id` | string |
| `created_at` | string |
| `default_account_type_id` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `is_active` | boolean | Yes |
| `mapped_by` | string | Yes |

---

### `account_movement_settings`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approval_threshold` | number | Yes |
| `auto_create_movements` | boolean | Yes |
| `created_at` | string | Yes |
| `default_movement_type` | string | Yes |
| `is_active` | boolean | Yes |
| `require_approval` | boolean | Yes |
| `updated_at` | string | Yes |

---

### `accounting_periods`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `end_date` | string |
| `id` | string |
| `period_name` | string |
| `start_date` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `is_adjustment_period` | boolean | Yes |

---

### `accounting_templates`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `conditions` | Json |
| `created_at` | string |
| `enabled` | boolean |
| `entries` | Json |
| `id` | string |
| `name` | string |
| `priority` | number |
| `template_type` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `description` | string | Yes |

---

### `bank_transactions`

**Columns**: 19

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `balance_after` | number |
| `bank_id` | string |
| `company_id` | string |
| `created_at` | string |
| `description` | string |
| `id` | string |
| `status` | string |
| `transaction_date` | string |
| `transaction_number` | string |
| `transaction_type` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `check_number` | string | Yes |
| `counterpart_bank_id` | string | Yes |
| `created_by` | string | Yes |
| `journal_entry_id` | string | Yes |
| `reconciled` | boolean | Yes |
| `reconciled_at` | string | Yes |
| `reference_number` | string | Yes |

---

### `banks`

**Columns**: 23

#### Required Columns

| Column | Type |
|--------|------|
| `account_number` | string |
| `account_type` | string |
| `bank_name` | string |
| `company_id` | string |
| `created_at` | string |
| `currency` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `address` | string | Yes |
| `bank_name_ar` | string | Yes |
| `branch_name` | string | Yes |
| `branch_name_ar` | string | Yes |
| `contact_person` | string | Yes |
| `current_balance` | number | Yes |
| `email` | string | Yes |
| `iban` | string | Yes |
| `is_active` | boolean | Yes |
| `is_primary` | boolean | Yes |
| `notes` | string | Yes |
| `opening_balance` | number | Yes |
| `opening_date` | string | Yes |
| `phone` | string | Yes |
| `swift_code` | string | Yes |

---

### `budgets`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `budget_name` | string |
| `budget_year` | number |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `accounting_period_id` | string | Yes |
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `created_by` | string | Yes |
| `net_income` | number | Yes |
| `notes` | string | Yes |
| `total_expenses` | number | Yes |
| `total_revenue` | number | Yes |

---

### `chart_of_accounts`

**Columns**: 23

#### Required Columns

| Column | Type |
|--------|------|
| `account_code` | string |
| `account_name` | string |
| `account_type` | string |
| `balance_type` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_level` | number | Yes |
| `account_name_ar` | string | Yes |
| `account_subtype` | string | Yes |
| `can_link_customers` | boolean | Yes |
| `can_link_employees` | boolean | Yes |
| `can_link_vendors` | boolean | Yes |
| `current_balance` | number | Yes |
| `description` | string | Yes |
| `is_active` | boolean | Yes |
| `is_default` | boolean | Yes |
| `is_header` | boolean | Yes |
| `is_system` | boolean | Yes |
| `parent_account_code` | string | Yes |
| `parent_account_id` | string | Yes |
| `sort_order` | number | Yes |

---

### `contract_payment_schedules`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `contract_id` | string |
| `created_at` | string |
| `due_date` | string |
| `id` | string |
| `installment_number` | number |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_by` | string | Yes |
| `description` | string | Yes |
| `invoice_id` | string | Yes |
| `notes` | string | Yes |
| `paid_amount` | number | Yes |
| `paid_date` | string | Yes |

---

### `cost_centers`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `center_code` | string |
| `center_name` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `actual_amount` | number | Yes |
| `budget_amount` | number | Yes |
| `center_name_ar` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `is_active` | boolean | Yes |
| `is_default` | boolean | Yes |
| `manager_id` | string | Yes |
| `parent_center_id` | string | Yes |

---

### `customer_account_types`

**Columns**: 7

#### Required Columns

| Column | Type |
|--------|------|
| `account_category` | string |
| `created_at` | string |
| `id` | string |
| `is_active` | boolean |
| `type_name` | string |
| `type_name_ar` | string |
| `updated_at` | string |

---

### `customer_accounts`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `account_id` | string |
| `company_id` | string |
| `created_at` | string |
| `currency` | string |
| `customer_id` | string |
| `id` | string |
| `is_active` | boolean |
| `is_default` | boolean |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_purpose` | string | Yes |
| `account_type_id` | string | Yes |
| `credit_limit` | number | Yes |

---

### `customer_payment_scores`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `calculated_at` | string |
| `category` | string |
| `company_id` | string |
| `customer_id` | string |
| `id` | string |
| `score` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `broken_promises_deduction` | number | Yes |
| `created_at` | string | Yes |
| `disputes_deduction` | number | Yes |
| `early_payments_bonus` | number | Yes |
| `failed_payments_deduction` | number | Yes |
| `late_payments_deduction` | number | Yes |
| `other_bonuses` | number | Yes |

---

### `default_account_types`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `account_category` | string |
| `created_at` | string |
| `id` | string |
| `type_code` | string |
| `type_name` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `description` | string | Yes |
| `is_system` | boolean | Yes |
| `type_name_ar` | string | Yes |

---

### `default_chart_of_accounts`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `account_code` | string |
| `account_name` | string |
| `account_type` | string |
| `balance_type` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_level` | number | Yes |
| `account_name_ar` | string | Yes |
| `account_subtype` | string | Yes |
| `description` | string | Yes |
| `is_header` | boolean | Yes |
| `is_system` | boolean | Yes |
| `parent_account_code` | string | Yes |
| `sort_order` | number | Yes |

---

### `depreciation_records`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `accumulated_depreciation` | number |
| `book_value` | number |
| `created_at` | string |
| `depreciation_amount` | number |
| `depreciation_date` | string |
| `fixed_asset_id` | string |
| `id` | string |
| `period_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `journal_entry_id` | string | Yes |
| `notes` | string | Yes |

---

### `essential_account_mappings`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `account_type` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_id` | string | Yes |
| `created_by` | string | Yes |
| `is_configured` | boolean | Yes |

---

### `fixed_assets`

**Columns**: 24

#### Required Columns

| Column | Type |
|--------|------|
| `asset_code` | string |
| `asset_name` | string |
| `book_value` | number |
| `category` | string |
| `company_id` | string |
| `created_at` | string |
| `depreciation_method` | string |
| `id` | string |
| `purchase_cost` | number |
| `purchase_date` | string |
| `updated_at` | string |
| `useful_life_years` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `accumulated_depreciation` | number | Yes |
| `asset_account_id` | string | Yes |
| `asset_name_ar` | string | Yes |
| `condition_status` | string | Yes |
| `depreciation_account_id` | string | Yes |
| `disposal_amount` | number | Yes |
| `disposal_date` | string | Yes |
| `is_active` | boolean | Yes |
| `location` | string | Yes |
| `notes` | string | Yes |
| `salvage_value` | number | Yes |
| `serial_number` | string | Yes |

---

### `invoice_cost_center_analysis`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `cost_center_id` | string |
| `created_at` | string |
| `id` | string |
| `invoice_type` | string |
| `period_end` | string |
| `period_start` | string |
| `total_amount` | number |
| `total_invoices` | number |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `budget_amount` | number | Yes |
| `variance_amount` | number | Yes |
| `variance_percentage` | number | Yes |

---

### `invoice_items`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `created_at` | string |
| `id` | string |
| `invoice_id` | string |
| `item_description` | string |
| `line_number` | number |
| `line_total` | number |
| `unit_price` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_id` | string | Yes |
| `cost_center_id` | string | Yes |
| `item_description_ar` | string | Yes |
| `quantity` | number | Yes |
| `tax_amount` | number | Yes |
| `tax_rate` | number | Yes |

---

### `invoice_ocr_logs`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `image_url` | string |
| `processing_status` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `error_message` | string | Yes |
| `extracted_data` | Json | Yes |
| `invoice_id` | string | Yes |
| `match_confidence` | number | Yes |
| `match_reasons` | string[] | Yes |
| `matched_contract_id` | string | Yes |
| `matched_customer_id` | string | Yes |
| `ocr_confidence` | number | Yes |
| `processed_by` | string | Yes |
| `updated_at` | string | Yes |

---

### `invoices`

**Columns**: 31

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `invoice_date` | string |
| `invoice_number` | string |
| `invoice_type` | string |
| `payment_status` | string |
| `status` | string |
| `subtotal` | number |
| `total_amount` | number |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `balance_due` | number | Yes |
| `contract_id` | string | Yes |
| `cost_center_id` | string | Yes |
| `created_by` | string | Yes |
| `currency` | string | Yes |
| `customer_id` | string | Yes |
| `discount_amount` | number | Yes |
| `due_date` | string | Yes |
| `fixed_asset_id` | string | Yes |
| `is_legacy` | boolean | Yes |
| `journal_entry_id` | string | Yes |
| `manual_review_required` | boolean | Yes |
| `notes` | string | Yes |
| `ocr_confidence` | number | Yes |
| `ocr_data` | Json | Yes |
| `paid_amount` | number | Yes |
| `scanned_image_url` | string | Yes |
| `tax_amount` | number | Yes |
| `terms` | string | Yes |
| `vendor_id` | string | Yes |

---

### `journal_entries`

**Columns**: 24

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `description` | string |
| `entry_date` | string |
| `entry_number` | string |
| `id` | string |
| `status` | string |
| `total_credit` | number |
| `total_debit` | number |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `accounting_period_id` | string | Yes |
| `created_by` | string | Yes |
| `posted_at` | string | Yes |
| `posted_by` | string | Yes |
| `reference_id` | string | Yes |
| `reference_type` | string | Yes |
| `rejection_reason` | string | Yes |
| `reversal_entry_id` | string | Yes |
| `reversed_at` | string | Yes |
| `reversed_by` | string | Yes |
| `reviewed_at` | string | Yes |
| `reviewed_by` | string | Yes |
| `updated_by` | string | Yes |
| `workflow_notes` | string | Yes |

---

### `journal_entry_lines`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `account_id` | string |
| `created_at` | string |
| `id` | string |
| `journal_entry_id` | string |
| `line_number` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `asset_id` | string | Yes |
| `cost_center_id` | string | Yes |
| `credit_amount` | number | Yes |
| `debit_amount` | number | Yes |
| `employee_id` | string | Yes |
| `line_description` | string | Yes |

---

### `journal_entry_status_history`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `changed_at` | string |
| `changed_by` | string |
| `created_at` | string |
| `from_status` | string |
| `id` | string |
| `journal_entry_id` | string |
| `to_status` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `notes` | string | Yes |

---

### `legal_case_account_mappings`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `case_type` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `auto_create_journal_entries` | boolean | Yes |
| `client_retainer_liability_account_id` | string | Yes |
| `consultation_revenue_account_id` | string | Yes |
| `court_fees_expense_account_id` | string | Yes |
| `created_by` | string | Yes |
| `expert_witness_expense_account_id` | string | Yes |
| `is_active` | boolean | Yes |
| `legal_expenses_account_id` | string | Yes |
| `legal_fees_receivable_account_id` | string | Yes |
| `legal_fees_revenue_account_id` | string | Yes |
| `legal_research_expense_account_id` | string | Yes |
| `settlements_expense_account_id` | string | Yes |
| `settlements_payable_account_id` | string | Yes |

---

### `legal_case_payments`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `case_id` | string |
| `company_id` | string |
| `created_at` | string |
| `description` | string |
| `id` | string |
| `payment_type` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_by` | string | Yes |
| `due_date` | string | Yes |
| `invoice_id` | string | Yes |
| `journal_entry_id` | string | Yes |
| `notes` | string | Yes |
| `payment_date` | string | Yes |
| `payment_method` | string | Yes |
| `payment_status` | string | Yes |

---

### `maintenance_account_mappings`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `expense_account_id` | string |
| `id` | string |
| `maintenance_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `asset_account_id` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `is_active` | boolean | Yes |
| `updated_at` | string | Yes |

---

### `payment_ai_analysis`

**Columns**: 23

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `payment_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `ai_reasoning` | string | Yes |
| `analysis_model` | string | Yes |
| `analysis_timestamp` | string | Yes |
| `base_amount` | number | Yes |
| `company_id` | string | Yes |
| `confidence_score` | number | Yes |
| `contract_reference` | string | Yes |
| `created_at` | string | Yes |
| `extracted_amounts` | number[] | Yes |
| `extracted_contract_numbers` | string[] | Yes |
| `extracted_customer_names` | string[] | Yes |
| `extracted_dates` | string[] | Yes |
| `is_late_fee` | boolean | Yes |
| `late_fee_amount` | number | Yes |
| `payment_id` | string | Yes |
| `period_month` | number | Yes |
| `period_month_name` | string | Yes |
| `period_year` | number | Yes |
| `processing_time_ms` | number | Yes |
| `suggested_actions` | string[] | Yes |
| `updated_at` | string | Yes |

---

### `payment_allocation_rules`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `actions` | Json |
| `company_id` | string |
| `conditions` | Json |
| `created_at` | string |
| `enabled` | boolean |
| `id` | string |
| `name` | string |
| `priority` | number |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `description` | string | Yes |

---

### `payment_allocations`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `allocated_date` | string |
| `allocation_method` | string |
| `allocation_type` | string |
| `amount` | number |
| `created_at` | string |
| `id` | string |
| `payment_id` | string |
| `target_id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_by` | string | Yes |
| `notes` | string | Yes |

---

### `payment_attempts`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `attempt_date` | string |
| `company_id` | string |
| `customer_id` | string |
| `id` | string |
| `invoice_id` | string |
| `status` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `error_code` | string | Yes |
| `failure_reason` | string | Yes |
| `gateway_response` | Json | Yes |
| `payment_method` | string | Yes |
| `transaction_id` | string | Yes |

---

### `payment_behavior_analytics`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `analyzed_at` | string |
| `company_id` | string |
| `customer_id` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `average_days_to_pay` | number | Yes |
| `best_day_to_contact` | string | Yes |
| `best_time_to_contact` | string | Yes |
| `created_at` | string | Yes |
| `data_points_count` | number | Yes |
| `on_time_payment_rate` | number | Yes |
| `payment_frequency` | string | Yes |
| `preferred_payment_method` | string | Yes |
| `prefers_reminders` | boolean | Yes |
| `promise_keeping_rate` | number | Yes |
| `response_rate` | number | Yes |
| `typical_delay_days` | number | Yes |
| `updated_at` | string | Yes |

---

### `payment_contract_linking_attempts`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `attempted_contract_identifiers` | Json | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `linking_confidence` | number | Yes |
| `linking_method` | string | Yes |
| `matching_contracts` | Json | Yes |
| `payment_id` | string | Yes |
| `selected_contract_id` | string | Yes |

---

### `payment_contract_matching`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `match_method` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `alternative_matches` | Json | Yes |
| `company_id` | string | Yes |
| `confidence_score` | number | Yes |
| `contract_id` | string | Yes |
| `created_at` | string | Yes |
| `match_reason` | string | Yes |
| `match_status` | string | Yes |
| `payment_id` | string | Yes |
| `review_notes` | string | Yes |
| `reviewed_at` | string | Yes |
| `reviewed_by` | string | Yes |
| `updated_at` | string | Yes |
| `validation_warnings` | string[] | Yes |

---

### `payment_installments`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `due_date` | string |
| `id` | string |
| `installment_number` | number |
| `payment_plan_id` | string |
| `status` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `paid_amount` | number | Yes |
| `paid_date` | string | Yes |
| `updated_at` | string | Yes |

---

### `payment_plans`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `customer_id` | string |
| `end_date` | string |
| `frequency` | string |
| `id` | string |
| `invoice_id` | string |
| `number_of_payments` | number |
| `start_date` | string |
| `status` | string |
| `total_amount` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `updated_at` | string | Yes |

---

### `payment_promises`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `customer_id` | string |
| `id` | string |
| `invoice_id` | string |
| `promise_date` | string |
| `promised_amount` | number |
| `status` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `actual_paid_amount` | number | Yes |
| `actual_paid_date` | string | Yes |
| `contact_method` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `notes` | string | Yes |
| `updated_at` | string | Yes |

---

### `payment_reminders`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `customer_id` | string |
| `id` | string |
| `invoice_id` | string |
| `reminder_stage` | string |
| `sent_date` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `clicked_at` | string | Yes |
| `created_at` | string | Yes |
| `message_body` | string | Yes |
| `opened_at` | string | Yes |
| `responded_at` | string | Yes |
| `response_type` | string | Yes |
| `send_method` | string | Yes |
| `sent_by` | string | Yes |
| `subject` | string | Yes |
| `template_id` | string | Yes |

---

### `payments`

**Columns**: 85

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `payment_date` | string |
| `payment_method` | string |
| `payment_number` | string |
| `payment_status` | string |
| `payment_type` | string |
| `transaction_type` | Database["public"]["Enums"]["transaction_type"] |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_id` | string | Yes |
| `agreement_number` | string | Yes |
| `allocation_status` | string | Yes |
| `amount_paid` | number | Yes |
| `bank_account` | string | Yes |
| `bank_id` | string | Yes |
| `check_number` | string | Yes |
| `contract_id` | string | Yes |
| `cost_center_id` | string | Yes |
| `created_by` | string | Yes |
| `currency` | string | Yes |
| `customer_id` | string | Yes |
| `days_overdue` | number | Yes |
| `description_type` | string | Yes |
| `due_date` | string | Yes |
| `invoice_id` | string | Yes |
| `journal_entry_id` | string | Yes |
| `late_fee_amount` | number | Yes |
| `late_fee_days` | number | Yes |
| `late_fine_amount` | number | Yes |
| `late_fine_days_overdue` | number | Yes |
| `late_fine_status` | string | Yes |
| `late_fine_type` | string | Yes |
| `late_fine_waiver_reason` | string | Yes |
| `linking_confidence` | number | Yes |
| `monthly_amount` | number | Yes |
| `notes` | string | Yes |
| `original_due_date` | string | Yes |
| `payment_completion_status` | string | Yes |
| `payment_month` | string | Yes |
| `processing_notes` | string | Yes |
| `processing_status` | string | Yes |
| `reconciliation_status` | string | Yes |
| `reference_number` | string | Yes |
| `remaining_amount` | number | Yes |
| `vendor_id` | string | Yes |
| `account_id` | string | Yes |
| `agreement_number` | string | Yes |
| `allocation_status` | string | Yes |
| `amount` | number | Yes |
| `bank_account` | string | Yes |
| `bank_id` | string | Yes |
| `check_number` | string | Yes |
| `company_id` | string | Yes |
| `contract_id` | string | Yes |
| `cost_center_id` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `currency` | string | Yes |
| `customer_id` | string | Yes |
| `description_type` | string | Yes |
| `due_date` | string | Yes |
| `id` | string | Yes |
| `invoice_id` | string | Yes |
| `journal_entry_id` | string | Yes |
| `late_fine_amount` | number | Yes |
| `late_fine_days_overdue` | number | Yes |
| `late_fine_status` | string | Yes |
| `late_fine_type` | string | Yes |
| `late_fine_waiver_reason` | string | Yes |
| `linking_confidence` | number | Yes |
| `notes` | string | Yes |
| `original_due_date` | string | Yes |
| `payment_date` | string | Yes |
| `payment_method` | string | Yes |
| `payment_number` | string | Yes |
| `payment_status` | string | Yes |
| `payment_type` | string | Yes |
| `processing_notes` | string | Yes |
| `processing_status` | string | Yes |
| `reconciliation_status` | string | Yes |
| `reference_number` | string | Yes |
| `updated_at` | string | Yes |
| `vendor_id` | string | Yes |

---

### `pending_journal_entries`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `contract_id` | string |
| `entry_type` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `last_error` | string | Yes |
| `max_retries` | number | Yes |
| `metadata` | Json | Yes |
| `next_retry_at` | string | Yes |
| `priority` | number | Yes |
| `processed_at` | string | Yes |
| `retry_count` | number | Yes |
| `status` | string | Yes |

---

### `property_payments`

**Columns**: 19

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `due_date` | string |
| `id` | string |
| `payment_number` | string |
| `payment_type` | string |
| `property_contract_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `currency` | string | Yes |
| `journal_entry_id` | string | Yes |
| `late_fee` | number | Yes |
| `notes` | string | Yes |
| `payment_date` | string | Yes |
| `payment_method` | string | Yes |
| `reference_number` | string | Yes |
| `status` | string | Yes |
| `total_amount` | number | Yes |
| `updated_at` | string | Yes |

---

### `rental_payment_receipts`

**Columns**: 25

#### Required Columns

| Column | Type |
|--------|------|
| `amount_due` | number |
| `company_id` | string |
| `created_at` | string |
| `customer_id` | string |
| `customer_name` | string |
| `fine` | number |
| `id` | string |
| `month` | string |
| `payment_date` | string |
| `payment_status` | string |
| `pending_balance` | number |
| `rent_amount` | number |
| `total_paid` | number |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `contract_id` | string | Yes |
| `created_by` | string | Yes |
| `fiscal_year` | number | Yes |
| `invoice_id` | string | Yes |
| `is_late` | boolean | Yes |
| `month_number` | number | Yes |
| `notes` | string | Yes |
| `payment_method` | string | Yes |
| `receipt_number` | string | Yes |
| `reference_number` | string | Yes |
| `vehicle_id` | string | Yes |

---

### `traffic_violation_payments`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `payment_date` | string |
| `payment_method` | string |
| `payment_number` | string |
| `payment_type` | string |
| `status` | string |
| `traffic_violation_id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `bank_account` | string | Yes |
| `check_number` | string | Yes |
| `created_by` | string | Yes |
| `journal_entry_id` | string | Yes |
| `notes` | string | Yes |
| `reference_number` | string | Yes |

---

### `user_account_audit`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `action_type` | string |
| `company_id` | string |
| `employee_id` | string |
| `id` | string |
| `performed_at` | string |
| `performed_by` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `details` | Json | Yes |
| `new_values` | Json | Yes |
| `old_values` | Json | Yes |

---

### `vendor_accounts`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `account_id` | string |
| `account_type` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |
| `vendor_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `is_default` | boolean | Yes |

---

### `vendor_payments`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `created_at` | string |
| `created_by` | string |
| `currency` | string |
| `id` | string |
| `payment_date` | string |
| `payment_method` | string |
| `payment_number` | string |
| `status` | string |
| `updated_at` | string |
| `vendor_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `bank_id` | string | Yes |
| `description` | string | Yes |
| `journal_entry_id` | string | Yes |
| `notes` | string | Yes |
| `purchase_order_id` | string | Yes |
| `reference_number` | string | Yes |

---

## Contracts Domain

### `contract_amendments`

**Columns**: 29

#### Required Columns

| Column | Type |
|--------|------|
| `amendment_number` | string |
| `amendment_reason` | string |
| `amendment_type` | string |
| `company_id` | string |
| `contract_id` | string |
| `created_at` | string |
| `id` | string |
| `new_values` | Json |
| `original_values` | Json |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `amount_difference` | number | Yes |
| `applied_at` | string | Yes |
| `approval_notes` | string | Yes |
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `changes_summary` | Json | Yes |
| `company_signature_data` | string | Yes |
| `company_signed_at` | string | Yes |
| `created_by` | string | Yes |
| `customer_signature_data` | string | Yes |
| `customer_signed` | boolean | Yes |
| `customer_signed_at` | string | Yes |
| `effective_date` | string | Yes |
| `rejected_at` | string | Yes |
| `rejected_by` | string | Yes |
| `rejection_reason` | string | Yes |
| `requires_customer_signature` | boolean | Yes |
| `requires_payment_adjustment` | boolean | Yes |

---

### `contract_approval_steps`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `approver_role` | string |
| `company_id` | string |
| `contract_id` | string |
| `created_at` | string |
| `id` | string |
| `status` | string |
| `step_order` | number |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_at` | string | Yes |
| `approver_id` | string | Yes |
| `comments` | string | Yes |
| `rejected_at` | string | Yes |

---

### `contract_creation_log`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `operation_step` | string |
| `status` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `attempt_number` | number | Yes |
| `contract_id` | string | Yes |
| `created_at` | string | Yes |
| `error_message` | string | Yes |
| `execution_time_ms` | number | Yes |
| `metadata` | Json | Yes |

---

### `contract_document_operation_log`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `operation_status` | string |
| `operation_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `completed_at` | string | Yes |
| `contract_id` | string | Yes |
| `created_at` | string | Yes |
| `document_id` | string | Yes |
| `error_code` | string | Yes |
| `error_message` | string | Yes |
| `file_path` | string | Yes |
| `metadata` | Json | Yes |
| `performed_by` | string | Yes |
| `retry_count` | number | Yes |

---

### `contract_documents`

**Columns**: 26

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `document_name` | string |
| `document_type` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `condition_report_id` | string | Yes |
| `contract_id` | string | Yes |
| `created_at` | string | Yes |
| `file_path` | string | Yes |
| `file_size` | number | Yes |
| `is_required` | boolean | Yes |
| `mime_type` | string | Yes |
| `notes` | string | Yes |
| `updated_at` | string | Yes |
| `uploaded_at` | string | Yes |
| `uploaded_by` | string | Yes |
| `ai_match_status` | 'pending' | Yes |
| `ai_match_confidence` | number | Yes |
| `matched_by` | 'ai' | Yes |
| `matched_at` | string | Yes |
| `verified_by` | string | Yes |
| `verified_at` | string | Yes |
| `match_notes` | string | Yes |
| `upload_batch_id` | string | Yes |
| `original_filename` | string | Yes |
| `processing_status` | 'uploading' | Yes |
| `processing_error` | string | Yes |

---

### `contract_drafts`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `created_by` | string |
| `current_step` | number |
| `data` | Json |
| `id` | string |
| `last_saved_at` | string |
| `updated_at` | string |

---

### `contract_notifications`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `contract_id` | string |
| `created_at` | string |
| `id` | string |
| `message` | string |
| `notification_type` | string |
| `recipient_id` | string |
| `title` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `delivery_status` | string | Yes |
| `recipient_email` | string | Yes |
| `recipient_phone` | string | Yes |
| `sent_at` | string | Yes |

---

### `contract_number_history`

**Columns**: 6

#### Required Columns

| Column | Type |
|--------|------|
| `contract_id` | string |
| `id` | string |
| `new_contract_number` | string |
| `old_contract_number` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `updated_at` | string | Yes |
| `updated_by` | string | Yes |

---

### `contract_operations_log`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `contract_id` | string |
| `id` | string |
| `operation_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `new_values` | Json | Yes |
| `notes` | string | Yes |
| `old_values` | Json | Yes |
| `operation_details` | Json | Yes |
| `performed_at` | string | Yes |
| `performed_by` | string | Yes |

---

### `contract_payment_schedules`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `contract_id` | string |
| `created_at` | string |
| `due_date` | string |
| `id` | string |
| `installment_number` | number |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_by` | string | Yes |
| `description` | string | Yes |
| `invoice_id` | string | Yes |
| `notes` | string | Yes |
| `paid_amount` | number | Yes |
| `paid_date` | string | Yes |

---

### `contract_templates`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `account_mappings` | Json |
| `approval_threshold` | number |
| `auto_calculate_pricing` | boolean |
| `company_id` | string |
| `contract_type` | string |
| `created_at` | string |
| `created_by` | string |
| `default_duration_days` | number |
| `id` | string |
| `is_active` | boolean |
| `requires_approval` | boolean |
| `template_name` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_id` | string | Yes |
| `default_terms` | string | Yes |
| `template_name_ar` | string | Yes |

---

### `contract_vehicle_returns`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `contract_id` | string |
| `created_at` | string |
| `id` | string |
| `return_date` | string |
| `returned_by` | string |
| `status` | string |
| `updated_at` | string |
| `vehicle_condition` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `damages` | Json | Yes |
| `fuel_level` | number | Yes |
| `notes` | string | Yes |
| `odometer_reading` | number | Yes |
| `rejection_reason` | string | Yes |

---

### `contract_vehicles`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `allocated_amount` | number |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |
| `vehicle_id` | string |
| `vehicle_installment_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `notes` | string | Yes |

---

### `contracts`

**Columns**: 39

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `contract_amount` | number |
| `contract_date` | string |
| `contract_number` | string |
| `contract_type` | string |
| `created_at` | string |
| `customer_id` | string |
| `end_date` | string |
| `id` | string |
| `monthly_amount` | number |
| `start_date` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_id` | string | Yes |
| `auto_renew_enabled` | boolean | Yes |
| `balance_due` | number | Yes |
| `cost_center_id` | string | Yes |
| `created_by` | string | Yes |
| `created_via` | string | Yes |
| `days_overdue` | number | Yes |
| `description` | string | Yes |
| `expired_at` | string | Yes |
| `journal_entry_id` | string | Yes |
| `last_payment_check_date` | string | Yes |
| `last_payment_date` | string | Yes |
| `last_renewal_check` | string | Yes |
| `late_fine_amount` | number | Yes |
| `license_plate` | string | Yes |
| `make` | string | Yes |
| `model` | string | Yes |
| `payment_status` | string | Yes |
| `renewal_terms` | Json | Yes |
| `suspension_reason` | string | Yes |
| `terms` | string | Yes |
| `total_paid` | number | Yes |
| `vehicle_id` | string | Yes |
| `vehicle_returned` | boolean | Yes |
| `vehicle_status` | string | Yes |
| `year` | number | Yes |

---

### `payment_contract_linking_attempts`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `attempted_contract_identifiers` | Json | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `linking_confidence` | number | Yes |
| `linking_method` | string | Yes |
| `matching_contracts` | Json | Yes |
| `payment_id` | string | Yes |
| `selected_contract_id` | string | Yes |

---

### `payment_contract_matching`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `match_method` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `alternative_matches` | Json | Yes |
| `company_id` | string | Yes |
| `confidence_score` | number | Yes |
| `contract_id` | string | Yes |
| `created_at` | string | Yes |
| `match_reason` | string | Yes |
| `match_status` | string | Yes |
| `payment_id` | string | Yes |
| `review_notes` | string | Yes |
| `reviewed_at` | string | Yes |
| `reviewed_by` | string | Yes |
| `updated_at` | string | Yes |
| `validation_warnings` | string[] | Yes |

---

### `property_contracts`

**Columns**: 32

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `contract_number` | string |
| `contract_type` | string |
| `id` | string |
| `property_id` | string |
| `start_date` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_id` | string | Yes |
| `auto_renewal` | boolean | Yes |
| `commission_amount` | number | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `currency` | string | Yes |
| `deposit_amount` | number | Yes |
| `end_date` | string | Yes |
| `grace_period_days` | number | Yes |
| `insurance_required` | boolean | Yes |
| `is_active` | boolean | Yes |
| `journal_entry_id` | string | Yes |
| `late_fee_rate` | number | Yes |
| `maintenance_responsibility` | string | Yes |
| `notes` | string | Yes |
| `payment_day` | number | Yes |
| `payment_frequency` | string | Yes |
| `renewal_period` | number | Yes |
| `rental_amount` | number | Yes |
| `security_deposit` | number | Yes |
| `status` | string | Yes |
| `tenant_id` | string | Yes |
| `terms` | string | Yes |
| `terms_ar` | string | Yes |
| `updated_at` | string | Yes |
| `utilities_included` | boolean | Yes |

---

## Customers Domain

### `customer_account_types`

**Columns**: 7

#### Required Columns

| Column | Type |
|--------|------|
| `account_category` | string |
| `created_at` | string |
| `id` | string |
| `is_active` | boolean |
| `type_name` | string |
| `type_name_ar` | string |
| `updated_at` | string |

---

### `customer_accounts`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `account_id` | string |
| `company_id` | string |
| `created_at` | string |
| `currency` | string |
| `customer_id` | string |
| `id` | string |
| `is_active` | boolean |
| `is_default` | boolean |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_purpose` | string | Yes |
| `account_type_id` | string | Yes |
| `credit_limit` | number | Yes |

---

### `customer_aging_analysis`

**Columns**: 7

#### Required Columns

| Column | Type |
|--------|------|
| `analysis_date` | string |
| `company_id` | string |
| `created_at` | string |
| `customer_id` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `current_amount` | number | Yes |
| `total_outstanding` | number | Yes |

---

### `customer_balances`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `current_balance` | number |
| `customer_id` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_id` | string | Yes |
| `credit_available` | number | Yes |
| `credit_limit` | number | Yes |
| `credit_used` | number | Yes |
| `days_overdue` | number | Yes |
| `last_payment_amount` | number | Yes |
| `last_payment_date` | string | Yes |
| `last_statement_date` | string | Yes |
| `next_statement_date` | string | Yes |
| `overdue_amount` | number | Yes |

---

### `customer_credit_history`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `balance_after` | number |
| `balance_before` | number |
| `company_id` | string |
| `created_at` | string |
| `customer_id` | string |
| `id` | string |
| `transaction_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_by` | string | Yes |
| `description` | string | Yes |
| `reference_id` | string | Yes |
| `reference_type` | string | Yes |

---

### `customer_deposits`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `created_at` | string |
| `customer_id` | string |
| `deposit_number` | string |
| `deposit_type` | string |
| `id` | string |
| `received_date` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_id` | string | Yes |
| `contract_id` | string | Yes |
| `due_date` | string | Yes |
| `journal_entry_id` | string | Yes |
| `notes` | string | Yes |
| `returned_amount` | number | Yes |

---

### `customer_documents`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `customer_id` | string |
| `document_name` | string |
| `document_type` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `file_path` | string | Yes |
| `file_size` | number | Yes |
| `is_required` | boolean | Yes |
| `mime_type` | string | Yes |
| `notes` | string | Yes |
| `updated_at` | string | Yes |
| `uploaded_at` | string | Yes |
| `uploaded_by` | string | Yes |

---

### `customer_notes`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `content` | string |
| `created_at` | string |
| `customer_id` | string |
| `id` | string |
| `note_type` | string |
| `title` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_by` | string | Yes |
| `is_important` | boolean | Yes |

---

### `customer_payment_scores`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `calculated_at` | string |
| `category` | string |
| `company_id` | string |
| `customer_id` | string |
| `id` | string |
| `score` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `broken_promises_deduction` | number | Yes |
| `created_at` | string | Yes |
| `disputes_deduction` | number | Yes |
| `early_payments_bonus` | number | Yes |
| `failed_payments_deduction` | number | Yes |
| `late_payments_deduction` | number | Yes |
| `other_bonuses` | number | Yes |

---

### `customers`

**Columns**: 36

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `phone` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `address` | string | Yes |
| `address_ar` | string | Yes |
| `alternative_phone` | string | Yes |
| `auto_pay_enabled` | boolean | Yes |
| `blacklist_reason` | string | Yes |
| `city` | string | Yes |
| `company_name` | string | Yes |
| `company_name_ar` | string | Yes |
| `country` | string | Yes |
| `created_by` | string | Yes |
| `credit_limit` | number | Yes |
| `customer_code` | string | Yes |
| `customer_type` | Database["public"]["Enums"]["customer_type"] | Yes |
| `date_of_birth` | string | Yes |
| `default_cost_center_id` | string | Yes |
| `documents` | Json | Yes |
| `email` | string | Yes |
| `emergency_contact_name` | string | Yes |
| `emergency_contact_phone` | string | Yes |
| `first_name` | string | Yes |
| `first_name_ar` | string | Yes |
| `is_active` | boolean | Yes |
| `is_blacklisted` | boolean | Yes |
| `last_name` | string | Yes |
| `last_name_ar` | string | Yes |
| `license_expiry` | string | Yes |
| `license_number` | string | Yes |
| `national_id` | string | Yes |
| `national_id_expiry` | string | Yes |
| `notes` | string | Yes |
| `passport_number` | string | Yes |

---

### `delinquent_customers`

**Columns**: 37

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `contract_id` | string |
| `contract_number` | string |
| `contract_start_date` | string |
| `customer_id` | string |
| `customer_name` | string |
| `id` | string |
| `monthly_rent` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `actual_payments_count` | number | Yes |
| `credit_limit` | number | Yes |
| `customer_code` | string | Yes |
| `customer_type` | string | Yes |
| `days_overdue` | number | Yes |
| `email` | string | Yes |
| `expected_payments_count` | number | Yes |
| `first_detected_at` | string | Yes |
| `has_previous_legal_cases` | boolean | Yes |
| `is_active` | boolean | Yes |
| `is_blacklisted` | boolean | Yes |
| `last_payment_amount` | number | Yes |
| `last_payment_date` | string | Yes |
| `last_updated_at` | string | Yes |
| `late_penalty` | number | Yes |
| `months_unpaid` | number | Yes |
| `overdue_amount` | number | Yes |
| `phone` | string | Yes |
| `previous_legal_cases_count` | number | Yes |
| `recommended_action` | string | Yes |
| `risk_color` | string | Yes |
| `risk_level` | string | Yes |
| `risk_level_en` | string | Yes |
| `risk_score` | number | Yes |
| `total_debt` | number | Yes |
| `vehicle_id` | string | Yes |
| `vehicle_plate` | string | Yes |
| `violations_amount` | number | Yes |
| `violations_count` | number | Yes |

---

## Fleet Domain

### `contract_vehicle_returns`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `contract_id` | string |
| `created_at` | string |
| `id` | string |
| `return_date` | string |
| `returned_by` | string |
| `status` | string |
| `updated_at` | string |
| `vehicle_condition` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `damages` | Json | Yes |
| `fuel_level` | number | Yes |
| `notes` | string | Yes |
| `odometer_reading` | number | Yes |
| `rejection_reason` | string | Yes |

---

### `contract_vehicles`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `allocated_amount` | number |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |
| `vehicle_id` | string |
| `vehicle_installment_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `notes` | string | Yes |

---

### `dispatch_permit_attachments`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `created_at` | string |
| `file_name` | string |
| `file_type` | string |
| `file_url` | string |
| `id` | string |
| `permit_id` | string |
| `uploaded_by` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `file_size` | number | Yes |

---

### `dispatch_permit_tracking`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `changed_by` | string |
| `created_at` | string |
| `id` | string |
| `permit_id` | string |
| `status_changed_to` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `change_reason` | string | Yes |
| `location` | string | Yes |
| `odometer_reading` | number | Yes |
| `status_changed_from` | string | Yes |

---

### `drivers`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `full_name` | string |
| `id` | string |
| `license_expiry` | string |
| `license_number` | string |
| `phone_number` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `availability_status` | string | Yes |
| `commission_rate` | number | Yes |
| `created_at` | string | Yes |
| `email` | string | Yes |
| `license_class` | string | Yes |
| `rating` | number | Yes |
| `status` | string | Yes |
| `total_earnings` | number | Yes |
| `total_trips` | number | Yes |
| `updated_at` | string | Yes |
| `vehicle_id` | string | Yes |

---

### `fleet_vehicle_groups`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `group_name` | string |
| `id` | string |
| `is_active` | boolean |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `description` | string | Yes |
| `group_name_ar` | string | Yes |
| `manager_id` | string | Yes |
| `parent_group_id` | string | Yes |

---

### `fleet_vehicle_insurance`

**Columns**: 20

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `end_date` | string |
| `id` | string |
| `insurance_company` | string |
| `is_active` | boolean |
| `policy_number` | string |
| `policy_type` | string |
| `premium_amount` | number |
| `start_date` | string |
| `updated_at` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `contact_email` | string | Yes |
| `contact_person` | string | Yes |
| `contact_phone` | string | Yes |
| `coverage_amount` | number | Yes |
| `deductible_amount` | number | Yes |
| `insurance_company_ar` | string | Yes |
| `notes` | string | Yes |
| `policy_document_url` | string | Yes |

---

### `fuel_records`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `cost_per_liter` | number |
| `created_at` | string |
| `fuel_date` | string |
| `fuel_type` | string |
| `id` | string |
| `quantity_liters` | number |
| `total_cost` | number |
| `updated_at` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_by` | string | Yes |
| `fuel_station` | string | Yes |
| `notes` | string | Yes |
| `odometer_reading` | number | Yes |
| `receipt_number` | string | Yes |

---

### `odometer_readings`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `odometer_reading` | number |
| `reading_date` | string |
| `reading_type` | string |
| `vehicle_id` | string |
| `id` | number |
| `price` | number |
| `quantity` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `notes` | string | Yes |
| `recorded_by` | string | Yes |

---

### `vehicle_activity_log`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `activity_date` | string |
| `activity_type` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `activity_time` | string | Yes |
| `cost_amount` | number | Yes |
| `cost_center_id` | string | Yes |
| `description` | string | Yes |
| `location` | string | Yes |
| `mileage` | number | Yes |
| `notes` | string | Yes |
| `performed_by` | string | Yes |
| `reference_document` | string | Yes |

---

### `vehicle_alerts`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `alert_message` | string |
| `alert_title` | string |
| `alert_type` | string |
| `company_id` | string |
| `id` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `acknowledged_at` | string | Yes |
| `acknowledged_by` | string | Yes |
| `auto_generated` | boolean | Yes |
| `created_at` | string | Yes |
| `due_date` | string | Yes |
| `is_acknowledged` | boolean | Yes |
| `priority` | string | Yes |
| `updated_at` | string | Yes |

---

### `vehicle_categories`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `name` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `daily_rate` | number | Yes |
| `deposit_amount` | number | Yes |
| `description` | string | Yes |
| `is_active` | boolean | Yes |
| `monthly_rate` | number | Yes |
| `name_ar` | string | Yes |
| `weekly_rate` | number | Yes |

---

### `vehicle_condition_reports`

**Columns**: 21

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `condition_items` | Json |
| `created_at` | string |
| `id` | string |
| `inspection_date` | string |
| `inspection_type` | string |
| `inspector_id` | string |
| `overall_condition` | string |
| `status` | string |
| `updated_at` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `contract_id` | string | Yes |
| `customer_signature` | string | Yes |
| `damage_items` | Json | Yes |
| `damage_points` | Json | Yes |
| `dispatch_permit_id` | string | Yes |
| `fuel_level` | number | Yes |
| `inspector_signature` | string | Yes |
| `mileage_reading` | number | Yes |
| `notes` | string | Yes |
| `photos` | Json | Yes |

---

### `vehicle_dispatch_permits`

**Columns**: 31

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `destination` | string |
| `end_date` | string |
| `id` | string |
| `permit_number` | string |
| `priority` | string |
| `purpose` | string |
| `request_type` | string |
| `requested_by` | string |
| `start_date` | string |
| `status` | string |
| `updated_at` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `actual_km` | number | Yes |
| `approval_signature` | string | Yes |
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `completed_at` | string | Yes |
| `completion_notes` | string | Yes |
| `destination_ar` | string | Yes |
| `driver_license` | string | Yes |
| `driver_name` | string | Yes |
| `driver_phone` | string | Yes |
| `end_time` | string | Yes |
| `estimated_km` | number | Yes |
| `fuel_allowance` | number | Yes |
| `notes` | string | Yes |
| `purpose_ar` | string | Yes |
| `rejection_reason` | string | Yes |
| `start_time` | string | Yes |

---

### `vehicle_documents`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `document_type` | string |
| `id` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `document_name` | string | Yes |
| `document_number` | string | Yes |
| `document_url` | string | Yes |
| `expiry_date` | string | Yes |
| `is_active` | boolean | Yes |
| `issue_date` | string | Yes |
| `issuing_authority` | string | Yes |
| `updated_at` | string | Yes |

---

### `vehicle_groups`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `group_name` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `default_cost_center_id` | string | Yes |
| `default_depreciation_rate` | number | Yes |
| `default_useful_life_years` | number | Yes |
| `description` | string | Yes |
| `group_color` | string | Yes |
| `group_name_ar` | string | Yes |
| `is_active` | boolean | Yes |

---

### `vehicle_inspections`

**Columns**: 29

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `inspection_date` | string |
| `inspection_type` | string |
| `inspector_name` | string |
| `overall_condition` | string |
| `updated_at` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `ac_condition` | string | Yes |
| `battery_condition` | string | Yes |
| `brake_condition` | string | Yes |
| `created_by` | string | Yes |
| `engine_condition` | string | Yes |
| `estimated_repair_cost` | number | Yes |
| `exterior_condition` | string | Yes |
| `identified_issues` | string[] | Yes |
| `inspection_certificate_url` | string | Yes |
| `interior_condition` | string | Yes |
| `is_passed` | boolean | Yes |
| `lights_condition` | string | Yes |
| `mileage_at_inspection` | number | Yes |
| `next_inspection_due` | string | Yes |
| `notes` | string | Yes |
| `photos` | Json | Yes |
| `repair_recommendations` | string[] | Yes |
| `safety_equipment_status` | string | Yes |
| `tire_condition` | string | Yes |
| `transmission_condition` | string | Yes |

---

### `vehicle_installment_schedules`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `created_at` | string |
| `due_date` | string |
| `id` | string |
| `installment_id` | string |
| `installment_number` | number |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `interest_amount` | number | Yes |
| `invoice_id` | string | Yes |
| `journal_entry_id` | string | Yes |
| `notes` | string | Yes |
| `paid_amount` | number | Yes |
| `paid_date` | string | Yes |
| `payment_reference` | string | Yes |
| `principal_amount` | number | Yes |

---

### `vehicle_installments`

**Columns**: 20

#### Required Columns

| Column | Type |
|--------|------|
| `agreement_date` | string |
| `agreement_number` | string |
| `company_id` | string |
| `created_at` | string |
| `down_payment` | number |
| `end_date` | string |
| `id` | string |
| `installment_amount` | number |
| `number_of_installments` | number |
| `start_date` | string |
| `status` | string |
| `total_amount` | number |
| `updated_at` | string |
| `vendor_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `contract_type` | string | Yes |
| `created_by` | string | Yes |
| `interest_rate` | number | Yes |
| `notes` | string | Yes |
| `total_vehicles_count` | number | Yes |
| `vehicle_id` | string | Yes |

---

### `vehicle_insurance`

**Columns**: 19

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `contact_email` | string | Yes |
| `contact_person` | string | Yes |
| `contact_phone` | string | Yes |
| `coverage_amount` | number | Yes |
| `coverage_type` | string | Yes |
| `created_at` | string | Yes |
| `deductible_amount` | number | Yes |
| `end_date` | string | Yes |
| `insurance_company` | string | Yes |
| `is_active` | boolean | Yes |
| `notes` | string | Yes |
| `policy_document_url` | string | Yes |
| `policy_number` | string | Yes |
| `premium_amount` | number | Yes |
| `start_date` | string | Yes |
| `status` | Database["public"]["Enums"]["insurance_status"] | Yes |
| `updated_at` | string | Yes |

---

### `vehicle_insurance_policies`

**Columns**: 23

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `coverage_amount` | number |
| `effective_date` | string |
| `expiry_date` | string |
| `id` | string |
| `insurance_company` | string |
| `policy_number` | string |
| `policy_type` | string |
| `premium_amount` | number |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `agent_email` | string | Yes |
| `agent_name` | string | Yes |
| `agent_phone` | string | Yes |
| `auto_renew` | boolean | Yes |
| `coverage_details` | Json | Yes |
| `created_at` | string | Yes |
| `deductible_amount` | number | Yes |
| `documents` | Json | Yes |
| `is_active` | boolean | Yes |
| `journal_entry_id` | string | Yes |
| `premium_frequency` | string | Yes |
| `renewal_notice_days` | number | Yes |
| `updated_at` | string | Yes |

---

### `vehicle_maintenance`

**Columns**: 34

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `description` | string |
| `id` | string |
| `maintenance_number` | string |
| `maintenance_type` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `actual_cost` | number | Yes |
| `assigned_to` | string | Yes |
| `attachments` | Json | Yes |
| `completed_date` | string | Yes |
| `cost_center_id` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `estimated_cost` | number | Yes |
| `expense_account_id` | string | Yes |
| `expense_recorded` | boolean | Yes |
| `invoice_id` | string | Yes |
| `invoice_number` | string | Yes |
| `journal_entry_id` | string | Yes |
| `mileage_at_service` | number | Yes |
| `notes` | string | Yes |
| `parts_replaced` | string[] | Yes |
| `payment_method` | string | Yes |
| `priority` | Database["public"]["Enums"]["maintenance_priority"] | Yes |
| `scheduled_date` | string | Yes |
| `service_provider` | string | Yes |
| `service_provider_contact` | string | Yes |
| `started_date` | string | Yes |
| `status` | Database["public"]["Enums"]["maintenance_status"] | Yes |
| `tax_amount` | number | Yes |
| `total_cost_with_tax` | number | Yes |
| `updated_at` | string | Yes |
| `vendor_id` | string | Yes |
| `warranty_until` | string | Yes |

---

### `vehicle_operating_costs`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `cost_date` | string |
| `cost_type` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `cost_center_id` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `journal_entry_id` | string | Yes |
| `receipt_number` | string | Yes |

---

### `vehicle_pricing`

**Columns**: 36

#### Required Columns

| Column | Type |
|--------|------|
| `annual_rate` | number |
| `daily_rate` | number |
| `id` | string |
| `monthly_rate` | number |
| `vehicle_id` | string |
| `weekly_rate` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `annual_rate_max` | number | Yes |
| `annual_rate_min` | number | Yes |
| `cancellation_fee` | number | Yes |
| `cleaning_fee` | number | Yes |
| `created_at` | string | Yes |
| `currency` | string | Yes |
| `daily_rate_max` | number | Yes |
| `daily_rate_min` | number | Yes |
| `effective_from` | string | Yes |
| `effective_to` | string | Yes |
| `excess_mileage_rate` | number | Yes |
| `extra_km_charge` | number | Yes |
| `fuel_policy` | string | Yes |
| `included_km_annual` | number | Yes |
| `included_km_daily` | number | Yes |
| `included_km_monthly` | number | Yes |
| `included_km_weekly` | number | Yes |
| `is_active` | boolean | Yes |
| `late_return_hourly_rate` | number | Yes |
| `mileage_limit_daily` | number | Yes |
| `mileage_limit_monthly` | number | Yes |
| `mileage_limit_weekly` | number | Yes |
| `monthly_rate_max` | number | Yes |
| `monthly_rate_min` | number | Yes |
| `peak_season_multiplier` | number | Yes |
| `security_deposit` | number | Yes |
| `updated_at` | string | Yes |
| `weekend_multiplier` | number | Yes |
| `weekly_rate_max` | number | Yes |
| `weekly_rate_min` | number | Yes |

---

### `vehicle_reservations`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `customer_name` | string |
| `end_date` | string |
| `hold_until` | string |
| `id` | string |
| `start_date` | string |
| `vehicle_id` | string |
| `vehicle_make` | string |
| `vehicle_model` | string |
| `vehicle_plate` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `customer_id` | string | Yes |
| `notes` | string | Yes |
| `status` | string | Yes |
| `updated_at` | string | Yes |

---

### `vehicle_return_forms`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `dispatch_permit_id` | string |
| `id` | string |
| `return_date` | string |
| `returned_by` | string |
| `status` | string |
| `updated_at` | string |
| `vehicle_condition` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `damages_reported` | string | Yes |
| `fuel_level_percentage` | number | Yes |
| `items_returned` | Json | Yes |
| `notes` | string | Yes |
| `return_location` | string | Yes |
| `return_odometer_reading` | number | Yes |

---

### `vehicle_transfers`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `to_branch_id` | string |
| `transfer_date` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_by` | string | Yes |
| `completed_date` | string | Yes |
| `condition_notes` | string | Yes |
| `created_at` | string | Yes |
| `from_branch_id` | string | Yes |
| `fuel_level` | number | Yes |
| `odometer_reading` | number | Yes |
| `requested_by` | string | Yes |
| `status` | string | Yes |
| `transfer_reason` | string | Yes |
| `updated_at` | string | Yes |

---

### `vehicles`

**Columns**: 92

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `make` | string |
| `model` | string |
| `plate_number` | string |
| `updated_at` | string |
| `year` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `accumulated_depreciation` | number | Yes |
| `additional_features` | string[] | Yes |
| `annual_depreciation_rate` | number | Yes |
| `asset_classification` | string | Yes |
| `asset_code` | string | Yes |
| `assigned_driver_id` | string | Yes |
| `body_type` | string | Yes |
| `book_value` | number | Yes |
| `branch_id` | string | Yes |
| `cargo_capacity` | number | Yes |
| `category_id` | string | Yes |
| `color` | string | Yes |
| `color_ar` | string | Yes |
| `cost_center_id` | string | Yes |
| `current_mileage` | number | Yes |
| `daily_rate` | number | Yes |
| `deposit_amount` | number | Yes |
| `depreciation_method` | string | Yes |
| `depreciation_rate` | number | Yes |
| `enforce_minimum_price` | boolean | Yes |
| `engine_number` | string | Yes |
| `engine_size` | string | Yes |
| `features` | Json | Yes |
| `financing_type` | string | Yes |
| `fixed_asset_id` | string | Yes |
| `fuel_capacity` | number | Yes |
| `fuel_card_number` | string | Yes |
| `fuel_level` | number | Yes |
| `fuel_type` | string | Yes |
| `gps_device_id` | string | Yes |
| `images` | Json | Yes |
| `insurance_end_date` | string | Yes |
| `insurance_expiry` | string | Yes |
| `insurance_policy` | string | Yes |
| `insurance_policy_number` | string | Yes |
| `insurance_premium_amount` | number | Yes |
| `insurance_provider` | string | Yes |
| `insurance_start_date` | string | Yes |
| `is_active` | boolean | Yes |
| `last_maintenance_date` | string | Yes |
| `last_service_date` | string | Yes |
| `last_service_mileage` | number | Yes |
| `license_expiry` | string | Yes |
| `loan_amount` | number | Yes |
| `location` | string | Yes |
| `minimum_daily_rate` | number | Yes |
| `minimum_monthly_rate` | number | Yes |
| `minimum_rental_price` | number | Yes |
| `minimum_weekly_rate` | number | Yes |
| `monthly_payment` | number | Yes |
| `monthly_rate` | number | Yes |
| `next_service_due` | string | Yes |
| `next_service_mileage` | number | Yes |
| `notes` | string | Yes |
| `odometer_reading` | number | Yes |
| `purchase_cost` | number | Yes |
| `purchase_date` | string | Yes |
| `purchase_invoice_number` | string | Yes |
| `purchase_source` | string | Yes |
| `registration_date` | string | Yes |
| `registration_expiry` | string | Yes |
| `registration_fees` | number | Yes |
| `registration_number` | string | Yes |
| `residual_value` | number | Yes |
| `safety_features` | string[] | Yes |
| `salvage_value` | number | Yes |
| `seating_capacity` | number | Yes |
| `service_interval_km` | number | Yes |
| `status` | Database["public"]["Enums"]["vehicle_status"] | Yes |
| `total_insurance_cost` | number | Yes |
| `total_maintenance_cost` | number | Yes |
| `total_operating_cost` | number | Yes |
| `transmission_type` | string | Yes |
| `useful_life_years` | number | Yes |
| `vehicle_group_id` | string | Yes |
| `vehicle_weight` | number | Yes |
| `vendor_id` | string | Yes |
| `vin` | string | Yes |
| `vin_number` | string | Yes |
| `warranty_end_date` | string | Yes |
| `warranty_expiry` | string | Yes |
| `warranty_provider` | string | Yes |
| `warranty_start_date` | string | Yes |
| `weekly_rate` | number | Yes |

---

## Inventory Domain

### `inventory_alert_history`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `alert_type` | string |
| `company_id` | string |
| `id` | string |
| `message` | string |
| `severity` | string |
| `title` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `context` | Json | Yes |
| `created_at` | string | Yes |
| `recipients` | string[] | Yes |
| `resolution_notes` | string | Yes |
| `resolved_at` | string | Yes |
| `resolved_by` | string | Yes |
| `rule_id` | string | Yes |
| `status` | string | Yes |

---

### `inventory_alert_rules`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `alert_config` | Json |
| `company_id` | string |
| `id` | string |
| `rule_name` | string |
| `rule_type` | string |
| `trigger_conditions` | Json |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `is_active` | boolean | Yes |
| `last_triggered_at` | string | Yes |
| `severity` | string | Yes |
| `trigger_count` | number | Yes |
| `updated_at` | string | Yes |

---

### `inventory_categories`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `category_name` | string |
| `company_id` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `category_name_ar` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `is_active` | boolean | Yes |
| `parent_category_id` | string | Yes |
| `updated_at` | string | Yes |

---

### `inventory_demand_forecasts`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `forecast_date` | string |
| `forecast_period` | string |
| `id` | string |
| `predicted_demand` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `actual_demand` | number | Yes |
| `confidence_level` | number | Yes |
| `created_at` | string | Yes |
| `forecast_method` | string | Yes |
| `item_id` | string | Yes |
| `model_parameters` | Json | Yes |
| `updated_at` | string | Yes |
| `warehouse_id` | string | Yes |

---

### `inventory_items`

**Columns**: 24

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `item_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `barcode` | string | Yes |
| `category_id` | string | Yes |
| `cost_price` | number | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `image_url` | string | Yes |
| `is_active` | boolean | Yes |
| `is_tracked` | boolean | Yes |
| `item_code` | string | Yes |
| `item_name_ar` | string | Yes |
| `item_type` | string | Yes |
| `max_stock_level` | number | Yes |
| `min_stock_level` | number | Yes |
| `notes` | string | Yes |
| `reorder_point` | number | Yes |
| `reorder_quantity` | number | Yes |
| `sku` | string | Yes |
| `unit_of_measure` | string | Yes |
| `unit_price` | number | Yes |
| `updated_at` | string | Yes |

---

### `inventory_movements`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `item_id` | string |
| `movement_type` | string |
| `quantity` | number |
| `warehouse_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `from_warehouse_id` | string | Yes |
| `movement_date` | string | Yes |
| `notes` | string | Yes |
| `reference_id` | string | Yes |
| `reference_number` | string | Yes |
| `reference_type` | string | Yes |
| `to_warehouse_id` | string | Yes |
| `total_cost` | number | Yes |
| `unit_cost` | number | Yes |

---

### `inventory_optimization_metrics`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `calculation_date` | string |
| `company_id` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `current_stock_level` | number | Yes |
| `days_of_supply` | number | Yes |
| `excess_stock_value` | number | Yes |
| `holding_cost` | number | Yes |
| `inventory_turnover_rate` | number | Yes |
| `item_id` | string | Yes |
| `optimal_stock_level` | number | Yes |
| `ordering_cost` | number | Yes |
| `service_level` | number | Yes |
| `stockout_count` | number | Yes |
| `total_cost` | number | Yes |
| `warehouse_id` | string | Yes |

---

### `inventory_purchase_order_items`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `item_id` | string |
| `order_id` | string |
| `quantity` | number |
| `sku` | string |
| `total_price` | number |
| `unit_price` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `expected_delivery_date` | string | Yes |
| `notes` | string | Yes |
| `received_quantity` | number | Yes |
| `remaining_quantity` | number | Yes |
| `unit_of_measure` | string | Yes |
| `updated_at` | string | Yes |

---

### `inventory_purchase_orders`

**Columns**: 21

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `order_number` | string |
| `supplier_id` | string |
| `total_amount` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `actual_delivery_date` | string | Yes |
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `confirmed_at` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `currency` | string | Yes |
| `delivery_address` | string | Yes |
| `expected_delivery_date` | string | Yes |
| `internal_reference` | string | Yes |
| `notes` | string | Yes |
| `order_date` | string | Yes |
| `payment_terms` | string | Yes |
| `sent_at` | string | Yes |
| `status` | string | Yes |
| `updated_at` | string | Yes |

---

### `inventory_purchasing_rules`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `action_config` | Json |
| `company_id` | string |
| `id` | string |
| `rule_name` | string |
| `rule_type` | string |
| `trigger_condition` | Json |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `execution_count` | number | Yes |
| `execution_frequency` | string | Yes |
| `is_active` | boolean | Yes |
| `last_executed_at` | string | Yes |
| `notes` | string | Yes |
| `priority` | number | Yes |
| `success_count` | number | Yes |
| `supplier_preferences` | Json | Yes |
| `updated_at` | string | Yes |

---

### `inventory_replenishment_requests`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `current_stock` | number |
| `id` | string |
| `request_number` | string |
| `requested_quantity` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `expected_delivery_date` | string | Yes |
| `item_id` | string | Yes |
| `notes` | string | Yes |
| `rule_id` | string | Yes |
| `status` | string | Yes |
| `updated_at` | string | Yes |
| `urgency_level` | string | Yes |
| `warehouse_id` | string | Yes |

---

### `inventory_replenishment_rules`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `reorder_point` | number |
| `reorder_quantity` | number |
| `rule_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `category_id` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `is_active` | boolean | Yes |
| `item_id` | string | Yes |
| `lead_time_days` | number | Yes |
| `max_stock_level` | number | Yes |
| `notes` | string | Yes |
| `priority` | number | Yes |
| `safety_stock` | number | Yes |
| `supplier_id` | string | Yes |
| `updated_at` | string | Yes |
| `warehouse_id` | string | Yes |

---

### `inventory_reports`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `data` | Json |
| `id` | string |
| `report_name` | string |
| `report_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `expires_at` | string | Yes |
| `file_size` | number | Yes |
| `file_url` | string | Yes |
| `generated_at` | string | Yes |
| `generated_by` | string | Yes |
| `is_public` | boolean | Yes |
| `parameters` | Json | Yes |
| `summary` | Json | Yes |
| `tags` | string[] | Yes |
| `updated_at` | string | Yes |

---

### `inventory_snapshots`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `item_id` | string |
| `quantity_on_hand` | number |
| `snapshot_date` | string |
| `unit_cost` | number |
| `unit_price` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `days_of_supply` | number | Yes |
| `quantity_reserved` | number | Yes |
| `total_cost_value` | number | Yes |
| `total_selling_value` | number | Yes |
| `turnover_rate` | number | Yes |
| `warehouse_id` | string | Yes |

---

### `inventory_stock_levels`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `item_id` | string |
| `warehouse_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `last_counted_at` | string | Yes |
| `last_movement_at` | string | Yes |
| `quantity_available` | number | Yes |
| `quantity_on_hand` | number | Yes |
| `quantity_reserved` | number | Yes |
| `updated_at` | string | Yes |

---

### `inventory_stock_take_lines`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `item_id` | string |
| `stock_take_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `counted_at` | string | Yes |
| `counted_by` | string | Yes |
| `counted_quantity` | number | Yes |
| `notes` | string | Yes |
| `system_quantity` | number | Yes |
| `variance` | number | Yes |
| `variance_value` | number | Yes |

---

### `inventory_stock_takes`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `stock_take_date` | string |
| `warehouse_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `counted_by` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `notes` | string | Yes |
| `status` | string | Yes |
| `stock_take_number` | string | Yes |
| `updated_at` | string | Yes |

---

### `inventory_supplier_categories`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `category_name` | string |
| `company_id` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `category_name_ar` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `is_active` | boolean | Yes |
| `updated_at` | string | Yes |

---

### `inventory_supplier_category_mapping`

**Columns**: 4

#### Required Columns

| Column | Type |
|--------|------|
| `category_id` | string |
| `id` | string |
| `supplier_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |

---

### `inventory_supplier_performance`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `evaluation_period` | string |
| `id` | string |
| `supplier_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `average_lead_time_days` | number | Yes |
| `calculated_at` | string | Yes |
| `created_at` | string | Yes |
| `delayed_deliveries` | number | Yes |
| `issues_count` | number | Yes |
| `on_time_deliveries` | number | Yes |
| `order_accuracy_rate` | number | Yes |
| `price_competitiveness_score` | number | Yes |
| `quality_score` | number | Yes |
| `responsiveness_score` | number | Yes |
| `return_rate` | number | Yes |
| `total_order_value` | number | Yes |
| `total_orders` | number | Yes |
| `updated_at` | string | Yes |

---

### `inventory_supplier_products`

**Columns**: 21

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `sku` | string |
| `supplier_id` | string |
| `unit_price` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `availability_status` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `currency` | string | Yes |
| `discount_percentage` | number | Yes |
| `effective_date` | string | Yes |
| `expiry_date` | string | Yes |
| `item_id` | string | Yes |
| `last_price_update` | string | Yes |
| `lead_time_days` | number | Yes |
| `min_order_quantity` | number | Yes |
| `notes` | string | Yes |
| `package_size` | number | Yes |
| `quality_rating` | number | Yes |
| `supplier_catalog_url` | string | Yes |
| `supplier_product_code` | string | Yes |
| `updated_at` | string | Yes |

---

### `inventory_suppliers`

**Columns**: 24

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `company_name` | string |
| `contact_person` | string |
| `email` | string |
| `id` | string |
| `phone` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `address` | string | Yes |
| `city` | string | Yes |
| `commercial_register` | string | Yes |
| `company_name_ar` | string | Yes |
| `country` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `delivery_terms` | string | Yes |
| `is_active` | boolean | Yes |
| `is_preferred` | boolean | Yes |
| `lead_time_days` | number | Yes |
| `minimum_order_value` | number | Yes |
| `notes` | string | Yes |
| `payment_terms` | string | Yes |
| `rating` | number | Yes |
| `tax_number` | string | Yes |
| `updated_at` | string | Yes |
| `website` | string | Yes |

---

### `inventory_warehouse_transfer_items`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `item_id` | string |
| `quantity_requested` | number |
| `transfer_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `notes` | string | Yes |
| `quantity_received` | number | Yes |
| `quantity_shipped` | number | Yes |
| `updated_at` | string | Yes |

---

### `inventory_warehouse_transfers`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `from_warehouse_id` | string |
| `id` | string |
| `to_warehouse_id` | string |
| `transfer_date` | string |
| `transfer_number` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `completed_date` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `notes` | string | Yes |
| `status` | string | Yes |
| `updated_at` | string | Yes |

---

### `inventory_warehouses`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `warehouse_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `email` | string | Yes |
| `is_active` | boolean | Yes |
| `is_default` | boolean | Yes |
| `location_address` | string | Yes |
| `location_city` | string | Yes |
| `location_country` | string | Yes |
| `manager_id` | string | Yes |
| `phone` | string | Yes |
| `updated_at` | string | Yes |
| `warehouse_code` | string | Yes |
| `warehouse_name_ar` | string | Yes |

---

### `purchase_order_items`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `created_at` | string |
| `description` | string |
| `id` | string |
| `purchase_order_id` | string |
| `quantity` | number |
| `total_price` | number |
| `unit_price` | number |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `description_ar` | string | Yes |
| `item_code` | string | Yes |
| `notes` | string | Yes |
| `received_quantity` | number | Yes |
| `unit_of_measure` | string | Yes |

---

### `purchase_orders`

**Columns**: 23

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `created_by` | string |
| `currency` | string |
| `id` | string |
| `order_date` | string |
| `order_number` | string |
| `status` | string |
| `subtotal` | number |
| `tax_amount` | number |
| `total_amount` | number |
| `updated_at` | string |
| `vendor_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `contact_person` | string | Yes |
| `delivery_address` | string | Yes |
| `delivery_date` | string | Yes |
| `email` | string | Yes |
| `expected_delivery_date` | string | Yes |
| `notes` | string | Yes |
| `phone` | string | Yes |
| `terms_and_conditions` | string | Yes |

---

## Legal Domain

### `company_legal_documents`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `document_name` | string |
| `document_type` | string |
| `file_url` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `expiry_date` | string | Yes |
| `file_size` | number | Yes |
| `is_active` | boolean | Yes |
| `notes` | string | Yes |
| `updated_at` | string | Yes |
| `uploaded_by` | string | Yes |

---

### `lawsuit_preparations`

**Columns**: 28

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `defendant_name` | string |
| `id` | string |
| `total_amount` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `amount_in_words` | string | Yes |
| `case_title` | string | Yes |
| `claims_statement_url` | string | Yes |
| `claims_text` | string | Yes |
| `contract_copy_url` | string | Yes |
| `contract_id` | string | Yes |
| `created_at` | string | Yes |
| `customer_id` | string | Yes |
| `defendant_id_number` | string | Yes |
| `defendant_type` | string | Yes |
| `explanatory_memo_url` | string | Yes |
| `facts_text` | string | Yes |
| `late_fees` | number | Yes |
| `notes` | string | Yes |
| `other_fees` | number | Yes |
| `overdue_rent` | number | Yes |
| `prepared_at` | string | Yes |
| `prepared_by` | string | Yes |
| `registered_at` | string | Yes |
| `status` | string | Yes |
| `submitted_at` | string | Yes |
| `taqadi_case_number` | string | Yes |
| `taqadi_reference_number` | string | Yes |
| `updated_at` | string | Yes |

---

### `legal_ai_access_logs`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `access_type` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `user_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `customer_id` | string | Yes |
| `data_accessed` | Json | Yes |
| `purpose` | string | Yes |

---

### `legal_ai_feedback`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `message_id` | string |
| `rating` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `country` | string | Yes |
| `feedback_text` | string | Yes |
| `query` | string | Yes |

---

### `legal_ai_queries`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `country` | string |
| `created_at` | string |
| `id` | string |
| `query` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `confidence_score` | number | Yes |
| `cost_saved` | boolean | Yes |
| `created_by` | string | Yes |
| `customer_id` | string | Yes |
| `metadata` | Json | Yes |
| `response` | string | Yes |
| `response_time` | number | Yes |
| `source_type` | string | Yes |
| `usage_count` | number | Yes |

---

### `legal_case_account_mappings`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `case_type` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `auto_create_journal_entries` | boolean | Yes |
| `client_retainer_liability_account_id` | string | Yes |
| `consultation_revenue_account_id` | string | Yes |
| `court_fees_expense_account_id` | string | Yes |
| `created_by` | string | Yes |
| `expert_witness_expense_account_id` | string | Yes |
| `is_active` | boolean | Yes |
| `legal_expenses_account_id` | string | Yes |
| `legal_fees_receivable_account_id` | string | Yes |
| `legal_fees_revenue_account_id` | string | Yes |
| `legal_research_expense_account_id` | string | Yes |
| `settlements_expense_account_id` | string | Yes |
| `settlements_payable_account_id` | string | Yes |

---

### `legal_case_activities`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `activity_title` | string |
| `activity_type` | string |
| `case_id` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `activity_date` | string | Yes |
| `activity_description` | string | Yes |
| `created_by` | string | Yes |
| `new_values` | Json | Yes |
| `old_values` | Json | Yes |
| `related_correspondence_id` | string | Yes |
| `related_document_id` | string | Yes |
| `related_payment_id` | string | Yes |

---

### `legal_case_auto_triggers`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `auto_case_priority` | string | Yes |
| `auto_case_type` | string | Yes |
| `broken_promises_count` | number | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `enable_broken_promises_trigger` | boolean | Yes |
| `enable_overdue_amount_trigger` | boolean | Yes |
| `enable_overdue_invoice_trigger` | boolean | Yes |
| `notify_on_auto_create` | boolean | Yes |
| `overdue_amount_threshold` | number | Yes |
| `overdue_days_threshold` | number | Yes |
| `updated_at` | string | Yes |
| `updated_by` | string | Yes |

---

### `legal_case_correspondence`

**Columns**: 22

#### Required Columns

| Column | Type |
|--------|------|
| `case_id` | string |
| `company_id` | string |
| `correspondence_type` | string |
| `created_at` | string |
| `direction` | string |
| `id` | string |
| `subject` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `attachments` | Json | Yes |
| `communication_date` | string | Yes |
| `content` | string | Yes |
| `created_by` | string | Yes |
| `is_confidential` | boolean | Yes |
| `recipient_email` | string | Yes |
| `recipient_name` | string | Yes |
| `recipient_phone` | string | Yes |
| `requires_response` | boolean | Yes |
| `response_deadline` | string | Yes |
| `sender_email` | string | Yes |
| `sender_name` | string | Yes |
| `sender_phone` | string | Yes |
| `status` | string | Yes |

---

### `legal_case_documents`

**Columns**: 20

#### Required Columns

| Column | Type |
|--------|------|
| `case_id` | string |
| `company_id` | string |
| `created_at` | string |
| `document_title` | string |
| `document_type` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `access_level` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `document_date` | string | Yes |
| `document_title_ar` | string | Yes |
| `file_name` | string | Yes |
| `file_path` | string | Yes |
| `file_size` | number | Yes |
| `file_type` | string | Yes |
| `is_confidential` | boolean | Yes |
| `is_original` | boolean | Yes |
| `parent_document_id` | string | Yes |
| `version_number` | number | Yes |

---

### `legal_case_payments`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `case_id` | string |
| `company_id` | string |
| `created_at` | string |
| `description` | string |
| `id` | string |
| `payment_type` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_by` | string | Yes |
| `due_date` | string | Yes |
| `invoice_id` | string | Yes |
| `journal_entry_id` | string | Yes |
| `notes` | string | Yes |
| `payment_date` | string | Yes |
| `payment_method` | string | Yes |
| `payment_status` | string | Yes |

---

### `legal_cases`

**Columns**: 47

#### Required Columns

| Column | Type |
|--------|------|
| `case_number` | string |
| `case_status` | string |
| `case_title` | string |
| `case_type` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `priority` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `billing_status` | string | Yes |
| `case_direction` | string | Yes |
| `case_reference` | string | Yes |
| `case_title_ar` | string | Yes |
| `case_value` | number | Yes |
| `client_email` | string | Yes |
| `client_id` | string | Yes |
| `client_name` | string | Yes |
| `client_phone` | string | Yes |
| `complaint_number` | string | Yes |
| `contract_id` | string | Yes |
| `court_fees` | number | Yes |
| `court_name` | string | Yes |
| `court_name_ar` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `filing_date` | string | Yes |
| `hearing_date` | string | Yes |
| `is_confidential` | boolean | Yes |
| `judge_name` | string | Yes |
| `legal_fees` | number | Yes |
| `legal_team` | Json | Yes |
| `notes` | string | Yes |
| `other_expenses` | number | Yes |
| `outcome_amount` | number | Yes |
| `outcome_amount_type` | string | Yes |
| `outcome_date` | string | Yes |
| `outcome_journal_entry_id` | string | Yes |
| `outcome_notes` | string | Yes |
| `outcome_payment_status` | string | Yes |
| `outcome_type` | string | Yes |
| `payment_direction` | string | Yes |
| `police_report_number` | string | Yes |
| `police_station` | string | Yes |
| `primary_lawyer_id` | string | Yes |
| `statute_limitations` | string | Yes |
| `tags` | Json | Yes |
| `total_costs` | number | Yes |

---

### `legal_consultations`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `query` | string |
| `response` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `cost_usd` | number | Yes |
| `country` | string | Yes |
| `created_at` | string | Yes |
| `customer_id` | string | Yes |
| `query_type` | string | Yes |
| `response_time_ms` | number | Yes |
| `risk_score` | number | Yes |
| `tokens_used` | number | Yes |
| `updated_at` | string | Yes |

---

### `legal_document_generations`

**Columns**: 28

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `content` | string |
| `document_type` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approval_status` | string | Yes |
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `body` | string | Yes |
| `country_law` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `customer_id` | string | Yes |
| `document_number` | string | Yes |
| `document_title` | string | Yes |
| `metadata` | Json | Yes |
| `recipient_address` | string | Yes |
| `recipient_entity` | string | Yes |
| `recipient_name` | string | Yes |
| `rejection_reason` | string | Yes |
| `related_contract_id` | string | Yes |
| `related_customer_id` | string | Yes |
| `related_vehicle_id` | string | Yes |
| `status` | string | Yes |
| `subject` | string | Yes |
| `template_id` | string | Yes |
| `template_used` | string | Yes |
| `updated_at` | string | Yes |
| `variables_data` | Json | Yes |

---

### `legal_document_templates`

**Columns**: 20

#### Required Columns

| Column | Type |
|--------|------|
| `body_ar` | string |
| `code` | string |
| `id` | string |
| `name_ar` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `body_en` | string | Yes |
| `body_template` | string | Yes |
| `category` | string | Yes |
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `description_ar` | string | Yes |
| `description_en` | string | Yes |
| `footer_template` | string | Yes |
| `is_active` | boolean | Yes |
| `is_system` | boolean | Yes |
| `name_en` | string | Yes |
| `requires_approval` | boolean | Yes |
| `subject_template` | string | Yes |
| `template_key` | string | Yes |
| `updated_at` | string | Yes |
| `variables` | Json | Yes |

---

### `legal_knowledge_base`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `article_content` | string |
| `category` | string |
| `id` | string |
| `law_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `article_number` | string | Yes |
| `article_title` | string | Yes |
| `country` | string | Yes |
| `created_at` | string | Yes |
| `is_active` | boolean | Yes |
| `keywords` | string[] | Yes |
| `law_number` | string | Yes |
| `law_year` | number | Yes |
| `subcategory` | string | Yes |
| `updated_at` | string | Yes |

---

### `legal_memo_templates`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `created_by` | string |
| `id` | string |
| `memo_type` | string |
| `template_content` | string |
| `template_name` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `is_active` | boolean | Yes |
| `is_default` | boolean | Yes |
| `template_name_ar` | string | Yes |
| `variables` | Json | Yes |

---

### `legal_memos`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `content` | string |
| `created_at` | string |
| `created_by` | string |
| `customer_id` | string |
| `id` | string |
| `memo_number` | string |
| `memo_type` | string |
| `status` | string |
| `title` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_by` | string | Yes |
| `data_sources` | Json | Yes |
| `generated_by_ai` | boolean | Yes |
| `recommendations` | Json | Yes |
| `sent_at` | string | Yes |
| `template_id` | string | Yes |

---

### `qatar_legal_texts`

**Columns**: 19

#### Required Columns

| Column | Type |
|--------|------|
| `article_text_ar` | string |
| `id` | number |
| `law_type` | string |
| `title_ar` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `article_number` | string | Yes |
| `article_text_en` | string | Yes |
| `article_title_ar` | string | Yes |
| `chapter_number` | string | Yes |
| `chapter_title` | string | Yes |
| `created_at` | string | Yes |
| `is_active` | boolean | Yes |
| `keywords` | string[] | Yes |
| `law_number` | string | Yes |
| `part_number` | string | Yes |
| `part_title` | string | Yes |
| `source_url` | string | Yes |
| `title_en` | string | Yes |
| `updated_at` | string | Yes |
| `year` | number | Yes |

---

### `traffic_violation_payments`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `payment_date` | string |
| `payment_method` | string |
| `payment_number` | string |
| `payment_type` | string |
| `status` | string |
| `traffic_violation_id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `bank_account` | string | Yes |
| `check_number` | string | Yes |
| `created_by` | string | Yes |
| `journal_entry_id` | string | Yes |
| `notes` | string | Yes |
| `reference_number` | string | Yes |

---

### `traffic_violations`

**Columns**: 23

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `fine_amount` | number |
| `id` | string |
| `status` | string |
| `total_amount` | number |
| `updated_at` | string |
| `vehicle_id` | string |
| `violation_date` | string |
| `violation_number` | string |
| `violation_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `contract_id` | string | Yes |
| `issuing_authority` | string | Yes |
| `location` | string | Yes |
| `notes` | string | Yes |
| `payment_date` | string | Yes |
| `payment_method` | string | Yes |
| `violation_description` | string | Yes |
| `violation_time` | string | Yes |
| `reference_number` | string | Yes |
| `match_confidence` | 'high' | Yes |
| `import_source` | 'moi_pdf' | Yes |
| `file_number` | string | Yes |

---

## HR Domain

### `attendance_records`

**Columns**: 23

#### Required Columns

| Column | Type |
|--------|------|
| `attendance_date` | string |
| `created_at` | string |
| `employee_id` | string |
| `id` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `auto_checkout` | boolean | Yes |
| `break_end_time` | string | Yes |
| `break_start_time` | string | Yes |
| `check_in_latitude` | number | Yes |
| `check_in_longitude` | number | Yes |
| `check_in_time` | string | Yes |
| `check_out_latitude` | number | Yes |
| `check_out_longitude` | number | Yes |
| `check_out_time` | string | Yes |
| `is_approved` | boolean | Yes |
| `late_hours` | number | Yes |
| `location_verified` | boolean | Yes |
| `notes` | string | Yes |
| `overtime_hours` | number | Yes |
| `total_hours` | number | Yes |

---

### `employees`

**Columns**: 32

#### Required Columns

| Column | Type |
|--------|------|
| `basic_salary` | number |
| `company_id` | string |
| `created_at` | string |
| `employee_number` | string |
| `first_name` | string |
| `hire_date` | string |
| `id` | string |
| `last_name` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `account_status` | string | Yes |
| `address` | string | Yes |
| `address_ar` | string | Yes |
| `allowances` | number | Yes |
| `bank_account` | string | Yes |
| `created_by` | string | Yes |
| `department` | string | Yes |
| `department_ar` | string | Yes |
| `email` | string | Yes |
| `emergency_contact_name` | string | Yes |
| `emergency_contact_phone` | string | Yes |
| `first_name_ar` | string | Yes |
| `has_system_access` | boolean | Yes |
| `iban` | string | Yes |
| `is_active` | boolean | Yes |
| `last_name_ar` | string | Yes |
| `national_id` | string | Yes |
| `notes` | string | Yes |
| `phone` | string | Yes |
| `position` | string | Yes |
| `position_ar` | string | Yes |
| `termination_date` | string | Yes |
| `user_id` | string | Yes |

---

### `hr_settings`

**Columns**: 20

#### Required Columns

| Column | Type |
|--------|------|
| `allow_negative_balance` | boolean |
| `auto_calculate_overtime` | boolean |
| `company_id` | string |
| `created_at` | string |
| `daily_working_hours` | number |
| `email_notifications` | boolean |
| `id` | string |
| `late_penalty_per_hour` | number |
| `late_threshold_minutes` | number |
| `overtime_rate_percentage` | number |
| `pay_date` | number |
| `payroll_frequency` | string |
| `require_manager_approval` | boolean |
| `sms_notifications` | boolean |
| `social_security_rate` | number |
| `tax_rate` | number |
| `updated_at` | string |
| `work_end_time` | string |
| `work_start_time` | string |
| `working_days_per_week` | number |

---

### `leave_balances`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `employee_id` | string |
| `id` | string |
| `leave_type_id` | string |
| `year` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `remaining_days` | number | Yes |
| `total_days` | number | Yes |
| `updated_at` | string | Yes |
| `used_days` | number | Yes |

---

### `leave_requests`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `employee_id` | string |
| `end_date` | string |
| `id` | string |
| `leave_type_id` | string |
| `start_date` | string |
| `total_days` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `applied_date` | string | Yes |
| `attachment_url` | string | Yes |
| `covering_employee_id` | string | Yes |
| `created_at` | string | Yes |
| `emergency_contact` | string | Yes |
| `reason` | string | Yes |
| `review_notes` | string | Yes |
| `reviewed_at` | string | Yes |
| `reviewed_by` | string | Yes |
| `status` | string | Yes |
| `updated_at` | string | Yes |

---

### `leave_types`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `type_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `description` | string | Yes |
| `is_active` | boolean | Yes |
| `is_paid` | boolean | Yes |
| `max_days_per_year` | number | Yes |
| `requires_approval` | boolean | Yes |
| `type_name_ar` | string | Yes |
| `updated_at` | string | Yes |

---

### `payroll`

**Columns**: 21

#### Required Columns

| Column | Type |
|--------|------|
| `basic_salary` | number |
| `company_id` | string |
| `created_at` | string |
| `employee_id` | string |
| `id` | string |
| `net_amount` | number |
| `pay_period_end` | string |
| `pay_period_start` | string |
| `payroll_date` | string |
| `payroll_number` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `allowances` | number | Yes |
| `bank_account` | string | Yes |
| `created_by` | string | Yes |
| `deductions` | number | Yes |
| `journal_entry_id` | string | Yes |
| `notes` | string | Yes |
| `overtime_amount` | number | Yes |
| `payment_method` | string | Yes |
| `tax_amount` | number | Yes |

---

### `payroll_reviews`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `period_end` | string |
| `period_start` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `created_by` | string | Yes |
| `journal_entry_id` | string | Yes |
| `net_amount` | number | Yes |
| `notes` | string | Yes |
| `reviewed_at` | string | Yes |
| `reviewed_by` | string | Yes |
| `total_amount` | number | Yes |
| `total_deductions` | number | Yes |
| `total_employees` | number | Yes |

---

### `payroll_settings`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `allow_negative_balance` | boolean | Yes |
| `auto_calculate_overtime` | boolean | Yes |
| `late_penalty_per_hour` | number | Yes |
| `overtime_rate` | number | Yes |
| `pay_date` | number | Yes |
| `payroll_frequency` | string | Yes |
| `social_security_rate` | number | Yes |
| `tax_rate` | number | Yes |
| `working_days_per_month` | number | Yes |
| `working_hours_per_day` | number | Yes |

---

### `payroll_slips`

**Columns**: 27

#### Required Columns

| Column | Type |
|--------|------|
| `basic_salary` | number |
| `created_at` | string |
| `employee_id` | string |
| `id` | string |
| `payroll_review_id` | string |
| `period_end` | string |
| `period_start` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `absent_days` | number | Yes |
| `allowances` | number | Yes |
| `bank_reference` | string | Yes |
| `late_days` | number | Yes |
| `late_penalty` | number | Yes |
| `net_salary` | number | Yes |
| `notes` | string | Yes |
| `other_deductions` | number | Yes |
| `overtime_amount` | number | Yes |
| `overtime_hours` | number | Yes |
| `paid_at` | string | Yes |
| `payment_method` | string | Yes |
| `present_days` | number | Yes |
| `social_security_deduction` | number | Yes |
| `tax_deduction` | number | Yes |
| `total_deductions` | number | Yes |
| `total_earnings` | number | Yes |
| `working_days` | number | Yes |

---

## System Domain

### `approval_notifications`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `message` | string |
| `notification_type` | string |
| `recipient_id` | string |
| `request_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `is_read` | boolean | Yes |
| `read_at` | string | Yes |
| `sent_at` | string | Yes |

---

### `audit_logs`

**Columns**: 22

#### Required Columns

| Column | Type |
|--------|------|
| `action` | string |
| `id` | string |
| `ip_address` | unknown |
| `resource_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `changes_summary` | string | Yes |
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `entity_name` | string | Yes |
| `error_message` | string | Yes |
| `metadata` | Json | Yes |
| `new_values` | Json | Yes |
| `notes` | string | Yes |
| `old_values` | Json | Yes |
| `request_method` | string | Yes |
| `request_path` | string | Yes |
| `resource_id` | string | Yes |
| `severity` | string | Yes |
| `status` | string | Yes |
| `user_agent` | string | Yes |
| `user_email` | string | Yes |
| `user_id` | string | Yes |
| `user_name` | string | Yes |

---

### `audit_trail`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `action` | string |
| `changed_at` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `record_id` | string |
| `table_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `changed_fields` | string[] | Yes |
| `description` | string | Yes |
| `ip_address` | string | Yes |
| `new_values` | Json | Yes |
| `old_values` | Json | Yes |
| `user_agent` | string | Yes |
| `user_email` | string | Yes |
| `user_id` | string | Yes |
| `user_name` | string | Yes |

---

### `background_jobs`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `data` | Json |
| `id` | string |
| `job_type` | string |
| `name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `completed_at` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `error` | string | Yes |
| `max_retries` | number | Yes |
| `priority` | number | Yes |
| `progress` | number | Yes |
| `result` | Json | Yes |
| `retries` | number | Yes |
| `started_at` | string | Yes |
| `status` | string | Yes |

---

### `compliance_audit_trail`

**Columns**: 19

#### Required Columns

| Column | Type |
|--------|------|
| `action_description` | string |
| `action_type` | string |
| `id` | string |
| `ip_address` | unknown |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `action_timestamp` | string | Yes |
| `company_id` | string | Yes |
| `compliance_impact` | string | Yes |
| `entity_id` | string | Yes |
| `entity_type` | string | Yes |
| `new_values` | Json | Yes |
| `old_values` | Json | Yes |
| `requires_review` | boolean | Yes |
| `review_notes` | string | Yes |
| `reviewed_at` | string | Yes |
| `reviewed_by` | string | Yes |
| `session_id` | string | Yes |
| `system_generated` | boolean | Yes |
| `user_agent` | string | Yes |
| `user_id` | string | Yes |

---

### `contract_notifications`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `contract_id` | string |
| `created_at` | string |
| `id` | string |
| `message` | string |
| `notification_type` | string |
| `recipient_id` | string |
| `title` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `delivery_status` | string | Yes |
| `recipient_email` | string | Yes |
| `recipient_phone` | string | Yes |
| `sent_at` | string | Yes |

---

### `cto_agent_audit`

**Columns**: 19

#### Required Columns

| Column | Type |
|--------|------|
| `actor` | string |
| `created_at` | string |
| `details` | Json |
| `id` | string |
| `repo` | string |
| `run_id` | string |
| `stage` | string |
| `status` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `branch` | string | Yes |
| `commit_sha` | string | Yes |
| `company_id` | string | Yes |
| `duration_ms` | number | Yes |
| `metrics` | Json | Yes |
| `pr_number` | number | Yes |
| `severity` | string | Yes |
| `violations` | Json | Yes |
| `waiver_approved_by` | string | Yes |
| `waiver_expires_at` | string | Yes |
| `waiver_reason` | string | Yes |

---

### `notification_settings`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |
| `user_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `email_notifications` | boolean | Yes |
| `expiry_reminder_days` | number | Yes |
| `renewal_reminder_days` | number | Yes |
| `sms_notifications` | boolean | Yes |

---

### `notifications`

**Columns**: 4

#### Required Columns

| Column | Type |
|--------|------|
| `id` | number |
| `message` | string |
| `title` | string |
| `type` | string |

---

### `system_alerts`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `alert_type` | string |
| `id` | string |
| `message` | string |
| `severity` | string |
| `title` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `acknowledged_at` | string | Yes |
| `acknowledged_by` | string | Yes |
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `details` | Json | Yes |
| `expires_at` | string | Yes |
| `resolved_at` | string | Yes |
| `status` | string | Yes |

---

### `system_analytics`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `category` | string |
| `date_recorded` | string |
| `id` | string |
| `metric_name` | string |
| `metric_type` | string |
| `metric_value` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `metadata` | Json | Yes |
| `time_period` | string | Yes |

---

### `system_logs`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `action` | string |
| `category` | string |
| `id` | string |
| `ip_address` | unknown |
| `level` | string |
| `message` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `duration_ms` | number | Yes |
| `metadata` | Json | Yes |
| `resource_id` | string | Yes |
| `resource_type` | string | Yes |
| `session_id` | string | Yes |
| `user_agent` | string | Yes |
| `user_id` | string | Yes |

---

### `system_notifications`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `message` | string |
| `title` | string |
| `type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `action_label` | string | Yes |
| `action_url` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `expires_at` | string | Yes |
| `is_active` | boolean | Yes |
| `is_dismissible` | boolean | Yes |
| `message_ar` | string | Yes |
| `priority` | string | Yes |
| `target_audience` | string | Yes |
| `target_company_id` | string | Yes |
| `title_ar` | string | Yes |

---

### `system_settings`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `category` | string |
| `id` | string |
| `setting_key` | string |
| `setting_type` | string |
| `setting_value` | Json |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `description` | string | Yes |
| `description_ar` | string | Yes |
| `is_public` | boolean | Yes |
| `requires_restart` | boolean | Yes |
| `updated_at` | string | Yes |
| `updated_by` | string | Yes |

---

### `task_notifications`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `task_id` | string |
| `title` | string |
| `type` | string |
| `user_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `is_read` | boolean | Yes |
| `message` | string | Yes |
| `whatsapp_sent` | boolean | Yes |
| `whatsapp_sent_at` | string | Yes |

---

### `user_account_audit`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `action_type` | string |
| `company_id` | string |
| `employee_id` | string |
| `id` | string |
| `performed_at` | string |
| `performed_by` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `details` | Json | Yes |
| `new_values` | Json | Yes |
| `old_values` | Json | Yes |

---

### `user_notifications`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `is_read` | boolean |
| `message` | string |
| `notification_type` | string |
| `title` | string |
| `user_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `read_at` | string | Yes |
| `related_id` | string | Yes |
| `related_type` | string | Yes |

---

## Other Tables

### `adaptive_rules`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `rule_action` | string |
| `rule_condition` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `category` | string | Yes |
| `confidence` | number | Yes |
| `created_at` | string | Yes |
| `failure_count` | number | Yes |
| `is_active` | boolean | Yes |
| `priority` | number | Yes |
| `success_count` | number | Yes |
| `updated_at` | string | Yes |

---

### `advanced_late_fee_calculations`

**Columns**: 21

#### Required Columns

| Column | Type |
|--------|------|
| `days_overdue` | number |
| `id` | string |
| `months_overdue` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `ai_recommendations` | string[] | Yes |
| `calculated_by` | string | Yes |
| `calculation_date` | string | Yes |
| `calculation_method` | string | Yes |
| `company_id` | string | Yes |
| `contract_id` | string | Yes |
| `created_at` | string | Yes |
| `daily_fine_rate` | number | Yes |
| `final_fine_amount` | number | Yes |
| `monthly_breakdown` | Json | Yes |
| `monthly_cap_amount` | number | Yes |
| `monthly_cap_applied` | boolean | Yes |
| `original_due_date` | string | Yes |
| `payment_history_summary` | string | Yes |
| `payment_id` | string | Yes |
| `raw_daily_fine` | number | Yes |
| `risk_level` | string | Yes |
| `updated_at` | string | Yes |

---

### `agreements_with_details`

**Columns**: 29

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `agreement_number` | string | Yes |
| `created_at` | string | Yes |
| `customer_driver_license` | string | Yes |
| `customer_email` | string | Yes |
| `customer_name` | string | Yes |
| `customer_phone` | string | Yes |
| `end_date` | string | Yes |
| `fines_summary` | string | Yes |
| `first_payment_date` | string | Yes |
| `last_payment_date` | string | Yes |
| `license_plate` | string | Yes |
| `make` | string | Yes |
| `model` | string | Yes |
| `paid_fines_amount` | number | Yes |
| `payment_count` | number | Yes |
| `payment_summary` | string | Yes |
| `pending_fines_amount` | number | Yes |
| `rent_amount` | number | Yes |
| `start_date` | string | Yes |
| `status` | string | Yes |
| `total_amount` | number | Yes |
| `total_fines` | number | Yes |
| `total_fines_amount` | number | Yes |
| `total_late_fees_paid` | number | Yes |
| `total_paid_amount` | number | Yes |
| `updated_at` | string | Yes |
| `vehicle_status` | string | Yes |
| `year` | number | Yes |

---

### `ai_activity_logs`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `activity_type` | string |
| `created_at` | string |
| `id` | string |
| `timestamp` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `company_id` | string | Yes |
| `details` | Json | Yes |
| `session_id` | string | Yes |
| `user_id` | string | Yes |

---

### `ai_analysis_results`

**Columns**: 7

#### Required Columns

| Column | Type |
|--------|------|
| `analysis_type` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `results` | Json |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `confidence_score` | number | Yes |
| `created_by` | string | Yes |

---

### `ai_clarification_sessions`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `clarification_questions` | Json |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `original_query` | string |
| `session_status` | string |
| `user_responses` | Json |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `completed_at` | string | Yes |
| `created_by` | string | Yes |
| `final_intent` | string | Yes |

---

### `ai_learning_feedback`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `feedback_type` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `clarification_session_id` | string | Yes |
| `created_by` | string | Yes |
| `feedback_comments` | string | Yes |
| `feedback_rating` | number | Yes |
| `improvement_suggestions` | Json | Yes |
| `query_intent_id` | string | Yes |

---

### `ai_learning_patterns`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `pattern_data` | Json |
| `pattern_type` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `is_active` | boolean | Yes |
| `last_used_at` | string | Yes |
| `success_rate` | number | Yes |
| `usage_count` | number | Yes |

---

### `ai_performance_metrics`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `metric_date` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `clarification_requests` | number | Yes |
| `learning_improvements` | number | Yes |
| `response_time_avg` | number | Yes |
| `successful_classifications` | number | Yes |
| `total_queries` | number | Yes |
| `user_satisfaction_avg` | number | Yes |

---

### `ai_query_intents`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `intent_classification` | string |
| `original_query` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `confidence_score` | number | Yes |
| `context_data` | Json | Yes |
| `created_by` | string | Yes |
| `normalized_query` | string | Yes |
| `user_confirmed` | boolean | Yes |

---

### `amendment_change_log`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `amendment_id` | string |
| `created_at` | string |
| `field_name` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `change_impact` | string | Yes |
| `field_label_ar` | string | Yes |
| `new_value` | string | Yes |
| `old_value` | string | Yes |
| `value_type` | string | Yes |

---

### `aml_kyc_diligence`

**Columns**: 27

#### Required Columns

| Column | Type |
|--------|------|
| `entity_id` | string |
| `entity_name` | string |
| `entity_type` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `adverse_media_findings` | number | Yes |
| `approval_required` | boolean | Yes |
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `documents_verified` | string[] | Yes |
| `due_diligence_level` | string | Yes |
| `enhanced_due_diligence` | boolean | Yes |
| `last_review_date` | string | Yes |
| `mitigating_factors` | Json | Yes |
| `next_review_date` | string | Yes |
| `notes` | string | Yes |
| `ongoing_monitoring` | boolean | Yes |
| `pep_status` | string | Yes |
| `risk_factors` | Json | Yes |
| `risk_rating` | string | Yes |
| `sanctions_status` | string | Yes |
| `screening_results` | Json | Yes |
| `updated_at` | string | Yes |
| `verification_method` | string | Yes |
| `verification_score` | number | Yes |
| `verification_status` | string | Yes |

---

### `approval_requests`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `request_number` | string |
| `requested_by` | string |
| `source_type` | Database["public"]["Enums"]["request_source"] |
| `title` | string |
| `workflow_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `completed_at` | string | Yes |
| `created_at` | string | Yes |
| `current_step_order` | number | Yes |
| `description` | string | Yes |
| `metadata` | Json | Yes |
| `priority` | Database["public"]["Enums"]["approval_priority"] | Yes |
| `source_id` | string | Yes |
| `status` | Database["public"]["Enums"]["approval_status"] | Yes |
| `total_amount` | number | Yes |
| `updated_at` | string | Yes |

---

### `approval_steps`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `approver_type` | string |
| `approver_value` | string |
| `id` | string |
| `request_id` | string |
| `step_order` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_at` | string | Yes |
| `approver_id` | string | Yes |
| `comments` | string | Yes |
| `created_at` | string | Yes |
| `status` | Database["public"]["Enums"]["approval_status"] | Yes |

---

### `approval_templates`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `contract_type` | string |
| `created_at` | string |
| `id` | string |
| `steps` | Json |
| `template_name` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `is_active` | boolean | Yes |
| `max_amount` | number | Yes |
| `min_amount` | number | Yes |

---

### `approval_workflows`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `source_type` | Database["public"]["Enums"]["request_source"] |
| `steps` | Json |
| `workflow_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `conditions` | Json | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `is_active` | boolean | Yes |
| `updated_at` | string | Yes |
| `workflow_name_ar` | string | Yes |

---

### `backup_logs`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `backup_type` | string |
| `id` | string |
| `status` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `company_id` | string | Yes |
| `completed_at` | string | Yes |
| `created_at` | string | Yes |
| `error_message` | string | Yes |
| `file_path` | string | Yes |
| `file_size_bytes` | number | Yes |
| `metadata` | Json | Yes |
| `records_count` | number | Yes |
| `started_at` | string | Yes |

---

### `branches`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `branch_code` | string |
| `branch_name` | string |
| `company_id` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `address` | string | Yes |
| `address_ar` | string | Yes |
| `branch_name_ar` | string | Yes |
| `created_at` | string | Yes |
| `email` | string | Yes |
| `is_active` | boolean | Yes |
| `manager_id` | string | Yes |
| `phone` | string | Yes |
| `updated_at` | string | Yes |

---

### `budget_alerts`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `alert_type` | string |
| `amount_exceeded` | number |
| `budget_id` | string |
| `company_id` | string |
| `created_at` | string |
| `current_percentage` | number |
| `id` | string |
| `message` | string |
| `threshold_percentage` | number |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `acknowledged_at` | string | Yes |
| `acknowledged_by` | string | Yes |
| `budget_item_id` | string | Yes |
| `is_acknowledged` | boolean | Yes |
| `message_ar` | string | Yes |

---

### `budget_items`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `account_id` | string |
| `budget_id` | string |
| `budgeted_amount` | number |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `actual_amount` | number | Yes |
| `notes` | string | Yes |
| `variance_amount` | number | Yes |
| `variance_percentage` | number | Yes |

---

### `business_templates`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `business_type` | string |
| `default_modules` | string[] |
| `id` | string |
| `template_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `color_scheme` | Json | Yes |
| `created_at` | string | Yes |
| `default_chart_accounts` | Json | Yes |
| `default_settings` | Json | Yes |
| `description` | string | Yes |
| `description_ar` | string | Yes |
| `icon_name` | string | Yes |
| `is_active` | boolean | Yes |
| `template_name_ar` | string | Yes |
| `updated_at` | string | Yes |

---

### `company_branding_settings`

**Columns**: 22

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `accent_color` | string | Yes |
| `background_color` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `custom_css` | string | Yes |
| `favicon_url` | string | Yes |
| `font_family` | string | Yes |
| `is_active` | boolean | Yes |
| `logo_url` | string | Yes |
| `primary_color` | string | Yes |
| `secondary_color` | string | Yes |
| `sidebar_accent_color` | string | Yes |
| `sidebar_background_color` | string | Yes |
| `sidebar_border_color` | string | Yes |
| `sidebar_foreground_color` | string | Yes |
| `system_name` | string | Yes |
| `system_name_ar` | string | Yes |
| `text_color` | string | Yes |
| `theme_preset` | string | Yes |
| `updated_at` | string | Yes |

---

### `compliance_calendar`

**Columns**: 19

#### Required Columns

| Column | Type |
|--------|------|
| `due_date` | string |
| `event_title` | string |
| `event_type` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `company_id` | string | Yes |
| `completion_date` | string | Yes |
| `completion_notes` | string | Yes |
| `created_at` | string | Yes |
| `event_description` | string | Yes |
| `file_attachments` | string[] | Yes |
| `jurisdiction` | string | Yes |
| `priority` | string | Yes |
| `recurring_end_date` | string | Yes |
| `recurring_pattern` | string | Yes |
| `reminder_days` | number | Yes |
| `responsible_user_id` | string | Yes |
| `status` | string | Yes |
| `tags` | string[] | Yes |
| `updated_at` | string | Yes |

---

### `compliance_rules`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `rule_category` | string |
| `rule_code` | string |
| `rule_config` | Json |
| `rule_name` | string |
| `rule_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `auto_execute` | boolean | Yes |
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `execution_frequency` | string | Yes |
| `is_active` | boolean | Yes |
| `jurisdiction` | string | Yes |
| `notification_config` | Json | Yes |
| `rule_description` | string | Yes |
| `severity_level` | string | Yes |
| `updated_at` | string | Yes |
| `version` | number | Yes |

---

### `compliance_validations`

**Columns**: 19

#### Required Columns

| Column | Type |
|--------|------|
| `entity_id` | string |
| `entity_type` | string |
| `id` | string |
| `validation_result` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `action_deadline` | string | Yes |
| `action_description` | string | Yes |
| `action_required` | boolean | Yes |
| `assigned_to` | string | Yes |
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `entity_reference` | string | Yes |
| `review_notes` | string | Yes |
| `reviewed_at` | string | Yes |
| `reviewed_by` | string | Yes |
| `risk_assessment` | string | Yes |
| `rule_id` | string | Yes |
| `validated_at` | string | Yes |
| `validation_details` | Json | Yes |
| `validation_score` | number | Yes |

---

### `csv_file_archives`

**Columns**: 22

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `file_name` | string |
| `file_size_bytes` | number |
| `id` | string |
| `original_file_name` | string |
| `processing_status` | string |
| `updated_at` | string |
| `upload_type` | string |
| `uploaded_at` | string |
| `uploaded_by` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_contracts_ids` | string[] | Yes |
| `error_details` | Json | Yes |
| `failed_rows` | number | Yes |
| `file_content` | string | Yes |
| `is_archived` | boolean | Yes |
| `metadata` | Json | Yes |
| `processing_results` | Json | Yes |
| `storage_bucket` | string | Yes |
| `storage_path` | string | Yes |
| `successful_rows` | number | Yes |
| `total_rows` | number | Yes |

---

### `csv_templates`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `entity_type` | string |
| `headers` | string[] |
| `id` | string |
| `template_name` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_by` | string | Yes |
| `description` | string | Yes |
| `description_ar` | string | Yes |
| `field_mappings` | Json | Yes |
| `is_active` | boolean | Yes |
| `is_default` | boolean | Yes |
| `last_used_at` | string | Yes |
| `sample_data` | Json | Yes |
| `template_name_ar` | string | Yes |
| `usage_count` | number | Yes |
| `validation_rules` | Json | Yes |

---

### `cto_deploy_gates`

**Columns**: 20

#### Required Columns

| Column | Type |
|--------|------|
| `build_passed` | boolean |
| `coverage_passed` | boolean |
| `created_at` | string |
| `environment` | string |
| `gate_status` | string |
| `id` | string |
| `lint_passed` | boolean |
| `run_id` | string |
| `security_passed` | boolean |
| `tests_passed` | boolean |
| `triggered_by` | string |
| `typecheck_passed` | boolean |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `build_time_seconds` | number | Yes |
| `bundle_size_kb` | number | Yes |
| `coverage_percent` | number | Yes |
| `deployed_at` | string | Yes |
| `notes` | string | Yes |
| `rejection_reason` | string | Yes |

---

### `cto_quality_metrics`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `created_at` | string |
| `id` | string |
| `metric_date` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `avg_build_time_seconds` | number | Yes |
| `avg_bundle_size_kb` | number | Yes |
| `avg_coverage` | number | Yes |
| `avg_pr_review_hours` | number | Yes |
| `blocked_deploys` | number | Yes |
| `critical_violations` | number | Yes |
| `failed_deploys` | number | Yes |
| `merged_prs` | number | Yes |
| `successful_deploys` | number | Yes |
| `total_deploys` | number | Yes |
| `total_prs` | number | Yes |
| `total_violations` | number | Yes |
| `warning_violations` | number | Yes |

---

### `cto_waivers`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `created_at` | string |
| `expires_at` | string |
| `id` | string |
| `reason` | string |
| `requested_by` | string |
| `rule_id` | string |
| `rule_name` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_by` | string | Yes |
| `branch` | string | Yes |
| `pr_number` | number | Yes |
| `used_at` | string | Yes |
| `used_in_run_id` | string | Yes |

---

### `dashboard_widgets`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `data_source` | Json |
| `id` | string |
| `visualization_config` | Json |
| `widget_name` | string |
| `widget_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `is_active` | boolean | Yes |
| `position` | Json | Yes |
| `refresh_interval` | number | Yes |
| `updated_at` | string | Yes |

---

### `default_cost_centers`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `center_code` | string |
| `center_name` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `center_name_ar` | string | Yes |
| `description` | string | Yes |
| `is_active` | boolean | Yes |
| `sort_order` | number | Yes |

---

### `demo_sessions`

**Columns**: 7

#### Required Columns

| Column | Type |
|--------|------|
| `created_at` | string |
| `demo_user_id` | string |
| `id` | string |
| `is_active` | boolean |
| `trial_end_date` | string |
| `trial_start_date` | string |
| `updated_at` | string |

---

### `document_expiry_alerts`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `alert_type` | string |
| `company_id` | string |
| `contract_id` | string |
| `contract_number` | string |
| `created_at` | string |
| `customer_id` | string |
| `customer_name` | string |
| `days_until_expiry` | number |
| `document_type` | string |
| `expiry_date` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `acknowledged_at` | string | Yes |
| `acknowledged_by` | string | Yes |
| `is_acknowledged` | boolean | Yes |

---

### `driver_assignments`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `contract_id` | string |
| `customer_name` | string |
| `driver_id` | string |
| `dropoff_location` | string |
| `end_date` | string |
| `id` | string |
| `pickup_location` | string |
| `start_date` | string |
| `vehicle_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `commission_amount` | number | Yes |
| `created_at` | string | Yes |
| `notes` | string | Yes |
| `status` | string | Yes |
| `trip_distance` | number | Yes |
| `updated_at` | string | Yes |

---

### `event_subscriptions`

**Columns**: 7

#### Required Columns

| Column | Type |
|--------|------|
| `event_type` | string |
| `handler_name` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `is_active` | boolean | Yes |
| `priority` | number | Yes |

---

### `events`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `data` | Json |
| `event_type` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `entity_id` | string | Yes |
| `entity_type` | string | Yes |
| `metadata` | Json | Yes |
| `user_id` | string | Yes |

---

### `feature_gates`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `feature_code` | string |
| `feature_name` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `description` | string | Yes |
| `is_active` | boolean | Yes |
| `required_plans` | string[] | Yes |
| `updated_at` | string | Yes |

---

### `fleet_reports`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `report_config` | Json |
| `report_name` | string |
| `report_type` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_by` | string | Yes |
| `is_scheduled` | boolean | Yes |
| `last_generated_at` | string | Yes |
| `report_name_ar` | string | Yes |
| `schedule_config` | Json | Yes |

---

### `goods_receipt_items`

**Columns**: 6

#### Required Columns

| Column | Type |
|--------|------|
| `created_at` | string |
| `goods_receipt_id` | string |
| `id` | string |
| `purchase_order_item_id` | string |
| `received_quantity` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `notes` | string | Yes |

---

### `goods_receipts`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `purchase_order_id` | string |
| `receipt_date` | string |
| `receipt_number` | string |
| `received_by` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `delivery_note_number` | string | Yes |
| `notes` | string | Yes |

---

### `knowledge_base_articles`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `content` | string |
| `content_ar` | string |
| `created_by` | string |
| `id` | string |
| `title` | string |
| `title_ar` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `category_id` | string | Yes |
| `created_at` | string | Yes |
| `helpful_count` | number | Yes |
| `is_published` | boolean | Yes |
| `not_helpful_count` | number | Yes |
| `tags` | string[] | Yes |
| `updated_at` | string | Yes |
| `view_count` | number | Yes |

---

### `landing_ab_tests`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `test_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `company_id` | string | Yes |
| `conversion_goal` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `end_date` | string | Yes |
| `is_active` | boolean | Yes |
| `start_date` | string | Yes |
| `status` | string | Yes |
| `test_name_ar` | string | Yes |
| `traffic_split` | number | Yes |
| `updated_at` | string | Yes |
| `variant_a_config` | Json | Yes |
| `variant_b_config` | Json | Yes |
| `winner_variant` | string | Yes |

---

### `landing_analytics`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `event_type` | string |
| `id` | string |
| `ip_address` | unknown |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `city` | string | Yes |
| `company_id` | string | Yes |
| `country` | string | Yes |
| `created_at` | string | Yes |
| `device_type` | string | Yes |
| `event_data` | Json | Yes |
| `page_path` | string | Yes |
| `referrer` | string | Yes |
| `session_id` | string | Yes |
| `user_agent` | string | Yes |
| `visitor_id` | string | Yes |

---

### `landing_content`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `content_key` | string |
| `content_type` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `content_value` | string | Yes |
| `content_value_ar` | string | Yes |
| `created_at` | string | Yes |
| `is_active` | boolean | Yes |
| `link_url` | string | Yes |
| `media_url` | string | Yes |
| `metadata` | Json | Yes |
| `section_id` | string | Yes |
| `sort_order` | number | Yes |
| `updated_at` | string | Yes |

---

### `landing_media`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `file_name` | string |
| `file_path` | string |
| `file_type` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `alt_text` | string | Yes |
| `alt_text_ar` | string | Yes |
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `file_size` | number | Yes |
| `is_active` | boolean | Yes |
| `mime_type` | string | Yes |
| `tags` | string[] | Yes |
| `updated_at` | string | Yes |
| `uploaded_by` | string | Yes |

---

### `landing_sections`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `section_name` | string |
| `section_type` | string |
| `settings` | Json |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `is_active` | boolean | Yes |
| `section_name_ar` | string | Yes |
| `sort_order` | number | Yes |
| `updated_at` | string | Yes |

---

### `landing_settings`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `setting_key` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `is_active` | boolean | Yes |
| `setting_value` | Json | Yes |
| `updated_at` | string | Yes |

---

### `landing_themes`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `colors` | Json |
| `fonts` | Json |
| `id` | string |
| `spacing` | Json |
| `theme_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `custom_css` | string | Yes |
| `is_active` | boolean | Yes |
| `is_default` | boolean | Yes |
| `theme_name_ar` | string | Yes |
| `updated_at` | string | Yes |

---

### `late_fee_history`

**Columns**: 6

#### Required Columns

| Column | Type |
|--------|------|
| `action` | string |
| `created_at` | string |
| `id` | string |
| `late_fee_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `notes` | string | Yes |
| `user_id` | string | Yes |

---

### `late_fee_rules`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `fee_amount` | number |
| `fee_type` | string |
| `id` | string |
| `rule_name` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `apply_to_invoice_types` | string[] | Yes |
| `grace_period_days` | number | Yes |
| `is_active` | boolean | Yes |
| `max_fee_amount` | number | Yes |

---

### `late_fees`

**Columns**: 22

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `days_overdue` | number |
| `fee_amount` | number |
| `fee_type` | string |
| `id` | string |
| `invoice_id` | string |
| `original_amount` | number |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `applied_at` | string | Yes |
| `applied_by` | string | Yes |
| `contract_id` | string | Yes |
| `customer_notified_at` | string | Yes |
| `late_fee_rule_id` | string | Yes |
| `notification_sent` | boolean | Yes |
| `waive_reason` | string | Yes |
| `waive_requested_at` | string | Yes |
| `waive_requested_by` | string | Yes |
| `waived_at` | string | Yes |
| `waived_by` | string | Yes |
| `waiver_approval_notes` | string | Yes |

---

### `late_fine_settings`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `fine_rate` | number |
| `fine_type` | string |
| `grace_period_days` | number |
| `id` | string |
| `is_active` | boolean |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `max_fine_amount` | number | Yes |

---

### `learning_interactions`

**Columns**: 19

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `query` | string |
| `response` | string |
| `session_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `accurate` | boolean | Yes |
| `cache_hit` | boolean | Yes |
| `confidence_score` | number | Yes |
| `context_data` | Json | Yes |
| `created_at` | string | Yes |
| `feedback_comments` | string | Yes |
| `helpful` | boolean | Yes |
| `intent` | string | Yes |
| `rating` | number | Yes |
| `relevant` | boolean | Yes |
| `response_time_ms` | number | Yes |
| `sources_used` | Json | Yes |
| `updated_at` | string | Yes |
| `user_id` | string | Yes |

---

### `learning_patterns`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `pattern` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `average_rating` | number | Yes |
| `category` | string | Yes |
| `created_at` | string | Yes |
| `examples` | Json | Yes |
| `frequency` | number | Yes |
| `last_seen` | string | Yes |
| `success_rate` | number | Yes |
| `updated_at` | string | Yes |

---

### `maintenance_checklist`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `item_name` | string |
| `maintenance_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `completed_at` | string | Yes |
| `completed_by` | string | Yes |
| `created_at` | string | Yes |
| `is_completed` | boolean | Yes |
| `item_description` | string | Yes |
| `notes` | string | Yes |

---

### `module_settings`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `module_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `is_enabled` | boolean | Yes |
| `last_updated` | string | Yes |
| `module_config` | Json | Yes |
| `updated_by` | string | Yes |
| `version` | string | Yes |

---

### `orders`

**Columns**: 4

#### Required Columns

| Column | Type |
|--------|------|
| `id` | number |
| `status` | string |
| `subtotal` | number |
| `total` | number |

---

### `parts`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `category` | string |
| `condition` | string |
| `id` | number |
| `name` | string |
| `price` | number |
| `stock` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `brand` | string | Yes |
| `description` | string | Yes |
| `specifications` | string | Yes |

---

### `penalties`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `id` | string |
| `penalty_date` | string |
| `penalty_number` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `contract_id` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `customer_id` | string | Yes |
| `location` | string | Yes |
| `notes` | string | Yes |
| `payment_status` | string | Yes |
| `reason` | string | Yes |
| `status` | string | Yes |
| `updated_at` | string | Yes |
| `vehicle_id` | string | Yes |
| `vehicle_plate` | string | Yes |
| `violation_type` | string | Yes |

---

### `performance_metrics`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `metric_name` | string |
| `metric_value` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `metric_unit` | string | Yes |
| `recorded_at` | string | Yes |
| `tags` | Json | Yes |

---

### `permission_change_requests`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `employee_id` | string |
| `expires_at` | string |
| `id` | string |
| `reason` | string |
| `request_type` | string |
| `requested_by` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `current_permissions` | string[] | Yes |
| `current_roles` | string[] | Yes |
| `rejection_reason` | string | Yes |
| `requested_permissions` | string[] | Yes |
| `requested_roles` | string[] | Yes |
| `reviewed_at` | string | Yes |
| `reviewed_by` | string | Yes |

---

### `properties`

**Columns**: 31

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `property_code` | string |
| `property_name` | string |
| `property_status` | string |
| `property_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `address` | string | Yes |
| `address_ar` | string | Yes |
| `area_sqm` | number | Yes |
| `bathrooms` | number | Yes |
| `bedrooms` | number | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `currency` | string | Yes |
| `description` | string | Yes |
| `description_ar` | string | Yes |
| `documents` | string[] | Yes |
| `features` | Json | Yes |
| `floor_number` | number | Yes |
| `furnished` | boolean | Yes |
| `images` | string[] | Yes |
| `is_active` | boolean | Yes |
| `location_coordinates` | Json | Yes |
| `manager_id` | string | Yes |
| `owner_id` | string | Yes |
| `parking_spaces` | number | Yes |
| `property_name_ar` | string | Yes |
| `rental_price` | number | Yes |
| `sale_price` | number | Yes |
| `total_floors` | number | Yes |
| `updated_at` | string | Yes |

---

### `property_maintenance`

**Columns**: 32

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `maintenance_number` | string |
| `maintenance_type` | string |
| `priority` | string |
| `property_id` | string |
| `requested_date` | string |
| `status` | string |
| `title` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `actual_cost` | number | Yes |
| `assigned_to` | string | Yes |
| `completion_date` | string | Yes |
| `completion_notes` | string | Yes |
| `contractor_name` | string | Yes |
| `contractor_phone` | string | Yes |
| `created_by` | string | Yes |
| `currency` | string | Yes |
| `description` | string | Yes |
| `description_ar` | string | Yes |
| `documents` | string[] | Yes |
| `estimated_cost` | number | Yes |
| `images` | string[] | Yes |
| `is_active` | boolean | Yes |
| `location_details` | string | Yes |
| `notes` | string | Yes |
| `quality_rating` | number | Yes |
| `required_materials` | string[] | Yes |
| `scheduled_date` | string | Yes |
| `start_date` | string | Yes |
| `title_ar` | string | Yes |

---

### `property_owners`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `full_name` | string |
| `id` | string |
| `owner_code` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `address` | string | Yes |
| `address_ar` | string | Yes |
| `bank_account_info` | Json | Yes |
| `civil_id` | string | Yes |
| `commission_percentage` | number | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `email` | string | Yes |
| `full_name_ar` | string | Yes |
| `is_active` | boolean | Yes |
| `nationality` | string | Yes |
| `notes` | string | Yes |
| `phone` | string | Yes |
| `updated_at` | string | Yes |

---

### `quotation_approval_log`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `action` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `quotation_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `client_ip` | string | Yes |
| `client_user_agent` | string | Yes |
| `comments` | string | Yes |

---

### `quotations`

**Columns**: 22

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `customer_id` | string |
| `duration` | number |
| `id` | string |
| `quotation_number` | string |
| `quotation_type` | string |
| `rate_per_unit` | number |
| `status` | string |
| `total_amount` | number |
| `updated_at` | string |
| `valid_until` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approval_expires_at` | string | Yes |
| `approval_token` | string | Yes |
| `approved_at` | string | Yes |
| `approved_by_client` | boolean | Yes |
| `client_approval_url` | string | Yes |
| `client_comments` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `terms` | string | Yes |
| `vehicle_id` | string | Yes |

---

### `rate_limits`

**Columns**: 7

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `operation_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `attempt_count` | number | Yes |
| `blocked_until` | string | Yes |
| `created_at` | string | Yes |
| `user_id` | string | Yes |
| `window_start` | string | Yes |

---

### `regulatory_reports`

**Columns**: 24

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `jurisdiction` | string |
| `report_data` | Json |
| `report_type` | string |
| `reporting_period_end` | string |
| `reporting_period_start` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `approved_at` | string | Yes |
| `approved_by` | string | Yes |
| `company_id` | string | Yes |
| `compliance_score` | number | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `file_attachments` | string[] | Yes |
| `findings_count` | number | Yes |
| `rejection_reason` | string | Yes |
| `report_subtype` | string | Yes |
| `report_summary` | string | Yes |
| `status` | string | Yes |
| `submission_date` | string | Yes |
| `submission_deadline` | string | Yes |
| `submission_method` | string | Yes |
| `submission_reference` | string | Yes |
| `updated_at` | string | Yes |
| `violations_count` | number | Yes |

---

### `reminder_history`

**Columns**: 13

#### Required Columns

| Column | Type |
|--------|------|
| `action` | string |
| `created_at` | string |
| `id` | string |
| `reminder_schedule_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `contract_id` | string | Yes |
| `customer_id` | string | Yes |
| `error_message` | string | Yes |
| `message_sent` | string | Yes |
| `phone_number` | string | Yes |
| `reminder_type` | string | Yes |
| `sent_at` | string | Yes |
| `success` | boolean | Yes |
| `user_id` | string | Yes |

---

### `reminder_schedules`

**Columns**: 49

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `customer_id` | string |
| `id` | string |
| `invoice_id` | string |
| `reminder_type` | string |
| `scheduled_date` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `channel` | string | Yes |
| `clicked_at` | string | Yes |
| `created_by` | string | Yes |
| `customer_name` | string | Yes |
| `delivery_status` | string | Yes |
| `email_address` | string | Yes |
| `last_error` | string | Yes |
| `message_template` | string | Yes |
| `message_variables` | Json | Yes |
| `next_retry_at` | string | Yes |
| `opened_at` | string | Yes |
| `phone_number` | string | Yes |
| `responded_at` | string | Yes |
| `retry_count` | number | Yes |
| `scheduled_time` | string | Yes |
| `send_cost` | number | Yes |
| `sent_at` | string | Yes |
| `sent_by` | string | Yes |
| `subject` | string | Yes |
| `template_id` | string | Yes |
| `variant` | string | Yes |
| `company_id` | string | Yes |
| `created_at` | string | Yes |
| `customer_id` | string | Yes |
| `customer_name` | string | Yes |
| `error_message` | string | Yes |
| `id` | string | Yes |
| `invoice_id` | string | Yes |
| `message_template` | string | Yes |
| `message_variables` | Json | Yes |
| `phone_number` | string | Yes |
| `receipt_id` | string | Yes |
| `reminder_type` | string | Yes |
| `retry_count` | number | Yes |
| `scheduled_date` | string | Yes |
| `scheduled_time` | string | Yes |
| `sent_at` | string | Yes |
| `status` | string | Yes |
| `template_id` | string | Yes |
| `updated_at` | string | Yes |

---

### `reminder_templates`

**Columns**: 54

#### Required Columns

| Column | Type |
|--------|------|
| `body` | string |
| `channel` | string |
| `company_id` | string |
| `id` | string |
| `name` | string |
| `stage` | string |
| `status` | string |
| `subject` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `avoid_holidays` | boolean | Yes |
| `avoid_weekends` | boolean | Yes |
| `clicked_count` | number | Yes |
| `conversion_rate` | number | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `is_active` | boolean | Yes |
| `is_default` | boolean | Yes |
| `language` | string | Yes |
| `opened_count` | number | Yes |
| `reminder_type` | string | Yes |
| `response_count` | number | Yes |
| `send_time_preference` | string | Yes |
| `sent_count` | number | Yes |
| `template_name` | string | Yes |
| `template_text` | string | Yes |
| `tone` | string | Yes |
| `updated_at` | string | Yes |
| `variant` | string | Yes |
| `avoid_holidays` | boolean | Yes |
| `avoid_weekends` | boolean | Yes |
| `body` | string | Yes |
| `channel` | string | Yes |
| `clicked_count` | number | Yes |
| `company_id` | string | Yes |
| `conversion_rate` | number | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `id` | string | Yes |
| `is_active` | boolean | Yes |
| `is_default` | boolean | Yes |
| `language` | string | Yes |
| `name` | string | Yes |
| `opened_count` | number | Yes |
| `reminder_type` | string | Yes |
| `response_count` | number | Yes |
| `send_time_preference` | string | Yes |
| `sent_count` | number | Yes |
| `stage` | string | Yes |
| `status` | string | Yes |
| `subject` | string | Yes |
| `template_name` | string | Yes |
| `template_text` | string | Yes |
| `tone` | string | Yes |
| `updated_at` | string | Yes |
| `variant` | string | Yes |

---

### `report_templates`

**Columns**: 12

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `layout` | Json |
| `template_name` | string |
| `template_type` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `filters` | Json | Yes |
| `is_default` | boolean | Yes |
| `is_public` | boolean | Yes |
| `updated_at` | string | Yes |

---

### `sales_leads`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `lead_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `assigned_to` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `email` | string | Yes |
| `is_active` | boolean | Yes |
| `lead_name_ar` | string | Yes |
| `notes` | string | Yes |
| `phone` | string | Yes |
| `source` | string | Yes |
| `status` | string | Yes |
| `updated_at` | string | Yes |

---

### `sales_opportunities`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `opportunity_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `assigned_to` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `estimated_value` | number | Yes |
| `expected_close_date` | string | Yes |
| `is_active` | boolean | Yes |
| `lead_id` | string | Yes |
| `notes` | string | Yes |
| `opportunity_name_ar` | string | Yes |
| `probability` | number | Yes |
| `stage` | string | Yes |
| `updated_at` | string | Yes |

---

### `sales_orders`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `order_date` | string |
| `order_number` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `customer_id` | string | Yes |
| `delivery_date` | string | Yes |
| `is_active` | boolean | Yes |
| `items` | Json | Yes |
| `notes` | string | Yes |
| `quote_id` | string | Yes |
| `status` | string | Yes |
| `total` | number | Yes |
| `updated_at` | string | Yes |

---

### `sales_quotes`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `quote_number` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `customer_id` | string | Yes |
| `is_active` | boolean | Yes |
| `items` | Json | Yes |
| `notes` | string | Yes |
| `opportunity_id` | string | Yes |
| `status` | string | Yes |
| `subtotal` | number | Yes |
| `tax` | number | Yes |
| `total` | number | Yes |
| `updated_at` | string | Yes |
| `valid_until` | string | Yes |

---

### `saved_conversations`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `conversation_data` | Json |
| `created_at` | string |
| `id` | string |
| `name` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `session_id` | string | Yes |
| `user_id` | string | Yes |

---

### `saved_csv_files`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `file_name` | string |
| `file_path` | string |
| `file_size` | number |
| `file_type` | string |
| `id` | string |
| `original_file_name` | string |
| `status` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_by` | string | Yes |
| `last_import_at` | string | Yes |
| `last_import_status` | string | Yes |
| `last_import_summary` | Json | Yes |
| `metadata` | Json | Yes |
| `row_count` | number | Yes |
| `tags` | string[] | Yes |
| `upload_method` | string | Yes |

---

### `scheduled_followups`

**Columns**: 24

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `customer_id` | string |
| `followup_type` | string |
| `id` | string |
| `priority` | string |
| `scheduled_date` | string |
| `status` | string |
| `title` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `assigned_to` | string | Yes |
| `completed_at` | string | Yes |
| `contract_id` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `description` | string | Yes |
| `legal_case_id` | string | Yes |
| `notes` | string | Yes |
| `outcome` | string | Yes |
| `outcome_notes` | string | Yes |
| `reminder_sent` | boolean | Yes |
| `reminder_sent_at` | string | Yes |
| `scheduled_time` | string | Yes |
| `source` | string | Yes |
| `source_reference` | string | Yes |
| `updated_at` | string | Yes |

---

### `scheduled_report_logs`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `report_type` | string |
| `scheduled_time` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `completed_at` | string | Yes |
| `created_at` | string | Yes |
| `error_message` | string | Yes |
| `failed_count` | number | Yes |
| `response_data` | Json | Yes |
| `sent_count` | number | Yes |
| `started_at` | string | Yes |
| `status` | string | Yes |

---

### `scheduled_reports`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `report_name` | string |
| `report_type` | string |
| `schedule` | Json |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `error_count` | number | Yes |
| `is_active` | boolean | Yes |
| `last_error` | string | Yes |
| `last_run_at` | string | Yes |
| `next_run_at` | string | Yes |
| `parameters` | Json | Yes |
| `run_count` | number | Yes |
| `success_count` | number | Yes |
| `updated_at` | string | Yes |

---

### `service_ratings`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `rated_by` | string |
| `rating` | number |
| `ticket_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `feedback` | string | Yes |
| `resolution_quality_rating` | number | Yes |
| `response_time_rating` | number | Yes |
| `staff_helpfulness_rating` | number | Yes |

---

### `shops`

**Columns**: 6

#### Required Columns

| Column | Type |
|--------|------|
| `id` | number |
| `name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `address` | string | Yes |
| `description` | string | Yes |
| `email` | string | Yes |
| `phone` | string | Yes |

---

### `subscription_plans`

**Columns**: 20

#### Required Columns

| Column | Type |
|--------|------|
| `billing_cycle` | string |
| `id` | string |
| `name` | string |
| `price` | number |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `description` | string | Yes |
| `features` | Json | Yes |
| `is_active` | boolean | Yes |
| `is_default` | boolean | Yes |
| `max_companies` | number | Yes |
| `max_contracts` | number | Yes |
| `max_customers` | number | Yes |
| `max_users` | number | Yes |
| `max_vehicles` | number | Yes |
| `name_ar` | string | Yes |
| `plan_code` | string | Yes |
| `price_monthly` | number | Yes |
| `price_yearly` | number | Yes |
| `storage_limit_gb` | number | Yes |
| `updated_at` | string | Yes |

---

### `subscription_transactions`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `id` | string |
| `status` | string |
| `subscription_plan_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `billing_period_end` | string | Yes |
| `billing_period_start` | string | Yes |
| `created_at` | string | Yes |
| `currency` | string | Yes |
| `notes` | string | Yes |
| `payment_method` | string | Yes |
| `processed_at` | string | Yes |
| `transaction_reference` | string | Yes |
| `updated_at` | string | Yes |

---

### `support_ticket_categories`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `name` | string |
| `name_ar` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `color` | string | Yes |
| `created_at` | string | Yes |
| `description` | string | Yes |
| `is_active` | boolean | Yes |
| `updated_at` | string | Yes |

---

### `support_ticket_replies`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `message` | string |
| `ticket_id` | string |
| `user_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `attachments` | Json | Yes |
| `created_at` | string | Yes |
| `is_internal` | boolean | Yes |
| `updated_at` | string | Yes |

---

### `support_tickets`

**Columns**: 17

#### Required Columns

| Column | Type |
|--------|------|
| `category_id` | string |
| `company_id` | string |
| `created_by` | string |
| `description` | string |
| `id` | string |
| `priority` | string |
| `status` | string |
| `ticket_number` | string |
| `title` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `assigned_to` | string | Yes |
| `closed_at` | string | Yes |
| `created_at` | string | Yes |
| `first_response_at` | string | Yes |
| `resolved_at` | string | Yes |
| `satisfaction_feedback` | string | Yes |
| `satisfaction_rating` | number | Yes |
| `updated_at` | string | Yes |

---

### `task_activity_log`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `action` | string |
| `id` | string |
| `task_id` | string |
| `user_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `description` | string | Yes |
| `new_value` | Json | Yes |
| `old_value` | Json | Yes |

---

### `task_checklists`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `task_id` | string |
| `title` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `completed_at` | string | Yes |
| `completed_by` | string | Yes |
| `created_at` | string | Yes |
| `is_completed` | boolean | Yes |
| `sort_order` | number | Yes |

---

### `task_comments`

**Columns**: 7

#### Required Columns

| Column | Type |
|--------|------|
| `content` | string |
| `id` | string |
| `task_id` | string |
| `user_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `attachments` | Json | Yes |
| `created_at` | string | Yes |
| `updated_at` | string | Yes |

---

### `task_templates`

**Columns**: 14

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_by` | string |
| `id` | string |
| `name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `checklist_items` | Json | Yes |
| `created_at` | string | Yes |
| `default_category` | string | Yes |
| `default_description` | string | Yes |
| `default_priority` | string | Yes |
| `default_tags` | string[] | Yes |
| `default_title` | string | Yes |
| `description` | string | Yes |
| `is_active` | boolean | Yes |
| `updated_at` | string | Yes |

---

### `tasks`

**Columns**: 20

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_by` | string |
| `id` | string |
| `priority` | string |
| `status` | string |
| `title` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `assigned_to` | string | Yes |
| `attachments` | Json | Yes |
| `category` | string | Yes |
| `completed_at` | string | Yes |
| `created_at` | string | Yes |
| `description` | string | Yes |
| `due_date` | string | Yes |
| `metadata` | Json | Yes |
| `reminder_sent` | boolean | Yes |
| `start_date` | string | Yes |
| `tags` | string[] | Yes |
| `updated_at` | string | Yes |
| `whatsapp_notification_sent` | boolean | Yes |
| `whatsapp_sent_at` | string | Yes |

---

### `template_variables`

**Columns**: 7

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `variable_key` | string |
| `variable_label` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `default_value` | string | Yes |
| `variable_category` | string | Yes |

---

### `transactions`

**Columns**: 16

#### Required Columns

| Column | Type |
|--------|------|
| `amount` | number |
| `company_id` | string |
| `created_at` | string |
| `description` | string |
| `id` | string |
| `status` | string |
| `transaction_date` | string |
| `transaction_number` | string |
| `transaction_type` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_by` | string | Yes |
| `currency` | string | Yes |
| `customer_id` | string | Yes |
| `journal_entry_id` | string | Yes |
| `reference_number` | string | Yes |
| `vendor_id` | string | Yes |

---

### `user_dashboard_layouts`

**Columns**: 7

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `dashboard_id` | string |
| `id` | string |
| `layout_config` | Json |
| `user_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `updated_at` | string | Yes |

---

### `user_permissions`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `created_at` | string |
| `granted` | boolean |
| `id` | string |
| `permission_id` | string |
| `updated_at` | string |
| `user_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `granted_at` | string | Yes |
| `granted_by` | string | Yes |
| `revoked_at` | string | Yes |

---

### `user_profiles`

**Columns**: 5

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `created_at` | string | Yes |
| `email` | string | Yes |
| `name` | string | Yes |
| `updated_at` | string | Yes |

---

### `user_roles`

**Columns**: 7

#### Required Columns

| Column | Type |
|--------|------|
| `id` | string |
| `role` | Database["public"]["Enums"]["user_role"] |
| `user_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `company_id` | string | Yes |
| `granted_at` | string | Yes |
| `granted_by` | string | Yes |
| `permissions` | Json | Yes |

---

### `user_transfer_logs`

**Columns**: 15

#### Required Columns

| Column | Type |
|--------|------|
| `created_at` | string |
| `data_handling_strategy` | Json |
| `from_company_id` | string |
| `id` | string |
| `status` | string |
| `to_company_id` | string |
| `transferred_by` | string |
| `updated_at` | string |
| `user_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `completed_at` | string | Yes |
| `error_message` | string | Yes |
| `new_roles` | string[] | Yes |
| `old_roles` | string[] | Yes |
| `rollback_data` | Json | Yes |
| `transfer_reason` | string | Yes |

---

### `vendor_categories`

**Columns**: 8

#### Required Columns

| Column | Type |
|--------|------|
| `category_name` | string |
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `is_active` | boolean |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `category_name_ar` | string | Yes |
| `description` | string | Yes |

---

### `vendor_contacts`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `contact_name` | string |
| `created_at` | string |
| `id` | string |
| `is_primary` | boolean |
| `updated_at` | string |
| `vendor_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `email` | string | Yes |
| `phone` | string | Yes |
| `position` | string | Yes |

---

### `vendor_documents`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `document_name` | string |
| `document_type` | string |
| `document_url` | string |
| `id` | string |
| `updated_at` | string |
| `vendor_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `expiry_date` | string | Yes |
| `file_size` | number | Yes |
| `notes` | string | Yes |

---

### `vendor_performance`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `measured_at` | string |
| `updated_at` | string |
| `vendor_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `notes` | string | Yes |
| `on_time_delivery_rate` | number | Yes |
| `quality_score` | number | Yes |
| `rating` | number | Yes |
| `response_time_hours` | number | Yes |

---

### `vendors`

**Columns**: 19

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |
| `vendor_code` | string |
| `vendor_name` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `address` | string | Yes |
| `address_ar` | string | Yes |
| `category_id` | string | Yes |
| `contact_person` | string | Yes |
| `credit_limit` | number | Yes |
| `current_balance` | number | Yes |
| `email` | string | Yes |
| `is_active` | boolean | Yes |
| `notes` | string | Yes |
| `payment_terms` | number | Yes |
| `phone` | string | Yes |
| `tax_number` | string | Yes |
| `vendor_name_ar` | string | Yes |

---

### `whatsapp_connection_status`

**Columns**: 19

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `created_at` | string |
| `id` | string |
| `updated_at` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `auto_reconnect` | boolean | Yes |
| `delay_between_messages_seconds` | number | Yes |
| `is_connected` | boolean | Yes |
| `last_connected_at` | string | Yes |
| `last_disconnected_at` | string | Yes |
| `last_heartbeat` | string | Yes |
| `last_message_sent_at` | string | Yes |
| `max_messages_per_hour` | number | Yes |
| `service_running` | boolean | Yes |
| `session_path` | string | Yes |
| `total_sent_this_month` | number | Yes |
| `total_sent_this_week` | number | Yes |
| `total_sent_today` | number | Yes |
| `whatsapp_name` | string | Yes |
| `whatsapp_number` | string | Yes |

---

### `whatsapp_message_logs`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `message_type` | string |
| `recipient_id` | string |
| `status` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `content` | string | Yes |
| `created_at` | string | Yes |
| `error_message` | string | Yes |
| `sent_at` | string | Yes |

---

### `whatsapp_settings`

**Columns**: 18

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `alert_threshold` | number | Yes |
| `created_at` | string | Yes |
| `daily_report_days` | number[] | Yes |
| `daily_report_enabled` | boolean | Yes |
| `daily_report_time` | string | Yes |
| `instant_alerts_enabled` | boolean | Yes |
| `monthly_report_day` | number | Yes |
| `monthly_report_enabled` | boolean | Yes |
| `monthly_report_time` | string | Yes |
| `recipients` | Json | Yes |
| `ultramsg_instance_id` | string | Yes |
| `ultramsg_token` | string | Yes |
| `updated_at` | string | Yes |
| `weekly_report_day` | number | Yes |
| `weekly_report_enabled` | boolean | Yes |
| `weekly_report_time` | string | Yes |

---

### `workflow_configurations`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `id` | string |
| `source_type` | Database["public"]["Enums"]["request_source"] |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `auto_assign_enabled` | boolean | Yes |
| `created_at` | string | Yes |
| `default_workflow_id` | string | Yes |
| `escalation_rules` | Json | Yes |
| `notification_settings` | Json | Yes |
| `updated_at` | string | Yes |

---

### `workflow_history`

**Columns**: 9

#### Required Columns

| Column | Type |
|--------|------|
| `action` | string |
| `id` | string |
| `workflow_id` | string |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `comments` | string | Yes |
| `created_at` | string | Yes |
| `new_status` | string | Yes |
| `performed_by` | string | Yes |
| `previous_status` | string | Yes |
| `step_number` | number | Yes |

---

### `workflow_templates`

**Columns**: 10

#### Required Columns

| Column | Type |
|--------|------|
| `entity_type` | string |
| `id` | string |
| `name` | string |
| `steps` | Json |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `company_id` | string | Yes |
| `conditions` | Json | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `is_active` | boolean | Yes |
| `updated_at` | string | Yes |

---

### `workflows`

**Columns**: 11

#### Required Columns

| Column | Type |
|--------|------|
| `company_id` | string |
| `entity_id` | string |
| `entity_type` | string |
| `id` | string |
| `steps` | Json |

#### Optional Columns

| Column | Type | Nullable |
|--------|------|----------|
| `completed_at` | string | Yes |
| `created_at` | string | Yes |
| `created_by` | string | Yes |
| `current_step` | number | Yes |
| `status` | string | Yes |
| `updated_at` | string | Yes |

---

## Business Rules & Critical Information

### Multi-Tenancy

- Most tables include `company_id` for multi-tenancy
- RLS policies enforce company isolation
- Always filter by `company_id` in queries

### Financial System

- **chart_of_accounts**: Hierarchical (levels 1-6), only `is_header=false AND account_level>=3` can have postings
- **journal_entries**: Header table for transactions
- **journal_entry_lines**: Use `line_description` (NOT `description`), `line_number` for sequencing
- Each entry must have 2+ lines (balanced debits/credits)

### Critical Column Names

| Wrong | Correct |
|-------|----------|
| `description` | `line_description` (journal_entry_lines) |
| `level` | `account_level` (chart_of_accounts) |
| `parent_code` | `parent_account_code` |
| `account_name_en` | `account_name` |
| `status` | `payment_status` (payments) |

### Key Relationships

- **Contracts** ↔ **Customers** (many-to-one)
- **Contracts** ↔ **Vehicles** (many-to-many via contract_vehicles)
- **Invoices** ← **Contracts** (via payment schedules)
- **Payments** → **Invoices** (partial payments allowed)

### Data Records

| Entity | Records |
|--------|----------|
| Contracts | ~588 |
| Customers | ~781 |
| Vehicles | ~510 |
| Invoices | ~1,250 |
| Payments | ~6,568 |


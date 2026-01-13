# Fleetify Database Schema Documentation

Generated: 2026-01-12T13:17:50.580Z

PostgreSQL Version: 17.6 (Supabase)

---

## Summary

- **Total Tables**: 290
- **Total Views**: 44
- **Total Functions**: 0
- **Schemas**: public, auth, storage

## Table of Contents

### Tables

> Note: Due to the large number of tables, only a sample is listed below.

- [account_creation_requests](#account_creation_requests)
- [account_deletion_log](#account_deletion_log)
- [account_mappings](#account_mappings)
- [account_movement_settings](#account_movement_settings)
- [accounting_periods](#accounting_periods)
- [accounting_templates](#accounting_templates)
- [adaptive_rules](#adaptive_rules)
- [advanced_late_fee_calculations](#advanced_late_fee_calculations)
- [agreements_with_details](#agreements_with_details)
- [ai_activity_logs](#ai_activity_logs)
- [ai_analysis_results](#ai_analysis_results)
- [ai_clarification_sessions](#ai_clarification_sessions)
- [ai_learning_feedback](#ai_learning_feedback)
- [ai_learning_patterns](#ai_learning_patterns)
- [ai_performance_metrics](#ai_performance_metrics)
- [ai_query_intents](#ai_query_intents)
- [amendment_change_log](#amendment_change_log)
- [aml_kyc_diligence](#aml_kyc_diligence)
- [approval_notifications](#approval_notifications)
- [approval_requests](#approval_requests)
- [approval_steps](#approval_steps)
- [approval_templates](#approval_templates)
- [approval_workflows](#approval_workflows)
- [attendance_records](#attendance_records)
- [audit_logs](#audit_logs)
- [audit_trail](#audit_trail)
- [background_jobs](#background_jobs)
- [backup_logs](#backup_logs)
- [bank_transactions](#bank_transactions)
- [banks](#banks)
- [branches](#branches)
- [budget_alerts](#budget_alerts)
- [budget_items](#budget_items)
- [budgets](#budgets)
- [business_templates](#business_templates)
- [chart_of_accounts](#chart_of_accounts)
- [companies](#companies)
- [company_branding_settings](#company_branding_settings)
- [company_legal_documents](#company_legal_documents)
- [company_usage](#company_usage)
- [compliance_audit_trail](#compliance_audit_trail)
- [compliance_calendar](#compliance_calendar)
- [compliance_rules](#compliance_rules)
- [compliance_validations](#compliance_validations)
- [contract_amendments](#contract_amendments)
- [contract_approval_steps](#contract_approval_steps)
- [contract_creation_log](#contract_creation_log)
- [contract_document_operation_log](#contract_document_operation_log)
- [contract_documents](#contract_documents)
- [contract_drafts](#contract_drafts)

### Views

- [ab_test_comparison](#view-ab_test_comparison)
- [active_payment_plans_summary](#view-active_payment_plans_summary)
- [bank_reconciliation_summary](#view-bank_reconciliation_summary)
- [contract_payment_summary](#view-contract_payment_summary)
- [contracts_complete](#view-contracts_complete)
- [customer_payment_score_summary](#view-customer_payment_score_summary)
- [index_maintenance_recommendations](#view-index_maintenance_recommendations)
- [index_usage_stats](#view-index_usage_stats)
- [inventory_aging_analysis](#view-inventory_aging_analysis)
- [inventory_low_stock_items](#view-inventory_low_stock_items)
- [inventory_movement_summary](#view-inventory_movement_summary)
- [inventory_pending_purchase_orders](#view-inventory_pending_purchase_orders)
- [inventory_pending_replenishments](#view-inventory_pending_replenishments)
- [inventory_purchase_order_summary](#view-inventory_purchase_order_summary)
- [inventory_reorder_recommendations](#view-inventory_reorder_recommendations)
- [inventory_stock_alerts](#view-inventory_stock_alerts)
- [inventory_suppliers_summary](#view-inventory_suppliers_summary)
- [inventory_transfer_summary](#view-inventory_transfer_summary)
- [inventory_turnover_analysis](#view-inventory_turnover_analysis)
- [inventory_valuation](#view-inventory_valuation)
- [legal_document_generations_view](#view-legal_document_generations_view)
- [maintenance_cost_summary](#view-maintenance_cost_summary)
- [mv_customer_summary](#view-mv_customer_summary)
- [overdue_payment_promises](#view-overdue_payment_promises)
- [payment_method_statistics](#view-payment_method_statistics)
- [payment_timeline_invoices](#view-payment_timeline_invoices)
- [payroll_financial_analysis](#view-payroll_financial_analysis)
- [reminder_statistics](#view-reminder_statistics)
- [sales_inventory_availability](#view-sales_inventory_availability)
- [sales_order_fulfillment_status](#view-sales_order_fulfillment_status)
- [sales_pipeline_metrics](#view-sales_pipeline_metrics)
- [security_policy_violations](#view-security_policy_violations)
- [table_size_stats](#view-table_size_stats)
- [template_performance_summary](#view-template_performance_summary)
- [top_rated_vendors](#view-top_rated_vendors)
- [v_account_linking_stats](#view-v_account_linking_stats)
- [v_deploy_readiness](#view-v_deploy_readiness)
- [v_linkable_accounts](#view-v_linkable_accounts)
- [v_pending_waivers](#view-v_pending_waivers)
- [v_recent_failures](#view-v_recent_failures)
- [v_report_schedule_status](#view-v_report_schedule_status)
- [vendor_purchase_performance](#view-vendor_purchase_performance)
- [pending_contract_matches](#view-pending_contract_matches)
- [contract_match_statistics](#view-contract_match_statistics)

### Functions


---

## Tables

### account_creation_requests

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `direct_creation` | boolean | null |  |
| `employee_id` | string | Employee reference |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `password_expires_at` | string | null | Password expires timestamp |
| `processed_at` | string | null | Processed timestamp |
| `processed_by` | string | null |  |
| `rejection_reason` | string | null |  |
| `request_date` | string | Request date |
| `requested_by` | string | Text field |
| `requested_roles` | string[] | null |  |
| `status` | string | Text field |
| `temporary_password` | string | null |  |
| `updated_at` | string | Last update timestamp |

### account_deletion_log

| Column | Type | Description |
|--------|------|-------------|
| `affected_records` | Json | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `deleted_account_code` | string | null |  |
| `deleted_account_id` | string | null | deleted_account reference |
| `deleted_account_name` | string | null |  |
| `deleted_by` | string | null |  |
| `deletion_reason` | string | null |  |
| `deletion_type` | string | Text field |
| `id` | string | Primary key |
| `transfer_to_account_id` | string | null | transfer_to_account reference |

### account_mappings

| Column | Type | Description |
|--------|------|-------------|
| `chart_of_accounts_id` | string | chart_of_accounts reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `default_account_type_id` | string | default_account_type reference |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `mapped_by` | string | null |  |
| `updated_at` | string | Last update timestamp |

### account_movement_settings

| Column | Type | Description |
|--------|------|-------------|
| `approval_threshold` | number | null | Numeric value |
| `auto_create_movements` | boolean | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `default_movement_type` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `require_approval` | boolean | null |  |
| `updated_at` | string | null | Last update timestamp |

### accounting_periods

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `end_date` | string | End date |
| `id` | string | Primary key |
| `is_adjustment_period` | boolean | null | Flag indicating if adjustment period |
| `period_name` | string | Text field |
| `start_date` | string | Start date |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |

### accounting_templates

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `conditions` | Json |  |
| `created_at` | string | Creation timestamp |
| `description` | string | null |  |
| `enabled` | boolean | Boolean flag |
| `entries` | Json |  |
| `id` | string | Primary key |
| `name` | string | Text field |
| `priority` | number | Numeric value |
| `template_type` | string | Text field |
| `updated_at` | string | Last update timestamp |

### adaptive_rules

| Column | Type | Description |
|--------|------|-------------|
| `category` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `confidence` | number | null | Numeric value |
| `created_at` | string | null | Creation timestamp |
| `failure_count` | number | null | Numeric value |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `priority` | number | null | Numeric value |
| `rule_action` | string | Text field |
| `rule_condition` | string | Text field |
| `success_count` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### advanced_late_fee_calculations

| Column | Type | Description |
|--------|------|-------------|
| `ai_recommendations` | string[] | null |  |
| `calculated_by` | string | null |  |
| `calculation_date` | string | null | Calculation date |
| `calculation_method` | string | null |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | null | Creation timestamp |
| `daily_fine_rate` | number | null | Numeric value |
| `days_overdue` | number | Numeric value |
| `final_fine_amount` | number | null | Numeric value |
| `id` | string | Primary key |
| `monthly_breakdown` | Json | null |  |
| `monthly_cap_amount` | number | null | Numeric value |
| `monthly_cap_applied` | boolean | null |  |
| `months_overdue` | number | Numeric value |
| `original_due_date` | string | null | Original due date |
| `payment_history_summary` | string | null |  |
| `payment_id` | string | null | Payment reference |
| `raw_daily_fine` | number | null | Numeric value |
| `risk_level` | string | null |  |
| `updated_at` | string | null | Last update timestamp |

### agreements_with_details

| Column | Type | Description |
|--------|------|-------------|
| `agreement_number` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `customer_driver_license` | string | null |  |
| `customer_email` | string | null |  |
| `customer_name` | string | null |  |
| `customer_phone` | string | null |  |
| `end_date` | string | null | End date |
| `fines_summary` | string | null |  |
| `first_payment_date` | string | null | First payment date |
| `id` | string | Primary key |
| `last_payment_date` | string | null | Last payment date |
| `license_plate` | string | null |  |
| `make` | string | null |  |
| `model` | string | null |  |
| `paid_fines_amount` | number | null | Numeric value |
| `payment_count` | number | null | Numeric value |
| `payment_summary` | string | null |  |
| `pending_fines_amount` | number | null | Numeric value |
| `rent_amount` | number | null | Numeric value |
| `start_date` | string | null | Start date |
| `status` | string | null |  |
| `total_amount` | number | null | Numeric value |
| `total_fines` | number | null | Numeric value |
| `total_fines_amount` | number | null | Numeric value |
| `total_late_fees_paid` | number | null | Numeric value |
| `total_paid_amount` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `vehicle_status` | string | null |  |
| `year` | number | null | Numeric value |

### ai_activity_logs

| Column | Type | Description |
|--------|------|-------------|
| `activity_type` | string | Text field |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `details` | Json | null |  |
| `id` | string | Primary key |
| `session_id` | string | null | session reference |
| `timestamp` | string | Text field |
| `user_id` | string | null | user reference |

### ai_analysis_results

| Column | Type | Description |
|--------|------|-------------|
| `analysis_type` | string | Text field |
| `company_id` | string | Company reference (multi-tenancy) |
| `confidence_score` | number | null | Numeric value |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `results` | Json |  |

### ai_clarification_sessions

| Column | Type | Description |
|--------|------|-------------|
| `clarification_questions` | Json |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `completed_at` | string | null | Completed timestamp |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `final_intent` | string | null |  |
| `id` | string | Primary key |
| `original_query` | string | Text field |
| `session_status` | string | Text field |
| `user_responses` | Json |  |

### ai_learning_feedback

| Column | Type | Description |
|--------|------|-------------|
| `clarification_session_id` | string | null | clarification_session reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `feedback_comments` | string | null |  |
| `feedback_rating` | number | null | Numeric value |
| `feedback_type` | string | Text field |
| `id` | string | Primary key |
| `improvement_suggestions` | Json | null |  |
| `query_intent_id` | string | null | query_intent reference |

### ai_learning_patterns

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `last_used_at` | string | null | Last used timestamp |
| `pattern_data` | Json |  |
| `pattern_type` | string | Text field |
| `success_rate` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |
| `usage_count` | number | null | Numeric value |

### ai_performance_metrics

| Column | Type | Description |
|--------|------|-------------|
| `clarification_requests` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `learning_improvements` | number | null | Numeric value |
| `metric_date` | string | Metric date |
| `response_time_avg` | number | null | Numeric value |
| `successful_classifications` | number | null | Numeric value |
| `total_queries` | number | null | Numeric value |
| `user_satisfaction_avg` | number | null | Numeric value |

### ai_query_intents

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `confidence_score` | number | null | Numeric value |
| `context_data` | Json | null |  |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `intent_classification` | string | Text field |
| `normalized_query` | string | null |  |
| `original_query` | string | Text field |
| `updated_at` | string | Last update timestamp |
| `user_confirmed` | boolean | null |  |

### amendment_change_log

| Column | Type | Description |
|--------|------|-------------|
| `amendment_id` | string | amendment reference |
| `change_impact` | string | null |  |
| `created_at` | string | Creation timestamp |
| `field_label_ar` | string | null |  |
| `field_name` | string | Text field |
| `id` | string | Primary key |
| `new_value` | string | null |  |
| `old_value` | string | null |  |
| `value_type` | string | null |  |

### aml_kyc_diligence

| Column | Type | Description |
|--------|------|-------------|
| `adverse_media_findings` | number | null | Numeric value |
| `approval_required` | boolean | null |  |
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `documents_verified` | string[] | null |  |
| `due_diligence_level` | string | null |  |
| `enhanced_due_diligence` | boolean | null |  |
| `entity_id` | string | entity reference |
| `entity_name` | string | Text field |
| `entity_type` | string | Text field |
| `id` | string | Primary key |
| `last_review_date` | string | null | Last review date |
| `mitigating_factors` | Json | null |  |
| `next_review_date` | string | null | Next review date |
| `notes` | string | null |  |
| `ongoing_monitoring` | boolean | null |  |
| `pep_status` | string | null |  |
| `risk_factors` | Json | null |  |
| `risk_rating` | string | null |  |
| `sanctions_status` | string | null |  |
| `screening_results` | Json | null |  |
| `updated_at` | string | null | Last update timestamp |
| `verification_method` | string | null |  |
| `verification_score` | number | null | Numeric value |
| `verification_status` | string | null |  |

### approval_notifications

| Column | Type | Description |
|--------|------|-------------|
| `id` | string | Primary key |
| `is_read` | boolean | null | Flag indicating if read |
| `message` | string | Text field |
| `notification_type` | string | Text field |
| `read_at` | string | null | Read timestamp |
| `recipient_id` | string | recipient reference |
| `request_id` | string | request reference |
| `sent_at` | string | null | Sent timestamp |

### approval_requests

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `completed_at` | string | null | Completed timestamp |
| `created_at` | string | null | Creation timestamp |
| `current_step_order` | number | null | Numeric value |
| `description` | string | null |  |
| `id` | string | Primary key |
| `metadata` | Json | null |  |
| `priority` | Database["public"]["Enums"]["approval_priority"] | null |  |
| `request_number` | string | Text field |
| `requested_by` | string | Text field |
| `source_id` | string | null | source reference |
| `source_type` | Database["public"]["Enums"]["request_source"] |  |
| `status` | Database["public"]["Enums"]["approval_status"] | null |  |
| `title` | string | Text field |
| `total_amount` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `workflow_id` | string | workflow reference |

### approval_steps

| Column | Type | Description |
|--------|------|-------------|
| `approved_at` | string | null | Approved timestamp |
| `approver_id` | string | null | approver reference |
| `approver_type` | string | Text field |
| `approver_value` | string | Text field |
| `comments` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `request_id` | string | request reference |
| `status` | Database["public"]["Enums"]["approval_status"] | null |  |
| `step_order` | number | Numeric value |

### approval_templates

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_type` | string | Text field |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `max_amount` | number | null | Numeric value |
| `min_amount` | number | null | Numeric value |
| `steps` | Json |  |
| `template_name` | string | Text field |
| `updated_at` | string | Last update timestamp |

### approval_workflows

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `conditions` | Json | null |  |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `source_type` | Database["public"]["Enums"]["request_source"] |  |
| `steps` | Json |  |
| `updated_at` | string | null | Last update timestamp |
| `workflow_name` | string | Text field |
| `workflow_name_ar` | string | null |  |

### attendance_records

| Column | Type | Description |
|--------|------|-------------|
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `attendance_date` | string | Attendance date |
| `auto_checkout` | boolean | null |  |
| `break_end_time` | string | null |  |
| `break_start_time` | string | null |  |
| `check_in_latitude` | number | null | Numeric value |
| `check_in_longitude` | number | null | Numeric value |
| `check_in_time` | string | null |  |
| `check_out_latitude` | number | null | Numeric value |
| `check_out_longitude` | number | null | Numeric value |
| `check_out_time` | string | null |  |
| `created_at` | string | Creation timestamp |
| `employee_id` | string | Employee reference |
| `id` | string | Primary key |
| `is_approved` | boolean | null | Flag indicating if approved |
| `late_hours` | number | null | Numeric value |
| `location_verified` | boolean | null |  |
| `notes` | string | null |  |
| `overtime_hours` | number | null | Numeric value |
| `status` | string | Text field |
| `total_hours` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |

### audit_logs

| Column | Type | Description |
|--------|------|-------------|
| `action` | string | Text field |
| `changes_summary` | string | null |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `entity_name` | string | null |  |
| `error_message` | string | null |  |
| `id` | string | Primary key |
| `ip_address` | unknown |  |
| `metadata` | Json | null |  |
| `new_values` | Json | null |  |
| `notes` | string | null |  |
| `old_values` | Json | null |  |
| `request_method` | string | null |  |
| `request_path` | string | null |  |
| `resource_id` | string | null | resource reference |
| `resource_type` | string | Text field |
| `severity` | string | null |  |
| `status` | string | null |  |
| `user_agent` | string | null |  |
| `user_email` | string | null |  |
| `user_id` | string | null | user reference |
| `user_name` | string | null |  |

### audit_trail

| Column | Type | Description |
|--------|------|-------------|
| `action` | string | Text field |
| `changed_at` | string | Changed timestamp |
| `changed_fields` | string[] | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `description` | string | null |  |
| `id` | string | Primary key |
| `ip_address` | string | null |  |
| `new_values` | Json | null |  |
| `old_values` | Json | null |  |
| `record_id` | string | record reference |
| `table_name` | string | Text field |
| `user_agent` | string | null |  |
| `user_email` | string | null |  |
| `user_id` | string | null | user reference |
| `user_name` | string | null |  |

### background_jobs

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `completed_at` | string | null | Completed timestamp |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `data` | Json |  |
| `error` | string | null |  |
| `id` | string | Primary key |
| `job_type` | string | Text field |
| `max_retries` | number | null | Numeric value |
| `name` | string | Text field |
| `priority` | number | null | Numeric value |
| `progress` | number | null | Numeric value |
| `result` | Json | null |  |
| `retries` | number | null | Numeric value |
| `started_at` | string | null | Started timestamp |
| `status` | string | null |  |

### backup_logs

| Column | Type | Description |
|--------|------|-------------|
| `backup_type` | string | Text field |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `completed_at` | string | null | Completed timestamp |
| `created_at` | string | null | Creation timestamp |
| `error_message` | string | null |  |
| `file_path` | string | null |  |
| `file_size_bytes` | number | null | Numeric value |
| `id` | string | Primary key |
| `metadata` | Json | null |  |
| `records_count` | number | null | Numeric value |
| `started_at` | string | null | Started timestamp |
| `status` | string | Text field |

### bank_transactions

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `balance_after` | number | Numeric value |
| `bank_id` | string | bank reference |
| `check_number` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `counterpart_bank_id` | string | null | counterpart_bank reference |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | Text field |
| `id` | string | Primary key |
| `journal_entry_id` | string | null | journal_entry reference |
| `reconciled` | boolean | null |  |
| `reconciled_at` | string | null | Reconciled timestamp |
| `reference_number` | string | null |  |
| `status` | string | Text field |
| `transaction_date` | string | Transaction date |
| `transaction_number` | string | Text field |
| `transaction_type` | string | Text field |
| `updated_at` | string | Last update timestamp |

### banks

| Column | Type | Description |
|--------|------|-------------|
| `account_number` | string | Text field |
| `account_type` | string | Text field |
| `address` | string | null |  |
| `bank_name` | string | Text field |
| `bank_name_ar` | string | null |  |
| `branch_name` | string | null |  |
| `branch_name_ar` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `contact_person` | string | null |  |
| `created_at` | string | Creation timestamp |
| `currency` | string | Text field |
| `current_balance` | number | null | Numeric value |
| `email` | string | null |  |
| `iban` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_primary` | boolean | null | Flag indicating if primary |
| `notes` | string | null |  |
| `opening_balance` | number | null | Numeric value |
| `opening_date` | string | null | Opening date |
| `phone` | string | null |  |
| `swift_code` | string | null |  |
| `updated_at` | string | Last update timestamp |

### branches

| Column | Type | Description |
|--------|------|-------------|
| `address` | string | null |  |
| `address_ar` | string | null |  |
| `branch_code` | string | Text field |
| `branch_name` | string | Text field |
| `branch_name_ar` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `email` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `manager_id` | string | null | manager reference |
| `phone` | string | null |  |
| `updated_at` | string | null | Last update timestamp |

### budget_alerts

| Column | Type | Description |
|--------|------|-------------|
| `acknowledged_at` | string | null | Acknowledged timestamp |
| `acknowledged_by` | string | null |  |
| `alert_type` | string | Text field |
| `amount_exceeded` | number | Numeric value |
| `budget_id` | string | budget reference |
| `budget_item_id` | string | null | budget_item reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `current_percentage` | number | Numeric value |
| `id` | string | Primary key |
| `is_acknowledged` | boolean | null | Flag indicating if acknowledged |
| `message` | string | Text field |
| `message_ar` | string | null |  |
| `threshold_percentage` | number | Numeric value |
| `updated_at` | string | Last update timestamp |

### budget_items

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | account reference |
| `actual_amount` | number | null | Numeric value |
| `budget_id` | string | budget reference |
| `budgeted_amount` | number | Numeric value |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `variance_amount` | number | null | Numeric value |
| `variance_percentage` | number | null | Numeric value |

### budgets

| Column | Type | Description |
|--------|------|-------------|
| `accounting_period_id` | string | null | accounting_period reference |
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `budget_name` | string | Text field |
| `budget_year` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `net_income` | number | null | Numeric value |
| `notes` | string | null |  |
| `status` | string | Text field |
| `total_expenses` | number | null | Numeric value |
| `total_revenue` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |

### business_templates

| Column | Type | Description |
|--------|------|-------------|
| `business_type` | string | Text field |
| `color_scheme` | Json | null |  |
| `created_at` | string | null | Creation timestamp |
| `default_chart_accounts` | Json | null |  |
| `default_modules` | string[] |  |
| `default_settings` | Json | null |  |
| `description` | string | null |  |
| `description_ar` | string | null |  |
| `icon_name` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `template_name` | string | Text field |
| `template_name_ar` | string | null |  |
| `updated_at` | string | null | Last update timestamp |

### chart_of_accounts

| Column | Type | Description |
|--------|------|-------------|
| `account_code` | string | Text field |
| `account_level` | number | null | Numeric value |
| `account_name` | string | Text field |
| `account_name_ar` | string | null |  |
| `account_subtype` | string | null |  |
| `account_type` | string | Text field |
| `balance_type` | string | Text field |
| `can_link_customers` | boolean | null |  |
| `can_link_employees` | boolean | null |  |
| `can_link_vendors` | boolean | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `current_balance` | number | null | Numeric value |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_default` | boolean | null | Flag indicating if default |
| `is_header` | boolean | null | Flag indicating if header |
| `is_system` | boolean | null | Flag indicating if system |
| `parent_account_code` | string | null |  |
| `parent_account_id` | string | null | parent_account reference |
| `sort_order` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |

### companies

| Column | Type | Description |
|--------|------|-------------|
| `active_modules` | string[] | null |  |
| `address` | string | null |  |
| `address_ar` | string | null |  |
| `allowed_radius` | number | null | Numeric value |
| `auto_checkout_enabled` | boolean | null |  |
| `business_type` | string | null |  |
| `city` | string | null |  |
| `commercial_register` | string | null |  |
| `company_template` | string | null |  |
| `country` | string | null |  |
| `created_at` | string | Creation timestamp |
| `currency` | string | null |  |
| `current_plan_id` | string | null | current_plan reference |
| `custom_branding` | Json | null |  |
| `customer_account_settings` | Json | null |  |
| `email` | string | null |  |
| `id` | string | Primary key |
| `industry_config` | Json | null |  |
| `is_demo` | boolean | null | Flag indicating if demo |
| `license_number` | string | null |  |
| `logo_url` | string | null |  |
| `name` | string | Text field |
| `name_ar` | string | null |  |
| `number_format_preferences` | Json | null |  |
| `office_latitude` | number | null | Numeric value |
| `office_longitude` | number | null | Numeric value |
| `phone` | string | null |  |
| `settings` | Json | null |  |
| `subscription_expires_at` | string | null | Subscription expires timestamp |
| `subscription_plan` | string | null |  |
| `subscription_status` | string | null |  |
| `trial_end_date` | string | null | Trial end date |
| `updated_at` | string | Last update timestamp |
| `work_end_time` | string | null |  |
| `work_start_time` | string | null |  |

### company_branding_settings

| Column | Type | Description |
|--------|------|-------------|
| `accent_color` | string | null |  |
| `background_color` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `custom_css` | string | null |  |
| `favicon_url` | string | null |  |
| `font_family` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `logo_url` | string | null |  |
| `primary_color` | string | null |  |
| `secondary_color` | string | null |  |
| `sidebar_accent_color` | string | null |  |
| `sidebar_background_color` | string | null |  |
| `sidebar_border_color` | string | null |  |
| `sidebar_foreground_color` | string | null |  |
| `system_name` | string | null |  |
| `system_name_ar` | string | null |  |
| `text_color` | string | null |  |
| `theme_preset` | string | null |  |
| `updated_at` | string | null | Last update timestamp |

### company_legal_documents

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `document_name` | string | Text field |
| `document_type` | string | Text field |
| `expiry_date` | string | null | Expiry date |
| `file_size` | number | null | Numeric value |
| `file_url` | string | Text field |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `notes` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `uploaded_by` | string | null |  |

### company_usage

| Column | Type | Description |
|--------|------|-------------|
| `api_calls_count` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `contracts_count` | number | null | Numeric value |
| `created_at` | string | null | Creation timestamp |
| `customers_count` | number | null | Numeric value |
| `id` | string | Primary key |
| `storage_used_mb` | number | null | Numeric value |
| `usage_date` | string | Usage date |
| `users_count` | number | null | Numeric value |
| `vehicles_count` | number | null | Numeric value |

### compliance_audit_trail

| Column | Type | Description |
|--------|------|-------------|
| `action_description` | string | Text field |
| `action_timestamp` | string | null |  |
| `action_type` | string | Text field |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `compliance_impact` | string | null |  |
| `entity_id` | string | null | entity reference |
| `entity_type` | string | null |  |
| `id` | string | Primary key |
| `ip_address` | unknown |  |
| `new_values` | Json | null |  |
| `old_values` | Json | null |  |
| `requires_review` | boolean | null |  |
| `review_notes` | string | null |  |
| `reviewed_at` | string | null | Reviewed timestamp |
| `reviewed_by` | string | null |  |
| `session_id` | string | null | session reference |
| `system_generated` | boolean | null |  |
| `user_agent` | string | null |  |
| `user_id` | string | null | user reference |

### compliance_calendar

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | null | Company reference (multi-tenancy) |
| `completion_date` | string | null | Completion date |
| `completion_notes` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `due_date` | string | Due date |
| `event_description` | string | null |  |
| `event_title` | string | Text field |
| `event_type` | string | Text field |
| `file_attachments` | string[] | null |  |
| `id` | string | Primary key |
| `jurisdiction` | string | null |  |
| `priority` | string | null |  |
| `recurring_end_date` | string | null | Recurring end date |
| `recurring_pattern` | string | null |  |
| `reminder_days` | number | null | Numeric value |
| `responsible_user_id` | string | null | responsible_user reference |
| `status` | string | null |  |
| `tags` | string[] | null |  |
| `updated_at` | string | null | Last update timestamp |

### compliance_rules

| Column | Type | Description |
|--------|------|-------------|
| `auto_execute` | boolean | null |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `execution_frequency` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `jurisdiction` | string | null |  |
| `notification_config` | Json | null |  |
| `rule_category` | string | Text field |
| `rule_code` | string | Text field |
| `rule_config` | Json |  |
| `rule_description` | string | null |  |
| `rule_name` | string | Text field |
| `rule_type` | string | Text field |
| `severity_level` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `version` | number | null | Numeric value |

### compliance_validations

| Column | Type | Description |
|--------|------|-------------|
| `action_deadline` | string | null |  |
| `action_description` | string | null |  |
| `action_required` | boolean | null |  |
| `assigned_to` | string | null |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `entity_id` | string | entity reference |
| `entity_reference` | string | null |  |
| `entity_type` | string | Text field |
| `id` | string | Primary key |
| `review_notes` | string | null |  |
| `reviewed_at` | string | null | Reviewed timestamp |
| `reviewed_by` | string | null |  |
| `risk_assessment` | string | null |  |
| `rule_id` | string | null | rule reference |
| `validated_at` | string | null | Validated timestamp |
| `validation_details` | Json | null |  |
| `validation_result` | string | Text field |
| `validation_score` | number | null | Numeric value |

### contract_amendments

| Column | Type | Description |
|--------|------|-------------|
| `amendment_number` | string | Text field |
| `amendment_reason` | string | Text field |
| `amendment_type` | string | Text field |
| `amount_difference` | number | null | Numeric value |
| `applied_at` | string | null | Applied timestamp |
| `approval_notes` | string | null |  |
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `changes_summary` | Json | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `company_signature_data` | string | null |  |
| `company_signed_at` | string | null | Company signed timestamp |
| `contract_id` | string | Contract reference |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `customer_signature_data` | string | null |  |
| `customer_signed` | boolean | null |  |
| `customer_signed_at` | string | null | Customer signed timestamp |
| `effective_date` | string | null | Effective date |
| `id` | string | Primary key |
| `new_values` | Json |  |
| `original_values` | Json |  |
| `rejected_at` | string | null | Rejected timestamp |
| `rejected_by` | string | null |  |
| `rejection_reason` | string | null |  |
| `requires_customer_signature` | boolean | null |  |
| `requires_payment_adjustment` | boolean | null |  |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |

### contract_approval_steps

| Column | Type | Description |
|--------|------|-------------|
| `approved_at` | string | null | Approved timestamp |
| `approver_id` | string | null | approver reference |
| `approver_role` | string | Text field |
| `comments` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | Contract reference |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `rejected_at` | string | null | Rejected timestamp |
| `status` | string | Text field |
| `step_order` | number | Numeric value |
| `updated_at` | string | Last update timestamp |

### contract_creation_log

| Column | Type | Description |
|--------|------|-------------|
| `attempt_number` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | null | Creation timestamp |
| `error_message` | string | null |  |
| `execution_time_ms` | number | null | Numeric value |
| `id` | string | Primary key |
| `metadata` | Json | null |  |
| `operation_step` | string | Text field |
| `status` | string | Text field |

### contract_document_operation_log

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `completed_at` | string | null | Completed timestamp |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | null | Creation timestamp |
| `document_id` | string | null | document reference |
| `error_code` | string | null |  |
| `error_message` | string | null |  |
| `file_path` | string | null |  |
| `id` | string | Primary key |
| `metadata` | Json | null |  |
| `operation_status` | string | Text field |
| `operation_type` | string | Text field |
| `performed_by` | string | null |  |
| `retry_count` | number | null | Numeric value |

### contract_documents

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `condition_report_id` | string | null | condition_report reference |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | null | Creation timestamp |
| `document_name` | string | Text field |
| `document_type` | string | Text field |
| `file_path` | string | null |  |
| `file_size` | number | null | Numeric value |
| `id` | string | Primary key |
| `is_required` | boolean | null | Flag indicating if required |
| `mime_type` | string | null |  |
| `notes` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `uploaded_at` | string | null | Uploaded timestamp |
| `uploaded_by` | string | null |  |
| `ai_match_status` | 'pending' | 'matched' | 'not_matched' | 'manual_override' | 'review_required' | null |  |
| `ai_match_confidence` | number | null | Numeric value |
| `matched_by` | 'ai' | 'manual' | 'bulk_import' | null |  |
| `matched_at` | string | null | Matched timestamp |
| `verified_by` | string | null |  |
| `verified_at` | string | null | Verified timestamp |
| `match_notes` | string | null |  |
| `upload_batch_id` | string | null | upload_batch reference |
| `original_filename` | string | null |  |
| `processing_status` | 'uploading' | 'parsing' | 'matching' | 'complete' | 'failed' | 'review_required' | null |  |
| `processing_error` | string | null |  |

### contract_drafts

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | Text field |
| `current_step` | number | Numeric value |
| `data` | Json |  |
| `id` | string | Primary key |
| `last_saved_at` | string | Last saved timestamp |
| `updated_at` | string | Last update timestamp |

### contract_notifications

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | Contract reference |
| `created_at` | string | Creation timestamp |
| `delivery_status` | string | null |  |
| `id` | string | Primary key |
| `message` | string | Text field |
| `notification_type` | string | Text field |
| `recipient_email` | string | null |  |
| `recipient_id` | string | recipient reference |
| `recipient_phone` | string | null |  |
| `sent_at` | string | null | Sent timestamp |
| `title` | string | Text field |

### contract_number_history

| Column | Type | Description |
|--------|------|-------------|
| `contract_id` | string | Contract reference |
| `id` | string | Primary key |
| `new_contract_number` | string | Text field |
| `old_contract_number` | string | Text field |
| `updated_at` | string | null | Last update timestamp |
| `updated_by` | string | null |  |

### contract_operations_log

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | Contract reference |
| `id` | string | Primary key |
| `new_values` | Json | null |  |
| `notes` | string | null |  |
| `old_values` | Json | null |  |
| `operation_details` | Json | null |  |
| `operation_type` | string | Text field |
| `performed_at` | string | null | Performed timestamp |
| `performed_by` | string | null |  |

### contract_payment_schedules

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | Contract reference |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `due_date` | string | Due date |
| `id` | string | Primary key |
| `installment_number` | number | Numeric value |
| `invoice_id` | string | null | Invoice reference |
| `notes` | string | null |  |
| `paid_amount` | number | null | Numeric value |
| `paid_date` | string | null | Paid date |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |

### contract_templates

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | null | account reference |
| `account_mappings` | Json |  |
| `approval_threshold` | number | Numeric value |
| `auto_calculate_pricing` | boolean | Boolean flag |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_type` | string | Text field |
| `created_at` | string | Creation timestamp |
| `created_by` | string | Text field |
| `default_duration_days` | number | Numeric value |
| `default_terms` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | Flag indicating if active |
| `requires_approval` | boolean | Boolean flag |
| `template_name` | string | Text field |
| `template_name_ar` | string | null |  |
| `updated_at` | string | Last update timestamp |

### contract_vehicle_returns

| Column | Type | Description |
|--------|------|-------------|
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | Contract reference |
| `created_at` | string | Creation timestamp |
| `damages` | Json | null |  |
| `fuel_level` | number | null | Numeric value |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `odometer_reading` | number | null | Numeric value |
| `rejection_reason` | string | null |  |
| `return_date` | string | Return date |
| `returned_by` | string | Text field |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |
| `vehicle_condition` | string | Text field |
| `vehicle_id` | string | Vehicle reference |

### contract_vehicles

| Column | Type | Description |
|--------|------|-------------|
| `allocated_amount` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |
| `vehicle_installment_id` | string | vehicle_installment reference |

### contracts

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | null | account reference |
| `auto_renew_enabled` | boolean | null |  |
| `balance_due` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_amount` | number | Numeric value |
| `contract_date` | string | Contract date |
| `contract_number` | string | Text field |
| `contract_type` | string | Text field |
| `cost_center_id` | string | null | cost_center reference |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `created_via` | string | null |  |
| `customer_id` | string | Customer reference |
| `days_overdue` | number | null | Numeric value |
| `description` | string | null |  |
| `end_date` | string | End date |
| `expired_at` | string | null | Expired timestamp |
| `id` | string | Primary key |
| `journal_entry_id` | string | null | journal_entry reference |
| `last_payment_check_date` | string | null | Last payment check date |
| `last_payment_date` | string | null | Last payment date |
| `last_renewal_check` | string | null |  |
| `late_fine_amount` | number | null | Numeric value |
| `license_plate` | string | null |  |
| `make` | string | null |  |
| `model` | string | null |  |
| `monthly_amount` | number | Numeric value |
| `payment_status` | string | null |  |
| `renewal_terms` | Json | null |  |
| `start_date` | string | Start date |
| `status` | string | Text field |
| `suspension_reason` | string | null |  |
| `terms` | string | null |  |
| `total_paid` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |
| `vehicle_id` | string | null | Vehicle reference |
| `vehicle_returned` | boolean | null |  |
| `vehicle_status` | string | null |  |
| `year` | number | null | Numeric value |

### cost_centers

| Column | Type | Description |
|--------|------|-------------|
| `actual_amount` | number | null | Numeric value |
| `budget_amount` | number | null | Numeric value |
| `center_code` | string | Text field |
| `center_name` | string | Text field |
| `center_name_ar` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_default` | boolean | null | Flag indicating if default |
| `manager_id` | string | null | manager reference |
| `parent_center_id` | string | null | parent_center reference |
| `updated_at` | string | Last update timestamp |

### csv_file_archives

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_contracts_ids` | string[] | null |  |
| `error_details` | Json | null |  |
| `failed_rows` | number | null | Numeric value |
| `file_content` | string | null |  |
| `file_name` | string | Text field |
| `file_size_bytes` | number | Numeric value |
| `id` | string | Primary key |
| `is_archived` | boolean | null | Flag indicating if archived |
| `metadata` | Json | null |  |
| `original_file_name` | string | Text field |
| `processing_results` | Json | null |  |
| `processing_status` | string | Text field |
| `storage_bucket` | string | null |  |
| `storage_path` | string | null |  |
| `successful_rows` | number | null | Numeric value |
| `total_rows` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |
| `upload_type` | string | Text field |
| `uploaded_at` | string | Uploaded timestamp |
| `uploaded_by` | string | Text field |

### csv_templates

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `description_ar` | string | null |  |
| `entity_type` | string | Text field |
| `field_mappings` | Json | null |  |
| `headers` | string[] |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_default` | boolean | null | Flag indicating if default |
| `last_used_at` | string | null | Last used timestamp |
| `sample_data` | Json | null |  |
| `template_name` | string | Text field |
| `template_name_ar` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `usage_count` | number | null | Numeric value |
| `validation_rules` | Json | null |  |

### cto_agent_audit

| Column | Type | Description |
|--------|------|-------------|
| `actor` | string | Text field |
| `branch` | string | null |  |
| `commit_sha` | string | null |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `details` | Json |  |
| `duration_ms` | number | null | Numeric value |
| `id` | string | Primary key |
| `metrics` | Json | null |  |
| `pr_number` | number | null | Numeric value |
| `repo` | string | Text field |
| `run_id` | string | run reference |
| `severity` | string | null |  |
| `stage` | string | Text field |
| `status` | string | Text field |
| `violations` | Json | null |  |
| `waiver_approved_by` | string | null |  |
| `waiver_expires_at` | string | null | Waiver expires timestamp |
| `waiver_reason` | string | null |  |

### cto_deploy_gates

| Column | Type | Description |
|--------|------|-------------|
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `build_passed` | boolean | Boolean flag |
| `build_time_seconds` | number | null | Numeric value |
| `bundle_size_kb` | number | null | Numeric value |
| `coverage_passed` | boolean | Boolean flag |
| `coverage_percent` | number | null | Numeric value |
| `created_at` | string | Creation timestamp |
| `deployed_at` | string | null | Deployed timestamp |
| `environment` | string | Text field |
| `gate_status` | string | Text field |
| `id` | string | Primary key |
| `lint_passed` | boolean | Boolean flag |
| `notes` | string | null |  |
| `rejection_reason` | string | null |  |
| `run_id` | string | run reference |
| `security_passed` | boolean | Boolean flag |
| `tests_passed` | boolean | Boolean flag |
| `triggered_by` | string | Text field |
| `typecheck_passed` | boolean | Boolean flag |

### cto_quality_metrics

| Column | Type | Description |
|--------|------|-------------|
| `avg_build_time_seconds` | number | null | Numeric value |
| `avg_bundle_size_kb` | number | null | Numeric value |
| `avg_coverage` | number | null | Numeric value |
| `avg_pr_review_hours` | number | null | Numeric value |
| `blocked_deploys` | number | null | Numeric value |
| `created_at` | string | Creation timestamp |
| `critical_violations` | number | null | Numeric value |
| `failed_deploys` | number | null | Numeric value |
| `id` | string | Primary key |
| `merged_prs` | number | null | Numeric value |
| `metric_date` | string | Metric date |
| `successful_deploys` | number | null | Numeric value |
| `total_deploys` | number | null | Numeric value |
| `total_prs` | number | null | Numeric value |
| `total_violations` | number | null | Numeric value |
| `warning_violations` | number | null | Numeric value |

### cto_waivers

| Column | Type | Description |
|--------|------|-------------|
| `approved_by` | string | null |  |
| `branch` | string | null |  |
| `created_at` | string | Creation timestamp |
| `expires_at` | string | Expires timestamp |
| `id` | string | Primary key |
| `pr_number` | number | null | Numeric value |
| `reason` | string | Text field |
| `requested_by` | string | Text field |
| `rule_id` | string | rule reference |
| `rule_name` | string | Text field |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |
| `used_at` | string | null | Used timestamp |
| `used_in_run_id` | string | null | used_in_run reference |

### customer_account_types

| Column | Type | Description |
|--------|------|-------------|
| `account_category` | string | Text field |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `is_active` | boolean | Flag indicating if active |
| `type_name` | string | Text field |
| `type_name_ar` | string | Text field |
| `updated_at` | string | Last update timestamp |

### customer_accounts

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | account reference |
| `account_purpose` | string | null |  |
| `account_type_id` | string | null | account_type reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `credit_limit` | number | null | Numeric value |
| `currency` | string | Text field |
| `customer_id` | string | Customer reference |
| `id` | string | Primary key |
| `is_active` | boolean | Flag indicating if active |
| `is_default` | boolean | Flag indicating if default |
| `updated_at` | string | Last update timestamp |

### customer_aging_analysis

| Column | Type | Description |
|--------|------|-------------|
| `analysis_date` | string | Analysis date |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `current_amount` | number | null | Numeric value |
| `customer_id` | string | Customer reference |
| `days_1_30` | number | null | Numeric value |
| `days_31_60` | number | null | Numeric value |
| `days_61_90` | number | null | Numeric value |
| `days_91_120` | number | null | Numeric value |
| `days_over_120` | number | null | Numeric value |
| `id` | string | Primary key |
| `total_outstanding` | number | null | Numeric value |

### customer_balances

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | null | account reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `credit_available` | number | null | Numeric value |
| `credit_limit` | number | null | Numeric value |
| `credit_used` | number | null | Numeric value |
| `current_balance` | number | Numeric value |
| `customer_id` | string | Customer reference |
| `days_overdue` | number | null | Numeric value |
| `id` | string | Primary key |
| `last_payment_amount` | number | null | Numeric value |
| `last_payment_date` | string | null | Last payment date |
| `last_statement_date` | string | null | Last statement date |
| `next_statement_date` | string | null | Next statement date |
| `overdue_amount` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |

### customer_credit_history

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `balance_after` | number | Numeric value |
| `balance_before` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | Customer reference |
| `description` | string | null |  |
| `id` | string | Primary key |
| `reference_id` | string | null | reference reference |
| `reference_type` | string | null |  |
| `transaction_type` | string | Text field |

### customer_deposits

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | null | account reference |
| `amount` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | Creation timestamp |
| `customer_id` | string | Customer reference |
| `deposit_number` | string | Text field |
| `deposit_type` | string | Text field |
| `due_date` | string | null | Due date |
| `id` | string | Primary key |
| `journal_entry_id` | string | null | journal_entry reference |
| `notes` | string | null |  |
| `received_date` | string | Received date |
| `returned_amount` | number | null | Numeric value |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |

### customer_documents

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `customer_id` | string | Customer reference |
| `document_name` | string | Text field |
| `document_type` | string | Text field |
| `file_path` | string | null |  |
| `file_size` | number | null | Numeric value |
| `id` | string | Primary key |
| `is_required` | boolean | null | Flag indicating if required |
| `mime_type` | string | null |  |
| `notes` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `uploaded_at` | string | null | Uploaded timestamp |
| `uploaded_by` | string | null |  |

### customer_financial_summary

| Column | Type | Description |
|--------|------|-------------|
| `average_days_to_pay` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `credit_score` | number | null | Numeric value |
| `customer_id` | string | Customer reference |
| `id` | string | Primary key |
| `largest_outstanding_invoice` | number | null | Numeric value |
| `last_payment_date` | string | null | Last payment date |
| `payment_frequency` | number | null | Numeric value |
| `risk_level` | string | null |  |
| `summary_date` | string | Summary date |
| `total_invoiced` | number | null | Numeric value |
| `total_outstanding` | number | null | Numeric value |
| `total_paid` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |

### customer_notes

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `content` | string | Text field |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | Customer reference |
| `id` | string | Primary key |
| `is_important` | boolean | null | Flag indicating if important |
| `note_type` | string | Text field |
| `title` | string | Text field |
| `updated_at` | string | Last update timestamp |

### customer_payment_scores

| Column | Type | Description |
|--------|------|-------------|
| `broken_promises_deduction` | number | null | Numeric value |
| `calculated_at` | string | Calculated timestamp |
| `category` | string | Text field |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `customer_id` | string | Customer reference |
| `disputes_deduction` | number | null | Numeric value |
| `early_payments_bonus` | number | null | Numeric value |
| `failed_payments_deduction` | number | null | Numeric value |
| `id` | string | Primary key |
| `late_payments_deduction` | number | null | Numeric value |
| `other_bonuses` | number | null | Numeric value |
| `score` | number | Numeric value |

### customers

| Column | Type | Description |
|--------|------|-------------|
| `address` | string | null |  |
| `address_ar` | string | null |  |
| `alternative_phone` | string | null |  |
| `auto_pay_enabled` | boolean | null |  |
| `blacklist_reason` | string | null |  |
| `city` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `company_name` | string | null |  |
| `company_name_ar` | string | null |  |
| `country` | string | null |  |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `credit_limit` | number | null | Numeric value |
| `customer_code` | string | null |  |
| `customer_type` | Database["public"]["Enums"]["customer_type"] | null |  |
| `date_of_birth` | string | null |  |
| `default_cost_center_id` | string | null | default_cost_center reference |
| `documents` | Json | null |  |
| `email` | string | null |  |
| `emergency_contact_name` | string | null |  |
| `emergency_contact_phone` | string | null |  |
| `first_name` | string | null |  |
| `first_name_ar` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_blacklisted` | boolean | null | Flag indicating if blacklisted |
| `last_name` | string | null |  |
| `last_name_ar` | string | null |  |
| `license_expiry` | string | null |  |
| `license_number` | string | null |  |
| `national_id` | string | null | national reference |
| `national_id_expiry` | string | null |  |
| `notes` | string | null |  |
| `passport_number` | string | null |  |
| `phone` | string | Text field |
| `updated_at` | string | Last update timestamp |

### dashboard_widgets

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `data_source` | Json |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `position` | Json | null |  |
| `refresh_interval` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `visualization_config` | Json |  |
| `widget_name` | string | Text field |
| `widget_type` | string | Text field |

### default_account_types

| Column | Type | Description |
|--------|------|-------------|
| `account_category` | string | Text field |
| `created_at` | string | Creation timestamp |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_system` | boolean | null | Flag indicating if system |
| `type_code` | string | Text field |
| `type_name` | string | Text field |
| `type_name_ar` | string | null |  |
| `updated_at` | string | Last update timestamp |

### default_chart_of_accounts

| Column | Type | Description |
|--------|------|-------------|
| `account_code` | string | Text field |
| `account_level` | number | null | Numeric value |
| `account_name` | string | Text field |
| `account_name_ar` | string | null |  |
| `account_subtype` | string | null |  |
| `account_type` | string | Text field |
| `balance_type` | string | Text field |
| `created_at` | string | Creation timestamp |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_header` | boolean | null | Flag indicating if header |
| `is_system` | boolean | null | Flag indicating if system |
| `parent_account_code` | string | null |  |
| `sort_order` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |

### default_cost_centers

| Column | Type | Description |
|--------|------|-------------|
| `center_code` | string | Text field |
| `center_name` | string | Text field |
| `center_name_ar` | string | null |  |
| `created_at` | string | Creation timestamp |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `sort_order` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |

### delinquent_customers

| Column | Type | Description |
|--------|------|-------------|
| `actual_payments_count` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | Contract reference |
| `contract_number` | string | Text field |
| `contract_start_date` | string | Contract start date |
| `credit_limit` | number | null | Numeric value |
| `customer_code` | string | null |  |
| `customer_id` | string | Customer reference |
| `customer_name` | string | Text field |
| `customer_type` | string | null |  |
| `days_overdue` | number | null | Numeric value |
| `email` | string | null |  |
| `expected_payments_count` | number | null | Numeric value |
| `first_detected_at` | string | null | First detected timestamp |
| `has_previous_legal_cases` | boolean | null | Flag indicating if previous legal cases is present |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_blacklisted` | boolean | null | Flag indicating if blacklisted |
| `last_payment_amount` | number | null | Numeric value |
| `last_payment_date` | string | null | Last payment date |
| `last_updated_at` | string | null | Last updated timestamp |
| `late_penalty` | number | null | Numeric value |
| `monthly_rent` | number | Numeric value |
| `months_unpaid` | number | null | Numeric value |
| `overdue_amount` | number | null | Numeric value |
| `phone` | string | null |  |
| `previous_legal_cases_count` | number | null | Numeric value |
| `recommended_action` | string | null |  |
| `risk_color` | string | null |  |
| `risk_level` | string | null |  |
| `risk_level_en` | string | null |  |
| `risk_score` | number | null | Numeric value |
| `total_debt` | number | null | Numeric value |
| `vehicle_id` | string | null | Vehicle reference |
| `vehicle_plate` | string | null |  |
| `violations_amount` | number | null | Numeric value |
| `violations_count` | number | null | Numeric value |

### demo_sessions

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | string | Creation timestamp |
| `demo_user_id` | string | demo_user reference |
| `id` | string | Primary key |
| `is_active` | boolean | Flag indicating if active |
| `trial_end_date` | string | Trial end date |
| `trial_start_date` | string | Trial start date |
| `updated_at` | string | Last update timestamp |

### depreciation_records

| Column | Type | Description |
|--------|------|-------------|
| `accumulated_depreciation` | number | Numeric value |
| `book_value` | number | Numeric value |
| `created_at` | string | Creation timestamp |
| `depreciation_amount` | number | Numeric value |
| `depreciation_date` | string | Depreciation date |
| `fixed_asset_id` | string | fixed_asset reference |
| `id` | string | Primary key |
| `journal_entry_id` | string | null | journal_entry reference |
| `notes` | string | null |  |
| `period_type` | string | Text field |

### dispatch_permit_attachments

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | string | Creation timestamp |
| `file_name` | string | Text field |
| `file_size` | number | null | Numeric value |
| `file_type` | string | Text field |
| `file_url` | string | Text field |
| `id` | string | Primary key |
| `permit_id` | string | permit reference |
| `uploaded_by` | string | Text field |

### dispatch_permit_tracking

| Column | Type | Description |
|--------|------|-------------|
| `change_reason` | string | null |  |
| `changed_by` | string | Text field |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `location` | string | null |  |
| `odometer_reading` | number | null | Numeric value |
| `permit_id` | string | permit reference |
| `status_changed_from` | string | null |  |
| `status_changed_to` | string | Text field |

### document_expiry_alerts

| Column | Type | Description |
|--------|------|-------------|
| `acknowledged_at` | string | null | Acknowledged timestamp |
| `acknowledged_by` | string | null |  |
| `alert_type` | string | Text field |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | Contract reference |
| `contract_number` | string | Text field |
| `created_at` | string | Creation timestamp |
| `customer_id` | string | Customer reference |
| `customer_name` | string | Text field |
| `days_until_expiry` | number | Numeric value |
| `document_type` | string | Text field |
| `expiry_date` | string | Expiry date |
| `id` | string | Primary key |
| `is_acknowledged` | boolean | null | Flag indicating if acknowledged |
| `updated_at` | string | Last update timestamp |

### driver_assignments

| Column | Type | Description |
|--------|------|-------------|
| `commission_amount` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | Contract reference |
| `created_at` | string | null | Creation timestamp |
| `customer_name` | string | Text field |
| `driver_id` | string | driver reference |
| `dropoff_location` | string | Text field |
| `end_date` | string | End date |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `pickup_location` | string | Text field |
| `start_date` | string | Start date |
| `status` | string | null |  |
| `trip_distance` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### drivers

| Column | Type | Description |
|--------|------|-------------|
| `availability_status` | string | null |  |
| `commission_rate` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `email` | string | null |  |
| `full_name` | string | Text field |
| `id` | string | Primary key |
| `license_class` | string | null |  |
| `license_expiry` | string | Text field |
| `license_number` | string | Text field |
| `phone_number` | string | Text field |
| `rating` | number | null | Numeric value |
| `status` | string | null |  |
| `total_earnings` | number | null | Numeric value |
| `total_trips` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `vehicle_id` | string | null | Vehicle reference |

### employees

| Column | Type | Description |
|--------|------|-------------|
| `account_status` | string | null |  |
| `address` | string | null |  |
| `address_ar` | string | null |  |
| `allowances` | number | null | Numeric value |
| `bank_account` | string | null |  |
| `basic_salary` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `department` | string | null |  |
| `department_ar` | string | null |  |
| `email` | string | null |  |
| `emergency_contact_name` | string | null |  |
| `emergency_contact_phone` | string | null |  |
| `employee_number` | string | Text field |
| `first_name` | string | Text field |
| `first_name_ar` | string | null |  |
| `has_system_access` | boolean | null | Flag indicating if system access is present |
| `hire_date` | string | Hire date |
| `iban` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `last_name` | string | Text field |
| `last_name_ar` | string | null |  |
| `national_id` | string | null | national reference |
| `notes` | string | null |  |
| `phone` | string | null |  |
| `position` | string | null |  |
| `position_ar` | string | null |  |
| `termination_date` | string | null | Termination date |
| `updated_at` | string | Last update timestamp |
| `user_id` | string | null | user reference |

### essential_account_mappings

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | null | account reference |
| `account_type` | string | Text field |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `is_configured` | boolean | null | Flag indicating if configured |
| `updated_at` | string | Last update timestamp |

### event_subscriptions

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `event_type` | string | Text field |
| `handler_name` | string | Text field |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `priority` | number | null | Numeric value |

### events

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `data` | Json |  |
| `entity_id` | string | null | entity reference |
| `entity_type` | string | null |  |
| `event_type` | string | Text field |
| `id` | string | Primary key |
| `metadata` | Json | null |  |
| `user_id` | string | null | user reference |

### feature_gates

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | string | null | Creation timestamp |
| `description` | string | null |  |
| `feature_code` | string | Text field |
| `feature_name` | string | Text field |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `required_plans` | string[] | null |  |
| `updated_at` | string | null | Last update timestamp |

### fixed_assets

| Column | Type | Description |
|--------|------|-------------|
| `accumulated_depreciation` | number | null | Numeric value |
| `asset_account_id` | string | null | asset_account reference |
| `asset_code` | string | Text field |
| `asset_name` | string | Text field |
| `asset_name_ar` | string | null |  |
| `book_value` | number | Numeric value |
| `category` | string | Text field |
| `company_id` | string | Company reference (multi-tenancy) |
| `condition_status` | string | null |  |
| `created_at` | string | Creation timestamp |
| `depreciation_account_id` | string | null | depreciation_account reference |
| `depreciation_method` | string | Text field |
| `disposal_amount` | number | null | Numeric value |
| `disposal_date` | string | null | Disposal date |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `location` | string | null |  |
| `notes` | string | null |  |
| `purchase_cost` | number | Numeric value |
| `purchase_date` | string | Purchase date |
| `salvage_value` | number | null | Numeric value |
| `serial_number` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `useful_life_years` | number | Numeric value |

### fleet_reports

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `is_scheduled` | boolean | null | Flag indicating if scheduled |
| `last_generated_at` | string | null | Last generated timestamp |
| `report_config` | Json |  |
| `report_name` | string | Text field |
| `report_name_ar` | string | null |  |
| `report_type` | string | Text field |
| `schedule_config` | Json | null |  |
| `updated_at` | string | Last update timestamp |

### fleet_vehicle_groups

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `description` | string | null |  |
| `group_name` | string | Text field |
| `group_name_ar` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | Flag indicating if active |
| `manager_id` | string | null | manager reference |
| `parent_group_id` | string | null | parent_group reference |
| `updated_at` | string | Last update timestamp |

### fleet_vehicle_insurance

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `contact_email` | string | null |  |
| `contact_person` | string | null |  |
| `contact_phone` | string | null |  |
| `coverage_amount` | number | null | Numeric value |
| `created_at` | string | Creation timestamp |
| `deductible_amount` | number | null | Numeric value |
| `end_date` | string | End date |
| `id` | string | Primary key |
| `insurance_company` | string | Text field |
| `insurance_company_ar` | string | null |  |
| `is_active` | boolean | Flag indicating if active |
| `notes` | string | null |  |
| `policy_document_url` | string | null |  |
| `policy_number` | string | Text field |
| `policy_type` | string | Text field |
| `premium_amount` | number | Numeric value |
| `start_date` | string | Start date |
| `updated_at` | string | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### fuel_records

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `cost_per_liter` | number | Numeric value |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `fuel_date` | string | Fuel date |
| `fuel_station` | string | null |  |
| `fuel_type` | string | Text field |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `odometer_reading` | number | null | Numeric value |
| `quantity_liters` | number | Numeric value |
| `receipt_number` | string | null |  |
| `total_cost` | number | Numeric value |
| `updated_at` | string | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### goods_receipt_items

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | string | Creation timestamp |
| `goods_receipt_id` | string | goods_receipt reference |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `purchase_order_item_id` | string | purchase_order_item reference |
| `received_quantity` | number | Numeric value |

### goods_receipts

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `delivery_note_number` | string | null |  |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `purchase_order_id` | string | purchase_order reference |
| `receipt_date` | string | Receipt date |
| `receipt_number` | string | Text field |
| `received_by` | string | Text field |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |

### hr_settings

| Column | Type | Description |
|--------|------|-------------|
| `allow_negative_balance` | boolean | Boolean flag |
| `auto_calculate_overtime` | boolean | Boolean flag |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `daily_working_hours` | number | Numeric value |
| `email_notifications` | boolean | Boolean flag |
| `id` | string | Primary key |
| `late_penalty_per_hour` | number | Numeric value |
| `late_threshold_minutes` | number | Numeric value |
| `overtime_rate_percentage` | number | Numeric value |
| `pay_date` | number | Pay date |
| `payroll_frequency` | string | Text field |
| `require_manager_approval` | boolean | Boolean flag |
| `sms_notifications` | boolean | Boolean flag |
| `social_security_rate` | number | Numeric value |
| `tax_rate` | number | Numeric value |
| `updated_at` | string | Last update timestamp |
| `work_end_time` | string | Text field |
| `work_start_time` | string | Text field |
| `working_days_per_week` | number | Numeric value |

### inventory_alert_history

| Column | Type | Description |
|--------|------|-------------|
| `alert_type` | string | Text field |
| `company_id` | string | Company reference (multi-tenancy) |
| `context` | Json | null |  |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `message` | string | Text field |
| `recipients` | string[] | null |  |
| `resolution_notes` | string | null |  |
| `resolved_at` | string | null | Resolved timestamp |
| `resolved_by` | string | null |  |
| `rule_id` | string | null | rule reference |
| `severity` | string | Text field |
| `status` | string | null |  |
| `title` | string | Text field |

### inventory_alert_rules

| Column | Type | Description |
|--------|------|-------------|
| `alert_config` | Json |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `last_triggered_at` | string | null | Last triggered timestamp |
| `rule_name` | string | Text field |
| `rule_type` | string | Text field |
| `severity` | string | null |  |
| `trigger_conditions` | Json |  |
| `trigger_count` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### inventory_categories

| Column | Type | Description |
|--------|------|-------------|
| `category_name` | string | Text field |
| `category_name_ar` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `parent_category_id` | string | null | parent_category reference |
| `updated_at` | string | null | Last update timestamp |

### inventory_demand_forecasts

| Column | Type | Description |
|--------|------|-------------|
| `actual_demand` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `confidence_level` | number | null | Numeric value |
| `created_at` | string | null | Creation timestamp |
| `forecast_date` | string | Forecast date |
| `forecast_method` | string | null |  |
| `forecast_period` | string | Text field |
| `id` | string | Primary key |
| `item_id` | string | null | item reference |
| `model_parameters` | Json | null |  |
| `predicted_demand` | number | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `warehouse_id` | string | null | warehouse reference |

### inventory_items

| Column | Type | Description |
|--------|------|-------------|
| `barcode` | string | null |  |
| `category_id` | string | null | category reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `cost_price` | number | null | Numeric value |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `id` | string | Primary key |
| `image_url` | string | null |  |
| `is_active` | boolean | null | Flag indicating if active |
| `is_tracked` | boolean | null | Flag indicating if tracked |
| `item_code` | string | null |  |
| `item_name` | string | Text field |
| `item_name_ar` | string | null |  |
| `item_type` | string | null |  |
| `max_stock_level` | number | null | Numeric value |
| `min_stock_level` | number | null | Numeric value |
| `notes` | string | null |  |
| `reorder_point` | number | null | Numeric value |
| `reorder_quantity` | number | null | Numeric value |
| `sku` | string | null |  |
| `unit_of_measure` | string | null |  |
| `unit_price` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### inventory_movements

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `from_warehouse_id` | string | null | from_warehouse reference |
| `id` | string | Primary key |
| `item_id` | string | item reference |
| `movement_date` | string | null | Movement date |
| `movement_type` | string | Text field |
| `notes` | string | null |  |
| `quantity` | number | Numeric value |
| `reference_id` | string | null | reference reference |
| `reference_number` | string | null |  |
| `reference_type` | string | null |  |
| `to_warehouse_id` | string | null | to_warehouse reference |
| `total_cost` | number | null | Numeric value |
| `unit_cost` | number | null | Numeric value |
| `warehouse_id` | string | warehouse reference |

### inventory_optimization_metrics

| Column | Type | Description |
|--------|------|-------------|
| `calculation_date` | string | Calculation date |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `current_stock_level` | number | null | Numeric value |
| `days_of_supply` | number | null | Numeric value |
| `excess_stock_value` | number | null | Numeric value |
| `holding_cost` | number | null | Numeric value |
| `id` | string | Primary key |
| `inventory_turnover_rate` | number | null | Numeric value |
| `item_id` | string | null | item reference |
| `optimal_stock_level` | number | null | Numeric value |
| `ordering_cost` | number | null | Numeric value |
| `service_level` | number | null | Numeric value |
| `stockout_count` | number | null | Numeric value |
| `total_cost` | number | null | Numeric value |
| `warehouse_id` | string | null | warehouse reference |

### inventory_purchase_order_items

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | string | null | Creation timestamp |
| `expected_delivery_date` | string | null | Expected delivery date |
| `id` | string | Primary key |
| `item_id` | string | item reference |
| `notes` | string | null |  |
| `order_id` | string | order reference |
| `quantity` | number | Numeric value |
| `received_quantity` | number | null | Numeric value |
| `remaining_quantity` | number | null | Numeric value |
| `sku` | string | Text field |
| `total_price` | number | Numeric value |
| `unit_of_measure` | string | null |  |
| `unit_price` | number | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### inventory_purchase_orders

| Column | Type | Description |
|--------|------|-------------|
| `actual_delivery_date` | string | null | Actual delivery date |
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `confirmed_at` | string | null | Confirmed timestamp |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `currency` | string | null |  |
| `delivery_address` | string | null |  |
| `expected_delivery_date` | string | null | Expected delivery date |
| `id` | string | Primary key |
| `internal_reference` | string | null |  |
| `notes` | string | null |  |
| `order_date` | string | null | Order date |
| `order_number` | string | Text field |
| `payment_terms` | string | null |  |
| `sent_at` | string | null | Sent timestamp |
| `status` | string | null |  |
| `supplier_id` | string | supplier reference |
| `total_amount` | number | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### inventory_purchasing_rules

| Column | Type | Description |
|--------|------|-------------|
| `action_config` | Json |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `execution_count` | number | null | Numeric value |
| `execution_frequency` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `last_executed_at` | string | null | Last executed timestamp |
| `notes` | string | null |  |
| `priority` | number | null | Numeric value |
| `rule_name` | string | Text field |
| `rule_type` | string | Text field |
| `success_count` | number | null | Numeric value |
| `supplier_preferences` | Json | null |  |
| `trigger_condition` | Json |  |
| `updated_at` | string | null | Last update timestamp |

### inventory_replenishment_requests

| Column | Type | Description |
|--------|------|-------------|
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `current_stock` | number | Numeric value |
| `expected_delivery_date` | string | null | Expected delivery date |
| `id` | string | Primary key |
| `item_id` | string | null | item reference |
| `notes` | string | null |  |
| `request_number` | string | Text field |
| `requested_quantity` | number | Numeric value |
| `rule_id` | string | null | rule reference |
| `status` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `urgency_level` | string | null |  |
| `warehouse_id` | string | null | warehouse reference |

### inventory_replenishment_rules

| Column | Type | Description |
|--------|------|-------------|
| `category_id` | string | null | category reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `item_id` | string | null | item reference |
| `lead_time_days` | number | null | Numeric value |
| `max_stock_level` | number | null | Numeric value |
| `notes` | string | null |  |
| `priority` | number | null | Numeric value |
| `reorder_point` | number | Numeric value |
| `reorder_quantity` | number | Numeric value |
| `rule_type` | string | Text field |
| `safety_stock` | number | null | Numeric value |
| `supplier_id` | string | null | supplier reference |
| `updated_at` | string | null | Last update timestamp |
| `warehouse_id` | string | null | warehouse reference |

### inventory_reports

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `data` | Json |  |
| `expires_at` | string | null | Expires timestamp |
| `file_size` | number | null | Numeric value |
| `file_url` | string | null |  |
| `generated_at` | string | null | Generated timestamp |
| `generated_by` | string | null |  |
| `id` | string | Primary key |
| `is_public` | boolean | null | Flag indicating if public |
| `parameters` | Json | null |  |
| `report_name` | string | Text field |
| `report_type` | string | Text field |
| `summary` | Json | null |  |
| `tags` | string[] | null |  |
| `updated_at` | string | null | Last update timestamp |

### inventory_snapshots

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `days_of_supply` | number | null | Numeric value |
| `id` | string | Primary key |
| `item_id` | string | item reference |
| `quantity_on_hand` | number | Numeric value |
| `quantity_reserved` | number | null | Numeric value |
| `snapshot_date` | string | Snapshot date |
| `total_cost_value` | number | null | Numeric value |
| `total_selling_value` | number | null | Numeric value |
| `turnover_rate` | number | null | Numeric value |
| `unit_cost` | number | Numeric value |
| `unit_price` | number | Numeric value |
| `warehouse_id` | string | null | warehouse reference |

### inventory_stock_levels

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `id` | string | Primary key |
| `item_id` | string | item reference |
| `last_counted_at` | string | null | Last counted timestamp |
| `last_movement_at` | string | null | Last movement timestamp |
| `quantity_available` | number | null | Numeric value |
| `quantity_on_hand` | number | null | Numeric value |
| `quantity_reserved` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `warehouse_id` | string | warehouse reference |

### inventory_stock_take_lines

| Column | Type | Description |
|--------|------|-------------|
| `counted_at` | string | null | Counted timestamp |
| `counted_by` | string | null |  |
| `counted_quantity` | number | null | Numeric value |
| `id` | string | Primary key |
| `item_id` | string | item reference |
| `notes` | string | null |  |
| `stock_take_id` | string | stock_take reference |
| `system_quantity` | number | null | Numeric value |
| `variance` | number | null | Numeric value |
| `variance_value` | number | null | Numeric value |

### inventory_stock_takes

| Column | Type | Description |
|--------|------|-------------|
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `counted_by` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `status` | string | null |  |
| `stock_take_date` | string | Stock take date |
| `stock_take_number` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `warehouse_id` | string | warehouse reference |

### inventory_supplier_categories

| Column | Type | Description |
|--------|------|-------------|
| `category_name` | string | Text field |
| `category_name_ar` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `updated_at` | string | null | Last update timestamp |

### inventory_supplier_category_mapping

| Column | Type | Description |
|--------|------|-------------|
| `category_id` | string | category reference |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `supplier_id` | string | supplier reference |

### inventory_supplier_performance

| Column | Type | Description |
|--------|------|-------------|
| `average_lead_time_days` | number | null | Numeric value |
| `calculated_at` | string | null | Calculated timestamp |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `delayed_deliveries` | number | null | Numeric value |
| `evaluation_period` | string | Text field |
| `id` | string | Primary key |
| `issues_count` | number | null | Numeric value |
| `on_time_deliveries` | number | null | Numeric value |
| `order_accuracy_rate` | number | null | Numeric value |
| `price_competitiveness_score` | number | null | Numeric value |
| `quality_score` | number | null | Numeric value |
| `responsiveness_score` | number | null | Numeric value |
| `return_rate` | number | null | Numeric value |
| `supplier_id` | string | supplier reference |
| `total_order_value` | number | null | Numeric value |
| `total_orders` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### inventory_supplier_products

| Column | Type | Description |
|--------|------|-------------|
| `availability_status` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `currency` | string | null |  |
| `discount_percentage` | number | null | Numeric value |
| `effective_date` | string | null | Effective date |
| `expiry_date` | string | null | Expiry date |
| `id` | string | Primary key |
| `item_id` | string | null | item reference |
| `last_price_update` | string | null |  |
| `lead_time_days` | number | null | Numeric value |
| `min_order_quantity` | number | null | Numeric value |
| `notes` | string | null |  |
| `package_size` | number | null | Numeric value |
| `quality_rating` | number | null | Numeric value |
| `sku` | string | Text field |
| `supplier_catalog_url` | string | null |  |
| `supplier_id` | string | supplier reference |
| `supplier_product_code` | string | null |  |
| `unit_price` | number | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### inventory_suppliers

| Column | Type | Description |
|--------|------|-------------|
| `address` | string | null |  |
| `city` | string | null |  |
| `commercial_register` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `company_name` | string | Text field |
| `company_name_ar` | string | null |  |
| `contact_person` | string | Text field |
| `country` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `delivery_terms` | string | null |  |
| `email` | string | Text field |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_preferred` | boolean | null | Flag indicating if preferred |
| `lead_time_days` | number | null | Numeric value |
| `minimum_order_value` | number | null | Numeric value |
| `notes` | string | null |  |
| `payment_terms` | string | null |  |
| `phone` | string | Text field |
| `rating` | number | null | Numeric value |
| `tax_number` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `website` | string | null |  |

### inventory_warehouse_transfer_items

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `item_id` | string | item reference |
| `notes` | string | null |  |
| `quantity_received` | number | null | Numeric value |
| `quantity_requested` | number | Numeric value |
| `quantity_shipped` | number | null | Numeric value |
| `transfer_id` | string | transfer reference |
| `updated_at` | string | null | Last update timestamp |

### inventory_warehouse_transfers

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `completed_date` | string | null | Completed date |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `from_warehouse_id` | string | from_warehouse reference |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `status` | string | null |  |
| `to_warehouse_id` | string | to_warehouse reference |
| `transfer_date` | string | Transfer date |
| `transfer_number` | string | Text field |
| `updated_at` | string | null | Last update timestamp |

### inventory_warehouses

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `email` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_default` | boolean | null | Flag indicating if default |
| `location_address` | string | null |  |
| `location_city` | string | null |  |
| `location_country` | string | null |  |
| `manager_id` | string | null | manager reference |
| `phone` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `warehouse_code` | string | null |  |
| `warehouse_name` | string | Text field |
| `warehouse_name_ar` | string | null |  |

### invoice_cost_center_analysis

| Column | Type | Description |
|--------|------|-------------|
| `budget_amount` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `cost_center_id` | string | cost_center reference |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `invoice_type` | string | Text field |
| `period_end` | string | Text field |
| `period_start` | string | Text field |
| `total_amount` | number | Numeric value |
| `total_invoices` | number | Numeric value |
| `updated_at` | string | Last update timestamp |
| `variance_amount` | number | null | Numeric value |
| `variance_percentage` | number | null | Numeric value |

### invoice_items

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | null | account reference |
| `cost_center_id` | string | null | cost_center reference |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `invoice_id` | string | Invoice reference |
| `item_description` | string | Text field |
| `item_description_ar` | string | null |  |
| `line_number` | number | Numeric value |
| `line_total` | number | Numeric value |
| `quantity` | number | null | Numeric value |
| `tax_amount` | number | null | Numeric value |
| `tax_rate` | number | null | Numeric value |
| `unit_price` | number | Numeric value |

### invoice_ocr_logs

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `error_message` | string | null |  |
| `extracted_data` | Json | null |  |
| `id` | string | Primary key |
| `image_url` | string | Text field |
| `invoice_id` | string | null | Invoice reference |
| `match_confidence` | number | null | Numeric value |
| `match_reasons` | string[] | null |  |
| `matched_contract_id` | string | null | matched_contract reference |
| `matched_customer_id` | string | null | matched_customer reference |
| `ocr_confidence` | number | null | Numeric value |
| `processed_by` | string | null |  |
| `processing_status` | string | Text field |
| `updated_at` | string | null | Last update timestamp |

### invoices

| Column | Type | Description |
|--------|------|-------------|
| `balance_due` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | null | Contract reference |
| `cost_center_id` | string | null | cost_center reference |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `currency` | string | null |  |
| `customer_id` | string | null | Customer reference |
| `discount_amount` | number | null | Numeric value |
| `due_date` | string | null | Due date |
| `fixed_asset_id` | string | null | fixed_asset reference |
| `id` | string | Primary key |
| `invoice_date` | string | Invoice date |
| `invoice_number` | string | Text field |
| `invoice_type` | string | Text field |
| `is_legacy` | boolean | null | Flag indicating if legacy |
| `journal_entry_id` | string | null | journal_entry reference |
| `manual_review_required` | boolean | null |  |
| `notes` | string | null |  |
| `ocr_confidence` | number | null | Numeric value |
| `ocr_data` | Json | null |  |
| `paid_amount` | number | null | Numeric value |
| `payment_status` | string | Text field |
| `scanned_image_url` | string | null |  |
| `status` | string | Text field |
| `subtotal` | number | Numeric value |
| `tax_amount` | number | null | Numeric value |
| `terms` | string | null |  |
| `total_amount` | number | Numeric value |
| `updated_at` | string | Last update timestamp |
| `vendor_id` | string | null | vendor reference |

### journal_entries

| Column | Type | Description |
|--------|------|-------------|
| `accounting_period_id` | string | null | accounting_period reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | Text field |
| `entry_date` | string | Entry date |
| `entry_number` | string | Text field |
| `id` | string | Primary key |
| `posted_at` | string | null | Posted timestamp |
| `posted_by` | string | null |  |
| `reference_id` | string | null | reference reference |
| `reference_type` | string | null |  |
| `rejection_reason` | string | null |  |
| `reversal_entry_id` | string | null | reversal_entry reference |
| `reversed_at` | string | null | Reversed timestamp |
| `reversed_by` | string | null |  |
| `reviewed_at` | string | null | Reviewed timestamp |
| `reviewed_by` | string | null |  |
| `status` | string | Text field |
| `total_credit` | number | Numeric value |
| `total_debit` | number | Numeric value |
| `updated_at` | string | Last update timestamp |
| `updated_by` | string | null |  |
| `workflow_notes` | string | null |  |

### journal_entry_lines

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | account reference |
| `asset_id` | string | null | asset reference |
| `cost_center_id` | string | null | cost_center reference |
| `created_at` | string | Creation timestamp |
| `credit_amount` | number | null | Numeric value |
| `debit_amount` | number | null | Numeric value |
| `employee_id` | string | null | Employee reference |
| `id` | string | Primary key |
| `journal_entry_id` | string | journal_entry reference |
| `line_description` | string | null |  |
| `line_number` | number | Numeric value |

### journal_entry_status_history

| Column | Type | Description |
|--------|------|-------------|
| `changed_at` | string | Changed timestamp |
| `changed_by` | string | Text field |
| `created_at` | string | Creation timestamp |
| `from_status` | string | Text field |
| `id` | string | Primary key |
| `journal_entry_id` | string | journal_entry reference |
| `notes` | string | null |  |
| `to_status` | string | Text field |

### knowledge_base_articles

| Column | Type | Description |
|--------|------|-------------|
| `category_id` | string | null | category reference |
| `content` | string | Text field |
| `content_ar` | string | Text field |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | Text field |
| `helpful_count` | number | null | Numeric value |
| `id` | string | Primary key |
| `is_published` | boolean | null | Flag indicating if published |
| `not_helpful_count` | number | null | Numeric value |
| `tags` | string[] | null |  |
| `title` | string | Text field |
| `title_ar` | string | Text field |
| `updated_at` | string | null | Last update timestamp |
| `view_count` | number | null | Numeric value |

### landing_ab_tests

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | null | Company reference (multi-tenancy) |
| `conversion_goal` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `end_date` | string | null | End date |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `start_date` | string | null | Start date |
| `status` | string | null |  |
| `test_name` | string | Text field |
| `test_name_ar` | string | null |  |
| `traffic_split` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `variant_a_config` | Json | null |  |
| `variant_b_config` | Json | null |  |
| `winner_variant` | string | null |  |

### landing_analytics

| Column | Type | Description |
|--------|------|-------------|
| `city` | string | null |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `country` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `device_type` | string | null |  |
| `event_data` | Json | null |  |
| `event_type` | string | Text field |
| `id` | string | Primary key |
| `ip_address` | unknown |  |
| `page_path` | string | null |  |
| `referrer` | string | null |  |
| `session_id` | string | null | session reference |
| `user_agent` | string | null |  |
| `visitor_id` | string | null | visitor reference |

### landing_content

| Column | Type | Description |
|--------|------|-------------|
| `content_key` | string | Text field |
| `content_type` | string | Text field |
| `content_value` | string | null |  |
| `content_value_ar` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `link_url` | string | null |  |
| `media_url` | string | null |  |
| `metadata` | Json | null |  |
| `section_id` | string | null | section reference |
| `sort_order` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### landing_media

| Column | Type | Description |
|--------|------|-------------|
| `alt_text` | string | null |  |
| `alt_text_ar` | string | null |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `file_name` | string | Text field |
| `file_path` | string | Text field |
| `file_size` | number | null | Numeric value |
| `file_type` | string | Text field |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `mime_type` | string | null |  |
| `tags` | string[] | null |  |
| `updated_at` | string | null | Last update timestamp |
| `uploaded_by` | string | null |  |

### landing_sections

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `section_name` | string | Text field |
| `section_name_ar` | string | null |  |
| `section_type` | string | Text field |
| `settings` | Json |  |
| `sort_order` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### landing_settings

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `setting_key` | string | Text field |
| `setting_value` | Json | null |  |
| `updated_at` | string | null | Last update timestamp |

### landing_themes

| Column | Type | Description |
|--------|------|-------------|
| `colors` | Json |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `custom_css` | string | null |  |
| `fonts` | Json |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_default` | boolean | null | Flag indicating if default |
| `spacing` | Json |  |
| `theme_name` | string | Text field |
| `theme_name_ar` | string | null |  |
| `updated_at` | string | null | Last update timestamp |

### late_fee_history

| Column | Type | Description |
|--------|------|-------------|
| `action` | string | Text field |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `late_fee_id` | string | late_fee reference |
| `notes` | string | null |  |
| `user_id` | string | null | user reference |

### late_fee_rules

| Column | Type | Description |
|--------|------|-------------|
| `apply_to_invoice_types` | string[] | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `fee_amount` | number | Numeric value |
| `fee_type` | string | Text field |
| `grace_period_days` | number | null | Numeric value |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `max_fee_amount` | number | null | Numeric value |
| `rule_name` | string | Text field |
| `updated_at` | string | Last update timestamp |

### late_fees

| Column | Type | Description |
|--------|------|-------------|
| `applied_at` | string | null | Applied timestamp |
| `applied_by` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | Creation timestamp |
| `customer_notified_at` | string | null | Customer notified timestamp |
| `days_overdue` | number | Numeric value |
| `fee_amount` | number | Numeric value |
| `fee_type` | string | Text field |
| `id` | string | Primary key |
| `invoice_id` | string | Invoice reference |
| `late_fee_rule_id` | string | null | late_fee_rule reference |
| `notification_sent` | boolean | null |  |
| `original_amount` | number | Numeric value |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |
| `waive_reason` | string | null |  |
| `waive_requested_at` | string | null | Waive requested timestamp |
| `waive_requested_by` | string | null |  |
| `waived_at` | string | null | Waived timestamp |
| `waived_by` | string | null |  |
| `waiver_approval_notes` | string | null |  |

### late_fine_settings

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `fine_rate` | number | Numeric value |
| `fine_type` | string | Text field |
| `grace_period_days` | number | Numeric value |
| `id` | string | Primary key |
| `is_active` | boolean | Flag indicating if active |
| `max_fine_amount` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |

### lawsuit_preparations

| Column | Type | Description |
|--------|------|-------------|
| `amount_in_words` | string | null |  |
| `case_title` | string | null |  |
| `claims_statement_url` | string | null |  |
| `claims_text` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_copy_url` | string | null |  |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | null | Creation timestamp |
| `customer_id` | string | null | Customer reference |
| `defendant_id_number` | string | null |  |
| `defendant_name` | string | Text field |
| `defendant_type` | string | null |  |
| `explanatory_memo_url` | string | null |  |
| `facts_text` | string | null |  |
| `id` | string | Primary key |
| `late_fees` | number | null | Numeric value |
| `notes` | string | null |  |
| `other_fees` | number | null | Numeric value |
| `overdue_rent` | number | null | Numeric value |
| `prepared_at` | string | null | Prepared timestamp |
| `prepared_by` | string | null |  |
| `registered_at` | string | null | Registered timestamp |
| `status` | string | null |  |
| `submitted_at` | string | null | Submitted timestamp |
| `taqadi_case_number` | string | null |  |
| `taqadi_reference_number` | string | null |  |
| `total_amount` | number | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### learning_interactions

| Column | Type | Description |
|--------|------|-------------|
| `accurate` | boolean | null |  |
| `cache_hit` | boolean | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `confidence_score` | number | null | Numeric value |
| `context_data` | Json | null |  |
| `created_at` | string | null | Creation timestamp |
| `feedback_comments` | string | null |  |
| `helpful` | boolean | null |  |
| `id` | string | Primary key |
| `intent` | string | null |  |
| `query` | string | Text field |
| `rating` | number | null | Numeric value |
| `relevant` | boolean | null |  |
| `response` | string | Text field |
| `response_time_ms` | number | null | Numeric value |
| `session_id` | string | session reference |
| `sources_used` | Json | null |  |
| `updated_at` | string | null | Last update timestamp |
| `user_id` | string | null | user reference |

### learning_patterns

| Column | Type | Description |
|--------|------|-------------|
| `average_rating` | number | null | Numeric value |
| `category` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `examples` | Json | null |  |
| `frequency` | number | null | Numeric value |
| `id` | string | Primary key |
| `last_seen` | string | null |  |
| `pattern` | string | Text field |
| `success_rate` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### leave_balances

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | string | null | Creation timestamp |
| `employee_id` | string | Employee reference |
| `id` | string | Primary key |
| `leave_type_id` | string | leave_type reference |
| `remaining_days` | number | null | Numeric value |
| `total_days` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `used_days` | number | null | Numeric value |
| `year` | number | Numeric value |

### leave_requests

| Column | Type | Description |
|--------|------|-------------|
| `applied_date` | string | null | Applied date |
| `attachment_url` | string | null |  |
| `covering_employee_id` | string | null | covering_employee reference |
| `created_at` | string | null | Creation timestamp |
| `emergency_contact` | string | null |  |
| `employee_id` | string | Employee reference |
| `end_date` | string | End date |
| `id` | string | Primary key |
| `leave_type_id` | string | leave_type reference |
| `reason` | string | null |  |
| `review_notes` | string | null |  |
| `reviewed_at` | string | null | Reviewed timestamp |
| `reviewed_by` | string | null |  |
| `start_date` | string | Start date |
| `status` | string | null |  |
| `total_days` | number | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### leave_types

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_paid` | boolean | null | Flag indicating if paid |
| `max_days_per_year` | number | null | Numeric value |
| `requires_approval` | boolean | null |  |
| `type_name` | string | Text field |
| `type_name_ar` | string | null |  |
| `updated_at` | string | null | Last update timestamp |

### legal_ai_access_logs

| Column | Type | Description |
|--------|------|-------------|
| `access_type` | string | Text field |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `customer_id` | string | null | Customer reference |
| `data_accessed` | Json | null |  |
| `id` | string | Primary key |
| `purpose` | string | null |  |
| `user_id` | string | user reference |

### legal_ai_feedback

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `country` | string | null |  |
| `created_at` | string | Creation timestamp |
| `feedback_text` | string | null |  |
| `id` | string | Primary key |
| `message_id` | string | message reference |
| `query` | string | null |  |
| `rating` | number | Numeric value |

### legal_ai_queries

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `confidence_score` | number | null | Numeric value |
| `cost_saved` | boolean | null |  |
| `country` | string | Text field |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | null | Customer reference |
| `id` | string | Primary key |
| `metadata` | Json | null |  |
| `query` | string | Text field |
| `response` | string | null |  |
| `response_time` | number | null | Numeric value |
| `source_type` | string | null |  |
| `usage_count` | number | null | Numeric value |

### legal_case_account_mappings

| Column | Type | Description |
|--------|------|-------------|
| `auto_create_journal_entries` | boolean | null |  |
| `case_type` | string | Text field |
| `client_retainer_liability_account_id` | string | null | client_retainer_liability_account reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `consultation_revenue_account_id` | string | null | consultation_revenue_account reference |
| `court_fees_expense_account_id` | string | null | court_fees_expense_account reference |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `expert_witness_expense_account_id` | string | null | expert_witness_expense_account reference |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `legal_expenses_account_id` | string | null | legal_expenses_account reference |
| `legal_fees_receivable_account_id` | string | null | legal_fees_receivable_account reference |
| `legal_fees_revenue_account_id` | string | null | legal_fees_revenue_account reference |
| `legal_research_expense_account_id` | string | null | legal_research_expense_account reference |
| `settlements_expense_account_id` | string | null | settlements_expense_account reference |
| `settlements_payable_account_id` | string | null | settlements_payable_account reference |
| `updated_at` | string | Last update timestamp |

### legal_case_activities

| Column | Type | Description |
|--------|------|-------------|
| `activity_date` | string | null | Activity date |
| `activity_description` | string | null |  |
| `activity_title` | string | Text field |
| `activity_type` | string | Text field |
| `case_id` | string | case reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `new_values` | Json | null |  |
| `old_values` | Json | null |  |
| `related_correspondence_id` | string | null | related_correspondence reference |
| `related_document_id` | string | null | related_document reference |
| `related_payment_id` | string | null | related_payment reference |

### legal_case_auto_triggers

| Column | Type | Description |
|--------|------|-------------|
| `auto_case_priority` | string | null |  |
| `auto_case_type` | string | null |  |
| `broken_promises_count` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `enable_broken_promises_trigger` | boolean | null |  |
| `enable_overdue_amount_trigger` | boolean | null |  |
| `enable_overdue_invoice_trigger` | boolean | null |  |
| `id` | string | Primary key |
| `notify_on_auto_create` | boolean | null |  |
| `overdue_amount_threshold` | number | null | Numeric value |
| `overdue_days_threshold` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `updated_by` | string | null |  |

### legal_case_correspondence

| Column | Type | Description |
|--------|------|-------------|
| `attachments` | Json | null |  |
| `case_id` | string | case reference |
| `communication_date` | string | null | Communication date |
| `company_id` | string | Company reference (multi-tenancy) |
| `content` | string | null |  |
| `correspondence_type` | string | Text field |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `direction` | string | Text field |
| `id` | string | Primary key |
| `is_confidential` | boolean | null | Flag indicating if confidential |
| `recipient_email` | string | null |  |
| `recipient_name` | string | null |  |
| `recipient_phone` | string | null |  |
| `requires_response` | boolean | null |  |
| `response_deadline` | string | null |  |
| `sender_email` | string | null |  |
| `sender_name` | string | null |  |
| `sender_phone` | string | null |  |
| `status` | string | null |  |
| `subject` | string | Text field |
| `updated_at` | string | Last update timestamp |

### legal_case_documents

| Column | Type | Description |
|--------|------|-------------|
| `access_level` | string | null |  |
| `case_id` | string | case reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `document_date` | string | null | Document date |
| `document_title` | string | Text field |
| `document_title_ar` | string | null |  |
| `document_type` | string | Text field |
| `file_name` | string | null |  |
| `file_path` | string | null |  |
| `file_size` | number | null | Numeric value |
| `file_type` | string | null |  |
| `id` | string | Primary key |
| `is_confidential` | boolean | null | Flag indicating if confidential |
| `is_original` | boolean | null | Flag indicating if original |
| `parent_document_id` | string | null | parent_document reference |
| `updated_at` | string | Last update timestamp |
| `version_number` | number | null | Numeric value |

### legal_case_payments

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `case_id` | string | case reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | Text field |
| `due_date` | string | null | Due date |
| `id` | string | Primary key |
| `invoice_id` | string | null | Invoice reference |
| `journal_entry_id` | string | null | journal_entry reference |
| `notes` | string | null |  |
| `payment_date` | string | null | Payment date |
| `payment_method` | string | null |  |
| `payment_status` | string | null |  |
| `payment_type` | string | Text field |
| `updated_at` | string | Last update timestamp |

### legal_cases

| Column | Type | Description |
|--------|------|-------------|
| `billing_status` | string | null |  |
| `case_direction` | string | null |  |
| `case_number` | string | Text field |
| `case_reference` | string | null |  |
| `case_status` | string | Text field |
| `case_title` | string | Text field |
| `case_title_ar` | string | null |  |
| `case_type` | string | Text field |
| `case_value` | number | null | Numeric value |
| `client_email` | string | null |  |
| `client_id` | string | null | client reference |
| `client_name` | string | null |  |
| `client_phone` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `complaint_number` | string | null |  |
| `contract_id` | string | null | Contract reference |
| `court_fees` | number | null | Numeric value |
| `court_name` | string | null |  |
| `court_name_ar` | string | null |  |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `filing_date` | string | null | Filing date |
| `hearing_date` | string | null | Hearing date |
| `id` | string | Primary key |
| `is_confidential` | boolean | null | Flag indicating if confidential |
| `judge_name` | string | null |  |
| `legal_fees` | number | null | Numeric value |
| `legal_team` | Json | null |  |
| `notes` | string | null |  |
| `other_expenses` | number | null | Numeric value |
| `outcome_amount` | number | null | Numeric value |
| `outcome_amount_type` | string | null |  |
| `outcome_date` | string | null | Outcome date |
| `outcome_journal_entry_id` | string | null | outcome_journal_entry reference |
| `outcome_notes` | string | null |  |
| `outcome_payment_status` | string | null |  |
| `outcome_type` | string | null |  |
| `payment_direction` | string | null |  |
| `police_report_number` | string | null |  |
| `police_station` | string | null |  |
| `primary_lawyer_id` | string | null | primary_lawyer reference |
| `priority` | string | Text field |
| `statute_limitations` | string | null |  |
| `tags` | Json | null |  |
| `total_costs` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |

### legal_consultations

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `cost_usd` | number | null | Numeric value |
| `country` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `customer_id` | string | null | Customer reference |
| `id` | string | Primary key |
| `query` | string | Text field |
| `query_type` | string | null |  |
| `response` | string | Text field |
| `response_time_ms` | number | null | Numeric value |
| `risk_score` | number | null | Numeric value |
| `tokens_used` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### legal_document_generations

| Column | Type | Description |
|--------|------|-------------|
| `approval_status` | string | null |  |
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `body` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `content` | string | Text field |
| `country_law` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | null | Customer reference |
| `document_number` | string | null |  |
| `document_title` | string | null |  |
| `document_type` | string | Text field |
| `id` | string | Primary key |
| `metadata` | Json | null |  |
| `recipient_address` | string | null |  |
| `recipient_entity` | string | null |  |
| `recipient_name` | string | null |  |
| `rejection_reason` | string | null |  |
| `related_contract_id` | string | null | related_contract reference |
| `related_customer_id` | string | null | related_customer reference |
| `related_vehicle_id` | string | null | related_vehicle reference |
| `status` | string | null |  |
| `subject` | string | null |  |
| `template_id` | string | null | template reference |
| `template_used` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `variables_data` | Json | null |  |

### legal_document_templates

| Column | Type | Description |
|--------|------|-------------|
| `body_ar` | string | Text field |
| `body_en` | string | null |  |
| `body_template` | string | null |  |
| `category` | string | null |  |
| `code` | string | Text field |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `description_ar` | string | null |  |
| `description_en` | string | null |  |
| `footer_template` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_system` | boolean | null | Flag indicating if system |
| `name_ar` | string | Text field |
| `name_en` | string | null |  |
| `requires_approval` | boolean | null |  |
| `subject_template` | string | null |  |
| `template_key` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `variables` | Json | null |  |

### legal_knowledge_base

| Column | Type | Description |
|--------|------|-------------|
| `article_content` | string | Text field |
| `article_number` | string | null |  |
| `article_title` | string | null |  |
| `category` | string | Text field |
| `country` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `keywords` | string[] | null |  |
| `law_name` | string | Text field |
| `law_number` | string | null |  |
| `law_year` | number | null | Numeric value |
| `subcategory` | string | null |  |
| `updated_at` | string | null | Last update timestamp |

### legal_memo_templates

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | Text field |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_default` | boolean | null | Flag indicating if default |
| `memo_type` | string | Text field |
| `template_content` | string | Text field |
| `template_name` | string | Text field |
| `template_name_ar` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `variables` | Json | null |  |

### legal_memos

| Column | Type | Description |
|--------|------|-------------|
| `approved_by` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `content` | string | Text field |
| `created_at` | string | Creation timestamp |
| `created_by` | string | Text field |
| `customer_id` | string | Customer reference |
| `data_sources` | Json | null |  |
| `generated_by_ai` | boolean | null |  |
| `id` | string | Primary key |
| `memo_number` | string | Text field |
| `memo_type` | string | Text field |
| `recommendations` | Json | null |  |
| `sent_at` | string | null | Sent timestamp |
| `status` | string | Text field |
| `template_id` | string | null | template reference |
| `title` | string | Text field |
| `updated_at` | string | Last update timestamp |

### maintenance_account_mappings

| Column | Type | Description |
|--------|------|-------------|
| `asset_account_id` | string | null | asset_account reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `expense_account_id` | string | expense_account reference |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `maintenance_type` | string | Text field |
| `updated_at` | string | null | Last update timestamp |

### maintenance_checklist

| Column | Type | Description |
|--------|------|-------------|
| `completed_at` | string | null | Completed timestamp |
| `completed_by` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `is_completed` | boolean | null | Flag indicating if completed |
| `item_description` | string | null |  |
| `item_name` | string | Text field |
| `maintenance_id` | string | maintenance reference |
| `notes` | string | null |  |

### module_settings

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `id` | string | Primary key |
| `is_enabled` | boolean | null | Flag indicating if enabled |
| `last_updated` | string | null |  |
| `module_config` | Json | null |  |
| `module_name` | string | Text field |
| `updated_by` | string | null |  |
| `version` | string | null |  |

### notification_settings

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `email_notifications` | boolean | null |  |
| `expiry_reminder_days` | number | null | Numeric value |
| `id` | string | Primary key |
| `renewal_reminder_days` | number | null | Numeric value |
| `sms_notifications` | boolean | null |  |
| `updated_at` | string | Last update timestamp |
| `user_id` | string | user reference |

### notifications

| Column | Type | Description |
|--------|------|-------------|
| `createdAt` | string | Text field |
| `id` | number | Primary key |
| `isRead` | number | Numeric value |
| `message` | string | Text field |
| `relatedId` | number | null | Numeric value |
| `relatedType` | string | null |  |
| `title` | string | Text field |
| `type` | string | Text field |
| `userId` | number | Numeric value |

### odometer_readings

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `odometer_reading` | number | Numeric value |
| `reading_date` | string | Reading date |
| `reading_type` | string | Text field |
| `recorded_by` | string | null |  |
| `vehicle_id` | string | Vehicle reference |

### orderItems

| Column | Type | Description |
|--------|------|-------------|
| `createdAt` | string | Text field |
| `id` | number | Primary key |
| `orderId` | number | Numeric value |
| `partId` | number | Numeric value |
| `partName` | string | Text field |
| `partNumber` | string | null |  |
| `price` | number | Numeric value |
| `quantity` | number | Numeric value |

### orders

| Column | Type | Description |
|--------|------|-------------|
| `createdAt` | string | Text field |
| `customerEmail` | string | Text field |
| `customerId` | number | null | Numeric value |
| `customerName` | string | Text field |
| `customerPhone` | string | null |  |
| `id` | number | Primary key |
| `paymentMethod` | string | null |  |
| `paymentStatus` | string | Text field |
| `shippingAddress` | string | Text field |
| `shippingCity` | string | Text field |
| `shippingCost` | number | Numeric value |
| `shippingMethod` | string | Text field |
| `shippingZip` | string | Text field |
| `shopId` | number | Numeric value |
| `status` | string | Text field |
| `subtotal` | number | Numeric value |
| `total` | number | Numeric value |
| `trackingNumber` | string | null |  |
| `updatedAt` | string | Text field |

### parts

| Column | Type | Description |
|--------|------|-------------|
| `brand` | string | null |  |
| `category` | string | Text field |
| `compatibleMakes` | string | null |  |
| `compatibleModels` | string | null |  |
| `compatibleYears` | string | null |  |
| `condition` | string | Text field |
| `createdAt` | string | Text field |
| `description` | string | null |  |
| `id` | number | Primary key |
| `imageUrl` | string | null |  |
| `isActive` | number | Numeric value |
| `lowStockThreshold` | number | Numeric value |
| `name` | string | Text field |
| `partNumber` | string | null |  |
| `price` | number | Numeric value |
| `shopId` | number | Numeric value |
| `specifications` | string | null |  |
| `stock` | number | Numeric value |
| `updatedAt` | string | Text field |

### payment_ai_analysis

| Column | Type | Description |
|--------|------|-------------|
| `ai_reasoning` | string | null |  |
| `analysis_model` | string | null |  |
| `analysis_timestamp` | string | null |  |
| `base_amount` | number | null | Numeric value |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `confidence_score` | number | null | Numeric value |
| `contract_reference` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `extracted_amounts` | number[] | null | Numeric value |
| `extracted_contract_numbers` | string[] | null |  |
| `extracted_customer_names` | string[] | null |  |
| `extracted_dates` | string[] | null |  |
| `id` | string | Primary key |
| `is_late_fee` | boolean | null | Flag indicating if late fee |
| `late_fee_amount` | number | null | Numeric value |
| `payment_id` | string | null | Payment reference |
| `payment_type` | string | Text field |
| `period_month` | number | null | Numeric value |
| `period_month_name` | string | null |  |
| `period_year` | number | null | Numeric value |
| `processing_time_ms` | number | null | Numeric value |
| `suggested_actions` | string[] | null |  |
| `updated_at` | string | null | Last update timestamp |

### payment_allocation_rules

| Column | Type | Description |
|--------|------|-------------|
| `actions` | Json |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `conditions` | Json |  |
| `created_at` | string | Creation timestamp |
| `description` | string | null |  |
| `enabled` | boolean | Boolean flag |
| `id` | string | Primary key |
| `name` | string | Text field |
| `priority` | number | Numeric value |
| `updated_at` | string | Last update timestamp |

### payment_allocations

| Column | Type | Description |
|--------|------|-------------|
| `allocated_date` | string | Allocated date |
| `allocation_method` | string | Text field |
| `allocation_type` | string | Text field |
| `amount` | number | Numeric value |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `payment_id` | string | Payment reference |
| `target_id` | string | target reference |
| `updated_at` | string | Last update timestamp |

### payment_attempts

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `attempt_date` | string | Attempt date |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `customer_id` | string | Customer reference |
| `error_code` | string | null |  |
| `failure_reason` | string | null |  |
| `gateway_response` | Json | null |  |
| `id` | string | Primary key |
| `invoice_id` | string | Invoice reference |
| `payment_method` | string | null |  |
| `status` | string | Text field |
| `transaction_id` | string | null | transaction reference |

### payment_behavior_analytics

| Column | Type | Description |
|--------|------|-------------|
| `analyzed_at` | string | Analyzed timestamp |
| `average_days_to_pay` | number | null | Numeric value |
| `best_day_to_contact` | string | null |  |
| `best_time_to_contact` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `customer_id` | string | Customer reference |
| `data_points_count` | number | null | Numeric value |
| `id` | string | Primary key |
| `on_time_payment_rate` | number | null | Numeric value |
| `payment_frequency` | string | null |  |
| `preferred_payment_method` | string | null |  |
| `prefers_reminders` | boolean | null |  |
| `promise_keeping_rate` | number | null | Numeric value |
| `response_rate` | number | null | Numeric value |
| `typical_delay_days` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### payment_contract_linking_attempts

| Column | Type | Description |
|--------|------|-------------|
| `attempted_contract_identifiers` | Json | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `linking_confidence` | number | null | Numeric value |
| `linking_method` | string | null |  |
| `matching_contracts` | Json | null |  |
| `payment_id` | string | null | Payment reference |
| `selected_contract_id` | string | null | selected_contract reference |

### payment_contract_matching

| Column | Type | Description |
|--------|------|-------------|
| `alternative_matches` | Json | null |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `confidence_score` | number | null | Numeric value |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `match_method` | string | Text field |
| `match_reason` | string | null |  |
| `match_status` | string | null |  |
| `payment_id` | string | null | Payment reference |
| `review_notes` | string | null |  |
| `reviewed_at` | string | null | Reviewed timestamp |
| `reviewed_by` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `validation_warnings` | string[] | null |  |

### payment_installments

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `created_at` | string | null | Creation timestamp |
| `due_date` | string | Due date |
| `id` | string | Primary key |
| `installment_number` | number | Numeric value |
| `paid_amount` | number | null | Numeric value |
| `paid_date` | string | null | Paid date |
| `payment_plan_id` | string | payment_plan reference |
| `status` | string | Text field |
| `updated_at` | string | null | Last update timestamp |

### payment_plans

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | Customer reference |
| `end_date` | string | End date |
| `frequency` | string | Text field |
| `id` | string | Primary key |
| `invoice_id` | string | Invoice reference |
| `number_of_payments` | number | Numeric value |
| `start_date` | string | Start date |
| `status` | string | Text field |
| `total_amount` | number | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### payment_promises

| Column | Type | Description |
|--------|------|-------------|
| `actual_paid_amount` | number | null | Numeric value |
| `actual_paid_date` | string | null | Actual paid date |
| `company_id` | string | Company reference (multi-tenancy) |
| `contact_method` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | Customer reference |
| `id` | string | Primary key |
| `invoice_id` | string | Invoice reference |
| `notes` | string | null |  |
| `promise_date` | string | Promise date |
| `promised_amount` | number | Numeric value |
| `status` | string | Text field |
| `updated_at` | string | null | Last update timestamp |

### payment_reminders

| Column | Type | Description |
|--------|------|-------------|
| `clicked_at` | string | null | Clicked timestamp |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `customer_id` | string | Customer reference |
| `id` | string | Primary key |
| `invoice_id` | string | Invoice reference |
| `message_body` | string | null |  |
| `opened_at` | string | null | Opened timestamp |
| `reminder_stage` | string | Text field |
| `responded_at` | string | null | Responded timestamp |
| `response_type` | string | null |  |
| `send_method` | string | null |  |
| `sent_by` | string | null |  |
| `sent_date` | string | Sent date |
| `subject` | string | null |  |
| `template_id` | string | null | template reference |

### payments

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | null | account reference |
| `agreement_number` | string | null |  |
| `allocation_status` | string | null |  |
| `amount` | number | Numeric value |
| `amount_paid` | number | null | Numeric value |
| `bank_account` | string | null |  |
| `bank_id` | string | null | bank reference |
| `check_number` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | null | Contract reference |
| `cost_center_id` | string | null | cost_center reference |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `currency` | string | null |  |
| `customer_id` | string | null | Customer reference |
| `days_overdue` | number | null | Numeric value |
| `description_type` | string | null |  |
| `due_date` | string | null | Due date |
| `id` | string | Primary key |
| `invoice_id` | string | null | Invoice reference |
| `journal_entry_id` | string | null | journal_entry reference |
| `late_fee_amount` | number | null | Numeric value |
| `late_fee_days` | number | null | Numeric value |
| `late_fine_amount` | number | null | Numeric value |
| `late_fine_days_overdue` | number | null | Numeric value |
| `late_fine_status` | string | null |  |
| `late_fine_type` | string | null |  |
| `late_fine_waiver_reason` | string | null |  |
| `linking_confidence` | number | null | Numeric value |
| `monthly_amount` | number | null | Numeric value |
| `notes` | string | null |  |
| `original_due_date` | string | null | Original due date |
| `payment_completion_status` | string | null |  |
| `payment_date` | string | Payment date |
| `payment_method` | string | Text field |
| `payment_month` | string | null |  |
| `payment_number` | string | Text field |
| `payment_status` | string | Text field |
| `payment_type` | string | Text field |
| `processing_notes` | string | null |  |
| `processing_status` | string | null |  |
| `reconciliation_status` | string | null |  |
| `reference_number` | string | null |  |
| `remaining_amount` | number | null | Numeric value |
| `transaction_type` | Database["public"]["Enums"]["transaction_type"] |  |
| `updated_at` | string | Last update timestamp |
| `vendor_id` | string | null | vendor reference |

### payments_backup_20251107

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | null | account reference |
| `agreement_number` | string | null |  |
| `allocation_status` | string | null |  |
| `amount` | number | null | Numeric value |
| `bank_account` | string | null |  |
| `bank_id` | string | null | bank reference |
| `check_number` | string | null |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `contract_id` | string | null | Contract reference |
| `cost_center_id` | string | null | cost_center reference |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `currency` | string | null |  |
| `customer_id` | string | null | Customer reference |
| `description_type` | string | null |  |
| `due_date` | string | null | Due date |
| `id` | string | null | Primary key |
| `invoice_id` | string | null | Invoice reference |
| `journal_entry_id` | string | null | journal_entry reference |
| `late_fine_amount` | number | null | Numeric value |
| `late_fine_days_overdue` | number | null | Numeric value |
| `late_fine_status` | string | null |  |
| `late_fine_type` | string | null |  |
| `late_fine_waiver_reason` | string | null |  |
| `linking_confidence` | number | null | Numeric value |
| `notes` | string | null |  |
| `original_due_date` | string | null | Original due date |
| `payment_date` | string | null | Payment date |
| `payment_method` | string | null |  |
| `payment_number` | string | null |  |
| `payment_status` | string | null |  |
| `payment_type` | string | null |  |
| `processing_notes` | string | null |  |
| `processing_status` | string | null |  |
| `reconciliation_status` | string | null |  |
| `reference_number` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `vendor_id` | string | null | vendor reference |

### payroll

| Column | Type | Description |
|--------|------|-------------|
| `allowances` | number | null | Numeric value |
| `bank_account` | string | null |  |
| `basic_salary` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `deductions` | number | null | Numeric value |
| `employee_id` | string | Employee reference |
| `id` | string | Primary key |
| `journal_entry_id` | string | null | journal_entry reference |
| `net_amount` | number | Numeric value |
| `notes` | string | null |  |
| `overtime_amount` | number | null | Numeric value |
| `pay_period_end` | string | Text field |
| `pay_period_start` | string | Text field |
| `payment_method` | string | null |  |
| `payroll_date` | string | Payroll date |
| `payroll_number` | string | Text field |
| `status` | string | Text field |
| `tax_amount` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |

### payroll_reviews

| Column | Type | Description |
|--------|------|-------------|
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `journal_entry_id` | string | null | journal_entry reference |
| `net_amount` | number | null | Numeric value |
| `notes` | string | null |  |
| `period_end` | string | Text field |
| `period_start` | string | Text field |
| `reviewed_at` | string | null | Reviewed timestamp |
| `reviewed_by` | string | null |  |
| `status` | string | Text field |
| `total_amount` | number | null | Numeric value |
| `total_deductions` | number | null | Numeric value |
| `total_employees` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |

### payroll_settings

| Column | Type | Description |
|--------|------|-------------|
| `allow_negative_balance` | boolean | null |  |
| `auto_calculate_overtime` | boolean | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `late_penalty_per_hour` | number | null | Numeric value |
| `overtime_rate` | number | null | Numeric value |
| `pay_date` | number | null | Pay date |
| `payroll_frequency` | string | null |  |
| `social_security_rate` | number | null | Numeric value |
| `tax_rate` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |
| `working_days_per_month` | number | null | Numeric value |
| `working_hours_per_day` | number | null | Numeric value |

### payroll_slips

| Column | Type | Description |
|--------|------|-------------|
| `absent_days` | number | null | Numeric value |
| `allowances` | number | null | Numeric value |
| `bank_reference` | string | null |  |
| `basic_salary` | number | Numeric value |
| `created_at` | string | Creation timestamp |
| `employee_id` | string | Employee reference |
| `id` | string | Primary key |
| `late_days` | number | null | Numeric value |
| `late_penalty` | number | null | Numeric value |
| `net_salary` | number | null | Numeric value |
| `notes` | string | null |  |
| `other_deductions` | number | null | Numeric value |
| `overtime_amount` | number | null | Numeric value |
| `overtime_hours` | number | null | Numeric value |
| `paid_at` | string | null | Paid timestamp |
| `payment_method` | string | null |  |
| `payroll_review_id` | string | payroll_review reference |
| `period_end` | string | Text field |
| `period_start` | string | Text field |
| `present_days` | number | null | Numeric value |
| `social_security_deduction` | number | null | Numeric value |
| `status` | string | Text field |
| `tax_deduction` | number | null | Numeric value |
| `total_deductions` | number | null | Numeric value |
| `total_earnings` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |
| `working_days` | number | null | Numeric value |

### penalties

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | null | Customer reference |
| `id` | string | Primary key |
| `location` | string | null |  |
| `notes` | string | null |  |
| `payment_status` | string | null |  |
| `penalty_date` | string | Penalty date |
| `penalty_number` | string | Text field |
| `reason` | string | null |  |
| `status` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `vehicle_id` | string | null | Vehicle reference |
| `vehicle_plate` | string | null |  |
| `violation_type` | string | null |  |

### pending_journal_entries

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | Contract reference |
| `created_at` | string | null | Creation timestamp |
| `entry_type` | string | Text field |
| `id` | string | Primary key |
| `last_error` | string | null |  |
| `max_retries` | number | null | Numeric value |
| `metadata` | Json | null |  |
| `next_retry_at` | string | null | Next retry timestamp |
| `priority` | number | null | Numeric value |
| `processed_at` | string | null | Processed timestamp |
| `retry_count` | number | null | Numeric value |
| `status` | string | null |  |

### performance_metrics

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `metric_name` | string | Text field |
| `metric_unit` | string | null |  |
| `metric_value` | number | Numeric value |
| `recorded_at` | string | null | Recorded timestamp |
| `tags` | Json | null |  |

### permission_change_requests

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `current_permissions` | string[] | null |  |
| `current_roles` | string[] | null |  |
| `employee_id` | string | Employee reference |
| `expires_at` | string | Expires timestamp |
| `id` | string | Primary key |
| `reason` | string | Text field |
| `rejection_reason` | string | null |  |
| `request_type` | string | Text field |
| `requested_by` | string | Text field |
| `requested_permissions` | string[] | null |  |
| `requested_roles` | string[] | null |  |
| `reviewed_at` | string | null | Reviewed timestamp |
| `reviewed_by` | string | null |  |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |

### profiles

| Column | Type | Description |
|--------|------|-------------|
| `avatar_url` | string | null |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `email` | string | Text field |
| `first_name` | string | Text field |
| `first_name_ar` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_demo_user` | boolean | null | Flag indicating if demo user |
| `language_preference` | string | null |  |
| `last_name` | string | Text field |
| `last_name_ar` | string | null |  |
| `national_id` | string | null | national reference |
| `phone` | string | null |  |
| `position` | string | null |  |
| `position_ar` | string | null |  |
| `timezone` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `user_id` | string | user reference |

### properties

| Column | Type | Description |
|--------|------|-------------|
| `address` | string | null |  |
| `address_ar` | string | null |  |
| `area_sqm` | number | null | Numeric value |
| `bathrooms` | number | null | Numeric value |
| `bedrooms` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `currency` | string | null |  |
| `description` | string | null |  |
| `description_ar` | string | null |  |
| `documents` | string[] | null |  |
| `features` | Json | null |  |
| `floor_number` | number | null | Numeric value |
| `furnished` | boolean | null |  |
| `id` | string | Primary key |
| `images` | string[] | null |  |
| `is_active` | boolean | null | Flag indicating if active |
| `location_coordinates` | Json | null |  |
| `manager_id` | string | null | manager reference |
| `owner_id` | string | null | owner reference |
| `parking_spaces` | number | null | Numeric value |
| `property_code` | string | Text field |
| `property_name` | string | Text field |
| `property_name_ar` | string | null |  |
| `property_status` | string | Text field |
| `property_type` | string | Text field |
| `rental_price` | number | null | Numeric value |
| `sale_price` | number | null | Numeric value |
| `total_floors` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### property_contracts

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | null | account reference |
| `auto_renewal` | boolean | null |  |
| `commission_amount` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_number` | string | Text field |
| `contract_type` | string | Text field |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `currency` | string | null |  |
| `deposit_amount` | number | null | Numeric value |
| `end_date` | string | null | End date |
| `grace_period_days` | number | null | Numeric value |
| `id` | string | Primary key |
| `insurance_required` | boolean | null |  |
| `is_active` | boolean | null | Flag indicating if active |
| `journal_entry_id` | string | null | journal_entry reference |
| `late_fee_rate` | number | null | Numeric value |
| `maintenance_responsibility` | string | null |  |
| `notes` | string | null |  |
| `payment_day` | number | null | Numeric value |
| `payment_frequency` | string | null |  |
| `property_id` | string | property reference |
| `renewal_period` | number | null | Numeric value |
| `rental_amount` | number | null | Numeric value |
| `security_deposit` | number | null | Numeric value |
| `start_date` | string | Start date |
| `status` | string | null |  |
| `tenant_id` | string | null | tenant reference |
| `terms` | string | null |  |
| `terms_ar` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `utilities_included` | boolean | null |  |

### property_maintenance

| Column | Type | Description |
|--------|------|-------------|
| `actual_cost` | number | null | Numeric value |
| `assigned_to` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `completion_date` | string | null | Completion date |
| `completion_notes` | string | null |  |
| `contractor_name` | string | null |  |
| `contractor_phone` | string | null |  |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `currency` | string | null |  |
| `description` | string | null |  |
| `description_ar` | string | null |  |
| `documents` | string[] | null |  |
| `estimated_cost` | number | null | Numeric value |
| `id` | string | Primary key |
| `images` | string[] | null |  |
| `is_active` | boolean | null | Flag indicating if active |
| `location_details` | string | null |  |
| `maintenance_number` | string | Text field |
| `maintenance_type` | string | Text field |
| `notes` | string | null |  |
| `priority` | string | Text field |
| `property_id` | string | property reference |
| `quality_rating` | number | null | Numeric value |
| `requested_date` | string | Requested date |
| `required_materials` | string[] | null |  |
| `scheduled_date` | string | null | Scheduled date |
| `start_date` | string | null | Start date |
| `status` | string | Text field |
| `title` | string | Text field |
| `title_ar` | string | null |  |
| `updated_at` | string | Last update timestamp |

### property_owners

| Column | Type | Description |
|--------|------|-------------|
| `address` | string | null |  |
| `address_ar` | string | null |  |
| `bank_account_info` | Json | null |  |
| `civil_id` | string | null | civil reference |
| `commission_percentage` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `email` | string | null |  |
| `full_name` | string | Text field |
| `full_name_ar` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `nationality` | string | null |  |
| `notes` | string | null |  |
| `owner_code` | string | Text field |
| `phone` | string | null |  |
| `updated_at` | string | null | Last update timestamp |

### property_payments

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `currency` | string | null |  |
| `due_date` | string | Due date |
| `id` | string | Primary key |
| `journal_entry_id` | string | null | journal_entry reference |
| `late_fee` | number | null | Numeric value |
| `notes` | string | null |  |
| `payment_date` | string | null | Payment date |
| `payment_method` | string | null |  |
| `payment_number` | string | Text field |
| `payment_type` | string | Text field |
| `property_contract_id` | string | property_contract reference |
| `reference_number` | string | null |  |
| `status` | string | null |  |
| `total_amount` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### purchase_order_items

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | string | Creation timestamp |
| `description` | string | Text field |
| `description_ar` | string | null |  |
| `id` | string | Primary key |
| `item_code` | string | null |  |
| `notes` | string | null |  |
| `purchase_order_id` | string | purchase_order reference |
| `quantity` | number | Numeric value |
| `received_quantity` | number | null | Numeric value |
| `total_price` | number | Numeric value |
| `unit_of_measure` | string | null |  |
| `unit_price` | number | Numeric value |
| `updated_at` | string | Last update timestamp |

### purchase_orders

| Column | Type | Description |
|--------|------|-------------|
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `contact_person` | string | null |  |
| `created_at` | string | Creation timestamp |
| `created_by` | string | Text field |
| `currency` | string | Text field |
| `delivery_address` | string | null |  |
| `delivery_date` | string | null | Delivery date |
| `email` | string | null |  |
| `expected_delivery_date` | string | null | Expected delivery date |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `order_date` | string | Order date |
| `order_number` | string | Text field |
| `phone` | string | null |  |
| `status` | string | Text field |
| `subtotal` | number | Numeric value |
| `tax_amount` | number | Numeric value |
| `terms_and_conditions` | string | null |  |
| `total_amount` | number | Numeric value |
| `updated_at` | string | Last update timestamp |
| `vendor_id` | string | vendor reference |

### qatar_legal_texts

| Column | Type | Description |
|--------|------|-------------|
| `article_number` | string | null |  |
| `article_text_ar` | string | Text field |
| `article_text_en` | string | null |  |
| `article_title_ar` | string | null |  |
| `chapter_number` | string | null |  |
| `chapter_title` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `id` | number | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `keywords` | string[] | null |  |
| `law_number` | string | null |  |
| `law_type` | string | Text field |
| `part_number` | string | null |  |
| `part_title` | string | null |  |
| `source_url` | string | null |  |
| `title_ar` | string | Text field |
| `title_en` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `year` | number | null | Numeric value |

### quotation_approval_log

| Column | Type | Description |
|--------|------|-------------|
| `action` | string | Text field |
| `client_ip` | string | null |  |
| `client_user_agent` | string | null |  |
| `comments` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `quotation_id` | string | quotation reference |

### quotations

| Column | Type | Description |
|--------|------|-------------|
| `approval_expires_at` | string | null | Approval expires timestamp |
| `approval_token` | string | null |  |
| `approved_at` | string | null | Approved timestamp |
| `approved_by_client` | boolean | null |  |
| `client_approval_url` | string | null |  |
| `client_comments` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | Customer reference |
| `description` | string | null |  |
| `duration` | number | Numeric value |
| `id` | string | Primary key |
| `quotation_number` | string | Text field |
| `quotation_type` | string | Text field |
| `rate_per_unit` | number | Numeric value |
| `status` | string | Text field |
| `terms` | string | null |  |
| `total_amount` | number | Numeric value |
| `updated_at` | string | Last update timestamp |
| `valid_until` | string | Text field |
| `vehicle_id` | string | null | Vehicle reference |

### rate_limits

| Column | Type | Description |
|--------|------|-------------|
| `attempt_count` | number | null | Numeric value |
| `blocked_until` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `operation_type` | string | Text field |
| `user_id` | string | null | user reference |
| `window_start` | string | null |  |

### regulatory_reports

| Column | Type | Description |
|--------|------|-------------|
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `compliance_score` | number | null | Numeric value |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `file_attachments` | string[] | null |  |
| `findings_count` | number | null | Numeric value |
| `id` | string | Primary key |
| `jurisdiction` | string | Text field |
| `rejection_reason` | string | null |  |
| `report_data` | Json |  |
| `report_subtype` | string | null |  |
| `report_summary` | string | null |  |
| `report_type` | string | Text field |
| `reporting_period_end` | string | Text field |
| `reporting_period_start` | string | Text field |
| `status` | string | null |  |
| `submission_date` | string | null | Submission date |
| `submission_deadline` | string | null |  |
| `submission_method` | string | null |  |
| `submission_reference` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `violations_count` | number | null | Numeric value |

### reminder_history

| Column | Type | Description |
|--------|------|-------------|
| `action` | string | Text field |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | Creation timestamp |
| `customer_id` | string | null | Customer reference |
| `error_message` | string | null |  |
| `id` | string | Primary key |
| `message_sent` | string | null |  |
| `phone_number` | string | null |  |
| `reminder_schedule_id` | string | reminder_schedule reference |
| `reminder_type` | string | null |  |
| `sent_at` | string | null | Sent timestamp |
| `success` | boolean | null |  |
| `user_id` | string | null | user reference |

### reminder_schedules

| Column | Type | Description |
|--------|------|-------------|
| `channel` | string | null |  |
| `clicked_at` | string | null | Clicked timestamp |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | Customer reference |
| `customer_name` | string | null |  |
| `delivery_status` | string | null |  |
| `email_address` | string | null |  |
| `id` | string | Primary key |
| `invoice_id` | string | Invoice reference |
| `last_error` | string | null |  |
| `message_template` | string | null |  |
| `message_variables` | Json | null |  |
| `next_retry_at` | string | null | Next retry timestamp |
| `opened_at` | string | null | Opened timestamp |
| `phone_number` | string | null |  |
| `reminder_type` | string | Text field |
| `responded_at` | string | null | Responded timestamp |
| `retry_count` | number | null | Numeric value |
| `scheduled_date` | string | Scheduled date |
| `scheduled_time` | string | null |  |
| `send_cost` | number | null | Numeric value |
| `sent_at` | string | null | Sent timestamp |
| `sent_by` | string | null |  |
| `status` | string | Text field |
| `subject` | string | null |  |
| `template_id` | string | null | template reference |
| `updated_at` | string | Last update timestamp |
| `variant` | string | null |  |

### reminder_schedules_backup_20250101

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `customer_id` | string | null | Customer reference |
| `customer_name` | string | null |  |
| `error_message` | string | null |  |
| `id` | string | null | Primary key |
| `invoice_id` | string | null | Invoice reference |
| `message_template` | string | null |  |
| `message_variables` | Json | null |  |
| `phone_number` | string | null |  |
| `receipt_id` | string | null | receipt reference |
| `reminder_type` | string | null |  |
| `retry_count` | number | null | Numeric value |
| `scheduled_date` | string | null | Scheduled date |
| `scheduled_time` | string | null |  |
| `sent_at` | string | null | Sent timestamp |
| `status` | string | null |  |
| `template_id` | string | null | template reference |
| `updated_at` | string | null | Last update timestamp |

### reminder_templates

| Column | Type | Description |
|--------|------|-------------|
| `avoid_holidays` | boolean | null |  |
| `avoid_weekends` | boolean | null |  |
| `body` | string | Text field |
| `channel` | string | Text field |
| `clicked_count` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `conversion_rate` | number | null | Numeric value |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_default` | boolean | null | Flag indicating if default |
| `language` | string | null |  |
| `name` | string | Text field |
| `opened_count` | number | null | Numeric value |
| `reminder_type` | string | null |  |
| `response_count` | number | null | Numeric value |
| `send_time_preference` | string | null |  |
| `sent_count` | number | null | Numeric value |
| `stage` | string | Text field |
| `status` | string | Text field |
| `subject` | string | Text field |
| `template_name` | string | null |  |
| `template_text` | string | null |  |
| `tone` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `variant` | string | null |  |

### reminder_templates_backup_20250101

| Column | Type | Description |
|--------|------|-------------|
| `avoid_holidays` | boolean | null |  |
| `avoid_weekends` | boolean | null |  |
| `body` | string | null |  |
| `channel` | string | null |  |
| `clicked_count` | number | null | Numeric value |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `conversion_rate` | number | null | Numeric value |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | null | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_default` | boolean | null | Flag indicating if default |
| `language` | string | null |  |
| `name` | string | null |  |
| `opened_count` | number | null | Numeric value |
| `reminder_type` | string | null |  |
| `response_count` | number | null | Numeric value |
| `send_time_preference` | string | null |  |
| `sent_count` | number | null | Numeric value |
| `stage` | string | null |  |
| `status` | string | null |  |
| `subject` | string | null |  |
| `template_name` | string | null |  |
| `template_text` | string | null |  |
| `tone` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `variant` | string | null |  |

### rental_payment_receipts

| Column | Type | Description |
|--------|------|-------------|
| `amount_due` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | Customer reference |
| `customer_name` | string | Text field |
| `fine` | number | Numeric value |
| `fiscal_year` | number | null | Numeric value |
| `id` | string | Primary key |
| `invoice_id` | string | null | Invoice reference |
| `is_late` | boolean | null | Flag indicating if late |
| `month` | string | Text field |
| `month_number` | number | null | Numeric value |
| `notes` | string | null |  |
| `payment_date` | string | Payment date |
| `payment_method` | string | null |  |
| `payment_status` | string | Text field |
| `pending_balance` | number | Numeric value |
| `receipt_number` | string | null |  |
| `reference_number` | string | null |  |
| `rent_amount` | number | Numeric value |
| `total_paid` | number | Numeric value |
| `updated_at` | string | Last update timestamp |
| `vehicle_id` | string | null | Vehicle reference |

### report_templates

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `filters` | Json | null |  |
| `id` | string | Primary key |
| `is_default` | boolean | null | Flag indicating if default |
| `is_public` | boolean | null | Flag indicating if public |
| `layout` | Json |  |
| `template_name` | string | Text field |
| `template_type` | string | Text field |
| `updated_at` | string | null | Last update timestamp |

### sales_leads

| Column | Type | Description |
|--------|------|-------------|
| `assigned_to` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `email` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `lead_name` | string | Text field |
| `lead_name_ar` | string | null |  |
| `notes` | string | null |  |
| `phone` | string | null |  |
| `source` | string | null |  |
| `status` | string | null |  |
| `updated_at` | string | null | Last update timestamp |

### sales_opportunities

| Column | Type | Description |
|--------|------|-------------|
| `assigned_to` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `estimated_value` | number | null | Numeric value |
| `expected_close_date` | string | null | Expected close date |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `lead_id` | string | null | lead reference |
| `notes` | string | null |  |
| `opportunity_name` | string | Text field |
| `opportunity_name_ar` | string | null |  |
| `probability` | number | null | Numeric value |
| `stage` | string | null |  |
| `updated_at` | string | null | Last update timestamp |

### sales_orders

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | null | Customer reference |
| `delivery_date` | string | null | Delivery date |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `items` | Json | null |  |
| `notes` | string | null |  |
| `order_date` | string | Order date |
| `order_number` | string | Text field |
| `quote_id` | string | null | quote reference |
| `status` | string | null |  |
| `total` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### sales_quotes

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | null | Customer reference |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `items` | Json | null |  |
| `notes` | string | null |  |
| `opportunity_id` | string | null | opportunity reference |
| `quote_number` | string | Text field |
| `status` | string | null |  |
| `subtotal` | number | null | Numeric value |
| `tax` | number | null | Numeric value |
| `total` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `valid_until` | string | null |  |

### saved_conversations

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `conversation_data` | Json |  |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `name` | string | Text field |
| `session_id` | string | null | session reference |
| `updated_at` | string | Last update timestamp |
| `user_id` | string | null | user reference |

### saved_csv_files

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `file_name` | string | Text field |
| `file_path` | string | Text field |
| `file_size` | number | Numeric value |
| `file_type` | string | Text field |
| `id` | string | Primary key |
| `last_import_at` | string | null | Last import timestamp |
| `last_import_status` | string | null |  |
| `last_import_summary` | Json | null |  |
| `metadata` | Json | null |  |
| `original_file_name` | string | Text field |
| `row_count` | number | null | Numeric value |
| `status` | string | Text field |
| `tags` | string[] | null |  |
| `updated_at` | string | Last update timestamp |
| `upload_method` | string | null |  |

### scheduled_followups

| Column | Type | Description |
|--------|------|-------------|
| `assigned_to` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `completed_at` | string | null | Completed timestamp |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `customer_id` | string | Customer reference |
| `description` | string | null |  |
| `followup_type` | string | Text field |
| `id` | string | Primary key |
| `legal_case_id` | string | null | legal_case reference |
| `notes` | string | null |  |
| `outcome` | string | null |  |
| `outcome_notes` | string | null |  |
| `priority` | string | Text field |
| `reminder_sent` | boolean | null |  |
| `reminder_sent_at` | string | null | Reminder sent timestamp |
| `scheduled_date` | string | Scheduled date |
| `scheduled_time` | string | null |  |
| `source` | string | null |  |
| `source_reference` | string | null |  |
| `status` | string | Text field |
| `title` | string | Text field |
| `updated_at` | string | null | Last update timestamp |

### scheduled_report_logs

| Column | Type | Description |
|--------|------|-------------|
| `completed_at` | string | null | Completed timestamp |
| `created_at` | string | null | Creation timestamp |
| `error_message` | string | null |  |
| `failed_count` | number | null | Numeric value |
| `id` | string | Primary key |
| `report_type` | string | Text field |
| `response_data` | Json | null |  |
| `scheduled_time` | string | Text field |
| `sent_count` | number | null | Numeric value |
| `started_at` | string | null | Started timestamp |
| `status` | string | null |  |

### scheduled_reports

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `error_count` | number | null | Numeric value |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `last_error` | string | null |  |
| `last_run_at` | string | null | Last run timestamp |
| `next_run_at` | string | null | Next run timestamp |
| `parameters` | Json | null |  |
| `report_name` | string | Text field |
| `report_type` | string | Text field |
| `run_count` | number | null | Numeric value |
| `schedule` | Json |  |
| `success_count` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### service_ratings

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `feedback` | string | null |  |
| `id` | string | Primary key |
| `rated_by` | string | Text field |
| `rating` | number | Numeric value |
| `resolution_quality_rating` | number | null | Numeric value |
| `response_time_rating` | number | null | Numeric value |
| `staff_helpfulness_rating` | number | null | Numeric value |
| `ticket_id` | string | ticket reference |

### shops

| Column | Type | Description |
|--------|------|-------------|
| `address` | string | null |  |
| `createdAt` | string | Text field |
| `description` | string | null |  |
| `email` | string | null |  |
| `id` | number | Primary key |
| `isActive` | number | Numeric value |
| `logoUrl` | string | null |  |
| `name` | string | Text field |
| `phone` | string | null |  |
| `updatedAt` | string | Text field |
| `userId` | number | Numeric value |

### subscription_plans

| Column | Type | Description |
|--------|------|-------------|
| `billing_cycle` | string | Text field |
| `created_at` | string | null | Creation timestamp |
| `description` | string | null |  |
| `features` | Json | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_default` | boolean | null | Flag indicating if default |
| `max_companies` | number | null | Numeric value |
| `max_contracts` | number | null | Numeric value |
| `max_customers` | number | null | Numeric value |
| `max_users` | number | null | Numeric value |
| `max_vehicles` | number | null | Numeric value |
| `name` | string | Text field |
| `name_ar` | string | null |  |
| `plan_code` | string | null |  |
| `price` | number | Numeric value |
| `price_monthly` | number | null | Numeric value |
| `price_yearly` | number | null | Numeric value |
| `storage_limit_gb` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |

### subscription_transactions

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `billing_period_end` | string | null |  |
| `billing_period_start` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `currency` | string | null |  |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `payment_method` | string | null |  |
| `processed_at` | string | null | Processed timestamp |
| `status` | string | Text field |
| `subscription_plan_id` | string | subscription_plan reference |
| `transaction_reference` | string | null |  |
| `updated_at` | string | null | Last update timestamp |

### support_ticket_categories

| Column | Type | Description |
|--------|------|-------------|
| `color` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `name` | string | Text field |
| `name_ar` | string | Text field |
| `updated_at` | string | null | Last update timestamp |

### support_ticket_replies

| Column | Type | Description |
|--------|------|-------------|
| `attachments` | Json | null |  |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `is_internal` | boolean | null | Flag indicating if internal |
| `message` | string | Text field |
| `ticket_id` | string | ticket reference |
| `updated_at` | string | null | Last update timestamp |
| `user_id` | string | user reference |

### support_tickets

| Column | Type | Description |
|--------|------|-------------|
| `assigned_to` | string | null |  |
| `category_id` | string | category reference |
| `closed_at` | string | null | Closed timestamp |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | Text field |
| `description` | string | Text field |
| `first_response_at` | string | null | First response timestamp |
| `id` | string | Primary key |
| `priority` | string | Text field |
| `resolved_at` | string | null | Resolved timestamp |
| `satisfaction_feedback` | string | null |  |
| `satisfaction_rating` | number | null | Numeric value |
| `status` | string | Text field |
| `ticket_number` | string | Text field |
| `title` | string | Text field |
| `updated_at` | string | null | Last update timestamp |

### system_alerts

| Column | Type | Description |
|--------|------|-------------|
| `acknowledged_at` | string | null | Acknowledged timestamp |
| `acknowledged_by` | string | null |  |
| `alert_type` | string | Text field |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `details` | Json | null |  |
| `expires_at` | string | null | Expires timestamp |
| `id` | string | Primary key |
| `message` | string | Text field |
| `resolved_at` | string | null | Resolved timestamp |
| `severity` | string | Text field |
| `status` | string | null |  |
| `title` | string | Text field |

### system_analytics

| Column | Type | Description |
|--------|------|-------------|
| `category` | string | Text field |
| `created_at` | string | null | Creation timestamp |
| `date_recorded` | string | Text field |
| `id` | string | Primary key |
| `metadata` | Json | null |  |
| `metric_name` | string | Text field |
| `metric_type` | string | Text field |
| `metric_value` | number | Numeric value |
| `time_period` | string | null |  |

### system_logs

| Column | Type | Description |
|--------|------|-------------|
| `action` | string | Text field |
| `category` | string | Text field |
| `company_id` | string | null | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `duration_ms` | number | null | Numeric value |
| `id` | string | Primary key |
| `ip_address` | unknown |  |
| `level` | string | Text field |
| `message` | string | Text field |
| `metadata` | Json | null |  |
| `resource_id` | string | null | resource reference |
| `resource_type` | string | null |  |
| `session_id` | string | null | session reference |
| `user_agent` | string | null |  |
| `user_id` | string | null | user reference |

### system_notifications

| Column | Type | Description |
|--------|------|-------------|
| `action_label` | string | null |  |
| `action_url` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `expires_at` | string | null | Expires timestamp |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `is_dismissible` | boolean | null | Flag indicating if dismissible |
| `message` | string | Text field |
| `message_ar` | string | null |  |
| `priority` | string | null |  |
| `target_audience` | string | null |  |
| `target_company_id` | string | null | target_company reference |
| `title` | string | Text field |
| `title_ar` | string | null |  |
| `type` | string | Text field |

### system_settings

| Column | Type | Description |
|--------|------|-------------|
| `category` | string | Text field |
| `created_at` | string | null | Creation timestamp |
| `description` | string | null |  |
| `description_ar` | string | null |  |
| `id` | string | Primary key |
| `is_public` | boolean | null | Flag indicating if public |
| `requires_restart` | boolean | null |  |
| `setting_key` | string | Text field |
| `setting_type` | string | Text field |
| `setting_value` | Json |  |
| `updated_at` | string | null | Last update timestamp |
| `updated_by` | string | null |  |

### task_activity_log

| Column | Type | Description |
|--------|------|-------------|
| `action` | string | Text field |
| `created_at` | string | null | Creation timestamp |
| `description` | string | null |  |
| `id` | string | Primary key |
| `new_value` | Json | null |  |
| `old_value` | Json | null |  |
| `task_id` | string | task reference |
| `user_id` | string | user reference |

### task_checklists

| Column | Type | Description |
|--------|------|-------------|
| `completed_at` | string | null | Completed timestamp |
| `completed_by` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `is_completed` | boolean | null | Flag indicating if completed |
| `sort_order` | number | null | Numeric value |
| `task_id` | string | task reference |
| `title` | string | Text field |

### task_comments

| Column | Type | Description |
|--------|------|-------------|
| `attachments` | Json | null |  |
| `content` | string | Text field |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `task_id` | string | task reference |
| `updated_at` | string | null | Last update timestamp |
| `user_id` | string | user reference |

### task_notifications

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `is_read` | boolean | null | Flag indicating if read |
| `message` | string | null |  |
| `task_id` | string | task reference |
| `title` | string | Text field |
| `type` | string | Text field |
| `user_id` | string | user reference |
| `whatsapp_sent` | boolean | null |  |
| `whatsapp_sent_at` | string | null | Whatsapp sent timestamp |

### task_templates

| Column | Type | Description |
|--------|------|-------------|
| `checklist_items` | Json | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | Text field |
| `default_category` | string | null |  |
| `default_description` | string | null |  |
| `default_priority` | string | null |  |
| `default_tags` | string[] | null |  |
| `default_title` | string | null |  |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `name` | string | Text field |
| `updated_at` | string | null | Last update timestamp |

### tasks

| Column | Type | Description |
|--------|------|-------------|
| `assigned_to` | string | null |  |
| `attachments` | Json | null |  |
| `category` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `completed_at` | string | null | Completed timestamp |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | Text field |
| `description` | string | null |  |
| `due_date` | string | null | Due date |
| `id` | string | Primary key |
| `metadata` | Json | null |  |
| `priority` | string | Text field |
| `reminder_sent` | boolean | null |  |
| `start_date` | string | null | Start date |
| `status` | string | Text field |
| `tags` | string[] | null |  |
| `title` | string | Text field |
| `updated_at` | string | null | Last update timestamp |
| `whatsapp_notification_sent` | boolean | null |  |
| `whatsapp_sent_at` | string | null | Whatsapp sent timestamp |

### template_variables

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `default_value` | string | null |  |
| `id` | string | Primary key |
| `variable_category` | string | null |  |
| `variable_key` | string | Text field |
| `variable_label` | string | Text field |

### tenants

| Column | Type | Description |
|--------|------|-------------|
| `civil_id` | string | null | civil reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `current_address` | string | null |  |
| `current_address_ar` | string | null |  |
| `date_of_birth` | string | null |  |
| `documents` | Json | null |  |
| `email` | string | null |  |
| `emergency_contact_name` | string | null |  |
| `emergency_contact_phone` | string | null |  |
| `employer_name` | string | null |  |
| `full_name` | string | Text field |
| `full_name_ar` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `monthly_income` | number | null | Numeric value |
| `nationality` | string | null |  |
| `notes` | string | null |  |
| `occupation` | string | null |  |
| `passport_number` | string | null |  |
| `phone` | string | null |  |
| `status` | string | Text field |
| `tenant_code` | string | Text field |
| `tenant_type` | string | Text field |
| `updated_at` | string | Last update timestamp |
| `updated_by` | string | null |  |

### traffic_violation_payments

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `bank_account` | string | null |  |
| `check_number` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `id` | string | Primary key |
| `journal_entry_id` | string | null | journal_entry reference |
| `notes` | string | null |  |
| `payment_date` | string | Payment date |
| `payment_method` | string | Text field |
| `payment_number` | string | Text field |
| `payment_type` | string | Text field |
| `reference_number` | string | null |  |
| `status` | string | Text field |
| `traffic_violation_id` | string | traffic_violation reference |
| `updated_at` | string | Last update timestamp |

### traffic_violations

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | Creation timestamp |
| `fine_amount` | number | Numeric value |
| `id` | string | Primary key |
| `issuing_authority` | string | null |  |
| `location` | string | null |  |
| `notes` | string | null |  |
| `payment_date` | string | null | Payment date |
| `payment_method` | string | null |  |
| `status` | string | Text field |
| `total_amount` | number | Numeric value |
| `updated_at` | string | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |
| `violation_date` | string | Violation date |
| `violation_description` | string | null |  |
| `violation_number` | string | Text field |
| `violation_time` | string | null |  |
| `violation_type` | string | Text field |
| `reference_number` | string | null |  |
| `match_confidence` | 'high' | 'medium' | 'low' | 'none' | null |  |
| `import_source` | 'moi_pdf' | 'manual' | 'api' | 'bulk_import' | null |  |
| `file_number` | string | null |  |

### transactions

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `currency` | string | null |  |
| `customer_id` | string | null | Customer reference |
| `description` | string | Text field |
| `id` | string | Primary key |
| `journal_entry_id` | string | null | journal_entry reference |
| `reference_number` | string | null |  |
| `status` | string | Text field |
| `transaction_date` | string | Transaction date |
| `transaction_number` | string | Text field |
| `transaction_type` | string | Text field |
| `updated_at` | string | Last update timestamp |
| `vendor_id` | string | null | vendor reference |

### user_account_audit

| Column | Type | Description |
|--------|------|-------------|
| `action_type` | string | Text field |
| `company_id` | string | Company reference (multi-tenancy) |
| `details` | Json | null |  |
| `employee_id` | string | Employee reference |
| `id` | string | Primary key |
| `new_values` | Json | null |  |
| `old_values` | Json | null |  |
| `performed_at` | string | Performed timestamp |
| `performed_by` | string | Text field |

### user_dashboard_layouts

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `dashboard_id` | string | dashboard reference |
| `id` | string | Primary key |
| `layout_config` | Json |  |
| `updated_at` | string | null | Last update timestamp |
| `user_id` | string | user reference |

### user_notifications

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `is_read` | boolean | Flag indicating if read |
| `message` | string | Text field |
| `notification_type` | string | Text field |
| `read_at` | string | null | Read timestamp |
| `related_id` | string | null | related reference |
| `related_type` | string | null |  |
| `title` | string | Text field |
| `user_id` | string | user reference |

### user_permissions

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | string | Creation timestamp |
| `granted` | boolean | Boolean flag |
| `granted_at` | string | null | Granted timestamp |
| `granted_by` | string | null |  |
| `id` | string | Primary key |
| `permission_id` | string | permission reference |
| `revoked_at` | string | null | Revoked timestamp |
| `updated_at` | string | Last update timestamp |
| `user_id` | string | user reference |

### user_profiles

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | string | null | Creation timestamp |
| `email` | string | null |  |
| `id` | string | Primary key |
| `name` | string | null |  |
| `updated_at` | string | null | Last update timestamp |

### user_roles

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | null | Company reference (multi-tenancy) |
| `granted_at` | string | null | Granted timestamp |
| `granted_by` | string | null |  |
| `id` | string | Primary key |
| `permissions` | Json | null |  |
| `role` | Database["public"]["Enums"]["user_role"] |  |
| `user_id` | string | user reference |

### user_transfer_logs

| Column | Type | Description |
|--------|------|-------------|
| `completed_at` | string | null | Completed timestamp |
| `created_at` | string | Creation timestamp |
| `data_handling_strategy` | Json |  |
| `error_message` | string | null |  |
| `from_company_id` | string | from_company reference |
| `id` | string | Primary key |
| `new_roles` | string[] | null |  |
| `old_roles` | string[] | null |  |
| `rollback_data` | Json | null |  |
| `status` | string | Text field |
| `to_company_id` | string | to_company reference |
| `transfer_reason` | string | null |  |
| `transferred_by` | string | Text field |
| `updated_at` | string | Last update timestamp |
| `user_id` | string | user reference |

### users

| Column | Type | Description |
|--------|------|-------------|
| `createdAt` | string | Text field |
| `email` | string | null |  |
| `id` | number | Primary key |
| `lastSignedIn` | string | Text field |
| `loginMethod` | string | null |  |
| `name` | string | null |  |
| `openId` | string | Text field |
| `role` | string | Text field |
| `updatedAt` | string | Text field |

### vehicle_activity_log

| Column | Type | Description |
|--------|------|-------------|
| `activity_date` | string | Activity date |
| `activity_time` | string | null |  |
| `activity_type` | string | Text field |
| `company_id` | string | Company reference (multi-tenancy) |
| `cost_amount` | number | null | Numeric value |
| `cost_center_id` | string | null | cost_center reference |
| `created_at` | string | Creation timestamp |
| `description` | string | null |  |
| `id` | string | Primary key |
| `location` | string | null |  |
| `mileage` | number | null | Numeric value |
| `notes` | string | null |  |
| `performed_by` | string | null |  |
| `reference_document` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### vehicle_alerts

| Column | Type | Description |
|--------|------|-------------|
| `acknowledged_at` | string | null | Acknowledged timestamp |
| `acknowledged_by` | string | null |  |
| `alert_message` | string | Text field |
| `alert_title` | string | Text field |
| `alert_type` | string | Text field |
| `auto_generated` | boolean | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `due_date` | string | null | Due date |
| `id` | string | Primary key |
| `is_acknowledged` | boolean | null | Flag indicating if acknowledged |
| `priority` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### vehicle_categories

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `daily_rate` | number | null | Numeric value |
| `deposit_amount` | number | null | Numeric value |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `monthly_rate` | number | null | Numeric value |
| `name` | string | Text field |
| `name_ar` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `weekly_rate` | number | null | Numeric value |

### vehicle_condition_reports

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `condition_items` | Json |  |
| `contract_id` | string | null | Contract reference |
| `created_at` | string | Creation timestamp |
| `customer_signature` | string | null |  |
| `damage_items` | Json | null |  |
| `damage_points` | Json | null |  |
| `dispatch_permit_id` | string | null | dispatch_permit reference |
| `fuel_level` | number | null | Numeric value |
| `id` | string | Primary key |
| `inspection_date` | string | Inspection date |
| `inspection_type` | string | Text field |
| `inspector_id` | string | inspector reference |
| `inspector_signature` | string | null |  |
| `mileage_reading` | number | null | Numeric value |
| `notes` | string | null |  |
| `overall_condition` | string | Text field |
| `photos` | Json | null |  |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### vehicle_dispatch_permits

| Column | Type | Description |
|--------|------|-------------|
| `actual_km` | number | null | Numeric value |
| `approval_signature` | string | null |  |
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `completed_at` | string | null | Completed timestamp |
| `completion_notes` | string | null |  |
| `created_at` | string | Creation timestamp |
| `destination` | string | Text field |
| `destination_ar` | string | null |  |
| `driver_license` | string | null |  |
| `driver_name` | string | null |  |
| `driver_phone` | string | null |  |
| `end_date` | string | End date |
| `end_time` | string | null |  |
| `estimated_km` | number | null | Numeric value |
| `fuel_allowance` | number | null | Numeric value |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `permit_number` | string | Text field |
| `priority` | string | Text field |
| `purpose` | string | Text field |
| `purpose_ar` | string | null |  |
| `rejection_reason` | string | null |  |
| `request_type` | string | Text field |
| `requested_by` | string | Text field |
| `start_date` | string | Start date |
| `start_time` | string | null |  |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### vehicle_documents

| Column | Type | Description |
|--------|------|-------------|
| `created_at` | string | null | Creation timestamp |
| `document_name` | string | null |  |
| `document_number` | string | null |  |
| `document_type` | string | Text field |
| `document_url` | string | null |  |
| `expiry_date` | string | null | Expiry date |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `issue_date` | string | null | Issue date |
| `issuing_authority` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### vehicle_groups

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `default_cost_center_id` | string | null | default_cost_center reference |
| `default_depreciation_rate` | number | null | Numeric value |
| `default_useful_life_years` | number | null | Numeric value |
| `description` | string | null |  |
| `group_color` | string | null |  |
| `group_name` | string | Text field |
| `group_name_ar` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `updated_at` | string | Last update timestamp |

### vehicle_inspections

| Column | Type | Description |
|--------|------|-------------|
| `ac_condition` | string | null |  |
| `battery_condition` | string | null |  |
| `brake_condition` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `engine_condition` | string | null |  |
| `estimated_repair_cost` | number | null | Numeric value |
| `exterior_condition` | string | null |  |
| `id` | string | Primary key |
| `identified_issues` | string[] | null |  |
| `inspection_certificate_url` | string | null |  |
| `inspection_date` | string | Inspection date |
| `inspection_type` | string | Text field |
| `inspector_name` | string | Text field |
| `interior_condition` | string | null |  |
| `is_passed` | boolean | null | Flag indicating if passed |
| `lights_condition` | string | null |  |
| `mileage_at_inspection` | number | null | Numeric value |
| `next_inspection_due` | string | null |  |
| `notes` | string | null |  |
| `overall_condition` | string | Text field |
| `photos` | Json | null |  |
| `repair_recommendations` | string[] | null |  |
| `safety_equipment_status` | string | null |  |
| `tire_condition` | string | null |  |
| `transmission_condition` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### vehicle_installment_schedules

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `due_date` | string | Due date |
| `id` | string | Primary key |
| `installment_id` | string | installment reference |
| `installment_number` | number | Numeric value |
| `interest_amount` | number | null | Numeric value |
| `invoice_id` | string | null | Invoice reference |
| `journal_entry_id` | string | null | journal_entry reference |
| `notes` | string | null |  |
| `paid_amount` | number | null | Numeric value |
| `paid_date` | string | null | Paid date |
| `payment_reference` | string | null |  |
| `principal_amount` | number | null | Numeric value |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |

### vehicle_installments

| Column | Type | Description |
|--------|------|-------------|
| `agreement_date` | string | Agreement date |
| `agreement_number` | string | Text field |
| `company_id` | string | Company reference (multi-tenancy) |
| `contract_type` | string | null |  |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `down_payment` | number | Numeric value |
| `end_date` | string | End date |
| `id` | string | Primary key |
| `installment_amount` | number | Numeric value |
| `interest_rate` | number | null | Numeric value |
| `notes` | string | null |  |
| `number_of_installments` | number | Numeric value |
| `start_date` | string | Start date |
| `status` | string | Text field |
| `total_amount` | number | Numeric value |
| `total_vehicles_count` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |
| `vehicle_id` | string | null | Vehicle reference |
| `vendor_id` | string | vendor reference |

### vehicle_insurance

| Column | Type | Description |
|--------|------|-------------|
| `contact_email` | string | null |  |
| `contact_person` | string | null |  |
| `contact_phone` | string | null |  |
| `coverage_amount` | number | null | Numeric value |
| `coverage_type` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `deductible_amount` | number | null | Numeric value |
| `end_date` | string | null | End date |
| `id` | string | Primary key |
| `insurance_company` | string | null |  |
| `is_active` | boolean | null | Flag indicating if active |
| `notes` | string | null |  |
| `policy_document_url` | string | null |  |
| `policy_number` | string | null |  |
| `premium_amount` | number | null | Numeric value |
| `start_date` | string | null | Start date |
| `status` | Database["public"]["Enums"]["insurance_status"] | null |  |
| `updated_at` | string | null | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### vehicle_insurance_policies

| Column | Type | Description |
|--------|------|-------------|
| `agent_email` | string | null |  |
| `agent_name` | string | null |  |
| `agent_phone` | string | null |  |
| `auto_renew` | boolean | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `coverage_amount` | number | Numeric value |
| `coverage_details` | Json | null |  |
| `created_at` | string | null | Creation timestamp |
| `deductible_amount` | number | null | Numeric value |
| `documents` | Json | null |  |
| `effective_date` | string | Effective date |
| `expiry_date` | string | Expiry date |
| `id` | string | Primary key |
| `insurance_company` | string | Text field |
| `is_active` | boolean | null | Flag indicating if active |
| `journal_entry_id` | string | null | journal_entry reference |
| `policy_number` | string | Text field |
| `policy_type` | string | Text field |
| `premium_amount` | number | Numeric value |
| `premium_frequency` | string | null |  |
| `renewal_notice_days` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### vehicle_maintenance

| Column | Type | Description |
|--------|------|-------------|
| `actual_cost` | number | null | Numeric value |
| `assigned_to` | string | null |  |
| `attachments` | Json | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `completed_date` | string | null | Completed date |
| `cost_center_id` | string | null | cost_center reference |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | Text field |
| `estimated_cost` | number | null | Numeric value |
| `expense_account_id` | string | null | expense_account reference |
| `expense_recorded` | boolean | null |  |
| `id` | string | Primary key |
| `invoice_id` | string | null | Invoice reference |
| `invoice_number` | string | null |  |
| `journal_entry_id` | string | null | journal_entry reference |
| `maintenance_number` | string | Text field |
| `maintenance_type` | string | Text field |
| `mileage_at_service` | number | null | Numeric value |
| `notes` | string | null |  |
| `parts_replaced` | string[] | null |  |
| `payment_method` | string | null |  |
| `priority` | Database["public"]["Enums"]["maintenance_priority"] | null |  |
| `scheduled_date` | string | null | Scheduled date |
| `service_provider` | string | null |  |
| `service_provider_contact` | string | null |  |
| `started_date` | string | null | Started date |
| `status` | Database["public"]["Enums"]["maintenance_status"] | null |  |
| `tax_amount` | number | null | Numeric value |
| `total_cost_with_tax` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |
| `vendor_id` | string | null | vendor reference |
| `warranty_until` | string | null |  |

### vehicle_operating_costs

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `cost_center_id` | string | null | cost_center reference |
| `cost_date` | string | Cost date |
| `cost_type` | string | Text field |
| `created_at` | string | Creation timestamp |
| `created_by` | string | null |  |
| `description` | string | null |  |
| `id` | string | Primary key |
| `journal_entry_id` | string | null | journal_entry reference |
| `receipt_number` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### vehicle_pricing

| Column | Type | Description |
|--------|------|-------------|
| `annual_rate` | number | Numeric value |
| `annual_rate_max` | number | null | Numeric value |
| `annual_rate_min` | number | null | Numeric value |
| `cancellation_fee` | number | null | Numeric value |
| `cleaning_fee` | number | null | Numeric value |
| `created_at` | string | null | Creation timestamp |
| `currency` | string | null |  |
| `daily_rate` | number | Numeric value |
| `daily_rate_max` | number | null | Numeric value |
| `daily_rate_min` | number | null | Numeric value |
| `effective_from` | string | null |  |
| `effective_to` | string | null |  |
| `excess_mileage_rate` | number | null | Numeric value |
| `extra_km_charge` | number | null | Numeric value |
| `fuel_policy` | string | null |  |
| `id` | string | Primary key |
| `included_km_annual` | number | null | Numeric value |
| `included_km_daily` | number | null | Numeric value |
| `included_km_monthly` | number | null | Numeric value |
| `included_km_weekly` | number | null | Numeric value |
| `is_active` | boolean | null | Flag indicating if active |
| `late_return_hourly_rate` | number | null | Numeric value |
| `mileage_limit_daily` | number | null | Numeric value |
| `mileage_limit_monthly` | number | null | Numeric value |
| `mileage_limit_weekly` | number | null | Numeric value |
| `monthly_rate` | number | Numeric value |
| `monthly_rate_max` | number | null | Numeric value |
| `monthly_rate_min` | number | null | Numeric value |
| `peak_season_multiplier` | number | null | Numeric value |
| `security_deposit` | number | null | Numeric value |
| `updated_at` | string | null | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |
| `weekend_multiplier` | number | null | Numeric value |
| `weekly_rate` | number | Numeric value |
| `weekly_rate_max` | number | null | Numeric value |
| `weekly_rate_min` | number | null | Numeric value |

### vehicle_reservations

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `customer_id` | string | null | Customer reference |
| `customer_name` | string | Text field |
| `end_date` | string | End date |
| `hold_until` | string | Text field |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `start_date` | string | Start date |
| `status` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |
| `vehicle_make` | string | Text field |
| `vehicle_model` | string | Text field |
| `vehicle_plate` | string | Text field |

### vehicle_return_forms

| Column | Type | Description |
|--------|------|-------------|
| `approved_at` | string | null | Approved timestamp |
| `approved_by` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `damages_reported` | string | null |  |
| `dispatch_permit_id` | string | dispatch_permit reference |
| `fuel_level_percentage` | number | null | Numeric value |
| `id` | string | Primary key |
| `items_returned` | Json | null |  |
| `notes` | string | null |  |
| `return_date` | string | Return date |
| `return_location` | string | null |  |
| `return_odometer_reading` | number | null | Numeric value |
| `returned_by` | string | Text field |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |
| `vehicle_condition` | string | Text field |
| `vehicle_id` | string | Vehicle reference |

### vehicle_transfers

| Column | Type | Description |
|--------|------|-------------|
| `approved_by` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `completed_date` | string | null | Completed date |
| `condition_notes` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `from_branch_id` | string | null | from_branch reference |
| `fuel_level` | number | null | Numeric value |
| `id` | string | Primary key |
| `odometer_reading` | number | null | Numeric value |
| `requested_by` | string | null |  |
| `status` | string | null |  |
| `to_branch_id` | string | to_branch reference |
| `transfer_date` | string | Transfer date |
| `transfer_reason` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `vehicle_id` | string | Vehicle reference |

### vehicles

| Column | Type | Description |
|--------|------|-------------|
| `accumulated_depreciation` | number | null | Numeric value |
| `additional_features` | string[] | null |  |
| `annual_depreciation_rate` | number | null | Numeric value |
| `asset_classification` | string | null |  |
| `asset_code` | string | null |  |
| `assigned_driver_id` | string | null | assigned_driver reference |
| `body_type` | string | null |  |
| `book_value` | number | null | Numeric value |
| `branch_id` | string | null | branch reference |
| `cargo_capacity` | number | null | Numeric value |
| `category_id` | string | null | category reference |
| `color` | string | null |  |
| `color_ar` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `cost_center_id` | string | null | cost_center reference |
| `created_at` | string | Creation timestamp |
| `current_mileage` | number | null | Numeric value |
| `daily_rate` | number | null | Numeric value |
| `deposit_amount` | number | null | Numeric value |
| `depreciation_method` | string | null |  |
| `depreciation_rate` | number | null | Numeric value |
| `enforce_minimum_price` | boolean | null |  |
| `engine_number` | string | null |  |
| `engine_size` | string | null |  |
| `features` | Json | null |  |
| `financing_type` | string | null |  |
| `fixed_asset_id` | string | null | fixed_asset reference |
| `fuel_capacity` | number | null | Numeric value |
| `fuel_card_number` | string | null |  |
| `fuel_level` | number | null | Numeric value |
| `fuel_type` | string | null |  |
| `gps_device_id` | string | null | gps_device reference |
| `id` | string | Primary key |
| `images` | Json | null |  |
| `insurance_end_date` | string | null | Insurance end date |
| `insurance_expiry` | string | null |  |
| `insurance_policy` | string | null |  |
| `insurance_policy_number` | string | null |  |
| `insurance_premium_amount` | number | null | Numeric value |
| `insurance_provider` | string | null |  |
| `insurance_start_date` | string | null | Insurance start date |
| `is_active` | boolean | null | Flag indicating if active |
| `last_maintenance_date` | string | null | Last maintenance date |
| `last_service_date` | string | null | Last service date |
| `last_service_mileage` | number | null | Numeric value |
| `license_expiry` | string | null |  |
| `loan_amount` | number | null | Numeric value |
| `location` | string | null |  |
| `make` | string | Text field |
| `minimum_daily_rate` | number | null | Numeric value |
| `minimum_monthly_rate` | number | null | Numeric value |
| `minimum_rental_price` | number | null | Numeric value |
| `minimum_weekly_rate` | number | null | Numeric value |
| `model` | string | Text field |
| `monthly_payment` | number | null | Numeric value |
| `monthly_rate` | number | null | Numeric value |
| `next_service_due` | string | null |  |
| `next_service_mileage` | number | null | Numeric value |
| `notes` | string | null |  |
| `odometer_reading` | number | null | Numeric value |
| `plate_number` | string | Text field |
| `purchase_cost` | number | null | Numeric value |
| `purchase_date` | string | null | Purchase date |
| `purchase_invoice_number` | string | null |  |
| `purchase_source` | string | null |  |
| `registration_date` | string | null | Registration date |
| `registration_expiry` | string | null |  |
| `registration_fees` | number | null | Numeric value |
| `registration_number` | string | null |  |
| `residual_value` | number | null | Numeric value |
| `safety_features` | string[] | null |  |
| `salvage_value` | number | null | Numeric value |
| `seating_capacity` | number | null | Numeric value |
| `service_interval_km` | number | null | Numeric value |
| `status` | Database["public"]["Enums"]["vehicle_status"] | null |  |
| `total_insurance_cost` | number | null | Numeric value |
| `total_maintenance_cost` | number | null | Numeric value |
| `total_operating_cost` | number | null | Numeric value |
| `transmission_type` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `useful_life_years` | number | null | Numeric value |
| `vehicle_group_id` | string | null | vehicle_group reference |
| `vehicle_weight` | number | null | Numeric value |
| `vendor_id` | string | null | vendor reference |
| `vin` | string | null |  |
| `vin_number` | string | null |  |
| `warranty_end_date` | string | null | Warranty end date |
| `warranty_expiry` | string | null |  |
| `warranty_provider` | string | null |  |
| `warranty_start_date` | string | null | Warranty start date |
| `weekly_rate` | number | null | Numeric value |
| `year` | number | Numeric value |

### vendor_accounts

| Column | Type | Description |
|--------|------|-------------|
| `account_id` | string | account reference |
| `account_type` | string | Text field |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `is_default` | boolean | null | Flag indicating if default |
| `updated_at` | string | Last update timestamp |
| `vendor_id` | string | vendor reference |

### vendor_categories

| Column | Type | Description |
|--------|------|-------------|
| `category_name` | string | Text field |
| `category_name_ar` | string | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `description` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | Flag indicating if active |
| `updated_at` | string | Last update timestamp |

### vendor_contacts

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `contact_name` | string | Text field |
| `created_at` | string | Creation timestamp |
| `email` | string | null |  |
| `id` | string | Primary key |
| `is_primary` | boolean | Flag indicating if primary |
| `phone` | string | null |  |
| `position` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `vendor_id` | string | vendor reference |

### vendor_documents

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `document_name` | string | Text field |
| `document_type` | string | Text field |
| `document_url` | string | Text field |
| `expiry_date` | string | null | Expiry date |
| `file_size` | number | null | Numeric value |
| `id` | string | Primary key |
| `notes` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `vendor_id` | string | vendor reference |

### vendor_payments

| Column | Type | Description |
|--------|------|-------------|
| `amount` | number | Numeric value |
| `bank_id` | string | null | bank reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `created_by` | string | Text field |
| `currency` | string | Text field |
| `description` | string | null |  |
| `id` | string | Primary key |
| `journal_entry_id` | string | null | journal_entry reference |
| `notes` | string | null |  |
| `payment_date` | string | Payment date |
| `payment_method` | string | Text field |
| `payment_number` | string | Text field |
| `purchase_order_id` | string | null | purchase_order reference |
| `reference_number` | string | null |  |
| `status` | string | Text field |
| `updated_at` | string | Last update timestamp |
| `vendor_id` | string | vendor reference |

### vendor_performance

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `id` | string | Primary key |
| `measured_at` | string | Measured timestamp |
| `notes` | string | null |  |
| `on_time_delivery_rate` | number | null | Numeric value |
| `quality_score` | number | null | Numeric value |
| `rating` | number | null | Numeric value |
| `response_time_hours` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |
| `vendor_id` | string | vendor reference |

### vendors

| Column | Type | Description |
|--------|------|-------------|
| `address` | string | null |  |
| `address_ar` | string | null |  |
| `category_id` | string | null | category reference |
| `company_id` | string | Company reference (multi-tenancy) |
| `contact_person` | string | null |  |
| `created_at` | string | Creation timestamp |
| `credit_limit` | number | null | Numeric value |
| `current_balance` | number | null | Numeric value |
| `email` | string | null |  |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `notes` | string | null |  |
| `payment_terms` | number | null | Numeric value |
| `phone` | string | null |  |
| `tax_number` | string | null |  |
| `updated_at` | string | Last update timestamp |
| `vendor_code` | string | Text field |
| `vendor_name` | string | Text field |
| `vendor_name_ar` | string | null |  |

### whatsapp_connection_status

| Column | Type | Description |
|--------|------|-------------|
| `auto_reconnect` | boolean | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | Creation timestamp |
| `delay_between_messages_seconds` | number | null | Numeric value |
| `id` | string | Primary key |
| `is_connected` | boolean | null | Flag indicating if connected |
| `last_connected_at` | string | null | Last connected timestamp |
| `last_disconnected_at` | string | null | Last disconnected timestamp |
| `last_heartbeat` | string | null |  |
| `last_message_sent_at` | string | null | Last message sent timestamp |
| `max_messages_per_hour` | number | null | Numeric value |
| `service_running` | boolean | null |  |
| `session_path` | string | null |  |
| `total_sent_this_month` | number | null | Numeric value |
| `total_sent_this_week` | number | null | Numeric value |
| `total_sent_today` | number | null | Numeric value |
| `updated_at` | string | Last update timestamp |
| `whatsapp_name` | string | null |  |
| `whatsapp_number` | string | null |  |

### whatsapp_message_logs

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `content` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `error_message` | string | null |  |
| `id` | string | Primary key |
| `message_type` | string | Text field |
| `recipient_id` | string | recipient reference |
| `sent_at` | string | null | Sent timestamp |
| `status` | string | Text field |

### whatsapp_settings

| Column | Type | Description |
|--------|------|-------------|
| `alert_threshold` | number | null | Numeric value |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `daily_report_days` | number[] | null | Numeric value |
| `daily_report_enabled` | boolean | null |  |
| `daily_report_time` | string | null |  |
| `id` | string | Primary key |
| `instant_alerts_enabled` | boolean | null |  |
| `monthly_report_day` | number | null | Numeric value |
| `monthly_report_enabled` | boolean | null |  |
| `monthly_report_time` | string | null |  |
| `recipients` | Json | null |  |
| `ultramsg_instance_id` | string | null | ultramsg_instance reference |
| `ultramsg_token` | string | null |  |
| `updated_at` | string | null | Last update timestamp |
| `weekly_report_day` | number | null | Numeric value |
| `weekly_report_enabled` | boolean | null |  |
| `weekly_report_time` | string | null |  |

### workflow_configurations

| Column | Type | Description |
|--------|------|-------------|
| `auto_assign_enabled` | boolean | null |  |
| `company_id` | string | Company reference (multi-tenancy) |
| `created_at` | string | null | Creation timestamp |
| `default_workflow_id` | string | null | default_workflow reference |
| `escalation_rules` | Json | null |  |
| `id` | string | Primary key |
| `notification_settings` | Json | null |  |
| `source_type` | Database["public"]["Enums"]["request_source"] |  |
| `updated_at` | string | null | Last update timestamp |

### workflow_history

| Column | Type | Description |
|--------|------|-------------|
| `action` | string | Text field |
| `comments` | string | null |  |
| `created_at` | string | null | Creation timestamp |
| `id` | string | Primary key |
| `new_status` | string | null |  |
| `performed_by` | string | null |  |
| `previous_status` | string | null |  |
| `step_number` | number | null | Numeric value |
| `workflow_id` | string | workflow reference |

### workflow_templates

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | null | Company reference (multi-tenancy) |
| `conditions` | Json | null |  |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `entity_type` | string | Text field |
| `id` | string | Primary key |
| `is_active` | boolean | null | Flag indicating if active |
| `name` | string | Text field |
| `steps` | Json |  |
| `updated_at` | string | null | Last update timestamp |

### workflows

| Column | Type | Description |
|--------|------|-------------|
| `company_id` | string | Company reference (multi-tenancy) |
| `completed_at` | string | null | Completed timestamp |
| `created_at` | string | null | Creation timestamp |
| `created_by` | string | null |  |
| `current_step` | number | null | Numeric value |
| `entity_id` | string | entity reference |
| `entity_type` | string | Text field |
| `id` | string | Primary key |
| `status` | string | null |  |
| `steps` | Json |  |
| `updated_at` | string | null | Last update timestamp |

## Views

### ab_test_comparison

> View: ab_test_comparison

### active_payment_plans_summary

> View: active_payment_plans_summary

### bank_reconciliation_summary

> View: bank_reconciliation_summary

### contract_payment_summary

> View: contract_payment_summary

### contracts_complete

> View: contracts_complete

### customer_payment_score_summary

> View: customer_payment_score_summary

### index_maintenance_recommendations

> View: index_maintenance_recommendations

### index_usage_stats

> View: index_usage_stats

### inventory_aging_analysis

> View: inventory_aging_analysis

### inventory_low_stock_items

> View: inventory_low_stock_items

### inventory_movement_summary

> View: inventory_movement_summary

### inventory_pending_purchase_orders

> View: inventory_pending_purchase_orders

### inventory_pending_replenishments

> View: inventory_pending_replenishments

### inventory_purchase_order_summary

> View: inventory_purchase_order_summary

### inventory_reorder_recommendations

> View: inventory_reorder_recommendations

### inventory_stock_alerts

> View: inventory_stock_alerts

### inventory_suppliers_summary

> View: inventory_suppliers_summary

### inventory_transfer_summary

> View: inventory_transfer_summary

### inventory_turnover_analysis

> View: inventory_turnover_analysis

### inventory_valuation

> View: inventory_valuation

### legal_document_generations_view

> View: legal_document_generations_view

### maintenance_cost_summary

> View: maintenance_cost_summary

### mv_customer_summary

> View: mv_customer_summary

### overdue_payment_promises

> View: overdue_payment_promises

### payment_method_statistics

> View: payment_method_statistics

### payment_timeline_invoices

> View: payment_timeline_invoices

### payroll_financial_analysis

> View: payroll_financial_analysis

### reminder_statistics

> View: reminder_statistics

### sales_inventory_availability

> View: sales_inventory_availability

### sales_order_fulfillment_status

> View: sales_order_fulfillment_status

### sales_pipeline_metrics

> View: sales_pipeline_metrics

### security_policy_violations

> View: security_policy_violations

### table_size_stats

> View: table_size_stats

### template_performance_summary

> View: template_performance_summary

### top_rated_vendors

> View: top_rated_vendors

### v_account_linking_stats

> View: v_account_linking_stats

### v_deploy_readiness

> View: v_deploy_readiness

### v_linkable_accounts

> View: v_linkable_accounts

### v_pending_waivers

> View: v_pending_waivers

### v_recent_failures

> View: v_recent_failures

### v_report_schedule_status

> View: v_report_schedule_status

### vendor_purchase_performance

> View: vendor_purchase_performance

### pending_contract_matches

> View: pending_contract_matches

### contract_match_statistics

> View: contract_match_statistics

## Functions


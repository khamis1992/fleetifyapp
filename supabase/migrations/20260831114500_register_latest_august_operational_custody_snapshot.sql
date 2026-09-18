-- Register the latest August operational-custody snapshot without changing
-- contracts, invoices, payments, legal cases, or vehicle statuses.
--
-- Source workbook: دفعات-شهر-8-أغسطس-2026.xlsx (89 rows).
-- Five rows are intentionally excluded because later direct administrative
-- decisions supersede the workbook: 722134, 2773, 848014, 846485, 847932.

BEGIN;

DO $register$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid;
  v_source_sha constant text := '4E0F968805E9953CD3E10B90B9CEA6E418EE87CC8C477490235092A102224A67';
  v_batch_id uuid;
  v_manifest jsonb := '[
  {
    "sourceRow": 2,
    "sourcePlate": "21860",
    "sourceCustomerName": "محمد ضياء العويني",
    "sourceCustomerPhone": "66816813",
    "resolvedCustomerNationalId": "29678801714",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "expected_customer_contract_on_other_vehicle",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "AGR-202502-0426",
      "source_start_date": "2025-02-16",
      "source_end_date": "2027-07-01",
      "source_monthly_amount": 1700,
      "source_note": null,
      "reconciliation_classification": "expected_customer_contract_on_other_vehicle",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 3,
    "sourcePlate": "648144",
    "sourceCustomerName": "سفيان المختار الصالح",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unresolved_customer",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": null,
      "source_start_date": "2026-05-02",
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 0,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 4,
    "sourcePlate": "676281",
    "sourceCustomerName": "حمزة بادو",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": "29850400215",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "LTO202437",
      "source_start_date": "2023-01-01",
      "source_end_date": "2026-12-01",
      "source_monthly_amount": 1050,
      "source_note": null,
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 5,
    "sourcePlate": "692801",
    "sourceCustomerName": "زكرياء بن احمد",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": "29050401901",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "CON-25-5FEMJQ",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "CON-25-5FEMJQ",
      "source_start_date": "2026-02-05",
      "source_end_date": "2028-04-01",
      "source_monthly_amount": 1000,
      "source_note": "1000",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 6,
    "sourcePlate": "706150",
    "sourceCustomerName": "ألياس يعقوبي",
    "sourceCustomerPhone": "70704543",
    "resolvedCustomerNationalId": "29350401160",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "different_customer_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "HIST-XLS-B70-706150",
      "source_start_date": "2026-03-01",
      "source_end_date": "2028-06-01",
      "source_monthly_amount": 1600,
      "source_note": "حجز",
      "reconciliation_classification": "different_customer_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 8,
    "sourcePlate": "856718",
    "sourceCustomerName": "حسان بو علاق",
    "sourceCustomerPhone": "66553638",
    "resolvedCustomerNationalId": "30078800270",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "AGR-202504-406129",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "AGR-202504-406129",
      "source_start_date": "2025-02-14",
      "source_end_date": "2027-07-01",
      "source_monthly_amount": 1700,
      "source_note": "مرور 52",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 9,
    "sourcePlate": "857045",
    "sourceCustomerName": "عمارة خرّوبي",
    "sourceCustomerPhone": "77785598",
    "resolvedCustomerNationalId": "29178800153",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0083",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0083",
      "source_start_date": "2024-01-02",
      "source_end_date": "2026-06-01",
      "source_monthly_amount": 2000,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 10,
    "sourcePlate": "857051",
    "sourceCustomerName": "فخري الدين عثمان",
    "sourceCustomerPhone": "55422771",
    "resolvedCustomerNationalId": "29173600956",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "different_customer_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": null,
      "source_start_date": "2026-07-19",
      "source_end_date": null,
      "source_monthly_amount": 1650,
      "source_note": "لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "different_customer_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 11,
    "sourcePlate": "893406",
    "sourceCustomerName": "محمود جاسم الصالح",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "ambiguous_multiple_customer_records",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "HIST-XLS-B70-893406",
      "source_start_date": "2026-02-04",
      "source_end_date": "2027-09-01",
      "source_monthly_amount": 1600,
      "source_note": null,
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 2,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 12,
    "sourcePlate": "893409",
    "sourceCustomerName": "عقبة يوسف قصعاوي",
    "sourceCustomerPhone": "50409220",
    "resolvedCustomerNationalId": "29878801945",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "expected_customer_contract_on_other_vehicle",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": null,
      "source_start_date": "2025-03-01",
      "source_end_date": "2027-09-01",
      "source_monthly_amount": 1600,
      "source_note": null,
      "reconciliation_classification": "expected_customer_contract_on_other_vehicle",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 13,
    "sourcePlate": "893410",
    "sourceCustomerName": "عمار عبد العزيز الغزي",
    "sourceCustomerPhone": "30403800",
    "resolvedCustomerNationalId": "27976002717",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0089",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0089",
      "source_start_date": "2024-09-04",
      "source_end_date": "2027-08-01",
      "source_monthly_amount": 1750,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 14,
    "sourcePlate": "2766",
    "sourceCustomerName": "محمد محمد أحمد محمد",
    "sourceCustomerPhone": "70007983",
    "resolvedCustomerNationalId": "29073602906",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "AGR-202504-424958",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "AGR-202504-424958",
      "source_start_date": "2025-02-05",
      "source_end_date": "2027-07-01",
      "source_monthly_amount": 1600,
      "source_note": "1600",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 15,
    "sourcePlate": "2768",
    "sourceCustomerName": "عبد العزيز محمد",
    "sourceCustomerPhone": "70342655",
    "resolvedCustomerNationalId": "27173600979",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0013",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0013",
      "source_start_date": "2025-03-01",
      "source_end_date": "2027-08-01",
      "source_monthly_amount": 1500,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 16,
    "sourcePlate": "2769",
    "sourceCustomerName": "وضاح عبد الله احمد العبيد",
    "sourceCustomerPhone": "71953163",
    "resolvedCustomerNationalId": "28673602872",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0014",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0014",
      "source_start_date": "2024-12-21",
      "source_end_date": "2027-11-01",
      "source_monthly_amount": 1500,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 17,
    "sourcePlate": "2770",
    "sourceCustomerName": "خبيب رضا السحابي",
    "sourceCustomerPhone": "72202682",
    "resolvedCustomerNationalId": "29578802624",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0015",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0015",
      "source_start_date": "2025-08-01",
      "source_end_date": null,
      "source_monthly_amount": 1600,
      "source_note": "1600 | لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 18,
    "sourcePlate": "2772",
    "sourceCustomerName": "اسماعيل احمد عبد الله محمد",
    "sourceCustomerPhone": "30400511",
    "resolvedCustomerNationalId": "29073602014",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "LTO2024248",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "LTO2024248",
      "source_start_date": "2024-07-14",
      "source_end_date": "2027-01-01",
      "source_monthly_amount": 1750,
      "source_note": "1750",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 20,
    "sourcePlate": "2775",
    "sourceCustomerName": "ياسين  الزلماطي",
    "sourceCustomerPhone": "55315381",
    "resolvedCustomerNationalId": "29678801036",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "CON-26-X698L2",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "CON-26-X698L2",
      "source_start_date": "2026-01-01",
      "source_end_date": "2027-08-01",
      "source_monthly_amount": 1600,
      "source_note": "1600",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 21,
    "sourcePlate": "2778",
    "sourceCustomerName": "بلال اليعقوبي",
    "sourceCustomerPhone": "70400898",
    "resolvedCustomerNationalId": "29078800332",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0023",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0023",
      "source_start_date": "2025-07-15",
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 22,
    "sourcePlate": "2780",
    "sourceCustomerName": "ياسين محمد سرحاني",
    "sourceCustomerPhone": "71002048",
    "resolvedCustomerNationalId": "29878800584",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0025",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0025",
      "source_start_date": "2023-12-29",
      "source_end_date": "2026-06-01",
      "source_monthly_amount": 2100,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 23,
    "sourcePlate": "2781",
    "sourceCustomerName": "غير موجود في النظام",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unresolved_customer",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "",
      "source_start_date": "2026-06-01",
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 0,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 24,
    "sourcePlate": "2782",
    "sourceCustomerName": "سعيد الهلالي",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": "28878802218",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "different_customer_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": null,
      "source_start_date": null,
      "source_end_date": null,
      "source_monthly_amount": 1000,
      "source_note": "لا يوجد بداية ونهاية في ملف الورد",
      "reconciliation_classification": "different_customer_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 25,
    "sourcePlate": "2784",
    "sourceCustomerName": "عثمان عبيريزة",
    "sourceCustomerPhone": "30770117",
    "resolvedCustomerNationalId": "28950401627",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0028",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0028",
      "source_start_date": "2024-08-01",
      "source_end_date": "2028-01-01",
      "source_monthly_amount": 1600,
      "source_note": "1500",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 26,
    "sourcePlate": "5889",
    "sourceCustomerName": "ايمن خليفة حمادي",
    "sourceCustomerPhone": "30305808",
    "resolvedCustomerNationalId": "29478802235",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "LTO202427",
      "source_start_date": "2023-11-20",
      "source_end_date": "2026-11-01",
      "source_monthly_amount": 2100,
      "source_note": null,
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 27,
    "sourcePlate": "5890",
    "sourceCustomerName": "عبد العزيز بن نبيل جرفال",
    "sourceCustomerPhone": "33767961",
    "resolvedCustomerNationalId": "29278800776",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "expected_customer_contract_on_other_vehicle",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "LTO2024340",
      "source_start_date": "2024-12-01",
      "source_end_date": "2027-11-01",
      "source_monthly_amount": 1500,
      "source_note": "800",
      "reconciliation_classification": "expected_customer_contract_on_other_vehicle",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 28,
    "sourcePlate": "5898",
    "sourceCustomerName": "محمد سرالختم",
    "sourceCustomerPhone": "70371179",
    "resolvedCustomerNationalId": "28073601259",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0039",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0039",
      "source_start_date": "2025-08-05",
      "source_end_date": "2028-01-01",
      "source_monthly_amount": 1500,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 29,
    "sourcePlate": "5899",
    "sourceCustomerName": "احمد السيد بابكر",
    "sourceCustomerPhone": "33081277",
    "resolvedCustomerNationalId": "27973601538",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "LTO2024156",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "LTO2024156",
      "source_start_date": null,
      "source_end_date": null,
      "source_monthly_amount": 2000,
      "source_note": "لا يوجد بداية ونهاية في ملف الورد",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 30,
    "sourcePlate": "5900",
    "sourceCustomerName": "محمد عزيز محسن جلالي",
    "sourceCustomerPhone": "50328969",
    "resolvedCustomerNationalId": "30278800821",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "HIST-XLS-T77-5900",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_with_parallel_conflict",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "HIST-XLS-T77-5900",
      "source_start_date": "2026-03-10",
      "source_end_date": "2028-06-01",
      "source_monthly_amount": 1100,
      "source_note": "دفع مسبق",
      "reconciliation_classification": "matched_with_parallel_conflict",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 2
    }
  },
  {
    "sourceRow": 31,
    "sourcePlate": "5901",
    "sourceCustomerName": "حسن بن ساسی ظاهری",
    "sourceCustomerPhone": "31115657",
    "resolvedCustomerNationalId": "29778800219",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "LTO20244",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "LTO20244",
      "source_start_date": "2023-12-23",
      "source_end_date": null,
      "source_monthly_amount": 2100,
      "source_note": "لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 32,
    "sourcePlate": "7036",
    "sourceCustomerName": "عصام ابراهيم عبد الله",
    "sourceCustomerPhone": "30777645",
    "resolvedCustomerNationalId": "28778801222",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "LTO2024341",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "LTO2024341",
      "source_start_date": "2024-12-12",
      "source_end_date": "2027-12-12",
      "source_monthly_amount": 1550,
      "source_note": "تحويل",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 33,
    "sourcePlate": "7038",
    "sourceCustomerName": "مهدي محمد القاطري",
    "sourceCustomerPhone": "51332508",
    "resolvedCustomerNationalId": "29478802992",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "CNT-26-7038",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_with_parallel_conflict",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "HIST-XLS-T77-7038",
      "source_start_date": "2026-01-01",
      "source_end_date": "2028-06-01",
      "source_monthly_amount": 1600,
      "source_note": "1600",
      "reconciliation_classification": "matched_with_parallel_conflict",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 2
    }
  },
  {
    "sourceRow": 34,
    "sourcePlate": "7039",
    "sourceCustomerName": "غير موجود في النظام",
    "sourceCustomerPhone": "60045111",
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unresolved_customer",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "AGR-202504-423180",
      "source_start_date": "2025-03-01",
      "source_end_date": "2027-11-01",
      "source_monthly_amount": 1500,
      "source_note": "500",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 0,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 35,
    "sourcePlate": "7041",
    "sourceCustomerName": "رمزي الهاشمي بعزاوي",
    "sourceCustomerPhone": "39913719",
    "resolvedCustomerNationalId": "29678802517",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0050",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_with_parallel_conflict",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "C-ALF-0050",
      "source_start_date": "2025-10-10",
      "source_end_date": "2027-03-01",
      "source_monthly_amount": 1600,
      "source_note": null,
      "reconciliation_classification": "matched_with_parallel_conflict",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 2
    }
  },
  {
    "sourceRow": 36,
    "sourcePlate": "7043",
    "sourceCustomerName": "حمد البشير يانس",
    "sourceCustomerPhone": "55260218",
    "resolvedCustomerNationalId": "28878801028",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0051",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0051",
      "source_start_date": "2024-08-21",
      "source_end_date": "2027-07-01",
      "source_monthly_amount": 1750,
      "source_note": "1750",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 37,
    "sourcePlate": "7053",
    "sourceCustomerName": "مهدي أسامة المهدي حامد",
    "sourceCustomerPhone": "30138501",
    "resolvedCustomerNationalId": "29873600511",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "LTO2024263",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "LTO2024263",
      "source_start_date": "2024-07-30",
      "source_end_date": "2027-07-01",
      "source_monthly_amount": 1800,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 38,
    "sourcePlate": "7054",
    "sourceCustomerName": "عمر عبد المولى مبروكي",
    "sourceCustomerPhone": "31598966",
    "resolvedCustomerNationalId": "27978800113",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "different_customer_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "HIST-XLS-T77-7054",
      "source_start_date": "2026-06-06",
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "different_customer_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 39,
    "sourcePlate": "7056",
    "sourceCustomerName": "مجدي محمد عباس",
    "sourceCustomerPhone": "33557425",
    "resolvedCustomerNationalId": "26073600810",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0054",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0054",
      "source_start_date": "2025-05-01",
      "source_end_date": "2027-10-01",
      "source_monthly_amount": 1650,
      "source_note": "900",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 40,
    "sourcePlate": "7058",
    "sourceCustomerName": "محمد فوأد شوشان",
    "sourceCustomerPhone": "55146823",
    "resolvedCustomerNationalId": "28678802468",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "319",
      "source_start_date": "2024-09-25",
      "source_end_date": "2027-09-01",
      "source_monthly_amount": 1600,
      "source_note": null,
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 41,
    "sourcePlate": "7059",
    "sourceCustomerName": "عمر محمد الجمعي مرائحي",
    "sourceCustomerPhone": "51203590",
    "resolvedCustomerNationalId": "28678802455",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0056",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0056",
      "source_start_date": "2025-01-15",
      "source_end_date": "2027-12-01",
      "source_monthly_amount": 1500,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 42,
    "sourcePlate": "7060",
    "sourceCustomerName": "بنور رقية",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": "29678800942",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "LTO2024141",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "LTO2024141",
      "source_start_date": "2024-02-05",
      "source_end_date": null,
      "source_monthly_amount": 0,
      "source_note": "- - | لا يوجد نهاية وقسط في ملف الورد",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 43,
    "sourcePlate": "7063",
    "sourceCustomerName": "مهند حمودة الظاهر",
    "sourceCustomerPhone": "30623322",
    "resolvedCustomerNationalId": "29076000589",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "AGR-055405-212",
      "source_start_date": "2025-12-01",
      "source_end_date": "2027-05-01",
      "source_monthly_amount": 1600,
      "source_note": "1600",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 44,
    "sourcePlate": "7066",
    "sourceCustomerName": "ايهاب ميرغني عوض الكريم عبد الله",
    "sourceCustomerPhone": "70952447",
    "resolvedCustomerNationalId": "28573602823",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "different_customer_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": null,
      "source_start_date": "2024-01-29",
      "source_end_date": null,
      "source_monthly_amount": 2550,
      "source_note": "حجز 52 | لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "different_customer_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 45,
    "sourcePlate": "7068",
    "sourceCustomerName": "ياسر ربيع محمد سليمان",
    "sourceCustomerPhone": "77354490",
    "resolvedCustomerNationalId": "27981803976",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "LTO2024115",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "LTO2024115",
      "source_start_date": null,
      "source_end_date": null,
      "source_monthly_amount": 2100,
      "source_note": "2000 | لا يوجد بداية ونهاية في ملف الورد",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 46,
    "sourcePlate": "7069",
    "sourceCustomerName": "عصام المزوغي",
    "sourceCustomerPhone": "74700503",
    "resolvedCustomerNationalId": "28078801264",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "LTO2024284",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "LTO2024284",
      "source_start_date": "2024-08-26",
      "source_end_date": "2027-02-02",
      "source_monthly_amount": 1800,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 47,
    "sourcePlate": "7071",
    "sourceCustomerName": "حمزة زمكيل",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": "55312830",
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "HIST-XLS-T77-7071",
      "source_start_date": "2025-03-08",
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 48,
    "sourcePlate": "7072",
    "sourceCustomerName": "يوسف العبيدي لخليل",
    "sourceCustomerPhone": "72119703",
    "resolvedCustomerNationalId": "29678801302",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "LTO2024261",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "LTO2024261",
      "source_start_date": "2024-07-28",
      "source_end_date": "2027-07-01",
      "source_monthly_amount": 1750,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 49,
    "sourcePlate": "7074",
    "sourceCustomerName": "محمود جاسم الصالح",
    "sourceCustomerPhone": "30531131",
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "ambiguous_multiple_customer_records",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "LTO2024335",
      "source_start_date": "2024-11-14",
      "source_end_date": null,
      "source_monthly_amount": 1600,
      "source_note": "لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 2,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 50,
    "sourcePlate": "7075",
    "sourceCustomerName": "غير موجود في النظام",
    "sourceCustomerPhone": "50446192",
    "resolvedCustomerNationalId": "27673601350",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "LTO202418",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "LTO202418",
      "source_start_date": "2024-02-05",
      "source_end_date": null,
      "source_monthly_amount": 1800,
      "source_note": "لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 51,
    "sourcePlate": "7077",
    "sourceCustomerName": "ادم صالح جبريل",
    "sourceCustomerPhone": "50066411",
    "resolvedCustomerNationalId": "28873601685",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0066",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0066",
      "source_start_date": "2023-12-22",
      "source_end_date": "2026-06-22",
      "source_monthly_amount": 1500,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 52,
    "sourcePlate": "7078",
    "sourceCustomerName": "محمد شريف عمرو عياش",
    "sourceCustomerPhone": "66036491",
    "resolvedCustomerNationalId": "28801200831",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0067",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0067",
      "source_start_date": "2025-08-01",
      "source_end_date": null,
      "source_monthly_amount": 1600,
      "source_note": "حجز | لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 53,
    "sourcePlate": "185513",
    "sourceCustomerName": "الصادق صالح إبراهيم دياب",
    "sourceCustomerPhone": "70075544",
    "resolvedCustomerNationalId": "29173602216",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "LTO20247",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "LTO20247",
      "source_start_date": "2024-03-01",
      "source_end_date": null,
      "source_monthly_amount": 1800,
      "source_note": "لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 54,
    "sourcePlate": "185485",
    "sourceCustomerName": "احمد تاج",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": "31001958",
    "supportingContractNumber": "C-ALF-0006",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0006",
      "source_start_date": null,
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "لا يوجد بداية ونهاية في ملف الورد",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 55,
    "sourcePlate": "185573",
    "sourceCustomerName": "ايهاب ميرغني عوض الكريم عبد الله",
    "sourceCustomerPhone": "3100 966",
    "resolvedCustomerNationalId": "28573602823",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0008",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0008",
      "source_start_date": "2025-04-01",
      "source_end_date": "2027-05-01",
      "source_monthly_amount": 1500,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 56,
    "sourcePlate": "603353",
    "sourceCustomerName": "مصطفى بالقايد",
    "sourceCustomerPhone": "31245752",
    "resolvedCustomerNationalId": "30050400084",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "expected_customer_contract_on_other_vehicle",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "",
      "source_start_date": "2025-07-01",
      "source_end_date": "2027-12-02",
      "source_monthly_amount": 1700,
      "source_note": null,
      "reconciliation_classification": "expected_customer_contract_on_other_vehicle",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 57,
    "sourcePlate": "599720",
    "sourceCustomerName": "انور بن علي الذهبي",
    "sourceCustomerPhone": "50234083",
    "resolvedCustomerNationalId": "28978801437",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0042",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0042",
      "source_start_date": "2025-05-01",
      "source_end_date": "2027-10-01",
      "source_monthly_amount": 1700,
      "source_note": "راجع",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 58,
    "sourcePlate": "153974",
    "sourceCustomerName": "أزهري حكيم خالد حكيم",
    "sourceCustomerPhone": "55578515",
    "resolvedCustomerNationalId": "25873600219",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0005",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0005",
      "source_start_date": "2025-01-01",
      "source_end_date": "2027-05-01",
      "source_monthly_amount": 1500,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 59,
    "sourcePlate": "10172",
    "sourceCustomerName": "أنور محمد إبراهيم محمد",
    "sourceCustomerPhone": "70561365",
    "resolvedCustomerNationalId": "27573600311",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0001",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0001",
      "source_start_date": "2024-04-15",
      "source_end_date": "2027-03-01",
      "source_monthly_amount": 1300,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 60,
    "sourcePlate": "10197",
    "sourceCustomerName": "احمد الشيخ الصديق هاشم الوسيله",
    "sourceCustomerPhone": "50118063",
    "resolvedCustomerNationalId": "27773601703",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "LTO2024270",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "LTO2024270",
      "source_start_date": "2024-08-10",
      "source_end_date": "2027-07-01",
      "source_monthly_amount": 1250,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 61,
    "sourcePlate": "11473",
    "sourceCustomerName": "عماد العياري",
    "sourceCustomerPhone": "66071051",
    "resolvedCustomerNationalId": "27478800538",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "LTO2024317",
      "source_start_date": "2024-09-19",
      "source_end_date": "2027-02-01",
      "source_monthly_amount": 1250,
      "source_note": null,
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 62,
    "sourcePlate": "862169",
    "sourceCustomerName": "عبد الرحيم شاكر احمد محمد",
    "sourceCustomerPhone": "31310330",
    "resolvedCustomerNationalId": "28373601770",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0086",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_with_parallel_conflict",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "C-ALF-0086",
      "source_start_date": "2025-07-01",
      "source_end_date": null,
      "source_monthly_amount": 1000,
      "source_note": "لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "matched_with_parallel_conflict",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 63,
    "sourcePlate": "862165",
    "sourceCustomerName": "مهدي الشريف عبد الرحيم يوسف",
    "sourceCustomerPhone": "33670129",
    "resolvedCustomerNationalId": "27273601103",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "different_customer_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": null,
      "source_start_date": "2025-09-01",
      "source_end_date": "2028-01-01",
      "source_monthly_amount": 1500,
      "source_note": null,
      "reconciliation_classification": "different_customer_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 64,
    "sourcePlate": "10663",
    "sourceCustomerName": "علاء الدين علي دباش",
    "sourceCustomerPhone": "77456429",
    "resolvedCustomerNationalId": "30178800322",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "different_customer_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": null,
      "source_start_date": "2025-09-01",
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "different_customer_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 65,
    "sourcePlate": "10664",
    "sourceCustomerName": "غير موجود في النظام",
    "sourceCustomerPhone": "50415688",
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unresolved_customer",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "C-ALF-0093",
      "source_start_date": "2025-08-24",
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "900 | لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 0,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 66,
    "sourcePlate": "10665",
    "sourceCustomerName": "غير موجود في النظام",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unresolved_customer",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "LTO2024273",
      "source_start_date": null,
      "source_end_date": null,
      "source_monthly_amount": 0,
      "source_note": "لا يوجد تاريخ/قسط في ملف الورد",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 0,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 67,
    "sourcePlate": "10668",
    "sourceCustomerName": "عبد المنعم حسن حمدي",
    "sourceCustomerPhone": "70184904",
    "resolvedCustomerNationalId": "28408000256",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "AGR-202504-400949",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "AGR-202504-400949",
      "source_start_date": "2025-03-01",
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "1500+500 | لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 68,
    "sourcePlate": "10853",
    "sourceCustomerName": "محمد علی محمد خالد",
    "sourceCustomerPhone": "66047108",
    "resolvedCustomerNationalId": "29158608000",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "different_customer_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": null,
      "source_start_date": "2026-01-01",
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "1500 | لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "different_customer_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 69,
    "sourcePlate": "10856",
    "sourceCustomerName": "غير موجود في النظام",
    "sourceCustomerPhone": "77073470",
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unresolved_customer",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "LTO202455",
      "source_start_date": "2026-02-02",
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "1500 | لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 0,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 70,
    "sourcePlate": "10857",
    "sourceCustomerName": "غير موجود في النظام",
    "sourceCustomerPhone": "50032458",
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unresolved_customer",
    "sourceClassification": "different_customer_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "C-ALF-0100",
      "source_start_date": "2026-01-06",
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "1500 | لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "different_customer_live_contract",
      "matching_customer_count": 0,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 71,
    "sourcePlate": "847941",
    "sourceCustomerName": "غير موجود في النظام",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unresolved_customer",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "LTO2024105",
      "source_start_date": "2023-03-01",
      "source_end_date": "2026-02-01",
      "source_monthly_amount": 2100,
      "source_note": null,
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 0,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 72,
    "sourcePlate": "846508",
    "sourceCustomerName": "مهدي الحسين الحسني",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": "28078800388",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0104",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0104",
      "source_start_date": "2023-10-12",
      "source_end_date": "2026-09-01",
      "source_monthly_amount": 2100,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 73,
    "sourcePlate": "847987",
    "sourceCustomerName": "غير موجود في النظام",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unresolved_customer",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "LTO2024106",
      "source_start_date": "2023-03-01",
      "source_end_date": "2026-02-01",
      "source_monthly_amount": 2100,
      "source_note": null,
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 0,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 75,
    "sourcePlate": "847099",
    "sourceCustomerName": "أمير عبد الرحمن احمد المهدى بط",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unresolved_customer",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "LTO2024124",
      "source_start_date": "2024-04-14",
      "source_end_date": "2027-03-01",
      "source_monthly_amount": 2300,
      "source_note": "- حادث",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 0,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 76,
    "sourcePlate": "847059",
    "sourceCustomerName": "بدر الدين الخليفي",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": "29278801950",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0106",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0106",
      "source_start_date": "2023-12-23",
      "source_end_date": "2026-05-01",
      "source_monthly_amount": 2200,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 78,
    "sourcePlate": "847601",
    "sourceCustomerName": "طارق محمد الرحالي",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": "29478802505",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "",
      "source_start_date": null,
      "source_end_date": null,
      "source_monthly_amount": 0,
      "source_note": "لا يوجد تاريخ/قسط في ملف الورد",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 80,
    "sourcePlate": "4015",
    "sourceCustomerName": "إبراهيم خضر",
    "sourceCustomerPhone": "33750040",
    "resolvedCustomerNationalId": "27773600560",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0031",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0031",
      "source_start_date": "2025-09-01",
      "source_end_date": "2028-02-01",
      "source_monthly_amount": 1000,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 81,
    "sourcePlate": "4016",
    "sourceCustomerName": "عبد الرزاق حمد حماد الهنيديس",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": "28476001834",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "CON-25-ZV0RA7",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "CON-25-ZV0RA7",
      "source_start_date": "2025-12-01",
      "source_end_date": "2028-05-01",
      "source_monthly_amount": 1600,
      "source_note": "ام صلال",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 82,
    "sourcePlate": "4018",
    "sourceCustomerName": "عبد الرحيم شاكر احمد محمد",
    "sourceCustomerPhone": "31310330",
    "resolvedCustomerNationalId": "28373601770",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0033",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_with_parallel_conflict",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "C-ALF-0033",
      "source_start_date": "2024-02-08",
      "source_end_date": "2027-01-01",
      "source_monthly_amount": 1700,
      "source_note": "1700",
      "reconciliation_classification": "matched_with_parallel_conflict",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 83,
    "sourcePlate": "8203",
    "sourceCustomerName": "محمد عماد النعماني",
    "sourceCustomerPhone": "51230549 77387737",
    "resolvedCustomerNationalId": "29878800782",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0070",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0070",
      "source_start_date": "2025-10-04",
      "source_end_date": "2028-03-01",
      "source_monthly_amount": 1600,
      "source_note": "1600",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 84,
    "sourcePlate": "8204",
    "sourceCustomerName": "سيف الدين محمد صالح حسين",
    "sourceCustomerPhone": "33773235",
    "resolvedCustomerNationalId": "29673602602",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unique_customer_match",
    "sourceClassification": "different_customer_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": null,
      "source_start_date": "2025-05-06",
      "source_end_date": null,
      "source_monthly_amount": 1500,
      "source_note": "1500 | لا يوجد نهاية في ملف الورد",
      "reconciliation_classification": "different_customer_live_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 85,
    "sourcePlate": "8206",
    "sourceCustomerName": "محمد علي سليم",
    "sourceCustomerPhone": "30797703",
    "resolvedCustomerNationalId": "28778801843",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0074",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_with_parallel_conflict",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "C-ALF-0074",
      "source_start_date": "2025-07-01",
      "source_end_date": "2027-08-01",
      "source_monthly_amount": 1500,
      "source_note": null,
      "reconciliation_classification": "matched_with_parallel_conflict",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 2
    }
  },
  {
    "sourceRow": 86,
    "sourcePlate": "8207",
    "sourceCustomerName": "حسن عبدالوهاب محمد الفكي",
    "sourceCustomerPhone": "51060253",
    "resolvedCustomerNationalId": "30173603044",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0072",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0072",
      "source_start_date": "2025-04-15",
      "source_end_date": "2027-09-01",
      "source_monthly_amount": 1600,
      "source_note": "ام العمد",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 87,
    "sourcePlate": "8209",
    "sourceCustomerName": "غير موجود في النظام",
    "sourceCustomerPhone": null,
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unresolved_customer",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": "LTO2024276",
      "source_start_date": null,
      "source_end_date": null,
      "source_monthly_amount": 0,
      "source_note": "لا يوجد تاريخ/قسط في ملف الورد",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 0,
      "live_contract_count_on_vehicle": 0
    }
  },
  {
    "sourceRow": 88,
    "sourcePlate": "8211",
    "sourceCustomerName": "علي هلال الصخري",
    "sourceCustomerPhone": "50447989",
    "resolvedCustomerNationalId": "29073603453",
    "resolvedCustomerPhone": null,
    "supportingContractNumber": "C-ALF-0076",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "C-ALF-0076",
      "source_start_date": "2025-06-01",
      "source_end_date": "2027-11-01",
      "source_monthly_amount": 1500,
      "source_note": "شهر 71500",
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 89,
    "sourcePlate": "8212",
    "sourceCustomerName": "عمر محمد الفكي",
    "sourceCustomerPhone": "50055884",
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": "50055884",
    "supportingContractNumber": "AGR-202504-405141",
    "identityResolution": "unique_customer_match",
    "sourceClassification": "matched_contract",
    "decisionReason": "Latest August file confirms the operational custodian; matching live contract retained.",
    "evidence": {
      "source_contract_number": "AGR-202504-405141",
      "source_start_date": "2025-05-01",
      "source_end_date": "2026-08-01",
      "source_monthly_amount": 1500,
      "source_note": null,
      "reconciliation_classification": "matched_contract",
      "matching_customer_count": 1,
      "live_contract_count_on_vehicle": 1
    }
  },
  {
    "sourceRow": 90,
    "sourcePlate": "8213",
    "sourceCustomerName": "يسري بوز عيبة",
    "sourceCustomerPhone": "51039263",
    "resolvedCustomerNationalId": null,
    "resolvedCustomerPhone": null,
    "supportingContractNumber": null,
    "identityResolution": "unresolved_customer",
    "sourceClassification": "no_live_contract",
    "decisionReason": "Latest August file records operational custody only; contract/legal conflict remains queued for evidence review.",
    "evidence": {
      "source_contract_number": null,
      "source_start_date": "2025-01-31",
      "source_end_date": "2028-07-01",
      "source_monthly_amount": 1500,
      "source_note": "شهر 61500",
      "reconciliation_classification": "no_live_contract",
      "matching_customer_count": 0,
      "live_contract_count_on_vehicle": 0
    }
  }
]'::jsonb;
  v_import_count integer;
  v_resolved_customer_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':fleet-report:' || v_source_sha, 0)
  );

  SELECT batch.id INTO v_batch_id
  FROM public.fleet_reconciliation_batches batch
  WHERE batch.company_id = v_company_id
    AND batch.source_sha256 = v_source_sha
  FOR UPDATE;

  IF v_batch_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.fleet_reconciliation_batches
      WHERE id = v_batch_id AND status = 'applied'
    ) THEN
      RETURN;
    END IF;
    RAISE EXCEPTION 'An incomplete reconciliation batch already exists: %', v_batch_id;
  END IF;

  CREATE TEMP TABLE latest_august_source ON COMMIT DROP AS
  SELECT source.*
  FROM jsonb_to_recordset(v_manifest) AS source(
    "sourceRow" integer,
    "sourcePlate" text,
    "sourceCustomerName" text,
    "sourceCustomerPhone" text,
    "resolvedCustomerNationalId" text,
    "resolvedCustomerPhone" text,
    "supportingContractNumber" text,
    "identityResolution" text,
    "sourceClassification" text,
    "decisionReason" text,
    "evidence" jsonb
  );

  SELECT count(*), count(*) FILTER (
    WHERE "resolvedCustomerNationalId" IS NOT NULL
       OR "resolvedCustomerPhone" IS NOT NULL
  )
  INTO v_import_count, v_resolved_customer_count
  FROM latest_august_source;

  IF v_import_count <> 84 OR v_resolved_customer_count <> 70 THEN
    RAISE EXCEPTION 'Manifest totals changed: % imported / % resolved customers',
      v_import_count, v_resolved_customer_count;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM latest_august_source source
    LEFT JOIN LATERAL (
      SELECT count(*) AS match_count
      FROM public.vehicles vehicle
      WHERE vehicle.company_id = v_company_id
        AND public.normalize_vehicle_plate(vehicle.plate_number)
          = public.normalize_vehicle_plate(source."sourcePlate")
    ) matches ON true
    WHERE matches.match_count <> 1
  ) THEN
    RAISE EXCEPTION 'Every imported row must resolve to its reviewed company vehicle';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM latest_august_source source
    JOIN public.vehicles vehicle
      ON vehicle.company_id = v_company_id
     AND public.normalize_vehicle_plate(vehicle.plate_number)
       = public.normalize_vehicle_plate(source."sourcePlate")
    WHERE vehicle.status::text <> 'rented'
  ) THEN
    RAISE EXCEPTION 'Vehicle status changed after review; latest August snapshot aborted';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM latest_august_source source
    LEFT JOIN LATERAL (
      SELECT count(*) AS match_count
      FROM public.customers customer
      WHERE customer.company_id = v_company_id
        AND (
          (
            source."resolvedCustomerNationalId" IS NOT NULL
            AND customer.national_id = source."resolvedCustomerNationalId"
          )
          OR (
            source."resolvedCustomerNationalId" IS NULL
            AND source."resolvedCustomerPhone" IS NOT NULL
            AND regexp_replace(COALESCE(customer.phone, ''), '\D', '', 'g')
              = regexp_replace(source."resolvedCustomerPhone", '\D', '', 'g')
          )
        )
    ) matches ON true
    WHERE (
      source."resolvedCustomerNationalId" IS NOT NULL
      OR source."resolvedCustomerPhone" IS NOT NULL
    )
      AND matches.match_count <> 1
  ) THEN
    RAISE EXCEPTION 'A resolved operational customer is outside the company';
  END IF;

  CREATE TEMP TABLE latest_august_resolved ON COMMIT DROP AS
  SELECT
    source.*,
    vehicle.id AS vehicle_id,
    customer.id AS customer_id,
    contract.id AS supporting_contract_id
  FROM latest_august_source source
  JOIN public.vehicles vehicle
    ON vehicle.company_id = v_company_id
   AND public.normalize_vehicle_plate(vehicle.plate_number)
     = public.normalize_vehicle_plate(source."sourcePlate")
  LEFT JOIN LATERAL (
    SELECT matched.id
    FROM public.customers matched
    WHERE matched.company_id = v_company_id
      AND (
        (
          source."resolvedCustomerNationalId" IS NOT NULL
          AND matched.national_id = source."resolvedCustomerNationalId"
        )
        OR (
          source."resolvedCustomerNationalId" IS NULL
          AND source."resolvedCustomerPhone" IS NOT NULL
          AND regexp_replace(COALESCE(matched.phone, ''), '\D', '', 'g')
            = regexp_replace(source."resolvedCustomerPhone", '\D', '', 'g')
        )
      )
    ORDER BY matched.id
    LIMIT 1
  ) customer ON true
  LEFT JOIN public.contracts contract
    ON contract.company_id = v_company_id
   AND contract.contract_number = source."supportingContractNumber"
   AND contract.vehicle_id = vehicle.id
   AND contract.customer_id = customer.id
   AND contract.status IN ('active', 'under_legal_procedure');

  IF EXISTS (
    SELECT 1
    FROM latest_august_resolved source
    WHERE source."supportingContractNumber" IS NOT NULL
      AND source.supporting_contract_id IS NULL
  ) THEN
    RAISE EXCEPTION 'A supporting contract no longer matches the reviewed vehicle/customer';
  END IF;

  CREATE TEMP TABLE prior_august_assignments ON COMMIT DROP AS
  SELECT DISTINCT ON (assignment.vehicle_id)
    assignment.vehicle_id,
    assignment.id AS previous_assignment_id
  FROM public.fleet_reconciliation_assignments assignment
  JOIN latest_august_resolved source
    ON source.vehicle_id = assignment.vehicle_id
  WHERE assignment.company_id = v_company_id
    AND assignment.is_active
  ORDER BY assignment.vehicle_id, assignment.created_at DESC, assignment.id DESC;

  INSERT INTO public.fleet_reconciliation_batches (
    company_id, source_file_name, source_sha256, source_as_of, status,
    source_row_count, status_change_count, customer_snapshot_count, metadata
  ) VALUES (
    v_company_id,
    'دفعات-شهر-8-أغسطس-2026.xlsx',
    v_source_sha,
    DATE '2026-08-31',
    'applying',
    89,
    0,
    70,
    jsonb_build_object(
      'scope', 'latest_august_operational_custody_snapshot',
      'source_report_row_count', 89,
      'imported_assignment_count', 84,
      'excluded_newer_decision_count', 5,
      'excluded_newer_decision_plates', jsonb_build_array(
        '722134', '2773', '848014', '846485', '847932'
      ),
      'unresolved_customer_count', 12,
      'ambiguous_customer_count', 2,
      'vehicle_status_rows_changed', 0,
      'contract_rows_changed', 0,
      'invoice_rows_changed', 0,
      'payment_rows_changed', 0,
      'legal_case_rows_changed', 0
    )
  ) RETURNING id INTO v_batch_id;

  UPDATE public.fleet_reconciliation_assignments assignment
  SET is_active = false,
      closed_at = now(),
      closed_reason = 'superseded_by_batch:' || v_batch_id::text
  WHERE assignment.company_id = v_company_id
    AND assignment.is_active
    AND assignment.vehicle_id IN (
      SELECT source.vehicle_id FROM latest_august_resolved source
    );

  INSERT INTO public.fleet_reconciliation_assignments (
    batch_id, company_id, vehicle_id, source_row, source_plate,
    source_result, source_classification, source_customer_name,
    source_customer_phone, customer_id, supporting_contract_id,
    identity_resolution, target_status, target_location, decision_reason,
    source_fingerprint, source_evidence, before_state, after_state
  )
  SELECT
    v_batch_id,
    v_company_id,
    source.vehicle_id,
    source."sourceRow",
    source."sourcePlate",
    'current_renter_in_august_2026_payment_workbook',
    source."sourceClassification",
    source."sourceCustomerName",
    source."sourceCustomerPhone",
    source.customer_id,
    source.supporting_contract_id,
    source."identityResolution",
    'rented'::public.vehicle_status,
    NULL,
    source."decisionReason",
    md5(concat_ws(
      '|', v_source_sha, source."sourceRow"::text, source."sourcePlate",
      COALESCE(source."sourceCustomerName", '')
    )),
    COALESCE(source."evidence", '{}'::jsonb)
      || jsonb_build_object(
        'previous_assignment_id', previous.previous_assignment_id,
        'source_sha256', v_source_sha,
        'operational_only', true,
        'creates_contract', false,
        'proves_payment', false,
        'proves_legal_claim', false
      ),
    jsonb_build_object(
      'status', vehicle.status::text,
      'location', vehicle.location,
      'plate_number', vehicle.plate_number,
      'is_active', vehicle.is_active,
      'updated_at', vehicle.updated_at
    ),
    jsonb_build_object(
      'status', vehicle.status::text,
      'location', vehicle.location,
      'plate_number', vehicle.plate_number,
      'is_active', vehicle.is_active,
      'updated_at', vehicle.updated_at
    )
  FROM latest_august_resolved source
  JOIN public.vehicles vehicle
    ON vehicle.id = source.vehicle_id
   AND vehicle.company_id = v_company_id
  LEFT JOIN prior_august_assignments previous
    ON previous.vehicle_id = source.vehicle_id;

  IF (
    SELECT count(*)
    FROM public.fleet_reconciliation_assignments assignment
    WHERE assignment.batch_id = v_batch_id
      AND assignment.company_id = v_company_id
      AND assignment.is_active
      AND assignment.target_status = 'rented'
  ) <> 84 THEN
    RAISE EXCEPTION 'Postcondition failed: latest August assignments are incomplete';
  END IF;

  UPDATE public.fleet_reconciliation_batches batch
  SET status = 'applied',
      applied_at = now(),
      metadata = batch.metadata || jsonb_build_object(
        'applied_assignment_count', 84,
        'previous_assignment_count', (
          SELECT count(*) FROM prior_august_assignments
        )
      )
  WHERE batch.id = v_batch_id;
END;
$register$;

COMMIT;

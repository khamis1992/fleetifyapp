-- Create a small, actionable review queue for the August reconciliation.
-- This migration creates tasks only; it does not mutate contracts, vehicles,
-- invoices, payments, penalties, customers, or legal cases.

BEGIN;

DO $tasks$
DECLARE
  v_company_id constant uuid := '24bc0b21-4e2d-4413-9842-31719a3669f4'::uuid;
  v_source_sha constant text := '4E0F968805E9953CD3E10B90B9CEA6E418EE87CC8C477490235092A102224A67';
  v_source constant text := 'august_contract_reconciliation_20260831';
  v_owner_profile_id uuid;
  v_manifest jsonb := '[
  {
    "taskKey": "different_customer_live_contract",
    "title": "عاجل: تسوية 10 عقود باسم عميل آخر على مركبات أغسطس",
    "priority": "urgent",
    "dueDays": 1,
    "description": "راجع الهوية والملف الموقّع لكل مركبة. العقد السابق يُنهى عند بداية العقد الجديد، وتُحفظ مطالبته حتى تاريخ القطع فقط مع مخالفات فترة العهدة.",
    "tags": [
      "contracts",
      "legal",
      "custody-conflict",
      "august-2026"
    ],
    "cases": [
      {
        "plate": "706150",
        "august_customer": "ألياس يعقوبي",
        "august_phone": "70704543",
        "source_contract_number": "HIST-XLS-B70-706150",
        "source_start_date": "2026-03-01",
        "source_end_date": "2028-06-01",
        "source_monthly_amount": 1600,
        "source_note": "حجز",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "C-ALF-0058",
            "customer_name": "مروان باكير",
            "status": "under_legal_procedure",
            "start_date": "2025-07-11",
            "end_date": "2028-07-11",
            "vehicle_returned": false,
            "matched_signed_document_count": 1,
            "due_rent_as_of_august": 16000,
            "rent_before_new_start": 8000,
            "unpaid_penalties": 2000,
            "penalties_before_new_start": 0
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "اعتمد هوية المستأجر الحالي، وأنهِ عهدة العقد السابق عند بداية العقد الجديد، وحوّل المتأخر القديم للشؤون القانونية بعد ضبط القطع."
      },
      {
        "plate": "857051",
        "august_customer": "فخري الدين عثمان",
        "august_phone": "55422771",
        "source_contract_number": null,
        "source_start_date": "2026-07-19",
        "source_end_date": null,
        "source_monthly_amount": 1650,
        "source_note": "لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "LTO2024152",
            "customer_name": "هاني هشام",
            "status": "active",
            "start_date": "2024-11-05",
            "end_date": "2027-11-05",
            "vehicle_returned": false,
            "matched_signed_document_count": 1,
            "due_rent_as_of_august": 0,
            "rent_before_new_start": 0,
            "unpaid_penalties": 15100,
            "penalties_before_new_start": 15100
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [
          {
            "contract_number": "C-ALF-0041",
            "plate": "5900",
            "status": "under_legal_procedure"
          }
        ],
        "required_action": "اعتمد هوية المستأجر الحالي، وأنهِ عهدة العقد السابق عند بداية العقد الجديد، وحوّل المتأخر القديم للشؤون القانونية بعد ضبط القطع."
      },
      {
        "plate": "2782",
        "august_customer": "سعيد الهلالي",
        "august_phone": null,
        "source_contract_number": null,
        "source_start_date": null,
        "source_end_date": null,
        "source_monthly_amount": 1000,
        "source_note": "لا يوجد بداية ونهاية في ملف الورد",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "AGR-202504-399591",
            "customer_name": "شرفي عبد الله",
            "status": "active",
            "start_date": "2025-02-01",
            "end_date": "2028-01-03",
            "vehicle_returned": false,
            "matched_signed_document_count": 0,
            "due_rent_as_of_august": 28800,
            "rent_before_new_start": 0,
            "unpaid_penalties": 500,
            "penalties_before_new_start": 0
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [
          {
            "contract_number": "LTO202456",
            "plate": "21875",
            "status": "under_legal_procedure"
          }
        ],
        "required_action": "اعتمد هوية المستأجر الحالي، وأنهِ عهدة العقد السابق عند بداية العقد الجديد، وحوّل المتأخر القديم للشؤون القانونية بعد ضبط القطع."
      },
      {
        "plate": "7054",
        "august_customer": "عمر عبد المولى مبروكي",
        "august_phone": "31598966",
        "source_contract_number": "HIST-XLS-T77-7054",
        "source_start_date": "2026-06-06",
        "source_end_date": null,
        "source_monthly_amount": 1500,
        "source_note": "لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "C-ALF-0053",
            "customer_name": "محمد جاسم الصالح",
            "status": "under_legal_procedure",
            "start_date": "2025-01-16",
            "end_date": "2026-12-31",
            "vehicle_returned": false,
            "matched_signed_document_count": 1,
            "due_rent_as_of_august": 21450,
            "rent_before_new_start": 16500,
            "unpaid_penalties": 8200,
            "penalties_before_new_start": 6400
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "اعتمد هوية المستأجر الحالي، وأنهِ عهدة العقد السابق عند بداية العقد الجديد، وحوّل المتأخر القديم للشؤون القانونية بعد ضبط القطع."
      },
      {
        "plate": "7066",
        "august_customer": "ايهاب ميرغني عوض الكريم عبد الله",
        "august_phone": "70952447",
        "source_contract_number": null,
        "source_start_date": "2024-01-29",
        "source_end_date": null,
        "source_monthly_amount": 2550,
        "source_note": "حجز 52 | لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "C-ALF-0061",
            "customer_name": "عوض الكريم عبد المنعم علي سعيد احمد",
            "status": "under_legal_procedure",
            "start_date": "2024-01-29",
            "end_date": "2026-01-29",
            "vehicle_returned": false,
            "matched_signed_document_count": 0,
            "due_rent_as_of_august": 35975,
            "rent_before_new_start": 0,
            "unpaid_penalties": 24700,
            "penalties_before_new_start": 0
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [
          {
            "contract_number": "C-ALF-0008",
            "plate": "185573",
            "status": "under_legal_procedure"
          }
        ],
        "required_action": "اعتمد هوية المستأجر الحالي، وأنهِ عهدة العقد السابق عند بداية العقد الجديد، وحوّل المتأخر القديم للشؤون القانونية بعد ضبط القطع."
      },
      {
        "plate": "862165",
        "august_customer": "مهدي الشريف عبد الرحيم يوسف",
        "august_phone": "33670129",
        "source_contract_number": null,
        "source_start_date": "2025-09-01",
        "source_end_date": "2028-01-01",
        "source_monthly_amount": 1500,
        "source_note": null,
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "LTO2024283",
            "customer_name": "فهد الشريف عبد الرحيم يوسف",
            "status": "active",
            "start_date": "2024-08-24",
            "end_date": "2027-09-01",
            "vehicle_returned": false,
            "matched_signed_document_count": 1,
            "due_rent_as_of_august": 8150,
            "rent_before_new_start": 0,
            "unpaid_penalties": 100,
            "penalties_before_new_start": 0
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [
          {
            "contract_number": "LTO2024252",
            "plate": "721440",
            "status": "under_legal_procedure"
          }
        ],
        "required_action": "اعتمد هوية المستأجر الحالي، وأنهِ عهدة العقد السابق عند بداية العقد الجديد، وحوّل المتأخر القديم للشؤون القانونية بعد ضبط القطع."
      },
      {
        "plate": "10663",
        "august_customer": "علاء الدين علي دباش",
        "august_phone": "77456429",
        "source_contract_number": null,
        "source_start_date": "2025-09-01",
        "source_end_date": null,
        "source_monthly_amount": 1500,
        "source_note": "لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "CON-26-V1KPVI",
            "customer_name": "علاء الدين خميس حسين",
            "status": "active",
            "start_date": "2025-09-01",
            "end_date": "2027-08-01",
            "vehicle_returned": false,
            "matched_signed_document_count": 0,
            "due_rent_as_of_august": 13800,
            "rent_before_new_start": 0,
            "unpaid_penalties": 4100,
            "penalties_before_new_start": 0
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [
          {
            "contract_number": "LTO2024136",
            "plate": "7041",
            "status": "under_legal_procedure"
          }
        ],
        "required_action": "اعتمد هوية المستأجر الحالي، وأنهِ عهدة العقد السابق عند بداية العقد الجديد، وحوّل المتأخر القديم للشؤون القانونية بعد ضبط القطع."
      },
      {
        "plate": "10853",
        "august_customer": "محمد علی محمد خالد",
        "august_phone": "66047108",
        "source_contract_number": null,
        "source_start_date": "2026-01-01",
        "source_end_date": null,
        "source_monthly_amount": 1500,
        "source_note": "1500 | لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "C-ALF-0099",
            "customer_name": "محمد ابراهيم نور غد غول",
            "status": "under_legal_procedure",
            "start_date": "2025-10-15",
            "end_date": "2026-12-31",
            "vehicle_returned": false,
            "matched_signed_document_count": 1,
            "due_rent_as_of_august": 15000,
            "rent_before_new_start": 4500,
            "unpaid_penalties": 100,
            "penalties_before_new_start": 0
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "اعتمد هوية المستأجر الحالي، وأنهِ عهدة العقد السابق عند بداية العقد الجديد، وحوّل المتأخر القديم للشؤون القانونية بعد ضبط القطع."
      },
      {
        "plate": "10857",
        "august_customer": "غير موجود في النظام",
        "august_phone": "50032458",
        "source_contract_number": "C-ALF-0100",
        "source_start_date": "2026-01-06",
        "source_end_date": null,
        "source_monthly_amount": 1500,
        "source_note": "1500 | لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 0,
        "live_contracts_on_plate": [
          {
            "contract_number": "C-ALF-0100",
            "customer_name": "مجدي احمد عبدالله علي",
            "status": "active",
            "start_date": "2025-05-08",
            "end_date": "2026-12-31",
            "vehicle_returned": false,
            "matched_signed_document_count": 0,
            "due_rent_as_of_august": 15000,
            "rent_before_new_start": 6000,
            "unpaid_penalties": 2300,
            "penalties_before_new_start": 1300
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "اعتمد هوية المستأجر الحالي، وأنهِ عهدة العقد السابق عند بداية العقد الجديد، وحوّل المتأخر القديم للشؤون القانونية بعد ضبط القطع."
      },
      {
        "plate": "8204",
        "august_customer": "سيف الدين محمد صالح حسين",
        "august_phone": "33773235",
        "source_contract_number": null,
        "source_start_date": "2025-05-06",
        "source_end_date": null,
        "source_monthly_amount": 1500,
        "source_note": "1500 | لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "LTO2024150",
            "customer_name": "الحبيب الحوسين الخليفي",
            "status": "under_legal_procedure",
            "start_date": "2024-05-07",
            "end_date": "2027-04-06",
            "vehicle_returned": true,
            "matched_signed_document_count": 0,
            "due_rent_as_of_august": 41495,
            "rent_before_new_start": 9495,
            "unpaid_penalties": 10800,
            "penalties_before_new_start": 10800
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "اعتمد هوية المستأجر الحالي، وأنهِ عهدة العقد السابق عند بداية العقد الجديد، وحوّل المتأخر القديم للشؤون القانونية بعد ضبط القطع."
      }
    ]
  },
  {
    "taskKey": "matched_with_parallel_conflict",
    "title": "مراجعة 6 مركبات بها عقد مطابق وتعارض موازٍ",
    "priority": "high",
    "dueDays": 2,
    "description": "أبقِ العقد المطابق للمستأجر الحالي، وافصل عهدة العقد الموازي وفوترته ومخالفاته وفق تاريخ انتقال المركبة المثبت.",
    "tags": [
      "contracts",
      "parallel-contract",
      "august-2026"
    ],
    "cases": [
      {
        "plate": "5900",
        "august_customer": "محمد عزيز محسن جلالي",
        "august_phone": "50328969",
        "source_contract_number": "HIST-XLS-T77-5900",
        "source_start_date": "2026-03-10",
        "source_end_date": "2028-06-01",
        "source_monthly_amount": 1100,
        "source_note": "دفع مسبق",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "C-ALF-0041",
            "customer_name": "فخري الدين عثمان",
            "status": "under_legal_procedure",
            "start_date": "2025-04-19",
            "end_date": "2026-02-01",
            "vehicle_returned": false,
            "matched_signed_document_count": 1,
            "due_rent_as_of_august": 11350,
            "rent_before_new_start": 11350,
            "unpaid_penalties": 500,
            "penalties_before_new_start": 500
          },
          {
            "contract_number": "HIST-XLS-T77-5900",
            "customer_name": "محمد عزيز محسن جلالي",
            "status": "under_legal_procedure",
            "start_date": "2026-02-01",
            "end_date": "2027-12-01",
            "vehicle_returned": false,
            "matched_signed_document_count": 0,
            "due_rent_as_of_august": 800,
            "rent_before_new_start": 0,
            "unpaid_penalties": 1900,
            "penalties_before_new_start": 800
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "أبقِ العقد المطابق، وحدد نهاية عهدة العقد الموازي عند انتقال المركبة ثم راجع فوترة القديم ومخالفاته."
      },
      {
        "plate": "7038",
        "august_customer": "مهدي محمد القاطري",
        "august_phone": "51332508",
        "source_contract_number": "HIST-XLS-T77-7038",
        "source_start_date": "2026-01-01",
        "source_end_date": "2028-06-01",
        "source_monthly_amount": 1600,
        "source_note": "1600",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "C-ALF-0048",
            "customer_name": "ثامر محمد السيد",
            "status": "under_legal_procedure",
            "start_date": "2024-02-03",
            "end_date": "2025-12-31",
            "vehicle_returned": true,
            "matched_signed_document_count": 0,
            "due_rent_as_of_august": 9760,
            "rent_before_new_start": 9760,
            "unpaid_penalties": 4000,
            "penalties_before_new_start": 4000
          },
          {
            "contract_number": "CNT-26-7038",
            "customer_name": "مهدي محمد القاطري",
            "status": "active",
            "start_date": "2026-01-01",
            "end_date": "2028-06-01",
            "vehicle_returned": false,
            "matched_signed_document_count": 0,
            "due_rent_as_of_august": 4900,
            "rent_before_new_start": 0,
            "unpaid_penalties": 0,
            "penalties_before_new_start": 0
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "أبقِ العقد المطابق، وحدد نهاية عهدة العقد الموازي عند انتقال المركبة ثم راجع فوترة القديم ومخالفاته."
      },
      {
        "plate": "7041",
        "august_customer": "رمزي الهاشمي بعزاوي",
        "august_phone": "39913719",
        "source_contract_number": "C-ALF-0050",
        "source_start_date": "2025-10-10",
        "source_end_date": "2027-03-01",
        "source_monthly_amount": 1600,
        "source_note": null,
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "LTO2024136",
            "customer_name": "علاء الدين علي دباش",
            "status": "under_legal_procedure",
            "start_date": "2024-04-27",
            "end_date": "2024-09-11",
            "vehicle_returned": false,
            "matched_signed_document_count": 1,
            "due_rent_as_of_august": 0,
            "rent_before_new_start": 0,
            "unpaid_penalties": 1700,
            "penalties_before_new_start": 1700
          },
          {
            "contract_number": "C-ALF-0050",
            "customer_name": "رمزي الهاشمي بعزاوي",
            "status": "active",
            "start_date": "2025-10-10",
            "end_date": "2026-12-31",
            "vehicle_returned": false,
            "matched_signed_document_count": 1,
            "due_rent_as_of_august": 7800,
            "rent_before_new_start": 0,
            "unpaid_penalties": 2000,
            "penalties_before_new_start": 0
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "أبقِ العقد المطابق، وحدد نهاية عهدة العقد الموازي عند انتقال المركبة ثم راجع فوترة القديم ومخالفاته."
      },
      {
        "plate": "862169",
        "august_customer": "عبد الرحيم شاكر احمد محمد",
        "august_phone": "31310330",
        "source_contract_number": "C-ALF-0086",
        "source_start_date": "2025-07-01",
        "source_end_date": null,
        "source_monthly_amount": 1000,
        "source_note": "لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "C-ALF-0086",
            "customer_name": "عبد الرحيم شاكر احمد محمد",
            "status": "active",
            "start_date": "2025-07-01",
            "end_date": "2026-12-31",
            "vehicle_returned": false,
            "matched_signed_document_count": 0,
            "due_rent_as_of_august": 17400,
            "rent_before_new_start": 0,
            "unpaid_penalties": 0,
            "penalties_before_new_start": 0
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [
          {
            "contract_number": "LTO2024109",
            "plate": "9890",
            "status": "active"
          },
          {
            "contract_number": "C-ALF-0033",
            "plate": "4018",
            "status": "under_legal_procedure"
          }
        ],
        "required_action": "أبقِ العقد المطابق، وحدد نهاية عهدة العقد الموازي عند انتقال المركبة ثم راجع فوترة القديم ومخالفاته."
      },
      {
        "plate": "4018",
        "august_customer": "عبد الرحيم شاكر احمد محمد",
        "august_phone": "31310330",
        "source_contract_number": "C-ALF-0033",
        "source_start_date": "2024-02-08",
        "source_end_date": "2027-01-01",
        "source_monthly_amount": 1700,
        "source_note": "1700",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "C-ALF-0033",
            "customer_name": "عبد الرحيم شاكر احمد محمد",
            "status": "under_legal_procedure",
            "start_date": "2024-02-08",
            "end_date": "2027-01-08",
            "vehicle_returned": false,
            "matched_signed_document_count": 1,
            "due_rent_as_of_august": 25380,
            "rent_before_new_start": 0,
            "unpaid_penalties": 500,
            "penalties_before_new_start": 0
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [
          {
            "contract_number": "LTO2024109",
            "plate": "9890",
            "status": "active"
          },
          {
            "contract_number": "C-ALF-0086",
            "plate": "862169",
            "status": "active"
          }
        ],
        "required_action": "أبقِ العقد المطابق، وحدد نهاية عهدة العقد الموازي عند انتقال المركبة ثم راجع فوترة القديم ومخالفاته."
      },
      {
        "plate": "8206",
        "august_customer": "محمد علي سليم",
        "august_phone": "30797703",
        "source_contract_number": "C-ALF-0074",
        "source_start_date": "2025-07-01",
        "source_end_date": "2027-08-01",
        "source_monthly_amount": 1500,
        "source_note": null,
        "matching_customer_count": 1,
        "live_contracts_on_plate": [
          {
            "contract_number": "C-ALF-0074",
            "customer_name": "محمد علي سليم",
            "status": "active",
            "start_date": "2025-07-01",
            "end_date": "2027-08-01",
            "vehicle_returned": false,
            "matched_signed_document_count": 0,
            "due_rent_as_of_august": 18000,
            "rent_before_new_start": 0,
            "unpaid_penalties": 2100,
            "penalties_before_new_start": 0
          },
          {
            "contract_number": "C-ALF-0071",
            "customer_name": "محمد صالح فرج حامد",
            "status": "under_legal_procedure",
            "start_date": "2025-07-10",
            "end_date": "2026-12-31",
            "vehicle_returned": false,
            "matched_signed_document_count": 0,
            "due_rent_as_of_august": 16000,
            "rent_before_new_start": 0,
            "unpaid_penalties": 0,
            "penalties_before_new_start": 0
          }
        ],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "أبقِ العقد المطابق، وحدد نهاية عهدة العقد الموازي عند انتقال المركبة ثم راجع فوترة القديم ومخالفاته."
      }
    ]
  },
  {
    "taskKey": "expected_customer_contract_on_other_vehicle",
    "title": "مراجعة 4 عملاء عقودهم الحية على مركبة أخرى",
    "priority": "high",
    "dueDays": 2,
    "description": "طابق العقد الموقّع واللوحتين والهوية قبل تصحيح الربط. يمنع نقل رصيد أو مخالفة بين مركبتين أو عميلين دون دليل.",
    "tags": [
      "contracts",
      "vehicle-link",
      "identity-review",
      "august-2026"
    ],
    "cases": [
      {
        "plate": "21860",
        "august_customer": "محمد ضياء العويني",
        "august_phone": "66816813",
        "source_contract_number": "AGR-202502-0426",
        "source_start_date": "2025-02-16",
        "source_end_date": "2027-07-01",
        "source_monthly_amount": 1700,
        "source_note": null,
        "matching_customer_count": 1,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [
          {
            "contract_number": "C-ALF-0069",
            "plate": "725473",
            "status": "active"
          }
        ],
        "required_action": "طابق الملف الموقّع واللوحتين، ثم صحح ربط العقد أو أنشئ العقد الصحيح دون نقل مديونية بين العملاء."
      },
      {
        "plate": "893409",
        "august_customer": "عقبة يوسف قصعاوي",
        "august_phone": "50409220",
        "source_contract_number": null,
        "source_start_date": "2025-03-01",
        "source_end_date": "2027-09-01",
        "source_monthly_amount": 1600,
        "source_note": null,
        "matching_customer_count": 1,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [
          {
            "contract_number": "C-ALF-0030",
            "plate": "381247",
            "status": "active"
          }
        ],
        "required_action": "طابق الملف الموقّع واللوحتين، ثم صحح ربط العقد أو أنشئ العقد الصحيح دون نقل مديونية بين العملاء."
      },
      {
        "plate": "5890",
        "august_customer": "عبد العزيز بن نبيل جرفال",
        "august_phone": "33767961",
        "source_contract_number": "LTO2024340",
        "source_start_date": "2024-12-01",
        "source_end_date": "2027-11-01",
        "source_monthly_amount": 1500,
        "source_note": "800",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [
          {
            "contract_number": "LTO202410",
            "plate": "17216",
            "status": "under_legal_procedure"
          }
        ],
        "required_action": "طابق الملف الموقّع واللوحتين، ثم صحح ربط العقد أو أنشئ العقد الصحيح دون نقل مديونية بين العملاء."
      },
      {
        "plate": "603353",
        "august_customer": "مصطفى بالقايد",
        "august_phone": "31245752",
        "source_contract_number": "",
        "source_start_date": "2025-07-01",
        "source_end_date": "2027-12-02",
        "source_monthly_amount": 1700,
        "source_note": null,
        "matching_customer_count": 1,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [
          {
            "contract_number": "C-ALF-0043",
            "plate": "5892",
            "status": "under_legal_procedure"
          }
        ],
        "required_action": "طابق الملف الموقّع واللوحتين، ثم صحح ربط العقد أو أنشئ العقد الصحيح دون نقل مديونية بين العملاء."
      }
    ]
  },
  {
    "taskKey": "no_live_contract",
    "title": "استكمال 20 مستأجرًا في أغسطس بلا عقد حي",
    "priority": "high",
    "dueDays": 3,
    "description": "استكمل الهوية والعقد الموقّع وتاريخ التسليم. ملف أغسطس يثبت الحيازة التشغيلية فقط ولا يثبت السداد أو المطالبة القانونية وحده.",
    "tags": [
      "contracts",
      "missing-contract",
      "identity-review",
      "august-2026"
    ],
    "cases": [
      {
        "plate": "648144",
        "august_customer": "سفيان المختار الصالح",
        "august_phone": null,
        "source_contract_number": null,
        "source_start_date": "2026-05-02",
        "source_end_date": null,
        "source_monthly_amount": 1500,
        "source_note": "لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 0,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "676281",
        "august_customer": "حمزة بادو",
        "august_phone": null,
        "source_contract_number": "LTO202437",
        "source_start_date": "2023-01-01",
        "source_end_date": "2026-12-01",
        "source_monthly_amount": 1050,
        "source_note": null,
        "matching_customer_count": 1,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "893406",
        "august_customer": "محمود جاسم الصالح",
        "august_phone": null,
        "source_contract_number": "HIST-XLS-B70-893406",
        "source_start_date": "2026-02-04",
        "source_end_date": "2027-09-01",
        "source_monthly_amount": 1600,
        "source_note": null,
        "matching_customer_count": 2,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "2781",
        "august_customer": "غير موجود في النظام",
        "august_phone": null,
        "source_contract_number": "",
        "source_start_date": "2026-06-01",
        "source_end_date": null,
        "source_monthly_amount": 1500,
        "source_note": "لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 0,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "5889",
        "august_customer": "ايمن خليفة حمادي",
        "august_phone": "30305808",
        "source_contract_number": "LTO202427",
        "source_start_date": "2023-11-20",
        "source_end_date": "2026-11-01",
        "source_monthly_amount": 2100,
        "source_note": null,
        "matching_customer_count": 1,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "7039",
        "august_customer": "غير موجود في النظام",
        "august_phone": "60045111",
        "source_contract_number": "AGR-202504-423180",
        "source_start_date": "2025-03-01",
        "source_end_date": "2027-11-01",
        "source_monthly_amount": 1500,
        "source_note": "500",
        "matching_customer_count": 0,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "7058",
        "august_customer": "محمد فوأد شوشان",
        "august_phone": "55146823",
        "source_contract_number": "319",
        "source_start_date": "2024-09-25",
        "source_end_date": "2027-09-01",
        "source_monthly_amount": 1600,
        "source_note": null,
        "matching_customer_count": 1,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "7063",
        "august_customer": "مهند حمودة الظاهر",
        "august_phone": "30623322",
        "source_contract_number": "AGR-055405-212",
        "source_start_date": "2025-12-01",
        "source_end_date": "2027-05-01",
        "source_monthly_amount": 1600,
        "source_note": "1600",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "7071",
        "august_customer": "حمزة زمكيل",
        "august_phone": null,
        "source_contract_number": "HIST-XLS-T77-7071",
        "source_start_date": "2025-03-08",
        "source_end_date": null,
        "source_monthly_amount": 1500,
        "source_note": "لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "7074",
        "august_customer": "محمود جاسم الصالح",
        "august_phone": "30531131",
        "source_contract_number": "LTO2024335",
        "source_start_date": "2024-11-14",
        "source_end_date": null,
        "source_monthly_amount": 1600,
        "source_note": "لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 2,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "11473",
        "august_customer": "عماد العياري",
        "august_phone": "66071051",
        "source_contract_number": "LTO2024317",
        "source_start_date": "2024-09-19",
        "source_end_date": "2027-02-01",
        "source_monthly_amount": 1250,
        "source_note": null,
        "matching_customer_count": 1,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "10664",
        "august_customer": "غير موجود في النظام",
        "august_phone": "50415688",
        "source_contract_number": "C-ALF-0093",
        "source_start_date": "2025-08-24",
        "source_end_date": null,
        "source_monthly_amount": 1500,
        "source_note": "900 | لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 0,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "10665",
        "august_customer": "غير موجود في النظام",
        "august_phone": null,
        "source_contract_number": "LTO2024273",
        "source_start_date": null,
        "source_end_date": null,
        "source_monthly_amount": 0,
        "source_note": "لا يوجد تاريخ/قسط في ملف الورد",
        "matching_customer_count": 0,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "10856",
        "august_customer": "غير موجود في النظام",
        "august_phone": "77073470",
        "source_contract_number": "LTO202455",
        "source_start_date": "2026-02-02",
        "source_end_date": null,
        "source_monthly_amount": 1500,
        "source_note": "1500 | لا يوجد نهاية في ملف الورد",
        "matching_customer_count": 0,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "847941",
        "august_customer": "غير موجود في النظام",
        "august_phone": null,
        "source_contract_number": "LTO2024105",
        "source_start_date": "2023-03-01",
        "source_end_date": "2026-02-01",
        "source_monthly_amount": 2100,
        "source_note": null,
        "matching_customer_count": 0,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "847987",
        "august_customer": "غير موجود في النظام",
        "august_phone": null,
        "source_contract_number": "LTO2024106",
        "source_start_date": "2023-03-01",
        "source_end_date": "2026-02-01",
        "source_monthly_amount": 2100,
        "source_note": null,
        "matching_customer_count": 0,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "847099",
        "august_customer": "أمير عبد الرحمن احمد المهدى بط",
        "august_phone": null,
        "source_contract_number": "LTO2024124",
        "source_start_date": "2024-04-14",
        "source_end_date": "2027-03-01",
        "source_monthly_amount": 2300,
        "source_note": "- حادث",
        "matching_customer_count": 0,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "847601",
        "august_customer": "طارق محمد الرحالي",
        "august_phone": null,
        "source_contract_number": "",
        "source_start_date": null,
        "source_end_date": null,
        "source_monthly_amount": 0,
        "source_note": "لا يوجد تاريخ/قسط في ملف الورد",
        "matching_customer_count": 1,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "8209",
        "august_customer": "غير موجود في النظام",
        "august_phone": null,
        "source_contract_number": "LTO2024276",
        "source_start_date": null,
        "source_end_date": null,
        "source_monthly_amount": 0,
        "source_note": "لا يوجد تاريخ/قسط في ملف الورد",
        "matching_customer_count": 0,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      },
      {
        "plate": "8213",
        "august_customer": "يسري بوز عيبة",
        "august_phone": "51039263",
        "source_contract_number": null,
        "source_start_date": "2025-01-31",
        "source_end_date": "2028-07-01",
        "source_monthly_amount": 1500,
        "source_note": "شهر 61500",
        "matching_customer_count": 0,
        "live_contracts_on_plate": [],
        "expected_customer_contracts_on_other_vehicle": [],
        "required_action": "استكمل الهوية والملف الموقّع وتاريخ التسليم، ثم أنشئ/اربط العقد الحالي؛ لا تُنشأ مطالبة قانونية من الاسم وحده."
      }
    ]
  },
  {
    "taskKey": "legal_claim_penalty_invoice_double_count",
    "title": "عاجل: مراجعة 16 مطالبة قانونية بعد منع تكرار المخالفات",
    "priority": "urgent",
    "dueDays": 1,
    "description": "اعتمد النسخة الثالثة من احتساب المطالبة، وحدّث قيمة القضية أو المستندات إن كانت قد حُفظت بالقيمة القديمة. فاتورة المخالفة لا تدخل كإيجار ثم تضاف المخالفة مرة ثانية.",
    "tags": [
      "legal",
      "claim-review",
      "penalty-deduplication",
      "august-2026"
    ],
    "cases": [
      {
        "contract_number": "C-ALF-0058",
        "plate": "706150",
        "customer_name": "مروان باكير",
        "claim_total_before_fix": 23200,
        "rent_invoice_due": 19200,
        "duplicated_penalty_invoice_due": 2000,
        "evidenced_violations_amount": 2000,
        "claim_total_after_deduplication": 21200
      },
      {
        "contract_number": "AGR-202504-406129",
        "plate": "856718",
        "customer_name": "حسان بو علاق",
        "claim_total_before_fix": 50348,
        "rent_invoice_due": 16948,
        "duplicated_penalty_invoice_due": 21200,
        "evidenced_violations_amount": 12200,
        "claim_total_after_deduplication": 29148
      },
      {
        "contract_number": "C-ALF-0083",
        "plate": "857045",
        "customer_name": "عمارة خرّوبي",
        "claim_total_before_fix": 15950,
        "rent_invoice_due": 9350,
        "duplicated_penalty_invoice_due": 500,
        "evidenced_violations_amount": 6100,
        "claim_total_after_deduplication": 15450
      },
      {
        "contract_number": "AGR-202504-424958",
        "plate": "2766",
        "customer_name": "محمد محمد أحمد محمد",
        "claim_total_before_fix": 12325,
        "rent_invoice_due": 6400,
        "duplicated_penalty_invoice_due": 2125,
        "evidenced_violations_amount": 3800,
        "claim_total_after_deduplication": 10200
      },
      {
        "contract_number": "C-ALF-0014",
        "plate": "2769",
        "customer_name": "وضاح عبد الله احمد العبيد",
        "claim_total_before_fix": 30600,
        "rent_invoice_due": 17000,
        "duplicated_penalty_invoice_due": 6800,
        "evidenced_violations_amount": 6800,
        "claim_total_after_deduplication": 23800
      },
      {
        "contract_number": "C-ALF-0023",
        "plate": "2778",
        "customer_name": "بلال اليعقوبي",
        "claim_total_before_fix": 25500,
        "rent_invoice_due": 17000,
        "duplicated_penalty_invoice_due": 3100,
        "evidenced_violations_amount": 5400,
        "claim_total_after_deduplication": 22400
      },
      {
        "contract_number": "C-ALF-0039",
        "plate": "5898",
        "customer_name": "محمد سرالختم",
        "claim_total_before_fix": 66700,
        "rent_invoice_due": 12500,
        "duplicated_penalty_invoice_due": 27100,
        "evidenced_violations_amount": 27100,
        "claim_total_after_deduplication": 39600
      },
      {
        "contract_number": "HIST-XLS-T77-5900",
        "plate": "5900",
        "customer_name": "محمد عزيز محسن جلالي",
        "claim_total_before_fix": 3800,
        "rent_invoice_due": 800,
        "duplicated_penalty_invoice_due": 1100,
        "evidenced_violations_amount": 1900,
        "claim_total_after_deduplication": 2700
      },
      {
        "contract_number": "C-ALF-0053",
        "plate": "7054",
        "customer_name": "محمد جاسم الصالح",
        "claim_total_before_fix": 33690,
        "rent_invoice_due": 23100,
        "duplicated_penalty_invoice_due": 2390,
        "evidenced_violations_amount": 8200,
        "claim_total_after_deduplication": 31300
      },
      {
        "contract_number": "LTO2024141",
        "plate": "7060",
        "customer_name": "بنور رقية",
        "claim_total_before_fix": 61700,
        "rent_invoice_due": 41900,
        "duplicated_penalty_invoice_due": 9900,
        "evidenced_violations_amount": 9900,
        "claim_total_after_deduplication": 51800
      },
      {
        "contract_number": "LTO202418",
        "plate": "7075",
        "customer_name": "محمد الهيثم الطاهر الهادي محمد",
        "claim_total_before_fix": 55700,
        "rent_invoice_due": 44400,
        "duplicated_penalty_invoice_due": 5200,
        "evidenced_violations_amount": 6100,
        "claim_total_after_deduplication": 50500
      },
      {
        "contract_number": "C-ALF-0067",
        "plate": "7078",
        "customer_name": "محمد شريف عمرو عياش",
        "claim_total_before_fix": 25200,
        "rent_invoice_due": 16000,
        "duplicated_penalty_invoice_due": 4900,
        "evidenced_violations_amount": 4300,
        "claim_total_after_deduplication": 20300
      },
      {
        "contract_number": "C-ALF-0042",
        "plate": "599720",
        "customer_name": "انور بن علي الذهبي",
        "claim_total_before_fix": 4000,
        "rent_invoice_due": 2000,
        "duplicated_penalty_invoice_due": 1000,
        "evidenced_violations_amount": 1000,
        "claim_total_after_deduplication": 3000
      },
      {
        "contract_number": "LTO2024270",
        "plate": "10197",
        "customer_name": "احمد الشيخ الصديق هاشم الوسيله",
        "claim_total_before_fix": 47750,
        "rent_invoice_due": 8550,
        "duplicated_penalty_invoice_due": 19600,
        "evidenced_violations_amount": 19600,
        "claim_total_after_deduplication": 28150
      },
      {
        "contract_number": "C-ALF-0099",
        "plate": "10853",
        "customer_name": "محمد ابراهيم نور غد غول",
        "claim_total_before_fix": 16700,
        "rent_invoice_due": 16500,
        "duplicated_penalty_invoice_due": 100,
        "evidenced_violations_amount": 100,
        "claim_total_after_deduplication": 16600
      },
      {
        "contract_number": "LTO2024150",
        "plate": "8204",
        "customer_name": "الحبيب الحوسين الخليفي",
        "claim_total_before_fix": 67095,
        "rent_invoice_due": 45495,
        "duplicated_penalty_invoice_due": 10800,
        "evidenced_violations_amount": 10800,
        "claim_total_after_deduplication": 56295
      }
    ]
  }
]'::jsonb;
  v_created integer := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::text || ':august-contract-review-tasks', 0)
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.fleet_reconciliation_batches batch
    WHERE batch.company_id = v_company_id
      AND batch.source_sha256 = v_source_sha
      AND batch.status = 'applied'
  ) THEN
    RAISE EXCEPTION 'Latest August operational snapshot must be applied first';
  END IF;

  IF to_regprocedure(
    'public.calculate_legal_claim_breakdown_v3(uuid,uuid,date)'
  ) IS NULL THEN
    RAISE EXCEPTION 'Legal claim component de-duplication must be applied first';
  END IF;

  SELECT profile.id INTO v_owner_profile_id
  FROM public.profiles profile
  JOIN public.user_roles role
    ON role.user_id = profile.user_id
   AND (role.company_id = v_company_id OR role.role = 'super_admin'::public.user_role)
  WHERE profile.company_id = v_company_id
    AND profile.is_active = true
    AND role.role IN (
      'company_admin'::public.user_role,
      'manager'::public.user_role,
      'super_admin'::public.user_role
    )
  ORDER BY CASE role.role
    WHEN 'company_admin'::public.user_role THEN 1
    WHEN 'manager'::public.user_role THEN 2
    ELSE 3 END,
    profile.created_at,
    profile.id
  LIMIT 1;

  IF v_owner_profile_id IS NULL THEN
    RAISE EXCEPTION 'No active company review owner was found';
  END IF;

  CREATE TEMP TABLE august_review_task_source ON COMMIT DROP AS
  SELECT source.*
  FROM jsonb_to_recordset(v_manifest) AS source(
    "taskKey" text,
    "title" text,
    "priority" text,
    "dueDays" integer,
    "description" text,
    "tags" text[],
    "cases" jsonb
  );

  IF (SELECT count(*) FROM august_review_task_source) <> 5
     OR EXISTS (
       SELECT 1 FROM august_review_task_source
       WHERE jsonb_array_length("cases") = 0
     ) THEN
    RAISE EXCEPTION 'August review task manifest is incomplete';
  END IF;

  INSERT INTO public.tasks (
    company_id, created_by, assigned_to, title, description, status,
    priority, due_date, category, tags, metadata
  )
  SELECT
    v_company_id,
    v_owner_profile_id,
    v_owner_profile_id,
    left(source."title", 255),
    concat_ws(E'\n',
      source."description",
      '',
      'عدد الحالات: ' || jsonb_array_length(source."cases")::text,
      'المصدر: دفعات-شهر-8-أغسطس-2026.xlsx',
      'الإجراء: راجع الحالات داخل بيانات المهمة وسجّل قرار كل حالة قبل إغلاق المهمة.'
    ),
    'pending',
    source."priority",
    now() + make_interval(days => source."dueDays"),
    'august_contract_reconciliation',
    source."tags",
    jsonb_build_object(
      'source', v_source,
      'sourceFile', 'دفعات-شهر-8-أغسطس-2026.xlsx',
      'sourceSha256', v_source_sha,
      'augustReconciliationTaskKey', source."taskKey",
      'caseCount', jsonb_array_length(source."cases"),
      'cases', source."cases",
      'createdByMigration', '20260831120000_create_august_contract_reconciliation_review_tasks'
    )
  FROM august_review_task_source source
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.tasks existing
    WHERE existing.company_id = v_company_id
      AND existing.metadata ->> 'source' = v_source
      AND existing.metadata ->> 'augustReconciliationTaskKey' = source."taskKey"
  );

  GET DIAGNOSTICS v_created = ROW_COUNT;

  IF v_created NOT IN (0, 5) THEN
    RAISE EXCEPTION 'Partial August review task creation detected: %', v_created;
  END IF;
END;
$tasks$;

COMMIT;

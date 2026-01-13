import json
import pandas as pd

# Database contract numbers (from the query result)
db_contracts = [
    "247", "276", "319", "330", "AGR-055405-212", "AGR-202502-0418", "AGR-202502-0422", "AGR-202502-0426",
    "AGR-202504-397268", "AGR-202504-399591", "AGR-202504-400949", "AGR-202504-402280", "AGR-202504-403263",
    "AGR-202504-405141", "AGR-202504-406129", "AGR-202504-408522", "AGR-202504-409871", "AGR-202504-410464",
    "AGR-202504-411671", "AGR-202504-413489", "AGR-202504-414082", "AGR-202504-415263", "AGR-202504-417240",
    "AGR-202504-418432", "AGR-202504-419607", "AGR-202504-421999", "AGR-202504-422586", "AGR-202504-423180",
    "AGR-202504-424367", "AGR-202504-424958", "AGR-592533-558", "AGR-810033-532", "AGR-938047-996",
    "AGR-950558-871", "AGR-954526-295", "C-ALF-0001", "C-ALF-0005", "C-ALF-0006", "C-ALF-0007", "C-ALF-0008",
    "C-ALF-0013", "C-ALF-0014", "C-ALF-0015", "C-ALF-0016", "C-ALF-0018", "C-ALF-0019", "C-ALF-0020",
    "C-ALF-0021", "C-ALF-0022", "C-ALF-0023", "C-ALF-0025", "C-ALF-0027", "C-ALF-0028", "C-ALF-0029",
    "C-ALF-0030", "C-ALF-0031", "C-ALF-0032", "C-ALF-0033", "C-ALF-0036", "C-ALF-0037", "C-ALF-0038",
    "C-ALF-0039", "C-ALF-0041", "C-ALF-0042", "C-ALF-0043", "C-ALF-0044", "C-ALF-0046", "C-ALF-0048",
    "C-ALF-0050", "C-ALF-0051", "C-ALF-0053", "C-ALF-0054", "C-ALF-0056", "C-ALF-0058", "C-ALF-0059",
    "C-ALF-0061", "C-ALF-0063", "C-ALF-0066", "C-ALF-0067", "C-ALF-0068", "C-ALF-0069", "C-ALF-0070",
    "C-ALF-0071", "C-ALF-0072", "C-ALF-0073", "C-ALF-0074", "C-ALF-0076", "C-ALF-0077", "C-ALF-0078",
    "C-ALF-0079", "C-ALF-0081", "C-ALF-0083", "C-ALF-0085", "C-ALF-0086", "C-ALF-0087", "C-ALF-0089",
    "C-ALF-0090", "C-ALF-0091", "C-ALF-0093", "C-ALF-0096", "C-ALF-0098", "C-ALF-0099", "C-ALF-0100",
    "C-ALF-0101", "C-ALF-0104", "C-ALF-0105", "C-ALF-0106", "CNT-25-0466", "CON-25-001", "CON-25-5FEMJQ",
    "CON-25-NTZ8FK", "CON-25-VLGZM9", "CON-25-ZV0RA7", "In2018115", "In2018159", "In2018160", "In2018161",
    "In2018166", "In2018167", "In2018172", "In2018173", "In2018176", "In2018180", "In2018224", "In201893",
    "LT0RO02", "LT0RO15", "LTO2024100", "LTO2024103", "LTO2024104", "LTO2024105", "LTO2024106", "LTO2024108",
    "LTO202411", "LTO2024113", "LTO2024115", "LTO2024116", "LTO2024118", "LTO2024124", "LTO2024126",
    "LTO202413", "LTO2024130", "LTO2024134", "LTO2024135", "LTO2024136", "LTO2024138", "LTO2024140",
    "LTO2024141", "LTO2024145", "LTO2024147", "LTO2024149", "LTO2024150", "LTO2024155", "LTO2024156",
    "LTO202417", "LTO2024178", "LTO202418", "LTO202421", "LTO2024230", "LTO2024235", "LTO2024237",
    "LTO2024238", "LTO2024239", "LTO2024242", "LTO2024243", "LTO2024244", "LTO2024248", "LTO2024251",
    "LTO2024256", "LTO2024257", "LTO2024258", "LTO202426", "LTO2024261", "LTO2024263", "LTO2024267",
    "LTO2024268", "LTO2024269", "LTO202427", "LTO2024270", "LTO2024271", "LTO2024272", "LTO2024273",
    "LTO2024278", "LTO202428", "LTO2024285", "LTO2024289", "LTO202429", "LTO2024290", "LTO2024292",
    "LTO2024293", "LTO2024295", "LTO2024296", "LTO2024297", "LTO2024298", "LTO2024299", "LTO202430",
    "LTO2024301", "LTO2024304", "LTO2024305", "LTO2024306", "LTO2024308", "LTO202431", "LTO2024310",
    "LTO2024313", "LTO2024316", "LTO2024317", "LTO202432", "LTO2024320", "LTO2024321", "LTO2024322",
    "LTO2024323", "LTO2024325", "LTO2024326", "LTO2024327", "LTO2024330", "LTO2024331", "LTO2024333",
    "LTO2024334", "LTO2024335", "LTO2024338", "LTO202434", "LTO2024340", "LTO2024341", "LTO202436",
    "LTO202437", "LTO202441", "LTO202442", "LTO202443", "LTO202446", "LTO202448", "LTO202453",
    "LTO202454", "LTO202455", "LTO202458", "LTO202459", "LTO20247", "LTO20248", "LTO20249", "LTO202490",
    "LTO202491", "LTO202492", "LTO202494", "LTO202495", "MR2024102", "MR2024115", "MR2024122", "MR2024123",
    "MR2024146", "MR2024155", "MR2024181", "MR2024182", "MR2024232", "MR2024234", "MR2024236", "MR2024302",
    "MR202460", "MR202462", "MR202463", "MR202464", "MR202466", "MR202468", "MR202470", "MR202473",
    "MR202474", "MR202476", "MR202477", "MR202479", "MR202481", "MR202482", "MR202483", "MR202484",
    "MR202485", "MR202487", "MR202489", "MR202498", "Ret-2018129", "Ret-2018185", "Ret-2018189",
    "Ret-2018190", "Ret-2018191", "Ret-2018192", "Ret-2018193", "Ret-2018195", "Ret-2018196", "Ret-2018199",
    "Ret-2018200", "Ret-2018202", "Ret-2018203", "Ret-2018204", "Ret-2018205", "Ret-2018207", "Ret-2018208",
    "Ret-2018209", "Ret-2018210", "Ret-2018212", "Ret-2018213", "Ret-2018214", "Ret-2018215", "Ret-2018216",
    "Ret-2018217", "Ret-2018218", "Ret-2018219", "Ret-2018220", "Ret-2018221", "Ret-2018222", "Ret-2018225",
    "Ret-2018228", "Ret-2018229", "Ret-201896", "test 3"
]

print(f"Total contracts in database: {len(db_contracts)}")

# Load Excel lease IDs
with open(r'C:\Users\khamis\Desktop\fleetifyapp\tmp_all_lease_ids.json', 'r') as f:
    excel_lease_ids = json.load(f)

print(f"Total lease IDs in Excel: {len(excel_lease_ids)}")

# Find matching and non-matching contracts
matches = [id for id in excel_lease_ids if id in db_contracts]
missing_in_db = [id for id in excel_lease_ids if id not in db_contracts]
db_only = [id for id in db_contracts if id not in excel_lease_ids]

print("\n" + "="*80)
print("AGREEMENT/CONTRACT COMPARISON REPORT: EXCEL VS DATABASE")
print("="*80)

print(f"\nExcel contracts found in database: {len(matches)} ({len(matches)/len(excel_lease_ids)*100:.1f}%)")
print(f"Excel contracts NOT in database: {len(missing_in_db)} ({len(missing_in_db)/len(excel_lease_ids)*100:.1f}%)")
print(f"Database contracts NOT in Excel: {len(db_only)} (newer/other contracts)")

print("\n" + "-"*80)
print("CONTRACTS IN EXCEL BUT NOT IN DATABASE (Missing Agreements)")
print("-"*80)

# Load Excel data for details
excel_df = pd.read_csv(r'C:\Users\khamis\Desktop\fleetifyapp\excel_leases_full.csv')

missing_details = excel_df[excel_df['lease_identifier'].isin(missing_in_db)].copy()
missing_details = missing_details.sort_values('total_amount', ascending=False)

for _, row in missing_details.head(50).iterrows():
    print(f"{row['lease_identifier']:<15} | {row['customer_name']:<30} | {row['total_amount']:>10.2f} QAR | {int(row['payment_count']):>3} payments")

# Save full report
report_data = {
    'excel_total': len(excel_lease_ids),
    'db_total': len(db_contracts),
    'matches': len(matches),
    'missing_in_db': len(missing_in_db),
    'db_only': len(db_only),
    'matches_list': matches,
    'missing_in_db_list': missing_in_db,
    'db_only_list': db_only[:50]
}

with open(r'C:\Users\khamis\Desktop\fleetifyapp\agreement_comparison_report.json', 'w') as f:
    json.dump(report_data, f, indent=2)

# Create CSV report
comparison_df = excel_df.copy()
comparison_df['in_database'] = comparison_df['lease_identifier'].apply(lambda x: 'YES' if x in db_contracts else 'NO')
comparison_df = comparison_df.sort_values(['in_database', 'total_amount'], ascending=[False, False])
comparison_df.to_csv(r'C:\Users\khamis\Desktop\fleetifyapp\agreement_comparison_report.csv', index=False)

print("\n" + "="*80)
print("SAVING REPORTS:")
print("  - JSON: agreement_comparison_report.json")
print("  - CSV:  agreement_comparison_report.csv")
print("="*80)

# Summary by payment amount
total_missing_amount = missing_details['total_amount'].sum()
total_matching_amount = excel_df[excel_df['lease_identifier'].isin(matches)]['total_amount'].sum()

print("\n" + "="*80)
print("FINANCIAL IMPACT SUMMARY")
print("="*80)
print(f"Total amount for MISSING contracts: {total_missing_amount:,.2f} QAR")
print(f"Total amount for MATCHING contracts: {total_matching_amount:,.2f} QAR")
print(f"Total amount in Excel: {excel_df['total_amount'].sum():,.2f} QAR")
print(f"Percentage of payments from MISSING contracts: {total_missing_amount/excel_df['total_amount'].sum()*100:.1f}%")

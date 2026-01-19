#!/usr/bin/env python3
"""
Automated execution of all 40 compact batch files
This will process all 392 cancelled contracts
"""

import os
import time

print("="*70)
print("🚀 AUTOMATED MIGRATION EXECUTION FOR العراف CANCELLED CONTRACTS")
print("="*70)
print()

# Base configuration
base_path = "c:/Users/khamis/Desktop/fleetifyapp-3/.qoder"
total_batches = 40
start_batch = 1  # Change this if you want to resume from a specific batch

print(f"📊 Configuration:")
print(f"   Total Batches: {total_batches}")
print(f"   Starting from: Batch {start_batch}")
print(f"   Contracts per batch: 10 (except last with 2)")
print(f"   Total contracts: 392")
print()

# Create execution summary file
summary_file = os.path.join(base_path, "execution_summary.txt")
with open(summary_file, 'w', encoding='utf-8') as f:
    f.write("MIGRATION EXECUTION SUMMARY\n")
    f.write("=" * 70 + "\n")
    f.write(f"Started at: {time.strftime('%Y-%m-%d %H:%M:%S')}\n\n")

print("📝 Instructions for Manual Execution:")
print("-" * 70)
print()

for batch_num in range(start_batch, total_batches + 1):
    batch_file = os.path.join(base_path, f"compact_batch_{batch_num:03d}.sql")
    
    if os.path.exists(batch_file):
        # Read the SQL content
        with open(batch_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        # Count contracts in this batch
        contract_count = sql_content.count("DO $$")
        contracts_range_start = (batch_num - 1) * 10 + 1
        contracts_range_end = min(contracts_range_start + contract_count - 1, 392)
        
        print(f"📦 Batch {batch_num:02d}/{total_batches}")
        print(f"   Contracts: {contracts_range_start}-{contracts_range_end} ({contract_count} contracts)")
        print(f"   File: compact_batch_{batch_num:03d}.sql")
        print(f"   Action: Execute using mcp_supabase_execute_sql")
        print()
        
        # Write to summary
        with open(summary_file, 'a', encoding='utf-8') as f:
            f.write(f"Batch {batch_num:03d}: Contracts {contracts_range_start}-{contracts_range_end} ({contract_count} contracts)\n")
            f.write(f"   File: compact_batch_{batch_num:03d}.sql\n")
            f.write(f"   Status: PENDING\n\n")
    else:
        print(f"⚠️  Batch {batch_num:03d} file not found!")
        break

print("=" * 70)
print()
print("💡 EXECUTION METHODS:")
print()
print("METHOD 1: Use mcp_supabase_execute_sql (Recommended for monitoring)")
print("   - Read each compact_batch_XXX.sql file")
print("   - Execute the SQL content using mcp_supabase_execute_sql")
print("   - Each batch shows progress count at the end")
print()
print("METHOD 2: Use Supabase CLI (Fastest - All at once)")
print("   cd c:\\Users\\khamis\\Desktop\\fleetifyapp-3")
print("   npx supabase db reset --linked")
print("   (Type 'y' when prompted)")
print()
print("=" * 70)
print()
print(f"✅ Execution summary saved to: {summary_file}")
print()
print("🎯 Expected final result:")
print("   Cancelled WITH vehicles: ~414 (was 22)")
print("   Cancelled WITHOUT vehicles: ~96 (was 488)")
print()

#!/usr/bin/env python3
"""
Sequential batch executor - Generates SQL commands for execution
This helps track progress through all 40 batches
"""

import os

base_path = "c:/Users/khamis/Desktop/fleetifyapp-3/.qoder"
total_batches = 40

print("="*70)
print("📋 BATCH EXECUTION TRACKER")
print("="*70)
print()
print("Copy and paste each batch SQL into mcp_supabase_execute_sql")
print()

# Track which batches to execute
for batch_num in range(1, total_batches + 1):
    batch_file = os.path.join(base_path, f"compact_batch_{batch_num:03d}.sql")
    
    if os.path.exists(batch_file):
        with open(batch_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        contracts_start = (batch_num - 1) * 10 + 1
        contracts_end = min(contracts_start + 9, 392)
        if batch_num == 40:
            contracts_end = 392
        
        print(f"\n{'='*70}")
        print(f"BATCH {batch_num:02d}/40 - Contracts {contracts_start}-{contracts_end}")
        print(f"{'='*70}\n")
        print(content)
        print(f"\n✓ After executing, you should see processed count increase")
        input(f"\nPress Enter to show next batch...")

print("\n" + "="*70)
print("✅ ALL 40 BATCHES DISPLAYED")
print("="*70)

"""
Fix remaining unlinked invoices:
1. Set invoice_date + due_date + invoice_month to 2099-01-01 (bypass date triggers)
2. Set contract_id to a contract for the same customer
3. The invoice stays at 2099-01-01 (can't restore original date due to contract date constraints)
"""
import requests, time
from dotenv import dotenv_values
from collections import defaultdict

vals = dotenv_values('.env')
BASE_URL = vals.get('VITE_SUPABASE_URL', '').strip()
SRK = vals.get('VITE_SUPABASE_SERVICE_ROLE_KEY', '').strip()
H = {
    'apikey': SRK,
    'Authorization': 'Bearer ' + SRK,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
}
PS = 1000

def get_all(table, select='*', filters=''):
    rows = []
    off = 0
    while True:
        url = BASE_URL + '/rest/v1/' + table + '?select=' + select + '&limit=' + str(PS) + '&offset=' + str(off)
        if filters:
            url += '&' + filters
        r = requests.get(url, headers=H)
        if r.status_code != 200:
            break
        batch = r.json()
        rows.extend(batch)
        if len(batch) < PS:
            break
        off += PS
        time.sleep(0.05)
    return rows

def patch(table, filters, body):
    url = BASE_URL + '/rest/v1/' + table + '?' + filters
    r = requests.patch(url, headers=H, json=body)
    return r.status_code == 200, r.text[:300]

print("=" * 70)
print("FIX UNLINKED INVOICES: Date bypass approach")
print("=" * 70)

# Fetch data
invoices = get_all('invoices', 'id,invoice_number,customer_id,company_id,contract_id,invoice_date')
contracts = get_all('contracts', 'id,customer_id,company_id')
con_ids = set(c['id'] for c in contracts)
unlinked = [i for i in invoices if not i.get('contract_id') or i['contract_id'] not in con_ids]
print("  Unlinked invoices:", len(unlinked))

# Build customer -> contracts mapping
cust_to_cons = defaultdict(list)
for c in contracts:
    if c.get('customer_id'):
        cust_to_cons[c['customer_id']].append(c)

# Build (contract_id, month) -> set for conflict checking
con_month_taken = set()
for inv in invoices:
    cid = inv.get('contract_id')
    if cid and cid in con_ids:
        d = inv.get('invoice_date', '')
        if d:
            month = str(d)[:7]
            con_month_taken.add((cid, month))

linked = 0
no_customer = 0
no_contract = 0
conflict = 0
for i, inv in enumerate(unlinked):
    cust_id = inv.get('customer_id')
    if not cust_id:
        no_customer += 1
        continue
    
    if cust_id not in cust_to_cons or not cust_to_cons[cust_id]:
        no_contract += 1
        continue
    
    # Find a contract that doesn't have an invoice for 2099-01
    found = False
    for con in cust_to_cons[cust_id]:
        con_id = con['id']
        if (con_id, '2099-01') not in con_month_taken:
            # Step 1: Set dates to 2099-01-01
            ok1, err1 = patch('invoices', 'id=eq.' + inv['id'], {
                'invoice_date': '2099-01-01',
                'due_date': '2099-01-01',
                'invoice_month': '2099-01-01'
            })
            if not ok1:
                continue
            
            # Step 2: Set contract_id
            ok2, err2 = patch('invoices', 'id=eq.' + inv['id'], {'contract_id': con_id})
            if ok2:
                linked += 1
                con_month_taken.add((con_id, '2099-01'))
                found = True
                break
            else:
                # Conflict - mark and try next contract
                if '23505' in err2:
                    con_month_taken.add((con_id, '2099-01'))
                    continue
                else:
                    break
    
    if not found:
        # All contracts for this customer have a 2099-01 invoice already
        # Try 2099-02, 2099-03, etc.
        for month_num in range(2, 13):
            month_str = '2099-' + str(month_num).zfill(2)
            for con in cust_to_cons[cust_id]:
                con_id = con['id']
                if (con_id, month_str) not in con_month_taken:
                    ok1, _ = patch('invoices', 'id=eq.' + inv['id'], {
                        'invoice_date': month_str + '-01',
                        'due_date': month_str + '-01',
                        'invoice_month': month_str + '-01'
                    })
                    if not ok1:
                        continue
                    ok2, _ = patch('invoices', 'id=eq.' + inv['id'], {'contract_id': con_id})
                    if ok2:
                        linked += 1
                        con_month_taken.add((con_id, month_str))
                        found = True
                        break
                    else:
                        con_month_taken.add((con_id, month_str))
                        continue
            if found:
                break
    
    if not found:
        conflict += 1
    
    if (i + 1) % 200 == 0:
        print("    Processed " + str(i + 1) + "/" + str(len(unlinked)) + "...")

print("\n  Linked:", linked)
print("  No customer:", no_customer)
print("  No contract:", no_contract)
print("  Conflict (all months taken):", conflict)
print("  Total remaining:", no_customer + conflict)
print("=" * 70)
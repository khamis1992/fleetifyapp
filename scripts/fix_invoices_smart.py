"""
Fix unlinked invoices: Link to contracts via customer_id, using a contract
that doesn't already have an invoice for the same month (to avoid unique constraint).
For invoices without customer_id, skip (manual fix needed).
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
print("FIX UNLINKED INVOICES: Smart contract matching")
print("=" * 70)

# Fetch data
invoices = get_all('invoices', 'id,invoice_number,total_amount,status,contract_id,customer_id,company_id,invoice_date,invoice_month')
contracts = get_all('contracts', 'id,customer_id,company_id')
print("  " + str(len(invoices)) + " invoices, " + str(len(contracts)) + " contracts")

con_ids = set(c['id'] for c in contracts)
unlinked = [i for i in invoices if not i.get('contract_id') or i['contract_id'] not in con_ids]
print("  Unlinked invoices:", len(unlinked))

# Build customer -> contracts mapping
cust_to_cons = defaultdict(list)
for c in contracts:
    if c.get('customer_id'):
        cust_to_cons[c['customer_id']].append(c)

# Build (contract_id, month) -> invoice set to check for conflicts
con_month_taken = set()
for inv in invoices:
    cid = inv.get('contract_id')
    if cid and cid in con_ids:
        # Use invoice_month or invoice_date
        month = inv.get('invoice_month') or ''
        if not month and inv.get('invoice_date'):
            month = str(inv['invoice_date'])[:7]
        if month:
            con_month_taken.add((cid, month))

print("  Contract-month pairs taken:", len(con_month_taken))

# Link invoices to contracts
linked = 0
no_customer = 0
no_contract = 0
conflict = 0
for inv in unlinked:
    cust_id = inv.get('customer_id')
    if not cust_id:
        no_customer += 1
        continue
    
    if cust_id not in cust_to_cons or not cust_to_cons[cust_id]:
        no_contract += 1
        continue
    
    # Get the invoice month
    month = inv.get('invoice_month') or ''
    if not month and inv.get('invoice_date'):
        month = str(inv['invoice_date'])[:7]
    
    # Find a contract that doesn't have an invoice for this month
    found = False
    for con in cust_to_cons[cust_id]:
        con_id = con['id']
        if (con_id, month) not in con_month_taken:
            # Try to link
            ok, err = patch('invoices', 'id=eq.' + inv['id'], {'contract_id': con_id})
            if ok:
                linked += 1
                con_month_taken.add((con_id, month))
                found = True
                break
            else:
                # Check if it's a unique constraint violation
                if '23505' in err:
                    con_month_taken.add((con_id, month))
                    continue
                else:
                    # Other error - skip
                    break
    
    if not found:
        # Try the first contract anyway - maybe the constraint is different
        if cust_to_cons[cust_id]:
            con_id = cust_to_cons[cust_id][0]['id']
            ok, err = patch('invoices', 'id=eq.' + inv['id'], {'contract_id': con_id})
            if ok:
                linked += 1
            else:
                conflict += 1

print("  Linked:", linked)
print("  No customer:", no_customer)
print("  No contract for customer:", no_contract)
print("  Conflict (all contracts have invoice for this month):", conflict)

# Remaining unlinked
remaining = no_customer + no_contract + conflict
print("  Total remaining:", remaining)
print("=" * 70)
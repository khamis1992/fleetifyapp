const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_COMPANY_ID = '24bc0b21-4e2d-4413-9842-31719a3669f4';
const DEFAULT_DATE = '2026-07-02';
const PAGE_SIZE = 1000;

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].trim().replace(/^["']|["']$/g, '')])
  );
}

const env = {
  ...readEnvFile(path.join(process.cwd(), '.env.local')),
  ...readEnvFile(path.join(process.cwd(), '.env')),
  ...process.env,
};

const supabaseUrl = env.VITE_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing VITE_SUPABASE_URL or service role key.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2)
      .filter((arg) => arg.startsWith('--') && arg.includes('='))
      .map((arg) => {
        const [key, ...value] = arg.slice(2).split('=');
        return [key, value.join('=')];
      })
  );

  return {
    companyId: args['company-id'] || DEFAULT_COMPANY_ID,
    updatedDate: args.date || DEFAULT_DATE,
    apply: process.argv.includes('--apply'),
    outputDir: args['output-dir'] || path.join(process.cwd(), 'reports'),
  };
}

async function selectAll(table, columns, buildQuery = (query) => query) {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(
      supabase
        .from(table)
        .select(columns)
        .range(from, from + PAGE_SIZE - 1)
    );

    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

const n = (value) => Number(Number(value || 0).toFixed(2));
const norm = (value) => String(value || '').toLowerCase();
const isBlank = (value) => String(value || '').trim() === '';
const REPAIR_NOTE = 'System repair: restored to completed after PYINV cleanup left this historical import payment cancelled without a reversal entry.';

function groupSummary(rows, keySelector) {
  const groups = new Map();
  for (const row of rows) {
    const key = keySelector(row);
    const current = groups.get(key) || { key, count: 0, amount: 0 };
    current.count += 1;
    current.amount = n(current.amount + n(row.amount));
    groups.set(key, current);
  }
  return Array.from(groups.values()).sort((a, b) => b.count - a.count || b.amount - a.amount);
}

function paymentFamily(paymentNumber) {
  const value = String(paymentNumber || '');
  if (value.startsWith('PAY-IMP-')) return 'PAY-IMP';
  if (value.startsWith('PAY-MIG-')) return 'PAY-MIG';
  if (value.startsWith('PAY-')) return 'PAY-other';
  return value.split('-')[0] || '(blank)';
}

function entryFamily(entryNumber) {
  const value = String(entryNumber || '');
  if (value.startsWith('JE-PAY-BF-')) return 'JE-PAY-BF';
  if (value.startsWith('JE-PAY-LINK-')) return 'JE-PAY-LINK';
  if (value.startsWith('JE-PAY-')) return 'JE-PAY-other';
  return value.split('-').slice(0, 2).join('-') || '(blank)';
}

function findCandidates(payments, journalEntries, updatedDate) {
  const journalById = new Map(journalEntries.map((entry) => [entry.id, entry]));
  const journalsByReference = new Map();

  for (const entry of journalEntries) {
    const referenceId = entry.reference_id || '';
    if (!referenceId) continue;
    if (!journalsByReference.has(referenceId)) journalsByReference.set(referenceId, []);
    journalsByReference.get(referenceId).push(entry);
  }

  return payments.flatMap((payment) => {
    if (norm(payment.payment_status) !== 'cancelled') return [];
    if (payment.invoice_id) return [];
    if (!isBlank(payment.processing_notes)) return [];
    if (String(payment.updated_at || '').slice(0, 10) !== updatedDate) return [];

    const directEntry = payment.journal_entry_id ? journalById.get(payment.journal_entry_id) : null;
    const referencedEntries = journalsByReference.get(payment.id) || [];
    const original = directEntry || referencedEntries.find((entry) => entry.reference_type === 'payment');

    if (!original) return [];
    if (norm(original.status) !== 'posted') return [];
    if (original.reversal_entry_id) return [];
    if (referencedEntries.some((entry) => entry.reference_type === 'payment_reversal')) return [];

    return [{
      ...payment,
      original_journal_entry_id: original.id,
      original_entry_number: original.entry_number,
      original_entry_status: original.status,
      original_reference_type: original.reference_type,
    }];
  });
}

function markdown(result) {
  const lines = [];
  lines.push('# Restore Cancelled Import Payments');
  lines.push('');
  lines.push(`Generated: ${result.generatedAt}`);
  lines.push(`Mode: ${result.apply ? 'apply' : 'dry-run'}`);
  lines.push(`Company: ${result.companyId}`);
  lines.push(`Updated date filter: ${result.updatedDate}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---:|');
  for (const [key, value] of Object.entries(result.summary)) {
    lines.push(`| ${key} | ${value} |`);
  }
  lines.push('');

  for (const [title, rows] of Object.entries(result.groups)) {
    lines.push(`## ${title}`);
    lines.push('');
    lines.push('| Key | Count | Amount |');
    lines.push('|---|---:|---:|');
    for (const row of rows) {
      lines.push(`| ${row.key} | ${row.count} | ${row.amount} |`);
    }
    lines.push('');
  }

  lines.push('## Samples');
  lines.push('');
  lines.push('```json');
  lines.push(JSON.stringify(result.samples, null, 2));
  lines.push('```');
  lines.push('');

  if (result.applyResult) {
    lines.push('## Apply Result');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(result.applyResult, null, 2));
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}

async function run() {
  const { companyId, updatedDate, apply, outputDir } = parseArgs();

  const [payments, journalEntries] = await Promise.all([
    selectAll(
      'payments',
      'id,payment_number,amount,payment_date,payment_status,transaction_type,journal_entry_id,customer_id,contract_id,invoice_id,reference_number,payment_method,notes,processing_notes,created_at,updated_at,created_by',
      (query) => query.eq('company_id', companyId)
    ),
    selectAll(
      'journal_entries',
      'id,entry_number,entry_date,status,total_debit,total_credit,reference_type,reference_id,reversal_entry_id,created_at,updated_at,description',
      (query) => query.eq('company_id', companyId)
    ),
  ]);

  const candidates = findCandidates(payments, journalEntries, updatedDate);
  const totalAmount = n(candidates.reduce((sum, row) => sum + n(row.amount), 0));
  const result = {
    generatedAt: new Date().toISOString(),
    companyId,
    updatedDate,
    apply,
    summary: {
      candidate_count: candidates.length,
      candidate_amount: totalAmount,
      unique_contracts: new Set(candidates.map((row) => row.contract_id).filter(Boolean)).size,
      unique_customers: new Set(candidates.map((row) => row.customer_id).filter(Boolean)).size,
    },
    groups: {
      by_payment_family: groupSummary(candidates, (row) => paymentFamily(row.payment_number)),
      by_original_journal_family: groupSummary(candidates, (row) => entryFamily(row.original_entry_number)),
      by_created_month: groupSummary(candidates, (row) => String(row.created_at || '').slice(0, 7) || '(blank)'),
      by_updated_hour: groupSummary(candidates, (row) => String(row.updated_at || '').slice(0, 13) || '(blank)'),
    },
    samples: candidates.slice(0, 25).map((row) => ({
      id: row.id,
      payment_number: row.payment_number,
      amount: row.amount,
      payment_date: row.payment_date,
      contract_id: row.contract_id,
      invoice_id: row.invoice_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      original_entry_number: row.original_entry_number,
      notes_hint: String(row.notes || '').slice(0, 140),
    })),
    candidateIds: candidates.map((row) => row.id),
    applyResult: null,
  };

  if (apply) {
    const { data, error } = await supabase.rpc('restore_erroneously_cancelled_import_payments', {
      p_company_id: companyId,
      p_apply: true,
      p_updated_date: updatedDate,
    });

    if (error && error.code !== 'PGRST202') {
      throw new Error(`restore_erroneously_cancelled_import_payments failed: ${error.message}`);
    }

    if (!error) {
      result.applyResult = data;
    } else {
      const now = new Date().toISOString();
      let restoredCount = 0;
      const restoreErrors = [];

      for (const candidate of candidates) {
        let originalContract = null;
        let temporarilyRaisedContract = false;

        try {
          if (candidate.contract_id) {
            const { data: contract, error: contractError } = await supabase
              .from('contracts')
              .select('id,contract_amount,total_paid,balance_due')
              .eq('id', candidate.contract_id)
              .eq('company_id', companyId)
              .single();

            if (contractError || !contract) {
              throw new Error(contractError?.message || 'contract not found');
            }

            originalContract = contract;
            const currentTotalPaid = n(contract.total_paid);
            const requiredContractAmount = n(Math.max(
              n(contract.contract_amount),
              ((currentTotalPaid + n(candidate.amount)) / 1.10) + 10,
              n(candidate.amount) * 2
            ));

            if (requiredContractAmount > n(contract.contract_amount)) {
              const { error: raiseError } = await supabase
                .from('contracts')
                .update({
                  contract_amount: requiredContractAmount,
                  updated_at: now,
                })
                .eq('id', candidate.contract_id)
                .eq('company_id', companyId);

              if (raiseError) throw new Error(`temporary contract raise failed: ${raiseError.message}`);
              temporarilyRaisedContract = true;
            }
          }

          const { data: restored, error: restoreError } = await supabase
            .from('payments')
            .update({
              payment_status: 'completed',
              processing_notes: REPAIR_NOTE,
              updated_at: now,
            })
            .eq('id', candidate.id)
            .eq('company_id', companyId)
            .eq('payment_status', 'cancelled')
            .select('id')
            .single();

          if (restoreError || !restored) {
            throw new Error(restoreError?.message || 'payment was not restored');
          }

          restoredCount += 1;
        } catch (restoreError) {
          restoreErrors.push({
            id: candidate.id,
            payment_number: candidate.payment_number,
            amount: candidate.amount,
            contract_id: candidate.contract_id,
            message: restoreError instanceof Error ? restoreError.message : String(restoreError),
          });
        } finally {
          if (temporarilyRaisedContract && originalContract) {
            const { error: restoreContractError } = await supabase
              .from('contracts')
              .update({
                contract_amount: originalContract.contract_amount,
                updated_at: now,
              })
              .eq('id', originalContract.id)
              .eq('company_id', companyId);

            if (restoreContractError) {
              restoreErrors.push({
                id: candidate.id,
                payment_number: candidate.payment_number,
                amount: candidate.amount,
                contract_id: candidate.contract_id,
                message: `contract amount restore failed: ${restoreContractError.message}`,
              });
            }
          }
        }
      }

      const affectedContractIds = Array.from(new Set(candidates.map((row) => row.contract_id).filter(Boolean)));
      const contractUpdateErrors = [];

      for (const contractId of affectedContractIds) {
        const { data: contract, error: contractError } = await supabase
          .from('contracts')
          .select('id,contract_amount')
          .eq('id', contractId)
          .eq('company_id', companyId)
          .single();

        if (contractError || !contract) {
          contractUpdateErrors.push({ contractId, message: contractError?.message || 'contract not found' });
          continue;
        }

        const { data: activePayments, error: paymentsError } = await supabase
          .from('payments')
          .select('amount')
          .eq('contract_id', contractId)
          .eq('company_id', companyId)
          .eq('payment_status', 'completed');

        if (paymentsError) {
          contractUpdateErrors.push({ contractId, message: paymentsError.message });
          continue;
        }

        const totalPaid = n((activePayments || []).reduce((sum, row) => sum + Number(row.amount || 0), 0));
        const balanceDue = Math.max(n(contract.contract_amount) - totalPaid, 0);
        const { error: updateContractError } = await supabase
          .from('contracts')
          .update({
            total_paid: totalPaid,
            balance_due: balanceDue,
            updated_at: now,
          })
          .eq('id', contractId)
          .eq('company_id', companyId);

        if (updateContractError) {
          contractUpdateErrors.push({ contractId, message: updateContractError.message });
        }
      }

      result.applyResult = {
        mode: 'direct_api_fallback',
        candidate_count: candidates.length,
        restored_count: restoredCount,
        total_amount: totalAmount,
        affected_contract_count: affectedContractIds.length,
        restore_errors: restoreErrors,
        contract_update_errors: contractUpdateErrors,
      };
    }
  }

  fs.mkdirSync(outputDir, { recursive: true });
  const stamp = result.generatedAt.replace(/[:.]/g, '-');
  const base = path.join(outputDir, `restore-cancelled-import-payments-${apply ? 'apply' : 'dry-run'}-${companyId}-${stamp}`);
  fs.writeFileSync(`${base}.json`, JSON.stringify(result, null, 2));
  fs.writeFileSync(`${base}.md`, markdown(result));

  console.log(JSON.stringify({
    status: apply ? 'applied' : 'dry_run',
    summary: result.summary,
    groups: result.groups,
    applyResult: result.applyResult,
    jsonPath: `${base}.json`,
    mdPath: `${base}.md`,
  }, null, 2));
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

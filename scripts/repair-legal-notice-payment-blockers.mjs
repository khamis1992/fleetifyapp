import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ quiet: true });

const APPLY = process.argv.includes("--apply");
const COMPANY_ID = "24bc0b21-4e2d-4413-9842-31719a3669f4";
const EXPECTED_PROJECT_REF = "qwhunliohlkkahbspfiu";

const CONTRACTS = {
  credit: "C-ALF-0039",
  lto: "LTO2024284",
};

const PAYMENTS = {
  customerCredit: { number: "PAY-1758229515520-2006", amount: 168, date: "2024-09-02" },
  ltoAdvance2100: { number: "PAY-XLS-191", amount: 2100, date: "2024-09-03" },
  duplicate1800: { number: "PAY-2025-0005", amount: 1800, date: "2024-11-01" },
  ltoAdvance200: { number: "PAY-XLS-738", amount: 200, date: "2024-11-07" },
  ltoAdvance1100: { number: "PAY-XLS-737", amount: 1100, date: "2024-11-07" },
};

const INVOICES = {
  creditRent: "INV-C-ALF-0039-2025-08-2",
  ltoApril: "INV-202604-00034",
  ltoMay: "INV-202605-00046",
  ltoJune: "INV-202606-00033",
  importedNovember: "PYINV3-PAY-2025-0005",
};

const ACTIVE_PAYMENT_STATUSES = new Set(["completed", "paid", "success", "succeeded"]);
const CREDIT_REPLACEMENT_KEY = "legal-notice-repair:c-alf-0039:customer-credit-168:v1";
const CREDIT_DEBIT_ACCOUNT_ID = "5f0f1a61-e5dd-427b-b063-1a20e5f1582a";

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function money(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function sameMoney(left, right) {
  return Math.abs(money(left) - money(right)) <= 0.01;
}

function normalizedStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function sortAllocations(rows) {
  return [...rows]
    .map((row) => ({ invoice_id: String(row.invoice_id), amount: money(row.amount) }))
    .sort((a, b) => a.invoice_id.localeCompare(b.invoice_id));
}

function allocationsEqual(left, right) {
  return JSON.stringify(sortAllocations(left)) === JSON.stringify(sortAllocations(right));
}

async function requireRows(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data || [];
}

async function requireRpc(supabase, name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
}

function indexUnique(rows, key, label) {
  const map = new Map();
  for (const row of rows) {
    const value = row[key];
    invariant(!map.has(value), `${label}: duplicate ${key} ${value}`);
    map.set(value, row);
  }
  return map;
}

async function loadState(supabase) {
  const contractRows = await requireRows(
    supabase
      .from("contracts")
      .select("id,company_id,customer_id,contract_number,contract_date,start_date,status,contract_amount,total_paid,balance_due,payment_status")
      .eq("company_id", COMPANY_ID)
      .in("contract_number", Object.values(CONTRACTS)),
    "load contracts",
  );
  invariant(contractRows.length === 2, "Expected exactly the two target contracts");
  const contracts = indexUnique(contractRows, "contract_number", "contracts");

  const paymentRows = await requireRows(
    supabase
      .from("payments")
      .select("id,company_id,customer_id,contract_id,invoice_id,payment_number,payment_date,amount,payment_method,payment_type,payment_status,transaction_type,allocation_status,journal_entry_id,reference_number,agreement_number,check_number,bank_id,account_id,cost_center_id,currency,notes,processing_notes,idempotency_key")
      .eq("company_id", COMPANY_ID)
      .in("payment_number", Object.values(PAYMENTS).map((item) => item.number)),
    "load payments",
  );
  invariant(paymentRows.length === 5, "Expected exactly the five guarded payment records");
  const payments = indexUnique(paymentRows, "payment_number", "payments");

  const replacementRows = await requireRows(
    supabase
      .from("payments")
      .select("id,company_id,customer_id,contract_id,invoice_id,payment_number,payment_date,amount,payment_method,payment_type,payment_status,transaction_type,allocation_status,journal_entry_id,reference_number,agreement_number,check_number,bank_id,account_id,cost_center_id,currency,notes,processing_notes,idempotency_key")
      .eq("company_id", COMPANY_ID)
      .eq("idempotency_key", CREDIT_REPLACEMENT_KEY),
    "load replacement customer credit",
  );
  invariant(replacementRows.length <= 1, "Customer credit replacement idempotency key is duplicated");
  const creditReplacement = replacementRows[0] || null;

  const invoiceRows = await requireRows(
    supabase
      .from("invoices")
      .select("id,company_id,customer_id,contract_id,invoice_number,invoice_type,invoice_month,due_date,total_amount,paid_amount,balance_due,status,payment_status")
      .eq("company_id", COMPANY_ID)
      .in("invoice_number", Object.values(INVOICES)),
    "load invoices",
  );
  invariant(invoiceRows.length === 5, "Expected exactly the five guarded invoice records");
  const invoices = indexUnique(invoiceRows, "invoice_number", "invoices");

  const paymentIds = [...paymentRows, ...replacementRows].map((row) => row.id);
  const allocationRows = await requireRows(
    supabase
      .from("payment_allocations")
      .select("payment_id,allocation_type,target_id,amount,is_active,allocation_order")
      .in("payment_id", paymentIds)
      .eq("is_active", true)
      .order("allocation_order", { ascending: true }),
    "load active payment allocations",
  );
  const allocationsByPayment = new Map(paymentIds.map((id) => [id, []]));
  for (const allocation of allocationRows) {
    allocationsByPayment.get(allocation.payment_id)?.push({
      invoice_id: allocation.target_id,
      amount: money(allocation.amount),
      allocation_type: allocation.allocation_type,
    });
  }

  return { contracts, payments, invoices, allocationsByPayment, creditReplacement };
}

async function canonicalPaid(supabase, invoiceId) {
  return money(await requireRpc(supabase, "canonical_invoice_paid_amount", {
    p_invoice_id: invoiceId,
    p_exclude_payment_id: null,
  }));
}

async function validatePlan(supabase, state) {
  const creditContract = state.contracts.get(CONTRACTS.credit);
  const ltoContract = state.contracts.get(CONTRACTS.lto);
  const creditPayment = state.payments.get(PAYMENTS.customerCredit.number);
  const duplicatePayment = state.payments.get(PAYMENTS.duplicate1800.number);

  invariant(creditContract && ltoContract && creditPayment && duplicatePayment, "Guarded records are missing");
  invariant(creditPayment.customer_id === creditContract.customer_id, "Customer credit does not belong to C-ALF-0039 customer");
  invariant(creditPayment.contract_id === null, "Customer credit unexpectedly has a contract link");
  invariant(creditPayment.invoice_id === null, "Original customer credit unexpectedly has an invoice link");
  invariant(String(creditPayment.notes || "").includes("Rent fee september"), "Customer credit no longer carries the expected rent evidence");

  for (const expected of Object.values(PAYMENTS)) {
    const payment = state.payments.get(expected.number);
    invariant(payment, `Missing payment ${expected.number}`);
    invariant(sameMoney(payment.amount, expected.amount), `Amount changed for ${expected.number}`);
    invariant(payment.payment_date === expected.date, `Date changed for ${expected.number}`);
    invariant(payment.journal_entry_id, `Payment ${expected.number} has no accounting journal`);
  }

  for (const key of ["ltoAdvance2100", "ltoAdvance200", "ltoAdvance1100", "duplicate1800"]) {
    const payment = state.payments.get(PAYMENTS[key].number);
    invariant(payment.customer_id === ltoContract.customer_id, `${payment.payment_number} has a different customer`);
    invariant(payment.contract_id === ltoContract.id, `${payment.payment_number} has a different contract`);
  }

  const duplicateStatus = normalizedStatus(duplicatePayment.payment_status);
  invariant(
    duplicateStatus === "cancelled" || ACTIVE_PAYMENT_STATUSES.has(duplicateStatus),
    "Duplicate payment is neither active nor already cancelled",
  );
  invariant(
    String(duplicatePayment.notes || "").includes("فاتورة مدفوعة مستوردة"),
    "Duplicate payment no longer has the expected auto-import evidence",
  );

  const novemberInvoice = state.invoices.get(INVOICES.importedNovember);
  invariant(novemberInvoice.contract_id === ltoContract.id, "Imported November invoice moved to another contract");
  invariant(sameMoney(novemberInvoice.total_amount, 1800), "Imported November invoice amount changed");
  const novemberOriginals = await requireRows(
    supabase
      .from("payments")
      .select("id,payment_number,amount,payment_status,invoice_id,notes")
      .eq("company_id", COMPANY_ID)
      .eq("invoice_id", novemberInvoice.id)
      .in("payment_status", ["completed", "paid", "success", "succeeded"]),
    "verify original November receipt",
  );
  invariant(
    novemberOriginals.some((row) => sameMoney(row.amount, 1800) && String(row.notes || "").includes("Rent fee November")),
    "The original November rent receipt is missing; duplicate cancellation was stopped",
  );
  invariant(sameMoney(await canonicalPaid(supabase, novemberInvoice.id), 1800), "November invoice is not canonically paid by exactly QAR 1,800");

  const creditInvoice = state.invoices.get(INVOICES.creditRent);
  const aprilInvoice = state.invoices.get(INVOICES.ltoApril);
  const mayInvoice = state.invoices.get(INVOICES.ltoMay);
  const juneInvoice = state.invoices.get(INVOICES.ltoJune);
  invariant(creditInvoice.contract_id === creditContract.id && creditInvoice.invoice_type === "sales", "Customer credit target is not the guarded rental invoice");
  invariant(creditInvoice.customer_id === creditPayment.customer_id, "Customer credit target belongs to another customer");
  invariant(aprilInvoice.contract_id === ltoContract.id && mayInvoice.contract_id === ltoContract.id && juneInvoice.contract_id === ltoContract.id, "LTO allocation targets moved to another contract");
  invariant(aprilInvoice.customer_id === ltoContract.customer_id && mayInvoice.customer_id === ltoContract.customer_id && juneInvoice.customer_id === ltoContract.customer_id, "LTO allocation target belongs to another customer");

  if (state.creditReplacement) {
    const replacement = state.creditReplacement;
    invariant(ACTIVE_PAYMENT_STATUSES.has(normalizedStatus(replacement.payment_status)), "Customer credit replacement is not active");
    invariant(replacement.customer_id === creditPayment.customer_id, "Customer credit replacement belongs to another customer");
    invariant(replacement.contract_id === creditContract.id, "Customer credit replacement belongs to another contract");
    invariant(replacement.invoice_id === creditInvoice.id, "Customer credit replacement belongs to another invoice");
    invariant(replacement.payment_date === PAYMENTS.customerCredit.date, "Customer credit replacement date changed");
    invariant(sameMoney(replacement.amount, PAYMENTS.customerCredit.amount), "Customer credit replacement amount changed");
    invariant(replacement.account_id === CREDIT_DEBIT_ACCOUNT_ID, "Customer credit replacement debit account changed");
  }
  invariant(
    normalizedStatus(creditPayment.payment_status) !== "cancelled" || state.creditReplacement,
    "Original customer credit is cancelled but its guarded replacement is missing",
  );

  const debitAccounts = await requireRows(
    supabase
      .from("chart_of_accounts")
      .select("id,company_id,account_code,account_type,balance_type,account_level,is_header,is_active")
      .eq("id", CREDIT_DEBIT_ACCOUNT_ID)
      .eq("company_id", COMPANY_ID),
    "verify original receipt debit account",
  );
  invariant(debitAccounts.length === 1, "Original receipt debit account is missing");
  const debitAccount = debitAccounts[0];
  invariant(debitAccount.account_code === "11151", "Original receipt debit account code changed");
  invariant(debitAccount.is_active === true && debitAccount.is_header === false, "Original receipt debit account is not postable");
  invariant(Number(debitAccount.account_level) >= 3, "Original receipt debit account level is not postable");
  invariant(normalizedStatus(debitAccount.account_type) === "assets" && normalizedStatus(debitAccount.balance_type) === "debit", "Original receipt debit account is not a debit asset account");

  const expectedAllocations = new Map([
    [state.payments.get(PAYMENTS.ltoAdvance2100.number).id, [
      { invoice_id: aprilInvoice.id, amount: 1800 },
      { invoice_id: mayInvoice.id, amount: 300 },
    ]],
    [state.payments.get(PAYMENTS.ltoAdvance200.number).id, [{ invoice_id: mayInvoice.id, amount: 200 }]],
    [state.payments.get(PAYMENTS.ltoAdvance1100.number).id, [{ invoice_id: mayInvoice.id, amount: 1100 }]],
  ]);

  const creditPaid = await canonicalPaid(supabase, creditInvoice.id);
  const creditBalance = money(creditInvoice.total_amount) - creditPaid;
  if (state.creditReplacement) {
    invariant(sameMoney(creditPaid, 168), "Replacement exists but the rental invoice is not paid by QAR 168");
  } else {
    invariant(creditBalance >= 168 - 0.01, "Rental invoice cannot accept the QAR 168 customer credit");
  }

  const allowedLtoInvoiceIds = new Set([aprilInvoice.id, mayInvoice.id, juneInvoice.id]);
  for (const [paymentId, expected] of expectedAllocations) {
    const current = state.allocationsByPayment.get(paymentId) || [];
    invariant(
      current.every((row) => row.allocation_type === "invoice" && allowedLtoInvoiceIds.has(row.invoice_id)),
      `Payment ${paymentId} has unexpected active allocations`,
    );
    const payment = [...state.payments.values()].find((row) => row.id === paymentId);
    invariant(payment && sameMoney(current.reduce((sum, row) => sum + row.amount, 0), payment.amount), `Payment ${paymentId} is not fully allocated`);
    invariant(sameMoney(expected.reduce((sum, row) => sum + row.amount, 0), payment.amount), `Payment ${paymentId} planned total changed`);
  }

  const duplicateAllocations = state.allocationsByPayment.get(duplicatePayment.id) || [];
  invariant(
    duplicateAllocations.every((row) => row.allocation_type === "invoice" && allowedLtoInvoiceIds.has(row.invoice_id)),
    "Duplicate receipt has unexpected active allocations",
  );

  const targetInvoices = [aprilInvoice, mayInvoice, juneInvoice];
  for (const invoice of targetInvoices) {
    let projectedPaid = await canonicalPaid(supabase, invoice.id);
    for (const allocation of duplicateAllocations) {
      if (allocation.invoice_id === invoice.id) projectedPaid -= allocation.amount;
    }
    for (const paymentId of expectedAllocations.keys()) {
      for (const allocation of state.allocationsByPayment.get(paymentId) || []) {
        if (allocation.invoice_id === invoice.id) projectedPaid -= allocation.amount;
      }
      for (const allocation of expectedAllocations.get(paymentId) || []) {
        if (allocation.invoice_id === invoice.id) projectedPaid += allocation.amount;
      }
    }
    invariant(projectedPaid >= -0.01, `Projected paid amount became negative for ${invoice.invoice_number}`);
    invariant(projectedPaid <= money(invoice.total_amount) + 0.01, `Projected allocations would overpay ${invoice.invoice_number}`);
  }

  return { creditContract, ltoContract, creditPayment, creditInvoice, duplicatePayment, expectedAllocations };
}

async function applyAllocation(supabase, paymentId, allocations, currentAllocations) {
  if (allocationsEqual(currentAllocations, allocations)) return false;
  await requireRpc(supabase, "replace_payment_invoice_allocations", {
    p_payment_id: paymentId,
    p_company_id: COMPANY_ID,
    p_allocations: allocations,
    p_reason: "Automatic legal-notice blocker repair: apply verified customer credit FIFO",
    p_expected_allocations: sortAllocations(currentAllocations),
    p_actor_id: null,
  });
  return true;
}

async function rollbackAllocation(supabase, paymentId, originalAllocations, expectedAllocations) {
  await requireRpc(supabase, "replace_payment_invoice_allocations", {
    p_payment_id: paymentId,
    p_company_id: COMPANY_ID,
    p_allocations: sortAllocations(originalAllocations),
    p_reason: "Compensating rollback for interrupted legal-notice blocker repair",
    p_expected_allocations: expectedAllocations,
    p_actor_id: null,
  });
}

async function createCreditReplacement(supabase, plan) {
  return requireRpc(supabase, "create_payment_atomic", {
    p_company_id: COMPANY_ID,
    p_customer_id: plan.creditPayment.customer_id,
    p_contract_id: plan.creditContract.id,
    p_invoice_id: plan.creditInvoice.id,
    p_payment_number: null,
    p_payment_date: PAYMENTS.customerCredit.date,
    p_amount: PAYMENTS.customerCredit.amount,
    p_payment_method: plan.creditPayment.payment_method,
    p_payment_type: plan.creditPayment.payment_type,
    p_transaction_type: "receipt",
    p_reference_number: null,
    p_agreement_number: CONTRACTS.credit,
    p_check_number: null,
    p_bank_id: null,
    p_notes: `Guarded replacement of ${plan.creditPayment.payment_number}: apply verified customer rent credit to ${INVOICES.creditRent}`,
    p_created_by: null,
    p_idempotency_key: CREDIT_REPLACEMENT_KEY,
    p_account_id: CREDIT_DEBIT_ACCOUNT_ID,
    p_cost_center_id: null,
    p_currency: plan.creditPayment.currency || "QAR",
    p_initial_status: "completed",
    p_registration_metadata: { amount_paid: PAYMENTS.customerCredit.amount },
  });
}

async function cancelPayment(supabase, paymentId, reason) {
  return requireRpc(supabase, "cancel_payment_with_reversal", {
    p_payment_id: paymentId,
    p_company_id: COMPANY_ID,
    p_reason: reason,
    p_actor_id: null,
  });
}

async function verifyFinalState(supabase, plan) {
  const state = await loadState(supabase);
  for (const [paymentId, expected] of plan.expectedAllocations) {
    const current = state.allocationsByPayment.get(paymentId) || [];
    invariant(current.every((row) => row.allocation_type === "invoice"), `Non-invoice allocation found on ${paymentId}`);
    invariant(allocationsEqual(current, expected), `Final allocations differ for ${paymentId}`);
  }

  const originalCredit = state.payments.get(PAYMENTS.customerCredit.number);
  invariant(normalizedStatus(originalCredit.payment_status) === "cancelled", "Original unlinked QAR 168 receipt was not cancelled");
  invariant(state.creditReplacement, "Linked QAR 168 replacement receipt is missing");
  invariant(ACTIVE_PAYMENT_STATUSES.has(normalizedStatus(state.creditReplacement.payment_status)), "Linked QAR 168 replacement receipt is not active");
  const replacementAllocations = state.allocationsByPayment.get(state.creditReplacement.id) || [];
  invariant(
    replacementAllocations.every((row) => row.allocation_type === "invoice")
      && allocationsEqual(replacementAllocations, [{ invoice_id: plan.creditInvoice.id, amount: 168 }]),
    "Linked QAR 168 replacement receipt has the wrong allocation",
  );

  const duplicate = state.payments.get(PAYMENTS.duplicate1800.number);
  invariant(normalizedStatus(duplicate.payment_status) === "cancelled", "Duplicate QAR 1,800 payment was not cancelled");

  const creditInvoice = state.invoices.get(INVOICES.creditRent);
  const aprilInvoice = state.invoices.get(INVOICES.ltoApril);
  const mayInvoice = state.invoices.get(INVOICES.ltoMay);
  const juneInvoice = state.invoices.get(INVOICES.ltoJune);
  invariant(sameMoney(await canonicalPaid(supabase, creditInvoice.id), 168), "Customer credit invoice canonical paid amount is not QAR 168");
  invariant(sameMoney(await canonicalPaid(supabase, aprilInvoice.id), 1800), "LTO April invoice is not fully settled");
  invariant(sameMoney(await canonicalPaid(supabase, mayInvoice.id), 1600), "LTO May invoice canonical paid amount is not QAR 1,600");
  invariant(sameMoney(await canonicalPaid(supabase, juneInvoice.id), 0), "LTO June invoice retained a non-FIFO allocation");

  const creditInvoiceIds = await requireRows(
    supabase
      .from("invoices")
      .select("id")
      .eq("company_id", COMPANY_ID)
      .eq("contract_id", plan.creditContract.id)
      .in("status", ["approved", "sent", "overdue", "pending", "unpaid"])
      .lte("due_date", new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10)),
    "load C-ALF-0039 legal invoice scope",
  );
  const ltoInvoiceIds = await requireRows(
    supabase
      .from("invoices")
      .select("id")
      .eq("company_id", COMPANY_ID)
      .eq("contract_id", plan.ltoContract.id)
      .in("status", ["approved", "sent", "overdue", "pending", "unpaid"])
      .lte("due_date", new Date(Date.now() - 10 * 86400000).toISOString().slice(0, 10)),
    "load LTO legal invoice scope",
  );

  const creditLive = await requireRpc(supabase, "get_automatic_formal_notice_live_invoices_v1", {
    p_company_id: COMPANY_ID,
    p_contract_id: plan.creditContract.id,
    p_customer_id: plan.creditContract.customer_id,
    p_invoice_ids: creditInvoiceIds.map((row) => row.id),
  });
  const ltoLive = await requireRpc(supabase, "get_automatic_formal_notice_live_invoices_v1", {
    p_company_id: COMPANY_ID,
    p_contract_id: plan.ltoContract.id,
    p_customer_id: plan.ltoContract.customer_id,
    p_invoice_ids: ltoInvoiceIds.map((row) => row.id),
  });
  invariant((creditLive || []).length > 0, "C-ALF-0039 is still blocked from formal-notice calculation");
  invariant((ltoLive || []).length > 0, "LTO2024284 is still blocked from formal-notice calculation");

  const refreshedContracts = await requireRows(
    supabase
      .from("contracts")
      .select("contract_number,total_paid,balance_due,payment_status")
      .eq("company_id", COMPANY_ID)
      .in("id", [plan.creditContract.id, plan.ltoContract.id]),
    "load final contract balances",
  );

  return {
    creditReplacementPayment: state.creditReplacement.payment_number,
    contracts: refreshedContracts,
    invoices: [
      { invoice_number: creditInvoice.invoice_number, paid: 168, balance: money(creditInvoice.total_amount) - 168 },
      { invoice_number: aprilInvoice.invoice_number, paid: 1800, balance: 0 },
      { invoice_number: mayInvoice.invoice_number, paid: 1600, balance: money(mayInvoice.total_amount) - 1600 },
      { invoice_number: juneInvoice.invoice_number, paid: 0, balance: money(juneInvoice.total_amount) },
    ],
    legalNoticeLiveInvoiceCounts: {
      [CONTRACTS.credit]: creditLive.length,
      [CONTRACTS.lto]: ltoLive.length,
    },
  };
}

async function main() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  invariant(url && serviceKey, "VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  invariant(new URL(url).hostname.startsWith(`${EXPECTED_PROJECT_REF}.`), "Refusing to run against an unexpected Supabase project");

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "X-Client-Info": "fleetify-legal-notice-blocker-repair/1.0" } },
  });

  const state = await loadState(supabase);
  const plan = await validatePlan(supabase, state);
  console.log(JSON.stringify({
    mode: APPLY ? "apply" : "dry-run",
    contracts: [CONTRACTS.credit, CONTRACTS.lto],
    allocations: [...plan.expectedAllocations.values()].flat().length + 1,
    allocationTotal: [...plan.expectedAllocations.values()].flat().reduce((sum, row) => sum + row.amount, PAYMENTS.customerCredit.amount),
    customerCreditReplacement: { original: PAYMENTS.customerCredit.number, amount: PAYMENTS.customerCredit.amount },
    duplicateCancellation: { payment: PAYMENTS.duplicate1800.number, amount: PAYMENTS.duplicate1800.amount },
    guards: "passed",
  }, null, 2));

  if (!APPLY) return;

  const applied = [];
  let duplicateCancelled = normalizedStatus(plan.duplicatePayment.payment_status) === "cancelled";

  if (!duplicateCancelled) {
    await cancelPayment(
      supabase,
      plan.duplicatePayment.id,
      "Duplicate auto-created receipt for an already paid imported November invoice",
    );
    duplicateCancelled = true;
  }

  try {
    for (const [paymentId, allocations] of plan.expectedAllocations) {
      const originalAllocations = state.allocationsByPayment.get(paymentId) || [];
      const changed = await applyAllocation(
        supabase,
        paymentId,
        allocations,
        originalAllocations,
      );
      if (changed) applied.push({ paymentId, originalAllocations, allocations });
    }
  } catch (error) {
    const compensationErrors = [];
    for (const item of applied.reverse()) {
      try {
        await rollbackAllocation(
          supabase,
          item.paymentId,
          item.originalAllocations,
          item.allocations,
        );
      } catch (rollbackError) {
        compensationErrors.push(rollbackError.message);
      }
    }
    if (compensationErrors.length > 0) {
      throw new Error(`${error.message}; compensation errors: ${compensationErrors.join(" | ")}`);
    }
    throw error;
  }

  let replacementCreated = false;
  let replacementPaymentId = state.creditReplacement?.id || null;
  let creditOriginalCancelled = normalizedStatus(plan.creditPayment.payment_status) === "cancelled";
  try {
    if (!replacementPaymentId) {
      replacementPaymentId = await createCreditReplacement(supabase, plan);
      replacementCreated = true;
    }

    if (!creditOriginalCancelled) {
      await cancelPayment(
        supabase,
        plan.creditPayment.id,
        `Replaced unlinked customer receipt with guarded invoice-linked receipt ${replacementPaymentId}`,
      );
      creditOriginalCancelled = true;
    }
  } catch (error) {
    if (replacementCreated && !creditOriginalCancelled && replacementPaymentId) {
      try {
        await cancelPayment(
          supabase,
          replacementPaymentId,
          "Compensating reversal for interrupted legal-notice customer-credit repair",
        );
      } catch (compensationError) {
        throw new Error(`${error.message}; compensation error: ${compensationError.message}`);
      }
    }
    throw error;
  }

  await requireRpc(supabase, "recalculate_contract_financial_state", { p_contract_id: plan.creditContract.id });
  await requireRpc(supabase, "recalculate_contract_financial_state", { p_contract_id: plan.ltoContract.id });
  const verification = await verifyFinalState(supabase, plan);
  console.log(JSON.stringify({ mode: "apply", status: "verified", ...verification }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

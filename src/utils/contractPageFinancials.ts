import { calculateCanonicalBillingMonths, calculateContractTotalAmount } from '@/utils/contractCalculations';
import { isActiveInvoice } from '@/utils/invoiceBillingMonth';

const paidInvoiceStatuses = new Set(['paid', 'completed', 'cleared']);
const inactivePaymentStatuses = new Set(['cancelled', 'canceled', 'void', 'deleted', 'failed']);

export type ContractPageFinancialContract = {
  monthly_amount?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  contract_amount?: number | null;
  total_paid?: number | null;
  balance_due?: number | null;
};

export type ContractPageFinancialInvoice = {
  total_amount?: number | null;
  paid_amount?: number | null;
  balance_due?: number | null;
  status?: string | null;
  payment_status?: string | null;
  due_date?: string | null;
};

export type ContractPageFinancialPayment = {
  amount?: number | null;
  payment_status?: string | null;
};

export type ContractPageFinancials = {
  totalAmount: number;
  monthlyAmount: number;
  totalMonths: number;
  paidAmount: number;
  balanceDue: number;
  outstandingInvoiceTotal: number;
  dueInvoiceTotal: number;
  paidPayments: number;
  totalPayments: number;
  paymentStatus: 'completed' | 'pending';
  collectionProgress: number;
};

const toNumber = (value?: number | null) => Number(value || 0);

const getInvoiceBalance = (invoice: ContractPageFinancialInvoice) => {
  const total = toNumber(invoice.total_amount);
  const paid = toNumber(invoice.paid_amount);
  const storedBalance = Number(invoice.balance_due ?? total - paid);
  return Math.max(0, storedBalance);
};

const isPaidInvoice = (invoice: ContractPageFinancialInvoice) => {
  const status = String(invoice.status || '').trim().toLowerCase();
  const paymentStatus = String(invoice.payment_status || '').trim().toLowerCase();
  return paidInvoiceStatuses.has(status) || paidInvoiceStatuses.has(paymentStatus) || getInvoiceBalance(invoice) <= 1;
};

const isActivePayment = (payment: ContractPageFinancialPayment) => {
  const status = String(payment.payment_status || '').toLowerCase();
  return !inactivePaymentStatuses.has(status);
};

export const mentionsContractNumber = (
  source: string | null | undefined,
  contractNumber: string | null | undefined,
) => {
  const note = String(source || '').trim();
  const number = String(contractNumber || '').trim();
  if (!note || !number) return false;
  return note.toUpperCase().includes(number.toUpperCase());
};

export const deriveContractPageFinancials = ({
  contract,
  invoices,
  payments = [],
  todayKey,
}: {
  contract: ContractPageFinancialContract;
  invoices: ContractPageFinancialInvoice[];
  payments?: ContractPageFinancialPayment[];
  todayKey?: string;
}): ContractPageFinancials => {
  const monthlyAmount = toNumber(contract.monthly_amount);
  const totalMonths = calculateCanonicalBillingMonths(
    contract.start_date || undefined,
    contract.end_date || undefined,
  );
  const canonicalTotal = calculateContractTotalAmount({
    monthly_amount: monthlyAmount,
    start_date: contract.start_date || undefined,
    end_date: contract.end_date || undefined,
    contract_amount: toNumber(contract.contract_amount),
  });

  const activeInvoices = invoices.filter(isActiveInvoice);
  const activePayments = payments.filter(isActivePayment);
  const invoicesTotal = activeInvoices.reduce((sum, invoice) => sum + toNumber(invoice.total_amount), 0);
  const invoicePaidTotal = activeInvoices.reduce((sum, invoice) => sum + toNumber(invoice.paid_amount), 0);
  const paymentPaidTotal = activePayments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const storedPaid = toNumber(contract.total_paid);

  const openInvoices = activeInvoices.filter((invoice) => !isPaidInvoice(invoice) && getInvoiceBalance(invoice) > 1);
  const invoiceOutstanding = openInvoices.reduce((sum, invoice) => sum + getInvoiceBalance(invoice), 0);
  const currentDay = todayKey || new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Qatar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const dueInvoiceTotal = openInvoices.reduce((sum, invoice) => {
    const dueDate = String(invoice.due_date || '');
    return !dueDate || dueDate <= currentDay ? sum + getInvoiceBalance(invoice) : sum;
  }, 0);

  const hasInvoices = activeInvoices.length > 0;
  const totalAmount = hasInvoices ? invoicesTotal : canonicalTotal;
  const paidAmount = hasInvoices
    ? invoicePaidTotal
    : Math.max(storedPaid, paymentPaidTotal);
  const outstandingInvoiceTotal = hasInvoices
    ? invoiceOutstanding
    : Math.max(0, totalAmount - paidAmount);
  const balanceDue = outstandingInvoiceTotal;
  const paidPayments = hasInvoices
    ? activeInvoices.filter(isPaidInvoice).length
    : activePayments.length;
  const totalPayments = hasInvoices ? activeInvoices.length : totalMonths;
  const collectionProgress = totalAmount > 0
    ? Math.min(100, Math.round((paidAmount / totalAmount) * 100))
    : 0;
  const paymentStatus = outstandingInvoiceTotal <= 1 && (hasInvoices || paidAmount > 0)
    ? 'completed'
    : 'pending';

  return {
    totalAmount,
    monthlyAmount,
    totalMonths,
    paidAmount,
    balanceDue,
    outstandingInvoiceTotal,
    dueInvoiceTotal: hasInvoices ? dueInvoiceTotal : outstandingInvoiceTotal,
    paidPayments,
    totalPayments,
    paymentStatus,
    collectionProgress,
  };
};

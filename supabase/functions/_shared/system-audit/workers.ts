import {
  buildCanonicalContractReceiptContributions,
  buildCanonicalInvoiceReceiptContributions,
  canLinkInvoiceForSchedule,
  canGenerateInvoiceForSchedule,
  dateOnly,
  deriveAttendanceHours,
  deriveFinancialTotals,
  deriveLegalCaseCosts,
  deriveOneToOneScheduleInvoicePlan,
  derivePayrollNet,
  deriveSchedulePaymentState,
  deriveStockOnHand,
  deriveVehicleStatus,
  isActiveContractStatus,
  isCompletedPayment,
  isInactivePaymentStatus,
  isInactiveScheduleStatus,
  isInvoiceOutsideContractBillingPeriod,
  isReceiptPayment,
  invoiceConflictsWithMonth,
  invoiceMonthKey,
  moneyDiffers,
  normalizeScheduleStatus,
  normalizeStatus,
  roundMoney,
  maxDaysOverdue,
} from "./rules.ts";
import type {
  AuditFinding,
  SystemAuditDomain,
  WorkerBatchResult,
  WorkerContext,
} from "./types.ts";

type Row = Record<string, unknown>;

export async function runDomainWorker(
  context: WorkerContext
): Promise<WorkerBatchResult> {
  const workers: Record<
    SystemAuditDomain,
    (context: WorkerContext) => Promise<WorkerBatchResult>
  > = {
    contracts: auditContracts,
    accounting: auditAccounting,
    fleet: auditFleet,
    customers: auditCustomers,
    inventory: auditInventory,
    legal: auditLegal,
    employees: auditEmployees,
  };
  return await workers[context.job.domain](context);
}

async function auditContracts(
  context: WorkerContext
): Promise<WorkerBatchResult> {
  const page = await loadCompanyPage(
    context,
    "contracts",
    "id,company_id,contract_number,status,contract_amount,total_paid,balance_due,payment_status,start_date,end_date,contract_date,customer_id,vehicle_id",
    String(context.job.cursor?.lastId || ""),
    Math.min(context.job.batch_size, 10)
  );
  const contractIds = page.rows.map((row) => row.id);
  if (contractIds.length === 0) return pageResult(page, []);

  const [invoices, payments, schedules] = await Promise.all([
    loadByIds(
      context,
      "invoices",
      "id,company_id,contract_id,customer_id,invoice_number,invoice_date,due_date,subtotal,total_amount,paid_amount,balance_due,status,payment_status,journal_entry_id",
      "contract_id",
      contractIds
    ),
    loadByIds(
      context,
      "payments",
      "id,company_id,contract_id,customer_id,invoice_id,amount,payment_date,payment_status,transaction_type,journal_entry_id,payment_number,reference_number,allocation_status",
      "contract_id",
      contractIds
    ),
    loadByIds(
      context,
      "contract_payment_schedules",
      "id,company_id,contract_id,invoice_id,amount,paid_amount,status,paid_date,due_date,installment_number",
      "contract_id",
      contractIds
    ),
  ]);

  const invoiceIds = invoices.map((invoice) => invoice.id);
  const contractPaymentIds = payments.map((payment) => payment.id);
  const paymentColumns =
    "id,company_id,contract_id,customer_id,invoice_id,amount,payment_date,payment_status,transaction_type,journal_entry_id,payment_number,reference_number,allocation_status";
  const [
    allocationsByInvoice,
    allocationsByContract,
    allocationsByContractPayment,
    directInvoicePayments,
    paymentBaseClassifications,
  ] = await Promise.all([
    loadByIds(
      context,
      "payment_allocations",
      "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
      "target_id",
      invoiceIds
    ),
    loadByIds(
      context,
      "payment_allocations",
      "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
      "target_id",
      contractIds
    ),
    loadByIds(
      context,
      "payment_allocations",
      "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
      "payment_id",
      contractPaymentIds
    ),
    loadByIds(context, "payments", paymentColumns, "invoice_id", invoiceIds),
    loadByIds(
      context,
      "payment_accounting_classifications",
      "payment_id,classification,is_active",
      "payment_id",
      contractPaymentIds
    ),
  ]);
  const basePayments = [
    ...new Map(
      [...payments, ...directInvoicePayments].map((row) => [row.id, row])
    ).values(),
  ];
  const basePaymentIds = basePayments.map((payment) => payment.id);
  const allocationsByDirectPayment = await loadByIds(
    context,
    "payment_allocations",
    "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
    "payment_id",
    basePaymentIds.filter(
      (paymentId) => !contractPaymentIds.includes(paymentId)
    )
  );
  const allocations = [
    ...new Map(
      [
        ...allocationsByInvoice,
        ...allocationsByContract,
        ...allocationsByContractPayment,
        ...allocationsByDirectPayment,
      ].map((row) => [row.id, row])
    ).values(),
  ];
  const knownPaymentIds = new Set(basePaymentIds);
  const additionalPaymentIds = allocations
    .map((allocation) => allocation.payment_id)
    .filter((paymentId) => paymentId && !knownPaymentIds.has(paymentId));
  const additionalPayments = await loadByIds(
    context,
    "payments",
    paymentColumns,
    "id",
    additionalPaymentIds
  );
  const allPayments = [
    ...new Map(
      [...basePayments, ...additionalPayments].map((row) => [row.id, row])
    ).values(),
  ];
  const canonicalInvoicePayments = buildCanonicalInvoiceReceiptContributions(
    allPayments,
    allocations
  );
  const activeAllocations = allocations.filter(
    (allocation) => allocation.is_active === true
  );
  const activeAllocationPaymentIds = new Set(
    activeAllocations.map((allocation) => allocation.payment_id)
  );
  const customerAdvancePaymentIds = new Set(
    paymentBaseClassifications
      .filter(
        (classification) =>
          classification.is_active === true &&
          classification.classification === "customer_advance"
      )
      .map((classification) => classification.payment_id)
  );

  const invoicesByContract = groupBy(invoices, (row) => row.contract_id);
  const paymentsByContract = groupBy(payments, (row) => row.contract_id);
  const paymentsByInvoice = groupBy(
    canonicalInvoicePayments,
    (row) => row.invoice_id
  );
  const schedulesByContract = groupBy(schedules, (row) => row.contract_id);
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const findings: AuditFinding[] = [];

  for (const contract of page.rows) {
    const contractInvoices = invoicesByContract.get(contract.id) || [];
    const contractPayments = paymentsByContract.get(contract.id) || [];
    const contractSchedules = schedulesByContract.get(contract.id) || [];
    const activeInvoices = contractInvoices.filter(isActiveInvoice);
    const plannedCancellation = new Set<string>();
    const automaticCancellation = new Set<string>();

    if (
      isActiveContractStatus(contract.status) &&
      (!contract.start_date ||
        !contract.end_date ||
        contract.end_date < contract.start_date)
    ) {
      findings.push(
        reviewFinding(
          `contract:${contract.id}:invalid-period`,
          "contract.invalid_period",
          "critical",
          "contract",
          contract.id,
          "Contract period is invalid",
          "The contract has missing dates or an end date before its start date.",
          { startDate: contract.start_date, endDate: contract.end_date }
        )
      );
    }

    const expectedContract = deriveFinancialTotals(
      contract.contract_amount,
      buildCanonicalContractReceiptContributions(
        contract.id,
        activeInvoices,
        allPayments,
        allocations
      )
    );
    if (
      moneyDiffers(contract.total_paid, expectedContract.paid) ||
      moneyDiffers(contract.balance_due, expectedContract.balance) ||
      normalizeStatus(contract.payment_status) !==
        expectedContract.paymentStatus
    ) {
      findings.push(
        repairFinding({
          dedupeKey: `contract:${contract.id}:financial-totals`,
          code: "contract.financial_totals_mismatch",
          severity: "high",
          entityType: "contract",
          entityId: contract.id,
          title: "Contract payment totals are stale",
          details: "Stored totals do not match completed receipt payments.",
          evidence: {
            contractAmount: roundMoney(contract.contract_amount),
            storedPaid: roundMoney(contract.total_paid),
            calculatedPaid: expectedContract.paid,
            storedBalance: roundMoney(contract.balance_due),
            calculatedBalance: expectedContract.balance,
          },
          command: "contract.recalculate_totals",
          expectedBefore: {
            total_paid: contract.total_paid,
            balance_due: contract.balance_due,
            payment_status: contract.payment_status,
          },
          values: {
            total_paid: expectedContract.paid,
            balance_due: expectedContract.balance,
            payment_status: expectedContract.paymentStatus,
          },
        })
      );
    }
    const invoicesByMonth = groupBy(activeInvoices, invoiceMonthKey);
    for (const [month, monthlyInvoices] of invoicesByMonth.entries()) {
      if (!month || monthlyInvoices.length < 2) continue;
      const ranked = [...monthlyInvoices].sort(
        (left, right) =>
          invoiceKeepScore(right, paymentsByInvoice) -
          invoiceKeepScore(left, paymentsByInvoice)
      );
      for (const duplicate of ranked.slice(1)) {
        planSafeInvoiceCancellation({
          findings,
          plannedCancellation,
          automaticCancellation,
          invoice: duplicate,
          invoicePayments: paymentsByInvoice.get(duplicate.id) || [],
          code: "invoice.duplicate_contract_month",
          details: `A second active invoice exists for contract month ${month}.`,
          evidence: {
            month,
            keptInvoiceId: ranked[0].id,
            duplicateInvoiceId: duplicate.id,
          },
        });
      }
    }

    for (const invoice of activeInvoices) {
      if (
        isInvoiceOutsideContractBillingPeriod(
          invoice,
          contract.start_date,
          contract.end_date
        )
      ) {
        planSafeInvoiceCancellation({
          findings,
          plannedCancellation,
          automaticCancellation,
          invoice,
          invoicePayments: paymentsByInvoice.get(invoice.id) || [],
          code: "invoice.outside_contract_period",
          details: "The invoice date is outside the contract period.",
          evidence: {
            invoiceDate: dateOnly(invoice.invoice_date),
            invoiceDueDate: dateOnly(invoice.due_date),
            contractStart: contract.start_date,
            contractEnd: contract.end_date,
          },
        });
      }
    }

    for (const invoice of activeInvoices) {
      if (automaticCancellation.has(invoice.id)) continue;
      const invoicePayments = paymentsByInvoice.get(invoice.id) || [];
      const expectedInvoice = deriveFinancialTotals(
        invoice.total_amount,
        invoicePayments
      );
      if (
        moneyDiffers(invoice.paid_amount, expectedInvoice.paid) ||
        moneyDiffers(invoice.balance_due, expectedInvoice.balance) ||
        normalizeStatus(invoice.payment_status) !==
          expectedInvoice.paymentStatus
      ) {
        findings.push(
          repairFinding({
            dedupeKey: `invoice:${invoice.id}:balance`,
            code: "invoice.balance_mismatch",
            severity: "high",
            entityType: "invoice",
            entityId: invoice.id,
            title: "Invoice balance is stale",
            details:
              "Stored invoice balance does not match completed receipt payments.",
            evidence: {
              invoiceTotal: roundMoney(invoice.total_amount),
              storedPaid: roundMoney(invoice.paid_amount),
              calculatedPaid: expectedInvoice.paid,
              storedBalance: roundMoney(invoice.balance_due),
              calculatedBalance: expectedInvoice.balance,
            },
            command: "invoice.recalculate_balance",
            expectedBefore: {
              paid_amount: invoice.paid_amount,
              balance_due: invoice.balance_due,
              payment_status: invoice.payment_status,
            },
            values: {
              paid_amount: expectedInvoice.paid,
              balance_due: expectedInvoice.balance,
              payment_status: expectedInvoice.paymentStatus,
            },
          })
        );
      }
    }

    const activeSchedules = contractSchedules.filter(
      (schedule) => !isInactiveScheduleStatus(schedule.status)
    );
    const duplicateDueGroups = [
      ...groupBy(activeSchedules, (schedule) =>
        dateOnly(schedule.due_date)
      ).entries(),
    ].filter(
      ([dueDate, groupedSchedules]) =>
        Boolean(dueDate) && groupedSchedules.length > 1
    );
    const duplicateGroupEvidence = duplicateDueGroups.map(
      ([dueDate, groupedSchedules]) => {
        const canonicalInvoiceIds = [
          ...new Set(
            groupedSchedules.flatMap((schedule) => {
              const invoice = schedule.invoice_id
                ? invoiceById.get(schedule.invoice_id)
                : null;
              return invoice &&
                invoice.contract_id === contract.id &&
                isActiveInvoice(invoice) &&
                invoiceConflictsWithMonth(invoice, monthKey(dueDate))
                ? [invoice.id]
                : [];
            })
          ),
        ];
        return {
          dueDate,
          scheduleIds: groupedSchedules.map((schedule) => schedule.id),
          amounts: [
            ...new Set(
              groupedSchedules.map((schedule) => roundMoney(schedule.amount))
            ),
          ],
          paidAmounts: [
            ...new Set(
              groupedSchedules.map((schedule) =>
                roundMoney(schedule.paid_amount)
              )
            ),
          ],
          statuses: [
            ...new Set(
              groupedSchedules.map((schedule) =>
                normalizeScheduleStatus(schedule.status)
              )
            ),
          ],
          canonicalInvoiceIds,
        };
      }
    );
    const duplicateGroupsAreSafe = duplicateGroupEvidence.every(
      (group) =>
        group.amounts.length === 1 &&
        group.paidAmounts.length === 1 &&
        group.statuses.length === 1 &&
        group.canonicalInvoiceIds.length === 1
    );

    if (duplicateDueGroups.length > 0) {
      if (duplicateGroupsAreSafe) {
        findings.push(
          repairFinding({
            dedupeKey: `contract:${contract.id}:duplicate-schedule-rows`,
            code: "schedule.duplicate_rows",
            severity: "critical",
            entityType: "contract",
            entityId: contract.id,
            title: "Contract has duplicate payment schedule rows",
            details:
              "Identical same-date schedule rows can be consolidated while retaining the one canonical invoice link.",
            evidence: {
              duplicateGroups: duplicateGroupEvidence,
              activeScheduleCount: activeSchedules.length,
              extraRowCount: duplicateDueGroups.reduce(
                (total, [, rows]) => total + rows.length - 1,
                0
              ),
            },
            command: "schedule.consolidate_duplicate_rows",
            expectedBefore: {
              active_schedule_count: activeSchedules.length,
              duplicate_group_count: duplicateDueGroups.length,
            },
            values: {},
          })
        );
      } else {
        findings.push(
          reviewFinding(
            `contract:${contract.id}:ambiguous-duplicate-schedule-rows`,
            "schedule.duplicate_rows_ambiguous",
            "critical",
            "contract",
            contract.id,
            "Contract has conflicting duplicate payment schedules",
            "At least one same-date group differs financially or points to multiple canonical invoices.",
            { duplicateGroups: duplicateGroupEvidence }
          )
        );
      }
    }

    const linkedSchedules = activeSchedules.filter((schedule) =>
      Boolean(schedule.invoice_id)
    );
    const completeLinkPlan = deriveOneToOneScheduleInvoicePlan(
      activeSchedules,
      activeInvoices
    );
    const linkPlan = deriveOneToOneScheduleInvoicePlan(
      linkedSchedules,
      activeInvoices
    );
    const currentInvoiceIds = linkedSchedules.map((schedule) =>
      String(schedule.invoice_id)
    );
    const invalidCurrentLinkIds = linkedSchedules
      .filter((schedule) => {
        const invoice = invoiceById.get(schedule.invoice_id);
        return !(
          invoice &&
          invoice.contract_id === contract.id &&
          isActiveInvoice(invoice) &&
          invoiceConflictsWithMonth(invoice, monthKey(schedule.due_date))
        );
      })
      .map((schedule) => schedule.id);
    const duplicateCurrentInvoiceLinks =
      new Set(currentInvoiceIds).size !== currentInvoiceIds.length;
    const changedLinkAssignments = linkPlan.assignments.filter(
      (assignment) => assignment.oldInvoiceId !== assignment.newInvoiceId
    );
    const unlinkedScheduleIdsWithCandidates = completeLinkPlan.assignments
      .filter(
        (assignment) =>
          !assignment.oldInvoiceId && assignment.candidateInvoiceIds.length > 0
      )
      .map((assignment) => assignment.scheduleId);
    const hasScheduleLinkProblem =
      invalidCurrentLinkIds.length > 0 || duplicateCurrentInvoiceLinks;
    const hasAnyScheduleLinkProblem =
      hasScheduleLinkProblem || unlinkedScheduleIdsWithCandidates.length > 0;
    const changedCompleteLinkAssignments = completeLinkPlan.assignments.filter(
      (assignment) => assignment.oldInvoiceId !== assignment.newInvoiceId
    );
    const canRebalanceScheduleLinks =
      duplicateDueGroups.length === 0 &&
      hasAnyScheduleLinkProblem &&
      completeLinkPlan.complete &&
      changedCompleteLinkAssignments.length > 0 &&
      changedCompleteLinkAssignments.every((assignment) => {
        const schedule = activeSchedules.find(
          (item) => item.id === assignment.scheduleId
        );
        return Boolean(
          schedule &&
            canLinkInvoiceForSchedule({
              scheduleStatus: schedule.status,
              dueDate: schedule.due_date,
              contractStatus: contract.status,
              contractStartDate: contract.start_date,
              contractEndDate: contract.end_date,
            })
        );
      });
    const canRealignScheduleLinks =
      duplicateDueGroups.length === 0 &&
      hasScheduleLinkProblem &&
      linkPlan.complete &&
      changedLinkAssignments.every((assignment) => {
        const schedule = linkedSchedules.find(
          (item) => item.id === assignment.scheduleId
        );
        return Boolean(
          schedule &&
            canLinkInvoiceForSchedule({
              scheduleStatus: schedule.status,
              dueDate: schedule.due_date,
              contractStatus: contract.status,
              contractStartDate: contract.start_date,
              contractEndDate: contract.end_date,
            })
        );
      });

    if (duplicateDueGroups.length === 0 && hasAnyScheduleLinkProblem) {
      const evidence = {
        activeScheduleCount: activeSchedules.length,
        activeLinkedScheduleCount: linkedSchedules.length,
        invalidCurrentLinkIds,
        duplicateCurrentInvoiceLinks,
        unlinkedScheduleIdsWithCandidates,
        changedLinkCount: canRebalanceScheduleLinks
          ? changedCompleteLinkAssignments.length
          : changedLinkAssignments.length,
        unmatchedScheduleIds: canRebalanceScheduleLinks
          ? completeLinkPlan.unmatchedScheduleIds
          : linkPlan.unmatchedScheduleIds,
        assignments: canRebalanceScheduleLinks
          ? completeLinkPlan.assignments
          : linkPlan.assignments,
      };
      if (canRebalanceScheduleLinks) {
        findings.push(
          repairFinding({
            dedupeKey: `contract:${contract.id}:rebalance-schedule-invoice-links`,
            code: "schedule.contract_invoice_links_rebalanced",
            severity: "critical",
            entityType: "contract",
            entityId: contract.id,
            title: "Contract schedule invoice links need rebalancing",
            details:
              "The complete schedule-to-invoice graph can be matched atomically, including unlinked schedules, without changing invoices or accounting entries.",
            evidence,
            command: "schedule.realign_contract_invoice_links_v3",
            expectedBefore: {
              active_schedule_count: activeSchedules.length,
              active_linked_schedule_count: linkedSchedules.length,
              changed_link_count: changedCompleteLinkAssignments.length,
            },
            values: {
              assignments: completeLinkPlan.assignments.map((assignment) => ({
                schedule_id: assignment.scheduleId,
                expected_invoice_id: assignment.oldInvoiceId,
                invoice_id: assignment.newInvoiceId,
              })),
            },
          })
        );
      } else if (canRealignScheduleLinks) {
        findings.push(
          repairFinding({
            dedupeKey: `contract:${contract.id}:realign-schedule-invoice-links`,
            code: "schedule.contract_invoice_links_shifted",
            severity: "critical",
            entityType: "contract",
            entityId: contract.id,
            title: "Contract schedule invoice links are shifted",
            details:
              "The complete one-to-one invoice-link graph can be realigned atomically without changing invoices or accounting entries.",
            evidence,
            command: "schedule.realign_contract_invoice_links_v2",
            expectedBefore: {
              active_schedule_count: activeSchedules.length,
              active_linked_schedule_count: linkedSchedules.length,
              changed_link_count: changedLinkAssignments.length,
            },
            values: {
              assignments: linkPlan.assignments.map((assignment) => ({
                schedule_id: assignment.scheduleId,
                expected_invoice_id: assignment.oldInvoiceId,
                invoice_id: assignment.newInvoiceId,
              })),
            },
          })
        );
      } else {
        findings.push(
          reviewFinding(
            `contract:${contract.id}:schedule-invoice-link-graph-review`,
            "schedule.invoice_link_graph_requires_review",
            "critical",
            "contract",
            contract.id,
            "Contract invoice-link graph is ambiguous",
            "The complete schedule-to-invoice graph has no safe one-to-one matching or is blocked by the contract lifecycle.",
            evidence
          )
        );
      }
    }

    if (duplicateDueGroups.length === 0 && !hasAnyScheduleLinkProblem) {
      for (const schedule of activeSchedules) {
        const scheduleMonth = monthKey(schedule.due_date);
        const issueCandidates = activeInvoices.filter(
          (invoice) => monthKey(invoice.invoice_date) === scheduleMonth
        );
        const dueCandidates = activeInvoices.filter(
          (invoice) => monthKey(invoice.due_date) === scheduleMonth
        );
        const candidates =
          issueCandidates.length > 0 ? issueCandidates : dueCandidates;
        const constraintCandidates = contractInvoices.filter((invoice) =>
          invoiceConflictsWithMonth(invoice, scheduleMonth)
        );
        const linkedInvoice = schedule.invoice_id
          ? invoiceById.get(schedule.invoice_id)
          : null;
        const linkedIsActive =
          linkedInvoice &&
          linkedInvoice.contract_id === contract.id &&
          isActiveInvoice(linkedInvoice);
        const linkedMatches = Boolean(
          linkedIsActive &&
            invoiceConflictsWithMonth(linkedInvoice, scheduleMonth)
        );
        const candidate = candidates.length === 1 ? candidates[0] : null;
        const candidateCanUseGenericLink = candidate
          ? invoiceConflictsWithMonth(candidate, scheduleMonth)
          : false;
        const canAutoLinkInvoice = canLinkInvoiceForSchedule({
          scheduleStatus: schedule.status,
          dueDate: schedule.due_date,
          contractStatus: contract.status,
          contractStartDate: contract.start_date,
          contractEndDate: contract.end_date,
        });

        if (!linkedMatches && schedule.invoice_id) {
          const evidence = {
            invoiceId: schedule.invoice_id,
            contractId: contract.id,
            scheduleMonth,
            linkedInvoiceLoaded: Boolean(linkedInvoice),
            linkedInvoiceContractId: linkedInvoice?.contract_id || null,
            linkedInvoiceMonth: linkedInvoice
              ? invoiceMonthKey(linkedInvoice)
              : null,
            linkedInvoiceDateMonth: linkedInvoice
              ? monthKey(linkedInvoice.invoice_date)
              : null,
            linkedInvoiceDueMonth: linkedInvoice
              ? monthKey(linkedInvoice.due_date)
              : null,
            linkedInvoiceStatus: linkedInvoice?.status || null,
            candidateInvoiceIds: candidates.map((candidate) => candidate.id),
          };
          if (canAutoLinkInvoice) {
            findings.push(
              repairFinding({
                dedupeKey: `schedule:${schedule.id}:repair-existing-invoice-link`,
                code: "schedule.stale_invoice_link",
                severity: "high",
                entityType: "contract_payment_schedule",
                entityId: schedule.id,
                title:
                  "Schedule invoice link is stale or points to the wrong billing month",
                details:
                  "The canonical schedule gateway can swap the link or generate the missing due-month invoice atomically.",
                evidence,
                command: "schedule.repair_invoice_link",
                expectedBefore: { invoice_id: schedule.invoice_id },
                values: {},
              })
            );
          } else {
            findings.push(
              reviewFinding(
                `schedule:${schedule.id}:existing-invoice-link-review`,
                "schedule.existing_invoice_link_mismatch",
                "high",
                "contract_payment_schedule",
                schedule.id,
                "Schedule has an existing invoice link that cannot be trusted",
                "The contract lifecycle does not permit an automatic invoice-link swap.",
                evidence
              )
            );
          }
        } else if (!linkedMatches && candidates.length > 1) {
          findings.push(
            reviewFinding(
              `schedule:${schedule.id}:ambiguous-invoice-link`,
              "schedule.ambiguous_invoice_link",
              "high",
              "contract_payment_schedule",
              schedule.id,
              "Schedule has multiple invoice candidates",
              "The link cannot be selected safely until duplicate invoices are resolved.",
              {
                candidateInvoiceIds: candidates.map(
                  (candidate) => candidate.id
                ),
                month: scheduleMonth,
              }
            )
          );
        } else if (!linkedMatches && candidate && !candidateCanUseGenericLink) {
          findings.push(
            reviewFinding(
              `schedule:${schedule.id}:shifted-invoice-due-date`,
              "schedule.invoice_exists_with_shifted_due_date",
              "high",
              "contract_payment_schedule",
              schedule.id,
              "Schedule invoice exists with a shifted due date",
              "The invoice month matches invoice_date, but due_date is in another month; linking requires a dedicated date review.",
              {
                invoiceId: candidate.id,
                scheduleMonth,
                invoiceDate: candidate.invoice_date,
                invoiceDueDate: candidate.due_date,
              }
            )
          );
        } else if (!linkedMatches && candidate && !canAutoLinkInvoice) {
          findings.push(
            reviewFinding(
              `schedule:${schedule.id}:inactive-contract-invoice-link-review`,
              "schedule.invoice_link_requires_active_contract",
              "high",
              "contract_payment_schedule",
              schedule.id,
              "Schedule invoice link requires an active contract period",
              "The invoice candidate is unambiguous, but automatic linking is blocked because the contract or schedule is inactive or the due date is outside the contract period.",
              {
                invoiceId: candidate.id,
                scheduleStatus: schedule.status,
                scheduleDueDate: schedule.due_date,
                contractStatus: contract.status,
                contractStartDate: contract.start_date,
                contractEndDate: contract.end_date,
              }
            )
          );
        } else if (!linkedMatches && candidate) {
          findings.push(
            repairFinding({
              dedupeKey: `schedule:${schedule.id}:invoice-link`,
              code: "schedule.invoice_link_mismatch",
              severity: "high",
              entityType: "contract_payment_schedule",
              entityId: schedule.id,
              title: "Schedule invoice link is incorrect",
              details:
                "Exactly one active same-contract same-month invoice can be linked safely.",
              evidence: {
                oldInvoiceId: schedule.invoice_id,
                newInvoiceId: candidate.id,
                month: scheduleMonth,
              },
              command: "schedule.link_invoice_by_billing_month",
              expectedBefore: { invoice_id: schedule.invoice_id },
              values: {},
            })
          );
        } else if (!linkedMatches && constraintCandidates.length > 0) {
          findings.push(
            reviewFinding(
              `schedule:${schedule.id}:invoice-month-constraint-conflict`,
              "schedule.invoice_month_constraint_conflict",
              "high",
              "contract_payment_schedule",
              schedule.id,
              "Invoice month is occupied by another due-date interpretation",
              "An existing invoice touches this month through due_date, so a new invoice would violate a database uniqueness rule.",
              {
                scheduleMonth,
                invoiceIds: constraintCandidates.map((item) => item.id),
              }
            )
          );
        } else if (
          !linkedMatches &&
          canGenerateInvoiceForSchedule({
            invoiceId: schedule.invoice_id,
            scheduleStatus: schedule.status,
            amount: schedule.amount,
            dueDate: schedule.due_date,
            contractStatus: contract.status,
            contractStartDate: contract.start_date,
            contractEndDate: contract.end_date,
          })
        ) {
          findings.push(
            repairFinding({
              dedupeKey: `schedule:${schedule.id}:missing-invoice`,
              code: "schedule.missing_invoice",
              severity: "high",
              entityType: "contract_payment_schedule",
              entityId: schedule.id,
              title: "Schedule has no invoice",
              details:
                "The active contract schedule month has no active invoice.",
              evidence: {
                contractId: contract.id,
                dueDate: schedule.due_date,
                amount: roundMoney(schedule.amount),
              },
              command: "contract.generate_missing_invoice",
              expectedBefore: { invoice_id: schedule.invoice_id },
              values: {},
            })
          );
        }

        const effectiveInvoice = linkedMatches
          ? linkedInvoice
          : candidateCanUseGenericLink
          ? candidate
          : null;
        if (effectiveInvoice) {
          const invoicePayments =
            paymentsByInvoice.get(effectiveInvoice.id) || [];
          if (moneyDiffers(effectiveInvoice.total_amount, schedule.amount)) {
            const hasFinancialImpact =
              Boolean(effectiveInvoice.journal_entry_id) ||
              Math.abs(Number(effectiveInvoice.paid_amount || 0)) > 0.01 ||
              invoicePayments.some(
                (payment) => !isInactivePaymentStatus(payment.payment_status)
              );
            if (hasFinancialImpact) {
              const linkedActiveSchedules = activeSchedules.filter(
                (item) => item.invoice_id === effectiveInvoice.id
              );
              if (
                linkedActiveSchedules.length === 1 &&
                roundMoney(effectiveInvoice.total_amount) > 0.01
              ) {
                findings.push(
                  repairFinding({
                    dedupeKey: `schedule:${schedule.id}:amount-from-financial-invoice`,
                    code: "schedule.amount_mismatch_with_financial_invoice",
                    severity: "critical",
                    entityType: "contract_payment_schedule",
                    entityId: schedule.id,
                    title: "Schedule amount differs from its posted invoice",
                    details:
                      "The non-ledger schedule can be synchronized from its one financially authoritative invoice.",
                    evidence: {
                      invoiceId: effectiveInvoice.id,
                      invoiceAmount: roundMoney(effectiveInvoice.total_amount),
                      scheduleAmount: roundMoney(schedule.amount),
                    },
                    command: "schedule.sync_amount_from_invoice",
                    expectedBefore: {
                      amount: schedule.amount,
                      paid_amount: schedule.paid_amount,
                      status: schedule.status,
                      paid_date: schedule.paid_date,
                      invoice_id: schedule.invoice_id,
                    },
                    values: {},
                  })
                );
              } else {
                findings.push(
                  reviewFinding(
                    `invoice:${effectiveInvoice.id}:schedule-amount-review`,
                    "invoice.schedule_amount_mismatch_with_financial_impact",
                    "critical",
                    "invoice",
                    effectiveInvoice.id,
                    "Invoice amount differs from its schedule",
                    "The invoice is linked to multiple schedules or has a non-positive amount, so the source cannot be selected automatically.",
                    {
                      invoiceAmount: roundMoney(effectiveInvoice.total_amount),
                      scheduleAmount: roundMoney(schedule.amount),
                      scheduleId: schedule.id,
                      activeScheduleCount: linkedActiveSchedules.length,
                    }
                  )
                );
              }
            } else {
              const scheduleAmount = Math.max(0, roundMoney(schedule.amount));
              if (scheduleAmount <= 0.01) {
                findings.push(
                  reviewFinding(
                    `invoice:${effectiveInvoice.id}:zero-schedule-amount-review`,
                    "invoice.zero_schedule_amount_requires_review",
                    "high",
                    "invoice",
                    effectiveInvoice.id,
                    "Invoice is linked to a zero-value schedule",
                    "The schedule amount must be corrected or the invoice cancelled; the agent will not choose between those business outcomes.",
                    {
                      invoiceAmount: roundMoney(effectiveInvoice.total_amount),
                      scheduleAmount,
                      scheduleId: schedule.id,
                    }
                  )
                );
              } else {
                findings.push(
                  repairFinding({
                    dedupeKey: `invoice:${effectiveInvoice.id}:schedule-amount`,
                    code: "invoice.schedule_amount_mismatch",
                    severity: "high",
                    entityType: "invoice",
                    entityId: effectiveInvoice.id,
                    title:
                      "Zero-impact invoice amount differs from its schedule",
                    details:
                      "The amount can be synchronized because the invoice has no payment or journal impact.",
                    evidence: {
                      invoiceAmount: roundMoney(effectiveInvoice.total_amount),
                      scheduleAmount,
                      scheduleId: schedule.id,
                    },
                    command: "invoice.sync_zero_impact_amount",
                    expectedBefore: {
                      subtotal: effectiveInvoice.subtotal,
                      total_amount: effectiveInvoice.total_amount,
                      balance_due: effectiveInvoice.balance_due,
                      payment_status: effectiveInvoice.payment_status,
                    },
                    values: {
                      subtotal: scheduleAmount,
                      total_amount: scheduleAmount,
                      balance_due: scheduleAmount,
                      payment_status: "unpaid",
                    },
                  })
                );
              }
            }
          }
          const paid = roundMoney(
            invoicePayments
              .filter((payment) => isCompletedPayment(payment.payment_status))
              .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
          );
          const expectedSchedule = deriveSchedulePaymentState(
            schedule.amount,
            paid,
            schedule.due_date,
            context.now
          );
          const latestPaidDate = latestDate(
            invoicePayments
              .filter((payment) => isCompletedPayment(payment.payment_status))
              .map((payment) => payment.payment_date)
          );
          const expectedPaidDate =
            expectedSchedule.status === "paid" ? latestPaidDate : null;
          if (
            moneyDiffers(schedule.paid_amount, expectedSchedule.paid) ||
            normalizeScheduleStatus(schedule.status) !==
              normalizeScheduleStatus(expectedSchedule.status) ||
            (schedule.paid_date || null) !== expectedPaidDate
          ) {
            findings.push(
              repairFinding({
                dedupeKey: `schedule:${schedule.id}:payment-state`,
                code: "schedule.payment_state_mismatch",
                severity: "medium",
                entityType: "contract_payment_schedule",
                entityId: schedule.id,
                title: "Schedule payment state is stale",
                details:
                  "Paid amount and schedule status do not match the linked invoice receipts.",
                evidence: {
                  invoiceId: effectiveInvoice.id,
                  calculatedPaid: expectedSchedule.paid,
                  calculatedStatus: expectedSchedule.status,
                },
                command: "schedule.sync_payment_state",
                expectedBefore: {
                  paid_amount: schedule.paid_amount,
                  status: schedule.status,
                  paid_date: schedule.paid_date,
                },
                values: {
                  paid_amount: expectedSchedule.paid,
                  status: expectedSchedule.status,
                  paid_date: expectedPaidDate,
                },
              })
            );
          }
        }
      }
    }

    const possibleDuplicatePayments = groupBy(
      contractPayments.filter((payment) =>
        isCompletedPayment(payment.payment_status)
      ),
      (payment) =>
        `${roundMoney(payment.amount)}:${payment.payment_date || ""}:${
          payment.reference_number || "no-reference"
        }`
    );
    for (const [signature, duplicates] of possibleDuplicatePayments.entries()) {
      if (duplicates.length < 2) continue;
      findings.push(
        reviewFinding(
          `contract:${contract.id}:duplicate-payment:${signature}`,
          "payment.possible_duplicate",
          "critical",
          "contract",
          contract.id,
          "Contract has possible duplicate payments",
          "Receipts and bank references must be checked before reversal.",
          {
            paymentIds: duplicates.map((payment) => payment.id),
            count: duplicates.length,
            amount: roundMoney(duplicates[0].amount),
            paymentDate: duplicates[0].payment_date,
          }
        )
      );
    }

    for (const payment of contractPayments) {
      const hasActiveAllocation = activeAllocationPaymentIds.has(payment.id);
      if (
        isReceiptPayment(payment) &&
        !payment.invoice_id &&
        !hasActiveAllocation &&
        payment.payment_date
      ) {
        const paymentMonth = monthKey(payment.payment_date);
        const candidates = activeInvoices.filter((invoice) => {
          const paid = deriveFinancialTotals(
            invoice.total_amount,
            paymentsByInvoice.get(invoice.id) || []
          ).paid;
          const remaining = Math.max(
            0,
            roundMoney(invoice.total_amount) - paid
          );
          return (
            monthKey(invoice.invoice_date || invoice.due_date) ===
              paymentMonth &&
            (!invoice.customer_id ||
              invoice.customer_id === payment.customer_id) &&
            remaining > 0.01 &&
            remaining >= Number(payment.amount || 0) - 0.01
          );
        });
        if (candidates.length === 1) {
          findings.push(
            repairFinding({
              dedupeKey: `payment:${payment.id}:invoice-link`,
              code: "payment.completed_unlinked_clear_invoice",
              severity: "high",
              entityType: "payment",
              entityId: payment.id,
              title: "Completed receipt has one clear invoice allocation",
              details:
                "The canonical allocation workflow can link the receipt and post its accounting reclassification atomically.",
              evidence: {
                candidateInvoiceId: candidates[0].id,
                paymentMonth,
                amount: roundMoney(payment.amount),
              },
              command: "payment.link_clear_invoice",
              expectedBefore: {
                invoice_id: payment.invoice_id,
                journal_entry_id: payment.journal_entry_id,
                allocation_status: payment.allocation_status,
              },
              values: { invoice_id: candidates[0].id },
            })
          );
        } else if (candidates.length === 0) {
          if (!customerAdvancePaymentIds.has(payment.id))
            findings.push(
              repairFinding({
                dedupeKey: `payment:${payment.id}:classify-customer-advance`,
                code: "payment.completed_unlinked_customer_advance",
                severity: "high",
                entityType: "payment",
                entityId: payment.id,
                title: "Completed receipt is an unallocated customer advance",
                details:
                  "The receipt has no invoice candidate and can be classified in the mapped customer-advance account without changing its historical payment date.",
                evidence: {
                  contractId: contract.id,
                  candidateCount: 0,
                  paymentMonth,
                  amount: roundMoney(payment.amount),
                },
                command: "payment.classify_customer_advance",
                expectedBefore: {
                  invoice_id: payment.invoice_id,
                  journal_entry_id: payment.journal_entry_id,
                  allocation_status: payment.allocation_status,
                },
                values: {},
              })
            );
        } else {
          findings.push(
            reviewFinding(
              `payment:${payment.id}:invoice-link-review`,
              "payment.completed_unlinked_ambiguous",
              "high",
              "payment",
              payment.id,
              "Completed receipt has no unambiguous invoice allocation",
              "The receipt remains a customer advance until one invoice can be selected without guessing.",
              {
                candidateCount: candidates.length,
                candidateInvoiceIds: candidates.map(
                  (candidate) => candidate.id
                ),
                paymentMonth,
                amount: roundMoney(payment.amount),
              }
            )
          );
        }
      }
    }
  }

  return pageResult(page, findings);
}

function planSafeInvoiceCancellation(input: {
  findings: AuditFinding[];
  plannedCancellation: Set<string>;
  automaticCancellation: Set<string>;
  invoice: Row;
  invoicePayments: Row[];
  code: string;
  details: string;
  evidence: Record<string, unknown>;
}) {
  if (input.plannedCancellation.has(input.invoice.id)) return;
  const hasFinancialImpact =
    Boolean(input.invoice.journal_entry_id) ||
    Math.abs(Number(input.invoice.total_amount || 0)) > 0.01 ||
    Math.abs(Number(input.invoice.paid_amount || 0)) > 0.01 ||
    Math.abs(Number(input.invoice.balance_due || 0)) > 0.01 ||
    input.invoicePayments.some(
      (payment) => !isInactivePaymentStatus(payment.payment_status)
    );

  input.plannedCancellation.add(input.invoice.id);
  if (hasFinancialImpact) {
    input.findings.push(
      reviewFinding(
        `invoice:${input.invoice.id}:${input.code}:review`,
        input.code,
        "critical",
        "invoice",
        input.invoice.id,
        "Invoice requires reversal review",
        input.details,
        {
          ...input.evidence,
          hasJournal: Boolean(input.invoice.journal_entry_id),
          paidAmount: roundMoney(input.invoice.paid_amount),
        }
      )
    );
    return;
  }

  input.automaticCancellation.add(input.invoice.id);
  input.findings.push(
    repairFinding({
      dedupeKey: `invoice:${input.invoice.id}:${input.code}`,
      code: input.code,
      severity: "high",
      entityType: "invoice",
      entityId: input.invoice.id,
      title: "Zero-impact invoice can be safely cancelled",
      details: input.details,
      evidence: input.evidence,
      command: "invoice.cancel_zero_safe",
      expectedBefore: {
        status: input.invoice.status,
        payment_status: input.invoice.payment_status,
        balance_due: input.invoice.balance_due,
      },
      values: {
        status: "cancelled",
        payment_status: "cancelled",
        balance_due: 0,
      },
    })
  );
}

async function auditAccounting(
  context: WorkerContext
): Promise<WorkerBatchResult> {
  const cursor = context.job.cursor || {};
  const phase = String(cursor.phase || "journals");

  if (phase === "journals") {
    const page = await loadCompanyPage(
      context,
      "journal_entries",
      "id,company_id,entry_number,entry_date,status,total_debit,total_credit,reference_type,reference_id",
      String(cursor.lastId || "")
    );
    const journalIds = page.rows.map((row) => row.id);
    const lines = await loadByIds(
      context,
      "journal_entry_lines",
      "id,journal_entry_id,debit_amount,credit_amount,line_number,account_id",
      "journal_entry_id",
      journalIds,
      false
    );
    const linesByJournal = groupBy(lines, (line) => line.journal_entry_id);
    const findings: AuditFinding[] = [];

    for (const journal of page.rows) {
      const journalLines = linesByJournal.get(journal.id) || [];
      const debit = roundMoney(
        journalLines.reduce(
          (sum, line) => sum + Number(line.debit_amount || 0),
          0
        )
      );
      const credit = roundMoney(
        journalLines.reduce(
          (sum, line) => sum + Number(line.credit_amount || 0),
          0
        )
      );
      const balanced = !moneyDiffers(debit, credit);

      const isEmptyDraftPlaceholder =
        journalLines.length === 0 &&
        ["draft", "pending"].includes(normalizeStatus(journal.status)) &&
        !moneyDiffers(journal.total_debit, 0) &&
        !moneyDiffers(journal.total_credit, 0);
      if (journalLines.length < 2 && !isEmptyDraftPlaceholder) {
        findings.push(
          reviewFinding(
            `journal:${journal.id}:insufficient-lines`,
            "accounting.journal_insufficient_lines",
            "critical",
            "journal_entry",
            journal.id,
            "Journal entry has fewer than two lines",
            "A valid journal entry requires at least one debit and one credit line.",
            {
              lineCount: journalLines.length,
              storedDebit: journal.total_debit,
              storedCredit: journal.total_credit,
            }
          )
        );
      }

      if (!balanced) {
        findings.push(
          reviewFinding(
            `journal:${journal.id}:unbalanced`,
            "accounting.unbalanced_journal",
            "critical",
            "journal_entry",
            journal.id,
            "Journal entry is unbalanced",
            "The agent will not invent a balancing account or amount.",
            {
              calculatedDebit: debit,
              calculatedCredit: credit,
              difference: roundMoney(debit - credit),
            }
          )
        );
        continue;
      }

      if (
        moneyDiffers(journal.total_debit, debit) ||
        moneyDiffers(journal.total_credit, credit)
      ) {
        if (["draft", "pending"].includes(normalizeStatus(journal.status))) {
          findings.push(
            repairFinding({
              dedupeKey: `journal:${journal.id}:stored-totals`,
              code: "accounting.draft_journal_totals_mismatch",
              severity: "high",
              entityType: "journal_entry",
              entityId: journal.id,
              title: "Draft journal totals are stale",
              details:
                "The balanced line totals do not match the journal header totals.",
              evidence: { calculatedDebit: debit, calculatedCredit: credit },
              command: "accounting.sync_draft_journal_totals",
              expectedBefore: {
                total_debit: journal.total_debit,
                total_credit: journal.total_credit,
              },
              values: { total_debit: debit, total_credit: credit },
            })
          );
        } else {
          findings.push(
            reviewFinding(
              `journal:${journal.id}:posted-totals`,
              "accounting.posted_journal_totals_mismatch",
              "critical",
              "journal_entry",
              journal.id,
              "Posted journal totals do not match its lines",
              "A posted journal must be corrected through an approved reversal.",
              {
                status: journal.status,
                calculatedDebit: debit,
                calculatedCredit: credit,
              }
            )
          );
        }
      }
    }

    const nextCursor = page.hasMore
      ? { phase: "journals", lastId: page.nextLastId }
      : { phase: "payments", lastId: "" };
    return {
      findings,
      cursor: nextCursor,
      hasMore: page.hasMore || true,
      scanned: page.rows.length,
      stats: { journalsScanned: page.rows.length },
    };
  }

  const page = await loadCompanyPage(
    context,
    "payments",
    "id,company_id,payment_number,payment_date,payment_status,amount,journal_entry_id,contract_id,invoice_id",
    String(cursor.lastId || "")
  );
  const journalIds = page.rows
    .map((row) => row.journal_entry_id)
    .filter(Boolean);
  const journals = await loadByIds(
    context,
    "journal_entries",
    "id,company_id,status,entry_date,reference_type,reference_id",
    "id",
    journalIds
  );
  const journalById = new Map(journals.map((journal) => [journal.id, journal]));
  const findings: AuditFinding[] = [];

  for (const payment of page.rows) {
    if (!isCompletedPayment(payment.payment_status)) continue;
    if (!payment.journal_entry_id) {
      findings.push(
        reviewFinding(
          `payment:${payment.id}:missing-journal`,
          "accounting.completed_payment_missing_journal",
          "critical",
          "payment",
          payment.id,
          "Completed payment has no journal entry",
          "A journal must be created through the payment accounting workflow and remain reversible.",
          {
            amount: roundMoney(payment.amount),
            paymentDate: payment.payment_date,
          }
        )
      );
    } else if (!journalById.has(payment.journal_entry_id)) {
      findings.push(
        reviewFinding(
          `payment:${payment.id}:broken-journal-link`,
          "accounting.payment_broken_journal_link",
          "critical",
          "payment",
          payment.id,
          "Payment journal link points to a missing entry",
          "The payment requires journal reconstruction or relinking with accounting approval.",
          { journalEntryId: payment.journal_entry_id }
        )
      );
    }
  }

  return pageResult(
    page,
    findings,
    { phase: "payments", lastId: page.nextLastId },
    { paymentsScanned: page.rows.length }
  );
}

async function auditFleet(context: WorkerContext): Promise<WorkerBatchResult> {
  const page = await loadCompanyPage(
    context,
    "vehicles",
    "id,company_id,plate_number,status,is_active,current_mileage,odometer_reading"
  );
  const vehicleIds = page.rows.map((row) => row.id);
  if (vehicleIds.length === 0) return pageResult(page, []);

  const today = context.now.toISOString().slice(0, 10);
  const [contracts, maintenance, reservations, readings] = await Promise.all([
    loadByIds(
      context,
      "contracts",
      "id,vehicle_id,status,start_date,end_date",
      "vehicle_id",
      vehicleIds
    ),
    loadByIds(
      context,
      "vehicle_maintenance",
      "id,vehicle_id,status,started_date,completed_date",
      "vehicle_id",
      vehicleIds
    ),
    loadByIds(
      context,
      "vehicle_reservations",
      "id,vehicle_id,status,start_date,end_date,hold_until",
      "vehicle_id",
      vehicleIds
    ),
    loadByIds(
      context,
      "odometer_readings",
      "id,vehicle_id,odometer_reading,reading_date",
      "vehicle_id",
      vehicleIds
    ),
  ]);
  const contractsByVehicle = groupBy(contracts, (row) => row.vehicle_id);
  const maintenanceByVehicle = groupBy(maintenance, (row) => row.vehicle_id);
  const reservationsByVehicle = groupBy(reservations, (row) => row.vehicle_id);
  const readingsByVehicle = groupBy(readings, (row) => row.vehicle_id);
  const findings: AuditFinding[] = [];

  for (const vehicle of page.rows) {
    const hasActiveContract = (contractsByVehicle.get(vehicle.id) || []).some(
      (contract) =>
        isActiveContractStatus(contract.status) &&
        (!contract.start_date || contract.start_date <= today) &&
        (!contract.end_date || contract.end_date >= today)
    );
    const hasOpenMaintenance = (
      maintenanceByVehicle.get(vehicle.id) || []
    ).some((item) => normalizeStatus(item.status) === "in_progress");
    const hasActiveReservation = (
      reservationsByVehicle.get(vehicle.id) || []
    ).some((reservation) => {
      const status = normalizeStatus(reservation.status);
      return (
        !["cancelled", "canceled", "completed", "expired"].includes(status) &&
        String(reservation.start_date || "").slice(0, 10) <= today &&
        String(reservation.end_date || "").slice(0, 10) >= today
      );
    });
    const expectedStatus = deriveVehicleStatus({
      currentStatus: vehicle.status,
      isActive: vehicle.is_active,
      hasActiveContract,
      hasOpenMaintenance,
      hasActiveReservation,
    });

    if (expectedStatus && normalizeStatus(vehicle.status) !== expectedStatus) {
      findings.push(
        repairFinding({
          dedupeKey: `vehicle:${vehicle.id}:status`,
          code: "fleet.vehicle_status_mismatch",
          severity: "high",
          entityType: "vehicle",
          entityId: vehicle.id,
          title: "Vehicle operational status is stale",
          details:
            "Status does not match active contracts, maintenance, and reservations.",
          evidence: {
            currentStatus: vehicle.status,
            expectedStatus,
            hasActiveContract,
            hasOpenMaintenance,
            hasActiveReservation,
          },
          command: "vehicle.sync_status",
          expectedBefore: { status: vehicle.status },
          values: { status: expectedStatus },
        })
      );
    }

    const readingValues = (readingsByVehicle.get(vehicle.id) || []).map(
      (reading) => Number(reading.odometer_reading || 0)
    );
    const maximum = Math.max(
      0,
      Number(vehicle.current_mileage || 0),
      Number(vehicle.odometer_reading || 0),
      ...readingValues
    );
    if (
      moneyDiffers(vehicle.current_mileage, maximum) ||
      moneyDiffers(vehicle.odometer_reading, maximum)
    ) {
      findings.push(
        repairFinding({
          dedupeKey: `vehicle:${vehicle.id}:mileage`,
          code: "fleet.vehicle_mileage_mismatch",
          severity: "medium",
          entityType: "vehicle",
          entityId: vehicle.id,
          title: "Vehicle mileage fields are inconsistent",
          details:
            "Mileage can be synchronized to the greatest verified reading without decreasing it.",
          evidence: {
            currentMileage: vehicle.current_mileage,
            odometerReading: vehicle.odometer_reading,
            maximumVerified: maximum,
          },
          command: "vehicle.sync_mileage",
          expectedBefore: {
            current_mileage: vehicle.current_mileage,
            odometer_reading: vehicle.odometer_reading,
          },
          values: { current_mileage: maximum, odometer_reading: maximum },
        })
      );
    }
  }

  return pageResult(page, findings);
}

async function auditCustomers(
  context: WorkerContext
): Promise<WorkerBatchResult> {
  const page = await loadCompanyPage(
    context,
    "customers",
    "id,company_id,customer_code,phone,national_id,is_active,is_blacklisted"
  );
  const customerIds = page.rows.map((row) => row.id);
  if (customerIds.length === 0) return pageResult(page, []);

  const nationalIds = page.rows.map((row) => row.national_id).filter(Boolean);
  const paymentColumns =
    "id,company_id,customer_id,contract_id,invoice_id,amount,payment_date,payment_status,transaction_type,created_at";
  const [invoices, payments, balances, contracts, duplicateNationalRows] =
    await Promise.all([
      loadByIds(
        context,
        "invoices",
        "id,customer_id,total_amount,due_date,invoice_date,status,payment_status",
        "customer_id",
        customerIds
      ),
      loadByIds(
        context,
        "payments",
        paymentColumns,
        "customer_id",
        customerIds
      ),
      loadByIds(
        context,
        "customer_balances",
        "id,customer_id,current_balance,overdue_amount,days_overdue,last_payment_amount,last_payment_date",
        "customer_id",
        customerIds
      ),
      loadByIds(
        context,
        "contracts",
        "id,customer_id,status,start_date,end_date",
        "customer_id",
        customerIds
      ),
      nationalIds.length > 0
        ? loadByIds(
            context,
            "customers",
            "id,national_id",
            "national_id",
            nationalIds
          )
        : Promise.resolve([]),
    ]);
  const invoiceIds = invoices.map((invoice) => invoice.id);
  const customerPaymentIds = payments.map((payment) => payment.id);
  const [allocationsByInvoice, allocationsByPayment, directInvoicePayments] =
    await Promise.all([
      loadByIds(
        context,
        "payment_allocations",
        "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
        "target_id",
        invoiceIds
      ),
      loadByIds(
        context,
        "payment_allocations",
        "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
        "payment_id",
        customerPaymentIds
      ),
      loadByIds(context, "payments", paymentColumns, "invoice_id", invoiceIds),
    ]);
  const basePayments = [
    ...new Map(
      [...payments, ...directInvoicePayments].map((row) => [row.id, row])
    ).values(),
  ];
  const basePaymentIds = basePayments.map((payment) => payment.id);
  const allocationsByDirectPayment = await loadByIds(
    context,
    "payment_allocations",
    "id,company_id,payment_id,allocation_type,target_id,amount,is_active,allocation_order",
    "payment_id",
    basePaymentIds.filter(
      (paymentId) => !customerPaymentIds.includes(paymentId)
    )
  );
  const allocations = [
    ...new Map(
      [
        ...allocationsByInvoice,
        ...allocationsByPayment,
        ...allocationsByDirectPayment,
      ].map((row) => [row.id, row])
    ).values(),
  ];
  const knownPaymentIds = new Set(basePaymentIds);
  const allocationPaymentIds = allocations
    .map((allocation) => allocation.payment_id)
    .filter((paymentId) => paymentId && !knownPaymentIds.has(paymentId));
  const allocationPayments = await loadByIds(
    context,
    "payments",
    paymentColumns,
    "id",
    allocationPaymentIds
  );
  const allPayments = [
    ...new Map(
      [...basePayments, ...allocationPayments].map((row) => [row.id, row])
    ).values(),
  ];
  const canonicalInvoicePayments = buildCanonicalInvoiceReceiptContributions(
    allPayments,
    allocations
  );
  const invoicesByCustomer = groupBy(invoices, (row) => row.customer_id);
  const paymentsByCustomer = groupBy(payments, (row) => row.customer_id);
  const paymentsByInvoice = groupBy(
    canonicalInvoicePayments,
    (row) => row.invoice_id
  );
  const balancesByCustomer = groupBy(balances, (row) => row.customer_id);
  const contractsByCustomer = groupBy(contracts, (row) => row.customer_id);
  const duplicateNationalIds = groupBy(
    duplicateNationalRows.filter((row) => row.national_id),
    (row) => row.national_id
  );
  const findings: AuditFinding[] = [];
  const today = context.now.toISOString().slice(0, 10);

  for (const customer of page.rows) {
    const customerInvoices = (invoicesByCustomer.get(customer.id) || []).filter(
      isActiveInvoice
    );
    const customerPayments = (paymentsByCustomer.get(customer.id) || []).filter(
      isReceiptPayment
    );
    const balanceRows = balancesByCustomer.get(customer.id) || [];
    const activeInvoiceTotal = roundMoney(
      customerInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.total_amount || 0),
        0
      )
    );
    const completedReceipts = roundMoney(
      customerPayments.reduce(
        (sum, payment) => sum + Number(payment.amount || 0),
        0
      )
    );
    const currentBalance = roundMoney(activeInvoiceTotal - completedReceipts);
    const invoiceStates = customerInvoices.map((invoice) => {
      const paid = deriveFinancialTotals(
        invoice.total_amount,
        paymentsByInvoice.get(invoice.id) || []
      ).paid;
      return {
        invoice,
        balance: roundMoney(
          Math.max(0, Number(invoice.total_amount || 0) - paid)
        ),
        dueDate: String(invoice.due_date || invoice.invoice_date || "").slice(
          0,
          10
        ),
      };
    });
    const overdueInvoices = invoiceStates.filter(
      (state) => state.dueDate < today && state.balance > 0.01
    );
    const overdueAmount = roundMoney(
      overdueInvoices.reduce((sum, state) => sum + state.balance, 0)
    );
    const daysOverdue = maxDaysOverdue(
      overdueInvoices.map((state) => state.dueDate),
      context.now
    );
    const latestPayment = [...customerPayments].sort((left, right) => {
      const byDate = String(right.payment_date || "").localeCompare(
        String(left.payment_date || "")
      );
      if (byDate !== 0) return byDate;
      const byCreatedAt = String(right.created_at || "").localeCompare(
        String(left.created_at || "")
      );
      return byCreatedAt !== 0
        ? byCreatedAt
        : String(right.id || "").localeCompare(String(left.id || ""));
    })[0];

    if (balanceRows.length === 1) {
      const balance = balanceRows[0];
      if (
        moneyDiffers(balance.current_balance, currentBalance) ||
        moneyDiffers(balance.overdue_amount, overdueAmount) ||
        Number(balance.days_overdue || 0) !== daysOverdue ||
        moneyDiffers(balance.last_payment_amount, latestPayment?.amount || 0) ||
        (balance.last_payment_date || null) !==
          (latestPayment?.payment_date || null)
      ) {
        findings.push(
          repairFinding({
            dedupeKey: `customer-balance:${balance.id}:summary`,
            code: "customer.balance_summary_mismatch",
            severity: "high",
            entityType: "customer_balance",
            entityId: balance.id,
            title: "Customer balance summary is stale",
            details:
              "The summary does not match active invoices and completed receipts.",
            evidence: {
              activeInvoiceTotal,
              completedReceipts,
              currentBalance,
              overdueAmount,
              daysOverdue,
            },
            command: "customer.sync_balance",
            expectedBefore: {
              current_balance: balance.current_balance,
              overdue_amount: balance.overdue_amount,
              days_overdue: balance.days_overdue,
              last_payment_amount: balance.last_payment_amount,
              last_payment_date: balance.last_payment_date,
            },
            values: {
              current_balance: currentBalance,
              overdue_amount: overdueAmount,
              days_overdue: daysOverdue,
              last_payment_amount: latestPayment?.amount ?? null,
              last_payment_date: latestPayment?.payment_date ?? null,
            },
          })
        );
      }
    } else if (balanceRows.length === 0) {
      findings.push(
        repairFinding({
          dedupeKey: `customer:${customer.id}:missing-balance-row`,
          code: "customer.balance_summary_missing",
          severity: "high",
          entityType: "customer",
          entityId: customer.id,
          title: "Customer balance summary is missing",
          details:
            "A canonical balance summary can be created from invoices and completed receipts.",
          evidence: {
            activeInvoiceTotal,
            completedReceipts,
            currentBalance,
            overdueAmount,
            daysOverdue,
          },
          command: "customer.create_balance",
          expectedBefore: { exists: false },
          values: {},
        })
      );
    } else {
      findings.push(
        reviewFinding(
          `customer:${customer.id}:duplicate-balance-rows`,
          "customer.balance_summary_duplicate",
          "high",
          "customer",
          customer.id,
          "Customer has duplicate balance summaries",
          "Duplicate balance rows must be consolidated through the customer-account workflow.",
          {
            balanceRowCount: balanceRows.length,
            calculatedBalance: currentBalance,
          }
        )
      );
    }

    if (
      customer.national_id &&
      (duplicateNationalIds.get(customer.national_id) || []).length > 1
    ) {
      findings.push(
        reviewFinding(
          `customer:${customer.id}:duplicate-national-id`,
          "customer.duplicate_national_id",
          "critical",
          "customer",
          customer.id,
          "Customer national ID is duplicated",
          "Customer records require identity verification before any merge.",
          {
            duplicateCount: (
              duplicateNationalIds.get(customer.national_id) || []
            ).length,
          }
        )
      );
    }

    const hasActiveContract = (contractsByCustomer.get(customer.id) || []).some(
      (contract) => isActiveContractStatus(contract.status)
    );
    if (customer.is_active === false && hasActiveContract) {
      findings.push(
        reviewFinding(
          `customer:${customer.id}:inactive-active-contract`,
          "customer.inactive_with_active_contract",
          "high",
          "customer",
          customer.id,
          "Inactive customer has an active contract",
          "The customer or contract lifecycle must be confirmed by an employee.",
          { hasActiveContract: true }
        )
      );
    }
  }

  return pageResult(page, findings);
}

async function auditInventory(
  context: WorkerContext
): Promise<WorkerBatchResult> {
  const cursor = context.job.cursor || {};
  const phase = String(cursor.phase || "levels");

  if (phase === "levels") {
    const page = await loadCompanyPage(
      context,
      "inventory_stock_levels",
      "id,company_id,item_id,warehouse_id,quantity_on_hand,quantity_reserved,quantity_available,last_movement_at",
      String(cursor.lastId || "")
    );
    const itemIds = [...new Set(page.rows.map((row) => row.item_id))];
    const summaries = await loadByIds(
      context,
      "inventory_movement_summary",
      "company_id,item_id,warehouse_id,movement_type,total_quantity,last_movement_date",
      "item_id",
      itemIds
    );
    const summariesByPair = groupBy(
      summaries,
      (row) => `${row.item_id}:${row.warehouse_id}`
    );
    const findings: AuditFinding[] = [];

    for (const level of page.rows) {
      const movements =
        summariesByPair.get(`${level.item_id}:${level.warehouse_id}`) || [];
      const onHand = deriveStockOnHand(
        movements.map((movement) => ({
          movement_type: movement.movement_type,
          quantity: movement.total_quantity,
        }))
      );
      const available = roundMoney(
        onHand - Number(level.quantity_reserved || 0)
      );
      const lastMovementAt = latestTimestamp(
        movements.map((movement) => movement.last_movement_date)
      );
      const invalidDerivedStock = onHand < 0 || available < 0;
      if (
        !invalidDerivedStock &&
        (moneyDiffers(level.quantity_on_hand, onHand) ||
          moneyDiffers(level.quantity_available, available) ||
          timestampsDiffer(level.last_movement_at, lastMovementAt))
      ) {
        findings.push(
          repairFinding({
            dedupeKey: `stock-level:${level.id}:totals`,
            code: "inventory.stock_level_mismatch",
            severity: onHand < 0 ? "critical" : "high",
            entityType: "inventory_stock_level",
            entityId: level.id,
            title: "Inventory stock level is stale",
            details: "Stored stock does not match the movement ledger.",
            evidence: {
              calculatedOnHand: onHand,
              reserved: roundMoney(level.quantity_reserved),
              calculatedAvailable: available,
            },
            command: "inventory.sync_stock_level",
            expectedBefore: {
              quantity_on_hand: level.quantity_on_hand,
              quantity_available: level.quantity_available,
              last_movement_at: level.last_movement_at,
            },
            values: {
              quantity_on_hand: onHand,
              quantity_available: available,
              last_movement_at: lastMovementAt,
            },
          })
        );
      }
      if (invalidDerivedStock) {
        findings.push(
          reviewFinding(
            `stock-level:${level.id}:negative`,
            "inventory.negative_stock",
            "critical",
            "inventory_stock_level",
            level.id,
            "Inventory ledger produces negative available stock",
            "The underlying movement or reservation must be corrected before the stored stock level can be synchronized.",
            {
              calculatedOnHand: onHand,
              reserved: roundMoney(level.quantity_reserved),
              calculatedAvailable: available,
            }
          )
        );
      }
    }

    return {
      findings,
      cursor: page.hasMore
        ? { phase: "levels", lastId: page.nextLastId }
        : { phase: "missing", lastId: "" },
      hasMore: true,
      scanned: page.rows.length,
      stats: { stockLevelsScanned: page.rows.length },
    };
  }

  const page = await loadCompanyPage(
    context,
    "inventory_movements",
    "id,company_id,item_id,warehouse_id,movement_type,quantity,movement_date",
    String(cursor.lastId || "")
  );
  const pairs = new Map<string, { itemId: string; warehouseId: string }>();
  for (const movement of page.rows) {
    pairs.set(`${movement.item_id}:${movement.warehouse_id}`, {
      itemId: movement.item_id,
      warehouseId: movement.warehouse_id,
    });
  }
  const itemIds = [...new Set([...pairs.values()].map((pair) => pair.itemId))];
  const [levels, summaries] = await Promise.all([
    loadByIds(
      context,
      "inventory_stock_levels",
      "id,item_id,warehouse_id",
      "item_id",
      itemIds
    ),
    loadByIds(
      context,
      "inventory_movement_summary",
      "item_id,warehouse_id,movement_type,total_quantity,last_movement_date",
      "item_id",
      itemIds
    ),
  ]);
  const existingPairs = new Set(
    levels.map((level) => `${level.item_id}:${level.warehouse_id}`)
  );
  const summariesByPair = groupBy(
    summaries,
    (row) => `${row.item_id}:${row.warehouse_id}`
  );
  const findings: AuditFinding[] = [];

  for (const [pairKey, pair] of pairs.entries()) {
    if (existingPairs.has(pairKey)) continue;
    const pairSummaries = summariesByPair.get(pairKey) || [];
    const onHand = deriveStockOnHand(
      pairSummaries.map((movement) => ({
        movement_type: movement.movement_type,
        quantity: movement.total_quantity,
      }))
    );
    const lastMovementAt = latestTimestamp(
      pairSummaries.map((movement) => movement.last_movement_date)
    );
    if (onHand < 0) {
      findings.push(
        reviewFinding(
          `stock-level:${pairKey}:missing-negative`,
          "inventory.missing_stock_level_negative_ledger",
          "critical",
          "inventory_stock_pair",
          pairKey,
          "Missing stock level has a negative movement balance",
          "The movement ledger must be corrected before a non-negative stock-level row can be created.",
          {
            itemId: pair.itemId,
            warehouseId: pair.warehouseId,
            calculatedOnHand: onHand,
          }
        )
      );
    } else {
      findings.push(
        repairFinding({
          dedupeKey: `stock-level:${pairKey}:missing`,
          code: "inventory.missing_stock_level",
          severity: "high",
          entityType: "inventory_stock_pair",
          entityId: pairKey,
          title: "Inventory stock level row is missing",
          details:
            "Movements exist for an item and warehouse without a derived stock-level row.",
          evidence: {
            itemId: pair.itemId,
            warehouseId: pair.warehouseId,
            calculatedOnHand: onHand,
          },
          command: "inventory.create_stock_level",
          expectedBefore: { exists: false },
          values: {
            item_id: pair.itemId,
            warehouse_id: pair.warehouseId,
            quantity_on_hand: onHand,
            quantity_reserved: 0,
            quantity_available: onHand,
            last_movement_at: lastMovementAt,
          },
        })
      );
    }
  }

  return pageResult(
    page,
    findings,
    { phase: "missing", lastId: page.nextLastId },
    { movementsScanned: page.rows.length }
  );
}

async function auditLegal(context: WorkerContext): Promise<WorkerBatchResult> {
  const page = await loadCompanyPage(
    context,
    "legal_cases",
    "id,company_id,case_number,case_status,contract_id,total_costs,legal_fees,court_fees,other_expenses,outcome_date,outcome_type"
  );
  const caseIds = page.rows.map((row) => row.id);
  const contractIds = page.rows.map((row) => row.contract_id).filter(Boolean);
  const [contracts, payments] = await Promise.all([
    loadByIds(context, "contracts", "id,company_id,status", "id", contractIds),
    loadByIds(
      context,
      "legal_case_payments",
      "id,case_id,amount,payment_status,invoice_id,journal_entry_id,payment_date",
      "case_id",
      caseIds
    ),
  ]);
  const contractById = new Map(
    contracts.map((contract) => [contract.id, contract])
  );
  const paymentsByCase = groupBy(payments, (payment) => payment.case_id);
  const findings: AuditFinding[] = [];

  for (const legalCase of page.rows) {
    const totalCosts = deriveLegalCaseCosts(legalCase);
    if (moneyDiffers(legalCase.total_costs, totalCosts)) {
      findings.push(
        repairFinding({
          dedupeKey: `legal-case:${legalCase.id}:costs`,
          code: "legal.case_costs_mismatch",
          severity: "high",
          entityType: "legal_case",
          entityId: legalCase.id,
          title: "Legal case total costs are stale",
          details:
            "Total costs do not equal legal fees, court fees, and other expenses.",
          evidence: {
            legalFees: legalCase.legal_fees,
            courtFees: legalCase.court_fees,
            otherExpenses: legalCase.other_expenses,
            calculatedTotal: totalCosts,
          },
          command: "legal.sync_case_costs",
          expectedBefore: { total_costs: legalCase.total_costs },
          values: { total_costs: totalCosts },
        })
      );
    }

    if (legalCase.contract_id && !contractById.has(legalCase.contract_id)) {
      findings.push(
        reviewFinding(
          `legal-case:${legalCase.id}:broken-contract-link`,
          "legal.broken_contract_link",
          "critical",
          "legal_case",
          legalCase.id,
          "Legal case points to a missing contract",
          "Legal evidence links must be verified before relinking.",
          { contractId: legalCase.contract_id }
        )
      );
    }
    if (
      ["closed", "resolved", "won", "lost", "settled"].includes(
        normalizeStatus(legalCase.case_status)
      ) &&
      !legalCase.outcome_date
    ) {
      findings.push(
        reviewFinding(
          `legal-case:${legalCase.id}:missing-outcome`,
          "legal.closed_case_missing_outcome",
          "high",
          "legal_case",
          legalCase.id,
          "Closed legal case has no outcome record",
          "The outcome date and type require legal staff confirmation.",
          {
            caseStatus: legalCase.case_status,
            outcomeType: legalCase.outcome_type,
          }
        )
      );
    }
    for (const payment of paymentsByCase.get(legalCase.id) || []) {
      if (!isCompletedPayment(payment.payment_status)) continue;
      if (!payment.invoice_id || !payment.journal_entry_id) {
        findings.push(
          reviewFinding(
            `legal-payment:${payment.id}:financial-links`,
            "legal.completed_payment_missing_financial_link",
            "critical",
            "legal_case_payment",
            payment.id,
            "Completed legal payment is missing accounting links",
            "Invoice and journal links require the legal payment accounting workflow.",
            {
              invoiceId: payment.invoice_id,
              journalEntryId: payment.journal_entry_id,
              amount: roundMoney(payment.amount),
            }
          )
        );
      }
    }
  }

  return pageResult(page, findings);
}

async function auditEmployees(
  context: WorkerContext
): Promise<WorkerBatchResult> {
  const page = await loadCompanyPage(
    context,
    "employees",
    "id,company_id,employee_number,is_active,account_status,termination_date,basic_salary,allowances"
  );
  const employeeIds = page.rows.map((row) => row.id);
  if (employeeIds.length === 0) return pageResult(page, []);

  const [attendance, leaveBalances, leaveRequests, payrollRows] =
    await Promise.all([
      loadByIds(
        context,
        "attendance_records",
        "id,employee_id,attendance_date,check_in_time,check_out_time,break_start_time,break_end_time,total_hours,is_approved",
        "employee_id",
        employeeIds,
        false
      ),
      loadByIds(
        context,
        "leave_balances",
        "id,employee_id,leave_type_id,year,total_days,used_days,remaining_days",
        "employee_id",
        employeeIds,
        false
      ),
      loadByIds(
        context,
        "leave_requests",
        "id,employee_id,leave_type_id,start_date,end_date,total_days,status",
        "employee_id",
        employeeIds,
        false
      ),
      loadByIds(
        context,
        "payroll",
        "id,employee_id,status,payroll_date,basic_salary,allowances,overtime_amount,deductions,tax_amount,net_amount,journal_entry_id",
        "employee_id",
        employeeIds
      ),
    ]);
  const attendanceByEmployee = groupBy(attendance, (row) => row.employee_id);
  const balancesByEmployee = groupBy(leaveBalances, (row) => row.employee_id);
  const requestsByEmployee = groupBy(leaveRequests, (row) => row.employee_id);
  const payrollByEmployee = groupBy(payrollRows, (row) => row.employee_id);
  const findings: AuditFinding[] = [];
  const today = context.now.toISOString().slice(0, 10);

  for (const employee of page.rows) {
    if (
      employee.is_active !== false &&
      employee.termination_date &&
      employee.termination_date <= today
    ) {
      findings.push(
        repairFinding({
          dedupeKey: `employee:${employee.id}:active-status`,
          code: "employee.terminated_still_active",
          severity: "high",
          entityType: "employee",
          entityId: employee.id,
          title: "Terminated employee remains active",
          details:
            "Termination date has passed, so access-related employee state can be deactivated.",
          evidence: { terminationDate: employee.termination_date },
          command: "employee.sync_active_status",
          expectedBefore: {
            is_active: employee.is_active,
            account_status: employee.account_status,
          },
          values: { is_active: false, account_status: "inactive" },
        })
      );
    }

    for (const record of attendanceByEmployee.get(employee.id) || []) {
      if (record.is_approved || !record.check_in_time || !record.check_out_time)
        continue;
      const totalHours = deriveAttendanceHours({
        checkIn: combineDateTime(record.attendance_date, record.check_in_time),
        checkOut: combineDateTime(
          record.attendance_date,
          record.check_out_time
        ),
        breakStart: combineDateTime(
          record.attendance_date,
          record.break_start_time
        ),
        breakEnd: combineDateTime(
          record.attendance_date,
          record.break_end_time
        ),
      });
      if (
        totalHours !== null &&
        Math.abs(Number(record.total_hours || 0) - totalHours) > 0.01
      ) {
        findings.push(
          repairFinding({
            dedupeKey: `attendance:${record.id}:hours`,
            code: "employee.attendance_hours_mismatch",
            severity: "medium",
            entityType: "attendance_record",
            entityId: record.id,
            title: "Attendance total hours are stale",
            details:
              "Unapproved attendance hours can be recalculated from check-in, check-out, and break times.",
            evidence: {
              attendanceDate: record.attendance_date,
              calculatedHours: totalHours,
            },
            command: "employee.sync_attendance_hours",
            expectedBefore: { total_hours: record.total_hours },
            values: { total_hours: totalHours },
          })
        );
      }
    }

    const employeeRequests = requestsByEmployee.get(employee.id) || [];
    for (const balance of balancesByEmployee.get(employee.id) || []) {
      const usedDays = roundMoney(
        employeeRequests
          .filter(
            (request) =>
              normalizeStatus(request.status) === "approved" &&
              request.leave_type_id === balance.leave_type_id &&
              Number(String(request.start_date || "").slice(0, 4)) ===
                Number(balance.year)
          )
          .reduce((sum, request) => sum + Number(request.total_days || 0), 0)
      );
      const remainingDays = roundMoney(
        Math.max(0, Number(balance.total_days || 0) - usedDays)
      );
      if (
        moneyDiffers(balance.used_days, usedDays) ||
        moneyDiffers(balance.remaining_days, remainingDays)
      ) {
        findings.push(
          repairFinding({
            dedupeKey: `leave-balance:${balance.id}:totals`,
            code: "employee.leave_balance_mismatch",
            severity: "high",
            entityType: "leave_balance",
            entityId: balance.id,
            title: "Employee leave balance is stale",
            details:
              "Used and remaining days do not match approved leave requests.",
            evidence: {
              year: balance.year,
              totalDays: balance.total_days,
              calculatedUsed: usedDays,
              calculatedRemaining: remainingDays,
            },
            command: "employee.sync_leave_balance",
            expectedBefore: {
              used_days: balance.used_days,
              remaining_days: balance.remaining_days,
            },
            values: { used_days: usedDays, remaining_days: remainingDays },
          })
        );
      }
      if (usedDays > Number(balance.total_days || 0)) {
        findings.push(
          reviewFinding(
            `leave-balance:${balance.id}:overused`,
            "employee.leave_balance_overused",
            "high",
            "leave_balance",
            balance.id,
            "Approved leave exceeds the annual balance",
            "The derived balance can be synchronized, but the excess leave requires HR review.",
            { totalDays: balance.total_days, usedDays }
          )
        );
      }
    }

    for (const payroll of payrollByEmployee.get(employee.id) || []) {
      if (
        ["paid", "posted", "approved", "completed"].includes(
          normalizeStatus(payroll.status)
        )
      )
        continue;
      const netAmount = derivePayrollNet(payroll);
      if (moneyDiffers(payroll.net_amount, netAmount)) {
        if (netAmount < 0 || payroll.journal_entry_id) {
          findings.push(
            reviewFinding(
              `payroll:${payroll.id}:net-review`,
              netAmount < 0
                ? "employee.payroll_negative_net"
                : "employee.payroll_journal_linked_mismatch",
              "critical",
              "payroll",
              payroll.id,
              netAmount < 0
                ? "Payroll components produce a negative net amount"
                : "Journal-linked payroll net amount is inconsistent",
              netAmount < 0
                ? "Deductions and tax require HR review before the payroll can be recalculated."
                : "The linked journal must be reviewed before changing the payroll amount.",
              {
                calculatedNet: netAmount,
                journalEntryId: payroll.journal_entry_id,
              }
            )
          );
        } else {
          findings.push(
            repairFinding({
              dedupeKey: `payroll:${payroll.id}:net`,
              code: "employee.payroll_net_mismatch",
              severity: "high",
              entityType: "payroll",
              entityId: payroll.id,
              title: "Unposted payroll net amount is stale",
              details:
                "Net amount does not match salary, allowances, overtime, deductions, and tax.",
              evidence: { calculatedNet: netAmount },
              command: "employee.sync_payroll_net",
              expectedBefore: { net_amount: payroll.net_amount },
              values: { net_amount: netAmount },
            })
          );
        }
      }
    }
  }

  return pageResult(page, findings);
}

async function loadCompanyPage(
  context: WorkerContext,
  table: string,
  columns: string,
  lastId = String(context.job.cursor?.lastId || ""),
  pageSize = context.job.batch_size
) {
  let query = context.supabase
    .from(table)
    .select(columns)
    .eq("company_id", context.job.company_id)
    .order("id", { ascending: true })
    .limit(pageSize + 1);
  if (lastId) query = query.gt("id", lastId);
  const { data, error } = await query;
  if (error) throw new Error(`${table}: ${error.message}`);
  const received = data || [];
  const rows = received.slice(0, pageSize);
  return {
    rows,
    hasMore: received.length > pageSize,
    nextLastId: rows.at(-1)?.id || lastId,
  };
}

async function loadByIds(
  context: WorkerContext,
  table: string,
  columns: string,
  field: string,
  ids: unknown[],
  filterCompany = true
): Promise<Row[]> {
  if (ids.length === 0) return [];
  const uniqueIds = [
    ...new Set(
      ids.filter(
        (value) => value !== null && value !== undefined && value !== ""
      )
    ),
  ];
  const rows: Row[] = [];
  for (let index = 0; index < uniqueIds.length; index += 20) {
    let query = context.supabase
      .from(table)
      .select(columns)
      .in(field, uniqueIds.slice(index, index + 20));
    if (filterCompany) query = query.eq("company_id", context.job.company_id);
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
  }
  return rows;
}

function pageResult(
  page: { rows: Row[]; hasMore: boolean; nextLastId: string },
  findings: AuditFinding[],
  cursor: Record<string, unknown> = { lastId: page.nextLastId },
  stats: Record<string, number> = {}
): WorkerBatchResult {
  return {
    findings,
    cursor,
    hasMore: page.hasMore,
    scanned: page.rows.length,
    stats,
  };
}

function repairFinding(input: {
  dedupeKey: string;
  code: string;
  severity: AuditFinding["severity"];
  entityType: string;
  entityId: string;
  title: string;
  details: string;
  evidence: Record<string, unknown>;
  command: string;
  expectedBefore: Record<string, unknown>;
  values: Record<string, unknown>;
  confidence?: number;
}): AuditFinding {
  return {
    dedupeKey: input.dedupeKey,
    code: input.code,
    severity: input.severity,
    entityType: input.entityType,
    entityId: input.entityId,
    title: input.title,
    details: input.details,
    evidence: input.evidence,
    confidence: input.confidence ?? 1,
    repair: {
      command: input.command,
      entityType: input.entityType,
      entityId: input.entityId,
      expectedBefore: input.expectedBefore,
      values: input.values,
      autoApply: true,
    },
  };
}

function reviewFinding(
  dedupeKey: string,
  code: string,
  severity: AuditFinding["severity"],
  entityType: string,
  entityId: string,
  title: string,
  details: string,
  evidence: Record<string, unknown>
): AuditFinding {
  return {
    dedupeKey,
    code,
    severity,
    entityType,
    entityId,
    title,
    details,
    evidence,
    confidence: 1,
    needsAiTriage: true,
  };
}

function groupBy(
  rows: Row[],
  keySelector: (row: Row) => string
): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>();
  for (const row of rows) {
    const key = keySelector(row);
    if (!key) continue;
    const existing = grouped.get(key);
    if (existing) existing.push(row);
    else grouped.set(key, [row]);
  }
  return grouped;
}

function isActiveInvoice(invoice: Row): boolean {
  return (
    !["cancelled", "canceled", "void", "voided", "deleted"].includes(
      normalizeStatus(invoice.status)
    ) && !isInactivePaymentStatus(invoice.payment_status)
  );
}

function monthKey(value: unknown): string {
  const text = String(value || "");
  return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7) : "";
}

function invoiceKeepScore(
  invoice: Row,
  paymentsByInvoice: Map<string, Row[]>
): number {
  let score = 0;
  if (invoice.journal_entry_id) score += 100;
  if (
    (paymentsByInvoice.get(invoice.id) || []).some(
      (payment) => !isInactivePaymentStatus(payment.payment_status)
    )
  )
    score += 80;
  if (Number(invoice.paid_amount || 0) > 0) score += 50;
  if (Number(invoice.total_amount || 0) > 0) score += 10;
  return score;
}

function latestDate(values: unknown[]): string | null {
  const dates = values
    .map((value) => String(value || ""))
    .filter(Boolean)
    .sort();
  return dates.at(-1) || null;
}

function latestTimestamp(values: unknown[]): string | null {
  const latest = latestDate(values);
  if (!latest) return null;
  const parsed = new Date(latest);
  return Number.isNaN(parsed.getTime()) ? latest : parsed.toISOString();
}

function timestampsDiffer(left: unknown, right: unknown): boolean {
  if (!left && !right) return false;
  const leftTime = new Date(String(left || "")).getTime();
  const rightTime = new Date(String(right || "")).getTime();
  if (Number.isNaN(leftTime) || Number.isNaN(rightTime))
    return String(left || "") !== String(right || "");
  return leftTime !== rightTime;
}

function combineDateTime(date: unknown, time: unknown): string | null {
  if (!date || !time) return null;
  const timeText = String(time);
  if (timeText.includes("T")) return timeText;
  return `${String(date).slice(0, 10)}T${timeText}`;
}

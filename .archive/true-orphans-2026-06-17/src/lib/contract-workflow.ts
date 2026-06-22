/**
 * Contract Workflow Management System
 *
 * Automated workflows for contract lifecycle management including
 * renewals, terminations, amendments, and compliance validation.
 */

import { addDays, addWeeks, addMonths, addYears, differenceInDays, isBefore, isAfter, startOfDay } from 'date-fns';

export type ContractWorkflowType = 'renewal' | 'termination' | 'amendment' | 'expiration' | 'payment_reminder' | 'compliance_check';
export type WorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type WorkflowPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ContractWorkflow {
  id: string;
  contract_id: string;
  workflow_type: ContractWorkflowType;
  status: WorkflowStatus;
  priority: WorkflowPriority;
  title: string;
  description: string;
  scheduled_date: string;
  due_date: string;
  completed_date?: string;
  assigned_to?: string;
  created_by: string;
  metadata: Record<string, any>;
  steps: WorkflowStep[];
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  order: number;
  assignee?: string;
  due_date?: string;
  completed_date?: string;
  metadata: Record<string, any>;
  dependencies?: string[]; // Step IDs that must be completed first
}

export interface WorkflowTrigger {
  type: 'date_based' | 'event_based' | 'manual';
  conditions: {
    days_before?: number;
    days_after?: number;
    contract_status?: string;
    event_type?: string;
  };
  workflow_config: Partial<ContractWorkflow>;
}

export interface WorkflowExecution {
  workflow_id: string;
  step_id: string;
  status: WorkflowStatus;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  result?: any;
}

export interface ContractWorkflowConfig {
  auto_renewal_enabled: boolean;
  renewal_reminder_days: number[];
  termination_notice_days: number;
  compliance_check_frequency: 'daily' | 'weekly' | 'monthly';
  payment_reminder_days: number[];
  approval_required_for: ContractWorkflowType[];
  escalation_rules: Array<{
    condition: string;
    action: 'escalate' | 'notify' | 'auto_complete';
    recipient: string;
  }>;
}

// Default workflow configuration
const DEFAULT_WORKFLOW_CONFIG: ContractWorkflowConfig = {
  auto_renewal_enabled: true,
  renewal_reminder_days: [90, 60, 30, 7],
  termination_notice_days: 30,
  compliance_check_frequency: 'weekly',
  payment_reminder_days: [7, 3, 1],
  approval_required_for: ['termination', 'amendment'],
  escalation_rules: [
    {
      condition: 'overdue_by_more_than_7_days',
      action: 'escalate',
      recipient: 'manager'
    },
    {
      condition: 'critical_compliance_issue',
      action: 'notify',
      recipient: 'compliance_officer'
    }
  ]
};

/**
 * Contract Workflow Engine Class
 */
export class ContractWorkflowEngine {
  private workflows: Map<string, ContractWorkflow> = new Map();
  private executions: Map<string, WorkflowExecution[]> = new Map();
  private config: ContractWorkflowConfig;
  private isRunning: boolean = false;

  constructor(config: Partial<ContractWorkflowConfig> = {}) {
    this.config = { ...DEFAULT_WORKFLOW_CONFIG, ...config };
  }

  /**
   * Create a new workflow
   */
  createWorkflow(workflowData: Partial<ContractWorkflow>): ContractWorkflow {
    const workflow: ContractWorkflow = {
      id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      contract_id: workflowData.contract_id || '',
      workflow_type: workflowData.workflow_type || 'renewal',
      status: 'pending',
      priority: workflowData.priority || 'medium',
      title: workflowData.title || '',
      description: workflowData.description || '',
      scheduled_date: workflowData.scheduled_date || new Date().toISOString(),
      due_date: workflowData.due_date || addDays(new Date(), 30).toISOString(),
      created_by: workflowData.created_by || '',
      metadata: workflowData.metadata || {},
      steps: workflowData.steps || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  /**
   * Execute workflow steps
   */
  async executeWorkflow(workflowId: string): Promise<WorkflowExecution[]> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (workflow.status !== 'pending') {
      throw new Error(`Workflow ${workflowId} is not in pending status`);
    }

    workflow.status = 'in_progress';
    workflow.updated_at = new Date().toISOString();

    const executions: WorkflowExecution[] = [];

    for (const step of workflow.steps.sort((a, b) => a.order - b.order)) {
      // Check dependencies
      if (step.dependencies) {
        const dependenciesCompleted = step.dependencies.every(depId => {
          const depExecution = executions.find(ex => ex.step_id === depId);
          return depExecution?.status === 'completed';
        });

        if (!dependenciesCompleted) {
          continue; // Skip this step for now
        }
      }

      const execution = await this.executeStep(workflowId, step.id);
      executions.push(execution);

      if (execution.status === 'failed') {
        workflow.status = 'failed';
        break;
      }
    }

    // Check if all steps completed successfully
    const allCompleted = executions.every(ex => ex.status === 'completed');
    if (allCompleted) {
      workflow.status = 'completed';
      workflow.completed_date = new Date().toISOString();
    }

    workflow.updated_at = new Date().toISOString();
    this.executions.set(workflowId, executions);

    return executions;
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(workflowId: string, stepId: string): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    const step = workflow?.steps.find(s => s.id === stepId);

    if (!workflow || !step) {
      throw new Error(`Workflow or step not found`);
    }

    const execution: WorkflowExecution = {
      workflow_id: workflowId,
      step_id: stepId,
      status: 'in_progress',
      started_at: new Date().toISOString()
    };

    try {
      // Execute step based on workflow type and step name
      const result = await this.performStepAction(workflow, step);

      execution.status = 'completed';
      execution.completed_at = new Date().toISOString();
      execution.result = result;

      // Update step status
      step.status = 'completed';
      step.completed_date = execution.completed_at;

    } catch (error) {
      execution.status = 'failed';
      execution.error_message = error instanceof Error ? error.message : 'Unknown error';
      step.status = 'failed';
    }

    return execution;
  }

  /**
   * Perform the actual action for a workflow step
   */
  private async performStepAction(workflow: ContractWorkflow, step: WorkflowStep): Promise<any> {
    switch (workflow.workflow_type) {
      case 'renewal':
        return this.performRenewalAction(workflow, step);

      case 'termination':
        return this.performTerminationAction(workflow, step);

      case 'amendment':
        return this.performAmendmentAction(workflow, step);

      case 'expiration':
        return this.performExpirationAction(workflow, step);

      case 'payment_reminder':
        return this.performPaymentReminderAction(workflow, step);

      case 'compliance_check':
        return this.performComplianceCheckAction(workflow, step);

      default:
        throw new Error(`Unknown workflow type: ${workflow.workflow_type}`);
    }
  }

  /**
   * Perform renewal-related actions
   */
  private async performRenewalAction(workflow: ContractWorkflow, step: WorkflowStep): Promise<any> {
    switch (step.name) {
      case 'send_renewal_notice':
        return this.sendRenewalNotice(workflow.contract_id, step.metadata);

      case 'calculate_new_terms':
        return this.calculateRenewalTerms(workflow.contract_id, step.metadata);

      case 'get_customer_approval':
        return this.requestCustomerApproval(workflow.contract_id, step.metadata);

      case 'generate_renewal_contract':
        return this.generateRenewalContract(workflow.contract_id, step.metadata);

      case 'activate_renewed_contract':
        return this.activateRenewedContract(workflow.contract_id, step.metadata);

      default:
        throw new Error(`Unknown renewal step: ${step.name}`);
    }
  }

  /**
   * Perform termination-related actions
   */
  private async performTerminationAction(workflow: ContractWorkflow, step: WorkflowStep): Promise<any> {
    switch (step.name) {
      case 'calculate_termination_fees':
        return this.calculateTerminationFees(workflow.contract_id, step.metadata);

      case 'send_termination_notice':
        return this.sendTerminationNotice(workflow.contract_id, step.metadata);

      case 'process_final_payment':
        return this.processFinalPayment(workflow.contract_id, step.metadata);

      case 'deactivate_contract':
        return this.deactivateContract(workflow.contract_id, step.metadata);

      case 'archive_contract':
        return this.archiveContract(workflow.contract_id, step.metadata);

      default:
        throw new Error(`Unknown termination step: ${step.name}`);
    }
  }

  /**
   * Perform amendment-related actions
   */
  private async performAmendmentAction(workflow: ContractWorkflow, step: WorkflowStep): Promise<any> {
    switch (step.name) {
      case 'validate_amendment_request':
        return this.validateAmendmentRequest(workflow.contract_id, step.metadata);

      case 'calculate_amendment_impact':
        return this.calculateAmendmentImpact(workflow.contract_id, step.metadata);

      case 'get_approval_for_amendment':
        return this.getAmendmentApproval(workflow.contract_id, step.metadata);

      case 'update_contract_terms':
        return this.updateContractTerms(workflow.contract_id, step.metadata);

      case 'generate_amended_contract':
        return this.generateAmendedContract(workflow.contract_id, step.metadata);

      default:
        throw new Error(`Unknown amendment step: ${step.name}`);
    }
  }

  /**
   * Perform expiration-related actions
   */
  private async performExpirationAction(workflow: ContractWorkflow, step: WorkflowStep): Promise<any> {
    switch (step.name) {
      case 'check_expiration_status':
        return this.checkExpirationStatus(workflow.contract_id);

      case 'send_expiration_notice':
        return this.sendExpirationNotice(workflow.contract_id, step.metadata);

      case 'process_expiration':
        return this.processContractExpiration(workflow.contract_id, step.metadata);

      default:
        throw new Error(`Unknown expiration step: ${step.name}`);
    }
  }

  /**
   * Perform payment reminder actions
   */
  private async performPaymentReminderAction(workflow: ContractWorkflow, step: WorkflowStep): Promise<any> {
    switch (step.name) {
      case 'check_payment_status':
        return this.checkPaymentStatus(workflow.contract_id);

      case 'send_payment_reminder':
        return this.sendPaymentReminder(workflow.contract_id, step.metadata);

      case 'calculate_late_fees':
        return this.calculateLateFees(workflow.contract_id, step.metadata);

      default:
        throw new Error(`Unknown payment reminder step: ${step.name}`);
    }
  }

  /**
   * Perform compliance check actions
   */
  private async performComplianceCheckAction(workflow: ContractWorkflow, step: WorkflowStep): Promise<any> {
    switch (step.name) {
      case 'validate_contract_terms':
        return this.validateContractTerms(workflow.contract_id);

      case 'check_regulatory_compliance':
        return this.checkRegulatoryCompliance(workflow.contract_id);

      case 'generate_compliance_report':
        return this.generateComplianceReport(workflow.contract_id);

      case 'flag_compliance_issues':
        return this.flagComplianceIssues(workflow.contract_id, step.metadata);

      default:
        throw new Error(`Unknown compliance check step: ${step.name}`);
    }
  }

  // Action implementation methods (would integrate with actual systems)
  private async sendRenewalNotice(contractId: string, metadata: any): Promise<any> {
    // Integration with notification system
    return { success: true, message: 'Renewal notice sent' };
  }

  private async calculateRenewalTerms(contractId: string, metadata: any): Promise<any> {
    // Integration with calculation engine
    return { success: true, new_terms: {} };
  }

  private async requestCustomerApproval(contractId: string, metadata: any): Promise<any> {
    // Integration with customer communication system
    return { success: true, approval_pending: true };
  }

  private async generateRenewalContract(contractId: string, metadata: any): Promise<any> {
    // Integration with document generation
    return { success: true, contract_document_id: 'doc_123' };
  }

  private async activateRenewedContract(contractId: string, metadata: any): Promise<any> {
    // Integration with contract management system
    return { success: true, new_contract_id: 'contract_456' };
  }

  private async calculateTerminationFees(contractId: string, metadata: any): Promise<any> {
    // Integration with calculation engine
    return { success: true, termination_fees: 1000 };
  }

  private async sendTerminationNotice(contractId: string, metadata: any): Promise<any> {
    // Integration with notification system
    return { success: true, message: 'Termination notice sent' };
  }

  private async processFinalPayment(contractId: string, metadata: any): Promise<any> {
    // Integration with payment system
    return { success: true, payment_processed: true };
  }

  private async deactivateContract(contractId: string, metadata: any): Promise<any> {
    // Integration with contract management
    return { success: true, contract_deactivated: true };
  }

  private async archiveContract(contractId: string, metadata: any): Promise<any> {
    // Integration with archive system
    return { success: true, contract_archived: true };
  }

  private async validateAmendmentRequest(contractId: string, metadata: any): Promise<any> {
    // Business logic validation
    return { success: true, validation_passed: true };
  }

  private async calculateAmendmentImpact(contractId: string, metadata: any): Promise<any> {
    // Financial impact calculation
    return { success: true, financial_impact: {} };
  }

  private async getAmendmentApproval(contractId: string, metadata: any): Promise<any> {
    // Approval workflow
    return { success: true, approval_granted: true };
  }

  private async updateContractTerms(contractId: string, metadata: any): Promise<any> {
    // Contract update
    return { success: true, terms_updated: true };
  }

  private async generateAmendedContract(contractId: string, metadata: any): Promise<any> {
    // Document generation
    return { success: true, amendment_document_id: 'doc_789' };
  }

  private async checkExpirationStatus(contractId: string): Promise<any> {
    // Expiration check
    return { success: true, expires_in_days: 30 };
  }

  private async sendExpirationNotice(contractId: string, metadata: any): Promise<any> {
    // Notification
    return { success: true, notice_sent: true };
  }

  private async processContractExpiration(contractId: string, metadata: any): Promise<any> {
    // Expiration processing
    return { success: true, contract_expired: true };
  }

  private async checkPaymentStatus(contractId: string): Promise<any> {
    // Payment status check
    return { success: true, payment_status: 'overdue' };
  }

  private async sendPaymentReminder(contractId: string, metadata: any): Promise<any> {
    // Payment reminder
    return { success: true, reminder_sent: true };
  }

  private async calculateLateFees(contractId: string, metadata: any): Promise<any> {
    // Late fee calculation
    return { success: true, late_fees: 50 };
  }

  private async validateContractTerms(contractId: string): Promise<any> {
    // Terms validation
    return { success: true, terms_valid: true };
  }

  private async checkRegulatoryCompliance(contractId: string): Promise<any> {
    // Regulatory compliance check
    return { success: true, compliance_status: 'compliant' };
  }

  private async generateComplianceReport(contractId: string): Promise<any> {
    // Compliance report generation
    return { success: true, report_id: 'report_123' };
  }

  private async flagComplianceIssues(contractId: string, metadata: any): Promise<any> {
    // Compliance issue flagging
    return { success: true, issues_flagged: [] };
  }

  /**
   * Get workflows by contract ID
   */
  getWorkflowsByContract(contractId: string): ContractWorkflow[] {
    return Array.from(this.workflows.values()).filter(w => w.contract_id === contractId);
  }

  /**
   * Get pending workflows
   */
  getPendingWorkflows(): ContractWorkflow[] {
    return Array.from(this.workflows.values()).filter(w => w.status === 'pending');
  }

  /**
   * Get workflow executions
   */
  getWorkflowExecutions(workflowId: string): WorkflowExecution[] {
    return this.executions.get(workflowId) || [];
  }

  /**
   * Get workflow configuration
   */
  getConfig(): ContractWorkflowConfig {
    return { ...this.config };
  }

  /**
   * Update workflow configuration
   */
  updateConfig(newConfig: Partial<ContractWorkflowConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Start the workflow engine (for automated processing)
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.processScheduledWorkflows();
  }

  /**
   * Stop the workflow engine
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Process scheduled workflows
   */
  private async processScheduledWorkflows(): Promise<void> {
    while (this.isRunning) {
      const now = new Date();
      const pendingWorkflows = this.getPendingWorkflows();

      for (const workflow of pendingWorkflows) {
        const scheduledDate = new Date(workflow.scheduled_date);
        if (isAfter(now, scheduledDate) || scheduledDate.getTime() === now.getTime()) {
          try {
            await this.executeWorkflow(workflow.id);
          } catch (error) {
            console.error(`Failed to execute workflow ${workflow.id}:`, error);
          }
        }
      }

      // Check every minute
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
}

/**
 * Create renewal workflow for a contract
 */
export function createRenewalWorkflow(
  contractId: string,
  renewalDate: string,
  createdBy: string
): Partial<ContractWorkflow> {
  return {
    contract_id: contractId,
    workflow_type: 'renewal',
    title: 'Contract Renewal',
    description: 'Automated contract renewal process',
    priority: 'high',
    scheduled_date: addDays(new Date(renewalDate), -90).toISOString(),
    due_date: renewalDate,
    created_by: createdBy,
    steps: [
      {
        id: 'step_1',
        name: 'send_renewal_notice',
        description: 'Send renewal notice to customer',
        status: 'pending',
        order: 1,
        metadata: { notice_period_days: 90 }
      },
      {
        id: 'step_2',
        name: 'calculate_new_terms',
        description: 'Calculate renewal terms and pricing',
        status: 'pending',
        order: 2,
        dependencies: ['step_1']
      },
      {
        id: 'step_3',
        name: 'get_customer_approval',
        description: 'Obtain customer approval for renewal',
        status: 'pending',
        order: 3,
        dependencies: ['step_2']
      },
      {
        id: 'step_4',
        name: 'generate_renewal_contract',
        description: 'Generate renewed contract document',
        status: 'pending',
        order: 4,
        dependencies: ['step_3']
      },
      {
        id: 'step_5',
        name: 'activate_renewed_contract',
        description: 'Activate the renewed contract',
        status: 'pending',
        order: 5,
        dependencies: ['step_4']
      }
    ]
  };
}

/**
 * Create termination workflow for a contract
 */
export function createTerminationWorkflow(
  contractId: string,
  terminationDate: string,
  createdBy: string,
  reason: string
): Partial<ContractWorkflow> {
  return {
    contract_id: contractId,
    workflow_type: 'termination',
    title: 'Contract Termination',
    description: `Contract termination process: ${reason}`,
    priority: 'critical',
    scheduled_date: new Date().toISOString(),
    due_date: terminationDate,
    created_by: createdBy,
    metadata: { termination_reason: reason },
    steps: [
      {
        id: 'step_1',
        name: 'calculate_termination_fees',
        description: 'Calculate early termination fees',
        status: 'pending',
        order: 1
      },
      {
        id: 'step_2',
        name: 'send_termination_notice',
        description: 'Send termination notice to customer',
        status: 'pending',
        order: 2,
        dependencies: ['step_1']
      },
      {
        id: 'step_3',
        name: 'process_final_payment',
        description: 'Process final payment and settlement',
        status: 'pending',
        order: 3,
        dependencies: ['step_2']
      },
      {
        id: 'step_4',
        name: 'deactivate_contract',
        description: 'Deactivate the contract',
        status: 'pending',
        order: 4,
        dependencies: ['step_3']
      },
      {
        id: 'step_5',
        name: 'archive_contract',
        description: 'Archive contract and related documents',
        status: 'pending',
        order: 5,
        dependencies: ['step_4']
      }
    ]
  };
}

/**
 * Create compliance check workflow
 */
export function createComplianceCheckWorkflow(
  contractId: string,
  createdBy: string
): Partial<ContractWorkflow> {
  return {
    contract_id: contractId,
    workflow_type: 'compliance_check',
    title: 'Contract Compliance Check',
    description: 'Regular compliance validation and reporting',
    priority: 'medium',
    scheduled_date: new Date().toISOString(),
    due_date: addDays(new Date(), 7).toISOString(),
    created_by: createdBy,
    steps: [
      {
        id: 'step_1',
        name: 'validate_contract_terms',
        description: 'Validate contract terms against regulations',
        status: 'pending',
        order: 1
      },
      {
        id: 'step_2',
        name: 'check_regulatory_compliance',
        description: 'Check regulatory compliance requirements',
        status: 'pending',
        order: 2,
        dependencies: ['step_1']
      },
      {
        id: 'step_3',
        name: 'generate_compliance_report',
        description: 'Generate compliance report',
        status: 'pending',
        order: 3,
        dependencies: ['step_2']
      },
      {
        id: 'step_4',
        name: 'flag_compliance_issues',
        description: 'Flag and report any compliance issues',
        status: 'pending',
        order: 4,
        dependencies: ['step_3']
      }
    ]
  };
}
/**
 * Workflow Engine
 * 
 * Central engine for managing approval workflows.
 * Implements State Machine pattern for workflow states.
 */

import { logger } from '@/lib/logger';
import { AppError, ErrorType } from '@/lib/AppError';
import type {
  Workflow,
  WorkflowConfig,
  WorkflowStatus,
  WorkflowStep,
  ApprovalAction
} from './types';

/**
 * Workflow Engine - Singleton
 */
export class WorkflowEngine {
  private static instance: WorkflowEngine;
  private workflows: Map<string, Workflow> = new Map();

  private constructor() {
    logger.info('WorkflowEngine initialized');
  }

  /**
   * Get singleton instance
   */
  static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine();
    }
    return WorkflowEngine.instance;
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(config: WorkflowConfig): Promise<Workflow> {
    try {
      logger.info('Creating workflow', { entityType: config.entity_type, entityId: config.entity_id });

      // Validate config
      this.validateConfig(config);

      // Generate workflow ID
      const workflowId = this.generateWorkflowId();

      // Prepare steps with IDs and status
      const steps: WorkflowStep[] = config.steps.map((step, index) => ({
        ...step,
        id: `${workflowId}-step-${index + 1}`,
        status: WorkflowStatus.PENDING,
        approved_at: null,
        approved_by: null
      }));

      // Create workflow object
      const workflow: Workflow = {
        id: workflowId,
        entity_type: config.entity_type,
        entity_id: config.entity_id,
        company_id: config.company_id,
        steps,
        current_step: 0,
        status: WorkflowStatus.PENDING,
        created_by: config.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        completed_at: null
      };

      // Store workflow
      this.workflows.set(workflowId, workflow);

      // TODO: Persist to database
      // await this.persistWorkflow(workflow);

      // TODO: Notify first approver
      // await this.notifyApprover(workflow, steps[0]);

      logger.info('Workflow created successfully', { workflowId });
      return workflow;
    } catch (error) {
      logger.error('Failed to create workflow', error);
      throw error;
    }
  }

  /**
   * Approve current step
   */
  async approve(action: ApprovalAction): Promise<Workflow> {
    try {
      const workflow = this.workflows.get(action.workflow_id);
      
      if (!workflow) {
        throw AppError.notFound('Workflow', action.workflow_id);
      }

      if (workflow.status !== WorkflowStatus.PENDING && workflow.status !== WorkflowStatus.IN_PROGRESS) {
        throw new AppError(
          ErrorType.BUSINESS_LOGIC,
          'Workflow is not in approvable state',
          { status: workflow.status },
          'هذا الطلب لا يمكن الموافقة عليه في حالته الحالية'
        );
      }

      const currentStep = workflow.steps[workflow.current_step];
      
      // Verify user has permission to approve this step
      this.verifyApprover(currentStep, action.user_id);

      // Update current step
      currentStep.status = WorkflowStatus.APPROVED;
      currentStep.approved_by = action.user_id;
      currentStep.approved_at = new Date().toISOString();
      currentStep.comments = action.comments || null;

      // Move to next step or complete
      if (workflow.current_step < workflow.steps.length - 1) {
        workflow.current_step++;
        workflow.status = WorkflowStatus.IN_PROGRESS;
        
        const nextStep = workflow.steps[workflow.current_step];
        
        // TODO: Notify next approver
        // await this.notifyApprover(workflow, nextStep);
        
        logger.info('Workflow advanced to next step', {
          workflowId: workflow.id,
          step: workflow.current_step + 1
        });
      } else {
        // All steps approved
        workflow.status = WorkflowStatus.APPROVED;
        workflow.completed_at = new Date().toISOString();
        
        // TODO: Execute approved action
        // await this.executeApprovedAction(workflow);
        
        logger.info('Workflow completed', { workflowId: workflow.id });
      }

      workflow.updated_at = new Date().toISOString();

      // TODO: Persist changes
      // await this.updateWorkflow(workflow);

      return workflow;
    } catch (error) {
      logger.error('Failed to approve workflow', error);
      throw error;
    }
  }

  /**
   * Reject current step
   */
  async reject(action: ApprovalAction & { reason: string }): Promise<Workflow> {
    try {
      const workflow = this.workflows.get(action.workflow_id);
      
      if (!workflow) {
        throw AppError.notFound('Workflow', action.workflow_id);
      }

      const currentStep = workflow.steps[workflow.current_step];
      
      // Verify user has permission to reject
      this.verifyApprover(currentStep, action.user_id);

      // Update current step
      currentStep.status = WorkflowStatus.REJECTED;
      currentStep.approved_by = action.user_id;
      currentStep.approved_at = new Date().toISOString();
      currentStep.comments = action.reason;

      // Mark workflow as rejected
      workflow.status = WorkflowStatus.REJECTED;
      workflow.updated_at = new Date().toISOString();

      // TODO: Notify requestor
      // await this.notifyRequestor(workflow);

      // TODO: Persist changes
      // await this.updateWorkflow(workflow);

      logger.info('Workflow rejected', {
        workflowId: workflow.id,
        reason: action.reason
      });

      return workflow;
    } catch (error) {
      logger.error('Failed to reject workflow', error);
      throw error;
    }
  }

  /**
   * Cancel workflow
   */
  async cancel(workflowId: string, userId: string, reason: string): Promise<Workflow> {
    try {
      const workflow = this.workflows.get(workflowId);
      
      if (!workflow) {
        throw AppError.notFound('Workflow', workflowId);
      }

      // Only creator or admin can cancel
      if (workflow.created_by !== userId) {
        // TODO: Check if user is admin
        throw AppError.unauthorized('cancel workflow');
      }

      workflow.status = WorkflowStatus.CANCELLED;
      workflow.updated_at = new Date().toISOString();
      workflow.completed_at = new Date().toISOString();

      // Add cancellation note to current step
      if (workflow.steps[workflow.current_step]) {
        workflow.steps[workflow.current_step].comments = `ملغى: ${reason}`;
      }

      logger.info('Workflow cancelled', { workflowId, reason });
      return workflow;
    } catch (error) {
      logger.error('Failed to cancel workflow', error);
      throw error;
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<Workflow | null> {
    return this.workflows.get(workflowId) || null;
  }

  /**
   * Get workflows by company
   */
  async getWorkflowsByCompany(companyId: string): Promise<Workflow[]> {
    return Array.from(this.workflows.values())
      .filter(w => w.company_id === companyId);
  }

  /**
   * Get pending approvals for user
   */
  async getPendingApprovalsForUser(userId: string, userRoles: string[]): Promise<Workflow[]> {
    return Array.from(this.workflows.values())
      .filter(workflow => {
        if (workflow.status !== WorkflowStatus.PENDING && workflow.status !== WorkflowStatus.IN_PROGRESS) {
          return false;
        }

        const currentStep = workflow.steps[workflow.current_step];
        
        // Check if user is assigned approver
        if (currentStep.approver_user_id === userId) {
          return true;
        }

        // Check if user has required role
        if (currentStep.approver_role && currentStep.approver_role.length > 0) {
          return currentStep.approver_role.some(role => userRoles.includes(role));
        }

        return false;
      });
  }

  // ============ Helper Methods ============

  private validateConfig(config: WorkflowConfig): void {
    if (!config.entity_type) {
      throw new AppError(ErrorType.VALIDATION, 'Entity type is required');
    }
    if (!config.entity_id) {
      throw new AppError(ErrorType.VALIDATION, 'Entity ID is required');
    }
    if (!config.company_id) {
      throw new AppError(ErrorType.VALIDATION, 'Company ID is required');
    }
    if (!config.steps || config.steps.length === 0) {
      throw new AppError(ErrorType.VALIDATION, 'At least one workflow step is required');
    }
  }

  private verifyApprover(step: WorkflowStep, userId: string): void {
    // If specific user assigned, must be that user
    if (step.approver_user_id && step.approver_user_id !== userId) {
      throw AppError.unauthorized('approve this step (assigned to different user)');
    }

    // TODO: Check if user has required role
    // For now, just pass
  }

  private generateWorkflowId(): string {
    return `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const workflowEngine = WorkflowEngine.getInstance();


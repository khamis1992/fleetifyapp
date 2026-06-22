/**
 * Workflows Index
 * 
 * Central export point for workflow system.
 */

// Core
export { WorkflowEngine, workflowEngine } from './WorkflowEngine';
export * from './types';
export * from './templates';

/**
 * Usage Example:
 * 
 * import { workflowEngine, contractApprovalTemplate } from '@/workflows';
 * 
 * // Create a workflow
 * const workflow = await workflowEngine.createWorkflow({
 *   entity_type: WorkflowEntityType.CONTRACT,
 *   entity_id: contractId,
 *   company_id: companyId,
 *   steps: contractApprovalTemplate.steps,
 *   created_by: userId
 * });
 * 
 * // Approve
 * await workflowEngine.approve({
 *   workflow_id: workflow.id,
 *   user_id: userId,
 *   comments: 'موافق'
 * });
 */


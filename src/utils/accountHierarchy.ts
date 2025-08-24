/**
 * Utility functions for account hierarchy management
 */

export interface AccountHierarchyNode {
  id: string;
  code: string;
  name: string;
  level: number;
  isHeader: boolean;
  parentId?: string;
  children: AccountHierarchyNode[];
}

/**
 * Check if assigning a new parent would create a circular reference
 */
export const wouldCreateCircularReference = (
  accountId: string,
  newParentId: string,
  accounts: any[]
): boolean => {
  if (accountId === newParentId) return true;
  
  let current = accounts.find(acc => acc.id === newParentId);
  const visited = new Set([accountId]);
  
  while (current && current.parent_account_id) {
    if (visited.has(current.parent_account_id)) return true;
    visited.add(current.parent_account_id);
    current = accounts.find(acc => acc.id === current.parent_account_id);
  }
  
  return false;
};

/**
 * Build the complete path from root to account
 */
export const buildAccountPath = (accountId: string, accounts: any[]): string[] => {
  const path: string[] = [];
  let current = accounts.find(acc => acc.id === accountId);
  
  while (current) {
    const displayName = current.account_name_ar || current.account_name || current.account_code;
    path.unshift(displayName);
    
    if (!current.parent_account_id) break;
    current = accounts.find(acc => acc.id === current.parent_account_id);
  }
  
  return path;
};

/**
 * Calculate the level of an account based on its parent hierarchy
 */
export const calculateAccountLevel = (accountId: string, accounts: any[]): number => {
  const path = buildAccountPath(accountId, accounts);
  return path.length;
};

/**
 * Get all descendants of an account
 */
export const getAccountDescendants = (accountId: string, accounts: any[]): any[] => {
  const descendants: any[] = [];
  const children = accounts.filter(acc => acc.parent_account_id === accountId);
  
  for (const child of children) {
    descendants.push(child);
    descendants.push(...getAccountDescendants(child.id, accounts));
  }
  
  return descendants;
};

/**
 * Check if an account can be moved to a new parent
 */
export const canMoveAccount = (
  accountId: string,
  newParentId: string | null,
  accounts: any[]
): { canMove: boolean; reason?: string } => {
  // Check for circular reference
  if (newParentId && wouldCreateCircularReference(accountId, newParentId, accounts)) {
    return {
      canMove: false,
      reason: 'لا يمكن نقل الحساب تحت أحد الحسابات الفرعية التابعة له (مرجع دائري)'
    };
  }
  
  // Check if account has journal entries (should remain flexible)
  // This would be implemented based on business rules
  
  return { canMove: true };
};

/**
 * Validate account hierarchy integrity
 */
export const validateAccountHierarchy = (accounts: any[]): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  
  for (const account of accounts) {
    if (account.parent_account_id) {
      const parent = accounts.find(acc => acc.id === account.parent_account_id);
      
      if (!parent) {
        errors.push(`الحساب ${account.account_code} يشير إلى حساب أب غير موجود`);
        continue;
      }
      
      if (wouldCreateCircularReference(account.id, account.parent_account_id, accounts)) {
        errors.push(`الحساب ${account.account_code} يحتوي على مرجع دائري`);
      }
      
      // Check account level consistency
      const expectedLevel = calculateAccountLevel(account.id, accounts);
      if (account.account_level && account.account_level !== expectedLevel) {
        errors.push(`مستوى الحساب ${account.account_code} غير متطابق مع الهيكل الهرمي`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
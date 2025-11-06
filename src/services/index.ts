/**
 * Services Index
 * 
 * Central export point for all services.
 * Import services from here for consistency.
 */

// Core
export { BaseService } from './core/BaseService';
export { BaseRepository } from './core/BaseRepository';
export type { ServiceOptions, ValidationResult } from './core/BaseService';
export type { QueryOptions, PaginatedResult } from './core/BaseRepository';

// Services
export { ContractService, contractService } from './ContractService';
export { PaymentService, paymentService } from './PaymentService';
export { InvoiceService, invoiceService } from './InvoiceService';

// Repositories
export { ContractRepository } from './repositories/ContractRepository';
export { PaymentRepository } from './repositories/PaymentRepository';
export { InvoiceRepository } from './repositories/InvoiceRepository';

/**
 * Usage Examples:
 * 
 * // Use singleton instances (recommended)
 * import { contractService } from '@/services';
 * const contract = await contractService.createContract(data, userId, companyId);
 * 
 * // Or create new instances if needed
 * import { ContractService } from '@/services';
 * const customService = new ContractService();
 */


import { InventoryItem } from '@/hooks/useInventoryItems';

export interface Supplier {
  id: string;
  companyName: string;
  companyNameAr?: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxNumber?: string;
  commercialRegister?: string;
  paymentTerms: string; // NET30, NET60, etc.
  deliveryTerms: string;
  rating: number; // 1-5 rating
  isActive: boolean;
  categories: string[]; // Product categories they supply
  leadTimeDays: number;
  minimumOrderValue: number;
  website?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierProduct {
  id: string;
  supplierId: string;
  itemId: string;
  sku: string;
  supplierProductCode?: string;
  unitPrice: number;
  minOrderQuantity: number;
  packageSize?: number;
  availabilityStatus: 'AVAILABLE' | 'LIMITED' | 'OUT_OF_STOCK' | 'DISCONTINUED';
  leadTimeDays: number;
  qualityRating?: number;
  lastPriceUpdate: string;
  currency: string; // QAR, USD, etc.
  discountPercentage?: number;
  effectiveDate?: string;
  expiryDate?: string;
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'PARTIAL_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  orderDate: string;
  expectedDeliveryDate?: string;
  actualDeliveryDate?: string;
  totalAmount: number;
  currency: string;
  paymentTerms: string;
  deliveryAddress: string;
  notes?: string;
  internalReference?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderItem {
  id: string;
  orderId: string;
  itemId: string;
  itemName: string;
  itemCode?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  receivedQuantity: number;
  remainingQuantity: number;
  unitOfMeasure: string;
  expectedDeliveryDate?: string;
  notes?: string;
}

export interface SupplierPerformance {
  supplierId: string;
  period: string; // YYYY-MM format
  onTimeDeliveryRate: number;
  qualityRating: number;
  averageLeadTime: number;
  orderAccuracy: number;
  priceCompetitiveness: number;
  responsivenessRating: number;
  totalOrders: number;
  totalValue: number;
  issues: number;
  returnRate: number;
}

export interface PurchaseOrderData {
  supplierId: string;
  items: Array<{
    itemId: string;
    quantity: number;
    notes?: string;
  }>;
  expectedDeliveryDate?: string;
  deliveryAddress?: string;
  notes?: string;
  internalReference?: string;
}

export class SupplierIntegration {
  private companies: Map<string, Supplier> = new Map();
  private supplierProducts: Map<string, SupplierProduct[]> = new Map();

  constructor() {
    // Initialize with sample data or load from database
  }

  /**
   * Add or update supplier
   */
  async upsertSupplier(supplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> {
    // This would integrate with Supabase in the actual implementation
    const newSupplier: Supplier = {
      ...supplier,
      id: supplier.id || this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.companies.set(newSupplier.id, newSupplier);
    return newSupplier;
  }

  /**
   * Get supplier by ID
   */
  getSupplier(supplierId: string): Supplier | undefined {
    return this.companies.get(supplierId);
  }

  /**
   * Search suppliers
   */
  searchSuppliers(criteria: {
    category?: string;
    city?: string;
    rating?: number;
    activeOnly?: boolean;
  }): Supplier[] {
    return Array.from(this.companies.values()).filter(supplier => {
      if (criteria.category && !supplier.categories.includes(criteria.category)) {
        return false;
      }
      if (criteria.city && supplier.city !== criteria.city) {
        return false;
      }
      if (criteria.rating && supplier.rating < criteria.rating) {
        return false;
      }
      if (criteria.activeOnly && !supplier.isActive) {
        return false;
      }
      return true;
    });
  }

  /**
   * Add or update supplier product
   */
  async upsertSupplierProduct(product: Omit<SupplierProduct, 'id'>): Promise<SupplierProduct> {
    const newProduct: SupplierProduct = {
      ...product,
      id: this.generateId(),
    };

    if (!this.supplierProducts.has(product.supplierId)) {
      this.supplierProducts.set(product.supplierId, []);
    }

    const existingProducts = this.supplierProducts.get(product.supplierId)!;
    const existingIndex = existingProducts.findIndex(
      p => p.itemId === product.itemId && p.supplierId === product.supplierId
    );

    if (existingIndex >= 0) {
      existingProducts[existingIndex] = newProduct;
    } else {
      existingProducts.push(newProduct);
    }

    return newProduct;
  }

  /**
   * Find best suppliers for items
   */
  findBestSuppliersForItems(
    itemIds: string[],
    criteria: {
      price?: 'lowest' | 'balanced';
      quality?: 'highest' | 'good';
      delivery?: 'fastest' | 'reliable';
    } = {}
  ): Array<{
    itemId: string;
    suppliers: Array<{
      supplier: Supplier;
      product: SupplierProduct;
      score: number;
      rank: number;
    }>;
  }> {
    return itemIds.map(itemId => {
      const products = this.getSupplierProductsForItem(itemId);

      const scoredSuppliers = products.map(product => {
        const supplier = this.companies.get(product.supplierId);
        if (!supplier || !supplier.isActive) return null;

        const score = this.calculateSupplierScore(
          product,
          supplier,
          criteria
        );

        return {
          supplier,
          product,
          score,
        };
      })
      .filter(Boolean) as Array<{
        supplier: Supplier;
        product: SupplierProduct;
        score: number;
      }>;

      // Sort by score descending
      scoredSuppliers.sort((a, b) => b.score - a.score);

      return {
        itemId,
        suppliers: scoredSuppliers.map((item, index) => ({
          ...item,
          rank: index + 1,
        })),
      };
    });
  }

  /**
   * Create purchase order
   */
  async createPurchaseOrder(data: PurchaseOrderData): Promise<PurchaseOrder> {
    const supplier = this.companies.get(data.supplierId);
    if (!supplier) {
      throw new Error('Supplier not found');
    }

    // Get supplier products for pricing
    const supplierProducts = this.supplierProducts.get(data.supplierId) || [];

    const orderItems: PurchaseOrderItem[] = data.items.map(item => {
      const supplierProduct = supplierProducts.find(
        p => p.itemId === item.itemId && p.availabilityStatus === 'AVAILABLE'
      );

      if (!supplierProduct) {
        throw new Error(`No available supplier product found for item ${item.itemId}`);
      }

      const totalPrice = supplierProduct.unitPrice * item.quantity;

      return {
        id: this.generateId(),
        orderId: '', // Will be set after creating order
        itemId: item.itemId,
        itemName: '', // Will be populated from inventory items
        itemCode: '',
        sku: supplierProduct.sku,
        quantity: item.quantity,
        unitPrice: supplierProduct.unitPrice,
        totalPrice,
        receivedQuantity: 0,
        remainingQuantity: item.quantity,
        unitOfMeasure: '',
        notes: item.notes,
      };
    });

    const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);

    const purchaseOrder: PurchaseOrder = {
      id: this.generateId(),
      orderNumber: this.generateOrderNumber(),
      supplierId: data.supplierId,
      supplierName: supplier.companyName,
      status: 'DRAFT',
      orderDate: new Date().toISOString(),
      expectedDeliveryDate: data.expectedDeliveryDate,
      actualDeliveryDate: undefined,
      totalAmount,
      currency: 'QAR',
      paymentTerms: supplier.paymentTerms,
      deliveryAddress: data.deliveryAddress || supplier.address,
      notes: data.notes,
      internalReference: data.internalReference,
      createdBy: 'current-user', // Would come from auth context
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Set order ID for items
    orderItems.forEach(item => {
      item.orderId = purchaseOrder.id;
    });

    // In real implementation, save to database
    return purchaseOrder;
  }

  /**
   * Calculate supplier score for ranking
   */
  private calculateSupplierScore(
    product: SupplierProduct,
    supplier: Supplier,
    criteria: any
  ): number {
    let score = 0;

    // Price score (40% weight)
    const priceScore = this.calculatePriceScore(product.unitPrice);
    score += priceScore * 0.4;

    // Quality score (25% weight)
    const qualityScore = (supplier.rating / 5) * 100;
    score += qualityScore * 0.25;

    // Delivery score (20% weight)
    const deliveryScore = this.calculateDeliveryScore(product.leadTimeDays);
    score += deliveryScore * 0.2;

    // Reliability score (15% weight)
    const reliabilityScore = this.calculateReliabilityScore(product.availabilityStatus);
    score += reliabilityScore * 0.15;

    return score;
  }

  /**
   * Calculate price score (lower is better)
   */
  private calculatePriceScore(price: number): number {
    // Normalize price score (0-100, where 100 is best price)
    // This would ideally use market price data
    const maxPrice = 10000; // Arbitrary max for normalization
    return Math.max(0, 100 - (price / maxPrice) * 100);
  }

  /**
   * Calculate delivery score (faster is better)
   */
  private calculateDeliveryScore(leadTimeDays: number): number {
    if (leadTimeDays <= 1) return 100;
    if (leadTimeDays <= 3) return 80;
    if (leadTimeDays <= 7) return 60;
    if (leadTimeDays <= 14) return 40;
    if (leadTimeDays <= 30) return 20;
    return 10;
  }

  /**
   * Calculate reliability score based on availability
   */
  private calculateReliabilityScore(availability: string): number {
    switch (availability) {
      case 'AVAILABLE': return 100;
      case 'LIMITED': return 60;
      case 'OUT_OF_STOCK': return 20;
      case 'DISCONTINUED': return 0;
      default: return 50;
    }
  }

  /**
   * Get supplier products for a specific item
   */
  private getSupplierProductsForItem(itemId: string): SupplierProduct[] {
    const allProducts: SupplierProduct[] = [];

    for (const products of this.supplierProducts.values()) {
      allProducts.push(...products.filter(p => p.itemId === itemId));
    }

    return allProducts;
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Generate purchase order number
   */
  private generateOrderNumber(): string {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${timestamp}-${random}`;
  }

  /**
   * Process automated replenishment
   */
  async processReplenishmentRequests(requests: Array<{
    itemId: string;
    quantity: number;
    urgencyLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    warehouseId: string;
  }>): Promise<Array<{
    itemId: string;
    purchaseOrder?: PurchaseOrder;
    status: 'CREATED' | 'NO_SUPPLIER' | 'INSUFFICIENT_STOCK';
    message: string;
  }>> {
    const results = [];

    for (const request of requests) {
      try {
        // Find best suppliers for this item
        const supplierOptions = this.findBestSuppliersForItems([request.itemId], {
          price: request.urgencyLevel === 'CRITICAL' ? 'balanced' : 'lowest',
          delivery: request.urgencyLevel === 'CRITICAL' ? 'fastest' : 'reliable',
        });

        if (!supplierOptions[0]?.suppliers.length) {
          results.push({
            itemId: request.itemId,
            status: 'NO_SUPPLIER' as const,
            message: 'No available suppliers found for this item',
          });
          continue;
        }

        // Select best supplier (first in ranked list)
        const bestSupplier = supplierOptions[0].suppliers[0];

        // Create purchase order
        const purchaseOrder = await this.createPurchaseOrder({
          supplierId: bestSupplier.supplier.id,
          items: [{
            itemId: request.itemId,
            quantity: request.quantity,
            notes: `Urgency: ${request.urgencyLevel}`,
          }],
          expectedDeliveryDate: this.calculateExpectedDeliveryDate(request.urgencyLevel),
          internalReference: `Auto-replenishment - ${request.urgencyLevel}`,
        });

        results.push({
          itemId: request.itemId,
          purchaseOrder,
          status: 'CREATED' as const,
          message: `Purchase order created with ${bestSupplier.supplier.companyName}`,
        });
      } catch (error) {
        results.push({
          itemId: request.itemId,
          status: 'INSUFFICIENT_STOCK' as const,
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        });
      }
    }

    return results;
  }

  /**
   * Calculate expected delivery date based on urgency
   */
  private calculateExpectedDeliveryDate(urgencyLevel: string): string {
    const now = new Date();
    let daysToAdd = 7; // Default

    switch (urgencyLevel) {
      case 'CRITICAL':
        daysToAdd = 2;
        break;
      case 'HIGH':
        daysToAdd = 3;
        break;
      case 'NORMAL':
        daysToAdd = 7;
        break;
      case 'LOW':
        daysToAdd = 14;
        break;
    }

    const expectedDate = new Date(now);
    expectedDate.setDate(now.getDate() + daysToAdd);

    return expectedDate.toISOString().split('T')[0];
  }
}

/**
 * Factory function to create supplier integration instance
 */
export function createSupplierIntegration(): SupplierIntegration {
  return new SupplierIntegration();
}

/**
 * Helper function to import suppliers from CSV or other formats
 */
export function importSuppliersFromFile(
  fileData: string,
  format: 'CSV' | 'JSON' = 'CSV'
): Array<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>> {
  if (format === 'JSON') {
    return JSON.parse(fileData);
  }

  // CSV parsing logic
  const lines = fileData.split('\n');
  const headers = lines[0].split(',');

  return lines.slice(1).map(line => {
    const values = line.split(',');
    const supplier: any = {};

    headers.forEach((header, index) => {
      const key = header.trim();
      supplier[key] = values[index]?.trim();
    });

    return {
      companyName: supplier.companyName || supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: supplier.country || 'Saudi Arabia',
      paymentTerms: supplier.paymentTerms || 'NET30',
      deliveryTerms: supplier.deliveryTerms || 'Standard',
      rating: parseFloat(supplier.rating) || 3,
      isActive: supplier.isActive !== 'false',
      categories: supplier.categories ? supplier.categories.split(';') : [],
      leadTimeDays: parseInt(supplier.leadTimeDays) || 7,
      minimumOrderValue: parseFloat(supplier.minimumOrderValue) || 0,
    };
  }).filter(supplier => supplier.companyName);
}
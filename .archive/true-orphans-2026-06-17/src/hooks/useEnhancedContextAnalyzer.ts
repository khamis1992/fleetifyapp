import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ContextualRelationship {
  entity1: string;
  entity2: string;
  relationshipType: 'related' | 'dependent' | 'causal' | 'temporal' | 'hierarchical';
  strength: number;
  context: string[];
}

interface EntityContext {
  entity: string;
  type: 'table' | 'field' | 'concept' | 'business_unit';
  description: string;
  relatedEntities: string[];
  commonQueries: string[];
  dataTypes: string[];
  businessRelevance: number;
}

interface ContextualQuery {
  query: string;
  detectedEntities: EntityContext[];
  relationships: ContextualRelationship[];
  missingContext: string[];
  suggestedContext: string[];
  contextualConfidence: number;
  inferredIntent: string;
  businessDomain: string[];
}

export const useEnhancedContextAnalyzer = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [entityRegistry, setEntityRegistry] = useState<Map<string, EntityContext>>(new Map());
  const [relationshipMap, setRelationshipMap] = useState<Map<string, ContextualRelationship[]>>(new Map());
  const contextCache = useRef<Map<string, ContextualQuery>>(new Map());

  // Initialize entity registry with database schema and business context
  const initializeEntityRegistry = useCallback(async () => {
    try {
      setIsAnalyzing(true);

      // Fetch database schema information (optional - will fail gracefully)
      try {
        // This is optional and will fail gracefully in development
        console.log('Initializing entity registry with predefined business entities');
      } catch (error) {
        console.warn('Schema introspection unavailable (this is normal):', error);
      }

      // Predefined business entities with Arabic and English context
      const businessEntities: EntityContext[] = [
        {
          entity: 'customers',
          type: 'table',
          description: 'Customer information and client data / معلومات العملاء والزبائن',
          relatedEntities: ['contracts', 'invoices', 'payments'],
          commonQueries: ['عدد العملاء', 'العملاء النشطين', 'customer count', 'active customers'],
          dataTypes: ['string', 'date', 'boolean'],
          businessRelevance: 0.9
        },
        {
          entity: 'contracts',
          type: 'table',
          description: 'Legal agreements and contracts / العقود والاتفاقيات القانونية',
          relatedEntities: ['customers', 'legal_cases', 'invoices'],
          commonQueries: ['عدد العقود', 'العقود النشطة', 'contract count', 'active contracts'],
          dataTypes: ['string', 'date', 'decimal', 'boolean'],
          businessRelevance: 0.95
        },
        {
          entity: 'invoices',
          type: 'table',
          description: 'Financial invoices and billing / الفواتير والقوائم المالية',
          relatedEntities: ['customers', 'contracts', 'payments'],
          commonQueries: ['إجمالي الفواتير', 'الفواتير المستحقة', 'total invoices', 'due invoices'],
          dataTypes: ['decimal', 'date', 'string'],
          businessRelevance: 0.85
        },
        {
          entity: 'payments',
          type: 'table',
          description: 'Payment records and transactions / سجلات الدفع والمعاملات',
          relatedEntities: ['customers', 'invoices', 'contracts'],
          commonQueries: ['المدفوعات', 'إجمالي المدفوعات', 'payments', 'total payments'],
          dataTypes: ['decimal', 'date', 'string'],
          businessRelevance: 0.8
        },
        {
          entity: 'legal_cases',
          type: 'table',
          description: 'Legal cases and litigation / القضايا القانونية والتقاضي',
          relatedEntities: ['contracts', 'customers'],
          commonQueries: ['عدد القضايا', 'القضايا المفتوحة', 'case count', 'open cases'],
          dataTypes: ['string', 'date', 'boolean'],
          businessRelevance: 0.75
        },
        {
          entity: 'vehicles',
          type: 'table',
          description: 'Fleet and vehicle management / إدارة الأسطول والمركبات',
          relatedEntities: ['employees', 'maintenance'],
          commonQueries: ['عدد المركبات', 'المركبات المتاحة', 'vehicle count', 'available vehicles'],
          dataTypes: ['string', 'date', 'boolean'],
          businessRelevance: 0.7
        },
        {
          entity: 'employees',
          type: 'table',
          description: 'Employee information and HR data / معلومات الموظفين وبيانات الموارد البشرية',
          relatedEntities: ['attendance', 'vehicles', 'departments'],
          commonQueries: ['عدد الموظفين', 'الموظفين النشطين', 'employee count', 'active employees'],
          dataTypes: ['string', 'date', 'boolean'],
          businessRelevance: 0.8
        }
      ];

      const registry = new Map<string, EntityContext>();
      businessEntities.forEach(entity => {
        registry.set(entity.entity, entity);
      });

      // Build relationship map
      const relationships = new Map<string, ContextualRelationship[]>();
      businessEntities.forEach(entity => {
        entity.relatedEntities.forEach(relatedEntity => {
          const relationshipKey = `${entity.entity}-${relatedEntity}`;
          const relationship: ContextualRelationship = {
            entity1: entity.entity,
            entity2: relatedEntity,
            relationshipType: 'related',
            strength: 0.8,
            context: ['business', 'operational']
          };

          if (!relationships.has(entity.entity)) {
            relationships.set(entity.entity, []);
          }
          relationships.get(entity.entity)!.push(relationship);
        });
      });

      setEntityRegistry(registry);
      setRelationshipMap(relationships);

    } catch (error) {
      console.error('Error initializing entity registry:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [supabase]);

  // Analyze query for contextual understanding
  const analyzeContextualQuery = useCallback(async (query: string): Promise<ContextualQuery> => {
    try {
      setIsAnalyzing(true);

      // Check cache first
      const cacheKey = query.toLowerCase().trim();
      if (contextCache.current.has(cacheKey)) {
        return contextCache.current.get(cacheKey)!;
      }

      const normalizedQuery = query.toLowerCase().trim();
      const detectedEntities: EntityContext[] = [];
      const relationships: ContextualRelationship[] = [];
      const missingContext: string[] = [];
      const suggestedContext: string[] = [];

      // Entity detection with enhanced matching
      entityRegistry.forEach((entityContext, entityName) => {
        let isDetected = false;

        // Direct entity name matching
        if (normalizedQuery.includes(entityName.toLowerCase())) {
          isDetected = true;
        }

        // Common query pattern matching
        for (const commonQuery of entityContext.commonQueries) {
          if (normalizedQuery.includes(commonQuery.toLowerCase())) {
            isDetected = true;
            break;
          }
        }

        // Semantic matching for Arabic/English
        const semanticPatterns = [
          { ar: 'عملاء', en: 'customers', entity: 'customers' },
          { ar: 'عقود', en: 'contracts', entity: 'contracts' },
          { ar: 'فواتير', en: 'invoices', entity: 'invoices' },
          { ar: 'مدفوعات', en: 'payments', entity: 'payments' },
          { ar: 'قضايا', en: 'cases', entity: 'legal_cases' },
          { ar: 'مركبات', en: 'vehicles', entity: 'vehicles' },
          { ar: 'موظفين', en: 'employees', entity: 'employees' }
        ];

        for (const pattern of semanticPatterns) {
          if (entityName === pattern.entity && 
              (normalizedQuery.includes(pattern.ar) || normalizedQuery.includes(pattern.en))) {
            isDetected = true;
            break;
          }
        }

        if (isDetected) {
          detectedEntities.push(entityContext);
        }
      });

      // Find relationships between detected entities
      detectedEntities.forEach(entity => {
        const entityRelationships = relationshipMap.get(entity.entity) || [];
        entityRelationships.forEach(rel => {
          const relatedEntity = detectedEntities.find(e => 
            e.entity === rel.entity2 || e.entity === rel.entity1
          );
          if (relatedEntity) {
            relationships.push(rel);
          }
        });
      });

      // Identify missing context
      if (detectedEntities.length === 0) {
        missingContext.push('No specific entities detected in query');
        suggestedContext.push('Please specify what data you want to analyze (customers, contracts, invoices, etc.)');
      }

      // Check for incomplete specifications
      const hasTimeframe = /\b(اليوم|أمس|الشهر|السنة|today|yesterday|month|year|last|this)\b/i.test(normalizedQuery);
      const hasFilter = /\b(نشط|مكتمل|معلق|active|completed|pending)\b/i.test(normalizedQuery);
      const hasAggregation = /\b(عدد|مجموع|إجمالي|count|total|sum)\b/i.test(normalizedQuery);

      if (!hasTimeframe && hasAggregation) {
        missingContext.push('Time period not specified');
        suggestedContext.push('Consider specifying a time period (this month, last year, etc.)');
      }

      if (!hasFilter && detectedEntities.length > 0) {
        missingContext.push('Status or condition filter not specified');
        suggestedContext.push('Consider specifying status (active, completed, pending, etc.)');
      }

      // Infer business intent
      let inferredIntent = 'general_inquiry';
      if (/\b(عدد|كم|count|how many)\b/i.test(normalizedQuery)) {
        inferredIntent = 'count_analysis';
      } else if (/\b(مجموع|إجمالي|total|sum)\b/i.test(normalizedQuery)) {
        inferredIntent = 'aggregation_analysis';
      } else if (/\b(مقارنة|compare|comparison)\b/i.test(normalizedQuery)) {
        inferredIntent = 'comparative_analysis';
      } else if (/\b(اتجاه|توجه|trend|growth)\b/i.test(normalizedQuery)) {
        inferredIntent = 'trend_analysis';
      }

      // Determine business domains
      const businessDomains: string[] = [];
      if (detectedEntities.some(e => ['customers', 'contracts'].includes(e.entity))) {
        businessDomains.push('sales');
      }
      if (detectedEntities.some(e => ['invoices', 'payments'].includes(e.entity))) {
        businessDomains.push('finance');
      }
      if (detectedEntities.some(e => ['legal_cases'].includes(e.entity))) {
        businessDomains.push('legal');
      }
      if (detectedEntities.some(e => ['vehicles', 'employees'].includes(e.entity))) {
        businessDomains.push('operations');
      }

      // Calculate contextual confidence
      let contextualConfidence = 0.5; // Base confidence

      if (detectedEntities.length > 0) contextualConfidence += 0.2;
      if (relationships.length > 0) contextualConfidence += 0.1;
      if (hasTimeframe) contextualConfidence += 0.1;
      if (hasFilter) contextualConfidence += 0.05;
      if (hasAggregation) contextualConfidence += 0.05;

      contextualConfidence = Math.min(contextualConfidence * 100, 95);

      const result: ContextualQuery = {
        query,
        detectedEntities,
        relationships,
        missingContext,
        suggestedContext,
        contextualConfidence,
        inferredIntent,
        businessDomain: businessDomains
      };

      // Cache the result
      contextCache.current.set(cacheKey, result);

      return result;

    } catch (error) {
      console.error('Error analyzing contextual query:', error);
      return {
        query,
        detectedEntities: [],
        relationships: [],
        missingContext: ['Analysis error occurred'],
        suggestedContext: ['Please try rephrasing your query'],
        contextualConfidence: 0,
        inferredIntent: 'unknown',
        businessDomain: []
      };
    } finally {
      setIsAnalyzing(false);
    }
  }, [entityRegistry, relationshipMap]);

  // Get context suggestions based on partial query
  const getContextSuggestions = useCallback((partialQuery: string): string[] => {
    const normalizedQuery = partialQuery.toLowerCase().trim();
    const suggestions: string[] = [];

    // Entity-based suggestions
    entityRegistry.forEach((entityContext, entityName) => {
      if (normalizedQuery.includes(entityName.substring(0, 3))) {
        entityContext.commonQueries.forEach(commonQuery => {
          if (!suggestions.includes(commonQuery)) {
            suggestions.push(commonQuery);
          }
        });
      }
    });

    // Pattern-based suggestions
    if (/\b(عدد|كم|count)\b/i.test(normalizedQuery)) {
      suggestions.push(
        'عدد العملاء النشطين',
        'عدد العقود المكتملة',
        'عدد الفواتير هذا الشهر',
        'active customer count',
        'completed contracts count'
      );
    }

    if (/\b(مجموع|إجمالي|total)\b/i.test(normalizedQuery)) {
      suggestions.push(
        'إجمالي الإيرادات',
        'مجموع المدفوعات',
        'إجمالي قيمة العقود',
        'total revenue',
        'total payments'
      );
    }

    return suggestions.slice(0, 8); // Limit suggestions
  }, [entityRegistry]);

  // Enhance query with missing context
  const enhanceQueryWithContext = useCallback((
    query: string,
    contextualAnalysis: ContextualQuery
  ): string => {
    let enhancedQuery = query;

    // Add time context if missing
    if (contextualAnalysis.missingContext.includes('Time period not specified')) {
      enhancedQuery += ' خلال الشهر الحالي'; // Add "during current month"
    }

    // Add status filter if missing
    if (contextualAnalysis.missingContext.includes('Status or condition filter not specified') &&
        contextualAnalysis.detectedEntities.length > 0) {
      const entity = contextualAnalysis.detectedEntities[0].entity;
      if (entity === 'customers' || entity === 'contracts') {
        enhancedQuery += ' النشطة'; // Add "active"
      }
    }

    return enhancedQuery;
  }, []);

  return {
    initializeEntityRegistry,
    analyzeContextualQuery,
    getContextSuggestions,
    enhanceQueryWithContext,
    isAnalyzing,
    entityRegistry: Array.from(entityRegistry.values()),
    relationshipMap: Array.from(relationshipMap.entries())
  };
};
import { useState, useCallback, useMemo } from 'react';

interface SemanticConcept {
  primary: string;
  synonyms: string[];
  category: string;
  context: string[];
  weight: number;
}

interface SemanticMapping {
  [key: string]: SemanticConcept;
}

const SEMANTIC_DICTIONARY: SemanticMapping = {
  // Vehicle/Fleet Management
  'vehicles': {
    primary: 'vehicles',
    synonyms: ['cars', 'fleet', 'automobiles', 'transportation', 'autos', 'motor vehicles', 'rides'],
    category: 'fleet_management',
    context: ['transportation', 'rental', 'maintenance', 'dispatch'],
    weight: 1.0
  },
  'fleet': {
    primary: 'vehicles',
    synonyms: ['vehicle fleet', 'car fleet', 'transportation fleet', 'motor pool'],
    category: 'fleet_management', 
    context: ['management', 'operations', 'logistics'],
    weight: 0.9
  },
  'maintenance': {
    primary: 'maintenance',
    synonyms: ['repair', 'service', 'upkeep', 'servicing', 'fixes', 'repairs'],
    category: 'fleet_management',
    context: ['vehicles', 'equipment', 'preventive', 'corrective'],
    weight: 1.0
  },

  // Legal Domain
  'contracts': {
    primary: 'contracts',
    synonyms: ['agreements', 'deals', 'arrangements', 'pacts', 'accords', 'terms'],
    category: 'legal',
    context: ['legal', 'business', 'rental', 'service'],
    weight: 1.0
  },
  'legal_cases': {
    primary: 'legal_cases',
    synonyms: ['lawsuits', 'litigation', 'court cases', 'legal matters', 'disputes'],
    category: 'legal',
    context: ['court', 'litigation', 'dispute_resolution'],
    weight: 1.0
  },
  'clients': {
    primary: 'customers',
    synonyms: ['customers', 'clientele', 'patrons', 'users', 'account holders'],
    category: 'business',
    context: ['service', 'relationship', 'account'],
    weight: 1.0
  },

  // Financial
  'revenue': {
    primary: 'revenue',
    synonyms: ['income', 'earnings', 'sales', 'proceeds', 'receipts', 'turnover'],
    category: 'financial',
    context: ['accounting', 'finance', 'performance'],
    weight: 1.0
  },
  'expenses': {
    primary: 'expenses',
    synonyms: ['costs', 'expenditures', 'outgoings', 'spending', 'charges'],
    category: 'financial',
    context: ['accounting', 'budget', 'financial'],
    weight: 1.0
  },
  'payments': {
    primary: 'payments',
    synonyms: ['transactions', 'transfers', 'remittances', 'settlements'],
    category: 'financial',
    context: ['accounting', 'cash_flow', 'billing'],
    weight: 1.0
  },

  // Operations
  'dispatch': {
    primary: 'dispatch',
    synonyms: ['deployment', 'assignment', 'allocation', 'scheduling'],
    category: 'operations',
    context: ['vehicles', 'resources', 'logistics'],
    weight: 1.0
  },
  'employees': {
    primary: 'employees',
    synonyms: ['staff', 'workers', 'personnel', 'team members', 'workforce'],
    category: 'hr',
    context: ['human_resources', 'management', 'payroll'],
    weight: 1.0
  },

  // Time-based concepts
  'today': {
    primary: 'today',
    synonyms: ['now', 'current', 'present', 'this day'],
    category: 'temporal',
    context: ['time', 'current_period'],
    weight: 1.0
  },
  'monthly': {
    primary: 'monthly',
    synonyms: ['per month', 'every month', 'month by month', 'monthly basis'],
    category: 'temporal',
    context: ['reporting', 'billing', 'recurring'],
    weight: 1.0
  },

  // Status concepts
  'active': {
    primary: 'active',
    synonyms: ['current', 'ongoing', 'running', 'live', 'operational'],
    category: 'status',
    context: ['contracts', 'accounts', 'operations'],
    weight: 1.0
  },
  'pending': {
    primary: 'pending',
    synonyms: ['waiting', 'outstanding', 'in progress', 'unresolved'],
    category: 'status',
    context: ['approval', 'processing', 'workflow'],
    weight: 1.0
  }
};

export const useSemanticDictionary = () => {
  const [customMappings, setCustomMappings] = useState<SemanticMapping>({});

  const allMappings = useMemo(() => ({
    ...SEMANTIC_DICTIONARY,
    ...customMappings
  }), [customMappings]);

  const findSemanticMatch = useCallback((term: string, context?: string[]): SemanticConcept | null => {
    const normalizedTerm = term.toLowerCase().trim();
    
    // Direct match
    if (allMappings[normalizedTerm]) {
      return allMappings[normalizedTerm];
    }

    // Synonym match
    for (const [key, concept] of Object.entries(allMappings)) {
      if (concept.synonyms.some(syn => 
        syn.toLowerCase().includes(normalizedTerm) || 
        normalizedTerm.includes(syn.toLowerCase())
      )) {
        return concept;
      }
    }

    // Partial match with context consideration
    if (context && context.length > 0) {
      for (const [key, concept] of Object.entries(allMappings)) {
        const contextMatch = concept.context.some(ctx => 
          context.includes(ctx) || ctx.includes(context[0])
        );
        
        if (contextMatch && (
          key.includes(normalizedTerm) || 
          normalizedTerm.includes(key) ||
          concept.synonyms.some(syn => syn.toLowerCase().includes(normalizedTerm))
        )) {
          return concept;
        }
      }
    }

    return null;
  }, [allMappings]);

  const expandQuery = useCallback((query: string, preserveOriginal = true): string[] => {
    const words = query.toLowerCase().split(/\s+/);
    const expandedTerms = new Set<string>();
    
    if (preserveOriginal) {
      expandedTerms.add(query);
    }

    words.forEach(word => {
      const match = findSemanticMatch(word);
      if (match) {
        expandedTerms.add(match.primary);
        match.synonyms.forEach(syn => expandedTerms.add(syn));
      } else {
        expandedTerms.add(word);
      }
    });

    return Array.from(expandedTerms);
  }, [findSemanticMatch]);

  const getConceptsByCategory = useCallback((category: string): SemanticConcept[] => {
    return Object.values(allMappings).filter(concept => concept.category === category);
  }, [allMappings]);

  const addCustomMapping = useCallback((key: string, concept: SemanticConcept) => {
    setCustomMappings(prev => ({
      ...prev,
      [key]: concept
    }));
  }, []);

  const getRelatedConcepts = useCallback((term: string, maxResults = 5): SemanticConcept[] => {
    const match = findSemanticMatch(term);
    if (!match) return [];

    const related = Object.values(allMappings)
      .filter(concept => 
        concept.category === match.category && 
        concept.primary !== match.primary
      )
      .sort((a, b) => b.weight - a.weight)
      .slice(0, maxResults);

    return related;
  }, [findSemanticMatch, allMappings]);

  return {
    findSemanticMatch,
    expandQuery,
    getConceptsByCategory,
    addCustomMapping,
    getRelatedConcepts,
    allMappings
  };
};
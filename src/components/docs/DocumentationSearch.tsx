import React, { useState, useEffect, useMemo } from 'react';
import { Search, FileText, Book, Users, Settings, Database, Code, Shield, Truck } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  url: string;
  category: string;
  icon: React.ComponentType<any>;
  tags: string[];
  lastModified: string;
}

interface DocumentationSearchProps {
  className?: string;
  placeholder?: string;
}

export function DocumentationSearch({
  className = '',
  placeholder = 'Search documentation...'
}: DocumentationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Sample documentation index - in production, this would come from a search API
  const documentationIndex: SearchResult[] = [
    // User Guides
    {
      id: 'quick-start',
      title: 'Quick Start Guide',
      content: 'Get started with FleetifyApp in 5 minutes. Learn the basics of account setup, vehicle management, and creating your first contract.',
      url: '/docs/user-guide/quick-start',
      category: 'User Guide',
      icon: Book,
      tags: ['setup', 'getting-started', 'basics'],
      lastModified: '2024-01-15'
    },
    {
      id: 'vehicle-management',
      title: 'Vehicle Management',
      content: 'Complete guide to managing your fleet. Add vehicles, schedule maintenance, track insurance, and organize vehicles into groups.',
      url: '/docs/user-guide/fleet/vehicle-management',
      category: 'User Guide',
      icon: Truck,
      tags: ['vehicles', 'fleet', 'maintenance', 'insurance'],
      lastModified: '2024-01-14'
    },
    {
      id: 'contract-management',
      title: 'Contract Management',
      content: 'Create and manage rental contracts, use templates, handle amendments, and manage contract documents efficiently.',
      url: '/docs/user-guide/contracts/contract-creation',
      category: 'User Guide',
      icon: FileText,
      tags: ['contracts', 'rentals', 'templates', 'documents'],
      lastModified: '2024-01-13'
    },
    // Developer Documentation
    {
      id: 'api-reference',
      title: 'API Reference',
      content: 'Complete REST API documentation with interactive examples, authentication guide, and WebSocket real-time features.',
      url: '/docs/api/README.md',
      category: 'Developer',
      icon: Code,
      tags: ['api', 'rest', 'websocket', 'authentication'],
      lastModified: '2024-01-12'
    },
    {
      id: 'developer-setup',
      title: 'Developer Setup Guide',
      content: 'Set up your development environment, install dependencies, configure database, and start contributing to FleetifyApp.',
      url: '/docs/developer/SETUP.md',
      category: 'Developer',
      icon: Settings,
      tags: ['setup', 'development', 'environment', 'contributing'],
      lastModified: '2024-01-11'
    },
    // Architecture
    {
      id: 'system-overview',
      title: 'System Architecture Overview',
      content: 'High-level system architecture, design principles, component structure, and technology stack documentation.',
      url: '/docs/architecture/SYSTEM_OVERVIEW.md',
      category: 'Architecture',
      icon: Database,
      tags: ['architecture', 'design', 'system', 'technology'],
      lastModified: '2024-01-10'
    },
    // Admin
    {
      id: 'user-management',
      title: 'User Management & Permissions',
      content: 'Manage user accounts, configure roles and permissions, set up access controls, and handle authentication.',
      url: '/docs/admin/USER_MANAGEMENT.md',
      category: 'Administration',
      icon: Users,
      tags: ['users', 'permissions', 'roles', 'authentication'],
      lastModified: '2024-01-09'
    },
    {
      id: 'security-guide',
      title: 'Security Configuration Guide',
      content: 'Configure security settings, enable encryption, set up audit logging, and implement security best practices.',
      url: '/docs/admin/SECURITY.md',
      category: 'Administration',
      icon: Shield,
      tags: ['security', 'encryption', 'audit', 'compliance'],
      lastModified: '2024-01-08'
    }
  ];

  // Fuzzy search implementation
  const fuzzySearch = (text: string, query: string): number => {
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();

    if (textLower.includes(queryLower)) return 1;

    let score = 0;
    let queryIndex = 0;

    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        score++;
        queryIndex++;
      }
    }

    return queryIndex === queryLower.length ? score / textLower.length : 0;
  };

  // Search functionality
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(() => {
      const searchResults = documentationIndex
        .map(doc => ({
          ...doc,
          score: (
            fuzzySearch(doc.title, query) * 3 +
            fuzzySearch(doc.content, query) * 2 +
            fuzzySearch(doc.tags.join(' '), query) * 1.5 +
            fuzzySearch(doc.category, query)
          )
        }))
        .filter(doc => doc.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);

      setResults(searchResults);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ComponentType<any>> = {
      'User Guide': Book,
      'Developer': Code,
      'Architecture': Database,
      'Administration': Settings,
      'API': Code,
      'Security': Shield
    };
    return icons[category] || FileText;
  };

  const handleResultClick = (url: string) => {
    // In production, this would navigate to the documentation page
    console.log('Navigate to:', url);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <span className="text-gray-400 hover:text-gray-600">&times;</span>
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (query.length >= 2 || results.length > 0) && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-1">
              {results.map((result) => {
                const Icon = result.icon;
                return (
                  <button
                    key={result.id}
                    onClick={() => handleResultClick(result.url)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <Icon className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {highlightText(result.title, query)}
                          </p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {result.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {highlightText(result.content, query)}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex flex-wrap gap-1">
                            {result.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-gray-400">
                            {result.lastModified}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : query.length >= 2 ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No documentation found for "{query}"
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              Type at least 2 characters to search
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to close</span>
              <span>Use <kbd className="px-1 py-0.5 bg-gray-100 rounded">Ctrl+K</kbd> for quick search</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Keyboard shortcut hook
export function useDocumentationSearch() {
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        // Focus search input - this would be implemented based on your app structure
        const searchInput = document.querySelector('input[placeholder*="Search"]');
        if (searchInput) {
          (searchInput as HTMLInputElement).focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}
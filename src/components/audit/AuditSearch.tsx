/**
 * Audit Search Component
 * Advanced search functionality for audit trail
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, CalendarIcon, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuditSearch } from '@/hooks/useFinancialAudit';
import { FinancialAuditLog } from '@/types/auditLog';
import { AuditLogDetailsDialog } from './AuditLogDetailsDialog';

interface AuditSearchProps {
  companyId: string;
}

export function AuditSearch({ companyId }: AuditSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLog, setSelectedLog] = useState<FinancialAuditLog | null>(null);
  const [searchFilters, setSearchFilters] = useState({
    entity_type: '',
    date_range: { start: '', end: '' },
    limit: 50
  });

  const { searchResults, isSearching, search, clearSearch } = useAuditSearch(companyId);

  const handleSearch = () => {
    search(searchTerm, searchFilters);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    setSearchFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearAll = () => {
    setSearchTerm('');
    setSearchFilters({
      entity_type: '',
      date_range: { start: '', end: '' },
      limit: 50
    });
    clearSearch();
  };

  return (
    <>
      <div className="space-y-4">
        {/* Search Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="h-5 w-5" />
              Advanced Audit Search
            </CardTitle>
            <CardDescription>
              Search audit trail with advanced filters and criteria
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search Input */}
            <div className="flex gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search audit trail by entity name, notes, or any field..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
              <Button variant="outline" onClick={clearAll}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>

            {/* Advanced Filters */}
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Entity Type</label>
                <Select
                  value={searchFilters.entity_type}
                  onValueChange={(value) => handleFilterChange('entity_type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All entities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Entity Types</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="journal_entry">Journal Entry</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {searchFilters.date_range.start || 'From date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={searchFilters.date_range.start ? new Date(searchFilters.date_range.start) : undefined}
                        onSelect={(date) => handleFilterChange('date_range', {
                          ...searchFilters.date_range,
                          start: date?.toISOString()
                        })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {searchFilters.date_range.end || 'To date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={searchFilters.date_range.end ? new Date(searchFilters.date_range.end) : undefined}
                        onSelect={(date) => handleFilterChange('date_range', {
                          ...searchFilters.date_range,
                          end: date?.toISOString()
                        })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Results Limit</label>
                <Select
                  value={searchFilters.limit.toString()}
                  onValueChange={(value) => handleFilterChange('limit', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 results</SelectItem>
                    <SelectItem value="25">25 results</SelectItem>
                    <SelectItem value="50">50 results</SelectItem>
                    <SelectItem value="100">100 results</SelectItem>
                    <SelectItem value="500">500 results</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSearchFilters({
                    entity_type: '',
                    date_range: { start: '', end: '' },
                    limit: 50
                  })}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Reset Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Search Results</CardTitle>
              <CardDescription>
                Found {searchResults.length} matching audit entries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {searchResults.map((log) => (
                  <div
                    key={log.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="capitalize">
                          {log.action}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {log.resource_type}
                        </Badge>
                        <Badge variant={
                          log.severity === 'critical' ? 'destructive' :
                          log.severity === 'high' ? 'destructive' :
                          log.severity === 'medium' ? 'secondary' : 'outline'
                        }>
                          {log.severity}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(log.created_at), 'PPpp')}
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div>
                        <p className="font-medium">{log.entity_name}</p>
                        <p className="text-sm text-muted-foreground">by {log.user_name}</p>
                      </div>
                      <div className="text-right">
                        {log.financial_data?.amount && (
                          <p className="font-mono">
                            {log.financial_data.currency === 'USD' ? '$' : log.financial_data.currency}
                            {log.financial_data.amount.toLocaleString()}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {log.status}
                        </p>
                      </div>
                    </div>
                    {log.changes_summary && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {log.changes_summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {searchTerm && searchResults.length === 0 && !isSearching && (
          <Card>
            <CardContent className="text-center py-8">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No results found</h3>
              <p className="text-muted-foreground">
                No audit entries match your search criteria. Try adjusting your filters or search terms.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Details Dialog */}
      {selectedLog && (
        <AuditLogDetailsDialog
          log={selectedLog}
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </>
  );
}
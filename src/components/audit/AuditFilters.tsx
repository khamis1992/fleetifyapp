/**
 * Audit Filters Component
 * Advanced filtering options for audit trail
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { FinancialAuditFilters, AuditResourceType, AuditStatus, AuditSeverity } from '@/types/auditLog';

interface AuditFiltersProps {
  filters: FinancialAuditFilters;
  onFiltersChange: (filters: FinancialAuditFilters) => void;
  onReset?: () => void;
}

const RESOURCE_TYPES: { value: AuditResourceType; label: string }[] = [
  { value: 'payment', label: 'Payment' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'contract', label: 'Contract' },
  { value: 'journal_entry', label: 'Journal Entry' },
  { value: 'account', label: 'Account' },
  { value: 'customer', label: 'Customer' },
];

const ACTIONS = [
  'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'CANCEL', 'ARCHIVE'
] as const;

const STATUSES: { value: AuditStatus; label: string }[] = [
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
];

const SEVERITIES: { value: AuditSeverity; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const VERIFICATION_STATUSES = [
  { value: 'verified', label: 'Verified' },
  { value: 'tampered', label: 'Tampered' },
  { value: 'suspicious', label: 'Suspicious' },
];

export function AuditFilters({ filters, onFiltersChange, onReset }: AuditFiltersProps) {
  const [localFilters, setLocalFilters] = React.useState<FinancialAuditFilters>(filters);

  const handleFilterChange = (key: keyof FinancialAuditFilters, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateChange = (key: 'date_from' | 'date_to', date: Date | undefined) => {
    handleFilterChange(key, date?.toISOString());
  };

  const handleMultiSelect = (key: keyof FinancialAuditFilters, values: string[]) => {
    handleFilterChange(key, values.length > 0 ? values : undefined);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.resource_type) count++;
    if (localFilters.action) count++;
    if (localFilters.status) count++;
    if (localFilters.severity) count++;
    if (localFilters.date_from) count++;
    if (localFilters.date_to) count++;
    if (localFilters.search) count++;
    if (localFilters.amount_min !== undefined) count++;
    if (localFilters.amount_max !== undefined) count++;
    if (localFilters.currency) count++;
    if (localFilters.verification_status) count++;
    return count;
  };

  const activeFilters = getActiveFilterCount();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Filter Options</h3>
          <p className="text-sm text-muted-foreground">
            {activeFilters} active filter{activeFilters !== 1 ? 's' : ''}
          </p>
        </div>
        {onReset && activeFilters > 0 && (
          <Button variant="outline" size="sm" onClick={onReset}>
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Entity Type Filter */}
        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Select
            value={localFilters.resource_type || ''}
            onValueChange={(value) =>
              handleFilterChange('resource_type', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All entity types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entity Types</SelectItem>
              {RESOURCE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Filter */}
        <div className="space-y-2">
          <Label>Action</Label>
          <Select
            value={localFilters.action || ''}
            onValueChange={(value) =>
              handleFilterChange('action', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {ACTIONS.map((action) => (
                <SelectItem key={action} value={action}>
                  {action.charAt(0) + action.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={localFilters.status || ''}
            onValueChange={(value) =>
              handleFilterChange('status', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Severity Filter */}
        <div className="space-y-2">
          <Label>Severity</Label>
          <Select
            value={localFilters.severity || ''}
            onValueChange={(value) =>
              handleFilterChange('severity', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              {SEVERITIES.map((severity) => (
                <SelectItem key={severity.value} value={severity.value}>
                  {severity.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Verification Status Filter */}
        <div className="space-y-2">
          <Label>Verification Status</Label>
          <Select
            value={localFilters.verification_status || ''}
            onValueChange={(value) =>
              handleFilterChange('verification_status', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All verification statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {VERIFICATION_STATUSES.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Currency Filter */}
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select
            value={localFilters.currency || ''}
            onValueChange={(value) =>
              handleFilterChange('currency', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All currencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Currencies</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="QAR">QAR</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label>Date Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !localFilters.date_from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.date_from
                    ? format(new Date(localFilters.date_from), "PPP")
                    : "From date"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.date_from ? new Date(localFilters.date_from) : undefined}
                  onSelect={(date) => handleDateChange('date_from', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !localFilters.date_to && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.date_to
                    ? format(new Date(localFilters.date_to), "PPP")
                    : "To date"
                  }
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={localFilters.date_to ? new Date(localFilters.date_to) : undefined}
                  onSelect={(date) => handleDateChange('date_to', date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Amount Range */}
        <div className="space-y-2">
          <Label>Amount Range</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              placeholder="Min amount"
              value={localFilters.amount_min || ''}
              onChange={(e) => handleFilterChange('amount_min', e.target.value ? Number(e.target.value) : undefined)}
            />
            <Input
              type="number"
              placeholder="Max amount"
              value={localFilters.amount_max || ''}
              onChange={(e) => handleFilterChange('amount_max', e.target.value ? Number(e.target.value) : undefined)}
            />
          </div>
        </div>

        {/* Search */}
        <div className="space-y-2">
          <Label>Search</Label>
          <Input
            placeholder="Search in entity name, notes..."
            value={localFilters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
          />
        </div>

        {/* Reference Number */}
        <div className="space-y-2">
          <Label>Reference Number</Label>
          <Input
            placeholder="Invoice, contract, or payment number"
            value={localFilters.reference_number || ''}
            onChange={(e) => handleFilterChange('reference_number', e.target.value || undefined)}
          />
        </div>

        {/* Account Code */}
        <div className="space-y-2">
          <Label>Account Code</Label>
          <Input
            placeholder="Chart of accounts code"
            value={localFilters.account_code || ''}
            onChange={(e) => handleFilterChange('account_code', e.target.value || undefined)}
          />
        </div>

        {/* Has Compliance Flags */}
        <div className="space-y-2">
          <Label>Compliance Flags</Label>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="compliance-flags"
              checked={localFilters.has_compliance_flags || false}
              onCheckedChange={(checked) =>
                handleFilterChange('has_compliance_flags', checked ? true : undefined)
              }
            />
            <Label htmlFor="compliance-flags" className="text-sm">
              Only show records with compliance violations
            </Label>
          </div>
        </div>
      </div>

      {/* Active Filters Summary */}
      {activeFilters > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Active Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {localFilters.resource_type && (
                <Badge variant="secondary">
                  Type: {RESOURCE_TYPES.find(t => t.value === localFilters.resource_type)?.label}
                </Badge>
              )}
              {localFilters.action && (
                <Badge variant="secondary">
                  Action: {localFilters.action}
                </Badge>
              )}
              {localFilters.status && (
                <Badge variant="secondary">
                  Status: {localFilters.status}
                </Badge>
              )}
              {localFilters.severity && (
                <Badge variant="secondary">
                  Severity: {localFilters.severity}
                </Badge>
              )}
              {localFilters.date_from && (
                <Badge variant="secondary">
                  From: {format(new Date(localFilters.date_from), "PP")}
                </Badge>
              )}
              {localFilters.date_to && (
                <Badge variant="secondary">
                  To: {format(new Date(localFilters.date_to), "PP")}
                </Badge>
              )}
              {localFilters.amount_min && (
                <Badge variant="secondary">
                  Min: ${localFilters.amount_min}
                </Badge>
              )}
              {localFilters.amount_max && (
                <Badge variant="secondary">
                  Max: ${localFilters.amount_max}
                </Badge>
              )}
              {localFilters.currency && (
                <Badge variant="secondary">
                  Currency: {localFilters.currency}
                </Badge>
              )}
              {localFilters.search && (
                <Badge variant="secondary">
                  Search: "{localFilters.search}"
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
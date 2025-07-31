import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Info, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useEntryAllowedAccounts } from '@/hooks/useEntryAllowedAccounts';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';

const journalEntryLineSchema = z.object({
  account_id: z.string().min(1, 'Account is required'),
  description: z.string().min(1, 'Description is required'),
  debit_amount: z.number().min(0, 'Debit amount must be positive'),
  credit_amount: z.number().min(0, 'Credit amount must be positive'),
});

const journalEntrySchema = z.object({
  entry_date: z.string().min(1, 'Entry date is required'),
  description: z.string().min(1, 'Description is required'),
  reference_number: z.string().optional(),
  lines: z.array(journalEntryLineSchema).min(2, 'At least 2 lines are required'),
}).refine(
  (data) => {
    const totalDebits = data.lines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredits = data.lines.reduce((sum, line) => sum + line.credit_amount, 0);
    return Math.abs(totalDebits - totalCredits) < 0.01;
  },
  {
    message: "Total debits must equal total credits",
    path: ["lines"],
  }
);

type JournalEntryFormData = z.infer<typeof journalEntrySchema>;

interface EnhancedJournalEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: JournalEntryFormData) => Promise<void>;
}

export const EnhancedJournalEntryForm: React.FC<EnhancedJournalEntryFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { companyId, hasCompanyAdminAccess } = useUnifiedCompanyAccess();
  
  const {
    data: accounts,
    isLoading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts
  } = useEntryAllowedAccounts();

  const form = useForm<JournalEntryFormData>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: {
      entry_date: new Date().toISOString().split('T')[0],
      description: '',
      reference_number: '',
      lines: [
        { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
        { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  });
  const watchedLines = form.watch('lines');

  // Calculate totals
  const totalDebits = watchedLines.reduce((sum, line) => sum + (line.debit_amount || 0), 0);
  const totalCredits = watchedLines.reduce((sum, line) => sum + (line.credit_amount || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  const handleSubmit = async (data: JournalEntryFormData) => {
    if (!companyId) {
      toast({
        title: "Company Access Error",
        description: "You are not properly associated with a company. Please contact your administrator.",
        variant: "destructive",
      });
      return;
    }

    if (!hasCompanyAdminAccess) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to create journal entries.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Journal entry created successfully.",
      });
    } catch (error) {
      console.error("Error creating journal entry:", error);
      toast({
        title: "Error",
        description: "Failed to create journal entry. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addLine = () => {
    append({ account_id: '', description: '', debit_amount: 0, credit_amount: 0 });
  };

  const removeLine = (index: number) => {
    if (fields.length > 2) {
      remove(index);
    }
  };

  // Show company access error
  if (!companyId) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Company Access Required
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Your account is not properly associated with a company. Please contact your administrator to resolve this issue.
            </AlertDescription>
          </Alert>
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show accounts loading error
  if (accountsError) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Error Loading Accounts
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load chart of accounts. This might be due to a company association issue or database connectivity problem.
            </AlertDescription>
          </Alert>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => refetchAccounts()}>
              Retry
            </Button>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Journal Entry</DialogTitle>
        </DialogHeader>

        {/* Company Info */}
        <div className="mb-4">
          <Badge variant="outline" className="text-xs">
            Company ID: {companyId}
          </Badge>
          {accounts && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {accounts.length} accounts available
            </Badge>
          )}
        </div>

        {/* Loading State */}
        {accountsLoading && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Loading chart of accounts...</AlertDescription>
          </Alert>
        )}

        {/* No Accounts Warning */}
        {!accountsLoading && accounts && accounts.length === 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No suitable accounts found for journal entries. Please ensure your chart of accounts has non-header accounts at level 3 or higher.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="entry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reference_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional reference" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col justify-end">
                <Button
                  type="button"
                  onClick={addLine}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Describe the journal entry..."
                      className="min-h-[60px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Journal Lines */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Journal Lines</h3>
                <div className="flex gap-4">
                  <Badge variant={isBalanced ? "secondary" : "destructive"}>
                    Balance: {isBalanced ? "✓" : "✗"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Debits: {totalDebits.toFixed(2)} | Credits: {totalCredits.toFixed(2)}
                  </span>
                </div>
              </div>

              {watchedLines.map((_, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border rounded-lg">
                  <FormField
                    control={form.control}
                    name={`lines.${index}.account_id`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select account" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {accounts?.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{account.account_code}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {account.account_name}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lines.${index}.description`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Line description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lines.${index}.debit_amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Debit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`lines.${index}.credit_amount`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeLine(index)}
                      disabled={watchedLines.length <= 2}
                      className="w-full"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Balance Validation */}
            {!isBalanced && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Journal entry is not balanced. Total debits must equal total credits.
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !isBalanced || accountsLoading || !accounts?.length}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Entry
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
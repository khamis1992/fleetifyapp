import React, { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { normalizeCsvHeaders } from "@/utils/csv";

interface CSVTableEditorProps {
  headers: string[];
  rows: any[];
  onChange: (rows: any[]) => void;
  requiredFields?: string[];
  fieldTypes?: Record<string, 'text' | 'number' | 'date' | 'email' | 'phone' | 'boolean'>;
}

export const CSVTableEditor: React.FC<CSVTableEditorProps> = ({
  headers,
  rows,
  onChange,
  requiredFields = [],
  fieldTypes = {}
}) => {
  const { validCount, invalidCount, rowValidity } = useMemo(() => {
    let valid = 0;
    let invalid = 0;
    const validity = rows.map((row) => {
      const normalized = normalizeCsvHeaders(row);
      const missingRequired = requiredFields.filter((f) => !normalized[f] && normalized[f] !== 0);
      const isValid = missingRequired.length === 0;
      if (isValid) valid++; else invalid++;
      return { isValid, missingRequired };
    });
    return { validCount: valid, invalidCount: invalid, rowValidity: validity };
  }, [rows, requiredFields]);

  const handleCellChange = (ri: number, header: string, value: string) => {
    const updated = [...rows];
    updated[ri] = { ...updated[ri], [header]: value };
    onChange(updated);
  };

  const getNormalizedKey = (header: string): string => {
    const mapped = normalizeCsvHeaders({ [header]: '' });
    return Object.keys(mapped)[0] || header;
  };

  const getInputType = (header: string): string => {
    const key = getNormalizedKey(header);
    const t = fieldTypes[key];
    switch (t) {
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      case 'email':
        return 'email';
      case 'phone':
        return 'tel';
      default:
        return 'text';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <Badge variant="outline">صالح: {validCount}</Badge>
        <Badge variant="destructive">غير صالح: {invalidCount}</Badge>
        <span className="text-muted-foreground">(الحقول المطلوبة يجب تعبئتها قبل الرفع)</span>
      </div>

      <ScrollArea className="h-[50vh] w-full border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((h, hi) => (
                <TableHead key={hi} className="whitespace-nowrap">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, ri) => {
              const validity = rowValidity[ri];
              return (
                <TableRow key={ri} className={!validity?.isValid ? 'bg-destructive/5' : undefined}>
                  {headers.map((h, hi) => {
                    const value = row[h] ?? '';
                    const normalizedKey = getNormalizedKey(h);
                    const isRequired = requiredFields.includes(normalizedKey);
                    const showError = isRequired && (value === undefined || value === null || String(value).trim() === '');
                    return (
                      <TableCell key={hi} className={showError ? 'border border-destructive/50' : undefined}>
                        <Input
                          type={getInputType(h)}
                          value={value}
                          onChange={(e) => handleCellChange(ri, h, e.target.value)}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

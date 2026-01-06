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

  // Helpers to sanitize date values to yyyy-MM-dd for HTML date inputs
  const isYMD = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
  const pad2 = (n: number) => n.toString().padStart(2, '0');
  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  const sanitizeDate = (val: any): { formatted: string; valid: boolean } => {
    if (val === null || val === undefined) return { formatted: '', valid: true };
    const raw = String(val).trim();
    if (raw === '') return { formatted: '', valid: true };
    if (isYMD(raw)) return { formatted: raw, valid: true };

    // Try patterns: YYYY/MM/DD or YYYY-MM-DD or YYYY.MM.DD
    let m = raw.match(/^(\d{4})[\/.\-](\d{1,2})[\/.\-](\d{1,2})$/);
    if (m) {
      const y = Number(m[1]);
      const mo = clamp(Number(m[2]), 1, 12);
      const d = clamp(Number(m[3]), 1, 31);
      return { formatted: `${y}-${pad2(mo)}-${pad2(d)}`, valid: true };
    }

    // Try patterns: DD/MM/YYYY or MM/DD/YYYY (decide by first segment)
    m = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (m) {
      const a = Number(m[1]);
      const b = Number(m[2]);
      const y = Number(m[3]);
      // Heuristic: if first > 12 => it's day/month, else assume month/day
      let day: number;
      let month: number;
      if (a > 12) {
        day = clamp(a, 1, 31);
        month = clamp(b, 1, 12);
      } else if (b > 12) {
        // If second > 12, first must be month
        month = clamp(a, 1, 12);
        day = clamp(b, 1, 31);
      } else {
        // Ambiguous like 10/11/2024 -> assume month/day
        month = clamp(a, 1, 12);
        day = clamp(b, 1, 31);
      }
      return { formatted: `${y}-${pad2(month)}-${pad2(day)}`, valid: true };
    }

    // Fallback: Date.parse
    const dt = new Date(raw);
    if (!isNaN(dt.getTime())) {
      const y = dt.getFullYear();
      const mo = pad2(dt.getMonth() + 1);
      const d = pad2(dt.getDate());
      return { formatted: `${y}-${mo}-${d}`, valid: true };
    }

    return { formatted: '', valid: false };
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline">صالح: {validCount}</Badge>
        <Badge variant="destructive">غير صالح: {invalidCount}</Badge>
        <span className="text-muted-foreground">(الحقول المطلوبة يجب تعبئتها قبل الرفع)</span>
        <span className="text-muted-foreground">صيغة التاريخ المقبولة: yyyy-MM-dd (مثال: 2024-12-29)</span>
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
                        {getInputType(h) === 'date' ? (
                          (() => {
                            const s = sanitizeDate(value);
                            return s.valid ? (
                              <Input
                                type="date"
                                value={s.formatted}
                                onChange={(e) => handleCellChange(ri, h, e.target.value)}
                              />
                            ) : (
                              <div className="space-y-1">
                                <Input
                                  type="text"
                                  placeholder="yyyy-MM-dd"
                                  value={typeof value === 'string' ? value : String(value ?? '')}
                                  onChange={(e) => handleCellChange(ri, h, e.target.value)}
                                />
                                <div className="text-xs text-destructive">تنسيق تاريخ غير صالح — استخدم yyyy-MM-dd</div>
                              </div>
                            );
                          })()
                        ) : (
                          <Input
                            type={getInputType(h)}
                            value={value}
                            onChange={(e) => handleCellChange(ri, h, e.target.value)}
                          />
                        )}
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

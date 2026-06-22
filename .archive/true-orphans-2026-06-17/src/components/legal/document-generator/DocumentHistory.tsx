/**
 * Document History Component
 * Shows list of previously generated documents
 */

import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { FileText, Clock, CheckCircle, XCircle, Send, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import type { DocumentGenerationView } from '@/types/legal-document-generator';

interface DocumentHistoryProps {
  documents: DocumentGenerationView[];
  loading: boolean;
}

const statusConfig = {
  draft: {
    label: 'مسودة',
    icon: FileText,
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  },
  generated: {
    label: 'تم الإنشاء',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200',
  },
  approved: {
    label: 'تمت الموافقة',
    icon: CheckCircle,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200',
  },
  rejected: {
    label: 'مرفوض',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200',
  },
  sent: {
    label: 'مرسل',
    icon: Send,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-200',
  },
};

export function DocumentHistory({ documents, loading }: DocumentHistoryProps) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">لا توجد كتب بعد</h3>
        <p className="text-muted-foreground mb-4">
          ابدأ بإنشاء كتاب جديد باستخدام مولد الكتب الرسمية
        </p>
        <Button onClick={() => navigate('/legal/document-generator')}>
          إنشاء كتاب جديد
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <Input placeholder="بحث في الكتب..." className="max-w-sm" />
      </div>

      {/* Documents Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم الكتاب</TableHead>
              <TableHead>نوع الكتاب</TableHead>
              <TableHead>الجهة المستلمة</TableHead>
              <TableHead>التاريخ</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => {
              const statusInfo = statusConfig[doc.status as keyof typeof statusConfig];
              const StatusIcon = statusInfo.icon;

              return (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">
                    {doc.document_number || '-'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{doc.template_name_ar || doc.template_name_en}</div>
                      <div className="text-sm text-muted-foreground">{doc.document_type}</div>
                    </div>
                  </TableCell>
                  <TableCell>{doc.recipient_name || '-'}</TableCell>
                  <TableCell>
                    {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: ar })}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusInfo.color} variant="secondary">
                      <StatusIcon className="h-3 w-3 ml-1" />
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-left">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/legal/document-generator/${doc.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          عرض {documents.length} كتاب
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            السابق
          </Button>
          <Button variant="outline" size="sm" disabled>
            التالي
          </Button>
        </div>
      </div>
    </div>
  );
}

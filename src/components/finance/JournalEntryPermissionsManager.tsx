import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  FileEdit, 
  Send, 
  Eye, 
  CheckCircle, 
  Upload, 
  Undo, 
  X,
  Info,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useJournalEntryPermissions } from "@/hooks/useJournalEntryPermissions";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface PermissionRow {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  icon: any;
  permissionKey: keyof typeof permissions;
  level: 'basic' | 'intermediate' | 'advanced' | 'critical';
}

const PERMISSION_LEVELS = {
  basic: { label: 'أساسي', color: 'bg-blue-100 text-blue-800' },
  intermediate: { label: 'متوسط', color: 'bg-yellow-100 text-yellow-800' },
  advanced: { label: 'متقدم', color: 'bg-orange-100 text-orange-800' },
  critical: { label: 'حرج', color: 'bg-red-100 text-red-800' }
};

export function JournalEntryPermissionsManager() {
  const permissions = useJournalEntryPermissions();

  const permissionRows: PermissionRow[] = [
    {
      id: 'create_draft',
      title: 'إنشاء قيود مسودة',
      titleEn: 'Create Draft Entries',
      description: 'إنشاء قيود محاسبية جديدة في حالة مسودة',
      icon: FileEdit,
      permissionKey: 'canCreateDraft',
      level: 'basic'
    },
    {
      id: 'submit_for_review',
      title: 'تقديم للمراجعة',
      titleEn: 'Submit for Review',
      description: 'تقديم القيود المسودة للمراجعة',
      icon: Send,
      permissionKey: 'canSubmitForReview',
      level: 'basic'
    },
    {
      id: 'review',
      title: 'مراجعة القيود',
      titleEn: 'Review Entries',
      description: 'مراجعة القيود المقدمة وإرجاعها أو الموافقة عليها',
      icon: Eye,
      permissionKey: 'canReview',
      level: 'intermediate'
    },
    {
      id: 'approve',
      title: 'اعتماد القيود',
      titleEn: 'Approve Entries',
      description: 'اعتماد القيود بعد المراجعة',
      icon: CheckCircle,
      permissionKey: 'canApprove',
      level: 'advanced'
    },
    {
      id: 'post',
      title: 'ترحيل القيود',
      titleEn: 'Post Entries',
      description: 'ترحيل القيود المعتمدة إلى دفتر الأستاذ',
      icon: Upload,
      permissionKey: 'canPost',
      level: 'advanced'
    },
    {
      id: 'reverse',
      title: 'عكس القيود المرحلة',
      titleEn: 'Reverse Posted Entries',
      description: 'عكس القيود المرحلة في دفتر الأستاذ',
      icon: Undo,
      permissionKey: 'canReverse',
      level: 'critical'
    },
    {
      id: 'cancel',
      title: 'إلغاء القيود',
      titleEn: 'Cancel Entries',
      description: 'إلغاء القيود في أي مرحلة',
      icon: X,
      permissionKey: 'canCancel',
      level: 'critical'
    },
    {
      id: 'view_all',
      title: 'عرض جميع المراحل',
      titleEn: 'View All Statuses',
      description: 'عرض القيود في جميع المراحل (مسودة، مراجعة، معتمد، مرحل)',
      icon: Info,
      permissionKey: 'canViewAllStatuses',
      level: 'basic'
    }
  ];

  if (permissions.isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  const grantedCount = Object.values(permissions).filter(p => typeof p === 'boolean' && p).length;
  const totalCount = permissionRows.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                صلاحيات مراحل القيود المحاسبية
              </CardTitle>
              <CardDescription>
                صلاحياتك الحالية للتعامل مع مراحل القيود المختلفة
              </CardDescription>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {grantedCount}/{totalCount}
              </div>
              <p className="text-sm text-muted-foreground">صلاحية ممنوحة</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Alert */}
      {grantedCount === 0 ? (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            ليس لديك أي صلاحيات للتعامل مع القيود المحاسبية. يرجى التواصل مع المسؤول.
          </AlertDescription>
        </Alert>
      ) : grantedCount === totalCount ? (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="text-green-800">
            لديك جميع الصلاحيات للتعامل مع القيود المحاسبية بكل مراحلها.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Workflow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">سير عمل القيود (Workflow)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div className={`flex-1 text-center p-3 rounded-lg ${permissions.canCreateDraft ? 'bg-green-50' : 'bg-gray-50'}`}>
              <FileEdit className={`h-6 w-6 mx-auto mb-2 ${permissions.canCreateDraft ? 'text-green-600' : 'text-gray-400'}`} />
              <p className="font-medium">مسودة</p>
              <p className="text-xs text-muted-foreground">Draft</p>
            </div>
            <div className="px-2">→</div>
            <div className={`flex-1 text-center p-3 rounded-lg ${permissions.canReview ? 'bg-green-50' : 'bg-gray-50'}`}>
              <Eye className={`h-6 w-6 mx-auto mb-2 ${permissions.canReview ? 'text-green-600' : 'text-gray-400'}`} />
              <p className="font-medium">مراجعة</p>
              <p className="text-xs text-muted-foreground">Review</p>
            </div>
            <div className="px-2">→</div>
            <div className={`flex-1 text-center p-3 rounded-lg ${permissions.canApprove ? 'bg-green-50' : 'bg-gray-50'}`}>
              <CheckCircle className={`h-6 w-6 mx-auto mb-2 ${permissions.canApprove ? 'text-green-600' : 'text-gray-400'}`} />
              <p className="font-medium">معتمد</p>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="px-2">→</div>
            <div className={`flex-1 text-center p-3 rounded-lg ${permissions.canPost ? 'bg-green-50' : 'bg-gray-50'}`}>
              <Upload className={`h-6 w-6 mx-auto mb-2 ${permissions.canPost ? 'text-green-600' : 'text-gray-400'}`} />
              <p className="font-medium">مرحل</p>
              <p className="text-xs text-muted-foreground">Posted</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الصلاحيات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {permissionRows.map((row) => {
              const Icon = row.icon;
              const hasPermission = permissions[row.permissionKey];
              const levelConfig = PERMISSION_LEVELS[row.level];

              return (
                <div 
                  key={row.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border ${
                    hasPermission ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  {/* Icon */}
                  <div className={`p-3 rounded-lg ${hasPermission ? 'bg-green-100' : 'bg-gray-200'}`}>
                    <Icon className={`h-5 w-5 ${hasPermission ? 'text-green-600' : 'text-gray-500'}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{row.title}</h4>
                      <span className="text-xs text-muted-foreground">({row.titleEn})</span>
                      <Badge className={levelConfig.color} variant="secondary">
                        {levelConfig.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{row.description}</p>
                  </div>

                  {/* Status */}
                  <div>
                    {hasPermission ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        ممنوح
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-200 text-gray-600">
                        <XCircle className="h-3 w-3 mr-1" />
                        غير ممنوح
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Help Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-2">ملاحظات مهمة:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>الصلاحيات الأساسية: مطلوبة للعمل اليومي (إنشاء وتقديم القيود)</li>
                <li>الصلاحيات المتوسطة: للمراجعين (مراجعة القيود)</li>
                <li>الصلاحيات المتقدمة: للمديرين (اعتماد وترحيل القيود)</li>
                <li>الصلاحيات الحرجة: للمدير المالي فقط (عكس وإلغاء القيود)</li>
                <li>لطلب صلاحيات إضافية، يرجى التواصل مع مدير النظام</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


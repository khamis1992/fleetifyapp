import { ReactNode } from 'react';
import { useModuleAccess } from '../hooks/useModuleConfig';
import { ModuleName } from '@/types/modules';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';

interface ModuleLayoutProps {
  moduleName: ModuleName;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ModuleLayout({ moduleName, children, fallback }: ModuleLayoutProps) {
  const { hasAccess, isLoading } = useModuleAccess(moduleName);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return fallback || (
      <div className="container mx-auto p-6">
        <Alert className="border-destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            عذراً، ليس لديك صلاحية للوصول إلى هذه الوحدة. يرجى التواصل مع المدير لتفعيل الوحدة المطلوبة.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
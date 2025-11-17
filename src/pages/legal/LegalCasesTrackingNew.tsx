import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { 
  LayoutDashboard,
  Folder,
  Settings as SettingsIcon,
  FileText,
  Scale
} from 'lucide-react';

export const LegalCasesTrackingNew: React.FC = () => {
  const [activeView, setActiveView] = useState<'overview' | 'cases' | 'settings' | 'reports'>('overview');
  const { companyId, isLoading: isLoadingCompany } = useUnifiedCompanyAccess();

  if (isLoadingCompany) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-[1600px]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Scale className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">تتبع القضايا القانونية</h1>
            <p className="text-gray-600">إدارة ومتابعة جميع القضايا القانونية للشركة</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveView('overview')}
          className={`
            flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200
            ${activeView === 'overview' 
              ? 'text-primary border-b-2 border-primary bg-white' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="hidden sm:inline">نظرة عامة</span>
        </button>

        <button
          onClick={() => setActiveView('cases')}
          className={`
            flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200
            ${activeView === 'cases' 
              ? 'text-primary border-b-2 border-primary bg-white' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <Folder className="w-5 h-5" />
          <span className="hidden sm:inline">القضايا</span>
        </button>

        <button
          onClick={() => setActiveView('settings')}
          className={`
            flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200
            ${activeView === 'settings' 
              ? 'text-primary border-b-2 border-primary bg-white' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <SettingsIcon className="w-5 h-5" />
          <span className="hidden sm:inline">الإعدادات</span>
        </button>

        <button
          onClick={() => setActiveView('reports')}
          className={`
            flex items-center gap-2 px-4 py-3 font-medium transition-all duration-200
            ${activeView === 'reports' 
              ? 'text-primary border-b-2 border-primary bg-white' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          <FileText className="w-5 h-5" />
          <span className="hidden sm:inline">التقارير</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {/* Overview View */}
        {activeView === 'overview' && (
          <Card>
            <CardHeader>
              <CardTitle>نظرة عامة</CardTitle>
              <CardDescription>ملخص القضايا القانونية</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">محتوى نظرة عامة سيتم إضافته...</p>
            </CardContent>
          </Card>
        )}

        {/* Cases View */}
        {activeView === 'cases' && (
          <Card>
            <CardHeader>
              <CardTitle>قائمة القضايا</CardTitle>
              <CardDescription>جميع القضايا القانونية</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">لا توجد قضايا حالياً</p>
            </CardContent>
          </Card>
        )}

        {/* Settings View */}
        {activeView === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات</CardTitle>
              <CardDescription>إعدادات القضايا القانونية</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">إعدادات القضايا...</p>
            </CardContent>
          </Card>
        )}

        {/* Reports View */}
        {activeView === 'reports' && (
          <Card>
            <CardHeader>
              <CardTitle>التقارير</CardTitle>
              <CardDescription>تقارير القضايا والمتأخرين عن السداد</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">التقارير...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LegalCasesTrackingNew;

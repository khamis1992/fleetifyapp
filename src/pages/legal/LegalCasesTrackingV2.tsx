import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scale, LayoutDashboard, Folder, Settings, FileText } from 'lucide-react';

export const LegalCasesTrackingV2: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-xl">
          <Scale className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">تتبع القضايا القانونية V2</h1>
          <p className="text-slate-600">إعادة بناء كاملة من الصفر</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-4 border-b">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all border-b-4 ${
                activeTab === 'overview'
                  ? 'bg-white text-primary border-primary font-bold'
                  : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>نظرة عامة</span>
            </button>

            <button
              onClick={() => setActiveTab('cases')}
              className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all border-b-4 ${
                activeTab === 'cases'
                  ? 'bg-white text-primary border-primary font-bold'
                  : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100'
              }`}
            >
              <Folder className="w-5 h-5" />
              <span>القضايا</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all border-b-4 ${
                activeTab === 'settings'
                  ? 'bg-white text-primary border-primary font-bold'
                  : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>الإعدادات</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all border-b-4 ${
                activeTab === 'reports'
                  ? 'bg-white text-primary border-primary font-bold'
                  : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>التقارير</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Content Area */}
      <Card>
        <CardHeader>
          <CardTitle>
            {activeTab === 'overview' && 'نظرة عامة'}
            {activeTab === 'cases' && 'القضايا'}
            {activeTab === 'settings' && 'الإعدادات'}
            {activeTab === 'reports' && 'التقارير'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-lg font-medium text-slate-700">
              التبويب النشط: <span className="text-primary font-bold">{activeTab}</span>
            </p>
            <p className="text-sm text-slate-500 mt-2">
              إذا كنت ترى هذه الرسالة، فإن التبويبات تعمل بشكل صحيح! ✅
            </p>
            <p className="text-xs text-slate-400 mt-4">
              URL: /legal/cases-v2?tab={activeTab}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LegalCasesTrackingV2;

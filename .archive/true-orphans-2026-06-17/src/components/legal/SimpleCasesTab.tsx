import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Folder, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const SimpleCasesTab: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Folder className="w-5 h-5" />
              قائمة القضايا القانونية
            </CardTitle>
            <CardDescription>
              جميع القضايا القانونية المسجلة في النظام
            </CardDescription>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            قضية جديدة
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Search and filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="بحث في القضايا..."
                className="w-full pr-10 pl-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Empty state */}
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
              <Folder className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              لا توجد قضايا حالياً
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              ابدأ بإنشاء قضية قانونية جديدة من الزر أعلاه
            </p>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              إنشاء قضية جديدة
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimpleCasesTab;

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { formatDateInGregorian } from '@/utils/dateFormatter';
import { VehicleConditionDiagram } from '@/components/fleet/VehicleConditionDiagram';

// VehicleConditionItem interface - kept for future use
// interface VehicleConditionItem {
//   category: string;
//   items: {
//     [key: string]: {
//       condition: 'good' | 'fair' | 'poor' | 'damaged';
//       notes?: string;
//     };
//   };
// }

interface DamageItem {
  x: number;
  y: number;
  id: string;
  severity: string;
  description: string;
}

interface VehicleConditionData {
  id: string;
  overall_condition: 'excellent' | 'good' | 'fair' | 'poor';
  mileage_reading: number;
  fuel_level: number;
  notes?: string;
  inspection_type: 'pre_dispatch' | 'post_return';
  inspector_name?: string;
  created_at: string;
  condition_items?: any;
  damage_items?: (string | DamageItem)[];
}

interface ContractVehicleConditionReportProps {
  conditionData?: VehicleConditionData;
  vehicleInfo?: string;
  className?: string;
}

const getConditionIcon = (condition: string) => {
  switch (condition) {
    case 'excellent':
    case 'good':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'fair':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    case 'poor':
    case 'damaged':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <CheckCircle className="h-4 w-4 text-slate-400" />;
  }
};

const getConditionLabel = (condition: string): string => {
  const labels: Record<string, string> = {
    'excellent': 'ممتازة',
    'good': 'جيدة',
    'fair': 'مقبولة',
    'poor': 'ضعيفة',
    'damaged': 'متضررة'
  };
  return labels[condition] || condition;
};

const getConditionColor = (condition: string): string => {
  switch (condition) {
    case 'excellent':
    case 'good':
      return 'text-green-700 bg-green-50';
    case 'fair':
      return 'text-yellow-700 bg-yellow-50';
    case 'poor':
    case 'damaged':
      return 'text-red-700 bg-red-50';
    default:
      return 'text-slate-700 bg-slate-50';
  }
};

export const ContractVehicleConditionReport: React.FC<ContractVehicleConditionReportProps> = ({
  conditionData,
  vehicleInfo,
  className = ""
}) => {
  if (!conditionData) {
    return (
      <div className={`vehicle-condition-report ${className}`}>
        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center text-slate-500">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">لم يتم إرفاق تقرير فحص المركبة</p>
        </div>
      </div>
    );
  }

  // تحليل بيانات الحالة من condition_items
  const conditionItems = conditionData.condition_items || {};
  
  // استخراج البيانات المهمة للعرض
  const exteriorItems = conditionItems.exterior || {};
  const interiorItems = conditionItems.interior || {};
  const mechanicalItems = conditionItems.mechanical || {};
  const fluidItems = conditionItems.fluids || {};

  return (
    <div className={`vehicle-condition-report ${className}`}>
      {/* Header */}
      <div className="border-b-2 border-blue-600 pb-4 mb-6">
        <h3 className="text-xl font-bold text-blue-600 text-center mb-2">
          تقرير فحص المركبة
        </h3>
        <div className="text-center text-sm text-slate-600">
          {vehicleInfo && <p className="mb-1">{vehicleInfo}</p>}
          <p>تاريخ الفحص: {formatDateInGregorian(conditionData.created_at)}</p>
          {conditionData.inspector_name && (
            <p>المفتش: {conditionData.inspector_name}</p>
          )}
        </div>
      </div>

      {/* الحالة العامة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="info-item p-3 bg-slate-50 border-r-4 border-blue-600">
          <div className="info-label font-bold text-slate-700 mb-1">الحالة العامة</div>
          <div className="flex items-center gap-2">
            {getConditionIcon(conditionData.overall_condition)}
            <Badge className={getConditionColor(conditionData.overall_condition)}>
              {getConditionLabel(conditionData.overall_condition)}
            </Badge>
          </div>
        </div>
        
        <div className="info-item p-3 bg-slate-50 border-r-4 border-blue-600">
          <div className="info-label font-bold text-slate-700 mb-1">قراءة العداد</div>
          <div className="info-value text-slate-900">
            {conditionData.mileage_reading.toLocaleString()} كم
          </div>
        </div>
        
        <div className="info-item p-3 bg-slate-50 border-r-4 border-blue-600">
          <div className="info-label font-bold text-slate-700 mb-1">مستوى الوقود</div>
          <div className="info-value text-slate-900">
            {conditionData.fuel_level}%
          </div>
        </div>
      </div>

      {/* تفاصيل الفحص */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* الفحص الخارجي */}
        {Object.keys(exteriorItems).length > 0 && (
          <div className="condition-category">
            <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-1">
              الفحص الخارجي
            </h4>
            <div className="space-y-2">
              {Object.entries(exteriorItems).map(([key, value]: [string, any]) => (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1">
                    {getConditionIcon(value)}
                    <span className={`text-xs px-2 py-1 rounded ${getConditionColor(value)}`}>
                      {typeof value === 'string' ? getConditionLabel(value) : value ? 'جيد' : 'يحتاج فحص'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* الفحص الداخلي */}
        {Object.keys(interiorItems).length > 0 && (
          <div className="condition-category">
            <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-1">
              الفحص الداخلي
            </h4>
            <div className="space-y-2">
              {Object.entries(interiorItems).map(([key, value]: [string, any]) => (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1">
                    {getConditionIcon(value)}
                    <span className={`text-xs px-2 py-1 rounded ${getConditionColor(value)}`}>
                      {typeof value === 'string' ? getConditionLabel(value) : value ? 'جيد' : 'يحتاج فحص'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* الفحص الميكانيكي والسوائل */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* الفحص الميكانيكي */}
        {Object.keys(mechanicalItems).length > 0 && (
          <div className="condition-category">
            <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-1">
              الفحص الميكانيكي
            </h4>
            <div className="space-y-2">
              {Object.entries(mechanicalItems).map(([key, value]: [string, any]) => (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1">
                    {getConditionIcon(value)}
                    <span className={`text-xs px-2 py-1 rounded ${getConditionColor(value)}`}>
                      {typeof value === 'string' ? getConditionLabel(value) : value ? 'جيد' : 'يحتاج فحص'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* فحص السوائل */}
        {Object.keys(fluidItems).length > 0 && (
          <div className="condition-category">
            <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-1">
              فحص السوائل
            </h4>
            <div className="space-y-2">
              {Object.entries(fluidItems).map(([key, value]: [string, any]) => (
                <div key={key} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1">
                    {getConditionIcon(value)}
                    <span className={`text-xs px-2 py-1 rounded ${getConditionColor(value)}`}>
                      {typeof value === 'string' ? getConditionLabel(value) : value ? 'جيد' : 'يحتاج فحص'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* المشاكل والأضرار */}
      {conditionData.damage_items && conditionData.damage_items.length > 0 && (
        <div className="damage-section mb-6">
          <h4 className="font-bold text-red-700 mb-3 border-b border-red-200 pb-1">
            المشاكل والأضرار المكتشفة
          </h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
            {conditionData.damage_items.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                {typeof item === 'string' ? item : item.description || `ضرر في الموقع (${item.x}, ${item.y})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* مخطط المركبة البصري */}
      {conditionData.damage_items && conditionData.damage_items.length > 0 && (
        <div className="mb-6">
          <VehicleConditionDiagram 
            damagePoints={conditionData.damage_items
              .filter((item): item is DamageItem => typeof item === 'object')
              .map(item => ({
                id: item.id,
                x: item.x,
                y: item.y,
                severity: (item.severity === 'خطير' || item.severity === 'severe') ? 'severe' as const :
                         (item.severity === 'متوسط' || item.severity === 'moderate') ? 'moderate' as const : 'minor' as const,
                description: item.description
              }))}
            readOnly={true}
          />
        </div>
      )}

      {/* ملاحظات */}
      {conditionData.notes && (
        <div className="notes-section">
          <h4 className="font-bold text-slate-800 mb-3 border-b border-slate-200 pb-1">
            ملاحظات المفتش
          </h4>
          <div className="bg-blue-50 p-4 rounded-lg border-r-4 border-blue-500">
            <p className="text-sm text-slate-700 whitespace-pre-line">
              {conditionData.notes}
            </p>
          </div>
        </div>
      )}

      {/* تاريخ الفحص */}
      <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-500">
        تم إجراء هذا الفحص بتاريخ {formatDateInGregorian(conditionData.created_at)} 
        {conditionData.inspection_type === 'pre_dispatch' ? ' (فحص ما قبل التسليم)' : ' (فحص ما بعد الإرجاع)'}
      </div>
    </div>
  );
};
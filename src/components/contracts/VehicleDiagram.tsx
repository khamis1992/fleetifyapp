import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DamagePoint {
  x: number;
  y: number;
  id: string;
  severity: string;
  description: string;
}

interface VehicleDiagramProps {
  damageItems?: (string | DamagePoint)[];
  className?: string;
}

const getSeverityColor = (severity: string): string => {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'severe':
      return '#ef4444'; // red
    case 'moderate':
      return '#f59e0b'; // amber
    case 'minor':
    case 'low':
      return '#eab308'; // yellow
    default:
      return '#ef4444'; // default to red
  }
};

export const VehicleDiagram: React.FC<VehicleDiagramProps> = ({ 
  damageItems = [],
  className = ""
}) => {
  // فلترة النقاط التي لها إحداثيات صحيحة
  const damagePoints = damageItems
    .filter((item): item is DamagePoint => 
      typeof item === 'object' && 
      typeof item.x === 'number' && 
      typeof item.y === 'number' &&
      item.x >= 0 && item.x <= 100 &&
      item.y >= 0 && item.y <= 100
    );

  if (damagePoints.length === 0) {
    return null;
  }

  return (
    <div className={`vehicle-diagram ${className}`}>
      <div className="mb-4">
        <h4 className="font-bold text-gray-800 mb-3 border-b border-gray-200 pb-1">
          مخطط المركبة - مواقع الأضرار
        </h4>
      </div>
      
      <div className="relative bg-gray-100 border-2 border-gray-300 rounded-lg p-4">
        {/* رسم المركبة باستخدام SVG */}
        <svg 
          viewBox="0 0 400 200" 
          className="w-full h-48 mb-4"
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          {/* جسم المركبة */}
          <rect 
            x="50" 
            y="60" 
            width="300" 
            height="80" 
            fill="#e5e7eb" 
            stroke="#374151" 
            strokeWidth="2"
            rx="10"
          />
          
          {/* النوافذ */}
          <rect 
            x="80" 
            y="70" 
            width="60" 
            height="25" 
            fill="#bfdbfe" 
            stroke="#1e40af" 
            strokeWidth="1"
            rx="3"
          />
          <rect 
            x="260" 
            y="70" 
            width="60" 
            height="25" 
            fill="#bfdbfe" 
            stroke="#1e40af" 
            strokeWidth="1"
            rx="3"
          />
          
          {/* العجلات */}
          <circle cx="90" cy="160" r="15" fill="#374151" stroke="#111827" strokeWidth="2"/>
          <circle cx="310" cy="160" r="15" fill="#374151" stroke="#111827" strokeWidth="2"/>
          
          {/* المصابيح الأمامية */}
          <circle cx="60" cy="80" r="8" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
          <circle cx="60" cy="120" r="8" fill="#fbbf24" stroke="#d97706" strokeWidth="1"/>
          
          {/* المصابيح الخلفية */}
          <circle cx="340" cy="80" r="8" fill="#ef4444" stroke="#dc2626" strokeWidth="1"/>
          <circle cx="340" cy="120" r="8" fill="#ef4444" stroke="#dc2626" strokeWidth="1"/>
          
          {/* الأبواب */}
          <line x1="160" y1="60" x2="160" y2="140" stroke="#374151" strokeWidth="1"/>
          <line x1="240" y1="60" x2="240" y2="140" stroke="#374151" strokeWidth="1"/>
          
          {/* نقاط الأضرار */}
          {damagePoints.map((point, index) => {
            // تحويل النسبة المئوية إلى إحداثيات SVG
            const svgX = 50 + (point.x / 100) * 300;
            const svgY = 60 + (point.y / 100) * 80;
            
            return (
              <g key={point.id || index}>
                {/* دائرة الضرر */}
                <circle
                  cx={svgX}
                  cy={svgY}
                  r="8"
                  fill={getSeverityColor(point.severity)}
                  stroke="#ffffff"
                  strokeWidth="2"
                  opacity="0.9"
                />
                {/* رمز التحذير */}
                <text
                  x={svgX}
                  y={svgY + 1}
                  textAnchor="middle"
                  fill="white"
                  fontSize="8"
                  fontWeight="bold"
                >
                  !
                </text>
                {/* رقم النقطة */}
                <text
                  x={svgX}
                  y={svgY - 12}
                  textAnchor="middle"
                  fill="#374151"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {index + 1}
                </text>
              </g>
            );
          })}
        </svg>
        
        {/* قائمة الأضرار */}
        <div className="mt-4">
          <h5 className="font-semibold text-gray-700 mb-2">تفاصيل الأضرار:</h5>
          <div className="space-y-2">
            {damagePoints.map((point, index) => (
              <div key={point.id || index} className="flex items-start gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-gray-600 text-white text-xs flex items-center justify-center font-bold">
                    {index + 1}
                  </span>
                  <div 
                    className="w-4 h-4 rounded-full border border-white"
                    style={{ backgroundColor: getSeverityColor(point.severity) }}
                  ></div>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{point.description}</div>
                  <div className="text-gray-600">
                    الموقع: ({point.x}%, {point.y}%) - المستوى: {point.severity}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* مفتاح الألوان */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <h6 className="text-xs font-semibold text-gray-600 mb-2">مفتاح الألوان:</h6>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>خطير</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span>متوسط</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>بسيط</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
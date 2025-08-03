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
          المخطط المعتمد للمركبة - تحديد مواقع الأضرار
        </h4>
        <p className="text-xs text-gray-600">مخطط رسمي معتمد لتوثيق حالة المركبة وفقاً للمعايير المهنية</p>
      </div>
      
      <div className="relative bg-white border-2 border-gray-400 rounded-lg p-6">
        {/* مخطط المركبة الاحترافي */}
        <svg 
          viewBox="0 0 500 300" 
          className="w-full h-64 mb-4 border border-gray-300 rounded"
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          {/* خلفية شبكية للقياس */}
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* جسم المركبة الرئيسي - منظر علوي احترافي */}
          <g id="vehicle-body">
            {/* الجسم الخارجي */}
            <path 
              d="M 100 80 
                 L 400 80 
                 Q 420 80 420 100
                 L 420 200
                 Q 420 220 400 220
                 L 100 220
                 Q 80 220 80 200
                 L 80 100
                 Q 80 80 100 80 Z"
              fill="#e5e7eb" 
              stroke="#374151" 
              strokeWidth="3"
            />
            
            {/* الزجاج الأمامي */}
            <path 
              d="M 100 90 
                 L 380 90 
                 Q 390 90 390 100
                 L 390 120
                 L 100 120
                 Q 90 120 90 110
                 L 90 100
                 Q 90 90 100 90 Z"
              fill="#bfdbfe" 
              stroke="#1e40af" 
              strokeWidth="2"
            />
            
            {/* الزجاج الخلفي */}
            <path 
              d="M 100 180 
                 L 390 180 
                 L 390 200
                 Q 390 210 380 210
                 L 100 210
                 Q 90 210 90 200
                 L 90 190
                 Q 90 180 100 180 Z"
              fill="#bfdbfe" 
              stroke="#1e40af" 
              strokeWidth="2"
            />
            
            {/* النوافذ الجانبية */}
            <rect x="100" y="130" width="50" height="40" fill="#bfdbfe" stroke="#1e40af" strokeWidth="1.5" rx="3"/>
            <rect x="340" y="130" width="50" height="40" fill="#bfdbfe" stroke="#1e40af" strokeWidth="1.5" rx="3"/>
            
            {/* الأبواب */}
            <line x1="180" y1="80" x2="180" y2="220" stroke="#374151" strokeWidth="2"/>
            <line x1="320" y1="80" x2="320" y2="220" stroke="#374151" strokeWidth="2"/>
            <line x1="250" y1="80" x2="250" y2="220" stroke="#6b7280" strokeWidth="1" strokeDasharray="5,5"/>
            
            {/* مقابض الأبواب */}
            <circle cx="170" cy="150" r="3" fill="#374151"/>
            <circle cx="190" cy="150" r="3" fill="#374151"/>
            <circle cx="310" cy="150" r="3" fill="#374151"/>
            <circle cx="330" cy="150" r="3" fill="#374151"/>
          </g>
          
          {/* العجلات */}
          <g id="wheels">
            {/* العجلة الأمامية اليسرى */}
            <circle cx="130" cy="60" r="18" fill="#1f2937" stroke="#111827" strokeWidth="3"/>
            <circle cx="130" cy="60" r="12" fill="#4b5563" stroke="#374151" strokeWidth="2"/>
            <circle cx="130" cy="60" r="6" fill="#6b7280"/>
            
            {/* العجلة الأمامية اليمنى */}
            <circle cx="370" cy="60" r="18" fill="#1f2937" stroke="#111827" strokeWidth="3"/>
            <circle cx="370" cy="60" r="12" fill="#4b5563" stroke="#374151" strokeWidth="2"/>
            <circle cx="370" cy="60" r="6" fill="#6b7280"/>
            
            {/* العجلة الخلفية اليسرى */}
            <circle cx="130" cy="240" r="18" fill="#1f2937" stroke="#111827" strokeWidth="3"/>
            <circle cx="130" cy="240" r="12" fill="#4b5563" stroke="#374151" strokeWidth="2"/>
            <circle cx="130" cy="240" r="6" fill="#6b7280"/>
            
            {/* العجلة الخلفية اليمنى */}
            <circle cx="370" cy="240" r="18" fill="#1f2937" stroke="#111827" strokeWidth="3"/>
            <circle cx="370" cy="240" r="12" fill="#4b5563" stroke="#374151" strokeWidth="2"/>
            <circle cx="370" cy="240" r="6" fill="#6b7280"/>
          </g>
          
          {/* المصابيح */}
          <g id="lights">
            {/* المصابيح الأمامية */}
            <ellipse cx="85" cy="110" rx="8" ry="12" fill="#fbbf24" stroke="#d97706" strokeWidth="2"/>
            <ellipse cx="85" cy="190" rx="8" ry="12" fill="#fbbf24" stroke="#d97706" strokeWidth="2"/>
            
            {/* المصابيح الخلفية */}
            <ellipse cx="415" cy="110" rx="8" ry="12" fill="#ef4444" stroke="#dc2626" strokeWidth="2"/>
            <ellipse cx="415" cy="190" rx="8" ry="12" fill="#ef4444" stroke="#dc2626" strokeWidth="2"/>
            
            {/* مصابيح الإشارة */}
            <circle cx="85" cy="150" r="6" fill="#f59e0b" stroke="#d97706" strokeWidth="1"/>
            <circle cx="415" cy="150" r="6" fill="#f59e0b" stroke="#d97706" strokeWidth="1"/>
          </g>
          
          {/* الأجزاء الخارجية */}
          <g id="exterior-parts">
            {/* المرايا */}
            <ellipse cx="70" cy="120" rx="4" ry="8" fill="#374151" stroke="#111827" strokeWidth="1"/>
            <ellipse cx="430" cy="120" rx="4" ry="8" fill="#374151" stroke="#111827" strokeWidth="1"/>
            <ellipse cx="70" cy="180" rx="4" ry="8" fill="#374151" stroke="#111827" strokeWidth="1"/>
            <ellipse cx="430" cy="180" rx="4" ry="8" fill="#374151" stroke="#111827" strokeWidth="1"/>
            
            {/* المصد الأمامي والخلفي */}
            <rect x="60" y="105" width="15" height="90" fill="#d1d5db" stroke="#9ca3af" strokeWidth="2" rx="3"/>
            <rect x="425" y="105" width="15" height="90" fill="#d1d5db" stroke="#9ca3af" strokeWidth="2" rx="3"/>
          </g>
          
          {/* التسميات والمقاييس */}
          <g id="labels" fontSize="10" fill="#374151" fontFamily="Arial, sans-serif">
            <text x="250" y="20" textAnchor="middle" fontWeight="bold">مخطط فحص المركبة المعتمد</text>
            <text x="250" y="35" textAnchor="middle" fontSize="8">منظر علوي - Vehicle Top View</text>
            
            {/* محاور الإحداثيات */}
            <text x="20" y="150" textAnchor="middle" fontSize="8" transform="rotate(-90, 20, 150)">الطول</text>
            <text x="250" y="290" textAnchor="middle" fontSize="8">العرض</text>
            
            {/* أرقام القياس */}
            <text x="45" y="295" textAnchor="middle" fontSize="8">0%</text>
            <text x="250" y="295" textAnchor="middle" fontSize="8">50%</text>
            <text x="455" y="295" textAnchor="middle" fontSize="8">100%</text>
          </g>
          
          {/* نقاط الأضرار */}
          {damagePoints.map((point, index) => {
            // تحويل النسبة المئوية إلى إحداثيات SVG (منطقة جسم المركبة)
            const svgX = 80 + (point.x / 100) * 340;
            const svgY = 80 + (point.y / 100) * 140;
            
            return (
              <g key={point.id || index}>
                {/* دائرة تحديد منطقة الضرر */}
                <circle
                  cx={svgX}
                  cy={svgY}
                  r="12"
                  fill={getSeverityColor(point.severity)}
                  stroke="#ffffff"
                  strokeWidth="3"
                  opacity="0.9"
                />
                {/* رقم نقطة الضرر */}
                <text
                  x={svgX}
                  y={svgY + 2}
                  textAnchor="middle"
                  fill="white"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {index + 1}
                </text>
                {/* خط ربط بالتفاصيل */}
                <line
                  x1={svgX}
                  y1={svgY - 12}
                  x2={svgX}
                  y2={svgY - 25}
                  stroke={getSeverityColor(point.severity)}
                  strokeWidth="2"
                />
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
/**
 * مكون توليد التقارير المخصصة
 * Report Generator Component
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Wrench,
  DollarSign,
  Activity,
  TrendingUp,
  Calendar,
  AlertTriangle,
  Download,
  Eye,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import type { 
  ReportType, 
  CustomReport,
  FleetAnalyticsSummary,
  VehicleReportData,
  MaintenanceReportData,
} from '../types/reports.types';

interface ReportGeneratorProps {
  analytics: FleetAnalyticsSummary | null;
  vehicles: VehicleReportData[];
  maintenance: MaintenanceReportData[];
  isDark: boolean;
  formatCurrency: (value: number) => string;
}

const reportTemplates: CustomReport[] = [
  {
    id: 'vehicle-usage',
    type: 'vehicle-usage',
    title: 'تقرير استخدام المركبات',
    description: 'تتبع استخدام المركبات وكفاءة الإيجار والإيرادات المحققة',
    icon: 'FileText',
    color: 'violet',
    isAvailable: true,
  },
  {
    id: 'maintenance-cost',
    type: 'maintenance-cost',
    title: 'تحليل تكاليف الصيانة',
    description: 'تحليل شامل لتكاليف الصيانة والأنماط والتوقعات المستقبلية',
    icon: 'Wrench',
    color: 'amber',
    isAvailable: true,
  },
  {
    id: 'financial-performance',
    type: 'financial-performance',
    title: 'الأداء المالي',
    description: 'تحليل الإيرادات والإهلاك والعائد على الاستثمار',
    icon: 'DollarSign',
    color: 'emerald',
    isAvailable: true,
  },
  {
    id: 'operational-efficiency',
    type: 'operational-efficiency',
    title: 'الكفاءة التشغيلية',
    description: 'قياس كفاءة العمليات ومعدلات استخدام الأسطول',
    icon: 'Activity',
    color: 'cyan',
    isAvailable: true,
  },
  {
    id: 'profitability',
    type: 'profitability',
    title: 'تحليل الربحية',
    description: 'تحليل ربحية كل مركبة والأسطول ككل على مدار الزمن',
    icon: 'TrendingUp',
    color: 'rose',
    isAvailable: true,
  },
  {
    id: 'forecasting',
    type: 'forecasting',
    title: 'تقرير التوقعات',
    description: 'توقعات الإيرادات والتكاليف للأشهر القادمة',
    icon: 'Calendar',
    color: 'indigo',
    isAvailable: true,
  },
];

const iconMap = {
  FileText,
  Wrench,
  DollarSign,
  Activity,
  TrendingUp,
  Calendar,
  AlertTriangle,
};

const colorMap = {
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-500', border: 'border-violet-500/30' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/30' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/30' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-500', border: 'border-cyan-500/30' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-500', border: 'border-rose-500/30' },
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-500', border: 'border-indigo-500/30' },
};

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
  analytics,
  vehicles,
  maintenance,
  isDark,
  formatCurrency,
}) => {
  
  const generateReport = (type: ReportType) => {
    if (!analytics) {
      toast.error('لا توجد بيانات لإنشاء التقرير');
      return;
    }

    let content = '';
    let title = '';

    switch (type) {
      case 'vehicle-usage':
        title = 'تقرير استخدام المركبات';
        content = generateVehicleUsageReport();
        break;
      case 'maintenance-cost':
        title = 'تحليل تكاليف الصيانة';
        content = generateMaintenanceCostReport();
        break;
      case 'financial-performance':
        title = 'تقرير الأداء المالي';
        content = generateFinancialPerformanceReport();
        break;
      case 'operational-efficiency':
        title = 'تقرير الكفاءة التشغيلية';
        content = generateOperationalEfficiencyReport();
        break;
      case 'profitability':
        title = 'تحليل الربحية';
        content = generateProfitabilityReport();
        break;
      case 'forecasting':
        title = 'تقرير التوقعات';
        content = generateForecastingReport();
        break;
      default:
        toast.error('نوع التقرير غير معروف');
        return;
    }

    createHTMLReport(content, title);
    toast.success(`تم إنشاء ${title} بنجاح`);
  };

  const generateVehicleUsageReport = () => `
    <div class="summary-stats">
      <div class="stat-card">
        <div class="stat-value">${analytics?.totalVehicles || 0}</div>
        <div class="stat-label">إجمالي المركبات</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${analytics?.availableVehicles || 0}</div>
        <div class="stat-label">المركبات المتاحة</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${analytics?.rentedVehicles || 0}</div>
        <div class="stat-label">المركبات المؤجرة</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${analytics?.utilizationRate.toFixed(1)}%</div>
        <div class="stat-label">معدل الاستخدام</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>رقم اللوحة</th>
          <th>الماركة</th>
          <th>النموذج</th>
          <th>السنة</th>
          <th>الحالة</th>
          <th>السعر اليومي</th>
          <th>السعر الشهري</th>
        </tr>
      </thead>
      <tbody>
        ${vehicles.map(vehicle => `
          <tr>
            <td>${vehicle.plate_number}</td>
            <td>${vehicle.make}</td>
            <td>${vehicle.model}</td>
            <td>${vehicle.year}</td>
            <td class="status-${vehicle.status}">${
              vehicle.status === 'available' ? 'متاحة' : 
              vehicle.status === 'rented' ? 'مؤجرة' : 
              vehicle.status === 'maintenance' ? 'صيانة' : 'محجوزة'
            }</td>
            <td>${formatCurrency(vehicle.daily_rate)}</td>
            <td>${formatCurrency(vehicle.monthly_rate)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const generateMaintenanceCostReport = () => {
    const totalCost = maintenance.reduce((sum, m) => sum + m.estimated_cost, 0);
    const completedCount = maintenance.filter(m => m.status === 'completed').length;
    const pendingCount = maintenance.filter(m => m.status === 'pending').length;

    return `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">${maintenance.length}</div>
          <div class="stat-label">إجمالي أعمال الصيانة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${completedCount}</div>
          <div class="stat-label">الصيانة المكتملة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${pendingCount}</div>
          <div class="stat-label">الصيانة المعلقة</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatCurrency(totalCost)}</div>
          <div class="stat-label">إجمالي التكلفة</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>رقم اللوحة</th>
            <th>نوع الصيانة</th>
            <th>التاريخ المجدول</th>
            <th>الحالة</th>
            <th>التكلفة المقدرة</th>
          </tr>
        </thead>
        <tbody>
          ${maintenance.map(m => `
            <tr>
              <td>${m.plate_number}</td>
              <td>${m.maintenance_type}</td>
              <td>${new Date(m.scheduled_date).toLocaleDateString('en-GB')}</td>
              <td class="status-${m.status}">${
                m.status === 'completed' ? 'مكتملة' : 
                m.status === 'in_progress' ? 'قيد التنفيذ' : 'معلقة'
              }</td>
              <td>${formatCurrency(m.estimated_cost)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateFinancialPerformanceReport = () => `
    <div class="summary-stats">
      <div class="stat-card highlight">
        <div class="stat-value">${formatCurrency(analytics?.totalBookValue || 0)}</div>
        <div class="stat-label">قيمة الأسطول</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatCurrency(analytics?.totalRevenue || 0)}</div>
        <div class="stat-label">الإيرادات الشهرية المحتملة</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatCurrency(analytics?.totalDepreciation || 0)}</div>
        <div class="stat-label">إجمالي الإهلاك</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${formatCurrency(analytics?.monthlyMaintenanceCost || 0)}</div>
        <div class="stat-label">تكلفة الصيانة الشهرية</div>
      </div>
    </div>

    <div class="analysis-section">
      <h3>تحليل الأداء المالي</h3>
      <div class="metrics-grid">
        <div class="metric">
          <span class="metric-label">معدل الاستخدام:</span>
          <span class="metric-value">${analytics?.utilizationRate.toFixed(1)}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">الإيرادات الفعلية:</span>
          <span class="metric-value">${formatCurrency((analytics?.totalRevenue || 0) * (analytics?.utilizationRate || 0) / 100)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">صافي الإيرادات:</span>
          <span class="metric-value highlight">${formatCurrency(analytics?.totalProfit || 0)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">هامش الربح:</span>
          <span class="metric-value">${analytics?.profitMargin.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  `;

  const generateOperationalEfficiencyReport = () => `
    <div class="summary-stats">
      <div class="stat-card ${(analytics?.utilizationRate || 0) >= 70 ? 'success' : 'warning'}">
        <div class="stat-value">${analytics?.utilizationRate.toFixed(1)}%</div>
        <div class="stat-label">معدل الاستخدام</div>
        <div class="stat-target">الهدف: 80%</div>
      </div>
      <div class="stat-card ${(analytics?.maintenanceRate || 0) <= 10 ? 'success' : 'warning'}">
        <div class="stat-value">${analytics?.maintenanceRate.toFixed(1)}%</div>
        <div class="stat-label">معدل الصيانة</div>
        <div class="stat-target">الهدف: &lt;10%</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${((analytics?.availableVehicles || 0) / (analytics?.totalVehicles || 1) * 100).toFixed(1)}%</div>
        <div class="stat-label">معدل التوفر</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${analytics?.totalVehicles || 0}</div>
        <div class="stat-label">حجم الأسطول</div>
      </div>
    </div>

    <div class="analysis-section">
      <h3>التوصيات</h3>
      <ul class="recommendations">
        ${(analytics?.utilizationRate || 0) < 70 ? '<li class="warning">⚠️ معدل الاستخدام منخفض - يُنصح بتحسين استراتيجيات التسويق</li>' : '<li class="success">✅ معدل الاستخدام جيد</li>'}
        ${(analytics?.maintenanceRate || 0) > 15 ? '<li class="warning">⚠️ معدل الصيانة مرتفع - يُنصح بمراجعة خطة الصيانة الوقائية</li>' : '<li class="success">✅ معدل الصيانة ضمن الحدود المقبولة</li>'}
        ${(analytics?.availableVehicles || 0) > (analytics?.totalVehicles || 1) * 0.4 ? '<li class="info">ℹ️ نسبة عالية من المركبات المتاحة - فرصة لزيادة الإيجارات</li>' : ''}
      </ul>
    </div>
  `;

  const generateProfitabilityReport = () => {
    const actualRevenue = (analytics?.totalRevenue || 0) * (analytics?.utilizationRate || 0) / 100;
    
    return `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">${formatCurrency(actualRevenue)}</div>
          <div class="stat-label">الإيرادات الفعلية</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatCurrency(analytics?.monthlyMaintenanceCost || 0)}</div>
          <div class="stat-label">تكاليف الصيانة</div>
        </div>
        <div class="stat-card highlight">
          <div class="stat-value">${formatCurrency(analytics?.totalProfit || 0)}</div>
          <div class="stat-label">صافي الربح</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${analytics?.profitMargin.toFixed(1)}%</div>
          <div class="stat-label">هامش الربح</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>رقم اللوحة</th>
            <th>الماركة / الموديل</th>
            <th>السعر الشهري</th>
            <th>الحالة</th>
            <th>الربحية</th>
          </tr>
        </thead>
        <tbody>
          ${vehicles.map(vehicle => {
            const isProfitable = vehicle.status === 'rented';
            return `
              <tr>
                <td>${vehicle.plate_number}</td>
                <td>${vehicle.make} ${vehicle.model}</td>
                <td>${formatCurrency(vehicle.monthly_rate)}</td>
                <td class="status-${vehicle.status}">${
                  vehicle.status === 'available' ? 'متاحة' : 
                  vehicle.status === 'rented' ? 'مؤجرة' : 
                  vehicle.status === 'maintenance' ? 'صيانة' : 'محجوزة'
                }</td>
                <td class="${isProfitable ? 'profitable' : 'not-profitable'}">${isProfitable ? '✅ مربحة' : '⏸️ غير نشطة'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  };

  const generateForecastingReport = () => {
    const actualRevenue = (analytics?.totalRevenue || 0) * (analytics?.utilizationRate || 0) / 100;
    
    return `
      <div class="summary-stats">
        <div class="stat-card">
          <div class="stat-value">${formatCurrency(actualRevenue * 3)}</div>
          <div class="stat-label">توقعات 3 أشهر</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${formatCurrency(actualRevenue * 6)}</div>
          <div class="stat-label">توقعات 6 أشهر</div>
        </div>
        <div class="stat-card highlight">
          <div class="stat-value">${formatCurrency(actualRevenue * 12)}</div>
          <div class="stat-label">توقعات سنوية</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${analytics?.utilizationRate.toFixed(1)}%</div>
          <div class="stat-label">معدل الاستخدام الحالي</div>
        </div>
      </div>

      <div class="analysis-section">
        <h3>تحليل التوقعات</h3>
        <div class="forecast-details">
          <p><strong>الإيرادات الشهرية الحالية:</strong> ${formatCurrency(actualRevenue)}</p>
          <p><strong>معدل النمو المتوقع:</strong> 5% شهرياً (افتراضي)</p>
          
          <h4>توقعات محسنة بمعدل نمو 5%:</h4>
          <ul>
            <li>3 أشهر: ${formatCurrency(actualRevenue * 3 * 1.05)}</li>
            <li>6 أشهر: ${formatCurrency(actualRevenue * 6 * 1.10)}</li>
            <li>12 شهر: ${formatCurrency(actualRevenue * 12 * 1.20)}</li>
          </ul>
        </div>
        
        <h4>توصيات لتحسين التوقعات:</h4>
        <ul class="recommendations">
          <li>🎯 زيادة معدل الاستخدام إلى 85%</li>
          <li>💰 تحسين استراتيجيات التسعير</li>
          <li>🚀 تطوير خدمات إضافية</li>
          <li>📈 توسيع قاعدة العملاء</li>
        </ul>
      </div>
    `;
  };

  const createHTMLReport = (content: string, title: string) => {
    const currentDate = new Date().toLocaleDateString('en-GB');
    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        @page { size: A4; margin: 2cm; }
        @media print { 
            body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none; }
        }
        * { box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #1f2937; 
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); 
            padding: 40px;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .company-name { 
            font-size: 32px; 
            font-weight: bold;
            margin-bottom: 8px;
            letter-spacing: 2px;
        }
        .report-title { 
            font-size: 24px;
            opacity: 0.95;
            margin-bottom: 8px;
        }
        .report-date { 
            font-size: 14px;
            opacity: 0.8;
        }
        .content { padding: 40px; }
        .summary-stats { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin-bottom: 40px;
        }
        .stat-card { 
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            padding: 24px;
            border-radius: 16px;
            text-align: center;
            border: 1px solid #e2e8f0;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover { transform: translateY(-4px); box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
        .stat-card.highlight { 
            background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
            color: white;
        }
        .stat-card.success { border-color: #10b981; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); }
        .stat-card.warning { border-color: #f59e0b; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); }
        .stat-value { font-size: 32px; font-weight: bold; color: #1f2937; margin-bottom: 4px; }
        .stat-card.highlight .stat-value { color: white; }
        .stat-label { font-size: 14px; color: #64748b; }
        .stat-card.highlight .stat-label { color: rgba(255,255,255,0.9); }
        .stat-target { font-size: 12px; color: #94a3b8; margin-top: 8px; }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 30px 0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        th, td { 
            padding: 16px 20px; 
            text-align: right;
        }
        th { 
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            color: white;
            font-weight: 600;
            font-size: 14px;
        }
        td { border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background-color: #f9fafb; }
        tr:hover { background-color: #f3f4f6; }
        .status-available { color: #10b981; font-weight: 600; }
        .status-rented { color: #f43f5e; font-weight: 600; }
        .status-maintenance { color: #f59e0b; font-weight: 600; }
        .status-reserved { color: #3b82f6; font-weight: 600; }
        .status-completed { color: #10b981; font-weight: 600; }
        .status-pending { color: #f59e0b; font-weight: 600; }
        .status-in_progress { color: #3b82f6; font-weight: 600; }
        .profitable { color: #10b981; font-weight: 600; }
        .not-profitable { color: #94a3b8; }
        .analysis-section { 
            margin: 30px 0; 
            padding: 30px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-radius: 16px;
            border: 1px solid #e2e8f0;
        }
        .analysis-section h3 { 
            color: #1f2937;
            margin-bottom: 20px;
            font-size: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .analysis-section h4 { 
            color: #374151;
            margin: 20px 0 10px;
            font-size: 16px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            padding: 12px 16px;
            background: white;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }
        .metric-label { color: #64748b; }
        .metric-value { font-weight: 600; color: #1f2937; }
        .metric-value.highlight { color: #8b5cf6; }
        .recommendations { 
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .recommendations li { 
            padding: 12px 16px;
            margin-bottom: 8px;
            border-radius: 8px;
            background: white;
            border: 1px solid #e2e8f0;
        }
        .recommendations li.success { background: #ecfdf5; border-color: #10b981; }
        .recommendations li.warning { background: #fffbeb; border-color: #f59e0b; }
        .recommendations li.info { background: #eff6ff; border-color: #3b82f6; }
        .controls { 
            margin: 30px 0; 
            text-align: center;
            display: flex;
            justify-content: center;
            gap: 16px;
        }
        .btn { 
            background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
            color: white; 
            padding: 12px 32px; 
            border: none; 
            border-radius: 12px; 
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover { 
            transform: translateY(-2px);
            box-shadow: 0 10px 40px rgba(139, 92, 246, 0.3);
        }
        .btn-secondary {
            background: #f1f5f9;
            color: #374151;
        }
        .btn-secondary:hover {
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        .forecast-details p { margin: 8px 0; }
        .forecast-details ul { margin: 16px 0; padding-right: 20px; }
        .forecast-details li { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="company-name">✨ Fleetify</div>
            <div class="report-title">${title}</div>
            <div class="report-date">تاريخ التقرير: ${currentDate}</div>
        </div>
        
        <div class="content">
            ${content}
        </div>
        
        <div class="controls no-print">
            <button class="btn" onclick="window.print()">🖨️ طباعة التقرير</button>
            <button class="btn btn-secondary" onclick="window.close()">إغلاق</button>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const newWindow = window.open(url, '_blank');
    
    if (newWindow) {
      newWindow.focus();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className={cn(
        "rounded-2xl p-6",
        "backdrop-blur-xl border",
        isDark 
          ? "bg-gray-900/60 border-gray-800/50" 
          : "bg-white/80 border-gray-200/50",
        "shadow-xl"
      )}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-violet-500 to-cyan-500 rounded-xl">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className={cn(
              "text-lg font-semibold",
              isDark ? "text-white" : "text-gray-900"
            )}>
              التقارير المخصصة
            </h3>
            <p className={cn(
              "text-sm",
              isDark ? "text-gray-400" : "text-gray-600"
            )}>
              إنشاء وتصدير تقارير مفصلة عن أداء الأسطول
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportTemplates.map((report, index) => {
          const Icon = iconMap[report.icon as keyof typeof iconMap] || FileText;
          const colors = colorMap[report.color as keyof typeof colorMap] || colorMap.violet;
          
          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + index * 0.1 }}
              className={cn(
                "p-4 rounded-xl border",
                "transition-all duration-300",
                isDark 
                  ? "bg-gray-800/50 border-gray-700/50 hover:bg-gray-800" 
                  : "bg-gray-50 border-gray-200 hover:bg-white hover:shadow-lg"
              )}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  colors.bg
                )}>
                  <Icon className={cn("w-5 h-5", colors.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    "font-semibold text-sm",
                    isDark ? "text-white" : "text-gray-900"
                  )}>
                    {report.title}
                  </h4>
                  <p className={cn(
                    "text-xs mt-1 line-clamp-2",
                    isDark ? "text-gray-400" : "text-gray-600"
                  )}>
                    {report.description}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex-1 h-8 text-xs",
                    isDark && "bg-gray-700 border-gray-600 hover:bg-gray-600"
                  )}
                  onClick={() => generateReport(report.type)}
                >
                  <Eye className="w-3 h-3 ml-1" />
                  معاينة
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "h-8 text-xs",
                    colors.bg,
                    colors.text,
                    `hover:${colors.bg}`
                  )}
                  onClick={() => generateReport(report.type)}
                >
                  <Download className="w-3 h-3 ml-1" />
                  تصدير
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default ReportGenerator;


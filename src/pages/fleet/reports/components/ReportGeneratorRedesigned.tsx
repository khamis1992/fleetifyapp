/**
 * مكون توليد التقارير المخصصة - إصدار معاد تصميمه
 * Report Generator Component - Redesigned
 * Professional SaaS Aesthetic
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Shield,
  ArrowRight,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  ReportType,
  CustomReport,
  FleetAnalyticsSummary,
  VehicleReportData,
  MaintenanceReportData,
} from '../types/reports.types';
import type { VehicleInsuranceRegistrationData, InsuranceRegistrationSummary } from '../hooks/useFleetReports';

interface ReportGeneratorProps {
  analytics: FleetAnalyticsSummary | null;
  vehicles: VehicleReportData[];
  maintenance: MaintenanceReportData[];
  insuranceReport?: VehicleInsuranceRegistrationData[];
  insuranceSummary?: InsuranceRegistrationSummary | null;
  isDark: boolean;
  formatCurrency: (value: number) => string;
}

// Enhanced report templates with categories
const reportCategories = {
  financial: {
    id: 'financial',
    title: 'التقارير المالية',
    description: 'تحليلات مالية شاملة',
    icon: DollarSign,
    color: 'emerald',
  },
  operational: {
    id: 'operational',
    title: 'التقارير التشغيلية',
    description: 'قياس كفاءة العمليات',
    icon: Activity,
    color: 'blue',
  },
  maintenance: {
    id: 'maintenance',
    title: 'الصيانة والتأمين',
    description: 'تتبع الصيانة والتأمين',
    icon: Wrench,
    color: 'amber',
  },
} as const;

const reportTemplates: (CustomReport & { category: keyof typeof reportCategories; featured?: boolean; popular?: boolean })[] = [
  {
    id: 'financial-performance',
    type: 'financial-performance',
    title: 'الأداء المالي',
    description: 'تحليل الإيرادات والإهلاك والعائد على الاستثمار',
    icon: 'DollarSign',
    color: 'emerald',
    category: 'financial',
    featured: true,
    isAvailable: true,
  },
  {
    id: 'profitability',
    type: 'profitability',
    title: 'تحليل الربحية',
    description: 'تحليل ربحية كل مركبة والأسطول ككل',
    icon: 'TrendingUp',
    color: 'rose',
    category: 'financial',
    popular: true,
    isAvailable: true,
  },
  {
    id: 'forecasting',
    type: 'forecasting',
    title: 'تقرير التوقعات',
    description: 'توقعات الإيرادات والتكاليف للأشهر القادمة',
    icon: 'Calendar',
    color: 'indigo',
    category: 'financial',
    isAvailable: true,
  },
  {
    id: 'vehicle-usage',
    type: 'vehicle-usage',
    title: 'تقرير استخدام المركبات',
    description: 'تتبع استخدام المركبات وكفاءة الإيجار',
    icon: 'FileText',
    color: 'violet',
    category: 'operational',
    featured: true,
    isAvailable: true,
  },
  {
    id: 'operational-efficiency',
    type: 'operational-efficiency',
    title: 'الكفاءة التشغيلية',
    description: 'قياس كفاءة العمليات ومعدلات استخدام الأسطول',
    icon: 'Activity',
    color: 'cyan',
    category: 'operational',
    isAvailable: true,
  },
  {
    id: 'maintenance-cost',
    type: 'maintenance-cost',
    title: 'تحليل تكاليف الصيانة',
    description: 'تحليل شامل لتكاليف الصيانة والأنماط',
    icon: 'Wrench',
    color: 'amber',
    category: 'maintenance',
    isAvailable: true,
  },
  {
    id: 'insurance-registration',
    type: 'insurance-registration',
    title: 'التأمين والاستمارة',
    description: 'تقرير حالة التأمين والاستمارة لجميع المركبات',
    icon: 'Shield',
    color: 'blue',
    category: 'maintenance',
    popular: true,
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
  Shield,
};

const colorStyles = {
  emerald: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    hover: 'hover:border-emerald-300 hover:shadow-emerald-100',
  },
  rose: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    iconBg: 'bg-gradient-to-br from-rose-500 to-rose-600',
    hover: 'hover:border-rose-300 hover:shadow-rose-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    text: 'text-indigo-600',
    border: 'border-indigo-200',
    iconBg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    hover: 'hover:border-indigo-300 hover:shadow-indigo-100',
  },
  violet: {
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
    iconBg: 'bg-gradient-to-br from-violet-500 to-violet-600',
    hover: 'hover:border-violet-300 hover:shadow-violet-100',
  },
  cyan: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-200',
    iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    hover: 'hover:border-cyan-300 hover:shadow-cyan-100',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
    iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    hover: 'hover:border-amber-300 hover:shadow-amber-100',
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    hover: 'hover:border-blue-300 hover:shadow-blue-100',
  },
};

export const ReportGeneratorRedesigned: React.FC<ReportGeneratorProps> = ({
  analytics,
  vehicles,
  maintenance,
  insuranceReport = [],
  insuranceSummary,
  isDark,
  formatCurrency,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<keyof typeof reportCategories | null>(null);

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
      case 'insurance-registration':
        title = 'تقرير التأمين والاستمارة';
        content = generateInsuranceRegistrationReport();
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

  const generateInsuranceRegistrationReport = () => {
    const getStatusLabel = (status: string) => {
      switch (status) {
        case 'valid': return 'ساري';
        case 'expiring_soon': return 'ينتهي قريباً';
        case 'expired': return 'منتهي';
        default: return 'لا يوجد';
      }
    };

    const getStatusClass = (status: string) => {
      switch (status) {
        case 'valid': return 'status-available';
        case 'expiring_soon': return 'status-maintenance';
        case 'expired': return 'status-rented';
        default: return '';
      }
    };

    return `
      <div class="summary-stats">
        <div class="stat-card success">
          <div class="stat-value">${insuranceSummary?.fully_compliant || 0}</div>
          <div class="stat-label">مكتمل (تأمين + استمارة)</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${insuranceSummary?.with_valid_insurance || 0}</div>
          <div class="stat-label">تأمين ساري</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${insuranceSummary?.with_valid_registration || 0}</div>
          <div class="stat-label">استمارة سارية</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-value">${insuranceSummary?.needs_attention || 0}</div>
          <div class="stat-label">يحتاج اهتمام</div>
        </div>
      </div>

      <div class="analysis-section">
        <h3>📊 ملخص الحالة</h3>
        <div class="metrics-grid">
          <div class="metric">
            <span class="metric-label">إجمالي المركبات:</span>
            <span class="metric-value">${insuranceSummary?.total_vehicles || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">تأمين ينتهي قريباً:</span>
            <span class="metric-value" style="color: #f59e0b;">${insuranceSummary?.with_expiring_insurance || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">تأمين منتهي:</span>
            <span class="metric-value" style="color: #ef4444;">${insuranceSummary?.with_expired_insurance || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">بدون تأمين:</span>
            <span class="metric-value">${insuranceSummary?.without_insurance || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">استمارة تنتهي قريباً:</span>
            <span class="metric-value" style="color: #f59e0b;">${insuranceSummary?.with_expiring_registration || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">استمارة منتهية:</span>
            <span class="metric-value" style="color: #ef4444;">${insuranceSummary?.with_expired_registration || 0}</span>
          </div>
          <div class="metric">
            <span class="metric-label">بدون استمارة:</span>
            <span class="metric-value">${insuranceSummary?.without_registration || 0}</span>
          </div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>رقم اللوحة</th>
            <th>المركبة</th>
            <th>حالة التأمين</th>
            <th>الأيام المتبقية</th>
            <th>حالة الاستمارة</th>
            <th>الأيام المتبقية</th>
            <th>الحالة العامة</th>
          </tr>
        </thead>
        <tbody>
          ${insuranceReport.map(vehicle => `
            <tr>
              <td><strong>${vehicle.plate_number}</strong></td>
              <td>${vehicle.make} ${vehicle.model} ${vehicle.year}</td>
              <td class="${getStatusClass(vehicle.insurance_status)}">${getStatusLabel(vehicle.insurance_status)}</td>
              <td>${vehicle.insurance_days_remaining !== undefined ? vehicle.insurance_days_remaining + ' يوم' : '-'}</td>
              <td class="${getStatusClass(vehicle.registration_status)}">${getStatusLabel(vehicle.registration_status)}</td>
              <td>${vehicle.registration_days_remaining !== undefined ? vehicle.registration_days_remaining + ' يوم' : '-'}</td>
              <td class="${vehicle.insurance_status === 'valid' && vehicle.registration_status === 'valid' ? 'profitable' : 'not-profitable'}">
                ${vehicle.insurance_status === 'valid' && vehicle.registration_status === 'valid' ? '✅ مكتمل' : '⚠️ يحتاج مراجعة'}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${(insuranceSummary?.needs_attention || 0) > 0 ? `
        <div class="analysis-section">
          <h3>⚠️ التنبيهات والتوصيات</h3>
          <ul class="recommendations">
            ${(insuranceSummary?.with_expired_insurance || 0) > 0 ? `<li class="warning">🔴 يوجد ${insuranceSummary?.with_expired_insurance} مركبة بتأمين منتهي - يجب التجديد فوراً</li>` : ''}
            ${(insuranceSummary?.with_expiring_insurance || 0) > 0 ? `<li class="info">🟡 يوجد ${insuranceSummary?.with_expiring_insurance} مركبة تأمينها ينتهي خلال 30 يوم</li>` : ''}
            ${(insuranceSummary?.with_expired_registration || 0) > 0 ? `<li class="warning">🔴 يوجد ${insuranceSummary?.with_expired_registration} مركبة باستمارة منتهية - يجب التجديد فوراً</li>` : ''}
            ${(insuranceSummary?.with_expiring_registration || 0) > 0 ? `<li class="info">🟡 يوجد ${insuranceSummary?.with_expiring_registration} مركبة استمارتها تنتهي خلال 30 يوم</li>` : ''}
            ${(insuranceSummary?.without_insurance || 0) > 0 ? `<li class="warning">⚪ يوجد ${insuranceSummary?.without_insurance} مركبة بدون تأمين مسجل</li>` : ''}
            ${(insuranceSummary?.without_registration || 0) > 0 ? `<li class="warning">⚪ يوجد ${insuranceSummary?.without_registration} مركبة بدون استمارة مسجلة</li>` : ''}
          </ul>
        </div>
      ` : ''}
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

  // Filter reports by category
  const filteredReports = selectedCategory
    ? reportTemplates.filter(r => r.category === selectedCategory)
    : reportTemplates;

  const featuredReports = reportTemplates.filter(r => r.featured);
  const popularReports = reportTemplates.filter(r => r.popular);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-rose-600 rounded-xl blur-xl opacity-20" />
            <div className="relative p-3 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              التقارير المخصصة
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              إنشاء وتصدير تقارير مفصلة عن أداء الأسطول
            </p>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
            selectedCategory === null
              ? "bg-rose-500 text-white shadow-lg shadow-rose-200"
              : "bg-white text-slate-600 border border-slate-200 hover:border-rose-300 hover:text-rose-600"
          )}
        >
          الكل
        </button>
        {Object.values(reportCategories).map((category) => {
          const CategoryIcon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                selectedCategory === category.id
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-200"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-rose-300 hover:text-rose-600"
              )}
            >
              <CategoryIcon className="w-4 h-4" />
              {category.title}
            </button>
          );
        })}
      </div>

      {/* Featured Reports Section */}
      {!selectedCategory && featuredReports.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge className="bg-gradient-to-r from-rose-500 to-rose-600 text-white border-0">
              مميز
            </Badge>
            <span className="text-sm font-medium text-slate-700">أكثر التقارير استخداماً</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredReports.map((report, index) => {
              const Icon = iconMap[report.icon as keyof typeof iconMap] || FileText;
              const styles = colorStyles[report.color as keyof typeof colorStyles] || colorStyles.emerald;

              return (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 + index * 0.1 }}
                  className={cn(
                    "group relative p-6 rounded-xl border-2 transition-all duration-300",
                    "bg-white hover:shadow-xl",
                    styles.border,
                    styles.hover
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-3 rounded-xl",
                      styles.iconBg
                    )}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900 text-base">
                            {report.title}
                          </h3>
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                            {report.description}
                          </p>
                        </div>
                        <Badge className="shrink-0 bg-rose-50 text-rose-600 border-rose-200">
                          مميز
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1.5 hover:bg-slate-50"
                          onClick={() => generateReport(report.type)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          معاينة
                        </Button>
                        <Button
                          size="sm"
                          className={cn(
                            "gap-1.5 shadow-md hover:shadow-lg transition-shadow",
                            styles.iconBg
                          )}
                          onClick={() => generateReport(report.type)}
                        >
                          <Download className="w-3.5 h-3.5" />
                          تصدير
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* All Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredReports.map((report, index) => {
          const Icon = iconMap[report.icon as keyof typeof iconMap] || FileText;
          const styles = colorStyles[report.color as keyof typeof colorStyles] || colorStyles.emerald;

          // Skip featured reports if showing all (they're shown above)
          if (!selectedCategory && report.featured) return null;

          return (
            <motion.div
              key={report.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + index * 0.05 }}
              className={cn(
                "group p-5 rounded-xl border transition-all duration-300",
                "bg-white hover:shadow-lg",
                styles.border,
                styles.hover
              )}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className={cn(
                  "p-2.5 rounded-lg",
                  styles.bg
                )}>
                  <Icon className={cn("w-5 h-5", styles.text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-900 text-sm">
                      {report.title}
                    </h4>
                    {report.popular && (
                      <Badge variant="outline" className="shrink-0 text-xs px-1.5 py-0">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                        شائع
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {report.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 h-8 text-xs hover:bg-slate-50"
                  onClick={() => generateReport(report.type)}
                >
                  <Eye className="w-3 h-3 ml-1" />
                  معاينة
                </Button>
                <Button
                  size="sm"
                  className={cn(
                    "h-8 text-xs gap-1",
                    styles.iconBg
                  )}
                  onClick={() => generateReport(report.type)}
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
            <Filter className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-500">لا توجد تقارير في هذه الفئة</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setSelectedCategory(null)}
          >
            عرض جميع التقارير
          </Button>
        </div>
      )}
    </motion.div>
  );
};

export default ReportGeneratorRedesigned;

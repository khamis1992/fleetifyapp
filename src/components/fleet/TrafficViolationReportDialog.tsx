import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Printer, 
  Filter, 
  Car, 
  Calendar,
  DollarSign,
  AlertCircle,
  List,
  LayoutGrid,
  ArrowUpDown,
  Trophy,
  TrendingUp
} from 'lucide-react';
import { TrafficViolation } from '@/hooks/useTrafficViolations';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';

interface TrafficViolationReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violations: TrafficViolation[];
}

interface ReportFilters {
  onlyLinkedToVehicles: boolean;
  startDate: string;
  endDate: string;
  paymentStatus: 'all' | 'paid' | 'unpaid' | 'partially_paid';
  status: 'all' | 'pending' | 'confirmed' | 'cancelled';
  selectedVehicleId: string;
  viewMode: 'grouped' | 'flat';
  sortBy: 'violations_count' | 'total_amount' | 'plate_number' | 'last_date';
  includeAdvancedStats: boolean;
  includeUnlinkedSection: boolean;
}

interface VehicleGroup {
  vehicleId: string;
  plateNumber: string;
  make: string;
  model: string;
  violations: TrafficViolation[];
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  paidCount: number;
  unpaidCount: number;
  lastViolationDate: string;
}

export const TrafficViolationReportDialog: React.FC<TrafficViolationReportDialogProps> = ({
  open,
  onOpenChange,
  violations,
}) => {
  const { formatCurrency } = useCurrencyFormatter();
  
  const [filters, setFilters] = useState<ReportFilters>({
    onlyLinkedToVehicles: true,
    startDate: '',
    endDate: '',
    paymentStatus: 'all',
    status: 'all',
    selectedVehicleId: 'all',
    viewMode: 'grouped',
    sortBy: 'violations_count',
    includeAdvancedStats: true,
    includeUnlinkedSection: true,
  });

  // قائمة المركبات المتاحة للفلترة
  const availableVehicles = useMemo(() => {
    const vehicleMap = new Map<string, { id: string; plate: string; make: string; model: string }>();
    violations.forEach(v => {
      if (v.vehicle_id && v.vehicles) {
        vehicleMap.set(v.vehicle_id, {
          id: v.vehicle_id,
          plate: v.vehicles.plate_number || '',
          make: v.vehicles.make || '',
          model: v.vehicles.model || '',
        });
      }
    });
    return Array.from(vehicleMap.values());
  }, [violations]);

  // تصفية المخالفات بناءً على الخيارات المحددة
  const filteredViolations = useMemo(() => {
    return violations.filter(v => {
      // فلتر المركبات المرتبطة فقط
      if (filters.onlyLinkedToVehicles && !v.vehicle_id && !v.vehicles) {
        return false;
      }

      // فلتر مركبة محددة
      if (filters.selectedVehicleId !== 'all' && v.vehicle_id !== filters.selectedVehicleId) {
        return false;
      }

      // فلتر التاريخ
      if (filters.startDate && v.penalty_date < filters.startDate) {
        return false;
      }
      if (filters.endDate && v.penalty_date > filters.endDate) {
        return false;
      }

      // فلتر حالة الدفع
      if (filters.paymentStatus !== 'all' && v.payment_status !== filters.paymentStatus) {
        return false;
      }

      // فلتر الحالة
      if (filters.status !== 'all' && v.status !== filters.status) {
        return false;
      }

      return true;
    });
  }, [violations, filters]);

  // المخالفات غير المرتبطة بمركبات
  const unlinkedViolations = useMemo(() => {
    return violations.filter(v => {
      if (v.vehicle_id || v.vehicles) return false;
      
      // فلتر التاريخ
      if (filters.startDate && v.penalty_date < filters.startDate) return false;
      if (filters.endDate && v.penalty_date > filters.endDate) return false;
      
      // فلتر حالة الدفع
      if (filters.paymentStatus !== 'all' && v.payment_status !== filters.paymentStatus) return false;
      
      // فلتر الحالة
      if (filters.status !== 'all' && v.status !== filters.status) return false;
      
      return true;
    });
  }, [violations, filters]);

  // تجميع المخالفات حسب المركبة
  const vehicleGroups = useMemo(() => {
    const groups = new Map<string, VehicleGroup>();
    
    filteredViolations.forEach(v => {
      if (!v.vehicle_id) return;
      
      const key = v.vehicle_id;
      const existing = groups.get(key);
      
      if (existing) {
        existing.violations.push(v);
        existing.totalAmount += v.amount || 0;
        if (v.payment_status === 'paid') {
          existing.paidAmount += v.amount || 0;
          existing.paidCount++;
        } else {
          existing.unpaidAmount += v.amount || 0;
          existing.unpaidCount++;
        }
        if (v.penalty_date > existing.lastViolationDate) {
          existing.lastViolationDate = v.penalty_date;
        }
      } else {
        groups.set(key, {
          vehicleId: v.vehicle_id,
          plateNumber: v.vehicles?.plate_number || v.vehicle_plate || 'غير محدد',
          make: v.vehicles?.make || '',
          model: v.vehicles?.model || '',
          violations: [v],
          totalAmount: v.amount || 0,
          paidAmount: v.payment_status === 'paid' ? (v.amount || 0) : 0,
          unpaidAmount: v.payment_status !== 'paid' ? (v.amount || 0) : 0,
          paidCount: v.payment_status === 'paid' ? 1 : 0,
          unpaidCount: v.payment_status !== 'paid' ? 1 : 0,
          lastViolationDate: v.penalty_date,
        });
      }
    });
    
    // ترتيب المجموعات
    const groupsArray = Array.from(groups.values());
    
    switch (filters.sortBy) {
      case 'violations_count':
        return groupsArray.sort((a, b) => b.violations.length - a.violations.length);
      case 'total_amount':
        return groupsArray.sort((a, b) => b.totalAmount - a.totalAmount);
      case 'plate_number':
        return groupsArray.sort((a, b) => a.plateNumber.localeCompare(b.plateNumber));
      case 'last_date':
        return groupsArray.sort((a, b) => new Date(b.lastViolationDate).getTime() - new Date(a.lastViolationDate).getTime());
      default:
        return groupsArray;
    }
  }, [filteredViolations, filters.sortBy]);

  // أعلى 5 مركبات بالمخالفات
  const top5Vehicles = useMemo(() => {
    return [...vehicleGroups]
      .sort((a, b) => b.violations.length - a.violations.length)
      .slice(0, 5);
  }, [vehicleGroups]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const total = filteredViolations.length;
    const totalAmount = filteredViolations.reduce((sum, v) => sum + (v.amount || 0), 0);
    const paidCount = filteredViolations.filter(v => v.payment_status === 'paid').length;
    const paidAmount = filteredViolations.filter(v => v.payment_status === 'paid').reduce((sum, v) => sum + (v.amount || 0), 0);
    const unpaidCount = filteredViolations.filter(v => v.payment_status === 'unpaid').length;
    const unpaidAmount = filteredViolations.filter(v => v.payment_status === 'unpaid').reduce((sum, v) => sum + (v.amount || 0), 0);
    const partiallyPaidCount = filteredViolations.filter(v => v.payment_status === 'partially_paid').length;
    const withVehicles = filteredViolations.filter(v => v.vehicle_id || v.vehicles).length;
    const withoutVehicles = unlinkedViolations.length;
    const vehiclesCount = vehicleGroups.length;

    return { 
      total, totalAmount, paidCount, paidAmount, unpaidCount, unpaidAmount, 
      partiallyPaidCount, withVehicles, withoutVehicles, vehiclesCount 
    };
  }, [filteredViolations, unlinkedViolations, vehicleGroups]);

  // توليد تقرير HTML
  const generateHTMLReport = () => {
    const currentDate = new Date().toLocaleDateString('ar-QA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const dateRangeText = filters.startDate || filters.endDate
      ? `الفترة: ${filters.startDate || 'البداية'} إلى ${filters.endDate || 'الآن'}`
      : 'جميع الفترات';

    const filterDescription = [
      filters.onlyLinkedToVehicles ? 'المخالفات المرتبطة بمركبات فقط' : 'جميع المخالفات',
      filters.selectedVehicleId !== 'all' ? `مركبة محددة` : '',
      filters.paymentStatus !== 'all' ? `حالة الدفع: ${filters.paymentStatus === 'paid' ? 'مسددة' : filters.paymentStatus === 'unpaid' ? 'غير مسددة' : 'مسددة جزئياً'}` : '',
      filters.status !== 'all' ? `الحالة: ${filters.status === 'confirmed' ? 'مؤكدة' : filters.status === 'pending' ? 'قيد المراجعة' : 'ملغاة'}` : '',
    ].filter(Boolean).join(' | ');

    // توليد محتوى أعلى 5 مركبات
    const top5HTML = filters.includeAdvancedStats && top5Vehicles.length > 0 ? `
      <div class="top-vehicles-section">
        <h3 class="section-title">🏆 أعلى 5 مركبات بالمخالفات</h3>
        <div class="top-vehicles-grid">
          ${top5Vehicles.map((v, idx) => `
            <div class="top-vehicle-card rank-${idx + 1}">
              <div class="rank">${idx + 1}</div>
              <div class="vehicle-info">
                <div class="plate">${v.plateNumber}</div>
                <div class="details">${v.make} ${v.model}</div>
              </div>
              <div class="stats">
                <div class="count">${v.violations.length} مخالفة</div>
                <div class="amount">${formatCurrency(v.totalAmount)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    // توليد محتوى التقرير المجمع
    const groupedContentHTML = filters.viewMode === 'grouped' ? `
      ${vehicleGroups.map(group => `
        <div class="vehicle-section">
          <div class="vehicle-header">
            <div class="vehicle-title">
              <span class="vehicle-icon">🚗</span>
              <span class="plate-number">${group.plateNumber}</span>
              <span class="vehicle-name">${group.make} ${group.model}</span>
            </div>
            <div class="vehicle-summary">
              <span class="badge badge-info">${group.violations.length} مخالفة</span>
              <span class="badge ${group.unpaidAmount > 0 ? 'badge-danger' : 'badge-success'}">
                ${formatCurrency(group.totalAmount)}
              </span>
            </div>
          </div>
          <table class="violations-table">
            <thead>
              <tr>
                <th>#</th>
                <th>رقم المخالفة</th>
                <th>التاريخ</th>
                <th>نوع المخالفة</th>
                <th>الموقع</th>
                <th>المبلغ</th>
                <th>حالة الدفع</th>
              </tr>
            </thead>
            <tbody>
              ${group.violations.map((v, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${v.penalty_number || '-'}</strong></td>
                  <td>${v.penalty_date ? format(new Date(v.penalty_date), 'dd/MM/yyyy') : '-'}</td>
                  <td>${v.violation_type || v.reason || '-'}</td>
                  <td>${v.location || '-'}</td>
                  <td class="amount">${formatCurrency(v.amount || 0)}</td>
                  <td>
                    <span class="badge ${v.payment_status === 'paid' ? 'badge-success' : v.payment_status === 'partially_paid' ? 'badge-warning' : 'badge-danger'}">
                      ${v.payment_status === 'paid' ? '✅ مسددة' : v.payment_status === 'partially_paid' ? '⏳ جزئي' : '❌ غير مسددة'}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="5" class="total-label">إجمالي المركبة:</td>
                <td class="total-amount">${formatCurrency(group.totalAmount)}</td>
                <td>
                  <span class="badge badge-success">مسدد: ${formatCurrency(group.paidAmount)}</span>
                  ${group.unpaidAmount > 0 ? `<span class="badge badge-danger">متبقي: ${formatCurrency(group.unpaidAmount)}</span>` : ''}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      `).join('')}
    ` : `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>رقم المخالفة</th>
              <th>التاريخ</th>
              <th>المركبة</th>
              <th>نوع المخالفة</th>
              <th>الموقع</th>
              <th>المبلغ</th>
              <th>حالة الدفع</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            ${filteredViolations.map((v, index) => `
              <tr>
                <td>${index + 1}</td>
                <td><strong>${v.penalty_number || '-'}</strong></td>
                <td>${v.penalty_date ? format(new Date(v.penalty_date), 'dd/MM/yyyy') : '-'}</td>
                <td>
                  <div class="vehicle-info">
                    <span class="vehicle-plate">${v.vehicles?.plate_number || v.vehicle_plate || '-'}</span>
                    ${v.vehicles ? `<span class="vehicle-details">${v.vehicles.make || ''} ${v.vehicles.model || ''}</span>` : ''}
                  </div>
                </td>
                <td>${v.violation_type || v.reason || '-'}</td>
                <td>${v.location || '-'}</td>
                <td class="amount">${formatCurrency(v.amount || 0)}</td>
                <td>
                  <span class="badge ${v.payment_status === 'paid' ? 'badge-success' : v.payment_status === 'partially_paid' ? 'badge-warning' : 'badge-danger'}">
                    ${v.payment_status === 'paid' ? '✅ مسددة' : v.payment_status === 'partially_paid' ? '⏳ جزئي' : '❌ غير مسددة'}
                  </span>
                </td>
                <td>
                  <span class="badge ${v.status === 'confirmed' ? 'badge-info' : v.status === 'pending' ? 'badge-warning' : 'badge-secondary'}">
                    ${v.status === 'confirmed' ? 'مؤكدة' : v.status === 'pending' ? 'قيد المراجعة' : 'ملغاة'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // قسم المخالفات غير المرتبطة
    const unlinkedSectionHTML = filters.includeUnlinkedSection && unlinkedViolations.length > 0 ? `
      <div class="unlinked-section">
        <h3 class="section-title">⚠️ المخالفات غير المرتبطة بمركبات (${unlinkedViolations.length})</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>رقم المخالفة</th>
              <th>التاريخ</th>
              <th>رقم اللوحة (نص)</th>
              <th>نوع المخالفة</th>
              <th>المبلغ</th>
              <th>حالة الدفع</th>
            </tr>
          </thead>
          <tbody>
            ${unlinkedViolations.map((v, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${v.penalty_number || '-'}</strong></td>
                <td>${v.penalty_date ? format(new Date(v.penalty_date), 'dd/MM/yyyy') : '-'}</td>
                <td>${v.vehicle_plate || '-'}</td>
                <td>${v.violation_type || v.reason || '-'}</td>
                <td class="amount">${formatCurrency(v.amount || 0)}</td>
                <td>
                  <span class="badge ${v.payment_status === 'paid' ? 'badge-success' : 'badge-danger'}">
                    ${v.payment_status === 'paid' ? '✅ مسددة' : '❌ غير مسددة'}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    const htmlContent = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير المخالفات المرورية</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
            color: #1a1a2e;
            padding: 20px;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.08);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            padding: 30px 40px;
            text-align: center;
        }
        
        .company-logo {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
            letter-spacing: 1px;
        }
        
        .report-title {
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 5px;
        }
        
        .report-meta {
            font-size: 13px;
            opacity: 0.9;
        }
        
        .filter-info {
            background: #fff7ed;
            border-right: 4px solid #f97316;
            padding: 15px 25px;
            margin: 20px 30px;
            border-radius: 8px;
            font-size: 14px;
            color: #9a3412;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 15px;
            padding: 20px 30px;
        }
        
        .stat-card {
            background: linear-gradient(135deg, #fafafa 0%, #f5f5f5 100%);
            border-radius: 12px;
            padding: 18px;
            text-align: center;
            border: 1px solid #e5e5e5;
        }
        
        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: #f97316;
            margin-bottom: 4px;
        }
        
        .stat-label {
            font-size: 11px;
            color: #666;
            font-weight: 500;
        }
        
        .stat-card.success .stat-value { color: #16a34a; }
        .stat-card.danger .stat-value { color: #dc2626; }
        .stat-card.info .stat-value { color: #2563eb; }
        .stat-card.warning .stat-value { color: #d97706; }
        
        /* أعلى 5 مركبات */
        .top-vehicles-section {
            padding: 20px 30px;
            background: #fafafa;
            border-top: 1px solid #eee;
            border-bottom: 1px solid #eee;
        }
        
        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .top-vehicles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 15px;
        }
        
        .top-vehicle-card {
            background: white;
            border-radius: 12px;
            padding: 15px;
            display: flex;
            align-items: center;
            gap: 15px;
            border: 2px solid #e5e5e5;
            transition: transform 0.2s;
        }
        
        .top-vehicle-card.rank-1 { border-color: #fbbf24; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); }
        .top-vehicle-card.rank-2 { border-color: #9ca3af; background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); }
        .top-vehicle-card.rank-3 { border-color: #d97706; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); }
        
        .top-vehicle-card .rank {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 16px;
        }
        
        .top-vehicle-card.rank-1 .rank { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); }
        .top-vehicle-card.rank-2 .rank { background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%); }
        .top-vehicle-card.rank-3 .rank { background: linear-gradient(135deg, #d97706 0%, #b45309 100%); }
        
        .top-vehicle-card .vehicle-info {
            flex: 1;
        }
        
        .top-vehicle-card .plate {
            font-weight: 700;
            font-size: 14px;
            color: #1a1a2e;
        }
        
        .top-vehicle-card .details {
            font-size: 11px;
            color: #666;
        }
        
        .top-vehicle-card .stats {
            text-align: left;
        }
        
        .top-vehicle-card .count {
            font-weight: 700;
            font-size: 14px;
            color: #dc2626;
        }
        
        .top-vehicle-card .amount {
            font-size: 12px;
            color: #666;
        }
        
        /* قسم المركبة */
        .vehicle-section {
            margin: 20px 30px;
            border: 1px solid #e5e5e5;
            border-radius: 12px;
            overflow: hidden;
        }
        
        .vehicle-header {
            background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .vehicle-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 16px;
        }
        
        .vehicle-icon {
            font-size: 24px;
        }
        
        .plate-number {
            font-weight: 700;
            background: rgba(255,255,255,0.15);
            padding: 4px 12px;
            border-radius: 6px;
        }
        
        .vehicle-name {
            font-size: 13px;
            opacity: 0.8;
        }
        
        .vehicle-summary {
            display: flex;
            gap: 10px;
        }
        
        .violations-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        
        .violations-table th {
            background: #f8fafc;
            padding: 10px 12px;
            text-align: right;
            font-weight: 600;
            color: #475569;
            border-bottom: 1px solid #e2e8f0;
        }
        
        .violations-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .violations-table tr:hover {
            background: #f8fafc;
        }
        
        .total-row {
            background: #f1f5f9 !important;
            font-weight: 600;
        }
        
        .total-label {
            text-align: left;
        }
        
        .total-amount {
            font-size: 14px;
            color: #f97316;
        }
        
        /* المخالفات غير المرتبطة */
        .unlinked-section {
            margin: 30px;
            padding: 20px;
            background: #fef2f2;
            border-radius: 12px;
            border: 1px dashed #fca5a5;
        }
        
        .unlinked-section .section-title {
            color: #dc2626;
        }
        
        .unlinked-section table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            background: white;
            border-radius: 8px;
            overflow: hidden;
        }
        
        .unlinked-section th {
            background: #fee2e2;
            padding: 10px 12px;
            text-align: right;
            font-weight: 600;
            color: #991b1b;
        }
        
        .unlinked-section td {
            padding: 10px 12px;
            border-bottom: 1px solid #fecaca;
        }
        
        /* الجدول العادي */
        .table-container {
            padding: 20px 30px;
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        
        thead {
            background: linear-gradient(135deg, #1a1a2e 0%, #16162e 100%);
            color: white;
        }
        
        th {
            padding: 12px;
            text-align: right;
            font-weight: 600;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 10px 12px;
            border-bottom: 1px solid #eee;
            vertical-align: middle;
        }
        
        tr:nth-child(even) {
            background: #fafafa;
        }
        
        tr:hover {
            background: #fff7ed;
        }
        
        .badge {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 20px;
            font-size: 10px;
            font-weight: 600;
            margin: 2px;
        }
        
        .badge-success {
            background: #dcfce7;
            color: #166534;
        }
        
        .badge-danger {
            background: #fee2e2;
            color: #991b1b;
        }
        
        .badge-warning {
            background: #fef3c7;
            color: #92400e;
        }
        
        .badge-info {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .badge-secondary {
            background: #f3f4f6;
            color: #4b5563;
        }
        
        .amount {
            font-weight: 700;
            color: #f97316;
        }
        
        .vehicle-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }
        
        .vehicle-plate {
            font-weight: 600;
            color: #1a1a2e;
        }
        
        .vehicle-details {
            font-size: 10px;
            color: #666;
        }
        
        .footer {
            background: #f8fafc;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #eee;
            font-size: 12px;
            color: #64748b;
        }
        
        .controls {
            padding: 20px 30px;
            text-align: center;
            border-bottom: 1px solid #eee;
        }
        
        .btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            margin: 0 8px;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
            color: white;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }
        
        .btn-secondary {
            background: #f1f5f9;
            color: #475569;
        }
        
        .btn-secondary:hover {
            background: #e2e8f0;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
                border-radius: 0;
            }
            
            .controls {
                display: none;
            }
            
            .header {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            thead {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .stat-card, .badge, .vehicle-header, .top-vehicle-card {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            .vehicle-section {
                page-break-inside: avoid;
            }
        }
        
        @page {
            size: A4 landscape;
            margin: 1cm;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="controls">
            <button class="btn btn-primary" onclick="window.print()">
                🖨️ طباعة التقرير
            </button>
            <button class="btn btn-secondary" onclick="window.close()">
                ✖️ إغلاق
            </button>
        </div>
        
        <div class="header">
            <div class="company-logo">🚗 شركة العراف لتأجير السيارات</div>
            <div class="report-title">تقرير المخالفات المرورية ${filters.viewMode === 'grouped' ? '(مجمع حسب المركبة)' : ''}</div>
            <div class="report-meta">${currentDate} | ${dateRangeText}</div>
        </div>
        
        <div class="filter-info">
            <strong>🔍 معايير التصفية:</strong> ${filterDescription || 'بدون تصفية'}
        </div>
        
        <div class="stats-grid">
            <div class="stat-card info">
                <div class="stat-value">${stats.vehiclesCount}</div>
                <div class="stat-label">عدد المركبات</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">إجمالي المخالفات</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatCurrency(stats.totalAmount)}</div>
                <div class="stat-label">إجمالي المبالغ</div>
            </div>
            <div class="stat-card success">
                <div class="stat-value">${stats.paidCount}</div>
                <div class="stat-label">مخالفات مسددة</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-value">${stats.unpaidCount}</div>
                <div class="stat-label">مخالفات غير مسددة</div>
            </div>
            <div class="stat-card success">
                <div class="stat-value">${formatCurrency(stats.paidAmount)}</div>
                <div class="stat-label">المبالغ المسددة</div>
            </div>
            <div class="stat-card danger">
                <div class="stat-value">${formatCurrency(stats.unpaidAmount)}</div>
                <div class="stat-label">المبالغ المستحقة</div>
            </div>
        </div>
        
        ${top5HTML}
        
        ${groupedContentHTML}
        
        ${unlinkedSectionHTML}
        
        <div class="footer">
            <p>تم إنشاء هذا التقرير تلقائياً بواسطة نظام Fleetify</p>
            <p>© ${new Date().getFullYear()} شركة العراف لتأجير السيارات. جميع الحقوق محفوظة.</p>
        </div>
    </div>
    
    <script>
        window.onload = function() {
            window.focus();
        };
        
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                window.print();
            }
            if (e.key === 'Escape') {
                window.close();
            }
        });
    </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const newWindow = window.open(url, '_blank');
    if (!newWindow) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `تقرير_المخالفات_${new Date().getTime()}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
    
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-coral-500" />
            تخصيص تقرير المخالفات المرورية
          </DialogTitle>
          <DialogDescription>
            اختر معايير التصفية وطريقة عرض التقرير
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* طريقة العرض */}
          <div className="p-4 bg-gradient-to-r from-coral-50 to-orange-50 rounded-xl border border-coral-100">
            <Label className="font-semibold mb-3 flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-coral-600" />
              طريقة عرض التقرير
            </Label>
            <RadioGroup
              value={filters.viewMode}
              onValueChange={(value) => setFilters(prev => ({ ...prev, viewMode: value as 'grouped' | 'flat' }))}
              className="flex gap-4 mt-2"
            >
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border cursor-pointer hover:border-coral-300 flex-1">
                <RadioGroupItem value="grouped" id="grouped" />
                <Label htmlFor="grouped" className="cursor-pointer flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  <div>
                    <div className="font-medium">مجمع حسب المركبة</div>
                    <div className="text-xs text-neutral-500">عرض كل مركبة مع مخالفاتها</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white rounded-lg border cursor-pointer hover:border-coral-300 flex-1">
                <RadioGroupItem value="flat" id="flat" />
                <Label htmlFor="flat" className="cursor-pointer flex items-center gap-2">
                  <List className="w-4 h-4" />
                  <div>
                    <div className="font-medium">قائمة مسطحة</div>
                    <div className="text-xs text-neutral-500">عرض جميع المخالفات</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* الترتيب (للعرض المجمع فقط) */}
          {filters.viewMode === 'grouped' && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-neutral-500" />
                ترتيب المركبات
              </Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value as any }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="اختر طريقة الترتيب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="violations_count">
                    <span className="flex items-center gap-2">
                      🔢 حسب عدد المخالفات (الأكثر أولاً)
                    </span>
                  </SelectItem>
                  <SelectItem value="total_amount">
                    <span className="flex items-center gap-2">
                      💰 حسب المبلغ الإجمالي (الأعلى أولاً)
                    </span>
                  </SelectItem>
                  <SelectItem value="plate_number">
                    <span className="flex items-center gap-2">
                      🔤 حسب رقم اللوحة (أبجدي)
                    </span>
                  </SelectItem>
                  <SelectItem value="last_date">
                    <span className="flex items-center gap-2">
                      📅 حسب تاريخ آخر مخالفة
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* فلتر المركبات */}
          <div className="flex items-start gap-3 p-4 bg-coral-50 rounded-xl border border-coral-100">
            <Checkbox
              id="onlyLinkedToVehicles"
              checked={filters.onlyLinkedToVehicles}
              onCheckedChange={(checked) => 
                setFilters(prev => ({ ...prev, onlyLinkedToVehicles: checked as boolean }))
              }
              className="mt-1"
            />
            <div className="flex-1">
              <Label htmlFor="onlyLinkedToVehicles" className="font-semibold cursor-pointer flex items-center gap-2">
                <Car className="w-4 h-4 text-coral-600" />
                المخالفات المرتبطة بمركبات فقط
              </Label>
              <p className="text-sm text-neutral-500 mt-1">
                عند التفعيل، سيتم استبعاد المخالفات غير المربوطة بمركبات من النظام
              </p>
            </div>
          </div>

          {/* فلتر مركبة محددة */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Car className="w-4 h-4 text-neutral-500" />
              اختيار مركبة محددة
            </Label>
            <Select
              value={filters.selectedVehicleId}
              onValueChange={(value) => setFilters(prev => ({ ...prev, selectedVehicleId: value }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="جميع المركبات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المركبات</SelectItem>
                {availableVehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate} - {v.make} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* فلتر التاريخ */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-500" />
                من تاريخ
              </Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-500" />
                إلى تاريخ
              </Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* فلتر حالة الدفع */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-neutral-500" />
              حالة الدفع
            </Label>
            <Select
              value={filters.paymentStatus}
              onValueChange={(value) => setFilters(prev => ({ ...prev, paymentStatus: value as any }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="اختر حالة الدفع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="paid">🟢 مسددة</SelectItem>
                <SelectItem value="unpaid">🔴 غير مسددة</SelectItem>
                <SelectItem value="partially_paid">🟠 مسددة جزئياً</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* فلتر الحالة */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-neutral-500" />
              حالة المخالفة
            </Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value as any }))}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="اختر الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="confirmed">مؤكدة</SelectItem>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* خيارات إضافية */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border">
              <Checkbox
                id="includeAdvancedStats"
                checked={filters.includeAdvancedStats}
                onCheckedChange={(checked) => 
                  setFilters(prev => ({ ...prev, includeAdvancedStats: checked as boolean }))
                }
              />
              <Label htmlFor="includeAdvancedStats" className="cursor-pointer flex items-center gap-2 text-sm">
                <Trophy className="w-4 h-4 text-amber-500" />
                تضمين أعلى 5 مركبات
              </Label>
            </div>
            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border">
              <Checkbox
                id="includeUnlinkedSection"
                checked={filters.includeUnlinkedSection}
                onCheckedChange={(checked) => 
                  setFilters(prev => ({ ...prev, includeUnlinkedSection: checked as boolean }))
                }
              />
              <Label htmlFor="includeUnlinkedSection" className="cursor-pointer flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                تضمين غير المرتبطة
              </Label>
            </div>
          </div>

          {/* ملخص الإحصائيات */}
          <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200">
            <h4 className="font-semibold text-sm text-neutral-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              معاينة التقرير
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-xl font-bold text-blue-600">{stats.vehiclesCount}</div>
                <div className="text-xs text-neutral-500">مركبة</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-xl font-bold text-coral-600">{stats.total}</div>
                <div className="text-xs text-neutral-500">مخالفة</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-lg font-bold text-green-600">{formatCurrency(stats.paidAmount)}</div>
                <div className="text-xs text-neutral-500">مسددة</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg border">
                <div className="text-lg font-bold text-red-600">{formatCurrency(stats.unpaidAmount)}</div>
                <div className="text-xs text-neutral-500">مستحقة</div>
              </div>
            </div>
            {unlinkedViolations.length > 0 && (
              <div className="mt-3">
                <Badge variant="outline" className="gap-1 text-amber-600 border-amber-200">
                  <AlertCircle className="w-3 h-3" />
                  مخالفات غير مرتبطة: {unlinkedViolations.length}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={generateHTMLReport}
            disabled={stats.total === 0 && unlinkedViolations.length === 0}
            className="flex-1 gap-2 bg-gradient-to-r from-coral-500 to-orange-500 hover:from-coral-600 hover:to-orange-600 rounded-xl"
          >
            <Printer className="w-4 h-4" />
            إنشاء التقرير ({stats.vehiclesCount} مركبة | {stats.total} مخالفة)
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            إلغاء
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

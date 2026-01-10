/**
 * Payment Analytics Service
 * 
 * خدمة التحليل المالي للمدفوعات:
 * - حساب الـ KPIs الرئيسية (إجمالي، متوسط، نسبة، معدل نمو)
 * - تنبؤات بالتدفق النقدي
 * - تقارير شاملة (يومية، أسبوعية، شهرية، سنوية)
 * - تحليل الأنماط والاتجاه
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface PaymentKPIs {
  // إجماليات
  totalPayments: number;
  totalAmount: number;
  totalIncome: number;
  totalExpenses: number;
  
  // المتوسطات
  averagePaymentAmount: number;
  medianPaymentAmount: number;
  averagePaymentsPerDay: number;
  averagePaymentsPerWeek: number;
  averagePaymentsPerMonth: number;
  
  // النسب
  paymentCompletionRate: number; // نسبة الدفعات المكتملة
  onTimePaymentRate: number; // نسبة الدفعات في الوقت
  latePaymentRate: number; // نسبة الدفعات المتأخرة
  autoMatchedRate: number; // نسبة الربط التلقائي
  
  // الاتجاهات
  monthlyTrend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  weeklyTrend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  
  // معدل النمو (مقارنة بالشهر السابق)
  monthlyGrowthRate: number; // نسبة التغير الشهري
  
  // الفترات الزمنية
  reportPeriod: {
    startDate: string;
    endDate: string;
  };
}

export interface PaymentBreakdown {
  paymentMethod: string;
  totalAmount: number;
  paymentCount: number;
  averageAmount: number;
  percentage: number;
}

export interface RevenueAnalytics {
  // الإيرادات الشهرية
  monthlyRevenue: number;
  
  // تنبؤات التالية
  predictedRevenue: number;
  predictedGrowthRate: number;
  
  // التحليل الشهري
  monthlyTrend: Array<{
    month: string;
    revenue: number;
    growthRate: number;
  }>;
  
  // أفضل الأيام للإيرادات
  bestDaysOfWeek: Array<{
    dayOfWeek: number; // 0-6 (الأحد-السبت)
    totalAmount: number;
    paymentCount: number;
  }>;
}

export interface CashFlowAnalytics {
  // التدفق النقدي
  totalInflow: number; // إجمالي الدخل
  totalOutflow: number; // إجمالي المصروف
  netCashFlow: number; // التدفق الصافي
  
  // الأرصدة المتوقعة
  projectedCashBalance: number;
  cashFlowHealth: 'healthy' | 'warning' | 'critical';
  
  // توقعات شهرية
  monthlyProjections: Array<{
    month: string;
    projectedInflow: number;
    projectedOutflow: number;
    netFlow: number;
    balance: number;
  }>;
}

export interface TopPayments {
  payments: Array<{
    id: string;
    payment_number: string;
    payment_date: string;
    amount: number;
    payment_method: string;
    payment_type: string;
    customer_name?: string;
    contract_number?: string;
    invoice_number?: string;
  }>;
}

class PaymentAnalyticsService {
  /**
   * حساب الـ KPIs الرئيسية للمدفوعات
   */
  async calculateKPIs(
    companyId: string,
    options: {
      startDate?: string;
      endDate?: string;
      paymentStatus?: string;
    } = {}
  ): Promise<PaymentKPIs> {
    try {
      logger.info('Calculating payment KPIs', { companyId, options });

      const startDate = options.startDate || this.getMonthStartDate(0); // افتراضياً: الشهر الحالي
      const endDate = options.endDate || new Date().toISOString();

      // جلب المدفوعات
      let query = supabase
        .from('payments')
        .select(`
          *,
          customers!payments_customer_id_fkey (
            first_name,
            last_name,
            company_name,
            company_name_ar
          ),
          contracts!payments_contract_id_fkey (
            contract_number
          ),
          invoices!payments_invoice_id_fkey (
            invoice_number
          )
        `)
        .eq('company_id', companyId)
        .gte('payment_date', startDate)
        .lte('payment_date', endDate);

      if (options.paymentStatus) {
        query = query.eq('payment_status', options.paymentStatus);
      }

      const { data: payments } = await query;

      if (!payments || payments.length === 0) {
        return this.getEmptyKPIs(companyId, options);
      }

      // حساب الإجماليات
      const totalPayments = payments.length;
      const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalIncome = payments
        .filter(p => p.transaction_type === 'income')
        .reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalExpenses = payments
        .filter(p => p.transaction_type === 'expense')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      // حساب المتوسطات
      const paymentAmounts = payments.filter(p => p.amount).map(p => p.amount);
      const sortedAmounts = [...paymentAmounts].sort((a, b) => a - b);
      
      const sumAmounts = paymentAmounts.reduce((sum, a) => sum + a, 0);
      const averagePaymentAmount = sumAmounts / paymentAmounts.length;
      
      const medianPaymentAmount = sortedAmounts.length % 2 === 0
        ? sortedAmounts[sortedAmounts.length / 2 - 1]
        : (sortedAmounts[Math.floor(sortedAmounts.length / 2)] + sortedAmounts[Math.ceil(sortedAmounts.length / 2)]) / 2;

      // حساب المتوسطات الزمنية
      const dateRange = new Date(endDate).getTime() - new Date(startDate).getTime();
      const daysInPeriod = Math.ceil(dateRange / (1000 * 60 * 60 * 24));

      const averagePaymentsPerDay = totalPayments / Math.max(1, daysInPeriod);
      const averagePaymentsPerWeek = totalPayments / Math.max(1, daysInPeriod / 7);
      const averagePaymentsPerMonth = totalPayments / Math.max(1, daysInPeriod / 30);

      // حساب النسب
      const completedPayments = payments.filter(p => p.payment_status === 'completed');
      const paymentCompletionRate = totalPayments > 0
        ? (completedPayments.length / totalPayments) * 100
        : 0;

      // حساب نسبة الدفعات في الوقت (خلال 7 أيام من تاريخ الاستحقاق)
      const onTimePayments = await this.calculateOnTimePayments(companyId, startDate, endDate);
      const onTimePaymentRate = onTimePayments.total > 0
        ? (onTimePayments.onTimeCount / onTimePayments.total) * 100
        : 0;

      const latePaymentRate = 100 - onTimePaymentRate;

      // حساب نسبة الربط التلقائي
      const autoLinkedPayments = payments.filter(p => 
        p.linking_confidence !== null && 
        p.linking_confidence >= 70
      );
      const autoMatchedRate = totalPayments > 0
        ? (autoLinkedPayments.length / totalPayments) * 100
        : 0;

      // حساب الاتجاهات
      const monthlyTrend = await this.calculateMonthlyTrend(companyId);
      const weeklyTrend = await this.calculateWeeklyTrend(companyId, startDate, endDate);

      // حساب معدل النمو الشهري
      const monthlyGrowthRate = await this.calculateMonthlyGrowthRate(companyId);

      const reportPeriod = { startDate, endDate };

      const kpis: PaymentKPIs = {
        totalPayments,
        totalAmount,
        totalIncome,
        totalExpenses,
        averagePaymentAmount,
        medianPaymentAmount,
        averagePaymentsPerDay,
        averagePaymentsPerWeek,
        averagePaymentsPerMonth,
        paymentCompletionRate,
        onTimePaymentRate,
        latePaymentRate,
        autoMatchedRate,
        monthlyTrend,
        weeklyTrend,
        monthlyGrowthRate,
        reportPeriod
      };

      logger.info('Payment KPIs calculated', {
        companyId,
        ...kpis
      });

      return kpis;
    } catch (error) {
      logger.error('Failed to calculate payment KPIs', { companyId, error });
      return this.getEmptyKPIs(companyId, options);
    }
  }

  /**
   * تحليل الإيرادات
   */
  async analyzeRevenue(
    companyId: string,
    options: {
      monthsToAnalyze?: number;
      includePredictions?: boolean;
    } = {}
  ): Promise<RevenueAnalytics> {
    try {
      logger.info('Analyzing revenue', { companyId, options });

      const months = options.monthsToAnalyze || 12; // افتراضياً: 12 شهر
      const monthlyData: Array<{
        month: string;
        revenue: number;
        growthRate: number;
      }> = [];

      // حساب الإيرادات الشهرية
      for (let i = 0; i < months; i++) {
        const monthStart = this.getMonthStartDate(i);
        const monthEnd = this.getMonthEndDate(i);

        const { data: monthPayments } = await supabase
          .from('payments')
          .select('amount, payment_date')
          .eq('company_id', companyId)
          .eq('transaction_type', 'income')
          .eq('payment_status', 'completed')
          .gte('payment_date', monthStart)
          .lt('payment_date', monthEnd);

        const monthlyRevenue = monthPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

        // حساب معدل النمو مقارنة بالشهر السابق
        let growthRate = 0;
        if (i > 0 && monthlyData[i - 1]) {
          const previousRevenue = monthlyData[i - 1].revenue;
          if (previousRevenue > 0) {
            growthRate = ((monthlyRevenue - previousRevenue) / previousRevenue) * 100;
          }
        }

        const monthLabel = this.getMonthLabel(i);
        monthlyData.push({
          month: monthLabel,
          revenue: monthlyRevenue,
          growthRate
        });
      }

      // تنبؤات
      const recentMonths = monthlyData.slice(-6); // آخر 6 أشهر
      const avgGrowthRate = recentMonths.reduce((sum, m) => sum + m.growthRate, 0) / recentMonths.length;

      const predictedRevenue = monthlyData.length > 0
        ? monthlyData[monthlyData.length - 1].revenue * (1 + avgGrowthRate / 100)
        : 0;
      const predictedGrowthRate = avgGrowthRate;

      // أفضل الأيام للإيرادات
      const bestDaysOfWeek = await this.calculateBestDaysOfWeek(companyId, options.monthsToAnalyze || 4);

      const analytics: RevenueAnalytics = {
        monthlyRevenue: monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].revenue : 0,
        predictedRevenue,
        predictedGrowthRate,
        monthlyTrend: monthlyData,
        bestDaysOfWeek
      };

      logger.info('Revenue analysis completed', { companyId });

      return analytics;
    } catch (error) {
      logger.error('Failed to analyze revenue', { companyId, error });
      return {
        monthlyRevenue: 0,
        predictedRevenue: 0,
        predictedGrowthRate: 0,
        monthlyTrend: [],
        bestDaysOfWeek: []
      };
    }
  }

  /**
   * تحليل التدفق النقدي
   */
  async analyzeCashFlow(
    companyId: string,
    options: {
      projectionMonths?: number;
    } = {}
  ): Promise<CashFlowAnalytics> {
    try {
      logger.info('Analyzing cash flow', { companyId, options });

      const projectionMonths = options.projectionMonths || 6;
      const today = new Date();

      // حساب التدفق الحالي
      const currentMonthStart = this.getMonthStartDate(0);
      const currentMonthEnd = this.getMonthEndDate(0);

      const { data: inflowPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', companyId)
        .eq('transaction_type', 'income')
        .eq('payment_status', 'completed')
        .gte('payment_date', currentMonthStart)
        .lt('payment_date', currentMonthEnd);

      const { data: outflowPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', companyId)
        .eq('transaction_type', 'expense')
        .eq('payment_status', 'completed')
        .gte('payment_date', currentMonthStart)
        .lt('payment_date', currentMonthEnd);

      const totalInflow = inflowPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalOutflow = outflowPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const netCashFlow = totalInflow - totalOutflow;

      // توقعات المستقبلية
      const monthlyProjections: Array<{
        month: string;
        projectedInflow: number;
        projectedOutflow: number;
        netFlow: number;
        balance: number;
      }> = [];

      let projectedBalance = netCashFlow;
      const lastMonthRevenue = await this.getMonthlyIncome(companyId, 0);
      const lastMonthExpenses = await this.getMonthlyExpenses(companyId, 0);

      for (let i = 1; i <= projectionMonths; i++) {
        const monthStart = this.getMonthStartDate(i);
        const monthEnd = this.getMonthEndDate(i);
        const monthLabel = this.getMonthLabel(i);

        // توقعات بسيطة: نفس متوسط الشهر السابق + معدل نمو 5%
        const projectedInflow = lastMonthRevenue * (1 + 0.05 * i);
        const projectedOutflow = lastMonthExpenses * (1 + 0.05 * i);
        const netFlow = projectedInflow - projectedOutflow;
        
        projectedBalance += netFlow;

        monthlyProjections.push({
          month: monthLabel,
          projectedInflow,
          projectedOutflow,
          netFlow,
          balance: projectedBalance
        });
      }

      // تقييم صحة التدفق النقدي
      let cashFlowHealth: 'healthy';
      if (netCashFlow < 0) {
        cashFlowHealth = 'critical';
      } else if (netCashFlow < (totalInflow * 0.2)) {
        cashFlowHealth = 'warning';
      }

      const analytics: CashFlowAnalytics = {
        totalInflow,
        totalOutflow,
        netCashFlow,
        projectedCashBalance: projectedBalance,
        cashFlowHealth,
        monthlyProjections
      };

      logger.info('Cash flow analysis completed', { companyId });

      return analytics;
    } catch (error) {
      logger.error('Failed to analyze cash flow', { companyId, error });
      return {
        totalInflow: 0,
        totalOutflow: 0,
        netCashFlow: 0,
        projectedCashBalance: 0,
        cashFlowHealth: 'healthy',
        monthlyProjections: []
      };
    }
  }

  /**
   * الحصول على أعلى المدفوعات
   */
  async getTopPayments(
    companyId: string,
    options: {
      limit?: number;
      startDate?: string;
      endDate?: string;
      sortBy?: 'amount' | 'date';
    } = {}
  ): Promise<TopPayments> {
    try {
      logger.info('Fetching top payments', { companyId, options });

      const limit = options.limit || 20;
      const startDate = options.startDate || this.getMonthStartDate(0);
      const endDate = options.endDate || new Date().toISOString();

      let orderBy = 'payment_date';
      if (options.sortBy === 'amount') {
        orderBy = 'amount DESC';
      }

      const { data: payments } = await supabase
        .from('payments')
        .select(`
          *,
          customers!payments_customer_id_fkey (
            first_name,
            last_name,
            company_name,
            company_name_ar
          ),
          contracts!payments_contract_id_fkey (
            contract_number
          ),
          invoices!payments_invoice_id_fkey (
            invoice_number
          )
        `)
        .eq('company_id', companyId)
        .eq('payment_status', 'completed')
        .gte('payment_date', startDate)
        .lte('payment_date', endDate)
        .order(orderBy)
        .limit(limit);

      if (!payments) {
        return { payments: [] };
      }

      logger.info('Top payments fetched', {
        companyId,
        count: payments.length
      });

      return { payments };
    } catch (error) {
      logger.error('Failed to fetch top payments', { companyId, error });
      return { payments: [] };
    }
  }

  /**
   * Helper: حساب الدفعات في الوقت
   */
  private async calculateOnTimePayments(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<{ onTimeCount: number; lateCount: number; total: number }> {
    // الحصول على الفواتير ذات تواريخ الاستحقاق
    const { data: invoices } = await supabase
      .from('invoices')
      .select('id, due_date, total_amount')
      .eq('company_id', companyId)
      .gte('due_date', startDate)
      .lte('due_date', endDate);

    if (!invoices || invoices.length === 0) {
      return { onTimeCount: 0, lateCount: 0, total: 0 };
    }

    let onTimeCount = 0;
    let lateCount = 0;

    // لكل فاتورة، تحقق من تاريخ أول دفعها
    for (const invoice of invoices) {
      const { data: payments } = await supabase
        .from('payments')
        .select('payment_date')
        .eq('invoice_id', invoice.id)
        .eq('payment_status', 'completed')
        .order('payment_date', { ascending: true })
        .limit(1);

      const firstPaymentDate = payments && payments.length > 0
        ? payments[0].payment_date
        : null;

      if (firstPaymentDate) {
        const dueDate = new Date(invoice.due_date);
        const paymentDate = new Date(firstPaymentDate);
        const daysLate = Math.floor(
          (paymentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysLate <= 7) {
          onTimeCount++;
        } else if (daysLate <= 14) {
          onTimeCount++;
        } else {
          lateCount++;
        }
      }
    }

    return {
      onTimeCount,
      lateCount,
      total: onTimeCount + lateCount
    };
  }

  /**
   * Helper: حساب الاتجاه الشهري
   */
  private async calculateMonthlyTrend(
    companyId: string
  ): Promise<'increasing' | 'decreasing' | 'stable' | 'volatile'> {
    try {
      const months = 6; // آخر 6 أشهر
      const monthlyAmounts: number[] = [];

      for (let i = 0; i < months; i++) {
        const monthStart = this.getMonthStartDate(i);
        const monthEnd = this.getMonthEndDate(i);

        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('company_id', companyId)
          .eq('payment_status', 'completed')
          .eq('transaction_type', 'income')
          .gte('payment_date', monthStart)
          .lt('payment_date', monthEnd);

        const monthlyTotal = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        monthlyAmounts.push(monthlyTotal);
      }

      if (monthlyAmounts.length < 2) {
        return 'stable';
      }

      // حساب معدل التغير
      const changes: number[] = [];
      for (let i = 1; i < monthlyAmounts.length; i++) {
        const change = monthlyAmounts[i] - monthlyAmounts[i - 1];
        if (change !== 0) {
          changes.push(change);
        }
      }

      const avgChange = changes.length > 0
        ? changes.reduce((sum, c) => sum + c, 0) / changes.length
        : 0;

      if (avgChange > monthlyAmounts[monthlyAmounts.length - 1] * 0.15) {
        return 'increasing';
      } else if (avgChange < -monthlyAmounts[monthlyAmounts.length - 1] * 0.15) {
        return 'decreasing';
      } else if (changes.some(c => Math.abs(c) > monthlyAmounts[monthlyAmounts.length - 1] * 0.5)) {
        return 'volatile';
      } else {
        return 'stable';
      }
    } catch (error) {
      logger.error('Failed to calculate monthly trend', { companyId, error });
      return 'stable';
    }
  }

  /**
   * Helper: حساب الاتجاه الأسبوعي
   */
  private async calculateWeeklyTrend(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<'increasing' | 'decreasing' | 'stable' | 'volatile'> {
    try {
      // حساب متوسط الدفعات لكل أسبوع
      const weeklyAmounts: number[] = [];
      const totalWeeks = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 7)
      );

      for (let week = 0; week < totalWeeks; week++) {
        const weekStart = new Date(new Date(startDate).getTime() + week * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('company_id', companyId)
          .eq('payment_status', 'completed')
          .gte('payment_date', weekStart.toISOString())
          .lt('payment_date', weekEnd.toISOString());

        const weeklyTotal = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        weeklyAmounts.push(weeklyTotal);
      }

      if (weeklyAmounts.length < 2) {
        return 'stable';
      }

      const changes: number[] = [];
      for (let i = 1; i < weeklyAmounts.length; i++) {
        const change = weeklyAmounts[i] - weeklyAmounts[i - 1];
        if (change !== 0) {
          changes.push(change);
        }
      }

      const avgChange = changes.length > 0
        ? changes.reduce((sum, c) => sum + c, 0) / changes.length
        : 0;

      if (avgChange > weeklyAmounts[weeklyAmounts.length - 1] * 0.15) {
        return 'increasing';
      } else if (avgChange < -weeklyAmounts[weeklyAmounts.length - 1] * 0.15) {
        return 'decreasing';
      } else if (changes.some(c => Math.abs(c) > weeklyAmounts[weeklyAmounts.length - 1] * 0.5)) {
        return 'volatile';
      } else {
        return 'stable';
      }
    } catch (error) {
      logger.error('Failed to calculate weekly trend', { companyId, error });
      return 'stable';
    }
  }

  /**
   * Helper: حساب معدل النمو الشهري
   */
  private async calculateMonthlyGrowthRate(
    companyId: string
  ): Promise<number> {
    try {
      const thisMonth = this.getMonthStartDate(0);
      const lastMonth = this.getMonthStartDate(-1);

      const { data: currentPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', companyId)
        .eq('transaction_type', 'income')
        .eq('payment_status', 'completed')
        .gte('payment_date', thisMonth)
        .lt('payment_date', this.getMonthEndDate(0));

      const { data: lastPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('company_id', companyId)
        .eq('transaction_type', 'income')
        .eq('payment_status', 'completed')
        .gte('payment_date', lastMonth)
        .lt('payment_date', this.getMonthEndDate(-1));

      const currentRevenue = currentPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const lastRevenue = lastPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      if (lastRevenue === 0) {
        return 0;
      }

      const growthRate = ((currentRevenue - lastRevenue) / lastRevenue) * 100;

      logger.debug('Monthly growth rate calculated', { companyId, growthRate });

      return growthRate;
    } catch (error) {
      logger.error('Failed to calculate monthly growth rate', { companyId, error });
      return 0;
    }
  }

  /**
   * Helper: حساب أفضل الأيام للإيرادات
   */
  private async calculateBestDaysOfWeek(
    companyId: string,
    monthsToAnalyze: number
  ): Promise<Array<{
    dayOfWeek: number;
    totalAmount: number;
    paymentCount: number;
  }>> {
    const startDate = this.getMonthStartDate(-monthsToAnalyze + 1);

    const { data: payments } = await supabase
      .from('payments')
      .select('amount, payment_date')
      .eq('company_id', companyId)
      .eq('transaction_type', 'income')
      .eq('payment_status', 'completed')
      .gte('payment_date', startDate);

    if (!payments) {
      return [];
    }

    const dayTotals = new Map<number, { total: number; count: number }>();

    for (const payment of payments) {
      const date = new Date(payment.payment_date);
      const dayOfWeek = date.getDay(); // 0 = الأحد، 6 = السبت

      const current = dayTotals.get(dayOfWeek) || { total: 0, count: 0 };
      current.total += payment.amount || 0;
      current.count++;
      dayTotals.set(dayOfWeek, current);
    }

    const bestDays = Array.from(dayTotals.entries())
      .map(([dayOfWeek, data]) => ({
        dayOfWeek,
        totalAmount: data.total,
        paymentCount: data.count
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    return bestDays.slice(0, 7); // أفضل 7 أيام
  }

  /**
   * Helper: الحصول على دخل شهري
   */
  private async getMonthlyIncome(companyId: string, monthOffset: number): Promise<number> {
    const monthStart = this.getMonthStartDate(monthOffset);
    const monthEnd = this.getMonthEndDate(monthOffset);

    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('company_id', companyId)
      .eq('transaction_type', 'income')
      .eq('payment_status', 'completed')
      .gte('payment_date', monthStart)
      .lt('payment_date', monthEnd);

    return payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  }

  /**
   * Helper: الحصول على مصروف شهري
   */
  private async getMonthlyExpenses(companyId: string, monthOffset: number): Promise<number> {
    const monthStart = this.getMonthStartDate(monthOffset);
    const monthEnd = this.getMonthEndDate(monthOffset);

    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('company_id', companyId)
      .eq('transaction_type', 'expense')
      .eq('payment_status', 'completed')
      .gte('payment_date', monthStart)
      .lt('payment_date', monthEnd);

    return payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  }

  /**
   * Helper: الحصول على بداية الشهر
   */
  private getMonthStartDate(offsetFromCurrent: number): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + offsetFromCurrent;

    return new Date(year, month, 1).toISOString();
  }

  /**
   * Helper: الحصول على نهاية الشهر
   */
  private getMonthEndDate(offsetFromCurrent: number): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + offsetFromCurrent;

    return new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
  }

  /**
   * Helper: عنوان الشهر
   */
  private getMonthLabel(offsetFromCurrent: number): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + offsetFromCurrent;

    const monthsAr = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    return `${monthsAr[month]} ${year}`;
  }

  /**
   * Helper: KPIs فارغة
   */
  private getEmptyKPIs(
    companyId: string,
    options: any
  ): PaymentKPIs {
    const now = new Date();

    return {
      totalPayments: 0,
      totalAmount: 0,
      totalIncome: 0,
      totalExpenses: 0,
      averagePaymentAmount: 0,
      medianPaymentAmount: 0,
      averagePaymentsPerDay: 0,
      averagePaymentsPerWeek: 0,
      averagePaymentsPerMonth: 0,
      paymentCompletionRate: 0,
      onTimePaymentRate: 0,
      latePaymentRate: 0,
      autoMatchedRate: 0,
      monthlyTrend: 'stable',
      weeklyTrend: 'stable',
      monthlyGrowthRate: 0,
      reportPeriod: {
        startDate: now.toISOString(),
        endDate: now.toISOString()
      }
    };
  }
}

// Export singleton instance
export const paymentAnalyticsService = new PaymentAnalyticsService();

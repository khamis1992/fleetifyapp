import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Percent,
  PieChart,
  Target,
  Save,
  Download,
  History,
  Info
} from 'lucide-react';
import { useCurrencyFormatter } from '@/hooks/useCurrencyFormatter';
import { toast } from 'sonner';

interface CalculationResult {
  id: string;
  type: string;
  inputs: Record<string, number>;
  result: number;
  timestamp: Date;
}

const FinancialCalculator: React.FC = () => {
  const { formatCurrency } = useCurrencyFormatter();
  const [history, setHistory] = useState<CalculationResult[]>([]);
  
  // حاسبة القروض
  const [loanInputs, setLoanInputs] = useState({
    principal: 0,
    rate: 0,
    term: 0
  });
  const [loanResult, setLoanResult] = useState({
    monthlyPayment: 0,
    totalPayment: 0,
    totalInterest: 0
  });

  // حاسبة الإهلاك
  const [depreciationInputs, setDepreciationInputs] = useState({
    cost: 0,
    salvageValue: 0,
    usefulLife: 0,
    method: 'straight-line'
  });
  const [depreciationResult, setDepreciationResult] = useState({
    annualDepreciation: 0,
    monthlyDepreciation: 0,
    bookValue: 0
  });

  // حاسبة الربحية
  const [profitInputs, setProfitInputs] = useState({
    revenue: 0,
    costs: 0,
    expenses: 0
  });
  const [profitResult, setProfitResult] = useState({
    grossProfit: 0,
    netProfit: 0,
    profitMargin: 0
  });

  // حاسبة ROI
  const [roiInputs, setRoiInputs] = useState({
    initialInvestment: 0,
    finalValue: 0,
    timeperiod: 0
  });
  const [roiResult, setRoiResult] = useState({
    roi: 0,
    annualizedReturn: 0,
    totalReturn: 0
  });

  // حساب القرض
  const calculateLoan = () => {
    const { principal, rate, term } = loanInputs;
    
    if (principal <= 0 || rate <= 0 || term <= 0) {
      toast.error('يرجى إدخال قيم صحيحة');
      return;
    }

    const monthlyRate = rate / 100 / 12;
    const numPayments = term * 12;
    
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                          (Math.pow(1 + monthlyRate, numPayments) - 1);
    
    const totalPayment = monthlyPayment * numPayments;
    const totalInterest = totalPayment - principal;

    const result = {
      monthlyPayment,
      totalPayment,
      totalInterest
    };

    setLoanResult(result);
    
    // إضافة للتاريخ
    addToHistory('loan', loanInputs, monthlyPayment);
    toast.success('تم حساب القرض بنجاح');
  };

  // حساب الإهلاك
  const calculateDepreciation = () => {
    const { cost, salvageValue, usefulLife, method } = depreciationInputs;
    
    if (cost <= 0 || usefulLife <= 0) {
      toast.error('يرجى إدخال قيم صحيحة');
      return;
    }

    let annualDepreciation = 0;
    
    if (method === 'straight-line') {
      annualDepreciation = (cost - salvageValue) / usefulLife;
    } else if (method === 'double-declining') {
      const rate = 2 / usefulLife;
      annualDepreciation = cost * rate;
    }

    const monthlyDepreciation = annualDepreciation / 12;
    const bookValue = cost - annualDepreciation;

    const result = {
      annualDepreciation,
      monthlyDepreciation,
      bookValue
    };

    setDepreciationResult(result);
    addToHistory('depreciation', depreciationInputs, annualDepreciation);
    toast.success('تم حساب الإهلاك بنجاح');
  };

  // حساب الربحية
  const calculateProfit = () => {
    const { revenue, costs, expenses } = profitInputs;
    
    if (revenue <= 0) {
      toast.error('يرجى إدخال قيمة الإيرادات');
      return;
    }

    const grossProfit = revenue - costs;
    const netProfit = grossProfit - expenses;
    const profitMargin = (netProfit / revenue) * 100;

    const result = {
      grossProfit,
      netProfit,
      profitMargin
    };

    setProfitResult(result);
    addToHistory('profit', profitInputs, netProfit);
    toast.success('تم حساب الربحية بنجاح');
  };

  // حساب ROI
  const calculateROI = () => {
    const { initialInvestment, finalValue, timeperiod } = roiInputs;
    
    if (initialInvestment <= 0 || finalValue <= 0) {
      toast.error('يرجى إدخال قيم صحيحة');
      return;
    }

    const totalReturn = finalValue - initialInvestment;
    const roi = (totalReturn / initialInvestment) * 100;
    const annualizedReturn = timeperiod > 0 ? 
      (Math.pow(finalValue / initialInvestment, 1 / timeperiod) - 1) * 100 : 0;

    const result = {
      roi,
      annualizedReturn,
      totalReturn
    };

    setRoiResult(result);
    addToHistory('roi', roiInputs, roi);
    toast.success('تم حساب العائد على الاستثمار بنجاح');
  };

  // إضافة للتاريخ
  const addToHistory = (type: string, inputs: Record<string, any>, result: number) => {
    const calculation: CalculationResult = {
      id: Date.now().toString(),
      type,
      inputs,
      result,
      timestamp: new Date()
    };
    
    setHistory(prev => [calculation, ...prev.slice(0, 9)]); // الاحتفاظ بآخر 10 حسابات
  };

  // مسح التاريخ
  const clearHistory = () => {
    setHistory([]);
    toast.success('تم مسح التاريخ');
  };

  // تصدير النتائج
  const exportResults = () => {
    const data = {
      loan: loanResult,
      depreciation: depreciationResult,
      profit: profitResult,
      roi: roiResult,
      history
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-calculations-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('تم تصدير النتائج');
  };

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="p-3 rounded-lg bg-green-100 text-green-700"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Calculator size={24} />
                </motion.div>
                <div>
                  <CardTitle className="text-2xl">الحاسبة المالية</CardTitle>
                  <p className="text-muted-foreground">احتساب التكاليف والأرباح والعوائد</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportResults}>
                  <Download size={16} className="ml-2" />
                  تصدير
                </Button>
                <Button variant="outline" onClick={clearHistory}>
                  <History size={16} className="ml-2" />
                  مسح التاريخ
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>

      {/* الحاسبات */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Tabs defaultValue="loan" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="loan" className="flex items-center gap-2">
              <DollarSign size={16} />
              حاسبة القروض
            </TabsTrigger>
            <TabsTrigger value="depreciation" className="flex items-center gap-2">
              <TrendingUp size={16} />
              حاسبة الإهلاك
            </TabsTrigger>
            <TabsTrigger value="profit" className="flex items-center gap-2">
              <PieChart size={16} />
              حاسبة الربحية
            </TabsTrigger>
            <TabsTrigger value="roi" className="flex items-center gap-2">
              <Target size={16} />
              حاسبة ROI
            </TabsTrigger>
          </TabsList>

          {/* حاسبة القروض */}
          <TabsContent value="loan">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign size={20} />
                    معطيات القرض
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>مبلغ القرض (ريال)</Label>
                    <Input
                      type="number"
                      value={loanInputs.principal || ''}
                      onChange={(e) => setLoanInputs(prev => ({
                        ...prev,
                        principal: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="100000"
                    />
                  </div>
                  <div>
                    <Label>معدل الفائدة السنوي (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={loanInputs.rate || ''}
                      onChange={(e) => setLoanInputs(prev => ({
                        ...prev,
                        rate: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="5.5"
                    />
                  </div>
                  <div>
                    <Label>مدة القرض (سنوات)</Label>
                    <Input
                      type="number"
                      value={loanInputs.term || ''}
                      onChange={(e) => setLoanInputs(prev => ({
                        ...prev,
                        term: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="5"
                    />
                  </div>
                  <Button onClick={calculateLoan} className="w-full">
                    <Calculator size={16} className="ml-2" />
                    احسب القرض
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>نتائج القرض</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">القسط الشهري</p>
                      <p className="text-xl font-bold text-blue-700">
                        {formatCurrency(loanResult.monthlyPayment)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">إجمالي المدفوعات</p>
                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(loanResult.totalPayment)}
                      </p>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي الفوائد</p>
                    <p className="text-xl font-bold text-red-700">
                      {formatCurrency(loanResult.totalInterest)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* حاسبة الإهلاك */}
          <TabsContent value="depreciation">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp size={20} />
                    معطيات الإهلاك
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>تكلفة الأصل (ريال)</Label>
                    <Input
                      type="number"
                      value={depreciationInputs.cost || ''}
                      onChange={(e) => setDepreciationInputs(prev => ({
                        ...prev,
                        cost: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="50000"
                    />
                  </div>
                  <div>
                    <Label>القيمة المتبقية (ريال)</Label>
                    <Input
                      type="number"
                      value={depreciationInputs.salvageValue || ''}
                      onChange={(e) => setDepreciationInputs(prev => ({
                        ...prev,
                        salvageValue: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="5000"
                    />
                  </div>
                  <div>
                    <Label>العمر الإنتاجي (سنوات)</Label>
                    <Input
                      type="number"
                      value={depreciationInputs.usefulLife || ''}
                      onChange={(e) => setDepreciationInputs(prev => ({
                        ...prev,
                        usefulLife: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="5"
                    />
                  </div>
                  <div>
                    <Label>طريقة الإهلاك</Label>
                    <Select 
                      value={depreciationInputs.method} 
                      onValueChange={(value) => setDepreciationInputs(prev => ({
                        ...prev,
                        method: value
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="straight-line">القسط الثابت</SelectItem>
                        <SelectItem value="double-declining">القسط المتناقص المضاعف</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={calculateDepreciation} className="w-full">
                    <Calculator size={16} className="ml-2" />
                    احسب الإهلاك
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>نتائج الإهلاك</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">الإهلاك السنوي</p>
                      <p className="text-xl font-bold text-purple-700">
                        {formatCurrency(depreciationResult.annualDepreciation)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">الإهلاك الشهري</p>
                      <p className="text-xl font-bold text-orange-700">
                        {formatCurrency(depreciationResult.monthlyDepreciation)}
                      </p>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-teal-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">القيمة الدفترية</p>
                    <p className="text-xl font-bold text-teal-700">
                      {formatCurrency(depreciationResult.bookValue)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* حاسبة الربحية */}
          <TabsContent value="profit">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart size={20} />
                    معطيات الربحية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>الإيرادات (ريال)</Label>
                    <Input
                      type="number"
                      value={profitInputs.revenue || ''}
                      onChange={(e) => setProfitInputs(prev => ({
                        ...prev,
                        revenue: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="100000"
                    />
                  </div>
                  <div>
                    <Label>تكلفة البضاعة المباعة (ريال)</Label>
                    <Input
                      type="number"
                      value={profitInputs.costs || ''}
                      onChange={(e) => setProfitInputs(prev => ({
                        ...prev,
                        costs: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="60000"
                    />
                  </div>
                  <div>
                    <Label>المصروفات التشغيلية (ريال)</Label>
                    <Input
                      type="number"
                      value={profitInputs.expenses || ''}
                      onChange={(e) => setProfitInputs(prev => ({
                        ...prev,
                        expenses: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="20000"
                    />
                  </div>
                  <Button onClick={calculateProfit} className="w-full">
                    <Calculator size={16} className="ml-2" />
                    احسب الربحية
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>نتائج الربحية</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">الربح الإجمالي</p>
                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(profitResult.grossProfit)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">الربح الصافي</p>
                      <p className="text-xl font-bold text-blue-700">
                        {formatCurrency(profitResult.netProfit)}
                      </p>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">هامش الربح</p>
                    <p className="text-xl font-bold text-yellow-700">
                      {profitResult.profitMargin.toFixed(2)}%
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* حاسبة ROI */}
          <TabsContent value="roi">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target size={20} />
                    معطيات الاستثمار
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>الاستثمار الأولي (ريال)</Label>
                    <Input
                      type="number"
                      value={roiInputs.initialInvestment || ''}
                      onChange={(e) => setRoiInputs(prev => ({
                        ...prev,
                        initialInvestment: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <Label>القيمة النهائية (ريال)</Label>
                    <Input
                      type="number"
                      value={roiInputs.finalValue || ''}
                      onChange={(e) => setRoiInputs(prev => ({
                        ...prev,
                        finalValue: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="15000"
                    />
                  </div>
                  <div>
                    <Label>المدة الزمنية (سنوات)</Label>
                    <Input
                      type="number"
                      value={roiInputs.timeperiod || ''}
                      onChange={(e) => setRoiInputs(prev => ({
                        ...prev,
                        timeperiod: parseFloat(e.target.value) || 0
                      }))}
                      placeholder="2"
                    />
                  </div>
                  <Button onClick={calculateROI} className="w-full">
                    <Calculator size={16} className="ml-2" />
                    احسب ROI
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>نتائج العائد على الاستثمار</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-indigo-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">ROI الإجمالي</p>
                      <p className="text-xl font-bold text-indigo-700">
                        {roiResult.roi.toFixed(2)}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-pink-50 rounded-lg">
                      <p className="text-sm text-muted-foreground">العائد السنوي</p>
                      <p className="text-xl font-bold text-pink-700">
                        {roiResult.annualizedReturn.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                  <div className="text-center p-4 bg-cyan-50 rounded-lg">
                    <p className="text-sm text-muted-foreground">إجمالي العائد</p>
                    <p className="text-xl font-bold text-cyan-700">
                      {formatCurrency(roiResult.totalReturn)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* تاريخ الحسابات */}
      {history.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History size={20} />
                تاريخ الحسابات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((calc, index) => (
                  <div key={calc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">
                        {calc.type === 'loan' && 'قرض'}
                        {calc.type === 'depreciation' && 'إهلاك'}
                        {calc.type === 'profit' && 'ربحية'}
                        {calc.type === 'roi' && 'ROI'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {calc.timestamp.toLocaleString('ar-SA')}
                      </span>
                    </div>
                    <div className="font-semibold">
                      {calc.type === 'roi' || calc.type === 'profit' ? 
                        `${calc.result.toFixed(2)}%` : 
                        formatCurrency(calc.result)
                      }
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default FinancialCalculator;

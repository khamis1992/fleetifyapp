/**
 * صفحة الأصول الثابتة - تصميم جديد متوافق مع الداشبورد
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Building, 
  Plus, 
  Calculator, 
  TrendingDown, 
  Search, 
  Package, 
  Eye, 
  Edit, 
  Trash2, 
  TestTube,
  ArrowLeft,
  RefreshCw,
  Filter,
  DollarSign,
  Layers,
  CheckCircle,
  AlertTriangle,
  XCircle,
  MapPin,
  Calendar,
  Briefcase,
} from "lucide-react";
import { useFixedAssets, useCreateFixedAsset, useUpdateFixedAsset, useDeleteFixedAsset, useChartOfAccounts, FixedAsset } from "@/hooks/useFinance";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  iconBg: string;
  trend?: 'up' | 'down' | 'neutral';
  change?: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBg,
  trend = 'neutral',
  change,
  delay = 0,
}) => (
  <motion.div
    className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all border border-gray-100"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBg)}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {change && (
        <div className={cn(
          "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg",
          trend === 'up' ? 'bg-green-100 text-green-600' :
          trend === 'down' ? 'bg-red-100 text-red-600' :
          'bg-gray-100 text-gray-600'
        )}>
          {trend === 'down' && <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
    <p className="text-sm text-neutral-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-neutral-900">{value}</p>
    {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
  </motion.div>
);

const FixedAssets = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FixedAsset | null>(null);

  const { data: fixedAssets, isLoading, error, refetch } = useFixedAssets();
  const { data: accounts } = useChartOfAccounts();
  const createFixedAsset = useCreateFixedAsset();
  const updateFixedAsset = useUpdateFixedAsset();
  const deleteFixedAsset = useDeleteFixedAsset();

  const [newAsset, setNewAsset] = useState<Partial<FixedAsset>>({
    asset_code: '',
    asset_name: '',
    asset_name_ar: '',
    category: '',
    serial_number: '',
    location: '',
    purchase_date: '',
    purchase_cost: 0,
    salvage_value: 0,
    useful_life_years: 5,
    depreciation_method: 'straight_line',
    condition_status: 'good',
    notes: ''
  });

  // Filter and calculate stats
  const filteredAssets = useMemo(() => {
    return fixedAssets?.filter(asset => {
      const matchesSearch = asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           asset.asset_code.includes(searchTerm);
      const matchesCategory = filterCategory === "all" || asset.category === filterCategory;
      return matchesSearch && matchesCategory;
    }) || [];
  }, [fixedAssets, searchTerm, filterCategory]);

  const stats = useMemo(() => {
    const totalAssets = fixedAssets?.length || 0;
    const totalValue = fixedAssets?.reduce((sum, asset) => sum + (asset.purchase_cost || 0), 0) || 0;
    const totalDepreciation = fixedAssets?.reduce((sum, asset) => sum + (asset.accumulated_depreciation || 0), 0) || 0;
    const totalBookValue = fixedAssets?.reduce((sum, asset) => sum + (asset.book_value || 0), 0) || 0;
    const excellentCount = fixedAssets?.filter(a => a.condition_status === 'excellent').length || 0;
    const goodCount = fixedAssets?.filter(a => a.condition_status === 'good').length || 0;
    const fairCount = fixedAssets?.filter(a => a.condition_status === 'fair').length || 0;
    const poorCount = fixedAssets?.filter(a => a.condition_status === 'poor').length || 0;
    
    return {
      totalAssets,
      totalValue,
      totalDepreciation,
      totalBookValue,
      excellentCount,
      goodCount,
      fairCount,
      poorCount,
    };
  }, [fixedAssets]);

  const assetCategories = useMemo(() => {
    return [...new Set(fixedAssets?.map(asset => asset.category).filter(c => c && c.trim() !== '') || [])];
  }, [fixedAssets]);

  const handleCreateAsset = async () => {
    if (!newAsset.asset_code || !newAsset.asset_name || !newAsset.purchase_date) return;

    await createFixedAsset.mutateAsync({
      asset_code: newAsset.asset_code!,
      asset_name: newAsset.asset_name!,
      asset_name_ar: newAsset.asset_name_ar,
      category: newAsset.category!,
      serial_number: newAsset.serial_number,
      location: newAsset.location,
      purchase_date: newAsset.purchase_date!,
      purchase_cost: newAsset.purchase_cost!,
      salvage_value: newAsset.salvage_value,
      useful_life_years: newAsset.useful_life_years!,
      depreciation_method: newAsset.depreciation_method,
      condition_status: newAsset.condition_status,
      notes: newAsset.notes
    });

    resetForm();
    setIsCreateDialogOpen(false);
  };

  const handleEditAsset = async () => {
    if (!selectedAsset || !newAsset.asset_code || !newAsset.asset_name || !newAsset.purchase_date) return;

    await updateFixedAsset.mutateAsync({
      id: selectedAsset.id,
      asset_code: newAsset.asset_code!,
      asset_name: newAsset.asset_name!,
      asset_name_ar: newAsset.asset_name_ar,
      category: newAsset.category!,
      serial_number: newAsset.serial_number,
      location: newAsset.location,
      purchase_date: newAsset.purchase_date!,
      purchase_cost: newAsset.purchase_cost!,
      salvage_value: newAsset.salvage_value,
      useful_life_years: newAsset.useful_life_years!,
      depreciation_method: newAsset.depreciation_method,
      condition_status: newAsset.condition_status,
      notes: newAsset.notes
    });

    setIsEditDialogOpen(false);
    setSelectedAsset(null);
  };

  const resetForm = () => {
    setNewAsset({
      asset_code: '',
      asset_name: '',
      asset_name_ar: '',
      category: '',
      serial_number: '',
      location: '',
      purchase_date: '',
      purchase_cost: 0,
      salvage_value: 0,
      useful_life_years: 5,
      depreciation_method: 'straight_line',
      condition_status: 'good',
      notes: ''
    });
  };

  const handleViewAsset = (asset: FixedAsset) => {
    setSelectedAsset(asset);
    setIsViewDialogOpen(true);
  };

  const handleEditClick = (asset: FixedAsset) => {
    setSelectedAsset(asset);
    setNewAsset({
      asset_code: asset.asset_code,
      asset_name: asset.asset_name,
      asset_name_ar: asset.asset_name_ar || '',
      category: asset.category,
      serial_number: asset.serial_number || '',
      location: asset.location || '',
      purchase_date: asset.purchase_date,
      purchase_cost: asset.purchase_cost,
      salvage_value: asset.salvage_value || 0,
      useful_life_years: asset.useful_life_years,
      depreciation_method: asset.depreciation_method,
      condition_status: asset.condition_status,
      notes: asset.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteAsset = async (assetId: string) => {
    await deleteFixedAsset.mutateAsync(assetId);
  };

  const fillSampleData = () => {
    const sampleAssets = [
      {
        asset_code: 'FA001',
        asset_name: 'كمبيوتر محمول HP EliteBook',
        asset_name_ar: 'كمبيوتر محمول',
        category: 'equipment',
        serial_number: 'HP2024001',
        location: 'مكتب الإدارة',
        purchase_date: '2024-01-15',
        purchase_cost: 800,
        salvage_value: 100,
        useful_life_years: 5,
        depreciation_method: 'straight_line' as const,
        condition_status: 'excellent' as const,
        notes: 'جهاز للاستخدام الإداري'
      },
      {
        asset_code: 'FA002', 
        asset_name: 'طابعة ليزر Canon',
        asset_name_ar: 'طابعة ليزر',
        category: 'equipment',
        serial_number: 'CN2024002',
        location: 'قسم الموارد البشرية',
        purchase_date: '2024-02-01',
        purchase_cost: 450,
        salvage_value: 50,
        useful_life_years: 7,
        depreciation_method: 'straight_line' as const,
        condition_status: 'good' as const,
        notes: 'طابعة عالية الجودة'
      },
      {
        asset_code: 'FA003',
        asset_name: 'مكتب إداري خشبي',
        asset_name_ar: 'مكتب إداري',
        category: 'furniture',
        serial_number: 'DESK2024003',
        location: 'مكتب المدير العام',
        purchase_date: '2024-01-10',
        purchase_cost: 1200,
        salvage_value: 200,
        useful_life_years: 10,
        depreciation_method: 'straight_line' as const,
        condition_status: 'excellent' as const,
        notes: 'مكتب تنفيذي فاخر'
      }
    ];
    
    const randomAsset = sampleAssets[Math.floor(Math.random() * sampleAssets.length)];
    setNewAsset(randomAsset);
  };

  const getConditionBadge = (status: string) => {
    switch (status) {
      case 'excellent':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1"><CheckCircle className="w-3 h-3" />ممتازة</Badge>;
      case 'good':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">جيدة</Badge>;
      case 'fair':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1"><AlertTriangle className="w-3 h-3" />متوسطة</Badge>;
      case 'poor':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1"><XCircle className="w-3 h-3" />ضعيفة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      buildings: 'المباني والإنشاءات',
      equipment: 'المعدات والآلات',
      furniture: 'الأثاث والتجهيزات',
      vehicles: 'المركبات والنقل',
      software: 'البرمجيات',
      other: 'أخرى'
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-10 h-10 animate-spin text-coral-500" />
          <p className="text-neutral-500">جاري تحميل الأصول الثابتة...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0efed] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-red-600 font-medium">حدث خطأ في تحميل البيانات</p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            إعادة المحاولة
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0efed] p-6" dir="rtl">
      {/* Hero Header */}
      <motion.div
        className="bg-gradient-to-r from-coral-500 to-orange-500 rounded-2xl p-6 mb-6 text-white shadow-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">الأصول الثابتة</h1>
              <p className="text-white/80 text-sm mt-1">
                إدارة الأصول والإهلاك والصيانة
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-coral-600 hover:bg-white/90">
                  <Plus className="h-4 w-4 ml-2" />
                  أصل جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-coral-500" />
                    إنشاء أصل ثابت جديد
                  </DialogTitle>
                  <DialogDescription>
                    أدخل تفاصيل الأصل الثابت الجديد
                    <Button 
                      type="button"
                      variant="outline" 
                      size="sm" 
                      onClick={fillSampleData}
                      className="mt-2 text-xs"
                    >
                      <TestTube className="h-3 w-3 mr-1" />
                      ملء بيانات تجريبية
                    </Button>
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="assetCode">رمز الأصل *</Label>
                    <Input id="assetCode" value={newAsset.asset_code} onChange={(e) => setNewAsset({ ...newAsset, asset_code: e.target.value })} placeholder="FA001" />
                  </div>
                  <div>
                    <Label htmlFor="assetName">اسم الأصل *</Label>
                    <Input id="assetName" value={newAsset.asset_name} onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })} placeholder="اسم الأصل" />
                  </div>
                  <div>
                    <Label htmlFor="assetNameAr">الاسم بالعربية</Label>
                    <Input id="assetNameAr" value={newAsset.asset_name_ar} onChange={(e) => setNewAsset({ ...newAsset, asset_name_ar: e.target.value })} placeholder="الاسم بالعربية" />
                  </div>
                  <div>
                    <Label htmlFor="category">الفئة *</Label>
                    <Select value={newAsset.category} onValueChange={(value) => setNewAsset({ ...newAsset, category: value })}>
                      <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="buildings">المباني والإنشاءات</SelectItem>
                        <SelectItem value="equipment">المعدات والآلات</SelectItem>
                        <SelectItem value="furniture">الأثاث والتجهيزات</SelectItem>
                        <SelectItem value="vehicles">المركبات والنقل</SelectItem>
                        <SelectItem value="software">البرمجيات</SelectItem>
                        <SelectItem value="other">أخرى</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="serialNumber">الرقم التسلسلي</Label>
                    <Input id="serialNumber" value={newAsset.serial_number} onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })} placeholder="الرقم التسلسلي" />
                  </div>
                  <div>
                    <Label htmlFor="location">الموقع</Label>
                    <Input id="location" value={newAsset.location} onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })} placeholder="موقع الأصل" />
                  </div>
                  <div>
                    <Label htmlFor="purchaseDate">تاريخ الشراء *</Label>
                    <Input id="purchaseDate" type="date" value={newAsset.purchase_date} onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="purchaseCost">تكلفة الشراء *</Label>
                    <Input id="purchaseCost" type="number" value={newAsset.purchase_cost} onChange={(e) => setNewAsset({ ...newAsset, purchase_cost: Number(e.target.value) })} placeholder="0.000" />
                  </div>
                  <div>
                    <Label htmlFor="salvageValue">القيمة التخريدية</Label>
                    <Input id="salvageValue" type="number" value={newAsset.salvage_value} onChange={(e) => setNewAsset({ ...newAsset, salvage_value: Number(e.target.value) })} placeholder="0.000" />
                  </div>
                  <div>
                    <Label htmlFor="usefulLife">العمر الإنتاجي (سنوات) *</Label>
                    <Input id="usefulLife" type="number" value={newAsset.useful_life_years} onChange={(e) => setNewAsset({ ...newAsset, useful_life_years: Number(e.target.value) })} placeholder="5" />
                  </div>
                  <div>
                    <Label htmlFor="depreciationMethod">طريقة الإهلاك</Label>
                    <Select value={newAsset.depreciation_method} onValueChange={(value: any) => setNewAsset({ ...newAsset, depreciation_method: value })}>
                      <SelectTrigger><SelectValue placeholder="اختر الطريقة" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="straight_line">القسط الثابت</SelectItem>
                        <SelectItem value="declining_balance">الرصيد المتناقص</SelectItem>
                        <SelectItem value="units_of_production">وحدات الإنتاج</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="condition">حالة الأصل</Label>
                    <Select value={newAsset.condition_status} onValueChange={(value: any) => setNewAsset({ ...newAsset, condition_status: value })}>
                      <SelectTrigger><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">ممتازة</SelectItem>
                        <SelectItem value="good">جيدة</SelectItem>
                        <SelectItem value="fair">متوسطة</SelectItem>
                        <SelectItem value="poor">ضعيفة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="notes">ملاحظات</Label>
                    <Textarea id="notes" value={newAsset.notes} onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })} placeholder="ملاحظات إضافية" />
                  </div>
                  <div className="col-span-2">
                    <Button onClick={handleCreateAsset} className="w-full bg-coral-500 hover:bg-coral-600" disabled={createFixedAsset.isPending}>
                      {createFixedAsset.isPending ? "جاري الإنشاء..." : "إنشاء الأصل"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={() => refetch()} variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/20">
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button onClick={() => navigate('/finance/hub')} variant="secondary" size="sm" className="bg-white/20 hover:bg-white/30 text-white border-white/20">
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة
            </Button>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">إجمالي الأصول</p>
            <p className="text-2xl font-bold mt-1">{stats.totalAssets}</p>
            <p className="text-xs text-white/60">أصل ثابت</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">القيمة الإجمالية</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalValue)}</p>
            <p className="text-xs text-white/60">قيمة الشراء</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">الإهلاك المتراكم</p>
            <p className="text-2xl font-bold mt-1 text-orange-200">{formatCurrency(stats.totalDepreciation)}</p>
            <p className="text-xs text-white/60">إهلاك تراكمي</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">القيمة الدفترية</p>
            <p className="text-2xl font-bold mt-1 text-green-200">{formatCurrency(stats.totalBookValue)}</p>
            <p className="text-xs text-white/60">القيمة الحالية</p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="إجمالي الأصول" value={stats.totalAssets} subtitle="Total Assets" icon={Package} iconBg="bg-gradient-to-br from-coral-500 to-orange-500" delay={0.1} />
        <StatCard title="القيمة الإجمالية" value={formatCurrency(stats.totalValue)} subtitle="Purchase Cost" icon={DollarSign} iconBg="bg-gradient-to-br from-blue-500 to-cyan-500" delay={0.15} />
        <StatCard title="الإهلاك المتراكم" value={formatCurrency(stats.totalDepreciation)} subtitle="Accumulated Depreciation" icon={TrendingDown} iconBg="bg-gradient-to-br from-amber-500 to-orange-500" trend="down" change="إهلاك" delay={0.2} />
        <StatCard title="القيمة الدفترية" value={formatCurrency(stats.totalBookValue)} subtitle="Book Value" icon={Calculator} iconBg="bg-gradient-to-br from-green-500 to-emerald-500" delay={0.25} />
      </div>

      {/* Search & Filter Card */}
      <motion.div className="bg-white rounded-2xl shadow-sm p-4 mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-coral-500" />
          <h3 className="font-semibold text-neutral-900">البحث والتصفية</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
            <Input placeholder="البحث في الأصول..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pr-10 bg-gray-50 border-gray-200" />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px] bg-gray-50 border-gray-200">
              <SelectValue placeholder="جميع الفئات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الفئات</SelectItem>
              {assetCategories.map(category => (
                <SelectItem key={category} value={category}>{getCategoryLabel(category)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Assets Table */}
      <motion.div className="bg-white rounded-2xl shadow-sm overflow-hidden" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-500 to-orange-500 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">قائمة الأصول الثابتة</h3>
                <p className="text-sm text-neutral-500">إجمالي {filteredAssets.length} أصل</p>
              </div>
            </div>
            {filteredAssets.length !== stats.totalAssets && (
              <Badge variant="secondary" className="bg-coral-100 text-coral-700">
                تم تصفية {stats.totalAssets - filteredAssets.length} أصل
              </Badge>
            )}
          </div>
        </div>

        {filteredAssets.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-coral-100 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-coral-500" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">لا توجد أصول ثابتة</h3>
            <p className="text-neutral-500 mb-4">لم يتم العثور على أصول تطابق معايير البحث</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-coral-500 hover:bg-coral-600">
              <Plus className="h-4 w-4 ml-2" />
              إضافة أصل جديد
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-right">رمز الأصل</TableHead>
                  <TableHead className="text-right">اسم الأصل</TableHead>
                  <TableHead className="text-center">الفئة</TableHead>
                  <TableHead className="text-center">تاريخ الشراء</TableHead>
                  <TableHead className="text-center">تكلفة الشراء</TableHead>
                  <TableHead className="text-center">الإهلاك المتراكم</TableHead>
                  <TableHead className="text-center">القيمة الدفترية</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredAssets.map((asset, index) => (
                    <motion.tr key={asset.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: index * 0.02 }} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <TableCell className="font-mono font-medium">{asset.asset_code}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-100 to-orange-100 flex items-center justify-center">
                            <Briefcase className="h-5 w-5 text-coral-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900">{asset.asset_name}</p>
                            {asset.asset_name_ar && <p className="text-xs text-neutral-400">{asset.asset_name_ar}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{getCategoryLabel(asset.category)}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-neutral-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(asset.purchase_date).toLocaleDateString('en-GB')}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">{formatCurrency(asset.purchase_cost)}</TableCell>
                      <TableCell className="text-center text-orange-600 font-medium">{formatCurrency(asset.accumulated_depreciation || 0)}</TableCell>
                      <TableCell className="text-center text-green-600 font-bold">{formatCurrency(asset.book_value)}</TableCell>
                      <TableCell className="text-center">{getConditionBadge(asset.condition_status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-blue-50" onClick={() => handleViewAsset(asset)}>
                            <Eye className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-amber-50" onClick={() => handleEditClick(asset)}>
                            <Edit className="h-4 w-4 text-amber-500" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-red-50">
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <Trash2 className="w-5 h-5 text-red-500" />
                                  تأكيد الحذف
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  هل أنت متأكد من حذف الأصل "{asset.asset_name}"؟ لن يمكن التراجع عن هذا الإجراء.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAsset(asset.id)} className="bg-red-500 hover:bg-red-600">
                                  حذف
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      {/* View Asset Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-coral-500" />
              تفاصيل الأصل الثابت
            </DialogTitle>
            <DialogDescription>معلومات تفصيلية عن الأصل</DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">رمز الأصل</Label><p className="font-medium">{selectedAsset.asset_code}</p></div>
              <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">اسم الأصل</Label><p className="font-medium">{selectedAsset.asset_name}</p></div>
              {selectedAsset.asset_name_ar && <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">الاسم بالعربية</Label><p className="font-medium">{selectedAsset.asset_name_ar}</p></div>}
              <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">الفئة</Label><p className="font-medium">{getCategoryLabel(selectedAsset.category)}</p></div>
              {selectedAsset.serial_number && <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">الرقم التسلسلي</Label><p className="font-medium">{selectedAsset.serial_number}</p></div>}
              {selectedAsset.location && <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">الموقع</Label><p className="font-medium flex items-center gap-1"><MapPin className="w-4 h-4" />{selectedAsset.location}</p></div>}
              <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">تاريخ الشراء</Label><p className="font-medium">{new Date(selectedAsset.purchase_date).toLocaleDateString('en-GB')}</p></div>
              <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">تكلفة الشراء</Label><p className="font-medium">{formatCurrency(selectedAsset.purchase_cost)}</p></div>
              <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">القيمة التخريدية</Label><p className="font-medium">{formatCurrency(selectedAsset.salvage_value || 0)}</p></div>
              <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">العمر الإنتاجي</Label><p className="font-medium">{selectedAsset.useful_life_years} سنوات</p></div>
              <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">طريقة الإهلاك</Label><p className="font-medium">{selectedAsset.depreciation_method === 'straight_line' ? 'القسط الثابت' : selectedAsset.depreciation_method === 'declining_balance' ? 'الرصيد المتناقص' : 'وحدات الإنتاج'}</p></div>
              <div className="p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">حالة الأصل</Label><div className="mt-1">{getConditionBadge(selectedAsset.condition_status)}</div></div>
              <div className="p-3 bg-orange-50 rounded-xl"><Label className="text-xs text-neutral-500">الإهلاك المتراكم</Label><p className="font-medium text-orange-600">{formatCurrency(selectedAsset.accumulated_depreciation || 0)}</p></div>
              <div className="p-3 bg-green-50 rounded-xl"><Label className="text-xs text-neutral-500">القيمة الدفترية</Label><p className="font-medium text-green-600">{formatCurrency(selectedAsset.book_value)}</p></div>
              {selectedAsset.notes && <div className="col-span-2 p-3 bg-gray-50 rounded-xl"><Label className="text-xs text-neutral-500">ملاحظات</Label><p className="text-sm">{selectedAsset.notes}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-coral-500" />
              تعديل الأصل الثابت
            </DialogTitle>
            <DialogDescription>تحديث معلومات الأصل الثابت</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label htmlFor="editAssetCode">رمز الأصل *</Label><Input id="editAssetCode" value={newAsset.asset_code} onChange={(e) => setNewAsset({ ...newAsset, asset_code: e.target.value })} /></div>
            <div><Label htmlFor="editAssetName">اسم الأصل *</Label><Input id="editAssetName" value={newAsset.asset_name} onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })} /></div>
            <div><Label htmlFor="editAssetNameAr">الاسم بالعربية</Label><Input id="editAssetNameAr" value={newAsset.asset_name_ar} onChange={(e) => setNewAsset({ ...newAsset, asset_name_ar: e.target.value })} /></div>
            <div><Label htmlFor="editCategory">الفئة *</Label><Select value={newAsset.category} onValueChange={(value) => setNewAsset({ ...newAsset, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="buildings">المباني والإنشاءات</SelectItem><SelectItem value="equipment">المعدات والآلات</SelectItem><SelectItem value="furniture">الأثاث والتجهيزات</SelectItem><SelectItem value="vehicles">المركبات والنقل</SelectItem><SelectItem value="software">البرمجيات</SelectItem><SelectItem value="other">أخرى</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="editSerialNumber">الرقم التسلسلي</Label><Input id="editSerialNumber" value={newAsset.serial_number} onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })} /></div>
            <div><Label htmlFor="editLocation">الموقع</Label><Input id="editLocation" value={newAsset.location} onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })} /></div>
            <div><Label htmlFor="editPurchaseDate">تاريخ الشراء *</Label><Input id="editPurchaseDate" type="date" value={newAsset.purchase_date} onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })} /></div>
            <div><Label htmlFor="editPurchaseCost">تكلفة الشراء *</Label><Input id="editPurchaseCost" type="number" value={newAsset.purchase_cost} onChange={(e) => setNewAsset({ ...newAsset, purchase_cost: Number(e.target.value) })} /></div>
            <div><Label htmlFor="editSalvageValue">القيمة التخريدية</Label><Input id="editSalvageValue" type="number" value={newAsset.salvage_value} onChange={(e) => setNewAsset({ ...newAsset, salvage_value: Number(e.target.value) })} /></div>
            <div><Label htmlFor="editUsefulLife">العمر الإنتاجي *</Label><Input id="editUsefulLife" type="number" value={newAsset.useful_life_years} onChange={(e) => setNewAsset({ ...newAsset, useful_life_years: Number(e.target.value) })} /></div>
            <div><Label htmlFor="editDepreciationMethod">طريقة الإهلاك</Label><Select value={newAsset.depreciation_method} onValueChange={(value: any) => setNewAsset({ ...newAsset, depreciation_method: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="straight_line">القسط الثابت</SelectItem><SelectItem value="declining_balance">الرصيد المتناقص</SelectItem><SelectItem value="units_of_production">وحدات الإنتاج</SelectItem></SelectContent></Select></div>
            <div><Label htmlFor="editCondition">حالة الأصل</Label><Select value={newAsset.condition_status} onValueChange={(value: any) => setNewAsset({ ...newAsset, condition_status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="excellent">ممتازة</SelectItem><SelectItem value="good">جيدة</SelectItem><SelectItem value="fair">متوسطة</SelectItem><SelectItem value="poor">ضعيفة</SelectItem></SelectContent></Select></div>
            <div className="col-span-2"><Label htmlFor="editNotes">ملاحظات</Label><Textarea id="editNotes" value={newAsset.notes} onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })} /></div>
            <div className="col-span-2"><Button onClick={handleEditAsset} className="w-full bg-coral-500 hover:bg-coral-600" disabled={updateFixedAsset.isPending}>{updateFixedAsset.isPending ? "جاري التحديث..." : "تحديث الأصل"}</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FixedAssets;

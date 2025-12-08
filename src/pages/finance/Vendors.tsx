/**
 * صفحة الموردين - تصميم جديد متوافق مع الداشبورد
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVendors, useDeleteVendor, useVendorCategories, type Vendor } from "@/hooks/useFinance";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { VendorForm } from "@/components/finance/VendorForm";
import { VendorDetailsDialog } from "@/components/finance/VendorDetailsDialog";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { 
  Building, 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  Star, 
  TrendingUp,
  ArrowLeft,
  RefreshCw,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  Filter,
  Layers,
} from "lucide-react";
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
          {trend === 'up' && <TrendingUp className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
    <p className="text-sm text-neutral-500 mb-1">{title}</p>
    <p className="text-2xl font-bold text-neutral-900">{value}</p>
    {subtitle && <p className="text-xs text-neutral-400 mt-1">{subtitle}</p>}
  </motion.div>
);

const Vendors = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrencyFormatter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  const { data: vendors, isLoading, error, refetch } = useVendors();
  const { data: categories } = useVendorCategories();
  const deleteVendor = useDeleteVendor();

  // Filter vendors
  const filteredVendors = useMemo(() => {
    return vendors?.filter(vendor => {
      const matchesSearch = vendor.vendor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === "all" || vendor.category_id === selectedCategory;

      return matchesSearch && matchesCategory;
    }) || [];
  }, [vendors, searchTerm, selectedCategory]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalVendors = vendors?.length || 0;
    const activeVendors = vendors?.filter(v => v.is_active).length || 0;
    const inactiveVendors = totalVendors - activeVendors;
    const totalBalance = vendors?.reduce((sum, v) => sum + (v.current_balance || 0), 0) || 0;
    const totalCategories = categories?.length || 0;
    const vendorsWithBalance = vendors?.filter(v => v.current_balance > 0).length || 0;

    return {
      totalVendors,
      activeVendors,
      inactiveVendors,
      totalBalance,
      totalCategories,
      vendorsWithBalance,
    };
  }, [vendors, categories]);

  const handleViewVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDetailsDialogOpen(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsEditDialogOpen(true);
  };

  const handleDeleteVendor = async (vendor: Vendor) => {
    try {
      await deleteVendor.mutateAsync(vendor.id);
    } catch (error) {
      console.error("Error deleting vendor:", error);
    }
  };

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    setSelectedVendor(null);
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
          <CheckCircle className="w-3 h-3" />
          نشط
        </Badge>
      );
    }
    return (
      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1">
        <XCircle className="w-3 h-3" />
        غير نشط
      </Badge>
    );
  };

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
              <Building className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">الموردين</h1>
              <p className="text-white/80 text-sm mt-1">
                إدارة بيانات الموردين والحسابات المالية
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-white text-coral-600 hover:bg-white/90">
                  <Plus className="h-4 w-4 ml-2" />
                  مورد جديد
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-coral-500" />
                    إضافة مورد جديد
                  </DialogTitle>
                  <DialogDescription>
                    قم بإدخال بيانات المورد الجديد
                  </DialogDescription>
                </DialogHeader>
                <VendorForm onSuccess={handleCreateSuccess} />
              </DialogContent>
            </Dialog>
            <Button
              onClick={() => refetch()}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            >
              <RefreshCw className="h-4 w-4 ml-2" />
              تحديث
            </Button>
            <Button
              onClick={() => navigate('/finance/hub')}
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-white/20"
            >
              <ArrowLeft className="h-4 w-4 ml-2" />
              العودة
            </Button>
          </div>
        </div>

        {/* Quick Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">إجمالي الموردين</p>
            <p className="text-2xl font-bold mt-1">{stats.totalVendors}</p>
            <p className="text-xs text-white/60">{stats.activeVendors} نشط</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">التصنيفات</p>
            <p className="text-2xl font-bold mt-1">{stats.totalCategories}</p>
            <p className="text-xs text-white/60">فئة تصنيف</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">المبالغ المستحقة</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalBalance)}</p>
            <p className="text-xs text-white/60">{stats.vendorsWithBalance} مورد</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <p className="text-white/70 text-sm">نسبة النشطين</p>
            <p className="text-2xl font-bold mt-1">
              {stats.totalVendors > 0 ? ((stats.activeVendors / stats.totalVendors) * 100).toFixed(0) : 0}%
            </p>
            <p className="text-xs text-white/60">{stats.inactiveVendors} غير نشط</p>
          </div>
        </div>
      </motion.div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="إجمالي الموردين"
          value={stats.totalVendors}
          subtitle="جميع الموردين"
          icon={Building}
          iconBg="bg-gradient-to-br from-coral-500 to-orange-500"
          delay={0.1}
        />
        <StatCard
          title="الموردين النشطين"
          value={stats.activeVendors}
          subtitle="Active Vendors"
          icon={CheckCircle}
          iconBg="bg-gradient-to-br from-green-500 to-emerald-500"
          trend="up"
          change={`${stats.totalVendors > 0 ? ((stats.activeVendors / stats.totalVendors) * 100).toFixed(0) : 0}%`}
          delay={0.15}
        />
        <StatCard
          title="التصنيفات"
          value={stats.totalCategories}
          subtitle="Categories"
          icon={Layers}
          iconBg="bg-gradient-to-br from-purple-500 to-indigo-500"
          delay={0.2}
        />
        <StatCard
          title="إجمالي المستحقات"
          value={formatCurrency(stats.totalBalance)}
          subtitle="Total Balance"
          icon={DollarSign}
          iconBg="bg-gradient-to-br from-blue-500 to-cyan-500"
          delay={0.25}
        />
      </div>

      {/* Search & Filter Card */}
      <motion.div
        className="bg-white rounded-2xl shadow-sm p-4 mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-coral-500" />
          <h3 className="font-semibold text-neutral-900">البحث والتصفية</h3>
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
            <Input
              placeholder="البحث بالاسم أو جهة الاتصال أو البريد الإلكتروني..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 bg-gray-50 border-gray-200"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[250px] bg-gray-50 border-gray-200">
              <SelectValue placeholder="اختر التصنيف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التصنيفات</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.category_name_ar || category.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Vendors Table */}
      <motion.div
        className="bg-white rounded-2xl shadow-sm overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-500 to-orange-500 flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-neutral-900">قائمة الموردين</h3>
                <p className="text-sm text-neutral-500">إجمالي {filteredVendors.length} مورد</p>
              </div>
            </div>
            {filteredVendors.length !== stats.totalVendors && (
              <Badge variant="secondary" className="bg-coral-100 text-coral-700">
                تم تصفية {stats.totalVendors - filteredVendors.length} مورد
              </Badge>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="w-10 h-10 animate-spin text-coral-500 mb-4" />
            <p className="text-neutral-500">جاري تحميل الموردين...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-red-600 font-medium">حدث خطأ في تحميل البيانات</p>
            <Button onClick={() => refetch()} variant="outline" className="mt-4">
              إعادة المحاولة
            </Button>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-coral-100 flex items-center justify-center mx-auto mb-4">
              <Building className="w-8 h-8 text-coral-500" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-800 mb-2">لا توجد موردين</h3>
            <p className="text-neutral-500 mb-4">لم يتم العثور على موردين تطابق معايير البحث</p>
            <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-coral-500 hover:bg-coral-600">
              <Plus className="h-4 w-4 ml-2" />
              إضافة مورد جديد
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-right">اسم المورد</TableHead>
                  <TableHead className="text-right">جهة الاتصال</TableHead>
                  <TableHead className="text-right">البريد الإلكتروني</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-center">الرصيد</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence>
                  {filteredVendors.map((vendor, index) => (
                    <motion.tr
                      key={vendor.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.02 }}
                      className={cn(
                        "border-b border-gray-50 hover:bg-gray-50/50 transition-colors",
                        !vendor.is_active && "bg-gray-50/30"
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center",
                            vendor.is_active 
                              ? "bg-gradient-to-br from-coral-100 to-orange-100" 
                              : "bg-gray-100"
                          )}>
                            <Building className={cn(
                              "h-5 w-5",
                              vendor.is_active ? "text-coral-600" : "text-gray-400"
                            )} />
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900">{vendor.vendor_name}</p>
                            {vendor.vendor_code && (
                              <p className="text-xs text-neutral-400">{vendor.vendor_code}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-neutral-400" />
                          <span className="text-neutral-700">{vendor.contact_person || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {vendor.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-500" />
                            <a 
                              href={`mailto:${vendor.email}`} 
                              className="text-blue-600 hover:underline"
                            >
                              {vendor.email}
                            </a>
                          </div>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {vendor.phone ? (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-green-500" />
                            <a 
                              href={`tel:${vendor.phone}`} 
                              className="text-green-600 hover:underline"
                            >
                              {vendor.phone}
                            </a>
                          </div>
                        ) : (
                          <span className="text-neutral-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "font-semibold",
                          vendor.current_balance > 0 ? "text-red-600" : "text-neutral-600"
                        )}>
                          {formatCurrency(vendor.current_balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(vendor.is_active)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-blue-50"
                            onClick={() => handleViewVendor(vendor)}
                          >
                            <Eye className="h-4 w-4 text-blue-500" />
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-amber-50"
                            onClick={() => handleEditVendor(vendor)}
                          >
                            <Edit className="h-4 w-4 text-amber-500" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-red-50"
                              >
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
                                  هل أنت متأكد من حذف المورد "{vendor.vendor_name}"؟ 
                                  هذا الإجراء سيؤدي إلى إلغاء تفعيل المورد ولا يمكن التراجع عنه.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteVendor(vendor)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
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

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-coral-500" />
              تعديل المورد
            </DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات المورد
            </DialogDescription>
          </DialogHeader>
          {selectedVendor && (
            <VendorForm vendor={selectedVendor} onSuccess={handleEditSuccess} />
          )}
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <VendorDetailsDialog
        vendor={selectedVendor}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
      />
    </div>
  );
};

export default Vendors;

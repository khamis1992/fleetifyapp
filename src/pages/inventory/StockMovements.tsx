import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStockMovements, type StockMovement } from "@/hooks/useInventoryStockLevels";
import { useInventoryItems } from "@/hooks/useInventoryItems";
import { useInventoryWarehouses } from "@/hooks/useInventoryWarehouses";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { TrendingUp, TrendingDown, Search, Download, Package, Warehouse as WarehouseIcon, Calendar } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

const StockMovements = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<string>("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data: movements, isLoading: movementsLoading } = useStockMovements();
  const { data: items } = useInventoryItems();
  const { data: warehouses } = useInventoryWarehouses();

  // Filter movements
  const filteredMovements = movements?.filter((movement) => {
    const matchesItem = selectedItem === "all" || movement.item_id === selectedItem;
    const matchesWarehouse = selectedWarehouse === "all" || movement.warehouse_id === selectedWarehouse;
    const matchesType = selectedType === "all" || movement.movement_type === selectedType;

    const movementDate = new Date(movement.movement_date);
    const matchesDateFrom = !dateFrom || movementDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || movementDate <= new Date(dateTo);

    const matchesSearch = !searchTerm ||
      movement.reference_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.notes?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesItem && matchesWarehouse && matchesType && matchesDateFrom && matchesDateTo && matchesSearch;
  }) || [];

  // Calculate stats
  const totalMovements = filteredMovements.length;
  const inboundMovements = filteredMovements.filter(m =>
    ['PURCHASE', 'TRANSFER_IN', 'RETURN', 'ADJUSTMENT'].includes(m.movement_type) && m.quantity > 0
  ).length;
  const outboundMovements = filteredMovements.filter(m =>
    ['SALE', 'TRANSFER_OUT'].includes(m.movement_type) || (m.movement_type === 'ADJUSTMENT' && m.quantity < 0)
  ).length;

  // Get unique items moved this month
  const thisMonth = new Date();
  thisMonth.setDate(1);
  const thisMonthMovements = movements?.filter(m => new Date(m.movement_date) >= thisMonth) || [];
  const uniqueItemsThisMonth = new Set(thisMonthMovements.map(m => m.item_id)).size;

  // Get most active warehouse
  const warehouseMovements = movements?.reduce((acc: Record<string, number>, m) => {
    acc[m.warehouse_id] = (acc[m.warehouse_id] || 0) + 1;
    return acc;
  }, {}) || {};
  const mostActiveWarehouseId = Object.entries(warehouseMovements)
    .sort(([,a], [,b]) => b - a)[0]?.[0];
  const mostActiveWarehouse = warehouses?.find(w => w.id === mostActiveWarehouseId);

  const getMovementIcon = (type: string) => {
    if (['PURCHASE', 'TRANSFER_IN', 'RETURN'].includes(type)) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    }
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const getMovementTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      PURCHASE: { label: "شراء", variant: "default" },
      SALE: { label: "بيع", variant: "destructive" },
      ADJUSTMENT: { label: "تسوية", variant: "secondary" },
      TRANSFER_IN: { label: "تحويل وارد", variant: "default" },
      TRANSFER_OUT: { label: "تحويل صادر", variant: "destructive" },
      RETURN: { label: "مرتجع", variant: "outline" },
    };

    const typeInfo = types[type] || { label: type, variant: "outline" as const };
    return <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>;
  };

  const handleExportCSV = () => {
    if (!filteredMovements || filteredMovements.length === 0) {
      return;
    }

    // Create CSV header
    const headers = [
      "التاريخ",
      "الصنف",
      "المستودع",
      "نوع الحركة",
      "الكمية",
      "تكلفة الوحدة",
      "التكلفة الإجمالية",
      "نوع المرجع",
      "رقم المرجع",
      "ملاحظات"
    ].join(",");

    // Create CSV rows
    const rows = filteredMovements.map((movement) => {
      const item = items?.find(i => i.id === movement.item_id);
      const warehouse = warehouses?.find(w => w.id === movement.warehouse_id);

      return [
        format(new Date(movement.movement_date), "yyyy-MM-dd HH:mm"),
        item?.item_name || "-",
        warehouse?.warehouse_name || "-",
        movement.movement_type,
        movement.quantity,
        movement.unit_cost || 0,
        movement.total_cost || 0,
        movement.reference_type || "-",
        movement.reference_number || "-",
        (movement.notes || "-").replace(/,/g, ";") // Replace commas in notes
      ].join(",");
    });

    // Combine header and rows
    const csv = [headers, ...rows].join("\n");

    // Create blob and download
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stock_movements_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/inventory">إدارة المخزون</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>حركات المخزون</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">حركات المخزون</h1>
            <p className="text-muted-foreground">سجل كامل لجميع حركات الأصناف بين المستودعات</p>
          </div>
        </div>
        <Button onClick={handleExportCSV} disabled={filteredMovements.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          تصدير CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الحركات</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMovements}</div>
            <p className="text-xs text-muted-foreground">حركة مسجلة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">حركات وارد</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{inboundMovements}</div>
            <p className="text-xs text-muted-foreground">شراء، تحويل وارد، مرتجع</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">حركات صادر</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{outboundMovements}</div>
            <p className="text-xs text-muted-foreground">بيع، تحويل صادر</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">أكثر مستودع نشاطاً</CardTitle>
            <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mostActiveWarehouse?.warehouse_name || "-"}</div>
            <p className="text-xs text-muted-foreground">{warehouseMovements[mostActiveWarehouseId || ""] || 0} حركة</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>سجل الحركات</CardTitle>
          <CardDescription>عرض وتصفية جميع حركات المخزون</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-6 mb-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="البحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={selectedItem} onValueChange={setSelectedItem}>
              <SelectTrigger>
                <SelectValue placeholder="جميع الأصناف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأصناف</SelectItem>
                {items?.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.item_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
              <SelectTrigger>
                <SelectValue placeholder="جميع المستودعات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المستودعات</SelectItem>
                {warehouses?.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.warehouse_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="نوع الحركة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                <SelectItem value="PURCHASE">شراء</SelectItem>
                <SelectItem value="SALE">بيع</SelectItem>
                <SelectItem value="ADJUSTMENT">تسوية</SelectItem>
                <SelectItem value="TRANSFER_IN">تحويل وارد</SelectItem>
                <SelectItem value="TRANSFER_OUT">تحويل صادر</SelectItem>
                <SelectItem value="RETURN">مرتجع</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type="date"
              placeholder="من تاريخ"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />

            <Input
              type="date"
              placeholder="إلى تاريخ"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          {/* Movements Table */}
          {movementsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : filteredMovements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد حركات مخزون
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الصنف</TableHead>
                  <TableHead>المستودع</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>التكلفة الإجمالية</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead>ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMovements.map((movement) => {
                  const item = items?.find(i => i.id === movement.item_id);
                  const warehouse = warehouses?.find(w => w.id === movement.warehouse_id);

                  return (
                    <TableRow key={movement.id}>
                      <TableCell className="text-xs">
                        {format(new Date(movement.movement_date), "dd/MM/yyyy HH:mm", { locale: ar })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item?.item_name || "-"}
                      </TableCell>
                      <TableCell>
                        {warehouse?.warehouse_name || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMovementIcon(movement.movement_type)}
                          {getMovementTypeBadge(movement.movement_type)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={movement.quantity > 0 ? "text-green-600" : "text-red-600"}>
                          {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                        </span>
                      </TableCell>
                      <TableCell>
                        {movement.total_cost ? `${movement.total_cost.toFixed(2)} ريال` : "-"}
                      </TableCell>
                      <TableCell>
                        {movement.reference_number ? (
                          <div className="text-xs">
                            <div className="font-medium">{movement.reference_number}</div>
                            <div className="text-muted-foreground">{movement.reference_type}</div>
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {movement.notes || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockMovements;

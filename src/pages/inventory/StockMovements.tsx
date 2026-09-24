import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStockMovements, type StockMovement } from "@/hooks/useInventoryStockLevels";
import { useInventoryItems } from "@/hooks/useInventoryItems";
import { useInventoryWarehouses } from "@/hooks/useInventoryWarehouses";
import { TrendingUp, TrendingDown, Search, Download, Package, Warehouse as WarehouseIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { PageEmpty, PageLoading, PagePanel } from "@/components/dashboard/workspace/PageKit";
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

const movementTypeTones: Record<string, string> = {
  PURCHASE: 'is-ok',
  SALE: 'is-risk',
  ADJUSTMENT: 'is-warn',
  TRANSFER_IN: 'is-ok',
  TRANSFER_OUT: 'is-risk',
  RETURN: 'is-info',
};

const movementTypeLabels: Record<string, string> = {
  PURCHASE: "شراء",
  SALE: "بيع",
  ADJUSTMENT: "تسوية",
  TRANSFER_IN: "تحويل وارد",
  TRANSFER_OUT: "تحويل صادر",
  RETURN: "مرتجع",
};

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

  const getMovementDate = (movement: StockMovement) =>
    new Date(movement.movement_date ?? movement.created_at ?? 0);

  // Filter movements
  const filteredMovements = movements?.filter((movement) => {
    const matchesItem = selectedItem === "all" || movement.item_id === selectedItem;
    const matchesWarehouse = selectedWarehouse === "all" || movement.warehouse_id === selectedWarehouse;
    const matchesType = selectedType === "all" || movement.movement_type === selectedType;

    const movementDate = getMovementDate(movement);
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

  // Get most active warehouse
  const warehouseMovements = movements?.reduce((acc: Record<string, number>, m) => {
    acc[m.warehouse_id] = (acc[m.warehouse_id] || 0) + 1;
    return acc;
  }, {}) || {};
  const mostActiveWarehouseId = Object.entries(warehouseMovements)
    .sort(([,a], [,b]) => b - a)[0]?.[0];
  const mostActiveWarehouse = warehouses?.find(w => w.id === mostActiveWarehouseId);

  const handleExportCSV = () => {
    if (!filteredMovements || filteredMovements.length === 0) {
      return;
    }

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

    const rows = filteredMovements.map((movement) => {
      const item = items?.find(i => i.id === movement.item_id);
      const warehouse = warehouses?.find(w => w.id === movement.warehouse_id);

      return [
        format(getMovementDate(movement), "yyyy-MM-dd HH:mm"),
        item?.item_name || "-",
        warehouse?.warehouse_name || "-",
        movement.movement_type,
        movement.quantity,
        movement.unit_cost || 0,
        movement.total_cost || 0,
        movement.reference_type || "-",
        movement.reference_number || "-",
        (movement.notes || "-").replace(/,/g, ";")
      ].join(",");
    });

    const csv = [headers, ...rows].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `stock_movements_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
  };

  const dwMetrics = [
    { label: 'إجمالي الحركات', value: totalMovements, hint: 'حركة مسجلة', accent: true },
    { label: 'حركات وارد', value: inboundMovements, hint: 'شراء، تحويل وارد، مرتجع', accent: false },
    { label: 'حركات صادر', value: outboundMovements, hint: 'بيع، تحويل صادر', accent: false },
    { label: 'أكثر مستودع نشاطاً', value: mostActiveWarehouse?.warehouse_name || "-", hint: `${warehouseMovements[mostActiveWarehouseId || ""] || 0} حركة`, accent: false },
  ];

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> المخزون <span>/</span> حركات المخزون
            </div>
            <h1>حركات المخزون</h1>
            <p>سجل كامل لجميع حركات الأصناف بين المستودعات.</p>
          </div>
          <div className="dw-header-tools">
            <button type="button" className="dw-button" onClick={handleExportCSV} disabled={filteredMovements.length === 0}>
              <Download size={17} />
              تصدير CSV
            </button>
          </div>
        </header>

        <section className="dw-metrics" aria-label="مؤشرات الحركات">
          {dwMetrics.map((metric) => (
            <div key={metric.label} className={`dw-metric ${metric.accent ? 'dw-metric-accent' : ''}`}>
              <div className="dw-metric-top">
                <span>{metric.label}</span>
              </div>
              <strong style={{ fontSize: typeof metric.value === 'string' && metric.value.length > 8 ? '18px' : undefined }}>{metric.value}</strong>
              <div className="dw-metric-bottom">
                <small>{metric.hint}</small>
              </div>
            </div>
          ))}
        </section>

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title="سجل الحركات"
            subtitle="عرض وتصفية جميع حركات المخزون"
            className="wk-panel-full"
            action={
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 180 }}
                    placeholder="ابحث بالمرجع أو الملاحظات…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="بحث في الحركات"
                  />
                </div>
                <Select value={selectedItem} onValueChange={setSelectedItem}>
                  <SelectTrigger className="wk-field" style={{ width: 150 }}>
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
                  <SelectTrigger className="wk-field" style={{ width: 150 }}>
                    <SelectValue placeholder="المستودع" />
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
                  <SelectTrigger className="wk-field" style={{ width: 140 }}>
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
                <input
                  type="date"
                  className="wk-field"
                  style={{ width: 140 }}
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="من تاريخ"
                />
                <input
                  type="date"
                  className="wk-field"
                  style={{ width: 140 }}
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="إلى تاريخ"
                />
              </div>
            }
          >
            {movementsLoading ? (
              <PageLoading label="جاري تحميل الحركات…" />
            ) : filteredMovements.length === 0 ? (
              <PageEmpty icon={Package} message="لا توجد حركات مخزون مطابقة" />
            ) : (
              <div className="wk-table-wrap">
                <table>
                  <caption className="sr-only">حركات المخزون</caption>
                  <thead>
                    <tr>
                      <th scope="col">التاريخ</th>
                      <th scope="col">الصنف</th>
                      <th scope="col">المستودع</th>
                      <th scope="col">النوع</th>
                      <th scope="col">الكمية</th>
                      <th scope="col">التكلفة الإجمالية</th>
                      <th scope="col">المرجع</th>
                      <th scope="col">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.map((movement) => {
                      const item = items?.find(i => i.id === movement.item_id);
                      const warehouse = warehouses?.find(w => w.id === movement.warehouse_id);
                      const isInbound = ['PURCHASE', 'TRANSFER_IN', 'RETURN'].includes(movement.movement_type);

                      return (
                        <tr key={movement.id}>
                          <td>{format(getMovementDate(movement), "dd/MM/yyyy HH:mm", { locale: ar })}</td>
                          <td><strong><bdi>{item?.item_name || "-"}</bdi></strong></td>
                          <td>{warehouse?.warehouse_name || "-"}</td>
                          <td>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              {isInbound ? <TrendingUp size={13} color="#487038" /> : <TrendingDown size={13} color="#b3694c" />}
                              <span className={`wk-badge ${movementTypeTones[movement.movement_type] ?? 'is-neutral'}`}>
                                {movementTypeLabels[movement.movement_type] || movement.movement_type}
                              </span>
                            </span>
                          </td>
                          <td>
                            <span className={`wk-badge ${movement.quantity > 0 ? 'is-ok' : 'is-risk'}`}>
                              {movement.quantity > 0 ? "+" : ""}{movement.quantity}
                            </span>
                          </td>
                          <td>{movement.total_cost ? `${movement.total_cost.toFixed(2)} ريال` : "-"}</td>
                          <td>
                            {movement.reference_number ? (
                              <>
                                <strong>{movement.reference_number}</strong>
                                <span className="wk-sub">{movement.reference_type}</span>
                              </>
                            ) : "-"}
                          </td>
                          <td>{movement.notes || "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="dw-panel-foot">
              <WarehouseIcon size={14} />
              <span>{filteredMovements.length} حركة معروضة بعد التصفية.</span>
            </div>
          </PagePanel>
        </div>
      </div>
    </div>
  );
};

export default StockMovements;
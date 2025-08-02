import React from "react";
import { MaintenanceFinancialPanel } from "@/components/fleet/MaintenanceFinancialPanel";

const MaintenanceAccounting: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">محاسبة الصيانة</h1>
        <p className="text-muted-foreground mt-2">
          إدارة ربط حسابات الصيانة وتحليل التكاليف المالية
        </p>
      </div>
      
      <MaintenanceFinancialPanel />
    </div>
  );
};

export default MaintenanceAccounting;
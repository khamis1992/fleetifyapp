import React from "react";
import { AccountMappingSettings } from "@/components/finance/AccountMappingSettings";
import { EssentialAccountMappingsManager } from "@/components/finance/EssentialAccountMappingsManager";

const AccountMappings: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">ربط الحسابات</h1>
        <p className="text-muted-foreground mt-2">
          إدارة ربط أنواع الحسابات الافتراضية مع دليل الحسابات
        </p>
      </div>
      
      <div className="space-y-6">
        <EssentialAccountMappingsManager />
        <AccountMappingSettings />
      </div>
    </div>
  );
};

export default AccountMappings;
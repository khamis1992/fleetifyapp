import type { ElementType } from "react";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import "./finance-system.css";

export function FinanceSectionTabs({
  items,
  label = "أقسام الصفحة",
}: {
  items: { id: string; label: string; icon?: ElementType }[];
  label?: string;
}) {
  return (
    <div className="finance-section-tabs-scroll">
      <TabsList className="finance-section-tabs" aria-label={label}>
        {items.map(({ id, label, icon: Icon }) => (
          <TabsTrigger key={id} value={id}>
            {Icon && <Icon size={16} aria-hidden="true" />}
            <span>{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </div>
  );
}

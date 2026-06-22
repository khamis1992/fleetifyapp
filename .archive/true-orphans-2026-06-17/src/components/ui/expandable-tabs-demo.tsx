import { Bell, Home, HelpCircle, Settings, Shield, Mail, User, FileText, Lock } from "lucide-react";
import { ExpandableTabs } from "@/components/ui/expandable-tabs";

export function DefaultDemo() {
  const tabs = [
    { title: "لوحة التحكم", icon: Home },
    { title: "الإشعارات", icon: Bell },
    { type: "separator" as const },
    { title: "الإعدادات", icon: Settings },
    { title: "الدعم", icon: HelpCircle },
    { title: "الأمان", icon: Shield },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ExpandableTabs tabs={tabs} />
    </div>
  );
}

export function CustomColorDemo() {
  const tabs = [
    { title: "الملف الشخصي", icon: User },
    { title: "الرسائل", icon: Mail },
    { type: "separator" as const },
    { title: "المستندات", icon: FileText },
    { title: "الخصوصية", icon: Lock },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ExpandableTabs 
        tabs={tabs} 
        activeColor="text-blue-500"
        className="border-blue-200 dark:border-blue-800" 
      />
    </div>
  );
}


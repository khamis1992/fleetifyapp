import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Phone, Search, Plus, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Vendor {
  id: string;
  company_name: string;
  phone: string;
}

interface VendorAutoSuggestProps {
  companyId: string;
  value: string;
  phone: string;
  onChange: (name: string, phone: string, vendorId?: string) => void;
}

export function VendorAutoSuggest({
  companyId,
  value,
  phone,
  onChange,
}: VendorAutoSuggestProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // جلب الوكلاء المسجلين
  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-suggestions', companyId, searchTerm],
    queryFn: async () => {
      if (!companyId) return [];

      const query = supabase
        .from('customers')
        .select('id, company_name, phone')
        .eq('company_id', companyId)
        .eq('customer_type', 'corporate')
        .eq('is_active', true)
        .order('company_name', { ascending: true })
        .limit(10);

      if (searchTerm && searchTerm.trim()) {
        query.ilike('company_name', `%${searchTerm.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Vendor[];
    },
    enabled: !!companyId,
  });

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (newValue: string) => {
    setSearchTerm(newValue);
    setSelectedVendor(null);
    onChange(newValue, phone);
    if (newValue.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleSelectVendor = (vendor: Vendor) => {
    setSearchTerm(vendor.company_name);
    setSelectedVendor(vendor);
    onChange(vendor.company_name, vendor.phone || phone, vendor.id);
    setShowSuggestions(false);
  };

  const handlePhoneChange = (newPhone: string) => {
    onChange(searchTerm, newPhone, selectedVendor?.id);
  };

  return (
    <div className="space-y-4" ref={wrapperRef}>
      {/* حقل اسم الوكيل */}
      <div className="relative">
        <Label htmlFor="vendor_name" className="flex items-center gap-2 mb-2">
          <Building2 className="w-4 h-4 text-coral-500" />
          اسم الوكيل / المورد
        </Label>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <Input
            id="vendor_name"
            value={searchTerm}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => searchTerm.length > 0 && setShowSuggestions(true)}
            placeholder="ابحث أو أدخل اسم الوكيل..."
            className="pr-10"
          />
        </div>

        {/* قائمة الاقتراحات */}
        {showSuggestions && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {vendors.length > 0 ? (
              <>
                <div className="px-3 py-2 text-xs text-neutral-500 bg-neutral-50 border-b">
                  الوكلاء المسجلين ({vendors.length})
                </div>
                {vendors.map((vendor) => (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => handleSelectVendor(vendor)}
                    className={cn(
                      "w-full px-3 py-2 text-right hover:bg-coral-50 transition-colors flex items-center justify-between",
                      selectedVendor?.id === vendor.id && "bg-coral-50"
                    )}
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{vendor.company_name}</p>
                      {vendor.phone && (
                        <p className="text-xs text-neutral-500">{vendor.phone}</p>
                      )}
                    </div>
                    {selectedVendor?.id === vendor.id && (
                      <Check className="w-4 h-4 text-coral-500" />
                    )}
                  </button>
                ))}
              </>
            ) : searchTerm.length > 0 ? (
              <div className="p-4 text-center">
                <Plus className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                <p className="text-sm text-neutral-500">
                  لم يتم العثور على وكيل بهذا الاسم
                </p>
                <p className="text-xs text-coral-500 mt-1">
                  سيتم إنشاء وكيل جديد تلقائياً
                </p>
              </div>
            ) : null}
          </div>
        )}

        {/* مؤشر الوكيل الجديد */}
        {searchTerm && !selectedVendor && !showSuggestions && (
          <p className="text-xs text-coral-500 mt-1 flex items-center gap-1">
            <Plus className="w-3 h-3" />
            سيتم إنشاء وكيل جديد باسم "{searchTerm}"
          </p>
        )}
      </div>

      {/* حقل رقم الهاتف */}
      <div>
        <Label htmlFor="vendor_phone" className="flex items-center gap-2 mb-2">
          <Phone className="w-4 h-4 text-coral-500" />
          رقم هاتف الوكيل
          {!selectedVendor && (
            <span className="text-xs text-neutral-400">(مطلوب للوكيل الجديد)</span>
          )}
        </Label>
        <Input
          id="vendor_phone"
          value={phone}
          onChange={(e) => handlePhoneChange(e.target.value)}
          placeholder="+974 XXXX XXXX"
          disabled={!!selectedVendor}
          className={selectedVendor ? "bg-neutral-50" : ""}
        />
        {selectedVendor && (
          <p className="text-xs text-neutral-500 mt-1">
            رقم الهاتف المسجل للوكيل
          </p>
        )}
      </div>
    </div>
  );
}


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateSalesLead } from "@/hooks/useSalesLeads";
import { useCreateCustomerWithAccount } from "@/hooks/useCreateCustomerWithAccount";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { UserPlus, Users } from "lucide-react";

const LEAD_SOURCES = [
  { id: 'website', name: 'الموقع الإلكتروني' },
  { id: 'referral', name: 'إحالة' },
  { id: 'social_media', name: 'وسائل التواصل' },
  { id: 'direct_contact', name: 'اتصال مباشر' },
  { id: 'advertisement', name: 'إعلان' },
  { id: 'other', name: 'أخرى' },
];

const LEAD_STATUSES = [
  { id: 'new', name: 'جديد' },
  { id: 'contacted', name: 'تم الاتصال' },
  { id: 'qualified', name: 'مؤهل' },
  { id: 'unqualified', name: 'غير مؤهل' },
];

interface AddLeadFormProps {
  onSuccess?: () => void;
  onConvertToCustomer?: () => void;
}

export const AddLeadForm = ({ onSuccess, onConvertToCustomer }: AddLeadFormProps) => {
  const [formData, setFormData] = useState({
    lead_name: '',
    lead_name_ar: '',
    email: '',
    phone: '',
    source: 'website',
    status: 'new',
    notes: '',
  });

  const [isConverting, setIsConverting] = useState(false);

  const createLead = useCreateSalesLead();
  const createCustomer = useCreateCustomerWithAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createLead.mutateAsync({
        lead_name: formData.lead_name,
        lead_name_ar: formData.lead_name_ar || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        source: formData.source || undefined,
        status: formData.status,
        notes: formData.notes || undefined,
        is_active: true,
      });

      // Reset form
      setFormData({
        lead_name: '',
        lead_name_ar: '',
        email: '',
        phone: '',
        source: 'website',
        status: 'new',
        notes: '',
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error submitting lead form:', error);
    }
  };

  const handleConvertToCustomer = async () => {
    if (!formData.lead_name || !formData.phone) {
      return;
    }

    setIsConverting(true);

    try {
      // Parse name into first and last name
      const nameParts = formData.lead_name.trim().split(' ');
      const firstName = nameParts[0] || formData.lead_name;
      const lastName = nameParts.slice(1).join(' ') || '';

      const namePartsAr = formData.lead_name_ar?.trim().split(' ') || [];
      const firstNameAr = namePartsAr[0] || formData.lead_name_ar || '';
      const lastNameAr = namePartsAr.slice(1).join(' ') || '';

      // Create customer from lead data
      await createCustomer.mutateAsync({
        customer_type: 'individual',
        first_name: firstName,
        last_name: lastName,
        first_name_ar: firstNameAr,
        last_name_ar: lastNameAr,
        email: formData.email || undefined,
        phone: formData.phone,
        notes: formData.notes ? `تم التحويل من عميل محتمل. ${formData.notes}` : 'تم التحويل من عميل محتمل',
        createFinancialAccount: false, // Don't create financial account automatically
      });

      // Reset form
      setFormData({
        lead_name: '',
        lead_name_ar: '',
        email: '',
        phone: '',
        source: 'website',
        status: 'new',
        notes: '',
      });

      onConvertToCustomer?.();
    } catch (error) {
      console.error('Error converting lead to customer:', error);
    } finally {
      setIsConverting(false);
    }
  };

  const canConvertToCustomer = formData.lead_name && formData.phone;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Lead Name */}
        <div className="space-y-2">
          <Label htmlFor="lead_name">
            اسم العميل المحتمل <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lead_name"
            value={formData.lead_name}
            onChange={(e) => setFormData({ ...formData, lead_name: e.target.value })}
            placeholder="مثال: أحمد محمد"
            required
          />
        </div>

        {/* Lead Name Arabic */}
        <div className="space-y-2">
          <Label htmlFor="lead_name_ar">
            الاسم بالعربية
          </Label>
          <Input
            id="lead_name_ar"
            value={formData.lead_name_ar}
            onChange={(e) => setFormData({ ...formData, lead_name_ar: e.target.value })}
            placeholder="مثال: أحمد محمد"
          />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">
            البريد الإلكتروني
          </Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="example@email.com"
          />
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone">
            رقم الهاتف
          </Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+974 XXXX XXXX"
          />
        </div>

        {/* Source */}
        <div className="space-y-2">
          <Label htmlFor="source">
            المصدر <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.source}
            onValueChange={(value) => setFormData({ ...formData, source: value })}
          >
            <SelectTrigger id="source">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_SOURCES.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">
            الحالة <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.status}
            onValueChange={(value) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status.id} value={status.id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">ملاحظات</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="أضف أي ملاحظات إضافية..."
          rows={4}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {/* Convert to Customer Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleConvertToCustomer}
          disabled={!canConvertToCustomer || isConverting || createCustomer.isPending}
          className="border-green-500 text-green-600 hover:bg-green-50"
        >
          {isConverting || createCustomer.isPending ? (
            <>
              <LoadingSpinner className="ml-2 h-4 w-4" />
              جاري التحويل...
            </>
          ) : (
            <>
              <Users className="ml-2 h-4 w-4" />
              تحويل إلى عميل
            </>
          )}
        </Button>

        {/* Add Lead Button */}
        <Button
          type="submit"
          disabled={createLead.isPending || !formData.lead_name}
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
        >
          {createLead.isPending ? (
            <>
              <LoadingSpinner className="ml-2 h-4 w-4" />
              جاري الإضافة...
            </>
          ) : (
            <>
              <UserPlus className="ml-2 h-4 w-4" />
              إضافة عميل محتمل
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

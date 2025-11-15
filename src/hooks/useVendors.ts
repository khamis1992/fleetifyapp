import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CACHE_TIERS } from "@/utils/cacheConfig";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as Sentry from '@sentry/react';
import { usePermissions } from './usePermissions';

// =====================================================
// TYPES
// =====================================================
export interface Vendor {
  id: string;
  company_id: string;
  vendor_code: string;
  vendor_name: string;
  vendor_name_ar?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  address_ar?: string;
  tax_number?: string;
  payment_terms: number;
  credit_limit: number;
  current_balance: number;
  category_id?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorCategory {
  id: string;
  company_id: string;
  category_name: string;
  category_name_ar?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorContact {
  id: string;
  vendor_id: string;
  company_id: string;
  contact_name: string;
  position?: string;
  phone?: string;
  email?: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorDocument {
  id: string;
  vendor_id: string;
  company_id: string;
  document_type: string;
  document_name: string;
  document_url: string;
  file_size?: number;
  expiry_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VendorPerformance {
  id: string;
  vendor_id: string;
  company_id: string;
  rating?: number;
  on_time_delivery_rate?: number;
  quality_score?: number;
  response_time_hours?: number;
  notes?: string;
  measured_at: string;
  created_at: string;
  updated_at: string;
}

// =====================================================
// VENDORS HOOKS
// =====================================================
export const useVendors = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vendors", user?.profile?.company_id],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: 'vendors', message: 'Fetching vendors', level: 'info' });
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .eq("is_active", true)
        .order("vendor_name");

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      Sentry.addBreadcrumb({ category: "vendors", message: "Data fetched successfully", level: "info", data: { count: data?.length || 0 } });

      return data as Vendor[];
    },
    enabled: !!user?.profile?.company_id
  });
};

export const useCreateVendor = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (vendorData: {
      vendor_code: string;
      vendor_name: string;
      vendor_name_ar?: string;
      contact_person?: string;
      email?: string;
      phone?: string;
      address?: string;
      address_ar?: string;
      tax_number?: string;
      payment_terms?: number;
      credit_limit?: number;
      category_id?: string;
      notes?: string;
    }) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Creating vendor", level: "info" });
      if (!user?.profile?.company_id) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("vendors")
        .insert({
          vendor_code: vendorData.vendor_code,
          vendor_name: vendorData.vendor_name,
          vendor_name_ar: vendorData.vendor_name_ar,
          contact_person: vendorData.contact_person,
          email: vendorData.email,
          phone: vendorData.phone,
          address: vendorData.address,
          address_ar: vendorData.address_ar,
          tax_number: vendorData.tax_number,
          payment_terms: vendorData.payment_terms || 30,
          credit_limit: vendorData.credit_limit || 0,
          current_balance: 0,
          category_id: vendorData.category_id,
          is_active: true,
          notes: vendorData.notes,
          company_id: user.profile.company_id
        })
        .select()
        .single();

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      return data;
    },
    onSuccess: () => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Created vendor successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("تم إنشاء المورد بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في إنشاء المورد: " + error.message);
    }
  });
};

export const useUpdateVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...vendorData }: {
      id: string;
      vendor_code?: string;
      vendor_name?: string;
      vendor_name_ar?: string;
      contact_person?: string;
      email?: string;
      phone?: string;
      address?: string;
      address_ar?: string;
      tax_number?: string;
      payment_terms?: number;
      credit_limit?: number;
      category_id?: string;
      notes?: string;
      is_active?: boolean;
    }) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Updating vendor", level: "info" });
      const { data, error } = await supabase
        .from("vendors")
        .update(vendorData)
        .eq("id", id)
        .select()
        .single();

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      return data;
    },
    onSuccess: () => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Updated vendor successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("تم تحديث المورد بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في تحديث المورد: " + error.message);
    }
  });
};

export const useDeleteVendor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Deleting vendor", level: "info" });
      const { error } = await supabase
        .from("vendors")
        .update({ is_active: false })
        .eq("id", id);

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
    },
    onSuccess: () => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Deleted vendor successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      toast.success("تم حذف المورد بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في حذف المورد: " + error.message);
    }
  });
};

// =====================================================
// VENDOR CATEGORIES HOOKS
// =====================================================
export const useVendorCategories = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vendorCategories", user?.profile?.company_id],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: 'vendors', message: 'Fetching vendorcategories', level: 'info' });
      if (!user?.profile?.company_id) return [];

      const { data, error } = await supabase
        .from("vendor_categories")
        .select("*")
        .eq("company_id", user.profile.company_id)
        .eq("is_active", true)
        .order("category_name");

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      Sentry.addBreadcrumb({ category: "vendors", message: "Data fetched successfully", level: "info", data: { count: data?.length || 0 } });

      return data as VendorCategory[];
    },
    enabled: !!user?.profile?.company_id
  });
};

export const useVendorCategory = (id: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vendorCategory", id],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: 'vendors', message: 'Fetching vendorcategory', level: 'info' });
      const { data, error } = await supabase
        .from("vendor_categories")
        .select("*")
        .eq("id", id)
        .single();

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      return data as VendorCategory;
    },
    enabled: !!user?.profile?.company_id && !!id
  });
};

export const useCreateVendorCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (categoryData: {
      category_name: string;
      category_name_ar?: string;
      description?: string;
    }) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Creating vendor category", level: "info" });
      if (!user?.profile?.company_id) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("vendor_categories")
        .insert({
          ...categoryData,
          company_id: user.profile.company_id,
          is_active: true
        })
        .select()
        .single();

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      return data;
    },
    onSuccess: () => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Created vendor category successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: ["vendorCategories"] });
      toast.success("تم إنشاء التصنيف بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في إنشاء التصنيف: " + error.message);
    }
  });
};

export const useUpdateVendorCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...categoryData }: {
      id: string;
      category_name?: string;
      category_name_ar?: string;
      description?: string;
      is_active?: boolean;
    }) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Updating vendor category", level: "info" });
      const { data, error } = await supabase
        .from("vendor_categories")
        .update(categoryData)
        .eq("id", id)
        .select()
        .single();

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      return data;
    },
    onSuccess: () => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Updated vendor category successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: ["vendorCategories"] });
      toast.success("تم تحديث التصنيف بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في تحديث التصنيف: " + error.message);
    }
  });
};

export const useDeleteVendorCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Deleting vendor category", level: "info" });
      const { error } = await supabase
        .from("vendor_categories")
        .update({ is_active: false })
        .eq("id", id);

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
    },
    onSuccess: () => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Deleted vendor category successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: ["vendorCategories"] });
      toast.success("تم حذف التصنيف بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في حذف التصنيف: " + error.message);
    }
  });
};

// =====================================================
// VENDOR CONTACTS HOOKS
// =====================================================
export const useVendorContacts = (vendorId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vendorContacts", vendorId],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: 'vendors', message: 'Fetching vendorcontacts', level: 'info' });
      if (!vendorId) return [];

      const { data, error } = await supabase
        .from("vendor_contacts")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("is_primary", { ascending: false })
        .order("contact_name");

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      Sentry.addBreadcrumb({ category: "vendors", message: "Data fetched successfully", level: "info", data: { count: data?.length || 0 } });

      return data as VendorContact[];
    },
    enabled: !!user?.profile?.company_id && !!vendorId
  });
};

export const useCreateVendorContact = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (contactData: {
      vendor_id: string;
      contact_name: string;
      position?: string;
      phone?: string;
      email?: string;
      is_primary?: boolean;
    }) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Creating vendor contact", level: "info" });
      if (!user?.profile?.company_id) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("vendor_contacts")
        .insert({
          ...contactData,
          company_id: user.profile.company_id,
          is_primary: contactData.is_primary || false
        })
        .select()
        .single();

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      return data;
    },
    onSuccess: (data) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Created vendor contact successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: ["vendorContacts", data.vendor_id] });
      toast.success("تم إضافة جهة الاتصال بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في إضافة جهة الاتصال: " + error.message);
    }
  });
};

export const useUpdateVendorContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vendor_id, ...contactData }: {
      id: string;
      vendor_id: string;
      contact_name?: string;
      position?: string;
      phone?: string;
      email?: string;
      is_primary?: boolean;
    }) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Updating vendor contact", level: "info" });
      const { data, error } = await supabase
        .from("vendor_contacts")
        .update(contactData)
        .eq("id", id)
        .select()
        .single();

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      return data;
    },
    onSuccess: (data) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Updated vendor contact successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: ["vendorContacts", data.vendor_id] });
      toast.success("تم تحديث جهة الاتصال بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في تحديث جهة الاتصال: " + error.message);
    }
  });
};

export const useDeleteVendorContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vendor_id }: { id: string; vendor_id: string }) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Deleting vendor contact", level: "info" });
      const { error } = await supabase
        .from("vendor_contacts")
        .delete()
        .eq("id", id);

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      return vendor_id;
    },
    onSuccess: (vendor_id) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Deleted vendor contact successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: ["vendorContacts", vendor_id] });
      toast.success("تم حذف جهة الاتصال بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في حذف جهة الاتصال: " + error.message);
    }
  });
};

// =====================================================
// VENDOR DOCUMENTS HOOKS
// =====================================================
export const useVendorDocuments = (vendorId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vendorDocuments", vendorId],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: 'vendors', message: 'Fetching vendordocuments', level: 'info' });
      if (!vendorId) return [];

      const { data, error } = await supabase
        .from("vendor_documents")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      Sentry.addBreadcrumb({ category: "vendors", message: "Data fetched successfully", level: "info", data: { count: data?.length || 0 } });

      return data as VendorDocument[];
    },
    enabled: !!user?.profile?.company_id && !!vendorId
  });
};

export const useUploadVendorDocument = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (documentData: {
      vendor_id: string;
      document_type: string;
      document_name: string;
      document_url: string;
      file_size?: number;
      expiry_date?: string;
      notes?: string;
    }) => {
      if (!user?.profile?.company_id) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("vendor_documents")
        .insert({
          ...documentData,
          company_id: user.profile.company_id
        })
        .select()
        .single();

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vendorDocuments", data.vendor_id] });
      toast.success("تم رفع المستند بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في رفع المستند: " + error.message);
    }
  });
};

export const useDeleteVendorDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, vendor_id }: { id: string; vendor_id: string }) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Deleting vendor document", level: "info" });
      const { error } = await supabase
        .from("vendor_documents")
        .delete()
        .eq("id", id);

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      return vendor_id;
    },
    onSuccess: (vendor_id) => {
      Sentry.addBreadcrumb({ category: "vendors", message: "Deleted vendor document successfully", level: "info" });
      queryClient.invalidateQueries({ queryKey: ["vendorDocuments", vendor_id] });
      toast.success("تم حذف المستند بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في حذف المستند: " + error.message);
    }
  });
};

// =====================================================
// VENDOR PERFORMANCE HOOKS
// =====================================================
export const useVendorPerformance = (vendorId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vendorPerformance", vendorId],
    queryFn: async () => {
      Sentry.addBreadcrumb({ category: 'vendors', message: 'Fetching vendorperformance', level: 'info' });
      if (!vendorId) return [];

      const { data, error } = await supabase
        .from("vendor_performance")
        .select("*")
        .eq("vendor_id", vendorId)
        .order("measured_at", { ascending: false });

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      Sentry.addBreadcrumb({ category: "vendors", message: "Data fetched successfully", level: "info", data: { count: data?.length || 0 } });

      return data as VendorPerformance[];
    },
    enabled: !!user?.profile?.company_id && !!vendorId
  });
};

export const useUpdateVendorPerformance = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (performanceData: {
      vendor_id: string;
      rating?: number;
      on_time_delivery_rate?: number;
      quality_score?: number;
      response_time_hours?: number;
      notes?: string;
    }) => {
      if (!user?.profile?.company_id) throw new Error("Company ID is required");

      const { data, error } = await supabase
        .from("vendor_performance")
        .insert({
          ...performanceData,
          company_id: user.profile.company_id,
          measured_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) { Sentry.captureException(error, { tags: { feature: "vendors" } }); throw error; }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["vendorPerformance", data.vendor_id] });
      toast.success("تم تحديث الأداء بنجاح");
    },
    onError: (error) => {
      toast.error("خطأ في تحديث الأداء: " + error.message);
    }
  });
};

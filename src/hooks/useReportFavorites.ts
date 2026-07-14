import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useToast } from "./use-toast";
import { useAuth } from "@/contexts/AuthContext";

// The table exists in migration 20251025172829 but is absent from the current generated type snapshot.
const reportFavoritesClient = supabase as any;

/**
 * Report favorite interface
 */
export interface ReportFavorite {
  id: string;
  company_id: string;
  user_id: string;
  report_type: string;
  report_config: Record<string, any> | null;
  name: string;
  created_at: string;
}

/**
 * Input type for creating a new report favorite
 */
export interface CreateReportFavoriteInput {
  report_type: string;
  report_config?: Record<string, any>;
  name: string;
}

/**
 * Hook to manage report favorites
 * Provides queries and mutations for creating and deleting favorite reports
 *
 * @returns Object with queries and mutations for report favorites
 */
export const useReportFavorites = () => {
  const { companyId } = useUnifiedCompanyAccess();
  const { user } = useAuth();
  const profileId = user?.profile?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch user's report favorites
  const favoritesQuery = useQuery({
    queryKey: ["report-favorites", companyId, profileId],
    queryFn: async () => {
      if (!companyId || !profileId) {
        console.warn("No company ID available for fetching report favorites");
        return [];
      }

      const { data, error } = await reportFavoritesClient
        .from("report_favorites")
        .select("*")
        .eq("company_id", companyId)
        .eq("user_id", profileId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Report favorites table not available:", error.message);
        return [] as ReportFavorite[];
      }

      return (data || []) as ReportFavorite[];
    },
    enabled: !!companyId && !!profileId,
  });

  // Mutation to create a new favorite
  const createFavoriteMutation = useMutation({
    mutationFn: async (input: CreateReportFavoriteInput) => {
      if (!companyId || !profileId) {
        throw new Error("Company and user profile are required");
      }

      const { data, error } = await reportFavoritesClient
        .from("report_favorites")
        .insert({
          company_id: companyId,
          user_id: profileId,
          report_type: input.report_type,
          report_config: input.report_config || null,
          name: input.name,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating report favorite:", error);
        throw error;
      }

      return data as ReportFavorite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-favorites", companyId] });
      toast({
        title: "تم حفظ التقرير",
        description: "تم إضافة التقرير إلى المفضلة بنجاح",
      });
    },
    onError: (error) => {
      console.error("Error creating favorite:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ التقرير في المفضلة",
        variant: "destructive",
      });
    },
  });

  // Mutation to delete a favorite
  const deleteFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      if (!companyId || !profileId) throw new Error("Company and user profile are required");
      const { error } = await reportFavoritesClient
        .from("report_favorites")
        .delete()
        .eq("id", favoriteId)
        .eq("company_id", companyId)
        .eq("user_id", profileId)
        .select("id")
        .single();

      if (error) {
        console.error("Error deleting report favorite:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report-favorites", companyId] });
      toast({
        title: "تم الحذف",
        description: "تم حذف التقرير من المفضلة بنجاح",
      });
    },
    onError: (error) => {
      console.error("Error deleting favorite:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف التقرير من المفضلة",
        variant: "destructive",
      });
    },
  });

  return {
    favorites: favoritesQuery.data || [],
    isLoading: favoritesQuery.isLoading,
    isError: favoritesQuery.isError,
    error: favoritesQuery.error,
    createFavorite: createFavoriteMutation.mutate,
    deleteFavorite: deleteFavoriteMutation.mutate,
    isCreating: createFavoriteMutation.isPending,
    isDeleting: deleteFavoriteMutation.isPending,
  };
};

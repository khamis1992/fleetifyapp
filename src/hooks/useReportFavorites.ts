import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedCompanyAccess } from "./useUnifiedCompanyAccess";
import { useToast } from "./use-toast";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch user's report favorites
  const favoritesQuery = useQuery({
    queryKey: ["report-favorites", companyId],
    queryFn: async () => {
      if (!companyId) {
        console.warn("No company ID available for fetching report favorites");
        return [];
      }

      const { data, error } = await supabase
        .from("report_favorites")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching report favorites:", error);
        throw error;
      }

      return (data || []) as ReportFavorite[];
    },
    enabled: !!companyId,
  });

  // Mutation to create a new favorite
  const createFavoriteMutation = useMutation({
    mutationFn: async (input: CreateReportFavoriteInput) => {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      // Get current user's profile ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        throw new Error("User profile not found");
      }

      const { data, error } = await supabase
        .from("report_favorites")
        .insert({
          company_id: companyId,
          user_id: profile.id,
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
      const { error } = await supabase
        .from("report_favorites")
        .delete()
        .eq("id", favoriteId);

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

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, Star, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface VendorPerformance {
  vendor_id: string;
  vendor_name: string;
  vendor_name_ar?: string;
  average_rating: number;
  on_time_delivery_rate: number;
  total_orders: number;
}

export const VendorPerformanceWidget: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: vendorPerformance, isLoading } = useQuery({
    queryKey: ['vendor-performance-top', user?.profile?.company_id],
    queryFn: async (): Promise<VendorPerformance[]> => {
      if (!user?.profile?.company_id) {
        return [];
      }

      const { data, error } = await supabase
        .from('vendor_performance')
        .select('*')
        .eq('company_id', user.profile.company_id)
        .order('average_rating', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching vendor performance:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.profile?.company_id,
  });

  // Render star rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Star key={i} size={12} className="fill-yellow-500 text-yellow-500" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Star key={i} size={12} className="fill-yellow-500/50 text-yellow-500" />
        );
      } else {
        stars.push(
          <Star key={i} size={12} className="text-muted-foreground/30" />
        );
      }
    }
    return stars;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card className="relative overflow-hidden bg-gradient-to-br from-card/90 via-card/70 to-card/50 backdrop-blur-sm border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Building size={20} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">أداء الموردين</h3>
            </div>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              أفضل 5
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Vendor List */}
              {vendorPerformance && vendorPerformance.length > 0 ? (
                <div className="space-y-3">
                  {vendorPerformance.map((vendor, index) => (
                    <motion.div
                      key={vendor.vendor_id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className="p-3 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-primary">#{index + 1}</span>
                            <p className="text-sm font-medium text-foreground truncate">
                              {vendor.vendor_name_ar || vendor.vendor_name}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {renderStars(vendor.average_rating || 0)}
                            <span className="text-xs text-muted-foreground mr-1">
                              {(vendor.average_rating || 0).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          التسليم في الموعد:
                          <span className="font-medium text-foreground mr-1">
                            {(vendor.on_time_delivery_rate || 0).toFixed(0)}%
                          </span>
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {vendor.total_orders || 0} طلب
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">لا توجد بيانات أداء للموردين</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action Button */}
        <div className="px-6 pb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/finance/vendors')}
            className="w-full h-9 hover:bg-primary/10 hover:text-primary"
          >
            عرض جميع الموردين
            <ArrowRight size={14} className="mr-2" />
          </Button>
        </div>

        {/* Bottom accent */}
        <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary/50 to-primary/20 w-full" />
      </Card>
    </motion.div>
  );
};

import React from 'react';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Crown, Eye, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCompanyContext } from '@/contexts/CompanyContext';

export const BrowsingIndicator: React.FC = () => {
  const { user } = useAuth();
  const { 
    isBrowsingMode, 
    browsedCompany, 
    isBrowsingAsCompanyAdmin 
  } = useUnifiedCompanyAccess();
  
  const { exitBrowseMode } = useCompanyContext();

  // Only show for super admins
  if (!user?.roles?.includes('super_admin')) {
    return null;
  }

  if (!isBrowsingMode || !browsedCompany) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 z-50"
    >
      <Card className="border-primary/50 bg-primary/10 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-primary" />
                <Building2 className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  تصفح كشركة
                </span>
                <span className="text-xs text-muted-foreground">
                  {browsedCompany.name}
                </span>
              </div>
            </div>
            
            {isBrowsingAsCompanyAdmin && (
              <Badge variant="secondary" className="gap-1">
                <Crown className="w-3 h-3" />
                صلاحيات إدارية
              </Badge>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={exitBrowseMode}
              className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
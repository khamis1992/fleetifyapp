import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, DollarSign, Settings, ChevronRight } from 'lucide-react';
import { CompanyOverview } from '@/hooks/useSuperAdminData';
import { formatDistanceToNow } from 'date-fns';

interface CompaniesOverviewProps {
  companies: CompanyOverview[];
  loading: boolean;
}

export const CompaniesOverview: React.FC<CompaniesOverviewProps> = ({ companies, loading }) => {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'suspended':
        return 'destructive';
      case 'trial':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'trial':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-48"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
                <div className="h-8 bg-muted rounded w-20"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Recent Companies
          </CardTitle>
          <Button variant="outline" size="sm">
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {companies.map((company) => (
            <div key={company.id} className="group flex items-center justify-between p-4 bg-gradient-to-r from-background to-background/50 border border-border/50 rounded-xl hover:shadow-card transition-all duration-300">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {company.name}
                  </h3>
                  <Badge 
                    variant={getStatusVariant(company.status)}
                    className={`${getStatusColor(company.status)} text-xs`}
                  >
                    {company.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {company.userCount} users
                  </div>
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {company.monthlyRevenue} KWD/month
                  </div>
                  <span>•</span>
                  <span>
                    Last active {formatDistanceToNow(new Date(company.lastActive), { addSuffix: true })}
                  </span>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  Plan: <span className="font-medium text-foreground">{company.subscriptionPlan}</span>
                </div>
              </div>
              
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Settings className="h-4 w-4" />
                Manage
              </Button>
            </div>
          ))}
          
          {companies.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No companies found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
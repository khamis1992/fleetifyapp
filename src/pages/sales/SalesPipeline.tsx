import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSalesOpportunities, useUpdateOpportunityStage, useSalesPipelineMetrics, type SalesOpportunity } from "@/hooks/useSalesOpportunities";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Plus, TrendingUp, DollarSign, Target, Award } from "lucide-react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { AddOpportunityForm } from "@/components/sales/AddOpportunityForm";

const STAGES = [
  { id: 'lead', name: 'عميل محتمل', color: 'bg-gray-100 border-gray-300' },
  { id: 'qualified', name: 'مؤهل', color: 'bg-blue-100 border-blue-300' },
  { id: 'proposal', name: 'عرض سعر', color: 'bg-yellow-100 border-yellow-300' },
  { id: 'negotiation', name: 'تفاوض', color: 'bg-orange-100 border-orange-300' },
  { id: 'won', name: 'مغلق - ناجح', color: 'bg-green-100 border-green-300' },
  { id: 'lost', name: 'مغلق - فاشل', color: 'bg-red-100 border-red-300' },
];

const SalesPipeline = () => {
  const [selectedOpportunity, setSelectedOpportunity] = useState<SalesOpportunity | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: opportunities, isLoading } = useSalesOpportunities({ is_active: true });
  const { data: metrics } = useSalesPipelineMetrics();
  const updateStage = useUpdateOpportunityStage();

  const getOpportunitiesByStage = (stage: string) => {
    return opportunities?.filter(opp => opp.stage === stage) || [];
  };

  const handleDragStart = (e: React.DragEvent, opportunity: SalesOpportunity) => {
    e.dataTransfer.setData('opportunityId', opportunity.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: string) => {
    e.preventDefault();
    const opportunityId = e.dataTransfer.getData('opportunityId');

    if (opportunityId) {
      await updateStage.mutateAsync({ id: opportunityId, stage: targetStage });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'QAR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">الرئيسية</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/sales/pipeline">المبيعات</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>خط الأنابيب</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">خط أنابيب المبيعات</h1>
            <p className="text-muted-foreground">متابعة الفرص البيعية ومراحلها</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              فرصة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة فرصة بيعية جديدة</DialogTitle>
              <DialogDescription>
                أدخل بيانات الفرصة البيعية الجديدة
              </DialogDescription>
            </DialogHeader>
            <AddOpportunityForm onSuccess={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي القيمة</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.total_pipeline_value || 0)}
            </div>
            <p className="text-xs text-muted-foreground">قيمة جميع الفرص النشطة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الفرص النشطة</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities?.length || 0}</div>
            <p className="text-xs text-muted-foreground">فرصة بيعية نشطة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">صفقات ناجحة</CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.won_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(metrics?.won_value || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط القيمة</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.avg_opportunity_value || 0)}
            </div>
            <p className="text-xs text-muted-foreground">متوسط قيمة الفرصة</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAGES.map((stage) => {
          const stageOpportunities = getOpportunitiesByStage(stage.id);
          const stageValue = stageOpportunities.reduce((sum, opp) => sum + (opp.estimated_value || 0), 0);

          return (
            <div
              key={stage.id}
              className="flex flex-col"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <Card className={cn("border-2", stage.color)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span>{stage.name}</span>
                    <Badge variant="outline">{stageOpportunities.length}</Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {formatCurrency(stageValue)}
                  </CardDescription>
                </CardHeader>
              </Card>

              <div className="flex-1 space-y-2 mt-2">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : stageOpportunities.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    لا توجد فرص
                  </div>
                ) : (
                  stageOpportunities.map((opportunity) => (
                    <Card
                      key={opportunity.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, opportunity)}
                      className="cursor-move hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedOpportunity(opportunity);
                        setIsDialogOpen(true);
                      }}
                    >
                      <CardHeader className="p-3">
                        <CardTitle className="text-sm">
                          {opportunity.opportunity_name}
                        </CardTitle>
                        {opportunity.opportunity_name_ar && (
                          <CardDescription className="text-xs">
                            {opportunity.opportunity_name_ar}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent className="p-3 pt-0 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">
                            {formatCurrency(opportunity.estimated_value || 0)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {opportunity.probability}%
                          </Badge>
                        </div>
                        {opportunity.expected_close_date && (
                          <div className="text-xs text-muted-foreground">
                            الإغلاق المتوقع: {new Date(opportunity.expected_close_date).toLocaleDateString('en-US')}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SalesPipeline;

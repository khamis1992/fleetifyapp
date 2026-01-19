import { Card, CardContent } from '@/components/ui/card';

export const FinancialRatios = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">نسبة السيولة السريعة</div>
            <div className="text-2xl font-bold mt-2">1.5</div>
            <div className="text-xs text-muted-foreground mt-1">جيد</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">نسبة الربحية</div>
            <div className="text-2xl font-bold mt-2">12.5%</div>
            <div className="text-xs text-muted-foreground mt-1">ممتاز</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm font-medium text-muted-foreground">نسبة الدين</div>
            <div className="text-2xl font-bold mt-2">0.45</div>
            <div className="text-xs text-muted-foreground mt-1">جيد</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="text-center py-12 text-muted-foreground">
        <p>سيتم عرض النسب المالية التفصيلية هنا</p>
        <p className="text-sm mt-2">الربحية، السيولة، النشاط، الرافعة المالية</p>
      </div>
    </div>
  );
};

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Car, Building, BarChart3 } from 'lucide-react';

interface ActivityFilterProps {
  value: 'car_rental' | 'real_estate' | 'all';
  onValueChange: (value: 'car_rental' | 'real_estate' | 'all') => void;
  className?: string;
  showDescription?: boolean;
}

export const ActivityFilter: React.FC<ActivityFilterProps> = ({
  value,
  onValueChange,
  className,
  showDescription = false
}) => {
  const getActivityInfo = (activityType: string) => {
    switch (activityType) {
      case 'car_rental':
        return {
          label: 'تأجير السيارات',
          icon: Car,
          description: 'التقارير المالية لنشاط تأجير السيارات فقط',
          color: 'bg-blue-100 text-blue-800'
        };
      case 'real_estate':
        return {
          label: 'العقارات',
          icon: Building,
          description: 'التقارير المالية لنشاط العقارات فقط',
          color: 'bg-green-100 text-green-800'
        };
      case 'all':
        return {
          label: 'جميع الأنشطة',
          icon: BarChart3,
          description: 'تقرير موحد لجميع الأنشطة التجارية',
          color: 'bg-purple-100 text-purple-800'
        };
      default:
        return {
          label: 'جميع الأنشطة',
          icon: BarChart3,
          description: 'تقرير موحد لجميع الأنشطة التجارية',
          color: 'bg-purple-100 text-purple-800'
        };
    }
  };

  const currentActivity = getActivityInfo(value);
  const Icon = currentActivity.icon;

  if (showDescription) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            فلتر النشاط التجاري
          </CardTitle>
          <CardDescription>
            اختر النشاط التجاري لعرض التقارير المالية المتخصصة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger>
              <SelectValue>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{currentActivity.label}</span>
                  <Badge variant="outline" className={currentActivity.color}>
                    {value === 'all' ? 'موحد' : 'منفصل'}
                  </Badge>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>جميع الأنشطة</span>
                    <span className="text-xs text-muted-foreground">تقرير موحد</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="car_rental">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>تأجير السيارات</span>
                    <span className="text-xs text-muted-foreground">نشاط السيارات فقط</span>
                  </div>
                </div>
              </SelectItem>
              <SelectItem value="real_estate">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span>العقارات</span>
                    <span className="text-xs text-muted-foreground">نشاط العقارات فقط</span>
                  </div>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{currentActivity.label}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {currentActivity.description}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span>{currentActivity.label}</span>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>جميع الأنشطة</span>
          </div>
        </SelectItem>
        <SelectItem value="car_rental">
          <div className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            <span>تأجير السيارات</span>
          </div>
        </SelectItem>
        <SelectItem value="real_estate">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            <span>العقارات</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
};
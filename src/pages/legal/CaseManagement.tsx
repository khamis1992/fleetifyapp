import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLegalCases } from '@/hooks/useLegalCases';
import { Plus, Search, FileText, Calendar, User, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

const CaseManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  const { data: legalCases = [], isLoading } = useLegalCases({
    search: searchTerm,
    case_status: statusFilter,
    priority: priorityFilter
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'closed': return 'secondary';
      case 'pending': return 'destructive';
      case 'on_hold': return 'outline';
      default: return 'default';
    }
  };

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'نشطة';
      case 'closed': return 'مغلقة';
      case 'pending': return 'معلقة';
      case 'on_hold': return 'موقوفة';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high': return 'عالية';
      case 'medium': return 'متوسطة';
      case 'low': return 'منخفضة';
      default: return priority;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">إدارة القضايا القانونية</h1>
          <p className="text-muted-foreground">تتبع ومتابعة جميع القضايا القانونية</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          قضية جديدة
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="البحث في القضايا..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع الحالات</SelectItem>
                <SelectItem value="active">نشطة</SelectItem>
                <SelectItem value="pending">معلقة</SelectItem>
                <SelectItem value="on_hold">موقوفة</SelectItem>
                <SelectItem value="closed">مغلقة</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="تصفية حسب الأولوية" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">جميع الأولويات</SelectItem>
                <SelectItem value="high">عالية</SelectItem>
                <SelectItem value="medium">متوسطة</SelectItem>
                <SelectItem value="low">منخفضة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cases List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2">جاري تحميل القضايا...</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {legalCases.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد قضايا مطابقة للبحث</p>
              </CardContent>
            </Card>
          ) : (
            legalCases.map((legalCase) => (
              <Card key={legalCase.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{legalCase.case_title}</CardTitle>
                      <div className="flex items-center space-x-2 space-x-reverse text-sm text-muted-foreground">
                        <span>رقم القضية: {legalCase.case_number}</span>
                        <span>•</span>
                        <span>نوع القضية: {legalCase.case_type}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 space-x-reverse">
                      <Badge variant={getStatusBadgeVariant(legalCase.case_status)}>
                        {getStatusText(legalCase.case_status)}
                      </Badge>
                      <Badge variant={getPriorityBadgeVariant(legalCase.priority)}>
                        {getPriorityText(legalCase.priority)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {legalCase.description && (
                    <p className="text-gray-600 mb-4">{legalCase.description}</p>
                  )}
                  
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <User className="h-4 w-4 text-gray-400" />
                      <span>العميل: {legalCase.client_name}</span>
                    </div>
                    {legalCase.primary_lawyer_id && (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>المحامي المسؤول: {legalCase.primary_lawyer_id}</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>تاريخ الإنشاء: {format(new Date(legalCase.created_at), 'dd MMMM yyyy', { locale: ar })}</span>
                    </div>
                    {legalCase.hearing_date && (
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>الجلسة التالية: {format(new Date(legalCase.hearing_date), 'dd MMMM yyyy', { locale: ar })}</span>
                      </div>
                    )}
                  </div>

                  {legalCase.case_value && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-sm font-medium">قيمة القضية: </span>
                      <span className="text-lg font-bold text-primary">
                        {legalCase.case_value.toLocaleString()} د.ك
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CaseManagement;
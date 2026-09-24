import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Search, Clock, Tag, ArrowUpLeft } from 'lucide-react';
import { useSupportTickets, useSupportTicketCategories, CreateTicketData } from '@/hooks/useSupportTickets';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { PageEmpty, PageLoading, PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

const Support: React.FC = () => {
  const navigate = useNavigate();
  const { tickets, isLoading, createTicket, isCreating } = useSupportTickets();
  const { categories } = useSupportTicketCategories();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<CreateTicketData>();

  const priorityTone: Record<string, string> = {
    urgent: 'is-risk',
    high: 'is-warn',
    medium: 'is-info',
    low: 'is-ok',
  };

  const statusTone: Record<string, string> = {
    open: 'is-info',
    in_progress: 'is-warn',
    waiting_customer: 'is-neutral',
    resolved: 'is-ok',
    closed: 'is-neutral',
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'مفتوحة';
      case 'in_progress': return 'قيد المعالجة';
      case 'waiting_customer': return 'بانتظار العميل';
      case 'resolved': return 'تم الحل';
      case 'closed': return 'مغلقة';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'عاجل';
      case 'high': return 'عالي';
      case 'medium': return 'متوسط';
      case 'low': return 'منخفض';
      default: return priority;
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticket_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category_id === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const onSubmit = async (data: CreateTicketData) => {
    try {
      await createTicket(data);
      reset();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating ticket:', error);
    }
  };

  const metrics = [
    { label: 'إجمالي التذاكر', value: tickets.length, hint: 'جميع التذاكر المسجلة', accent: true },
    { label: 'مفتوحة', value: tickets.filter(t => t.status === 'open').length, hint: 'بحاجة متابعة', accent: false },
    { label: 'قيد المعالجة', value: tickets.filter(t => t.status === 'in_progress').length, hint: 'تعمل عليها الآن', accent: false },
    { label: 'تم حلها', value: tickets.filter(t => t.status === 'resolved').length, hint: 'أغلقت بنجاح', accent: false },
  ];

  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> مساحة العمل <span>/</span> الدعم الفني
            </div>
            <h1>الدعم الفني</h1>
            <p>إدارة تذاكر الدعم الفني والاستفسارات ومتابعة حلها.</p>
          </div>
          <div className="dw-header-tools">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <button
                type="button"
                className="dw-button dw-button-primary"
                onClick={() => setIsCreateDialogOpen(true)}
              >
                <Plus size={17} />
                تذكرة جديدة
              </button>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>إنشاء تذكرة دعم جديدة</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category_id">التصنيف</Label>
                      <Select onValueChange={(value) => setValue('category_id', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر التصنيف" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name_ar}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category_id && (
                        <p className="text-sm text-red-600">التصنيف مطلوب</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="priority">الأولوية</Label>
                      <Select onValueChange={(value) => setValue('priority', value as any)}>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الأولوية" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">منخفض</SelectItem>
                          <SelectItem value="medium">متوسط</SelectItem>
                          <SelectItem value="high">عالي</SelectItem>
                          <SelectItem value="urgent">عاجل</SelectItem>
                        </SelectContent>
                      </Select>
                      {errors.priority && (
                        <p className="text-sm text-red-600">الأولوية مطلوبة</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">العنوان</Label>
                    <input
                      id="title"
                      className="wk-field"
                      style={{ width: '100%' }}
                      {...register('title', { required: 'العنوان مطلوب' })}
                      placeholder="عنوان المشكلة أو الاستفسار"
                    />
                    {errors.title && (
                      <p className="text-sm text-red-600">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">الوصف</Label>
                    <Textarea
                      id="description"
                      {...register('description', { required: 'الوصف مطلوب' })}
                      placeholder="وصف تفصيلي للمشكلة أو الاستفسار"
                      rows={4}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-600">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating ? <LoadingSpinner size="sm" /> : 'إنشاء التذكرة'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <section className="dw-metrics" aria-label="مؤشرات الدعم">
          {metrics.map((metric) => (
            <div key={metric.label} className={`dw-metric ${metric.accent ? 'dw-metric-accent' : ''}`}>
              <div className="dw-metric-top">
                <span>{metric.label}</span>
              </div>
              <strong>{metric.value}</strong>
              <div className="dw-metric-bottom">
                <small>{metric.hint}</small>
              </div>
            </div>
          ))}
        </section>

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title="تذاكر الدعم"
            subtitle="استعرض التذاكر وصفِّها بالحالة والأولوية والتصنيف"
            className="wk-panel-full"
            action={
              <div className="wk-toolbar-group">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa791]" size={14} />
                  <input
                    className="wk-field"
                    style={{ paddingRight: 32, minWidth: 220 }}
                    placeholder="ابحث في التذاكر…"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    aria-label="بحث في التذاكر"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="wk-field" style={{ width: 150 }}>
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    <SelectItem value="open">مفتوحة</SelectItem>
                    <SelectItem value="in_progress">قيد المعالجة</SelectItem>
                    <SelectItem value="waiting_customer">بانتظار العميل</SelectItem>
                    <SelectItem value="resolved">تم الحل</SelectItem>
                    <SelectItem value="closed">مغلقة</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="wk-field" style={{ width: 140 }}>
                    <SelectValue placeholder="الأولوية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأولويات</SelectItem>
                    <SelectItem value="urgent">عاجل</SelectItem>
                    <SelectItem value="high">عالي</SelectItem>
                    <SelectItem value="medium">متوسط</SelectItem>
                    <SelectItem value="low">منخفض</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="wk-field" style={{ width: 150 }}>
                    <SelectValue placeholder="التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع التصنيفات</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name_ar}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          >
            {isLoading ? (
              <PageLoading label="جاري تحميل التذاكر…" />
            ) : filteredTickets.length === 0 ? (
              <PageEmpty icon={Tag} message="لا توجد تذاكر مطابقة">
                <button type="button" className="dw-button" onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus size={16} />
                  إنشاء تذكرة جديدة
                </button>
              </PageEmpty>
            ) : (
              <div className="dw-priority-list" aria-live="polite">
                {filteredTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    className="dw-priority-row"
                    style={{ width: '100%', textAlign: 'start', background: 'inherit', border: 0, cursor: 'pointer' }}
                    onClick={() => navigate(`/support/tickets/${ticket.id}`)}
                  >
                    <span className={`dw-priority-icon ${ticket.priority === 'urgent' ? 'is-urgent' : ''}`}>
                      <Tag size={19} />
                    </span>
                    <div className="dw-priority-copy">
                      <h3><bdi>{ticket.title}</bdi></h3>
                      <p>
                        <Clock size={11} style={{ marginInlineEnd: 4, verticalAlign: 'middle' }} />
                        {format(new Date(ticket.created_at), 'dd MMM yyyy', { locale: ar })}
                        {ticket.category && (
                          <span style={{ marginInlineStart: 10 }}>
                            <Tag size={11} style={{ marginInlineEnd: 4, verticalAlign: 'middle' }} />
                            {ticket.category.name_ar}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="wk-badges" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
                      <span className={`wk-badge ${statusTone[ticket.status] ?? 'is-neutral'}`}>
                        {getStatusText(ticket.status)}
                      </span>
                      <span className={`wk-badge ${priorityTone[ticket.priority] ?? 'is-neutral'}`}>
                        {getPriorityText(ticket.priority)}
                      </span>
                    </div>
                    <ArrowUpLeft className="dw-row-arrow" size={16} />
                  </button>
                ))}
              </div>
            )}
            <div className="dw-panel-foot">
              <Clock size={14} />
              <span>{filteredTickets.length} تذكرة معروضة بعد التصفية.</span>
            </div>
          </PagePanel>
        </div>
      </div>
    </div>
  );
};

export default Support;
import React, { useState } from 'react'
import { useEnhancedResponsive } from '@/hooks/useEnhancedResponsive'
import { FeatureGate, useResponsiveDesign } from '@/contexts/FeatureFlagsContext'
import { 
  ResponsiveCard,
  ResponsiveButton,
  ResponsiveInput,
  ResponsiveDataTable,
  ResponsiveModal,
  ResponsiveStats
} from '@/components/responsive/ResponsiveComponents'
import { 
  ResponsivePageLayout,
  ResponsiveContentLayout 
} from '@/components/responsive/EnhancedLayouts'
import { 
  MobileCardItem,
  MobileSearchHeader,
  MobileFAB,
  MobilePageHeader,
  MobileTabNavigation
} from '@/components/responsive/MobileComponents'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calculator,
  Receipt,
  CreditCard,
  Building,
  Target,
  PieChart,
  Plus,
  Filter,
  Search,
  Eye,
  Edit,
  Download,
  FileText,
  Banknote,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

// Financial data interfaces
interface FinancialAccount {
  id: string
  code: string
  name: string
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense'
  balance: number
  parent_id?: string
  level: number
}

interface Transaction {
  id: string
  date: string
  description: string
  reference: string
  account_code: string
  account_name: string
  debit: number
  credit: number
  balance: number
  type: 'invoice' | 'payment' | 'journal' | 'adjustment'
  status: 'pending' | 'completed' | 'cancelled'
}

interface Payment {
  id: string
  date: string
  customer_name: string
  contract_number: string
  amount: number
  method: 'cash' | 'bank_transfer' | 'check' | 'card'
  status: 'pending' | 'completed' | 'failed'
  reference: string
}

// Mock data
const financialStats = [
  {
    title: 'إجمالي الإيرادات',
    value: '2,450,000',
    change: '+12.5% من الشهر الماضي',
    trend: 'up' as const,
    icon: TrendingUp
  },
  {
    title: 'إجمالي المصروفات',
    value: '1,280,000',
    change: '+5.2% من الشهر الماضي',
    trend: 'up' as const,
    icon: TrendingDown
  },
  {
    title: 'صافي الربح',
    value: '1,170,000',
    change: '+18.9% من الشهر الماضي',
    trend: 'up' as const,
    icon: DollarSign
  },
  {
    title: 'السيولة النقدية',
    value: '850,000',
    change: 'متاحة للعمليات',
    trend: 'neutral' as const,
    icon: Wallet
  }
]

const mockAccounts: FinancialAccount[] = [
  {
    id: '1',
    code: '1000',
    name: 'الأصول',
    type: 'asset',
    balance: 5500000,
    level: 0
  },
  {
    id: '2',
    code: '1100',
    name: 'الأصول المتداولة',
    type: 'asset',
    balance: 2800000,
    parent_id: '1',
    level: 1
  },
  {
    id: '3',
    code: '1110',
    name: 'النقدية والبنوك',
    type: 'asset',
    balance: 850000,
    parent_id: '2',
    level: 2
  },
  {
    id: '4',
    code: '1120',
    name: 'الذمم المدينة',
    type: 'asset',
    balance: 1950000,
    parent_id: '2',
    level: 2
  }
]

const mockTransactions: Transaction[] = [
  {
    id: '1',
    date: '2024-03-01',
    description: 'إيراد من إيجار مركبات',
    reference: 'INV-2024-001',
    account_code: '4100',
    account_name: 'إيرادات الإيجار',
    debit: 0,
    credit: 15000,
    balance: 245000,
    type: 'invoice',
    status: 'completed'
  },
  {
    id: '2',
    date: '2024-03-01',
    description: 'دفع رواتب الموظفين',
    reference: 'PAY-2024-001',
    account_code: '5200',
    account_name: 'رواتب الموظفين',
    debit: 45000,
    credit: 0,
    balance: 180000,
    type: 'payment',
    status: 'completed'
  },
  {
    id: '3',
    date: '2024-02-28',
    description: 'صيانة المركبات',
    reference: 'EXP-2024-015',
    account_code: '5300',
    account_name: 'مصاريف الصيانة',
    debit: 8500,
    credit: 0,
    balance: 65000,
    type: 'journal',
    status: 'pending'
  }
]

const mockPayments: Payment[] = [
  {
    id: '1',
    date: '2024-03-01',
    customer_name: 'شركة النقل المتطور',
    contract_number: 'CNT-2024-001',
    amount: 15000,
    method: 'bank_transfer',
    status: 'completed',
    reference: 'TRF-001'
  },
  {
    id: '2',
    date: '2024-03-01',
    customer_name: 'مؤسسة الخدمات اللوجستية',
    contract_number: 'CNT-2024-002',
    amount: 12500,
    method: 'check',
    status: 'pending',
    reference: 'CHK-002'
  }
]

// Helper functions
const getAccountTypeStyle = (type: FinancialAccount['type']) => {
  const styles = {
    asset: 'bg-blue-100 text-blue-800 border-blue-200',
    liability: 'bg-red-100 text-red-800 border-red-200',
    equity: 'bg-purple-100 text-purple-800 border-purple-200',
    income: 'bg-green-100 text-green-800 border-green-200',
    expense: 'bg-orange-100 text-orange-800 border-orange-200'
  }
  return styles[type]
}

const getAccountTypeLabel = (type: FinancialAccount['type']) => {
  const labels = {
    asset: 'أصول',
    liability: 'خصوم',
    equity: 'حقوق ملكية',
    income: 'إيرادات',
    expense: 'مصروفات'
  }
  return labels[type]
}

const getPaymentMethodLabel = (method: Payment['method']) => {
  const labels = {
    cash: 'نقدي',
    bank_transfer: 'تحويل بنكي',
    check: 'شيك',
    card: 'بطاقة'
  }
  return labels[method]
}

const getStatusStyle = (status: string) => {
  const styles = {
    completed: 'bg-green-100 text-green-800 border-green-200',
    pending: 'bg-orange-100 text-orange-800 border-orange-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-100 text-gray-800 border-gray-200'
  }
  return styles[status as keyof typeof styles] || styles.pending
}

const getStatusLabel = (status: string) => {
  const labels = {
    completed: 'مكتمل',
    pending: 'معلق',
    failed: 'فشل',
    cancelled: 'ملغي'
  }
  return labels[status as keyof typeof labels] || status
}

// Mobile Account Card Component
interface MobileAccountCardProps {
  account: FinancialAccount
  onView: (account: FinancialAccount) => void
}

function MobileAccountCard({ account, onView }: MobileAccountCardProps) {
  return (
    <MobileCardItem
      title={account.name}
      subtitle={account.code}
      description={`الرصيد: ${account.balance.toLocaleString()} ريال`}
      badge={getAccountTypeLabel(account.type)}
      onClick={() => onView(account)}
      className={cn(
        "border-l-4",
        account.level === 0 && "border-l-blue-500",
        account.level === 1 && "border-l-green-500",
        account.level === 2 && "border-l-orange-500"
      )}
    />
  )
}

// Mobile Transaction Card Component
interface MobileTransactionCardProps {
  transaction: Transaction
  onView: (transaction: Transaction) => void
}

function MobileTransactionCard({ transaction, onView }: MobileTransactionCardProps) {
  const isDebit = transaction.debit > 0
  
  return (
    <MobileCardItem
      title={transaction.description}
      subtitle={`${transaction.account_code} - ${transaction.account_name}`}
      description={transaction.reference}
      onClick={() => onView(transaction)}
      actions={
        <div className="text-right">
          <div className={cn(
            "text-lg font-bold",
            isDebit ? "text-red-600" : "text-green-600"
          )}>
            {isDebit ? (
              <div className="flex items-center gap-1">
                <ArrowUpRight size={16} />
                {transaction.debit.toLocaleString()}
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <ArrowDownRight size={16} />
                {transaction.credit.toLocaleString()}
              </div>
            )}
          </div>
          <Badge className={getStatusStyle(transaction.status)}>
            {getStatusLabel(transaction.status)}
          </Badge>
        </div>
      }
    />
  )
}

// Finance Dashboard Tabs
const financeTabs = [
  { id: 'overview', label: 'نظرة عامة', icon: PieChart },
  { id: 'accounts', label: 'الحسابات', icon: Building },
  { id: 'transactions', label: 'العمليات', icon: Receipt },
  { id: 'payments', label: 'المدفوعات', icon: CreditCard }
]

// Main Finance Management Component
export function ResponsiveFinanceManagement() {
  const { isMobile, isTablet, deviceType } = useEnhancedResponsive()
  const isResponsiveEnabled = useResponsiveDesign()
  
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false)

  // Table columns for accounts
  const accountColumns = [
    {
      key: 'code',
      label: 'الكود',
      priority: 'critical' as const,
      render: (value: string) => (
        <span className="font-mono font-medium">{value}</span>
      )
    },
    {
      key: 'name',
      label: 'اسم الحساب',
      priority: 'critical' as const,
      render: (value: string, account: FinancialAccount) => (
        <div style={{ paddingLeft: `${account.level * 20}px` }}>
          {value}
        </div>
      )
    },
    {
      key: 'type',
      label: 'النوع',
      priority: 'important' as const,
      render: (type: FinancialAccount['type']) => (
        <Badge className={getAccountTypeStyle(type)}>
          {getAccountTypeLabel(type)}
        </Badge>
      )
    },
    {
      key: 'balance',
      label: 'الرصيد',
      priority: 'critical' as const,
      render: (value: number) => (
        <span className="font-medium">
          {value.toLocaleString()} ريال
        </span>
      )
    }
  ]

  // Table columns for transactions
  const transactionColumns = [
    {
      key: 'date',
      label: 'التاريخ',
      priority: 'critical' as const
    },
    {
      key: 'description',
      label: 'الوصف',
      priority: 'critical' as const
    },
    {
      key: 'reference',
      label: 'المرجع',
      priority: 'important' as const
    },
    {
      key: 'account_name',
      label: 'الحساب',
      priority: 'important' as const
    },
    {
      key: 'debit',
      label: 'مدين',
      priority: 'critical' as const,
      render: (value: number) => value > 0 ? `${value.toLocaleString()} ريال` : '-'
    },
    {
      key: 'credit',
      label: 'دائن',
      priority: 'critical' as const,
      render: (value: number) => value > 0 ? `${value.toLocaleString()} ريال` : '-'
    },
    {
      key: 'status',
      label: 'الحالة',
      priority: 'secondary' as const,
      render: (status: string) => (
        <Badge className={getStatusStyle(status)}>
          {getStatusLabel(status)}
        </Badge>
      )
    }
  ]

  // Fallback to original design if responsive is disabled
  if (!isResponsiveEnabled) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">العمليات المالية</h1>
        <div className="text-muted-foreground">
          الوضع التقليدي للعمليات المالية - يتم تفعيل التصميم التكيفي تدريجياً
        </div>
      </div>
    )
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Financial Statistics */}
      <ResponsiveStats stats={financialStats} />

      {/* Quick Actions */}
      <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-2" : "grid-cols-4"
      )}>
        <ResponsiveCard className="text-center">
          <div className="space-y-2">
            <div className="p-3 bg-blue-100 rounded-lg mx-auto w-fit">
              <Receipt size={24} className="text-blue-600" />
            </div>
            <h3 className="font-medium">فاتورة جديدة</h3>
            <ResponsiveButton size="sm" fullWidth>
              إنشاء
            </ResponsiveButton>
          </div>
        </ResponsiveCard>

        <ResponsiveCard className="text-center">
          <div className="space-y-2">
            <div className="p-3 bg-green-100 rounded-lg mx-auto w-fit">
              <CreditCard size={24} className="text-green-600" />
            </div>
            <h3 className="font-medium">دفعة جديدة</h3>
            <ResponsiveButton size="sm" fullWidth>
              تسجيل
            </ResponsiveButton>
          </div>
        </ResponsiveCard>

        <ResponsiveCard className="text-center">
          <div className="space-y-2">
            <div className="p-3 bg-purple-100 rounded-lg mx-auto w-fit">
              <Calculator size={24} className="text-purple-600" />
            </div>
            <h3 className="font-medium">قيد يومية</h3>
            <ResponsiveButton size="sm" fullWidth>
              إضافة
            </ResponsiveButton>
          </div>
        </ResponsiveCard>

        <ResponsiveCard className="text-center">
          <div className="space-y-2">
            <div className="p-3 bg-orange-100 rounded-lg mx-auto w-fit">
              <FileText size={24} className="text-orange-600" />
            </div>
            <h3 className="font-medium">التقارير</h3>
            <ResponsiveButton size="sm" fullWidth>
              عرض
            </ResponsiveButton>
          </div>
        </ResponsiveCard>
      </div>

      {/* Recent Transactions */}
      <ResponsiveCard title="آخر العمليات المالية">
        {isMobile ? (
          <div className="space-y-3">
            {mockTransactions.slice(0, 3).map(transaction => (
              <MobileTransactionCard
                key={transaction.id}
                transaction={transaction}
                onView={setSelectedTransaction}
              />
            ))}
          </div>
        ) : (
          <ResponsiveDataTable
            data={mockTransactions.slice(0, 5)}
            columns={transactionColumns}
            searchable={false}
            filterable={false}
          />
        )}
      </ResponsiveCard>
    </div>
  )

  const renderAccountsTab = () => (
    <div className="space-y-6">
      {isMobile ? (
        <div className="space-y-3">
          {mockAccounts.map(account => (
            <MobileAccountCard
              key={account.id}
              account={account}
              onView={setSelectedAccount}
            />
          ))}
        </div>
      ) : (
        <ResponsiveDataTable
          data={mockAccounts}
          columns={accountColumns}
          actions={[
            {
              label: 'عرض',
              icon: Eye,
              onClick: (account: FinancialAccount) => {
                setSelectedAccount(account)
                setIsAccountModalOpen(true)
              }
            },
            {
              label: 'تعديل',
              icon: Edit,
              onClick: (account: FinancialAccount) => {
                console.log('Edit account:', account.id)
              }
            }
          ]}
        />
      )}
    </div>
  )

  const renderTransactionsTab = () => (
    <div className="space-y-6">
      {isMobile ? (
        <div className="space-y-3">
          {mockTransactions.map(transaction => (
            <MobileTransactionCard
              key={transaction.id}
              transaction={transaction}
              onView={setSelectedTransaction}
            />
          ))}
        </div>
      ) : (
        <ResponsiveDataTable
          data={mockTransactions}
          columns={transactionColumns}
          actions={[
            {
              label: 'عرض',
              icon: Eye,
              onClick: (transaction: Transaction) => {
                setSelectedTransaction(transaction)
                setIsTransactionModalOpen(true)
              }
            },
            {
              label: 'تعديل',
              icon: Edit,
              onClick: (transaction: Transaction) => {
                console.log('Edit transaction:', transaction.id)
              }
            }
          ]}
        />
      )}
    </div>
  )

  const renderPaymentsTab = () => (
    <div className="space-y-6">
      <ResponsiveCard title="المدفوعات الأخيرة">
        {isMobile ? (
          <div className="space-y-3">
            {mockPayments.map(payment => (
              <MobileCardItem
                key={payment.id}
                title={payment.customer_name}
                subtitle={payment.contract_number}
                description={`${getPaymentMethodLabel(payment.method)} - ${payment.reference}`}
                actions={
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {payment.amount.toLocaleString()} ريال
                    </div>
                    <Badge className={getStatusStyle(payment.status)}>
                      {getStatusLabel(payment.status)}
                    </Badge>
                  </div>
                }
              />
            ))}
          </div>
        ) : (
          <ResponsiveDataTable
            data={mockPayments}
            columns={[
              {
                key: 'date',
                label: 'التاريخ',
                priority: 'critical' as const
              },
              {
                key: 'customer_name',
                label: 'العميل',
                priority: 'critical' as const
              },
              {
                key: 'contract_number',
                label: 'رقم العقد',
                priority: 'important' as const
              },
              {
                key: 'amount',
                label: 'المبلغ',
                priority: 'critical' as const,
                render: (value: number) => `${value.toLocaleString()} ريال`
              },
              {
                key: 'method',
                label: 'طريقة الدفع',
                priority: 'important' as const,
                render: (method: Payment['method']) => getPaymentMethodLabel(method)
              },
              {
                key: 'status',
                label: 'الحالة',
                priority: 'secondary' as const,
                render: (status: string) => (
                  <Badge className={getStatusStyle(status)}>
                    {getStatusLabel(status)}
                  </Badge>
                )
              }
            ]}
            searchable={false}
            filterable={false}
          />
        )}
      </ResponsiveCard>
    </div>
  )

  return (
    <FeatureGate flag="responsiveDesign">
      <div className={cn(
        "min-h-screen",
        isMobile && "pb-mobile-bottom-nav"
      )}>
        {/* Mobile Header */}
        {isMobile && (
          <>
            <MobilePageHeader
              title="العمليات المالية"
              actions={
                <ResponsiveButton variant="ghost" size="sm">
                  <Download size={20} />
                </ResponsiveButton>
              }
            />
            
            {/* Mobile Tabs */}
            <div className="p-4 border-b">
              <MobileTabNavigation
                tabs={financeTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>
          </>
        )}

        <ResponsivePageLayout
          title={!isMobile ? "العمليات المالية" : undefined}
          subtitle="إدارة العمليات المحاسبية والمالية"
          actions={
            !isMobile ? (
              <div className="flex gap-2">
                <ResponsiveButton variant="outline">
                  <Download size={16} className="mr-2" />
                  تصدير
                </ResponsiveButton>
                <ResponsiveButton>
                  <Plus size={16} className="mr-2" />
                  عملية جديدة
                </ResponsiveButton>
              </div>
            ) : undefined
          }
        >
          {/* Desktop/Tablet Tabs */}
          {!isMobile && (
            <div className="border-b">
              <div className="flex space-x-8">
                {financeTabs.map(tab => {
                  const Icon = tab.icon
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex items-center gap-2 py-2 px-1 border-b-2 transition-colors",
                        activeTab === tab.id
                          ? "border-primary text-primary"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon size={16} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tab Content */}
          <div className="pt-6">
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'accounts' && renderAccountsTab()}
            {activeTab === 'transactions' && renderTransactionsTab()}
            {activeTab === 'payments' && renderPaymentsTab()}
          </div>
        </ResponsivePageLayout>

        {/* Mobile FAB */}
        {isMobile && (
          <MobileFAB
            onClick={() => console.log('Add new financial operation')}
            icon={Plus}
          />
        )}

        {/* Account Details Modal */}
        <ResponsiveModal
          isOpen={isAccountModalOpen}
          onClose={() => setIsAccountModalOpen(false)}
          title={selectedAccount ? selectedAccount.name : ''}
          size="lg"
        >
          {selectedAccount && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">كود الحساب</p>
                  <p className="font-mono font-medium">{selectedAccount.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">نوع الحساب</p>
                  <Badge className={getAccountTypeStyle(selectedAccount.type)}>
                    {getAccountTypeLabel(selectedAccount.type)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الرصيد الحالي</p>
                  <p className="text-lg font-bold">
                    {selectedAccount.balance.toLocaleString()} ريال
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المستوى</p>
                  <p>{selectedAccount.level}</p>
                </div>
              </div>
            </div>
          )}
        </ResponsiveModal>

        {/* Transaction Details Modal */}
        <ResponsiveModal
          isOpen={isTransactionModalOpen}
          onClose={() => setIsTransactionModalOpen(false)}
          title="تفاصيل العملية"
          size="lg"
        >
          {selectedTransaction && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">التاريخ</p>
                  <p>{selectedTransaction.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">المرجع</p>
                  <p className="font-mono">{selectedTransaction.reference}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">الوصف</p>
                  <p>{selectedTransaction.description}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحساب</p>
                  <p>{selectedTransaction.account_code} - {selectedTransaction.account_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <Badge className={getStatusStyle(selectedTransaction.status)}>
                    {getStatusLabel(selectedTransaction.status)}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">مدين</p>
                  <p className="text-lg font-bold text-red-600">
                    {selectedTransaction.debit > 0 ? `${selectedTransaction.debit.toLocaleString()} ريال` : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">دائن</p>
                  <p className="text-lg font-bold text-green-600">
                    {selectedTransaction.credit > 0 ? `${selectedTransaction.credit.toLocaleString()} ريال` : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </ResponsiveModal>
      </div>
    </FeatureGate>
  )
}
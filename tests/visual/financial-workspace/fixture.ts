import { useState } from 'react';
export const useUnifiedCompanyAccess = () => ({companyId:'fixture-company'});
const feeType={id:'fee',type_code:'LATE_FEE_REVENUE',type_name:'Collected late fees',type_name_ar:'إيرادات رسوم التأخير المحصّلة',account_category:'revenue'};
const rentalType={id:'rent',type_code:'RENTAL_REVENUE',type_name:'Rental revenue',type_name_ar:'إيرادات الإيجار',account_category:'revenue'};
const account={company_id:'fixture-company',account_type:'revenue',balance_type:'credit',account_level:3,is_active:true,is_header:false};
const accounts=[{...account,id:'fee-account',account_code:'430101',account_name:'Collected late fees',account_name_ar:'رسوم التأخير المحصّلة'},
  {...account,id:'level-two',account_code:'4110',account_name:'Legacy level two',account_name_ar:'حساب قديم من المستوى الثاني',account_level:2},
  {...account,id:'cash',account_code:'1101',account_name:'Cash',account_name_ar:'الصندوق',account_type:'assets',balance_type:'debit'}];
const ready={isLoading:false,isError:false,refetch:async()=>{}};
export const useDefaultAccountTypes=()=>({...ready,data:[feeType,rentalType]});
export const useChartOfAccounts=()=>({...ready,data:accounts});
export const useAccountMappings=()=>({...ready,data:[{id:'old-mapping',default_account_type_id:'rent',chart_of_accounts_id:'level-two',default_account_type:rentalType,chart_of_accounts:accounts[1]}]});
const mutation=()=>({isPending:false,mutate:()=>{}});
export const useCreateAccountMapping=mutation;
export const useUpdateAccountMapping=mutation;
export const useDeleteAccountMapping=mutation;
const parameters = new URLSearchParams(window.location.search);
const language = parameters.get('lang') === 'en' ? 'en' : 'ar';
export const financeToday = () => '2026-09-06';
export const useFleetifyTranslation = () => ({currentLanguage: language, isRTL:language==='ar', t: (key: string, options?: {defaultValue?: string}) => options?.defaultValue || ({fleetify:'فليتيفاي'}[key] || key)});
export const useRTLLayout = () => ({isRTL:language==='ar',direction:language==='ar'?'rtl':'ltr'});
export const useCreateAccount=mutation;
export const useUpdateAccount=mutation;
export const useDeleteAccount=mutation;
export const useCascadeDeleteAccount=mutation;
export const useAccountDeletionPreview=mutation;
export const useDeleteAllAccounts=mutation;
export const useAllAccountsDeletionPreview=mutation;
export const useCopyDefaultAccounts=mutation;
export const useCurrencyFormatter = () => ({formatCurrency: (value: number) => new Intl.NumberFormat(language==='ar'?'ar-QA':'en-QA', {style:'currency',currency:'QAR',maximumFractionDigits:2}).format(value)});
export const useFinancialWorkspace = () => {
  const [failed, setFailed] = useState(parameters.get('state') === 'error');
  return {
    isPending: parameters.get('state') === 'loading', isError: failed, isFetching: false,
    refetch: async () => setFailed(false),
    data: parameters.get('state')==='loading' ? undefined : {
      company_id:'11111111-1111-4111-8111-111111111111',as_of:'2026-09-06',checked_at:'2026-09-06T06:00:00Z',basis:'posted_ledger',
      summary:{total_assets:19632930,total_liabilities:2275015.91,total_equity:17357914.09,total_revenue:-1109044,total_expenses:16000,net_income:-1125044,unbalanced_entries_count:0},
      receivables:{outstanding:4002546.66,overdue:3901546.66,overdue_count:2455,invoiced:7088743.17,settled:3086196.51},
      monthly_receipts:51340,posted_entries:21443,draft_entries:404,
      trend:[{month:'2026-04-01',revenue:379930,expenses:4450},{month:'2026-05-01',revenue:374570,expenses:3600},{month:'2026-06-01',revenue:372530,expenses:1000},{month:'2026-07-01',revenue:-800000,expenses:49400},{month:'2026-08-01',revenue:88116,expenses:16000},{month:'2026-09-01',revenue:-1109044,expenses:16000}],
      checks:[{code:'posting_accounts',severity:'critical',count:3490},{code:'account_classification',severity:'warning',count:255},{code:'journal_balance',severity:'critical',count:0}],sources:[],
    },
  };
};

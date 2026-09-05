import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useUnifiedCompanyAccess } from '@/hooks/useUnifiedCompanyAccess';
import { fetchRentalArrears } from '@/services/rentalArrears';
import { contractBusinessDate } from '@/utils/contractScheduleSettlement';

export function useCanonicalRentalArrears() {
  const {user}=useAuth();
  const {companyId,isInitializing}=useUnifiedCompanyAccess();
  const dueAsOf=contractBusinessDate();
  const ready=Boolean(user?.id&&companyId&&!isInitializing);
  const query=useQuery({
    queryKey:['late-payment-customers',user?.id,companyId,dueAsOf],
    enabled:ready,queryFn:()=>fetchRentalArrears(companyId||'',dueAsOf),retry:false,staleTime:0,refetchInterval:30_000,
  });
  return {...query,scopeKey:`${user?.id||''}:${companyId||''}:${dueAsOf}`,
    data:ready&&!query.isFetching&&!query.error?query.data:undefined,
    isLoading:isInitializing||(ready&&(query.isPending||query.isFetching)),
    error:query.error||(!ready&&!isInitializing?new Error('تعذر تحديد المستخدم والشركة لقراءة المتأخرات.'):null)};
}

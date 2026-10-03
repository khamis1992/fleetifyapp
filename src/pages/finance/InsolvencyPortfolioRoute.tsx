import { ProtectedFinanceRoute } from '@/components/finance/ProtectedFinanceRoute';
import InsolvencyPortfolio from '@/pages/finance/InsolvencyPortfolio';

export default function InsolvencyPortfolioRoute() {
  return <ProtectedFinanceRoute permission="finance.reports.view"><InsolvencyPortfolio /></ProtectedFinanceRoute>;
}

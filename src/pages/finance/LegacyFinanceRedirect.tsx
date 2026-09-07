import { Navigate, useLocation } from "react-router-dom";
import { resolveFinanceLocation } from "@/components/finance/workspace/financeRouteAliases";
export default function LegacyFinanceRedirect() {
  const location = useLocation();
  return (
    <Navigate
      replace
      to={`${resolveFinanceLocation(location.pathname, location.search)}${
        location.hash
      }`}
      state={location.state}
    />
  );
}

import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, Landmark } from "lucide-react";
import { findFinanceDestination } from "./financeNavigation";
import { useFinanceNavigation } from "./useFinanceNavigation";
import "./finance-system.css";
export function FinanceWorkspaceNav() {
  const { groups, language } = useFinanceNavigation();
  const location = useLocation();
  const current = findFinanceDestination(location.pathname, location.search);
  const ar = language === "ar";
  return (
    <nav
      dir={ar ? "rtl" : "ltr"}
      className="finance-workspace-nav finance-context-bar"
      aria-label={ar ? "التنقل المالي" : "Finance navigation"}
    >
      <div className="finance-context-location">
        <Link to="/finance/overview">
          <Landmark size={17} aria-hidden="true" />
          <span>{ar ? "المالية" : "Finance"}</span>
        </Link>
        {current && (
          <>
            <ChevronLeft
              className={ar ? "" : "rotate-180"}
              size={14}
              aria-hidden="true"
            />
            <span>{current.group[language]}</span>
            <ChevronLeft
              size={14}
              aria-hidden="true"
              className={ar ? "" : "rotate-180"}
            />
            {current.parent &&
              groups.some((group) =>
                group.items.some((item) => item.id === current.parent?.id)
              ) && (
                <>
                  <Link to={current.parent.href}>
                    {current.parent[language]}
                  </Link>
                  <ChevronLeft
                    size={14}
                    aria-hidden="true"
                    className={ar ? "" : "rotate-180"}
                  />
                </>
              )}
            <span aria-current="page">{current.item[language]}</span>
          </>
        )}
      </div>
    </nav>
  );
}

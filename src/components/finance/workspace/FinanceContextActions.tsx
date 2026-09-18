import { Link } from "react-router-dom";
import { ArrowUpLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinanceNavigation } from "./useFinanceNavigation";

/** Actions use the same access-filtered registry as search and the sidebar. */
export function FinanceContextActions({ ids }: { ids: string[] }) {
  const { searchGroups, language } = useFinanceNavigation();
  const available = searchGroups.flatMap((group) => group.items);
  const actions = ids.flatMap(
    (id) => available.find((item) => item.id === id) || []
  );
  if (!actions.length) return null;
  return (
    <nav className="mb-5 flex flex-wrap gap-2" aria-label="أدوات الصفحة">
      {actions.map((item) => (
        <Button key={item.id} variant="outline" size="sm" asChild>
          <Link to={item.href}>
            {item[language]}
            <ArrowUpLeft className="ms-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      ))}
    </nav>
  );
}

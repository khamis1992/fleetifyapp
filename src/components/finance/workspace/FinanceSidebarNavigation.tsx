import { useEffect, useId, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  findFinanceDestination,
  isFinanceDestinationActive,
} from "./financeNavigation";
import { useFinanceNavigation } from "./useFinanceNavigation";
import "./finance-system.css";

export function FinanceSidebarNavigation({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const {
    groups,
    searchGroups = groups,
    language,
    isLoading,
  } = useFinanceNavigation();
  const location = useLocation();
  const current = findFinanceDestination(location.pathname, location.search);
  const currentGroup = current?.group.id;
  const [expanded, setExpanded] = useState<string | null>(
    current?.group.id || "overview"
  );
  const [search, setSearch] = useState("");
  const id = useId();
  useEffect(() => {
    if (currentGroup) setExpanded(currentGroup);
  }, [currentGroup]);
  const visible = (search.trim() && !collapsed ? searchGroups : groups)
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          collapsed ||
          !search.trim() ||
          `${item.ar} ${item.en} ${group.ar} ${group.en}`
            .toLowerCase()
            .includes(search.trim().toLowerCase())
      ),
    }))
    .filter((group) => group.items.length);
  const ar = language === "ar";
  return (
    <div className="finance-sidebar-tree" dir={ar ? "rtl" : "ltr"}>
      {!collapsed && (
        <label className="finance-sidebar-search">
          <Search aria-hidden="true" size={16} />
          <input
            aria-label={
              ar ? "بحث في الأقسام المالية" : "Search finance sections"
            }
            placeholder={ar ? "ابحث عن قسم مالي…" : "Find a finance section…"}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
      )}
      {isLoading && !groups.length && (
        <p role="status" className="p-3 text-xs">
          {ar ? "جاري تحميل الأقسام…" : "Loading sections…"}
        </p>
      )}
      {!isLoading && !visible.length && (
        <p role="status" className="p-3 text-xs">
          {ar ? "لا توجد أقسام مطابقة متاحة." : "No available sections match."}
        </p>
      )}
      {visible.map((group) => {
        const open = !!search.trim() || expanded === group.id;
        const selected = current?.group.id === group.id;
        const Icon = group.icon;
        if (collapsed)
          return (
            <Link
              key={group.id}
              to={group.items[0].href}
              onClick={onNavigate}
              title={group[language]}
              aria-label={group[language]}
              className={cn("finance-sidebar-icon", selected && "is-active")}
            >
              <Icon aria-hidden="true" size={20} />
            </Link>
          );
        return (
          <div key={group.id} className="finance-sidebar-group">
            <button
              type="button"
              className={cn(
                "finance-sidebar-group-button",
                selected && "is-current"
              )}
              aria-expanded={open}
              aria-controls={`${id}-${group.id}`}
              onClick={() =>
                setExpanded((previous) =>
                  previous === group.id ? null : group.id
                )
              }
            >
              <Icon aria-hidden="true" size={17} />
              <span>{group[language]}</span>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={open ? "rotate-180" : ""}
              />
            </button>
            <ul id={`${id}-${group.id}`} hidden={!open}>
              {group.items.map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    onClick={() => {
                      setSearch("");
                      setExpanded(group.id);
                      onNavigate?.();
                    }}
                    aria-current={
                      isFinanceDestinationActive(
                        item.href,
                        location.pathname,
                        location.search
                      )
                        ? "page"
                        : current?.item.parentId === item.id
                        ? "location"
                        : undefined
                    }
                  >
                    {item[language]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

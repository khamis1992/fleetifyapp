import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Search, X } from "lucide-react";
import {
  findFinanceDestination,
  isFinanceDestinationActive,
} from "./financeNavigation";
import { useFinanceNavigation } from "./useFinanceNavigation";
import "@/components/navigation/sidebar-workspace/sidebar-workspace.css";

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
  useEffect(() => {
    if (currentGroup) setExpanded(currentGroup);
  }, [currentGroup]);
  const searching = !!search.trim() && !collapsed;
  const visible = (searching ? searchGroups : groups)
    .map((group) => {
      const query = searching ? search.trim().toLowerCase() : "";
      const matches = (item: { ar: string; en: string }) =>
        !query ||
        `${item.ar} ${item.en} ${group.ar} ${group.en}`
          .toLowerCase()
          .includes(query);
      if (searching) {
        // searchGroups already merges secondary items into items.
        return { ...group, items: group.items.filter(matches), secondaryItems: [] };
      }
      return {
        ...group,
        items: group.items,
        secondaryItems: group.secondaryItems,
      };
    })
    .filter((group) => group.items.length);
  const ar = language === "ar";
  const renderLink = (item: {
    id: string;
    href: string;
    ar: string;
    en: string;
  }) => {
    const active = isFinanceDestinationActive(
      item.href,
      location.pathname,
      location.search
    );
    return (
      <Link
        to={item.href}
        onClick={() => {
          setSearch("");
          onNavigate?.();
        }}
        className={`sw-subitem ${active ? "is-active" : ""}`}
        aria-current={active ? "page" : undefined}
      >
        <span>{item[language]}</span>
        {active && <i className="sw-active-dot" />}
      </Link>
    );
  };
  return (
    <div dir={ar ? "rtl" : "ltr"} className="finance-sw-menu">
      {!collapsed && (
        <div className="sw-search-area">
          <div className="sw-search">
            <Search size={16} />
            <input
              aria-label={
                ar ? "بحث في الأقسام المالية" : "Search finance sections"
              }
              placeholder={ar ? "ابحث عن قسم مالي…" : "Find a finance section…"}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                className="sw-icon-button"
                onClick={() => setSearch("")}
                aria-label={ar ? "مسح بحث الأقسام" : "Clear search"}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      )}
      {isLoading && !groups.length && (
        <p role="status" className="sw-empty">
          {ar ? "جاري تحميل الأقسام…" : "Loading sections…"}
        </p>
      )}
      {!isLoading && !visible.length && (
        <div className="sw-empty" role="status">
          <Search size={23} />
          <strong>{ar ? "لا توجد أقسام مطابقة" : "No matching sections"}</strong>
          <p>{ar ? "جرّب اسماً آخر للقسم الذي تبحث عنه." : "Try a different name."}</p>
          <button onClick={() => setSearch("")}>
            {ar ? "عرض جميع الأقسام" : "Show all sections"}
          </button>
        </div>
      )}
      {visible.map((group) => {
        const open = !collapsed && (searching || expanded === group.id);
        const Icon = group.icon;
        const groupActive = current?.group.id === group.id;
        const groupId = `sw-finance-${group.id}`;
        if (collapsed)
          return (
            <Link
              key={group.id}
              to={group.items[0].href}
              onClick={onNavigate}
              title={group[language]}
              aria-label={group[language]}
              className={`sw-nav-item ${groupActive ? "is-active" : ""}`}
            >
              <Icon size={19} />
            </Link>
          );
        return (
          <div className="sw-group" key={group.id}>
            <button
              type="button"
              className={`sw-nav-item ${groupActive ? "is-parent-active" : ""}`}
              onClick={() =>
                setExpanded((previous) =>
                  previous === group.id ? null : group.id
                )
              }
              aria-expanded={open}
              aria-controls={open ? groupId : undefined}
            >
              <Icon size={19} />
              <span>{group[language]}</span>
              <ChevronDown
                size={14}
                className={`sw-chevron ${open ? "is-open" : ""}`}
              />
            </button>
            {open && (
              <ul className="sw-subnavigation" id={groupId}>
                {group.items.map((item) => {
                  const active = isFinanceDestinationActive(
                    item.href,
                    location.pathname,
                    location.search
                  );
                  const isParentOfCurrent = current?.item.parentId === item.id;
                  const children = group.secondaryItems.filter(
                    (secondary) => secondary.parentId === item.id
                  );
                  return (
                    <li key={item.id}>
                      <Link
                        to={item.href}
                        onClick={() => {
                          setSearch("");
                          setExpanded(group.id);
                          onNavigate?.();
                        }}
                        className={`sw-subitem ${active || isParentOfCurrent ? "is-active" : ""}`}
                        aria-current={
                          active ? "page" : isParentOfCurrent ? "location" : undefined
                        }
                      >
                        <span>{item[language]}</span>
                        {active && <i className="sw-active-dot" />}
                      </Link>
                      {children.length > 0 && (
                        <ul className="sw-subnavigation">
                          {children.map((child) =>
                            <li key={child.id}>{renderLink(child)}</li>
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
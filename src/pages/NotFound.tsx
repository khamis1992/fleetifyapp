import { useLocation } from "react-router-dom";
import { useEffect } from "react";

import { useFleetifyTranslation } from "@/hooks/useTranslation";
const NotFound = () => {
  const { t } = useFleetifyTranslation("ui");
  const location = useLocation();

  // Log 404 errors for monitoring
  useEffect(() => {
    // Only log in development mode to avoid console pollution in production
    if (import.meta.env.DEV) {
      console.error(
        "404 Error: User attempted to access non-existent route:",
        location.pathname
      );
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-slate-600 mb-4">{t("oopsPageNotFound")}</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">{t("returnToHome")}</a>
      </div>
    </div>
  );
};

export default NotFound;

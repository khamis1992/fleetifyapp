import React from "react";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  label?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onExportCSV,
  onExportPDF,
  label = "تصدير",
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onExportCSV && (
          <DropdownMenuItem onClick={onExportCSV} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            تصدير CSV
          </DropdownMenuItem>
        )}
        {onExportPDF && (
          <DropdownMenuItem onClick={onExportPDF} className="gap-2">
            <FileText className="w-4 h-4" />
            تصدير PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
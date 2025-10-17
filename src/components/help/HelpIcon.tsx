import React, { useState } from "react";
import { HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HelpIconProps {
  title: string;
  content: string | React.ReactNode;
  examples?: Array<{
    title: string;
    description: string;
  }>;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const HelpIcon: React.FC<HelpIconProps> = ({
  title,
  content,
  examples,
  size = "md",
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "inline-flex items-center justify-center rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors",
          sizeClasses[size],
          className
        )}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <HelpCircle className={cn(sizeClasses[size], "text-blue-500")} />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-right">
              {title}
            </DialogTitle>
          </DialogHeader>

          <DialogDescription asChild>
            <div className="space-y-4 text-right">
              {/* Main Content */}
              <div className="text-base text-gray-700 leading-relaxed">
                {typeof content === "string" ? (
                  <p className="whitespace-pre-line">{content}</p>
                ) : (
                  content
                )}
              </div>

              {/* Examples Section */}
              {examples && examples.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    أمثلة عملية:
                  </h3>
                  <div className="space-y-3">
                    {examples.map((example, index) => (
                      <div
                        key={index}
                        className="bg-blue-50 border border-blue-200 rounded-lg p-4"
                      >
                        <h4 className="font-semibold text-blue-900 mb-2">
                          {example.title}
                        </h4>
                        <p className="text-sm text-gray-700">
                          {example.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setIsOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  فهمت
                </Button>
              </div>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};


import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  title: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="w-full py-3">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-sm",
                  currentStep > step.id
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : currentStep === step.id
                    ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-500/30"
                    : "bg-neutral-100 border-neutral-300 text-neutral-400"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="font-semibold">{step.id}</span>
                )}
              </div>
              <div className="mt-1 text-center">
                <p
                  className={cn(
                    "text-xs font-medium",
                    currentStep >= step.id ? "text-neutral-900" : "text-neutral-400"
                  )}
                >
                  {step.title}
                </p>
                <p className="text-[10px] text-neutral-500 hidden md:block">
                  {step.description}
                </p>
              </div>
            </div>
            
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 rounded-full transition-all duration-300",
                  currentStep > step.id ? "bg-emerald-500" : "bg-neutral-200"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


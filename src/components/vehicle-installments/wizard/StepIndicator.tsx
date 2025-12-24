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
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  currentStep > step.id
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : currentStep === step.id
                    ? "bg-coral-500 border-coral-500 text-white shadow-lg shadow-coral-500/30"
                    : "bg-neutral-100 border-neutral-300 text-neutral-400"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="font-semibold">{step.id}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    currentStep >= step.id ? "text-neutral-900" : "text-neutral-400"
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-neutral-500 hidden md:block">
                  {step.description}
                </p>
              </div>
            </div>
            
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-1 mx-2 rounded-full transition-all duration-300",
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


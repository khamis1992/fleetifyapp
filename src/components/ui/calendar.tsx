import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { arSA } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const currentYear = new Date().getFullYear();
  
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={arSA}
      weekStartsOn={6} // Saturday
      captionLayout="dropdown"
      startMonth={new Date(currentYear - 10, 0)}
      endMonth={new Date(currentYear + 10, 11)}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "space-y-4 w-full",
        month_caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "hidden",
        dropdowns: "flex gap-2 justify-center",
        dropdown: "appearance-none bg-white border border-teal-200 rounded-lg px-2 py-1 text-sm font-medium text-teal-700 cursor-pointer hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400",
        nav: "flex items-center gap-1",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "absolute right-1 h-8 w-8 bg-white border-teal-200 p-0 hover:bg-teal-50 hover:border-teal-400 transition-colors"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "absolute left-1 h-8 w-8 bg-white border-teal-200 p-0 hover:bg-teal-50 hover:border-teal-400 transition-colors"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex justify-between mb-2",
        weekday: "text-teal-600 font-medium text-[0.75rem] w-10 text-center",
        week: "flex justify-between w-full mt-1",
        day: "h-10 w-10 text-center text-sm p-0 relative",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-10 w-10 p-0 font-normal hover:bg-teal-50 hover:text-teal-700 transition-colors rounded-lg"
        ),
        selected:
          "bg-gradient-to-br from-teal-500 to-teal-600 text-white hover:from-teal-600 hover:to-teal-700 hover:text-white focus:from-teal-600 focus:to-teal-700 focus:text-white shadow-md rounded-lg",
        today: "bg-teal-100 text-teal-800 font-semibold rounded-lg",
        outside: "text-slate-400 opacity-50",
        disabled: "text-slate-300 opacity-50",
        range_middle: "bg-teal-100 text-teal-800",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === 'left') {
            return <ChevronRight className="h-4 w-4 text-teal-600" />;
          }
          return <ChevronLeft className="h-4 w-4 text-teal-600" />;
        },
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }

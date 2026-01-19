import React from "react"
import { format } from "date-fns"
import { arSA } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateFieldProps {
  value?: string
  onChange?: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  minDate?: Date
  maxDate?: Date
}

export function DateField({
  value,
  onChange,
  placeholder = "اختر التاريخ",
  disabled = false,
  className,
  minDate,
  maxDate,
}: DateFieldProps) {
  const [open, setOpen] = React.useState(false)
  
  // تحويل قيمة النص إلى Date object
  const dateValue = value ? new Date(value) : undefined
  
  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // تحويل التاريخ إلى string بتنسيق ISO (YYYY-MM-DD)
      const formattedDate = format(date, "yyyy-MM-dd")
      onChange?.(formattedDate)
    } else {
      onChange?.(undefined)
    }
    setOpen(false)
  }

  // تنسيق التاريخ للعرض بالعربية
  const formatDisplayDate = (date: Date) => {
    return format(date, "dd/MM/yyyy")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          dir="rtl"
          className={cn(
            "w-full justify-between text-right font-normal gap-2 h-12",
            "border-neutral-200 hover:border-teal-400 hover:bg-teal-50/50",
            "transition-all duration-200",
            !dateValue && "text-muted-foreground",
            dateValue && "text-slate-800 font-medium",
            className
          )}
          disabled={disabled}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-teal-500" />
            {dateValue ? (
              formatDisplayDate(dateValue)
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-teal-200 shadow-lg" align="start" dir="rtl">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          initialFocus
          className="pointer-events-auto"
          disabled={(date) => {
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return date < new Date("1900-01-01")
          }}
          defaultMonth={dateValue || new Date()}
        />
      </PopoverContent>
    </Popover>
  )
}
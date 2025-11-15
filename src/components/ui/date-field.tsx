import React from "react"
import { format } from "date-fns"
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
}

export function DateField({
  value,
  onChange,
  placeholder = "اختر التاريخ",
  disabled = false,
  className,
}: DateFieldProps) {
  const [open, setOpen] = useState(false)
  
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !dateValue && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateValue ? (
            format(dateValue, "dd MMMM yyyy")
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={handleSelect}
          initialFocus
          className="pointer-events-auto"
          disabled={(date) => date < new Date("1900-01-01")}
        />
      </PopoverContent>
    </Popover>
  )
}
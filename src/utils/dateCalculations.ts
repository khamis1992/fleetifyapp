import { addDays, addMonths, differenceInDays, format, parseISO } from 'date-fns'
import { ar } from 'date-fns/locale'

export type DurationMode = 'days' | 'calendar_months' | 'commercial_months'

export interface DurationCalculation {
  days: number
  actualDays: number
  months: number
  weeks: number
  startDate: Date
  endDate: Date
  mode: DurationMode
  description: string
  breakdown: {
    months: number
    remainingDays: number
    weeks: number
  }
}

/**
 * Calculate end date based on start date and duration
 */
export const calculateEndDate = (
  startDate: string | Date, 
  duration: number, 
  mode: DurationMode = 'days'
): string => {
  if (!startDate || duration <= 0) return ''
  
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  let end: Date
  
  switch (mode) {
    case 'calendar_months':
      // Add actual calendar months (28-31 days depending on month)
      end = addMonths(start, duration)
      break
    case 'commercial_months':
      // Add fixed 30-day months
      end = addDays(start, duration * 30)
      break
    case 'days':
    default:
      // Add exact days
      end = addDays(start, duration)
      break
  }
  
  return format(end, 'yyyy-MM-dd')
}

/**
 * Calculate duration details between two dates
 */
export const calculateDurationDetails = (
  startDate: string | Date,
  endDate: string | Date,
  mode: DurationMode = 'days'
): DurationCalculation => {
  const start = typeof startDate === 'string' ? parseISO(startDate) : startDate
  const end = typeof endDate === 'string' ? parseISO(endDate) : endDate
  
  const actualDays = differenceInDays(end, start)
  const months = Math.floor(actualDays / 30)
  const weeks = Math.floor(actualDays / 7)
  const remainingDays = actualDays % 30
  
  let description = ''
  let days = actualDays
  
  switch (mode) {
    case 'calendar_months':
      description = `${months} شهر تقويمي (${actualDays} يوم فعلي)`
      days = months // Display months as the primary unit
      break
    case 'commercial_months':
      description = `${months} شهر تجاري (30 يوم لكل شهر)`
      days = months * 30
      break
    case 'days':
    default:
      description = `${actualDays} يوم`
      break
  }
  
  return {
    days,
    actualDays,
    months,
    weeks,
    startDate: start,
    endDate: end,
    mode,
    description,
    breakdown: {
      months,
      remainingDays,
      weeks
    }
  }
}

/**
 * Get suggested duration mode based on contract type
 */
export const getSuggestedDurationMode = (contractType: string): DurationMode => {
  switch (contractType) {
    case 'monthly_rental':
    case 'yearly_rental':
      return 'calendar_months'
    case 'weekly_rental':
    case 'daily_rental':
      return 'days'
    default:
      return 'days'
  }
}

/**
 * Convert between different duration modes
 */
export const convertDuration = (
  value: number,
  fromMode: DurationMode,
  toMode: DurationMode
): number => {
  // First convert to days
  let days: number
  switch (fromMode) {
    case 'calendar_months':
    case 'commercial_months':
      days = value * 30 // Approximate for conversion
      break
    case 'days':
    default:
      days = value
      break
  }
  
  // Then convert from days to target mode
  switch (toMode) {
    case 'calendar_months':
    case 'commercial_months':
      return Math.round(days / 30)
    case 'days':
    default:
      return days
  }
}

/**
 * Format duration for display
 */
export const formatDuration = (
  days: number,
  mode: DurationMode = 'days',
  includeBreakdown: boolean = true
): string => {
  const months = Math.floor(days / 30)
  const weeks = Math.floor(days / 7)
  const remainingDays = days % 30
  const remainingDaysAfterWeeks = days % 7
  
  switch (mode) {
    case 'calendar_months':
      if (includeBreakdown && remainingDays > 0) {
        return `${months} شهر و ${remainingDays} يوم`
      }
      return `${months} شهر`
      
    case 'commercial_months':
      return `${months} شهر (${days} يوم)`
      
    case 'days':
    default:
      if (includeBreakdown && days >= 7) {
        if (days >= 30) {
          return `${days} يوم (${months} شهر و ${remainingDays} يوم)`
        } else {
          return `${days} يوم (${weeks} أسبوع و ${remainingDaysAfterWeeks} يوم)`
        }
      }
      return `${days} يوم`
  }
}

/**
 * Validate that end date is after start date
 */
export const validateDates = (startDate: string, endDate: string): {
  valid: boolean
  message?: string
} => {
  if (!startDate || !endDate) {
    return { valid: false, message: 'يجب تحديد تاريخ البداية والنهاية' }
  }
  
  const start = parseISO(startDate)
  const end = parseISO(endDate)
  
  if (end <= start) {
    return { valid: false, message: 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية' }
  }
  
  const days = differenceInDays(end, start)
  if (days > 3650) { // More than 10 years
    return { valid: false, message: 'مدة العقد لا يمكن أن تتجاوز 10 سنوات' }
  }
  
  return { valid: true }
}
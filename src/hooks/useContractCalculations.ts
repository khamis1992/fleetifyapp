import { useMemo } from 'react'

export interface ContractCalculation {
  totalAmount: number
  monthlyAmount: number
  periodAmount: number
  periodType: 'daily' | 'weekly' | 'monthly'
  dailyRate: number
  weeklyRate: number
  monthlyRate: number
  bestRateType: 'daily' | 'weekly' | 'monthly' | 'mixed'
  isCustomAmount: boolean
  customAmount?: number
  breakdown: {
    baseAmount: number
    rateType: string
    period: number
    savings?: number
    minimumPriceEnforced?: boolean
    originalAmount?: number
    isCustom?: boolean
    mixedDetails?: {
      months: number
      weeks: number
      remainingDays: number
      monthlyPortion: number
      weeklyPortion: number
      dailyPortion: number
      combination: string
    }
  }
}

export interface Vehicle {
  id: string
  daily_rate?: number
  weekly_rate?: number
  monthly_rate?: number
  deposit_amount?: number
  minimum_rental_price?: number
  minimum_daily_rate?: number
  minimum_weekly_rate?: number
  minimum_monthly_rate?: number
  enforce_minimum_price?: boolean
}

export const useContractCalculations = (
  vehicle: Vehicle | null,
  contractType: string,
  rentalDays: number,
  customAmount?: number
) => {
  const calculations = useMemo((): ContractCalculation | null => {
    // If custom amount is provided, use it instead of calculated rates
    if (customAmount && customAmount > 0) {
      console.log("💰 [CONTRACT_CALCULATIONS] Using custom amount:", customAmount)
      
      const dailyRate = Number(vehicle?.daily_rate) || 0
      const weeklyRate = Number(vehicle?.weekly_rate) || 0
      const monthlyRate = Number(vehicle?.monthly_rate) || 0
      
      const periodType = getPeriodType(rentalDays)
      const periodAmount = getPeriodAmount('daily', customAmount, rentalDays)
      const monthlyAmount = rentalDays >= 30 ? customAmount / Math.ceil(rentalDays / 30) : 0
      
      return {
        totalAmount: customAmount,
        monthlyAmount,
        periodAmount,
        periodType,
        dailyRate,
        weeklyRate,
        monthlyRate,
        bestRateType: 'daily',
        isCustomAmount: true,
        customAmount,
        breakdown: {
          baseAmount: customAmount,
          rateType: 'مبلغ مخصص',
          period: rentalDays,
          isCustom: true
        }
      }
    }
    console.log("💰 [CONTRACT_CALCULATIONS] Calculating for:", {
      vehicle: vehicle ? {
        id: vehicle.id,
        daily_rate: vehicle.daily_rate,
        weekly_rate: vehicle.weekly_rate,
        monthly_rate: vehicle.monthly_rate
      } : null,
      contractType,
      rentalDays
    })

    if (!vehicle || !rentalDays || rentalDays <= 0) {
      console.log("❌ [CONTRACT_CALCULATIONS] Missing required data:", {
        hasVehicle: !!vehicle,
        rentalDays,
        vehicleDetails: vehicle ? {
          id: vehicle.id,
          daily_rate: vehicle.daily_rate,
          weekly_rate: vehicle.weekly_rate,
          monthly_rate: vehicle.monthly_rate
        } : null
      })
      return null
    }

    const dailyRate = Number(vehicle.daily_rate) || 0
    const weeklyRate = Number(vehicle.weekly_rate) || 0
    const monthlyRate = Number(vehicle.monthly_rate) || 0

    console.log("💰 [CONTRACT_CALCULATIONS] Parsed rates:", {
      dailyRate,
      weeklyRate,
      monthlyRate
    })

    // Calculate total cost for each rate type
    const dailyTotal = dailyRate * rentalDays
    const weeklyTotal = weeklyRate * Math.ceil(rentalDays / 7)
    const monthlyTotal = monthlyRate * Math.ceil(rentalDays / 30)
    
    // Calculate optimized mixed pricing with months, weeks, and days
    const optimizedMixedTotal = calculateOptimizedMixedPricing(rentalDays, monthlyRate, weeklyRate, dailyRate)

    // Find the most cost-effective rate
    const rates = [
      { type: 'daily' as const, total: dailyTotal, available: dailyRate > 0 },
      { type: 'weekly' as const, total: weeklyTotal, available: weeklyRate > 0 },
      { type: 'monthly' as const, total: monthlyTotal, available: monthlyRate > 0 },
      { type: 'mixed' as const, total: optimizedMixedTotal.total, available: (monthlyRate > 0 || weeklyRate > 0) && dailyRate > 0 }
    ].filter(rate => rate.available && rate.total > 0)

    if (rates.length === 0) {
      console.warn("⚠️ [CONTRACT_CALCULATIONS] No rates available for vehicle")
      return {
        totalAmount: 0,
        monthlyAmount: 0,
        periodAmount: 0,
        periodType: 'daily' as const,
        dailyRate,
        weeklyRate,
        monthlyRate,
        bestRateType: 'daily',
        isCustomAmount: false,
        breakdown: {
          baseAmount: 0,
          rateType: 'غير متوفر',
          period: rentalDays
        }
      }
    }

    // Find the best rate (lowest total cost)
    let bestRate = rates.reduce((best, current) => 
      current.total < best.total ? current : best
    )
    
    // Get optimized mixed pricing details for breakdown
    const mixedDetails = bestRate.type === 'mixed' ? optimizedMixedTotal : null

    // Apply minimum rental price enforcement if enabled
    const getMinimumForRateType = (rateType: string) => {
      switch (rateType) {
        case 'daily':
          return Number(vehicle.minimum_daily_rate) || Number(vehicle.minimum_rental_price) || 0
        case 'weekly':
          return Number(vehicle.minimum_weekly_rate) || Number(vehicle.minimum_rental_price) || 0
        case 'monthly':
        case 'mixed':
          return Number(vehicle.minimum_monthly_rate) || Number(vehicle.minimum_rental_price) || 0
        default:
          return Number(vehicle.minimum_rental_price) || 0
      }
    }
    
    const minimumPrice = getMinimumForRateType(bestRate.type)
    const enforceMinimum = vehicle.enforce_minimum_price || false
    const originalTotal = bestRate.total
    let minimumPriceEnforced = false
    
    if (enforceMinimum && minimumPrice > 0 && bestRate.total < minimumPrice) {
      console.log("⚠️ [CONTRACT_CALCULATIONS] Enforcing minimum price:", {
        rateType: bestRate.type,
        originalTotal: bestRate.total,
        minimumPrice,
        difference: minimumPrice - bestRate.total
      })
      
      bestRate = {
        ...bestRate,
        total: minimumPrice
      }
      minimumPriceEnforced = true
    }

    // Calculate monthly amount for long-term contracts (only if 30+ days)
    const monthlyAmount = rentalDays >= 30 
      ? bestRate.total / Math.ceil(rentalDays / 30)
      : 0

    // Calculate period-specific amount based on contract duration
    const periodAmount = getPeriodAmount(bestRate.type, bestRate.total, rentalDays)
    const periodType = getPeriodType(rentalDays)

    // Calculate savings if using the best rate vs daily rate
    const savings = bestRate.type !== 'daily' && dailyTotal > bestRate.total 
      ? dailyTotal - bestRate.total 
      : undefined

    const result = {
      totalAmount: bestRate.total,
      monthlyAmount,
      periodAmount,
      periodType,
      dailyRate,
      weeklyRate,
      monthlyRate,
      bestRateType: bestRate.type,
      isCustomAmount: false,
      breakdown: {
        baseAmount: bestRate.total,
        rateType: getRateTypeLabel(bestRate.type),
        period: getRatePeriod(bestRate.type, rentalDays),
        savings,
        minimumPriceEnforced,
        originalAmount: minimumPriceEnforced ? originalTotal : undefined,
        mixedDetails: mixedDetails ? {
          months: mixedDetails.months,
          weeks: mixedDetails.weeks,
          remainingDays: mixedDetails.remainingDays,
          monthlyPortion: mixedDetails.monthlyPortion,
          weeklyPortion: mixedDetails.weeklyPortion,
          dailyPortion: mixedDetails.dailyPortion,
          combination: mixedDetails.combination
        } : undefined
      }
    }

    console.log("✅ [CONTRACT_CALCULATIONS] Final result:", result)
    return result
  }, [vehicle, contractType, rentalDays, customAmount])

  return calculations
}

export function getRateTypeLabel(rateType: 'daily' | 'weekly' | 'monthly' | 'mixed'): string {
  switch (rateType) {
    case 'daily': return 'يومي'
    case 'weekly': return 'أسبوعي'
    case 'monthly': return 'شهري'
    case 'mixed': return 'مختلط محسّن'
    default: return 'غير محدد'
  }
}

function getRatePeriod(rateType: 'daily' | 'weekly' | 'monthly' | 'mixed', rentalDays: number): number {
  switch (rateType) {
    case 'daily': return rentalDays
    case 'weekly': return Math.ceil(rentalDays / 7)
    case 'monthly': return Math.ceil(rentalDays / 30)
    case 'mixed': return rentalDays
    default: return rentalDays
  }
}

function getPeriodType(rentalDays: number): 'daily' | 'weekly' | 'monthly' {
  if (rentalDays >= 30) return 'monthly'
  if (rentalDays >= 7) return 'weekly'
  return 'daily'
}

function getPeriodAmount(rateType: 'daily' | 'weekly' | 'monthly' | 'mixed', totalAmount: number, rentalDays: number): number {
  switch (rateType) {
    case 'daily': return totalAmount / rentalDays
    case 'weekly': return totalAmount / Math.ceil(rentalDays / 7)
    case 'monthly': return totalAmount / Math.ceil(rentalDays / 30)
    case 'mixed': return totalAmount / rentalDays
    default: return totalAmount
  }
}

function calculateOptimizedMixedPricing(
  rentalDays: number, 
  monthlyRate: number, 
  weeklyRate: number, 
  dailyRate: number
) {
  if (rentalDays <= 0 || dailyRate <= 0) {
    return { 
      total: 0, 
      months: 0, 
      weeks: 0, 
      remainingDays: 0, 
      monthlyPortion: 0, 
      weeklyPortion: 0, 
      dailyPortion: 0,
      combination: 'لا يوجد'
    }
  }
  
  // Start with full monthly rates if available and beneficial
  const months = monthlyRate > 0 ? Math.floor(rentalDays / 30) : 0
  let remainingAfterMonths = rentalDays - (months * 30)
  
  let bestCombination = {
    total: monthlyRate > 0 ? months * monthlyRate + remainingAfterMonths * dailyRate : rentalDays * dailyRate,
    months,
    weeks: 0,
    remainingDays: remainingAfterMonths,
    monthlyPortion: monthlyRate > 0 ? months * monthlyRate : 0,
    weeklyPortion: 0,
    dailyPortion: remainingAfterMonths * dailyRate,
    combination: months > 0 ? `${months} شهر + ${remainingAfterMonths} يوم` : `${rentalDays} يوم`
  }
  
  // If we have weekly rates and remaining days after months, check if weeks are better
  if (weeklyRate > 0 && remainingAfterMonths >= 7) {
    const weeks = Math.floor(remainingAfterMonths / 7)
    const finalRemainingDays = remainingAfterMonths % 7
    
    // Compare: weeks + days vs all days for the remaining period
    const weeklyDailyOption = weeks * weeklyRate + finalRemainingDays * dailyRate
    const allDailyOption = remainingAfterMonths * dailyRate
    
    if (weeklyDailyOption < allDailyOption) {
      bestCombination = {
        total: bestCombination.monthlyPortion + weeklyDailyOption,
        months,
        weeks,
        remainingDays: finalRemainingDays,
        monthlyPortion: bestCombination.monthlyPortion,
        weeklyPortion: weeks * weeklyRate,
        dailyPortion: finalRemainingDays * dailyRate,
        combination: getCombinationLabel(months, weeks, finalRemainingDays)
      }
    }
  }
  
  // For cases with no monthly rate, check if weekly is better than daily for the full period
  if (monthlyRate <= 0 && weeklyRate > 0 && rentalDays >= 7) {
    const fullWeeks = Math.floor(rentalDays / 7)
    const finalDays = rentalDays % 7
    const weeklyOnlyTotal = fullWeeks * weeklyRate + finalDays * dailyRate
    
    if (weeklyOnlyTotal < bestCombination.total) {
      bestCombination = {
        total: weeklyOnlyTotal,
        months: 0,
        weeks: fullWeeks,
        remainingDays: finalDays,
        monthlyPortion: 0,
        weeklyPortion: fullWeeks * weeklyRate,
        dailyPortion: finalDays * dailyRate,
        combination: getCombinationLabel(0, fullWeeks, finalDays)
      }
    }
  }
  
  return bestCombination
}

function getCombinationLabel(months: number, weeks: number, days: number): string {
  const parts = []
  if (months > 0) parts.push(`${months} شهر`)
  if (weeks > 0) parts.push(`${weeks} أسبوع`)
  if (days > 0) parts.push(`${days} يوم`)
  return parts.join(' + ') || 'لا يوجد'
}

function getPeriodLabel(periodType: 'daily' | 'weekly' | 'monthly'): string {
  switch (periodType) {
    case 'daily': return 'المبلغ اليومي'
    case 'weekly': return 'المبلغ الأسبوعي'
    case 'monthly': return 'المبلغ الشهري'
    default: return 'المبلغ'
  }
}
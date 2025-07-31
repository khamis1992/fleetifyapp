import { useMemo } from 'react'

export interface ContractCalculation {
  totalAmount: number
  monthlyAmount: number
  dailyRate: number
  weeklyRate: number
  monthlyRate: number
  bestRateType: 'daily' | 'weekly' | 'monthly'
  breakdown: {
    baseAmount: number
    rateType: string
    period: number
    savings?: number
  }
}

export interface Vehicle {
  id: string
  daily_rate?: number
  weekly_rate?: number
  monthly_rate?: number
  deposit_amount?: number
}

export const useContractCalculations = (
  vehicle: Vehicle | null,
  contractType: string,
  rentalDays: number
) => {
  const calculations = useMemo((): ContractCalculation | null => {
    if (!vehicle || !rentalDays || rentalDays <= 0) return null

    const dailyRate = vehicle.daily_rate || 0
    const weeklyRate = vehicle.weekly_rate || 0
    const monthlyRate = vehicle.monthly_rate || 0

    // Calculate total cost for each rate type
    const dailyTotal = dailyRate * rentalDays
    const weeklyTotal = weeklyRate * Math.ceil(rentalDays / 7)
    const monthlyTotal = monthlyRate * Math.ceil(rentalDays / 30)

    // Find the most cost-effective rate
    const rates = [
      { type: 'daily' as const, total: dailyTotal, available: dailyRate > 0 },
      { type: 'weekly' as const, total: weeklyTotal, available: weeklyRate > 0 },
      { type: 'monthly' as const, total: monthlyTotal, available: monthlyRate > 0 }
    ].filter(rate => rate.available && rate.total > 0)

    if (rates.length === 0) {
      return {
        totalAmount: 0,
        monthlyAmount: 0,
        dailyRate,
        weeklyRate,
        monthlyRate,
        bestRateType: 'daily',
        breakdown: {
          baseAmount: 0,
          rateType: 'غير متوفر',
          period: rentalDays
        }
      }
    }

    // Find the best rate (lowest total cost)
    const bestRate = rates.reduce((best, current) => 
      current.total < best.total ? current : best
    )

    // Calculate monthly amount for long-term contracts
    const monthlyAmount = rentalDays >= 30 
      ? bestRate.total / Math.ceil(rentalDays / 30)
      : bestRate.total

    // Calculate savings if using the best rate vs daily rate
    const savings = bestRate.type !== 'daily' && dailyTotal > bestRate.total 
      ? dailyTotal - bestRate.total 
      : undefined

    return {
      totalAmount: bestRate.total,
      monthlyAmount,
      dailyRate,
      weeklyRate,
      monthlyRate,
      bestRateType: bestRate.type,
      breakdown: {
        baseAmount: bestRate.total,
        rateType: getRateTypeLabel(bestRate.type),
        period: getRatePeriod(bestRate.type, rentalDays),
        savings
      }
    }
  }, [vehicle, contractType, rentalDays])

  return calculations
}

function getRateTypeLabel(rateType: 'daily' | 'weekly' | 'monthly'): string {
  switch (rateType) {
    case 'daily': return 'يومي'
    case 'weekly': return 'أسبوعي'
    case 'monthly': return 'شهري'
    default: return 'غير محدد'
  }
}

function getRatePeriod(rateType: 'daily' | 'weekly' | 'monthly', rentalDays: number): number {
  switch (rateType) {
    case 'daily': return rentalDays
    case 'weekly': return Math.ceil(rentalDays / 7)
    case 'monthly': return Math.ceil(rentalDays / 30)
    default: return rentalDays
  }
}
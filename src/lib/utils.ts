import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAccountNameTranslation } from "./accountNamesTranslation"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = "KWD"): string {
  return new Intl.NumberFormat('ar-KW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(amount)
}

export function translateAccountName(accountName: string): string {
  return getAccountNameTranslation(accountName)
}

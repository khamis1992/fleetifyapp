import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getAccountNameTranslation } from "./accountNamesTranslation"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function translateAccountName(accountName: string): string {
  return getAccountNameTranslation(accountName)
}

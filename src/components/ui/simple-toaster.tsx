import * as React from "react"

export function SimpleToaster() {
  return null
}

export const useToast = () => {
  return {
    toast: (options: any) => console.log('Toast:', options),
    toasts: []
  }
}
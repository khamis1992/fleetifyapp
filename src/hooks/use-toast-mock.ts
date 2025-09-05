// Temporary mock to prevent React null errors
export const useToast = () => {
  return {
    toast: (options: any) => {
      console.log('Toast (disabled):', options);
    },
    toasts: []
  };
};

export const toast = (options: any) => {
  console.log('Toast (disabled):', options);
};
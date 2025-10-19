// Temporary mock to prevent React null errors
export const useToast = () => {
  return {
    toast: (options: unknown) => {
      console.log('Toast (disabled):', options);
    },
    toasts: []
  };
};

export const toast = (options: unknown) => {
  console.log('Toast (disabled):', options);
};
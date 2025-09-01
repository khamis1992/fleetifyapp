// Temporary stub for performance optimization
export const usePerformanceOptimization = () => {
  return {
    measureRenderTime: () => () => {},
    getOptimizedImageSrc: (src: string) => src
  };
};
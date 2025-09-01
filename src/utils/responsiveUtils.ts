// Responsive configuration utilities - no longer importing BreakpointKey as it's not used

// Responsive configuration utilities
export const ResponsiveConfig = {
  // Content priorities by device
  contentPriority: {
    mobile: ['critical', 'important'],
    tablet: ['critical', 'important', 'secondary'],
    desktop: ['critical', 'important', 'secondary', 'optional']
  },

  // Component rendering strategies
  componentStrategies: {
    tables: {
      mobile: 'cards',
      tablet: 'scroll',
      desktop: 'full'
    },
    navigation: {
      mobile: 'bottom-tabs',
      tablet: 'sidebar-collapse',
      desktop: 'fixed-sidebar'
    },
    forms: {
      mobile: 'single-column',
      tablet: 'two-column',
      desktop: 'multi-column'
    },
    dashboards: {
      mobile: 'single-column',
      tablet: 'grid-2x2',
      desktop: 'grid-3x3'
    },
    modals: {
      mobile: 'fullscreen',
      tablet: 'standard',
      desktop: 'large'
    }
  },

  // Touch target sizes
  touchTargets: {
    minimum: '44px',
    recommended: '48px',
    comfortable: '56px'
  },

  // Animation preferences
  animations: {
    mobile: 'reduced',
    tablet: 'standard',
    desktop: 'enhanced'
  }
} as const

// Responsive class name generators
export class ResponsiveClassGenerator {
  static spacing(device: 'mobile' | 'tablet' | 'desktop'): string {
    const spacingMap = {
      mobile: 'p-2 gap-2',
      tablet: 'p-4 gap-4', 
      desktop: 'p-6 gap-6'
    }
    return spacingMap[device]
  }

  static typography(device: 'mobile' | 'tablet' | 'desktop'): string {
    const typeMap = {
      mobile: 'text-sm leading-relaxed',
      tablet: 'text-base leading-relaxed',
      desktop: 'text-base leading-normal'
    }
    return typeMap[device]
  }

  static grid(columns: number): string {
    return `grid grid-cols-1 md:grid-cols-${Math.min(columns, 2)} lg:grid-cols-${columns}`
  }

  static flexLayout(device: 'mobile' | 'tablet' | 'desktop'): string {
    const flexMap = {
      mobile: 'flex flex-col space-y-2',
      tablet: 'flex flex-col md:flex-row md:space-x-4 md:space-y-0',
      desktop: 'flex flex-row space-x-6'
    }
    return flexMap[device]
  }

  static container(device: 'mobile' | 'tablet' | 'desktop'): string {
    const containerMap = {
      mobile: 'w-full px-2',
      tablet: 'w-full max-w-4xl mx-auto px-4',
      desktop: 'w-full max-w-7xl mx-auto px-6'
    }
    return containerMap[device]
  }

  static touchTarget(): string {
    return 'min-h-[44px] min-w-[44px] flex items-center justify-center'
  }

  static adaptiveText(baseSize: string): string {
    const sizeMap: Record<string, string> = {
      'xs': 'text-xs sm:text-sm md:text-base',
      'sm': 'text-sm sm:text-base md:text-lg',
      'base': 'text-base sm:text-lg md:text-xl',
      'lg': 'text-lg sm:text-xl md:text-2xl',
      'xl': 'text-xl sm:text-2xl md:text-3xl'
    }
    return sizeMap[baseSize] || baseSize
  }
}

// Responsive component props helper
export function getResponsiveProps(deviceType: 'mobile' | 'tablet' | 'desktop') {
  return {
    spacing: ResponsiveClassGenerator.spacing(deviceType),
    typography: ResponsiveClassGenerator.typography(deviceType),
    container: ResponsiveClassGenerator.container(deviceType),
    flexLayout: ResponsiveClassGenerator.flexLayout(deviceType),
    touchTarget: ResponsiveClassGenerator.touchTarget(),
    
    // Component-specific props
    cardProps: {
      mobile: {
        className: 'w-full rounded-lg shadow-sm border p-3',
        size: 'sm'
      },
      tablet: {
        className: 'w-full rounded-lg shadow-md border p-4',
        size: 'md'
      },
      desktop: {
        className: 'w-full rounded-lg shadow-lg border p-6',
        size: 'lg'
      }
    }[deviceType],

    buttonProps: {
      mobile: {
        size: 'lg',
        className: 'w-full min-h-[44px] text-base font-medium'
      },
      tablet: {
        size: 'default',
        className: 'min-h-[40px] px-6 text-sm font-medium'
      },
      desktop: {
        size: 'default',
        className: 'min-h-[36px] px-4 text-sm font-medium'
      }
    }[deviceType],

    inputProps: {
      mobile: {
        size: 'lg',
        className: 'min-h-[44px] text-base px-3'
      },
      tablet: {
        size: 'default',
        className: 'min-h-[40px] text-sm px-3'
      },
      desktop: {
        size: 'default',
        className: 'min-h-[36px] text-sm px-3'
      }
    }[deviceType]
  }
}

// Content adaptation helpers
export function adaptContentForDevice(
  content: Record<string, any>,
  deviceType: 'mobile' | 'tablet' | 'desktop'
) {
  const priorities = ResponsiveConfig.contentPriority[deviceType]
  
  return Object.entries(content)
    .filter(([key, value]) => {
      // Show content based on priority
      if (value?.priority && !priorities.includes(value.priority)) {
        return false
      }
      return true
    })
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {} as Record<string, any>)
}

// Performance helpers
export function getOptimalImageSrc(
  baseSrc: string,
  deviceType: 'mobile' | 'tablet' | 'desktop'
): string {
  const qualityMap = {
    mobile: 'q_60,w_400',
    tablet: 'q_75,w_800',
    desktop: 'q_90,w_1200'
  }
  
  // Assuming Cloudinary or similar service
  if (baseSrc.includes('cloudinary')) {
    return baseSrc.replace('/upload/', `/upload/${qualityMap[deviceType]}/`)
  }
  
  return baseSrc
}

export function shouldLazyLoad(deviceType: 'mobile' | 'tablet' | 'desktop'): boolean {
  // More aggressive lazy loading on mobile
  return deviceType === 'mobile'
}

// Layout calculation helpers
export function calculateOptimalLayout(
  itemCount: number,
  deviceType: 'mobile' | 'tablet' | 'desktop'
): { columns: number; rows: number; itemsPerPage: number } {
  const layoutConfigs = {
    mobile: { maxColumns: 1, itemsPerPage: 10 },
    tablet: { maxColumns: 2, itemsPerPage: 20 },
    desktop: { maxColumns: 4, itemsPerPage: 40 }
  }
  
  const config = layoutConfigs[deviceType]
  const columns = Math.min(config.maxColumns, itemCount)
  const itemsPerPage = config.itemsPerPage
  const rows = Math.ceil(Math.min(itemCount, itemsPerPage) / columns)
  
  return { columns, rows, itemsPerPage }
}

// Responsive animation configuration
export function getAnimationConfig(deviceType: 'mobile' | 'tablet' | 'desktop') {
  const animationConfigs = {
    mobile: {
      duration: 'duration-200',
      easing: 'ease-out',
      reduce: true
    },
    tablet: {
      duration: 'duration-300',
      easing: 'ease-in-out',
      reduce: false
    },
    desktop: {
      duration: 'duration-300',
      easing: 'ease-in-out',
      reduce: false
    }
  }
  
  return animationConfigs[deviceType]
}
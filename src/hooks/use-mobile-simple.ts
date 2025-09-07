import React from 'react'

export interface SimpleBreakpoint {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

export function useSimpleBreakpoint(): SimpleBreakpoint {
  console.log('🔍 [DEBUG] useSimpleBreakpoint called')
  
  // Add debug logging to see if React hooks are accessible
  try {
    console.log('🔍 [DEBUG] useState available:', typeof React.useState)
    
    const [breakpoint, setBreakpoint] = React.useState<SimpleBreakpoint>({
      isMobile: true,
      isTablet: false,
      isDesktop: false
    })

    console.log('🔍 [DEBUG] useState successful, current breakpoint:', breakpoint)

    React.useEffect(() => {
      console.log('🔍 [DEBUG] useEffect called')
      const updateBreakpoint = () => {
        const width = window.innerWidth
        console.log('🔍 [DEBUG] Window width:', width)
        
        setBreakpoint({
          isMobile: width < 768,
          isTablet: width >= 768 && width < 1024,
          isDesktop: width >= 1024
        })
      }

      updateBreakpoint()
      window.addEventListener('resize', updateBreakpoint)
      return () => window.removeEventListener('resize', updateBreakpoint)
    }, [])

    return breakpoint
  } catch (error) {
    console.error('🚨 [DEBUG] Error in useSimpleBreakpoint:', error)
    return {
      isMobile: true,
      isTablet: false,
      isDesktop: false
    }
  }
}
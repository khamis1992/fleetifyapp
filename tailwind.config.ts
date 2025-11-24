import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: '1rem',
				xs: '0.5rem',
				sm: '1rem',
				md: '1.5rem',
				lg: '2rem',
				xl: '2rem',
				'2xl': '2rem'
			},
			screens: {
				xs: '320px',
				sm: '640px',
				md: '768px',
				lg: '1024px',
				xl: '1280px',
				'2xl': '1536px'
			}
		},
		screens: {
			xs: '320px',
			sm: '640px',
			md: '768px',
			lg: '1024px',
			xl: '1280px',
			'2xl': '1536px',
			// Additional mobile-specific breakpoints
			'mobile-sm': '375px', // iPhone SE
			'mobile-md': '414px', // iPhone 11 Pro
			'mobile-lg': '428px', // iPhone 12 Pro Max
			'tablet-sm': '768px', // iPad Mini
			'tablet-md': '834px', // iPad Air
			'tablet-lg': '1024px', // iPad Pro
			'desktop-sm': '1280px',
			'desktop-md': '1440px',
			'desktop-lg': '1920px'
		},
		extend: {
			fontFamily: {
				cairo: ['Cairo', 'sans-serif'],
				tajawal: ['Tajawal', 'sans-serif'],
				amiri: ['Amiri', 'serif'],
				'noto-kufi': ['Noto Kufi Arabic', 'sans-serif'],
				'reem-kufi': ['Reem Kufi', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: {
					DEFAULT: 'hsl(var(--input))',
					border: 'hsl(var(--input-border))',
					focus: 'hsl(var(--input-focus))'
				},
				ring: 'hsl(var(--ring))',
				background: {
					DEFAULT: 'hsl(var(--background))',
					soft: 'hsl(var(--background-soft))'
				},
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					light: 'hsl(var(--primary-light))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					dark: 'hsl(var(--secondary-dark))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					light: 'hsl(var(--accent-light))',
					muted: 'hsl(var(--accent-muted))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))',
					hover: 'hsl(var(--card-hover))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				// Mobile-specific colors
				mobile: {
					navbar: 'hsl(var(--mobile-navbar, var(--background)))',
					tab: 'hsl(var(--mobile-tab, var(--card)))',
					tabActive: 'hsl(var(--mobile-tab-active, var(--primary)))',
					overlay: 'hsl(var(--mobile-overlay, 0 0% 0% / 0.8))',
					touch: 'hsl(var(--mobile-touch, var(--accent)))'
				},
			// Touch-friendly sizes
			touch: {
				target: 'hsl(var(--touch-target, var(--primary)))',
				active: 'hsl(var(--touch-active, var(--primary-light)))',
				ghost: 'hsl(var(--touch-ghost, var(--accent)))'
			},
			// Responsive state colors
			responsive: {
				highlight: 'hsl(var(--responsive-highlight, var(--primary)))',
				surface: 'hsl(var(--responsive-surface, var(--card)))',
				interactive: 'hsl(var(--responsive-interactive, var(--accent)))'
			}
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			// Mobile-specific spacing
			spacing: {
				'touch': '44px', // Minimum touch target size
				'touch-lg': '48px', // Larger touch target
				'touch-xl': '56px', // Extra large touch target
				'mobile-safe-top': 'env(safe-area-inset-top)',
				'mobile-safe-bottom': 'env(safe-area-inset-bottom)',
				'mobile-safe-left': 'env(safe-area-inset-left)',
				'mobile-safe-right': 'env(safe-area-inset-right)',
				'mobile-header': '60px',
				'mobile-bottom-nav': '68px',
				'mobile-tab-height': '56px',
				'sidebar-mobile': '280px',
				'sidebar-tablet': '320px',
				'sidebar-desktop': '360px',
				'content-mobile': 'calc(100vw - 2rem)',
				'content-tablet': 'calc(100vw - 4rem)',
				'content-desktop': 'calc(100vw - 6rem)'
			},
			// Mobile-optimized sizes
			minHeight: {
				'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
				'mobile-content': 'calc(100vh - 60px - 68px)', // Header + bottom nav
				'touch': '44px'
			},
			maxWidth: {
				'mobile': '100vw',
				'mobile-content': 'calc(100vw - 2rem)'
			},
			fontSize: {
				'mobile-xs': ['0.75rem', { lineHeight: '1rem' }],
				'mobile-sm': ['0.875rem', { lineHeight: '1.25rem' }],
				'mobile-base': ['1rem', { lineHeight: '1.5rem' }],
				'mobile-lg': ['1.125rem', { lineHeight: '1.75rem' }],
				'mobile-xl': ['1.25rem', { lineHeight: '1.75rem' }]
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'scale-in': {
					'0%': {
						transform: 'scale(0.95)',
						opacity: '0'
					},
					'100%': {
						transform: 'scale(1)',
						opacity: '1'
					}
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-5px)' }
				},
				'slide-up': {
					'0%': { transform: 'translateY(20px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'bubble-in': {
					'0%': { transform: 'scale(0.8) translateY(10px)', opacity: '0' },
					'50%': { transform: 'scale(1.05) translateY(-2px)', opacity: '0.8' },
					'100%': { transform: 'scale(1) translateY(0)', opacity: '1' }
				},
				'typing': {
					'0%, 60%': { transform: 'scale(1)', opacity: '1' },
					'30%': { transform: 'scale(1.2)', opacity: '0.7' }
				},
				'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 5px rgba(var(--primary), 0.2)' },
					'50%': { boxShadow: '0 0 20px rgba(var(--primary), 0.6)' }
				},
				// Mobile-specific animations
				'slide-in-bottom': {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'slide-out-bottom': {
					'0%': { transform: 'translateY(0)', opacity: '1' },
					'100%': { transform: 'translateY(100%)', opacity: '0' }
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				'slide-out-right': {
					'0%': { transform: 'translateX(0)', opacity: '1' },
					'100%': { transform: 'translateX(100%)', opacity: '0' }
				},
				'mobile-bounce': {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(0.95)' },
					'100%': { transform: 'scale(1)' }
				},
				'swipe-reveal': {
					'0%': { transform: 'translateX(-100%)', opacity: '0' },
					'100%': { transform: 'translateX(0)', opacity: '1' }
				},
				'tab-switch': {
					'0%': { opacity: '0', transform: 'scale(0.9)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'float': 'float 3s ease-in-out infinite',
				'slide-up': 'slide-up 0.4s ease-out',
				'bubble-in': 'bubble-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
				'typing': 'typing 1.5s ease-in-out infinite',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				// Mobile-specific animations
				'slide-in-bottom': 'slide-in-bottom 0.3s ease-out',
				'slide-out-bottom': 'slide-out-bottom 0.3s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'slide-out-right': 'slide-out-right 0.3s ease-out',
				'mobile-bounce': 'mobile-bounce 0.15s ease-in-out',
				'swipe-reveal': 'swipe-reveal 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				'tab-switch': 'tab-switch 0.2s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;

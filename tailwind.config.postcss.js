/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {},
    screens: {
      'xs': '475px',
    },
  },
  plugins: [
    // Keep only the plugins you actually use
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    // Comment out plugins you don't use to reduce bundle size
    // require('@tailwindcss/aspect-ratio'),
    // require('@tailwindcss/container-queries'),
  ],
  // PurgeCSS configuration
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: [
      './src/**/*.{js,ts,jsx,tsx}',
      './index.html',
    ],
    options: {
      safelist: [
        // Keep dynamic classes that might be generated
        /^bg-/,
        /^text-/,
        /^border-/,
        /^p-/,
        /^m-/,
        /^w-/,
        /^h-/,
        /^flex/,
        /^grid/,
        /^block/,
        /^hidden/,
        // Keep specific RTL classes
        'text-right',
        'ml-2',
        'mr-2',
        'pl-2',
        'pr-2',
        // Keep animation classes
        'animate-spin',
        'animate-pulse',
        'animate-bounce',
      ],
    },
  },
}
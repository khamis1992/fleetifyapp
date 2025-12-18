module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
    // Only enable purgecss in production
    ...(process.env.NODE_ENV === 'production' && {
      '@fullhuman/postcss-purgecss': {
        content: [
          './src/**/*.{js,jsx,ts,tsx}',
          './index.html',
        ],
        defaultExtractor: (content) => {
          const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
          const innerMatches = content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
          return broadMatches.concat(innerMatches);
        },
        safelist: [
          // Keep RTL specific classes
          /^text-right/,
          /^ml-/,
          /^mr-/,
          /^pl-/,
          /^pr-/,
          // Keep dynamic utility classes
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
          // Keep important animation classes
          'animate-spin',
          'animate-pulse',
          'animate-bounce',
        ],
      },
    }),
  },
}

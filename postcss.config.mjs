import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import purgecss from '@fullhuman/postcss-purgecss';

export default {
  plugins: [
    tailwindcss,
    autoprefixer,
    process.env.NODE_ENV === 'production' ? purgecss.default({
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
    }) : false,
  ],
}
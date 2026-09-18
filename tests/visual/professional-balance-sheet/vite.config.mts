import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

const repository = process.cwd();
const fixture = path.join(repository, 'tests/visual/professional-balance-sheet');

export default defineConfig({
  root: fixture,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4193, strictPort: true, fs: { allow: [repository] } },
  resolve: { alias: [
    ...[
      'hooks/useTranslation', 'hooks/useUnifiedCompanyAccess', 'hooks/finance/useProfessionalBalanceSheet',
      'services/financialReporting', 'integrations/supabase/client',
    ].map(name => ({ find: `@/${name}`, replacement: path.join(fixture, 'fixture.ts') })),
    { find: '@', replacement: path.join(repository, 'src') },
    { find: /^react$/, replacement: path.join(repository, 'node_modules/react/index.js') },
  ] },
});

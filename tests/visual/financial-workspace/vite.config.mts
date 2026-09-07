import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

const root = process.cwd();
const fixture = path.join(root, 'tests/visual/financial-workspace');
export default defineConfig({
  root: fixture,
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4191, strictPort: true, fs: { allow: [root] } },
  resolve: { alias: [
    ...['hooks/useCurrencyFormatter', 'hooks/useTranslation', 'hooks/finance/useFinancialWorkspace', 'services/financialReporting',
      'hooks/useAccountMappings','hooks/useChartOfAccounts','hooks/useUnifiedCompanyAccess']
      .map(name => ({ find: `@/${name}`, replacement: path.join(fixture, 'fixture.ts') })),
    { find: '@', replacement: path.join(root, 'src') },
    { find: /^react$/, replacement: path.join(root, 'node_modules/react/index.js') },
  ] },
});

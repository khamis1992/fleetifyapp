import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

const repository = process.cwd();
export default defineConfig({
  root: path.join(repository, 'tests/visual/financial-statement-package'),
  plugins: [react()],
  server: { host: '127.0.0.1', port: 4194, strictPort: true, fs: { allow: [repository] } },
  resolve: { alias: [
    ...['hooks/useTranslation', 'hooks/useUnifiedCompanyAccess', 'hooks/finance/useFinancialStatementPackage', 'services/financialStatementPackage', 'services/financialReporting'].map(name => ({ find: `@/${name}`, replacement: path.join(repository, 'tests/visual/financial-statement-package/fixtureHooks.ts') })),
    { find: '@', replacement: path.join(repository, 'src') },
    { find: /^react$/, replacement: path.join(repository, 'node_modules/react/index.js') },
  ] },
});

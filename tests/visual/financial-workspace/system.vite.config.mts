import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';
const root=process.cwd(),fixture=path.join(root,'tests/visual/financial-workspace');
export default defineConfig({root:fixture,plugins:[react(),{name:'system-preview-entry',configureServer(server){server.middlewares.use((req,_res,next)=>{if(req.url?.startsWith('/finance'))req.url='/system.html';next();});}}],server:{host:'127.0.0.1',port:4296,strictPort:true,fs:{allow:[root]}},resolve:{alias:[
  ...['contexts/AuthContext','contexts/CompanyContext','hooks/useUnifiedCompanyAccess','hooks/usePermissionCheck','hooks/usePermissions','hooks/useCompanyCurrency','modules/core/hooks/useModuleConfig','integrations/supabase/client'].map(name=>({find:`@/${name}`,replacement:path.join(fixture,'system-fixture.tsx')})),
  ...['hooks/finance/useFinancialWorkspace','hooks/useAccountMappings','hooks/useChartOfAccounts'].map(name=>({find:`@/${name}`,replacement:path.join(fixture,'fixture.ts')})),
  {find:'@',replacement:path.join(root,'src')},{find:/^react$/,replacement:path.join(root,'node_modules/react/index.js')},
]}});


import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import FinanceWorkspace from '@/components/finance/workspace/FinanceWorkspace';
import { FinanceWorkspaceNav } from '@/components/finance/workspace/FinanceWorkspaceNav';
import '@/index.css';
import { AccountMappingSettings } from '@/components/finance/AccountMappingSettings';
import { CollectionPreview } from './CollectionPreview';

createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter>
  <div style={{maxWidth:1500,margin:'auto'}}><FinanceWorkspaceNav />{window.location.pathname==='/finance/account-mappings'
    ? <div className="p-4"><AccountMappingSettings /></div> : window.location.pathname==='/finance/collections-preview'
    ? <CollectionPreview /> : <FinanceWorkspace />}</div>
</BrowserRouter></React.StrictMode>);

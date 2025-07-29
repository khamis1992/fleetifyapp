import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Position,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building, TrendingUp, PieChart, DollarSign, Calculator, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { ChartOfAccount } from '@/hooks/useChartOfAccounts';

interface ChartOfAccountsMindMapProps {
  accounts: ChartOfAccount[];
  onAccountSelect?: (account: ChartOfAccount) => void;
}

const getAccountTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'assets':
    case 'الأصول':
      return '🏢';
    case 'liabilities':
    case 'الخصوم':
      return '📈';
    case 'equity':
    case 'حقوق الملكية':
      return '🥧';
    case 'revenue':
    case 'الإيرادات':
      return '💰';
    case 'expenses':
    case 'المصروفات':
      return '🧮';
    default:
      return '📊';
  }
};

const getAccountTypeColor = (type: string, level: number) => {
  const baseColors = {
    'assets': '#3b82f6',
    'الأصول': '#3b82f6',
    'liabilities': '#ef4444',
    'الخصوم': '#ef4444',
    'equity': '#8b5cf6',
    'حقوق الملكية': '#8b5cf6',
    'revenue': '#10b981',
    'الإيرادات': '#10b981',
    'expenses': '#f59e0b',
    'المصروفات': '#f59e0b',
  };
  
  const baseColor = baseColors[type.toLowerCase()] || '#6b7280';
  const opacity = Math.max(0.3, 1 - (level - 1) * 0.15);
  return `${baseColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
};

const CustomNode = ({ data }: { data: any }) => {
  const account = data.account as ChartOfAccount;
  const isHeader = account.is_header;
  const level = account.account_level || 1;
  const backgroundColor = getAccountTypeColor(account.account_type, level);
  
  return (
    <div 
      className={`
        px-3 py-2 rounded-lg border-2 bg-background shadow-md transition-all duration-200
        ${isHeader ? 'border-primary' : 'border-muted'}
        hover:shadow-lg hover:scale-105 cursor-pointer
      `}
      style={{ borderColor: backgroundColor }}
      onClick={() => data.onSelect?.(account)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg">{getAccountTypeIcon(account.account_type)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="font-mono text-xs text-muted-foreground">
              {account.account_code}
            </span>
            {isHeader && (
              <Badge variant="secondary" className="text-xs px-1 py-0">
                Header
              </Badge>
            )}
          </div>
          <div className="font-medium text-sm truncate" title={account.account_name}>
            {account.account_name}
          </div>
          {account.current_balance !== 0 && (
            <div className="text-xs text-muted-foreground">
              {formatCurrency(account.current_balance || 0)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export const ChartOfAccountsMindMap: React.FC<ChartOfAccountsMindMapProps> = ({
  accounts,
  onAccountSelect,
}) => {
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    
    // Create a map for quick parent lookup
    const accountMap = new Map(accounts.map(acc => [acc.id, acc]));
    
    // Position constants
    const LEVEL_SPACING = 200;
    const NODE_SPACING = 100;
    
    // Group accounts by level
    const accountsByLevel = accounts.reduce((acc, account) => {
      const level = account.account_level || 1;
      if (!acc[level]) acc[level] = [];
      acc[level].push(account);
      return acc;
    }, {} as Record<number, ChartOfAccount[]>);
    
    // Create nodes with positions
    Object.entries(accountsByLevel).forEach(([levelStr, levelAccounts]) => {
      const level = parseInt(levelStr);
      levelAccounts.forEach((account, index) => {
        const x = (level - 1) * LEVEL_SPACING;
        const y = index * NODE_SPACING - (levelAccounts.length * NODE_SPACING) / 2;
        
        nodes.push({
          id: account.id,
          type: 'custom',
          position: { x, y },
          data: {
            account,
            onSelect: onAccountSelect,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });
        
        // Create edge to parent if exists
        if (account.parent_account_id) {
          edges.push({
            id: `${account.parent_account_id}-${account.id}`,
            source: account.parent_account_id,
            target: account.id,
            type: 'smoothstep',
            style: {
              stroke: getAccountTypeColor(account.account_type, level),
              strokeWidth: 2,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: getAccountTypeColor(account.account_type, level),
            },
          });
        }
      });
    });
    
    return { nodes, edges };
  }, [accounts, onAccountSelect]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (onAccountSelect && node.data?.account) {
      onAccountSelect(node.data.account as ChartOfAccount);
    }
  }, [onAccountSelect]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Chart of Accounts Mind Map</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 h-[600px]">
        <div className="h-full w-full border rounded-lg overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            className="bg-muted/10"
          >
            <Background />
            <Controls />
            <MiniMap 
              nodeStrokeColor={(node: any) => getAccountTypeColor(node.data?.account?.account_type || 'default', 1)}
              nodeColor={(node: any) => getAccountTypeColor(node.data?.account?.account_type || 'default', 1)}
              nodeBorderRadius={8}
            />
          </ReactFlow>
        </div>
      </CardContent>
    </Card>
  );
};
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, HardDrive, Shield, Download, Upload, RefreshCw, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const DatabaseManagement: React.FC = () => {
  const { toast } = useToast();
  
  const [dbStats] = useState({
    totalSize: '2.3 GB',
    tableCount: 47,
    indexCount: 126,
    totalRows: '1,234,567',
    lastBackup: '2024-01-15 14:30:00',
    connectionPool: { active: 15, idle: 5, max: 20 },
  });

  const [backups] = useState([
    {
      id: '1',
      name: 'Full Backup - January 15, 2024',
      size: '2.1 GB',
      type: 'Full',
      date: '2024-01-15 14:30:00',
      status: 'completed',
    },
    {
      id: '2',
      name: 'Incremental Backup - January 14, 2024',
      size: '245 MB',
      type: 'Incremental',
      date: '2024-01-14 14:30:00',
      status: 'completed',
    },
    {
      id: '3',
      name: 'Full Backup - January 13, 2024',
      size: '2.0 GB',
      type: 'Full',
      date: '2024-01-13 14:30:00',
      status: 'completed',
    },
  ]);

  const [tables] = useState([
    { name: 'vehicles', rows: 15420, size: '125 MB', lastUpdated: '2024-01-15 10:30' },
    { name: 'invoices', rows: 45678, size: '89 MB', lastUpdated: '2024-01-15 11:45' },
    { name: 'employees', rows: 2340, size: '12 MB', lastUpdated: '2024-01-15 09:15' },
    { name: 'customers', rows: 8765, size: '34 MB', lastUpdated: '2024-01-15 12:20' },
    { name: 'audit_logs', rows: 234567, size: '456 MB', lastUpdated: '2024-01-15 14:30' },
  ]);

  const handleBackup = (type: 'full' | 'incremental') => {
    toast({
      title: "Backup initiated",
      description: `${type} backup has been started. You'll be notified when complete.`,
    });
  };

  const handleRestore = (backupId: string) => {
    toast({
      title: "Restore initiated",
      description: "Database restore has been started. This may take several minutes.",
    });
  };

  const optimizeDatabase = () => {
    toast({
      title: "Database optimization started",
      description: "The system is optimizing database performance. This may take a few minutes.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Database Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-primary" />
              Total Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dbStats.totalSize}</div>
            <p className="text-xs text-muted-foreground">Across {dbStats.tableCount} tables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-primary" />
              Total Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dbStats.totalRows}</div>
            <p className="text-xs text-muted-foreground">{dbStats.indexCount} indexes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Last Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">{dbStats.lastBackup}</div>
            <p className="text-xs text-muted-foreground">Automated daily backup</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-primary" />
              Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-medium">
              {dbStats.connectionPool.active}/{dbStats.connectionPool.max}
            </div>
            <Progress 
              value={(dbStats.connectionPool.active / dbStats.connectionPool.max) * 100} 
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="backups" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="backups">Backups & Recovery</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-6">
          {/* Backup Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                Backup Management
              </CardTitle>
              <CardDescription>
                Create and manage database backups for disaster recovery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <Button onClick={() => handleBackup('full')}>
                  <Download className="h-4 w-4 mr-2" />
                  Full Backup
                </Button>
                <Button variant="outline" onClick={() => handleBackup('incremental')}>
                  <Clock className="h-4 w-4 mr-2" />
                  Incremental Backup
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Recent Backups</h4>
                {backups.map((backup) => (
                  <div key={backup.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <h5 className="font-medium">{backup.name}</h5>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Size: {backup.size}</span>
                        <span>Type: {backup.type}</span>
                        <span>Date: {backup.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={backup.status === 'completed' ? 'default' : 'secondary'}>
                        {backup.status}
                      </Badge>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRestore(backup.id)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          {/* Database Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                Database Maintenance
              </CardTitle>
              <CardDescription>
                Optimize database performance and manage table statistics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button onClick={optimizeDatabase} className="h-20 flex-col">
                  <RefreshCw className="h-6 w-6 mb-2" />
                  Optimize Database
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <Database className="h-6 w-6 mb-2" />
                  Rebuild Indexes
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <HardDrive className="h-6 w-6 mb-2" />
                  Update Statistics
                </Button>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Table Statistics</h4>
                <div className="space-y-2">
                  {tables.map((table) => (
                    <div key={table.name} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex-1">
                        <h5 className="font-medium">{table.name}</h5>
                        <div className="text-sm text-muted-foreground">
                          {table.rows.toLocaleString()} rows • {table.size} • Last updated: {table.lastUpdated}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          {/* Database Monitoring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                Performance Monitoring
              </CardTitle>
              <CardDescription>
                Monitor database performance and resource usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium">Query Performance</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Average Query Time</span>
                      <span className="text-sm font-medium">45ms</span>
                    </div>
                    <Progress value={25} className="h-2" />
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Slow Queries</span>
                      <span className="text-sm font-medium">3</span>
                    </div>
                    <Progress value={15} className="h-2" />
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Cache Hit Rate</span>
                      <span className="text-sm font-medium">98.5%</span>
                    </div>
                    <Progress value={98.5} className="h-2" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Resource Usage</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">CPU Usage</span>
                      <span className="text-sm font-medium">23%</span>
                    </div>
                    <Progress value={23} className="h-2" />
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Memory Usage</span>
                      <span className="text-sm font-medium">67%</span>
                    </div>
                    <Progress value={67} className="h-2" />
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Disk Usage</span>
                      <span className="text-sm font-medium">45%</span>
                    </div>
                    <Progress value={45} className="h-2" />
                  </div>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                View Detailed Performance Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
import React from 'react';
import { BackupManagement } from '@/components/admin/BackupManagement';

/**
 * Database administration is intentionally read-only until privileged backup,
 * restore, and maintenance operations are implemented on a trusted backend.
 */
export const DatabaseManagement: React.FC = () => <BackupManagement />;

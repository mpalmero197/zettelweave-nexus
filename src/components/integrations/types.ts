export type IntegrationCategory = 'productivity' | 'storage' | 'communication' | 'import-export';
export type IntegrationStatus = 'available' | 'connected' | 'coming-soon';
export type IntegrationHealth = 'healthy' | 'degraded' | 'error' | 'unknown';

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: IntegrationCategory;
  status: IntegrationStatus;
  color: string;
  setupType?: 'file-import' | 'oauth' | 'webhook' | 'api-key';
  docsUrl?: string;
}

export interface ConnectionMeta {
  connectedAt: number;
  lastSyncAt?: number;
  itemsSynced?: number;
  health: IntegrationHealth;
  error?: string;
}

export type IntegrationCategory = 'productivity' | 'storage' | 'communication' | 'import-export';
export type IntegrationStatus = 'available' | 'connected' | 'coming-soon';

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji or URL
  category: IntegrationCategory;
  status: IntegrationStatus;
  color: string; // accent color for the card
  setupType?: 'file-import' | 'oauth' | 'webhook' | 'api-key';
}

export interface PendragonPlugin {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  category: 'productivity' | 'writing' | 'utilities' | 'media' | 'data';
  version: string;
  author: string;
  requiresApi: boolean;
  component: React.ComponentType<PluginProps>;
}

export interface PluginProps {
  onClose?: () => void;
}

export interface PluginState {
  enabledPlugins: string[];
  openPlugin: string | null;
}

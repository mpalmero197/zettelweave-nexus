import { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Puzzle, Search, Type, Pen, Volume2, Calculator, BarChart3,
  QrCode, Regex, ArrowLeft, Power, PowerOff, Sparkles, Package
} from 'lucide-react';
import { toast } from 'sonner';
import type { PendragonPlugin } from './types';
import { TextTransformPlugin } from './plugins/TextTransformPlugin';
import { WritingPromptsPlugin } from './plugins/WritingPromptsPlugin';
import { TextToSpeechPlugin } from './plugins/TextToSpeechPlugin';
import { CalculatorPlugin } from './plugins/CalculatorPlugin';
import { WordFrequencyPlugin } from './plugins/WordFrequencyPlugin';
import { QRCodePlugin } from './plugins/QRCodePlugin';
import { RegexTesterPlugin } from './plugins/RegexTesterPlugin';

const STORAGE_KEY = 'pendragonx-enabled-plugins';

const PLUGINS: PendragonPlugin[] = [
  {
    id: 'text-transform',
    name: 'Text Transform',
    description: 'Convert text between cases, sort lines, remove duplicates, slugify, and more.',
    icon: 'Type',
    category: 'utilities',
    version: '1.0.0',
    author: 'Pendragon',
    requiresApi: false,
    component: TextTransformPlugin,
  },
  {
    id: 'writing-prompts',
    name: 'Writing Prompts',
    description: 'Get inspired with curated writing prompts across fiction, poetry, essays, and more.',
    icon: 'Pen',
    category: 'writing',
    version: '1.0.0',
    author: 'Pendragon',
    requiresApi: false,
    component: WritingPromptsPlugin,
  },
  {
    id: 'text-to-speech',
    name: 'Text to Speech',
    description: 'Read any text aloud using your browser\'s built-in speech engine. No API needed.',
    icon: 'Volume2',
    category: 'media',
    version: '1.0.0',
    author: 'Pendragon',
    requiresApi: false,
    component: TextToSpeechPlugin,
  },
  {
    id: 'calculator',
    name: 'Calculator',
    description: 'A clean calculator for quick arithmetic right inside Pendragon.',
    icon: 'Calculator',
    category: 'utilities',
    version: '1.0.0',
    author: 'Pendragon',
    requiresApi: false,
    component: CalculatorPlugin,
  },
  {
    id: 'word-frequency',
    name: 'Word Frequency Analyzer',
    description: 'Analyze word frequency, reading time, and text statistics with visual charts.',
    icon: 'BarChart3',
    category: 'writing',
    version: '1.0.0',
    author: 'Pendragon',
    requiresApi: false,
    component: WordFrequencyPlugin,
  },
  {
    id: 'qr-code',
    name: 'QR Code Generator',
    description: 'Generate QR-style pattern images from text or URLs. Download or copy.',
    icon: 'QrCode',
    category: 'utilities',
    version: '1.0.0',
    author: 'Pendragon',
    requiresApi: false,
    component: QRCodePlugin,
  },
  {
    id: 'regex-tester',
    name: 'Regex Tester',
    description: 'Test regular expressions with live highlighting, match extraction, and flag toggles.',
    icon: 'Regex',
    category: 'data',
    version: '1.0.0',
    author: 'Pendragon',
    requiresApi: false,
    component: RegexTesterPlugin,
  },
];

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Type, Pen, Volume2, Calculator, BarChart3, QrCode, Regex,
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Plugins',
  productivity: 'Productivity',
  writing: 'Writing',
  utilities: 'Utilities',
  media: 'Media',
  data: 'Data',
};

export function PluginHub() {
  const [enabledPlugins, setEnabledPlugins] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set(PLUGINS.map(p => p.id));
    } catch {
      return new Set(PLUGINS.map(p => p.id));
    }
  });
  const [openPlugin, setOpenPlugin] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...enabledPlugins]));
  }, [enabledPlugins]);

  const togglePlugin = (id: string) => {
    setEnabledPlugins(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.info('Plugin disabled');
      } else {
        next.add(id);
        toast.success('Plugin enabled');
      }
      return next;
    });
  };

  const filtered = PLUGINS.filter(p => {
    if (category !== 'all' && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) &&
        !p.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activePlugin = PLUGINS.find(p => p.id === openPlugin);
  const ActiveComponent = activePlugin?.component;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Puzzle className="h-6 w-6 text-primary" />
            Plugin Hub
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {enabledPlugins.size} of {PLUGINS.length} plugins active
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5 py-1">
          <Package className="h-3.5 w-3.5" />
          {PLUGINS.length} Available
        </Badge>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search plugins..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <Button
              key={key}
              size="sm"
              variant={category === key ? 'default' : 'outline'}
              onClick={() => setCategory(key)}
              className="whitespace-nowrap text-xs h-8"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Plugin grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(plugin => {
          const IconComp = ICON_MAP[plugin.icon] || Puzzle;
          const isEnabled = enabledPlugins.has(plugin.id);

          return (
            <Card
              key={plugin.id}
              className={`group transition-all cursor-pointer hover:shadow-md ${
                isEnabled ? 'border-primary/30' : 'opacity-60'
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isEnabled ? 'bg-primary/10' : 'bg-muted'}`}>
                      <IconComp className={`h-5 w-5 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{plugin.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{plugin.category}</Badge>
                        <span className="text-[10px] text-muted-foreground">v{plugin.version}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={e => { e.stopPropagation(); togglePlugin(plugin.id); }}
                    className={`h-7 w-7 p-0 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`}
                  >
                    {isEnabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-xs line-clamp-2 mb-3">
                  {plugin.description}
                </CardDescription>
                <Button
                  size="sm"
                  variant={isEnabled ? 'default' : 'outline'}
                  disabled={!isEnabled}
                  onClick={() => setOpenPlugin(plugin.id)}
                  className="w-full text-xs h-8 gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  {isEnabled ? 'Open' : 'Enable to use'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Puzzle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No plugins match your search.</p>
        </div>
      )}

      {/* Plugin dialog */}
      <Dialog open={!!openPlugin} onOpenChange={open => !open && setOpenPlugin(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activePlugin && (() => {
                const Icon = ICON_MAP[activePlugin.icon] || Puzzle;
                return <Icon className="h-5 w-5 text-primary" />;
              })()}
              {activePlugin?.name}
              <Badge variant="secondary" className="text-[10px] ml-auto">{activePlugin?.category}</Badge>
            </DialogTitle>
          </DialogHeader>
          {ActiveComponent && <ActiveComponent onClose={() => setOpenPlugin(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

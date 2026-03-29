import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Puzzle, Search, Type, Pen, Volume2, Calculator, BarChart3,
  QrCode, Regex, Power, PowerOff, Sparkles, Package,
  Clock, Flame, LayoutGrid, Hourglass, BookOpen, Eye, FileText,
  Code, Binary, Palette, Ruler, Lock, Hash, GitCompare
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
import { PomodoroPlugin } from './plugins/PomodoroPlugin';
import { HabitStreakPlugin } from './plugins/HabitStreakPlugin';
import { EisenhowerPlugin } from './plugins/EisenhowerPlugin';
import { CountdownPlugin } from './plugins/CountdownPlugin';
import { CitationPlugin } from './plugins/CitationPlugin';
import { ReadabilityPlugin } from './plugins/ReadabilityPlugin';
import { LoremIpsumPlugin } from './plugins/LoremIpsumPlugin';
import { MarkdownPreviewPlugin } from './plugins/MarkdownPreviewPlugin';
import { JsonFormatterPlugin } from './plugins/JsonFormatterPlugin';
import { Base64Plugin } from './plugins/Base64Plugin';
import { ColorPalettePlugin } from './plugins/ColorPalettePlugin';
import { UnitConverterPlugin } from './plugins/UnitConverterPlugin';
import { PasswordGeneratorPlugin } from './plugins/PasswordGeneratorPlugin';
import { HashGeneratorPlugin } from './plugins/HashGeneratorPlugin';
import { DiffCheckerPlugin } from './plugins/DiffCheckerPlugin';

const STORAGE_KEY = 'pendragonx-enabled-plugins';

const PLUGINS: PendragonPlugin[] = [
  // --- PRODUCTIVITY ---
  { id: 'pomodoro', name: 'Pomodoro Timer', description: 'Stay focused with configurable work/break intervals, session tracking, and audio alerts.', icon: 'Clock', category: 'productivity', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: PomodoroPlugin },
  { id: 'habit-streak', name: 'Habit Streak Tracker', description: 'Track daily habits with streak counting and a 28-day calendar heatmap.', icon: 'Flame', category: 'productivity', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: HabitStreakPlugin },
  { id: 'eisenhower', name: 'Eisenhower Matrix', description: 'Organize tasks by urgency and importance in a four-quadrant grid.', icon: 'LayoutGrid', category: 'productivity', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: EisenhowerPlugin },
  { id: 'countdown', name: 'Countdown Timer', description: 'Set countdowns to deadlines and events with live ticking display.', icon: 'Hourglass', category: 'productivity', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: CountdownPlugin },
  // --- WRITING ---
  { id: 'text-transform', name: 'Text Transform', description: 'Convert text between cases, sort lines, remove duplicates, slugify, and more.', icon: 'Type', category: 'writing', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: TextTransformPlugin },
  { id: 'writing-prompts', name: 'Writing Prompts', description: 'Get inspired with curated writing prompts across fiction, poetry, essays, and more.', icon: 'Pen', category: 'writing', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: WritingPromptsPlugin },
  { id: 'word-frequency', name: 'Word Frequency Analyzer', description: 'Analyze word frequency, reading time, and text statistics with visual charts.', icon: 'BarChart3', category: 'writing', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: WordFrequencyPlugin },
  { id: 'citation', name: 'Citation Generator', description: 'Generate APA, MLA, Chicago, and Harvard citations from title, author, and URL.', icon: 'BookOpen', category: 'writing', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: CitationPlugin },
  { id: 'readability', name: 'Readability Analyzer', description: 'Flesch-Kincaid, Gunning Fog, and Coleman-Liau readability scores with grade levels.', icon: 'Eye', category: 'writing', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: ReadabilityPlugin },
  { id: 'lorem-ipsum', name: 'Lorem Ipsum Generator', description: 'Generate placeholder text in classic, hipster, tech, or pirate styles.', icon: 'FileText', category: 'writing', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: LoremIpsumPlugin },
  { id: 'markdown-preview', name: 'Markdown Preview', description: 'Side-by-side Markdown editor with live rendered preview.', icon: 'Code', category: 'writing', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: MarkdownPreviewPlugin },
  // --- UTILITIES ---
  { id: 'calculator', name: 'Calculator', description: 'A clean calculator for quick arithmetic right inside Pendragon.', icon: 'Calculator', category: 'utilities', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: CalculatorPlugin },
  { id: 'qr-code', name: 'QR Code Generator', description: 'Generate QR-style pattern images from text or URLs.', icon: 'QrCode', category: 'utilities', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: QRCodePlugin },
  { id: 'base64', name: 'Base64 Encoder/Decoder', description: 'Encode and decode text or files to and from Base64.', icon: 'Binary', category: 'utilities', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: Base64Plugin },
  { id: 'color-palette', name: 'Color Palette Generator', description: 'Pick a color and generate complementary, analogous, triadic, and split palettes.', icon: 'Palette', category: 'utilities', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: ColorPalettePlugin },
  { id: 'unit-converter', name: 'Unit Converter', description: 'Convert length, weight, temperature, data sizes, and time units.', icon: 'Ruler', category: 'utilities', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: UnitConverterPlugin },
  { id: 'password-gen', name: 'Password Generator', description: 'Generate secure passwords with configurable length, character sets, and entropy display.', icon: 'Lock', category: 'utilities', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: PasswordGeneratorPlugin },
  { id: 'hash-gen', name: 'Hash Generator', description: 'SHA-256, SHA-512, and SHA-1 hashing using the Web Crypto API.', icon: 'Hash', category: 'utilities', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: HashGeneratorPlugin },
  // --- MEDIA ---
  { id: 'text-to-speech', name: 'Text to Speech', description: 'Read any text aloud using your browser\'s built-in speech engine.', icon: 'Volume2', category: 'media', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: TextToSpeechPlugin },
  // --- DATA ---
  { id: 'regex-tester', name: 'Regex Tester', description: 'Test regular expressions with live highlighting, match extraction, and flag toggles.', icon: 'Regex', category: 'data', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: RegexTesterPlugin },
  { id: 'json-formatter', name: 'JSON Formatter', description: 'Pretty-print or minify JSON with validation and error display.', icon: 'Code', category: 'data', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: JsonFormatterPlugin },
  { id: 'diff-checker', name: 'Diff Checker', description: 'Compare two texts side-by-side with highlighted additions and deletions.', icon: 'GitCompare', category: 'data', version: '1.0.0', author: 'Pendragon', requiresApi: false, component: DiffCheckerPlugin },
];

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Type, Pen, Volume2, Calculator, BarChart3, QrCode, Regex,
  Clock, Flame, LayoutGrid, Hourglass, BookOpen, Eye, FileText,
  Code, Binary, Palette, Ruler, Lock, Hash, GitCompare,
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
      if (next.has(id)) { next.delete(id); toast.info('Plugin disabled'); }
      else { next.add(id); toast.success('Plugin enabled'); }
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search plugins..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <Button key={key} size="sm" variant={category === key ? 'default' : 'outline'}
              onClick={() => setCategory(key)} className="whitespace-nowrap text-xs h-8">
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(plugin => {
          const IconComp = ICON_MAP[plugin.icon] || Puzzle;
          const isEnabled = enabledPlugins.has(plugin.id);
          return (
            <Card key={plugin.id} className={`group transition-all cursor-pointer hover:shadow-md ${isEnabled ? 'border-primary/30' : 'opacity-60'}`}>
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
                  <Button size="sm" variant="ghost"
                    onClick={e => { e.stopPropagation(); togglePlugin(plugin.id); }}
                    className={`h-7 w-7 p-0 ${isEnabled ? 'text-primary' : 'text-muted-foreground'}`}>
                    {isEnabled ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-xs line-clamp-2 mb-3">{plugin.description}</CardDescription>
                <Button size="sm" variant={isEnabled ? 'default' : 'outline'} disabled={!isEnabled}
                  onClick={() => setOpenPlugin(plugin.id)} className="w-full text-xs h-8 gap-1.5">
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

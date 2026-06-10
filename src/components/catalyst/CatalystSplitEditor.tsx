import { useState } from 'react';
import DOMPurify from 'dompurify';
import { CatalystEditor } from '@/components/CatalystEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Columns2, X, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';
import { TwoPaneShell } from '@/components/workspace/TwoPaneShell';
import { cn } from '@/lib/utils';

interface CatalystSplitEditorProps {
  content: string;
  onChange: (content: string) => void;
  onWordCountChange: (count: number) => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  documentTheme: string;
  onThemeChange: (theme: string) => void;
}

export function CatalystSplitEditor({
  content, onChange, onWordCountChange,
  focusMode, onToggleFocusMode, isFullscreen, onToggleFullscreen,
  documentTheme, onThemeChange,
}: CatalystSplitEditorProps) {
  const [splitMode, setSplitMode] = useState(false);
  const [referenceContent, setReferenceContent] = useState(content);
  const [liveMirror, setLiveMirror] = useState(false);
  const [zoom, setZoom] = useState(1);

  const editorEl = (
    <CatalystEditor
      content={content}
      onChange={onChange}
      onWordCountChange={onWordCountChange}
      focusMode={focusMode}
      onToggleFocusMode={onToggleFocusMode}
      isFullscreen={isFullscreen}
      onToggleFullscreen={onToggleFullscreen}
      documentTheme={documentTheme}
      onThemeChange={onThemeChange}
    />
  );

  if (!splitMode) {
    return (
      <div className="relative">
        {editorEl}
        <Button
          variant="outline" size="sm"
          className="absolute bottom-3 right-3 z-10 h-9 rounded-full px-3 shadow-md opacity-70 hover:opacity-100"
          onClick={() => { setReferenceContent(content); setSplitMode(true); }}
          title="Open split view"
        >
          <Columns2 className="h-3.5 w-3.5 mr-1.5" /> Split
        </Button>
      </div>
    );
  }

  const displayedRef = liveMirror ? content : referenceContent;

  const referencePane = (
    <div className="h-full flex flex-col bg-card/20">
      <div className="flex items-center justify-between px-3 h-11 border-b border-border/30">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Reference
        </span>
        <div className="flex items-center gap-0.5">
          <Toggle
            size="sm" pressed={liveMirror}
            onPressedChange={setLiveMirror}
            className="h-7 px-2 text-[11px] data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
            title="Mirror editor live"
          >
            <RefreshCw className={cn('h-3 w-3 mr-1', liveMirror && 'animate-spin')} style={{ animationDuration: '3s' }} />
            Live
          </Toggle>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.max(0.7, z - 0.1))} title="Smaller">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.min(1.6, z + 0.1))} title="Larger">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSplitMode(false)} title="Close split">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div
          className="reader-prose max-w-[68ch] mx-auto px-6 md:px-8 py-8"
          style={{ fontSize: `${15 * zoom}px` }}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(displayedRef) }}
        />
      </ScrollArea>
    </div>
  );

  return (
    <TwoPaneShell
      list={editorEl}
      detail={referencePane}
      defaultListSize={55}
      minListSize={30}
      maxListSize={75}
      heightClassName="min-h-[600px] h-[calc(100dvh-7rem)]"
    />
  );
}

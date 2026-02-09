import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { CatalystEditor } from '@/components/CatalystEditor';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Columns2, X } from 'lucide-react';

interface CatalystSplitEditorProps {
  content: string;
  onChange: (content: string) => void;
  onWordCountChange: (count: number) => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function CatalystSplitEditor({
  content,
  onChange,
  onWordCountChange,
  focusMode,
  onToggleFocusMode,
  isFullscreen,
  onToggleFullscreen,
}: CatalystSplitEditorProps) {
  const [splitMode, setSplitMode] = useState(false);
  const [referenceContent, setReferenceContent] = useState(content);

  if (!splitMode) {
    return (
      <div className="relative">
        <CatalystEditor
          content={content}
          onChange={onChange}
          onWordCountChange={onWordCountChange}
          focusMode={focusMode}
          onToggleFocusMode={onToggleFocusMode}
          isFullscreen={isFullscreen}
          onToggleFullscreen={onToggleFullscreen}
        />
        <Button
          variant="outline"
          size="sm"
          className="absolute bottom-2 right-2 z-10 opacity-60 hover:opacity-100"
          onClick={() => {
            setReferenceContent(content);
            setSplitMode(true);
          }}
          title="Split view"
        >
          <Columns2 className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <ResizablePanelGroup direction="horizontal" className="min-h-[600px] rounded-lg border">
        <ResizablePanel defaultSize={50} minSize={30}>
          <CatalystEditor
            content={content}
            onChange={onChange}
            onWordCountChange={onWordCountChange}
            focusMode={focusMode}
            onToggleFocusMode={onToggleFocusMode}
            isFullscreen={isFullscreen}
            onToggleFullscreen={onToggleFullscreen}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={50} minSize={20}>
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
              <span className="text-xs font-medium text-muted-foreground">Reference View</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setSplitMode(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div
                className="prose prose-sm max-w-none p-6 text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: referenceContent }}
              />
            </ScrollArea>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

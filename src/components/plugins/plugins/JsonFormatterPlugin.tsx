import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Copy, Minimize2, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

export function JsonFormatterPlugin({ onClose }: PluginProps) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const format = (minify: boolean) => {
    try {
      const parsed = JSON.parse(input);
      setOutput(minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2));
      setError('');
    } catch (e: any) {
      setError(e.message);
      setOutput('');
    }
  };

  const copy = () => { navigator.clipboard.writeText(output); toast.success('Copied!'); };

  return (
    <div className="space-y-3">
      <Textarea placeholder="Paste JSON here..." value={input} onChange={e => setInput(e.target.value)}
        rows={6} className="font-mono text-xs" />
      
      {error && <Badge variant="destructive" className="text-xs">{error}</Badge>}

      <div className="flex gap-2">
        <Button onClick={() => format(false)} size="sm" className="flex-1">
          <Maximize2 className="h-3 w-3 mr-1" />Pretty Print
        </Button>
        <Button onClick={() => format(true)} size="sm" variant="outline" className="flex-1">
          <Minimize2 className="h-3 w-3 mr-1" />Minify
        </Button>
      </div>

      {output && (
        <>
          <Textarea value={output} readOnly rows={8} className="font-mono text-xs" />
          <Button onClick={copy} size="sm" variant="outline" className="w-full">
            <Copy className="h-3 w-3 mr-1" />Copy
          </Button>
        </>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Copy, ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

export function Base64Plugin({ onClose }: PluginProps) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [error, setError] = useState('');

  const process = () => {
    try {
      setError('');
      if (mode === 'encode') {
        setOutput(btoa(unescape(encodeURIComponent(input))));
      } else {
        setOutput(decodeURIComponent(escape(atob(input))));
      }
    } catch (e: any) {
      setError('Invalid input for ' + mode);
      setOutput('');
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setOutput(result.split(',')[1] || result);
      setMode('encode');
      toast.success(`File encoded (${(file.size / 1024).toFixed(1)} KB)`);
    };
    reader.readAsDataURL(file);
  };

  const copy = () => { navigator.clipboard.writeText(output); toast.success('Copied!'); };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button size="sm" variant={mode === 'encode' ? 'default' : 'outline'} onClick={() => setMode('encode')} className="flex-1">
          <ArrowUp className="h-3 w-3 mr-1" />Encode
        </Button>
        <Button size="sm" variant={mode === 'decode' ? 'default' : 'outline'} onClick={() => setMode('decode')} className="flex-1">
          <ArrowDown className="h-3 w-3 mr-1" />Decode
        </Button>
      </div>

      <Textarea placeholder={mode === 'encode' ? 'Text to encode...' : 'Base64 to decode...'}
        value={input} onChange={e => setInput(e.target.value)} rows={4} className="font-mono text-xs" />

      {mode === 'encode' && (
        <div className="border-2 border-dashed border-border rounded-lg p-3 text-center">
          <input type="file" onChange={handleFile} className="text-xs" />
          <p className="text-[10px] text-muted-foreground mt-1">Or drop a file to encode</p>
        </div>
      )}

      <Button onClick={process} size="sm" className="w-full">{mode === 'encode' ? 'Encode' : 'Decode'}</Button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {output && (
        <>
          <Textarea value={output} readOnly rows={4} className="font-mono text-xs" />
          <Button onClick={copy} size="sm" variant="outline" className="w-full"><Copy className="h-3 w-3 mr-1" />Copy</Button>
        </>
      )}
    </div>
  );
}

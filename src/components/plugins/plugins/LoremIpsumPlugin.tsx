import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

const WORDS: Record<string, string[]> = {
  classic: 'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' '),
  hipster: 'artisan kombucha craft beer aesthetic vinyl vegan plaid flannel fixie heirloom mustache tattooed ethical meditation cold-pressed microdosing sustainable organic mindful curation sourdough avocado matcha oat-milk single-origin pour-over minimalist upcycled thrifted vintage retro brutalist curated intentional slow-living'.split(' '),
  tech: 'blockchain API microservice kubernetes container serverless pipeline deploy scalable agile sprint iteration webhook endpoint token middleware cache latency throughput bandwidth cluster node shard replica failover orchestration terraform ansible docker registry namespace ingress proxy mesh observability telemetry'.split(' '),
  pirate: 'ahoy matey scallywag buccaneer plunder treasure booty parrot cannon sail anchor port starboard galley crow nest jolly roger doubloon cutlass grog rum barrel mast rigging compass voyage plank kraken siren maelstrom mutiny privateer flagship armada broadside'.split(' '),
};

function generate(style: string, count: number): string {
  const pool = WORDS[style] || WORDS.classic;
  const paragraphs: string[] = [];
  for (let p = 0; p < count; p++) {
    const sentenceCount = 4 + Math.floor(Math.random() * 4);
    const sentences: string[] = [];
    for (let s = 0; s < sentenceCount; s++) {
      const wc = 8 + Math.floor(Math.random() * 10);
      const words = Array.from({ length: wc }, () => pool[Math.floor(Math.random() * pool.length)]);
      words[0] = words[0][0].toUpperCase() + words[0].slice(1);
      sentences.push(words.join(' ') + '.');
    }
    paragraphs.push(sentences.join(' '));
  }
  return paragraphs.join('\n\n');
}

export function LoremIpsumPlugin({ onClose }: PluginProps) {
  const [style, setStyle] = useState('classic');
  const [count, setCount] = useState(3);
  const [output, setOutput] = useState('');

  const gen = () => setOutput(generate(style, count));
  const copy = () => { navigator.clipboard.writeText(output); toast.success('Copied!'); };

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {Object.keys(WORDS).map(s => (
          <Button key={s} size="sm" variant={style === s ? 'default' : 'outline'} onClick={() => setStyle(s)}
            className="text-xs flex-1 capitalize">{s}</Button>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <Input type="number" value={count} onChange={e => setCount(parseInt(e.target.value) || 1)} min={1} max={20} className="w-20" />
        <span className="text-sm text-muted-foreground">paragraphs</span>
        <Button onClick={gen} size="sm" className="ml-auto"><RefreshCw className="h-3 w-3 mr-1" />Generate</Button>
      </div>
      {output && (
        <>
          <Textarea value={output} readOnly rows={8} className="text-xs" />
          <Button onClick={copy} size="sm" variant="outline" className="w-full"><Copy className="h-3 w-3 mr-1" />Copy</Button>
        </>
      )}
    </div>
  );
}

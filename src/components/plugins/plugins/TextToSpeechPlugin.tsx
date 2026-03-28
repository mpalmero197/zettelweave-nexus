import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, Square, Volume2 } from 'lucide-react';
import type { PluginProps } from '../types';

export function TextToSpeechPlugin({}: PluginProps) {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [rate, setRate] = useState([1]);
  const [pitch, setPitch] = useState([1]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const v = speechSynthesis.getVoices();
      if (v.length) {
        setVoices(v);
        const eng = v.find(voice => voice.lang.startsWith('en'));
        setSelectedVoice(eng?.name || v[0]?.name || '');
      }
    };
    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const speak = () => {
    if (!text.trim()) return;
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utt.voice = voice;
    utt.rate = rate[0];
    utt.pitch = pitch[0];
    utt.onend = () => { setIsSpeaking(false); setIsPaused(false); };
    utt.onerror = () => { setIsSpeaking(false); setIsPaused(false); };
    utteranceRef.current = utt;
    speechSynthesis.speak(utt);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const pause = () => { speechSynthesis.pause(); setIsPaused(true); };
  const resume = () => { speechSynthesis.resume(); setIsPaused(false); };
  const stop = () => { speechSynthesis.cancel(); setIsSpeaking(false); setIsPaused(false); };

  return (
    <div className="space-y-4">
      <Textarea
        placeholder="Enter text to read aloud..."
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        className="resize-none"
      />

      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Voice</label>
          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select voice" />
            </SelectTrigger>
            <SelectContent className="max-h-48">
              {voices.map(v => (
                <SelectItem key={v.name} value={v.name} className="text-xs">
                  {v.name} ({v.lang})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Speed: {rate[0].toFixed(1)}x</label>
            <Slider value={rate} onValueChange={setRate} min={0.5} max={2} step={0.1} className="py-1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Pitch: {pitch[0].toFixed(1)}</label>
            <Slider value={pitch} onValueChange={setPitch} min={0.5} max={2} step={0.1} className="py-1" />
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {!isSpeaking ? (
          <Button onClick={speak} disabled={!text.trim()} className="flex-1 gap-2">
            <Play className="h-4 w-4" /> Speak
          </Button>
        ) : (
          <>
            <Button onClick={isPaused ? resume : pause} variant="outline" className="flex-1 gap-2">
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              {isPaused ? 'Resume' : 'Pause'}
            </Button>
            <Button onClick={stop} variant="destructive" size="icon">
              <Square className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {text.split(/\s+/).filter(Boolean).length} words • Uses your browser's built-in speech engine
      </p>
    </div>
  );
}

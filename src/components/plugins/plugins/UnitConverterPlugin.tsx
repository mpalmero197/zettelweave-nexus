import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRightLeft } from 'lucide-react';
import type { PluginProps } from '../types';

type Category = 'length' | 'weight' | 'temperature' | 'data' | 'time';

const UNITS: Record<Category, Record<string, number | ((v: number) => number)>> = {
  length: { meters: 1, kilometers: 1000, centimeters: 0.01, millimeters: 0.001, miles: 1609.344, yards: 0.9144, feet: 0.3048, inches: 0.0254 },
  weight: { kilograms: 1, grams: 0.001, milligrams: 0.000001, pounds: 0.453592, ounces: 0.0283495, tons: 1000 },
  temperature: { celsius: 1, fahrenheit: 1, kelvin: 1 },
  data: { bytes: 1, kilobytes: 1024, megabytes: 1048576, gigabytes: 1073741824, terabytes: 1099511627776 },
  time: { seconds: 1, minutes: 60, hours: 3600, days: 86400, weeks: 604800, years: 31536000 },
};

function convert(val: number, from: string, to: string, cat: Category): number {
  if (cat === 'temperature') {
    let celsius = val;
    if (from === 'fahrenheit') celsius = (val - 32) * 5/9;
    else if (from === 'kelvin') celsius = val - 273.15;
    if (to === 'fahrenheit') return celsius * 9/5 + 32;
    if (to === 'kelvin') return celsius + 273.15;
    return celsius;
  }
  const fromFactor = UNITS[cat][from] as number;
  const toFactor = UNITS[cat][to] as number;
  return (val * fromFactor) / toFactor;
}

export function UnitConverterPlugin({ onClose }: PluginProps) {
  const [cat, setCat] = useState<Category>('length');
  const units = Object.keys(UNITS[cat]);
  const [from, setFrom] = useState(units[0]);
  const [to, setTo] = useState(units[1]);
  const [value, setValue] = useState('1');

  const result = useMemo(() => {
    const v = parseFloat(value);
    if (isNaN(v)) return '';
    return convert(v, from, to, cat).toLocaleString(undefined, { maximumFractionDigits: 6 });
  }, [value, from, to, cat]);

  const changeCat = (c: Category) => {
    setCat(c);
    const u = Object.keys(UNITS[c]);
    setFrom(u[0]); setTo(u[1]);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 flex-wrap">
        {(Object.keys(UNITS) as Category[]).map(c => (
          <Button key={c} size="sm" variant={cat === c ? 'default' : 'outline'} onClick={() => changeCat(c)}
            className="text-xs capitalize">{c}</Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-1">
          <Input type="number" value={value} onChange={e => setValue(e.target.value)} />
          <select value={from} onChange={e => setFrom(e.target.value)}
            className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background capitalize">
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { setFrom(to); setTo(from); }}>
          <ArrowRightLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 space-y-1">
          <Input value={result} readOnly className="font-bold" />
          <select value={to} onChange={e => setTo(e.target.value)}
            className="w-full border border-input rounded-md px-2 py-1.5 text-sm bg-background capitalize">
            {units.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

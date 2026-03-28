import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { PluginProps } from '../types';

export function CalculatorPlugin({}: PluginProps) {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState<number | null>(null);
  const [op, setOp] = useState<string | null>(null);
  const [fresh, setFresh] = useState(true);

  const input = (val: string) => {
    if (fresh) { setDisplay(val); setFresh(false); }
    else setDisplay(display === '0' && val !== '.' ? val : display + val);
  };

  const operate = (nextOp: string) => {
    const current = parseFloat(display);
    if (prev !== null && op) {
      let result = prev;
      if (op === '+') result = prev + current;
      if (op === '-') result = prev - current;
      if (op === '×') result = prev * current;
      if (op === '÷') result = current !== 0 ? prev / current : NaN;
      if (op === '%') result = prev % current;
      setDisplay(isNaN(result) ? 'Error' : String(result));
      setPrev(result);
    } else {
      setPrev(current);
    }
    setOp(nextOp);
    setFresh(true);
  };

  const equals = () => {
    if (op) operate(op);
    setOp(null);
  };

  const clear = () => { setDisplay('0'); setPrev(null); setOp(null); setFresh(true); };
  const toggleSign = () => setDisplay(String(-parseFloat(display)));
  const percent = () => setDisplay(String(parseFloat(display) / 100));

  const copyResult = () => {
    navigator.clipboard.writeText(display);
    toast.success('Copied!');
  };

  const buttons = [
    ['C', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '⌫', '='],
  ];

  const handleBtn = (btn: string) => {
    if (btn === 'C') clear();
    else if (btn === '±') toggleSign();
    else if (btn === '%') percent();
    else if (btn === '⌫') setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
    else if (['+', '-', '×', '÷'].includes(btn)) operate(btn);
    else if (btn === '=') equals();
    else input(btn);
  };

  return (
    <div className="space-y-3 max-w-xs mx-auto">
      <div
        className="bg-muted/50 rounded-xl p-4 text-right cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={copyResult}
        title="Click to copy"
      >
        {op && prev !== null && (
          <div className="text-xs text-muted-foreground mb-1">{prev} {op}</div>
        )}
        <div className="text-3xl font-mono font-bold truncate">{display}</div>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {buttons.flat().map((btn, i) => {
          const isOp = ['+', '-', '×', '÷', '='].includes(btn);
          const isFunc = ['C', '±', '%'].includes(btn);
          return (
            <Button
              key={i}
              variant={isOp ? 'default' : isFunc ? 'secondary' : 'outline'}
              className={`h-12 text-lg font-medium ${btn === '0' ? 'col-span-1' : ''}`}
              onClick={() => handleBtn(btn)}
            >
              {btn}
            </Button>
          );
        })}
      </div>

      <p className="text-[10px] text-center text-muted-foreground">Click result to copy</p>
    </div>
  );
}

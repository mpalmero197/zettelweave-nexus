import { useState, useEffect } from 'react';
import { Bell, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';

interface ReminderPickerProps {
  itemType: string;
  itemId: string;
  itemTitle: string;
  eventTime: Date;
  compact?: boolean;
}

interface ReminderEntry {
  value: number;
  unit: 'minutes' | 'hours' | 'days' | 'weeks';
}

const presets = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '6 hours', minutes: 360 },
  { label: '12 hours', minutes: 720 },
  { label: '1 day', minutes: 1440 },
  { label: '1 week', minutes: 10080 },
];

function toMinutes(entry: ReminderEntry): number {
  switch (entry.unit) {
    case 'minutes': return entry.value;
    case 'hours': return entry.value * 60;
    case 'days': return entry.value * 1440;
    case 'weeks': return entry.value * 10080;
  }
}

function formatOffset(minutes: number): string {
  if (minutes >= 10080 && minutes % 10080 === 0) return `${minutes / 10080}w`;
  if (minutes >= 1440 && minutes % 1440 === 0) return `${minutes / 1440}d`;
  if (minutes >= 60 && minutes % 60 === 0) return `${minutes / 60}h`;
  return `${minutes}m`;
}

export function ReminderPicker({ itemType, itemId, itemTitle, eventTime, compact }: ReminderPickerProps) {
  const { addReminders, removeReminders, getReminders } = useNotifications();
  const [reminders, setReminders] = useState<number[]>([]);
  const [customEntry, setCustomEntry] = useState<ReminderEntry>({ value: 1, unit: 'hours' });
  const [loading, setLoading] = useState(false);

  // Load existing reminders
  useEffect(() => {
    if (!itemId) return;
    getReminders(itemType, itemId).then((data) => {
      setReminders(data.map((r: any) => r.offset_minutes));
    });
  }, [itemType, itemId, getReminders]);

  const addPreset = (minutes: number) => {
    if (!reminders.includes(minutes)) {
      setReminders(prev => [...prev, minutes].sort((a, b) => a - b));
    }
  };

  const addCustom = () => {
    const minutes = toMinutes(customEntry);
    if (minutes > 0 && !reminders.includes(minutes)) {
      setReminders(prev => [...prev, minutes].sort((a, b) => a - b));
    }
  };

  const removeOffset = (minutes: number) => {
    setReminders(prev => prev.filter(m => m !== minutes));
  };

  const save = async () => {
    setLoading(true);
    await removeReminders(itemType, itemId);
    if (reminders.length > 0) {
      await addReminders(
        reminders.map(offset => ({
          item_type: itemType,
          item_id: itemId,
          item_title: itemTitle,
          offset_minutes: offset,
          event_time: eventTime,
        }))
      );
    }
    setLoading(false);
  };

  if (compact) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs relative">
            <Bell className="h-3 w-3" />
            {reminders.length > 0 && (
              <Badge variant="secondary" className="h-4 min-w-4 text-[9px] px-1 absolute -top-1 -right-1">
                {reminders.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-3" align="start">
          <ReminderPickerContent
            reminders={reminders}
            customEntry={customEntry}
            setCustomEntry={setCustomEntry}
            addPreset={addPreset}
            addCustom={addCustom}
            removeOffset={removeOffset}
            save={save}
            loading={loading}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className="space-y-3 p-3 border border-border/40 rounded-lg bg-card/50">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Bell className="h-4 w-4 text-primary" />
        Reminders
      </div>
      <ReminderPickerContent
        reminders={reminders}
        customEntry={customEntry}
        setCustomEntry={setCustomEntry}
        addPreset={addPreset}
        addCustom={addCustom}
        removeOffset={removeOffset}
        save={save}
        loading={loading}
      />
    </div>
  );
}

function ReminderPickerContent({
  reminders,
  customEntry,
  setCustomEntry,
  addPreset,
  addCustom,
  removeOffset,
  save,
  loading,
}: {
  reminders: number[];
  customEntry: ReminderEntry;
  setCustomEntry: (e: ReminderEntry) => void;
  addPreset: (m: number) => void;
  addCustom: () => void;
  removeOffset: (m: number) => void;
  save: () => void;
  loading: boolean;
}) {
  return (
    <>
      {/* Active reminders */}
      {reminders.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {reminders.map(m => (
            <Badge key={m} variant="secondary" className="gap-1 text-xs">
              {formatOffset(m)} before
              <button onClick={() => removeOffset(m)} className="ml-0.5 hover:text-destructive">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Presets */}
      <div className="flex flex-wrap gap-1">
        {presets.map(p => (
          <Button
            key={p.minutes}
            variant={reminders.includes(p.minutes) ? 'default' : 'outline'}
            size="sm"
            className="h-6 text-[10px] px-2"
            onClick={() => reminders.includes(p.minutes) ? removeOffset(p.minutes) : addPreset(p.minutes)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={1}
          value={customEntry.value}
          onChange={e => setCustomEntry({ ...customEntry, value: parseInt(e.target.value) || 1 })}
          className="w-16 h-7 text-xs"
        />
        <Select value={customEntry.unit} onValueChange={(v: any) => setCustomEntry({ ...customEntry, unit: v })}>
          <SelectTrigger className="w-24 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="hours">Hours</SelectItem>
            <SelectItem value="days">Days</SelectItem>
            <SelectItem value="weeks">Weeks</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={addCustom}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Save */}
      <Button size="sm" className="w-full h-7 text-xs" onClick={save} disabled={loading}>
        {loading ? 'Saving…' : 'Save Reminders'}
      </Button>
    </>
  );
}

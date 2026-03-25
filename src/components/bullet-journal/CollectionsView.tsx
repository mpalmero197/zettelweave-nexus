import React, { useState } from 'react';
import { CustomCollection, BulletEntry } from './types';
import { BulletEntryRow } from './BulletEntryRow';
import { RapidLogger } from './RapidLogger';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface CollectionsViewProps {
  collections: CustomCollection[];
  entries: BulletEntry[];
  onAddCollection: (col: CustomCollection) => void;
  onDeleteCollection: (id: string) => void;
  onAddEntry: (entry: BulletEntry) => void;
  onUpdateEntry: (id: string, patch: Partial<BulletEntry>) => void;
  onDeleteEntry: (id: string) => void;
}

export const CollectionsView: React.FC<CollectionsViewProps> = ({
  collections, entries, onAddCollection, onDeleteCollection, onAddEntry, onUpdateEntry, onDeleteEntry,
}) => {
  const [newName, setNewName] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const addCol = () => {
    const name = newName.trim();
    if (!name) return;
    onAddCollection({
      id: crypto.randomUUID(),
      name,
      icon: '📁',
      createdAt: new Date().toISOString(),
    });
    setNewName('');
    toast.success('Collection created');
  };

  const active = collections.find(c => c.id === activeId);
  const colEntries = entries.filter(e => e.collection === activeId);

  if (active) {
    return (
      <div className="space-y-4">
        <button onClick={() => setActiveId(null)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to collections
        </button>
        <h2 className="text-lg font-semibold text-foreground">{active.icon} {active.name}</h2>

        <RapidLogger onAdd={onAddEntry} collection={active.id} />

        {colEntries.length > 0 ? (
          <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden">
            {colEntries.map((entry, idx) => (
              <BulletEntryRow
                key={entry.id}
                entry={entry}
                isLast={idx === colEntries.length - 1}
                onUpdate={onUpdateEntry}
                onDelete={onDeleteEntry}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/50 text-center py-8">No entries yet. Start logging above.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Custom collections for projects, goals, wishlists, budgets — anything you need.
      </p>

      {collections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {collections.map(col => {
            const count = entries.filter(e => e.collection === col.id).length;
            return (
              <button
                key={col.id}
                onClick={() => setActiveId(col.id)}
                className="group rounded-xl border border-border/40 bg-card/60 p-3 text-left hover:bg-accent/20 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{col.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-foreground">{col.name}</p>
                      <p className="text-[10px] text-muted-foreground">{count} entries</p>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onDeleteCollection(col.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCol(); } }}
          placeholder="New collection name…"
          className="flex-1 h-8 text-sm"
        />
        <Button size="sm" onClick={addCol} disabled={!newName.trim()} className="h-8 gap-1">
          <Plus className="h-3.5 w-3.5" /> Create
        </Button>
      </div>
    </div>
  );
};

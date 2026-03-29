import { useState, useRef, useCallback, useEffect } from 'react';
import { Star, MoreHorizontal, Edit, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

interface Note {
  id: string;
  title: string;
  content: string;
  is_favorite: boolean;
  tags: string[];
  notebook_id?: string;
  created_at: string;
  updated_at: string;
  position_x?: number | null;
  position_y?: number | null;
  cover_color?: string | null;
  icon?: string | null;
}

interface Notebook {
  id: string;
  name: string;
  color: string;
}

interface NotesBoardProps {
  notes: Note[];
  notebooks: Notebook[];
  onViewNote: (note: Note) => void;
  onEditNote: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onToggleFavorite: (note: Note) => void;
  onFindSimilar: (note: Note) => void;
  onRefresh: () => void;
}

const CARD_W = 220;
const CARD_H = 160;

export function NotesBoard({
  notes, notebooks, onViewNote, onEditNote, onDeleteNote, onToggleFavorite, onFindSimilar, onRefresh,
}: NotesBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Initialize positions for notes that don't have saved positions
  useEffect(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    const cols = Math.ceil(Math.sqrt(notes.length));
    notes.forEach((note, i) => {
      if (note.position_x != null && note.position_y != null) {
        pos[note.id] = { x: note.position_x, y: note.position_y };
      } else {
        const col = i % cols;
        const row = Math.floor(i / cols);
        pos[note.id] = { x: col * (CARD_W + 24) + 40, y: row * (CARD_H + 24) + 40 };
      }
    });
    setPositions(pos);
  }, [notes]);

  const getNotebookColor = (nbId?: string) => {
    if (!nbId) return 'hsl(var(--muted-foreground) / 0.3)';
    return notebooks.find(nb => nb.id === nbId)?.color || 'hsl(var(--muted-foreground) / 0.3)';
  };

  // Save position to DB (debounced on drag end)
  const savePosition = useCallback(async (noteId: string, x: number, y: number) => {
    await supabase.from('notes').update({ position_x: x, position_y: y } as any).eq('id', noteId);
  }, []);

  // Canvas panning
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('.board-card')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handlePointerUp = () => {
    setIsPanning(false);
  };

  // Card dragging
  const handleCardPointerDown = (e: React.PointerEvent, noteId: string) => {
    e.stopPropagation();
    const pos = positions[noteId] || { x: 0, y: 0 };
    setDragId(noteId);
    setDragOffset({ x: e.clientX / zoom - pos.x, y: e.clientY / zoom - pos.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleCardPointerMove = (e: React.PointerEvent) => {
    if (!dragId) return;
    const newX = e.clientX / zoom - dragOffset.x;
    const newY = e.clientY / zoom - dragOffset.y;
    setPositions(prev => ({ ...prev, [dragId]: { x: newX, y: newY } }));
  };

  const handleCardPointerUp = () => {
    if (dragId && positions[dragId]) {
      savePosition(dragId, positions[dragId].x, positions[dragId].y);
    }
    setDragId(null);
  };

  // Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(2, Math.max(0.3, z * delta)));
  };

  // Minimap
  const allPos = Object.values(positions);
  const minX = Math.min(0, ...allPos.map(p => p.x));
  const minY = Math.min(0, ...allPos.map(p => p.y));
  const maxX = Math.max(800, ...allPos.map(p => p.x + CARD_W));
  const maxY = Math.max(600, ...allPos.map(p => p.y + CARD_H));
  const mapW = maxX - minX;
  const mapH = maxY - minY;

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '').slice(0, 80);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg border border-border/40 bg-muted/10">
      {/* Canvas */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
        onPointerDown={handlePointerDown}
        onPointerMove={(e) => { handlePointerMove(e); handleCardPointerMove(e); }}
        onPointerUp={() => { handlePointerUp(); handleCardPointerUp(); }}
        onWheel={handleWheel}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'relative',
            width: '5000px',
            height: '5000px',
          }}
        >
          {/* Dot grid background */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            <defs>
              <pattern id="dotgrid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="20" cy="20" r="1" fill="currentColor" className="text-muted-foreground" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotgrid)" />
          </svg>

          {/* Note cards */}
          {notes.map(note => {
            const pos = positions[note.id] || { x: 0, y: 0 };
            const nbColor = getNotebookColor(note.notebook_id);
            return (
              <div
                key={note.id}
                className={`board-card absolute rounded-xl border border-border/60 bg-card shadow-md transition-shadow hover:shadow-lg flex flex-col overflow-hidden ${dragId === note.id ? 'ring-2 ring-primary/40 shadow-xl z-50' : 'z-10'}`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: CARD_W,
                  height: CARD_H,
                  touchAction: 'none',
                  userSelect: dragId === note.id ? 'none' : 'auto',
                }}
                onPointerDown={(e) => handleCardPointerDown(e, note.id)}
                onDoubleClick={() => onViewNote(note)}
              >
                {/* Cover color strip */}
                <div
                  className="h-2 flex-shrink-0"
                  style={{ backgroundColor: note.cover_color || nbColor }}
                />

                <div className="flex-1 p-3 flex flex-col min-h-0">
                  {/* Title */}
                  <div className="flex items-center gap-1 mb-1">
                    {note.icon && <span className="text-sm">{note.icon}</span>}
                    <h4 className="text-xs font-semibold text-foreground truncate flex-1">{note.title}</h4>
                    {note.is_favorite && <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                  </div>

                  {/* Preview */}
                  <p className="text-[10px] text-muted-foreground/70 line-clamp-3 leading-relaxed flex-1">
                    {stripHtml(note.content) || 'Empty note...'}
                  </p>

                  {/* Tags */}
                  {note.tags?.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-shrink-0">
                      {note.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-muted/60 text-muted-foreground truncate max-w-[80px]">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Context menu */}
                <div className="absolute top-2.5 right-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 bg-card/80 backdrop-blur-sm rounded" onClick={(e) => e.stopPropagation()}>
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onClick={() => onViewNote(note)}>View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEditNote(note)}><Edit className="mr-2 h-3 w-3" />Edit</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onToggleFavorite(note)}><Star className="mr-2 h-3 w-3" />{note.is_favorite ? 'Unfavorite' : 'Favorite'}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onFindSimilar(note)}><Copy className="mr-2 h-3 w-3" />Find Similar</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onDeleteNote(note.id)} className="text-destructive"><Trash2 className="mr-2 h-3 w-3" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Minimap */}
      <div className="absolute bottom-3 right-3 w-32 h-24 rounded-lg border border-border/60 bg-card/90 backdrop-blur-sm overflow-hidden">
        <svg viewBox={`${minX} ${minY} ${mapW} ${mapH}`} className="w-full h-full">
          {notes.map(note => {
            const pos = positions[note.id] || { x: 0, y: 0 };
            return (
              <rect
                key={note.id}
                x={pos.x}
                y={pos.y}
                width={CARD_W}
                height={CARD_H}
                rx={4}
                className="fill-primary/20 stroke-primary/40"
                strokeWidth={2}
              />
            );
          })}
          {/* Viewport indicator */}
          {containerRef.current && (
            <rect
              x={-pan.x / zoom}
              y={-pan.y / zoom}
              width={containerRef.current.clientWidth / zoom}
              height={containerRef.current.clientHeight / zoom}
              fill="none"
              className="stroke-primary"
              strokeWidth={3}
              strokeDasharray="8 4"
            />
          )}
        </svg>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-3 left-3 flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-lg border border-border/60 p-1">
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-xs" onClick={() => setZoom(z => Math.min(2, z * 1.2))}>+</Button>
        <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-xs" onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}>−</Button>
      </div>
    </div>
  );
}

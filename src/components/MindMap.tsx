import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Trash2, ZoomIn, ZoomOut, Maximize2, Download, ChevronDown,
  Undo2, Redo2, Palette, RotateCcw, GitBranch, Search, X, ChevronUp,
  ChevronRight, Copy, Edit3, Star, AlertCircle, Smile, StickyNote,
  Map, Layout, Network, Building2, Sparkles, Loader2, Save, FolderOpen,
  FileText, Link2, CreditCard, ExternalLink
} from 'lucide-react';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSub,
  ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
  ContextMenuSeparator
} from '@/components/ui/context-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MindMapLibrary } from '@/components/MindMapLibrary';
import { StudyGuideDialog } from '@/components/StudyGuideDialog';
import { ZettelCard as ZettelCardType } from '@/types/zettel';

// ─── Types ────────────────────────────────────────────────────
type Priority = 'none' | 'low' | 'medium' | 'high';
type LayoutMode = 'radial' | 'tree' | 'orgchart';

interface MindMapNode {
  id: string;
  text: string;
  children: string[];
  collapsed: boolean;
  color: string;
  x: number;
  y: number;
  parentId: string | null;
  emoji: string;
  note: string;
  priority: Priority;
  linked_card_id?: string | null;
}

interface MindMapData {
  nodes: Record<string, MindMapNode>;
  rootId: string;
}

// ─── Constants ────────────────────────────────────────────────
const BRANCH_COLORS = [
  'hsl(210, 70%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(340, 65%, 55%)',
  'hsl(35, 80%, 50%)',
  'hsl(270, 55%, 55%)',
  'hsl(180, 55%, 45%)',
  'hsl(15, 70%, 55%)',
  'hsl(100, 50%, 45%)',
];

const PRIORITY_COLORS: Record<Priority, string> = {
  none: 'transparent',
  low: 'hsl(210, 70%, 55%)',
  medium: 'hsl(35, 80%, 50%)',
  high: 'hsl(0, 70%, 55%)',
};

const EMOJI_OPTIONS = ['💡', '⭐', '🔥', '🎯', '📌', '✅', '❓', '⚠️', '🚀', '💬', '📝', '🔗'];

const H_GAP = 220;
const V_GAP = 56;
const TREE_H_GAP = 160;
const TREE_V_GAP = 90;

// ─── Helpers ──────────────────────────────────────────────────
const uid = () => crypto.randomUUID();

function migrateNode(n: any): MindMapNode {
  return {
    ...n,
    emoji: n.emoji || '',
    note: n.note || '',
    priority: n.priority || 'none',
    linked_card_id: n.linked_card_id || null,
  };
}

function createDefaultMap(): MindMapData {
  const rootId = uid();
  return {
    rootId,
    nodes: {
      [rootId]: { id: rootId, text: 'Central Topic', children: [], collapsed: false, color: BRANCH_COLORS[0], x: 0, y: 0, parentId: null, emoji: '💡', note: '', priority: 'none' },
    },
  };
}

const STORAGE_KEY = 'pendragon-mindmap-v1';
const HINTS_KEY = 'pendragon-mindmap-hints-dismissed';

function loadMap(): MindMapData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const nodes: Record<string, MindMapNode> = {};
      for (const [k, v] of Object.entries(parsed.nodes)) nodes[k] = migrateNode(v);
      return { ...parsed, nodes };
    }
  } catch {}
  return createDefaultMap();
}

function saveMap(data: MindMapData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Layout engines ──────────────────────────────────────────
function shiftSubtree(nodes: Record<string, MindMapNode>, nodeId: string, dx: number, dy: number) {
  const node = nodes[nodeId];
  if (!node) return;
  node.x += dx;
  node.y += dy;
  if (!node.collapsed) {
    for (const cid of node.children) shiftSubtree(nodes, cid, dx, dy);
  }
}

function layoutRadial(data: MindMapData): MindMapData {
  const nodes: Record<string, MindMapNode> = {};
  for (const [k, v] of Object.entries(data.nodes)) nodes[k] = { ...v };
  const root = nodes[data.rootId];
  if (!root) return data;

  root.x = 0;
  root.y = 0;

  const rootChildren = root.children;
  const mid = Math.ceil(rootChildren.length / 2);
  const rightChildren = rootChildren.slice(0, mid);
  const leftChildren = rootChildren.slice(mid);

  function layoutSubtree(nodeId: string, depth: number, direction: 1 | -1): number {
    const node = nodes[nodeId];
    if (!node) return 0;
    node.x = depth * H_GAP * direction;
    if (node.collapsed || node.children.length === 0) return V_GAP;

    let totalHeight = 0;
    const childHeights: number[] = [];
    for (const childId of node.children) {
      const h = layoutSubtree(childId, depth + 1, direction);
      childHeights.push(h);
      totalHeight += h;
    }

    let currentY = node.y - totalHeight / 2 + childHeights[0] / 2;
    for (let i = 0; i < node.children.length; i++) {
      const child = nodes[node.children[i]];
      if (child) {
        const shiftY = currentY - child.y;
        shiftSubtree(nodes, child.id, 0, shiftY);
        child.y = currentY;
        currentY += childHeights[i];
      }
    }
    return Math.max(totalHeight, V_GAP);
  }

  // Right side
  let rightTotalH = 0;
  const rightHeights: number[] = [];
  for (const cid of rightChildren) {
    const h = layoutSubtree(cid, 1, 1);
    rightHeights.push(h);
    rightTotalH += h;
  }
  let ry = -rightTotalH / 2;
  for (let i = 0; i < rightChildren.length; i++) {
    const child = nodes[rightChildren[i]];
    if (child) {
      const shift = ry + rightHeights[i] / 2 - child.y;
      shiftSubtree(nodes, child.id, 0, shift);
      child.y = ry + rightHeights[i] / 2;
      ry += rightHeights[i];
    }
  }

  // Left side
  let leftTotalH = 0;
  const leftHeights: number[] = [];
  for (const cid of leftChildren) {
    const h = layoutSubtree(cid, 1, -1);
    leftHeights.push(h);
    leftTotalH += h;
  }
  let ly = -leftTotalH / 2;
  for (let i = 0; i < leftChildren.length; i++) {
    const child = nodes[leftChildren[i]];
    if (child) {
      const shift = ly + leftHeights[i] / 2 - child.y;
      shiftSubtree(nodes, child.id, 0, shift);
      child.y = ly + leftHeights[i] / 2;
      ly += leftHeights[i];
    }
  }

  return { ...data, nodes };
}

function layoutTopDown(data: MindMapData, hGap: number, vGap: number): MindMapData {
  const nodes: Record<string, MindMapNode> = {};
  for (const [k, v] of Object.entries(data.nodes)) nodes[k] = { ...v };
  const root = nodes[data.rootId];
  if (!root) return data;

  root.x = 0;
  root.y = 0;

  function measure(nodeId: string): number {
    const node = nodes[nodeId];
    if (!node || node.collapsed || node.children.length === 0) return hGap;
    let total = 0;
    for (const cid of node.children) total += measure(cid);
    return Math.max(total, hGap);
  }

  function position(nodeId: string, x: number, y: number) {
    const node = nodes[nodeId];
    if (!node) return;
    node.x = x;
    node.y = y;
    if (node.collapsed || node.children.length === 0) return;

    const widths = node.children.map(cid => measure(cid));
    const totalWidth = widths.reduce((a, b) => a + b, 0);
    let cx = x - totalWidth / 2;
    for (let i = 0; i < node.children.length; i++) {
      position(node.children[i], cx + widths[i] / 2, y + vGap);
      cx += widths[i];
    }
  }

  position(data.rootId, 0, 0);
  return { ...data, nodes };
}

function layoutTree(data: MindMapData, mode: LayoutMode): MindMapData {
  switch (mode) {
    case 'radial': return layoutRadial(data);
    case 'tree': return layoutTopDown(data, TREE_H_GAP, TREE_V_GAP);
    case 'orgchart': return layoutTopDown(data, TREE_H_GAP + 20, TREE_V_GAP + 10);
    default: return layoutRadial(data);
  }
}

// ─── Component ────────────────────────────────────────────────
interface MindMapProps {
  cards?: ZettelCardType[];
  onCardSelect?: (card: ZettelCardType) => void;
  onCreateCard?: (card: Partial<ZettelCardType>) => void;
}

export default function MindMap({ cards = [], onCardSelect, onCreateCard }: MindMapProps) {
  const { user } = useAuth();
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('radial');
  const [data, setData] = useState<MindMapData>(() => layoutTree(loadMap(), 'radial'));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<MindMapData[]>([]);
  const [future, setFuture] = useState<MindMapData[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hintsDismissed, setHintsDismissed] = useState(() => localStorage.getItem(HINTS_KEY) === '1');

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);

  // Minimap
  const [minimapOpen, setMinimapOpen] = useState(true);

  // AI Generate
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiSubject, setAiSubject] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Drag
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  // Save/Recall state
  const [currentMapId, setCurrentMapId] = useState<string | null>(null);
  const [currentMapTitle, setCurrentMapTitle] = useState<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Card picker state
  const [cardPickerOpen, setCardPickerOpen] = useState(false);
  const [cardPickerNodeId, setCardPickerNodeId] = useState<string | null>(null);
  const [cardPickerSearch, setCardPickerSearch] = useState('');

  // Node detail panel
  const [nodeDetailOpen, setNodeDetailOpen] = useState(false);
  const [nodeDetailId, setNodeDetailId] = useState<string | null>(null);
  const [nodeDetailNote, setNodeDetailNote] = useState('');

  // Study guide state
  const [studyGuideOpen, setStudyGuideOpen] = useState(false);
  const [studyGuideContent, setStudyGuideContent] = useState('');
  const [studyGuideLoading, setStudyGuideLoading] = useState(false);
  const [studyGuideLoadingText, setStudyGuideLoadingText] = useState('');


  const canvasRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Save on change
  // Mark dirty on data change & save locally
  useEffect(() => { saveMap(data); setIsDirty(true); }, [data]);
  useEffect(() => { if (editingId && editInputRef.current) editInputRef.current.focus(); }, [editingId]);
  useEffect(() => { if (searchOpen && searchInputRef.current) searchInputRef.current.focus(); }, [searchOpen]);

  // Center canvas initially
  useEffect(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
    }
  }, []);

  // Search logic
  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const matches = Object.values(data.nodes).filter(n => n.text.toLowerCase().includes(q) || n.note.toLowerCase().includes(q)).map(n => n.id);
    setSearchResults(matches);
    setSearchIndex(0);
  }, [searchQuery, data.nodes]);

  // Auto-pan to search result
  useEffect(() => {
    if (searchResults.length === 0) return;
    const nodeId = searchResults[searchIndex];
    const node = data.nodes[nodeId];
    if (!node || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setPan({ x: rect.width / 2 - node.x * zoom, y: rect.height / 2 - node.y * zoom });
    setSelectedId(nodeId);
  }, [searchResults, searchIndex]);

  const pushHistory = useCallback((d: MindMapData) => {
    setHistory(prev => [...prev.slice(-30), d]);
    setFuture([]);
  }, []);

  const updateData = useCallback((updater: (d: MindMapData) => MindMapData) => {
    setData(prev => {
      pushHistory(prev);
      return layoutTree(updater(prev), layoutMode);
    });
  }, [pushHistory, layoutMode]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    setFuture(prev => [data, ...prev]);
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setData(layoutTree(prev, layoutMode));
  }, [history, data, layoutMode]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    setHistory(h => [...h, data]);
    const next = future[0];
    setFuture(f => f.slice(1));
    setData(layoutTree(next, layoutMode));
  }, [future, data, layoutMode]);

  // Relayout when mode changes
  useEffect(() => {
    setData(prev => layoutTree(prev, layoutMode));
  }, [layoutMode]);

  // ── Save/Load to Supabase ──
  const saveToDb = useCallback(async (title?: string) => {
    if (!user) { toast.error('Sign in to save'); return; }
    setIsSaving(true);
    try {
      const payload = {
        user_id: user.id,
        title: title || currentMapTitle || 'Untitled Map',
        map_data: data,
        layout_mode: layoutMode,
      };
      if (currentMapId) {
        const { error } = await supabase.from('mind_maps' as any).update(payload).eq('id', currentMapId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase.from('mind_maps' as any).insert(payload).select('id').single();
        if (error) throw error;
        setCurrentMapId((inserted as any).id);
      }
      setCurrentMapTitle(payload.title);
      setIsDirty(false);
      toast.success('Mind map saved');
    } catch (err: any) {
      toast.error('Failed to save: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  }, [user, data, layoutMode, currentMapId, currentMapTitle]);

  const handleSave = useCallback(() => {
    if (currentMapId) {
      saveToDb();
    } else {
      setSaveTitle('');
      setSaveDialogOpen(true);
    }
  }, [currentMapId, saveToDb]);

  const handleLoadMap = useCallback((id: string, title: string, mapData: any, lm: string) => {
    pushHistory(data);
    const nodes: Record<string, MindMapNode> = {};
    for (const [k, v] of Object.entries(mapData.nodes || {})) nodes[k] = migrateNode(v);
    const loaded = layoutTree({ ...mapData, nodes }, lm as LayoutMode);
    setData(loaded);
    setCurrentMapId(id);
    setCurrentMapTitle(title);
    setLayoutMode(lm as LayoutMode);
    setIsDirty(false);
    setSelectedId(null);
    setEditingId(null);
    toast.success(`Loaded: ${title}`);
  }, [data, pushHistory]);

  const handleNewMap = useCallback(() => {
    pushHistory(data);
    const fresh = layoutTree(createDefaultMap(), layoutMode);
    setData(fresh);
    setCurrentMapId(null);
    setCurrentMapTitle('');
    setIsDirty(false);
    setSelectedId(null);
    setEditingId(null);
    toast.success('New mind map created');
  }, [data, pushHistory, layoutMode]);

  // ── Card Linking ──
  const linkCardToNode = useCallback((nodeId: string, cardId: string) => {
    updateData(d => {
      const nodes = { ...d.nodes };
      nodes[nodeId] = { ...nodes[nodeId], linked_card_id: cardId };
      return { ...d, nodes };
    });
    toast.success('Card linked to node');
  }, [updateData]);

  const unlinkCard = useCallback((nodeId: string) => {
    updateData(d => {
      const nodes = { ...d.nodes };
      nodes[nodeId] = { ...nodes[nodeId], linked_card_id: null };
      return { ...d, nodes };
    });
    toast.success('Card unlinked');
  }, [updateData]);

  const createCardFromNode = useCallback((nodeId: string) => {
    const node = data.nodes[nodeId];
    if (!node || !onCreateCard) return;
    onCreateCard({
      title: node.text,
      content: node.note || `Created from mind map node: ${node.text}`,
      tags: ['mind-map'],
      category: '000',
      number: `MM-${Date.now()}`,
      linkedCards: [],
    });
    toast.success('Card created from node');
  }, [data, onCreateCard]);

  // ── Study Guide ──
  const generateStudyGuide = useCallback(async () => {
    setStudyGuideOpen(true);
    setStudyGuideLoading(true);
    setStudyGuideContent('');
    setStudyGuideLoadingText('Analyzing mind map...');

    try {
      setTimeout(() => setStudyGuideLoadingText('Generating study guide...'), 1500);
      
      // Collect linked cards content
      const linkedCards = cards.filter(c =>
        Object.values(data.nodes).some(n => n.linked_card_id === c.id)
      );

      const { data: fnData, error } = await supabase.functions.invoke('generate-study-guide', {
        body: {
          mapData: data,
          linkedCards,
          mapTitle: currentMapTitle || data.nodes[data.rootId]?.text || 'Mind Map',
        },
      });

      if (error) throw error;
      if (fnData?.error) throw new Error(fnData.error);
      setStudyGuideContent(fnData?.guide || 'No content generated');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate study guide');
      setStudyGuideContent('');
      setStudyGuideOpen(false);
    } finally {
      setStudyGuideLoading(false);
    }
  }, [data, cards, currentMapTitle]);

  // ── Node operations ──
  const addChild = useCallback((parentId: string) => {
    const newId = uid();
    const parent = data.nodes[parentId];
    if (!parent) return;
    const color = parent.parentId === null
      ? BRANCH_COLORS[parent.children.length % BRANCH_COLORS.length]
      : parent.color;

    updateData(d => {
      const nodes = { ...d.nodes };
      nodes[parentId] = { ...nodes[parentId], children: [...nodes[parentId].children, newId], collapsed: false };
      nodes[newId] = { id: newId, text: 'New Topic', children: [], collapsed: false, color, x: 0, y: 0, parentId, emoji: '', note: '', priority: 'none' };
      return { ...d, nodes };
    });
    setSelectedId(newId);
    setEditingId(newId);
    setEditText('New Topic');
  }, [data, updateData]);

  const addSibling = useCallback((nodeId: string) => {
    const node = data.nodes[nodeId];
    if (!node || !node.parentId) return;
    addChild(node.parentId);
  }, [data, addChild]);

  const deleteNode = useCallback((nodeId: string) => {
    if (nodeId === data.rootId) return;
    const node = data.nodes[nodeId];
    if (!node || !node.parentId) return;

    updateData(d => {
      const nodes = { ...d.nodes };
      const parent = nodes[node.parentId!];
      if (parent) nodes[node.parentId!] = { ...parent, children: parent.children.filter(c => c !== nodeId) };
      const toRemove = [nodeId];
      while (toRemove.length) {
        const id = toRemove.pop()!;
        const n = nodes[id];
        if (n) { toRemove.push(...n.children); delete nodes[id]; }
      }
      return { ...d, nodes };
    });
    setSelectedId(node.parentId);
  }, [data, updateData]);

  const toggleCollapse = useCallback((nodeId: string) => {
    updateData(d => {
      const nodes = { ...d.nodes };
      nodes[nodeId] = { ...nodes[nodeId], collapsed: !nodes[nodeId].collapsed };
      return { ...d, nodes };
    });
  }, [updateData]);

  const commitEdit = useCallback(() => {
    if (!editingId) return;
    updateData(d => {
      const nodes = { ...d.nodes };
      nodes[editingId] = { ...nodes[editingId], text: editText || 'Untitled' };
      return { ...d, nodes };
    });
    setEditingId(null);
  }, [editingId, editText, updateData]);

  const changeColor = useCallback((nodeId: string, color: string) => {
    const paintSubtree = (nodes: Record<string, MindMapNode>, id: string, c: string) => {
      nodes[id] = { ...nodes[id], color: c };
      for (const cid of nodes[id].children) paintSubtree(nodes, cid, c);
    };
    updateData(d => {
      const nodes = { ...d.nodes };
      paintSubtree(nodes, nodeId, color);
      return { ...d, nodes };
    });
  }, [updateData]);

  const setEmoji = useCallback((nodeId: string, emoji: string) => {
    updateData(d => {
      const nodes = { ...d.nodes };
      nodes[nodeId] = { ...nodes[nodeId], emoji };
      return { ...d, nodes };
    });
  }, [updateData]);

  const setPriority = useCallback((nodeId: string, priority: Priority) => {
    updateData(d => {
      const nodes = { ...d.nodes };
      nodes[nodeId] = { ...nodes[nodeId], priority };
      return { ...d, nodes };
    });
  }, [updateData]);

  const setNote = useCallback((nodeId: string, note: string) => {
    updateData(d => {
      const nodes = { ...d.nodes };
      nodes[nodeId] = { ...nodes[nodeId], note };
      return { ...d, nodes };
    });
  }, [updateData]);

  const duplicateBranch = useCallback((nodeId: string) => {
    const node = data.nodes[nodeId];
    if (!node || !node.parentId) return;

    updateData(d => {
      const nodes = { ...d.nodes };

      function cloneSubtree(srcId: string, newParentId: string): string {
        const src = nodes[srcId];
        const newId = uid();
        nodes[newId] = { ...src, id: newId, parentId: newParentId, children: [] };
        for (const cid of src.children) {
          const clonedChild = cloneSubtree(cid, newId);
          nodes[newId].children.push(clonedChild);
        }
        return newId;
      }

      const clonedId = cloneSubtree(nodeId, node.parentId);
      const parent = nodes[node.parentId];
      const idx = parent.children.indexOf(nodeId);
      const newChildren = [...parent.children];
      newChildren.splice(idx + 1, 0, clonedId);
      nodes[node.parentId] = { ...parent, children: newChildren };
      return { ...d, nodes };
    });
    toast.success('Branch duplicated');
  }, [data, updateData]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Search shortcut
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (e.key === 'Escape' && searchOpen) { setSearchOpen(false); setSearchQuery(''); return; }

      if (editingId) {
        if (e.key === 'Enter') { e.preventDefault(); commitEdit(); }
        if (e.key === 'Escape') { setEditingId(null); }
        return;
      }
      if (!selectedId) return;
      if (e.key === 'Tab') { e.preventDefault(); addChild(selectedId); }
      if (e.key === 'Enter') { e.preventDefault(); addSibling(selectedId); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteNode(selectedId); }
      if (e.key === 'F2' || e.key === ' ') { e.preventDefault(); setEditingId(selectedId); setEditText(data.nodes[selectedId]?.text || ''); }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.shiftKey ? redo() : undo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedId, editingId, commitEdit, addChild, addSibling, deleteNode, undo, redo, data, searchOpen]);

  // ── Pan & zoom ──
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom(z => Math.max(0.2, Math.min(3, z - e.deltaY * 0.001)));
    } else {
      setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).dataset.canvas) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedId(null);
    }
  }, [pan]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handlePointerUp = useCallback(() => { setIsPanning(false); setDraggingId(null); }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
    }
  }, []);

  const fitToScreen = useCallback(() => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const allNodes = Object.values(data.nodes);
    if (allNodes.length === 0) return;
    const xs = allNodes.map(n => n.x);
    const ys = allNodes.map(n => n.y);
    const minX = Math.min(...xs) - 140;
    const maxX = Math.max(...xs) + 140;
    const minY = Math.min(...ys) - 60;
    const maxY = Math.max(...ys) + 60;
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const z = Math.min(rect.width / w, rect.height / h, 2) * 0.85;
    setZoom(z);
    setPan({ x: rect.width / 2 - ((minX + maxX) / 2) * z, y: rect.height / 2 - ((minY + maxY) / 2) * z });
  }, [data]);

  const exportAsJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'mindmap.json'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Mind map exported');
  }, [data]);

  const resetMap = useCallback(() => {
    pushHistory(data);
    const fresh = layoutTree(createDefaultMap(), layoutMode);
    setData(fresh);
    setSelectedId(null);
    setEditingId(null);
    toast.success('Mind map reset');
  }, [data, pushHistory, layoutMode]);

  const dismissHints = useCallback(() => {
    setHintsDismissed(true);
    localStorage.setItem(HINTS_KEY, '1');
  }, []);

  // ── AI Generate ──
  const aiGenerateMindMap = useCallback(async () => {
    if (!aiSubject.trim()) return;
    setAiLoading(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('generate-mindmap', {
        body: { subject: aiSubject.trim() },
      });

      if (fnError) throw new Error(fnError.message || 'Failed to generate mind map');
      if (fnData?.error) throw new Error(fnData.error);

      const { root, branches } = fnData;
      if (!root || !branches?.length) throw new Error('Invalid response structure');

      // Convert AI result to MindMapData
      const rootId = uid();
      const nodes: Record<string, MindMapNode> = {};
      nodes[rootId] = {
        id: rootId, text: root.text || aiSubject.trim(), children: [], collapsed: false,
        color: BRANCH_COLORS[0], x: 0, y: 0, parentId: null, emoji: root.emoji || '🧠', note: '', priority: 'none',
      };

      for (let i = 0; i < branches.length && i < 8; i++) {
        const branch = branches[i];
        const branchId = uid();
        const branchColor = BRANCH_COLORS[i % BRANCH_COLORS.length];
        nodes[branchId] = {
          id: branchId, text: branch.text, children: [], collapsed: false,
          color: branchColor, x: 0, y: 0, parentId: rootId, emoji: branch.emoji || '', note: '', priority: 'none',
        };
        nodes[rootId].children.push(branchId);

        if (branch.children) {
          for (let j = 0; j < branch.children.length && j < 5; j++) {
            const child = branch.children[j];
            const childId = uid();
            nodes[childId] = {
              id: childId, text: child.text, children: [], collapsed: false,
              color: branchColor, x: 0, y: 0, parentId: branchId, emoji: child.emoji || '', note: '', priority: 'none',
            };
            nodes[branchId].children.push(childId);
          }
        }
      }

      const newData: MindMapData = { rootId, nodes };
      pushHistory(data);
      const laid = layoutTree(newData, layoutMode);
      setData(laid);
      setSelectedId(null);
      setEditingId(null);
      setAiDialogOpen(false);
      setAiSubject('');

      // Fit to screen after render
      setTimeout(() => fitToScreen(), 100);
      toast.success(`Mind map generated with ${Object.keys(nodes).length} nodes`);
    } catch (err: any) {
      console.error('AI mind map error:', err);
      toast.error(err.message || 'Failed to generate mind map');
    } finally {
      setAiLoading(false);
    }
  }, [aiSubject, data, pushHistory, layoutMode, fitToScreen]);

  // ── Drag to rearrange ──
  const handleNodeDragStart = useCallback((nodeId: string, e: React.PointerEvent) => {
    const node = data.nodes[nodeId];
    if (!node || !node.parentId || nodeId === data.rootId) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggingId(nodeId);
    setDragStartPos({ x: e.clientX, y: e.clientY });
  }, [data]);

  const handleNodeDragEnd = useCallback((e: React.PointerEvent) => {
    if (!draggingId) return;
    const node = data.nodes[draggingId];
    if (!node || !node.parentId) { setDraggingId(null); return; }

    const dy = e.clientY - dragStartPos.y;
    const parent = data.nodes[node.parentId];
    if (!parent) { setDraggingId(null); return; }

    const siblings = parent.children;
    const currentIdx = siblings.indexOf(draggingId);
    const step = dy > 30 ? 1 : dy < -30 ? -1 : 0;
    const newIdx = Math.max(0, Math.min(siblings.length - 1, currentIdx + step));

    if (newIdx !== currentIdx) {
      updateData(d => {
        const nodes = { ...d.nodes };
        const newChildren = [...siblings];
        newChildren.splice(currentIdx, 1);
        newChildren.splice(newIdx, 0, draggingId);
        nodes[node.parentId!] = { ...nodes[node.parentId!], children: newChildren };
        return { ...d, nodes };
      });
    }
    setDraggingId(null);
  }, [draggingId, dragStartPos, data, updateData]);

  // ── Collect visible nodes and edges ──
  const { visibleNodes, edges } = useMemo(() => {
    const visible: MindMapNode[] = [];
    const edgeList: { from: MindMapNode; to: MindMapNode; depth: number }[] = [];

    function walk(nodeId: string, depth: number) {
      const node = data.nodes[nodeId];
      if (!node) return;
      visible.push(node);
      if (!node.collapsed) {
        for (const cid of node.children) {
          const child = data.nodes[cid];
          if (child) {
            edgeList.push({ from: node, to: child, depth });
            walk(cid, depth + 1);
          }
        }
      }
    }
    walk(data.rootId, 0);
    return { visibleNodes: visible, edges: edgeList };
  }, [data]);

  // ── Minimap calculations ──
  const minimapData = useMemo(() => {
    const allNodes = Object.values(data.nodes);
    if (allNodes.length === 0) return null;
    const xs = allNodes.map(n => n.x);
    const ys = allNodes.map(n => n.y);
    const minX = Math.min(...xs) - 50;
    const maxX = Math.max(...xs) + 50;
    const minY = Math.min(...ys) - 30;
    const maxY = Math.max(...ys) + 30;
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    return { minX, maxX, minY, maxY, w, h };
  }, [data.nodes]);

  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!minimapData || !canvasRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / rect.width;
    const my = (e.clientY - rect.top) / rect.height;
    const worldX = minimapData.minX + mx * minimapData.w;
    const worldY = minimapData.minY + my * minimapData.h;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    setPan({ x: canvasRect.width / 2 - worldX * zoom, y: canvasRect.height / 2 - worldY * zoom });
  }, [minimapData, zoom]);

  const nodeCount = Object.keys(data.nodes).length;

  const layoutIcons: Record<LayoutMode, React.ReactNode> = {
    radial: <Network className="h-3.5 w-3.5" />,
    tree: <Layout className="h-3.5 w-3.5" />,
    orgchart: <Building2 className="h-3.5 w-3.5" />,
  };

  const layoutLabels: Record<LayoutMode, string> = {
    radial: 'Radial',
    tree: 'Tree',
    orgchart: 'Org Chart',
  };

  // Render a node with context menu
  const renderNode = (node: MindMapNode) => {
    const isRoot = node.id === data.rootId;
    const isSelected = node.id === selectedId;
    const isEditing = node.id === editingId;
    const isHovered = node.id === hoveredId;
    const hasChildren = node.children.length > 0;
    const isSearchMatch = searchResults.includes(node.id);
    const isCurrentSearchResult = searchResults[searchIndex] === node.id;
    const nodeWidth = isRoot ? 150 : 130;

    return (
      <ContextMenu key={node.id}>
        <ContextMenuTrigger asChild>
          <div
            className={cn("absolute group", draggingId === node.id && "opacity-50")}
            style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)', zIndex: isSelected ? 20 : isHovered ? 15 : 10 }}
            onPointerEnter={() => setHoveredId(node.id)}
            onPointerLeave={() => setHoveredId(null)}
          >
            {/* Search highlight ring */}
            {isSearchMatch && (
              <div
                className={cn("absolute inset-0 rounded-xl pointer-events-none", isCurrentSearchResult ? "mindmap-search-highlight" : "ring-2 ring-ring/50")}
                style={{ margin: '-6px' }}
              />
            )}

            {/* Node body */}
            <div
              className={cn(
                "relative rounded-xl cursor-pointer transition-all duration-200",
                isRoot
                  ? "px-5 py-3 text-sm font-semibold text-center mindmap-node-glow"
                  : "px-3.5 py-2 text-xs font-medium",
                isSelected
                  ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
                  : "",
              )}
              style={{
                minWidth: isRoot ? '120px' : '80px',
                maxWidth: `${nodeWidth}px`,
                background: isRoot
                  ? `linear-gradient(135deg, ${node.color}, ${node.color}dd)`
                  : `linear-gradient(135deg, color-mix(in srgb, ${node.color} 14%, hsl(var(--card))), hsl(var(--card)))`,
                borderLeft: isRoot ? 'none' : `3px solid ${node.color}`,
                color: isRoot ? 'white' : 'hsl(var(--foreground))',
                boxShadow: isSelected
                  ? `0 4px 20px color-mix(in srgb, ${node.color} 30%, transparent)`
                  : isRoot
                    ? `0 6px 24px color-mix(in srgb, ${node.color} 35%, transparent)`
                    : `0 2px 8px hsl(var(--card-shadow))`,
              }}
              onClick={(e) => { e.stopPropagation(); setSelectedId(node.id); setNodeDetailId(node.id); setNodeDetailNote(node.note || ''); setNodeDetailOpen(true); }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                if (node.linked_card_id && onCardSelect) {
                  const card = cards.find(c => c.id === node.linked_card_id);
                  if (card) { onCardSelect(card); return; }
                }
                setEditingId(node.id); setEditText(node.text);
              }}
              onPointerDown={(e) => { if (e.button === 0 && !isRoot) handleNodeDragStart(node.id, e); }}
            >
              {/* Priority dot */}
              {node.priority !== 'none' && (
                <div
                  className="absolute -top-1 -right-1 h-3 w-3 rounded-full border-2"
                  style={{ backgroundColor: PRIORITY_COLORS[node.priority], borderColor: isRoot ? node.color : 'hsl(var(--card))' }}
                />
              )}

              {/* Content */}
              <div className="flex items-center gap-1.5">
                {node.emoji && <span className="text-sm flex-shrink-0">{node.emoji}</span>}
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    className="bg-transparent outline-none border-none text-inherit font-inherit min-w-[50px] w-full"
                    onClick={e => e.stopPropagation()}
                  />
                ) : (
                  <span className="truncate">{node.text}</span>
                )}
              </div>

              {/* Note preview */}
              {node.note && !isEditing && (
                <div className="text-[10px] mt-0.5 truncate" style={{ opacity: 0.55, maxWidth: `${nodeWidth - 30}px` }}>
                  {node.note.length > 30 ? node.note.slice(0, 30) + '…' : node.note}
                </div>
              )}

              {/* Linked card badge */}
              {node.linked_card_id && !isEditing && (
                <div className="absolute -bottom-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center z-10" title="Linked to card">
                  <CreditCard className="h-2.5 w-2.5 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Collapse toggle */}
            {hasChildren && (
              <button
                className="absolute h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-20"
                style={{
                  top: layoutMode === 'radial' ? '50%' : '100%',
                  left: layoutMode === 'radial' ? (node.x >= 0 || isRoot ? '100%' : '0%') : '50%',
                  transform: layoutMode === 'radial'
                    ? `translate(${node.x >= 0 || isRoot ? '4px' : '-24px'}, -50%)`
                    : 'translate(-50%, 4px)',
                }}
                onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
              >
                {node.collapsed
                  ? <span className="text-[9px] font-bold text-muted-foreground">{node.children.length}</span>
                  : <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                }
              </button>
            )}

            {/* Action ring - appears on hover */}
            {isHovered && !isEditing && (
              <div className="mindmap-action-ring absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 z-30">
                <button
                  className="h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-all shadow-sm"
                  onClick={(e) => { e.stopPropagation(); addChild(node.id); }}
                  title="Add child"
                >
                  <Plus className="h-3 w-3 text-muted-foreground" />
                </button>
                {!isRoot && (
                  <button
                    className="h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-destructive/10 transition-all shadow-sm"
                    onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
                <button
                  className="h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-all shadow-sm"
                  onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
                  title={node.collapsed ? 'Expand' : 'Collapse'}
                >
                  {node.collapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                </button>
              </div>
            )}
          </div>
        </ContextMenuTrigger>

        <ContextMenuContent className="w-52">
          <ContextMenuItem onClick={() => addChild(node.id)}>
            <Plus className="h-3.5 w-3.5 mr-2" />Add Child
          </ContextMenuItem>
          {!isRoot && (
            <ContextMenuItem onClick={() => addSibling(node.id)}>
              <Plus className="h-3.5 w-3.5 mr-2" />Add Sibling
            </ContextMenuItem>
          )}
          <ContextMenuItem onClick={() => { setEditingId(node.id); setEditText(node.text); }}>
            <Edit3 className="h-3.5 w-3.5 mr-2" />Edit
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Palette className="h-3.5 w-3.5 mr-2" />Color
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <div className="flex flex-wrap gap-1.5 p-2 max-w-[140px]">
                {BRANCH_COLORS.map(c => (
                  <button key={c} className="h-5 w-5 rounded-full border border-border hover:scale-125 transition-transform" style={{ background: c }} onClick={() => changeColor(node.id, c)} />
                ))}
              </div>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Smile className="h-3.5 w-3.5 mr-2" />Emoji
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <div className="flex flex-wrap gap-1 p-2 max-w-[160px]">
                <button className="h-6 w-6 rounded text-xs hover:bg-accent flex items-center justify-center" onClick={() => setEmoji(node.id, '')}>✕</button>
                {EMOJI_OPTIONS.map(em => (
                  <button key={em} className="h-6 w-6 rounded hover:bg-accent flex items-center justify-center text-sm" onClick={() => setEmoji(node.id, em)}>{em}</button>
                ))}
              </div>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Star className="h-3.5 w-3.5 mr-2" />Priority
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {(['none', 'low', 'medium', 'high'] as Priority[]).map(p => (
                <ContextMenuItem key={p} onClick={() => setPriority(node.id, p)}>
                  <div className="h-2.5 w-2.5 rounded-full mr-2" style={{ background: PRIORITY_COLORS[p], border: p === 'none' ? '1px solid hsl(var(--border))' : 'none' }} />
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuItem onClick={() => {
            setNodeDetailId(node.id);
            setNodeDetailNote(node.note || '');
            setNodeDetailOpen(true);
          }}>
            <StickyNote className="h-3.5 w-3.5 mr-2" />Edit Note
          </ContextMenuItem>
          <ContextMenuSeparator />
          {/* Card linking */}
          <ContextMenuItem onClick={() => { setCardPickerNodeId(node.id); setCardPickerSearch(''); setCardPickerOpen(true); }}>
            <Link2 className="h-3.5 w-3.5 mr-2" />Link to Card
          </ContextMenuItem>
          {node.linked_card_id && (
            <>
              <ContextMenuItem onClick={() => {
                const card = cards.find(c => c.id === node.linked_card_id);
                if (card && onCardSelect) onCardSelect(card);
                else toast.error('Linked card not found');
              }}>
                <ExternalLink className="h-3.5 w-3.5 mr-2" />Open Linked Card
              </ContextMenuItem>
              <ContextMenuItem onClick={() => unlinkCard(node.id)}>
                <X className="h-3.5 w-3.5 mr-2" />Unlink Card
              </ContextMenuItem>
            </>
          )}
          {onCreateCard && (
            <ContextMenuItem onClick={() => createCardFromNode(node.id)}>
              <CreditCard className="h-3.5 w-3.5 mr-2" />Create Card from Node
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => toggleCollapse(node.id)}>
            {node.collapsed ? <ChevronRight className="h-3.5 w-3.5 mr-2" /> : <ChevronDown className="h-3.5 w-3.5 mr-2" />}
            {node.collapsed ? 'Expand' : 'Collapse'}
          </ContextMenuItem>
          {!isRoot && (
            <ContextMenuItem onClick={() => duplicateBranch(node.id)}>
              <Copy className="h-3.5 w-3.5 mr-2" />Duplicate Branch
            </ContextMenuItem>
          )}
          {!isRoot && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteNode(node.id)}>
                <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-card/60 backdrop-blur-sm shrink-0 flex-wrap">
        {/* Brand */}
        <div className="flex items-center gap-1.5 mr-1">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Mind Map</span>
          <span className="text-[10px] text-muted-foreground/60">{nodeCount}</span>
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Layout toggle */}
        <div className="flex items-center bg-muted rounded-md p-0.5">
          {(['radial', 'tree', 'orgchart'] as LayoutMode[]).map(mode => (
            <button
              key={mode}
              className={cn(
                "h-7 px-2 rounded text-[11px] font-medium flex items-center gap-1 transition-all",
                layoutMode === mode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setLayoutMode(mode)}
              title={layoutLabels[mode]}
            >
              {layoutIcons[mode]}
              <span className="hidden sm:inline">{layoutLabels[mode]}</span>
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-border" />

        {/* Actions */}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={undo} disabled={history.length === 0} aria-label="Undo">
          <Undo2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={redo} disabled={future.length === 0} aria-label="Redo">
          <Redo2 className="h-3.5 w-3.5" />
        </Button>

        <div className="flex-1" />

        {/* Search */}
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSearchOpen(o => !o)} aria-label="Search">
          <Search className="h-3.5 w-3.5" />
        </Button>

        {/* Zoom */}
        <div className="flex items-center bg-muted rounded-md p-0.5">
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded" onClick={() => setZoom(z => Math.min(3, z + 0.2))}>
            <ZoomIn className="h-3 w-3" />
          </Button>
          <span className="text-[10px] text-muted-foreground w-8 text-center font-medium">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))}>
            <ZoomOut className="h-3 w-3" />
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fitToScreen} aria-label="Fit">
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={resetView} aria-label="Reset">
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>

        <div className="h-5 w-px bg-border" />

        {/* Save/Open */}
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
          Save
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setLibraryOpen(true)}>
          <FolderOpen className="h-3 w-3 mr-1" />Open
        </Button>

        <div className="h-5 w-px bg-border" />

        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={exportAsJSON}>
          <Download className="h-3 w-3 mr-1" />Export
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleNewMap}>
          New
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={generateStudyGuide}>
          <FileText className="h-3 w-3 mr-1" />Study Guide
        </Button>
        <Button variant="default" size="sm" className="h-7 px-2.5 text-xs" onClick={() => setAiDialogOpen(true)}>
          <Sparkles className="h-3 w-3 mr-1" />AI Generate
        </Button>

        {/* Save status */}
        {currentMapTitle && (
          <span className="text-[10px] text-muted-foreground ml-1 hidden sm:inline">
            {currentMapTitle}{isDirty ? ' •' : ' ✓'}
          </span>
        )}
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        data-canvas="true"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => { handlePointerUp(); handleNodeDragEnd(e); }}
        onPointerLeave={handlePointerUp}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          data-canvas="true"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--border) / 0.4) 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x % (24 * zoom)}px ${pan.y % (24 * zoom)}px`,
          }}
        />

        {/* Transformed layer */}
        <div
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}
          className="absolute top-0 left-0"
        >
          {/* SVG edges with tapered organic branches */}
          <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{ width: 1, height: 1 }}>
            <defs>
              {edges.map(({ from, to }) => (
                <linearGradient key={`grad-${from.id}-${to.id}`} id={`grad-${from.id}-${to.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={from.id === data.rootId ? to.color : from.color} stopOpacity={0.7} />
                  <stop offset="100%" stopColor={to.color} stopOpacity={0.5} />
                </linearGradient>
              ))}
            </defs>
            {edges.map(({ from, to, depth }) => {
              const isVertical = layoutMode !== 'radial';
              let d: string;
              if (isVertical) {
                const midY = (from.y + to.y) / 2;
                d = `M ${from.x} ${from.y + 20} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y - 18}`;
              } else {
                const fromX = from.x + (to.x > from.x ? 65 : -65);
                const toX = to.x + (to.x > from.x ? -55 : 55);
                const midX = (fromX + toX) / 2;
                d = `M ${fromX} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${toX} ${to.y}`;
              }
              return (
                <path
                  key={`${from.id}-${to.id}`}
                  d={d}
                  fill="none"
                  stroke={`url(#grad-${from.id}-${to.id})`}
                  strokeWidth={depth === 0 ? 3.5 : depth === 1 ? 2.5 : 1.8}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {visibleNodes.map(renderNode)}
        </div>

        {/* Search overlay */}
        {searchOpen && (
          <div className="absolute top-3 right-3 z-40 flex items-center gap-1 bg-card/95 backdrop-blur-md border border-border rounded-lg shadow-lg px-2 py-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Find nodes…"
              className="bg-transparent outline-none text-xs w-36 placeholder:text-muted-foreground/50"
              onKeyDown={e => {
                if (e.key === 'Enter') setSearchIndex(i => (i + 1) % Math.max(1, searchResults.length));
                if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); }
              }}
            />
            {searchResults.length > 0 && (
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {searchIndex + 1}/{searchResults.length}
              </span>
            )}
            <button className="h-5 w-5 rounded flex items-center justify-center hover:bg-accent" onClick={() => setSearchIndex(i => Math.max(0, i - 1))}>
              <ChevronUp className="h-3 w-3" />
            </button>
            <button className="h-5 w-5 rounded flex items-center justify-center hover:bg-accent" onClick={() => setSearchIndex(i => (i + 1) % Math.max(1, searchResults.length))}>
              <ChevronDown className="h-3 w-3" />
            </button>
            <button className="h-5 w-5 rounded flex items-center justify-center hover:bg-accent" onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Minimap */}
        {minimapOpen && minimapData && (
          <div className="mindmap-minimap absolute bottom-3 right-3 z-30">
            <button
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-card border border-border flex items-center justify-center z-10 hover:bg-accent"
              onClick={() => setMinimapOpen(false)}
            >
              <X className="h-2.5 w-2.5 text-muted-foreground" />
            </button>
            <div
              className="w-[140px] h-[90px] relative cursor-pointer rounded-md overflow-hidden"
              onClick={handleMinimapClick}
            >
              {/* Nodes as dots */}
              {visibleNodes.map(node => {
                const nx = ((node.x - minimapData.minX) / minimapData.w) * 140;
                const ny = ((node.y - minimapData.minY) / minimapData.h) * 90;
                return (
                  <div
                    key={node.id}
                    className="absolute rounded-full"
                    style={{
                      left: nx,
                      top: ny,
                      width: node.id === data.rootId ? 5 : 3,
                      height: node.id === data.rootId ? 5 : 3,
                      backgroundColor: node.color,
                      transform: 'translate(-50%, -50%)',
                    }}
                  />
                );
              })}
              {/* Viewport rectangle */}
              {canvasRef.current && (() => {
                const cr = canvasRef.current!.getBoundingClientRect();
                const vwLeft = (-pan.x / zoom);
                const vwTop = (-pan.y / zoom);
                const vwWidth = cr.width / zoom;
                const vwHeight = cr.height / zoom;
                const rx = ((vwLeft - minimapData.minX) / minimapData.w) * 140;
                const ry = ((vwTop - minimapData.minY) / minimapData.h) * 90;
                const rw = (vwWidth / minimapData.w) * 140;
                const rh = (vwHeight / minimapData.h) * 90;
                return (
                  <div
                    className="absolute border border-foreground/30 bg-foreground/5 rounded-sm"
                    style={{ left: rx, top: ry, width: rw, height: rh }}
                  />
                );
              })()}
            </div>
          </div>
        )}

        {/* Minimap reopen button */}
        {!minimapOpen && (
          <button
            className="absolute bottom-3 right-3 z-30 h-7 w-7 rounded-md bg-card/80 backdrop-blur border border-border flex items-center justify-center hover:bg-accent transition-colors"
            onClick={() => setMinimapOpen(true)}
          >
            <Map className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}

        {/* Keyboard shortcuts bar */}
        {!hintsDismissed && (
          <div className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-center gap-4 py-1.5 px-4 bg-card/80 backdrop-blur-sm border-t border-border text-[10px] text-muted-foreground">
            <span><kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Tab</kbd> Add child</span>
            <span><kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Enter</kbd> Sibling</span>
            <span><kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Del</kbd> Remove</span>
            <span><kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">F2</kbd> Edit</span>
            <span><kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">⌘F</kbd> Search</span>
            <span>Right-click for more</span>
            <button className="ml-2 hover:text-foreground" onClick={dismissHints}>
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* AI Generate Dialog */}
      <Dialog open={aiDialogOpen} onOpenChange={(open) => { if (!aiLoading) setAiDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Mind Map Generator
            </DialogTitle>
            <DialogDescription>
              Enter a subject and AI will research it online and create a structured mind map.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="e.g. Part 107 exam preparation"
              value={aiSubject}
              onChange={(e) => setAiSubject(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !aiLoading && aiSubject.trim()) aiGenerateMindMap(); }}
              disabled={aiLoading}
            />
            <div className="flex flex-wrap gap-1.5">
              {['Part 107 exam prep', 'Machine Learning basics', 'Project management', 'React architecture', 'Startup funding'].map(s => (
                <button
                  key={s}
                  className="px-2.5 py-1 text-xs rounded-full bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setAiSubject(s)}
                  disabled={aiLoading}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiDialogOpen(false)} disabled={aiLoading}>
              Cancel
            </Button>
            <Button onClick={aiGenerateMindMap} disabled={aiLoading || !aiSubject.trim()}>
              {aiLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Researching…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1" />
                  Generate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save As Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Mind Map</DialogTitle>
            <DialogDescription>Give your mind map a name</DialogDescription>
          </DialogHeader>
          <Input value={saveTitle} onChange={e => setSaveTitle(e.target.value)} placeholder="Mind map title..." autoFocus onKeyDown={e => { if (e.key === 'Enter' && saveTitle.trim()) { setSaveDialogOpen(false); saveToDb(saveTitle.trim()); } }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { setSaveDialogOpen(false); saveToDb(saveTitle.trim()); }} disabled={!saveTitle.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MindMapLibrary open={libraryOpen} onOpenChange={setLibraryOpen} onLoad={handleLoadMap} />

      <Dialog open={cardPickerOpen} onOpenChange={setCardPickerOpen}>
        <DialogContent className="max-w-sm max-h-[60vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Link to Card</DialogTitle>
            <DialogDescription>Select a ZettelCard to link</DialogDescription>
          </DialogHeader>
          <Input value={cardPickerSearch} onChange={e => setCardPickerSearch(e.target.value)} placeholder="Search cards..." className="h-9 text-sm" />
          <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
            {cards.filter(c => !cardPickerSearch.trim() || c.title.toLowerCase().includes(cardPickerSearch.toLowerCase())).slice(0, 20).map(card => (
              <button
                key={card.id}
                className="w-full text-left px-3 py-2 rounded-lg border border-border hover:bg-accent/50 transition-colors text-sm"
                onClick={() => { if (cardPickerNodeId) linkCardToNode(cardPickerNodeId, card.id); setCardPickerOpen(false); }}
              >
                <div className="font-medium truncate">{card.title}</div>
                {card.category && <div className="text-xs text-muted-foreground truncate">{card.category}</div>}
              </button>
            ))}
            {cards.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">No cards available</p>}
          </div>
        </DialogContent>
      </Dialog>

      <StudyGuideDialog
        open={studyGuideOpen}
        onOpenChange={setStudyGuideOpen}
        content={studyGuideContent}
        isLoading={studyGuideLoading}
        loadingText={studyGuideLoadingText}
        mapTitle={currentMapTitle || data.nodes[data.rootId]?.text}
      />

      {/* Node Detail Panel */}
      <Sheet open={nodeDetailOpen} onOpenChange={(open) => {
        if (!open && nodeDetailId) { setNote(nodeDetailId, nodeDetailNote); }
        setNodeDetailOpen(open);
      }}>
        <SheetContent className="w-80 sm:w-96 flex flex-col">
          <SheetHeader>
            <SheetTitle className="text-sm flex items-center gap-2">
              {nodeDetailId && data.nodes[nodeDetailId]?.emoji && (
                <span>{data.nodes[nodeDetailId].emoji}</span>
              )}
              {nodeDetailId ? data.nodes[nodeDetailId]?.text : 'Node'}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 flex flex-col gap-3 pt-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Priority</p>
              <div className="flex gap-1">
                {(['none', 'low', 'medium', 'high'] as Priority[]).map(p => (
                  <Button
                    key={p}
                    variant={nodeDetailId && data.nodes[nodeDetailId]?.priority === p ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => { if (nodeDetailId) setPriority(nodeDetailId, p); }}
                    className="text-[10px] h-6 px-2 capitalize flex-1"
                  >
                    {p}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex-1 flex flex-col space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Notes</p>
              <Textarea
                value={nodeDetailNote}
                onChange={e => setNodeDetailNote(e.target.value)}
                onBlur={() => { if (nodeDetailId) setNote(nodeDetailId, nodeDetailNote); }}
                placeholder="Add notes for this node..."
                className="flex-1 text-sm resize-none min-h-[200px]"
              />
              <p className="text-[10px] text-muted-foreground text-right">{nodeDetailNote.length} chars</p>
            </div>
            <Button
              size="sm"
              onClick={() => { if (nodeDetailId) { setNote(nodeDetailId, nodeDetailNote); setNodeDetailOpen(false); } }}
            >
              Save & Close
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

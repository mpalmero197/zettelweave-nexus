import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus, Trash2, ZoomIn, ZoomOut, Maximize2, Download, ChevronRight, ChevronDown,
  Undo2, Redo2, Palette, Type, RotateCcw, GitBranch
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────
interface MindMapNode {
  id: string;
  text: string;
  children: string[];
  collapsed: boolean;
  color: string;
  x: number;
  y: number;
  parentId: string | null;
}

interface MindMapData {
  nodes: Record<string, MindMapNode>;
  rootId: string;
}

// ─── Constants ────────────────────────────────────────────────
const BRANCH_COLORS = [
  'hsl(var(--primary))',
  'hsl(210, 70%, 55%)',
  'hsl(150, 60%, 45%)',
  'hsl(340, 65%, 55%)',
  'hsl(35, 80%, 50%)',
  'hsl(270, 55%, 55%)',
  'hsl(180, 55%, 45%)',
  'hsl(15, 70%, 55%)',
];

const H_GAP = 200;
const V_GAP = 50;

// ─── Helpers ──────────────────────────────────────────────────
const uid = () => crypto.randomUUID();

function createDefaultMap(): MindMapData {
  const rootId = uid();
  return {
    rootId,
    nodes: {
      [rootId]: { id: rootId, text: 'Central Topic', children: [], collapsed: false, color: BRANCH_COLORS[0], x: 0, y: 0, parentId: null },
    },
  };
}

// Persistence
const STORAGE_KEY = 'pendragon-mindmap-v1';
function loadMap(): MindMapData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return createDefaultMap();
}

function saveMap(data: MindMapData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ─── Layout engine ────────────────────────────────────────────
function layoutTree(data: MindMapData): MindMapData {
  const nodes = { ...data.nodes };
  const root = nodes[data.rootId];
  if (!root) return data;

  // Split children into left and right halves
  const rootChildren = root.children;
  const mid = Math.ceil(rootChildren.length / 2);
  const rightChildren = rootChildren.slice(0, mid);
  const leftChildren = rootChildren.slice(mid);

  root.x = 0;
  root.y = 0;

  // Layout a subtree, return total height
  function layoutSubtree(nodeId: string, depth: number, direction: 1 | -1): number {
    const node = nodes[nodeId];
    if (!node) return 0;

    node.x = depth * H_GAP * direction;

    if (node.collapsed || node.children.length === 0) {
      return V_GAP;
    }

    let totalHeight = 0;
    const childHeights: number[] = [];
    for (const childId of node.children) {
      const h = layoutSubtree(childId, depth + 1, direction);
      childHeights.push(h);
      totalHeight += h;
    }

    // Position children vertically centered around parent
    let currentY = node.y - totalHeight / 2 + childHeights[0] / 2;
    for (let i = 0; i < node.children.length; i++) {
      const child = nodes[node.children[i]];
      if (child) {
        const shiftY = currentY - child.y;
        shiftSubtree(child.id, shiftY, nodes);
        child.y = currentY;
        currentY += childHeights[i];
      }
    }

    return Math.max(totalHeight, V_GAP);
  }

  function shiftSubtree(nodeId: string, dy: number, nodes: Record<string, MindMapNode>) {
    const node = nodes[nodeId];
    if (!node || dy === 0) return;
    node.y += dy;
    if (!node.collapsed) {
      for (const cid of node.children) shiftSubtree(cid, dy, nodes);
    }
  }

  // Layout right side
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
      const shiftY = ry + rightHeights[i] / 2 - child.y;
      shiftSubtree(child.id, shiftY, nodes);
      child.y = ry + rightHeights[i] / 2;
      ry += rightHeights[i];
    }
  }

  // Layout left side
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
      const shiftY = ly + leftHeights[i] / 2 - child.y;
      shiftSubtree(child.id, shiftY, nodes);
      child.y = ly + leftHeights[i] / 2;
      ly += leftHeights[i];
    }
  }

  return { ...data, nodes };
}

// ─── Component ────────────────────────────────────────────────
export default function MindMap() {
  const [data, setData] = useState<MindMapData>(() => layoutTree(loadMap()));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<MindMapData[]>([]);
  const [future, setFuture] = useState<MindMapData[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Save on change
  useEffect(() => { saveMap(data); }, [data]);

  // Focus edit input
  useEffect(() => { if (editingId && editInputRef.current) editInputRef.current.focus(); }, [editingId]);

  // Center canvas initially
  useEffect(() => {
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setPan({ x: rect.width / 2, y: rect.height / 2 });
    }
  }, []);

  const pushHistory = useCallback((d: MindMapData) => {
    setHistory(prev => [...prev.slice(-30), d]);
    setFuture([]);
  }, []);

  const updateData = useCallback((updater: (d: MindMapData) => MindMapData) => {
    setData(prev => {
      pushHistory(prev);
      return layoutTree(updater(prev));
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    setFuture(prev => [data, ...prev]);
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setData(layoutTree(prev));
  }, [history, data]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    setHistory(h => [...h, data]);
    const next = future[0];
    setFuture(f => f.slice(1));
    setData(layoutTree(next));
  }, [future, data]);

  // ── Node operations ──
  const addChild = useCallback((parentId: string) => {
    const newId = uid();
    const parent = data.nodes[parentId];
    if (!parent) return;
    // Determine color: inherit from parent, or assign new branch color
    const color = parent.parentId === null
      ? BRANCH_COLORS[parent.children.length % BRANCH_COLORS.length]
      : parent.color;

    updateData(d => {
      const nodes = { ...d.nodes };
      nodes[parentId] = { ...nodes[parentId], children: [...nodes[parentId].children, newId], collapsed: false };
      nodes[newId] = { id: newId, text: 'New Topic', children: [], collapsed: false, color, x: 0, y: 0, parentId };
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
      // Remove from parent
      const parent = nodes[node.parentId!];
      if (parent) nodes[node.parentId!] = { ...parent, children: parent.children.filter(c => c !== nodeId) };
      // Remove node and all descendants
      const toRemove = [nodeId];
      while (toRemove.length) {
        const id = toRemove.pop()!;
        const n = nodes[id];
        if (n) {
          toRemove.push(...n.children);
          delete nodes[id];
        }
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

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
  }, [selectedId, editingId, commitEdit, addChild, addSibling, deleteNode, undo, redo, data]);

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

  const handlePointerUp = useCallback(() => setIsPanning(false), []);

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
    const minX = Math.min(...xs) - 120;
    const maxX = Math.max(...xs) + 120;
    const minY = Math.min(...ys) - 40;
    const maxY = Math.max(...ys) + 40;
    const w = maxX - minX || 1;
    const h = maxY - minY || 1;
    const z = Math.min(rect.width / w, rect.height / h, 2) * 0.85;
    setZoom(z);
    setPan({ x: rect.width / 2 - ((minX + maxX) / 2) * z, y: rect.height / 2 - ((minY + maxY) / 2) * z });
  }, [data]);

  // ── Export ──
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
    const fresh = layoutTree(createDefaultMap());
    setData(fresh);
    setSelectedId(null);
    setEditingId(null);
    toast.success('Mind map reset');
  }, [data, pushHistory]);

  // ── Collect visible nodes and edges ──
  const { visibleNodes, edges } = useMemo(() => {
    const visible: MindMapNode[] = [];
    const edges: { from: MindMapNode; to: MindMapNode }[] = [];

    function walk(nodeId: string) {
      const node = data.nodes[nodeId];
      if (!node) return;
      visible.push(node);
      if (!node.collapsed) {
        for (const cid of node.children) {
          const child = data.nodes[cid];
          if (child) {
            edges.push({ from: node, to: child });
            walk(cid);
          }
        }
      }
    }
    walk(data.rootId);
    return { visibleNodes: visible, edges };
  }, [data]);

  const nodeCount = Object.keys(data.nodes).length;

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col bg-background rounded-lg border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-card/50 backdrop-blur-sm shrink-0 flex-wrap">
        <div className="flex items-center gap-0.5 mr-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Mind Map</span>
          <span className="text-[10px] text-muted-foreground/60 ml-1">{nodeCount} nodes</span>
        </div>

        <div className="h-4 w-px bg-border mx-1" />

        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => selectedId && addChild(selectedId)} disabled={!selectedId}>
          <Plus className="h-3 w-3 mr-1" />Child
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => selectedId && deleteNode(selectedId)} disabled={!selectedId || selectedId === data.rootId}>
          <Trash2 className="h-3 w-3 mr-1" />Delete
        </Button>

        {selectedId && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                <Palette className="h-3 w-3 mr-1" />Color
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <div className="flex gap-1 p-2">
                {BRANCH_COLORS.map(c => (
                  <button key={c} className="h-5 w-5 rounded-full border border-border hover:scale-110 transition-transform" style={{ background: c }} onClick={() => changeColor(selectedId, c)} />
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <div className="h-4 w-px bg-border mx-1" />

        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={undo} disabled={history.length === 0} aria-label="Undo">
          <Undo2 className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={redo} disabled={future.length === 0} aria-label="Redo">
          <Redo2 className="h-3 w-3" />
        </Button>

        <div className="flex-1" />

        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.min(3, z + 0.2))} aria-label="Zoom in">
          <ZoomIn className="h-3 w-3" />
        </Button>
        <span className="text-[10px] text-muted-foreground w-8 text-center">{Math.round(zoom * 100)}%</span>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} aria-label="Zoom out">
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={fitToScreen} aria-label="Fit to screen">
          <Maximize2 className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={resetView} aria-label="Reset view">
          <RotateCcw className="h-3 w-3" />
        </Button>

        <div className="h-4 w-px bg-border mx-1" />

        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={exportAsJSON}>
          <Download className="h-3 w-3 mr-1" />Export
        </Button>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={resetMap}>
          New
        </Button>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
        data-canvas="true"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Dot grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
            backgroundPosition: `${pan.x % (24 * zoom)}px ${pan.y % (24 * zoom)}px`,
          }}
        />

        {/* Transformed layer */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute top-0 left-0"
        >
          {/* SVG edges */}
          <svg className="absolute top-0 left-0 overflow-visible pointer-events-none" style={{ width: 1, height: 1 }}>
            {edges.map(({ from, to }) => {
              const fromX = from.x + (to.x > from.x ? 70 : -70);
              const toX = to.x + (to.x > from.x ? -70 : 70);
              const midX = (fromX + toX) / 2;
              return (
                <path
                  key={`${from.id}-${to.id}`}
                  d={`M ${fromX} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${toX} ${to.y}`}
                  fill="none"
                  stroke={to.color}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  opacity={0.6}
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {visibleNodes.map(node => {
            const isRoot = node.id === data.rootId;
            const isSelected = node.id === selectedId;
            const isEditing = node.id === editingId;
            const hasChildren = node.children.length > 0;

            return (
              <div
                key={node.id}
                className={cn(
                  "absolute flex items-center gap-1 group",
                  "transition-shadow duration-150",
                )}
                style={{
                  left: node.x,
                  top: node.y,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Collapse toggle */}
                {hasChildren && (
                  <button
                    className="absolute -right-1 top-1/2 -translate-y-1/2 translate-x-full h-4 w-4 rounded-full bg-card border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    style={{ [node.x >= 0 ? 'right' : 'left']: '-1px', [node.x >= 0 ? 'left' : 'right']: 'auto', transform: `translate(${node.x >= 0 ? '100%' : '-100%'}, -50%)` }}
                    onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
                  >
                    {node.collapsed
                      ? <span className="text-[9px] font-bold text-muted-foreground">{node.children.length}</span>
                      : <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                    }
                  </button>
                )}

                {/* Node body */}
                <div
                  className={cn(
                    "rounded-lg px-3 py-1.5 cursor-pointer whitespace-nowrap",
                    "border-2 transition-all duration-150",
                    isRoot
                      ? "text-sm font-semibold min-w-[100px] text-center"
                      : "text-xs font-medium",
                    isSelected
                      ? "ring-2 ring-ring ring-offset-1 ring-offset-background shadow-md"
                      : "shadow-sm hover:shadow-md",
                  )}
                  style={{
                    borderColor: node.color,
                    backgroundColor: isRoot
                      ? node.color
                      : `color-mix(in srgb, ${node.color} 12%, hsl(var(--card)))`,
                    color: isRoot ? 'white' : 'hsl(var(--foreground))',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedId(node.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingId(node.id);
                    setEditText(node.text);
                  }}
                >
                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null); }}
                      className="bg-transparent outline-none border-none text-inherit font-inherit min-w-[60px] w-auto"
                      style={{ width: `${Math.max(60, editText.length * 7)}px` }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span>{node.text}</span>
                  )}
                </div>

                {/* Quick-add button */}
                <button
                  className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
                  style={{
                    [node.x >= 0 || isRoot ? 'right' : 'left']: '-6px',
                    [node.x >= 0 || isRoot ? 'left' : 'right']: 'auto',
                    transform: `translate(${node.x >= 0 || isRoot ? '100%' : '-100%'}, -50%)`,
                    marginLeft: hasChildren && node.x >= 0 ? '16px' : undefined,
                    marginRight: hasChildren && node.x < 0 ? '16px' : undefined,
                  }}
                  onClick={(e) => { e.stopPropagation(); addChild(node.id); }}
                >
                  <Plus className="h-2.5 w-2.5 text-muted-foreground" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Help hint */}
        <div className="absolute bottom-3 left-3 text-[10px] text-muted-foreground/50 space-y-0.5 pointer-events-none">
          <div>Tab: Add child · Enter: Add sibling · Del: Remove</div>
          <div>Double-click: Edit · Scroll: Pan · Ctrl+Scroll: Zoom</div>
        </div>
      </div>
    </div>
  );
}

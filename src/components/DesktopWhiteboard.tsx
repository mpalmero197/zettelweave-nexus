import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Textbox, Line, PencilBrush, Shadow, Polygon, Triangle, Group, FabricObject, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { 
  MousePointer2, Pen, Eraser, Square, Circle as CircleIcon, Type, StickyNote,
  Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw, Trash2, Download, 
  Grid3x3, Hand, Star, Hexagon, Triangle as TriangleIcon, Minus, ArrowRight,
  Undo2, Redo2, Highlighter, AlignLeft, AlignCenter, AlignRight,
  Copy, Clipboard, Lock, Unlock, Diamond, Octagon, Plus, MessageSquare,
  ArrowLeftRight, ChevronsUp, ChevronsDown, ChevronUp, ChevronDown,
  Maximize2, Layers, Pentagon, SquareDashed, Palette, FileDown, FileUp,
  AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd,
  FileText, CheckSquare, Link2, GitBranch, LayoutTemplate, Map
} from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DesktopWhiteboardProps {
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
}

type Tool = "select" | "pen" | "eraser" | "rectangle" | "circle" | "triangle" | "star" | "polygon" | "line" | "arrow" | "text" | "sticky" | "image" | "pan" | "highlighter" | "diamond" | "pentagon" | "octagon" | "cross" | "doubleArrow" | "speechBubble" | "frame" | "noteCard" | "checklist" | "linkCard" | "connector" | "swatch";
type LineStyle = "solid" | "dashed" | "dotted";

const penColors = [
  { name: "Black", value: "#1a1a1a" },
  { name: "Red", value: "#E74C3C" },
  { name: "Blue", value: "#3498DB" },
  { name: "Green", value: "#2ECC71" },
  { name: "Yellow", value: "#F1C40F" },
  { name: "Purple", value: "#9B59B6" },
  { name: "Orange", value: "#E67E22" },
  { name: "Pink", value: "#FF69B4" },
];

const fillColors = [
  { name: "None", value: "transparent" },
  { name: "White", value: "#FFFFFF" },
  { name: "Light Gray", value: "#F5F5F5" },
  { name: "Red", value: "#FFCDD2" },
  { name: "Blue", value: "#BBDEFB" },
  { name: "Green", value: "#C8E6C9" },
  { name: "Yellow", value: "#FFF9C4" },
  { name: "Purple", value: "#E1BEE7" },
];

const stickyColors = ["#FFF4A3", "#FFE4A3", "#FFD4A3", "#C4E4FF", "#D4F4DD", "#FFE4F4"];

const HISTORY_LIMIT = 50;

const getDashArray = (style: LineStyle, width: number): number[] | undefined => {
  if (style === "dashed") return [width * 4, width * 2];
  if (style === "dotted") return [width, width * 2];
  return undefined;
};

let _objIdCounter = 0;
const genObjId = () => `obj-${Date.now()}-${++_objIdCounter}`;

export const DesktopWhiteboard = ({ onCreateCard }: DesktopWhiteboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [penColor, setPenColor] = useState("#1a1a1a");
  const [fillColor, setFillColor] = useState("transparent");
  const [penSize, setPenSize] = useState(2);
  const [lineStyle, setLineStyle] = useState<LineStyle>("solid");
  const [objectOpacity, setObjectOpacity] = useState(100);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [showMinimap, setShowMinimap] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize] = useState(20);
  
  // Undo/Redo
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Clipboard
  const clipboardRef = useRef<any[]>([]);

  // Panning refs
  const isPanningRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Connector refs
  const connectionsRef = useRef<globalThis.Map<string, { from: string; to: string; line: any }>>(new globalThis.Map());
  const connectorSourceRef = useRef<string | null>(null);

  // Smart guides
  const guideLinesRef = useRef<Line[]>([]);

  // --- Canvas init (mount once) ---
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const initCanvas = () => {
      const container = containerRef.current!;
      const width = container.clientWidth || 1200;
      const height = container.clientHeight || 800;
      if (width === 0 || height === 0) { setTimeout(initCanvas, 100); return; }

      const canvas = new FabricCanvas(canvasRef.current!, {
        width,
        height,
        backgroundColor: "#FAFAF8",
        selection: true,
      });

      const brush = new PencilBrush(canvas);
      brush.color = "#1a1a1a";
      brush.width = 2;
      canvas.freeDrawingBrush = brush;

      fabricRef.current = canvas;
      setIsReady(true);
      saveHistory(canvas);
    };

    const timer = setTimeout(initCanvas, 50);

    const ro = new ResizeObserver((entries) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.setDimensions({ width, height });
          canvas.renderAll();
        }
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
      fabricRef.current?.dispose();
      fabricRef.current = null;
    };
  }, []);

  // --- History management ---
  const saveHistory = useCallback((canvas: FabricCanvas) => {
    if (isRestoringRef.current) return;
    const json = JSON.stringify(canvas.toJSON());
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const onModified = () => saveHistory(canvas);
    canvas.on('object:added', onModified);
    canvas.on('object:removed', onModified);
    canvas.on('object:modified', onModified);

    return () => {
      canvas.off('object:added', onModified);
      canvas.off('object:removed', onModified);
      canvas.off('object:modified', onModified);
    };
  }, [isReady, saveHistory]);

  const handleUndo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;
    isRestoringRef.current = true;
    historyIndexRef.current--;
    canvas.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current])).then(() => {
      canvas.renderAll();
      isRestoringRef.current = false;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;
    isRestoringRef.current = true;
    historyIndexRef.current++;
    canvas.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current])).then(() => {
      canvas.renderAll();
      isRestoringRef.current = false;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    });
  }, []);

  // --- Update brush when color/size changes ---
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = penColor;
      canvas.freeDrawingBrush.width = penSize;
    }
  }, [penColor, penSize]);

  // --- Tool mode switching ---
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === "pen" || activeTool === "highlighter";
    
    if ((activeTool === "pen" || activeTool === "highlighter") && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = activeTool === "highlighter" ? `${penColor}66` : penColor;
      canvas.freeDrawingBrush.width = activeTool === "highlighter" ? penSize * 3 : penSize;
    }

    const handleEraserClick = (e: any) => {
      if (activeTool === "eraser" && e.target) {
        canvas.remove(e.target);
        canvas.renderAll();
      }
    };

    if (activeTool === "eraser") {
      canvas.isDrawingMode = false;
      canvas.on('mouse:down', handleEraserClick);
    }

    return () => {
      canvas.off('mouse:down', handleEraserClick);
    };
  }, [activeTool, penColor, penSize, isReady]);

  // --- Panning ---
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const handleMouseDown = (opt: any) => {
      if (activeTool === 'pan') {
        isPanningRef.current = true;
        canvas.selection = false;
        canvas.isDrawingMode = false;
        const pointer = opt.pointer;
        if (pointer) lastPosRef.current = { x: pointer.x, y: pointer.y };
      }
    };

    const handleMouseMove = (opt: any) => {
      if (activeTool === 'pan' && isPanningRef.current && lastPosRef.current) {
        const pointer = opt.pointer;
        if (pointer && canvas.viewportTransform) {
          canvas.viewportTransform[4] += pointer.x - lastPosRef.current.x;
          canvas.viewportTransform[5] += pointer.y - lastPosRef.current.y;
          canvas.requestRenderAll();
          lastPosRef.current = { x: pointer.x, y: pointer.y };
        }
      }
    };

    const handleMouseUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        canvas.selection = true;
        lastPosRef.current = null;
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [activeTool, isReady]);

  // --- Mouse wheel zoom ---
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const handleWheel = (opt: any) => {
      const e = opt.e as WheelEvent;
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY;
      let newZoom = canvas.getZoom() * (delta > 0 ? 0.95 : 1.05);
      newZoom = Math.max(0.25, Math.min(4, newZoom));
      const point = canvas.getScenePoint(e);
      canvas.zoomToPoint(point, newZoom);
      setZoom(Math.round(newZoom * 100));
      canvas.renderAll();
    };

    canvas.on('mouse:wheel', handleWheel);
    return () => { canvas.off('mouse:wheel', handleWheel); };
  }, [isReady]);

  // --- Smart Guides on object:moving ---
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const THRESHOLD = 5;

    const clearGuides = () => {
      guideLinesRef.current.forEach(l => canvas.remove(l));
      guideLinesRef.current = [];
    };

    const onMoving = (e: any) => {
      clearGuides();
      const target = e.target;
      if (!target) return;

      // Snap to grid
      if (snapToGrid) {
        target.set({
          left: Math.round((target.left || 0) / gridSize) * gridSize,
          top: Math.round((target.top || 0) / gridSize) * gridSize,
        });
      }

      const tRect = target.getBoundingRect();
      const tCx = tRect.left + tRect.width / 2;
      const tCy = tRect.top + tRect.height / 2;

      const objects = canvas.getObjects().filter((o: FabricObject) => o !== target && !(o as any)._isGuide);

      for (const obj of objects) {
        const oRect = obj.getBoundingRect();
        const oCx = oRect.left + oRect.width / 2;
        const oCy = oRect.top + oRect.height / 2;

        // Vertical center alignment
        if (Math.abs(tCx - oCx) < THRESHOLD) {
          const gl = new Line([oCx, Math.min(tRect.top, oRect.top) - 20, oCx, Math.max(tRect.top + tRect.height, oRect.top + oRect.height) + 20], {
            stroke: '#E74C3C', strokeWidth: 1, selectable: false, evented: false, strokeDashArray: [4, 4],
          });
          (gl as any)._isGuide = true;
          canvas.add(gl);
          guideLinesRef.current.push(gl);
        }
        // Horizontal center alignment
        if (Math.abs(tCy - oCy) < THRESHOLD) {
          const gl = new Line([Math.min(tRect.left, oRect.left) - 20, oCy, Math.max(tRect.left + tRect.width, oRect.left + oRect.width) + 20, oCy], {
            stroke: '#E74C3C', strokeWidth: 1, selectable: false, evented: false, strokeDashArray: [4, 4],
          });
          (gl as any)._isGuide = true;
          canvas.add(gl);
          guideLinesRef.current.push(gl);
        }
        // Left edge
        if (Math.abs(tRect.left - oRect.left) < THRESHOLD) {
          const gl = new Line([oRect.left, Math.min(tRect.top, oRect.top) - 20, oRect.left, Math.max(tRect.top + tRect.height, oRect.top + oRect.height) + 20], {
            stroke: '#3498DB', strokeWidth: 1, selectable: false, evented: false, strokeDashArray: [4, 4],
          });
          (gl as any)._isGuide = true;
          canvas.add(gl);
          guideLinesRef.current.push(gl);
        }
        // Top edge
        if (Math.abs(tRect.top - oRect.top) < THRESHOLD) {
          const gl = new Line([Math.min(tRect.left, oRect.left) - 20, oRect.top, Math.max(tRect.left + tRect.width, oRect.left + oRect.width) + 20, oRect.top], {
            stroke: '#3498DB', strokeWidth: 1, selectable: false, evented: false, strokeDashArray: [4, 4],
          });
          (gl as any)._isGuide = true;
          canvas.add(gl);
          guideLinesRef.current.push(gl);
        }
      }

      // Update connectors
      updateConnectors(canvas);
    };

    const onModified = () => {
      clearGuides();
      updateConnectors(canvas);
    };

    canvas.on('object:moving', onMoving);
    canvas.on('object:modified', onModified);

    return () => {
      canvas.off('object:moving', onMoving);
      canvas.off('object:modified', onModified);
    };
  }, [isReady, snapToGrid, gridSize]);

  // --- Connector update logic ---
  const updateConnectors = useCallback((canvas: FabricCanvas) => {
    connectionsRef.current.forEach((conn) => {
      const fromObj = canvas.getObjects().find((o: FabricObject) => (o as any)._objId === conn.from);
      const toObj = canvas.getObjects().find((o: FabricObject) => (o as any)._objId === conn.to);
      if (fromObj && toObj) {
        const fRect = fromObj.getBoundingRect();
        const tRect = toObj.getBoundingRect();
        const fCx = fRect.left + fRect.width / 2;
        const fCy = fRect.top + fRect.height / 2;
        const tCx = tRect.left + tRect.width / 2;
        const tCy = tRect.top + tRect.height / 2;
        conn.line.set({ x1: fCx, y1: fCy, x2: tCx, y2: tCy });
        conn.line.setCoords();
      }
    });
    canvas.renderAll();
  }, []);

  // --- Connector mode click handler ---
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || activeTool !== 'connector') return;

    const handleClick = (e: any) => {
      if (!e.target || (e.target as any)._isGuide || (e.target as any)._isConnectorLine) return;
      
      // Ensure object has an ID
      if (!(e.target as any)._objId) {
        (e.target as any)._objId = genObjId();
      }

      const objId = (e.target as any)._objId;

      if (!connectorSourceRef.current) {
        connectorSourceRef.current = objId;
        toast.info("Click another object to connect");
      } else {
        if (connectorSourceRef.current === objId) {
          connectorSourceRef.current = null;
          return;
        }

        const fromObj = canvas.getObjects().find((o: FabricObject) => (o as any)._objId === connectorSourceRef.current);
        const toObj = e.target;

        if (fromObj && toObj) {
          const fRect = fromObj.getBoundingRect();
          const tRect = toObj.getBoundingRect();
          const line = new Line([
            fRect.left + fRect.width / 2, fRect.top + fRect.height / 2,
            tRect.left + tRect.width / 2, tRect.top + tRect.height / 2
          ], {
            stroke: '#9B59B6',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            strokeDashArray: [6, 3],
          });
          (line as any)._isConnectorLine = true;

          const connId = genObjId();
          connectionsRef.current.set(connId, {
            from: connectorSourceRef.current!,
            to: objId,
            line,
          });

          canvas.add(line);
          canvas.sendObjectToBack(line);
          canvas.renderAll();
          toast.success("Connected!");
        }

        connectorSourceRef.current = null;
      }
    };

    canvas.on('mouse:down', handleClick);
    return () => {
      canvas.off('mouse:down', handleClick);
      connectorSourceRef.current = null;
    };
  }, [activeTool, isReady]);

  // --- Minimap rendering ---
  useEffect(() => {
    const canvas = fabricRef.current;
    const minimapEl = minimapCanvasRef.current;
    if (!canvas || !minimapEl || !showMinimap) return;

    const ctx = minimapEl.getContext('2d');
    if (!ctx) return;

    const renderMinimap = () => {
      const mmW = 160;
      const mmH = 110;
      ctx.clearRect(0, 0, mmW, mmH);
      ctx.fillStyle = '#f8f8f6';
      ctx.fillRect(0, 0, mmW, mmH);

      const objects = canvas.getObjects().filter((o: FabricObject) => !(o as any)._isGuide);
      if (objects.length === 0) return;

      // Compute bounding box of all objects
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      objects.forEach((obj: FabricObject) => {
        const r = obj.getBoundingRect();
        minX = Math.min(minX, r.left);
        minY = Math.min(minY, r.top);
        maxX = Math.max(maxX, r.left + r.width);
        maxY = Math.max(maxY, r.top + r.height);
      });

      const padding = 40;
      const contentW = maxX - minX + padding * 2;
      const contentH = maxY - minY + padding * 2;
      const scale = Math.min(mmW / contentW, mmH / contentH);

      objects.forEach((obj: FabricObject) => {
        const r = obj.getBoundingRect();
        const x = (r.left - minX + padding) * scale;
        const y = (r.top - minY + padding) * scale;
        const w = Math.max(r.width * scale, 3);
        const h = Math.max(r.height * scale, 3);
        ctx.fillStyle = (obj as any).fill && (obj as any).fill !== 'transparent' ? (obj as any).fill : '#94a3b8';
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
      });

      // Viewport indicator
      const vt = canvas.viewportTransform;
      if (vt) {
        const vpLeft = (-vt[4] / canvas.getZoom() - minX + padding) * scale;
        const vpTop = (-vt[5] / canvas.getZoom() - minY + padding) * scale;
        const vpW = ((canvas.width || 800) / canvas.getZoom()) * scale;
        const vpH = ((canvas.height || 600) / canvas.getZoom()) * scale;
        ctx.strokeStyle = '#3498DB';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(vpLeft, vpTop, vpW, vpH);
      }
    };

    canvas.on('after:render', renderMinimap);
    renderMinimap();

    return () => {
      canvas.off('after:render', renderMinimap);
    };
  }, [isReady, showMinimap]);

  // --- Apply styles to selected objects ---
  const applyStrokeToSelected = useCallback((color: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length > 0) {
      active.forEach(obj => {
        if ((obj as any).stroke !== undefined) {
          obj.set({ stroke: color });
        }
      });
      canvas.renderAll();
      saveHistory(canvas);
    }
  }, [saveHistory]);

  const applyFillToSelected = useCallback((color: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length > 0) {
      active.forEach(obj => {
        if (obj.type !== 'group' && (obj as any).fill !== undefined) {
          obj.set({ fill: color });
        }
      });
      canvas.renderAll();
      saveHistory(canvas);
    }
  }, [saveHistory]);

  const applyOpacityToSelected = useCallback((opacity: number) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length > 0) {
      active.forEach(obj => {
        obj.set({ opacity: opacity / 100 });
      });
      canvas.renderAll();
      saveHistory(canvas);
    }
  }, [saveHistory]);

  const applyLineStyleToSelected = useCallback((style: LineStyle) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length > 0) {
      active.forEach(obj => {
        const dashArray = getDashArray(style, (obj as any).strokeWidth || penSize);
        obj.set({ strokeDashArray: dashArray });
      });
      canvas.renderAll();
      saveHistory(canvas);
    }
  }, [saveHistory, penSize]);

  // --- Duplicate, Copy, Paste ---
  const handleDuplicate = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length === 0) return;
    
    active.forEach(obj => {
      obj.clone().then((cloned: FabricObject) => {
        cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
      });
    });
    canvas.renderAll();
    toast.success("Duplicated");
  }, []);

  const handleCopyObjects = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length === 0) return;
    
    clipboardRef.current = [];
    Promise.all(active.map(obj => obj.clone())).then(clones => {
      clipboardRef.current = clones;
      toast.success(`Copied ${clones.length} object(s)`);
    });
  }, []);

  const handlePasteObjects = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas || clipboardRef.current.length === 0) return;
    
    clipboardRef.current.forEach(obj => {
      obj.clone().then((cloned: FabricObject) => {
        cloned.set({ left: (cloned.left || 0) + 30, top: (cloned.top || 0) + 30 });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
      });
    });
    canvas.renderAll();
    toast.success("Pasted");
  }, []);

  const handleSelectAll = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects().filter(o => o.selectable !== false);
    if (objects.length > 0) {
      canvas.discardActiveObject();
      const selection = new (window as any).fabric.ActiveSelection(objects, { canvas });
      canvas.setActiveObject(selection);
      canvas.renderAll();
    }
  }, []);

  // --- Layer ordering ---
  const handleBringToFront = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach(obj => canvas.bringObjectToFront(obj));
    canvas.renderAll();
    saveHistory(canvas);
  }, [saveHistory]);

  const handleBringForward = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach(obj => canvas.bringObjectForward(obj));
    canvas.renderAll();
    saveHistory(canvas);
  }, [saveHistory]);

  const handleSendBackward = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach(obj => canvas.sendObjectBackwards(obj));
    canvas.renderAll();
    saveHistory(canvas);
  }, [saveHistory]);

  const handleSendToBack = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach(obj => canvas.sendObjectToBack(obj));
    canvas.renderAll();
    saveHistory(canvas);
  }, [saveHistory]);

  // --- Alignment ---
  const handleAlignLeft = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    if (objects.length < 2) return;
    const rects = objects.map(o => o.getBoundingRect());
    const minLeft = Math.min(...rects.map(r => r.left));
    objects.forEach((obj, i) => {
      const diff = minLeft - rects[i].left;
      obj.set({ left: (obj.left ?? 0) + diff });
      obj.setCoords();
    });
    canvas.renderAll();
    saveHistory(canvas);
  }, [saveHistory]);

  const handleAlignCenterH = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    if (objects.length < 2) return;
    const rects = objects.map(o => o.getBoundingRect());
    const minLeft = Math.min(...rects.map(r => r.left));
    const maxRight = Math.max(...rects.map(r => r.left + r.width));
    const centerX = (minLeft + maxRight) / 2;
    objects.forEach((obj, i) => {
      const objCenter = rects[i].left + rects[i].width / 2;
      obj.set({ left: (obj.left ?? 0) + (centerX - objCenter) });
      obj.setCoords();
    });
    canvas.renderAll();
    saveHistory(canvas);
  }, [saveHistory]);

  const handleAlignRight = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    if (objects.length < 2) return;
    const rects = objects.map(o => o.getBoundingRect());
    const maxRight = Math.max(...rects.map(r => r.left + r.width));
    objects.forEach((obj, i) => {
      const diff = maxRight - (rects[i].left + rects[i].width);
      obj.set({ left: (obj.left ?? 0) + diff });
      obj.setCoords();
    });
    canvas.renderAll();
    saveHistory(canvas);
  }, [saveHistory]);

  const handleAlignTop = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    if (objects.length < 2) return;
    const rects = objects.map(o => o.getBoundingRect());
    const minTop = Math.min(...rects.map(r => r.top));
    objects.forEach((obj, i) => {
      const diff = minTop - rects[i].top;
      obj.set({ top: (obj.top ?? 0) + diff });
      obj.setCoords();
    });
    canvas.renderAll();
    saveHistory(canvas);
  }, [saveHistory]);

  const handleAlignMiddleV = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    if (objects.length < 2) return;
    const rects = objects.map(o => o.getBoundingRect());
    const minTop = Math.min(...rects.map(r => r.top));
    const maxBottom = Math.max(...rects.map(r => r.top + r.height));
    const centerY = (minTop + maxBottom) / 2;
    objects.forEach((obj, i) => {
      const objCenter = rects[i].top + rects[i].height / 2;
      obj.set({ top: (obj.top ?? 0) + (centerY - objCenter) });
      obj.setCoords();
    });
    canvas.renderAll();
    saveHistory(canvas);
  }, [saveHistory]);

  const handleAlignBottom = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    if (objects.length < 2) return;
    const rects = objects.map(o => o.getBoundingRect());
    const maxBottom = Math.max(...rects.map(r => r.top + r.height));
    objects.forEach((obj, i) => {
      const diff = maxBottom - (rects[i].top + rects[i].height);
      obj.set({ top: (obj.top ?? 0) + diff });
      obj.setCoords();
    });
    canvas.renderAll();
    saveHistory(canvas);
  }, [saveHistory]);

  // --- Lock/Unlock ---
  const handleLockSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach(obj => {
      obj.set({ selectable: false, evented: false, lockMovementX: true, lockMovementY: true });
    });
    canvas.discardActiveObject();
    canvas.renderAll();
    toast.success("Locked");
  }, []);

  const handleUnlockAll = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.getObjects().forEach(obj => {
      obj.set({ selectable: true, evented: true, lockMovementX: false, lockMovementY: false });
    });
    canvas.renderAll();
    toast.success("All objects unlocked");
  }, []);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const activeObj = canvas.getActiveObject();
      if (activeObj && (activeObj as any).isEditing) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); handleSelectAll(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); handleDuplicate(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); handleCopyObjects(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); handlePasteObjects(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === ']' && !e.shiftKey) { e.preventDefault(); handleBringForward(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === '[' && !e.shiftKey) { e.preventDefault(); handleSendBackward(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === ']' && e.shiftKey) { e.preventDefault(); handleBringToFront(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === '[' && e.shiftKey) { e.preventDefault(); handleSendToBack(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { handleDeleteSelected(); return; }

      switch (e.key.toLowerCase()) {
        case 'v': setActiveTool('select'); break;
        case 'h': setActiveTool('pan'); break;
        case 'p': setActiveTool('pen'); break;
        case 'r': handleToolClick('rectangle'); break;
        case 'o': handleToolClick('circle'); break;
        case 't': handleToolClick('text'); break;
        case 's': handleToolClick('sticky'); break;
        case 'e': setActiveTool('eraser'); break;
        case 'n': handleToolClick('noteCard'); break;
        case 'c': if (!e.ctrlKey && !e.metaKey) { setActiveTool('connector'); } break;
        case '=': case '+': handleZoomIn(); break;
        case '-': handleZoomOut(); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleSelectAll, handleDuplicate, handleCopyObjects, handlePasteObjects, handleBringToFront, handleBringForward, handleSendBackward, handleSendToBack]);

  // --- Tool actions ---
  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool);
    const canvas = fabricRef.current;
    if (!canvas) return;

    const cx = canvas.width! / 2;
    const cy = canvas.height! / 2;
    const dashArray = getDashArray(lineStyle, penSize);
    const baseProps = { stroke: penColor, strokeWidth: penSize, strokeDashArray: dashArray, opacity: objectOpacity / 100 };

    if (tool === "rectangle") {
      const rect = new Rect({ left: cx - 75, top: cy - 50, fill: fillColor, ...baseProps, width: 150, height: 100, rx: 8, ry: 8 });
      canvas.add(rect); canvas.setActiveObject(rect); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "circle") {
      const circle = new Circle({ left: cx - 50, top: cy - 50, fill: fillColor, ...baseProps, radius: 50 });
      canvas.add(circle); canvas.setActiveObject(circle); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "triangle") {
      const tri = new Triangle({ left: cx - 50, top: cy - 50, fill: fillColor, ...baseProps, width: 100, height: 100 });
      canvas.add(tri); canvas.setActiveObject(tri); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "star") {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 50 : 25;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        pts.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
      }
      const star = new Polygon(pts, { left: cx - 50, top: cy - 50, fill: fillColor, ...baseProps });
      canvas.add(star); canvas.setActiveObject(star); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "polygon") {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
        pts.push({ x: 50 * Math.cos(angle), y: 50 * Math.sin(angle) });
      }
      const hex = new Polygon(pts, { left: cx - 50, top: cy - 50, fill: fillColor, ...baseProps });
      canvas.add(hex); canvas.setActiveObject(hex); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "diamond") {
      const pts = [{ x: 0, y: -60 }, { x: 60, y: 0 }, { x: 0, y: 60 }, { x: -60, y: 0 }];
      const diamond = new Polygon(pts, { left: cx - 60, top: cy - 60, fill: fillColor, ...baseProps });
      canvas.add(diamond); canvas.setActiveObject(diamond); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "pentagon") {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        return { x: 55 * Math.cos(a), y: 55 * Math.sin(a) };
      });
      const pent = new Polygon(pts, { left: cx - 55, top: cy - 55, fill: fillColor, ...baseProps });
      canvas.add(pent); canvas.setActiveObject(pent); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "octagon") {
      const pts = Array.from({ length: 8 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 8 - Math.PI / 8;
        return { x: 50 * Math.cos(a), y: 50 * Math.sin(a) };
      });
      const oct = new Polygon(pts, { left: cx - 50, top: cy - 50, fill: fillColor, ...baseProps });
      canvas.add(oct); canvas.setActiveObject(oct); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "cross") {
      const s = 50, t = 15;
      const pts = [
        { x: -t, y: -s }, { x: t, y: -s }, { x: t, y: -t },
        { x: s, y: -t }, { x: s, y: t }, { x: t, y: t },
        { x: t, y: s }, { x: -t, y: s }, { x: -t, y: t },
        { x: -s, y: t }, { x: -s, y: -t }, { x: -t, y: -t }
      ];
      const cross = new Polygon(pts, { left: cx - s, top: cy - s, fill: fillColor, ...baseProps });
      canvas.add(cross); canvas.setActiveObject(cross); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "line") {
      const line = new Line([0, 0, 150, 0], { left: cx - 75, top: cy, ...baseProps });
      canvas.add(line); canvas.setActiveObject(line); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "arrow") {
      const arrowLine = new Line([0, 0, 130, 0], { stroke: penColor, strokeWidth: penSize, strokeDashArray: dashArray });
      const arrowHead = new Triangle({ left: 130, top: -8, width: 16, height: 16, fill: penColor, angle: 90 });
      const arrow = new Group([arrowLine, arrowHead], { left: cx - 75, top: cy, opacity: objectOpacity / 100 });
      canvas.add(arrow); canvas.setActiveObject(arrow); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "doubleArrow") {
      const arrowLine = new Line([16, 0, 114, 0], { stroke: penColor, strokeWidth: penSize, strokeDashArray: dashArray });
      const headLeft = new Triangle({ left: 0, top: -8, width: 16, height: 16, fill: penColor, angle: -90 });
      const headRight = new Triangle({ left: 114, top: -8, width: 16, height: 16, fill: penColor, angle: 90 });
      const arrow = new Group([arrowLine, headLeft, headRight], { left: cx - 65, top: cy, opacity: objectOpacity / 100 });
      canvas.add(arrow); canvas.setActiveObject(arrow); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "speechBubble") {
      const bg = new Rect({ left: 0, top: 0, fill: fillColor === "transparent" ? "#FFFFFF" : fillColor, width: 160, height: 80, ...baseProps, rx: 12, ry: 12 });
      const pointer = new Triangle({ left: 20, top: 75, width: 20, height: 20, fill: fillColor === "transparent" ? "#FFFFFF" : fillColor, stroke: penColor, strokeWidth: penSize, angle: 180 });
      const bubble = new Group([bg, pointer], { left: cx - 80, top: cy - 50, opacity: objectOpacity / 100 });
      canvas.add(bubble); canvas.setActiveObject(bubble); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "frame") {
      const frame = new Rect({ left: cx - 100, top: cy - 75, fill: "transparent", stroke: penColor, strokeWidth: penSize, strokeDashArray: [8, 4], width: 200, height: 150, opacity: objectOpacity / 100 });
      canvas.add(frame); canvas.setActiveObject(frame); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "text") {
      const text = new Textbox("Type here...", { left: cx - 100, top: cy, fill: penColor, fontSize: 24, fontFamily: 'Inter, Arial, sans-serif', width: 200, editable: true, opacity: objectOpacity / 100 });
      canvas.add(text); canvas.setActiveObject(text); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "sticky") {
      const color = stickyColors[Math.floor(Math.random() * stickyColors.length)];
      const rotation = (Math.random() - 0.5) * 6;
      const bg = new Rect({ left: 0, top: 0, fill: color, width: 200, height: 200, stroke: '#e0ddd5', strokeWidth: 1, shadow: new Shadow({ color: 'rgba(0,0,0,0.08)', blur: 12, offsetY: 4 }), rx: 6, ry: 6 });
      const txt = new Textbox("Note...", { left: 14, top: 14, fill: "#444", fontSize: 15, fontFamily: 'Inter, Arial, sans-serif', width: 172, editable: true });
      const group = new Group([bg, txt], { left: cx - 100, top: cy - 100, angle: rotation, subTargetCheck: true, opacity: objectOpacity / 100 });
      canvas.add(group); canvas.setActiveObject(group); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "noteCard") {
      createNoteCard(canvas, cx, cy);
      setActiveTool("select");
    } else if (tool === "checklist") {
      createChecklist(canvas, cx, cy);
      setActiveTool("select");
    } else if (tool === "linkCard") {
      const url = prompt("Enter URL:");
      if (url) {
        createLinkCard(canvas, cx, cy, url);
      }
      setActiveTool("select");
    } else if (tool === "swatch") {
      createSwatchPalette(canvas, cx, cy);
      setActiveTool("select");
    } else if (tool === "image") {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const img = document.createElement('img');
          img.src = ev.target?.result as string;
          img.onload = () => {
            const fi = new FabricImage(img, { left: cx - 100, top: cy - 100, scaleX: 0.5, scaleY: 0.5, opacity: objectOpacity / 100 });
            canvas.add(fi); canvas.setActiveObject(fi); canvas.renderAll();
          };
        };
        reader.readAsDataURL(file);
      };
      input.click();
      setActiveTool("select");
    }
  };

  // --- Note Card (Milanote style) ---
  const createNoteCard = (canvas: FabricCanvas, left: number, top: number) => {
    const cardW = 240;
    const cardH = 180;
    const bg = new Rect({
      left: 0, top: 0, fill: '#FFFFFF', width: cardW, height: cardH,
      rx: 8, ry: 8, stroke: '#e2e2e2', strokeWidth: 1,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.08)', blur: 16, offsetY: 4 }),
    });
    const accent = new Rect({
      left: 0, top: 0, fill: '#3498DB', width: cardW, height: 4,
      rx: 8, ry: 8,
    });
    const title = new Textbox("Card Title", {
      left: 16, top: 14, fill: '#1a1a1a', fontSize: 16, fontWeight: 'bold',
      fontFamily: 'Inter, Arial, sans-serif', width: cardW - 32, editable: true,
    });
    const body = new Textbox("Add your notes here...", {
      left: 16, top: 42, fill: '#64748b', fontSize: 13,
      fontFamily: 'Inter, Arial, sans-serif', width: cardW - 32, editable: true,
    });

    const group = new Group([bg, accent, title, body], {
      left: left - cardW / 2, top: top - cardH / 2,
      subTargetCheck: true,
    });
    (group as any)._objId = genObjId();
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  };

  // --- Checklist Card ---
  const createChecklist = (canvas: FabricCanvas, left: number, top: number) => {
    const cardW = 220;
    const items = ["Task one", "Task two", "Task three"];
    const itemH = 28;
    const headerH = 36;
    const cardH = headerH + items.length * itemH + 16;

    const bg = new Rect({
      left: 0, top: 0, fill: '#FFFFFF', width: cardW, height: cardH,
      rx: 8, ry: 8, stroke: '#e2e2e2', strokeWidth: 1,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.06)', blur: 12, offsetY: 3 }),
    });
    const header = new Textbox("Checklist", {
      left: 14, top: 8, fill: '#1a1a1a', fontSize: 14, fontWeight: 'bold',
      fontFamily: 'Inter, Arial, sans-serif', width: cardW - 28, editable: true,
    });

    const elements: FabricObject[] = [bg, header];

    items.forEach((item, i) => {
      const y = headerH + i * itemH;
      const checkbox = new Rect({
        left: 14, top: y + 4, fill: 'transparent', width: 16, height: 16,
        rx: 3, ry: 3, stroke: '#94a3b8', strokeWidth: 1.5,
      });
      const label = new Textbox(item, {
        left: 38, top: y + 2, fill: '#334155', fontSize: 13,
        fontFamily: 'Inter, Arial, sans-serif', width: cardW - 52, editable: true,
      });
      elements.push(checkbox, label);
    });

    const group = new Group(elements, {
      left: left - cardW / 2, top: top - cardH / 2,
      subTargetCheck: true,
    });
    (group as any)._objId = genObjId();
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  };

  // --- Link Card ---
  const createLinkCard = (canvas: FabricCanvas, left: number, top: number, url: string) => {
    const cardW = 260;
    const cardH = 72;
    let domain = url;
    try { domain = new URL(url.startsWith('http') ? url : `https://${url}`).hostname; } catch { /* keep raw */ }

    const bg = new Rect({
      left: 0, top: 0, fill: '#f8fafc', width: cardW, height: cardH,
      rx: 8, ry: 8, stroke: '#e2e8f0', strokeWidth: 1,
      shadow: new Shadow({ color: 'rgba(0,0,0,0.05)', blur: 8, offsetY: 2 }),
    });
    const icon = new Circle({
      left: 14, top: 18, fill: '#e2e8f0', radius: 16,
      stroke: '#cbd5e1', strokeWidth: 1,
    });
    const iconText = new Textbox("🔗", {
      left: 18, top: 22, fontSize: 16, width: 24,
    });
    const domainText = new Textbox(domain, {
      left: 54, top: 14, fill: '#1e293b', fontSize: 13, fontWeight: 'bold',
      fontFamily: 'Inter, Arial, sans-serif', width: cardW - 68, editable: false,
    });
    const urlText = new Textbox(url.length > 40 ? url.substring(0, 40) + '...' : url, {
      left: 54, top: 34, fill: '#94a3b8', fontSize: 11,
      fontFamily: 'Inter, Arial, sans-serif', width: cardW - 68, editable: false,
    });

    const group = new Group([bg, icon, iconText, domainText, urlText], {
      left: left - cardW / 2, top: top - cardH / 2,
      subTargetCheck: true,
    });
    (group as any)._objId = genObjId();
    (group as any)._linkUrl = url;
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  };

  // --- Swatch Palette ---
  const createSwatchPalette = (canvas: FabricCanvas, left: number, top: number) => {
    const colors = ['#E74C3C', '#F39C12', '#2ECC71', '#3498DB', '#9B59B6'];
    const r = 18;
    const gap = 44;
    const elements: FabricObject[] = [];

    colors.forEach((color, i) => {
      const circle = new Circle({
        left: i * gap, top: 0, fill: color, radius: r,
        stroke: '#fff', strokeWidth: 2,
        shadow: new Shadow({ color: 'rgba(0,0,0,0.15)', blur: 6, offsetY: 2 }),
      });
      elements.push(circle);
    });

    const group = new Group(elements, {
      left: left - (colors.length * gap) / 2, top: top - r,
      subTargetCheck: true,
    });
    (group as any)._objId = genObjId();
    canvas.add(group);
    canvas.setActiveObject(group);
    canvas.renderAll();
  };

  // --- Board Templates ---
  const applyTemplate = (templateName: string) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const startX = 60;
    const startY = 80;

    if (templateName === 'moodboard') {
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const frame = new Rect({
            left: startX + col * 220, top: startY + row * 200,
            fill: '#f1f5f9', width: 200, height: 180,
            rx: 8, ry: 8, stroke: '#cbd5e1', strokeWidth: 1,
            shadow: new Shadow({ color: 'rgba(0,0,0,0.04)', blur: 8, offsetY: 2 }),
          });
          const label = new Textbox("Drop image", {
            left: startX + col * 220 + 55, top: startY + row * 200 + 75,
            fill: '#94a3b8', fontSize: 12, fontFamily: 'Inter, Arial, sans-serif', width: 90,
          });
          canvas.add(frame, label);
        }
      }
      toast.success("Mood Board template applied");
    } else if (templateName === 'projectplan') {
      const cols = ["To Do", "In Progress", "Done"];
      const colColors = ['#fee2e2', '#fef3c7', '#d1fae5'];
      cols.forEach((col, i) => {
        const bg = new Rect({
          left: startX + i * 260, top: startY,
          fill: colColors[i], width: 240, height: 500,
          rx: 12, ry: 12, stroke: '#e5e7eb', strokeWidth: 1,
        });
        const header = new Textbox(col, {
          left: startX + i * 260 + 16, top: startY + 14,
          fill: '#1e293b', fontSize: 16, fontWeight: 'bold',
          fontFamily: 'Inter, Arial, sans-serif', width: 208,
        });
        canvas.add(bg, header);

        // Add 2 placeholder cards per column
        for (let j = 0; j < 2; j++) {
          const card = new Rect({
            left: startX + i * 260 + 12, top: startY + 50 + j * 80,
            fill: '#ffffff', width: 216, height: 64,
            rx: 6, ry: 6, stroke: '#e2e8f0', strokeWidth: 1,
            shadow: new Shadow({ color: 'rgba(0,0,0,0.04)', blur: 4, offsetY: 1 }),
          });
          const cardText = new Textbox(`Task ${j + 1}`, {
            left: startX + i * 260 + 24, top: startY + 64 + j * 80,
            fill: '#475569', fontSize: 13, fontFamily: 'Inter, Arial, sans-serif', width: 192, editable: true,
          });
          canvas.add(card, cardText);
        }
      });
      toast.success("Project Plan template applied");
    } else if (templateName === 'brainstorm') {
      // Center topic
      createNoteCard(canvas, 400, 300);
      
      // Radiating stickies
      const angles = [0, 72, 144, 216, 288];
      const radius = 250;
      angles.forEach(angle => {
        const rad = (angle * Math.PI) / 180;
        const x = 400 + radius * Math.cos(rad);
        const y = 300 + radius * Math.sin(rad);
        const color = stickyColors[Math.floor(Math.random() * stickyColors.length)];
        const bg = new Rect({
          left: 0, top: 0, fill: color, width: 140, height: 140,
          rx: 6, ry: 6, stroke: '#e0ddd5', strokeWidth: 1,
          shadow: new Shadow({ color: 'rgba(0,0,0,0.06)', blur: 8, offsetY: 3 }),
        });
        const txt = new Textbox("Idea...", {
          left: 12, top: 12, fill: '#444', fontSize: 13,
          fontFamily: 'Inter, Arial, sans-serif', width: 116, editable: true,
        });
        const group = new Group([bg, txt], {
          left: x - 70, top: y - 70,
          angle: (Math.random() - 0.5) * 8,
          subTargetCheck: true,
        });
        canvas.add(group);
      });
      toast.success("Brainstorm template applied");
    } else if (templateName === 'storyboard') {
      for (let i = 0; i < 6; i++) {
        const frame = new Rect({
          left: startX + i * 200, top: startY,
          fill: '#ffffff', width: 180, height: 260,
          rx: 8, ry: 8, stroke: '#d1d5db', strokeWidth: 1,
          shadow: new Shadow({ color: 'rgba(0,0,0,0.05)', blur: 8, offsetY: 2 }),
        });
        const imgArea = new Rect({
          left: startX + i * 200 + 10, top: startY + 10,
          fill: '#f3f4f6', width: 160, height: 140,
          rx: 4, ry: 4,
        });
        const number = new Textbox(`${i + 1}`, {
          left: startX + i * 200 + 14, top: startY + 160,
          fill: '#9ca3af', fontSize: 11, fontWeight: 'bold',
          fontFamily: 'Inter, Arial, sans-serif', width: 30,
        });
        const desc = new Textbox("Description...", {
          left: startX + i * 200 + 14, top: startY + 180,
          fill: '#64748b', fontSize: 12,
          fontFamily: 'Inter, Arial, sans-serif', width: 152, editable: true,
        });
        canvas.add(frame, imgArea, number, desc);
      }
      toast.success("Storyboard template applied");
    }

    canvas.renderAll();
  };

  const handleZoomIn = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const nz = Math.min(zoom + 10, 400);
    setZoom(nz);
    canvas.setZoom(nz / 100);
    canvas.renderAll();
  };

  const handleZoomOut = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const nz = Math.max(zoom - 10, 25);
    setZoom(nz);
    canvas.setZoom(nz / 100);
    canvas.renderAll();
  };

  const handleZoomFit = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    if (objects.length === 0) {
      canvas.setZoom(1);
      if (canvas.viewportTransform) {
        canvas.viewportTransform[4] = 0;
        canvas.viewportTransform[5] = 0;
      }
      setZoom(100);
      canvas.renderAll();
      return;
    }
    
    const bounds = objects.reduce((acc, obj) => {
      const rect = obj.getBoundingRect();
      return {
        left: Math.min(acc.left, rect.left),
        top: Math.min(acc.top, rect.top),
        right: Math.max(acc.right, rect.left + rect.width),
        bottom: Math.max(acc.bottom, rect.top + rect.height),
      };
    }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity });
    
    const padding = 50;
    const contentWidth = bounds.right - bounds.left + padding * 2;
    const contentHeight = bounds.bottom - bounds.top + padding * 2;
    const scaleX = (canvas.width || 800) / contentWidth;
    const scaleY = (canvas.height || 600) / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1);
    
    canvas.setZoom(newZoom);
    if (canvas.viewportTransform) {
      canvas.viewportTransform[4] = -bounds.left * newZoom + padding * newZoom;
      canvas.viewportTransform[5] = -bounds.top * newZoom + padding * newZoom;
    }
    setZoom(Math.round(newZoom * 100));
    canvas.renderAll();
  };

  const handleClear = () => {
    const canvas = fabricRef.current;
    if (!canvas || !confirm("Clear entire whiteboard?")) return;
    canvas.clear();
    canvas.backgroundColor = "#FAFAF8";
    connectionsRef.current.clear();
    canvas.renderAll();
    toast.success("Whiteboard cleared");
  };

  const handleExportPNG = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL({ multiplier: 2, format: 'png', quality: 1 });
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported as PNG");
  };

  const handleExportSVG = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const svg = canvas.toSVG();
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Exported as SVG");
  };

  const handleSaveJSON = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.json`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Saved as JSON");
  };

  const handleLoadJSON = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          canvas.loadFromJSON(json).then(() => {
            canvas.renderAll();
            toast.success("Loaded from JSON");
          });
        } catch {
          toast.error("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleDeleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length > 0) {
      active.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  const ToolBtn = ({ tool, icon: Icon, label, onClick, disabled }: { tool?: Tool; icon: any; label: string; onClick?: () => void; disabled?: boolean }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={tool && activeTool === tool ? "default" : "ghost"}
          size="icon"
          className={cn("h-9 w-9 rounded-xl transition-all", tool && activeTool === tool && "shadow-md")}
          onClick={onClick || (() => tool && (["rectangle","circle","triangle","star","polygon","line","arrow","text","sticky","image","diamond","pentagon","octagon","cross","doubleArrow","speechBubble","frame","noteCard","checklist","linkCard","swatch"].includes(tool) ? handleToolClick(tool) : setActiveTool(tool)))}
          disabled={disabled}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );

  const shapes: [Tool, any, string][] = [
    ["rectangle", Square, "Rectangle"],
    ["circle", CircleIcon, "Circle"],
    ["triangle", TriangleIcon, "Triangle"],
    ["star", Star, "Star"],
    ["polygon", Hexagon, "Hexagon"],
    ["diamond", Diamond, "Diamond"],
    ["pentagon", Pentagon, "Pentagon"],
    ["octagon", Octagon, "Octagon"],
    ["cross", Plus, "Cross"],
    ["line", Minus, "Line"],
    ["arrow", ArrowRight, "Arrow"],
    ["doubleArrow", ArrowLeftRight, "Double Arrow"],
    ["speechBubble", MessageSquare, "Speech Bubble"],
    ["frame", SquareDashed, "Frame"],
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <div ref={containerRef} className={cn("relative w-full h-full min-h-[600px] rounded-xl overflow-hidden", showGrid ? "whiteboard-dot-grid" : "bg-[#FAFAF8]")}>
        {/* Floating Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 whiteboard-toolbar flex-wrap max-w-[95vw]">
          {/* Selection */}
          <ToolBtn tool="select" icon={MousePointer2} label="Select (V)" />
          <ToolBtn tool="pan" icon={Hand} label="Pan (H)" />
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* Drawing */}
          <ToolBtn tool="pen" icon={Pen} label="Draw (P)" />
          <ToolBtn tool="highlighter" icon={Highlighter} label="Highlighter" />
          <ToolBtn tool="eraser" icon={Eraser} label="Eraser (E)" />
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* Shapes Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={shapes.map(s => s[0]).includes(activeTool) ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-xl">
                <Square className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="bottom">
              <div className="grid grid-cols-4 gap-1">
                {shapes.map(([t, I, l]) => (
                  <Tooltip key={t}>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={() => handleToolClick(t)}>
                        <I className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">{l}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* Content - including new Milanote tools */}
          <ToolBtn tool="text" icon={Type} label="Text (T)" />
          <ToolBtn tool="sticky" icon={StickyNote} label="Sticky (S)" />
          <ToolBtn tool="noteCard" icon={FileText} label="Note Card (N)" />
          <ToolBtn tool="checklist" icon={CheckSquare} label="Checklist" />
          <ToolBtn tool="linkCard" icon={Link2} label="Link Card" />
          <ToolBtn tool="image" icon={ImageIcon} label="Image" />
          
          <Separator orientation="vertical" className="h-5 mx-1" />

          {/* Connector & Swatch */}
          <ToolBtn tool="connector" icon={GitBranch} label="Connector (C)" />
          <ToolBtn tool="swatch" icon={Palette} label="Color Swatch" />

          {/* Templates Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <LayoutTemplate className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52 p-2" side="bottom">
              <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">Board Templates</p>
              <div className="space-y-1">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={() => applyTemplate('moodboard')}>
                  🎨 Mood Board
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={() => applyTemplate('projectplan')}>
                  📋 Project Plan
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={() => applyTemplate('brainstorm')}>
                  💡 Brainstorm
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={() => applyTemplate('storyboard')}>
                  🎬 Storyboard
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* Style Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <div className="h-5 w-5 rounded-full border-2 border-border relative overflow-hidden">
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${penColor} 50%, ${fillColor === 'transparent' ? '#fff' : fillColor} 50%)` }} />
                </div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" side="bottom">
              <div className="space-y-4">
                {/* Stroke Color */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Stroke</label>
                  <div className="grid grid-cols-4 gap-2">
                    {penColors.map(({ name, value }) => (
                      <button
                        key={value}
                        onClick={() => { setPenColor(value); applyStrokeToSelected(value); }}
                        className={cn("w-10 h-10 rounded-lg border-2 transition-all", penColor === value ? "border-foreground scale-105 shadow-md" : "border-border hover:scale-105")}
                        style={{ backgroundColor: value }}
                        title={name}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Fill Color */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Fill</label>
                  <div className="grid grid-cols-4 gap-2">
                    {fillColors.map(({ name, value }) => (
                      <button
                        key={value}
                        onClick={() => { setFillColor(value); applyFillToSelected(value); }}
                        className={cn(
                          "w-10 h-10 rounded-lg border-2 transition-all",
                          fillColor === value ? "border-foreground scale-105 shadow-md" : "border-border hover:scale-105",
                          value === "transparent" && "bg-[repeating-conic-gradient(#ccc_0_25%,transparent_0_50%)] bg-[length:8px_8px]"
                        )}
                        style={{ backgroundColor: value === "transparent" ? undefined : value }}
                        title={name}
                      />
                    ))}
                  </div>
                </div>
                
                {/* Stroke Width */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Stroke Width: {penSize}px</label>
                  <Slider value={[penSize]} onValueChange={([v]) => setPenSize(v)} min={1} max={20} step={1} />
                </div>
                
                {/* Opacity */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Opacity: {objectOpacity}%</label>
                  <Slider value={[objectOpacity]} onValueChange={([v]) => { setObjectOpacity(v); applyOpacityToSelected(v); }} min={10} max={100} step={5} />
                </div>
                
                {/* Line Style */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Line Style</label>
                  <div className="flex gap-1">
                    {(["solid", "dashed", "dotted"] as LineStyle[]).map(style => (
                      <Button
                        key={style}
                        variant={lineStyle === style ? "default" : "outline"}
                        size="sm"
                        className="flex-1 h-8 text-xs"
                        onClick={() => { setLineStyle(style); applyLineStyleToSelected(style); }}
                      >
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Snap to Grid toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Snap to Grid</label>
                  <Button variant={snapToGrid ? "default" : "outline"} size="sm" className="h-7 text-xs" onClick={() => setSnapToGrid(!snapToGrid)}>
                    {snapToGrid ? "On" : "Off"}
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* Undo/Redo */}
          <ToolBtn icon={Undo2} label="Undo (Ctrl+Z)" onClick={handleUndo} disabled={!canUndo} />
          <ToolBtn icon={Redo2} label="Redo (Ctrl+Shift+Z)" onClick={handleRedo} disabled={!canRedo} />
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* Edit Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <Copy className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" side="bottom">
              <div className="space-y-1">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={handleDuplicate}>
                  <Copy className="h-3.5 w-3.5" /> Duplicate (Ctrl+D)
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={handleCopyObjects}>
                  <Clipboard className="h-3.5 w-3.5" /> Copy (Ctrl+C)
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={handlePasteObjects}>
                  <Clipboard className="h-3.5 w-3.5" /> Paste (Ctrl+V)
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={handleSelectAll}>
                  <MousePointer2 className="h-3.5 w-3.5" /> Select All (Ctrl+A)
                </Button>
                <Separator className="my-1" />
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={handleDeleteSelected}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete (Del)
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs text-destructive" onClick={handleClear}>
                  <RotateCcw className="h-3.5 w-3.5" /> Clear All
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          
          {/* Arrange Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <Layers className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" side="bottom">
              <div className="space-y-3">
                {/* Layer Order */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Layer Order</label>
                  <div className="grid grid-cols-4 gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleBringToFront}>
                          <ChevronsUp className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">To Front</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleBringForward}>
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">Forward</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleSendBackward}>
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">Backward</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleSendToBack}>
                          <ChevronsDown className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">To Back</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
                
                {/* Horizontal Align */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Align Horizontal</label>
                  <div className="grid grid-cols-3 gap-1">
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleAlignLeft}>
                      <AlignLeft className="h-3.5 w-3.5 mr-1" /> Left
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleAlignCenterH}>
                      <AlignCenter className="h-3.5 w-3.5 mr-1" /> Center
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleAlignRight}>
                      <AlignRight className="h-3.5 w-3.5 mr-1" /> Right
                    </Button>
                  </div>
                </div>
                
                {/* Vertical Align */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Align Vertical</label>
                  <div className="grid grid-cols-3 gap-1">
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleAlignTop}>
                      <AlignVerticalJustifyStart className="h-3.5 w-3.5 mr-1" /> Top
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleAlignMiddleV}>
                      <AlignVerticalJustifyCenter className="h-3.5 w-3.5 mr-1" /> Mid
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleAlignBottom}>
                      <AlignVerticalJustifyEnd className="h-3.5 w-3.5 mr-1" /> Bot
                    </Button>
                  </div>
                </div>
                
                {/* Lock */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Lock</label>
                  <div className="grid grid-cols-2 gap-1">
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleLockSelected}>
                      <Lock className="h-3.5 w-3.5 mr-1" /> Lock
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleUnlockAll}>
                      <Unlock className="h-3.5 w-3.5 mr-1" /> Unlock All
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* View */}
          <ToolBtn icon={ZoomOut} label="Zoom Out (-)" onClick={handleZoomOut} />
          <span className="text-xs text-muted-foreground font-medium min-w-[3ch] text-center">{zoom}%</span>
          <ToolBtn icon={ZoomIn} label="Zoom In (+)" onClick={handleZoomIn} />
          <ToolBtn icon={Maximize2} label="Zoom to Fit" onClick={handleZoomFit} />
          <ToolBtn icon={Grid3x3} label="Toggle Grid" onClick={() => setShowGrid(!showGrid)} />
          <ToolBtn icon={Map} label="Toggle Minimap" onClick={() => setShowMinimap(!showMinimap)} />
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* Export Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <Download className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-2" side="bottom" align="end">
              <div className="space-y-1">
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={handleExportPNG}>
                  <Download className="h-3.5 w-3.5" /> Export PNG
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={handleExportSVG}>
                  <FileDown className="h-3.5 w-3.5" /> Export SVG
                </Button>
                <Separator className="my-1" />
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={handleSaveJSON}>
                  <FileDown className="h-3.5 w-3.5" /> Save JSON
                </Button>
                <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs" onClick={handleLoadJSON}>
                  <FileUp className="h-3.5 w-3.5" /> Load JSON
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Minimap */}
        {showMinimap && (
          <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-lg overflow-hidden">
            <canvas ref={minimapCanvasRef} width={160} height={110} className="block" />
          </div>
        )}

        {/* Connector mode indicator */}
        {activeTool === 'connector' && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg animate-pulse">
            {connectorSourceRef.current ? "Click target object" : "Click source object"}
          </div>
        )}

        {/* Zoom badge */}
        <div className="absolute bottom-4 right-4 z-10 whiteboard-zoom-badge">
          {zoom}%
        </div>

        {/* Canvas */}
        <canvas ref={canvasRef} className="block" />
      </div>
    </TooltipProvider>
  );
};

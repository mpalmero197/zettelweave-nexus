import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Textbox, Line, PencilBrush, Shadow, Polygon, Triangle, Group, FabricObject, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { 
  MousePointer2, Pen, Eraser, Square, Circle as CircleIcon, Type, StickyNote,
  Image as ImageIcon, ZoomIn, ZoomOut, RotateCcw, Trash2, Download, Palette,
  Grid3x3, Hand, Star, Hexagon, Triangle as TriangleIcon, Minus, ArrowRight,
  Undo2, Redo2, Highlighter
} from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DesktopWhiteboardProps {
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
}

type Tool = "select" | "pen" | "eraser" | "rectangle" | "circle" | "triangle" | "star" | "polygon" | "line" | "arrow" | "text" | "sticky" | "image" | "pan" | "highlighter";

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

const stickyColors = ["#FFF4A3", "#FFE4A3", "#FFD4A3", "#C4E4FF", "#D4F4DD", "#FFE4F4"];

const HISTORY_LIMIT = 50;

export const DesktopWhiteboard = ({ onCreateCard }: DesktopWhiteboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [penColor, setPenColor] = useState("#1a1a1a");
  const [penSize, setPenSize] = useState(2);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [isReady, setIsReady] = useState(false);
  // Undo/Redo
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Panning refs
  const isPanningRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

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

      // Save initial state
      saveHistory(canvas);
    };

    const timer = setTimeout(initCanvas, 50);

    // ResizeObserver for responsive canvas
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
    const h = historyRef.current;
    // Truncate forward history
    historyRef.current = h.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  // Listen for canvas changes to save history
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

  // Grid is now CSS-based, no Fabric objects needed

  // --- Update brush when color/size changes (NOT recreating canvas) ---
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

    // Eraser click-to-delete
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

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      // Don't capture when typing in inputs or editing text on canvas
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const activeObj = canvas.getActiveObject();
      if (activeObj && (activeObj as any).isEditing) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); handleRedo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); canvas.discardActiveObject(); const sel = canvas.getObjects().filter(o => o.selectable); if (sel.length) { /* select all */ } return; }
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
        case '=': case '+': handleZoomIn(); break;
        case '-': handleZoomOut(); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // --- Tool actions ---
  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool);
    const canvas = fabricRef.current;
    if (!canvas) return;

    const cx = canvas.width! / 2;
    const cy = canvas.height! / 2;

    if (tool === "rectangle") {
      const rect = new Rect({ left: cx - 75, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: penSize, width: 150, height: 100, rx: 8, ry: 8 });
      canvas.add(rect); canvas.setActiveObject(rect); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "circle") {
      const circle = new Circle({ left: cx - 50, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: penSize, radius: 50 });
      canvas.add(circle); canvas.setActiveObject(circle); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "triangle") {
      const tri = new Triangle({ left: cx - 50, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: penSize, width: 100, height: 100 });
      canvas.add(tri); canvas.setActiveObject(tri); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "star") {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 50 : 25;
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        pts.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
      }
      const star = new Polygon(pts, { left: cx - 50, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: penSize });
      canvas.add(star); canvas.setActiveObject(star); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "polygon") {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
        pts.push({ x: 50 * Math.cos(angle), y: 50 * Math.sin(angle) });
      }
      const hex = new Polygon(pts, { left: cx - 50, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: penSize });
      canvas.add(hex); canvas.setActiveObject(hex); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "line") {
      const line = new Line([0, 0, 150, 0], { left: cx - 75, top: cy, stroke: penColor, strokeWidth: penSize });
      canvas.add(line); canvas.setActiveObject(line); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "arrow") {
      const arrowLine = new Line([0, 0, 130, 0], { stroke: penColor, strokeWidth: penSize });
      const arrowHead = new Triangle({ left: 130, top: -8, width: 16, height: 16, fill: penColor, angle: 90 });
      const arrow = new Group([arrowLine, arrowHead], { left: cx - 75, top: cy });
      canvas.add(arrow); canvas.setActiveObject(arrow); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "text") {
      const text = new Textbox("Type here...", { left: cx - 100, top: cy, fill: penColor, fontSize: 24, fontFamily: 'Inter, Arial, sans-serif', width: 200, editable: true });
      canvas.add(text); canvas.setActiveObject(text); canvas.renderAll(); setActiveTool("select");
    } else if (tool === "sticky") {
      const color = stickyColors[Math.floor(Math.random() * stickyColors.length)];
      const rotation = (Math.random() - 0.5) * 6; // -3 to 3 degrees
      const bg = new Rect({ left: 0, top: 0, fill: color, width: 200, height: 200, stroke: '#e0ddd5', strokeWidth: 1, shadow: new Shadow({ color: 'rgba(0,0,0,0.08)', blur: 12, offsetY: 4 }), rx: 6, ry: 6 });
      const txt = new Textbox("Note...", { left: 14, top: 14, fill: "#444", fontSize: 15, fontFamily: 'Inter, Arial, sans-serif', width: 172, editable: true });
      const group = new Group([bg, txt], { left: cx - 100, top: cy - 100, angle: rotation, subTargetCheck: true });
      canvas.add(group); canvas.setActiveObject(group); canvas.renderAll(); setActiveTool("select");
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
            const fi = new FabricImage(img, { left: cx - 100, top: cy - 100, scaleX: 0.5, scaleY: 0.5 });
            canvas.add(fi); canvas.setActiveObject(fi); canvas.renderAll();
          };
        };
        reader.readAsDataURL(file);
      };
      input.click();
      setActiveTool("select");
    }
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

  const handleClear = () => {
    const canvas = fabricRef.current;
    if (!canvas || !confirm("Clear entire whiteboard?")) return;
    canvas.clear();
    canvas.backgroundColor = "#FAFAF8";
    canvas.renderAll();
    toast.success("Whiteboard cleared");
  };

  const handleExport = () => {
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

  const ToolBtn = ({ tool, icon: Icon, label, onClick }: { tool?: Tool; icon: any; label: string; onClick?: () => void }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={tool && activeTool === tool ? "default" : "ghost"}
          size="icon"
          className={cn("h-9 w-9 rounded-xl transition-all", tool && activeTool === tool && "shadow-md")}
          onClick={onClick || (() => tool && (["rectangle","circle","triangle","star","polygon","line","arrow","text","sticky","image"].includes(tool) ? handleToolClick(tool) : setActiveTool(tool)))}
        >
          <Icon className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div ref={containerRef} className={cn("relative w-full h-full min-h-[600px] rounded-xl overflow-hidden", showGrid ? "whiteboard-dot-grid" : "bg-[#FAFAF8]")}>
        {/* Floating Toolbar */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 whiteboard-toolbar">
          {/* Selection */}
          <ToolBtn tool="select" icon={MousePointer2} label="Select (V)" />
          <ToolBtn tool="pan" icon={Hand} label="Pan (H)" />
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* Drawing */}
          <ToolBtn tool="pen" icon={Pen} label="Draw (P)" />
          <ToolBtn tool="eraser" icon={Eraser} label="Eraser (E)" />
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* Shapes Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={["rectangle","circle","triangle","star","polygon","line","arrow"].includes(activeTool) ? "default" : "ghost"} size="icon" className="h-9 w-9 rounded-xl">
                <Square className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" side="bottom">
              <div className="grid grid-cols-4 gap-1">
                {([
                  ["rectangle", Square, "Rectangle (R)"],
                  ["circle", CircleIcon, "Circle (O)"],
                  ["triangle", TriangleIcon, "Triangle"],
                  ["star", Star, "Star"],
                  ["polygon", Hexagon, "Hexagon"],
                  ["line", Minus, "Line"],
                  ["arrow", ArrowRight, "Arrow"],
                ] as [Tool, any, string][]).map(([t, I, l]) => (
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
          
          {/* Content */}
          <ToolBtn tool="text" icon={Type} label="Text (T)" />
          <ToolBtn tool="sticky" icon={StickyNote} label="Sticky (S)" />
          <ToolBtn tool="image" icon={ImageIcon} label="Image" />
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* Color & Size Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                <div className="h-5 w-5 rounded-full border-2 border-border" style={{ backgroundColor: penColor }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" side="bottom">
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {penColors.map(({ name, value }) => (
                    <button
                      key={value}
                      onClick={() => setPenColor(value)}
                      className={cn("w-10 h-10 rounded-lg border-2 transition-all", penColor === value ? "border-foreground scale-110 shadow-md" : "border-border hover:scale-105")}
                      style={{ backgroundColor: value }}
                      title={name}
                    />
                  ))}
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Stroke: {penSize}px</label>
                  <Slider value={[penSize]} onValueChange={([v]) => setPenSize(v)} min={1} max={20} step={1} />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          {/* Actions */}
          <ToolBtn icon={Undo2} label="Undo (Ctrl+Z)" onClick={handleUndo} />
          <ToolBtn icon={Redo2} label="Redo (Ctrl+Shift+Z)" onClick={handleRedo} />
          <ToolBtn icon={Trash2} label="Delete (Del)" onClick={handleDeleteSelected} />
          <ToolBtn icon={RotateCcw} label="Clear All" onClick={handleClear} />
          <ToolBtn icon={Download} label="Export PNG" onClick={handleExport} />
          
          <Separator orientation="vertical" className="h-5 mx-1" />
          
          <ToolBtn icon={ZoomOut} label="Zoom Out (-)" onClick={handleZoomOut} />
          <span className="text-xs text-muted-foreground font-medium min-w-[3ch] text-center">{zoom}%</span>
          <ToolBtn icon={ZoomIn} label="Zoom In (+)" onClick={handleZoomIn} />
          <ToolBtn icon={Grid3x3} label="Toggle Grid" onClick={() => setShowGrid(!showGrid)} />
        </div>

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

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Textbox, PencilBrush, Group, Shadow, Triangle, Polygon, Line } from "fabric";
import { Button } from "@/components/ui/button";
import { 
  Pen, Square, Circle as CircleIcon, Type, StickyNote, Hand, 
  Trash2, Undo2, Star, Hexagon, Triangle as TriangleIcon, Eraser,
  Download, RotateCcw, MoreHorizontal, Minus, Plus, Highlighter, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const penColors = [
  { name: "Black", value: "#1a1a1a" },
  { name: "Red", value: "#E74C3C" },
  { name: "Blue", value: "#3498DB" },
  { name: "Green", value: "#2ECC71" },
  { name: "Yellow", value: "#F1C40F" },
  { name: "Purple", value: "#9B59B6" },
];

const stickyColors = ["#FFF4A3", "#FFE4A3", "#FFD4A3", "#C4E4FF", "#D4F4DD", "#FFE4F4"];
const strokeSizes = [2, 5, 10];
const strokeLabels = ["S", "M", "L"];

type MobileTool = "pan" | "pen" | "eraser" | "rectangle" | "circle" | "triangle" | "star" | "polygon" | "text" | "sticky" | "highlighter" | "line" | "arrow";

const HISTORY_LIMIT = 30;
const TOOLBAR_HEIGHT = 130; // px reserved for toolbar

export function MobileWhiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<MobileTool>("pen");
  const [penColor, setPenColor] = useState("#1a1a1a");
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Undo
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);

  // Pinch zoom
  const lastTouchDistRef = useRef<number | null>(null);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // --- Canvas init (mount once) ---
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const initCanvas = () => {
      const container = containerRef.current!;
      const width = container.clientWidth || window.innerWidth;
      const height = container.clientHeight || (window.innerHeight - TOOLBAR_HEIGHT);
      if (width === 0 || height === 0) { setTimeout(initCanvas, 100); return; }

      const canvas = new FabricCanvas(canvasRef.current!, {
        width,
        height,
        backgroundColor: "#FAFAF8",
        selection: true,
        allowTouchScrolling: false,
      });

      const brush = new PencilBrush(canvas);
      brush.color = "#1a1a1a";
      brush.width = 2;
      canvas.freeDrawingBrush = brush;

      fabricRef.current = canvas;
      setIsReady(true);
      saveHistory(canvas);
    };

    const timer = setTimeout(initCanvas, 80);
    return () => { clearTimeout(timer); fabricRef.current?.dispose(); fabricRef.current = null; };
  }, []);

  // Resize canvas on orientation change
  useEffect(() => {
    const handleResize = () => {
      const canvas = fabricRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || (window.innerHeight - TOOLBAR_HEIGHT);
      canvas.setDimensions({ width: w, height: h });
      canvas.renderAll();
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => { window.removeEventListener('resize', handleResize); window.removeEventListener('orientationchange', handleResize); };
  }, [isReady]);

  // --- History ---
  const saveHistory = useCallback((canvas: FabricCanvas) => {
    if (isRestoringRef.current) return;
    const json = JSON.stringify(canvas.toJSON());
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > HISTORY_LIMIT) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
  }, []);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const onMod = () => saveHistory(canvas);
    canvas.on('object:added', onMod);
    canvas.on('object:removed', onMod);
    canvas.on('object:modified', onMod);
    return () => { canvas.off('object:added', onMod); canvas.off('object:removed', onMod); canvas.off('object:modified', onMod); };
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
    });
  }, []);

  // --- Update brush ---
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !canvas.freeDrawingBrush) return;
    canvas.freeDrawingBrush.color = penColor;
    canvas.freeDrawingBrush.width = strokeSizes[strokeIndex];
  }, [penColor, strokeIndex]);

  // --- Tool mode ---
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === "pen" || activeTool === "highlighter";
    canvas.selection = activeTool === "pan" || activeTool === "eraser" ? false : true;

    if ((activeTool === "pen" || activeTool === "highlighter") && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = activeTool === "highlighter" ? `${penColor}66` : penColor;
      canvas.freeDrawingBrush.width = activeTool === "highlighter" ? strokeSizes[strokeIndex] * 3 : strokeSizes[strokeIndex];
    }

    const handleEraserClick = (e: any) => {
      if (activeTool === "eraser" && e.target) {
        canvas.remove(e.target);
        canvas.renderAll();
      }
    };

    // For text tool: tap canvas to place text
    const handleTextTap = (e: any) => {
      if (activeTool !== "text" && activeTool !== "sticky") return;
      if (e.target) return; // tapped existing object, let fabric handle it

      const pointer = canvas.getViewportPoint(e.e);
      if (!pointer) return;

      if (activeTool === "text") {
        const text = new Textbox("Tap to edit", {
          left: pointer.x - 60, top: pointer.y - 12,
          fill: penColor, fontSize: 22,
          fontFamily: 'Inter, Arial, sans-serif',
          width: 180, editable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        // Enter editing mode immediately
        setTimeout(() => { text.enterEditing(); canvas.renderAll(); }, 100);
      } else if (activeTool === "sticky") {
        const color = stickyColors[Math.floor(Math.random() * stickyColors.length)];
        const rotation = (Math.random() - 0.5) * 6;
        const bg = new Rect({ left: 0, top: 0, fill: color, width: 180, height: 180, stroke: '#e0ddd5', strokeWidth: 1, shadow: new Shadow({ color: 'rgba(0,0,0,0.08)', blur: 10, offsetY: 4 }), rx: 6, ry: 6 });
        const txt = new Textbox("Note...", { left: 12, top: 12, fill: "#444", fontSize: 14, fontFamily: 'Inter, Arial, sans-serif', width: 156, editable: true });
        const group = new Group([bg, txt], { left: pointer.x - 90, top: pointer.y - 90, angle: rotation, subTargetCheck: true });
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.renderAll();
      }
    };

    if (activeTool === "eraser") {
      canvas.isDrawingMode = false;
      canvas.on('mouse:down', handleEraserClick);
    }

    canvas.on('mouse:down', handleTextTap);

    return () => {
      canvas.off('mouse:down', handleEraserClick);
      canvas.off('mouse:down', handleTextTap);
    };
  }, [activeTool, penColor, strokeIndex, isReady]);

  // --- Panning ---
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const handleDown = (opt: any) => {
      if (activeTool === 'pan') {
        isPanningRef.current = true;
        canvas.selection = false;
        canvas.isDrawingMode = false;
        const p = opt.pointer;
        if (p) lastPosRef.current = { x: p.x, y: p.y };
      }
    };
    const handleMove = (opt: any) => {
      if (activeTool === 'pan' && isPanningRef.current && lastPosRef.current) {
        const p = opt.pointer;
        if (p && canvas.viewportTransform) {
          canvas.viewportTransform[4] += p.x - lastPosRef.current.x;
          canvas.viewportTransform[5] += p.y - lastPosRef.current.y;
          canvas.requestRenderAll();
          lastPosRef.current = { x: p.x, y: p.y };
        }
      }
    };
    const handleUp = () => { isPanningRef.current = false; canvas.selection = true; lastPosRef.current = null; };

    canvas.on('mouse:down', handleDown);
    canvas.on('mouse:move', handleMove);
    canvas.on('mouse:up', handleUp);
    return () => { canvas.off('mouse:down', handleDown); canvas.off('mouse:move', handleMove); canvas.off('mouse:up', handleUp); };
  }, [activeTool, isReady]);

  // --- Pinch to zoom ---
  useEffect(() => {
    const el = containerRef.current;
    const canvas = fabricRef.current;
    if (!el || !canvas) return;

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDistRef.current !== null) {
          const scale = dist / lastTouchDistRef.current;
          let newZoom = canvas.getZoom() * scale;
          newZoom = Math.max(0.25, Math.min(4, newZoom));
          const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          const rect = el.getBoundingClientRect();
          const point = { x: cx - rect.left, y: cy - rect.top };
          canvas.zoomToPoint(point as any, newZoom);
          canvas.renderAll();
        }
        lastTouchDistRef.current = dist;
      }
    };
    const onTouchEnd = () => { lastTouchDistRef.current = null; };

    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd);
    return () => { el.removeEventListener('touchmove', onTouchMove); el.removeEventListener('touchend', onTouchEnd); };
  }, [isReady]);

  const addShapeToCenter = (tool: MobileTool) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const cx = (canvas.width || 300) / 2;
    const cy = (canvas.height || 300) / 2;

    if (tool === "rectangle") {
      const rect = new Rect({ left: cx - 75, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: strokeSizes[strokeIndex], width: 150, height: 100, rx: 8, ry: 8 });
      canvas.add(rect); canvas.setActiveObject(rect);
    } else if (tool === "circle") {
      const circle = new Circle({ left: cx - 50, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: strokeSizes[strokeIndex], radius: 50 });
      canvas.add(circle); canvas.setActiveObject(circle);
    } else if (tool === "triangle") {
      const tri = new Triangle({ left: cx - 50, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: strokeSizes[strokeIndex], width: 100, height: 100 });
      canvas.add(tri); canvas.setActiveObject(tri);
    } else if (tool === "star") {
      const pts = [];
      for (let i = 0; i < 10; i++) { const r = i % 2 === 0 ? 50 : 25; const a = (i * Math.PI) / 5 - Math.PI / 2; pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) }); }
      const star = new Polygon(pts, { left: cx - 50, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: strokeSizes[strokeIndex] });
      canvas.add(star); canvas.setActiveObject(star);
    } else if (tool === "polygon") {
      const pts = [];
      for (let i = 0; i < 6; i++) { const a = (i * 2 * Math.PI) / 6 - Math.PI / 2; pts.push({ x: 50 * Math.cos(a), y: 50 * Math.sin(a) }); }
      const hex = new Polygon(pts, { left: cx - 50, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: strokeSizes[strokeIndex] });
      canvas.add(hex); canvas.setActiveObject(hex);
    } else if (tool === "line") {
      const line = new Line([0, 0, 100, 0], { left: cx - 50, top: cy, stroke: penColor, strokeWidth: strokeSizes[strokeIndex] });
      canvas.add(line); canvas.setActiveObject(line);
    } else if (tool === "arrow") {
      const arrowLine = new Line([0, 0, 80, 0], { stroke: penColor, strokeWidth: strokeSizes[strokeIndex] });
      const arrowHead = new Triangle({ left: 80, top: -strokeSizes[strokeIndex]*1.5, width: 12, height: 12, fill: penColor, angle: 90 });
      const arrow = new Group([arrowLine, arrowHead], { left: cx - 50, top: cy });
      canvas.add(arrow); canvas.setActiveObject(arrow);
    }
    canvas.renderAll();
  };

  const handleClear = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = "#FAFAF8";
    canvas.renderAll();
    toast.success("Cleared");
  };

  const handleExport = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL({ multiplier: 1, format: 'png', quality: 1 });
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported");
  };

  const handleDeleteSelected = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length > 0) {
      active.forEach(obj => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
      toast.success("Deleted");
    }
  };

  const isDrawTool = ["pen", "rectangle", "circle", "text", "triangle", "star", "polygon"].includes(activeTool);

  return (
    <div className="h-full w-full flex flex-col bg-[#FAFAF8] relative">
      {/* Canvas area - takes remaining space above toolbar */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ touchAction: activeTool === "pan" ? "none" : "auto" }}
      >
        <canvas ref={canvasRef} className="block" />
      </div>

      {/* Toolbar - positioned relative, not fixed, so it doesn't overlap bottom nav */}
      <div className="relative z-40 whiteboard-mobile-toolbar safe-area-bottom">
        {/* Color row - only visible for drawing tools */}
        {isDrawTool && (
          <div className="flex items-center gap-2 px-3 pt-2 pb-1 overflow-x-auto">
            {penColors.map(({ name, value }) => (
              <button
                key={value}
                onClick={() => setPenColor(value)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 flex-shrink-0 transition-transform active:scale-90",
                  penColor === value ? "border-foreground scale-110 ring-2 ring-primary/30" : "border-muted"
                )}
                style={{ backgroundColor: value }}
                aria-label={name}
              />
            ))}
            {/* Stroke size */}
            <div className="w-px h-6 bg-border flex-shrink-0 mx-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStrokeIndex((strokeIndex + 1) % 3)}
              className="flex-shrink-0 h-8 w-8 rounded-full font-bold text-xs p-0"
            >
              {strokeLabels[strokeIndex]}
            </Button>
          </div>
        )}

        {/* Main tools row */}
        <div className="flex items-center gap-1 px-2 py-2 overflow-x-auto">
          {/* Core tools */}
          {([
            ["pan", Hand, "Move"],
            ["pen", Pen, "Draw"],
            ["eraser", Eraser, "Erase"],
            ["text", Type, "Text"],
            ["sticky", StickyNote, "Note"],
          ] as [MobileTool, any, string][]).map(([tool, Icon, label]) => (
            <Button
              key={tool}
              variant={activeTool === tool ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTool(tool)}
              className={cn(
                "flex-shrink-0 h-10 w-10 rounded-xl p-0 active:scale-95 transition-all",
                activeTool === tool && "shadow-sm"
              )}
              aria-label={label}
            >
              <Icon className="h-[18px] w-[18px]" />
            </Button>
          ))}

          {/* Shapes popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-shrink-0 h-10 w-10 rounded-xl p-0" aria-label="Shapes">
                <Square className="h-[18px] w-[18px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-auto p-2" align="center">
              <div className="grid grid-cols-3 gap-1">
                {([
                  ["rectangle", Square, "Rect"],
                  ["circle", CircleIcon, "Circle"],
                  ["triangle", TriangleIcon, "Tri"],
                  ["star", Star, "Star"],
                  ["polygon", Hexagon, "Hex"],
                ] as [MobileTool, any, string][]).map(([t, I, l]) => (
                  <Button key={t} variant="ghost" size="sm" className="h-10 w-10 rounded-lg p-0" onClick={() => addShapeToCenter(t)} aria-label={l}>
                    <I className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <div className="w-px h-6 bg-border flex-shrink-0" />

          {/* Undo */}
          <Button variant="ghost" size="sm" onClick={handleUndo} disabled={!canUndo} className="flex-shrink-0 h-10 w-10 rounded-xl p-0" aria-label="Undo">
            <Undo2 className="h-[18px] w-[18px]" />
          </Button>

          {/* Delete selected */}
          <Button variant="ghost" size="sm" onClick={handleDeleteSelected} className="flex-shrink-0 h-10 w-10 rounded-xl p-0" aria-label="Delete">
            <Trash2 className="h-[18px] w-[18px]" />
          </Button>

          {/* More actions */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-shrink-0 h-10 w-10 rounded-xl p-0" aria-label="More">
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="top" className="w-40 p-1" align="end">
              <Button variant="ghost" size="sm" onClick={handleExport} className="w-full justify-start gap-2 h-9 text-xs">
                <Download className="h-3.5 w-3.5" /> Export PNG
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClear} className="w-full justify-start gap-2 h-9 text-xs text-destructive">
                <RotateCcw className="h-3.5 w-3.5" /> Clear All
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

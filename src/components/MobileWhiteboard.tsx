import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, FabricText, PencilBrush, Group, Shadow, Triangle, Polygon, FabricObject } from "fabric";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Pen, Square, Circle as CircleIcon, Type, StickyNote, Hand, Menu, Download, 
  Trash2, RotateCcw, Palette, Undo2, Star, Hexagon, Triangle as TriangleIcon, Eraser
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

type MobileTool = "pan" | "pen" | "eraser" | "rectangle" | "circle" | "triangle" | "star" | "polygon" | "text" | "sticky";

const HISTORY_LIMIT = 30;

export function MobileWhiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<MobileTool>("pan");
  const [penColor, setPenColor] = useState("#1a1a1a");
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
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
      const width = Math.max(container.clientWidth, window.innerWidth);
      const height = Math.max(container.clientHeight, window.innerHeight - 180);
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
    return () => { clearTimeout(timer); fabricRef.current?.dispose(); fabricRef.current = null; };
  }, []);

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

  // --- Update brush (no canvas recreation) ---
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

    canvas.isDrawingMode = activeTool === "pen";
    if (activeTool === "pen" && canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = penColor;
      canvas.freeDrawingBrush.width = strokeSizes[strokeIndex];
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

    return () => { canvas.off('mouse:down', handleEraserClick); };
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

  const handleToolClick = (tool: MobileTool) => {
    setActiveTool(tool);
    const canvas = fabricRef.current;
    if (!canvas) return;

    const cx = canvas.width! / 2;
    const cy = canvas.height! / 2;

    if (tool === "rectangle") {
      const rect = new Rect({ left: cx - 75, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: strokeSizes[strokeIndex], width: 150, height: 100, rx: 8, ry: 8 });
      canvas.add(rect); canvas.setActiveObject(rect); canvas.renderAll(); setActiveTool("pan");
    } else if (tool === "circle") {
      const circle = new Circle({ left: cx - 50, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: strokeSizes[strokeIndex], radius: 50 });
      canvas.add(circle); canvas.setActiveObject(circle); canvas.renderAll(); setActiveTool("pan");
    } else if (tool === "triangle") {
      const tri = new Triangle({ left: cx - 50, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: strokeSizes[strokeIndex], width: 100, height: 100 });
      canvas.add(tri); canvas.setActiveObject(tri); canvas.renderAll(); setActiveTool("pan");
    } else if (tool === "star") {
      const pts = [];
      for (let i = 0; i < 10; i++) { const r = i % 2 === 0 ? 50 : 25; const a = (i * Math.PI) / 5 - Math.PI / 2; pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) }); }
      const star = new Polygon(pts, { left: cx - 50, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: strokeSizes[strokeIndex] });
      canvas.add(star); canvas.setActiveObject(star); canvas.renderAll(); setActiveTool("pan");
    } else if (tool === "polygon") {
      const pts = [];
      for (let i = 0; i < 6; i++) { const a = (i * 2 * Math.PI) / 6 - Math.PI / 2; pts.push({ x: 50 * Math.cos(a), y: 50 * Math.sin(a) }); }
      const hex = new Polygon(pts, { left: cx - 50, top: cy - 50, fill: "transparent", stroke: penColor, strokeWidth: strokeSizes[strokeIndex] });
      canvas.add(hex); canvas.setActiveObject(hex); canvas.renderAll(); setActiveTool("pan");
    } else if (tool === "text") {
      const text = new FabricText("Tap to edit", { left: cx - 80, top: cy, fill: penColor, fontSize: 22, fontFamily: 'Inter, Arial, sans-serif' });
      canvas.add(text); canvas.setActiveObject(text); canvas.renderAll(); setActiveTool("pan");
    } else if (tool === "sticky") {
      const color = stickyColors[Math.floor(Math.random() * stickyColors.length)];
      const rotation = (Math.random() - 0.5) * 6;
      const bg = new Rect({ left: 0, top: 0, fill: color, width: 180, height: 180, stroke: '#e0ddd5', strokeWidth: 1, shadow: new Shadow({ color: 'rgba(0,0,0,0.08)', blur: 10, offsetY: 4 }), rx: 6, ry: 6 });
      const txt = new FabricText("Note...", { left: 12, top: 12, fill: "#444", fontSize: 14, fontFamily: 'Inter, Arial, sans-serif', width: 156 });
      const group = new Group([bg, txt], { left: cx - 90, top: cy - 90, angle: rotation, subTargetCheck: true });
      canvas.add(group); canvas.setActiveObject(group); canvas.renderAll(); setActiveTool("pan");
    }
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
    const dataURL = canvas.toDataURL({ multiplier: 1, format: 'png', quality: 1 });
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

  const primaryTools: { tool: MobileTool; icon: any; label: string }[] = [
    { tool: "pan", icon: Hand, label: "Pan" },
    { tool: "pen", icon: Pen, label: "Draw" },
    { tool: "eraser", icon: Eraser, label: "Erase" },
    { tool: "rectangle", icon: Square, label: "Box" },
    { tool: "circle", icon: CircleIcon, label: "Circle" },
    { tool: "text", icon: Type, label: "Text" },
    { tool: "sticky", icon: StickyNote, label: "Sticky" },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-[#FAFAF8]">
      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden touch-none" style={{ minHeight: 'calc(100vh - 160px)' }}>
        <canvas ref={canvasRef} className="block" />
      </div>

      {/* Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 whiteboard-mobile-toolbar">
        <div className="px-3 py-2 space-y-2">
          {/* Main tools row */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {primaryTools.map(({ tool, icon: Icon }) => (
              <Button
                key={tool}
                variant={activeTool === tool ? "default" : "ghost"}
                size="icon"
                onClick={() => tool === "pen" || tool === "pan" || tool === "eraser" ? setActiveTool(tool) : handleToolClick(tool)}
                className={cn("flex-shrink-0 h-11 w-11 rounded-xl transition-all", activeTool === tool && "shadow-md")}
              >
                <Icon className="h-5 w-5" />
              </Button>
            ))}

            {/* More shapes */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="flex-shrink-0 h-11 w-11 rounded-xl">
                  <Star className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto rounded-t-3xl">
                <SheetHeader><SheetTitle>More Shapes</SheetTitle></SheetHeader>
                <div className="flex gap-3 mt-4 justify-center pb-4">
                  {([
                    ["triangle", TriangleIcon, "Triangle"],
                    ["star", Star, "Star"],
                    ["polygon", Hexagon, "Hexagon"],
                  ] as [MobileTool, any, string][]).map(([t, I, l]) => (
                    <Button key={t} variant="outline" className="flex-col h-16 w-16 rounded-xl" onClick={() => handleToolClick(t)}>
                      <I className="h-5 w-5" />
                      <span className="text-[10px] mt-1">{l}</span>
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>

            {/* Separator */}
            <div className="w-px h-8 bg-border flex-shrink-0" />

            {/* Undo */}
            <Button variant="ghost" size="icon" onClick={handleUndo} disabled={!canUndo} className="flex-shrink-0 h-11 w-11 rounded-xl">
              <Undo2 className="h-5 w-5" />
            </Button>

            {/* Stroke size toggle */}
            {activeTool === "pen" && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setStrokeIndex((strokeIndex + 1) % 3)}
                className="flex-shrink-0 h-11 w-11 rounded-xl font-bold text-sm"
              >
                {strokeLabels[strokeIndex]}
              </Button>
            )}

            {/* Menu */}
            <Sheet open={showMenu} onOpenChange={setShowMenu}>
              <SheetTrigger asChild>
                <Button size="icon" variant="ghost" className="flex-shrink-0 h-11 w-11 rounded-xl">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto rounded-t-3xl">
                <SheetHeader><SheetTitle>Whiteboard</SheetTitle></SheetHeader>
                <div className="space-y-3 mt-4 pb-4">
                  <Button variant="outline" size="lg" onClick={() => { handleExport(); setShowMenu(false); }} className="w-full h-12 rounded-xl">
                    <Download className="h-5 w-5 mr-2" /> Export as PNG
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => { handleDeleteSelected(); setShowMenu(false); }} className="w-full h-12 rounded-xl">
                    <Trash2 className="h-5 w-5 mr-2" /> Delete Selected
                  </Button>
                  <Button variant="outline" size="lg" onClick={() => { handleClear(); setShowMenu(false); }} className="w-full h-12 rounded-xl">
                    <RotateCcw className="h-5 w-5 mr-2" /> Clear All
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Color picker row (only for drawing tools) */}
          {["pen", "rectangle", "circle", "text", "triangle", "star", "polygon"].includes(activeTool) && (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
              <Palette className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {penColors.map(({ name, value }) => (
                <button
                  key={value}
                  onClick={() => setPenColor(value)}
                  className={cn(
                    "w-9 h-9 rounded-full border-2 flex-shrink-0 transition-all",
                    penColor === value ? "border-foreground scale-110 shadow-md" : "border-border"
                  )}
                  style={{ backgroundColor: value }}
                  title={name}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, Textbox, PencilBrush, Group, Shadow, Triangle, Polygon, Line } from "fabric";
import { Button } from "@/components/ui/button";
import { 
  Pen, Square, Circle as CircleIcon, Type, StickyNote, Hand, 
  Trash2, Undo2, Star, Hexagon, Triangle as TriangleIcon, Eraser,
  Download, RotateCcw, MoreHorizontal, Minus, ArrowRight, Highlighter,
  ArrowLeftRight, Diamond, Pentagon, Octagon, Plus, MessageSquare,
  Copy, AlignLeft, AlignCenter, AlignRight, ChevronUp, ChevronDown
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

const fillColors = [
  { name: "None", value: "transparent" },
  { name: "White", value: "#FFFFFF" },
  { name: "Red", value: "#FFCDD2" },
  { name: "Blue", value: "#BBDEFB" },
  { name: "Green", value: "#C8E6C9" },
  { name: "Yellow", value: "#FFF9C4" },
];

const stickyColors = ["#FFF4A3", "#FFE4A3", "#FFD4A3", "#C4E4FF", "#D4F4DD", "#FFE4F4"];
const strokeSizes = [2, 5, 10];
const strokeLabels = ["S", "M", "L"];

type MobileTool = "pan" | "pen" | "eraser" | "rectangle" | "circle" | "triangle" | "star" | "polygon" | "text" | "sticky" | "highlighter" | "line" | "arrow" | "diamond" | "pentagon" | "octagon" | "cross" | "doubleArrow" | "speechBubble";
type ColorTarget = "stroke" | "fill";

const HISTORY_LIMIT = 30;
const TOOLBAR_HEIGHT = 130;

export function MobileWhiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<MobileTool>("pen");
  const [penColor, setPenColor] = useState("#1a1a1a");
  const [fillColor, setFillColor] = useState("transparent");
  const [colorTarget, setColorTarget] = useState<ColorTarget>("stroke");
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Undo
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isRestoringRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);

  // Clipboard
  const clipboardRef = useRef<any[]>([]);

  // Pinch zoom
  const lastTouchDistRef = useRef<number | null>(null);
  const isPanningRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // --- Canvas init ---
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

  // Resize
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

    const handleTextTap = (e: any) => {
      if (activeTool !== "text" && activeTool !== "sticky") return;
      if (e.target) return;

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
    const strokeWidth = strokeSizes[strokeIndex];
    const baseProps = { fill: fillColor, stroke: penColor, strokeWidth };

    if (tool === "rectangle") {
      const rect = new Rect({ left: cx - 75, top: cy - 50, ...baseProps, width: 150, height: 100, rx: 8, ry: 8 });
      canvas.add(rect); canvas.setActiveObject(rect);
    } else if (tool === "circle") {
      const circle = new Circle({ left: cx - 50, top: cy - 50, ...baseProps, radius: 50 });
      canvas.add(circle); canvas.setActiveObject(circle);
    } else if (tool === "triangle") {
      const tri = new Triangle({ left: cx - 50, top: cy - 50, ...baseProps, width: 100, height: 100 });
      canvas.add(tri); canvas.setActiveObject(tri);
    } else if (tool === "star") {
      const pts = [];
      for (let i = 0; i < 10; i++) { const r = i % 2 === 0 ? 50 : 25; const a = (i * Math.PI) / 5 - Math.PI / 2; pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) }); }
      const star = new Polygon(pts, { left: cx - 50, top: cy - 50, ...baseProps });
      canvas.add(star); canvas.setActiveObject(star);
    } else if (tool === "polygon") {
      const pts = [];
      for (let i = 0; i < 6; i++) { const a = (i * 2 * Math.PI) / 6 - Math.PI / 2; pts.push({ x: 50 * Math.cos(a), y: 50 * Math.sin(a) }); }
      const hex = new Polygon(pts, { left: cx - 50, top: cy - 50, ...baseProps });
      canvas.add(hex); canvas.setActiveObject(hex);
    } else if (tool === "diamond") {
      const pts = [{ x: 0, y: -50 }, { x: 50, y: 0 }, { x: 0, y: 50 }, { x: -50, y: 0 }];
      const diamond = new Polygon(pts, { left: cx - 50, top: cy - 50, ...baseProps });
      canvas.add(diamond); canvas.setActiveObject(diamond);
    } else if (tool === "pentagon") {
      const pts = Array.from({ length: 5 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        return { x: 50 * Math.cos(a), y: 50 * Math.sin(a) };
      });
      const pent = new Polygon(pts, { left: cx - 50, top: cy - 50, ...baseProps });
      canvas.add(pent); canvas.setActiveObject(pent);
    } else if (tool === "octagon") {
      const pts = Array.from({ length: 8 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 8 - Math.PI / 8;
        return { x: 45 * Math.cos(a), y: 45 * Math.sin(a) };
      });
      const oct = new Polygon(pts, { left: cx - 45, top: cy - 45, ...baseProps });
      canvas.add(oct); canvas.setActiveObject(oct);
    } else if (tool === "cross") {
      const s = 40, t = 12;
      const pts = [
        { x: -t, y: -s }, { x: t, y: -s }, { x: t, y: -t },
        { x: s, y: -t }, { x: s, y: t }, { x: t, y: t },
        { x: t, y: s }, { x: -t, y: s }, { x: -t, y: t },
        { x: -s, y: t }, { x: -s, y: -t }, { x: -t, y: -t }
      ];
      const cross = new Polygon(pts, { left: cx - s, top: cy - s, ...baseProps });
      canvas.add(cross); canvas.setActiveObject(cross);
    } else if (tool === "line") {
      const line = new Line([0, 0, 100, 0], { left: cx - 50, top: cy, stroke: penColor, strokeWidth });
      canvas.add(line); canvas.setActiveObject(line);
    } else if (tool === "arrow") {
      const arrowLine = new Line([0, 0, 80, 0], { stroke: penColor, strokeWidth });
      const arrowHead = new Triangle({ left: 80, top: -strokeWidth*1.5, width: 12, height: 12, fill: penColor, angle: 90 });
      const arrow = new Group([arrowLine, arrowHead], { left: cx - 50, top: cy });
      canvas.add(arrow); canvas.setActiveObject(arrow);
    } else if (tool === "doubleArrow") {
      const arrowLine = new Line([14, 0, 86, 0], { stroke: penColor, strokeWidth });
      const headLeft = new Triangle({ left: 0, top: -strokeWidth*1.5, width: 12, height: 12, fill: penColor, angle: -90 });
      const headRight = new Triangle({ left: 86, top: -strokeWidth*1.5, width: 12, height: 12, fill: penColor, angle: 90 });
      const arrow = new Group([arrowLine, headLeft, headRight], { left: cx - 50, top: cy });
      canvas.add(arrow); canvas.setActiveObject(arrow);
    } else if (tool === "speechBubble") {
      const bg = new Rect({ left: 0, top: 0, fill: fillColor === "transparent" ? "#FFFFFF" : fillColor, width: 120, height: 60, stroke: penColor, strokeWidth, rx: 10, ry: 10 });
      const pointer = new Triangle({ left: 15, top: 55, width: 15, height: 15, fill: fillColor === "transparent" ? "#FFFFFF" : fillColor, stroke: penColor, strokeWidth: strokeWidth / 2, angle: 180 });
      const bubble = new Group([bg, pointer], { left: cx - 60, top: cy - 40 });
      canvas.add(bubble); canvas.setActiveObject(bubble);
    }
    canvas.renderAll();
  };

  const handleDuplicate = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length === 0) { toast.error("Select an object first"); return; }
    
    active.forEach(obj => {
      obj.clone().then((cloned: any) => {
        cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
      });
    });
    canvas.renderAll();
    toast.success("Duplicated");
  }, []);

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

  const handleAlignLeft = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    if (objects.length < 2) { toast.error("Select 2+ objects"); return; }
    const rects = objects.map(o => o.getBoundingRect());
    const minLeft = Math.min(...rects.map(r => r.left));
    objects.forEach((obj, i) => {
      const diff = minLeft - rects[i].left;
      obj.set({ left: (obj.left ?? 0) + diff });
      obj.setCoords();
    });
    canvas.renderAll();
    saveHistory(canvas);
    toast.success("Aligned left");
  }, [saveHistory]);

  const handleAlignCenter = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    if (objects.length < 2) { toast.error("Select 2+ objects"); return; }
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
    toast.success("Aligned center");
  }, [saveHistory]);

  const handleAlignRight = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getActiveObjects();
    if (objects.length < 2) { toast.error("Select 2+ objects"); return; }
    const rects = objects.map(o => o.getBoundingRect());
    const maxRight = Math.max(...rects.map(r => r.left + r.width));
    objects.forEach((obj, i) => {
      const diff = maxRight - (rects[i].left + rects[i].width);
      obj.set({ left: (obj.left ?? 0) + diff });
      obj.setCoords();
    });
    canvas.renderAll();
    saveHistory(canvas);
    toast.success("Aligned right");
  }, [saveHistory]);

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

  const currentColors = colorTarget === "stroke" ? penColors : fillColors;
  const currentColor = colorTarget === "stroke" ? penColor : fillColor;
  const setCurrentColor = colorTarget === "stroke" ? setPenColor : setFillColor;

  const isDrawTool = ["pen", "highlighter", "rectangle", "circle", "text", "triangle", "star", "polygon", "line", "arrow", "diamond", "pentagon", "octagon", "cross", "doubleArrow", "speechBubble"].includes(activeTool);

  const shapes: [MobileTool, any, string][] = [
    ["rectangle", Square, "Rect"],
    ["circle", CircleIcon, "Circle"],
    ["triangle", TriangleIcon, "Tri"],
    ["star", Star, "Star"],
    ["polygon", Hexagon, "Hex"],
    ["diamond", Diamond, "Diamond"],
    ["pentagon", Pentagon, "Pent"],
    ["octagon", Octagon, "Oct"],
    ["cross", Plus, "Cross"],
    ["line", Minus, "Line"],
    ["arrow", ArrowRight, "Arrow"],
    ["doubleArrow", ArrowLeftRight, "↔ Arrow"],
    ["speechBubble", MessageSquare, "Bubble"],
  ];

  return (
    <div className="h-full w-full flex flex-col bg-[#FAFAF8] relative">
      {/* Canvas area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ touchAction: activeTool === "pan" ? "none" : "auto" }}
      >
        <canvas ref={canvasRef} className="block" />
      </div>

      {/* Toolbar */}
      <div className="relative z-40 whiteboard-mobile-toolbar safe-area-bottom">
        {/* Color row */}
        {isDrawTool && (
          <div className="flex items-center gap-2 px-3 pt-2 pb-1 overflow-x-auto">
            {/* Stroke/Fill toggle */}
            <button
              onClick={() => setColorTarget(t => t === "stroke" ? "fill" : "stroke")}
              className={cn(
                "w-9 h-9 rounded-lg border-2 flex-shrink-0 text-[10px] font-bold flex items-center justify-center transition-all",
                colorTarget === "stroke" ? "border-foreground bg-background" : "border-muted bg-muted/30"
              )}
              style={{ 
                background: colorTarget === "stroke" 
                  ? `linear-gradient(135deg, ${penColor} 50%, transparent 50%)` 
                  : fillColor === "transparent" 
                    ? "repeating-conic-gradient(#ccc 0 25%, transparent 0 50%)" 
                    : fillColor
              }}
            >
              <span className="bg-background/80 px-1 rounded text-[9px]">
                {colorTarget === "stroke" ? "S" : "F"}
              </span>
            </button>
            
            <div className="w-px h-6 bg-border flex-shrink-0" />
            
            {currentColors.map(({ name, value }) => (
              <button
                key={value}
                onClick={() => setCurrentColor(value)}
                className={cn(
                  "w-8 h-8 rounded-full border-2 flex-shrink-0 transition-transform active:scale-90",
                  currentColor === value ? "border-foreground scale-110 ring-2 ring-primary/30" : "border-muted",
                  value === "transparent" && "bg-[repeating-conic-gradient(#ccc_0_25%,transparent_0_50%)] bg-[length:6px_6px]"
                )}
                style={{ backgroundColor: value === "transparent" ? undefined : value }}
                aria-label={name}
              />
            ))}
            
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
            ["highlighter", Highlighter, "Highlight"],
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
              <div className="grid grid-cols-4 gap-1">
                {shapes.map(([t, I, l]) => (
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
            <PopoverContent side="top" className="w-48 p-2" align="end">
              <div className="space-y-1">
                <Button variant="ghost" size="sm" onClick={handleDuplicate} className="w-full justify-start gap-2 h-9 text-xs">
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </Button>
                <Button variant="ghost" size="sm" onClick={handleBringForward} className="w-full justify-start gap-2 h-9 text-xs">
                  <ChevronUp className="h-3.5 w-3.5" /> Bring Forward
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSendBackward} className="w-full justify-start gap-2 h-9 text-xs">
                  <ChevronDown className="h-3.5 w-3.5" /> Send Backward
                </Button>
                <div className="border-t my-1" />
                <Button variant="ghost" size="sm" onClick={handleAlignLeft} className="w-full justify-start gap-2 h-9 text-xs">
                  <AlignLeft className="h-3.5 w-3.5" /> Align Left
                </Button>
                <Button variant="ghost" size="sm" onClick={handleAlignCenter} className="w-full justify-start gap-2 h-9 text-xs">
                  <AlignCenter className="h-3.5 w-3.5" /> Align Center
                </Button>
                <Button variant="ghost" size="sm" onClick={handleAlignRight} className="w-full justify-start gap-2 h-9 text-xs">
                  <AlignRight className="h-3.5 w-3.5" /> Align Right
                </Button>
                <div className="border-t my-1" />
                <Button variant="ghost" size="sm" onClick={handleExport} className="w-full justify-start gap-2 h-9 text-xs">
                  <Download className="h-3.5 w-3.5" /> Export PNG
                </Button>
                <Button variant="ghost" size="sm" onClick={handleClear} className="w-full justify-start gap-2 h-9 text-xs text-destructive">
                  <RotateCcw className="h-3.5 w-3.5" /> Clear All
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, FabricText, Path } from "fabric";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Pen, 
  Square, 
  Circle as CircleIcon, 
  Type, 
  Move, 
  Trash2, 
  Download,
  Plus,
  Palette
} from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";

interface InfiniteWhiteboardProps {
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
}

type Tool = "select" | "draw" | "rectangle" | "circle" | "text";

const colors = [
  "#000000", "#ff0000", "#00ff00", "#0000ff", 
  "#ffff00", "#ff00ff", "#00ffff", "#ffa500"
];

export const InfiniteWhiteboard = ({ onCreateCard }: InfiniteWhiteboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activeColor, setActiveColor] = useState("#000000");
  const [isDrawing, setIsDrawing] = useState(false);
  const isPanningRef = useRef(false);
  const spacePressedRef = useRef(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const STORAGE_KEY = "whiteboard:state:v1";

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Get dimensions from container
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor: "#ffffff",
      selection: true,
    });

    // Properly initialize the free drawing brush
    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = 2;
    
    // Enable drawing mode initially if draw tool is selected
    canvas.isDrawingMode = activeTool === "draw";

    setFabricCanvas(canvas);
    toast("Whiteboard ready!");

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    // Set drawing mode and brush properties
    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    // Always ensure brush exists and configure it
    if (fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = 3;
    }
    
    // Update cursor based on tool
    if (activeTool === "draw") {
      fabricCanvas.setCursor("crosshair");
    } else {
      fabricCanvas.setCursor("default");
    }
  }, [activeTool, activeColor, fabricCanvas]);

  // Persistence, pan/zoom, and responsive sizing
  useEffect(() => {
    if (!fabricCanvas) return;

    // Attempt to restore previous session
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { json: any; vt?: number[] };
        fabricCanvas.loadFromJSON(parsed.json, () => {
          if (parsed.vt && Array.isArray(parsed.vt)) {
            fabricCanvas.setViewportTransform(parsed.vt as any);
          }
          fabricCanvas.renderAll();
          toast("Whiteboard restored");
        });
      }
    } catch (e) {
      // ignore corrupted state
    }

    // Debounced saver
    const saveState = () => {
      const state = {
        json: fabricCanvas.toJSON(),
        vt: fabricCanvas.viewportTransform,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    };
    const debouncedSave = () => {
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = window.setTimeout(saveState, 500) as unknown as number;
    };

    // Save on object changes
    const objectEvents = ["object:added", "object:modified", "object:removed", "path:created"] as const;
    objectEvents.forEach((ev) => fabricCanvas.on(ev as any, debouncedSave));

    // Pan with Space + drag
    const onMouseDown = (opt: any) => {
      if (spacePressedRef.current) {
        isPanningRef.current = true;
        fabricCanvas.setCursor("grab");
      }
    };
    const onMouseMove = (opt: any) => {
      if (isPanningRef.current && opt?.e) {
        const vpt = fabricCanvas.viewportTransform;
        if (!vpt) return;
        vpt[4] += opt.e.movementX;
        vpt[5] += opt.e.movementY;
        fabricCanvas.requestRenderAll();
      }
    };
    const onMouseUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        fabricCanvas.setCursor("default");
        debouncedSave();
      }
    };
    fabricCanvas.on("mouse:down", onMouseDown);
    fabricCanvas.on("mouse:move", onMouseMove);
    fabricCanvas.on("mouse:up", onMouseUp);

    // Zoom with mouse wheel
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY;
      let zoom = (fabricCanvas.getZoom?.() as number) ?? (fabricCanvas.viewportTransform?.[0] ?? 1);
      zoom *= Math.pow(0.999, delta);
      zoom = Math.min(4, Math.max(0.2, zoom));
      const point = { x: e.offsetX, y: e.offsetY } as any;
      (fabricCanvas as any).zoomToPoint(point, zoom);
      debouncedSave();
    };
    const canvasEl = canvasRef.current;
    canvasEl?.addEventListener("wheel", handleWheel, { passive: false });

    // Keyboard handlers for Space
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") spacePressedRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        isPanningRef.current = false;
        fabricCanvas.setCursor("default");
        fabricCanvas.requestRenderAll();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    // ResizeObserver to keep canvas sized to visible container
    if (containerRef.current) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          fabricCanvas.setDimensions({ width: cr.width, height: cr.height } as any);
          fabricCanvas.renderAll();
        }
      });
      ro.observe(containerRef.current);
      resizeObserverRef.current = ro;
    }

    return () => {
      objectEvents.forEach((ev) => fabricCanvas.off(ev as any, debouncedSave));
      fabricCanvas.off("mouse:down", onMouseDown);
      fabricCanvas.off("mouse:move", onMouseMove);
      fabricCanvas.off("mouse:up", onMouseUp);
      if (canvasEl) canvasEl.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      resizeObserverRef.current?.disconnect();
    };
  }, [fabricCanvas]);

  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool);

    if (!fabricCanvas) return;

    if (tool === "rectangle") {
      const rect = new Rect({
        left: 100,
        top: 100,
        fill: activeColor,
        width: 100,
        height: 100,
        stroke: activeColor,
        strokeWidth: 2,
      });
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
    } else if (tool === "circle") {
      const circle = new Circle({
        left: 100,
        top: 100,
        fill: "transparent",
        radius: 50,
        stroke: activeColor,
        strokeWidth: 2,
      });
      fabricCanvas.add(circle);
      fabricCanvas.setActiveObject(circle);
    } else if (tool === "text") {
      const text = new FabricText("Double click to edit", {
        left: 100,
        top: 100,
        fill: activeColor,
        fontSize: 20,
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#ffffff";
    fabricCanvas.renderAll();
    toast("Whiteboard cleared!");
  };

  const handleExport = () => {
    if (!fabricCanvas) return;
    
    const dataURL = fabricCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
    });
    
    const link = document.createElement("a");
    link.download = "whiteboard.png";
    link.href = dataURL;
    link.click();
    
    toast("Whiteboard exported!");
  };

  const handleCreateCard = () => {
    if (!fabricCanvas) return;

    const dataURL = fabricCanvas.toDataURL({
      format: "png",
      quality: 0.8,
      multiplier: 1,
    });

    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: `Whiteboard Sketch - ${new Date().toLocaleDateString()}`,
      content: "Visual notes and sketches from infinite whiteboard",
      description: "Created from whiteboard session",
      category: "700", // Arts category
      number: "",
      tags: ["whiteboard", "visual", "sketch"],
      linkedCards: [],
      imageUrl: dataURL
    };

    onCreateCard(newCard);
    toast("Created zettel card from whiteboard!");
  };

  const tools = [
    { tool: "select" as const, label: "Select", icon: Move },
    { tool: "draw" as const, label: "Draw", icon: Pen },
    { tool: "rectangle" as const, label: "Rectangle", icon: Square },
    { tool: "circle" as const, label: "Circle", icon: CircleIcon },
    { tool: "text" as const, label: "Text", icon: Type },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Infinite Whiteboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {tools.map(({ tool, label, icon: Icon }) => (
              <Button
                key={tool}
                variant={activeTool === tool ? "default" : "outline"}
                size="sm"
                onClick={() => handleToolClick(tool)}
              >
                <Icon className="h-4 w-4 mr-1" />
                {label}
              </Button>
            ))}
            
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm">Color:</span>
              <div className="flex gap-1">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 ${
                      activeColor === color ? "border-primary" : "border-border"
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setActiveColor(color)}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleCreateCard}>
                <Plus className="h-4 w-4 mr-1" />
                Create Card
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
          
          <div ref={containerRef} className="border rounded-lg overflow-hidden bg-background h-[70vh]">
            <canvas 
              ref={canvasRef} 
              className="block w-full h-full"
              style={{ cursor: activeTool === "draw" ? "crosshair" : "default" }}
            />
          </div>
          
          <p className="text-sm text-muted-foreground mt-2">
            Use the tools above to draw, add shapes, and create visual notes. 
            Convert your work to zettel cards for permanent storage.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
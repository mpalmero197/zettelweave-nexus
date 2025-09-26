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
      // Enhanced mobile settings
      allowTouchScrolling: false,
      stopContextMenu: true,
    });

    // Enhanced brush initialization with mobile-specific settings
    try {
      canvas.freeDrawingBrush.color = activeColor;
      canvas.freeDrawingBrush.width = window.innerWidth < 768 ? 4 : 2; // Thicker brush on mobile
    } catch (error) {
      console.warn('Brush initialization warning:', error);
      // Fallback initialization
      setTimeout(() => {
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = activeColor;
          canvas.freeDrawingBrush.width = window.innerWidth < 768 ? 4 : 2;
        }
      }, 100);
    }
    
    // Enable drawing mode initially if draw tool is selected
    canvas.isDrawingMode = activeTool === "draw";

    setFabricCanvas(canvas);
    toast("Whiteboard ready!");

    return () => {
      try {
        canvas.dispose();
      } catch (error) {
        console.warn('Canvas dispose warning:', error);
      }
    };
  }, [activeColor, activeTool]);

  useEffect(() => {
    if (!fabricCanvas) return;

    // Robust tool and brush configuration with mobile optimizations
    try {
      const isMobile = window.innerWidth < 768;
      fabricCanvas.isDrawingMode = activeTool === "draw";
      
      // Always ensure brush exists and configure it
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = activeColor;
        fabricCanvas.freeDrawingBrush.width = isMobile ? 4 : 3; // Thicker on mobile
        
        // Mobile-specific brush settings
        if (isMobile) {
          fabricCanvas.freeDrawingBrush.strokeLineCap = 'round';
          fabricCanvas.freeDrawingBrush.strokeLineJoin = 'round';
        }
      } else {
        // Force brush creation if it doesn't exist
        fabricCanvas.isDrawingMode = true;
        if (fabricCanvas.freeDrawingBrush) {
          fabricCanvas.freeDrawingBrush.color = activeColor;
          fabricCanvas.freeDrawingBrush.width = isMobile ? 4 : 3;
        }
        fabricCanvas.isDrawingMode = activeTool === "draw";
      }
      
      // Update cursor based on tool
      if (activeTool === "draw") {
        fabricCanvas.setCursor("crosshair");
      } else {
        fabricCanvas.setCursor("default");
      }
    } catch (error) {
      console.warn('Tool configuration warning:', error);
      toast("Drawing tool may not be fully initialized. Try switching tools.");
    }
  }, [activeTool, activeColor, fabricCanvas]);

  // Enhanced mobile-friendly persistence, pan/zoom, and responsive sizing
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

    // Enhanced mobile touch handling - prioritize drawing over panning on mobile
    let lastPanPoint: { x: number; y: number } | null = null;
    let initialPinchDistance: number | null = null;
    let touchStartTime: number = 0;

    const getEventPoint = (e: any) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX || e.e?.clientX || 0, y: e.clientY || e.e?.clientY || 0 };
    };

    const isMobile = () => window.innerWidth < 768;

    const onPointerDown = (opt: any) => {
      touchStartTime = Date.now();
      const point = getEventPoint(opt.e || opt);
      
      // On mobile, only pan with two fingers or if explicitly in select mode and no object
      // For desktop, allow space key panning
      const shouldPan = (!isMobile() && spacePressedRef.current) || 
                       (opt.e?.touches && opt.e.touches.length === 2) ||
                       (activeTool === "select" && !fabricCanvas.getActiveObject() && isMobile());
      
      if (shouldPan) {
        isPanningRef.current = true;
        lastPanPoint = point;
        fabricCanvas.setCursor("grab");
        opt.e?.preventDefault?.();
      }
    };

    const onPointerMove = (opt: any) => {
      if (isPanningRef.current && lastPanPoint) {
        const point = getEventPoint(opt.e || opt);
        const vpt = fabricCanvas.viewportTransform;
        if (!vpt) return;
        
        const deltaX = point.x - lastPanPoint.x;
        const deltaY = point.y - lastPanPoint.y;
        
        vpt[4] += deltaX;
        vpt[5] += deltaY;
        lastPanPoint = point;
        fabricCanvas.requestRenderAll();
        opt.e?.preventDefault?.();
      }
    };

    const onPointerUp = () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        lastPanPoint = null;
        fabricCanvas.setCursor("default");
        debouncedSave();
      }
      touchStartTime = 0;
    };

    // Bind enhanced events
    fabricCanvas.on("mouse:down", onPointerDown);
    fabricCanvas.on("mouse:move", onPointerMove);
    fabricCanvas.on("mouse:up", onPointerUp);

    // Touch-specific events for better mobile support
    const canvasEl = canvasRef.current;
    if (canvasEl) {
      const onTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          initialPinchDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
          );
          onPointerDown({ e });
        }
      };

      const onTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          e.preventDefault();
          
          // Handle pinch zoom
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const currentDistance = Math.sqrt(
            Math.pow(touch2.clientX - touch1.clientX, 2) + 
            Math.pow(touch2.clientY - touch1.clientY, 2)
          );
          
          if (initialPinchDistance) {
            const scale = currentDistance / initialPinchDistance;
            const rect = canvasEl.getBoundingClientRect();
            const point = {
              x: ((touch1.clientX + touch2.clientX) / 2) - rect.left,
              y: ((touch1.clientY + touch2.clientY) / 2) - rect.top
            };
            
            let zoom = (fabricCanvas.getZoom?.() as number) ?? 1;
            zoom = Math.min(4, Math.max(0.2, zoom * scale));
            (fabricCanvas as any).zoomToPoint(point, zoom);
            
            initialPinchDistance = currentDistance;
            debouncedSave();
          }
          
          // Handle pan if panning is active
          if (isPanningRef.current) {
            onPointerMove({ e });
          }
        }
      };

      const onTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) {
          initialPinchDistance = null;
          onPointerUp();
        }
      };

      canvasEl.addEventListener("touchstart", onTouchStart, { passive: false });
      canvasEl.addEventListener("touchmove", onTouchMove, { passive: false });
      canvasEl.addEventListener("touchend", onTouchEnd);

      // Enhanced zoom handling for mouse wheel
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

      canvasEl.addEventListener("wheel", handleWheel, { passive: false });

      // Cleanup function for canvas-specific events
      var canvasCleanup = () => {
        canvasEl.removeEventListener("touchstart", onTouchStart);
        canvasEl.removeEventListener("touchmove", onTouchMove);
        canvasEl.removeEventListener("touchend", onTouchEnd);
        canvasEl.removeEventListener("wheel", handleWheel);
      };
    }

    // Keyboard handlers for desktop space key panning
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        spacePressedRef.current = true;
        e.preventDefault();
      }
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

    // Enhanced ResizeObserver with better error handling
    if (containerRef.current) {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          try {
            // Check if canvas is still valid before setting dimensions
            if (fabricCanvas && fabricCanvas.getElement && fabricCanvas.getElement()) {
              fabricCanvas.setDimensions({ width: cr.width, height: cr.height } as any);
              fabricCanvas.renderAll();
            }
          } catch (error) {
            console.warn('ResizeObserver dimension setting failed:', error);
          }
        }
      });
      ro.observe(containerRef.current);
      resizeObserverRef.current = ro;
    }

    return () => {
      objectEvents.forEach((ev) => fabricCanvas.off(ev as any, debouncedSave));
      fabricCanvas.off("mouse:down", onPointerDown);
      fabricCanvas.off("mouse:move", onPointerMove);
      fabricCanvas.off("mouse:up", onPointerUp);
      
      if (canvasCleanup) canvasCleanup();
      
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      resizeObserverRef.current?.disconnect();
    };
  }, [fabricCanvas, activeTool]);

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
          {/* Mobile-first toolbar */}
          <div className="space-y-4 mb-4">
            {/* Tools row */}
            <div className="flex flex-wrap gap-2">
              {tools.map(({ tool, label, icon: Icon }) => (
                <Button
                  key={tool}
                  variant={activeTool === tool ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolClick(tool)}
                  className="flex-1 sm:flex-none min-w-0"
                >
                  <Icon className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline ml-1">{label}</span>
                </Button>
              ))}
            </div>
            
            {/* Color and actions row */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm whitespace-nowrap">Color:</span>
                <div className="flex gap-1 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color}
                      className={`w-8 h-8 sm:w-6 sm:h-6 rounded border-2 touch-manipulation ${
                        activeColor === color ? "border-primary" : "border-border"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setActiveColor(color)}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap sm:ml-auto w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCreateCard}
                  className="flex-1 sm:flex-none"
                >
                  <Plus className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline ml-1">Create Card</span>
                  <span className="sm:hidden">Card</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExport}
                  className="flex-1 sm:flex-none"
                >
                  <Download className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline ml-1">Export</span>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleClear}
                  className="flex-1 sm:flex-none"
                >
                  <Trash2 className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline ml-1">Clear</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Canvas container with mobile-optimized dimensions */}
          <div 
            ref={containerRef} 
            className="border rounded-lg overflow-hidden bg-background"
            style={{ 
              height: typeof window !== 'undefined' && window.innerWidth < 768 ? '60vh' : '70vh',
              touchAction: 'none' // Prevent default touch behaviors
            }}
          >
            <canvas 
              ref={canvasRef} 
              className="block w-full h-full"
              style={{ 
                cursor: activeTool === "draw" ? "crosshair" : "default",
                touchAction: 'none'
              }}
            />
          </div>
          
          <div className="text-sm text-muted-foreground mt-2 space-y-1">
            <p>Use tools to draw, add shapes, and create visual notes.</p>
            <p className="text-xs">
              <span className="hidden sm:inline">Desktop: Space + drag to pan, scroll to zoom. </span>
              <span className="sm:hidden">Mobile: Two fingers to pan/zoom. </span>
              Convert your work to zettel cards for permanent storage.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InfiniteWhiteboard;

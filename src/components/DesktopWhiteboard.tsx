import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, FabricText, Line, Path, PencilBrush, Shadow, Polygon, Triangle, Group, ActiveSelection, FabricObject, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { 
  MousePointer2,
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle as CircleIcon,
  Minus,
  ArrowRight,
  Type,
  StickyNote,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Trash2,
  Download,
  Palette,
  Grid3x3,
  Menu,
  Move,
  Group as GroupIcon,
  Ungroup,
  Copy,
  Clipboard,
  CornerUpLeft,
  CornerUpRight,
  Lock,
  Unlock,
  LayersIcon,
  Star,
  Pentagon,
  Hexagon,
  Triangle as TriangleIcon,
  Hand
} from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DesktopWhiteboardProps {
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
}

type Tool = "select" | "pen" | "highlighter" | "eraser" | "rectangle" | "circle" | "line" | "arrow" | "text" | "sticky" | "image" | "pan" | "triangle" | "star" | "polygon";

const penColors = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#E74C3C" },
  { name: "Blue", value: "#3498DB" },
  { name: "Green", value: "#2ECC71" },
  { name: "Yellow", value: "#F1C40F" },
  { name: "Purple", value: "#9B59B6" },
  { name: "Orange", value: "#E67E22" },
  { name: "Pink", value: "#FF69B4" }
];

const stickyColors = [
  "#FFF4A3", "#FFE4A3", "#FFD4A3", 
  "#C4E4FF", "#D4F4DD", "#FFE4F4"
];

export const DesktopWhiteboard = ({ onCreateCard }: DesktopWhiteboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [penColor, setPenColor] = useState("#000000");
  const [penSize, setPenSize] = useState(2);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [clipboard, setClipboard] = useState<FabricObject[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const initCanvas = () => {
      const container = containerRef.current!;
      const width = container.clientWidth || 1200;
      const height = container.clientHeight || 800;

      if (width === 0 || height === 0) {
        setTimeout(initCanvas, 100);
        return;
      }

      const canvas = new FabricCanvas(canvasRef.current, {
        width,
        height,
        backgroundColor: showGrid ? "#F8F9FA" : "#FFFFFF",
        selection: true,
      });

      const brush = new PencilBrush(canvas);
      brush.color = penColor;
      brush.width = penSize;
      brush.shadow = new Shadow({
        blur: 3,
        offsetX: 0,
        offsetY: 0,
        affectStroke: true,
        color: penColor,
      });
      canvas.freeDrawingBrush = brush;

      setFabricCanvas(canvas);
      setIsReady(true);
      toast.success("Desktop whiteboard ready!");
    };

    const timer = setTimeout(initCanvas, 100);
    return () => clearTimeout(timer);
  }, [penColor, penSize, showGrid]);

  // Handle panning separately with proper dependencies
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleMouseDown = (opt: any) => {
      if (activeTool === 'pan') {
        setIsPanning(true);
        fabricCanvas.selection = false;
        const pointer = opt.pointer;
        if (pointer) {
          lastPosRef.current = { x: pointer.x, y: pointer.y };
        }
      }
    };

    const handleMouseMove = (opt: any) => {
      if (activeTool === 'pan' && isPanning && lastPosRef.current) {
        const pointer = opt.pointer;
        if (pointer && fabricCanvas.viewportTransform) {
          fabricCanvas.viewportTransform[4] += pointer.x - lastPosRef.current.x;
          fabricCanvas.viewportTransform[5] += pointer.y - lastPosRef.current.y;
          fabricCanvas.requestRenderAll();
          lastPosRef.current = { x: pointer.x, y: pointer.y };
        }
      }
    };

    const handleMouseUp = () => {
      if (isPanning) {
        setIsPanning(false);
        fabricCanvas.selection = true;
        lastPosRef.current = null;
      }
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);

    return () => {
      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
    };
  }, [fabricCanvas, activeTool, isPanning]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "pen" || activeTool === "highlighter";
    
    if (fabricCanvas.freeDrawingBrush) {
      if (activeTool === "pen") {
        fabricCanvas.freeDrawingBrush.color = penColor;
        fabricCanvas.freeDrawingBrush.width = penSize;
      } else if (activeTool === "highlighter") {
        fabricCanvas.freeDrawingBrush.color = penColor + "80";
        fabricCanvas.freeDrawingBrush.width = penSize * 4;
      }
    }

    // Handle eraser mode - click to delete objects
    const handleObjectClick = (e: any) => {
      if (activeTool === "eraser" && e.target) {
        fabricCanvas.remove(e.target);
        fabricCanvas.renderAll();
        toast.success("Object deleted");
      }
    };

    if (activeTool === "eraser") {
      fabricCanvas.isDrawingMode = false;
      fabricCanvas.on('mouse:down', handleObjectClick);
    }

    return () => {
      fabricCanvas.off('mouse:down', handleObjectClick);
    };
  }, [activeTool, penColor, penSize, fabricCanvas]);

  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;

    if (tool === "rectangle") {
      const rect = new Rect({
        left: fabricCanvas.width! / 2 - 75,
        top: fabricCanvas.height! / 2 - 50,
        fill: "transparent",
        stroke: penColor,
        strokeWidth: penSize,
        width: 150,
        height: 100,
        rx: 8,
        ry: 8,
      });
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
      fabricCanvas.renderAll();
      toast.success("Rectangle added");
    } else if (tool === "circle") {
      const circle = new Circle({
        left: fabricCanvas.width! / 2 - 50,
        top: fabricCanvas.height! / 2 - 50,
        fill: "transparent",
        stroke: penColor,
        strokeWidth: penSize,
        radius: 50,
      });
      fabricCanvas.add(circle);
      fabricCanvas.setActiveObject(circle);
      fabricCanvas.renderAll();
      toast.success("Circle added");
    } else if (tool === "text") {
      const text = new FabricText("Double-click to edit", {
        left: fabricCanvas.width! / 2 - 100,
        top: fabricCanvas.height! / 2,
        fill: penColor,
        fontSize: 24,
        fontFamily: 'Arial',
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      fabricCanvas.renderAll();
      toast.success("Text added");
    } else if (tool === "sticky") {
      const stickyColor = stickyColors[Math.floor(Math.random() * stickyColors.length)];
      const sticky = new Rect({
        left: 0,
        top: 0,
        fill: stickyColor,
        width: 200,
        height: 200,
        stroke: '#DDD',
        strokeWidth: 1,
        shadow: new Shadow({ color: 'rgba(0,0,0,0.1)', blur: 10, offsetX: 0, offsetY: 5 }),
        rx: 4,
        ry: 4
      });
      
      const stickyText = new FabricText("Double-click to edit", {
        left: 10,
        top: 10,
        fill: "#333",
        fontSize: 14,
        fontFamily: 'Arial',
        width: 180,
      });
      
      const stickyGroup = new Group([sticky, stickyText], {
        left: fabricCanvas.width! / 2 - 100,
        top: fabricCanvas.height! / 2 - 100,
      });
      
      fabricCanvas.add(stickyGroup);
      fabricCanvas.setActiveObject(stickyGroup);
      fabricCanvas.renderAll();
      toast.success("Sticky note added");
    } else if (tool === "triangle") {
      const triangle = new Triangle({
        left: fabricCanvas.width! / 2 - 50,
        top: fabricCanvas.height! / 2 - 50,
        fill: "transparent",
        stroke: penColor,
        strokeWidth: penSize,
        width: 100,
        height: 100,
      });
      fabricCanvas.add(triangle);
      fabricCanvas.setActiveObject(triangle);
      fabricCanvas.renderAll();
      toast.success("Triangle added");
    } else if (tool === "line") {
      const line = new Line([50, 50, 200, 50], {
        left: fabricCanvas.width! / 2 - 100,
        top: fabricCanvas.height! / 2,
        stroke: penColor,
        strokeWidth: penSize,
      });
      fabricCanvas.add(line);
      fabricCanvas.setActiveObject(line);
      fabricCanvas.renderAll();
      toast.success("Line added");
    } else if (tool === "arrow") {
      const arrowLine = new Line([0, 0, 150, 0], {
        stroke: penColor,
        strokeWidth: penSize,
      });
      
      const arrowHead = new Triangle({
        left: 150,
        top: -10,
        width: 20,
        height: 20,
        fill: penColor,
        angle: 90,
      });
      
      const arrow = new Group([arrowLine, arrowHead], {
        left: fabricCanvas.width! / 2 - 75,
        top: fabricCanvas.height! / 2,
      });
      
      fabricCanvas.add(arrow);
      fabricCanvas.setActiveObject(arrow);
      fabricCanvas.renderAll();
      toast.success("Arrow added");
    } else if (tool === "star") {
      const starPoints = [];
      const spikes = 5;
      const outerRadius = 50;
      const innerRadius = 25;
      const centerX = 0;
      const centerY = 0;
      
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        starPoints.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      }
      
      const star = new Polygon(starPoints, {
        left: fabricCanvas.width! / 2 - 50,
        top: fabricCanvas.height! / 2 - 50,
        fill: "transparent",
        stroke: penColor,
        strokeWidth: penSize,
      });
      
      fabricCanvas.add(star);
      fabricCanvas.setActiveObject(star);
      fabricCanvas.renderAll();
      toast.success("Star added");
    } else if (tool === "polygon") {
      const hexPoints = [];
      const sides = 6;
      const radius = 50;
      
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
        hexPoints.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle),
        });
      }
      
      const hexagon = new Polygon(hexPoints, {
        left: fabricCanvas.width! / 2 - 50,
        top: fabricCanvas.height! / 2 - 50,
        fill: "transparent",
        stroke: penColor,
        strokeWidth: penSize,
      });
      
      fabricCanvas.add(hexagon);
      fabricCanvas.setActiveObject(hexagon);
      fabricCanvas.renderAll();
      toast.success("Hexagon added");
    } else if (tool === "eraser") {
      fabricCanvas.isDrawingMode = false;
      toast.info("Click objects to delete them");
    } else if (tool === "image") {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const imgElement = document.createElement('img');
            imgElement.src = event.target?.result as string;
            imgElement.onload = () => {
              const img = new FabricImage(imgElement, {
                left: fabricCanvas.width! / 2 - 100,
                top: fabricCanvas.height! / 2 - 100,
                scaleX: 0.5,
                scaleY: 0.5,
              });
              fabricCanvas.add(img);
              fabricCanvas.setActiveObject(img);
              fabricCanvas.renderAll();
              toast.success("Image added");
            };
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    }
  };

  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom + 10, 200);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom / 100);
    fabricCanvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom - 10, 50);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom / 100);
    fabricCanvas.renderAll();
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    if (!confirm("Clear entire whiteboard?")) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = showGrid ? "#F8F9FA" : "#FFFFFF";
    fabricCanvas.renderAll();
    toast.success("Whiteboard cleared");
  };

  const handleExport = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ multiplier: 2, format: 'png', quality: 1 });
    const link = document.createElement('a');
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Exported as PNG");
  };

  const handleDeleteSelected = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach(obj => fabricCanvas.remove(obj));
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      toast.success("Deleted selected objects");
    }
  };

  return (
    <div ref={containerRef} className="relative w-full h-[800px] bg-gradient-to-br from-background via-background/95 to-background rounded-xl overflow-hidden">
      {/* Top Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-card/95 backdrop-blur-xl px-4 py-2 rounded-xl shadow-lg border border-border">
        <Button
          variant={activeTool === "select" ? "default" : "ghost"}
          size="icon"
          onClick={() => setActiveTool("select")}
          title="Select"
        >
          <MousePointer2 className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "pan" ? "default" : "ghost"}
          size="icon"
          onClick={() => setActiveTool("pan")}
          title="Pan"
        >
          <Hand className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant={activeTool === "pen" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("pen")}
          title="Pen"
        >
          <Pen className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "highlighter" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("highlighter")}
          title="Highlighter"
        >
          <Highlighter className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant={activeTool === "rectangle" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("rectangle")}
          title="Rectangle"
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "circle" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("circle")}
          title="Circle"
        >
          <CircleIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "triangle" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("triangle")}
          title="Triangle"
        >
          <TriangleIcon className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "star" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("star")}
          title="Star"
        >
          <Star className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "polygon" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("polygon")}
          title="Hexagon"
        >
          <Hexagon className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant={activeTool === "line" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("line")}
          title="Line"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "arrow" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("arrow")}
          title="Arrow"
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant={activeTool === "text" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("text")}
          title="Text"
        >
          <Type className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "sticky" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("sticky")}
          title="Sticky Note"
        >
          <StickyNote className="h-4 w-4" />
        </Button>
        <Button
          variant={activeTool === "image" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("image")}
          title="Upload Image"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button
          variant={activeTool === "eraser" ? "default" : "ghost"}
          size="icon"
          onClick={() => handleToolClick("eraser")}
          title="Eraser"
        >
          <Eraser className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        {/* Color Picker Sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" title="Colors">
              <Palette className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Colors & Stroke</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 mt-6">
              <div>
                <label className="text-sm font-medium mb-3 block">Color</label>
                <div className="grid grid-cols-4 gap-2">
                  {penColors.map(({ name, value }) => (
                    <button
                      key={value}
                      onClick={() => setPenColor(value)}
                      className={cn(
                        "w-12 h-12 rounded-lg border-2",
                        penColor === value ? "border-foreground scale-110 shadow-lg" : "border-border"
                      )}
                      style={{ backgroundColor: value }}
                      title={name}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-3 block">Stroke Size: {penSize}px</label>
                <Slider
                  value={[penSize]}
                  onValueChange={([value]) => setPenSize(value)}
                  min={1}
                  max={20}
                  step={1}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button variant="outline" size="icon" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleZoomOut} title="Zoom Out">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={() => setShowGrid(!showGrid)} title="Toggle Grid">
          <Grid3x3 className="h-4 w-4" />
        </Button>
        
        <Separator orientation="vertical" className="h-6" />
        
        <Button variant="outline" size="icon" onClick={handleDeleteSelected} title="Delete">
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleClear} title="Clear All">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleExport} title="Export">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};

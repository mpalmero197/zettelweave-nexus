import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, FabricText, PencilBrush, Group, Shadow } from "fabric";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  Pen, Square, Circle as CircleIcon, Type, StickyNote, Hand, Menu, Download, Trash2, RotateCcw, Palette
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const penColors = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#E74C3C" },
  { name: "Blue", value: "#3498DB" },
  { name: "Green", value: "#2ECC71" },
  { name: "Yellow", value: "#F1C40F" },
  { name: "Purple", value: "#9B59B6" },
];

const stickyColors = ["#FFF4A3", "#FFE4A3", "#FFD4A3", "#C4E4FF", "#D4F4DD", "#FFE4F4"];

type MobileTool = "pan" | "pen" | "rectangle" | "circle" | "text" | "sticky";

// Mobile-optimized whiteboard component
export function MobileWhiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<MobileTool>("pan");
  const [penColor, setPenColor] = useState("#000000");
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const initCanvas = () => {
      const container = containerRef.current!;
      const width = Math.max(container.clientWidth, window.innerWidth);
      const height = Math.max(container.clientHeight, window.innerHeight - 200);

      if (width === 0 || height === 0) {
        setTimeout(initCanvas, 100);
        return;
      }

      const canvas = new FabricCanvas(canvasRef.current, {
        width,
        height,
        backgroundColor: "#FFFFFF",
        selection: true,
      });

      const brush = new PencilBrush(canvas);
      brush.color = penColor;
      brush.width = 3;
      canvas.freeDrawingBrush = brush;

      setFabricCanvas(canvas);
      toast.success("Whiteboard ready!");
    };

    const timer = setTimeout(initCanvas, 100);
    return () => clearTimeout(timer);
  }, [penColor]);

  // Handle panning separately with proper state management
  useEffect(() => {
    if (!fabricCanvas) return;

    let isPanning = false;
    let lastPos: { x: number; y: number } | null = null;

    const handleMouseDown = (opt: any) => {
      if (activeTool === 'pan') {
        isPanning = true;
        fabricCanvas.selection = false;
        fabricCanvas.isDrawingMode = false;
        const pointer = opt.pointer;
        if (pointer) {
          lastPos = { x: pointer.x, y: pointer.y };
        }
      }
    };

    const handleMouseMove = (opt: any) => {
      if (activeTool === 'pan' && isPanning && lastPos) {
        const pointer = opt.pointer;
        if (pointer && fabricCanvas.viewportTransform) {
          fabricCanvas.viewportTransform[4] += pointer.x - lastPos.x;
          fabricCanvas.viewportTransform[5] += pointer.y - lastPos.y;
          fabricCanvas.requestRenderAll();
          lastPos = { x: pointer.x, y: pointer.y };
        }
      }
    };

    const handleMouseUp = () => {
      if (isPanning) {
        isPanning = false;
        fabricCanvas.selection = true;
        lastPos = null;
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
  }, [fabricCanvas, activeTool]);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "pen";
    if (activeTool === "pen" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = penColor;
      fabricCanvas.freeDrawingBrush.width = 3;
    }
  }, [activeTool, penColor, fabricCanvas]);

  const handleToolClick = (tool: MobileTool) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;

    if (tool === "rectangle") {
      const rect = new Rect({
        left: fabricCanvas.width! / 2 - 75,
        top: fabricCanvas.height! / 2 - 50,
        fill: penColor,
        width: 150,
        height: 100,
        rx: 8,
        ry: 8,
      });
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
      fabricCanvas.renderAll();
      setActiveTool("pan");
    } else if (tool === "circle") {
      const circle = new Circle({
        left: fabricCanvas.width! / 2 - 50,
        top: fabricCanvas.height! / 2 - 50,
        fill: penColor,
        radius: 50,
      });
      fabricCanvas.add(circle);
      fabricCanvas.setActiveObject(circle);
      fabricCanvas.renderAll();
      setActiveTool("pan");
    } else if (tool === "text") {
      const text = new FabricText("Double-tap to edit", {
        left: fabricCanvas.width! / 2 - 100,
        top: fabricCanvas.height! / 2,
        fill: penColor,
        fontSize: 24,
        fontFamily: 'Arial',
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      fabricCanvas.renderAll();
      setActiveTool("pan");
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
      
      const stickyText = new FabricText("Double-tap to edit note", {
        left: 10,
        top: 10,
        fill: "#333",
        fontSize: 14,
        fontFamily: 'Arial',
        width: 180,
        splitByGrapheme: true,
      });
      
      const stickyGroup = new Group([sticky, stickyText], {
        left: fabricCanvas.width! / 2 - 100,
        top: fabricCanvas.height! / 2 - 100,
        subTargetCheck: true,
      });
      
      fabricCanvas.add(stickyGroup);
      fabricCanvas.setActiveObject(stickyGroup);
      fabricCanvas.renderAll();
      setActiveTool("pan");
    }
  };

  const handleClear = () => {
    if (!fabricCanvas) return;
    if (!confirm("Clear entire whiteboard?")) return;
    fabricCanvas.clear();
    fabricCanvas.backgroundColor = "#FFFFFF";
    fabricCanvas.renderAll();
    toast.success("Whiteboard cleared");
  };

  const handleExport = () => {
    if (!fabricCanvas) return;
    const dataURL = fabricCanvas.toDataURL({ multiplier: 1, format: 'png', quality: 1 });
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

  const tools = [
    { tool: "pan" as MobileTool, label: "Pan", icon: Hand },
    { tool: "pen" as MobileTool, label: "Draw", icon: Pen },
    { tool: "rectangle" as MobileTool, label: "Box", icon: Square },
    { tool: "circle" as MobileTool, label: "Circle", icon: CircleIcon },
    { tool: "text" as MobileTool, label: "Text", icon: Type },
    { tool: "sticky" as MobileTool, label: "Sticky", icon: StickyNote },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Canvas - Full screen */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden touch-none" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <canvas ref={canvasRef} className="block" />
      </div>

      {/* Bottom Toolbar - Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-xl border-t border-border shadow-2xl">
        <div className="px-4 py-3 space-y-3">
          {/* Tools Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {tools.map(({ tool, label, icon: Icon }) => (
              <Button
                key={tool}
                variant={activeTool === tool ? "default" : "outline"}
                size="lg"
                onClick={() => handleToolClick(tool)}
                className="flex-shrink-0 h-12 px-4 rounded-xl"
              >
                <Icon className="h-5 w-5" />
              </Button>
            ))}
            <Sheet open={showMenu} onOpenChange={setShowMenu}>
              <SheetTrigger asChild>
                <Button size="lg" variant="outline" className="flex-shrink-0 h-12 px-4 rounded-xl">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[60vh] rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle>Whiteboard Menu</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <Button variant="outline" size="lg" onClick={handleExport} className="w-full h-14">
                    <Download className="h-5 w-5 mr-2" />
                    Export as PNG
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleDeleteSelected} className="w-full h-14">
                    <Trash2 className="h-5 w-5 mr-2" />
                    Delete Selected
                  </Button>
                  <Button variant="outline" size="lg" onClick={handleClear} className="w-full h-14">
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Clear All
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Color Picker for drawing tools */}
          {["pen", "rectangle", "circle", "text"].includes(activeTool) && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <Palette className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {penColors.map(({ name, value }) => (
                <button
                  key={value}
                  onClick={() => setPenColor(value)}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 flex-shrink-0",
                    penColor === value 
                      ? "border-foreground scale-110 shadow-lg" 
                      : "border-border"
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
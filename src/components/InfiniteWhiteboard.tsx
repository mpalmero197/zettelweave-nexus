import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Circle, Rect, FabricText, Group } from "fabric";
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
  const [activeTool, setActiveTool] = useState<Tool>("draw");
  const [activeColor, setActiveColor] = useState("#000000");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Wait for container to be properly sized
    const initCanvas = () => {
      const width = containerRef.current!.clientWidth;
      const height = containerRef.current!.clientHeight;
      
      if (width === 0 || height === 0) {
        // Container not ready, try again
        setTimeout(initCanvas, 100);
        return;
      }

      try {
        const canvas = new FabricCanvas(canvasRef.current, {
          width,
          height,
          backgroundColor: "#ffffff",
          selection: true,
          allowTouchScrolling: false,
          stopContextMenu: true,
        });

        // Initialize drawing brush immediately
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = activeColor;
          canvas.freeDrawingBrush.width = window.innerWidth < 768 ? 4 : 2;
          canvas.freeDrawingBrush.strokeLineCap = 'round';
          canvas.freeDrawingBrush.strokeLineJoin = 'round';
        }

        // Wait for canvas to be ready before setting up drawing
        canvas.on('after:render', () => {
          if (!canvas.freeDrawingBrush) {
            console.warn('FreeDrawingBrush not ready, retrying initialization...');
            // Canvas is ready, set up drawing mode
            canvas.isDrawingMode = true;
            canvas.isDrawingMode = false; // Reset to force initialization
            if (canvas.freeDrawingBrush) {
              canvas.freeDrawingBrush.color = activeColor;
              canvas.freeDrawingBrush.width = window.innerWidth < 768 ? 4 : 2;
              canvas.freeDrawingBrush.strokeLineCap = 'round';
              canvas.freeDrawingBrush.strokeLineJoin = 'round';
            }
          }
        });

        // Set drawing mode based on active tool
        canvas.isDrawingMode = activeTool === "draw";
        
        setFabricCanvas(canvas);
        setIsReady(true);
        console.log('Whiteboard initialized successfully');
      } catch (error) {
        console.error('Failed to initialize whiteboard:', error);
        // Retry initialization
        setTimeout(initCanvas, 500);
      }
    };

    initCanvas();

    return () => {
      if (fabricCanvas) {
        try {
          fabricCanvas.dispose();
        } catch (error) {
          console.warn('Canvas dispose warning:', error);
        }
      }
    };
  }, [activeColor]);

  useEffect(() => {
    if (!fabricCanvas || !isReady) return;

    try {
      const isMobile = window.innerWidth < 768;
      fabricCanvas.isDrawingMode = activeTool === "draw";
      
      if (fabricCanvas.freeDrawingBrush) {
        fabricCanvas.freeDrawingBrush.color = activeColor;
        fabricCanvas.freeDrawingBrush.width = isMobile ? 4 : 3;
        fabricCanvas.freeDrawingBrush.strokeLineCap = 'round';
        fabricCanvas.freeDrawingBrush.strokeLineJoin = 'round';
      }
      
      // Update cursor based on tool
      if (activeTool === "draw") {
        fabricCanvas.setCursor("crosshair");
      } else {
        fabricCanvas.setCursor("default");
      }
    } catch (error) {
      console.warn('Tool configuration warning:', error);
    }
  }, [activeTool, activeColor, fabricCanvas, isReady]);

  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = tool === "draw";

    if (tool === "rectangle") {
      const rect = new Rect({
        left: 100,
        top: 100,
        fill: "transparent",
        width: 100,
        height: 100,
        stroke: activeColor,
        strokeWidth: 2,
      });
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
      fabricCanvas.renderAll();
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
      fabricCanvas.renderAll();
    } else if (tool === "text") {
      const text = new FabricText("Double click to edit", {
        left: 100,
        top: 100,
        fill: activeColor,
        fontSize: 20,
      });
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      fabricCanvas.renderAll();
    }
  };

  const handleDeleteSelected = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
      fabricCanvas.remove(...activeObjects);
      fabricCanvas.discardActiveObject();
      fabricCanvas.renderAll();
      toast.success("Deleted selected objects");
    }
  };

  const handleCombineShapes = () => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length < 2) {
      toast.error("Select at least 2 objects to combine");
      return;
    }
    
    // Simple grouping for now
    const group = new Group(activeObjects);
    fabricCanvas.remove(...activeObjects);
    fabricCanvas.add(group);
    fabricCanvas.setActiveObject(group);
    fabricCanvas.renderAll();
    toast.success("Combined selected objects");
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
    <div className="w-full h-full space-y-4">
      <Card className="w-full h-full">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Infinite Whiteboard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 h-full">
          {/* Toolbar */}
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
                      onClick={() => setActiveColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        activeColor === color 
                          ? "border-foreground scale-110" 
                          : "border-border hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleDeleteSelected}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={handleCombineShapes}>
                  <Plus className="h-4 w-4 mr-1" />
                  Combine
                </Button>
                <Button variant="outline" size="sm" onClick={handleClear}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={handleCreateCard}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Card
                </Button>
              </div>
            </div>
          </div>

          {/* Canvas Container */}
          <div 
            ref={containerRef}
            className="relative w-full border border-border/50 rounded-xl overflow-hidden bg-white shadow-inner"
            style={{ height: "calc(100vh - 400px)", minHeight: "400px" }}
          >
            <canvas ref={canvasRef} className="block" />
            
            {/* Instructions overlay */}
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-70">
              {window.innerWidth < 768 
                ? "Draw with pen tool • Select shapes with select tool" 
                : "Draw with pen tool • Space + Drag to pan • Mouse wheel to zoom"
              }
            </div>
            
            {!isReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50">
                <div className="text-center">
                  <Palette className="h-8 w-8 animate-pulse mx-auto mb-2" />
                  <p className="text-sm">Initializing canvas...</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InfiniteWhiteboard;
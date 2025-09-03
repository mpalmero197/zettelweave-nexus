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
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [activeColor, setActiveColor] = useState("#000000");
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200,
      height: 800,
      backgroundColor: "#ffffff",
    });

    canvas.freeDrawingBrush.color = activeColor;
    canvas.freeDrawingBrush.width = 2;

    setFabricCanvas(canvas);
    toast("Whiteboard ready!");

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = activeTool === "draw";
    
    if (activeTool === "draw" && fabricCanvas.freeDrawingBrush) {
      fabricCanvas.freeDrawingBrush.color = activeColor;
      fabricCanvas.freeDrawingBrush.width = 2;
    }
  }, [activeTool, activeColor, fabricCanvas]);

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
          
          <div className="border rounded-lg overflow-hidden bg-white">
            <canvas 
              ref={canvasRef} 
              className="block max-w-full"
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
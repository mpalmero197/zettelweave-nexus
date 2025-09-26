import { useEffect, useRef, useState, useCallback } from "react";
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
  Palette,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";

interface MobileWhiteboardProps {
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
}

type Tool = "draw" | "erase" | "select" | "pan";

interface DrawingState {
  paths: Path[];
  currentPath: Point[];
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface Point {
  x: number;
  y: number;
  pressure?: number;
}

interface Path {
  points: Point[];
  color: string;
  width: number;
  tool: string;
}

const colors = [
  "#000000", "#ff0000", "#0066ff", "#00cc00", 
  "#ff6600", "#9900cc", "#00cccc", "#ffcc00"
];

const brushSizes = [2, 4, 8, 12, 16];

export const MobileWhiteboard = ({ onCreateCard }: MobileWhiteboardProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  
  const [activeTool, setActiveTool] = useState<Tool>("draw");
  const [activeColor, setActiveColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  
  const [drawingState, setDrawingState] = useState<DrawingState>({
    paths: [],
    currentPath: [],
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });

  const [history, setHistory] = useState<DrawingState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const STORAGE_KEY = "mobile-whiteboard:state:v1";

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctxRef.current = ctx;

    // Set canvas size
    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      redrawCanvas();
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    // Load saved state
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDrawingState(parsed);
        toast("Whiteboard restored!");
      }
    } catch (e) {
      console.warn('Failed to load whiteboard state');
    }

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  // Save state to localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drawingState));
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [drawingState]);

  const saveToHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ ...drawingState });
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [drawingState, historyIndex]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.translate(drawingState.offsetX, drawingState.offsetY);
    ctx.scale(drawingState.scale, drawingState.scale);

    // Draw all paths
    drawingState.paths.forEach(path => {
      if (path.points.length < 2) return;
      
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.globalCompositeOperation = path.tool === 'erase' ? 'destination-out' : 'source-over';
      
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      
      for (let i = 1; i < path.points.length; i++) {
        const point = path.points[i];
        ctx.lineTo(point.x, point.y);
      }
      
      ctx.stroke();
    });

    // Draw current path
    if (drawingState.currentPath.length > 1) {
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = brushSize;
      ctx.globalCompositeOperation = activeTool === 'erase' ? 'destination-out' : 'source-over';
      
      ctx.beginPath();
      ctx.moveTo(drawingState.currentPath[0].x, drawingState.currentPath[0].y);
      
      for (let i = 1; i < drawingState.currentPath.length; i++) {
        const point = drawingState.currentPath[i];
        ctx.lineTo(point.x, point.y);
      }
      
      ctx.stroke();
    }

    ctx.restore();
  }, [drawingState, activeColor, brushSize, activeTool]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getEventPoint = (e: React.TouchEvent | React.MouseEvent | TouchEvent | MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return { x: 0, y: 0 };
    }

    return {
      x: (clientX - rect.left - drawingState.offsetX) / drawingState.scale,
      y: (clientY - rect.top - drawingState.offsetY) / drawingState.scale
    };
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    
    if (activeTool === "pan" || ('touches' in e && e.touches.length === 2)) {
      setIsPanning(true);
      return;
    }

    if (activeTool === "draw" || activeTool === "erase") {
      setIsDrawing(true);
      const point = getEventPoint(e);
      setDrawingState(prev => ({
        ...prev,
        currentPath: [point]
      }));
    }
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();

    if (isPanning && 'touches' in e && e.touches.length === 2) {
      // Handle pinch zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      // Implement pinch zoom logic here
      return;
    }

    if (isDrawing && (activeTool === "draw" || activeTool === "erase")) {
      const point = getEventPoint(e);
      setDrawingState(prev => ({
        ...prev,
        currentPath: [...prev.currentPath, point]
      }));
    }
  };

  const handleEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();

    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      
      if (drawingState.currentPath.length > 1) {
        const newPath: Path = {
          points: drawingState.currentPath,
          color: activeColor,
          width: brushSize,
          tool: activeTool
        };

        setDrawingState(prev => ({
          ...prev,
          paths: [...prev.paths, newPath],
          currentPath: []
        }));

        saveToHistory();
      } else {
        setDrawingState(prev => ({
          ...prev,
          currentPath: []
        }));
      }
    }
  };

  const handleClear = () => {
    setDrawingState(prev => ({
      ...prev,
      paths: [],
      currentPath: []
    }));
    saveToHistory();
    toast("Whiteboard cleared!");
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setDrawingState(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setDrawingState(history[historyIndex + 1]);
    }
  };

  const handleZoomIn = () => {
    setDrawingState(prev => ({
      ...prev,
      scale: Math.min(prev.scale * 1.5, 4)
    }));
  };

  const handleZoomOut = () => {
    setDrawingState(prev => ({
      ...prev,
      scale: Math.max(prev.scale / 1.5, 0.25)
    }));
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = dataURL;
    link.click();
    
    toast("Whiteboard exported!");
  };

  const handleCreateCard = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataURL = canvas.toDataURL('image/png');

    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: `Whiteboard Sketch - ${new Date().toLocaleDateString()}`,
      content: "Visual notes and sketches from mobile whiteboard",
      description: "Created from mobile whiteboard session",
      category: "700",
      number: "",
      tags: ["whiteboard", "visual", "sketch", "mobile"],
      linkedCards: [],
      imageUrl: dataURL
    };

    onCreateCard(newCard);
    toast("Created zettel card from whiteboard!");
  };

  const tools = [
    { tool: "draw" as const, label: "Draw", icon: Pen },
    { tool: "erase" as const, label: "Erase", icon: Trash2 },
    { tool: "pan" as const, label: "Pan", icon: Move },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Mobile Whiteboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tools */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tools.map(({ tool, label, icon: Icon }) => (
              <Button
                key={tool}
                variant={activeTool === tool ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTool(tool)}
                className="flex-shrink-0"
              >
                <Icon className="h-4 w-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Colors:</span>
            <div className="flex gap-2 flex-wrap">
              {colors.map((color) => (
                <button
                  key={color}
                  className={`w-10 h-10 rounded-full border-4 touch-manipulation ${
                    activeColor === color ? "border-primary" : "border-border"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setActiveColor(color)}
                />
              ))}
            </div>
          </div>

          {/* Brush Size */}
          <div className="space-y-2">
            <span className="text-sm font-medium">Brush Size:</span>
            <div className="flex gap-2 flex-wrap">
              {brushSizes.map((size) => (
                <Button
                  key={size}
                  variant={brushSize === size ? "default" : "outline"}
                  size="sm"
                  onClick={() => setBrushSize(size)}
                  className="min-w-12"
                >
                  {size}px
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleUndo}>
              <Undo className="h-4 w-4 mr-1" />
              Undo
            </Button>
            <Button variant="outline" size="sm" onClick={handleRedo}>
              <Redo className="h-4 w-4 mr-1" />
              Redo
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4 mr-1" />
              Zoom+
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4 mr-1" />
              Zoom-
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCreateCard} className="flex-1">
              <Plus className="h-4 w-4 mr-1" />
              Create Card
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="flex-1">
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>

          {/* Canvas */}
          <div 
            ref={containerRef}
            className="border-2 border-border rounded-lg overflow-hidden bg-white"
            style={{ height: '60vh', touchAction: 'none' }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              style={{ touchAction: 'none' }}
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Touch to draw, pinch to zoom, use pan tool to move around.</p>
            <p>All changes are automatically saved locally.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
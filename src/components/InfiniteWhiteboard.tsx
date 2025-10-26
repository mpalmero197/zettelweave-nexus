import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, Circle, Rect, FabricText, Line, Path, PencilBrush, Shadow, Polygon, Triangle, Group, ActiveSelection, FabricObject } from "fabric";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileWhiteboard } from "@/components/MobileWhiteboard";

interface InfiniteWhiteboardProps {
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

export const InfiniteWhiteboard = ({ onCreateCard }: InfiniteWhiteboardProps) => {
  const isMobile = useIsMobile();
  
  // Use mobile-optimized whiteboard on mobile devices
  if (isMobile) {
    return <MobileWhiteboard />;
  }
  
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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Initialize canvas with proper mobile sizing
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const initCanvas = () => {
      const container = containerRef.current!;
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      // Ensure canvas has visible dimensions
      if (width === 0 || height === 0) {
        setTimeout(initCanvas, 100);
        return;
      }

      try {
        const canvas = new FabricCanvas(canvasRef.current, {
          width,
          height,
          backgroundColor: "#FAFAFA",
          selection: true,
        });

        // Initialize drawing brush
        const brush = new PencilBrush(canvas);
        brush.color = penColor;
        brush.width = penSize;
        brush.strokeLineCap = 'round';
        brush.strokeLineJoin = 'round';
        canvas.freeDrawingBrush = brush;

        // Enable panning with mouse and touch
        let isPanningLocal = false;
        let lastPos: { x: number; y: number } | null = null;

        canvas.on('mouse:down', (opt) => {
          if (activeTool === 'pan') {
            isPanningLocal = true;
            canvas.selection = false;
            canvas.isDrawingMode = false;
            const pointer = opt.pointer;
            if (pointer) {
              lastPos = { x: pointer.x, y: pointer.y };
            }
            opt.e.preventDefault();
            opt.e.stopPropagation();
          }
        });

        canvas.on('mouse:move', (opt) => {
          if (activeTool === 'pan' && isPanningLocal && lastPos) {
            const pointer = opt.pointer;
            if (pointer) {
              const vpt = canvas.viewportTransform;
              if (vpt) {
                vpt[4] += pointer.x - lastPos.x;
                vpt[5] += pointer.y - lastPos.y;
                canvas.requestRenderAll();
                lastPos = { x: pointer.x, y: pointer.y };
              }
            }
            opt.e.preventDefault();
            opt.e.stopPropagation();
          }
        });

        canvas.on('mouse:up', () => {
          if (isPanningLocal) {
            isPanningLocal = false;
            canvas.selection = true;
            lastPos = null;
          }
        });

        // Touch support for panning
        const canvasElement = canvas.getElement();
        let touchStartPos: { x: number; y: number } | null = null;
        
        canvasElement.addEventListener('touchstart', (e) => {
          if (activeTool === 'pan' && e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = canvasElement.getBoundingClientRect();
            touchStartPos = {
              x: touch.clientX - rect.left,
              y: touch.clientY - rect.top
            };
            isPanningLocal = true;
            e.preventDefault();
          }
        }, { passive: false });

        canvasElement.addEventListener('touchmove', (e) => {
          if (activeTool === 'pan' && isPanningLocal && touchStartPos && e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = canvasElement.getBoundingClientRect();
            const currentPos = {
              x: touch.clientX - rect.left,
              y: touch.clientY - rect.top
            };
            
            const vpt = canvas.viewportTransform;
            if (vpt) {
              vpt[4] += currentPos.x - touchStartPos.x;
              vpt[5] += currentPos.y - touchStartPos.y;
              canvas.requestRenderAll();
              touchStartPos = currentPos;
            }
            e.preventDefault();
          }
        }, { passive: false });

        canvasElement.addEventListener('touchend', () => {
          if (isPanningLocal) {
            isPanningLocal = false;
            touchStartPos = null;
          }
        });

        setFabricCanvas(canvas);
        setIsReady(true);
        
        // Add grid if enabled
        if (showGrid) {
          drawGrid(canvas);
        }
      } catch (error) {
        console.error('Failed to initialize whiteboard:', error);
        setTimeout(initCanvas, 500);
      }
    };

    initCanvas();

    return () => {
      if (fabricCanvas) {
        fabricCanvas.dispose();
      }
    };
  }, []);

  // Draw grid background
  const drawGrid = useCallback((canvas: FabricCanvas) => {
    const gridSize = 40;
    const width = canvas.width || 0;
    const height = canvas.height || 0;

    // Remove old grid
    const objects = canvas.getObjects();
    objects.forEach(obj => {
      if ((obj as any).isGrid) {
        canvas.remove(obj);
      }
    });

    // Draw vertical lines
    for (let i = 0; i < width; i += gridSize) {
      const line = new Line([i, 0, i, height], {
        stroke: '#E5E5E5',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      (line as any).isGrid = true;
      canvas.add(line);
      canvas.sendObjectToBack(line);
    }

    // Draw horizontal lines
    for (let i = 0; i < height; i += gridSize) {
      const line = new Line([0, i, width, i], {
        stroke: '#E5E5E5',
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      (line as any).isGrid = true;
      canvas.add(line);
      canvas.sendObjectToBack(line);
    }

    canvas.renderAll();
  }, []);

  // Toggle grid
  useEffect(() => {
    if (!fabricCanvas || !isReady) return;
    
    if (showGrid) {
      drawGrid(fabricCanvas);
    } else {
      const objects = fabricCanvas.getObjects();
      objects.forEach(obj => {
        if ((obj as any).isGrid) {
          fabricCanvas.remove(obj);
        }
      });
      fabricCanvas.renderAll();
    }
  }, [showGrid, fabricCanvas, isReady, drawGrid]);

  // Update tool
  useEffect(() => {
    if (!fabricCanvas || !isReady) return;

    fabricCanvas.isDrawingMode = ["pen", "highlighter", "eraser"].includes(activeTool);
    
    if (fabricCanvas.freeDrawingBrush) {
      if (activeTool === "pen") {
        fabricCanvas.freeDrawingBrush.color = penColor;
        fabricCanvas.freeDrawingBrush.width = penSize;
      } else if (activeTool === "highlighter") {
        fabricCanvas.freeDrawingBrush.color = penColor + "80"; // Semi-transparent
        fabricCanvas.freeDrawingBrush.width = penSize * 3;
      } else if (activeTool === "eraser") {
        fabricCanvas.freeDrawingBrush.color = "#FAFAFA";
        fabricCanvas.freeDrawingBrush.width = penSize * 4;
      }
    }
  }, [activeTool, penColor, penSize, fabricCanvas, isReady]);

  // History management
  const saveHistory = useCallback((canvas: FabricCanvas) => {
    const json = JSON.stringify(canvas.toJSON());
    setHistory(prev => [...prev.slice(0, historyIndex + 1), json]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0 && fabricCanvas) {
      const newIndex = historyIndex - 1;
      fabricCanvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
        fabricCanvas.renderAll();
        setHistoryIndex(newIndex);
      });
    }
  }, [fabricCanvas, history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1 && fabricCanvas) {
      const newIndex = historyIndex + 1;
      fabricCanvas.loadFromJSON(JSON.parse(history[newIndex]), () => {
        fabricCanvas.renderAll();
        setHistoryIndex(newIndex);
      });
    }
  }, [fabricCanvas, history, historyIndex]);

  // Clipboard operations
  const handleCopy = useCallback(() => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    if (activeObjects.length > 0) {
      setClipboard(activeObjects.map(obj => obj.toObject()));
      toast.success(`Copied ${activeObjects.length} object(s)`);
    }
  }, [fabricCanvas]);

  const handlePaste = useCallback(() => {
    if (!fabricCanvas || clipboard.length === 0) return;
    
    fabricCanvas.discardActiveObject();
    clipboard.forEach((obj, index) => {
      FabricObject.fromObject(obj).then((cloned: FabricObject) => {
        cloned.set({
          left: (cloned.left || 0) + 20 * (index + 1),
          top: (cloned.top || 0) + 20 * (index + 1),
        });
        fabricCanvas.add(cloned);
        if (index === clipboard.length - 1) {
          fabricCanvas.setActiveObject(cloned);
          fabricCanvas.renderAll();
        }
      });
    });
    toast.success(`Pasted ${clipboard.length} object(s)`);
  }, [fabricCanvas, clipboard]);

  // Group/Ungroup operations
  const handleGroup = useCallback(() => {
    if (!fabricCanvas) return;
    const activeSelection = fabricCanvas.getActiveObject();
    if (activeSelection && activeSelection.type === 'activeSelection') {
      const selection = activeSelection as ActiveSelection;
      const objects = selection.getObjects();
      selection.removeAll();
      const group = new Group(objects);
      fabricCanvas.remove(activeSelection);
      fabricCanvas.add(group);
      fabricCanvas.setActiveObject(group);
      fabricCanvas.renderAll();
      toast.success("Objects grouped");
    }
  }, [fabricCanvas]);

  const handleUngroup = useCallback(() => {
    if (!fabricCanvas) return;
    const activeObject = fabricCanvas.getActiveObject();
    if (activeObject && activeObject.type === 'group') {
      const group = activeObject as Group;
      const objects = group.getObjects();
      group.removeAll();
      fabricCanvas.remove(group);
      objects.forEach(obj => fabricCanvas.add(obj));
      const selection = new ActiveSelection(objects, { canvas: fabricCanvas });
      fabricCanvas.setActiveObject(selection);
      fabricCanvas.renderAll();
      toast.success("Group ungrouped");
    }
  }, [fabricCanvas]);

  // Lock/Unlock
  const handleLock = useCallback(() => {
    if (!fabricCanvas) return;
    const activeObjects = fabricCanvas.getActiveObjects();
    activeObjects.forEach(obj => {
      obj.set({ lockMovementX: true, lockMovementY: true, lockRotation: true, lockScalingX: true, lockScalingY: true, selectable: false });
    });
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    toast.success("Objects locked");
  }, [fabricCanvas]);

  const handleUnlock = useCallback(() => {
    if (!fabricCanvas) return;
    fabricCanvas.getObjects().forEach(obj => {
      if (obj.lockMovementX) {
        obj.set({ lockMovementX: false, lockMovementY: false, lockRotation: false, lockScalingX: false, lockScalingY: false, selectable: true });
      }
    });
    fabricCanvas.renderAll();
    toast.success("All objects unlocked");
  }, [fabricCanvas]);

  const handleToolClick = (tool: Tool) => {
    setActiveTool(tool);
    if (!fabricCanvas) return;

    fabricCanvas.isDrawingMode = false;

    if (tool === "rectangle") {
      const rect = new Rect({
        left: 100,
        top: 100,
        fill: "transparent",
        width: 150,
        height: 100,
        stroke: penColor,
        strokeWidth: 2,
        rx: 5,
        ry: 5
      });
      fabricCanvas.add(rect);
      fabricCanvas.setActiveObject(rect);
      fabricCanvas.renderAll();
      setActiveTool("select");
    } else if (tool === "circle") {
      const circle = new Circle({
        left: 100,
        top: 100,
        fill: "transparent",
        radius: 60,
        stroke: penColor,
        strokeWidth: 2,
      });
      fabricCanvas.add(circle);
      fabricCanvas.setActiveObject(circle);
      fabricCanvas.renderAll();
      setActiveTool("select");
    } else if (tool === "triangle") {
      const triangle = new Triangle({
        left: 100,
        top: 100,
        fill: "transparent",
        width: 100,
        height: 100,
        stroke: penColor,
        strokeWidth: 2,
      });
      fabricCanvas.add(triangle);
      fabricCanvas.setActiveObject(triangle);
      fabricCanvas.renderAll();
      setActiveTool("select");
    } else if (tool === "star") {
      const starPoints = [];
      const outerRadius = 50;
      const innerRadius = 25;
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI / 5) * i;
        starPoints.push({
          x: radius * Math.sin(angle),
          y: -radius * Math.cos(angle)
        });
      }
      const star = new Polygon(starPoints, {
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: penColor,
        strokeWidth: 2,
      });
      fabricCanvas.add(star);
      fabricCanvas.setActiveObject(star);
      fabricCanvas.renderAll();
      setActiveTool("select");
    } else if (tool === "polygon") {
      const hexPoints = [];
      const radius = 50;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        hexPoints.push({
          x: radius * Math.cos(angle),
          y: radius * Math.sin(angle)
        });
      }
      const hexagon = new Polygon(hexPoints, {
        left: 100,
        top: 100,
        fill: "transparent",
        stroke: penColor,
        strokeWidth: 2,
      });
      fabricCanvas.add(hexagon);
      fabricCanvas.setActiveObject(hexagon);
      fabricCanvas.renderAll();
      setActiveTool("select");
    } else if (tool === "line") {
      const line = new Line([100, 100, 250, 100], {
        stroke: penColor,
        strokeWidth: 3,
        strokeLineCap: 'round'
      });
      fabricCanvas.add(line);
      fabricCanvas.setActiveObject(line);
      fabricCanvas.renderAll();
      setActiveTool("select");
    } else if (tool === "arrow") {
      const arrowPath = new Path('M 0 0 L 150 0 L 140 -10 M 150 0 L 140 10', {
        stroke: penColor,
        strokeWidth: 2,
        fill: '',
        left: 100,
        top: 100
      });
      fabricCanvas.add(arrowPath);
      fabricCanvas.setActiveObject(arrowPath);
      fabricCanvas.renderAll();
      setActiveTool("select");
    } else if (tool === "text") {
      const text = new FabricText("Double-click to edit", {
        left: 100,
        top: 100,
        fill: penColor,
        fontSize: 24,
        fontFamily: 'Arial',
      });
      
      fabricCanvas.add(text);
      fabricCanvas.setActiveObject(text);
      fabricCanvas.renderAll();
      setActiveTool("select");
    } else if (tool === "sticky") {
      const stickyColor = stickyColors[Math.floor(Math.random() * stickyColors.length)];
      
      // Create sticky note background
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
      
      // Create editable text for sticky note
      const stickyText = new FabricText("Double-click to edit note", {
        left: 10,
        top: 10,
        fill: "#333",
        fontSize: 14,
        fontFamily: 'Arial',
        width: 180,
        splitByGrapheme: true,
      });
      
      // Group them together so they move as one
      const stickyGroup = new Group([sticky, stickyText], {
        left: 100,
        top: 100,
        subTargetCheck: true, // Allow clicking on objects inside group
      });
      
      fabricCanvas.add(stickyGroup);
      fabricCanvas.setActiveObject(stickyGroup);
      fabricCanvas.renderAll();
      setActiveTool("select");
    }
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(25, Math.min(200, zoom + delta));
    setZoom(newZoom);
    if (fabricCanvas) {
      fabricCanvas.setZoom(newZoom / 100);
      fabricCanvas.renderAll();
    }
  };

  const handleResetZoom = () => {
    setZoom(100);
    if (fabricCanvas) {
      fabricCanvas.setZoom(1);
      fabricCanvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
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

  const handleClear = () => {
    if (!fabricCanvas) return;
    const objects = fabricCanvas.getObjects();
    objects.forEach(obj => {
      if (!(obj as any).isGrid) {
        fabricCanvas.remove(obj);
      }
    });
    fabricCanvas.renderAll();
    toast.success("Whiteboard cleared");
  };

  const handleExport = () => {
    if (!fabricCanvas) return;
    
    const dataURL = fabricCanvas.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 2,
    });
    
    const link = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
    
    toast.success("Whiteboard exported");
  };

  const handleCreateCard = () => {
    if (!fabricCanvas) return;

    const dataURL = fabricCanvas.toDataURL({
      format: "png",
      quality: 0.8,
      multiplier: 1,
    });

    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: `Whiteboard - ${new Date().toLocaleDateString()}`,
      content: "Visual brainstorming and sketches",
      description: "Created from whiteboard",
      category: "700",
      number: "",
      tags: ["whiteboard", "visual"],
      linkedCards: [],
      imageUrl: dataURL
    };

    onCreateCard(newCard);
    toast.success("Created card from whiteboard");
  };

  const tools = [
    { tool: "select" as const, label: "Select", icon: MousePointer2 },
    { tool: "pan" as const, label: "Pan", icon: Hand },
    { tool: "pen" as const, label: "Pen", icon: Pen },
    { tool: "highlighter" as const, label: "Highlighter", icon: Highlighter },
    { tool: "eraser" as const, label: "Eraser", icon: Eraser },
  ];

  const shapes = [
    { tool: "rectangle" as const, label: "Rectangle", icon: Square },
    { tool: "circle" as const, label: "Circle", icon: CircleIcon },
    { tool: "triangle" as const, label: "Triangle", icon: TriangleIcon },
    { tool: "star" as const, label: "Star", icon: Star },
    { tool: "polygon" as const, label: "Hexagon", icon: Hexagon },
    { tool: "line" as const, label: "Line", icon: Minus },
    { tool: "arrow" as const, label: "Arrow", icon: ArrowRight },
  ];

  const insertTools = [
    { tool: "text" as const, label: "Text", icon: Type },
    { tool: "sticky" as const, label: "Sticky Note", icon: StickyNote },
    { tool: "image" as const, label: "Image", icon: ImageIcon },
  ];

  return (
    <div className="flex h-full w-full bg-background">
      {/* Mobile Toolbar - Sheet Drawer */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="fixed left-4 top-20 z-50 md:hidden shadow-lg"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-4">
          <div className="space-y-4">
            <h3 className="font-semibold">Drawing Tools</h3>
            <div className="grid grid-cols-2 gap-2">
              {tools.map(({ tool, label, icon: Icon }) => (
                <Button
                  key={tool}
                  variant={activeTool === tool ? "default" : "outline"}
                  onClick={() => setActiveTool(tool)}
                  className="justify-start gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>

            <Separator />

            <h3 className="font-semibold">Shapes</h3>
            <div className="grid grid-cols-2 gap-2">
              {shapes.map(({ tool, label, icon: Icon }) => (
                <Button
                  key={tool}
                  variant="outline"
                  onClick={() => handleToolClick(tool)}
                  className="justify-start gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>

            <Separator />

            <h3 className="font-semibold">Insert</h3>
            <div className="grid grid-cols-2 gap-2">
              {insertTools.map(({ tool, label, icon: Icon }) => (
                <Button
                  key={tool}
                  variant="outline"
                  onClick={() => handleToolClick(tool)}
                  className="justify-start gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>

            <Separator />

            {/* Colors */}
            <div className="space-y-2">
              <h3 className="font-semibold">Color</h3>
              <div className="grid grid-cols-4 gap-2">
                {penColors.map(({ name, value }) => (
                  <button
                    key={value}
                    onClick={() => setPenColor(value)}
                    className={cn(
                      "w-full aspect-square rounded-lg border-2 transition-all",
                      penColor === value 
                        ? "border-foreground scale-110 shadow-md" 
                        : "border-border hover:scale-105"
                    )}
                    style={{ backgroundColor: value }}
                    title={name}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="space-y-2">
              <h3 className="font-semibold">Edit</h3>
              <Button
                variant="outline"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="w-full justify-start gap-2"
              >
                <CornerUpLeft className="h-4 w-4" />
                Undo
              </Button>
              <Button
                variant="outline"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="w-full justify-start gap-2"
              >
                <CornerUpRight className="h-4 w-4" />
                Redo
              </Button>
              <Button
                variant="outline"
                onClick={handleCopy}
                className="w-full justify-start gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                onClick={handlePaste}
                disabled={clipboard.length === 0}
                className="w-full justify-start gap-2"
              >
                <Clipboard className="h-4 w-4" />
                Paste
              </Button>
              <Button
                variant="outline"
                onClick={handleGroup}
                className="w-full justify-start gap-2"
              >
                <GroupIcon className="h-4 w-4" />
                Group
              </Button>
              <Button
                variant="outline"
                onClick={handleUngroup}
                className="w-full justify-start gap-2"
              >
                <Ungroup className="h-4 w-4" />
                Ungroup
              </Button>
              <Button
                variant="outline"
                onClick={handleLock}
                className="w-full justify-start gap-2"
              >
                <Lock className="h-4 w-4" />
                Lock
              </Button>
              <Button
                variant="outline"
                onClick={handleUnlock}
                className="w-full justify-start gap-2"
              >
                <Unlock className="h-4 w-4" />
                Unlock
              </Button>
              <Button
                variant="outline"
                onClick={handleDeleteSelected}
                className="w-full justify-start gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Selected
              </Button>
              <Button
                variant="outline"
                onClick={handleClear}
                className="w-full justify-start gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Clear All
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Left Toolbar */}
      <div className="hidden md:flex flex-col w-16 bg-card border-r border-border shadow-sm">
        {/* Drawing Tools */}
        <div className="flex flex-col p-2 space-y-1">
          {tools.map(({ tool, label, icon: Icon }) => (
            <Button
              key={tool}
              variant={activeTool === tool ? "default" : "ghost"}
              size="icon"
              onClick={() => setActiveTool(tool)}
              title={label}
              className={cn(
                "h-12 w-12 rounded-lg",
                activeTool === tool && "shadow-md"
              )}
            >
              <Icon className="h-5 w-5" />
            </Button>
          ))}
        </div>

        <Separator className="my-2" />

        {/* Shapes */}
        <div className="flex flex-col p-2 space-y-1">
          {shapes.map(({ tool, label, icon: Icon }) => (
            <Button
              key={tool}
              variant="ghost"
              size="icon"
              onClick={() => handleToolClick(tool)}
              title={label}
              className="h-12 w-12 rounded-lg"
            >
              <Icon className="h-5 w-5" />
            </Button>
          ))}
        </div>

        <Separator className="my-2" />

        {/* Insert Tools */}
        <div className="flex flex-col p-2 space-y-1">
          {insertTools.map(({ tool, label, icon: Icon }) => (
            <Button
              key={tool}
              variant="ghost"
              size="icon"
              onClick={() => handleToolClick(tool)}
              title={label}
              className="h-12 w-12 rounded-lg"
            >
              <Icon className="h-5 w-5" />
            </Button>
          ))}
        </div>

        <div className="flex-1" />

        {/* Utility Actions */}
        <div className="flex flex-col p-2 space-y-1 border-t border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo"
            className="h-12 w-12 rounded-lg"
          >
            <CornerUpLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
            className="h-12 w-12 rounded-lg"
          >
            <CornerUpRight className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            title="Copy"
            className="h-12 w-12 rounded-lg"
          >
            <Copy className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePaste}
            disabled={clipboard.length === 0}
            title="Paste"
            className="h-12 w-12 rounded-lg"
          >
            <Clipboard className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleGroup}
            title="Group Objects"
            className="h-12 w-12 rounded-lg"
          >
            <GroupIcon className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUngroup}
            title="Ungroup Objects"
            className="h-12 w-12 rounded-lg"
          >
            <Ungroup className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteSelected}
            title="Delete Selected"
            className="h-12 w-12 rounded-lg"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="flex items-center justify-between px-2 md:px-4 py-2 md:py-3 bg-card border-b border-border shadow-sm overflow-x-auto">
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            {/* Color Palette */}
            {["pen", "highlighter", "text"].includes(activeTool) && (
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground hidden md:block" />
                <div className="flex gap-1">
                  {penColors.slice(0, 5).map(({ name, value }) => (
                    <button
                      key={value}
                      onClick={() => setPenColor(value)}
                      className={cn(
                        "w-6 h-6 md:w-7 md:h-7 rounded-full border-2 transition-all hover:scale-110",
                        penColor === value 
                          ? "border-foreground scale-110 shadow-md" 
                          : "border-border"
                      )}
                      style={{ backgroundColor: value }}
                      title={name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Pen Size - Desktop only */}
            {["pen", "highlighter", "eraser"].includes(activeTool) && (
              <>
                <Separator orientation="vertical" className="h-6 hidden md:block" />
                <div className="hidden md:flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Size:</span>
                  <div className="flex gap-1">
                    {[1, 2, 4, 6].map((size) => (
                      <button
                        key={size}
                        onClick={() => setPenSize(size)}
                        className={cn(
                          "w-7 h-7 rounded flex items-center justify-center transition-all",
                          penSize === size 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted hover:bg-muted/80"
                        )}
                      >
                        <div 
                          className="rounded-full bg-current"
                          style={{ 
                            width: `${size * 2}px`, 
                            height: `${size * 2}px` 
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:gap-2">
            {/* Grid Toggle */}
            <Button
              variant={showGrid ? "default" : "outline"}
              size="sm"
              onClick={() => setShowGrid(!showGrid)}
              className="gap-1 md:gap-2"
            >
              <Grid3x3 className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </Button>

            {/* Zoom Controls */}
            <Separator orientation="vertical" className="h-6 hidden md:block" />
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleZoom(-25)}
                disabled={zoom <= 25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs md:text-sm font-medium w-10 md:w-12 text-center">
                {zoom}%
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleZoom(25)}
                disabled={zoom >= 200}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>

            <Separator orientation="vertical" className="h-6 hidden md:block" />

            {/* Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
              title="Undo"
              className="gap-1 md:gap-2 hidden md:flex"
            >
              <CornerUpLeft className="h-4 w-4" />
              <span className="hidden lg:inline">Undo</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              title="Redo"
              className="gap-1 md:gap-2 hidden md:flex"
            >
              <CornerUpRight className="h-4 w-4" />
              <span className="hidden lg:inline">Redo</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGroup}
              className="gap-1 md:gap-2 hidden lg:flex"
            >
              <GroupIcon className="h-4 w-4" />
              <span>Group</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              className="gap-1 md:gap-2 hidden md:flex"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden lg:inline">Clear</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-1 md:gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleCreateCard}
              className="gap-1 md:gap-2"
            >
              <span className="hidden sm:inline">Save as Card</span>
              <span className="sm:hidden">Save</span>
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div 
          ref={containerRef}
          className="flex-1 relative overflow-hidden"
        >
          <canvas ref={canvasRef} className="absolute inset-0" />
          
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-center space-y-2">
                <Palette className="h-8 w-8 animate-pulse mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Initializing whiteboard...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfiniteWhiteboard;
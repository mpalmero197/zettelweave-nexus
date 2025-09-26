import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  ZoomOut,
  Edit3,
  Check,
  X,
  Image,
  Combine,
  Upload
} from "lucide-react";
import { ZettelCard as ZettelCardType } from "@/types/zettel";
import { toast } from "sonner";

interface MobileWhiteboardProps {
  onCreateCard: (card: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => void;
}

type Tool = "draw" | "erase" | "select" | "pan" | "edit" | "combine";

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

interface ImageElement {
  id: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DrawingObject {
  id: string;
  paths: Path[];
  images: ImageElement[];
  bounds: { x: number; y: number; width: number; height: number };
  position: { x: number; y: number };
  selected: boolean;
  editing: boolean;
}

interface DrawingState {
  objects: DrawingObject[];
  images: { [key: string]: HTMLImageElement };
  currentPath: Point[];
  currentObject: DrawingObject | null;
  scale: number;
  offsetX: number;
  offsetY: number;
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
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  
  const [drawingState, setDrawingState] = useState<DrawingState>({
    objects: [],
    images: {},
    currentPath: [],
    currentObject: null,
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });

  const [history, setHistory] = useState<DrawingState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const STORAGE_KEY = "mobile-whiteboard:state:v2";

  // Generate unique ID for objects
  const generateId = () => Math.random().toString(36).substr(2, 9);

  // Calculate bounding box for paths and images
  const calculateBounds = (paths: Path[], images: ImageElement[] = []) => {
    if (paths.length === 0 && images.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    paths.forEach(path => {
      path.points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    images.forEach(img => {
      minX = Math.min(minX, img.x);
      minY = Math.min(minY, img.y);
      maxX = Math.max(maxX, img.x + img.width);
      maxY = Math.max(maxY, img.y + img.height);
    });
    
    const padding = 10;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + padding * 2,
      height: maxY - minY + padding * 2
    };
  };

  // Check if point is inside object bounds
  const isPointInObject = (point: Point, obj: DrawingObject): boolean => {
    const bounds = {
      x: obj.position.x,
      y: obj.position.y,
      width: obj.bounds.width,
      height: obj.bounds.height
    };
    
    return point.x >= bounds.x && 
           point.x <= bounds.x + bounds.width &&
           point.y >= bounds.y && 
           point.y <= bounds.y + bounds.height;
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctxRef.current = ctx;

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
      newHistory.push(JSON.parse(JSON.stringify(drawingState)));
      return newHistory.slice(-20);
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

    // Draw all objects
    drawingState.objects.forEach(obj => {
      ctx.save();
      ctx.translate(obj.position.x, obj.position.y);
      
      // Draw object paths and images
      obj.paths.forEach(path => {
        if (path.points.length < 2) return;
        
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width;
        ctx.globalCompositeOperation = path.tool === 'erase' ? 'destination-out' : 'source-over';
        
        ctx.beginPath();
        const firstPoint = path.points[0];
        ctx.moveTo(firstPoint.x - obj.bounds.x, firstPoint.y - obj.bounds.y);
        
        for (let i = 1; i < path.points.length; i++) {
          const point = path.points[i];
          ctx.lineTo(point.x - obj.bounds.x, point.y - obj.bounds.y);
        }
        
        ctx.stroke();
      });

      // Draw images
      obj.images.forEach(imgElement => {
        const img = drawingState.images[imgElement.id];
        if (img && img.complete) {
          ctx.drawImage(
            img,
            imgElement.x - obj.bounds.x,
            imgElement.y - obj.bounds.y,
            imgElement.width,
            imgElement.height
          );
        }
      });
      
      // Draw selection/edit outline
      if (obj.selected || obj.editing) {
        ctx.strokeStyle = obj.editing ? "#00ff00" : "#0066ff";
        ctx.lineWidth = 2 / drawingState.scale;
        ctx.setLineDash([5, 5]);
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeRect(0, 0, obj.bounds.width, obj.bounds.height);
        ctx.setLineDash([]);
        
        // Draw edit indicator
        if (obj.editing) {
          ctx.fillStyle = "#00ff00";
          ctx.fillRect(obj.bounds.width - 15, -15, 15, 15);
          ctx.fillStyle = "#ffffff";
          ctx.font = "10px Arial";
          ctx.fillText("✓", obj.bounds.width - 12, -5);
        }
      }
      
      ctx.restore();
    });

    // Draw current path while drawing
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
    const point = getEventPoint(e);
    
    if (activeTool === "pan" || ('touches' in e && e.touches.length === 2)) {
      setIsPanning(true);
      return;
    }

    if (activeTool === "select") {
      // Check if clicking on an object
      const clickedObject = drawingState.objects.find(obj => isPointInObject(point, obj));
      
      if (clickedObject) {
        // Select object and start dragging
        setDrawingState(prev => ({
          ...prev,
          objects: prev.objects.map(obj => ({
            ...obj,
            selected: obj.id === clickedObject.id,
            editing: false
          }))
        }));
        setIsDragging(true);
        setDragStart(point);
      } else {
        // Deselect all objects
        setDrawingState(prev => ({
          ...prev,
          objects: prev.objects.map(obj => ({ ...obj, selected: false, editing: false }))
        }));
      }
      return;
    }

    if (activeTool === "combine") {
      const selectedObjects = drawingState.objects.filter(obj => obj.selected);
      if (selectedObjects.length >= 2) {
        combineSelectedObjects();
      } else {
        toast("Select at least 2 objects to combine");
      }
      return;
    }

    if (activeTool === "edit") {
      const clickedObject = drawingState.objects.find(obj => isPointInObject(point, obj));
      
      if (clickedObject) {
        // Enter edit mode
        setDrawingState(prev => ({
          ...prev,
          objects: prev.objects.map(obj => ({
            ...obj,
            selected: false,
            editing: obj.id === clickedObject.id
          })),
          currentObject: clickedObject
        }));
        setActiveTool("draw");
        toast("Edit mode: Draw to modify object. Click check to finish.");
      }
      return;
    }

    if (activeTool === "draw" || activeTool === "erase") {
      setIsDrawing(true);
      
      // Check if drawing in edit mode
      if (drawingState.currentObject && drawingState.currentObject.editing) {
        setDrawingState(prev => ({
          ...prev,
          currentPath: [point]
        }));
      } else {
        setDrawingState(prev => ({
          ...prev,
          currentPath: [point]
        }));
      }
    }
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const point = getEventPoint(e);

    if (isPanning && 'touches' in e && e.touches.length === 2) {
      // Handle pinch zoom
      return;
    }

    if (isDragging && dragStart) {
      // Move selected object
      const deltaX = point.x - dragStart.x;
      const deltaY = point.y - dragStart.y;
      
      setDrawingState(prev => ({
        ...prev,
        objects: prev.objects.map(obj => 
          obj.selected 
            ? { ...obj, position: { x: obj.position.x + deltaX, y: obj.position.y + deltaY } }
            : obj
        )
      }));
      
      setDragStart(point);
      return;
    }

    if (isDrawing && (activeTool === "draw" || activeTool === "erase")) {
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

    if (isDragging) {
      setIsDragging(false);
      setDragStart(null);
      saveToHistory();
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

        if (drawingState.currentObject && drawingState.currentObject.editing) {
          // Add path to existing object being edited
          setDrawingState(prev => {
            const updatedObjects = prev.objects.map(obj => 
              obj.id === prev.currentObject!.id 
                ? { ...obj, paths: [...obj.paths, newPath] }
                : obj
            );
            
            // Recalculate bounds for the edited object
            const editedObj = updatedObjects.find(obj => obj.id === prev.currentObject!.id);
            if (editedObj) {
              const newBounds = calculateBounds(editedObj.paths, editedObj.images);
              const deltaX = newBounds.x - editedObj.bounds.x;
              const deltaY = newBounds.y - editedObj.bounds.y;
              
              editedObj.bounds = newBounds;
              editedObj.position = {
                x: editedObj.position.x + deltaX,
                y: editedObj.position.y + deltaY
              };
              
              // Adjust all path points relative to new bounds
              editedObj.paths = editedObj.paths.map(path => ({
                ...path,
                points: path.points.map(point => ({
                  ...point,
                  x: point.x - deltaX,
                  y: point.y - deltaY
                }))
              }));
            }
            
            return {
              ...prev,
              objects: updatedObjects,
              currentPath: []
            };
          });
        } else {
          // Create new object
          const bounds = calculateBounds([newPath]);
          const newObject: DrawingObject = {
            id: generateId(),
            paths: [newPath],
            images: [],
            bounds,
            position: { x: bounds.x, y: bounds.y },
            selected: false,
            editing: false
          };

          setDrawingState(prev => ({
            ...prev,
            objects: [...prev.objects, newObject],
            currentPath: []
          }));
        }

        saveToHistory();
      } else {
        setDrawingState(prev => ({
          ...prev,
          currentPath: []
        }));
      }
    }
  };

  const combineSelectedObjects = () => {
    const selectedObjects = drawingState.objects.filter(obj => obj.selected);
    if (selectedObjects.length < 2) return;

    // Combine all paths and images
    const allPaths: Path[] = [];
    const allImages: ImageElement[] = [];

    selectedObjects.forEach(obj => {
      // Adjust paths to global coordinates
      const adjustedPaths = obj.paths.map(path => ({
        ...path,
        points: path.points.map(point => ({
          ...point,
          x: point.x + obj.position.x - obj.bounds.x,
          y: point.y + obj.position.y - obj.bounds.y
        }))
      }));
      
      // Adjust images to global coordinates
      const adjustedImages = obj.images.map(img => ({
        ...img,
        x: img.x + obj.position.x - obj.bounds.x,
        y: img.y + obj.position.y - obj.bounds.y
      }));

      allPaths.push(...adjustedPaths);
      allImages.push(...adjustedImages);
    });

    // Create combined object
    const bounds = calculateBounds(allPaths, allImages);
    const combinedObject: DrawingObject = {
      id: generateId(),
      paths: allPaths,
      images: allImages,
      bounds,
      position: { x: bounds.x, y: bounds.y },
      selected: true,
      editing: false
    };

    setDrawingState(prev => ({
      ...prev,
      objects: [
        ...prev.objects.filter(obj => !obj.selected),
        combinedObject
      ]
    }));

    saveToHistory();
    toast("Objects combined successfully!");
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const imgId = generateId();
        const imgElement: ImageElement = {
          id: imgId,
          src: e.target?.result as string,
          x: 100,
          y: 100,
          width: Math.min(img.width, 300),
          height: Math.min(img.height, 300)
        };

        // Create new object with image
        const bounds = calculateBounds([], [imgElement]);
        const newObject: DrawingObject = {
          id: generateId(),
          paths: [],
          images: [imgElement],
          bounds,
          position: { x: bounds.x, y: bounds.y },
          selected: true,
          editing: false
        };

        setDrawingState(prev => ({
          ...prev,
          objects: [...prev.objects, newObject],
          images: { ...prev.images, [imgId]: img }
        }));

        saveToHistory();
        toast("Image added to whiteboard!");
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const finishEditing = () => {
    setDrawingState(prev => ({
      ...prev,
      objects: prev.objects.map(obj => ({ ...obj, editing: false })),
      currentObject: null
    }));
    setActiveTool("select");
    saveToHistory();
    toast("Edit complete!");
  };

  const cancelEditing = () => {
    setDrawingState(prev => ({
      ...prev,
      objects: prev.objects.map(obj => ({ ...obj, editing: false })),
      currentObject: null
    }));
    setActiveTool("select");
    toast("Edit cancelled");
  };

  const deleteSelected = () => {
    setDrawingState(prev => ({
      ...prev,
      objects: prev.objects.filter(obj => !obj.selected)
    }));
    saveToHistory();
    toast("Object deleted");
  };

  const handleClear = () => {
    setDrawingState(prev => ({
      ...prev,
      objects: [],
      images: {},
      currentPath: [],
      currentObject: null
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
    { tool: "select" as const, label: "Select", icon: Move },
    { tool: "edit" as const, label: "Edit", icon: Edit3 },
    { tool: "combine" as const, label: "Combine", icon: Combine },
    { tool: "pan" as const, label: "Pan", icon: Square },
  ];

  const isEditing = drawingState.objects.some(obj => obj.editing);
  const hasSelected = drawingState.objects.some(obj => obj.selected);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5" />
            Mobile Whiteboard
            {isEditing && <span className="text-sm text-green-600">(Editing)</span>}
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
                disabled={isEditing && tool !== "draw" && tool !== "erase"}
              >
                <Icon className="h-4 w-4 mr-1" />
                {label}
              </Button>
            ))}
          </div>

          {/* Edit Mode Controls */}
          {isEditing && (
            <div className="flex gap-2 p-2 bg-green-50 rounded-lg">
              <Button size="sm" onClick={finishEditing} className="flex-1">
                <Check className="h-4 w-4 mr-1" />
                Finish Edit
              </Button>
              <Button variant="outline" size="sm" onClick={cancelEditing}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          )}

          {/* Selection Controls */}
          {hasSelected && !isEditing && (
            <div className="flex gap-2 p-2 bg-blue-50 rounded-lg">
              <Button variant="destructive" size="sm" onClick={deleteSelected}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Selected
              </Button>
            </div>
          )}

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
                  disabled={isEditing && activeTool !== "draw" && activeTool !== "erase"}
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
                  disabled={isEditing && activeTool !== "draw" && activeTool !== "erase"}
                >
                  {size}px
                </Button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={handleUndo} disabled={isEditing}>
              <Undo className="h-4 w-4 mr-1" />
              Undo
            </Button>
            <Button variant="outline" size="sm" onClick={handleRedo} disabled={isEditing}>
              <Redo className="h-4 w-4 mr-1" />
              Redo
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={isEditing}>
              <ZoomIn className="h-4 w-4 mr-1" />
              Zoom+
            </Button>
            <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={isEditing}>
              <ZoomOut className="h-4 w-4 mr-1" />
              Zoom-
            </Button>
            <Button variant="outline" size="sm" onClick={handleClear} disabled={isEditing}>
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => document.getElementById('image-upload')?.click()}
              className="flex-1"
              disabled={isEditing}
            >
              <Image className="h-4 w-4 mr-1" />
              Add Image
            </Button>
            <Button variant="outline" size="sm" onClick={handleCreateCard} className="flex-1" disabled={isEditing}>
              <Plus className="h-4 w-4 mr-1" />
              Create Card
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="flex-1" disabled={isEditing}>
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
              className="w-full h-full"
              onTouchStart={handleStart}
              onTouchMove={handleMove}
              onTouchEnd={handleEnd}
              onMouseDown={handleStart}
              onMouseMove={handleMove}
              onMouseUp={handleEnd}
              onMouseLeave={handleEnd}
              style={{ 
                touchAction: 'none',
                cursor: activeTool === "draw" ? "crosshair" : 
                       activeTool === "erase" ? "grab" :
                       activeTool === "select" ? "pointer" :
                       activeTool === "edit" ? "pointer" : "move"
              }}
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>Draw to create objects. Select multiple and use Combine to merge them.</p>
            <p>Use Add Image to import pictures. Use Edit to modify existing objects.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
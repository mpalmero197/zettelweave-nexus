import React, { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { MousePointer2, Pen, Eraser, Combine, Edit, Move, RotateCcw, Download, Upload, Trash2, Palette, ImageIcon, FileText } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { FileUploadDialog } from "./FileUploadDialog";
import { DocumentViewer } from "./DocumentViewer";

interface Point {
  x: number;
  y: number;
}

interface DrawingTool {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface DrawingPath {
  id: string;
  points: Point[];
  color: string;
  width: number;
}

interface ImageElement {
  id: string;
  position: Point;
  width: number;
  height: number;
}

interface DocumentElement {
  id: string;
  file: File;
  position: Point;
  width: number;
  height: number;
}

interface DrawingObject {
  id: string;
  paths: DrawingPath[];
  images: ImageElement[];
  documents: DocumentElement[];
  position: Point;
  bounds: { x: number; y: number; width: number; height: number };
  selected: boolean;
  editing: boolean;
}

interface DrawingState {
  objects: DrawingObject[];
  images: Record<string, HTMLImageElement>;
  documents: Record<string, File>;
  currentPath: Point[];
  currentObject: DrawingObject | null;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const MobileWhiteboard = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTool, setActiveTool] = useState<"select" | "draw" | "erase" | "combine" | "edit" | "pan">("draw");
  const [activeColor, setActiveColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Point>({ x: 0, y: 0 });
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [isMultiSelecting, setIsMultiSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{ file: File; element: DocumentElement } | null>(null);

  const [drawingState, setDrawingState] = useState<DrawingState>({
    objects: [],
    images: {},
    documents: {},
    currentPath: [],
    currentObject: null,
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });

  const tools: DrawingTool[] = [
    { id: "select", name: "Select", icon: <MousePointer2 className="h-4 w-4" /> },
    { id: "draw", name: "Draw", icon: <Pen className="h-4 w-4" /> },
    { id: "erase", name: "Erase", icon: <Eraser className="h-4 w-4" /> },
    { id: "combine", name: "Combine", icon: <Combine className="h-4 w-4" /> },
    { id: "edit", name: "Edit", icon: <Edit className="h-4 w-4" /> },
    { id: "pan", name: "Pan", icon: <Move className="h-4 w-4" /> },
  ];

  const STORAGE_KEY = "whiteboard-data";

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drawingState));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }, [drawingState]);

  // Load state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const validState: DrawingState = {
          objects: parsed.objects || [],
          images: parsed.images || {},
          documents: parsed.documents || {},
          currentPath: parsed.currentPath || [],
          currentObject: parsed.currentObject || null,
          scale: parsed.scale || 1,
          offsetX: parsed.offsetX || 0,
          offsetY: parsed.offsetY || 0
        };
        setDrawingState(validState);
        toast("Whiteboard restored!");
      }
    } catch (e) {
      console.warn('Failed to load from localStorage:', e);
    }
  }, []);

  const calculateBounds = (paths: DrawingPath[]) => {
    if (paths.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    paths.forEach(path => {
      path.points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });
    
    return {
      x: minX - 10,
      y: minY - 10,
      width: maxX - minX + 20,
      height: maxY - minY + 20
    };
  };

  const drawOnCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('drawOnCanvas: Canvas ref not available');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('drawOnCanvas: Could not get 2D context');
      return;
    }

    console.log('Drawing on canvas, size:', canvas.width, canvas.height);

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transformations
    ctx.save();
    ctx.translate(drawingState.offsetX, drawingState.offsetY);
    ctx.scale(drawingState.scale, drawingState.scale);

    // Draw all objects - add safety check
    if (drawingState.objects && Array.isArray(drawingState.objects)) {
      drawingState.objects.forEach(obj => {
        ctx.save();
        ctx.translate(obj.position.x, obj.position.y);
      
        // Draw object paths and images - add safety checks
        if (obj.paths && Array.isArray(obj.paths)) {
          obj.paths.forEach(path => {
        if (path.points.length < 2) return;
        
        ctx.strokeStyle = path.color;
        ctx.lineWidth = path.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(path.points[0].x, path.points[0].y);
        
        for (let i = 1; i < path.points.length; i++) {
          ctx.lineTo(path.points[i].x, path.points[i].y);
        }
        
        ctx.stroke();
          });
        }

        // Draw images - add safety check
        if (obj.images && Array.isArray(obj.images)) {
          obj.images.forEach(imgElement => {
        const img = drawingState.images[imgElement.id];
        if (img && img.complete) {
          ctx.drawImage(
            img,
            imgElement.position.x,
            imgElement.position.y,
            imgElement.width,
            imgElement.height
          );
        }
          });
        }

        // Draw document icons - add safety check
        if (obj.documents && Array.isArray(obj.documents)) {
          obj.documents.forEach(docElement => {
            const iconSize = 48;
            const x = docElement.position.x;
            const y = docElement.position.y;
            
            // Draw document icon background
            ctx.fillStyle = 'hsl(var(--card))';
            ctx.fillRect(x, y, iconSize, iconSize);
            ctx.strokeStyle = 'hsl(var(--border))';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, iconSize, iconSize);
            
            // Draw document icon
            ctx.fillStyle = 'hsl(var(--muted-foreground))';
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('📄', x + iconSize/2, y + iconSize/2 + 8);
            
            // Draw filename
            ctx.font = '10px sans-serif';
            ctx.fillStyle = 'hsl(var(--foreground))';
            const maxWidth = iconSize + 20;
            const fileName = docElement.file.name.length > 12 ? 
              docElement.file.name.substring(0, 12) + '...' : 
              docElement.file.name;
            ctx.fillText(fileName, x + iconSize/2, y + iconSize + 12);
          });
        }
      
      // Draw selection/edit outline
      if (obj.selected || obj.editing) {
        ctx.strokeStyle = obj.editing ? '#10b981' : '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(
          obj.bounds.x - 5,
          obj.bounds.y - 5,
          obj.bounds.width + 10,
          obj.bounds.height + 10
        );
        ctx.setLineDash([]);
        
        // Draw editing indicator
        if (obj.editing) {
          ctx.fillStyle = '#10b981';
          ctx.font = '16px sans-serif';
          ctx.fillText("✓", obj.bounds.width - 12, -5);
        }
      }
        
        ctx.restore();
      });
    }

    // Draw marquee selection box
    if (isMultiSelecting && selectionBox) {
      const box = selectionBox;
      const x = Math.min(box.startX, box.endX);
      const y = Math.min(box.startY, box.endY);
      const width = Math.abs(box.endX - box.startX);
      const height = Math.abs(box.endY - box.startY);
      
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.strokeStyle = 'hsl(var(--primary))';
      ctx.fillStyle = 'hsl(var(--primary) / 0.1)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      const screenX = x * drawingState.scale + drawingState.offsetX;
      const screenY = y * drawingState.scale + drawingState.offsetY;
      const screenWidth = width * drawingState.scale;
      const screenHeight = height * drawingState.scale;
      
      ctx.fillRect(screenX, screenY, screenWidth, screenHeight);
      ctx.strokeRect(screenX, screenY, screenWidth, screenHeight);
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Draw current path while drawing
    if (drawingState.currentPath.length > 1) {
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(drawingState.currentPath[0].x, drawingState.currentPath[0].y);
      
      for (let i = 1; i < drawingState.currentPath.length; i++) {
        ctx.lineTo(drawingState.currentPath[i].x, drawingState.currentPath[i].y);
      }
      
      ctx.stroke();
    }

    ctx.restore();
  }, [drawingState, activeColor, brushSize, isMultiSelecting, selectionBox]);

  useEffect(() => {
    drawOnCanvas();
  }, [drawOnCanvas]);

  const getEventPoint = (e: React.TouchEvent | React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: (clientX - rect.left - drawingState.offsetX) / drawingState.scale,
      y: (clientY - rect.top - drawingState.offsetY) / drawingState.scale
    };
  };

  const isPointInObject = (point: Point, obj: DrawingObject): boolean => {
    const objBounds = {
      x: obj.position.x + obj.bounds.x,
      y: obj.position.y + obj.bounds.y,
      width: obj.bounds.width,
      height: obj.bounds.height
    };

    if (obj.documents) {
      for (const doc of obj.documents) {
        if (point.x >= doc.position.x && point.x <= doc.position.x + doc.width &&
            point.y >= doc.position.y && point.y <= doc.position.y + doc.height) {
          return true;
        }
      }
    }

    return point.x >= objBounds.x && point.x <= objBounds.x + objBounds.width &&
           point.y >= objBounds.y && point.y <= objBounds.y + objBounds.height;
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const point = getEventPoint(e);
    
    if (activeTool === "pan" || ('touches' in e && e.touches.length === 2)) {
      setIsPanning(true);
      return;
    }

    if (activeTool === "select") {
      const clickedObject = drawingState.objects.find(obj => isPointInObject(point, obj));
      
      if (clickedObject) {
        const clickedDoc = clickedObject.documents?.find(doc => 
          point.x >= doc.position.x && point.x <= doc.position.x + doc.width &&
          point.y >= doc.position.y && point.y <= doc.position.y + doc.height
        );
        
        if (clickedDoc) {
          setViewingDocument({ file: clickedDoc.file, element: clickedDoc });
          return;
        }
        
        const isAlreadySelected = clickedObject.selected;
        
        setDrawingState(prev => ({
          ...prev,
          objects: prev.objects.map(obj => ({
            ...obj,
            selected: obj.id === clickedObject.id || (isAlreadySelected && obj.selected),
            editing: false
          }))
        }));
        setIsDragging(true);
        setDragStart(point);
      } else {
        setIsMultiSelecting(true);
        setSelectionBox({
          startX: point.x,
          startY: point.y,
          endX: point.x,
          endY: point.y
        });
        setDragStart(point);
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
      return;
    }

    if (isPanning && lastTouchDistance && 'touches' in e && e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.sqrt(
        Math.pow(touch1.clientX - touch2.clientX, 2) + 
        Math.pow(touch1.clientY - touch2.clientY, 2)
      );
      
      const scale = currentDistance / lastTouchDistance;
      setDrawingState(prev => ({
        ...prev,
        scale: Math.min(Math.max(prev.scale * scale, 0.5), 3)
      }));
      
      setLastTouchDistance(currentDistance);
      return;
    }

    if (isMultiSelecting && selectionBox) {
      setSelectionBox(prev => prev ? {
        ...prev,
        endX: point.x,
        endY: point.y
      } : null);
      return;
    }

    if (isPanning) {
      const deltaX = point.x - dragStart.x;
      const deltaY = point.y - dragStart.y;
      
      setDrawingState(prev => ({
        ...prev,
        offsetX: prev.offsetX + deltaX * drawingState.scale,
        offsetY: prev.offsetY + deltaY * drawingState.scale
      }));
      return;
    }

    if (isDragging && activeTool === "select") {
      const deltaX = point.x - dragStart.x;
      const deltaY = point.y - dragStart.y;
      
      setDrawingState(prev => ({
        ...prev,
        objects: prev.objects.map(obj => 
          obj.selected ? {
            ...obj,
            position: {
              x: obj.position.x + deltaX,
              y: obj.position.y + deltaY
            }
          } : obj
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

  const handleEnd = () => {
    setIsDrawing(false);
    setIsPanning(false);
    setIsDragging(false);
    setLastTouchDistance(null);
    
    if (isMultiSelecting && selectionBox) {
      const box = selectionBox;
      const minX = Math.min(box.startX, box.endX);
      const maxX = Math.max(box.startX, box.endX);
      const minY = Math.min(box.startY, box.endY);
      const maxY = Math.max(box.startY, box.endY);
      
      setDrawingState(prev => ({
        ...prev,
        objects: prev.objects.map(obj => ({
          ...obj,
          selected: (
            obj.position.x + obj.bounds.x >= minX &&
            obj.position.x + obj.bounds.x + obj.bounds.width <= maxX &&
            obj.position.y + obj.bounds.y >= minY &&
            obj.position.y + obj.bounds.y + obj.bounds.height <= maxY
          ) || obj.selected,
          editing: false
        }))
      }));
      
      setIsMultiSelecting(false);
      setSelectionBox(null);
      return;
    }
    
    if (drawingState.currentPath.length > 1) {
      const newPath: DrawingPath = {
        id: Date.now().toString(),
        points: [...drawingState.currentPath],
        color: activeColor,
        width: brushSize
      };

      if (drawingState.currentObject && drawingState.currentObject.editing) {
        setDrawingState(prev => ({
          ...prev,
          objects: prev.objects.map(obj => 
            obj.id === prev.currentObject?.id 
              ? { ...obj, paths: [...obj.paths, newPath] }
              : obj
          ),
          currentPath: []
        }));
      } else {
        const newObject: DrawingObject = {
          id: Date.now().toString(),
          paths: [newPath],
          images: [],
          documents: [],
          position: { x: 0, y: 0 },
          bounds: calculateBounds([newPath]),
          selected: false,
          editing: false
        };

        setDrawingState(prev => ({
          ...prev,
          objects: [...prev.objects, newObject],
          currentPath: []
        }));
      }
    }
  };

  const combineSelectedObjects = () => {
    const selectedObjects = drawingState.objects.filter(obj => obj.selected);
    if (selectedObjects.length < 2) return;

    const allPaths = selectedObjects.flatMap(obj => obj.paths);
    const allImages = selectedObjects.flatMap(obj => obj.images);
    const allDocuments = selectedObjects.flatMap(obj => obj.documents || []);
    
    const mergedObject: DrawingObject = {
      id: Date.now().toString(),
      paths: allPaths,
      images: allImages,
      documents: allDocuments,
      position: { x: 0, y: 0 },
      bounds: calculateBounds(allPaths),
      selected: true,
      editing: false
    };

    setDrawingState(prev => ({
      ...prev,
      objects: [
        ...prev.objects.filter(obj => !obj.selected),
        mergedObject
      ]
    }));

    toast("Objects combined!");
  };

  const addImageToCanvas = (file: File) => {
    const img = new Image();
    const imageId = Date.now().toString();
    
    img.onload = () => {
      const imageElement: ImageElement = {
        id: imageId,
        position: { x: 50, y: 50 },
        width: Math.min(img.width, 200),
        height: Math.min(img.height, 200)
      };

      const newObject: DrawingObject = {
        id: Date.now().toString(),
        paths: [],
        images: [imageElement],
        documents: [],
        position: { x: 0, y: 0 },
        bounds: { 
          x: imageElement.position.x, 
          y: imageElement.position.y, 
          width: imageElement.width, 
          height: imageElement.height 
        },
        selected: false,
        editing: false
      };

      setDrawingState(prev => ({
        ...prev,
        objects: [...prev.objects, newObject],
        images: { ...prev.images, [imageId]: img }
      }));

      toast("Image added to canvas!");
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addDocumentToCanvas = (file: File) => {
    const documentId = Date.now().toString();
    const iconSize = 48;
    
    const documentElement: DocumentElement = {
      id: documentId,
      file,
      position: { x: 50, y: 50 },
      width: iconSize,
      height: iconSize
    };

    const newObject: DrawingObject = {
      id: Date.now().toString(),
      paths: [],
      images: [],
      documents: [documentElement],
      position: { x: 0, y: 0 },
      bounds: { 
        x: documentElement.position.x, 
        y: documentElement.position.y, 
        width: documentElement.width, 
        height: documentElement.height 
      },
      selected: false,
      editing: false
    };

    setDrawingState(prev => ({
      ...prev,
      objects: [...prev.objects, newObject],
      documents: { ...prev.documents, [documentId]: file }
    }));

    toast("Document added to canvas!");
  };

  const exportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
    toast("Canvas exported!");
  };

  const clearCanvas = () => {
    setDrawingState({
      objects: [],
      images: {},
      documents: {},
      currentPath: [],
      currentObject: null,
      scale: 1,
      offsetX: 0,
      offsetY: 0
    });
    toast("Canvas cleared!");
  };

  const resetView = () => {
    setDrawingState(prev => ({
      ...prev,
      scale: 1,
      offsetX: 0,
      offsetY: 0
    }));
    toast("View reset!");
  };

  const finishEditing = () => {
    setDrawingState(prev => ({
      ...prev,
      objects: prev.objects.map(obj => ({ ...obj, editing: false })),
      currentObject: null
    }));
    setActiveTool("select");
    toast("Editing finished!");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('Canvas ref not available');
      return;
    }

    const updateCanvasSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.log('Canvas has zero dimensions, retrying...');
        setTimeout(updateCanvasSize, 100);
        return;
      }
      
      console.log('Setting canvas size:', rect.width, rect.height);
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        drawOnCanvas(); // Redraw after resizing
      }
    };

    // Initial size setup with delay to ensure DOM is ready
    setTimeout(updateCanvasSize, 100);
    window.addEventListener('resize', updateCanvasSize);
    
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [drawOnCanvas]);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full touch-none cursor-crosshair"
          style={{ cursor: activeTool === "pan" ? "grab" : "crosshair" }}
          onMouseDown={handleStart}
          onMouseMove={handleMove}
          onMouseUp={handleEnd}
          onTouchStart={handleStart}
          onTouchMove={handleMove}
          onTouchEnd={handleEnd}
        />
        
        {drawingState.objects.some(obj => obj.editing) && (
          <Button
            className="absolute top-4 right-4 z-10"
            onClick={finishEditing}
            size="sm"
          >
            ✓ Finish Edit
          </Button>
        )}
        
        <div className="absolute top-4 left-4 z-10">
          <div className="text-xs text-muted-foreground bg-card px-2 py-1 rounded border">
            Zoom: {Math.round(drawingState.scale * 100)}%
          </div>
        </div>
      </div>

      <div className="border-t border-border bg-card">
        <div className="flex items-center justify-between p-2">
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                  <div 
                    className="w-4 h-4 rounded border" 
                    style={{ backgroundColor: activeColor }}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-3">
                <HexColorPicker color={activeColor} onChange={setActiveColor} />
              </PopoverContent>
            </Popover>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Size:</span>
              <div className="w-20">
                <Slider
                  value={[brushSize]}
                  onValueChange={(values) => setBrushSize(values[0])}
                  max={20}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
              <span className="text-xs text-muted-foreground w-6">{brushSize}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={resetView} className="h-8 px-2">
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={exportCanvas} className="h-8 px-2">
              <Download className="h-3 w-3" />
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="outline" size="sm" className="h-8 px-2 text-destructive">
                  <Trash2 className="h-3 w-3" />
                </Button>
              }
              title="Clear Canvas"
              description="Are you sure you want to clear all drawings? This action cannot be undone."
              onConfirm={clearCanvas}
              confirmText="Clear All"
              variant="destructive"
            />
          </div>
        </div>

        <Separator />
        
        <div className="flex flex-wrap gap-2 p-4 bg-card border-t border-border">
          {tools.map((tool) => (
            <Button
              key={tool.id}
              variant={activeTool === tool.id ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTool(tool.id as any)}
              className="h-10 min-w-[60px]"
            >
              {tool.icon}
              <span className="ml-1 text-xs">{tool.name}</span>
            </Button>
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImageUpload(true)}
            className="h-10 min-w-[60px]"
          >
            <ImageIcon className="h-4 w-4" />
            <span className="ml-1 text-xs">Image</span>
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDocumentUpload(true)}
            className="h-10 min-w-[60px]"
          >
            <FileText className="h-4 w-4" />
            <span className="ml-1 text-xs">Doc</span>
          </Button>
        </div>
      </div>

      {showImageUpload && (
        <FileUploadDialog
          title="Upload Image"
          accept="image/*"
          onUpload={(files) => {
            if (files.length > 0) {
              addImageToCanvas(files[0]);
            }
            setShowImageUpload(false);
          }}
          onClose={() => setShowImageUpload(false)}
        />
      )}

      {showDocumentUpload && (
        <FileUploadDialog
          title="Upload Document"
          accept=".pdf,.doc,.docx,.txt,.md,.rtf"
          onUpload={(files) => {
            if (files.length > 0) {
              addDocumentToCanvas(files[0]);
            }
            setShowDocumentUpload(false);
          }}
          onClose={() => setShowDocumentUpload(false)}
        />
      )}

      {viewingDocument && (
        <DocumentViewer
          file={viewingDocument.file}
          onClose={() => setViewingDocument(null)}
          onSave={(content) => {
            const blob = new Blob([content], { type: viewingDocument.file.type });
            const updatedFile = new File([blob], viewingDocument.file.name, { type: viewingDocument.file.type });
            
            setDrawingState(prev => ({
              ...prev,
              documents: { ...prev.documents, [viewingDocument.element.id]: updatedFile }
            }));
          }}
        />
      )}
    </div>
  );
};

export default MobileWhiteboard;
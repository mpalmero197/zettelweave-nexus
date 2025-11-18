import { useState, useEffect, useCallback, RefObject } from 'react';
import { useIsMobile } from './use-mobile';

interface Position {
  x: number;
  y: number;
}

interface DraggableOptions {
  onDragStart?: () => void;
  onDrag?: (position: Position) => void;
  onDragEnd?: (position: Position) => void;
  disabled?: boolean;
  bounds?: 'parent' | { left?: number; top?: number; right?: number; bottom?: number };
}

export function useDraggable(
  elementRef: RefObject<HTMLElement>,
  options: DraggableOptions = {}
) {
  const isMobile = useIsMobile();
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [startPosition, setStartPosition] = useState<Position>({ x: 0, y: 0 });

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (options.disabled) return;
    
    setIsDragging(true);
    setStartPosition({ x: clientX - position.x, y: clientY - position.y });
    options.onDragStart?.();
  }, [options, position]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || options.disabled) return;

    let newX = clientX - startPosition.x;
    let newY = clientY - startPosition.y;

    // Apply bounds if specified
    if (options.bounds && elementRef.current) {
      const element = elementRef.current;
      const parent = element.parentElement;

      if (options.bounds === 'parent' && parent) {
        const parentRect = parent.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();
        
        newX = Math.max(0, Math.min(newX, parentRect.width - elementRect.width));
        newY = Math.max(0, Math.min(newY, parentRect.height - elementRect.height));
      } else if (typeof options.bounds === 'object') {
        const bounds = options.bounds;
        if (bounds.left !== undefined) newX = Math.max(bounds.left, newX);
        if (bounds.right !== undefined) newX = Math.min(bounds.right, newX);
        if (bounds.top !== undefined) newY = Math.max(bounds.top, newY);
        if (bounds.bottom !== undefined) newY = Math.min(bounds.bottom, newY);
      }
    }

    const newPosition = { x: newX, y: newY };
    setPosition(newPosition);
    options.onDrag?.(newPosition);
  }, [isDragging, startPosition, options, elementRef]);

  const handleEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    options.onDragEnd?.(position);
  }, [isDragging, position, options]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || options.disabled) return;

    // Mouse events for desktop
    const handleMouseDown = (e: MouseEvent) => {
      // Only allow dragging from specific handle or the whole element
      const target = e.target as HTMLElement;
      if (target.closest('.drag-handle') || !element.querySelector('.drag-handle')) {
        e.preventDefault();
        handleStart(e.clientX, e.clientY);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      handleEnd();
    };

    // Touch events for mobile
    const handleTouchStart = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.drag-handle') || !element.querySelector('.drag-handle')) {
        const touch = e.touches[0];
        handleStart(touch.clientX, touch.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault(); // Prevent scrolling while dragging
        const touch = e.touches[0];
        handleMove(touch.clientX, touch.clientY);
      }
    };

    const handleTouchEnd = () => {
      handleEnd();
    };

    // Add event listeners
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('touchstart', handleTouchStart, { passive: false });

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, isDragging, handleStart, handleMove, handleEnd, options.disabled]);

  return {
    isDragging,
    position,
    setPosition,
    style: {
      transform: `translate(${position.x}px, ${position.y}px)`,
      cursor: isDragging ? 'grabbing' : isMobile ? 'grab' : 'move',
      touchAction: 'none',
      userSelect: isDragging ? 'none' : 'auto',
    } as React.CSSProperties,
  };
}

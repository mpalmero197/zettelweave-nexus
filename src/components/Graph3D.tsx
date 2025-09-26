import { useEffect, useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line } from '@react-three/drei';
import * as THREE from 'three';
import { ZettelCard } from '@/types/zettel';
import { getCategoryInfo } from '@/utils/deweySystem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RotateCcw, Eye, EyeOff } from 'lucide-react';

interface Graph3DProps {
  cards: ZettelCard[];
  onCardSelect?: (card: ZettelCard) => void;
  className?: string;
}

interface NodeMeshProps {
  position: [number, number, number];
  card: ZettelCard;
  onClick: () => void;
  isHighlighted: boolean;
  isSearchMatch: boolean;
}

function NodeMesh({ position, card, onClick, isHighlighted, isSearchMatch }: NodeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const categoryInfo = getCategoryInfo(card.category);
  
  // Use a more compatible color creation approach
  const categoryColor = new THREE.Color(0x3b82f6); // Default blue color
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1;
      
      // Scale effect for highlighted nodes
      const targetScale = isHighlighted ? 1.2 : isSearchMatch ? 1.1 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <group position={position}>
      <Sphere
        ref={meshRef}
        args={[0.5, 16, 16]}
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'auto';
        }}
      >
        <meshStandardMaterial
          color={categoryColor}
          emissive={isHighlighted ? categoryColor.clone().multiplyScalar(0.3) : undefined}
          transparent
          opacity={isSearchMatch || isHighlighted ? 1 : 0.8}
        />
      </Sphere>
      
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.3}
        maxWidth={3}
        textAlign="center"
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {card.title}
      </Text>
      
      <Text
        position={[0, 0.8, 0]}
        fontSize={0.2}
        color="#3b82f6"
        anchorX="center"
        anchorY="middle"
      >
        {card.number}
      </Text>
    </group>
  );
}

interface ConnectionLineProps {
  start: [number, number, number];
  end: [number, number, number];
  color: string;
  opacity?: number;
  animated?: boolean;
}

function ConnectionLine({ start, end, color, opacity = 0.6, animated = false }: ConnectionLineProps) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={animated ? 3 : 1}
      transparent
      opacity={opacity}
    />
  );
}

function Scene({ cards, onCardSelect, searchTerm, layoutType, showCategoryEdges }: {
  cards: ZettelCard[];
  onCardSelect?: (card: ZettelCard) => void;
  searchTerm: string;
  layoutType: string;
  showCategoryEdges: boolean;
}) {
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  
  // 3D Layout algorithms
  const get3DPositions = useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};
    
    switch (layoutType) {
      case 'sphere':
        cards.forEach((card, index) => {
          const phi = Math.acos(-1 + (2 * index) / cards.length);
          const theta = Math.sqrt(cards.length * Math.PI) * phi;
          const radius = 8;
          
          positions[card.id] = [
            radius * Math.cos(theta) * Math.sin(phi),
            radius * Math.cos(phi),
            radius * Math.sin(theta) * Math.sin(phi)
          ];
        });
        break;
        
      case 'helix':
        cards.forEach((card, index) => {
          const t = (index / cards.length) * 4 * Math.PI;
          const radius = 5;
          const height = 10;
          
          positions[card.id] = [
            radius * Math.cos(t),
            (index / cards.length) * height - height / 2,
            radius * Math.sin(t)
          ];
        });
        break;
        
      case 'layers':
        const categoryGroups: Record<string, ZettelCard[]> = {};
        cards.forEach(card => {
          const mainCategory = card.category.substring(0, 1) + '00';
          if (!categoryGroups[mainCategory]) {
            categoryGroups[mainCategory] = [];
          }
          categoryGroups[mainCategory].push(card);
        });
        
        Object.keys(categoryGroups).forEach((category, layerIndex) => {
          const group = categoryGroups[category];
          const y = layerIndex * 3 - (Object.keys(categoryGroups).length - 1) * 1.5;
          
          group.forEach((card, cardIndex) => {
            const angle = (cardIndex / group.length) * 2 * Math.PI;
            const radius = Math.min(4, group.length * 0.5);
            
            positions[card.id] = [
              radius * Math.cos(angle),
              y,
              radius * Math.sin(angle)
            ];
          });
        });
        break;
        
      default: // cube
        const cubeSize = Math.ceil(Math.cbrt(cards.length));
        cards.forEach((card, index) => {
          const x = index % cubeSize;
          const y = Math.floor(index / cubeSize) % cubeSize;
          const z = Math.floor(index / (cubeSize * cubeSize));
          
          positions[card.id] = [
            (x - cubeSize / 2) * 3,
            (y - cubeSize / 2) * 3,
            (z - cubeSize / 2) * 3
          ];
        });
        break;
    }
    
    return positions;
  }, [cards, layoutType]);
  
  const nodePositions = get3DPositions;
  
  // Filter for search
  const searchMatches = useMemo(() => {
    if (!searchTerm) return new Set();
    return new Set(
      cards
        .filter(card => 
          card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          card.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
          card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        )
        .map(card => card.id)
    );
  }, [cards, searchTerm]);

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <pointLight position={[-10, -10, -10]} intensity={0.4} />
      
      {/* Render nodes */}
      {cards.map(card => {
        const position = nodePositions[card.id] || [0, 0, 0];
        return (
          <NodeMesh
            key={card.id}
            position={position}
            card={card}
            onClick={() => onCardSelect?.(card)}
            isHighlighted={highlightedNodes.has(card.id)}
            isSearchMatch={searchMatches.has(card.id)}
          />
        );
      })}
      
      {/* Render connections */}
      {cards.map(card => {
        const startPos = nodePositions[card.id];
        if (!startPos) return null;
        
        return card.linkedCards.map(linkedId => {
          const targetCard = cards.find(c => c.id === linkedId);
          const endPos = nodePositions[linkedId];
          
          if (!targetCard || !endPos) return null;
          
          const isHighlighted = highlightedNodes.has(card.id) || highlightedNodes.has(linkedId);
          
          return (
            <ConnectionLine
              key={`${card.id}-${linkedId}`}
              start={startPos}
              end={endPos}
              color="#3b82f6"
              opacity={isHighlighted ? 0.9 : 0.6}
              animated={isHighlighted}
            />
          );
        });
      })}
      
      {/* Category connections */}
      {showCategoryEdges && (() => {
        const categoryGroups: Record<string, ZettelCard[]> = {};
        cards.forEach(card => {
          const mainCategory = card.category.substring(0, 1) + '00';
          if (!categoryGroups[mainCategory]) {
            categoryGroups[mainCategory] = [];
          }
          categoryGroups[mainCategory].push(card);
        });
        
        return Object.values(categoryGroups).flat().map((card, i, arr) => {
          if (i === arr.length - 1) return null;
          
          const nextCard = arr[i + 1];
          const startPos = nodePositions[card.id];
          const endPos = nodePositions[nextCard.id];
          
          if (!startPos || !endPos) return null;
          
          const categoryInfo = getCategoryInfo(card.category);
          
          return (
            <ConnectionLine
              key={`category-${card.id}-${nextCard.id}`}
              start={startPos}
              end={endPos}
              color="#10b981"
              opacity={0.3}
            />
          );
        });
      })()}
    </>
  );
}

export function Graph3D({ cards, onCardSelect, className }: Graph3DProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutType, setLayoutType] = useState<'sphere' | 'cube' | 'helix' | 'layers'>('sphere');
  const [showCategoryEdges, setShowCategoryEdges] = useState(true);

  return (
    <div className={`h-full w-full relative ${className}`}>
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 space-y-3 p-4 bg-card border border-border rounded-lg shadow-card max-w-sm">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={layoutType} onValueChange={(value) => setLayoutType(value as typeof layoutType)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sphere">Sphere Layout</SelectItem>
              <SelectItem value="cube">Cube Layout</SelectItem>
              <SelectItem value="helix">Helix Layout</SelectItem>
              <SelectItem value="layers">Category Layers</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCategoryEdges(!showCategoryEdges)}
            className="h-8 px-2"
          >
            {showCategoryEdges ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          3D Graph View - {cards.length} cards
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        style={{ background: 'transparent' }}
      >
        <Scene
          cards={cards}
          onCardSelect={onCardSelect}
          searchTerm={searchTerm}
          layoutType={layoutType}
          showCategoryEdges={showCategoryEdges}
        />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={false}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}
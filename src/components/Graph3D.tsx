import { useEffect, useRef, useMemo, useState, useCallback, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ZettelCard } from '@/types/zettel';
import { getCategoryInfo } from '@/utils/deweySystem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, EyeOff, RotateCw, Crosshair } from 'lucide-react';

// ── Category color map ────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, THREE.Color> = {
  '0': new THREE.Color(0x06b6d4), // Cyan – CS & Knowledge
  '1': new THREE.Color(0xa855f7), // Purple – Philosophy
  '2': new THREE.Color(0xf59e0b), // Amber – Religion
  '3': new THREE.Color(0xef4444), // Red – Social Sciences
  '4': new THREE.Color(0x22d3ee), // Sky – Language
  '5': new THREE.Color(0x10b981), // Emerald – Pure Science
  '6': new THREE.Color(0x3b82f6), // Blue – Applied Science
  '7': new THREE.Color(0xec4899), // Pink – Arts
  '8': new THREE.Color(0xf97316), // Orange – Literature
  '9': new THREE.Color(0x8b5cf6), // Violet – History
};

function getCategoryColor(category: string): THREE.Color {
  const key = category?.charAt(0) || '0';
  return CATEGORY_COLORS[key] || CATEGORY_COLORS['0'];
}

// ── Interfaces ────────────────────────────────────────────────────────
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
  isDimmed: boolean;
  onHoverStart: (card: ZettelCard) => void;
  onHoverEnd: () => void;
}

// ── Node ──────────────────────────────────────────────────────────────
function NodeMesh({ position, card, onClick, isHighlighted, isSearchMatch, isDimmed, onHoverStart, onHoverEnd }: NodeMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const categoryColor = useMemo(() => getCategoryColor(card.category), [card.category]);
  const categoryInfo = getCategoryInfo(card.category);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8 + position[0]) * 0.12;
    const s = hovered ? 1.35 : isHighlighted ? 1.2 : isSearchMatch ? 1.1 : 1;
    meshRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.12);
  });

  const emissiveIntensity = hovered ? 1.8 : isHighlighted || isSearchMatch ? 1.2 : 0.4;
  const opacity = isDimmed ? 0.15 : 1;

  return (
    <group position={position}>
      <Sphere
        ref={meshRef}
        args={[0.5, 32, 32]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          onHoverStart(card);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
          onHoverEnd();
          document.body.style.cursor = 'auto';
        }}
      >
        <meshPhysicalMaterial
          color={categoryColor}
          emissive={categoryColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.15}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      </Sphere>

      {/* Label */}
      <Text
        position={[0, -0.85, 0]}
        fontSize={0.25}
        maxWidth={3}
        textAlign="center"
        color="white"
        anchorX="center"
        anchorY="middle"
        fillOpacity={isDimmed ? 0.2 : 0.9}
      >
        {card.title.length > 20 ? card.title.slice(0, 18) + '…' : card.title}
      </Text>

      {/* Tooltip */}
      {hovered && (
        <Html distanceFactor={10} center style={{ pointerEvents: 'none' }}>
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-3 w-56 -translate-y-20 animate-in fade-in-0 zoom-in-95 duration-150">
            <p className="text-xs font-semibold text-primary truncate">{card.number}</p>
            <p className="text-sm font-bold text-foreground mt-0.5 truncate">{card.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{categoryInfo.name}</p>
            {card.content && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {card.content.replace(/<[^>]*>/g, '').slice(0, 100)}
              </p>
            )}
            {card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {card.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Animated connection ───────────────────────────────────────────────
function AnimatedEdge({ start, end, color, isDimmed }: { start: [number, number, number]; end: [number, number, number]; color: THREE.Color; isDimmed: boolean }) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ], [start, end]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={1.5}
      transparent
      opacity={isDimmed ? 0.05 : 0.5}
    />
  );
}

// ── Camera controller ─────────────────────────────────────────────────
function CameraController({ target, resetTrigger }: { target: THREE.Vector3 | null; resetTrigger: number }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const defaultPos = useMemo(() => new THREE.Vector3(0, 0, 15), []);
  const defaultTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame(() => {
    if (!controlsRef.current) return;
    if (target) {
      const camTarget = target.clone().add(new THREE.Vector3(0, 0, 6));
      camera.position.lerp(camTarget, 0.04);
      controlsRef.current.target.lerp(target, 0.04);
    }
    controlsRef.current.update();
  });

  useEffect(() => {
    if (resetTrigger > 0) {
      camera.position.copy(defaultPos);
      if (controlsRef.current) controlsRef.current.target.copy(defaultTarget);
    }
  }, [resetTrigger]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      autoRotate={false}
      makeDefault
    />
  );
}

// ── Scene ─────────────────────────────────────────────────────────────
function Scene({ cards, onCardSelect, searchTerm, layoutType, showCategoryEdges, autoRotate, focusTarget, setFocusTarget }: {
  cards: ZettelCard[];
  onCardSelect?: (card: ZettelCard) => void;
  searchTerm: string;
  layoutType: string;
  showCategoryEdges: boolean;
  autoRotate: boolean;
  focusTarget: THREE.Vector3 | null;
  setFocusTarget: (v: THREE.Vector3 | null) => void;
}) {
  const [hoveredCard, setHoveredCard] = useState<ZettelCard | null>(null);
  const [resetCount, setResetCount] = useState(0);

  // Linked set for neighborhood highlight
  const neighborSet = useMemo(() => {
    if (!hoveredCard) return null;
    const s = new Set<string>();
    s.add(hoveredCard.id);
    hoveredCard.linkedCards.forEach(id => s.add(id));
    // Also add cards that link TO this card
    cards.forEach(c => {
      if (c.linkedCards.includes(hoveredCard.id)) s.add(c.id);
    });
    return s;
  }, [hoveredCard, cards]);

  // 3D Layout
  const nodePositions = useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};
    switch (layoutType) {
      case 'sphere':
        cards.forEach((card, i) => {
          const phi = Math.acos(-1 + (2 * i) / cards.length);
          const theta = Math.sqrt(cards.length * Math.PI) * phi;
          const r = 8;
          positions[card.id] = [r * Math.cos(theta) * Math.sin(phi), r * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi)];
        });
        break;
      case 'helix':
        cards.forEach((card, i) => {
          const t = (i / cards.length) * 4 * Math.PI;
          positions[card.id] = [5 * Math.cos(t), (i / cards.length) * 10 - 5, 5 * Math.sin(t)];
        });
        break;
      case 'layers': {
        const groups: Record<string, ZettelCard[]> = {};
        cards.forEach(c => {
          const k = c.category.substring(0, 1) + '00';
          (groups[k] ||= []).push(c);
        });
        Object.keys(groups).forEach((cat, li) => {
          const g = groups[cat];
          const y = li * 3 - (Object.keys(groups).length - 1) * 1.5;
          g.forEach((card, ci) => {
            const a = (ci / g.length) * 2 * Math.PI;
            const r = Math.min(4, g.length * 0.5);
            positions[card.id] = [r * Math.cos(a), y, r * Math.sin(a)];
          });
        });
        break;
      }
      default: {
        const sz = Math.ceil(Math.cbrt(cards.length));
        cards.forEach((card, i) => {
          positions[card.id] = [
            (i % sz - sz / 2) * 3,
            (Math.floor(i / sz) % sz - sz / 2) * 3,
            (Math.floor(i / (sz * sz)) - sz / 2) * 3,
          ];
        });
      }
    }
    return positions;
  }, [cards, layoutType]);

  const searchMatches = useMemo(() => {
    if (!searchTerm) return new Set<string>();
    return new Set(
      cards.filter(c =>
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
      ).map(c => c.id)
    );
  }, [cards, searchTerm]);

  const handleNodeClick = useCallback((card: ZettelCard) => {
    const pos = nodePositions[card.id];
    if (pos) setFocusTarget(new THREE.Vector3(...pos));
    onCardSelect?.(card);
  }, [nodePositions, onCardSelect, setFocusTarget]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.25} />
      <pointLight position={[15, 15, 15]} intensity={0.6} color="#c4b5fd" />
      <pointLight position={[-15, -10, -15]} intensity={0.3} color="#06b6d4" />

      {/* Starfield */}
      <Stars radius={80} depth={60} count={2000} factor={3} saturation={0.2} fade speed={0.8} />

      {/* Nodes */}
      {cards.map(card => {
        const pos = nodePositions[card.id] || [0, 0, 0];
        const isDimmed = neighborSet !== null && !neighborSet.has(card.id);
        return (
          <NodeMesh
            key={card.id}
            position={pos}
            card={card}
            onClick={() => handleNodeClick(card)}
            isHighlighted={false}
            isSearchMatch={searchMatches.has(card.id)}
            isDimmed={isDimmed}
            onHoverStart={setHoveredCard}
            onHoverEnd={() => setHoveredCard(null)}
          />
        );
      })}

      {/* Edges */}
      {cards.flatMap(card => {
        const startPos = nodePositions[card.id];
        if (!startPos) return [];
        return card.linkedCards.map(linkedId => {
          const endPos = nodePositions[linkedId];
          if (!endPos) return null;
          const isDimmed = neighborSet !== null && (!neighborSet.has(card.id) || !neighborSet.has(linkedId));
          const color = getCategoryColor(card.category);
          return (
            <AnimatedEdge
              key={`${card.id}-${linkedId}`}
              start={startPos}
              end={endPos}
              color={color}
              isDimmed={isDimmed}
            />
          );
        });
      })}

      {/* Category edges */}
      {showCategoryEdges && (() => {
        const groups: Record<string, ZettelCard[]> = {};
        cards.forEach(c => {
          const k = c.category.substring(0, 1) + '00';
          (groups[k] ||= []).push(c);
        });
        return Object.values(groups).flatMap(arr =>
          arr.slice(0, -1).map((card, i) => {
            const next = arr[i + 1];
            const s = nodePositions[card.id];
            const e = nodePositions[next.id];
            if (!s || !e) return null;
            const isDimmed = neighborSet !== null && (!neighborSet.has(card.id) || !neighborSet.has(next.id));
            return (
              <AnimatedEdge
                key={`cat-${card.id}-${next.id}`}
                start={s}
                end={e}
                color={new THREE.Color(0x10b981)}
                isDimmed={isDimmed}
              />
            );
          })
        );
      })()}

      {/* Bloom */}
      <EffectComposer>
        <Bloom
          mipmapBlur
          luminanceThreshold={0.4}
          luminanceSmoothing={0.6}
          intensity={0.8}
        />
      </EffectComposer>

      {/* Camera */}
      <CameraController target={focusTarget} resetTrigger={0} />
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────
export function Graph3D({ cards, onCardSelect, className }: Graph3DProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutType, setLayoutType] = useState<'sphere' | 'cube' | 'helix' | 'layers'>('sphere');
  const [showCategoryEdges, setShowCategoryEdges] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [focusTarget, setFocusTarget] = useState<THREE.Vector3 | null>(null);

  return (
    <div className={`h-full w-full relative ${className}`}>
      {/* Controls panel */}
      <div className="absolute top-4 left-4 z-10 space-y-2.5 p-3.5 bg-card/90 backdrop-blur-lg border border-border rounded-xl shadow-2xl max-w-[240px]">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search cards…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-7 text-xs"
          />
        </div>

        <Select value={layoutType} onValueChange={(v) => setLayoutType(v as typeof layoutType)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sphere">Sphere</SelectItem>
            <SelectItem value="cube">Cube</SelectItem>
            <SelectItem value="helix">Helix</SelectItem>
            <SelectItem value="layers">Category Layers</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCategoryEdges(!showCategoryEdges)}
            className="h-7 px-2 text-xs flex-1"
          >
            {showCategoryEdges ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
            Links
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`h-7 px-2 text-xs flex-1 ${autoRotate ? 'bg-primary/20 border-primary' : ''}`}
          >
            <RotateCw className="h-3 w-3 mr-1" />
            Spin
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFocusTarget(null)}
            className="h-7 px-2 text-xs"
            title="Reset view"
          >
            <Crosshair className="h-3 w-3" />
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground">
          {cards.length} nodes · 3D Graph
        </p>
      </div>

      {/* Canvas */}
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene
          cards={cards}
          onCardSelect={onCardSelect}
          searchTerm={searchTerm}
          layoutType={layoutType}
          showCategoryEdges={showCategoryEdges}
          autoRotate={autoRotate}
          focusTarget={focusTarget}
          setFocusTarget={setFocusTarget}
        />
      </Canvas>
    </div>
  );
}

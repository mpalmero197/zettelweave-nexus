import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line, Stars, Html, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { ZettelCard } from '@/types/zettel';
import { getCategoryInfo } from '@/utils/deweySystem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Eye, EyeOff, RotateCw, Crosshair } from 'lucide-react';

// ── Category color map ────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, THREE.Color> = {
  '0': new THREE.Color(0x06b6d4),
  '1': new THREE.Color(0xa855f7),
  '2': new THREE.Color(0xf59e0b),
  '3': new THREE.Color(0xef4444),
  '4': new THREE.Color(0x22d3ee),
  '5': new THREE.Color(0x10b981),
  '6': new THREE.Color(0x3b82f6),
  '7': new THREE.Color(0xec4899),
  '8': new THREE.Color(0xf97316),
  '9': new THREE.Color(0x8b5cf6),
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

// ── Glow ring around nodes ────────────────────────────────────────────
function GlowRing({ color, active }: { color: THREE.Color; active: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * 0.5;
    const s = active ? 1.1 + Math.sin(state.clock.elapsedTime * 3) * 0.08 : 1;
    ref.current.scale.set(s, s, s);
  });
  return (
    <Ring ref={ref} args={[0.62, 0.72, 32]}>
      <meshBasicMaterial color={color} transparent opacity={active ? 0.6 : 0.15} side={THREE.DoubleSide} />
    </Ring>
  );
}

// ── Node ──────────────────────────────────────────────────────────────
function NodeMesh({ position, card, onClick, isSearchMatch, isDimmed, onHoverStart, onHoverEnd }: {
  position: [number, number, number];
  card: ZettelCard;
  onClick: () => void;
  isSearchMatch: boolean;
  isDimmed: boolean;
  onHoverStart: (card: ZettelCard) => void;
  onHoverEnd: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const categoryColor = useMemo(() => getCategoryColor(card.category), [card.category]);
  const categoryInfo = getCategoryInfo(card.category);

  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return;
    // Gentle float
    groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.6 + position[0] * 0.7) * 0.15;
    // Scale pulse
    const s = hovered ? 1.4 : isSearchMatch ? 1.15 : 1;
    meshRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1);
  });

  const emissiveIntensity = hovered ? 2.2 : isSearchMatch ? 1.5 : 0.5;
  const opacity = isDimmed ? 0.12 : 1;

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      {/* Outer glow ring */}
      <GlowRing color={categoryColor} active={hovered || isSearchMatch} />

      <Sphere
        ref={meshRef}
        args={[0.45, 32, 32]}
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
          roughness={0.12}
          metalness={0.15}
          clearcoat={1}
          clearcoatRoughness={0.08}
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      </Sphere>

      {/* Label */}
      {!isDimmed && (
        <Text
          position={[0, -0.9, 0]}
          fontSize={0.22}
          maxWidth={3}
          textAlign="center"
          color="white"
          anchorX="center"
          anchorY="middle"
          fillOpacity={0.85}
        >
          {card.title.length > 22 ? card.title.slice(0, 20) + '…' : card.title}
        </Text>
      )}

      {/* Tooltip */}
      {hovered && (
        <Html distanceFactor={10} center style={{ pointerEvents: 'none' }}>
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-3 w-60 -translate-y-24 animate-in fade-in-0 zoom-in-95 duration-150">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: `#${categoryColor.getHexString()}` }} />
              <p className="text-[11px] font-mono text-primary truncate">{card.number}</p>
            </div>
            <p className="text-sm font-bold text-foreground truncate">{card.title}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{categoryInfo.name}</p>
            {card.content && (
              <p className="text-[11px] text-muted-foreground/80 mt-1.5 line-clamp-2 leading-relaxed">
                {card.content.replace(/<[^>]*>/g, '').slice(0, 120)}
              </p>
            )}
            {card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {card.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">{tag}</span>
                ))}
              </div>
            )}
            {card.linkedCards.length > 0 && (
              <p className="text-[9px] text-muted-foreground/60 mt-1.5">{card.linkedCards.length} connection{card.linkedCards.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Edge ──────────────────────────────────────────────────────────────
function AnimatedEdge({ start, end, color, isDimmed, isHighlighted }: {
  start: [number, number, number]; end: [number, number, number]; color: THREE.Color; isDimmed: boolean; isHighlighted?: boolean;
}) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ], [start, end]);

  return (
    <Line
      points={points}
      color={color}
      lineWidth={isHighlighted ? 2.5 : 1.2}
      transparent
      opacity={isDimmed ? 0.03 : isHighlighted ? 0.8 : 0.35}
    />
  );
}

// ── Camera controller ─────────────────────────────────────────────────
function CameraController({ target, autoRotate, onReset }: {
  target: THREE.Vector3 | null;
  autoRotate: boolean;
  onReset: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useFrame(() => {
    if (!controlsRef.current) return;
    if (target) {
      const camTarget = target.clone().add(new THREE.Vector3(2, 1.5, 5));
      camera.position.lerp(camTarget, 0.035);
      controlsRef.current.target.lerp(target, 0.035);
    }
    controlsRef.current.update();
  });

  // Reset camera
  useEffect(() => {
    if (onReset > 0 && controlsRef.current) {
      camera.position.set(0, 0, 15);
      controlsRef.current.target.set(0, 0, 0);
    }
  }, [onReset, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan
      enableZoom
      enableRotate
      autoRotate={autoRotate}
      autoRotateSpeed={0.6}
      minDistance={3}
      maxDistance={50}
      enableDamping
      dampingFactor={0.05}
      makeDefault
    />
  );
}

// ── Scene ─────────────────────────────────────────────────────────────
function Scene({ cards, onCardSelect, searchTerm, layoutType, showCategoryEdges, autoRotate, focusTarget, setFocusTarget, resetCount }: {
  cards: ZettelCard[];
  onCardSelect?: (card: ZettelCard) => void;
  searchTerm: string;
  layoutType: string;
  showCategoryEdges: boolean;
  autoRotate: boolean;
  focusTarget: THREE.Vector3 | null;
  setFocusTarget: (v: THREE.Vector3 | null) => void;
  resetCount: number;
}) {
  const [hoveredCard, setHoveredCard] = useState<ZettelCard | null>(null);

  // Neighborhood set
  const neighborSet = useMemo(() => {
    if (!hoveredCard) return null;
    const s = new Set<string>([hoveredCard.id]);
    hoveredCard.linkedCards.forEach(id => s.add(id));
    cards.forEach(c => { if (c.linkedCards.includes(hoveredCard.id)) s.add(c.id); });
    return s;
  }, [hoveredCard, cards]);

  // 3D Layouts
  const nodePositions = useMemo(() => {
    const positions: Record<string, [number, number, number]> = {};
    const n = cards.length || 1;

    switch (layoutType) {
      case 'sphere':
        cards.forEach((card, i) => {
          const phi = Math.acos(-1 + (2 * i + 1) / n);
          const theta = Math.sqrt(n * Math.PI) * phi;
          const r = 8;
          positions[card.id] = [r * Math.cos(theta) * Math.sin(phi), r * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi)];
        });
        break;
      case 'helix':
        cards.forEach((card, i) => {
          const t = (i / n) * 5 * Math.PI;
          const r = 5;
          positions[card.id] = [r * Math.cos(t), (i / n) * 12 - 6, r * Math.sin(t)];
        });
        break;
      case 'layers': {
        const groups: Record<string, ZettelCard[]> = {};
        cards.forEach(c => { const k = c.category.substring(0, 1) + '00'; (groups[k] ||= []).push(c); });
        const keys = Object.keys(groups);
        keys.forEach((cat, li) => {
          const g = groups[cat];
          const y = li * 3.5 - (keys.length - 1) * 1.75;
          g.forEach((card, ci) => {
            const a = (ci / g.length) * 2 * Math.PI;
            const r = Math.max(2, Math.min(5, g.length * 0.6));
            positions[card.id] = [r * Math.cos(a), y, r * Math.sin(a)];
          });
        });
        break;
      }
      default: {
        const sz = Math.max(2, Math.ceil(Math.cbrt(n)));
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

  // Search
  const searchMatches = useMemo(() => {
    if (!searchTerm) return new Set<string>();
    const term = searchTerm.toLowerCase();
    return new Set(
      cards.filter(c =>
        c.title.toLowerCase().includes(term) ||
        c.content.toLowerCase().includes(term) ||
        c.tags.some(t => t.toLowerCase().includes(term))
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
      <ambientLight intensity={0.3} />
      <pointLight position={[20, 15, 15]} intensity={0.7} color="#c4b5fd" />
      <pointLight position={[-15, -12, -15]} intensity={0.35} color="#06b6d4" />
      <pointLight position={[0, -20, 5]} intensity={0.2} color="#ec4899" />

      {/* Starfield */}
      <Stars radius={100} depth={80} count={3000} factor={3.5} saturation={0.3} fade speed={0.6} />

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
            isSearchMatch={searchMatches.has(card.id)}
            isDimmed={isDimmed}
            onHoverStart={setHoveredCard}
            onHoverEnd={() => setHoveredCard(null)}
          />
        );
      })}

      {/* Direct linked edges */}
      {cards.flatMap(card => {
        const startPos = nodePositions[card.id];
        if (!startPos) return [];
        return card.linkedCards.map(linkedId => {
          const endPos = nodePositions[linkedId];
          if (!endPos) return null;
          const isNeighborEdge = neighborSet !== null && neighborSet.has(card.id) && neighborSet.has(linkedId);
          const isDimmed = neighborSet !== null && !isNeighborEdge;
          return (
            <AnimatedEdge
              key={`${card.id}-${linkedId}`}
              start={startPos}
              end={endPos}
              color={getCategoryColor(card.category)}
              isDimmed={isDimmed}
              isHighlighted={isNeighborEdge}
            />
          );
        });
      })}

      {/* Category edges */}
      {showCategoryEdges && (() => {
        const groups: Record<string, ZettelCard[]> = {};
        cards.forEach(c => { const k = c.category.substring(0, 1) + '00'; (groups[k] ||= []).push(c); });
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

      {/* Camera */}
      <CameraController target={focusTarget} autoRotate={autoRotate} onReset={resetCount} />
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
  const [resetCount, setResetCount] = useState(0);

  const handleReset = useCallback(() => {
    setFocusTarget(null);
    setResetCount(c => c + 1);
  }, []);

  return (
    <div className={`h-full w-full relative ${className}`}>
      {/* Controls */}
      <div className="absolute top-3 left-3 z-10 space-y-2 p-3 bg-card/85 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl max-w-[220px]">
        <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2">
          <Search className="h-3 w-3 text-muted-foreground shrink-0" />
          <Input
            placeholder="Search…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
          />
        </div>

        <Select value={layoutType} onValueChange={(v) => setLayoutType(v as typeof layoutType)}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sphere">🔮 Sphere</SelectItem>
            <SelectItem value="cube">🧊 Cube</SelectItem>
            <SelectItem value="helix">🧬 Helix</SelectItem>
            <SelectItem value="layers">📚 Category Layers</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCategoryEdges(!showCategoryEdges)}
            className={`h-7 px-2 text-[11px] flex-1 ${showCategoryEdges ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : ''}`}
          >
            {showCategoryEdges ? <Eye className="h-3 w-3 mr-1" /> : <EyeOff className="h-3 w-3 mr-1" />}
            Links
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`h-7 px-2 text-[11px] flex-1 ${autoRotate ? 'bg-primary/15 border-primary/40 text-primary' : ''}`}
          >
            <RotateCw className={`h-3 w-3 mr-1 ${autoRotate ? 'animate-spin' : ''}`} style={autoRotate ? { animationDuration: '3s' } : {}} />
            Spin
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-7 w-7 p-0"
            title="Reset camera"
          >
            <Crosshair className="h-3 w-3" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {cards.length} node{cards.length !== 1 ? 's' : ''} · 3D
          </p>
          {searchTerm && (
            <p className="text-[10px] text-primary font-medium">
              {cards.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).length} match{cards.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).length !== 1 ? 'es' : ''}
            </p>
          )}
        </div>
      </div>

      {/* Canvas */}
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
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
          resetCount={resetCount}
        />
      </Canvas>
    </div>
  );
}

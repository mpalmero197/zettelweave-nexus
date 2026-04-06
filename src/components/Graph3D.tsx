import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line, Stars, Html, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { ZettelCard } from '@/types/zettel';
import { getCategoryInfo } from '@/utils/deweySystem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Eye, EyeOff, RotateCw, Crosshair, Camera, X, ChevronDown, ChevronUp } from 'lucide-react';

// ── Category color map ────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, THREE.Color> = {
  '0': new THREE.Color(0x00e5ff),
  '1': new THREE.Color(0xd500f9),
  '2': new THREE.Color(0xffea00),
  '3': new THREE.Color(0xff1744),
  '4': new THREE.Color(0x00e676),
  '5': new THREE.Color(0x651fff),
  '6': new THREE.Color(0x2979ff),
  '7': new THREE.Color(0xff4081),
  '8': new THREE.Color(0xff9100),
  '9': new THREE.Color(0x76ff03),
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

// ── Force-directed layout ─────────────────────────────────────────────
function computeForceLayout(cards: ZettelCard[]): Record<string, [number, number, number]> {
  const n = cards.length;
  if (n === 0) return {};

  const idToIdx: Record<string, number> = {};
  cards.forEach((c, i) => { idToIdx[c.id] = i; });

  // Initialize random positions
  const pos: [number, number, number][] = cards.map((_, i) => {
    const phi = Math.acos(-1 + (2 * i + 1) / Math.max(n, 1));
    const theta = Math.sqrt(n * Math.PI) * phi;
    const r = 4 + Math.random() * 2;
    return [r * Math.cos(theta) * Math.sin(phi), r * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi)];
  });

  const vel: [number, number, number][] = cards.map(() => [0, 0, 0]);

  // Build link list
  const links: [number, number][] = [];
  cards.forEach((c, i) => {
    c.linkedCards.forEach(lid => {
      const j = idToIdx[lid];
      if (j !== undefined && i < j) links.push([i, j]);
    });
  });

  const ITERATIONS = 80;
  const REPULSION = 8;
  const SPRING = 0.02;
  const IDEAL_LENGTH = 3;
  const DAMPING = 0.85;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const temp = 1 - iter / ITERATIONS;

    // Repulsion between all pairs
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = pos[i][0] - pos[j][0];
        const dy = pos[i][1] - pos[j][1];
        const dz = pos[i][2] - pos[j][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
        const force = (REPULSION * temp) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;
        vel[i][0] += fx; vel[i][1] += fy; vel[i][2] += fz;
        vel[j][0] -= fx; vel[j][1] -= fy; vel[j][2] -= fz;
      }
    }

    // Spring attraction for links
    for (const [i, j] of links) {
      const dx = pos[j][0] - pos[i][0];
      const dy = pos[j][1] - pos[i][1];
      const dz = pos[j][2] - pos[i][2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
      const force = SPRING * (dist - IDEAL_LENGTH);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;
      vel[i][0] += fx; vel[i][1] += fy; vel[i][2] += fz;
      vel[j][0] -= fx; vel[j][1] -= fy; vel[j][2] -= fz;
    }

    // Apply velocity and dampen
    for (let i = 0; i < n; i++) {
      pos[i][0] += vel[i][0];
      pos[i][1] += vel[i][1];
      pos[i][2] += vel[i][2];
      vel[i][0] *= DAMPING;
      vel[i][1] *= DAMPING;
      vel[i][2] *= DAMPING;
    }
  }

  const result: Record<string, [number, number, number]> = {};
  cards.forEach((c, i) => { result[c.id] = pos[i]; });
  return result;
}

// ── Connection count helper ───────────────────────────────────────────
function getConnectionCounts(cards: ZettelCard[]): Record<string, number> {
  const counts: Record<string, number> = {};
  cards.forEach(c => { counts[c.id] = (counts[c.id] || 0) + c.linkedCards.length; });
  cards.forEach(c => { c.linkedCards.forEach(lid => { counts[lid] = (counts[lid] || 0) + 1; }); });
  return counts;
}

// ── BFS hop reachability ──────────────────────────────────────────────
function getReachable(startId: string, cards: ZettelCard[], depth: number): Set<string> {
  const adj: Record<string, string[]> = {};
  cards.forEach(c => {
    if (!adj[c.id]) adj[c.id] = [];
    c.linkedCards.forEach(lid => {
      adj[c.id].push(lid);
      if (!adj[lid]) adj[lid] = [];
      adj[lid].push(c.id);
    });
  });

  const visited = new Set<string>([startId]);
  let frontier = [startId];
  for (let d = 0; d < depth; d++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const nb of (adj[id] || [])) {
        if (!visited.has(nb)) { visited.add(nb); next.push(nb); }
      }
    }
    frontier = next;
  }
  return visited;
}

// ── Shared tag count ──────────────────────────────────────────────────
function sharedTagCount(a: ZettelCard, b: ZettelCard): number {
  const setB = new Set(b.tags);
  return a.tags.filter(t => setB.has(t)).length;
}

// ── Glow ring around nodes ────────────────────────────────────────────
function GlowRing({ color, active, radius }: { color: THREE.Color; active: boolean; radius: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * 0.5;
    const s = active ? 1.1 + Math.sin(state.clock.elapsedTime * 3) * 0.08 : 1;
    ref.current.scale.set(s, s, s);
  });
  const inner = radius * 1.3;
  const outer = inner + 0.1;
  return (
    <Ring ref={ref} args={[inner, outer, 32]}>
      <meshBasicMaterial color={color} transparent opacity={active ? 0.6 : 0.15} side={THREE.DoubleSide} />
    </Ring>
  );
}

// ── Node ──────────────────────────────────────────────────────────────
function NodeMesh({ position, card, onClick, onDoubleClick, isSearchMatch, isDimmed, isHidden, onHoverStart, onHoverEnd, radius }: {
  position: [number, number, number];
  card: ZettelCard;
  onClick: () => void;
  onDoubleClick: () => void;
  isSearchMatch: boolean;
  isDimmed: boolean;
  isHidden: boolean;
  onHoverStart: (card: ZettelCard) => void;
  onHoverEnd: () => void;
  radius: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const categoryColor = useMemo(() => getCategoryColor(card.category), [card.category]);
  const categoryInfo = getCategoryInfo(card.category);

  useFrame((state) => {
    if (!meshRef.current || !groupRef.current) return;
    groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.6 + position[0] * 0.7) * 0.15;
    const s = hovered ? 1.4 : isSearchMatch ? 1.15 : 1;
    meshRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1);
  });

  if (isHidden) return null;

  const emissiveIntensity = hovered ? 2.2 : isSearchMatch ? 1.5 : 0.5;
  const opacity = isDimmed ? 0.12 : 1;

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      <GlowRing color={categoryColor} active={hovered || isSearchMatch} radius={radius} />

      <Sphere
        ref={meshRef}
        args={[radius, 32, 32]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
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

      {!isDimmed && (
        <Text
          position={[0, -(radius + 0.5), 0]}
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
function AnimatedEdge({ start, end, color, isDimmed, isHighlighted, isHidden, thickness }: {
  start: [number, number, number]; end: [number, number, number]; color: THREE.Color; isDimmed: boolean; isHighlighted?: boolean; isHidden?: boolean; thickness?: number;
}) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ], [start, end]);

  if (isHidden) return null;

  const baseWidth = thickness || 1.2;

  return (
    <Line
      points={points}
      color={color}
      lineWidth={isHighlighted ? baseWidth * 2 : baseWidth}
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
function Scene({ cards, onCardSelect, searchTerm, layoutType, showCategoryEdges, autoRotate, focusTarget, setFocusTarget, resetCount, focusedCardId, setFocusedCardId, hopDepth, connectionCounts, cardMap }: {
  cards: ZettelCard[];
  onCardSelect?: (card: ZettelCard) => void;
  searchTerm: string;
  layoutType: string;
  showCategoryEdges: boolean;
  autoRotate: boolean;
  focusTarget: THREE.Vector3 | null;
  setFocusTarget: (v: THREE.Vector3 | null) => void;
  resetCount: number;
  focusedCardId: string | null;
  setFocusedCardId: (id: string | null) => void;
  hopDepth: number;
  connectionCounts: Record<string, number>;
  cardMap: Record<string, ZettelCard>;
}) {
  const [hoveredCard, setHoveredCard] = useState<ZettelCard | null>(null);

  // Neighborhood set (hover)
  const neighborSet = useMemo(() => {
    if (!hoveredCard) return null;
    const s = new Set<string>([hoveredCard.id]);
    hoveredCard.linkedCards.forEach(id => s.add(id));
    cards.forEach(c => { if (c.linkedCards.includes(hoveredCard.id)) s.add(c.id); });
    return s;
  }, [hoveredCard, cards]);

  // Hop-depth reachable set (focus)
  const hopReachable = useMemo(() => {
    if (!focusedCardId || hopDepth >= 3) return null;
    return getReachable(focusedCardId, cards, hopDepth);
  }, [focusedCardId, cards, hopDepth]);

  // Max connections for sizing
  const maxConn = useMemo(() => Math.max(1, ...Object.values(connectionCounts)), [connectionCounts]);

  // Node radius
  const getRadius = useCallback((cardId: string) => {
    const count = connectionCounts[cardId] || 0;
    return 0.35 + (count / maxConn) * 0.45;
  }, [connectionCounts, maxConn]);

  // 3D Layouts
  const nodePositions = useMemo(() => {
    const n = cards.length || 1;

    switch (layoutType) {
      case 'force':
        return computeForceLayout(cards);
      case 'sphere': {
        const positions: Record<string, [number, number, number]> = {};
        cards.forEach((card, i) => {
          const phi = Math.acos(-1 + (2 * i + 1) / n);
          const theta = Math.sqrt(n * Math.PI) * phi;
          const r = 8;
          positions[card.id] = [r * Math.cos(theta) * Math.sin(phi), r * Math.cos(phi), r * Math.sin(theta) * Math.sin(phi)];
        });
        return positions;
      }
      case 'layers': {
        const positions: Record<string, [number, number, number]> = {};
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
        return positions;
      }
      default: {
        const positions: Record<string, [number, number, number]> = {};
        const sz = Math.max(2, Math.ceil(Math.cbrt(n)));
        cards.forEach((card, i) => {
          positions[card.id] = [
            (i % sz - sz / 2) * 3,
            (Math.floor(i / sz) % sz - sz / 2) * 3,
            (Math.floor(i / (sz * sz)) - sz / 2) * 3,
          ];
        });
        return positions;
      }
    }
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
    setFocusedCardId(card.id);
  }, [nodePositions, setFocusTarget, setFocusedCardId]);

  const handleNodeDoubleClick = useCallback((card: ZettelCard) => {
    onCardSelect?.(card);
  }, [onCardSelect]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[20, 15, 15]} intensity={0.7} color="#c4b5fd" />
      <pointLight position={[-15, -12, -15]} intensity={0.35} color="#06b6d4" />
      <pointLight position={[0, -20, 5]} intensity={0.2} color="#ec4899" />

      <Stars radius={100} depth={80} count={3000} factor={3.5} saturation={0.3} fade speed={0.6} />

      {cards.map(card => {
        const pos = nodePositions[card.id] || [0, 0, 0];
        const isDimmedByHover = neighborSet !== null && !neighborSet.has(card.id);
        const isHiddenByHop = hopReachable !== null && !hopReachable.has(card.id);
        const isDimmed = isDimmedByHover || isHiddenByHop;
        return (
          <NodeMesh
            key={card.id}
            position={pos}
            card={card}
            onClick={() => handleNodeClick(card)}
            onDoubleClick={() => handleNodeDoubleClick(card)}
            isSearchMatch={searchMatches.has(card.id)}
            isDimmed={isDimmed}
            isHidden={false}
            onHoverStart={setHoveredCard}
            onHoverEnd={() => setHoveredCard(null)}
            radius={getRadius(card.id)}
          />
        );
      })}

      {cards.flatMap(card => {
        const startPos = nodePositions[card.id];
        if (!startPos) return [];
        return card.linkedCards.map(linkedId => {
          const endPos = nodePositions[linkedId];
          if (!endPos) return null;
          const linkedCard = cardMap[linkedId];
          const isNeighborEdge = neighborSet !== null && neighborSet.has(card.id) && neighborSet.has(linkedId);
          const isDimmedByHover = neighborSet !== null && !isNeighborEdge;
          const isHiddenByHop = hopReachable !== null && (!hopReachable.has(card.id) || !hopReachable.has(linkedId));
          const isDimmed = isDimmedByHover || isHiddenByHop;
          const shared = linkedCard ? sharedTagCount(card, linkedCard) : 0;
          const thickness = 1 + Math.min(shared, 3);
          return (
            <AnimatedEdge
              key={`${card.id}-${linkedId}`}
              start={startPos}
              end={endPos}
              color={getCategoryColor(card.category)}
              isDimmed={isDimmed}
              isHighlighted={isNeighborEdge}
              thickness={thickness}
            />
          );
        });
      })}

      {showCategoryEdges && (() => {
        const groups: Record<string, ZettelCard[]> = {};
        cards.forEach(c => { const k = c.category.substring(0, 1) + '00'; (groups[k] ||= []).push(c); });
        return Object.values(groups).flatMap(arr =>
          arr.slice(0, -1).map((card, i) => {
            const next = arr[i + 1];
            const s = nodePositions[card.id];
            const e = nodePositions[next.id];
            if (!s || !e) return null;
            const isDimmedByHover = neighborSet !== null && (!neighborSet.has(card.id) || !neighborSet.has(next.id));
            const isHiddenByHop = hopReachable !== null && (!hopReachable.has(card.id) || !hopReachable.has(next.id));
            return (
              <AnimatedEdge
                key={`cat-${card.id}-${next.id}`}
                start={s}
                end={e}
                color={new THREE.Color(0x10b981)}
                isDimmed={isDimmedByHover || isHiddenByHop}
              />
            );
          })
        );
      })()}

      <CameraController target={focusTarget} autoRotate={autoRotate} onReset={resetCount} />
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────
export function Graph3D({ cards, onCardSelect, className }: Graph3DProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutType, setLayoutType] = useState<'sphere' | 'cube' | 'force' | 'layers'>('force');
  const [showCategoryEdges, setShowCategoryEdges] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [focusTarget, setFocusTarget] = useState<THREE.Vector3 | null>(null);
  const [resetCount, setResetCount] = useState(0);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [hopDepth, setHopDepth] = useState(3);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [showTags, setShowTags] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // All unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    cards.forEach(c => c.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [cards]);

  // Filter cards by selected tags
  const filteredCards = useMemo(() => {
    if (selectedTags.size === 0) return cards;
    const taggedIds = new Set<string>();
    cards.forEach(c => {
      if (c.tags.some(t => selectedTags.has(t))) {
        taggedIds.add(c.id);
        c.linkedCards.forEach(lid => taggedIds.add(lid));
      }
    });
    return cards.filter(c => taggedIds.has(c.id));
  }, [cards, selectedTags]);

  const connectionCounts = useMemo(() => getConnectionCounts(filteredCards), [filteredCards]);
  const cardMap = useMemo(() => {
    const m: Record<string, ZettelCard> = {};
    filteredCards.forEach(c => { m[c.id] = c; });
    return m;
  }, [filteredCards]);

  const handleReset = useCallback(() => {
    setFocusTarget(null);
    setFocusedCardId(null);
    setResetCount(c => c + 1);
    setHopDepth(3);
  }, []);

  const handleFocus = useCallback((target: THREE.Vector3 | null) => {
    setFocusTarget(target);
  }, []);

  // Track focused card via onCardSelect wrapper
  const handleNodeFocus = useCallback((target: THREE.Vector3 | null) => {
    setFocusTarget(target);
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }, []);

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'knowledge-graph-3d.png';
    a.click();
  }, []);

  // Wrap setFocusTarget to also set focusedCardId
  const setFocusTargetWithCard = useCallback((v: THREE.Vector3 | null) => {
    setFocusTarget(v);
    // Find the card at this position — handled via Scene onClick
  }, []);

  return (
    <div className={`h-full w-full relative ${className}`}>
      {/* Controls */}
      <div className="absolute top-3 left-3 z-10 space-y-2 p-3 bg-card/85 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl max-w-[220px] max-h-[80vh] overflow-y-auto">
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
            <SelectItem value="force">🌐 Force-Directed</SelectItem>
            <SelectItem value="sphere">🔮 Sphere</SelectItem>
            <SelectItem value="cube">🧊 Cube</SelectItem>
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
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-7 px-2 text-[11px] flex-1"
            title="Reset camera"
          >
            <Crosshair className="h-3 w-3 mr-1" />
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleScreenshot}
            className="h-7 px-2 text-[11px] flex-1"
            title="Screenshot"
          >
            <Camera className="h-3 w-3 mr-1" />
            Export
          </Button>
        </div>

        {/* Hop Depth Slider */}
        {focusedCardId && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-medium">Hop Depth: {hopDepth}</p>
            <Slider
              value={[hopDepth]}
              onValueChange={([v]) => setHopDepth(v)}
              min={1}
              max={3}
              step={1}
              className="w-full"
            />
          </div>
        )}

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div>
            <button
              onClick={() => setShowTags(!showTags)}
              className="flex items-center justify-between w-full text-[10px] text-muted-foreground font-medium hover:text-foreground transition-colors"
            >
              <span>Tags ({selectedTags.size > 0 ? `${selectedTags.size} active` : allTags.length})</span>
              {showTags ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {showTags && (
              <div className="mt-1.5 space-y-1.5">
                {selectedTags.size > 0 && (
                  <button
                    onClick={() => setSelectedTags(new Set())}
                    className="text-[9px] text-destructive hover:underline flex items-center gap-0.5"
                  >
                    <X className="h-2.5 w-2.5" /> Clear
                  </button>
                )}
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {allTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                        selectedTags.has(tag)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">
            {filteredCards.length} node{filteredCards.length !== 1 ? 's' : ''} · 3D
          </p>
          {searchTerm && (
            <p className="text-[10px] text-primary font-medium">
              {filteredCards.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).length} match{filteredCards.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).length !== 1 ? 'es' : ''}
            </p>
          )}
        </div>

        <p className="text-[9px] text-muted-foreground/50">Click to focus · Double-click to open</p>
      </div>

      {/* Canvas */}
      <Canvas
        ref={canvasRef as any}
        camera={{ position: [0, 0, 15], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
        dpr={[1, 1.5]}
      >
        <Scene
          cards={filteredCards}
          onCardSelect={onCardSelect}
          searchTerm={searchTerm}
          layoutType={layoutType}
          showCategoryEdges={showCategoryEdges}
          autoRotate={autoRotate}
          focusTarget={focusTarget}
          setFocusTarget={setFocusTarget}
          resetCount={resetCount}
          focusedCardId={focusedCardId}
          setFocusedCardId={setFocusedCardId}
          hopDepth={hopDepth}
          connectionCounts={connectionCounts}
          cardMap={cardMap}
        />
      </Canvas>
    </div>
  );
}

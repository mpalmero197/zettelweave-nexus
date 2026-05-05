import { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Line, Html, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { ZettelCard } from '@/types/zettel';
import { getCategoryInfo } from '@/utils/deweySystem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search, Eye, EyeOff, RotateCw, Crosshair, Camera, X, ChevronDown, ChevronUp } from 'lucide-react';

// ── Category color map (Material 3 tonal palette — no Google brand colors) ──
const CATEGORY_COLORS: Record<string, THREE.Color> = {
  '0': new THREE.Color(0x6750A4), // primary purple
  '1': new THREE.Color(0x7D5260), // mauve
  '2': new THREE.Color(0xB58392), // dusty rose
  '3': new THREE.Color(0x984061), // berry
  '4': new THREE.Color(0x4A6363), // teal slate
  '5': new THREE.Color(0x4F6D7A), // ocean
  '6': new THREE.Color(0x6B5B95), // periwinkle
  '7': new THREE.Color(0x8C7B6B), // taupe
  '8': new THREE.Color(0x586F50), // sage
  '9': new THREE.Color(0xB48C5E), // amber bronze
};

function getCategoryColor(category: string): THREE.Color {
  const key = category?.charAt(0) || '0';
  return CATEGORY_COLORS[key] || CATEGORY_COLORS['0'];
}

// ── Interfaces ───────────────────────────────────────────────────────────────
interface Graph3DProps {
  cards: ZettelCard[];
  onCardSelect?: (card: ZettelCard) => void;
  className?: string;
}

// ── Classify planets vs moons ────────────────────────────────────────────────
function classifyNodes(cards: ZettelCard[] = [], connectionCounts: Record<string, number> = {}) {
  const threshold = Math.max(2, Math.ceil(cards.length * 0.05));
  const planetIds = new Set<string>();
  const moonParent: Record<string, string> = {};

  cards.forEach(c => {
    if (c && c.id && (connectionCounts[c.id] || 0) >= threshold) planetIds.add(c.id);
  });

  // Fallback: promote top connected nodes
  if (planetIds.size === 0 && cards.length > 0) {
    const sorted = [...cards].filter(Boolean).sort((a, b) => (connectionCounts[b.id] || 0) - (connectionCounts[a.id] || 0));
    sorted.slice(0, Math.max(1, Math.ceil(cards.length * 0.15))).forEach(c => {
      if (c && c.id && (connectionCounts[c.id] || 0) > 0) planetIds.add(c.id);
    });
  }

  // Assign moons to nearest planet
  cards.forEach(c => {
    if (!c || !c.id || planetIds.has(c.id)) return;
    let best: string | null = null;
    let bestScore = -1;
    c.linkedCards?.forEach(lid => {
      if (lid && planetIds.has(lid) && (connectionCounts[lid] || 0) > bestScore) {
        bestScore = connectionCounts[lid] || 0;
        best = lid;
      }
    });
    if (best) moonParent[c.id] = best;
  });

  return { planetIds, moonParent };
}

// ── Force-directed layout (gravity / orbital) ───────────────────────────────
function computeForceLayout(cards: ZettelCard[] = [], connectionCounts: Record<string, number> = {}): Record<string, [number, number, number]> {
  const validCards = cards.filter(Boolean);
  const n = validCards.length;
  if (n === 0) return {};

  const { planetIds, moonParent } = classifyNodes(validCards, connectionCounts);

  const idToIdx: Record<string, number> = {};
  validCards.forEach((c, i) => { if(c && c.id) idToIdx[c.id] = i; });

  // Initialize: place planets on a sphere, moons near their parent
  const pos: [number, number, number][] = new Array(n);
  const planetList = validCards.filter(c => c && c.id && planetIds.has(c.id));
  const planetPositions: Record<string, [number, number, number]> = {};

  // Place planets on a large sphere
  planetList.forEach((c, i) => {
    if (!c || !c.id) return;
    const phi = Math.acos(-1 + (2 * i + 1) / Math.max(planetList.length, 1));
    const theta = Math.sqrt(planetList.length * Math.PI) * phi;
    const r = 6 + planetList.length * 0.5;
    const p: [number, number, number] = [
      r * Math.cos(theta) * Math.sin(phi),
      r * Math.cos(phi),
      r * Math.sin(theta) * Math.sin(phi),
    ];
    planetPositions[c.id] = p;
    const idx = idToIdx[c.id];
    if (idx !== undefined) pos[idx] = p;
  });

  // Place moons near their parent planet in a small orbit
  validCards.forEach((c, i) => {
    if (!c || !c.id || planetIds.has(c.id)) return;
    const parentId = moonParent[c.id];
    const parentPos = parentId ? planetPositions[parentId] : undefined;
    if (parentPos) {
      const angle = Math.random() * Math.PI * 2;
      const elev = (Math.random() - 0.5) * Math.PI;
      const orbitR = 1.5 + Math.random() * 1.5;
      pos[i] = [
        parentPos[0] + Math.cos(angle) * Math.cos(elev) * orbitR,
        parentPos[1] + Math.sin(elev) * orbitR,
        parentPos[2] + Math.sin(angle) * Math.cos(elev) * orbitR,
      ];
    } else {
      // Unlinked node — random position
      pos[i] = [(Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10];
    }
  });

  const vel: [number, number, number][] = validCards.map(() => [0, 0, 0]);

  // Build link list
  const links: [number, number][] = [];
  validCards.forEach((c, i) => {
    if (!c || !c.linkedCards) return;
    c.linkedCards.forEach(lid => {
      const j = idToIdx[lid];
      if (j !== undefined && i < j) links.push([i, j]);
    });
  });

  const ITERATIONS = 120;
  const DAMPING = 0.82;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    const temp = 1 - iter / ITERATIONS;

    // Repulsion: strong planet-planet, mild moon-moon
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (!pos[i] || !pos[j]) continue;
        const dx = pos[i][0] - pos[j][0];
        const dy = pos[i][1] - pos[j][1];
        const dz = pos[i][2] - pos[j][2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
        const iPlanet = validCards[i] && planetIds.has(validCards[i].id);
        const jPlanet = validCards[j] && planetIds.has(validCards[j].id);
        const repulsion = (iPlanet && jPlanet) ? 30 : (iPlanet || jPlanet) ? 8 : 3;
        const force = (repulsion * temp) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;
        vel[i][0] += fx; vel[i][1] += fy; vel[i][2] += fz;
        vel[j][0] -= fx; vel[j][1] -= fy; vel[j][2] -= fz;
      }
    }

    // Spring attraction for links
    for (const [i, j] of links) {
      if (!pos[i] || !pos[j]) continue;
      const iPlanet = validCards[i] && planetIds.has(validCards[i].id);
      const jPlanet = validCards[j] && planetIds.has(validCards[j].id);
      const idealLen = (iPlanet && jPlanet) ? 8 : 2.5; // moons orbit close
      const spring = (iPlanet && jPlanet) ? 0.008 : 0.04; // strong pull for moons

      const dx = pos[j][0] - pos[i][0];
      const dy = pos[j][1] - pos[i][1];
      const dz = pos[j][2] - pos[i][2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
      const force = spring * (dist - idealLen);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;
      // Moons move more, planets are heavier
      const iWeight = iPlanet ? 0.15 : 1;
      const jWeight = jPlanet ? 0.15 : 1;
      vel[i][0] += fx * iWeight; vel[i][1] += fy * iWeight; vel[i][2] += fz * iWeight;
      vel[j][0] -= fx * jWeight; vel[j][1] -= fy * jWeight; vel[j][2] -= fz * jWeight;
    }

    // Apply velocity and dampen
    for (let i = 0; i < n; i++) {
      if (!pos[i]) continue;
      pos[i][0] += vel[i][0];
      pos[i][1] += vel[i][1];
      pos[i][2] += vel[i][2];
      vel[i][0] *= DAMPING;
      vel[i][1] *= DAMPING;
      vel[i][2] *= DAMPING;
    }
  }

  const result: Record<string, [number, number, number]> = {};
  validCards.forEach((c, i) => { if(c && c.id && pos[i]) result[c.id] = pos[i]; });
  return result;
}

// ── Connection count helper ──────────────────────────────────────────────────
function getConnectionCounts(cards: ZettelCard[]): Record<string, number> {
  const counts: Record<string, number> = {};
  cards.forEach(c => { if(c && c.id) counts[c.id] = (counts[c.id] || 0) + (c.linkedCards?.length || 0); });
  cards.forEach(c => {
    if(c && c.linkedCards) {
       c.linkedCards.forEach(lid => { if(lid) counts[lid] = (counts[lid] || 0) + 1; });
    } 
  });
  return counts;
}

// ── BFS hop reachability ─────────────────────────────────────────────────────
function getReachable(startId: string, cards: ZettelCard[], depth: number): Set<string> {
  const adj: Record<string, string[]> = {};
  cards.forEach(c => {
    if (!c || !c.id) return;
    if (!adj[c.id]) adj[c.id] = [];
    c.linkedCards?.forEach(lid => {
      if (!lid) return;
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

// ── Shared tag count ─────────────────────────────────────────────────────────
function sharedTagCount(a: ZettelCard, b: ZettelCard): number {
  const setB = new Set(b.tags || []);
  return (a.tags || []).filter(t => setB.has(t)).length;
}

// ── Glow ring around nodes ───────────────────────────────────────────────────
function GlowRing({ color, active, radius }: { color: THREE.Color; active: boolean; radius: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * 0.5;
    const s = active ? 1.1 + Math.sin(state.clock.elapsedTime * 3) * 0.08 : 1;
    ref.current.scale.set(s, s, s);
  });
  const inner = radius * 1.35;
  const outer = inner + 0.06;
  return (
    <Ring ref={ref} args={[inner, outer, 64]}>
      <meshBasicMaterial color={color} transparent opacity={active ? 0.45 : 0.12} side={THREE.DoubleSide} />
    </Ring>
  );
}

// ── Node ────────────────────────────────────────────────────────────────────
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
    groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.4 + position[0] * 0.5) * 0.08;
    const s = hovered ? 1.5 : isSearchMatch ? 1.2 : 1;
    meshRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.12);
  });

  if (isHidden) return null;

  const emissiveIntensity = hovered ? 0.85 : isSearchMatch ? 0.6 : 0.25;
  const opacity = isDimmed ? 0.08 : 1;

  return (
    <group ref={groupRef} position={[position[0], position[1], position[2]]}>
      <GlowRing color={categoryColor} active={hovered || isSearchMatch} radius={radius} />

      <Sphere
        ref={meshRef}
        args={[radius, 48, 48]}
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
          roughness={0.35}
          metalness={0.0}
          clearcoat={0.6}
          clearcoatRoughness={0.25}
          transparent
          opacity={opacity}
          envMapIntensity={0.7}
        />
      </Sphere>

      {!isDimmed && (
        <Text
          position={[0, -(radius + 0.4), 0]}
          fontSize={Math.min(radius > 0.4 ? 0.3 : 0.2, radius * 0.5)}
          maxWidth={radius > 0.4 ? 4 : 3}
          textAlign="center"
          color="#1F1F1F"
          anchorX="center"
          anchorY="middle"
          fillOpacity={radius > 0.4 ? 0.92 : hovered ? 0.85 : 0}
          outlineWidth={0.012}
          outlineColor="#FFFFFF"
          outlineOpacity={0.85}
        >
          {card.title.length > 18 ? card.title.slice(0, 16) + '…' : card.title}
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
            {card.tags && card.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {card.tags.slice(0, 4).map(tag => (
                  <span key={tag} className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-medium">{tag}</span>
                ))}
              </div>
            )}
            {card.linkedCards && card.linkedCards.length > 0 && (
              <p className="text-[9px] text-muted-foreground/60 mt-1.5">{card.linkedCards.length} connection{card.linkedCards.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

// ── Edge ────────────────────────────────────────────────────────────────────
function AnimatedEdge({ start, end, color, isDimmed, isHighlighted, isHidden, thickness }: {
  start: [number, number, number]; end: [number, number, number]; color: THREE.Color; isDimmed: boolean; isHighlighted?: boolean; isHidden?: boolean; thickness?: number;
}) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ], [start, end]);

  if (isHidden) return null;

  const baseWidth = thickness || 1.0;

  return (
    <Line
      points={points}
      color={isHighlighted ? color : new THREE.Color(0xC4C7C5)}
      lineWidth={isHighlighted ? baseWidth * 2.2 : baseWidth}
      transparent
      opacity={isDimmed ? 0.04 : isHighlighted ? 0.85 : 0.22}
    />
  );
}

// ── Camera controller ───────────────────────────────────────────────────────
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
      camera.position.set(0, 2, 30);
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
      minDistance={0.5}
      maxDistance={200}
      enableDamping
      dampingFactor={0.05}
      makeDefault
    />
  );
}

// ── Scene ───────────────────────────────────────────────────────────────────
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
    if (!hoveredCard || !hoveredCard.id) return null;
    const s = new Set<string>([hoveredCard.id]);
    hoveredCard.linkedCards?.forEach(id => { if(id) s.add(id); });
    cards.forEach(c => {
      if (c && c.id && c.linkedCards?.includes(hoveredCard.id)) s.add(c.id);
    });
    return s;
  }, [hoveredCard, cards]);

  // Hop-depth reachable set (focus)
  const hopReachable = useMemo(() => {
    if (!focusedCardId || hopDepth >= 3) return null;
    return getReachable(focusedCardId, cards, hopDepth);
  }, [focusedCardId, cards, hopDepth]);

  // Max connections for sizing
  const maxConn = useMemo(() => {
    const values = Object.values(connectionCounts);
    return values.length > 0 ? Math.max(1, ...values) : 1;
  }, [connectionCounts]);

  // Planet classification for visual sizing
  const { planetIds: scenePlanets } = useMemo(() => classifyNodes(cards, connectionCounts), [cards, connectionCounts]);

  // Node radius — planets are much larger
  const getRadius = useCallback((cardId: string) => {
    const count = connectionCounts[cardId] || 0;
    if (scenePlanets.has(cardId)) {
      return 0.5 + (count / maxConn) * 1.2; // large planet
    }
    return 0.15 + (count / maxConn) * 0.35; // small moon
  }, [connectionCounts, maxConn, scenePlanets]);

  // 3D Layouts
  const nodePositions = useMemo(() => {
    const validCards = cards.filter(Boolean);
    const n = validCards.length || 1;

    switch (layoutType) {
      case 'force':
        return computeForceLayout(validCards, connectionCounts);
      case 'sphere': {
        const positions: Record<string, [number, number, number]> = {};
        validCards.forEach((card, i) => {
          if (!card || !card.id) return;
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
        validCards.forEach(c => {
          if (!c || !c.category) return;
          const k = c.category.substring(0, 1) + '00'; (groups[k] ||= []).push(c);
        });
        const keys = Object.keys(groups);
        keys.forEach((cat, li) => {
          const g = groups[cat];
          const y = li * 5 - (keys.length - 1) * 2.5;
          g.forEach((card, ci) => {
            if(!card || !card.id) return;
            const a = (ci / g.length) * 2 * Math.PI;
            const r = Math.max(3, Math.min(8, g.length * 0.9));
            positions[card.id] = [r * Math.cos(a), y, r * Math.sin(a)];
          });
        });
        return positions;
      }
      default: {
        const positions: Record<string, [number, number, number]> = {};
        const sz = Math.max(2, Math.ceil(Math.cbrt(n)));
        validCards.forEach((card, i) => {
          if (!card || !card.id) return;
          positions[card.id] = [
            (i % sz - sz / 2) * 3,
            (Math.floor(i / sz) % sz - sz / 2) * 3,
            (Math.floor(i / (sz * sz)) - sz / 2) * 3,
          ];
        });
        return positions;
      }
    }
  }, [cards, layoutType, connectionCounts]);

  // Search
  const searchMatches = useMemo(() => {
    if (!searchTerm) return new Set<string>();
    const term = searchTerm.toLowerCase();
    return new Set(
      cards.filter(c =>
        c && (
          c.title.toLowerCase().includes(term) ||
          c.content.toLowerCase().includes(term) ||
          c.tags?.some(t => t.toLowerCase().includes(term))
        )
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
      <ambientLight intensity={0.85} />
      <directionalLight position={[15, 25, 15]} intensity={1.1} color="#ffffff" castShadow={false} />
      <directionalLight position={[-15, -10, -10]} intensity={0.45} color="#E8DEF8" />
      <hemisphereLight args={['#FFFFFF', '#E7E0EC', 0.55]} />

      {cards.map(card => {
        if (!card || !card.id) return null;
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
        if (!card || !card.id || !card.linkedCards) return [];
        const startPos = nodePositions[card.id];
        if (!startPos) return [];
        return card.linkedCards.map(linkedId => {
          if (!linkedId) return null;
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
        cards.forEach(c => {
            if (!c || !c.category) return;
            const k = c.category.substring(0, 1) + '00'; (groups[k] ||= []).push(c);
        });
        return Object.values(groups).flatMap(arr =>
          arr.slice(0, -1).map((card, i) => {
            const next = arr[i + 1];
            if (!card.id || !next?.id) return null;
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
                color={new THREE.Color(0x6750A4)}
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

// ── Main export ──────────────────────────────────────────────────────────────
export function Graph3D({ cards = [], onCardSelect, className }: Graph3DProps) {
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
    cards.forEach(c => c && c.tags?.forEach(t => { if(t) tagSet.add(t); }));
    return Array.from(tagSet).sort();
  }, [cards]);

  // Filter cards by selected tags
  const filteredCards = useMemo(() => {
    if (selectedTags.size === 0) return cards.filter(Boolean);
    const taggedIds = new Set<string>();
    cards.forEach(c => {
      if (c && c.id && c.tags?.some(t => selectedTags.has(t))) {
        taggedIds.add(c.id);
        c.linkedCards?.forEach(lid => { if(lid) taggedIds.add(lid); });
      }
    });
    return cards.filter(c => c && c.id && taggedIds.has(c.id));
  }, [cards, selectedTags]);

  const connectionCounts = useMemo(() => getConnectionCounts(filteredCards), [filteredCards]);
  const cardMap = useMemo(() => {
    const m: Record<string, ZettelCard> = {};
    filteredCards.forEach(c => { if(c && c.id) m[c.id] = c; });
    return m;
  }, [filteredCards]);

  const handleReset = useCallback(() => {
    setFocusTarget(null);
    setFocusedCardId(null);
    setResetCount(c => c + 1);
    setHopDepth(3);
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
            <SelectItem value="layers">📖 Category Layers</SelectItem>
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
              {filteredCards.filter(c => c && c.title.toLowerCase().includes(searchTerm.toLowerCase())).length} match{filteredCards.filter(c => c && c.title.toLowerCase().includes(searchTerm.toLowerCase())).length !== 1 ? 'es' : ''}
            </p>
          )}
        </div>

        <p className="text-[9px] text-muted-foreground/50">Click to focus · Double-click to open</p>
      </div>

      {/* Canvas */}
      <Canvas
        ref={canvasRef as any}
        camera={{ position: [0, 2, 20], fov: 55 }}
        style={{ background: 'radial-gradient(ellipse at center, #FEF7FF 0%, #F3EDF7 60%, #E7E0EC 100%)' }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        dpr={[1, 2]}
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

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  Background,
  ReactFlowProvider,
  MiniMap,
  BackgroundVariant,
  Panel,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ZettelCard } from '@/types/zettel';
import { getCategoryInfo } from '@/utils/deweySystem';
import { Search, RotateCcw, Zap, ZapOff, Menu, X, ZoomIn, ZoomOut, Locate, Link2, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useZettelCards } from '@/hooks/useZettelCards';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import * as d3Force from 'd3-force';

// Category color map - HSL values for each Dewey category
const CATEGORY_COLORS: Record<string, string> = {
  '000': '199 89% 48%',  // cyan
  '100': '271 76% 53%',  // purple
  '200': '25 95% 53%',   // orange
  '300': '346 77% 50%',  // rose
  '400': '172 66% 50%',  // teal
  '500': '221 83% 53%',  // blue
  '600': '142 71% 45%',  // green
  '700': '38 92% 50%',   // amber
  '800': '280 68% 60%',  // violet
  '900': '0 72% 51%',    // red
};

function getCategoryHSL(category: string): string {
  const key = category.charAt(0) + '00';
  return CATEGORY_COLORS[key] || CATEGORY_COLORS['000'];
}

interface GraphViewProps {
  cards: ZettelCard[];
  onCardSelect?: (card: ZettelCard) => void;
  onCardUpdate?: (card: ZettelCard) => void;
  className?: string;
}

function GraphViewInner({ cards, onCardSelect, onCardUpdate, className }: GraphViewProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutType, setLayoutType] = useState<'force' | 'circular' | 'hierarchical' | 'category'>('force');
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isAutoLinking, setIsAutoLinking] = useState(false);
  const simulationRef = useRef<d3Force.Simulation<any, any> | null>(null);
  const nodesDataRef = useRef<any[]>([]);
  const edgeHashRef = useRef<string>('');
  const isAnimatingRef = useRef(false);

  // Filter cards
  const filteredCards = useMemo(() => {
    if (!searchTerm) return cards;
    const term = searchTerm.toLowerCase();
    return cards.filter(card =>
      card.title.toLowerCase().includes(term) ||
      card.content.toLowerCase().includes(term) ||
      card.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }, [cards, searchTerm]);

  // Compute connection counts and classify nodes as planets or moons
  const connectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredCards.forEach(card => {
      counts[card.id] = (counts[card.id] || 0);
      card.linkedCards.forEach(linkedId => {
        counts[card.id] = (counts[card.id] || 0) + 1;
        counts[linkedId] = (counts[linkedId] || 0) + 1;
      });
    });
    return counts;
  }, [filteredCards]);

  // Classify nodes: planets (≥ threshold connections) vs moons
  const { planets, moonParentMap } = useMemo(() => {
    const threshold = Math.max(2, Math.ceil(filteredCards.length * 0.05));
    const planetIds = new Set<string>();
    const parentMap: Record<string, string> = {}; // moonId -> planetId

    // Identify planets (high-connectivity hubs)
    filteredCards.forEach(card => {
      if ((connectionCounts[card.id] || 0) >= threshold) {
        planetIds.add(card.id);
      }
    });

    // If no planets found, promote the top connected nodes
    if (planetIds.size === 0 && filteredCards.length > 0) {
      const sorted = [...filteredCards].sort((a, b) =>
        (connectionCounts[b.id] || 0) - (connectionCounts[a.id] || 0)
      );
      const topCount = Math.max(1, Math.ceil(filteredCards.length * 0.15));
      sorted.slice(0, topCount).forEach(c => {
        if ((connectionCounts[c.id] || 0) > 0) planetIds.add(c.id);
      });
    }

    // Assign moons to their most-connected planet neighbor
    filteredCards.forEach(card => {
      if (planetIds.has(card.id)) return;
      let bestPlanet: string | null = null;
      let bestScore = -1;
      card.linkedCards.forEach(linkedId => {
        if (planetIds.has(linkedId)) {
          const score = connectionCounts[linkedId] || 0;
          if (score > bestScore) {
            bestScore = score;
            bestPlanet = linkedId;
          }
        }
      });
      if (bestPlanet) {
        parentMap[card.id] = bestPlanet;
      }
    });

    return { planets: planetIds, moonParentMap: parentMap };
  }, [filteredCards, connectionCounts]);

  // Compute connected node IDs for hover highlight
  const connectedMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    filteredCards.forEach(card => {
      if (!map[card.id]) map[card.id] = new Set();
      card.linkedCards.forEach(linkedId => {
        map[card.id].add(linkedId);
        if (!map[linkedId]) map[linkedId] = new Set();
        map[linkedId].add(card.id);
      });
    });
    return map;
  }, [filteredCards]);

  // Edge hash to detect real changes
  const currentEdgeHash = useMemo(() => {
    return filteredCards.map(c => `${c.id}:${c.linkedCards.sort().join(',')}`).join('|');
  }, [filteredCards]);

  // Compute target positions for non-force layouts
  const getTargetPositions = useCallback((cards: ZettelCard[]) => {
    const positions: Record<string, { x: number; y: number }> = {};
    const radius = Math.max(300, cards.length * 20);

    switch (layoutType) {
      case 'circular':
        cards.forEach((card, index) => {
          const angle = (index * 2 * Math.PI) / cards.length;
          positions[card.id] = {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
          };
        });
        break;

      case 'hierarchical': {
        const cardsByLevel: Record<number, ZettelCard[]> = {};
        cards.forEach(card => {
          const level = card.number.split('.').length;
          if (!cardsByLevel[level]) cardsByLevel[level] = [];
          cardsByLevel[level].push(card);
        });
        Object.entries(cardsByLevel).forEach(([levelStr, levelCards]) => {
          const level = parseInt(levelStr);
          levelCards.forEach((card, index) => {
            positions[card.id] = {
              x: (index - levelCards.length / 2) * 250,
              y: (level - 1) * 200,
            };
          });
        });
        break;
      }

      case 'category': {
        const groups: Record<string, ZettelCard[]> = {};
        cards.forEach(card => {
          const key = card.category.charAt(0);
          if (!groups[key]) groups[key] = [];
          groups[key].push(card);
        });
        let catIdx = 0;
        const totalCats = Object.keys(groups).length;
        Object.entries(groups).forEach(([, groupCards]) => {
          const angle = (catIdx * 2 * Math.PI) / totalCats;
          const cx = Math.cos(angle) * 400;
          const cy = Math.sin(angle) * 400;
          const subRadius = Math.max(80, groupCards.length * 15);
          groupCards.forEach((card, i) => {
            const a = (i * 2 * Math.PI) / groupCards.length;
            positions[card.id] = {
              x: cx + Math.cos(a) * subRadius,
              y: cy + Math.sin(a) * subRadius,
            };
          });
          catIdx++;
        });
        break;
      }

      default: // force - use grid as initial positions
        cards.forEach((card, index) => {
          const cols = Math.ceil(Math.sqrt(cards.length));
          positions[card.id] = {
            x: (index % cols) * 150 - (cols * 75),
            y: Math.floor(index / cols) * 150 - (Math.ceil(cards.length / cols) * 75),
          };
        });
        break;
    }
    return positions;
  }, [layoutType]);

  // Build edges
  const graphEdges = useMemo(() => {
    const edges: Edge[] = [];
    filteredCards.forEach(card => {
      card.linkedCards.forEach(linkedCardId => {
        if (filteredCards.find(c => c.id === linkedCardId)) {
          // Compute shared tags for edge weight
          const targetCard = filteredCards.find(c => c.id === linkedCardId);
          const sharedTags = targetCard
            ? card.tags.filter(t => targetCard.tags.includes(t)).length
            : 0;
          const weight = Math.min(1 + sharedTags * 0.5, 3);

          const sourceHSL = getCategoryHSL(card.category);
          const targetHSL = targetCard ? getCategoryHSL(targetCard.category) : sourceHSL;

          const isHoverHighlighted = hoveredNodeId &&
            (card.id === hoveredNodeId || linkedCardId === hoveredNodeId);
          const isHoverDimmed = hoveredNodeId && !isHoverHighlighted;

          const sourceIsPlanet = planets.has(card.id);
          const targetIsPlanet = planets.has(linkedCardId);
          const isGravityLink = sourceIsPlanet || targetIsPlanet;

          edges.push({
            id: `${card.id}-${linkedCardId}`,
            source: card.id,
            target: linkedCardId,
            type: 'default',
            style: {
              stroke: isHoverHighlighted
                ? `hsl(${sourceHSL})`
                : isHoverDimmed
                  ? 'hsl(var(--foreground) / 0.05)'
                  : isGravityLink
                    ? `hsl(${sourceHSL} / 0.25)`
                    : `hsl(${sourceHSL} / 0.15)`,
              strokeWidth: isHoverHighlighted ? weight + 1 : isGravityLink ? weight + 0.5 : weight,
              strokeDasharray: (!sourceIsPlanet && !targetIsPlanet) ? '4 3' : undefined,
              transition: 'stroke 0.2s, stroke-width 0.2s, opacity 0.2s',
            },
            animated: false,
          });
        }
      });
    });
    return edges;
  }, [filteredCards, hoveredNodeId, planets]);

  // Build nodes with custom rendering
  const graphNodes = useMemo(() => {
    const positions = getTargetPositions(filteredCards);

    return filteredCards.map((card): Node => {
      const hsl = getCategoryHSL(card.category);
      const conns = connectionCounts[card.id] || 0;
      const isPlanet = planets.has(card.id);
      
      // Planets are much larger; moons are small
      const nodeSize = isPlanet
        ? Math.max(isMobile ? 28 : 40, Math.min(isMobile ? 56 : 80, (isMobile ? 28 : 40) + conns * (isMobile ? 4 : 5)))
        : Math.max(isMobile ? 10 : 14, Math.min(isMobile ? 20 : 28, (isMobile ? 10 : 14) + conns * (isMobile ? 2 : 3)));

      const isHovered = hoveredNodeId === card.id;
      const isConnected = hoveredNodeId ? connectedMap[hoveredNodeId]?.has(card.id) : false;
      const isDimmed = hoveredNodeId && !isHovered && !isConnected;
      const isSearchMatch = searchTerm && (
        card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      const opacity = isDimmed ? 0.15 : 1;
      const glowSize = isPlanet
        ? (isHovered ? 20 : 8)
        : (isHovered ? 10 : isConnected ? 4 : 0);

      return {
        id: card.id,
        type: 'default',
        position: positions[card.id] || { x: 0, y: 0 },
        data: {
          label: (
            <div
              className="graph-node-container"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: isMobile ? '2px' : '4px',
                opacity,
                transition: 'opacity 0.25s ease',
              }}
            >
              {/* Orbital ring for planets */}
              {isPlanet && !isMobile && (
                <div
                  style={{
                    position: 'absolute',
                    width: `${nodeSize * 3.5}px`,
                    height: `${nodeSize * 3.5}px`,
                    borderRadius: '50%',
                    border: `1px solid hsl(${hsl} / ${isDimmed ? 0.03 : 0.12})`,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    transition: 'border-color 0.3s',
                  }}
                />
              )}
              <div
                className="graph-node-circle"
                style={{
                  width: `${nodeSize}px`,
                  height: `${nodeSize}px`,
                  borderRadius: '50%',
                  background: isPlanet
                    ? `radial-gradient(circle at 35% 35%, hsl(${hsl} / 0.9), hsl(${hsl}) 60%, hsl(${hsl} / 0.7))`
                    : `hsl(${hsl})`,
                  boxShadow: glowSize > 0
                    ? `0 0 ${glowSize}px ${glowSize / 2}px hsl(${hsl} / ${isPlanet ? 0.4 : 0.5})`
                    : isPlanet
                      ? `0 0 8px 3px hsl(${hsl} / 0.25), 0 2px 4px hsl(0 0% 0% / 0.2)`
                      : `0 1px 3px hsl(0 0% 0% / 0.15)`,
                  border: isSearchMatch
                    ? '2px solid hsl(var(--primary))'
                    : isHovered
                      ? `2px solid hsl(var(--foreground) / 0.6)`
                      : isPlanet
                        ? `2px solid hsl(${hsl} / 0.6)`
                        : '1.5px solid hsl(var(--background) / 0.8)',
                  transition: 'box-shadow 0.25s ease, border 0.2s ease, transform 0.2s ease',
                  transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: isPlanet ? 10 : 1,
                }}
              />
              {/* Label: always show for planets, hover-only for moons on desktop */}
              {(!isMobile && (isPlanet || isHovered || isConnected)) && (
                <div
                  style={{
                    maxWidth: isPlanet ? '120px' : '100px',
                    fontSize: isPlanet ? '11px' : '10px',
                    fontWeight: isPlanet ? 600 : 500,
                    color: isDimmed ? 'hsl(var(--muted-foreground) / 0.3)' : 'hsl(var(--foreground) / 0.85)',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    transition: 'color 0.2s ease',
                    pointerEvents: 'none',
                  }}
                >
                  {card.title.length > (isPlanet ? 20 : 16) ? card.title.slice(0, isPlanet ? 19 : 15) + '…' : card.title}
                </div>
              )}
            </div>
          ),
        },
        style: {
          background: 'transparent',
          border: 'none',
          padding: 0,
          width: 'auto',
          height: 'auto',
        },
        draggable: true,
      };
    });
  }, [filteredCards, getTargetPositions, connectionCounts, hoveredNodeId, connectedMap, searchTerm, isMobile, planets]);

  const [nodes, setNodes, onNodesChange] = useNodesState(graphNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graphEdges);

  // Sync edges when they change
  useEffect(() => {
    setEdges(graphEdges);
  }, [graphEdges, setEdges]);

  // --- STABLE PHYSICS SIMULATION ---
  useEffect(() => {
    // Only run physics for force layout
    if (!physicsEnabled || layoutType !== 'force' || filteredCards.length === 0) {
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      // For non-force layouts, set positions directly with animation
      if (layoutType !== 'force') {
        const targets = getTargetPositions(filteredCards);
        animateToPositions(targets);
      } else {
        setNodes(graphNodes);
      }
      return;
    }

    // Build simulation data
    const simNodes = filteredCards.map(card => {
      const existing = nodesDataRef.current.find(n => n.id === card.id);
      const isPlanet = planets.has(card.id);
      return {
        id: card.id,
        x: existing?.x ?? (Math.random() - 0.5) * 600,
        y: existing?.y ?? (Math.random() - 0.5) * 600,
        vx: existing?.vx ?? 0,
        vy: existing?.vy ?? 0,
        isPlanet,
        mass: isPlanet ? 5 + (connectionCounts[card.id] || 0) : 1,
      };
    });

    const simLinks = filteredCards.flatMap(card =>
      card.linkedCards
        .filter(lid => filteredCards.some(c => c.id === lid))
        .map(lid => ({ source: card.id, target: lid }))
    );

    // Stop old simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Orbital distances: moons orbit close to planets, planets repel each other strongly
    const orbitRadius = isMobile ? 60 : 100;
    const planetRepulsion = isMobile ? -2000 : -3000;

    const simulation = d3Force.forceSimulation(simNodes)
      // Strong repulsion between planets, mild for moons
      .force('charge', d3Force.forceManyBody()
        .strength((d: any) => d.isPlanet ? planetRepulsion : -150)
        .distanceMax(800)
      )
      // Links: short distance for planet-moon, longer for planet-planet
      .force('link', d3Force.forceLink(simLinks)
        .id((d: any) => d.id)
        .distance((link: any) => {
          const s = link.source;
          const t = link.target;
          const sourceIsPlanet = s.isPlanet;
          const targetIsPlanet = t.isPlanet;
          if (sourceIsPlanet && targetIsPlanet) return orbitRadius * 4; // planets far apart
          return orbitRadius + Math.random() * 30; // moons orbit close
        })
        .strength((link: any) => {
          const s = link.source;
          const t = link.target;
          if (s.isPlanet && t.isPlanet) return 0.15; // loose planet-planet links
          return 0.7; // strong gravitational pull for moons
        })
      )
      .force('center', d3Force.forceCenter(0, 0).strength(0.03))
      // Collision: planets have large radii, moons small
      .force('collision', d3Force.forceCollide()
        .radius((d: any) => d.isPlanet ? (isMobile ? 50 : 70) : (isMobile ? 15 : 22))
        .strength(0.9)
      )
      // Gentle centering gravity
      .force('x', d3Force.forceX(0).strength((d: any) => d.isPlanet ? 0.015 : 0.005))
      .force('y', d3Force.forceY(0).strength((d: any) => d.isPlanet ? 0.015 : 0.005))
      .alphaDecay(0.018)
      .velocityDecay(0.4);

    simulationRef.current = simulation;

    simulation.on('tick', () => {
      // Velocity capping
      simNodes.forEach(n => {
        const maxV = 15;
        if (Math.abs(n.vx || 0) > maxV) n.vx = Math.sign(n.vx || 0) * maxV;
        if (Math.abs(n.vy || 0) > maxV) n.vy = Math.sign(n.vy || 0) * maxV;
      });

      nodesDataRef.current = simNodes;

      setNodes(nds =>
        nds.map(node => {
          const sim = simNodes.find(s => s.id === node.id);
          if (sim) {
            return {
              ...node,
              position: { x: sim.x || 0, y: sim.y || 0 },
            };
          }
          return node;
        })
      );
    });

    return () => {
      simulation.stop();
    };
    // Only re-create when the actual graph structure changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [physicsEnabled, layoutType, currentEdgeHash, filteredCards.length, planets, connectionCounts]);

  // Update node visuals (hover, search) without recreating simulation
  useEffect(() => {
    if (physicsEnabled && layoutType === 'force') {
      // Only update node data/style, preserve positions from simulation
      setNodes(nds =>
        nds.map(node => {
          const matchingGraphNode = graphNodes.find(gn => gn.id === node.id);
          if (matchingGraphNode) {
            return {
              ...node,
              data: matchingGraphNode.data,
              style: matchingGraphNode.style,
            };
          }
          return node;
        })
      );
    } else if (layoutType !== 'force') {
      // Non-force: update data but keep animated positions
      setNodes(nds =>
        nds.map(node => {
          const matchingGraphNode = graphNodes.find(gn => gn.id === node.id);
          if (matchingGraphNode) {
            return {
              ...node,
              data: matchingGraphNode.data,
              style: matchingGraphNode.style,
            };
          }
          return node;
        })
      );
    } else {
      setNodes(graphNodes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoveredNodeId, searchTerm]);

  // Animated layout transitions
  const animateToPositions = useCallback((targets: Record<string, { x: number; y: number }>) => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    setNodes(nds => {
      const startPositions = Object.fromEntries(nds.map(n => [n.id, { ...n.position }]));
      const duration = 500;
      const startTime = performance.now();

      const animate = (time: number) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);

        setNodes(current =>
          current.map(node => {
            const start = startPositions[node.id];
            const target = targets[node.id];
            if (!start || !target) return node;
            return {
              ...node,
              position: {
                x: start.x + (target.x - start.x) * eased,
                y: start.y + (target.y - start.y) * eased,
              },
            };
          })
        );

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          isAnimatingRef.current = false;
        }
      };

      requestAnimationFrame(animate);
      return nds; // Return unchanged for initial call
    });
  }, [setNodes]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('zettel-cards-graph')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'zettel_cards' }, () => {})
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Hover handlers
  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  // Click handler
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const card = filteredCards.find(c => c.id === node.id);
    if (card && onCardSelect) onCardSelect(card);
  }, [filteredCards, onCardSelect]);

  // Connect handler
  const onConnect = useCallback((params: any) => {
    const sourceCard = filteredCards.find(c => c.id === params.source);
    const targetCard = filteredCards.find(c => c.id === params.target);
    if (sourceCard && targetCard && onCardUpdate) {
      if ((sourceCard.linkedCards || []).includes(targetCard.id)) {
        toast.error('Link already exists');
        return;
      }
      const updated = { ...sourceCard, linkedCards: [...(sourceCard.linkedCards || []), targetCard.id] };
      onCardUpdate(updated);
      toast.success(`Linked "${sourceCard.title}" → "${targetCard.title}"`);
    }
  }, [filteredCards, onCardUpdate]);

  // Edge click to remove link
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    const sourceCard = filteredCards.find(c => c.id === edge.source);
    const targetCard = filteredCards.find(c => c.id === edge.target);
    if (sourceCard && targetCard && onCardUpdate) {
      const updated = {
        ...sourceCard,
        linkedCards: (sourceCard.linkedCards || []).filter(id => id !== targetCard.id),
      };
      onCardUpdate(updated);
      setEdges(eds => eds.filter(e => e.id !== edge.id));
      toast(`Unlinked "${sourceCard.title}" from "${targetCard.title}"`);
    }
  }, [filteredCards, onCardUpdate, setEdges]);

  const resetLayout = useCallback(() => {
    if (physicsEnabled && layoutType === 'force' && simulationRef.current) {
      simulationRef.current.alpha(1).restart();
    } else {
      const positions = getTargetPositions(filteredCards);
      animateToPositions(positions);
    }
    setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 600);
  }, [filteredCards, getTargetPositions, physicsEnabled, layoutType, fitView, animateToPositions]);

  // Auto-link handlers
  const runAutoLink = useCallback(async (mode: 'auto' | 'suggest') => {
    if (!user) {
      toast.error('Sign in to use auto-linking');
      return;
    }
    setIsAutoLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke('alice-auto-link', {
        body: { user_id: user.id, mode },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success(
          mode === 'auto'
            ? `Auto-linked ${data.updated} cards (${data.scanned} scanned)`
            : `Suggested links for ${data.updated} cards (${data.scanned} scanned)`
        );
      } else {
        toast.error(data?.error || 'Auto-link failed');
      }
    } catch (e: any) {
      toast.error(e.message || 'Auto-link request failed');
    } finally {
      setIsAutoLinking(false);
    }
  }, [user]);

  return (
    <div className={cn("relative w-full h-full bg-background overflow-hidden", className)}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.05}
        maxZoom={2.5}
        className="graph-canvas"
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'default',
          animated: false,
          style: { stroke: 'hsl(var(--foreground) / 0.15)', strokeWidth: 1 },
        }}
        nodesDraggable
        nodesConnectable
        selectNodesOnDrag={false}
        panOnDrag={[0, 1, 2]}
        zoomOnScroll
        zoomOnPinch
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={isMobile ? 28 : 22}
          size={0.8}
          color="hsl(var(--border) / 0.5)"
        />

        {!isMobile && (
          <Controls
            className="graph-controls"
            showInteractive={false}
          />
        )}

        <MiniMap
          className={cn(
            "graph-minimap",
            isMobile && "!w-20 !h-16"
          )}
          nodeColor={(node) => {
            const card = filteredCards.find(c => c.id === node.id);
            if (card) return `hsl(${getCategoryHSL(card.category)})`;
            return 'hsl(var(--muted))';
          }}
          maskColor="hsl(var(--background) / 0.85)"
          pannable
          zoomable={false}
        />

        {/* === CONTROLS === */}
        {isMobile ? (
          <>
            {/* FAB toggle */}
            <Panel position="top-right" className="m-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowControls(!showControls)}
                className="h-11 w-11 bg-card/95 backdrop-blur-md shadow-lg rounded-full touch-manipulation"
              >
                {showControls ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </Panel>

            {showControls && (
              <Panel position="top-center" className="w-full px-4 mt-16">
                <div className="bg-card/98 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-4 space-y-3 max-w-sm mx-auto">
                  <Input
                    placeholder="Search cards..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10"
                  />
                  <Select value={layoutType} onValueChange={(v: any) => setLayoutType(v)}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="force">Force</SelectItem>
                      <SelectItem value="circular">Circular</SelectItem>
                      <SelectItem value="hierarchical">Hierarchical</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetLayout} className="flex-1 h-10">
                      <RotateCcw className="h-4 w-4 mr-1" /> Reset
                    </Button>
                    {layoutType === 'force' && (
                      <Button
                        variant={physicsEnabled ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setPhysicsEnabled(!physicsEnabled)}
                        className="flex-1 h-10"
                      >
                        {physicsEnabled ? <Zap className="h-4 w-4 mr-1" /> : <ZapOff className="h-4 w-4 mr-1" />}
                        Physics
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runAutoLink('auto')}
                      disabled={isAutoLinking}
                      className="flex-1 h-10"
                    >
                      <Link2 className="h-4 w-4 mr-1" />
                      {isAutoLinking ? 'Linking…' : 'Auto-Link'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => runAutoLink('suggest')}
                      disabled={isAutoLinking}
                      className="flex-1 h-10"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      {isAutoLinking ? 'Suggesting…' : 'Suggest'}
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground text-center pt-1 border-t border-border">
                    {filteredCards.length} nodes · {graphEdges.length} edges
                  </div>
                </div>
              </Panel>
            )}

            {/* Zoom controls */}
            <Panel position="bottom-right" className="mb-20 mr-3">
              <div className="flex flex-col gap-2">
                {[
                  { icon: ZoomIn, action: () => zoomIn({ duration: 200 }), label: 'Zoom in' },
                  { icon: ZoomOut, action: () => zoomOut({ duration: 200 }), label: 'Zoom out' },
                  { icon: Locate, action: () => fitView({ padding: 0.2, duration: 300 }), label: 'Fit view' },
                ].map(({ icon: Icon, action, label }) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="icon"
                    onClick={action}
                    className="h-12 w-12 bg-card/95 backdrop-blur-md shadow-lg rounded-full touch-manipulation"
                    aria-label={label}
                  >
                    <Icon className="h-5 w-5" />
                  </Button>
                ))}
              </div>
            </Panel>
          </>
        ) : (
          <>
            {/* Desktop: floating pill toolbar */}
            <Panel position="top-center" className="mt-3">
              <div className="graph-toolbar">
                <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <Input
                  placeholder="Search…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-7 w-40 text-xs bg-transparent border-none shadow-none focus-visible:ring-0 px-1"
                />
                <div className="w-px h-5 bg-border" />
                <Select value={layoutType} onValueChange={(v: any) => setLayoutType(v)}>
                  <SelectTrigger className="h-7 w-28 text-xs border-none bg-transparent shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="force">Force</SelectItem>
                    <SelectItem value="circular">Circular</SelectItem>
                    <SelectItem value="hierarchical">Hierarchical</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>
                <div className="w-px h-5 bg-border" />
                {layoutType === 'force' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPhysicsEnabled(!physicsEnabled);
                      toast(physicsEnabled ? 'Physics off' : 'Physics on');
                    }}
                    className="h-7 w-7 p-0"
                  >
                    {physicsEnabled ? <Zap className="h-3.5 w-3.5 text-primary" /> : <ZapOff className="h-3.5 w-3.5" />}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={resetLayout} className="h-7 w-7 p-0">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <div className="w-px h-5 bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => runAutoLink('auto')}
                  disabled={isAutoLinking}
                  className="h-7 px-2 text-xs"
                  title="Auto-link cards by similarity"
                >
                  <Link2 className="h-3.5 w-3.5 mr-1" />
                  {isAutoLinking ? 'Linking…' : 'Link'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => runAutoLink('suggest')}
                  disabled={isAutoLinking}
                  className="h-7 px-2 text-xs"
                  title="Suggest links as dotted lines"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  {isAutoLinking ? '…' : 'Suggest'}
                </Button>
              </div>
            </Panel>

            {/* Stats badge */}
            <Panel position="bottom-left" className="mb-3 ml-3">
              <div className="graph-stats-badge">
                {filteredCards.length} nodes · {graphEdges.length} edges
                {physicsEnabled && layoutType === 'force' && <Zap className="h-3 w-3 text-primary inline ml-1" />}
              </div>
            </Panel>
          </>
        )}
      </ReactFlow>
    </div>
  );
}

export function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} />
    </ReactFlowProvider>
  );
}

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
  addEdge,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ZettelCard } from '@/types/zettel';
import { getCategoryInfo } from '@/utils/deweySystem';
import { Search, Layout, RotateCcw, Maximize2, Minimize2, Link2Off, Link2, Zap, ZapOff, ChevronDown, ChevronUp, MapIcon, ZoomIn, ZoomOut, Locate, X, Menu, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useZettelCards } from '@/hooks/useZettelCards';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import * as d3Force from 'd3-force';

interface GraphViewProps {
  cards: ZettelCard[];
  onCardSelect?: (card: ZettelCard) => void;
  onCardUpdate?: (card: ZettelCard) => void;
  className?: string;
}

function GraphViewInner({ cards, onCardSelect, onCardUpdate, className }: GraphViewProps) {
  const isMobile = useIsMobile();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutType, setLayoutType] = useState<'force' | 'circular' | 'hierarchical' | 'category'>('force');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
  const [showControls, setShowControls] = useState(!isMobile);
  const [showMinimap, setShowMinimap] = useState(!isMobile);
  const { autoLinkAll, clearAllLinks, isAutoLinking, isClearingLinks } = useZettelCards();
  const simulationRef = useRef<d3Force.Simulation<any, any> | null>(null);
  const animationFrameRef = useRef<number>();

  // Filter cards based on search
  const filteredCards = useMemo(() => {
    if (!searchTerm) return cards;
    return cards.filter(card =>
      card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [cards, searchTerm]);

  // Calculate node positions based on layout type
  const getNodePositions = useCallback((cards: ZettelCard[]) => {
    const positions: { [key: string]: { x: number; y: number } } = {};
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

      case 'hierarchical':
        // Build a proper hierarchy based on card numbers
        const cardsByLevel: { [level: number]: ZettelCard[] } = {};
        const maxLevel = cards.reduce((max, card) => {
          const level = card.number.split('.').length;
          if (!cardsByLevel[level]) cardsByLevel[level] = [];
          cardsByLevel[level].push(card);
          return Math.max(max, level);
        }, 0);

        // Position cards: parents at top (y=0), children below
        Object.entries(cardsByLevel).forEach(([levelStr, levelCards]) => {
          const level = parseInt(levelStr);
          const cardsInLevel = levelCards.length;
          
          levelCards.forEach((card, index) => {
            positions[card.id] = {
              x: (index - cardsInLevel / 2) * 250,
              y: (level - 1) * 200, // Parents (level 1) at y=0, children below
            };
          });
        });
        break;

      case 'category':
        const categoryGroups: { [key: string]: ZettelCard[] } = {};
        cards.forEach(card => {
          const mainCategory = card.category.charAt(0);
          if (!categoryGroups[mainCategory]) {
            categoryGroups[mainCategory] = [];
          }
          categoryGroups[mainCategory].push(card);
        });

        let categoryIndex = 0;
        Object.entries(categoryGroups).forEach(([category, categoryCards]) => {
          const centerX = (categoryIndex * 400) - (Object.keys(categoryGroups).length * 200);
          const centerY = 0;
          
          categoryCards.forEach((card, index) => {
            const angle = (index * 2 * Math.PI) / categoryCards.length;
            const categoryRadius = Math.max(100, categoryCards.length * 15);
            
            positions[card.id] = {
              x: centerX + Math.cos(angle) * categoryRadius,
              y: centerY + Math.sin(angle) * categoryRadius,
            };
          });
          categoryIndex++;
        });
        break;

      default: // force layout - Obsidian radial style: parent in center, children around it
        // Identify all linked relationships
        const linkMap: Map<string, string[]> = new Map();
        const allLinkedCards: Set<string> = new Set();
        
        cards.forEach(card => {
          if (card.linkedCards && card.linkedCards.length > 0) {
            linkMap.set(card.id, card.linkedCards);
            allLinkedCards.add(card.id);
            card.linkedCards.forEach(id => allLinkedCards.add(id));
          }
        });

        // Find the card with most connections (main hub)
        let mainHubId = '';
        let maxConnections = 0;
        linkMap.forEach((children, parentId) => {
          if (children.length > maxConnections) {
            maxConnections = children.length;
            mainHubId = parentId;
          }
        });

        // Position main hub in center
        if (mainHubId) {
          positions[mainHubId] = { x: 0, y: 0 };
          
          const children = linkMap.get(mainHubId) || [];
          const childRadius = 300; // Distance from center
          
          // Evenly distribute children around the parent
          children.forEach((childId, index) => {
            const angle = (index * 2 * Math.PI) / children.length;
            positions[childId] = {
              x: Math.cos(angle) * childRadius,
              y: Math.sin(angle) * childRadius,
            };
          });

          // Position other parent cards (if any) in their own clusters
          linkMap.forEach((children, parentId) => {
            if (parentId !== mainHubId && !positions[parentId]) {
              // Place in outer ring if not already positioned
              const outerRadius = 600;
              const angle = Math.random() * 2 * Math.PI;
              positions[parentId] = {
                x: Math.cos(angle) * outerRadius,
                y: Math.sin(angle) * outerRadius,
              };
              
              // Position their children around them
              children.forEach((childId, index) => {
                if (!positions[childId]) {
                  const childAngle = (index * 2 * Math.PI) / children.length;
                  const smallRadius = 200;
                  positions[childId] = {
                    x: positions[parentId].x + Math.cos(childAngle) * smallRadius,
                    y: positions[parentId].y + Math.sin(childAngle) * smallRadius,
                  };
                }
              });
            }
          });
        }

        // Position unlinked cards on outer circle
        const unlinkedCards = cards.filter(card => !allLinkedCards.has(card.id));
        const outerRadius = 800;
        unlinkedCards.forEach((card, index) => {
          const angle = (index * 2 * Math.PI) / Math.max(unlinkedCards.length, 1);
          positions[card.id] = {
            x: Math.cos(angle) * outerRadius,
            y: Math.sin(angle) * outerRadius,
          };
        });
         break;
    }

    return positions;
  }, [layoutType]);

  // Create nodes from cards
  const initialNodes = useMemo(() => {
    const positions = getNodePositions(filteredCards);
    
    // Identify parent cards (cards with children)
    const parentIds = new Set<string>();
    filteredCards.forEach(card => {
      if (card.linkedCards && card.linkedCards.length > 0) {
        parentIds.add(card.id);
      }
    });
    
    return filteredCards.map((card): Node => {
      const position = positions[card.id] || { x: 0, y: 0 };
      const isParent = parentIds.has(card.id);

      return {
        id: card.id,
        type: 'default',
        position,
        data: {
          label: (
            <div className="flex flex-col items-center gap-2">
              <div className={cn(
                "text-foreground font-semibold text-center max-w-[180px] leading-tight px-2",
                isParent ? "text-base" : "text-sm"
              )}>
                {card.title}
              </div>
              <div 
                className={cn(
                  "rounded-full border-2 border-foreground/40 bg-background hover:border-primary hover:bg-primary/20 transition-all cursor-pointer shadow-md",
                  isParent ? "w-4 h-4" : "w-3 h-3"
                )}
              />
            </div>
          )
        },
        style: {
          background: 'transparent',
          border: 'none',
          padding: 0,
        },
        draggable: true,
      };
    });
  }, [filteredCards, getNodePositions]);

  // Create edges from card links - STRICTLY UNIDIRECTIONAL
  const initialEdges = useMemo(() => {
    const edges: Edge[] = [];
    
    filteredCards.forEach(card => {
      // Only create edges from this card to its linked cards (parent -> child)
      card.linkedCards.forEach(linkedCardId => {
        if (filteredCards.find(c => c.id === linkedCardId)) {
          edges.push({
            id: `${card.id}-${linkedCardId}`,
            source: card.id,
            target: linkedCardId,
            type: 'straight',
            style: {
              stroke: 'hsl(var(--foreground) / 0.25)',
              strokeWidth: 2,
            },
            animated: false,
            markerEnd: undefined, // No arrow - cleaner Obsidian style
          });
        }
      });
    });

    return edges;
  }, [filteredCards]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Physics simulation for Obsidian-style force layout
  useEffect(() => {
    if (physicsEnabled && layoutType === 'force' && nodes.length > 0) {
      // Convert edges to d3 link format
      const d3Links = edges.map(edge => ({
        source: edge.source,
        target: edge.target,
      }));

      // Create force simulation - Obsidian-style physics with enhanced repulsion and collision
      const simulation = d3Force.forceSimulation(nodes as any)
        .force('charge', d3Force.forceManyBody()
          .strength(-2000) // Stronger repulsion for better spacing
          .distanceMax(800)
        )
        .force('link', d3Force.forceLink(d3Links)
          .id((d: any) => d.id)
          .distance(200) // Spring-like attraction between linked nodes
          .strength(0.5) // Stronger attraction for parent-child
        )
        .force('center', d3Force.forceCenter(0, 0).strength(0.03)) // Gentle gravity to center
        .force('collision', d3Force.forceCollide()
          .radius(150) // Larger collision radius to prevent overlap
          .strength(1.2) // Strong collision detection
        )
        .force('x', d3Force.forceX(0).strength(0.01)) // Weak horizontal centering
        .force('y', d3Force.forceY(0).strength(0.01)) // Weak vertical centering
        .alphaDecay(0.008) // Even slower decay for organic settling
        .velocityDecay(0.4); // Lower damping for more natural movement

      simulationRef.current = simulation;

      // Update node positions on each tick
      simulation.on('tick', () => {
        setNodes((nds) =>
          nds.map((node) => {
            const simNode = simulation.nodes().find((n: any) => n.id === node.id);
            if (simNode) {
              return {
                ...node,
                position: { x: simNode.x || 0, y: simNode.y || 0 },
              };
            }
            return node;
          })
        );
      });

      return () => {
        simulation.stop();
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    } else {
      // Stop simulation when physics is disabled
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
    }
  }, [physicsEnabled, layoutType, nodes.length, edges, setNodes]);

  // Subscribe to realtime updates for instant graph updates
  useEffect(() => {
    const channel = supabase
      .channel('zettel-cards-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'zettel_cards'
        },
        () => {
          // When any card is updated (including linked_cards changes),
          // the query will automatically refetch due to invalidation
          console.log('Zettel card updated - graph will refresh');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Update nodes when initialNodes change (only if physics is off)
  useMemo(() => {
    if (!physicsEnabled) {
      setNodes(initialNodes);
    }
  }, [initialNodes, setNodes, physicsEnabled]);

  // Update edges when initialEdges change
  useMemo(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const card = filteredCards.find(c => c.id === node.id);
    if (card && onCardSelect) {
      onCardSelect(card);
    }
  }, [filteredCards, onCardSelect]);

  const onConnect = useCallback((params: any) => {
    const sourceCard = filteredCards.find(c => c.id === params.source);
    const targetCard = filteredCards.find(c => c.id === params.target);
    
    if (sourceCard && targetCard && onCardUpdate) {
      // Prevent duplicate links
      if ((sourceCard.linkedCards || []).includes(targetCard.id)) {
        toast.error('Link already exists');
        return;
      }
      
      // STRICTLY UNIDIRECTIONAL: Only update source card to link to target
      // This is a manual link, so it persists regardless of hierarchy
      const updatedSourceCard = {
        ...sourceCard,
        linkedCards: [...(sourceCard.linkedCards || []), targetCard.id]
      };
      
      // Immediately add edge to the graph
      const newEdge = {
        id: `${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        type: 'straight',
        style: {
          stroke: 'hsl(var(--foreground) / 0.25)',
          strokeWidth: 2,
        },
        animated: false,
      };
      
      setEdges((eds) => [...eds, newEdge]);
      onCardUpdate(updatedSourceCard);
      
      toast.success(`Linked "${sourceCard.title}" → "${targetCard.title}"`);
    }
  }, [filteredCards, onCardUpdate, setEdges]);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    
    const sourceCard = filteredCards.find(c => c.id === edge.source);
    const targetCard = filteredCards.find(c => c.id === edge.target);
    
    if (sourceCard && targetCard && onCardUpdate) {
      // Remove the link from source card
      const updatedSourceCard = {
        ...sourceCard,
        linkedCards: (sourceCard.linkedCards || []).filter(id => id !== targetCard.id)
      };
      
      onCardUpdate(updatedSourceCard);
      
      toast(`Unlinked "${sourceCard.title}" from "${targetCard.title}"`);
      
      // Remove the edge from the graph
      setEdges((eds) => eds.filter(e => e.id !== edge.id));
    }
  }, [filteredCards, onCardUpdate, setEdges]);

  const resetLayout = useCallback(() => {
    const positions = getNodePositions(filteredCards);
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        position: positions[node.id] || { x: 0, y: 0 },
      }))
    );
    // Restart simulation if physics is enabled
    if (physicsEnabled && simulationRef.current) {
      simulationRef.current.alpha(1).restart();
    }
  }, [filteredCards, getNodePositions, setNodes, physicsEnabled]);

  const handleAutoLink = useCallback(() => {
    autoLinkAll();
  }, [autoLinkAll]);

  const handleClearAllLinks = useCallback(() => {
    clearAllLinks();
  }, [clearAllLinks]);

  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 300 });
  }, [zoomIn]);

  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 300 });
  }, [zoomOut]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  return (
    <div className={cn(
      "relative w-full h-full bg-background overflow-hidden",
      isFullscreen && "fixed inset-0 z-50",
      className
    )}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        fitView
        fitViewOptions={{ padding: 0.1 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-background"
        connectionLineType={ConnectionLineType.Straight}
        defaultEdgeOptions={{
          type: 'straight',
          animated: false,
          style: {
            stroke: 'hsl(var(--foreground) / 0.2)',
            strokeWidth: 1.5,
          },
        }}
        nodesDraggable={true}
        nodesConnectable={true}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        panOnDrag={[1, 2]}
        zoomOnScroll={true}
        zoomOnPinch={true}
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={isMobile ? 30 : 20} 
          size={1}
          color="hsl(var(--border))"
        />
        
        {/* Hide default controls on mobile, we'll use custom ones */}
        {!isMobile && (
          <Controls 
            className="bg-card border border-border rounded-lg shadow-card"
            showInteractive={false}
          />
        )}
        
        {/* Collapsible MiniMap */}
        {showMinimap && (
          <MiniMap 
            className={cn(
              "bg-card border border-border rounded-lg shadow-card transition-all",
              isMobile && "!w-24 !h-20"
            )}
            nodeColor="hsl(var(--primary))"
            maskColor="hsl(var(--muted) / 0.1)"
          />
        )}


        {/* Mobile-Optimized Minimal Controls */}
        {isMobile ? (
          <>
            {/* Floating Action Menu Button */}
            <Panel position="top-right" className="m-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowControls(!showControls)}
                className="h-11 w-11 bg-card/95 backdrop-blur-md shadow-lg touch-manipulation rounded-full"
                aria-label="Menu"
              >
                {showControls ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </Panel>

            {/* Expandable Controls Menu */}
            {showControls && (
              <Panel position="top-center" className="bg-transparent w-full px-4 mt-16">
                <div className="bg-card/98 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-4 space-y-3 max-w-sm mx-auto">
                  <Input
                    placeholder="Search cards..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10"
                  />
                  
                  <Select value={layoutType} onValueChange={(value: any) => setLayoutType(value)}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Layout" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="force">Force Layout</SelectItem>
                      <SelectItem value="circular">Circular</SelectItem>
                      <SelectItem value="hierarchical">Hierarchical</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAutoLink}
                      disabled={isAutoLinking}
                      className="h-10 touch-manipulation"
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Link All
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleClearAllLinks}
                      disabled={isClearingLinks}
                      className="h-10 touch-manipulation"
                    >
                      <Link2Off className="h-4 w-4 mr-2" />
                      Clear
                    </Button>
                  </div>

                  <div className="pt-2 border-t border-border text-xs text-muted-foreground text-center">
                    {filteredCards.length} cards • {initialEdges.length} links
                  </div>
                </div>
              </Panel>
            )}

            {/* Minimal Zoom Controls - Vertical Stack */}
            <Panel position="bottom-right" className="mb-20 mr-3">
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomIn}
                  className="h-12 w-12 bg-card/95 backdrop-blur-md shadow-lg touch-manipulation rounded-full"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleZoomOut}
                  className="h-12 w-12 bg-card/95 backdrop-blur-md shadow-lg touch-manipulation rounded-full"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-5 w-5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFitView}
                  className="h-12 w-12 bg-card/95 backdrop-blur-md shadow-lg touch-manipulation rounded-full"
                  aria-label="Fit view"
                >
                  <Locate className="h-5 w-5" />
                </Button>
              </div>
            </Panel>

            {/* Minimap Toggle - Bottom Left */}
            {showMinimap && (
              <Panel position="bottom-left" className="mb-20 ml-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowMinimap(false)}
                  className="h-10 w-10 bg-card/95 backdrop-blur-md shadow-lg touch-manipulation rounded-full"
                  aria-label="Hide map"
                >
                  <X className="h-4 w-4" />
                </Button>
              </Panel>
            )}
          </>
        ) : (
          /* Desktop Compact Controls */
          <>
            <Panel position="top-left" className="bg-transparent">
              <div className="bg-card/90 backdrop-blur-sm border border-border rounded-md shadow-sm p-2 space-y-1.5 w-[240px]">
                <div className="flex items-center gap-1.5">
                  <Search className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 h-7 text-xs bg-background/50"
                  />
                </div>
                
                <Select value={layoutType} onValueChange={(value: any) => setLayoutType(value)}>
                  <SelectTrigger className="h-7 text-xs bg-background/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="force">Force</SelectItem>
                    <SelectItem value="circular">Circular</SelectItem>
                    <SelectItem value="hierarchical">Hierarchical</SelectItem>
                    <SelectItem value="category">Category</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-1.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetLayout}
                    className="flex-1 h-7 text-xs bg-background/50 px-2"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </Button>
                  
                  {layoutType === 'force' && (
                    <Button 
                      variant={physicsEnabled ? "default" : "outline"}
                      size="sm" 
                      onClick={() => {
                        setPhysicsEnabled(!physicsEnabled);
                        toast(physicsEnabled ? "Physics disabled" : "Physics enabled");
                      }}
                      className="h-7 text-xs px-2"
                    >
                      {physicsEnabled ? <Zap className="h-3 w-3" /> : <ZapOff className="h-3 w-3" />}
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="h-7 bg-background/50 px-2"
                  >
                    {isFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                  </Button>
                </div>

                <div className="flex gap-1.5">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAutoLink}
                    disabled={isAutoLinking}
                    className="flex-1 h-7 text-xs bg-background/50 px-2"
                  >
                    <Link2 className="h-3 w-3 mr-1" />
                    Link
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearAllLinks}
                    disabled={isClearingLinks}
                    className="flex-1 h-7 text-xs bg-background/50 px-2"
                  >
                    <Link2Off className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel position="top-right" className="bg-transparent">
              <div className="bg-card/90 backdrop-blur-sm border border-border rounded-md shadow-sm p-2">
                <div className="text-xs text-muted-foreground">
                  {filteredCards.length} cards • {initialEdges.length} links
                  {physicsEnabled && <span className="text-primary ml-1">⚡</span>}
                </div>
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

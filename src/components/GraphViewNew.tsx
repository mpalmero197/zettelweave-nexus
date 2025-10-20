import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
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
import { Search, Layout, RotateCcw, Maximize2, Minimize2, Link2Off, Link2, Zap, ZapOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useZettelCards } from '@/hooks/useZettelCards';
import { supabase } from '@/integrations/supabase/client';
import * as d3Force from 'd3-force';

interface GraphViewProps {
  cards: ZettelCard[];
  onCardSelect?: (card: ZettelCard) => void;
  onCardUpdate?: (card: ZettelCard) => void;
  className?: string;
}

function GraphViewInner({ cards, onCardSelect, onCardUpdate, className }: GraphViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutType, setLayoutType] = useState<'force' | 'circular' | 'hierarchical' | 'category'>('force');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [physicsEnabled, setPhysicsEnabled] = useState(false);
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
        const linkMap = new Map<string, string[]>();
        const allLinkedCards = new Set<string>();
        
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
                "text-foreground font-medium text-center whitespace-nowrap",
                isParent ? "text-sm" : "text-xs"
              )}>
                {card.title}
              </div>
              <div 
                className={cn(
                  "rounded-full bg-muted-foreground/40 hover:bg-primary transition-colors",
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
      };
    });
  }, [filteredCards, getNodePositions]);

  // Create edges from card links
  const initialEdges = useMemo(() => {
    const edges: Edge[] = [];
    
    filteredCards.forEach(card => {
      card.linkedCards.forEach(linkedCardId => {
        if (filteredCards.find(c => c.id === linkedCardId)) {
          edges.push({
            id: `${card.id}-${linkedCardId}`,
            source: card.id,
            target: linkedCardId,
            type: 'straight',
            style: {
              stroke: 'hsl(var(--muted-foreground) / 0.2)',
              strokeWidth: 1,
            },
            animated: false,
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

      // Create force simulation - Obsidian-style with proper spacing
      const simulation = d3Force.forceSimulation(nodes as any)
        .force('charge', d3Force.forceManyBody()
          .strength(-1200) // Strong repulsion for spacing
          .distanceMax(600)
        )
        .force('link', d3Force.forceLink(d3Links)
          .id((d: any) => d.id)
          .distance(150) // More space between connected nodes
          .strength(0.3) // Gentler link force for organic layout
        )
        .force('center', d3Force.forceCenter(0, 0).strength(0.05)) // Weak centering
        .force('collision', d3Force.forceCollide()
          .radius(120) // Prevent node overlap
          .strength(1)
        )
        .alphaDecay(0.01) // Slower decay for smooth settling
        .velocityDecay(0.6); // Higher damping for stability

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
      // Only update source card to include link to target (directional link)
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
          stroke: 'hsl(var(--muted-foreground) / 0.2)',
          strokeWidth: 1,
        },
        animated: false,
      };
      
      setEdges((eds) => [...eds, newEdge]);
      onCardUpdate(updatedSourceCard);
      
      toast(`Linked "${sourceCard.title}" → "${targetCard.title}"`);
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

  return (
    <div className={cn(
      "relative w-full h-full bg-background border border-border rounded-xl overflow-hidden shadow-card",
      isFullscreen && "fixed inset-0 z-50 rounded-none",
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
            stroke: 'hsl(var(--muted-foreground) / 0.2)',
            strokeWidth: 1,
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
          gap={20} 
          size={1}
          color="hsl(var(--border))"
        />
        
        <Controls 
          className="bg-card border border-border rounded-lg shadow-card"
          showInteractive={false}
        />
        
        <MiniMap 
          className="bg-card border border-border rounded-lg shadow-card"
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--muted) / 0.1)"
        />

        {/* Search and Controls Panel */}
        <Panel position="top-left" className="bg-transparent">
          <div className="bg-card/80 backdrop-blur-md border border-border rounded-lg shadow-card p-4 space-y-3 min-w-[300px]">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-background/50"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-muted-foreground" />
              <Select value={layoutType} onValueChange={(value: any) => setLayoutType(value)}>
                <SelectTrigger className="flex-1 bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="force">Force Layout</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="category">By Category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {layoutType === 'force' && (
              <div className="flex items-center gap-2">
                <Button 
                  variant={physicsEnabled ? "default" : "outline"}
                  size="sm" 
                  onClick={() => {
                    setPhysicsEnabled(!physicsEnabled);
                    toast(physicsEnabled ? "Physics disabled" : "Physics enabled - nodes now interact!");
                  }}
                  className="flex-1"
                >
                  {physicsEnabled ? <Zap className="h-4 w-4 mr-2" /> : <ZapOff className="h-4 w-4 mr-2" />}
                  {physicsEnabled ? 'Physics On' : 'Physics Off'}
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetLayout}
                className="flex-1 bg-background/50"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Layout
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="bg-background/50"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAutoLink}
                disabled={isAutoLinking}
                className="flex-1 bg-background/50"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Auto Link
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearAllLinks}
                disabled={isClearingLinks}
                className="flex-1 bg-background/50"
              >
                <Link2Off className="h-4 w-4 mr-2" />
                Clear Links
              </Button>
            </div>
          </div>
        </Panel>

        {/* Stats Panel */}
        <Panel position="top-right" className="bg-transparent">
          <div className="bg-card/80 backdrop-blur-md border border-border rounded-lg shadow-card p-4">
            <div className="text-sm space-y-1">
              <div className="font-medium text-foreground">Graph Stats</div>
              <div className="text-muted-foreground">
                {filteredCards.length} cards • {initialEdges.length} connections
              </div>
              {physicsEnabled && (
                <div className="text-xs text-primary mt-1">
                  ⚡ Physics Active
                </div>
              )}
            </div>
          </div>
        </Panel>
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

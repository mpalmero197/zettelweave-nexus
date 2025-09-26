import { useCallback, useMemo, useState, useEffect, Suspense } from 'react';
import { 
  ReactFlow, 
  ReactFlowProvider,
  Node, 
  Edge, 
  addEdge, 
  useNodesState, 
  useEdgesState, 
  Controls, 
  Background, 
  MiniMap,
  ConnectionMode,
  Panel,
  useReactFlow,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ZettelCard } from '@/types/zettel';
import { getCategoryInfo } from '@/utils/deweySystem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, RotateCcw, Eye, EyeOff, Box } from 'lucide-react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Graph3D } from '@/components/Graph3D';

interface GraphViewProps {
  cards: ZettelCard[];
  onCardSelect?: (card: ZettelCard) => void;
  className?: string;
}

interface GraphViewInnerProps extends GraphViewProps {
  is3D: boolean;
  setIs3D: (value: boolean) => void;
}

// Inner component that uses React Flow hooks
function GraphViewInner({ cards, onCardSelect, className, is3D, setIs3D }: GraphViewInnerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutType, setLayoutType] = useState<'circular' | 'force' | 'hierarchical' | 'category'>('force');
  const [showCategoryEdges, setShowCategoryEdges] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const cats = new Set(cards.map(card => card.category.substring(0, 1) + '00'));
    return Array.from(cats).sort();
  }, [cards]);

  // Filter cards based on search and category
  const filteredCards = useMemo(() => {
    return cards.filter(card => {
      const matchesSearch = searchTerm === '' || 
        card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'all' || 
        card.category.startsWith(selectedCategory.substring(0, 1));
      
      return matchesSearch && matchesCategory;
    });
  }, [cards, searchTerm, selectedCategory]);

  // Layout algorithms
  const getNodePositions = useCallback((cards: ZettelCard[], type: string) => {
    const positions: Record<string, { x: number; y: number }> = {};
    const centerX = 400;
    const centerY = 300;

    switch (type) {
      case 'circular':
        cards.forEach((card, index) => {
          const angle = (index / cards.length) * 2 * Math.PI;
          const radius = Math.min(350, cards.length * 25);
          positions[card.id] = {
            x: Math.cos(angle) * radius + centerX,
            y: Math.sin(angle) * radius + centerY
          };
        });
        break;

      case 'hierarchical':
        const categoryGroups: Record<string, ZettelCard[]> = {};
        cards.forEach(card => {
          const mainCategory = card.category.substring(0, 1) + '00';
          if (!categoryGroups[mainCategory]) {
            categoryGroups[mainCategory] = [];
          }
          categoryGroups[mainCategory].push(card);
        });

        const categories = Object.keys(categoryGroups);
        categories.forEach((category, catIndex) => {
          const group = categoryGroups[category];
          const y = catIndex * 200 + 100;
          group.forEach((card, cardIndex) => {
            positions[card.id] = {
              x: cardIndex * 180 + 100,
              y: y
            };
          });
        });
        break;

      case 'category':
        const catGroups: Record<string, ZettelCard[]> = {};
        cards.forEach(card => {
          const mainCategory = card.category.substring(0, 1) + '00';
          if (!catGroups[mainCategory]) {
            catGroups[mainCategory] = [];
          }
          catGroups[mainCategory].push(card);
        });

        Object.keys(catGroups).forEach((category, catIndex) => {
          const group = catGroups[category];
          const angle = (catIndex / Object.keys(catGroups).length) * 2 * Math.PI;
          const radius = 250;
          const catCenterX = Math.cos(angle) * radius + centerX;
          const catCenterY = Math.sin(angle) * radius + centerY;

          group.forEach((card, cardIndex) => {
            const cardAngle = (cardIndex / group.length) * 2 * Math.PI;
            const cardRadius = Math.min(80, group.length * 15);
            positions[card.id] = {
              x: Math.cos(cardAngle) * cardRadius + catCenterX,
              y: Math.sin(cardAngle) * cardRadius + catCenterY
            };
          });
        });
        break;

      case 'force':
      default:
        // Force-directed layout simulation
        cards.forEach((card, index) => {
          // Start with a rough grid
          const cols = Math.ceil(Math.sqrt(cards.length));
          const x = (index % cols) * 200 + 100;
          const y = Math.floor(index / cols) * 150 + 100;
          
          // Add some randomness
          const jitterX = (Math.random() - 0.5) * 100;
          const jitterY = (Math.random() - 0.5) * 100;
          
          positions[card.id] = {
            x: x + jitterX,
            y: y + jitterY
          };
        });
        break;
    }

    return positions;
  }, []);

  // Convert cards to nodes with enhanced styling and positioning
  const initialNodes: Node[] = useMemo(() => {
    const positions = getNodePositions(filteredCards, layoutType);
    
    return filteredCards.map((card) => {
      const categoryInfo = getCategoryInfo(card.category);
      const isHighlighted = highlightedNodes.has(card.id);
      const isSearchMatch = searchTerm && (
        card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      
      return {
        id: card.id,
        type: 'default',
        position: positions[card.id] || { x: 0, y: 0 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: (
            <div className={`group relative p-3 bg-gradient-to-br from-card via-card/95 to-card/90 
              border-2 rounded-2xl shadow-lg transition-all duration-300 hover:shadow-xl
              ${isHighlighted 
                ? 'scale-105 shadow-2xl border-primary/60 bg-gradient-to-br from-primary/5 to-primary/10' 
                : isSearchMatch 
                  ? 'ring-2 ring-accent/50 border-accent' 
                  : 'border-border/40 hover:border-primary/30'
              }`}
              style={{
                borderColor: isHighlighted 
                  ? `hsl(var(--primary))` 
                  : isSearchMatch 
                    ? `hsl(var(--accent))` 
                    : `hsl(var(--category-${categoryInfo.color}) / 0.6)`,
                opacity: searchTerm && !isSearchMatch ? 0.4 : 1,
                minWidth: '200px',
                maxWidth: '250px'
              }}
            >
              {/* Header with number and connections */}
              <div className="flex items-center justify-between mb-2">
                <Badge 
                  variant="outline" 
                  className="text-xs font-mono px-2 py-1 bg-background/50 backdrop-blur-sm"
                  style={{ 
                    borderColor: `hsl(var(--category-${categoryInfo.color}))`,
                    color: `hsl(var(--category-${categoryInfo.color}))`
                  }}
                >
                  {card.number}
                </Badge>
                {card.linkedCards.length > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="text-xs px-2 py-1 bg-primary/10 text-primary border-primary/20"
                  >
                    🔗 {card.linkedCards.length}
                  </Badge>
                )}
              </div>
              
              {/* Title */}
              <div className="font-semibold text-sm leading-snug mb-2 text-foreground group-hover:text-primary transition-colors">
                {card.title}
              </div>
              
              {/* Content preview */}
              <div className="text-xs text-muted-foreground leading-relaxed mb-2 line-clamp-2">
                {card.content.slice(0, 80)}...
              </div>
              
              {/* Tags */}
              {card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {card.tags.slice(0, 3).map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs px-1.5 py-0.5 bg-muted/30">
                      {tag}
                    </Badge>
                  ))}
                  {card.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-muted/30">
                      +{card.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
              
              {/* Hover indicator */}
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ),
          card
        },
        style: {
          background: 'transparent',
          border: 'none',
          padding: 0
        },
        className: 'cursor-pointer'
      };
    });
  }, [filteredCards, layoutType, getNodePositions, highlightedNodes, searchTerm]);

  // Convert links to edges with enhanced styling
  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = [];
    
    // Direct links between cards
    filteredCards.forEach(card => {
      card.linkedCards.forEach(linkedId => {
        const targetCard = filteredCards.find(c => c.id === linkedId);
        if (targetCard) {
          const isHighlighted = highlightedNodes.has(card.id) || highlightedNodes.has(linkedId);
          edges.push({
            id: `direct-${card.id}-${linkedId}`,
            source: card.id,
            target: linkedId,
            type: 'smoothstep',
            animated: isHighlighted,
            style: {
              stroke: isHighlighted 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--primary) / 0.8)',
              strokeWidth: isHighlighted ? 4 : 2.5,
              strokeOpacity: isHighlighted ? 1 : 0.7,
              strokeDasharray: isHighlighted ? '0' : '5,5'
            },
            markerEnd: {
              type: 'arrowclosed',
              color: isHighlighted 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--primary) / 0.8)',
              width: 20,
              height: 20
            },
            labelBgStyle: {
              fill: 'hsl(var(--card))',
              fillOpacity: 0.9
            },
            labelStyle: {
              fontSize: '10px',
              fontWeight: '500',
              fill: 'hsl(var(--primary))'
            }
          });
        }
      });
    });

    // Category-based connections (only if enabled)
    if (showCategoryEdges) {
      const categoryGroups: Record<string, ZettelCard[]> = {};
      filteredCards.forEach(card => {
        const mainCategory = card.category.substring(0, 1) + '00';
        if (!categoryGroups[mainCategory]) {
          categoryGroups[mainCategory] = [];
        }
        categoryGroups[mainCategory].push(card);
      });

      Object.values(categoryGroups).forEach(group => {
        if (group.length > 1) {
          // Create a more intelligent category connection pattern
          for (let i = 0; i < group.length; i++) {
            const sourceCard = group[i];
            // Connect to next card in group (circular)
            const targetCard = group[(i + 1) % group.length];
            
            // Only add if not already explicitly linked
            const explicitLink = edges.find(e => 
              (e.source === sourceCard.id && e.target === targetCard.id) ||
              (e.source === targetCard.id && e.target === sourceCard.id)
            );
            
            if (!explicitLink) {
              const categoryInfo = getCategoryInfo(sourceCard.category);
              edges.push({
                id: `category-${sourceCard.id}-${targetCard.id}`,
                source: sourceCard.id,
                target: targetCard.id,
                type: 'straight',
                animated: false,
                style: {
                  stroke: `hsl(var(--category-${categoryInfo.color}) / 0.4)`,
                  strokeWidth: 1.5,
                  strokeOpacity: 0.4,
                  strokeDasharray: '2,4'
                },
                className: 'category-edge'
              });
            }
          }
        }
      });
    }

    return edges;
  }, [filteredCards, showCategoryEdges, highlightedNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  // Update nodes and edges when data changes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const card = filteredCards.find(c => c.id === node.id);
    if (card && onCardSelect) {
      onCardSelect(card);
    }
  }, [filteredCards, onCardSelect]);

  const onNodeMouseEnter = useCallback((event: React.MouseEvent, node: Node) => {
    const connectedNodeIds = new Set([node.id]);
    
    // Find all connected nodes
    edges.forEach(edge => {
      if (edge.source === node.id) {
        connectedNodeIds.add(edge.target);
      } else if (edge.target === node.id) {
        connectedNodeIds.add(edge.source);
      }
    });
    
    setHighlightedNodes(connectedNodeIds);
  }, [edges]);

  const onNodeMouseLeave = useCallback(() => {
    setHighlightedNodes(new Set());
  }, []);

  const resetLayout = useCallback(() => {
    fitView({ duration: 800 });
  }, [fitView]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    if (value) {
      // Highlight matching nodes
      const matchingIds = new Set(
        filteredCards
          .filter(card => 
            card.title.toLowerCase().includes(value.toLowerCase()) ||
            card.content.toLowerCase().includes(value.toLowerCase()) ||
            card.tags.some(tag => tag.toLowerCase().includes(value.toLowerCase()))
          )
          .map(card => card.id)
      );
      setHighlightedNodes(matchingIds);
    } else {
      setHighlightedNodes(new Set());
    }
  }, [filteredCards]);

  // Render 3D view if enabled
  if (is3D) {
    return <Graph3D cards={filteredCards} onCardSelect={onCardSelect} className={className} />;
  }

  return (
    <div className={`h-full w-full relative overflow-hidden ${className}`}>
      {/* Graph loading state */}
      {!nodes.length && filteredCards.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <div className="text-center p-6">
            <LoadingSpinner />
            <p className="text-sm text-muted-foreground mt-2">Building knowledge graph...</p>
          </div>
        </div>
      )}

      {/* No cards fallback */}
      {!filteredCards.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-6">
            <div className="p-4 bg-muted/20 rounded-full mb-4 mx-auto w-fit">
              <Box className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Data to Visualize</h3>
            <p className="text-muted-foreground">Create some cards to see your knowledge graph</p>
          </div>
        </div>
      )}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          padding: 0.1,
          includeHiddenNodes: false,
          duration: 800
        }}
        className="bg-gradient-to-br from-background via-background/95 to-muted/10"
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          color="hsl(var(--border) / 0.3)" 
          gap={24} 
          size={1}
        />
        
        {/* Enhanced Controls Panel */}
        <Panel position="top-right" className="m-4">
          <div className="bg-card/95 backdrop-blur-lg border border-border/60 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 space-y-4 min-w-[280px] max-w-[320px]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <h3 className="text-sm font-semibold text-foreground">Knowledge Graph</h3>
                </div>
                <Badge variant="secondary" className="text-xs px-3 py-1 bg-primary/10 text-primary">
                  {filteredCards.length} nodes
                </Badge>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search knowledge..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="h-10 pl-10 text-sm bg-background/80 border-border/50 focus:border-primary/60 rounded-xl transition-all duration-200"
                />
                {searchTerm && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Badge variant="outline" className="text-xs">
                      {filteredCards.filter(card => 
                        card.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        card.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        card.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
                      ).length}
                    </Badge>
                  </div>
                )}
              </div>
              
              {/* Layout Controls */}
              <div className="space-y-3">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Layout</label>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={layoutType} onValueChange={(value) => setLayoutType(value as typeof layoutType)}>
                    <SelectTrigger className="h-9 text-sm bg-background/80 border-border/50 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card/95 backdrop-blur-sm border-border/60 rounded-xl">
                      <SelectItem value="force">🌐 Force</SelectItem>
                      <SelectItem value="circular">⭕ Circular</SelectItem>
                      <SelectItem value="hierarchical">🏗️ Hierarchy</SelectItem>
                      <SelectItem value="category">📂 Category</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetLayout}
                    className="h-9 px-3 bg-background/80 hover:bg-primary/10 border-border/50 rounded-xl transition-all duration-200"
                    title="Reset View"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filter</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-9 text-sm bg-background/80 border-border/50 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card/95 backdrop-blur-sm border-border/60 rounded-xl">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {getCategoryInfo(cat).name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* View Options */}
              <div className="flex items-center justify-between pt-2 border-t border-border/30">
                <Button
                  variant={is3D ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIs3D(!is3D)}
                  className="h-9 px-4 flex items-center gap-2 rounded-xl transition-all duration-200"
                  title="Toggle 3D View"
                >
                  <Box className="h-4 w-4" />
                  <span className="text-xs font-medium">{is3D ? '3D' : '2D'}</span>
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCategoryEdges(!showCategoryEdges)}
                  className={`h-9 px-3 rounded-xl transition-all duration-200 ${
                    showCategoryEdges 
                      ? 'bg-primary/10 border-primary/30 text-primary' 
                      : 'bg-background/80 hover:bg-muted/50 border-border/50'
                  }`}
                  title={showCategoryEdges ? "Hide Category Links" : "Show Category Links"}
                >
                  {showCategoryEdges ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              
              {/* Stats */}
              <div className="pt-3 border-t border-border/30">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-muted/30 rounded-lg p-2">
                    <div className="text-muted-foreground">Connections</div>
                    <div className="font-semibold text-foreground">{initialEdges.length}</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2">
                    <div className="text-muted-foreground">Highlighted</div>
                    <div className="font-semibold text-primary">{highlightedNodes.size || 0}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Controls 
          className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-xl shadow-lg" 
          position="bottom-left"
        />
        <MiniMap 
          className="bg-card/90 backdrop-blur-sm border border-border/60 rounded-xl shadow-lg overflow-hidden" 
          nodeColor={(node) => {
            const card = filteredCards.find(c => c.id === node.id);
            if (card) {
              const categoryInfo = getCategoryInfo(card.category);
              return `hsl(var(--category-${categoryInfo.color}))`;
            }
            return 'hsl(var(--primary))';
          }}
          maskColor="hsl(var(--background) / 0.9)"
          pannable
          zoomable
          position="bottom-right"
        />
      </ReactFlow>
    </div>
  );
}

// Main GraphView component that provides ReactFlowProvider
export function GraphView(props: GraphViewProps) {
  const [is3D, setIs3D] = useState(false);
  
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} is3D={is3D} setIs3D={setIs3D} />
    </ReactFlowProvider>
  );
}
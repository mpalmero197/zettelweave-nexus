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
  useReactFlow
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
        data: {
          label: (
            <div className={`text-center max-w-[200px] transition-all duration-200 ${
              isSearchMatch ? 'ring-2 ring-accent' : ''
            }`}>
              <div className="flex items-center justify-between mb-1">
                <Badge 
                  variant="outline" 
                  className="text-xs font-mono px-1 py-0"
                  style={{ 
                    borderColor: `hsl(var(--category-${categoryInfo.color}))`,
                    color: `hsl(var(--category-${categoryInfo.color}))`
                  }}
                >
                  {card.number}
                </Badge>
                {card.linkedCards.length > 0 && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {card.linkedCards.length}
                  </Badge>
                )}
              </div>
              <div className="font-medium text-sm leading-tight mb-1 line-clamp-2">
                {card.title}
              </div>
              {card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center">
                  {card.tags.slice(0, 3).map((tag, i) => (
                    <Badge key={i} variant="outline" className="text-xs px-1 py-0">
                      {tag}
                    </Badge>
                  ))}
                  {card.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs px-1 py-0">
                      +{card.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ),
          card
        },
        style: {
          background: `linear-gradient(135deg, hsl(var(--card)), hsl(var(--category-${categoryInfo.color}) / 0.1))`,
          border: `2px solid hsl(var(--category-${categoryInfo.color}))`,
          borderRadius: '12px',
          padding: '12px',
          minWidth: '180px',
          fontSize: '12px',
          boxShadow: isHighlighted 
            ? 'var(--shadow-hover)' 
            : isSearchMatch 
              ? '0 0 20px hsl(var(--accent) / 0.3)'
              : 'var(--shadow-card)',
          transform: isHighlighted ? 'scale(1.05)' : 'scale(1)',
          opacity: searchTerm && !isSearchMatch ? 0.4 : 1,
          transition: 'all 0.2s ease-in-out'
        },
        className: 'cursor-pointer hover:shadow-hover'
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
              stroke: 'hsl(var(--primary))',
              strokeWidth: isHighlighted ? 3 : 2,
              strokeOpacity: isHighlighted ? 0.9 : 0.7
            },
            label: '🔗',
            labelStyle: {
              fontSize: '12px',
              background: 'hsl(var(--background))',
              padding: '2px 4px',
              borderRadius: '4px',
              border: '1px solid hsl(var(--border))'
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
          for (let i = 0; i < group.length - 1; i++) {
            for (let j = i + 1; j < Math.min(i + 2, group.length); j++) {
              const sourceCard = group[i];
              const targetCard = group[j];
              
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
                  type: 'smoothstep',
                  animated: false,
                  style: {
                    stroke: `hsl(var(--category-${categoryInfo.color}))`,
                    strokeWidth: 1,
                    strokeOpacity: 0.3,
                    strokeDasharray: '3,3'
                  }
                });
              }
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
    <div className={`h-full w-full relative ${className}`}>
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
        className="bg-background"
      >
        <Background 
          color="hsl(var(--border))" 
          gap={20} 
          size={2}
        />
        
        {/* Clean Controls Sidebar */}
        <Panel position="top-right" className="space-y-3 p-4 bg-card/98 backdrop-blur-md border border-border/50 rounded-2xl shadow-lg min-w-[240px] max-w-[280px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">Graph Controls</h3>
            <Badge variant="secondary" className="text-xs px-2 py-1">
              {filteredCards.length}
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cards..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-9 pl-10 text-sm bg-background/60 border-border/40 focus:border-primary/60 transition-all duration-200"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Select value={layoutType} onValueChange={(value) => setLayoutType(value as typeof layoutType)}>
                <SelectTrigger className="h-9 text-sm bg-background/60 border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-sm border-border/60">
                  <SelectItem value="force">Force</SelectItem>
                  <SelectItem value="circular">Circular</SelectItem>
                  <SelectItem value="hierarchical">Hierarchical</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={resetLayout}
                className="h-9 px-2 bg-background/60 hover:bg-primary/10 transition-colors"
                title="Reset View"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-9 text-sm bg-background/60 border-border/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-sm border-border/60">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {getCategoryInfo(cat).name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center justify-between">
              <Button
                variant={is3D ? "default" : "outline"}
                size="sm"
                onClick={() => setIs3D(!is3D)}
                className="h-9 px-3 flex items-center gap-2"
                title="Toggle 3D View"
              >
                <Box className="h-4 w-4" />
                {is3D ? '3D' : '2D'}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCategoryEdges(!showCategoryEdges)}
                className={`h-9 px-2 transition-colors ${
                  showCategoryEdges 
                    ? 'bg-primary/10 border-primary/30' 
                    : 'bg-background/60 hover:bg-muted/50'
                }`}
                title={showCategoryEdges ? "Hide Connections" : "Show Connections"}
              >
                {showCategoryEdges ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
           </div>
          
          <div className="pt-2 border-t border-border/30">
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>Connections:</span>
                <span>{initialEdges.length}</span>
              </div>
              {highlightedNodes.size > 0 && (
                <div className="flex justify-between text-primary">
                  <span>Highlighted:</span>
                  <span>{highlightedNodes.size}</span>
                </div>
              )}
            </div>
          </div>
        </Panel>

        <Controls className="bg-card border border-border" />
        <MiniMap 
          className="bg-card border border-border" 
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--background) / 0.8)"
          zoomable
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
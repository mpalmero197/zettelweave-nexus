import { useCallback, useMemo, useState, useEffect } from 'react';
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
  Position,
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
import { Search, RotateCcw, Maximize2, Filter, Eye, EyeOff, Box } from 'lucide-react';
import { Graph3D } from './Graph3D';

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
        // Star-schema layout: each category is a "table" block radiating from center
        const catGroups: Record<string, ZettelCard[]> = {};
        cards.forEach(card => {
          const mainCategory = card.category.substring(0, 1) + '00';
          if (!catGroups[mainCategory]) {
            catGroups[mainCategory] = [];
          }
          catGroups[mainCategory].push(card);
        });

        const catKeys = Object.keys(catGroups).sort();
        const numCats = catKeys.length;

        // Find the largest group to place in the center as the "fact table"
        let hubCatIndex = 0;
        let hubSize = 0;
        catKeys.forEach((cat, i) => {
          if (catGroups[cat].length > hubSize) {
            hubSize = catGroups[cat].length;
            hubCatIndex = i;
          }
        });

        const hubCat = catKeys[hubCatIndex];
        const spokeCats = catKeys.filter((_, i) => i !== hubCatIndex);
        const nodeW = 200;
        const nodeH = 50;
        const spokeRadius = Math.max(450, spokeCats.length * 80);

        // Place hub cards in a vertical column at center
        const hubCards = catGroups[hubCat];
        const hubStartY = centerY - ((hubCards.length - 1) * nodeH) / 2;
        hubCards.forEach((card, i) => {
          positions[card.id] = {
            x: centerX,
            y: hubStartY + i * nodeH
          };
        });

        // Place spoke categories around the hub in a star pattern
        spokeCats.forEach((category, spokeIndex) => {
          const angle = (spokeIndex / spokeCats.length) * 2 * Math.PI - Math.PI / 2;
          const spokeCenterX = Math.cos(angle) * spokeRadius + centerX;
          const spokeCenterY = Math.sin(angle) * spokeRadius + centerY;
          const group = catGroups[category];
          const startY = spokeCenterY - ((group.length - 1) * nodeH) / 2;

          group.forEach((card, cardIndex) => {
            positions[card.id] = {
              x: spokeCenterX,
              y: startY + cardIndex * nodeH
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

  const nodeClassName = useCallback((node: Node) => {
    return 'transition-all duration-200 hover:shadow-hover cursor-pointer';
  }, []);

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
        
        {/* Controls Panel — responsive for mobile */}
        <Panel position="top-left" className="space-y-2 p-2 sm:p-4 bg-card/90 backdrop-blur-md border border-border rounded-lg shadow-card max-w-[160px] sm:max-w-sm">
          {/* 3D toggle + reset row */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant={is3D ? "default" : "outline"}
              size="sm"
              onClick={() => setIs3D(!is3D)}
              className="h-7 sm:h-8 px-1.5 sm:px-2"
              title="Toggle 3D View"
            >
              <Box className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={resetLayout}
              className="h-7 sm:h-8 px-1.5 sm:px-2"
              title="Reset view"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCategoryEdges(!showCategoryEdges)}
              className="h-7 sm:h-8 px-1.5 sm:px-2"
              title={showCategoryEdges ? 'Hide category links' : 'Show category links'}
            >
              {showCategoryEdges ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            </Button>
          </div>

          {/* Search */}
          <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-1.5">
            <Search className="h-3 w-3 text-muted-foreground shrink-0" />
            <Input
              placeholder="Search…"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="h-7 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-0"
            />
          </div>

          {/* Layout selector */}
          <Select value={layoutType} onValueChange={(value) => setLayoutType(value as typeof layoutType)}>
            <SelectTrigger className="h-7 sm:h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="force">Force Layout</SelectItem>
              <SelectItem value="circular">Circular</SelectItem>
              <SelectItem value="hierarchical">Hierarchical</SelectItem>
              <SelectItem value="category">Star Schema</SelectItem>
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-7 sm:h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {getCategoryInfo(cat).name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="text-[10px] text-muted-foreground">
            {filteredCards.length}/{cards.length} cards
          </div>
        </Panel>

        {/* Stats Panel */}
        <Panel position="top-right" className="p-3 bg-card border border-border rounded-lg shadow-card">
          <div className="text-sm font-medium mb-2">Graph Stats</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>Nodes: {nodes.length}</div>
            <div>Edges: {edges.length}</div>
            <div>Direct Links: {edges.filter(e => e.id.startsWith('direct-')).length}</div>
            <div>Category Links: {edges.filter(e => e.id.startsWith('category-')).length}</div>
          </div>
        </Panel>

        <Controls className="bg-card border border-border rounded-lg shadow-card" />
        
        <MiniMap 
          nodeClassName={nodeClassName}
          className="bg-card border border-border rounded-lg shadow-card"
          maskColor="hsl(var(--background) / 0.8)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

// Main exported component wrapped with ReactFlowProvider
export function GraphView(props: GraphViewProps) {
  const [is3D, setIs3D] = useState(false);
  
  return (
    <ReactFlowProvider>
      <GraphViewInner {...props} is3D={is3D} setIs3D={setIs3D} />
    </ReactFlowProvider>
  );
}
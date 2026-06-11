import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Filter,
  X,
  Sparkles,
  Calendar,
  Tag,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as d3 from 'd3';

interface GraphNode {
  id: string;
  title: string;
  type: 'card' | 'note';
  category?: string;
  tags?: string[];
  created_at: string;
  content?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number;
  suggested?: boolean;
}

export function GraphViewPremium() {
  const { user } = useAuth();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showControls, setShowControls] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [linkDistance, setLinkDistance] = useState(100);
  const [chargeStrength, setChargeStrength] = useState(-300);
  
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Load data from Supabase
  useEffect(() => {
    if (!user) return;

    const loadGraphData = async () => {
      const [cardsResult, notesResult] = await Promise.all([
        supabase
          .from('zettel_cards')
          .select('*')
          .is('deleted_at', null),
        supabase
          .from('notes')
          .select('*')
          .is('deleted_at', null)
      ]);

      const cardNodes: GraphNode[] = (cardsResult.data || []).map(card => ({
        id: card.id,
        title: card.title,
        type: 'card' as const,
        category: card.category,
        tags: card.tags || [],
        created_at: card.created_at,
        content: card.content
      }));

      const noteNodes: GraphNode[] = (notesResult.data || []).map(note => ({
        id: note.id,
        title: note.title,
        type: 'note' as const,
        tags: note.tags || [],
        created_at: note.created_at,
        content: note.content
      }));

      const allNodes = [...cardNodes, ...noteNodes];
      
      // Create links based on shared tags and linked_cards
      const graphLinks: GraphLink[] = [];
      
      cardsResult.data?.forEach(card => {
        if (card.linked_cards) {
          card.linked_cards.forEach((linkedId: string) => {
            graphLinks.push({
              source: card.id,
              target: linkedId,
              value: 2
            });
          });
        }
        // Suggested links (dotted) — ALICE proposals not yet applied
        const suggested: string[] = (card as any).suggested_links || [];
        const applied = new Set<string>(card.linked_cards || []);
        suggested.forEach((linkedId: string) => {
          if (applied.has(linkedId)) return;
          graphLinks.push({
            source: card.id,
            target: linkedId,
            value: 1,
            suggested: true,
          });
        });
      });

      // Add links for shared tags
      allNodes.forEach((node1, i) => {
        allNodes.slice(i + 1).forEach(node2 => {
          const sharedTags = node1.tags?.filter(tag => 
            node2.tags?.includes(tag)
          ) || [];
          
          if (sharedTags.length > 0) {
            graphLinks.push({
              source: node1.id,
              target: node2.id,
              value: 1
            });
          }
        });
      });

      setNodes(allNodes);
      setLinks(graphLinks);
    };

    loadGraphData();
  }, [user]);

  // Initialize D3 force simulation
  useEffect(() => {
    if (!svgRef.current || !containerRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Clear previous content
    svg.selectAll('*').remove();

    // Create main group for zoom/pan
    const g = svg.append('g');

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)
      .force('link', d3.forceLink<GraphNode, GraphLink>(links)
        .id(d => d.id)
        .distance(linkDistance)
      )
      .force('charge', d3.forceManyBody().strength(chargeStrength))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    simulationRef.current = simulation;

    // Create gradient definitions
    const defs = svg.append('defs');
    
    const gradient = defs.append('linearGradient')
      .attr('id', 'link-gradient')
      .attr('gradientUnits', 'userSpaceOnUse');
    
    gradient.append('stop')
      .attr('offset', '0%')
      .attr('stop-color', 'hsl(0, 0%, 55%)')
      .attr('stop-opacity', 0.3);
    
    gradient.append('stop')
      .attr('offset', '100%')
      .attr('stop-color', 'hsl(346, 60%, 49%)')
      .attr('stop-opacity', 0.3);

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'url(#link-gradient)')
      .attr('stroke-width', d => Math.sqrt(d.value) * 2)
      .attr('stroke-linecap', 'round')
      .attr('stroke-dasharray', d => d.suggested ? '4 4' : null)
      .style('opacity', d => d.suggested ? 0.5 : 0.3)
      .style('transition', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)');

    // Create node groups
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', dragStarted)
        .on('drag', dragged)
        .on('end', dragEnded) as any
      );

    // Add circles for nodes
    node.append('circle')
      .attr('r', d => d.type === 'card' ? 20 : 15)
      .attr('fill', d => d.type === 'card' 
        ? 'hsl(0, 0%, 55%)' 
        : 'hsl(0, 0%, 40%)'
      )
      .attr('stroke', 'hsl(var(--background))')
      .attr('stroke-width', 3)
      .style('filter', 'drop-shadow(0 4px 20px hsla(0, 0%, 55%, 0.3))')
      .style('transition', 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)');

    // Add glow effect on hover
    node.on('mouseenter', function(event, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(300)
        .attr('r', d.type === 'card' ? 24 : 18)
        .style('filter', 'drop-shadow(0 0 40px hsla(271, 76%, 53%, 0.6))');
      
      // Highlight connected links
      link
        .transition()
        .duration(300)
        .style('opacity', l => 
          (l.source as GraphNode).id === d.id || (l.target as GraphNode).id === d.id 
            ? 1 
            : 0.1
        )
        .attr('stroke-width', l => 
          (l.source as GraphNode).id === d.id || (l.target as GraphNode).id === d.id 
            ? Math.sqrt(l.value) * 4 
            : Math.sqrt(l.value) * 2
        );
    })
    .on('mouseleave', function(event, d) {
      d3.select(this).select('circle')
        .transition()
        .duration(300)
        .attr('r', d.type === 'card' ? 20 : 15)
        .style('filter', 'drop-shadow(0 4px 20px hsla(271, 76%, 53%, 0.3))');
      
      link
        .transition()
        .duration(300)
        .style('opacity', 0.3)
        .attr('stroke-width', l => Math.sqrt(l.value) * 2);
    })
    .on('click', (event, d) => {
      event.stopPropagation();
      setSelectedNode(d);
    });

    // Add labels
    node.append('text')
      .text(d => d.title.length > 20 ? d.title.substring(0, 20) + '...' : d.title)
      .attr('text-anchor', 'middle')
      .attr('dy', d => d.type === 'card' ? 35 : 30)
      .attr('font-size', '12px')
      .attr('fill', 'hsl(var(--foreground))')
      .attr('font-weight', '500')
      .style('pointer-events', 'none')
      .style('user-select', 'none');

    // Add type indicator badge
    node.append('text')
      .text(d => d.type === 'card' ? '📇' : '📝')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('font-size', '14px')
      .style('pointer-events', 'none');

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x!)
        .attr('y1', d => (d.source as GraphNode).y!)
        .attr('x2', d => (d.target as GraphNode).x!)
        .attr('y2', d => (d.target as GraphNode).y!);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    function dragStarted(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: GraphNode) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragEnded(event: any, d: GraphNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Initial zoom to fit
    const bounds = g.node()!.getBBox();
    const fullWidth = bounds.width;
    const fullHeight = bounds.height;
    const midX = bounds.x + fullWidth / 2;
    const midY = bounds.y + fullHeight / 2;
    
    const scale = 0.9 / Math.max(fullWidth / width, fullHeight / height);
    const translate = [width / 2 - scale * midX, height / 2 - scale * midY];
    
    svg.transition()
      .duration(750)
      .call(zoom.transform as any, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));

    return () => {
      simulation.stop();
    };
  }, [nodes, links, linkDistance, chargeStrength]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy as any, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(300)
        .call(zoomRef.current.scaleBy as any, 0.7);
    }
  };

  const handleReset = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current)
        .transition()
        .duration(750)
        .call(zoomRef.current.transform as any, d3.zoomIdentity);
    }
  };

  return (
    <div className="relative w-full h-screen bg-background">
      {/* Canvas */}
      <div ref={containerRef} className="absolute inset-0">
        <svg ref={svgRef} className="w-full h-full" />
      </div>

      {/* Top Controls Bar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-4 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 bg-card/95 backdrop-blur-lg border-border/50"
            />
          </div>
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowControls(!showControls)}
            className="bg-card/95 backdrop-blur-lg border-border/50"
          >
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            className="bg-card/95 backdrop-blur-lg border-border/50"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            className="bg-card/95 backdrop-blur-lg border-border/50"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            className="bg-card/95 backdrop-blur-lg border-border/50"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Controls Panel */}
      {showControls && (
        <Card className={cn(
          "absolute top-20 left-4 w-80 bg-card/95 backdrop-blur-lg border-border/50",
          "animate-in slide-in-from-left duration-300"
        )}>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Graph Controls
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowControls(false)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Link Distance</label>
                <Slider
                  value={[linkDistance]}
                  onValueChange={([value]) => setLinkDistance(value)}
                  min={50}
                  max={300}
                  step={10}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{linkDistance}px</span>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Node Repulsion</label>
                <Slider
                  value={[Math.abs(chargeStrength)]}
                  onValueChange={([value]) => setChargeStrength(-value)}
                  min={100}
                  max={1000}
                  step={50}
                  className="w-full"
                />
                <span className="text-xs text-muted-foreground">{Math.abs(chargeStrength)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Node Panel */}
      {selectedNode && (
        <Card className={cn(
          "absolute top-4 right-4 w-96 max-h-[80vh] overflow-y-auto",
          "bg-card/95 backdrop-blur-lg border-border/50",
          "animate-in slide-in-from-right duration-300"
        )}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={selectedNode.type === 'card' ? 'default' : 'secondary'}>
                    {selectedNode.type === 'card' ? '📇 Card' : '📝 Note'}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg">{selectedNode.title}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedNode(null)}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {selectedNode.category && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-3 w-3" />
                <span>{selectedNode.category}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{new Date(selectedNode.created_at).toLocaleDateString()}</span>
            </div>

            {selectedNode.tags && selectedNode.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedNode.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {selectedNode.content && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground line-clamp-6">
                  {selectedNode.content}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <LinkIcon className="h-3 w-3 text-primary" />
              <span className="text-xs text-muted-foreground">
                {links.filter(l => 
                  (l.source as GraphNode).id === selectedNode.id || 
                  (l.target as GraphNode).id === selectedNode.id
                ).length} connections
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Badge */}
      <div className="absolute bottom-4 left-4 pointer-events-auto">
        <Badge variant="outline" className="bg-card/95 backdrop-blur-lg border-border/50">
          {nodes.length} nodes · {links.length} connections
        </Badge>
      </div>
    </div>
  );
}

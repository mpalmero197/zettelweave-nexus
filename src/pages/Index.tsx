import { useState, useEffect, Suspense, lazy } from "react";
import { Navigate, useOutletContext, useParams, useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UnifiedSearchResults } from "@/components/UnifiedSearchResults";
import { ZettelCard } from "@/components/ZettelCard";
import { WordDefinitionPopover } from "@/components/WordDefinitionPopover";
import { RecommendationSidebar } from "@/components/RecommendationSidebar";
import { SmartLinkingSidebar } from "@/components/SmartLinkingSidebar";
import { RightSidebar } from "@/components/RightSidebar";
import { FastLoadingFallback } from "@/components/FastLoadingFallback";
import { CustomizableDashboard } from "@/components/CustomizableDashboard";
import { OfflineModeIndicator } from "@/components/OfflineModeIndicator";
import { IntelligentCacheIndicator } from "@/components/IntelligentCacheIndicator";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { usePremiumAccess } from "@/hooks/usePremiumAccess";
import { PremiumGate } from "@/components/PremiumGate";
import { useZettelCards } from "@/hooks/useZettelCards";
import { ZettelCard as ZettelCardType, OrganizationMethod } from "@/types/zettel";
import { DEWEY_CATEGORIES, ORGANIZATION_METHODS } from "@/types/zettel";
import { exportToPDF, printCards } from "@/utils/exportUtils";
import { Footer } from "@/components/Footer";

// Lazy-load every heavy feature component — each is only mounted when its tab/dialog activates
const CreateCardDialog = lazy(() => import("@/components/CreateCardDialog").then(m => ({ default: m.CreateCardDialog })));
const ImportStudio = lazy(() => import("@/components/ImportStudio").then(m => ({ default: m.ImportStudio })));
const GraphView = lazy(() => import("@/components/GraphViewNew").then(m => ({ default: m.GraphView })));
const Graph3D = lazy(() => import("@/components/Graph3D").then(m => ({ default: m.Graph3D })));
const CardViewer = lazy(() => import("@/components/CardViewer").then(m => ({ default: m.CardViewer })));
const Notes = lazy(() => import("@/components/Notes").then(m => ({ default: m.Notes })));
const RecorderStudio = lazy(() => import("@/components/RecorderStudio").then(m => ({ default: m.RecorderStudio })));
const AudioManager = lazy(() => import("@/components/AudioManager").then(m => ({ default: m.AudioManager })));
const ScratchPad = lazy(() => import("@/components/ScratchPad").then(m => ({ default: m.ScratchPad })));
const Catalyst = lazy(() => import("@/components/Catalyst").then(m => ({ default: m.Catalyst })));
const DebuggerConsole = lazy(() => import("@/components/DebuggerConsole").then(m => ({ default: m.DebuggerConsole })));
const StickyNotesSimple = lazy(() => import("@/components/StickyNotesSimple").then(m => ({ default: m.StickyNotesSimple })));
const Calendar = lazy(() => import("@/components/Calendar").then(m => ({ default: m.Calendar })));
const FileManager = lazy(() => import("@/components/FileManager").then(m => ({ default: m.FileManager })));
const RecycleBin = lazy(() => import("@/components/RecycleBin").then(m => ({ default: m.RecycleBin })));
const WorkflowManager = lazy(() => import("@/components/WorkflowManager").then(m => ({ default: m.WorkflowManager })));
const AccountManagement = lazy(() => import("@/components/AccountManagement").then(m => ({ default: m.AccountManagement })));
const DeleteAllCardsDialog = lazy(() => import("@/components/DeleteAllCardsDialog").then(m => ({ default: m.DeleteAllCardsDialog })));
const OrganizationMethodDialog = lazy(() => import("@/components/OrganizationMethodDialog").then(m => ({ default: m.OrganizationMethodDialog })));
const EditCardDialog = lazy(() => import("@/components/EditCardDialog").then(m => ({ default: m.EditCardDialog })));
const CollabStudio = lazy(() => import("@/components/friends/CollabStudio").then(m => ({ default: m.CollabStudio })));
const LearningHub = lazy(() => import("@/components/LearningHub").then(m => ({ default: m.LearningHub })));
const SpacesHub = lazy(() => import("@/components/spaces/SpacesHub").then(m => ({ default: m.SpacesHub })));
const UnifiedSearchPage = lazy(() => import("@/components/UnifiedSearchPage").then(m => ({ default: m.UnifiedSearchPage })));
const ProjectManager = lazy(() => import("@/components/ProjectManager").then(m => ({ default: m.ProjectManager })));
const KnowledgeGapAnalyzer = lazy(() => import("@/components/KnowledgeGapAnalyzer").then(m => ({ default: m.KnowledgeGapAnalyzer })));
const IntegrationsHub = lazy(() => import("@/components/integrations/IntegrationsHub").then(m => ({ default: m.IntegrationsHub })));


import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Download, 
  Printer, 
  Lightbulb,
  FileText,
  Palette,
  StickyNote,
  Sparkles,
  Filter,
  Search,
  Settings,
  LayoutGrid,
  List,
  ArrowUpDown,
  MoreHorizontal,
  Star,
  Upload
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";



// Lazy load heavy components for better performance
const BulletJournal = lazy(() => import("@/components/BulletJournal"));
const CanvasStudio = lazy(() => import("@/components/CanvasStudio"));
const MeetingRecorderLazy = lazy(() => import("@/components/MeetingRecorder"));

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { history, addToHistory, clearHistory, removeItem } = useSearchHistory();
  const { hasAccess: hasPremium, isAdmin: premiumIsAdmin } = usePremiumAccess();
  const [currentQuery, setCurrentQuery] = useState("");
  const { cards, isLoading, createCard, updateCard, deleteCard, deleteAllCards, isDeletingAll } = useZettelCards();
  
  const [filteredCards, setFilteredCards] = useState<ZettelCardType[]>([]);
  const [searchResults, setSearchResults] = useState<{
    cards: ZettelCardType[];
    notes: any[];
    stickyNotes: any[];
    scratchNotes?: any[];
    webResults?: { query: string; result: string; images?: string[]; videos?: string[]; shopping?: string[]; news?: string[]; citations?: string[]; relatedQuestions?: string[] } | null;
    generatedImage?: { imageUrl: string; prompt: string } | null;
    multimediaResults?: { videos: any[]; images: any[] } | null;
    reasoning: string;
    query: string;
    intent?: string;
    resultCount?: number;
  } | null>(null);
  const [selectedWord, setSelectedWord] = useState<{ word: string; position: { x: number; y: number } } | null>(null);
  const { tab: tabParam } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(tabParam || "dashboard");
  const [cardSearch, setCardSearch] = useState("");
  const [cardSort, setCardSort] = useState<"recent" | "created" | "alpha" | "category">("recent");
  const [cardView, setCardView] = useState<"grid" | "list">("grid");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationMethod, setOrganizationMethod] = useState<OrganizationMethod>(() => {
    const stored = localStorage.getItem('pendragonx-organization-method');
    return (stored as OrganizationMethod) || "dewey";
  });
  const [editingCard, setEditingCard] = useState<ZettelCardType | null>(null);
  const [viewingCard, setViewingCard] = useState<ZettelCardType | null>(null);
  const [showAccountManagement, setShowAccountManagement] = useState(false);
  const [activeChatFriend, setActiveChatFriend] = useState<{ id: string; name: string } | null>(null); // kept for FloatingChatBubble
  const [showSmartLinking, setShowSmartLinking] = useState(false);
  const [smartLinkingCardId, setSmartLinkingCardId] = useState<string | null>(null);
  const [showOrganizationMethodDialog, setShowOrganizationMethodDialog] = useState(false);
  const [showNewCardsOnly, setShowNewCardsOnly] = useState(false);
  const [showImportStudio, setShowImportStudio] = useState(false);
  const [graphMode, setGraphMode] = useState<'2d' | '3d'>('2d');

  // Helper to check if a card is "new" (created within last 24 hours)
  const isNewCard = (card: ZettelCardType) => {
    const createdDate = new Date(card.created);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  // Compute displayed cards with search, filter, and sort
  const displayedCards = (() => {
    let result = filteredCards;
    if (showFavoritesOnly) result = result.filter(c => c.is_favorite);
    if (showNewCardsOnly) result = result.filter(isNewCard);
    if (cardSearch.trim()) {
      const q = cardSearch.toLowerCase();
      result = result.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q) ||
        c.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    result = [...result].sort((a, b) => {
      switch (cardSort) {
        case "created": return new Date(b.created).getTime() - new Date(a.created).getTime();
        case "alpha": return a.title.localeCompare(b.title);
        case "category": return (a.category || "").localeCompare(b.category || "");
        case "recent":
        default: return new Date(b.modified || b.created).getTime() - new Date(a.modified || a.created).getTime();
      }
    });
    return result;
  })();

  const newCardsCount = filteredCards.filter(isNewCard).length;

  // Handle search results including web results
  const handleSearchResults = (results: {
    cards: ZettelCardType[];
    notes: any[];
    stickyNotes: any[];
    scratchNotes?: any[];
    webResults?: any;
    generatedImage?: any;
    multimediaResults?: any;
    reasoning: string;
    query: string;
    intent?: string;
    resultCount?: number;
  }) => {
    setSearchResults(results);
    // Auto-switch to search tab when there are results
    if (results.query && activeTab !== "search") {
      setActiveTab("search");
    }

    // Add to search history
    if (currentQuery && results.intent) {
      addToHistory({
        query: currentQuery,
        intent: results.intent,
        resultCount: results.resultCount || 0,
        hasImages: (results.webResults?.images && results.webResults.images.length > 0) || !!results.generatedImage || (results.multimediaResults?.images && results.multimediaResults.images.length > 0),
        hasVideos: results.multimediaResults?.videos && results.multimediaResults.videos.length > 0,
        hasCitations: results.webResults?.citations && results.webResults.citations.length > 0,
      });
    }
  };

  const handleRerunSearch = (query: string) => {
    setCurrentQuery(query);
    toast.success(`Re-running search: "${query}"`);
  };

  const handleCombineSearches = (queries: string[]) => {
    const combinedQuery = queries.join(' AND ');
    setCurrentQuery(combinedQuery);
    toast.success('Combined searches - ready to execute');
  };

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc('has_role', {
          _user_id: user.id, 
          _role: 'admin' 
        });
        
        if (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          return;
        }
        
        setIsAdmin(data === true);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Only sync filtered cards with all cards on initial load or when cards are empty
  useEffect(() => {
    if (filteredCards.length === 0 && cards.length > 0) {
      setFilteredCards(cards);
    }
  }, [cards]);

  useEffect(() => {
    localStorage.setItem('pendragonx-organization-method', organizationMethod);
  }, [organizationMethod]);

  const handleCreateCard = (newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => {
    createCard(newCard);
  };

  const handleUpdateCard = (updatedCard: ZettelCardType) => {
    updateCard(updatedCard);
  };

  const handleDeleteCard = (card: ZettelCardType) => {
    if (confirm(`Are you sure you want to delete "${card.title}"?`)) {
      deleteCard(card.id);
    }
  };

  const handleImportCards = async (newCards: Omit<ZettelCardType, 'id' | 'created' | 'modified'>[]) => {
    try {
      for (const card of newCards) {
        await createCard(card);
      }
      toast.success(`Successfully imported ${newCards.length} cards!`);
    } catch (error) {
      console.error('Error importing cards:', error);
      toast.error('Failed to import some cards. Check console for details.');
    }
  };

  const handleReorganizeCards = async (fromMethod: OrganizationMethod, toMethod: OrganizationMethod) => {
    try {
      console.log('Starting reorganization:', { fromMethod, toMethod, cardCount: cards.length });
      
      const { data, error } = await supabase.functions.invoke('ai-reorganize-cards', {
        body: {
          cards,
          fromMethod,
          toMethod
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      if (data?.ok === false || data?.error) {
        throw new Error(data.error || 'Reorganization failed');
      }

      if (data?.reorganizedCards) {
        console.log('Received reorganized cards:', data.reorganizedCards.length);
        
        // Update all cards with new organization
        for (const reorganizedCard of data.reorganizedCards) {
          await updateCard(reorganizedCard);
        }
        
        toast.success(`Successfully reorganized ${data.reorganizedCards.length} cards to ${toMethod} system!`);
      } else {
        throw new Error('No reorganized cards received from AI');
      }
    } catch (error) {
      console.error('Error reorganizing cards:', error);
      toast.error(`Failed to reorganize cards: ${error.message}`);
      throw error; // Re-throw to let the dialog handle it
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast("Signed out successfully");
    } catch (error) {
      console.error('Error signing out:', error);
      toast("Error signing out");
    }
  };

  const handleWordHover = (word: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setSelectedWord({
      word,
      position: { x: rect.left, y: rect.top }
    });
  };

  const handleNavigateToCard = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      setViewingCard(card);
    } else {
      toast("Card not found");
    }
  };

  const handleOpenSmartLinking = (cardId: string) => {
    setSmartLinkingCardId(cardId);
    setShowSmartLinking(true);
  };

  const handleAcceptLink = async (sourceCardId: string, targetCardId: string) => {
    const sourceCard = cards.find(c => c.id === sourceCardId);
    if (!sourceCard) return;

    const updatedLinks = [...(sourceCard.linkedCards || [])];
    if (!updatedLinks.includes(targetCardId)) {
      updatedLinks.push(targetCardId);
      await updateCard({
        ...sourceCard,
        linkedCards: updatedLinks,
      });
    }
  };

  // URL -> state: when route param changes, update active tab
  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Listen for tab change events from AppLayout (legacy event-based path)
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent).detail;
      if (tab) {
        setActiveTab(tab);
        // Keep the URL in sync so the tab is deep-linkable / pop-out-able
        const search = location.search; // preserve ?popout=1 etc.
        navigate(`/app/${tab}${search}`, { replace: true });
      }
    };
    window.addEventListener("app-tab-change", handler);
    return () => window.removeEventListener("app-tab-change", handler);
  }, [navigate, location.search]);

  // Sync active tab back to AppLayout for header highlight
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("app-tab-sync", { detail: activeTab }));
  }, [activeTab]);

  // Consume pending search query from FAB
  const outletContext = useOutletContext<{ pendingSearchQuery?: string; setPendingSearchQuery?: (q: string) => void }>();
  useEffect(() => {
    if (outletContext?.pendingSearchQuery) {
      setCurrentQuery(outletContext.pendingSearchQuery);
      setActiveTab("search");
      outletContext.setPendingSearchQuery?.("");
    }
  }, [outletContext?.pendingSearchQuery]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <FastLoadingFallback message="Authenticating..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>

      {/* Main Content - Mobile Optimized */}
      <main id="main-content" className="pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:pb-0 px-2 md:px-3 relative flex-1" role="main">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative">
          {/* Cards Menu Bar - Mobile Optimized */}
          {activeTab === "cards" && (
            <div className="sticky top-10 md:top-14 z-30 bg-card/90 backdrop-blur-sm border border-border/60 rounded-lg px-2 sm:px-3 py-2 mb-2">
              <div className="flex items-center gap-2 max-w-7xl mx-auto">
                {/* Create button */}
                <Suspense fallback={<Button size="sm" variant="outline" disabled><Plus className="h-3.5 w-3.5" /></Button>}>
                  <CreateCardDialog onCreateCard={handleCreateCard} existingCards={cards} organizationMethod={organizationMethod} />
                </Suspense>

                {/* Inline search */}
                <div className="flex-1 relative max-w-xs">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={cardSearch}
                    onChange={(e) => setCardSearch(e.target.value)}
                    placeholder="Search cards..."
                    className="h-8 pl-7 text-xs bg-background/60"
                  />
                </div>

                {/* Card count */}
                <span className="text-xs text-muted-foreground hidden sm:inline tabular-nums">{displayedCards.length} cards</span>

                {/* Favorites toggle */}
                <Button
                  variant={showFavoritesOnly ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                  className="h-10 w-10 md:h-8 md:w-8 p-0"
                  aria-label="Show favorites only"
                >
                  <Star className={cn("h-4 w-4 md:h-3.5 md:w-3.5", showFavoritesOnly && "fill-primary-foreground")} />
                </Button>

                {/* Sort dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-10 w-10 md:h-8 md:w-8 p-0" aria-label="Sort cards">
                      <ArrowUpDown className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => setCardSort("recent")} className={cardSort === "recent" ? "bg-accent" : ""}>Recently Modified</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCardSort("created")} className={cardSort === "created" ? "bg-accent" : ""}>Recently Created</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCardSort("alpha")} className={cardSort === "alpha" ? "bg-accent" : ""}>Alphabetical</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCardSort("category")} className={cardSort === "category" ? "bg-accent" : ""}>Category</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* View toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCardView(cardView === "grid" ? "list" : "grid")}
                  className="h-10 w-10 md:h-8 md:w-8 p-0"
                  aria-label="Toggle view"
                >
                  {cardView === "grid" ? <List className="h-4 w-4 md:h-3.5 md:w-3.5" /> : <LayoutGrid className="h-4 w-4 md:h-3.5 md:w-3.5" />}
                </Button>

                {/* More actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-10 w-10 md:h-8 md:w-8 p-0" aria-label="More actions">
                      <MoreHorizontal className="h-4 w-4 md:h-3.5 md:w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => setShowNewCardsOnly(!showNewCardsOnly)}>
                      <Filter className="mr-2 h-3.5 w-3.5" />
                      {showNewCardsOnly ? "Show All" : `New Cards${newCardsCount > 0 ? ` (${newCardsCount})` : ""}`}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowImportStudio(true)}>
                      <Upload className="mr-2 h-3.5 w-3.5" />Import Studio
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportToPDF(filteredCards)}>
                      <Download className="mr-2 h-3.5 w-3.5" />Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => printCards(filteredCards)}>
                      <Printer className="mr-2 h-3.5 w-3.5" />Print
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowRecommendations(!showRecommendations)}>
                      <Lightbulb className="mr-2 h-3.5 w-3.5" />AI Recommendations
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      if (filteredCards.length > 0) handleOpenSmartLinking(filteredCards[0].id);
                      else toast.error("Create some cards first");
                    }}>
                      <Sparkles className="mr-2 h-3.5 w-3.5" />Smart Linking
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowOrganizationMethodDialog(true)}>
                      <Settings className="mr-2 h-3.5 w-3.5" />Organization Method
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild><div onClick={(e) => e.stopPropagation()}>
                      <Suspense fallback={null}><DeleteAllCardsDialog onDeleteAll={deleteAllCards} isDeleting={isDeletingAll} cardCount={cards.length} /></Suspense>
                    </div></DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
          <div className="w-full pt-2 sm:pt-0">
            <div className="w-full space-y-2 sm:space-y-3">
              <div className="w-full">
                <Suspense fallback={<FastLoadingFallback message="Loading..." />}>

                <TabsContent value="dashboard" className="mt-0">
                  <CustomizableDashboard 
                    onCreateCard={handleCreateCard} 
                    onEdit={(item) => {
                      // Look up the full card from the cards array
                      const fullCard = cards.find(c => c.id === item.id);
                      if (fullCard) {
                        setViewingCard(fullCard);
                      } else {
                        // If card not in local state, navigate to cards tab
                        setActiveTab("cards");
                      }
                    }}
                    onOpenNote={(note) => {
                      setActiveTab("notes");
                    }}
                    onNavigate={(tab) => setActiveTab(tab)}
                  />
                </TabsContent>

                <TabsContent value="search" className="mt-0">
                  <UnifiedSearchPage
                    cards={cards}
                    searchResults={searchResults}
                    onSearchResults={handleSearchResults}
                    onQueryChange={setCurrentQuery}
                    currentQuery={currentQuery}
                    onNavigateToCard={(cardId) => {
                      const card = cards.find(c => c.id === cardId);
                      if (card) {
                        setViewingCard(card);
                        setActiveTab('cards');
                      }
                    }}
                    onNavigateToNote={(noteId) => {
                      setActiveTab('notes');
                      toast.success('Opening note');
                    }}
                    onNavigateToStickyNote={(noteId) => {
                      setActiveTab('stickynotes');
                      toast.success('Opening sticky note');
                    }}
                    onSaveAsCard={async (content, source) => {
                      try {
                        await createCard({
                          number: `WEB-${Date.now()}`,
                          title: searchResults?.query || 'Search Result',
                          content: content,
                          description: source ? `Source: ${source}` : undefined,
                          category: "Research",
                          tags: ["web-search"],
                          linkedCards: []
                        });
                        toast.success('Saved as card');
                      } catch (error) {
                        toast.error('Failed to save card');
                      }
                    }}
                    onSaveAsNote={async (content, source) => {
                      toast.success('Save as note feature coming soon');
                    }}
                    onSaveToScratchpad={(content) => {
                      try {
                        const existingNotes = localStorage.getItem('scratchpad:notes:v1');
                        const notes = existingNotes ? JSON.parse(existingNotes) : [];
                        notes.push({
                          id: Date.now().toString(),
                          content: content,
                          timestamp: new Date()
                        });
                        localStorage.setItem('scratchpad:notes:v1', JSON.stringify(notes));
                        toast.success('Saved to scratchpad');
                      } catch (error) {
                        toast.error('Failed to save to scratchpad');
                      }
                    }}
                    createCard={createCard}
                  />
                </TabsContent>

                <TabsContent value="catalyst" className="mt-0">
                  <Catalyst />
                </TabsContent>

                <TabsContent value="learning" className="mt-0">
                  <PremiumGate featureName="Learning Hub" hasAccess={hasPremium}>
                    <LearningHub />
                  </PremiumGate>
                </TabsContent>

                <TabsContent value="spaces" className="mt-0">
                  <PremiumGate featureName="Spaces" hasAccess={hasPremium}>
                    <SpacesHub />
                  </PremiumGate>
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  <Notes />
                </TabsContent>

                <TabsContent value="notebooks" className="mt-0">
                  <Notes initialView="notebooks" />
                </TabsContent>

                <TabsContent value="calendar" className="mt-0">
                  <Calendar />
                </TabsContent>

                <TabsContent value="files" className="mt-0">
                  <FileManager />
                </TabsContent>

                <TabsContent value="recycle" className="mt-0">
                  <RecycleBin />
                </TabsContent>

                <TabsContent value="workflows" className="mt-0">
                  <WorkflowManager />
                </TabsContent>

                <TabsContent value="cards" className="mt-0">
                  <div className="p-2">
                    {isLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                        {[...Array(8)].map((_, i) => (
                          <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : displayedCards.length === 0 ? (
                      <div className="text-center py-12">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-15 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">
                          {cards.length === 0
                            ? "Start building your knowledge base by creating your first card"
                            : cardSearch.trim()
                            ? `No cards matching "${cardSearch}"`
                            : showFavoritesOnly
                            ? "No favorite cards yet"
                            : showNewCardsOnly
                            ? "No new cards in the last 24 hours"
                            : "No cards found"
                          }
                        </p>
                        {cards.length === 0 && (
                          <CreateCardDialog onCreateCard={handleCreateCard} existingCards={cards} organizationMethod={organizationMethod} />
                        )}
                      </div>
                    ) : cardView === "list" ? (
                      <div className="space-y-1">
                        {displayedCards.map((card) => (
                          <ZettelCard
                            key={card.id}
                            card={card}
                            variant="compact"
                            onEdit={setViewingCard}
                            onLink={(card) => {
                              setEditingCard(card);
                              toast.success("Link card feature - select cards to link");
                            }}
                            onDelete={handleDeleteCard}
                            onUpdate={handleUpdateCard}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                        {displayedCards.map((card) => (
                          <ZettelCard
                            key={card.id}
                            card={card}
                            onEdit={setViewingCard}
                            onLink={(card) => {
                              setEditingCard(card);
                              toast.success("Link card feature - select cards to link");
                            }}
                            onDelete={handleDeleteCard}
                            onUpdate={handleUpdateCard}
                            className="h-fit"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="graph" className="mt-0">
                  <PremiumGate featureName="Knowledge Graph" hasAccess={hasPremium}>
                    <div className="h-[calc(100dvh-7rem-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4.5rem)] relative">
                      {/* 2D/3D toggle */}
                      <div className="absolute top-3 right-3 z-20 flex items-center gap-1 bg-card/90 backdrop-blur-sm border border-border rounded-lg p-1">
                        <Button
                          size="sm"
                          variant={graphMode === '2d' ? 'default' : 'ghost'}
                          className="h-7 px-3 text-xs"
                          onClick={() => setGraphMode('2d')}
                        >
                          2D
                        </Button>
                        <Button
                          size="sm"
                          variant={graphMode === '3d' ? 'default' : 'ghost'}
                          className="h-7 px-3 text-xs"
                          onClick={() => setGraphMode('3d')}
                        >
                          3D
                        </Button>
                      </div>
                      
                      {graphMode === '2d' ? (
                        <GraphView 
                          cards={filteredCards} 
                          onCardSelect={setViewingCard}
                          onCardUpdate={handleUpdateCard}
                          className="h-full"
                        />
                      ) : (
                        <Graph3D
                          cards={filteredCards}
                          onCardSelect={setViewingCard}
                          className="h-full"
                        />
                      )}
                    </div>
                  </PremiumGate>
                </TabsContent>

                <TabsContent value="canvas" className="mt-0 -mx-2 md:mx-0">
                  <PremiumGate featureName="Canvas Studio" hasAccess={hasPremium}>
                    <div className="h-[calc(100dvh-7rem-env(safe-area-inset-bottom,0px))] md:h-[calc(100dvh-4.5rem)] flex flex-col">
                      <Suspense fallback={<FastLoadingFallback message="Loading canvas..." icon={<Palette className="h-6 w-6 animate-pulse" />} />}>
                        <CanvasStudio 
                          cards={cards} 
                          onCardSelect={setViewingCard} 
                          onCreateCard={handleCreateCard} 
                        />
                      </Suspense>
                    </div>
                  </PremiumGate>
                </TabsContent>

                <TabsContent value="journal" className="mt-0">
                  <PremiumGate featureName="Bullet Journal" hasAccess={hasPremium}>
                    <Suspense fallback={<FastLoadingFallback message="Loading journal..." icon={<StickyNote className="h-6 w-6 animate-pulse" />} />}>
                      <BulletJournal
                          onCreateCard={handleCreateCard}
                          onAddHabit={(taskName) => {
                            if ((window as any).__addHabitFromTask) {
                              (window as any).__addHabitFromTask(taskName);
                            }
                          }}
                      />
                    </Suspense>
                  </PremiumGate>
                </TabsContent>

                <TabsContent value="stickynotes" className="mt-0">
                  <StickyNotesSimple />
                </TabsContent>

                <TabsContent value="scratchpad" className="mt-0">
                  <ScratchPad onCreateCard={handleCreateCard} />
                </TabsContent>

                <TabsContent value="recorder" className="mt-0">
                  <PremiumGate featureName="Recorder Studio" hasAccess={hasPremium}>
                    <RecorderStudio />
                  </PremiumGate>
                </TabsContent>

                <TabsContent value="collab" className="mt-0">
                  <PremiumGate featureName="Collaboration Studio" hasAccess={hasPremium}>
                    <CollabStudio />
                  </PremiumGate>
                </TabsContent>

                <TabsContent value="debugger" className="mt-0">
                  <DebuggerConsole />
                </TabsContent>

                <TabsContent value="projects" className="mt-0">
                  <PremiumGate featureName="Project Manager" hasAccess={hasPremium}>
                    <ProjectManager />
                  </PremiumGate>
                </TabsContent>

                <TabsContent value="knowledge-gaps" className="mt-0">
                  <PremiumGate featureName="Knowledge Gap Analyzer" hasAccess={hasPremium}>
                    <KnowledgeGapAnalyzer />
                  </PremiumGate>
                </TabsContent>

                <TabsContent value="integrations" className="mt-0">
                  <PremiumGate featureName="Integrations Hub" hasAccess={hasPremium}>
                    <IntegrationsHub />
                  </PremiumGate>
                </TabsContent>

                </Suspense>
              </div>

              {/* Right Sidebar - Only show on cards tab and larger screens */}
              {activeTab === "cards" && showRecommendations && (
                <div className="lg:w-80 lg:fixed lg:right-4 lg:top-20 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto z-40">
                  <RecommendationSidebar
                    existingCards={cards}
                    onAddCards={(newCards) => newCards.forEach(card => {
                      const cardWithDefaults = {
                        ...card,
                        number: "000.1", // Add default number since it's omitted from the type
                        linkedCards: [] as string[] // Add default linkedCards since it's omitted from the type
                      };
                      handleCreateCard(cardWithDefaults);
                    })}
                    isOpen={showRecommendations}
                    onClose={() => setShowRecommendations(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </Tabs>
      </main>

      {/* Dialogs and Popovers (all lazy-loaded — wrap in Suspense) */}
      <Suspense fallback={null}>
        {showAccountManagement && (
          <AccountManagement onClose={() => setShowAccountManagement(false)} />
        )}

        <CardViewer
          card={viewingCard}
          isOpen={!!viewingCard}
          onClose={() => setViewingCard(null)}
          onEdit={setEditingCard}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
          onNavigateToCard={handleNavigateToCard}
        />

        {editingCard && (
          <EditCardDialog
            card={editingCard}
            isOpen={!!editingCard}
            onSave={handleUpdateCard}
            onClose={() => setEditingCard(null)}
          />
        )}

        {selectedWord && (
          <WordDefinitionPopover
            word={selectedWord.word}
            position={selectedWord.position}
            onClose={() => setSelectedWord(null)}
            onCreateCard={(word, definition) => {
              handleCreateCard({
                number: "000.1",
                title: word,
                content: definition.definition || `Definition of ${word}`,
                category: "000",
                tags: [word],
                linkedCards: []
              });
            }}
            cards={cards}
          />
        )}

        <SmartLinkingSidebar
          open={showSmartLinking}
          onOpenChange={setShowSmartLinking}
          currentCardId={smartLinkingCardId}
          allCards={cards}
          onLinkAccepted={handleAcceptLink}
        />

        {showImportStudio && (
          <ImportStudio
            existingCards={cards}
            onImportCards={handleImportCards}
            externalOpen={showImportStudio}
            onExternalOpenChange={setShowImportStudio}
          />
        )}

        {showOrganizationMethodDialog && (
          <OrganizationMethodDialog
            currentMethod={organizationMethod}
            onMethodChange={setOrganizationMethod}
            onReorganizeCards={handleReorganizeCards}
            cardCount={cards.length}
            open={showOrganizationMethodDialog}
            onOpenChange={setShowOrganizationMethodDialog}
            hideTrigger
          />
        )}
      </Suspense>

      <OrganizationMethodDialog
        currentMethod={organizationMethod}
        onMethodChange={setOrganizationMethod}
        onReorganizeCards={handleReorganizeCards}
        cardCount={cards.length}
        open={showOrganizationMethodDialog}
        onOpenChange={setShowOrganizationMethodDialog}
        hideTrigger
      />
      
      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  );

};

export default Index;
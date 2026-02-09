import { useState, useEffect, Suspense, lazy } from "react";
import { Navigate } from "react-router-dom";

import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AISearchBar } from "@/components/AISearchBar";
import { UnifiedSearchResults } from "@/components/UnifiedSearchResults";
import { ZettelCard } from "@/components/ZettelCard";
import { CreateCardDialog } from "@/components/CreateCardDialog";
import { VaultImportDialog } from "@/components/VaultImportDialog";
import { EnhancedImportDialog } from "@/components/EnhancedImportDialog";
import { GraphView } from "@/components/GraphViewNew";
import { CardViewer } from "@/components/CardViewer";
import { WordDefinitionPopover } from "@/components/WordDefinitionPopover";
import { RecommendationSidebar } from "@/components/RecommendationSidebar";
import { SmartLinkingSidebar } from "@/components/SmartLinkingSidebar";
import { MobileOptimizedLayout } from "@/components/MobileOptimizedLayout";
import { MobileDetector } from "@/components/MobileDetector";
import { MinimalHeader } from "@/components/MinimalHeader";
import { RightSidebar } from "@/components/RightSidebar";
import { FastLoadingFallback } from "@/components/FastLoadingFallback";
import { CustomizableDashboard } from "@/components/CustomizableDashboard";
import { Notes } from "@/components/Notes";
import { MediaRecorder as MediaRecorderComponent } from "@/components/MediaRecorder";
import { RecordingsLibrary } from "@/components/RecordingsLibrary";
import { AudioManager } from "@/components/AudioManager";
import { ScratchPad } from "@/components/ScratchPad";
import { Catalyst } from "@/components/Catalyst";
import { StickyNotesSimple } from "@/components/StickyNotesSimple";
import { Notebooks } from "@/components/Notebooks";
import { Calendar } from "@/components/Calendar";
import { FileManager } from "@/components/FileManager";
import { RecycleBin } from "@/components/RecycleBin";
import { WorkflowManager } from "@/components/WorkflowManager";
import { OfflineModeIndicator } from "@/components/OfflineModeIndicator";
import { IntelligentCacheIndicator } from "@/components/IntelligentCacheIndicator";
import { OfflineDataManager } from "@/components/OfflineDataManager";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileNavigation } from "@/components/MobileNavigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useSubscription } from "@/hooks/useSubscription";
import { SearchHistorySidebar } from "@/components/SearchHistorySidebar";
import { AccountManagement } from "@/components/AccountManagement";
import { useZettelCards } from "@/hooks/useZettelCards";
import { ZettelCard as ZettelCardType, OrganizationMethod } from "@/types/zettel";
import { DEWEY_CATEGORIES, ORGANIZATION_METHODS } from "@/types/zettel";
import { DeleteAllCardsDialog } from "@/components/DeleteAllCardsDialog";
import { OrganizationMethodDialog } from "@/components/OrganizationMethodDialog";
import { EditCardDialog } from "@/components/EditCardDialog";
import { exportToPDF, printCards } from "@/utils/exportUtils";
import { FriendsPanel } from "@/components/friends/FriendsPanel";
import { ChatPopup } from "@/components/friends/ChatPopup";
import { FloatingChatBubble } from "@/components/FloatingChatBubble";
import { SecurityNotice } from "@/components/SecurityNotice";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { 
  Plus, 
  Download, 
  Printer, 
  Lightbulb,
  FileText,
  Palette,
  StickyNote,
  Sparkles,
  Filter
} from "lucide-react";

import HabitTracker from "@/components/HabitTracker";

// Lazy load heavy components for better performance
const BulletJournal = lazy(() => import("@/components/BulletJournal"));
const InfiniteWhiteboard = lazy(() => import("@/components/InfiniteWhiteboard"));
const MeetingRecorderLazy = lazy(() => import("@/components/MeetingRecorder"));

const Index = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { history, addToHistory, clearHistory, removeItem } = useSearchHistory();
  const { hasPremium } = useSubscription();
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
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [organizationMethod, setOrganizationMethod] = useState<OrganizationMethod>(() => {
    const stored = localStorage.getItem('pendragonx-organization-method');
    return (stored as OrganizationMethod) || "dewey";
  });
  const [editingCard, setEditingCard] = useState<ZettelCardType | null>(null);
  const [viewingCard, setViewingCard] = useState<ZettelCardType | null>(null);
  const [showAccountManagement, setShowAccountManagement] = useState(false);
  const [activeChatFriend, setActiveChatFriend] = useState<{ id: string; name: string } | null>(null);
  const [showSmartLinking, setShowSmartLinking] = useState(false);
  const [smartLinkingCardId, setSmartLinkingCardId] = useState<string | null>(null);
  const [showNewCardsOnly, setShowNewCardsOnly] = useState(false);

  // Helper to check if a card is "new" (created within last 24 hours)
  const isNewCard = (card: ZettelCardType) => {
    const createdDate = new Date(card.created);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff <= 24;
  };

  // Get displayed cards based on filter
  const displayedCards = showNewCardsOnly 
    ? filteredCards.filter(isNewCard) 
    : filteredCards;

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
    <OfflineDataManager />
    <MobileDetector>
      <MobileOptimizedLayout>
      <SecurityNotice />

      {/* Minimal Header */}
      <MinimalHeader
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={handleSignOut}
        onAccountSettings={() => setShowAccountManagement(true)}
        onCreateCard={handleCreateCard}
        existingCards={cards}
        organizationMethod={organizationMethod}
        isAdmin={isAdmin}
        onSearchClick={() => {
          setActiveTab("search");
          // Focus search input if needed
          setTimeout(() => {
            const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
            searchInput?.focus();
          }, 100);
        }}
      />

      {/* Compact AI Search Bar - Mobile Optimized */}
      {activeTab === "search" && (
        <div className="sticky top-12 z-40 bg-background/98 backdrop-blur-xl border-b border-border/40 px-2 sm:px-3 py-2 sm:py-3 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center gap-2">
            <div className="flex-1 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10 rounded-xl sm:rounded-2xl blur-lg sm:blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"></div>
              <AISearchBar 
                cards={cards} 
                onSearchResults={(results) => {
                  if (results.query) {
                    handleSearchResults(results);
                  } else {
                    setSearchResults(null);
                    setFilteredCards(results.cards);
                  }
                }}
                onQueryChange={setCurrentQuery}
                className="relative z-10"
              />
            </div>
            <SearchHistorySidebar
              history={history}
              onRerun={handleRerunSearch}
              onCombine={handleCombineSearches}
              onClear={clearHistory}
              onRemove={removeItem}
            />
          </div>
        </div>
      )}

      {/* Main Content - Mobile Optimized */}
      <main className="pb-16 md:pb-2 px-1.5 sm:px-2 md:px-3 relative min-h-screen" role="main">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative">
          {/* Cards Menu Bar - Mobile Optimized */}
          {activeTab === "cards" && (
            <div className="sticky top-14 sm:top-20 z-30 bg-card/98 backdrop-blur-xl border border-border/40 rounded-lg px-2 py-1.5 sm:py-2 mb-2 shadow-md hover:shadow-lg hover:border-primary/30 transition-all duration-300">
              <div className="flex items-center justify-center max-w-7xl mx-auto gap-1 sm:gap-1.5 flex-wrap">
                <CreateCardDialog onCreateCard={handleCreateCard} existingCards={cards} organizationMethod={organizationMethod} />
                <EnhancedImportDialog existingCards={cards} onImportCards={handleImportCards} />
                <VaultImportDialog onImportCards={handleImportCards} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToPDF(filteredCards)}
                  className="flex items-center gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 touch-manipulation"
                  aria-label="Export to PDF"
                >
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="sr-only md:not-sr-only text-xs sm:text-sm">PDF</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printCards(filteredCards)}
                  className="flex items-center gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 touch-manipulation"
                  aria-label="Print cards"
                >
                  <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="sr-only md:not-sr-only text-xs sm:text-sm">Print</span>
                </Button>
                <OrganizationMethodDialog
                  currentMethod={organizationMethod}
                  onMethodChange={setOrganizationMethod}
                  onReorganizeCards={handleReorganizeCards}
                  cardCount={cards.length}
                />
                <Button
                  variant={showNewCardsOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowNewCardsOnly(!showNewCardsOnly)}
                  className="flex items-center gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 touch-manipulation"
                  aria-label="Show new cards only"
                >
                  <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">New</span>
                  {newCardsCount > 0 && (
                    <span className="ml-1 bg-emerald-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {newCardsCount}
                    </span>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="flex items-center gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 touch-manipulation"
                  aria-label="AI Recommendations"
                >
                  <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="sr-only md:not-sr-only text-xs sm:text-sm">AI</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (filteredCards.length > 0) {
                      handleOpenSmartLinking(filteredCards[0].id);
                    } else {
                      toast.error("Create some cards first to use Smart Linking");
                    }
                  }}
                  className="flex items-center gap-1 sm:gap-2 h-8 sm:h-9 px-2 sm:px-3 touch-manipulation"
                  aria-label="Smart Linking"
                >
                  <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="sr-only md:not-sr-only text-xs sm:text-sm">Links</span>
                </Button>
                <DeleteAllCardsDialog 
                  onDeleteAll={deleteAllCards}
                  isDeleting={isDeletingAll}
                  cardCount={cards.length}
                />
              </div>
            </div>
          )}
          <div className="w-full pt-2 sm:pt-0">
            <div className="w-full space-y-2 sm:space-y-3">
              <div className="w-full">
                <TabsContent value="dashboard" className="mt-0">
                  <CustomizableDashboard 
                    onCreateCard={handleCreateCard} 
                    onEdit={(card) => setViewingCard(card)}
                    onOpenNote={(note) => {
                      setActiveTab("notes");
                    }}
                    onNavigate={(tab) => setActiveTab(tab)}
                  />
                </TabsContent>

                <TabsContent value="search" className="mt-0">
                  <div className="p-3 sm:p-4">
                    {searchResults ? (
                        <UnifiedSearchResults
                        query={searchResults.query}
                        cards={searchResults.cards}
                        notes={searchResults.notes}
                        stickyNotes={searchResults.stickyNotes}
                        scratchNotes={searchResults.scratchNotes}
                        webResults={searchResults.webResults}
                        generatedImage={searchResults.generatedImage}
                        multimediaResults={searchResults.multimediaResults}
                        reasoning={searchResults.reasoning}
                        intent={searchResults.intent}
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
                              title: searchResults.query,
                              content: content,
                              description: source ? `Source: ${source}` : undefined,
                              category: "Research",
                              tags: ["web-search", searchResults.query.split(' ')[0]],
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
                      />
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground text-sm">Use the search bar above to find content across your notes, cards, and sticky notes.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="catalyst" className="mt-0">
                  {hasPremium ? (
                    <Catalyst />
                  ) : (
                    <div className="text-center py-8">
                      <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
                      <p className="text-muted-foreground mb-4 text-sm">Catalyst Writing Suite is available for premium subscribers only.</p>
                      <Button size="sm" onClick={() => window.location.href = '/subscription'}>
                        Upgrade to Premium
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="notes" className="mt-0">
                  <Notes />
                </TabsContent>

                <TabsContent value="notebooks" className="mt-0">
                  <Notebooks />
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
                          <div key={i} className="h-40 bg-muted/50 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : displayedCards.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-20 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-3">
                          {cards.length === 0 
                            ? "Start building your knowledge base by creating your first card"
                            : showNewCardsOnly
                            ? "No new cards in the last 24 hours"
                            : "Try adjusting your search terms or filters"
                          }
                        </p>
                        {showNewCardsOnly ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setShowNewCardsOnly(false)}
                          >
                            Show All Cards
                          </Button>
                        ) : (
                          <CreateCardDialog onCreateCard={handleCreateCard} existingCards={cards} organizationMethod={organizationMethod} />
                        )}
                      </div>
                    ) : (
                      <div>
                        {/* New Cards Filter Active Banner */}
                        {showNewCardsOnly && (
                          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-emerald-500" />
                              <span className="text-sm font-medium">Showing {displayedCards.length} new card{displayedCards.length !== 1 ? 's' : ''} from the last 24 hours</span>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setShowNewCardsOnly(false)}
                              className="text-xs"
                            >
                              Show All
                            </Button>
                          </div>
                        )}

                        {/* Favorites Section */}
                        {displayedCards.some(card => card.is_favorite) && (
                          <div className="mb-4">
                            <h2 className="text-base font-semibold mb-2 flex items-center gap-2">
                              <span className="text-yellow-500">★</span>
                              Favorites
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                              {displayedCards
                                .filter(card => card.is_favorite)
                                .map((card) => (
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
                                    onWordHover={handleWordHover}
                                    className="h-fit"
                                  />
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* All Cards Section */}
                        {displayedCards.some(card => !card.is_favorite) && (
                          <div>
                            {displayedCards.some(card => card.is_favorite) && (
                              <h2 className="text-base font-semibold mb-2">All Cards</h2>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                              {displayedCards
                                .filter(card => !card.is_favorite)
                                .map((card) => (
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
                                    onWordHover={handleWordHover}
                                    className="h-fit"
                                  />
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="graph" className="mt-0">
                  {hasPremium ? (
                    <div className="h-[calc(100vh-10rem)]">
                      <GraphView 
                        cards={filteredCards} 
                        onCardSelect={setViewingCard}
                        onCardUpdate={handleUpdateCard}
                        className="h-full"
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
                      <p className="text-muted-foreground mb-4 text-sm">Knowledge Graph (3D) is available for premium subscribers only.</p>
                      <Button size="sm" onClick={() => window.location.href = '/subscription'}>
                        Upgrade to Premium
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="whiteboard" className="mt-0">
                  {hasPremium ? (
                    <div className="h-[calc(100vh-10rem)]">
                      <Suspense fallback={<FastLoadingFallback message="Loading whiteboard..." icon={<Palette className="h-6 w-6 animate-pulse" />} />}>
                        <InfiniteWhiteboard onCreateCard={handleCreateCard} />
                      </Suspense>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
                      <p className="text-muted-foreground mb-4 text-sm">Interactive Whiteboard is available for premium subscribers only.</p>
                      <Button size="sm" onClick={() => window.location.href = '/subscription'}>
                        Upgrade to Premium
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="journal" className="mt-0">
                  {hasPremium ? (
                    <Suspense fallback={<FastLoadingFallback message="Loading journal..." icon={<StickyNote className="h-6 w-6 animate-pulse" />} />}>
                      <BulletJournal
                          onCreateCard={handleCreateCard}
                          onAddHabit={(taskName) => {
                            // Trigger habit creation via global function exposed by HabitTracker
                            if ((window as any).__addHabitFromTask) {
                              (window as any).__addHabitFromTask(taskName);
                            }
                          }}
                      />
                    </Suspense>
                  ) : (
                    <div className="text-center py-8">
                      <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
                      <p className="text-muted-foreground mb-4 text-sm">Bullet Journal is available for premium subscribers only.</p>
                      <Button size="sm" onClick={() => window.location.href = '/subscription'}>
                        Upgrade to Premium
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="habits" className="mt-0">
                  {hasPremium ? (
                    <HabitTracker />
                  ) : (
                    <div className="text-center py-8">
                      <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
                      <p className="text-muted-foreground mb-4 text-sm">Habit Tracker is available for premium subscribers only.</p>
                      <Button size="sm" onClick={() => window.location.href = '/subscription'}>
                        Upgrade to Premium
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="stickynotes" className="mt-0">
                  <StickyNotesSimple />
                </TabsContent>

                <TabsContent value="scratchpad" className="mt-0">
                  <ScratchPad onCreateCard={handleCreateCard} />
                </TabsContent>

                <TabsContent value="recorder" className="mt-0">
                  {hasPremium ? (
                    <div className="space-y-4">
                      <MediaRecorderComponent />
                      <RecordingsLibrary />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
                      <p className="text-muted-foreground mb-4 text-sm">Audio/Video Recording is available for premium subscribers only.</p>
                      <Button size="sm" onClick={() => window.location.href = '/subscription'}>
                        Upgrade to Premium
                      </Button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="collab" className="mt-0">
                  {hasPremium ? (
                    <FriendsPanel onOpenChat={(id, name) => setActiveChatFriend({ id, name })} />
                  ) : (
                    <div className="text-center py-8">
                      <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
                      <p className="text-muted-foreground mb-4 text-sm">Collaboration features are available for premium subscribers only.</p>
                      <Button size="sm" onClick={() => window.location.href = '/subscription'}>
                        Upgrade to Premium
                      </Button>
                    </div>
                  )}
                </TabsContent>

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

      {/* Dialogs and Popovers */}
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

      {activeChatFriend && (
        <ChatPopup
          friendId={activeChatFriend.id}
          friendName={activeChatFriend.name}
          onClose={() => setActiveChatFriend(null)}
        />
      )}
      

      <SmartLinkingSidebar
        open={showSmartLinking}
        onOpenChange={setShowSmartLinking}
        currentCardId={smartLinkingCardId}
        allCards={cards}
        onLinkAccepted={handleAcceptLink}
      />
      
      <Footer />
      </MobileOptimizedLayout>
    </MobileDetector>
    
    {/* PWA Install Prompt */}
    <PWAInstallPrompt />
    
    {/* Mobile Navigation */}
    <MobileNavigation isAdmin={isAdmin} />
    
    {/* Floating Chat Bubble - Outside all containers for true viewport fixed positioning */}
    <FloatingChatBubble />
    </>
  );

};

export default Index;
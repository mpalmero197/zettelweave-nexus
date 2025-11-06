import { useState, useEffect, Suspense, lazy } from "react";
import { AIAssistantSidebar } from "@/components/AIAssistantSidebar";
import { SearchResultsCanvas } from "@/components/SearchResultsCanvas";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { AISearchBar } from "@/components/AISearchBar";
import { UnifiedSearchResults } from "@/components/UnifiedSearchResults";
import { ZettelCard } from "@/components/ZettelCard";
import { CreateCardDialog } from "@/components/CreateCardDialog";
import { VaultImportDialog } from "@/components/VaultImportDialog";
import { GraphView } from "@/components/GraphViewNew";
import { CardViewer } from "@/components/CardViewer";
import { WordDefinitionPopover } from "@/components/WordDefinitionPopover";
import { RecommendationSidebar } from "@/components/RecommendationSidebar";
import { SmartLinkingSidebar } from "@/components/SmartLinkingSidebar";
import { MobileOptimizedLayout } from "@/components/MobileOptimizedLayout";
import { MobileDetector } from "@/components/MobileDetector";
import { NavigationBar } from "@/components/NavigationBar";
import { RightSidebar } from "@/components/RightSidebar";
import { FastLoadingFallback } from "@/components/FastLoadingFallback";
import { CustomizableDashboard } from "@/components/CustomizableDashboard";
import { Notes } from "@/components/Notes";
import { MediaRecorder as MediaRecorderComponent } from "@/components/MediaRecorder";
import { RecordingsLibrary } from "@/components/RecordingsLibrary";
import { AudioManager } from "@/components/AudioManager";
import { Catalyst } from "@/components/Catalyst";
import { StickyNotesSimple } from "@/components/StickyNotesSimple";
import { Notebooks } from "@/components/Notebooks";
import { Calendar } from "@/components/Calendar";
import { FileManager } from "@/components/FileManager";
import { RecycleBin } from "@/components/RecycleBin";
import { useAuth } from "@/hooks/useAuth";
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
import { 
  Plus, 
  Download, 
  Printer, 
  Lightbulb,
  FileText,
  Palette,
  StickyNote,
  Sparkles
} from "lucide-react";

import HabitTracker from "@/components/HabitTracker";

// Lazy load heavy components for better performance
const BulletJournal = lazy(() => import("@/components/BulletJournal"));
const InfiniteWhiteboard = lazy(() => import("@/components/InfiniteWhiteboard"));

const MeetingRecorderLazy = lazy(() => import("@/components/MeetingRecorder"));
import { SecurityNotice } from "@/components/SecurityNotice";
import { Footer } from "@/components/Footer";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, signOut } = useAuth();
  const { cards, isLoading, createCard, updateCard, deleteCard, deleteAllCards, isDeletingAll } = useZettelCards();
  
  const [filteredCards, setFilteredCards] = useState<ZettelCardType[]>([]);
  const [searchResults, setSearchResults] = useState<{
    cards: ZettelCardType[];
    notes: any[];
    stickyNotes: any[];
    reasoning: string;
    query: string;
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
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showSmartLinking, setShowSmartLinking] = useState(false);
  const [smartLinkingCardId, setSmartLinkingCardId] = useState<string | null>(null);
  const [aiSearchCanvas, setAISearchCanvas] = useState<{
    query: string;
    result: string;
    images?: string[];
    citations?: string[];
    relatedQuestions?: string[];
  } | null>(null);

  // Handle web search
  const handleWebSearch = async (query: string) => {
    if (!query.trim()) return;
    
    // Set loading state
    setAISearchCanvas({
      query,
      result: 'Searching the internet...',
      images: [],
      citations: [],
      relatedQuestions: []
    });

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant-chat', {
        body: {
          messages: [{ role: 'user', content: query }],
          useInternet: true
        }
      });

      if (error) throw error;

      if (data) {
        setAISearchCanvas({
          query,
          result: data.response || data.result || 'No results found.',
          images: data.images || [],
          citations: data.citations || [],
          relatedQuestions: data.relatedQuestions || []
        });
      }
    } catch (error) {
      console.error('Web search error:', error);
      setAISearchCanvas({
        query,
        result: 'Search failed. Please try again.',
        images: [],
        citations: [],
        relatedQuestions: []
      });
    }
  };

  // Handle web search tab activation
  useEffect(() => {
    if (activeTab === "websearch") {
      // Auto-focus on search when web search tab is activated
      setAISearchCanvas({
        query: "",
        result: "Enter a search query above to search the internet.",
        images: [],
        citations: [],
        relatedQuestions: []
      });
    }
  }, [activeTab]);

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

  if (!user) {
    return null;
  }

  return (
    <>
    <MobileDetector>
      <MobileOptimizedLayout>
      <SecurityNotice />
      
      {/* Navigation Bar with Dropdowns */}
      <NavigationBar
        user={user}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSignOut={handleSignOut}
        onAccountSettings={() => setShowAccountManagement(true)}
        isAdmin={isAdmin}
        onCreateNote={() => setActiveTab("notes")}
        onCreateWhiteboard={() => setActiveTab("whiteboard")}
        onStartRecording={() => setActiveTab("recorder")}
      />

      {/* Global AI Search Bar - Below Nav with proper z-index */}
      <div className="sticky top-16 z-[35] glass-card px-4 py-3 mb-4">
        <div className="max-w-3xl mx-auto">
          <AISearchBar 
            cards={cards} 
            onSearchResults={(results) => {
              if (results.query) {
                setSearchResults(results);
                setActiveTab('search');
              } else {
                setSearchResults(null);
                setFilteredCards(results.cards);
              }
            }}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar 
        onCreateCard={handleCreateCard} 
        onOpenAIAssistant={() => setShowAIAssistant(true)}
      />

      {/* Main Content */}
      <main className="py-2 px-4 relative" role="main">
        {/* Subtle top glow effect */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-glow pointer-events-none opacity-50" />
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full relative">
          {/* Cards Menu Bar - Below Global Search */}
          {activeTab === "cards" && (
            <div className="sticky top-32 z-30 glass-card px-4 py-3 animate-fade-in-up">
              <div className="flex items-center justify-center max-w-7xl mx-auto gap-4 flex-wrap">
                <CreateCardDialog onCreateCard={handleCreateCard} existingCards={cards} organizationMethod={organizationMethod} />
                <VaultImportDialog onImportCards={handleImportCards} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToPDF(filteredCards)}
                  className="flex items-center gap-2"
                  aria-label="Export to PDF"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => printCards(filteredCards)}
                  className="flex items-center gap-2"
                  aria-label="Print cards"
                >
                  <Printer className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
                </Button>
                <OrganizationMethodDialog
                  currentMethod={organizationMethod}
                  onMethodChange={setOrganizationMethod}
                  onReorganizeCards={handleReorganizeCards}
                  cardCount={cards.length}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRecommendations(!showRecommendations)}
                  className="flex items-center gap-2"
                  aria-label="AI Recommendations"
                >
                  <Lightbulb className="h-4 w-4" />
                  <span className="hidden sm:inline">AI Suggest</span>
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
                  className="flex items-center gap-2"
                  aria-label="Smart Linking"
                >
                  <Sparkles className="h-4 w-4" />
                  <span className="hidden sm:inline">Smart Links</span>
                </Button>
                <DeleteAllCardsDialog 
                  onDeleteAll={deleteAllCards}
                  isDeleting={isDeletingAll}
                  cardCount={cards.length}
                />
              </div>
            </div>
          )}
          <div className="mt-4 w-full">
            <div className="w-full space-y-4">
              {/* Main Content Area - Full width with proper padding for sidebar on desktop */}
              <div className={`w-full ${activeTab === 'cards' ? 'lg:ml-84' : ''}`}>
                <TabsContent value="dashboard" className="mt-0">
                  <CustomizableDashboard 
                    onCreateCard={handleCreateCard} 
                    onEdit={(card) => setViewingCard(card)}
                    onOpenNote={(note) => {
                      // Navigate to notes tab and focus on this note
                      setActiveTab("notes");
                      toast.success(`Opening note: ${note.title}`);
                    }}
                  />
                </TabsContent>

                <TabsContent value="search" className="mt-0">
                  <div className="glass-card rounded-2xl p-6 shadow-card hover:shadow-hover transition-all duration-500 animate-fade-in-up">
                    {searchResults ? (
                      <UnifiedSearchResults
                        query={searchResults.query}
                        cards={searchResults.cards}
                        notes={searchResults.notes}
                        stickyNotes={searchResults.stickyNotes}
                        reasoning={searchResults.reasoning}
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
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-96 text-center">
                        <p className="text-muted-foreground">Use the search bar above to find content across your notes, cards, and sticky notes.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="catalyst" className="mt-0">
                  <Catalyst />
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

                <TabsContent value="cards" className="mt-0">
                  <div className="glass-card rounded-2xl p-6 shadow-card hover:shadow-hover transition-all duration-500 animate-fade-in-up">
                    {isLoading ? (
                      <FastLoadingFallback message="Loading your knowledge cards..." />
                    ) : filteredCards.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-96 text-center">
                        <div className="p-6 bg-primary/5 rounded-full mb-6">
                          <FileText className="h-16 w-16 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No cards found</h3>
                        <p className="text-muted-foreground mb-6 max-w-md">
                          {cards.length === 0 
                            ? "Start building your knowledge base by creating your first card"
                            : "Try adjusting your search terms or filters"
                          }
                        </p>
                        <CreateCardDialog onCreateCard={handleCreateCard} existingCards={cards} organizationMethod={organizationMethod} />
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* Favorites Section */}
                        {filteredCards.some(card => card.is_favorite) && (
                          <div>
                            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                              <span className="text-yellow-500">★</span>
                              Favorites
                            </h2>
                            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 auto-rows-max">
                              {filteredCards
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
                        {filteredCards.some(card => !card.is_favorite) && (
                          <div>
                            {filteredCards.some(card => card.is_favorite) && (
                              <h2 className="text-2xl font-bold mb-4">All Cards</h2>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 auto-rows-max">
                              {filteredCards
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
                  <div className="glass-card rounded-2xl p-6 min-h-[600px] shadow-card hover:shadow-hover transition-all duration-500 animate-fade-in-up">
                    <GraphView 
                      cards={filteredCards} 
                      onCardSelect={setViewingCard}
                      onCardUpdate={handleUpdateCard}
                      className="h-[550px]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="whiteboard" className="mt-0">
                  <div className="glass-card rounded-2xl p-6 min-h-[600px] shadow-card hover:shadow-hover transition-all duration-500 animate-fade-in-up">
                    <Suspense fallback={<FastLoadingFallback message="Loading whiteboard..." icon={<Palette className="h-6 w-6 animate-pulse" />} />}>
                      <InfiniteWhiteboard onCreateCard={handleCreateCard} />
                    </Suspense>
                  </div>
                </TabsContent>

                <TabsContent value="journal" className="mt-0">
                  <div className="glass-card rounded-2xl p-6 min-h-[600px] shadow-card hover:shadow-hover transition-all duration-500 animate-fade-in-up">
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
                  </div>
                </TabsContent>

                <TabsContent value="habits" className="mt-0">
                  <div className="glass-card rounded-2xl p-6 min-h-[600px] shadow-card hover:shadow-hover transition-all duration-500 animate-fade-in-up">
                    <HabitTracker />
                  </div>
                </TabsContent>

                <TabsContent value="stickynotes" className="mt-0">
                  <div className="glass-card rounded-2xl p-6 min-h-[600px] shadow-card hover:shadow-hover transition-all duration-500 relative animate-fade-in-up">
                    <StickyNotesSimple />
                  </div>
                </TabsContent>

                <TabsContent value="recorder" className="mt-0">
                  <div className="glass-card rounded-2xl p-6 min-h-[600px] shadow-card hover:shadow-hover transition-all duration-500 space-y-6 animate-fade-in-up">
                    <MediaRecorderComponent />
                    <RecordingsLibrary />
                  </div>
                </TabsContent>

                <TabsContent value="collab" className="mt-0">
                  <div className="glass-card rounded-2xl p-6 min-h-[600px] shadow-card hover:shadow-hover transition-all duration-500 animate-fade-in-up">
                    <FriendsPanel onOpenChat={(id, name) => setActiveChatFriend({ id, name })} />
                  </div>
                </TabsContent>

                <TabsContent value="websearch" className="mt-0">
                  <div className="min-h-[600px]">
                    <SearchResultsCanvas
                      query={aiSearchCanvas?.query || ""}
                      result={aiSearchCanvas?.result || "Enter a search query to search the internet for anything."}
                      images={aiSearchCanvas?.images || []}
                      citations={aiSearchCanvas?.citations || []}
                      relatedQuestions={aiSearchCanvas?.relatedQuestions || []}
                      onClose={() => setActiveTab("dashboard")}
                      onRelatedSearch={(newQuery) => {
                        // Trigger a new search when related question is clicked
                        handleWebSearch(newQuery);
                      }}
                    />
                  </div>
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
      
      <AIAssistantSidebar 
        open={showAIAssistant} 
        onOpenChange={setShowAIAssistant}
        onSearchResult={(data) => {
          setAISearchCanvas({
            query: data.query,
            result: data.result,
            images: data.images,
            citations: data.citations,
            relatedQuestions: data.relatedQuestions
          });
        }}
      />

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
    
    {/* Floating Chat Bubble - Outside all containers for true viewport fixed positioning */}
    <FloatingChatBubble />
    </>
  );

};

export default Index;
import { useState, useEffect, Suspense, lazy } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { ZettelCard } from "@/components/ZettelCard";
import { CreateCardDialog } from "@/components/CreateCardDialog";
import { VaultImportDialog } from "@/components/VaultImportDialog";
import { GraphView } from "@/components/GraphViewNew";
import { CardViewer } from "@/components/CardViewer";
import { WordDefinitionPopover } from "@/components/WordDefinitionPopover";
import { RecommendationSidebar } from "@/components/RecommendationSidebar";
import { MobileOptimizedLayout } from "@/components/MobileOptimizedLayout";
import { MobileDetector } from "@/components/MobileDetector";
import { NavigationBar } from "@/components/NavigationBar";
import { RightSidebar } from "@/components/RightSidebar";
import { FastLoadingFallback } from "@/components/FastLoadingFallback";
import { CustomizableDashboard } from "@/components/CustomizableDashboard";
import { Notes } from "@/components/Notes";
import MeetingRecorder from "@/components/MeetingRecorder";
import { AudioManager } from "@/components/AudioManager";
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
import { 
  Plus, 
  Download, 
  Printer, 
  Lightbulb,
  FileText,
  Palette,
  StickyNote
} from "lucide-react";

import HabitTracker from "@/components/HabitTracker";

// Lazy load heavy components for better performance
const BulletJournal = lazy(() => import("@/components/BulletJournal"));
const InfiniteWhiteboard = lazy(() => import("@/components/InfiniteWhiteboard"));

const MeetingRecorderLazy = lazy(() => import("@/components/MeetingRecorder"));
import { SecurityNotice } from "@/components/SecurityNotice";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, signOut } = useAuth();
  const { cards, isLoading, createCard, updateCard, deleteCard, deleteAllCards, isDeletingAll } = useZettelCards();
  
  const [filteredCards, setFilteredCards] = useState<ZettelCardType[]>([]);
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

  useEffect(() => {
    if (JSON.stringify(filteredCards) !== JSON.stringify(cards)) {
      setFilteredCards(cards);
    }
  }, [cards, filteredCards]);

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

  const handleImportCards = (newCards: Omit<ZettelCardType, 'id' | 'created' | 'modified'>[]) => {
    newCards.forEach(card => createCard(card));
    toast(`Successfully imported ${newCards.length} cards!`);
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

  if (!user) {
    return null;
  }

  return (
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

      {/* Right Sidebar */}
      <RightSidebar onCreateCard={handleCreateCard} />

      {/* Main Content */}
      <main className="py-2 px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Cards Menu Bar - Below Header */}
          {activeTab === "cards" && (
            <div className="sticky top-16 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50 px-4 py-3">
              <div className="flex items-center justify-between max-w-7xl mx-auto gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <CreateCardDialog onCreateCard={handleCreateCard} existingCards={cards} />
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
                    <span className="hidden sm:inline">AI</span>
                  </Button>
                  <DeleteAllCardsDialog 
                    onDeleteAll={deleteAllCards}
                    isDeleting={isDeletingAll}
                    cardCount={cards.length}
                  />
                </div>
                <div className="flex-1 max-w-md">
                  <SearchBar 
                    cards={cards} 
                    onSearchResults={setFilteredCards}
                  />
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 w-full">
            <div className="w-full space-y-4">
              {/* Main Content Area - Full width with proper padding for sidebar on desktop */}
              <div className={`w-full min-h-[600px] ${activeTab === 'cards' ? 'lg:ml-84' : ''}`}>
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
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 min-h-[600px] shadow-sm">
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
                        <CreateCardDialog onCreateCard={handleCreateCard} existingCards={cards} />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6 auto-rows-max">
                        {filteredCards.map((card) => (
                          <ZettelCard
                            key={card.id}
                            card={card}
                            onEdit={setViewingCard}
                            onDelete={handleDeleteCard}
                            onWordHover={handleWordHover}
                            className="h-fit"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="graph" className="mt-0">
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 min-h-[600px] shadow-sm">
                    <GraphView 
                      cards={filteredCards} 
                      onCardSelect={setViewingCard}
                      onCardUpdate={handleUpdateCard}
                      className="h-[550px]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="whiteboard" className="mt-0">
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 min-h-[600px] shadow-sm">
                    <Suspense fallback={<FastLoadingFallback message="Loading whiteboard..." icon={<Palette className="h-6 w-6 animate-pulse" />} />}>
                      <InfiniteWhiteboard onCreateCard={handleCreateCard} />
                    </Suspense>
                  </div>
                </TabsContent>

                <TabsContent value="journal" className="mt-0">
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 min-h-[600px] shadow-sm">
                    <Suspense fallback={<FastLoadingFallback message="Loading journal..." icon={<StickyNote className="h-6 w-6 animate-pulse" />} />}>
                      <BulletJournal onCreateCard={handleCreateCard} />
                    </Suspense>
                  </div>
                </TabsContent>

                <TabsContent value="habits" className="mt-0">
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 min-h-[600px] shadow-sm">
                    <HabitTracker />
                  </div>
                </TabsContent>

                <TabsContent value="stickynotes" className="mt-0">
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 min-h-[600px] shadow-sm relative">
                    <StickyNotesSimple />
                  </div>
                </TabsContent>

                <TabsContent value="recorder" className="mt-0">
                  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-6 min-h-[600px] shadow-sm space-y-6">
                    <Suspense fallback={<FastLoadingFallback message="Loading meeting recorder..." />}>
                      <MeetingRecorderLazy />
                    </Suspense>
                    <AudioManager />
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
      </MobileOptimizedLayout>
    </MobileDetector>
  );

};

export default Index;
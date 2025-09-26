import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/SearchBar";
import { ZettelCard } from "@/components/ZettelCard";
import { CreateCardDialog } from "@/components/CreateCardDialog";
import { ImportDialog } from "@/components/ImportDialog";
import { GraphView } from "@/components/GraphView";
import { WordDefinitionPopover } from "@/components/WordDefinitionPopover";
import { RecommendationSidebar } from "@/components/RecommendationSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useZettelCards } from "@/hooks/useZettelCards";
import { ZettelCard as ZettelCardType, OrganizationMethod } from "@/types/zettel";
import { DEWEY_CATEGORIES, ORGANIZATION_METHODS } from "@/types/zettel";
import { DeleteAllCardsDialog } from "@/components/DeleteAllCardsDialog";
import { OrganizationMethodDialog } from "@/components/OrganizationMethodDialog";
import { EditCardDialog } from "@/components/EditCardDialog";
import { exportToPDF, printCards } from "@/utils/exportUtils";
import { 
  Brain, 
  Plus, 
  Upload, 
  BarChart3, 
  Sun, 
  Moon, 
  Download, 
  Printer, 
  Bot,
  LogOut,
  User,
  Settings,
  Lightbulb,
  Grid3X3,
  FileText,
  Palette,
  StickyNote
} from "lucide-react";
import { ScratchPad } from "@/components/ScratchPad";
import { BulletJournal } from "@/components/BulletJournal";
import { InfiniteWhiteboard } from "@/components/InfiniteWhiteboard";
import { StickyNotesEnhanced } from "@/components/StickyNotesEnhanced";
import { SecurityNotice } from "@/components/SecurityNotice";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, signOut } = useAuth();
  const { cards, isLoading, createCard, updateCard, deleteCard, deleteAllCards, isDeletingAll } = useZettelCards();
  const { theme, setTheme } = useTheme();
  
  const [filteredCards, setFilteredCards] = useState<ZettelCardType[]>([]);
  const [selectedWord, setSelectedWord] = useState<{ word: string; position: { x: number; y: number } } | null>(null);
  const [activeTab, setActiveTab] = useState("cards");
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [organizationMethod, setOrganizationMethod] = useState<OrganizationMethod>(() => {
    const stored = localStorage.getItem('zettelweave-organization-method');
    return (stored as OrganizationMethod) || "dewey";
  });
  const [editingCard, setEditingCard] = useState<ZettelCardType | null>(null);

  useEffect(() => {
    if (JSON.stringify(filteredCards) !== JSON.stringify(cards)) {
      setFilteredCards(cards);
    }
  }, [cards, filteredCards]);

  useEffect(() => {
    localStorage.setItem('zettelweave-organization-method', organizationMethod);
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
      const { data, error } = await supabase.functions.invoke('ai-reorganize-cards', {
        body: {
          cards,
          fromMethod,
          toMethod
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Update each card with the reorganized data
      const { reorganizedCards } = data;
      for (const reorganizedCard of reorganizedCards) {
        await updateCard(reorganizedCard);
      }

      toast(`Successfully reorganized ${reorganizedCards.length} cards to ${toMethod} system!`);
    } catch (error) {
      console.error('Error reorganizing cards:', error);
      throw error;
    }
  };

  const addRecommendedCards = (recommendedCards: Omit<ZettelCardType, 'id' | 'number' | 'created' | 'linkedCards'>[]) => {
    const cardsWithMetadata = recommendedCards.map(card => ({
      ...card,
      number: "",
      linkedCards: [] as string[]
    }));
    cardsWithMetadata.forEach(card => createCard(card));
    toast(`Added ${recommendedCards.length} recommended cards!`);
  };

  const handleWordHover = (word: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setSelectedWord({
      word,
      position: { x: rect.left + rect.width / 2, y: rect.top }
    });
  };

  const handleCreateCardFromWord = (definition: any) => {
    const newCard: Omit<ZettelCardType, 'id' | 'created' | 'modified'> = {
      title: `Definition: ${definition.word}`,
      content: `${definition.definition}\n\nPart of speech: ${definition.partOfSpeech}${
        definition.examples ? `\n\nExamples:\n${definition.examples.join('\n')}` : ''
      }`,
      description: `Definition and usage of the word "${definition.word}"`,
      category: "400", // Language category
      number: "", // Will be auto-generated
      tags: ["definition", "language", definition.partOfSpeech],
      linkedCards: []
    };

    createCard(newCard);
    setSelectedWord(null);
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast(`Sign out failed: ${error.message}`);
    }
  };

  const handleExportPDF = () => {
    try {
      exportToPDF(filteredCards, "My Zettel Cards");
      toast("PDF exported successfully!");
    } catch (error) {
      toast("Failed to export PDF");
    }
  };

  const handlePrint = () => {
    try {
      printCards(filteredCards);
      toast("Print dialog opened");
    } catch (error) {
      toast("Failed to print cards");
    }
  };

  // Calculate statistics based on organization method
  const totalCards = cards.length;
  
  const getStatsForMethod = () => {
    if (cards.length === 0) return [];
    
    switch (organizationMethod) {
      case "dewey":
        return DEWEY_CATEGORIES.map(category => ({
          ...category,
          count: cards.filter(card => {
            const categoryStart = parseInt(category.range.split('-')[0]);
            const categoryEnd = parseInt(category.range.split('-')[1]);
            const cardCategory = parseInt(card.category);
            return cardCategory >= categoryStart && cardCategory <= categoryEnd;
          }).length
        })).filter(cat => cat.count > 0 || organizationMethod === "dewey");
      
      case "luhmann":
        // Group by first character/number of Luhmann sequences
        const luhmannGroups = cards.reduce((acc, card) => {
          const number = card.number || '1';
          // Extract the root sequence (e.g., "1" from "1a3b2", "2" from "2b1")
          const rootSequence = number.match(/^(\d+)/)?.[1] || number.charAt(0) || '1';
          if (!acc[rootSequence]) acc[rootSequence] = 0;
          acc[rootSequence]++;
          return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(luhmannGroups)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([key, count]) => ({
            range: `${key}*`,
            name: `Main Branch ${key}`,
            description: `Cards in sequence ${key} and its sub-branches`,
            color: (parseInt(key) % 10) * 100,
            count
          }));
      
      case "folgezettel":
        // Group by main sequence number (before first decimal)
        const folgezettelGroups = cards.reduce((acc, card) => {
          const number = card.number || '1';
          const mainNum = number.split('.')[0] || '1';
          if (!acc[mainNum]) acc[mainNum] = 0;
          acc[mainNum]++;
          return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(folgezettelGroups)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([key, count]) => ({
            range: `${key}.*`,
            name: `Main Sequence ${key}`,
            description: `Cards in main sequence ${key} and sub-sequences`,
            color: (parseInt(key) % 10) * 100,
            count
          }));
      
      case "thematic":
        // Group by theme prefix (before hyphen)
        const thematicGroups = cards.reduce((acc, card) => {
          const number = card.number || 'MISC-001';
          const theme = number.split('-')[0] || 'MISC';
          if (!acc[theme]) acc[theme] = 0;
          acc[theme]++;
          return acc;
        }, {} as Record<string, number>);
        
        return Object.entries(thematicGroups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, count]) => ({
            range: `${key}-*`,
            name: `${key} Theme`,
            description: `Cards organized under the ${key} thematic category`,
            color: Math.abs(key.charCodeAt(0) - 65) % 10 * 100,
            count
          }));
      
      default:
        return DEWEY_CATEGORIES.map(category => ({ ...category, count: 0 }));
    }
  };
  
  const categoryCounts = getStatsForMethod();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p>Loading your knowledge...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-accent/5">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <SecurityNotice />
        {/* Header - Mobile First Design */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8 p-2 sm:p-0">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                ZettelWeave
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                Welcome back, {user?.email}
              </p>
            </div>
          </div>
          
          {/* Mobile action buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center gap-2 order-2 sm:order-1">
              <Button variant="outline" size="sm" onClick={handleExportPDF} className="hidden sm:flex">
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              
              <Button variant="outline" size="sm" onClick={handlePrint} className="hidden sm:flex">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              
              {/* Mobile compact buttons */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="sm:hidden">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handlePrint}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DeleteAllCardsDialog 
                onDeleteAll={deleteAllCards}
                cardCount={totalCards}
                isDeleting={isDeletingAll}
              />
            </div>
            
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <OrganizationMethodDialog
                currentMethod={organizationMethod}
                onMethodChange={setOrganizationMethod}
                onReorganizeCards={handleReorganizeCards}
                cardCount={totalCards}
              />
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRecommendations(!showRecommendations)}
                className="hidden sm:flex"
              >
                <Lightbulb className="h-4 w-4 mr-2" />
                AI Suggestions
              </Button>
              
              {/* Mobile AI button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRecommendations(!showRecommendations)}
                className="sm:hidden"
              >
                <Lightbulb className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled>
                    <User className="mr-2 h-4 w-4" />
                    <span className="truncate max-w-[150px]">{user?.email}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Main Content */}
          <div className={`${showRecommendations ? 'flex-1' : 'w-full'} transition-all duration-300`}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 lg:space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                {/* Mobile-first tab navigation with horizontal scroll */}
                <div className="w-full overflow-x-auto scrollbar-hide">
                  <TabsList className="inline-flex min-w-max h-auto p-1 gap-1">
                    <TabsTrigger value="cards" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm px-3 py-2 min-w-fit">
                      <Grid3X3 className="h-4 w-4" />
                      <span className="whitespace-nowrap">Cards ({totalCards})</span>
                    </TabsTrigger>
                    <TabsTrigger value="graph" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm px-3 py-2 min-w-fit">
                      <Bot className="h-4 w-4" />
                      <span className="whitespace-nowrap">Graph</span>
                    </TabsTrigger>
                    <TabsTrigger value="stats" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm px-3 py-2 min-w-fit">
                      <BarChart3 className="h-4 w-4" />
                      <span className="whitespace-nowrap">Stats</span>
                    </TabsTrigger>
                    <TabsTrigger value="scratch" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm px-3 py-2 min-w-fit">
                      <FileText className="h-4 w-4" />
                      <span className="whitespace-nowrap">Scratch</span>
                    </TabsTrigger>
                    <TabsTrigger value="journal" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm px-3 py-2 min-w-fit">
                      <Lightbulb className="h-4 w-4" />
                      <span className="whitespace-nowrap">Journal</span>
                    </TabsTrigger>
                    <TabsTrigger value="whiteboard" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm px-3 py-2 min-w-fit">
                      <Palette className="h-4 w-4" />
                      <span className="whitespace-nowrap">Whiteboard</span>
                    </TabsTrigger>
                    <TabsTrigger value="sticky" className="flex flex-col sm:flex-row items-center gap-1 text-xs sm:text-sm px-3 py-2 min-w-fit">
                      <StickyNote className="h-4 w-4" />
                      <span className="whitespace-nowrap">Sticky</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex gap-2">
                  <CreateCardDialog existingCards={cards} onCreateCard={handleCreateCard} />
                  <ImportDialog existingCards={cards} onImportCards={handleImportCards} />
                </div>
              </div>

              <TabsContent value="cards" className="space-y-6">
                <SearchBar cards={cards} onSearchResults={setFilteredCards} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {filteredCards.map((card) => (
                    <ZettelCard
                      key={card.id}
                      card={card}
                      onEdit={setEditingCard}
                      onDelete={handleDeleteCard}
                      onUpdate={handleUpdateCard}
                      onWordHover={handleWordHover}
                    />
                  ))}
                </div>

                {filteredCards.length === 0 && (
                  <div className="text-center py-12">
                    <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No cards found</h3>
                    <p className="text-muted-foreground mb-4">
                      {cards.length === 0 
                        ? "Start building your knowledge base by creating your first card."
                        : "Try adjusting your search or filters."
                      }
                    </p>
                    {cards.length === 0 && (
                      <CreateCardDialog 
                        existingCards={cards} 
                        onCreateCard={handleCreateCard}
                        trigger={
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Card
                          </Button>
                        }
                      />
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="graph">
                <GraphView cards={filteredCards} />
              </TabsContent>

              <TabsContent value="stats" className="space-y-4 lg:space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl lg:text-2xl font-bold text-foreground">Statistics</h2>
                    <p className="text-sm text-muted-foreground">
                      Organized by {ORGANIZATION_METHODS.find(m => m.id === organizationMethod)?.name} method
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl lg:text-3xl font-bold text-primary">{totalCards}</p>
                    <p className="text-xs lg:text-sm text-muted-foreground">Total Cards</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                  {categoryCounts.map((category, index) => (
                    <div
                      key={category.range || index}
                      className="group p-4 lg:p-6 rounded-xl bg-gradient-to-br from-card to-card/80 border border-border/50 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all duration-300 hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-xs lg:text-sm text-muted-foreground truncate flex-1 mr-2">
                          {category.range}
                        </h3>
                        <div
                          className="w-3 h-3 lg:w-4 lg:h-4 rounded-full ring-2 ring-background group-hover:ring-primary/30 transition-all"
                          style={{ backgroundColor: `hsl(var(--category-${category.color}))` }}
                        />
                      </div>
                      <div className="space-y-1 lg:space-y-2">
                        <h4 className="font-semibold text-sm lg:text-base text-foreground line-clamp-2">{category.name}</h4>
                        <p className="text-xl lg:text-2xl font-bold text-primary group-hover:text-primary/80 transition-colors">{category.count}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{category.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                {categoryCounts.length === 0 && (
                  <div className="text-center py-12">
                    <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No statistics available</h3>
                    <p className="text-muted-foreground">
                      Create some cards to see statistics for your {ORGANIZATION_METHODS.find(m => m.id === organizationMethod)?.name} organization.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="scratch">
                <ScratchPad onCreateCard={handleCreateCard} />
              </TabsContent>

              <TabsContent value="journal">
                <BulletJournal onCreateCard={handleCreateCard} />
              </TabsContent>

              <TabsContent value="whiteboard">
                <InfiniteWhiteboard onCreateCard={handleCreateCard} />
              </TabsContent>

              <TabsContent value="sticky">
                <StickyNotesEnhanced onCreateCard={handleCreateCard} />
              </TabsContent>
            </Tabs>
          </div>

          {/* Recommendation Sidebar */}
          {showRecommendations && (
            <RecommendationSidebar
              existingCards={cards}
              onAddCards={addRecommendedCards}
              isOpen={showRecommendations}
              onClose={() => setShowRecommendations(false)}
            />
          )}
        </div>

        {/* Word Definition Popover */}
        {selectedWord && (
          <WordDefinitionPopover
            word={selectedWord.word}
            position={selectedWord.position}
            onClose={() => setSelectedWord(null)}
            onCreateCard={handleCreateCardFromWord}
            cards={cards}
          />
        )}
        
        {editingCard && (
          <EditCardDialog
            card={editingCard}
            isOpen={!!editingCard}
            onClose={() => setEditingCard(null)}
            onSave={handleUpdateCard}
            organizationMethod={organizationMethod}
            availableCategories={cards.map(c => c.category).filter((v, i, a) => a.indexOf(v) === i)}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
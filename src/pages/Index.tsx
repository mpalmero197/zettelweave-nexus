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
import { StickyNotes } from "@/components/StickyNotes";
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const Index = () => {
  const { user, signOut } = useAuth();
  const { cards, isLoading, createCard, updateCard, deleteCard, deleteAllCards, isDeletingAll } = useZettelCards();
  const { theme, setTheme } = useTheme();
  
  const [filteredCards, setFilteredCards] = useState<ZettelCardType[]>([]);
  const [selectedWord, setSelectedWord] = useState<{ word: string; position: { x: number; y: number } } | null>(null);
  const [activeTab, setActiveTab] = useState("cards");
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [organizationMethod, setOrganizationMethod] = useState<OrganizationMethod>("dewey");

  useEffect(() => {
    setFilteredCards(cards);
  }, [cards]);

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
    exportToPDF(filteredCards, "My Zettel Cards");
  };

  const handlePrint = () => {
    printCards(filteredCards);
  };

  // Calculate statistics
  const totalCards = cards.length;
  const categoryCounts = DEWEY_CATEGORIES.map(category => ({
    ...category,
    count: cards.filter(card => {
      const categoryStart = parseInt(category.range.split('-')[0]);
      const categoryEnd = parseInt(category.range.split('-')[1]);
      const cardCategory = parseInt(card.category);
      return cardCategory >= categoryStart && cardCategory <= categoryEnd;
    }).length
  }));

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
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                ZettelWeave
              </h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            
            <DeleteAllCardsDialog 
              onDeleteAll={deleteAllCards}
              cardCount={totalCards}
              isDeleting={isDeletingAll}
            />
            
            <OrganizationMethodDialog
              currentMethod={organizationMethod}
              onMethodChange={setOrganizationMethod}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRecommendations(!showRecommendations)}
            >
              <Lightbulb className="h-4 w-4 mr-2" />
              AI Suggestions
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
                  {user?.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <div className="flex gap-6">
          {/* Main Content */}
          <div className={`${showRecommendations ? 'flex-1' : 'w-full'} transition-all duration-300`}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <div className="flex items-center justify-between">
                <TabsList className="grid w-auto grid-cols-7 lg:grid-cols-7">
                  <TabsTrigger value="cards" className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Cards ({totalCards})
                  </TabsTrigger>
                  <TabsTrigger value="graph" className="flex items-center gap-2">
                    <Bot className="h-4 w-4" />
                    Graph
                  </TabsTrigger>
                  <TabsTrigger value="stats" className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Stats
                  </TabsTrigger>
                  <TabsTrigger value="scratch" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Scratch
                  </TabsTrigger>
                  <TabsTrigger value="journal" className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Journal
                  </TabsTrigger>
                  <TabsTrigger value="whiteboard" className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Board
                  </TabsTrigger>
                  <TabsTrigger value="sticky" className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Sticky
                  </TabsTrigger>
                </TabsList>

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
                      onEdit={handleUpdateCard}
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

              <TabsContent value="stats" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryCounts.map((category) => (
                    <div
                      key={category.range}
                      className="p-6 rounded-xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-sm text-muted-foreground">
                          {category.range}
                        </h3>
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: `hsl(var(--category-${category.color}))` }}
                        />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground">{category.name}</h4>
                        <p className="text-2xl font-bold text-primary">{category.count}</p>
                        <p className="text-xs text-muted-foreground">{category.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
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
                <StickyNotes onCreateCard={handleCreateCard} />
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
          />
        )}
      </div>
    </div>
  );
};

export default Index;
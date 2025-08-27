import { useState, useEffect } from "react";
import { ZettelCard as ZettelCardType, WordDefinition } from "@/types/zettel";
import { ZettelCard } from "@/components/ZettelCard";
import { CreateCardDialog } from "@/components/CreateCardDialog";
import { WordDefinitionPopover } from "@/components/WordDefinitionPopover";
import { SearchBar } from "@/components/SearchBar";
import { GraphView } from "@/components/GraphView";
import { ImportDialog } from "@/components/ImportDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Grid3X3, Network, Plus, BookOpen, BarChart3, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { generateZettelNumber, categorizeContent, extractKeywords } from "@/utils/deweySystem";

const Index = () => {
  const { theme, setTheme } = useTheme();
  const [cards, setCards] = useState<ZettelCardType[]>([]);
  const [filteredCards, setFilteredCards] = useState<ZettelCardType[]>([]);
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    position: { x: number; y: number };
  } | null>(null);
  const [activeTab, setActiveTab] = useState("cards");

  // Initialize with some sample cards
  useEffect(() => {
    const sampleCards: ZettelCardType[] = [
      {
        id: "1",
        number: "000.1",
        title: "Knowledge Management Systems",
        content: "Knowledge management systems are designed to capture, store, and organize information in a way that makes it easily retrievable and useful. The Zettelkasten method, originated by sociologist Niklas Luhmann, represents one of the most effective approaches to personal knowledge management.",
        description: "Overview of knowledge management systems and the Zettelkasten method",
        tags: ["knowledge", "systems", "zettelkasten", "information"],
        category: "000",
        created: new Date("2024-01-15"),
        modified: new Date("2024-01-15"),
        linkedCards: ["2"],
        author: "System"
      },
      {
        id: "2", 
        number: "100.1",
        title: "The Philosophy of Note-Taking",
        content: "Note-taking is not merely about recording information, but about creating a dialogue with ideas. When we write notes, we engage in a process of thinking that transforms raw information into knowledge. This process involves selection, interpretation, and connection-making.",
        description: "Exploring the philosophical foundations of effective note-taking",
        tags: ["philosophy", "note-taking", "thinking", "learning"],
        category: "100",
        created: new Date("2024-01-16"),
        modified: new Date("2024-01-16"),
        linkedCards: ["1", "3"],
        author: "System"
      },
      {
        id: "3",
        number: "300.1", 
        title: "Information Society and Digital Learning",
        content: "We live in an information society where the ability to process, synthesize, and create knowledge from vast amounts of data has become crucial. Digital tools enable new forms of learning and knowledge creation, but they also require new literacies and approaches to information management.",
        description: "The impact of digitalization on learning and knowledge work",
        tags: ["digital", "society", "learning", "technology"],
        category: "300",
        created: new Date("2024-01-17"),
        modified: new Date("2024-01-17"),
        linkedCards: ["1", "2"],
        author: "System"
      }
    ];
    
    setCards(sampleCards);
    setFilteredCards(sampleCards);
  }, []);

  const handleCreateCard = (cardData: Omit<ZettelCardType, 'id' | 'created' | 'modified'>) => {
    const newCard: ZettelCardType = {
      ...cardData,
      id: Date.now().toString(),
      created: new Date(),
      modified: new Date()
    };
    
    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
    setFilteredCards(updatedCards);
  };

  const handleImportCards = (importedCards: Omit<ZettelCardType, 'id' | 'created' | 'modified'>[]) => {
    const newCards = importedCards.map(cardData => ({
      ...cardData,
      id: Date.now().toString() + Math.random().toString(),
      created: new Date(),
      modified: new Date()
    }));
    
    const updatedCards = [...cards, ...newCards];
    setCards(updatedCards);
    setFilteredCards(updatedCards);
  };

  const handleWordHover = (word: string, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setSelectedWord({
      word,
      position: { x: rect.left, y: rect.bottom }
    });
  };

  const handleCreateCardFromWord = (word: string, definition: WordDefinition) => {
    const category = categorizeContent(definition.definition, word);
    const number = generateZettelNumber(category, cards.map(c => c.number));
    const tags = extractKeywords(word + " " + definition.definition);
    
    const newCard: ZettelCardType = {
      id: Date.now().toString(),
      number,
      title: word.charAt(0).toUpperCase() + word.slice(1),
      content: `**Definition**: ${definition.definition}\n\n**Part of Speech**: ${definition.partOfSpeech}${definition.examples ? `\n\n**Examples**:\n${definition.examples.map(ex => `- ${ex}`).join('\n')}` : ''}`,
      description: definition.definition,
      tags: [definition.partOfSpeech, ...tags],
      category,
      created: new Date(),
      modified: new Date(),
      linkedCards: [],
      author: "Dictionary"
    };
    
    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
    setFilteredCards(updatedCards);
  };

  const getCategoryStats = () => {
    const stats: Record<string, number> = {};
    cards.forEach(card => {
      const mainCategory = card.category.substring(0, 1) + "00";
      stats[mainCategory] = (stats[mainCategory] || 0) + 1;
    });
    return stats;
  };

  const categoryStats = getCategoryStats();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-primary rounded-lg">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  ZettelWeave Nexus
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Intelligent knowledge management system
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="h-8 w-8 sm:h-9 sm:w-9"
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
              <ImportDialog 
                existingCards={cards}
                onImportCards={handleImportCards}
              />
              <CreateCardDialog 
                existingCards={cards}
                onCreateCard={handleCreateCard}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList className="grid w-full sm:w-fit grid-cols-3 bg-muted">
              <TabsTrigger value="cards" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Grid3X3 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">{cards.length}</span>
              </TabsTrigger>
              <TabsTrigger value="graph" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Network className="h-3 w-3 sm:h-4 sm:w-4" />
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
              </TabsTrigger>
            </TabsList>
            
            {activeTab === "cards" && (
              <SearchBar 
                cards={cards}
                onSearchResults={setFilteredCards}
                className="w-full sm:max-w-md"
              />
            )}
          </div>

          {/* Cards View */}
          <TabsContent value="cards" className="space-y-6">
            {filteredCards.length === 0 ? (
              <Card className="p-12 text-center bg-gradient-card">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No cards found</h3>
                <p className="text-muted-foreground mb-4">
                  {cards.length === 0 
                    ? "Start building your knowledge base"
                    : "Try adjusting your search"
                  }
                </p>
                <CreateCardDialog 
                  existingCards={cards}
                  onCreateCard={handleCreateCard}
                  trigger={
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create
                    </Button>
                  }
                />
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredCards.map((card) => (
                  <ZettelCard
                    key={card.id}
                    card={card}
                    onWordHover={handleWordHover}
                    className="hover:scale-[1.02] transition-transform"
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Graph View */}
          <TabsContent value="graph" className="space-y-4 sm:space-y-6">
            <Card className="h-[400px] sm:h-[600px] p-3 sm:p-6">
              <CardHeader className="px-0 pt-0 pb-2 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Network className="h-4 w-4 sm:h-5 sm:w-5" />
                  Graph
                </CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Visual connections between cards
                </p>
              </CardHeader>
              <CardContent className="px-0 pb-0 h-full">
                <GraphView cards={cards} className="h-full" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics View */}
          <TabsContent value="stats" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Cards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{cards.length}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {cards.reduce((sum, card) => sum + card.linkedCards.length, 0)}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Categories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Object.keys(categoryStats).length}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg Links
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {cards.length > 0 
                      ? (cards.reduce((sum, card) => sum + card.linkedCards.length, 0) / cards.length).toFixed(1)
                      : "0"
                    }
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Dewey Decimal distribution
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(categoryStats).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant="outline"
                          style={{ borderColor: `hsl(var(--category-${category}))` }}
                        >
                          {category}
                        </Badge>
                        <span className="text-sm">
                          {category === "000" && "Knowledge & Computer Science"}
                          {category === "100" && "Philosophy & Psychology"}
                          {category === "200" && "Religion & Theology"}
                          {category === "300" && "Social Sciences"}
                          {category === "400" && "Language & Linguistics"}
                          {category === "500" && "Pure Sciences"}
                          {category === "600" && "Applied Sciences"}
                          {category === "700" && "Arts & Recreation"}
                          {category === "800" && "Literature"}
                          {category === "900" && "History & Geography"}
                        </span>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

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
  );
};

export default Index;

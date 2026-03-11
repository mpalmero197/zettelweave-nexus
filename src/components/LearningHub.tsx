import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LearningCourses } from "@/components/learning/LearningCourses";
import { LearningBooks } from "@/components/learning/LearningBooks";
import { LearningTopicMaps } from "@/components/learning/LearningTopicMaps";
import { GraduationCap, BookOpen, Map } from "lucide-react";

export function LearningHub() {
  const [activeTab, setActiveTab] = useState("courses");

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Learning Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Discover courses, borrow books, and explore topic maps
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="courses" className="gap-1.5">
            <GraduationCap className="h-4 w-4" />
            <span className="hidden sm:inline">Courses</span>
          </TabsTrigger>
          <TabsTrigger value="books" className="gap-1.5">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Books</span>
          </TabsTrigger>
          <TabsTrigger value="topics" className="gap-1.5">
            <Map className="h-4 w-4" />
            <span className="hidden sm:inline">Topic Maps</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-4">
          <LearningCourses />
        </TabsContent>
        <TabsContent value="books" className="mt-4">
          <LearningBooks />
        </TabsContent>
        <TabsContent value="topics" className="mt-4">
          <LearningTopicMaps />
        </TabsContent>
      </Tabs>
    </div>
  );
}

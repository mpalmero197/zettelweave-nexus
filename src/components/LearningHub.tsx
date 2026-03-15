import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LearningCourses } from "@/components/learning/LearningCourses";
import { LearningBooks } from "@/components/learning/LearningBooks";
import { LearningTopicMaps } from "@/components/learning/LearningTopicMaps";
import { LearningVideos } from "@/components/learning/LearningVideos";
import { LearningExams } from "@/components/learning/LearningExams";
import { GraduationCap, BookOpen, Map, Video, ClipboardCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { value: "courses", label: "Courses", icon: GraduationCap },
  { value: "videos", label: "Videos", icon: Video },
  { value: "books", label: "Books", icon: BookOpen },
  { value: "topics", label: "Topics", icon: Map },
  { value: "exams", label: "Exams", icon: ClipboardCheck },
] as const;

export function LearningHub() {
  const [activeTab, setActiveTab] = useState("courses");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view on change
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector('[data-state="active"]') as HTMLElement;
    if (active) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [activeTab]);

  return (
    <div className="p-3 md:p-4 max-w-6xl mx-auto space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Scrollable pill-style tab bar */}
        <div
          ref={scrollRef}
          className="overflow-x-auto scrollbar-none -mx-3 px-3 md:-mx-4 md:px-4"
        >
          <TabsList className="inline-flex h-9 w-auto gap-1 bg-transparent p-0">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap",
                  "data-[state=inactive]:bg-muted data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-accent",
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="courses" className="mt-3">
          <LearningCourses />
        </TabsContent>
        <TabsContent value="videos" className="mt-3">
          <LearningVideos />
        </TabsContent>
        <TabsContent value="books" className="mt-3">
          <LearningBooks />
        </TabsContent>
        <TabsContent value="topics" className="mt-3">
          <LearningTopicMaps />
        </TabsContent>
        <TabsContent value="exams" className="mt-3">
          <LearningExams />
        </TabsContent>
      </Tabs>
    </div>
  );
}

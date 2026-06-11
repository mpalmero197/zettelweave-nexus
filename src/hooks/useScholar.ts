import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type ScholarLesson = {
  slug: string;
  module_slug: string;
  title: string;
  summary: string | null;
  written_md: string | null;
  walkthrough_json: any;
  alice_system_prompt: string | null;
  video_url: string | null;
  sort_order: number;
  version: number;
  generated_at: string | null;
};

export type ScholarModule = {
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
};

export function useScholarModules() {
  return useQuery({
    queryKey: ["scholar-modules"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("scholar_modules")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ScholarModule[];
    },
  });
}

export function useScholarLessons() {
  return useQuery({
    queryKey: ["scholar-lessons"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("scholar_lessons")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as ScholarLesson[];
    },
  });
}

export function useScholarLesson(slug: string | undefined) {
  return useQuery({
    queryKey: ["scholar-lesson", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("scholar_lessons")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data as ScholarLesson | null;
    },
  });
}

export function useScholarProgress() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scholar-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("scholar_progress")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []) as Array<{ lesson_slug: string; status: string; formats_completed: string[]; score: number | null; completed_at: string | null }>;
    },
  });
}

export function useScholarPoints() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["scholar-points", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("scholar_points")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      return (data as { total: number; breakdown: Record<string, number> } | null) ?? { total: 0, breakdown: {} };
    },
  });
}

export function useMarkFormatComplete() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonSlug, format }: { lessonSlug: string; format: string }) => {
      if (!user) throw new Error("Not authenticated");
      // Fetch existing progress
      const { data: existing } = await (supabase as any)
        .from("scholar_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("lesson_slug", lessonSlug)
        .maybeSingle();

      const formats = new Set<string>(existing?.formats_completed ?? []);
      const isNewFormat = !formats.has(format);
      formats.add(format);

      const status = formats.size >= 1 ? "completed" : "in_progress";
      await (supabase as any).from("scholar_progress").upsert({
        user_id: user.id,
        lesson_slug: lessonSlug,
        status,
        formats_completed: Array.from(formats),
        completed_at: status === "completed" ? new Date().toISOString() : null,
      });

      if (isNewFormat) {
        // Award 10 points per format
        const { data: pts } = await (supabase as any)
          .from("scholar_points")
          .select("total, breakdown")
          .eq("user_id", user.id)
          .maybeSingle();
        const total = (pts?.total ?? 0) + 10;
        const breakdown = { ...(pts?.breakdown ?? {}), [`${lessonSlug}:${format}`]: 10 };
        await (supabase as any).from("scholar_points").upsert({
          user_id: user.id,
          total,
          breakdown,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scholar-progress"] });
      qc.invalidateQueries({ queryKey: ["scholar-points"] });
    },
  });
}

export function scholarRank(points: number): string {
  if (points >= 1000) return "Grand Pendragon";
  if (points >= 500) return "Loremaster";
  if (points >= 250) return "Adept";
  if (points >= 100) return "Scribe";
  return "Apprentice";
}

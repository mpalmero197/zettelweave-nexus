import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query) throw new Error("query is required");

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY not configured");

    // Scrape Class Central search results page
    const searchUrl = `https://www.classcentral.com/search?q=${encodeURIComponent(query)}`;
    console.log("Scraping Class Central:", searchUrl);

    const scrapeResponse = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: searchUrl,
        formats: ["markdown", "links"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (!scrapeResponse.ok) {
      const status = scrapeResponse.status;
      const text = await scrapeResponse.text();
      console.error("Firecrawl error:", status, text);
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Firecrawl credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Firecrawl error: ${status}`);
    }

    const scrapeData = await scrapeResponse.json();
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";
    const links = scrapeData.data?.links || scrapeData.links || [];

    // Parse courses from the scraped markdown
    // Class Central search results typically show course cards with title, provider, ratings, etc.
    const courses = parseClassCentralResults(markdown, links);

    return new Response(JSON.stringify({ courses }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("search-courses error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

interface ParsedCourse {
  title: string;
  provider: string;
  university?: string;
  url: string;
  description: string;
  difficulty: string;
  duration: string;
  is_free: boolean;
  rating?: number;
  syllabus: string[];
  learner_count?: string;
}

function parseClassCentralResults(markdown: string, links: string[]): ParsedCourse[] {
  const courses: ParsedCourse[] = [];

  // Build a map of Class Central course links for URL matching
  const courseLinks = links.filter(
    (l: string) => l.includes("classcentral.com/course/") || l.includes("classcentral.com/mooc/")
  );

  // Split markdown into sections that likely represent individual courses
  // Class Central typically renders courses as blocks with headers/bold titles
  const lines = markdown.split("\n");
  let currentCourse: Partial<ParsedCourse> | null = null;
  let descBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect course title patterns: markdown headers or bold text with links
    // e.g., "### [Course Title](url)" or "**Course Title**" or "[Course Title](url)"
    const headerMatch = line.match(/^#{1,4}\s*\[([^\]]+)\]\(([^)]+)\)/);
    const linkMatch = !headerMatch && line.match(/^\[([^\]]+)\]\(([^)]+classcentral\.com\/(?:course|mooc)\/[^)]+)\)/);
    const boldMatch = !headerMatch && !linkMatch && line.match(/^\*\*([^*]{5,})\*\*/);

    if (headerMatch || linkMatch) {
      // Save previous course
      if (currentCourse?.title) {
        currentCourse.description = descBuffer.join(" ").slice(0, 300) || "No description available.";
        courses.push(finalizeCourse(currentCourse));
      }
      const [, title, url] = (headerMatch || linkMatch)!;
      currentCourse = { title: cleanTitle(title), url: makeAbsoluteUrl(url) };
      descBuffer = [];
      continue;
    }

    if (boldMatch && !currentCourse) {
      // Bold title without a link — try to find a matching course link
      const title = cleanTitle(boldMatch[1]);
      const matchingLink = courseLinks.find((l: string) =>
        l.toLowerCase().includes(title.toLowerCase().split(" ")[0].toLowerCase())
      );
      currentCourse = {
        title,
        url: matchingLink || `https://www.classcentral.com/search?q=${encodeURIComponent(title)}`,
      };
      descBuffer = [];
      continue;
    }

    if (!currentCourse) continue;

    // Extract metadata from lines after the title
    const lowerLine = line.toLowerCase();

    // Provider / university detection
    if (!currentCourse.provider && (lowerLine.includes("coursera") || lowerLine.includes("edx") ||
        lowerLine.includes("udemy") || lowerLine.includes("udacity") || lowerLine.includes("futurelearn") ||
        lowerLine.includes("khan academy") || lowerLine.includes("mit") || lowerLine.includes("stanford") ||
        lowerLine.includes("harvard") || lowerLine.includes("google") || lowerLine.includes("swayam") ||
        lowerLine.includes("skillshare") || lowerLine.includes("linkedin learning"))) {
      // Try to extract provider name
      const providerMatch = line.match(/(Coursera|edX|Udemy|Udacity|FutureLearn|Khan Academy|Swayam|Skillshare|LinkedIn Learning)/i);
      if (providerMatch) currentCourse.provider = providerMatch[1];

      const uniMatch = line.match(/(MIT|Stanford|Harvard|Google|University of [A-Za-z ]+|[A-Z][a-z]+ University)/);
      if (uniMatch) currentCourse.university = uniMatch[1];
    }

    // Rating detection
    if (!currentCourse.rating) {
      const ratingMatch = line.match(/(\d+\.?\d*)\s*(?:\/\s*5|stars?|⭐|rating)/i);
      if (ratingMatch) currentCourse.rating = parseFloat(ratingMatch[1]);
    }

    // Duration detection
    if (!currentCourse.duration) {
      const durMatch = line.match(/(\d+\s*(?:weeks?|hours?|months?))/i);
      if (durMatch) currentCourse.duration = durMatch[1];
    }

    // Difficulty detection
    if (!currentCourse.difficulty) {
      const diffMatch = line.match(/(Beginner|Intermediate|Advanced|Mixed)/i);
      if (diffMatch) currentCourse.difficulty = diffMatch[1];
    }

    // Free/paid detection
    if (lowerLine.includes("free") && !lowerLine.includes("free trial")) {
      currentCourse.is_free = true;
    }
    if (lowerLine.includes("paid") || lowerLine.includes("$")) {
      currentCourse.is_free = false;
    }

    // Learner count
    if (!currentCourse.learner_count) {
      const learnMatch = line.match(/([\d,.]+[KkMm]?)\s*(?:students?|learners?|enrolled|reviews?)/i);
      if (learnMatch) currentCourse.learner_count = learnMatch[1] + " learners";
    }

    // Collect description text (lines that look like prose, not metadata)
    if (line.length > 30 && !line.startsWith("[") && !line.startsWith("*") && !line.startsWith("#") && !line.startsWith("|")) {
      descBuffer.push(line);
    }
  }

  // Don't forget the last course
  if (currentCourse?.title) {
    currentCourse.description = descBuffer.join(" ").slice(0, 300) || "No description available.";
    courses.push(finalizeCourse(currentCourse));
  }

  // If markdown parsing yielded too few results, try a simpler link-based approach
  if (courses.length < 3 && courseLinks.length > 0) {
    for (const link of courseLinks) {
      if (courses.some(c => c.url === link)) continue;
      // Extract title from URL slug
      const slug = link.split("/").pop() || "";
      const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      if (title.length < 3) continue;
      courses.push({
        title,
        provider: "Class Central",
        url: link,
        description: "View this course on Class Central for full details.",
        difficulty: "Mixed",
        duration: "Self-paced",
        is_free: true,
        syllabus: [],
      });
      if (courses.length >= 12) break;
    }
  }

  return courses.slice(0, 15);
}

function cleanTitle(raw: string): string {
  return raw.replace(/\*\*/g, "").replace(/\[|\]/g, "").trim();
}

function makeAbsoluteUrl(url: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("/")) return `https://www.classcentral.com${url}`;
  return `https://www.classcentral.com/${url}`;
}

function finalizeCourse(partial: Partial<ParsedCourse>): ParsedCourse {
  return {
    title: partial.title || "Untitled Course",
    provider: partial.provider || "Class Central",
    university: partial.university,
    url: partial.url || "#",
    description: partial.description || "No description available.",
    difficulty: partial.difficulty || "Mixed",
    duration: partial.duration || "Self-paced",
    is_free: partial.is_free ?? true,
    rating: partial.rating,
    syllabus: partial.syllabus || [],
    learner_count: partial.learner_count,
  };
}

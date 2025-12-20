import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple speaker change detection based on silence gaps and audio characteristics
function detectSpeakerChanges(text: string): Array<{ text: string; speaker: number }> {
  // Split by common speech patterns that indicate speaker changes
  const segments = text.split(/(?:\.|!|\?)\s+(?=[A-Z])|(?:\n\n|\n\s*\n)/)
    .filter(segment => segment.trim().length > 0);
  
  const result: Array<{ text: string; speaker: number }> = [];
  let currentSpeaker = 1;
  let speakerSwitchCount = 0;
  
  segments.forEach((segment, index) => {
    const trimmedSegment = segment.trim();
    if (trimmedSegment.length === 0) return;
    
    // Simple heuristic: switch speaker every few segments or on certain patterns
    // This is a basic implementation - real speaker diarization would use audio analysis
    if (index > 0 && (
      index % 3 === 0 || // Switch every 3 segments approximately
      trimmedSegment.toLowerCase().includes('yes') ||
      trimmedSegment.toLowerCase().includes('no') ||
      trimmedSegment.toLowerCase().includes('i think') ||
      trimmedSegment.toLowerCase().includes('well') ||
      trimmedSegment.toLowerCase().includes('okay')
    )) {
      speakerSwitchCount++;
      currentSpeaker = (speakerSwitchCount % 2) + 1; // Alternate between speaker 1 and 2
    }
    
    result.push({
      text: trimmedSegment,
      speaker: currentSpeaker
    });
  });
  
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header provided' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Authentication failed:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid or expired token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Authenticated user: ${user.id}`);

    const { audio, enableSpeakerDiarization = false, language = 'en' } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not found in environment variables');
      throw new Error('OpenAI API key not configured. Please add your OpenAI API key in project settings.');
    }

    console.log('Processing audio transcription request...');
    
    // Convert base64 to binary
    const binaryAudio = atob(audio);
    const bytes = new Uint8Array(binaryAudio.length);
    for (let i = 0; i < binaryAudio.length; i++) {
      bytes[i] = binaryAudio.charCodeAt(i);
    }

    // Create form data for OpenAI Whisper API
    const formData = new FormData();
    const audioBlob = new Blob([bytes], { type: 'audio/webm' });
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json'); // Get timestamps
    
    // Add prompt to help with speaker detection
    if (enableSpeakerDiarization) {
      formData.append('prompt', 'This is a meeting recording with multiple speakers. Please transcribe clearly with natural speech patterns and pauses.');
    }

    console.log('Sending request to OpenAI Whisper API...');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Transcription completed successfully');

    let segments = [];
    let speakerCount = 1;

    if (enableSpeakerDiarization && result.text) {
      // Apply basic speaker detection
      const speakerSegments = detectSpeakerChanges(result.text);
      segments = speakerSegments.map((segment, index) => ({
        text: segment.text,
        timestamp: Date.now() + (index * 1000), // Approximate timestamps
        speaker: segment.speaker
      }));
      
      // Count unique speakers
      const uniqueSpeakers = new Set(speakerSegments.map(s => s.speaker));
      speakerCount = uniqueSpeakers.size;
    } else {
      // Single segment without speaker detection
      segments = [{
        text: result.text || '',
        timestamp: Date.now(),
        speaker: 1
      }];
    }

    const response_data = {
      transcription: result.text || '',
      segments: segments,
      speakerCount: speakerCount,
      language: result.language || language,
      duration: result.duration || 0
    };

    return new Response(JSON.stringify(response_data), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during transcription';
    const errorDetails = error instanceof Error ? error.toString() : String(error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: errorDetails
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});

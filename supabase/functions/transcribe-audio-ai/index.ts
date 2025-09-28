import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple speaker change detection based on text patterns
function detectSpeakerChanges(text: string): Array<{ text: string; speaker: number }> {
  const segments = text.split(/(?:\.|!|\?)\s+(?=[A-Z])|(?:\n\n|\n\s*\n)/)
    .filter(segment => segment.trim().length > 0);
  
  const result: Array<{ text: string; speaker: number }> = [];
  let currentSpeaker = 1;
  let speakerSwitchCount = 0;
  
  segments.forEach((segment, index) => {
    const trimmedSegment = segment.trim();
    if (trimmedSegment.length === 0) return;
    
    // Simple heuristic: switch speaker every few segments or on certain patterns
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
    const { audio, enableSpeakerDiarization = false, language = 'en' } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('Lovable API key not found in environment variables');
      throw new Error('Lovable AI is not configured. Please enable Lovable AI in project settings.');
    }

    console.log('Processing audio transcription request with Lovable AI...');
    
    // For now, we'll simulate transcription since Lovable AI doesn't have audio transcription yet
    // In practice, you'd need to use a different service or convert audio to text first
    const prompt = `This is an audio transcription request. The user has uploaded audio data and wants it transcribed to text. 
    ${enableSpeakerDiarization ? 'They also want speaker diarization (detecting different speakers).' : ''}
    Language: ${language}
    
    Since I can't actually process audio, please provide a helpful response explaining that audio transcription requires a specialized service like OpenAI Whisper, Google Speech-to-Text, or Azure Speech Services.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are a helpful assistant explaining audio transcription capabilities and limitations." 
          },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", errorText);
      throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const aiResponse = result.choices?.[0]?.message?.content || 'No response from AI';
    
    console.log('AI response:', aiResponse);

    // For demo purposes, return a message explaining the limitation
    const response_data = {
      transcription: "Audio transcription requires a specialized service. Current setup uses Lovable AI which doesn't support audio processing. Please configure OpenAI Whisper, Google Speech-to-Text, or Azure Speech Services for audio transcription.",
      segments: [{
        text: "Audio transcription not available with current configuration.",
        timestamp: Date.now(),
        speaker: 1
      }],
      speakerCount: 1,
      language: language,
      duration: 0,
      aiResponse: aiResponse
    };

    return new Response(JSON.stringify(response_data), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      },
    });

  } catch (error) {
    console.error('Error in transcribe-audio-ai function:', error);
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
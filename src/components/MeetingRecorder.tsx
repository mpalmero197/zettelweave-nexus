import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Mic, MicOff, Square, Play, Save, Users } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useZettelCards } from '@/hooks/useZettelCards';

interface TranscriptionSegment {
  text: string;
  timestamp: number;
  speaker?: number;
}

function MeetingRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [speakerCount, setSpeakerCount] = useState(1);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();
  const { createCard } = useZettelCards();

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        }
      });

      streamRef.current = stream;

      // Set up audio level monitoring
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Monitor audio levels
      audioLevelIntervalRef.current = setInterval(() => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
          setAudioLevel(average);
        }
      }, 100);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        await processRecording();
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast({
        title: "Recording started",
        description: "Your meeting is being recorded and will be transcribed automatically."
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording failed",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (audioLevelIntervalRef.current) {
        clearInterval(audioLevelIntervalRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      setAudioLevel(0);
    }
  };

  const pauseResumeRecording = () => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        if (recordingIntervalRef.current) {
          recordingIntervalRef.current = setInterval(() => {
            setRecordingTime(prev => prev + 1);
          }, 1000);
        }
      } else {
        mediaRecorderRef.current.pause();
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const base64Data = base64Audio.split(',')[1];

        try {
          const { data, error } = await supabase.functions.invoke('transcribe-audio', {
            body: { 
              audio: base64Data,
              enableSpeakerDiarization: true,
              language: 'en'
            }
          });

          if (error) throw error;

          if (data.transcription) {
            const segments: TranscriptionSegment[] = data.segments || [
              {
                text: data.transcription,
                timestamp: Date.now(),
                speaker: 1
              }
            ];
            
            setTranscription(segments);
            setSpeakerCount(data.speakerCount || 1);
            
            toast({
              title: "Transcription complete",
              description: `Successfully transcribed ${formatTime(recordingTime)} of audio${data.speakerCount > 1 ? ` with ${data.speakerCount} speakers detected` : ''}.`
            });
          }
        } catch (transcriptionError) {
          console.error('Transcription error:', transcriptionError);
          toast({
            title: "Transcription failed",
            description: "Unable to transcribe audio. Please try again.",
            variant: "destructive"
          });
        }
      };
    } catch (error) {
      console.error('Error processing recording:', error);
      toast({
        title: "Processing failed",
        description: "Unable to process recording.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const saveAsCard = () => {
    if (transcription.length === 0) return;

    const meetingDate = new Date().toLocaleDateString();
    const meetingTime = new Date().toLocaleTimeString();
    
    let content = `# Meeting Recording - ${meetingDate} at ${meetingTime}\n\n`;
    content += `**Duration:** ${formatTime(recordingTime)}\n`;
    content += `**Speakers:** ${speakerCount}\n\n`;
    content += `---\n\n## Transcription\n\n`;

    if (speakerCount > 1) {
      // Group by speaker
      transcription.forEach((segment, index) => {
        content += `**Speaker ${segment.speaker || 1}:** ${segment.text}\n\n`;
      });
    } else {
      // Single speaker or no speaker detection
      content += transcription.map(segment => segment.text).join('\n\n');
    }

    createCard({
      number: '', // Will be auto-generated
      title: `Meeting Notes - ${meetingDate}`,
      description: `Transcribed meeting from ${meetingDate} at ${meetingTime}`,
      content: content,
      category: '000', // Will be auto-categorized
      tags: ['meeting', 'transcription', 'audio'],
      linkedCards: [],
    });

    // Clear the current transcription
    setTranscription([]);
    setRecordingTime(0);
    setSpeakerCount(1);

    toast({
      title: "Meeting saved",
      description: "Meeting transcription has been saved as a new card."
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto bg-card/80 backdrop-blur-sm border border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Meeting Recorder
          {speakerCount > 1 && (
            <Badge variant="secondary" className="ml-auto">
              <Users className="h-3 w-3 mr-1" />
              {speakerCount} speakers
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recording Controls */}
        <div className="flex items-center justify-center gap-4">
          {!isRecording ? (
            <Button 
              onClick={startRecording}
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              <Mic className="h-5 w-5 mr-2" />
              Start Recording
            </Button>
          ) : (
            <>
              <Button 
                onClick={pauseResumeRecording}
                variant="outline"
                size="lg"
              >
                {isPaused ? <Play className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button 
                onClick={stopRecording}
                variant="destructive"
                size="lg"
              >
                <Square className="h-5 w-5 mr-2" />
                Stop
              </Button>
            </>
          )}
        </div>

        {/* Recording Status */}
        {isRecording && (
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-red-500">
                {formatTime(recordingTime)}
              </div>
              <div className="text-sm text-muted-foreground">
                {isPaused ? 'Paused' : 'Recording...'}
              </div>
            </div>
            
            {/* Audio Level Indicator */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Audio Level</div>
              <Progress value={Math.min(audioLevel, 100)} className="h-2" />
            </div>
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="text-center space-y-2">
            <div className="text-sm text-muted-foreground">Processing recording...</div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* Transcription Display */}
        {transcription.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Transcription</h3>
              <Button onClick={saveAsCard} className="bg-primary hover:bg-primary/90">
                <Save className="h-4 w-4 mr-2" />
                Save as Card
              </Button>
            </div>
            
            <div className="max-h-60 overflow-y-auto space-y-3 p-4 bg-muted/50 rounded-lg">
              {transcription.map((segment, index) => (
                <div key={index} className="space-y-1">
                  {speakerCount > 1 && (
                    <div className="text-xs font-medium text-primary">
                      Speaker {segment.speaker || 1}
                    </div>
                  )}
                  <div className="text-sm leading-relaxed">
                    {segment.text}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        {!isRecording && transcription.length === 0 && (
          <div className="text-center text-muted-foreground text-sm space-y-2">
            <p>Click "Start Recording" to begin capturing your meeting.</p>
            <p>The audio will be automatically transcribed with speaker detection.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MeetingRecorder;
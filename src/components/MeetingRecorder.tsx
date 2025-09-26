import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Mic, 
  MicOff, 
  Square, 
  Play, 
  Pause,
  Save, 
  Users, 
  Scissors, 
  Download,
  FileAudio,
  Paperclip,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useZettelCards } from '@/hooks/useZettelCards';
import { useAuth } from '@/hooks/useAuth';

interface TranscriptionSegment {
  text: string;
  timestamp: number;
  speaker?: number;
}

interface AudioSnippet {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  transcription: string;
  audioUrl?: string;
}

interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  mimeType: string;
  duration?: number;
  createdAt: string;
}

function MeetingRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcription, setTranscription] = useState<TranscriptionSegment[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [speakerCount, setSpeakerCount] = useState(1);
  const [audioSnippets, setAudioSnippets] = useState<AudioSnippet[]>([]);
  const [isCreatingSnippet, setIsCreatingSnippet] = useState(false);
  const [snippetDialog, setSnippetDialog] = useState<{
    open: boolean;
    startTime: number;
    endTime: number;
  }>({ open: false, startTime: 0, endTime: 0 });
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioLevelIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  
  const { toast } = useToast();
  const { createCard } = useZettelCards();
  const { user } = useAuth();

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

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

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
      
      // Create URL for playback
      const audioUrl = URL.createObjectURL(audioBlob);
      setRecordedAudioUrl(audioUrl);
      
      // Save the full recording to storage
      await saveFullRecording(audioBlob);
      
      // Convert to base64 for transcription
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

  const saveFullRecording = async (audioBlob: Blob) => {
    if (!user) return;

    try {
      const fileName = `meeting-${Date.now()}.webm`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('meeting-recordings')
        .upload(filePath, audioBlob);

      if (uploadError) throw uploadError;

      // Save to attachments table
      const { error: dbError } = await supabase
        .from('attachments')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_type: 'audio',
          file_size: audioBlob.size,
          storage_path: filePath,
          mime_type: 'audio/webm',
          duration: recordingTime
        });

      if (dbError) throw dbError;

    } catch (error) {
      console.error('Error saving recording:', error);
    }
  };

  const createAudioSnippet = async (startTime: number, endTime: number, name: string, description: string) => {
    if (!recordedAudioUrl || !user) return;

    setIsCreatingSnippet(true);
    
    try {
      // Create audio context to slice the audio
      const audioContext = new AudioContext();
      const response = await fetch(recordedAudioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);
      const snippetLength = endSample - startSample;
      
      // Create new buffer for the snippet
      const snippetBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        snippetLength,
        sampleRate
      );
      
      // Copy audio data for the snippet
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const snippetChannelData = snippetBuffer.getChannelData(channel);
        for (let i = 0; i < snippetLength; i++) {
          snippetChannelData[i] = channelData[startSample + i];
        }
      }
      
      // Convert buffer to WAV blob (simplified - in production would use proper WAV encoding)
      const length = snippetBuffer.length * snippetBuffer.numberOfChannels * 2;
      const wavArrayBuffer = new ArrayBuffer(44 + length);
      const view = new DataView(wavArrayBuffer);
      
      // Simple WAV header (44 bytes)
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + length, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, snippetBuffer.numberOfChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * snippetBuffer.numberOfChannels * 2, true);
      view.setUint16(32, snippetBuffer.numberOfChannels * 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, length, true);
      
      // Convert float samples to 16-bit PCM
      let offset = 44;
      for (let channel = 0; channel < snippetBuffer.numberOfChannels; channel++) {
        const channelData = snippetBuffer.getChannelData(channel);
        for (let i = 0; i < channelData.length; i++) {
          const sample = Math.max(-1, Math.min(1, channelData[i]));
          const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
          view.setInt16(offset, intSample, true);
          offset += 2;
        }
      }
      
      const snippetBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
      
      // Upload to storage
      const fileName = `snippet-${Date.now()}.wav`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-snippets')
        .upload(filePath, snippetBlob);

      if (uploadError) throw uploadError;

      // Save to attachments table
      const { data: attachment, error: dbError } = await supabase
        .from('attachments')
        .insert({
          user_id: user.id,
          file_name: fileName,
          file_type: 'audio',
          file_size: snippetBlob.size,
          storage_path: filePath,
          mime_type: 'audio/wav',
          duration: endTime - startTime
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Add to local snippets
      const newSnippet: AudioSnippet = {
        id: attachment.id,
        name,
        startTime,
        endTime,
        transcription: getSnippetTranscription(startTime, endTime),
        audioUrl: URL.createObjectURL(snippetBlob)
      };

      setAudioSnippets(prev => [...prev, newSnippet]);
      setSnippetDialog({ open: false, startTime: 0, endTime: 0 });

      toast({
        title: "Audio snippet created",
        description: `"${name}" has been saved and can now be attached to notes or cards.`
      });

    } catch (error) {
      console.error('Error creating snippet:', error);
      toast({
        title: "Failed to create snippet",
        description: "Unable to create audio snippet. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingSnippet(false);
    }
  };

  const getSnippetTranscription = (startTime: number, endTime: number): string => {
    return transcription
      .filter(segment => {
        const segmentTime = (segment.timestamp - transcription[0]?.timestamp || 0) / 1000;
        return segmentTime >= startTime && segmentTime <= endTime;
      })
      .map(segment => segment.text)
      .join(' ');
  };

  const attachToCard = async (snippetId: string) => {
    // This would open a dialog to select which card to attach to
    toast({
      title: "Feature coming soon",
      description: "Card attachment functionality will be available shortly."
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
      transcription.forEach((segment, index) => {
        content += `**Speaker ${segment.speaker || 1}:** ${segment.text}\n\n`;
      });
    } else {
      content += transcription.map(segment => segment.text).join('\n\n');
    }

    createCard({
      number: '',
      title: `Meeting Notes - ${meetingDate}`,
      description: `Transcribed meeting from ${meetingDate} at ${meetingTime}`,
      content: content,
      category: '000',
      tags: ['meeting', 'transcription', 'audio'],
      linkedCards: [],
    });

    setTranscription([]);
    setRecordingTime(0);
    setSpeakerCount(1);

    toast({
      title: "Meeting saved",
      description: "Meeting transcription has been saved as a new card."
    });
  };

  return (
    <div className="space-y-6">
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
                  {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
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

          {/* Audio Playback */}
          {recordedAudioUrl && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recording Playback</h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <audio 
                  ref={audioElementRef}
                  controls 
                  src={recordedAudioUrl}
                  className="w-full"
                  onTimeUpdate={(e) => {
                    // Could be used for real-time snippet selection
                  }}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSnippetDialog({
                      open: true,
                      startTime: 0,
                      endTime: Math.min(30, recordingTime)
                    })}
                  >
                    <Scissors className="h-4 w-4 mr-2" />
                    Create Snippet
                  </Button>
                </div>
              </div>
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
              <p>You can create snippets from the recording to attach to notes and cards.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio Snippets */}
      {audioSnippets.length > 0 && (
        <Card className="w-full max-w-2xl mx-auto bg-card/80 backdrop-blur-sm border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileAudio className="h-5 w-5" />
              Audio Snippets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {audioSnippets.map((snippet) => (
                <div key={snippet.id} className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{snippet.name}</h4>
                    <Badge variant="outline">
                      {formatTime(snippet.endTime - snippet.startTime)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {snippet.transcription}
                  </p>
                  {snippet.audioUrl && (
                    <audio controls src={snippet.audioUrl} className="w-full" />
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => attachToCard(snippet.id)}
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attach to Card
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                    >
                      <Paperclip className="h-4 w-4 mr-2" />
                      Attach to Note
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Snippet Creation Dialog */}
      <Dialog open={snippetDialog.open} onOpenChange={(open) => 
        setSnippetDialog(prev => ({ ...prev, open }))
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Audio Snippet</DialogTitle>
          </DialogHeader>
          <SnippetForm
            startTime={snippetDialog.startTime}
            endTime={snippetDialog.endTime}
            maxDuration={recordingTime}
            onSave={createAudioSnippet}
            isCreating={isCreatingSnippet}
            onCancel={() => setSnippetDialog({ open: false, startTime: 0, endTime: 0 })}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SnippetFormProps {
  startTime: number;
  endTime: number;
  maxDuration: number;
  onSave: (startTime: number, endTime: number, name: string, description: string) => void;
  isCreating: boolean;
  onCancel: () => void;
}

function SnippetForm({ 
  startTime, 
  endTime, 
  maxDuration, 
  onSave, 
  isCreating, 
  onCancel 
}: SnippetFormProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);

  const formatTimeInput = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTimeInput = (timeStr: string) => {
    const [mins, secs] = timeStr.split(':').map(Number);
    return (mins || 0) * 60 + (secs || 0);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(start, end, name, description);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="snippet-name">Snippet Name</Label>
        <Input
          id="snippet-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Important Quote, Action Items"
        />
      </div>
      
      <div>
        <Label htmlFor="snippet-description">Description (optional)</Label>
        <Textarea
          id="snippet-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of this audio snippet"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start-time">Start Time (mm:ss)</Label>
          <Input
            id="start-time"
            value={formatTimeInput(start)}
            onChange={(e) => {
              const newStart = parseTimeInput(e.target.value);
              if (newStart >= 0 && newStart < end) {
                setStart(newStart);
              }
            }}
          />
        </div>
        <div>
          <Label htmlFor="end-time">End Time (mm:ss)</Label>
          <Input
            id="end-time"
            value={formatTimeInput(end)}
            onChange={(e) => {
              const newEnd = parseTimeInput(e.target.value);
              if (newEnd > start && newEnd <= maxDuration) {
                setEnd(newEnd);
              }
            }}
          />
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Duration: {formatTimeInput(end - start)}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave} 
          disabled={!name.trim() || isCreating}
        >
          {isCreating ? 'Creating...' : 'Create Snippet'}
        </Button>
      </div>
    </div>
  );
}

export default MeetingRecorder;
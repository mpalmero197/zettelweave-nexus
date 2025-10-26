import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Video, 
  Monitor, 
  Mic, 
  Square, 
  Circle,
  Download,
  Upload,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type RecordingMode = 'audio' | 'video' | 'screen' | 'screen_with_audio';

export function MediaRecorder() {
  const { user } = useAuth();
  const [mode, setMode] = useState<RecordingMode>('audio');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTitle, setRecordingTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      let stream: MediaStream;

      switch (mode) {
        case 'audio':
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          break;
        
        case 'video':
          stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 1920, height: 1080 }, 
            audio: true 
          });
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
          }
          break;
        
        case 'screen':
          stream = await (navigator.mediaDevices as any).getDisplayMedia({ 
            video: { width: 1920, height: 1080 } 
          });
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
          }
          break;
        
        case 'screen_with_audio':
          const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ 
            video: { width: 1920, height: 1080 } 
          });
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream = new MediaStream();
          screenStream.getVideoTracks().forEach((track: MediaStreamTrack) => stream.addTrack(track));
          audioStream.getAudioTracks().forEach((track: MediaStreamTrack) => stream.addTrack(track));
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
          }
          break;
        
        default:
          throw new Error('Invalid recording mode');
      }

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new (window as any).MediaRecorder(stream, {
        mimeType: mode === 'audio' ? 'audio/webm' : 'video/webm'
      }) as MediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { 
          type: mode === 'audio' ? 'audio/webm' : 'video/webm' 
        });
        setRecordedBlob(blob);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorder.start(1000); // Capture data every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success(`${mode} recording started`);
    } catch (error: any) {
      console.error('Error starting recording:', error);
      toast.error(`Failed to start recording: ${error.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        if (timerRef.current) {
          timerRef.current = window.setInterval(() => {
            setRecordingTime(prev => prev + 1);
          }, 1000);
        }
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }
  };

  const uploadToCloud = async () => {
    if (!recordedBlob || !user) return;

    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}-${mode}.webm`;
      const bucket = mode === 'audio' ? 'audio-snippets' : 
                    mode === 'video' ? 'video-recordings' : 
                    'screen-recordings';

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, recordedBlob);

      if (uploadError) throw uploadError;

      // Save metadata to database
      const { error: dbError } = await supabase
        .from('recordings')
        .insert({
          user_id: user.id,
          title: recordingTitle || `${mode} Recording ${new Date().toLocaleString()}`,
          recording_type: mode,
          storage_path: `${bucket}/${fileName}`,
          duration: recordingTime,
          file_size: recordedBlob.size,
        });

      if (dbError) throw dbError;

      toast.success('Recording uploaded successfully!');
      setRecordedBlob(null);
      setRecordingTitle('');
      setRecordingTime(0);
    } catch (error: any) {
      console.error('Error uploading recording:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadToDesktop = () => {
    if (!recordedBlob) return;

    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode}-recording-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Recording downloaded!');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Recording Mode</CardTitle>
          <CardDescription>Choose what type of recording you want to create</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as RecordingMode)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="audio" className="gap-2">
                <Mic className="h-4 w-4" />
                Audio
              </TabsTrigger>
              <TabsTrigger value="video" className="gap-2">
                <Video className="h-4 w-4" />
                Video
              </TabsTrigger>
              <TabsTrigger value="screen" className="gap-2">
                <Monitor className="h-4 w-4" />
                Screen
              </TabsTrigger>
              <TabsTrigger value="screen_with_audio" className="gap-2">
                <Monitor className="h-4 w-4" />
                <Mic className="h-3 w-3" />
                Screen + Mic
              </TabsTrigger>
            </TabsList>

            <TabsContent value={mode} className="mt-6">
              <div className="space-y-4">
                {/* Video Preview */}
                {(mode === 'video' || mode === 'screen' || mode === 'screen_with_audio') && (
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      muted={mode !== 'video'}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}

                {/* Recording Controls */}
                <div className="flex items-center justify-center gap-4">
                  {!isRecording && !recordedBlob && (
                    <Button
                      size="lg"
                      onClick={startRecording}
                      className="gap-2"
                    >
                      <Circle className="h-5 w-5 fill-current" />
                      Start Recording
                    </Button>
                  )}

                  {isRecording && (
                    <>
                      <div className="text-2xl font-mono font-bold text-red-500">
                        {formatTime(recordingTime)}
                      </div>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={pauseRecording}
                        className="gap-2"
                      >
                        {isPaused ? (
                          <><Play className="h-5 w-5" /> Resume</>
                        ) : (
                          <><Pause className="h-5 w-5" /> Pause</>
                        )}
                      </Button>
                      <Button
                        size="lg"
                        variant="destructive"
                        onClick={stopRecording}
                        className="gap-2"
                      >
                        <Square className="h-5 w-5" />
                        Stop
                      </Button>
                    </>
                  )}
                </div>

                {/* Recorded Blob Actions */}
                {recordedBlob && !isRecording && (
                  <div className="space-y-4 p-4 border border-border rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="title">Recording Title</Label>
                      <Input
                        id="title"
                        value={recordingTitle}
                        onChange={(e) => setRecordingTitle(e.target.value)}
                        placeholder={`${mode} Recording ${new Date().toLocaleString()}`}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={uploadToCloud}
                        disabled={uploading}
                        className="flex-1 gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        {uploading ? 'Uploading...' : 'Save to Pendragon Cloud'}
                      </Button>
                      <Button
                        onClick={downloadToDesktop}
                        variant="outline"
                        className="flex-1 gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download to Desktop
                      </Button>
                      <Button
                        onClick={() => {
                          setRecordedBlob(null);
                          setRecordingTitle('');
                          setRecordingTime(0);
                        }}
                        variant="destructive"
                        size="icon"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Duration: {formatTime(recordingTime)} | Size: {(recordedBlob.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

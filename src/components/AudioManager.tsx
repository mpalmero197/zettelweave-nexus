import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Download, 
  Trash2, 
  Edit3, 
  Save, 
  X,
  Music,
  FileAudio,
  Clock
} from "lucide-react";
import { toast } from "sonner";

interface AudioRecording {
  id: string;
  name: string;
  notes: string;
  blob: Blob;
  duration: number;
  transcription?: string;
  createdAt: Date;
  updatedAt: Date;
}

export function AudioManager() {
  const [recordings, setRecordings] = useState<AudioRecording[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Load recordings from localStorage on mount
    const savedRecordings = localStorage.getItem('zettelweave-recordings');
    if (savedRecordings) {
      try {
        const parsed = JSON.parse(savedRecordings);
        // Convert blob data back to Blob objects
        const loadedRecordings = parsed.map((rec: any) => ({
          ...rec,
          createdAt: new Date(rec.createdAt),
          updatedAt: new Date(rec.updatedAt),
          blob: new Blob([new Uint8Array(rec.blobData)], { type: 'audio/webm' })
        }));
        setRecordings(loadedRecordings);
      } catch (error) {
        console.error('Failed to load recordings:', error);
      }
    }
  }, []);

  const saveRecordingsToStorage = (updatedRecordings: AudioRecording[]) => {
    // Convert blob to array buffer for storage
    const recordingsToSave = updatedRecordings.map(rec => ({
      ...rec,
      blobData: Array.from(new Uint8Array(rec.blob as any))
    }));
    localStorage.setItem('zettelweave-recordings', JSON.stringify(recordingsToSave));
  };

  const addRecording = (blob: Blob, transcription?: string, duration?: number) => {
    const newRecording: AudioRecording = {
      id: crypto.randomUUID(),
      name: `Recording ${recordings.length + 1}`,
      notes: "",
      blob,
      duration: duration || 0,
      transcription,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const updated = [...recordings, newRecording];
    setRecordings(updated);
    saveRecordingsToStorage(updated);
    toast.success("Recording saved to library");
  };

  const deleteRecording = (id: string) => {
    const updated = recordings.filter(r => r.id !== id);
    setRecordings(updated);
    saveRecordingsToStorage(updated);
    
    if (playingId === id) {
      currentAudio?.pause();
      setPlayingId(null);
      setCurrentAudio(null);
    }
    
    toast.success("Recording deleted");
  };

  const startEdit = (recording: AudioRecording) => {
    setEditingId(recording.id);
    setEditName(recording.name);
    setEditNotes(recording.notes);
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    const updated = recordings.map(rec => 
      rec.id === editingId 
        ? { ...rec, name: editName, notes: editNotes, updatedAt: new Date() }
        : rec
    );
    
    setRecordings(updated);
    saveRecordingsToStorage(updated);
    setEditingId(null);
    toast.success("Recording updated");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditNotes("");
  };

  const playRecording = async (recording: AudioRecording) => {
    if (playingId === recording.id) {
      // Pause current
      currentAudio?.pause();
      setPlayingId(null);
      setCurrentAudio(null);
      return;
    }

    // Stop any current audio
    if (currentAudio) {
      currentAudio.pause();
    }

    try {
      const audioUrl = URL.createObjectURL(recording.blob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setPlayingId(null);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = () => {
        toast.error("Failed to play recording");
        setPlayingId(null);
        setCurrentAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
      setPlayingId(recording.id);
      setCurrentAudio(audio);
    } catch (error) {
      toast.error("Failed to play recording");
    }
  };

  const downloadRecording = (recording: AudioRecording) => {
    const url = URL.createObjectURL(recording.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.name.replace(/[^a-z0-9]/gi, '_')}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Recording downloaded");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Expose addRecording function for use by MeetingRecorder
  (window as any).audioManager = { addRecording };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <FileAudio className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Audio Library</h2>
        <Badge variant="secondary">{recordings.length} recordings</Badge>
      </div>

      {recordings.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No recordings yet</h3>
            <p className="text-muted-foreground">
              Use the Meeting Recorder tab to create your first recording
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {recordings
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map((recording) => (
              <Card key={recording.id} className="transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {editingId === recording.id ? (
                        <div className="space-y-2">
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Recording name"
                            className="font-semibold"
                          />
                          <Textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Add notes about this recording..."
                            rows={2}
                          />
                        </div>
                      ) : (
                        <div>
                          <CardTitle className="text-lg">{recording.name}</CardTitle>
                          {recording.notes && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {recording.notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {editingId === recording.id ? (
                        <>
                          <Button size="sm" onClick={saveEdit}>
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => playRecording(recording)}
                          >
                            {playingId === recording.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(recording)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadRecording(recording)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteRecording(recording.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(recording.duration)}
                    </div>
                    <div>Created: {formatDate(recording.createdAt)}</div>
                    {recording.updatedAt.getTime() !== recording.createdAt.getTime() && (
                      <div>Updated: {formatDate(recording.updatedAt)}</div>
                    )}
                  </div>
                  
                  {recording.transcription && (
                    <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">Transcription</h4>
                      <p className="text-sm text-muted-foreground">
                        {recording.transcription}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
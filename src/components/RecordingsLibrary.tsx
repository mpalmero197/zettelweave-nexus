import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  Monitor, 
  Mic, 
  Play,
  Download,
  Trash2,
  Calendar,
  Clock,
  HardDrive
} from 'lucide-react';
import { toast } from 'sonner';

interface Recording {
  id: string;
  title: string;
  recording_type: 'audio' | 'video' | 'screen' | 'screen_with_audio';
  storage_path: string;
  duration: number;
  file_size: number;
  created_at: string;
}

export function RecordingsLibrary() {
  const { user } = useAuth();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('all');

  useEffect(() => {
    if (user) {
      fetchRecordings();
    }
  }, [user]);

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Type cast to ensure compatibility
      const typedData = (data || []).map(rec => ({
        ...rec,
        recording_type: rec.recording_type as 'audio' | 'video' | 'screen' | 'screen_with_audio'
      })) as Recording[];
      
      setRecordings(typedData);
    } catch (error: any) {
      console.error('Error fetching recordings:', error);
      toast.error('Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const downloadRecording = async (recording: Recording) => {
    try {
      const [bucket, ...pathParts] = recording.storage_path.split('/');
      const path = pathParts.join('/');

      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recording.title}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Recording downloaded!');
    } catch (error: any) {
      console.error('Error downloading recording:', error);
      toast.error('Failed to download recording');
    }
  };

  const deleteRecording = async (recording: Recording) => {
    if (!confirm('Delete this recording permanently?')) return;

    try {
      const [bucket, ...pathParts] = recording.storage_path.split('/');
      const path = pathParts.join('/');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('recordings')
        .delete()
        .eq('id', recording.id);

      if (dbError) throw dbError;

      toast.success('Recording deleted');
      fetchRecordings();
    } catch (error: any) {
      console.error('Error deleting recording:', error);
      toast.error('Failed to delete recording');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'audio': return <Mic className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'screen': return <Monitor className="h-4 w-4" />;
      case 'screen_with_audio': return <><Monitor className="h-4 w-4" /><Mic className="h-3 w-3" /></>;
      default: return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'audio': return 'Audio Recording';
      case 'video': return 'Video Recording';
      case 'screen': return 'Screen Recording';
      case 'screen_with_audio': return 'Screen + Audio';
      default: return type;
    }
  };

  const filteredRecordings = selectedType === 'all' 
    ? recordings 
    : recordings.filter(r => r.recording_type === selectedType);

  const counts = {
    all: recordings.length,
    audio: recordings.filter(r => r.recording_type === 'audio').length,
    video: recordings.filter(r => r.recording_type === 'video').length,
    screen: recordings.filter(r => r.recording_type === 'screen').length,
    screen_with_audio: recordings.filter(r => r.recording_type === 'screen_with_audio').length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recordings Library</CardTitle>
        <CardDescription>View and manage all your recordings</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="all">
              All ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-1">
              <Mic className="h-3 w-3" />
              ({counts.audio})
            </TabsTrigger>
            <TabsTrigger value="video" className="gap-1">
              <Video className="h-3 w-3" />
              ({counts.video})
            </TabsTrigger>
            <TabsTrigger value="screen" className="gap-1">
              <Monitor className="h-3 w-3" />
              ({counts.screen})
            </TabsTrigger>
            <TabsTrigger value="screen_with_audio" className="gap-1 text-xs">
              Screen+Mic ({counts.screen_with_audio})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={selectedType} className="mt-6">
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading recordings...
                  </div>
                ) : filteredRecordings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Play className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recordings found</p>
                  </div>
                ) : (
                  filteredRecordings.map((recording) => (
                    <div
                      key={recording.id}
                      className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                              {getTypeIcon(recording.recording_type)}
                              {getTypeLabel(recording.recording_type)}
                            </Badge>
                          </div>
                          <h3 className="font-medium">{recording.title}</h3>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(recording.created_at)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(recording.duration || 0)}
                            </span>
                            <span className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              {formatSize(recording.file_size || 0)}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadRecording(recording)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteRecording(recording)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

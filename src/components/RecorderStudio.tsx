import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Video, Monitor, Mic, Square, Circle, Download, Upload, Trash2, Play, Pause,
  MoreHorizontal, Clock, HardDrive, Share2, Youtube, Music, Instagram, Search, X,
  ArrowUpDown, MicOff
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  exportForYouTube, exportForPodcast, exportForSpotify, exportForInstagram, exportForTikTok, getExportRecommendation
} from '@/utils/mediaExportUtils';

type RecordingMode = 'audio' | 'video' | 'screen' | 'screen_with_audio';

interface Recording {
  id: string;
  title: string;
  recording_type: RecordingMode;
  storage_path: string;
  duration: number;
  file_size: number;
  created_at: string;
}

const MODE_CONFIG: Record<RecordingMode, { icon: typeof Mic; label: string; shortLabel: string; color: string }> = {
  audio: { icon: Mic, label: 'Audio', shortLabel: 'Mic', color: '#f97316' },
  video: { icon: Video, label: 'Video', shortLabel: 'Cam', color: '#ef4444' },
  screen: { icon: Monitor, label: 'Screen', shortLabel: 'Screen', color: '#3b82f6' },
  screen_with_audio: { icon: Monitor, label: 'Screen + Mic', shortLabel: 'S+M', color: '#8b5cf6' },
};

const getRelativeDate = (dateStr: string) => {
  try {
    return formatDistanceToNowStrict(new Date(dateStr), { addSuffix: false })
      .replace(' seconds', 's').replace(' second', 's')
      .replace(' minutes', 'm').replace(' minute', 'm')
      .replace(' hours', 'h').replace(' hour', 'h')
      .replace(' days', 'd').replace(' day', 'd')
      .replace(' months', 'mo').replace(' month', 'mo')
      .replace(' years', 'y').replace(' year', 'y');
  } catch { return ''; }
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

export function RecorderStudio() {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  // Recorder state
  const [mode, setMode] = useState<RecordingMode>('audio');
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTitle, setRecordingTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  // Library state
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'largest' | 'longest'>('recent');

  // Refs
  const mediaRecorderRef = useRef<globalThis.MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (user) fetchRecordings();
    return () => { cleanupRecording(); };
  }, [user]);

  const cleanupRecording = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // ======= RECORDING LOGIC =======
  const startRecording = async () => {
    try {
      let stream: MediaStream;
      switch (mode) {
        case 'audio':
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          break;
        case 'video':
          stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1920, height: 1080 }, audio: true });
          if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
          break;
        case 'screen':
          stream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { width: 1920, height: 1080 } });
          if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
          break;
        case 'screen_with_audio': {
          const screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: { width: 1920, height: 1080 } });
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream = new MediaStream();
          screenStream.getVideoTracks().forEach((t: MediaStreamTrack) => stream.addTrack(t));
          audioStream.getAudioTracks().forEach((t: MediaStreamTrack) => stream.addTrack(t));
          if (videoPreviewRef.current) videoPreviewRef.current.srcObject = stream;
          break;
        }
        default: throw new Error('Invalid mode');
      }

      streamRef.current = stream;
      chunksRef.current = [];

      const mr = new globalThis.MediaRecorder(stream, { mimeType: mode === 'audio' ? 'audio/webm' : 'video/webm' });
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        setRecordedBlob(new Blob(chunksRef.current, { type: mode === 'audio' ? 'audio/webm' : 'video/webm' }));
        streamRef.current?.getTracks().forEach(t => t.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);
      toast.success(`Recording started`);
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
    }
  };

  const pauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerRef.current = window.setInterval(() => setRecordingTime(p => p + 1), 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const uploadToCloud = async () => {
    if (!recordedBlob || !user) return;
    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}-${mode}.webm`;
      const bucket = mode === 'audio' ? 'audio-snippets' : mode === 'video' ? 'video-recordings' : 'screen-recordings';
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, recordedBlob);
      if (uploadError) throw uploadError;
      const { error: dbError } = await supabase.from('recordings').insert({
        user_id: user.id,
        title: recordingTitle || `${MODE_CONFIG[mode].label} — ${new Date().toLocaleDateString()}`,
        recording_type: mode,
        storage_path: `${bucket}/${fileName}`,
        duration: recordingTime,
        file_size: recordedBlob.size,
      });
      if (dbError) throw dbError;
      toast.success('Saved to cloud!');
      setRecordedBlob(null);
      setRecordingTitle('');
      setRecordingTime(0);
      fetchRecordings();
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadBlob = () => {
    if (!recordedBlob) return;
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode}-recording-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Downloaded!');
  };

  // ======= LIBRARY LOGIC =======
  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('recordings').select('*').is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRecordings((data || []).map(r => ({ ...r, recording_type: r.recording_type as RecordingMode })));
    } catch { toast.error('Failed to load recordings'); }
    finally { setLoading(false); }
  };

  const downloadRecording = async (rec: Recording) => {
    try {
      const [bucket, ...parts] = rec.storage_path.split('/');
      const { data, error } = await supabase.storage.from(bucket).download(parts.join('/'));
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${rec.title}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded!');
    } catch { toast.error('Download failed'); }
  };

  const exportForPlatform = async (rec: Recording, platform: string) => {
    try {
      const [bucket, ...parts] = rec.storage_path.split('/');
      const { data, error } = await supabase.storage.from(bucket).download(parts.join('/'));
      if (error) throw error;
      switch (platform) {
        case 'youtube': await exportForYouTube(data, rec.title); toast.success('Exported for YouTube!'); break;
        case 'podcast': await exportForPodcast(data, rec.title); toast.success('Exported for Podcasts!'); break;
        case 'spotify': await exportForSpotify(data, rec.title); toast.success('Exported for Spotify!'); break;
        case 'instagram': await exportForInstagram(data, rec.title); toast.success('Exported for Instagram!'); break;
        case 'tiktok': await exportForTikTok(data, rec.title); toast.success('Exported for TikTok!'); break;
      }
    } catch { toast.error('Export failed'); }
  };

  const deleteRecording = async (rec: Recording) => {
    if (!confirm('Delete this recording permanently?')) return;
    try {
      const [bucket, ...parts] = rec.storage_path.split('/');
      await supabase.storage.from(bucket).remove([parts.join('/')]);
      await supabase.from('recordings').delete().eq('id', rec.id);
      toast.success('Deleted');
      fetchRecordings();
    } catch { toast.error('Delete failed'); }
  };

  const displayedRecordings = useMemo(() => {
    let filtered = recordings;
    if (filterType !== 'all') filtered = filtered.filter(r => r.recording_type === filterType);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      filtered = filtered.filter(r => r.title.toLowerCase().includes(q));
    }
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'largest': return (b.file_size || 0) - (a.file_size || 0);
        case 'longest': return (b.duration || 0) - (a.duration || 0);
        default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });
  }, [recordings, filterType, searchTerm, sortBy]);

  const typeCounts = useMemo(() => ({
    all: recordings.length,
    audio: recordings.filter(r => r.recording_type === 'audio').length,
    video: recordings.filter(r => r.recording_type === 'video').length,
    screen: recordings.filter(r => r.recording_type === 'screen').length,
    screen_with_audio: recordings.filter(r => r.recording_type === 'screen_with_audio').length,
  }), [recordings]);

  const modeConfig = MODE_CONFIG[mode];
  const ModeIcon = modeConfig.icon;
  const showVideoPreview = mode !== 'audio';

  return (
    <div className="animate-fade-in space-y-5">
      {/* ============ RECORDER PANEL ============ */}
      <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden">
        {/* Mode selector chips */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mr-1">Record</span>
          {(Object.entries(MODE_CONFIG) as [RecordingMode, typeof MODE_CONFIG.audio][]).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = mode === key;
            return (
              <button
                key={key}
                disabled={isRecording}
                onClick={() => setMode(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                  active
                    ? 'text-primary-foreground shadow-sm'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/70 disabled:opacity-40'
                }`}
                style={active ? { backgroundColor: cfg.color } : undefined}
              >
                <Icon className="h-3 w-3" />
                {key === 'screen_with_audio' && active && <Mic className="h-2.5 w-2.5" />}
                <span className={isMobile ? 'hidden' : ''}>{cfg.label}</span>
                {isMobile && <span>{cfg.shortLabel}</span>}
              </button>
            );
          })}
        </div>

        {/* Video preview area */}
        {showVideoPreview && (isRecording || recordedBlob) && (
          <div className="mx-4 mb-3 aspect-video bg-background/50 rounded-lg overflow-hidden border border-border/30">
            <video ref={videoPreviewRef} autoPlay muted={mode !== 'video'} className="w-full h-full object-contain" />
          </div>
        )}

        {/* Recording controls */}
        <div className="px-4 pb-4">
          {!isRecording && !recordedBlob && (
            <button
              onClick={startRecording}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border-2 border-dashed border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/[0.03] transition-all duration-200 group"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: `${modeConfig.color}15` }}>
                <Circle className="h-4 w-4" style={{ color: modeConfig.color, fill: modeConfig.color }} />
              </div>
              <span className="text-sm font-medium">Start {modeConfig.label} Recording</span>
            </button>
          )}

          {isRecording && (
            <div className="flex items-center justify-between gap-3">
              {/* Live indicator + timer */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: isPaused ? '#eab308' : '#ef4444' }} />
                  <span className="text-lg font-mono font-bold tabular-nums text-foreground">{formatTime(recordingTime)}</span>
                </div>
                <span className="text-[11px] text-muted-foreground/60 uppercase tracking-wide">
                  {isPaused ? 'Paused' : 'Recording'}
                </span>
              </div>
              {/* Buttons */}
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={pauseRecording}>
                  {isPaused ? <><Play className="h-3.5 w-3.5" />Resume</> : <><Pause className="h-3.5 w-3.5" />Pause</>}
                </Button>
                <Button variant="destructive" size="sm" className="h-9 gap-1.5 text-xs" onClick={stopRecording}>
                  <Square className="h-3.5 w-3.5" />Stop
                </Button>
              </div>
            </div>
          )}

          {recordedBlob && !isRecording && (
            <div className="space-y-3">
              {/* Title + metadata */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${modeConfig.color}15` }}>
                  <ModeIcon className="h-4 w-4" style={{ color: modeConfig.color }} />
                </div>
                <Input
                  value={recordingTitle}
                  onChange={(e) => setRecordingTitle(e.target.value)}
                  placeholder={`${modeConfig.label} — ${new Date().toLocaleDateString()}`}
                  className="h-9 text-sm bg-background/50 border-border/40 flex-1"
                />
              </div>
              <div className="flex items-center gap-4 text-[11px] text-muted-foreground/60 pl-10">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(recordingTime)}</span>
                <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{formatSize(recordedBlob.size)}</span>
              </div>
              {/* Actions */}
              <div className="flex gap-2 pl-10">
                <Button size="sm" className="h-8 text-xs gap-1.5 flex-1" onClick={uploadToCloud} disabled={uploading}>
                  <Upload className="h-3.5 w-3.5" />{uploading ? 'Saving...' : 'Save to Cloud'}
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={downloadBlob}>
                  <Download className="h-3.5 w-3.5" />Download
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => { setRecordedBlob(null); setRecordingTitle(''); setRecordingTime(0); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============ RECORDINGS LIBRARY ============ */}
      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type filter chips */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide flex-1 min-w-0">
            {([['all', 'All'], ['audio', 'Audio'], ['video', 'Video'], ['screen', 'Screen'], ['screen_with_audio', 'S+Mic']] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-150 ${
                  filterType === key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground'
                }`}
              >
                {label} ({typeCounts[key]})
              </button>
            ))}
          </div>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-[11px] text-muted-foreground">
                <ArrowUpDown className="h-3 w-3" />
                <span className="hidden sm:inline">
                  {sortBy === 'recent' ? 'Recent' : sortBy === 'oldest' ? 'Oldest' : sortBy === 'largest' ? 'Largest' : 'Longest'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              {([['recent', 'Most Recent'], ['oldest', 'Oldest First'], ['largest', 'Largest'], ['longest', 'Longest']] as const).map(([k, l]) => (
                <DropdownMenuItem key={k} onClick={() => setSortBy(k)} className={sortBy === k ? 'bg-accent font-medium' : ''}>
                  {l}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        {recordings.length > 5 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search recordings..."
              className="h-8 pl-8 text-xs bg-card/60 border-border/40 rounded-lg"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}

        {/* Recording list */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/20 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : displayedRecordings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted/20 flex items-center justify-center">
              <MicOff className="h-7 w-7 text-muted-foreground/15" />
            </div>
            <p className="text-sm text-muted-foreground/60">
              {searchTerm ? `No recordings matching "${searchTerm}"` : recordings.length === 0 ? 'No recordings yet — start one above!' : 'No recordings of this type'}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayedRecordings.map(rec => {
              const cfg = MODE_CONFIG[rec.recording_type] || MODE_CONFIG.audio;
              const Icon = cfg.icon;

              return (
                <div
                  key={rec.id}
                  className="group flex items-center gap-3 px-3 py-2.5 rounded-xl border border-border/40 bg-card/60 hover:bg-card/90 hover:border-border/70 transition-all duration-150"
                  style={{ borderLeftWidth: '3px', borderLeftColor: cfg.color }}
                >
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${cfg.color}12` }}
                  >
                    <Icon className="h-3.5 w-3.5" style={{ color: cfg.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{rec.title}</h3>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-muted-foreground/50 tabular-nums flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />{formatTime(rec.duration || 0)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/50 tabular-nums flex items-center gap-1">
                        <HardDrive className="h-2.5 w-2.5" />{formatSize(rec.file_size || 0)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/40 tabular-nums hidden sm:inline">
                        {getRelativeDate(rec.created_at)} ago
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost" size="sm"
                        className={`h-7 w-7 p-0 flex-shrink-0 ${isMobile ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'} hover:opacity-100 transition-opacity`}
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => downloadRecording(rec)}>
                        <Download className="mr-2 h-3.5 w-3.5" />Download
                      </DropdownMenuItem>
                      {(rec.recording_type === 'video' || rec.recording_type === 'screen' || rec.recording_type === 'screen_with_audio') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => exportForPlatform(rec, 'youtube')}>
                            <Youtube className="mr-2 h-3.5 w-3.5" />Export for YouTube
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportForPlatform(rec, 'instagram')}>
                            <Instagram className="mr-2 h-3.5 w-3.5" />Export for Instagram
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportForPlatform(rec, 'tiktok')}>
                            <Video className="mr-2 h-3.5 w-3.5" />Export for TikTok
                          </DropdownMenuItem>
                        </>
                      )}
                      {rec.recording_type === 'audio' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => exportForPlatform(rec, 'podcast')}>
                            <Music className="mr-2 h-3.5 w-3.5" />Export for Podcast
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => exportForPlatform(rec, 'spotify')}>
                            <Music className="mr-2 h-3.5 w-3.5" />Export for Spotify
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => deleteRecording(rec)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-3.5 w-3.5" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

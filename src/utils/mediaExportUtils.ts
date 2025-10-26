// Export utilities for media recordings to various platform formats

export const exportForYouTube = async (blob: Blob, title: string) => {
  // YouTube supports MP4, MOV, MPEG4, AVI, WMV, MPEGPS, FLV, 3GPP, WebM
  // For now, download as WebM (native format) - users can convert if needed
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_YouTube.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportForPodcast = async (blob: Blob, title: string) => {
  // Podcasts typically use MP3 or M4A
  // Download as WebM for now - recommend conversion tools
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_Podcast.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportForSpotify = async (blob: Blob, title: string) => {
  // Spotify for Podcasters accepts MP3, M4A, WAV, FLAC
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_Spotify.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportForInstagram = async (blob: Blob, title: string) => {
  // Instagram supports MP4, MOV (max 60 seconds for stories)
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_Instagram.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportForTikTok = async (blob: Blob, title: string) => {
  // TikTok supports MP4, MOV, MPEG, AVI, WebM
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}_TikTok.webm`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const getExportRecommendation = (recordingType: string): string => {
  const recommendations: Record<string, string> = {
    audio: 'For podcasts, consider converting to MP3 using online tools like CloudConvert or FFmpeg.',
    video: 'For YouTube/Instagram, you may need to convert WebM to MP4 using tools like HandBrake or CloudConvert.',
    screen: 'Screen recordings work great for tutorials! Consider adding captions for accessibility.',
    screen_with_audio: 'Perfect for video tutorials and presentations. Add chapters for YouTube for better engagement.',
  };
  return recommendations[recordingType] || 'Export and share your creation!';
};

import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Hls from 'hls.js';
import { Play, List, Settings, LogIn, PlusCircle, Monitor } from 'lucide-react';

interface Channel {
  name: string;
  url: string;
  group: string;
}

export default function IPTVPlayer() {
  const [view, setView] = useState<'login' | 'setup' | 'player'>('login');
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const videoRef = useRef<HTMLVideoElement>(null);

  // Focus management for TV remotes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Basic D-Pad navigation logic would go here
      // For a demo, we rely on browser focus ring and .focus-ring class
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('iptv_playlist');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setChannels(parsed);
        const uniqueGroups = Array.from(new Set(parsed.map((c: any) => c.group || 'General'))) as string[];
        setGroups(['All', ...uniqueGroups]);
        setView('player');
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (selectedChannel && videoRef.current) {
      const video = videoRef.current;
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(selectedChannel.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = selectedChannel.url;
        video.addEventListener('loadedmetadata', () => video.play());
      }
    }
  }, [selectedChannel]);

  const parseM3U = async (url: string) => {
    try {
      const res = await fetch(url);
      const text = await res.text();
      const lines = text.split('\n');
      const parsed: Channel[] = [];
      let currentGroup = 'General';

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('#EXTINF:')) {
          const groupMatch = line.match(/group-title="([^"]+)"/);
          if (groupMatch) currentGroup = groupMatch[1];
          const name = line.split(',').pop() || 'Unknown';
          const nextLine = lines[i + 1]?.trim();
          if (nextLine && !nextLine.startsWith('#')) {
            parsed.push({ name, url: nextLine, group: currentGroup });
          }
        }
      }
      
      localStorage.setItem('iptv_playlist', JSON.stringify(parsed));
      setChannels(parsed);
      const uniqueGroups = Array.from(new Set(parsed.map((c: any) => c.group))) as string[];
      setGroups(['All', ...uniqueGroups]);
      setView('player');
    } catch (err) {
      alert('Failed to load playlist');
    }
  };

  if (view === 'login') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-white">
        <div className="glass p-12 rounded-2xl w-[500px] text-center space-y-8 border-purple">
          <Monitor className="w-20 h-20 mx-auto text-purple-glow" />
          <h1 className="text-4xl font-bold neon-text">N58 IPTV</h1>
          <button 
            autoFocus
            onClick={() => setView('setup')}
            className="w-full py-4 bg-purple rounded-xl font-bold text-xl focus-ring transition-all hover:bg-purple/80 flex items-center justify-center gap-3"
          >
            <LogIn /> Get Started
          </button>
        </div>
      </div>
    );
  }

  if (view === 'setup') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-white p-8">
        <div className="glass p-12 rounded-2xl w-full max-w-2xl space-y-8">
          <h2 className="text-3xl font-bold text-iceBlue">Load Playlist</h2>
          <input 
            autoFocus
            type="text"
            placeholder="M3U Playlist URL"
            value={playlistUrl}
            onChange={(e) => setPlaylistUrl(e.target.value)}
            className="w-full p-4 bg-white/5 border border-white/20 rounded-xl text-xl focus-ring"
          />
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => parseM3U(playlistUrl)}
              className="py-4 bg-iceBlue rounded-xl font-bold text-xl focus-ring"
            >
              Load URL
            </button>
            <button 
              onClick={() => setView('player')}
              className="py-4 bg-white/10 rounded-xl font-bold text-xl focus-ring"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredChannels = selectedGroup === 'All' ? channels : channels.filter(c => c.group === selectedGroup);

  return (
    <div className="h-screen bg-background text-white flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/4 h-full glass border-r border-white/10 flex flex-col">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-purple neon-text">N58</h1>
          <button onClick={() => setView('setup')} className="p-2 hover:bg-white/10 rounded-lg focus-ring">
            <Settings className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredChannels.map((channel, i) => (
            <button
              key={i}
              onClick={() => setSelectedChannel(channel)}
              className={`w-full text-left p-4 rounded-xl transition-all focus-ring ${
                selectedChannel?.url === channel.url ? 'bg-purple/20 neon-border' : 'hover:bg-white/5'
              }`}
            >
              <div className="font-bold truncate">{channel.name}</div>
              <div className="text-sm text-white/40 truncate">{channel.group}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        <div className="absolute top-0 left-0 right-0 p-6 z-10 bg-gradient-to-b from-black/80 to-transparent flex gap-4 overflow-x-auto no-scrollbar">
          {groups.map(g => (
            <button
              key={g}
              onClick={() => setSelectedGroup(g)}
              className={`px-6 py-2 rounded-full whitespace-nowrap focus-ring ${
                selectedGroup === g ? 'bg-iceBlue font-bold' : 'bg-white/10'
              }`}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-black flex items-center justify-center">
          {selectedChannel ? (
            <video 
              ref={videoRef}
              controls
              className="w-full h-full"
            />
          ) : (
            <div className="text-center space-y-4">
              <Play className="w-20 h-20 mx-auto text-white/20" />
              <p className="text-white/40 text-xl font-medium">Select a channel to start watching</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Hls from 'hls.js';
import { Play, List, Settings, LogIn, PlusCircle, Monitor, Tv } from 'lucide-react';

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

  // Robust Spatial Navigation for TV Remotes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const focusableElements = Array.from(document.querySelectorAll('.focusable')) as HTMLElement[];
      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);

      if (e.key === 'ArrowDown') {
        const nextIndex = (currentIndex + 1) % focusableElements.length;
        focusableElements[nextIndex]?.focus();
        e.preventDefault();
      } else if (e.key === 'ArrowUp') {
        const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
        focusableElements[prevIndex]?.focus();
        e.preventDefault();
      } else if (e.key === 'ArrowRight') {
        const nextIndex = (currentIndex + 1) % focusableElements.length;
        focusableElements[nextIndex]?.focus();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        const prevIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1;
        focusableElements[prevIndex]?.focus();
        e.preventDefault();
      } else if (e.key === 'Escape') {
        if (view === 'player') {
          if (selectedChannel) setSelectedChannel(null);
          else setView('setup');
        }
        else if (view === 'setup') setView('login');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, selectedChannel]);

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
            className="focusable w-full py-4 bg-purple rounded-xl font-bold text-xl focus-ring transition-all hover:bg-purple/80 flex items-center justify-center gap-3"
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
            className="focusable w-full p-4 bg-white/5 border border-white/20 rounded-xl text-xl focus-ring"
          />
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => parseM3U(playlistUrl)}
              className="focusable py-4 bg-iceBlue rounded-xl font-bold text-xl focus-ring"
            >
              Load URL
            </button>
            <button 
              onClick={() => setView('player')}
              className="focusable py-4 bg-white/10 rounded-xl font-bold text-xl focus-ring"
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
    <div className="h-screen bg-background text-white flex flex-col overflow-hidden">
      <Head>
        <title>N58 IPTV Player</title>
      </Head>

      {/* Header / Categories */}
      <div className="p-6 glass border-b border-white/10 flex items-center justify-between z-20">
        <div className="flex items-center gap-6">
          <h1 className="text-3xl font-bold text-purple neon-text mr-8">N58</h1>
          <div className="flex gap-3 overflow-x-auto no-scrollbar max-w-[70vw]">
            {groups.map(g => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={`focusable px-6 py-2 rounded-full whitespace-nowrap focus-ring ${
                  selectedGroup === g ? 'bg-iceBlue font-bold' : 'bg-white/10'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <button 
          onClick={() => setView('setup')} 
          className="focusable p-3 hover:bg-white/10 rounded-full focus-ring"
        >
          <Settings className="w-6 h-6 text-white/60" />
        </button>
      </div>

      {/* Main content Area */}
      <div className="flex-1 overflow-hidden relative">
        {selectedChannel ? (
          <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
            <video 
              ref={videoRef}
              controls
              autoPlay
              className="focusable w-full h-full"
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-8 no-scrollbar">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {filteredChannels.map((channel, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedChannel(channel)}
                  className="focusable aspect-square group relative rounded-2xl overflow-hidden glass border-white/5 transition-all focus-ring hover:scale-105 active:scale-95 flex flex-col items-center justify-center p-4 text-center"
                >
                  <div className="w-16 h-16 mb-4 rounded-xl bg-purple/10 flex items-center justify-center neon-border group-focus:neon-border">
                    <Tv className="w-8 h-8 text-purple" />
                  </div>
                  <div className="font-bold text-lg leading-tight line-clamp-2">{channel.name}</div>
                  <div className="mt-1 text-xs text-white/40 uppercase tracking-widest">{channel.group}</div>
                  
                  {/* Neon overlay for focus state */}
                  <div className="absolute inset-0 border-2 border-transparent group-focus:border-purple/50 group-focus:shadow-[inset_0_0_20px_rgba(168,85,247,0.2)] rounded-2xl pointer-events-none" />
                </button>
              ))}
            </div>
            {filteredChannels.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-white/20 space-y-4 pt-20">
                <PlusCircle className="w-20 h-20" />
                <p className="text-2xl">No channels found in this group</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

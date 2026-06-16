import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import Hls from 'hls.js';
import { Search, Upload, Play, Tv, List, Globe, Film } from 'lucide-react';

interface Channel {
  name: string;
  url: string;
  group: string;
  logo: string;
}

const DEFAULT_PLAYLISTS = [
  { name: 'Arabic Channels', url: 'https://iptv-org.github.io/iptv/languages/ara.m3u', icon: Globe },
  { name: 'General Movies', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u', icon: Film },
  { name: 'Public Domain', url: 'https://raw.githubusercontent.com/pndurette/public-domain-movies-m3u/master/public-domain-movies.m3u', icon: List },
];

export default function IPTVPlayer() {
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const parseM3U = (content: string) => {
    const lines = content.split('\n');
    const parsedChannels: Channel[] = [];
    const parsedGroups = new Set<string>(['All']);

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF:')) {
        const info = lines[i];
        const url = lines[i + 1]?.trim();
        
        if (url && !url.startsWith('#')) {
          const nameMatch = info.match(/,(.*)$/);
          const groupMatch = info.match(/group-title="([^"]*)"/);
          const logoMatch = info.match(/tvg-logo="([^"]*)"/);

          const channel: Channel = {
            name: nameMatch ? nameMatch[1].trim() : 'Unknown Channel',
            url: url,
            group: groupMatch ? groupMatch[1] : 'Uncategorized',
            logo: logoMatch ? logoMatch[1] : '',
          };
          
          parsedChannels.push(channel);
          if (channel.group) parsedGroups.add(channel.group);
        }
      }
    }
    
    setChannels(parsedChannels);
    setFilteredChannels(parsedChannels);
    setGroups(Array.from(parsedGroups));
    setSelectedGroup('All');
  };

  const loadPlaylistFromUrl = async (url: string) => {
    setLoading(true);
    try {
      const res = await fetch(url);
      const text = await res.text();
      parseM3U(text);
    } catch (err) {
      console.error('Failed to fetch playlist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playlistUrl) loadPlaylistFromUrl(playlistUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        parseM3U(event.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  useEffect(() => {
    // Pre-load default Arabic playlist on mount
    loadPlaylistFromUrl(DEFAULT_PLAYLISTS[0].url);
  }, []);

  useEffect(() => {
    let filtered = channels;
    if (selectedGroup !== 'All') {
      filtered = filtered.filter(c => c.group === selectedGroup);
    }
    if (searchQuery) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    setFilteredChannels(filtered);
  }, [selectedGroup, searchQuery, channels]);

  useEffect(() => {
    if (currentChannel && videoRef.current) {
      const video = videoRef.current;
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(currentChannel.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play();
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentChannel.url;
        video.addEventListener('loadedmetadata', () => {
          video.play();
        });
      }
    }
  }, [currentChannel]);

  return (
    <div className="min-h-screen bg-background text-white font-sans p-4 md:p-8">
      <Head>
        <title>N58 IPTV Player</title>
      </Head>

      <header className="max-w-6xl mx-auto flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold neon-text bg-gradient-to-r from-accent to-ice bg-clip-text text-transparent">
          N58 PLAYER
        </h1>
        <div className="text-sm opacity-50">Made by Nawaf</div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-1 space-y-6">
          <div className="glass p-6 rounded-2xl neon-border">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <List className="text-accent" /> Playlist Setup
            </h2>
            
            <div className="grid grid-cols-1 gap-2 mb-4">
              {DEFAULT_PLAYLISTS.map((p) => (
                <button
                  key={p.url}
                  onClick={() => loadPlaylistFromUrl(p.url)}
                  className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-lg text-sm transition-all group"
                >
                  <p.icon size={18} className="text-ice group-hover:scale-110 transition-transform" />
                  <span className="font-medium">{p.name}</span>
                </button>
              ))}
            </div>

            <div className="h-px bg-white/10 my-4"></div>

            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="M3U Playlist URL"
                className="w-full bg-white/5 border border-white/10 p-3 rounded-lg focus:outline-none focus:border-accent transition-colors"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
              />
              <button className="w-full bg-accent hover:bg-accent/80 p-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2">
                <Play size={18} /> Load URL
              </button>
            </form>
            <div className="mt-4 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/10"></div>
              <span className="text-xs opacity-50 uppercase tracking-widest">OR</span>
              <div className="h-px flex-1 bg-white/10"></div>
            </div>
            <label className="mt-4 w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 p-3 rounded-lg cursor-pointer hover:bg-white/10 transition-colors text-sm">
              <Upload size={18} /> Upload M3U File
              <input type="file" className="hidden" accept=".m3u" onChange={handleFileUpload} />
            </label>
          </div>

          <div className="glass p-6 rounded-2xl border border-white/10">
             <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input
                  type="text"
                  placeholder="Search channels..."
                  className="w-full bg-white/5 border border-white/10 p-3 pl-10 rounded-lg focus:outline-none focus:border-ice transition-colors"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
             <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                {groups.map(group => (
                  <button
                    key={group}
                    onClick={() => setSelectedGroup(group)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                      selectedGroup === group 
                      ? 'bg-ice text-black font-bold' 
                      : 'bg-white/5 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {group}
                  </button>
                ))}
             </div>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-6">
          <div className="glass aspect-video rounded-2xl neon-border overflow-hidden relative bg-black">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-ice border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : currentChannel ? (
              <video ref={videoRef} controls className="w-full h-full" />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20">
                <Tv size={64} className="mb-4" />
                <p>Select a channel to start streaming</p>
              </div>
            )}
            {currentChannel && (
              <div className="absolute bottom-12 left-4 glass px-4 py-2 rounded-lg border-accent/30 text-sm">
                Now Playing: <span className="font-bold text-ice">{currentChannel.name}</span>
              </div>
            )}
          </div>

          <div className="glass rounded-2xl border border-white/10 p-4 h-[500px] flex flex-col">
            <h3 className="text-lg font-semibold mb-4 px-2">Channels ({filteredChannels.length})</h3>
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
              {filteredChannels.map((channel, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentChannel(channel)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-white/5 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10">
                    {channel.logo ? (
                      <img src={channel.logo} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <Tv className="text-white/20" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate group-hover:text-ice transition-colors">{channel.name}</p>
                    <p className="text-xs opacity-50 truncate">{channel.group}</p>
                  </div>
                  <Play size={16} className="text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto mt-12 pt-8 border-t border-white/5 flex justify-between items-center text-xs opacity-40">
        <p>© 2026 N58 IPTV. Strictly Made by Nawaf.</p>
        <div className="flex gap-4">
          <span>Obsidian/Neon Edition</span>
          <span>Powered by hls.js</span>
        </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.5);
        }
      `}</style>
    </div>
  );
}

import React, { useState, useRef, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Hls from 'hls.js';
import { Search, Upload, Play, Tv, List, Globe, Film, Clapperboard, Tv2, Baby, Info, Settings, User, LogOut, Subtitles, Languages, Trophy, Zap } from 'lucide-react';

interface Channel {
  name: string;
  url: string;
  group: string;
  logo: string;
}

const DEFAULT_PLAYLISTS = [
  { name: 'World Cup 2026', ar: 'كأس العالم 2026', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u', icon: Trophy, priority: ['beIN', 'SSC', 'Alkass', 'Abu Dhabi Sports', 'KSA Sports', 'Dubai Sports'] },
  { name: 'Arabic Channels', ar: 'قنوات عربية', url: 'https://iptv-org.github.io/iptv/languages/ara.m3u', icon: Globe },
  { name: 'Sports', ar: 'القنوات الرياضية', url: 'https://iptv-org.github.io/iptv/categories/sports.m3u', icon: Zap },
  { name: 'Arabic Movies', ar: 'أفلام عربية', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u', icon: Clapperboard },
  { name: 'Arabic Series', ar: 'مسلسلات عربية', url: 'https://iptv-org.github.io/iptv/categories/series.m3u', icon: Tv2 },
  { name: 'Anime & Cartoon', ar: 'أنمي وكرتون', url: 'https://iptv-org.github.io/iptv/categories/animation.m3u', icon: Baby },
  { name: 'Public Domain', ar: 'مشاع إبداعي', url: 'https://raw.githubusercontent.com/pndurette/public-domain-movies-m3u/master/public-domain-movies.m3u', icon: Film },
];

export default function IPTVPlayer() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [activePlaylist, setActivePlaylist] = useState(DEFAULT_PLAYLISTS[0]);
  const [loading, setLoading] = useState(false);
  const [subtitleUrl, setSubtitleUrl] = useState('');
  const [showSubtitleInput, setShowSubtitleInput] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const parseM3U = (content: string, priorityKeywords?: string[]) => {
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

    // If it's the World Cup category, filter and sort by priority Arabic channels
    if (priorityKeywords) {
      const filtered = parsedChannels.filter(c => 
        priorityKeywords.some(key => c.name.toLowerCase().includes(key.toLowerCase()))
      );
      // Sort to put priority channels first
      filtered.sort((a, b) => {
        const aIdx = priorityKeywords.findIndex(key => a.name.toLowerCase().includes(key.toLowerCase()));
        const bIdx = priorityKeywords.findIndex(key => b.name.toLowerCase().includes(key.toLowerCase()));
        return aIdx - bIdx;
      });
      setChannels(filtered);
      // For World Cup, we might just want to group by the channel providers or keep it simple
      const wcGroups = new Set<string>(['All']);
      filtered.forEach(c => {
        priorityKeywords.forEach(key => {
          if (c.name.toLowerCase().includes(key.toLowerCase())) wcGroups.add(key);
        });
      });
      setGroups(Array.from(wcGroups));
    } else {
      setChannels(parsedChannels);
      setGroups(Array.from(parsedGroups));
    }
    
    setSelectedGroup('All');
  };

  const loadPlaylist = async (playlist: typeof DEFAULT_PLAYLISTS[0]) => {
    setLoading(true);
    setActivePlaylist(playlist);
    try {
      const res = await fetch(playlist.url);
      const text = await res.text();
      parseM3U(text, (playlist as any).priority);
    } catch (err) {
      console.error('Failed to fetch playlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlaylist(DEFAULT_PLAYLISTS[0]);
  }, []);

  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      const matchesGroup = selectedGroup === 'All' || c.name.toLowerCase().includes(selectedGroup.toLowerCase()) || c.group === selectedGroup;
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesGroup && matchesSearch;
    });
  }, [channels, selectedGroup, searchQuery]);

  const heroChannel = useMemo(() => {
    return channels[Math.floor(Math.random() * Math.min(channels.length, 10))] || null;
  }, [channels]);

  useEffect(() => {
    if (currentChannel && videoRef.current) {
      const video = videoRef.current;
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(currentChannel.url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => video.play());
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentChannel.url;
        video.addEventListener('loadedmetadata', () => video.play());
      }
    }
  }, [currentChannel]);

  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && videoRef.current) {
      const url = URL.createObjectURL(file);
      setSubtitleUrl(url);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 overflow-x-hidden">
      <Head>
        <title>N58 PREMIUM | Ultra Modern IPTV</title>
      </Head>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5 px-6 py-4 flex justify-between items-center backdrop-blur-xl">
        <div className="flex items-center gap-8">
          <h1 className="text-2xl font-black tracking-tighter neon-text-purple bg-gradient-to-r from-[#a855f7] to-[#38bdf8] bg-clip-text text-transparent">
            N58 PREMIUM
          </h1>
          <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-gray-400">
            {DEFAULT_PLAYLISTS.map((p) => (
              <button 
                key={p.url + p.name} 
                onClick={() => loadPlaylist(p)}
                className={`hover:text-white transition-colors relative py-1 flex items-center gap-2 whitespace-nowrap ${activePlaylist.name === p.name ? 'text-white' : ''}`}
              >
                <p.icon size={16} className={activePlaylist.name === p.name ? 'text-[#a855f7]' : ''} />
                {p.name}
                {activePlaylist.name === p.name && <div className="absolute -bottom-4 left-0 right-0 h-0.5 bg-[#a855f7] shadow-[0_0_10px_#a855f7]" />}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#38bdf8] transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-all w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"><User size={20} /></button>
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"><Settings size={20} /></button>
        </div>
      </nav>

      <main className="pt-20 pb-20">
        {/* Hero Section */}
        {!currentChannel && heroChannel && (
          <section className="relative h-[85vh] w-full px-6 md:px-12 mb-12 group">
            <div className="absolute inset-0 rounded-3xl overflow-hidden mx-6 md:mx-12 mt-4 shadow-[0_0_50px_rgba(168,85,247,0.15)] border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/40 to-transparent z-10" />
              <img 
                src={heroChannel.logo || "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=2069&auto=format&fit=crop"} 
                className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-1000 opacity-60 grayscale-[30%]"
                alt="hero"
              />
            </div>
            
            <div className="relative z-20 h-full flex flex-col justify-end pb-24 px-12 md:px-24 max-w-4xl">
              <span className="text-[#38bdf8] font-bold tracking-widest text-sm mb-4 uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8] animate-pulse shadow-[0_0_8px_#38bdf8]" />
                Trending in {activePlaylist.name}
              </span>
              <h2 className="text-6xl md:text-8xl font-black mb-6 leading-none tracking-tight">
                {heroChannel.name}
              </h2>
              <p className="text-lg text-gray-400 mb-8 line-clamp-3 max-w-2xl font-medium">
                Experience world-class streaming with N58 Premium. Direct high-definition access to {heroChannel.name} with low-latency playback technology. Part of our curated {activePlaylist.ar} collection.
              </p>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentChannel(heroChannel)}
                  className="bg-white text-black px-8 py-4 rounded-xl font-black flex items-center gap-3 hover:scale-105 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] active:scale-95"
                >
                  <Play fill="black" size={24} /> تشغيل الآن / Watch Now
                </button>
                <button className="glass px-8 py-4 rounded-xl font-bold flex items-center gap-3 border border-white/10 hover:bg-white/10 transition-all">
                  <Info size={24} /> More Info
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Video Player Section */}
        {currentChannel && (
          <section className="px-6 md:px-12 mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="max-w-6xl mx-auto">
              <div className="glass rounded-3xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/20 relative group p-1 bg-gradient-to-br from-white/10 to-transparent">
                <div className="bg-black rounded-[22px] overflow-hidden relative">
                  <video 
                    ref={videoRef} 
                    controls 
                    className="w-full aspect-video bg-black"
                  >
                    {subtitleUrl && (
                      <track 
                        kind="subtitles" 
                        src={subtitleUrl} 
                        srcLang="ar" 
                        label="Arabic" 
                        default 
                      />
                    )}
                  </video>
                  
                  {/* Subtitle Controls Overlay */}
                  <div className="absolute top-6 left-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setShowSubtitleInput(!showSubtitleInput)}
                      className="p-3 glass rounded-full border border-white/10 hover:bg-white/20 transition-all flex items-center gap-2 text-xs font-bold"
                      title="Add Arabic Subtitles"
                    >
                      <Subtitles size={20} />
                      {showSubtitleInput ? 'Close' : 'Subtitles'}
                    </button>
                    {showSubtitleInput && (
                      <div className="glass px-4 py-2 rounded-xl border border-white/10 flex items-center gap-3 animate-in fade-in slide-in-from-left-4">
                        <label className="text-[10px] uppercase font-black cursor-pointer hover:text-[#38bdf8]">
                          Upload .vtt / .srt
                          <input type="file" accept=".vtt,.srt" onChange={handleSubtitleUpload} className="hidden" />
                        </label>
                        <div className="w-px h-4 bg-white/10" />
                        <input 
                          type="text" 
                          placeholder="Paste URL..." 
                          className="bg-transparent text-xs focus:outline-none w-32"
                          value={subtitleUrl}
                          onChange={(e) => setSubtitleUrl(e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => {
                      setCurrentChannel(null);
                      setSubtitleUrl('');
                      setShowSubtitleInput(false);
                    }}
                    className="absolute top-6 right-6 p-3 glass rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/20"
                  >
                    <LogOut className="rotate-180" size={20} />
                  </button>
                </div>
              </div>
              <div className="mt-8 flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                     <h3 className="text-3xl font-black">{currentChannel.name}</h3>
                     <Languages className="text-[#a855f7]" size={20} />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="bg-[#a855f7]/20 text-[#a855f7] px-3 py-1 rounded-md border border-[#a855f7]/30 font-bold uppercase tracking-wider text-xs">Live HD</span>
                    <span>{currentChannel.group}</span>
                    <span className="flex items-center gap-1"><User size={14}/> 12.4k watching</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button className="glass p-4 rounded-2xl border border-white/10 text-gray-400 hover:text-white transition-all">
                    <Upload size={24}/>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Content Grid */}
        <section className="px-6 md:px-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
            <h4 className="text-2xl font-black flex items-center gap-3">
              <div className="w-1.5 h-8 bg-[#a855f7] rounded-full shadow-[0_0_12px_#a855f7]" />
              {activePlaylist.name} Collection
            </h4>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {groups.map(group => (
                <button
                  key={group}
                  onClick={() => setSelectedGroup(group)}
                  className={`px-6 py-2 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${
                    selectedGroup === group 
                    ? 'bg-[#a855f7] border-[#a855f7] text-white shadow-[0_0_15px_#a855f7]/40' 
                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30 hover:text-white'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {filteredChannels.map((channel, idx) => (
                <button
                  key={idx + channel.name}
                  onClick={() => {
                    setCurrentChannel(channel);
                    setSubtitleUrl('');
                    setShowSubtitleInput(false);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="group relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#111] border border-white/5 hover:border-[#a855f7]/50 transition-all duration-500 hover:-translate-y-2 active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 opacity-80" />
                  {channel.logo ? (
                    <img src={channel.logo} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                      <Tv className="text-white/10 mb-4" size={48} />
                      <span className="text-xs text-gray-500 font-bold uppercase">{channel.name}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                    <div className="w-16 h-16 bg-[#a855f7] rounded-full flex items-center justify-center shadow-[0_0_30px_#a855f7] scale-75 group-hover:scale-100 transition-transform duration-500">
                      <Play fill="white" size={32} />
                    </div>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 z-30">
                    <p className="font-bold text-sm truncate mb-1 text-white group-hover:text-[#a855f7] transition-colors">
                      {channel.name}
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate">
                      {channel.group}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer className="px-12 py-12 border-t border-white/5 bg-[#080808]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h5 className="text-xl font-black neon-text-purple mb-4">N58 PREMIUM</h5>
            <p className="text-sm text-gray-500 max-w-sm">The absolute pinnacle of modern IPTV streaming. Custom engineered for speed, aesthetic, and reliability.</p>
          </div>
          <div className="flex gap-12 text-sm text-gray-400 font-medium">
            <div className="flex flex-col gap-3">
              <span className="text-white font-bold">Platform</span>
              <a href="#" className="hover:text-[#a855f7]">Web Player</a>
              <a href="#" className="hover:text-[#a855f7]">Mobile App</a>
              <a href="#" className="hover:text-[#a855f7]">Android TV</a>
            </div>
            <div className="flex flex-col gap-3">
              <span className="text-white font-bold">Community</span>
              <a href="#" className="hover:text-[#a855f7]">Discord</a>
              <a href="#" className="hover:text-[#a855f7]">GitHub</a>
              <a href="#" className="hover:text-[#a855f7]">Twitter</a>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-white/5 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-600">
          <p>Strictly Made by Nawaf</p>
          <div className="flex gap-6">
            <span>Obsidian / Neon Edition v2.0</span>
            <span>All Rights Reserved 2026</span>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .glass {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }
        .neon-text-purple {
          text-shadow: 0 0 20px rgba(168, 85, 247, 0.5);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        ::selection {
          background: #a855f7;
          color: white;
        }
        ::-webkit-scrollbar {
          width: 6px;
        }
        ::-webkit-scrollbar-track {
          background: #050505;
        }
        ::-webkit-scrollbar-thumb {
          background: #222;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #a855f7;
        }
        
        video::cue {
          background: rgba(0, 0, 0, 0.7);
          color: white;
          font-family: 'Inter', sans-serif;
          font-weight: bold;
          font-size: 0.8em;
        }
      `}</style>
    </div>
  );
}

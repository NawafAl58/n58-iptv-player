import React, { useState, useRef, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Hls from 'hls.js';
import { 
  Search, Upload, Play, Tv, List, Globe, Film, Clapperboard, 
  Tv2, Baby, Info, Settings, User, LogOut, Subtitles, Languages, 
  Trophy, Zap, AlertCircle, LayoutGrid, ChevronRight, Menu, X
} from 'lucide-react';

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
  { name: 'Movies', ar: 'أفلام', url: 'https://iptv-org.github.io/iptv/categories/movies.m3u', icon: Film },
  { name: 'Series', ar: 'مسلسلات', url: 'https://iptv-org.github.io/iptv/categories/series.m3u', icon: Clapperboard },
  { name: 'Anime & Cartoon', ar: 'أنمي وكرتون', url: 'https://iptv-org.github.io/iptv/categories/animation.m3u', icon: Baby },
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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

    if (priorityKeywords) {
      const filtered = parsedChannels.filter(c => 
        priorityKeywords.some(key => c.name.toLowerCase().includes(key.toLowerCase()))
      );
      filtered.sort((a, b) => {
        const aIdx = priorityKeywords.findIndex(key => a.name.toLowerCase().includes(key.toLowerCase()));
        const bIdx = priorityKeywords.findIndex(key => b.name.toLowerCase().includes(key.toLowerCase()));
        return aIdx - bIdx;
      });
      setChannels(filtered);
    } else {
      setChannels(parsedChannels);
    }
    
    setGroups(Array.from(parsedGroups));
    setSelectedGroup('All');
    setFocusedIndex(-1);
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
    return filteredChannels[0] || null;
  }, [filteredChannels]);

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

  // TV Remote Navigation (Keyboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (currentChannel) {
        if (e.key === 'Backspace' || e.key === 'Escape') {
          setCurrentChannel(null);
        }
        return;
      }

      const columns = 6; // Default columns in grid
      switch (e.key) {
        case 'ArrowRight':
          setFocusedIndex(prev => Math.min(prev + 1, filteredChannels.length - 1));
          break;
        case 'ArrowLeft':
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'ArrowDown':
          setFocusedIndex(prev => {
            if (prev === -1) return 0;
            return Math.min(prev + columns, filteredChannels.length - 1);
          });
          break;
        case 'ArrowUp':
          setFocusedIndex(prev => {
            if (prev < columns) return -1; // Go to hero or nav
            return prev - columns;
          });
          break;
        case 'Enter':
          if (focusedIndex >= 0) {
            setCurrentChannel(filteredChannels[focusedIndex]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (focusedIndex === -1 && heroChannel) {
            setCurrentChannel(heroChannel);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredChannels, focusedIndex, currentChannel, heroChannel]);

  // Scroll focused element into view
  useEffect(() => {
    if (focusedIndex >= 0 && gridRef.current) {
      const element = gridRef.current.children[focusedIndex] as HTMLElement;
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [focusedIndex]);

  const handleSubtitleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && videoRef.current) {
      const url = URL.createObjectURL(file);
      setSubtitleUrl(url);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 flex">
      <Head>
        <title>N58 PREMIUM | Ultra Modern IPTV</title>
      </Head>

      {/* Sidebar Navigation */}
      <aside className={`fixed lg:relative z-[60] h-screen bg-[#080808] border-r border-white/5 transition-all duration-500 ease-in-out flex flex-col ${sidebarOpen ? 'w-72' : 'w-20'} glass-heavy`}>
        <div className="p-6 flex items-center justify-between">
          <h1 className={`font-black tracking-tighter text-xl neon-text-purple bg-gradient-to-r from-[#a855f7] to-[#38bdf8] bg-clip-text text-transparent transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
            N58 PREMIUM
          </h1>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-white/5 rounded-xl transition-colors outline-none focus:ring-2 focus:ring-[#a855f7]">
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
          {DEFAULT_PLAYLISTS.map((p) => (
            <button
              key={p.name}
              onClick={() => loadPlaylist(p)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group outline-none focus:ring-2 focus:ring-[#38bdf8] focus:bg-[#38bdf8]/10 ${activePlaylist.name === p.name ? 'bg-gradient-to-r from-[#a855f7]/20 to-transparent border border-[#a855f7]/30 text-white' : 'text-gray-500 hover:bg-white/5'}`}
            >
              <p.icon size={22} className={activePlaylist.name === p.name ? 'text-[#a855f7] drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : 'group-hover:text-white'} />
              <span className={`font-bold transition-opacity duration-300 ${sidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>{p.ar}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-4">
          <button className="flex items-center gap-4 w-full p-2 text-gray-500 hover:text-white transition-colors outline-none focus:ring-2 focus:ring-white/20 rounded-lg">
            <Settings size={20} />
            <span className={sidebarOpen ? 'block' : 'hidden'}>Settings</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto no-scrollbar relative">
        {/* Top bar */}
        <header className="sticky top-0 z-50 px-8 py-4 flex items-center justify-between glass backdrop-blur-3xl border-b border-white/5">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
             <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-[#38bdf8]" size={18} />
                <input 
                  type="text" 
                  placeholder="Search channels, movies, series..." 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
          </div>
          <div className="flex items-center gap-4 ml-6">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-xs font-bold text-[#a855f7]">PREMIUM USER</span>
              <span className="text-sm font-black">Nawaf Al-Juhni</span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#38bdf8] p-[1px]">
              <div className="w-full h-full bg-[#050505] rounded-[15px] flex items-center justify-center">
                <User size={20} className="text-white" />
              </div>
            </div>
          </div>
        </header>

        {loading && (
          <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-[70]">
            <div className="h-full bg-gradient-to-r from-[#a855f7] via-[#38bdf8] to-[#a855f7] animate-loading-bar shadow-[0_0_15px_#38bdf8]" />
          </div>
        )}

        <div className="p-8">
          {/* Hero Section */}
          {!currentChannel && heroChannel && (
            <section className="relative h-[60vh] rounded-[40px] overflow-hidden mb-12 group border border-white/5 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent z-10" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-transparent z-10" />
              <div className="absolute inset-0 bg-[#a855f7]/5 mix-blend-overlay animate-pulse" />
              
              <img 
                src={heroChannel.logo || "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=2069&auto=format&fit=crop"} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                alt="hero"
              />
              
              <div className="absolute inset-0 z-20 flex flex-col justify-end p-12 lg:p-20 max-w-4xl">
                <div className="flex items-center gap-3 mb-6">
                  <span className="bg-[#38bdf8] text-black text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase shadow-[0_0_20px_rgba(56,189,248,0.5)]">Trending Now</span>
                  <div className="h-px w-12 bg-white/20" />
                  <span className="text-sm font-bold text-gray-400">{activePlaylist.name}</span>
                </div>
                <h2 className="text-5xl lg:text-7xl font-black mb-6 leading-tight tracking-tighter">
                  {heroChannel.name}
                </h2>
                <p className="text-lg text-gray-400 mb-10 line-clamp-2 max-w-2xl font-medium leading-relaxed">
                  Experience ultra-high definition streaming with zero latency. Exclusively curated for Nawaf's Premium IPTV Hub. {heroChannel.group}
                </p>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setCurrentChannel(heroChannel)}
                    className="bg-white text-black px-10 py-4 rounded-2xl font-black flex items-center gap-3 hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] active:scale-95 outline-none focus:ring-4 focus:ring-[#38bdf8]"
                  >
                    <Play fill="black" size={24} /> تشغيل الآن / Watch Now
                  </button>
                  <button className="glass-heavy px-10 py-4 rounded-2xl font-bold flex items-center gap-3 border border-white/10 hover:bg-white/10 transition-all outline-none focus:ring-4 focus:ring-white/20">
                    <Info size={24} /> More Info
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* Video Player */}
          {currentChannel && (
            <section className="mb-12 animate-in fade-in zoom-in-95 duration-500">
              <div className="max-w-7xl mx-auto">
                <div className="relative aspect-video rounded-[32px] overflow-hidden border border-white/10 bg-black shadow-2xl shadow-[#a855f7]/10 p-[2px] bg-gradient-to-br from-white/20 via-transparent to-white/5">
                  <div className="w-full h-full bg-black rounded-[30px] overflow-hidden relative group">
                    <video ref={videoRef} controls className="w-full h-full" crossOrigin="anonymous">
                      {subtitleUrl && <track kind="subtitles" src={subtitleUrl} srcLang="ar" label="Arabic" default />}
                    </video>

                    {/* Custom Player Overlays */}
                    <div className="absolute top-8 left-8 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-4">
                      <button 
                        onClick={() => setShowSubtitleInput(!showSubtitleInput)}
                        className="p-4 glass-heavy rounded-2xl border border-white/10 hover:bg-[#a855f7]/20 transition-all flex items-center gap-3 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-[#a855f7]"
                      >
                        <Subtitles size={20} className="text-[#a855f7]" />
                        Subtitles
                      </button>
                      
                      {showSubtitleInput && (
                        <div className="glass-heavy p-2 rounded-2xl border border-white/10 flex items-center gap-3 animate-in slide-in-from-left-4">
                          <label className="p-2 hover:bg-white/5 rounded-xl cursor-pointer text-[10px] font-black uppercase transition-colors">
                            Upload .SRT / .VTT
                            <input type="file" accept=".srt,.vtt" onChange={handleSubtitleUpload} className="hidden" />
                          </label>
                          <div className="w-px h-6 bg-white/10" />
                          <input 
                            type="text" 
                            placeholder="Paste Subtitle URL..." 
                            className="bg-transparent text-xs p-2 outline-none w-48 font-medium"
                            value={subtitleUrl}
                            onChange={(e) => setSubtitleUrl(e.target.value)}
                          />
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => { setCurrentChannel(null); setSubtitleUrl(''); }}
                      className="absolute top-8 right-8 p-4 glass-heavy rounded-2xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20 text-red-500 outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <LogOut size={20} className="rotate-180" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <h3 className="text-4xl font-black mb-3 flex items-center gap-4">
                      {currentChannel.name}
                      <span className="text-sm bg-[#a855f7]/10 text-[#a855f7] border border-[#a855f7]/20 px-3 py-1 rounded-lg font-black tracking-widest uppercase">Live 4K</span>
                    </h3>
                    <div className="flex items-center gap-6 text-gray-500 font-bold text-sm">
                      <span className="flex items-center gap-2"><Globe size={16} /> {currentChannel.group}</span>
                      <span className="flex items-center gap-2"><User size={16} /> 24,842 watching</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                     <button className="p-4 glass-heavy border border-white/10 rounded-2xl hover:text-[#38bdf8] transition-all"><Zap size={24} /></button>
                     <button className="p-4 glass-heavy border border-white/10 rounded-2xl hover:text-[#a855f7] transition-all"><Upload size={24} /></button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Categories / Groups */}
          <section className="mb-12 overflow-hidden">
            <div className="flex items-center gap-3 mb-8">
              <LayoutGrid className="text-[#a855f7]" size={24} />
              <h4 className="text-2xl font-black uppercase tracking-tighter">Browse Groups</h4>
            </div>
            <div className="flex items-center gap-3 overflow-x-auto pb-4 no-scrollbar">
              {groups.map(group => (
                <button
                  key={group}
                  onClick={() => { setSelectedGroup(group); setFocusedIndex(-1); }}
                  className={`px-8 py-3 rounded-2xl text-sm font-black transition-all border whitespace-nowrap outline-none focus:ring-2 focus:ring-[#38bdf8] ${
                    selectedGroup === group 
                    ? 'bg-[#38bdf8] border-[#38bdf8] text-black shadow-[0_0_25px_rgba(56,189,248,0.4)]' 
                    : 'bg-white/5 border-white/5 text-gray-500 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>
          </section>

          {/* Grid of Content */}
          <section>
            <div className="flex items-center justify-between mb-10">
               <h4 className="text-3xl font-black tracking-tighter flex items-center gap-4">
                  <div className="w-2 h-10 bg-gradient-to-b from-[#a855f7] to-[#38bdf8] rounded-full shadow-[0_0_15px_#a855f7]" />
                  {activePlaylist.ar}
               </h4>
               <span className="text-sm font-bold text-gray-500">{filteredChannels.length} Results</span>
            </div>

            <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-8 gap-y-12">
              {filteredChannels.map((channel, idx) => (
                <button
                  key={idx + channel.name}
                  onClick={() => {
                    setCurrentChannel(channel);
                    setSubtitleUrl('');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onFocus={() => setFocusedIndex(idx)}
                  className={`group flex flex-col gap-4 text-left relative transition-all duration-500 outline-none ${focusedIndex === idx ? 'scale-110 z-50' : 'hover:-translate-y-2'}`}
                >
                  <div className={`aspect-[3/4] rounded-[24px] overflow-hidden bg-[#080808] border transition-all duration-500 relative flex flex-col ${focusedIndex === idx ? 'border-[#38bdf8] shadow-[0_0_40px_rgba(56,189,248,0.2)]' : 'border-white/5 hover:border-[#a855f7]/50'}`}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 opacity-60" />
                    <div className="flex-1 flex items-center justify-center p-6 relative">
                      {channel.logo ? (
                        <img 
                          src={channel.logo} 
                          alt="" 
                          className="w-full h-full object-contain drop-shadow-2xl" 
                          onError={(e) => { (e.target as HTMLImageElement).src = ""; (e.target as HTMLImageElement).classList.add('hidden'); }}
                        />
                      ) : null}
                      <Tv className={`text-white/5 absolute ${channel.logo ? 'hidden' : ''}`} size={64} />
                    </div>
                    
                    <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-[2px]">
                      <div className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform duration-500">
                        <Play fill="black" size={28} />
                      </div>
                    </div>
                  </div>
                  
                  <div className="px-1">
                    <p className={`font-black text-sm leading-tight mb-1 line-clamp-1 transition-colors ${focusedIndex === idx ? 'text-[#38bdf8]' : 'text-gray-200 group-hover:text-white'}`}>
                      {channel.name}
                    </p>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">
                      {channel.group}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="mt-20 p-12 border-t border-white/5 bg-[#080808] relative">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="col-span-1">
              <h5 className="text-2xl font-black neon-text-purple mb-6 bg-gradient-to-r from-[#a855f7] to-[#38bdf8] bg-clip-text text-transparent">N58 PREMIUM</h5>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">The ultimate digital entertainment experience. Designed for performance, style, and absolute luxury.</p>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-white font-black uppercase text-xs tracking-widest">Navigation</span>
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500 font-bold">
                 <a href="#" className="hover:text-[#a855f7] transition-colors">Home</a>
                 <a href="#" className="hover:text-[#a855f7] transition-colors">Movies</a>
                 <a href="#" className="hover:text-[#a855f7] transition-colors">Series</a>
                 <a href="#" className="hover:text-[#a855f7] transition-colors">Sports</a>
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <span className="text-white font-black uppercase text-xs tracking-widest">Connect</span>
              <div className="flex gap-4">
                <button className="p-3 glass-heavy border border-white/5 rounded-xl hover:bg-white/5"><Globe size={20}/></button>
                <button className="p-3 glass-heavy border border-white/5 rounded-xl hover:bg-white/5"><Zap size={20}/></button>
              </div>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-600">
            <p>© 2026 NAWAF AL-JUHNI | INTERACTION COMPANY CA</p>
            <div className="flex gap-8">
              <span>Obsidian / Neon v3.0</span>
              <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/> Systems Optimal</span>
            </div>
          </div>
        </footer>
      </main>

      <style jsx global>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }
        .animate-loading-bar {
          animation: loading-bar 2s infinite ease-in-out;
        }
        .glass-heavy {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
        }
        .neon-text-purple {
          text-shadow: 0 0 30px rgba(168, 85, 247, 0.4);
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        ::selection { background: #a855f7; color: white; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #050505; }
        ::-webkit-scrollbar-thumb { background: #1a1a1a; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #a855f7; }
        
        video::cue {
          background: rgba(0, 0, 0, 0.85);
          color: white;
          font-family: 'Inter', sans-serif;
          font-weight: 900;
          font-size: 0.9em;
          padding: 10px;
        }
      `}</style>
    </div>
  );
}

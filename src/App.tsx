import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Star, Plus, ArrowLeft, Wand2, Loader2, Search, Bookmark, CheckCircle2, 
  Home, X, Calendar, Edit3, ChevronRight, SlidersHorizontal, Trash2,
  Frown, Annoyed, Meh, Smile, Laugh, Film, Clock, Menu, Settings
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- APIキー設定 ---
const tmdbApiKey = import.meta.env?.VITE_TMDB_API_KEY || '';
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// --- カテゴリー定義 ---
const GENRES: Record<string, string> = {
  'おすすめ': '',
  '公開中': 'now_playing',
  '名作アクション': '28',
  'アニメ': '16',
  'ヒューマンドラマ': '18',
  'SF・ファンタジー': '878',
  'ホラー・スリラー': '27',
  'コメディ': '35',
  'ロマンス': '10749'
};
const CATEGORIES = Object.keys(GENRES);

const FACE_RATINGS = [
  { score: 1.0, label: 'クソ映画！', icon: Frown, color: '#7f1d1d' },
  { score: 3.0, label: 'う〜ん...', icon: Annoyed, color: '#9d174d' },
  { score: 5.0, label: '普通', icon: Meh, color: '#a1a1aa' },
  { score: 7.0, label: '面白い', icon: Smile, color: '#ca8a04' },
  { score: 9.0, label: '最高！', icon: Laugh, color: '#b91c1c' },
];

const getFaceRating = (score: number) => {
  if (score === 0 || score === 0.0) return null;
  if (score < 2.0) return FACE_RATINGS[0];
  if (score < 4.0) return FACE_RATINGS[1];
  if (score < 6.0) return FACE_RATINGS[2];
  if (score < 8.0) return FACE_RATINGS[3];
  return FACE_RATINGS[4];
};

const THIS_YEAR = new Date().getFullYear();

const FALLBACK_MOVIES: Record<string, any[]> = {
  'おすすめ': [
    { id: 'm1', title: '劇場版 呪術廻戦 0', genre: 'アニメ', posterUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/mktxHLSKIK1aXjJ9UxaA3wT69dO.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w1280/3G1Q5xF40HnUBHOEvO1mNDcZ4B0.jpg', releaseDate: '2021-12-24', apiSynopsis: '幼少のころ、幼なじみの祈本里香を交通事故により目の前で失った乙骨憂太。', voteAverage: '8.5', runtimeMinutes: 105 }
  ]
};

// --- ダブルスライダー ---
const DualRangeSlider = ({ min, max, step = 1, minVal, maxVal, onChange, unit = "" }: { min: number; max: number; step?: number; minVal: number; maxVal: number; onChange: (minV: number, maxV: number) => void; unit?: string; }) => {
  const [localMin, setLocalMin] = useState(minVal.toString());
  const [localMax, setLocalMax] = useState(maxVal.toString());
  const [minThumbZ, setMinThumbZ] = useState(30); 

  useEffect(() => { setLocalMin(minVal.toString()); setLocalMax(maxVal.toString()); }, [minVal, maxVal]);

  const handleMinBlur = () => {
    let val = Number(localMin);
    if (isNaN(val)) val = min;
    val = Math.max(min, Math.min(val, maxVal - step));
    onChange(val, maxVal);
    setLocalMin(val.toString());
  };

  const handleMaxBlur = () => {
    let val = Number(localMax);
    if (isNaN(val)) val = max;
    val = Math.min(max, Math.max(val, minVal + step));
    onChange(minVal, val);
    setLocalMax(val.toString());
  };

  const minPercent = Math.min(100, Math.max(0, ((minVal - min) / (max - min)) * 100));
  const maxPercent = Math.min(100, Math.max(0, ((maxVal - min) / (max - min)) * 100));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const val = min + percent * (max - min);
    if (Math.abs(val - minVal) < Math.abs(val - maxVal)) {
      setMinThumbZ(40);
    } else {
      setMinThumbZ(30);
    }
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 flex-1">
          <input type="text" inputMode="numeric" value={localMin} onChange={e => setLocalMin(e.target.value)} onBlur={handleMinBlur} className="w-full bg-transparent text-white font-bold text-center focus:outline-none ios-safe-input" />
          {unit && <span className="text-[10px] text-zinc-400 font-medium shrink-0">{unit}</span>}
        </div>
        <span className="text-zinc-500 font-bold text-xs">〜</span>
        <div className="flex items-center gap-1 bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 flex-1">
          <input type="text" inputMode="numeric" value={localMax} onChange={e => setLocalMax(e.target.value)} onBlur={handleMaxBlur} className="w-full bg-transparent text-white font-bold text-center focus:outline-none ios-safe-input" />
          {unit && <span className="text-[10px] text-zinc-400 font-medium shrink-0">{unit}</span>}
        </div>
      </div>
      <div className="relative w-full h-8 flex items-center select-none" onPointerDown={handlePointerDown}>
        <div className="absolute w-full h-2 bg-zinc-800 rounded-lg" />
        <div className="absolute h-2 bg-red-600 rounded-lg" style={{ left: `${minPercent}%`, width: `${maxPercent - minPercent}%` }} />
        
        <input 
          type="range" min={min} max={max} step={step} value={minVal} 
          onChange={e => onChange(Math.min(Number(e.target.value), maxVal - step), maxVal)} 
          className="absolute w-full h-2 opacity-0 custom-range-slider" 
          style={{ zIndex: minThumbZ }} 
        />
        <input 
          type="range" min={min} max={max} step={step} value={maxVal} 
          onChange={e => onChange(minVal, Math.max(Number(e.target.value), minVal + step))} 
          className="absolute w-full h-2 opacity-0 custom-range-slider" 
          style={{ zIndex: minThumbZ === 40 ? 30 : 40 }} 
        />
        
        <div className="absolute w-6 h-6 bg-white border-[3px] border-red-600 rounded-full -translate-x-1/2 pointer-events-none z-20 shadow-md" style={{ left: `${minPercent}%` }} />
        <div className="absolute w-6 h-6 bg-white border-[3px] border-red-600 rounded-full -translate-x-1/2 pointer-events-none z-20 shadow-md" style={{ left: `${maxPercent}%` }} />
      </div>
    </div>
  );
};

type FilterState = {
  yearMin: number; yearMax: number;
  runtimeMin: number; runtimeMax: number;
  ratingMin: number; ratingMax: number;
  enableYear: boolean; enableRuntime: boolean; enableRating: boolean;
};
const defaultFilters: FilterState = {
  yearMin: 1900, yearMax: THIS_YEAR,
  runtimeMin: 0, runtimeMax: 300,
  ratingMin: 0.0, ratingMax: 10.0,
  enableYear: false, enableRuntime: false, enableRating: false
};

const runtimeCache = new Map<string, number>();
const castCheckCache = new Map<string, boolean>();

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [myCollection, setMyCollection] = useState<any[]>([]);

  const [tabStates, setTabStates] = useState<Record<string, { modalMode: string | null, viewingMovie: any | null }>>({
    home: { modalMode: null, viewingMovie: null },
    genre_view: { modalMode: null, viewingMovie: null },
    watchlist: { modalMode: null, viewingMovie: null },
    watched: { modalMode: null, viewingMovie: null },
  });

  const currentModalMode = tabStates[activeTab]?.modalMode || null;
  const currentViewingMovie = tabStates[activeTab]?.viewingMovie || null;

  const updateModalState = (mode: string | null, movie: any | null = null) => {
    setTabStates(prev => ({
      ...prev,
      [activeTab]: { modalMode: mode, viewingMovie: movie || prev[activeTab].viewingMovie }
    }));
  };

  const [fromTab, setFromTab] = useState<string>('home');
  const [homeCategoriesData, setHomeCategoriesData] = useState<Record<string, any[]>>({});
  const [isHomeLoading, setIsHomeLoading] = useState(true);
  
  const [apiGenres, setApiGenres] = useState<{ id: number; name: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTitle, setSearchTitle] = useState('');
  const [searchPerson, setSearchPerson] = useState<{ id: number, name: string, type: 'cast' | 'director' } | null>(null);
  const [searchCollection, setSearchCollection] = useState<{ id: number, name: string } | null>(null);
  
  const [showFilters, setShowFilters] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  
  const [tempFilters, setTempFilters] = useState<FilterState>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(defaultFilters);
  
  const isFilterApplied = appliedFilters.enableYear || appliedFilters.enableRuntime || appliedFilters.enableRating;
  const [forceSearch, setForceSearch] = useState(false); 

  const [displayList, setDisplayList] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortOrder, setSortOrder] = useState<string>('release_desc');
  
  const [apiPage, setApiPage] = useState(1);
  const [nextApiPage, setNextApiPage] = useState(1);
  const [totalApiPages, setTotalApiPages] = useState(1);
  
  const [genreViewCategory, setGenreViewCategory] = useState<string | null>(null);

  const [editScore, setEditScore] = useState(0.0);
  const [editAiContent, setEditAiContent] = useState('');
  const [editMyReview, setEditMyReview] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [movieExtraDetails, setMovieExtraDetails] = useState<any>(null);
  const [relatedMovies, setRelatedMovies] = useState<any[]>([]);
  const [isExtraLoading, setIsExtraLoading] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroTouchStartX = useRef(0);
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  
  const [showReviewConfirm, setShowReviewConfirm] = useState(false); 
  const [confirmMovie, setConfirmMovie] = useState<any | null>(null);

  const detailPosterRef = useRef<HTMLImageElement>(null);
  const [flyingPoster, setFlyingPoster] = useState<{ url: string; start: DOMRect; target: DOMRect } | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'settings'>('main');
  const menuRef = useRef<HTMLDivElement>(null);
  
  const [showAdult, setShowAdult] = useState(() => JSON.parse(localStorage.getItem('showAdult') || 'false'));
  const [showIncomplete, setShowIncomplete] = useState(() => JSON.parse(localStorage.getItem('showIncomplete') || 'false'));

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwipingOutRef = useRef(false);
  const [swipeOutTarget, setSwipeOutTarget] = useState<'detail' | 'genre' | 'search' | null>(null);

  useEffect(() => {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.setAttribute('content', '#141414');
    document.body.style.backgroundColor = '#141414';
  }, []);

  useEffect(() => {
    localStorage.setItem('showAdult', JSON.stringify(showAdult));
    localStorage.setItem('showIncomplete', JSON.stringify(showIncomplete));
  }, [showAdult, showIncomplete]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        const target = event.target as Element;
        if (!target.closest('#hamburger-btn')) {
          setIsMenuOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) {
      const timer = setTimeout(() => setMenuView('main'), 300);
      return () => clearTimeout(timer);
    }
  }, [isMenuOpen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent, type: 'detail' | 'genre' | 'search') => {
    if (type === 'search' && !isSearchActive) return;

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    if (touchStartX.current > 100) return;

    if (diffX > 50 && Math.abs(diffY) < 60) {
      if (type === 'detail') {
        // 作品詳細画面のみスライドアニメーションを維持
        isSwipingOutRef.current = true;
        setSwipeOutTarget(type);
        setTimeout(() => {
          updateModalState(null);
          setSwipeOutTarget(null);
          isSwipingOutRef.current = false;
        }, 250);
      } else if (type === 'genre') {
        // 全て見る画面：フリックで即時戻る
        setActiveTab('home');
        setDisplayList([]);
      } else if (type === 'search') {
        // 検索後画面：フリックで即時リセット
        setSearchTitle('');
        setSelectedTags([]);
        setSearchPerson(null);
        setSearchCollection(null);
        setTempFilters(defaultFilters);
        setAppliedFilters(defaultFilters);
        setForceSearch(false);
        setShowFilters(false);
        setDisplayList([]);
        setApiPage(1);
        setNextApiPage(1);
        setSortOrder('release_desc');
      }
    }
  };

  const isSearchActive = forceSearch || searchTitle !== '' || selectedTags.length > 0 || isFilterApplied || searchPerson !== null || searchCollection !== null;

  useEffect(() => {
    const fetchApiGenres = async () => {
      if (!tmdbApiKey) return;
      try {
        const res = await fetch(`https://api.themoviedb.org/3/genre/movie/list?api_key=${tmdbApiKey}&language=ja-JP`);
        const data = await res.json();
        if (data.genres) {
          setApiGenres(data.genres.map((g: any) => ({
            ...g, name: g.name === '履歴' ? '歴史' : (g.name === '謎' ? 'ミステリー' : g.name)
          })));
        }
      } catch (err) { }
    };
    fetchApiGenres();
  }, []);

  useEffect(() => {
    const fetchCollection = async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase.from('user_movies').select('*');
        if (data) {
          setMyCollection(data.map(item => ({
            movieId: item.movie_id, movieData: item.movie_data, status: item.status,
            score: item.score || 0, aiContent: item.ai_content || '', myReview: item.my_review || '',
            updatedAt: new Date(item.updated_at).getTime()
          })));
        }
      } catch (err) {}
    };
    fetchCollection();
  }, []);

  useEffect(() => {
    const fetchHomeMovies = async () => {
      setIsHomeLoading(true);
      const newCategoryData: Record<string, any[]> = {};
      
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${yyyy}-${mm}-${dd}`;
      
      const commonFilters = `&include_adult=${showAdult ? 'true' : 'false'}` 
                          + (!showIncomplete ? '&vote_count.gte=3' : '')
                          + `&primary_release_date.lte=${todayStr}`;

      for (const cat of CATEGORIES) {
        let url = `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbApiKey}&language=ja-JP&page=1`;
        if (cat === '公開中') {
          url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${tmdbApiKey}&language=ja-JP&region=JP&page=1`;
        } else if (GENRES[cat]) {
          url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&language=ja-JP&with_genres=${GENRES[cat]}&sort_by=popularity.desc&page=1${commonFilters}`;
        }
        
        try {
          const res = await fetch(url);
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            let results = data.results.filter((movie: any) => {
              if (!movie.release_date || movie.release_date > todayStr) return false;
              if (!showAdult && movie.adult) return false;
              if (!showIncomplete) {
                if (!movie.poster_path) return false;
                if (movie.vote_count < 3) return false;
                if (!movie.genre_ids || movie.genre_ids.length === 0) return false;
              }
              return true;
            });

            if (cat === '公開中') {
              const checkedResults = await Promise.all(results.map(async (m: any) => {
                let hasCast = true;
                if (!showIncomplete && m.vote_count < 3) {
                  if (castCheckCache.has(m.id.toString())) {
                    hasCast = castCheckCache.get(m.id.toString())!;
                  } else {
                    try {
                      const credRes = await fetch(`https://api.themoviedb.org/3/movie/${m.id}/credits?api_key=${tmdbApiKey}`);
                      const credData = await credRes.json();
                      hasCast = credData.cast && credData.cast.length > 0;
                      castCheckCache.set(m.id.toString(), hasCast);
                    } catch(e) { hasCast = true; }
                  }
                }
                const isValid = m.poster_path && m.genre_ids && m.genre_ids.length > 0 && !(m.vote_count < 3 && !hasCast);
                return isValid ? m : null;
              }));
              results = checkedResults.filter(Boolean);
            }

            if (cat !== '公開中') results = results.sort(() => Math.random() - 0.5);
            newCategoryData[cat] = results.map((movie: any) => ({
              id: movie.id.toString(), title: movie.title || movie.original_title, genre: cat,
              posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
              backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : '',
              releaseDate: movie.release_date || '不明', apiSynopsis: movie.overview || 'あらすじ情報がありません。',
              voteAverage: movie.vote_average ? movie.vote_average.toFixed(1) : '0.0', runtimeMinutes: 0
            }));
          } else { newCategoryData[cat] = FALLBACK_MOVIES['おすすめ']; }
        } catch (err) { newCategoryData[cat] = FALLBACK_MOVIES['おすすめ']; }
      }
      setHomeCategoriesData(newCategoryData);
      setIsHomeLoading(false);
    };
    fetchHomeMovies();
  }, [showAdult, showIncomplete]);

  useEffect(() => {
    const recommendedList = homeCategoriesData['おすすめ'] || [];
    if (recommendedList.length === 0) return;
    const topLength = Math.min(recommendedList.length, 10);
    const timer = setInterval(() => { setHeroIndex(prev => (prev + 1) % topLength); }, 5000);
    return () => clearInterval(timer);
  }, [homeCategoriesData, heroIndex]);

  useEffect(() => {
    const fetchMovieDetails = async () => {
      if (!currentViewingMovie || !tmdbApiKey) return;
      setIsExtraLoading(true);
      try {
        const [detailRes, creditsRes, watchRes, recommendationsRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${currentViewingMovie.id}?api_key=${tmdbApiKey}&language=ja-JP`),
          fetch(`https://api.themoviedb.org/3/movie/${currentViewingMovie.id}/credits?api_key=${tmdbApiKey}&language=ja-JP`),
          fetch(`https://api.themoviedb.org/3/movie/${currentViewingMovie.id}/watch/providers?api_key=${tmdbApiKey}`),
          fetch(`https://api.themoviedb.org/3/movie/${currentViewingMovie.id}/recommendations?api_key=${tmdbApiKey}&language=ja-JP&page=1`)
        ]);
        const detail = await detailRes.json();
        const credits = await creditsRes.json();
        const watch = await watchRes.json();
        const recommendations = await recommendationsRes.json();

        const directorData = credits.crew?.find((c: any) => c.job === 'Director');
        const directorObj = directorData ? { id: directorData.id, name: directorData.name, type: 'director' as const } : null;
        const castObjs = credits.cast?.slice(0, 5).map((c: any) => ({ id: c.id, name: c.name, type: 'cast' as const })) || [];
        
        const productionCompanies = detail.production_companies?.map((p: any) => p.name) || [];
        const runtimeMinutes = detail.runtime || 0;
        const runtime = runtimeMinutes ? `${runtimeMinutes}分` : '';
        runtimeCache.set(currentViewingMovie.id, runtimeMinutes);
        
        const collection = detail.belongs_to_collection ? { id: detail.belongs_to_collection.id, name: detail.belongs_to_collection.name } : null;
        const encodedTitle = encodeURIComponent(currentViewingMovie.title);
        
        const streamingServices = (watch.results?.JP?.flatrate || []).map((p: any) => {
          let customUrl = p.link || 'https://www.themoviedb.org/';
          switch (p.provider_name) {
            case 'Netflix': customUrl = `https://www.netflix.com/search?q=${encodedTitle}`; break;
            case 'Amazon Prime Video': customUrl = `https://www.amazon.co.jp/s?k=${encodedTitle}&i=instant-video`; break;
            case 'U-NEXT': customUrl = `https://video.unext.jp/freeword?query=${encodedTitle}`; break;
            case 'Hulu': customUrl = `https://www.hulu.jp/search?q=${encodedTitle}`; break;
            case 'Disney Plus': customUrl = `https://www.disneyplus.com/search?q=${encodedTitle}`; break;
            case 'Apple TV Plus': customUrl = `https://tv.apple.com/jp/search?q=${encodedTitle}`; break;
            default: customUrl = `https://www.google.com/search?q=${encodedTitle}+${encodeURIComponent(p.provider_name)}`; break;
          }
          return { name: p.provider_name, logo: `https://image.tmdb.org/t/p/w92${p.logo_path}`, url: customUrl };
        });

        setMovieExtraDetails({ 
          runtime, runtimeMinutes, directorObj, castObjs, productionCompanies, streamingServices, collection,
          genres: (detail.genres || []).map((g: any) => ({...g, name: g.name === '履歴' ? '歴史' : (g.name === '謎' ? 'ミステリー' : g.name)}))
        });

        if (recommendations.results) {
          setRelatedMovies(recommendations.results.slice(0, 10).map((rm: any) => ({
            id: rm.id.toString(), title: rm.title, posterUrl: rm.poster_path ? `https://image.tmdb.org/t/p/w500${rm.poster_path}` : '',
            releaseDate: rm.release_date || '不明', apiSynopsis: rm.overview || '', voteAverage: rm.vote_average ? rm.vote_average.toFixed(1) : '0.0'
          })));
        }
      } catch (err) {} finally { setIsExtraLoading(false); }
    };
    if (currentModalMode === 'detail' || currentModalMode === 'delete_confirm') { 
      setMovieExtraDetails(null); setRelatedMovies([]); fetchMovieDetails(); 
    }
  }, [currentViewingMovie, currentModalMode]);

  const getApiSortParam = (order: string) => {
    switch (order) {
      case 'release_desc': return 'primary_release_date.desc';
      case 'release_asc': return 'primary_release_date.asc';
      case 'rating_desc': return 'vote_average.desc';
      case 'rating_asc': return 'vote_average.asc';
      default: return 'popularity.desc';
    }
  };

  const getSortedBlock = useCallback((movies: any[]) => {
    if (sortOrder === 'runtime_desc') return [...movies].sort((a, b) => (runtimeCache.get(b.id) ?? b.runtimeMinutes ?? 0) - (runtimeCache.get(a.id) ?? a.runtimeMinutes ?? 0));
    if (sortOrder === 'runtime_asc') return [...movies].sort((a, b) => (runtimeCache.get(a.id) ?? a.runtimeMinutes ?? 0) - (runtimeCache.get(b.id) ?? b.runtimeMinutes ?? 0));
    
    if (sortOrder === 'release_desc') return [...movies].sort((a, b) => new Date(b.releaseDate === '不明' || !b.releaseDate ? '1900-01-01' : b.releaseDate).getTime() - new Date(a.releaseDate === '不明' || !a.releaseDate ? '1900-01-01' : a.releaseDate).getTime());
    if (sortOrder === 'release_asc') return [...movies].sort((a, b) => new Date(a.releaseDate === '不明' || !a.releaseDate ? '1900-01-01' : a.releaseDate).getTime() - new Date(b.releaseDate === '不明' || !b.releaseDate ? '1900-01-01' : b.releaseDate).getTime());
    if (sortOrder === 'rating_desc') return [...movies].sort((a, b) => parseFloat(b.voteAverage || '0') - parseFloat(a.voteAverage || '0'));
    if (sortOrder === 'rating_asc') return [...movies].sort((a, b) => parseFloat(a.voteAverage || '0') - parseFloat(b.voteAverage || '0'));

    return movies;
  }, [sortOrder]);

  useEffect(() => {
    if (!isSearchActive && activeTab !== 'genre_view') { 
      if (!isSwipingOutRef.current) {
        setDisplayList([]); 
      }
      setIsSearching(false); 
      return; 
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        if (!tmdbApiKey) return;
        
        const isNowPlaying = (activeTab === 'genre_view' && genreViewCategory === '公開中');
        const isNormalGenre = (activeTab === 'genre_view' && genreViewCategory && genreViewCategory !== '公開中');

        let sortParam = isNormalGenre ? 'popularity.desc' : getApiSortParam(sortOrder);
        
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        const buildUrl = (page: number) => {
          if (isNowPlaying) return `https://api.themoviedb.org/3/movie/now_playing?api_key=${tmdbApiKey}&language=ja-JP&region=JP&page=${page}`;
          if (searchTitle !== '') return `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&language=ja-JP&query=${encodeURIComponent(searchTitle)}&page=${page}&include_adult=${showAdult ? 'true' : 'false'}`;
          
          let url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&language=ja-JP&sort_by=${sortParam}&page=${page}`;
          url += `&include_adult=${showAdult ? 'true' : 'false'}`;
          if (!showIncomplete) url += `&vote_count.gte=3`;

          let maxDateStr = todayStr;
          if (isSearchActive && appliedFilters.enableYear) {
             const filterMaxDate = `${appliedFilters.yearMax}-12-31`;
             if (filterMaxDate < todayStr) maxDateStr = filterMaxDate;
             url += `&primary_release_date.gte=${appliedFilters.yearMin}-01-01`;
          }
          url += `&primary_release_date.lte=${maxDateStr}`;

          if (isSearchActive) {
            if (appliedFilters.enableRating) url += `&vote_average.gte=${appliedFilters.ratingMin}&vote_average.lte=${appliedFilters.ratingMax}`;
            if (searchPerson) url += searchPerson.type === 'cast' ? `&with_cast=${searchPerson.id}` : `&with_crew=${searchPerson.id}`;
            else if (selectedTags.length > 0) url += `&with_genres=${selectedTags.join(',')}`;
          } else if (isNormalGenre) {
            url += `&with_genres=${GENRES[genreViewCategory]}`;
          }
          return url;
        };

        let fetchedMovies: any[] = [];
        let maxTotalPages = 1;
        let newNextApiPage = apiPage;
        
        if (searchCollection) {
          const res = await fetch(`https://api.themoviedb.org/3/collection/${searchCollection.id}?api_key=${tmdbApiKey}&language=ja-JP`);
          const data = await res.json();
          if (data.parts) fetchedMovies = data.parts;
          maxTotalPages = 1;
          newNextApiPage = 2;
        } else if (isNowPlaying && apiPage === 1) {
          const pagesToFetch = [1, 2, 3, 4, 5];
          const resArray = await Promise.all(pagesToFetch.map(p => fetch(buildUrl(p)).catch(()=>null)));
          const dataArray = await Promise.all(resArray.filter(r => r).map(r => (r as Response).json().catch(()=>({}))));
          
          dataArray.forEach(data => {
            if (data.total_pages > maxTotalPages) maxTotalPages = data.total_pages;
            if (data.results) fetchedMovies.push(...data.results);
          });
          newNextApiPage = 6;
        } else {
          let loopCount = 0;
          let currentApiPage = apiPage;
          const targetCount = 60; 
          
          while (fetchedMovies.length < targetCount && loopCount < 20) {
            const res = await fetch(buildUrl(currentApiPage));
            const data = await res.json();
            if (data.total_pages) maxTotalPages = data.total_pages;
            if (currentApiPage > maxTotalPages) break;

            if (data.results && data.results.length > 0) {
              const filtered = data.results.filter((movie: any) => {
                if (!movie.release_date || movie.release_date > todayStr) return false;
                if (!showAdult && movie.adult) return false;
                if (!showIncomplete) {
                  if (!movie.poster_path) return false;
                  if (movie.vote_count < 3) return false;
                  if (!movie.genre_ids || movie.genre_ids.length === 0) return false;
                }
                const releaseYear = parseInt(movie.release_date.substring(0, 4) || '0');
                const vote = movie.vote_average || 0;
                let keep = true;
                if (appliedFilters.enableYear) keep = keep && (releaseYear >= appliedFilters.yearMin && releaseYear <= appliedFilters.yearMax);
                if (appliedFilters.enableRating) keep = keep && (vote >= appliedFilters.ratingMin && vote <= appliedFilters.ratingMax);
                return keep;
              });
              fetchedMovies.push(...filtered);
            } else { break; }
            currentApiPage++;
            loopCount++;
          }
          newNextApiPage = currentApiPage;
        }
        
        setTotalApiPages(maxTotalPages);
        setNextApiPage(newNextApiPage);

        let uniqueMap = new Map();
        fetchedMovies.forEach(m => {
          if (!uniqueMap.has(m.id)) uniqueMap.set(m.id, m);
        });
        let uniqueResults = Array.from(uniqueMap.values());

        if (selectedTags.length > 0 && searchTitle !== '') {
          uniqueResults = uniqueResults.filter((m: any) => {
            if (!m.genre_ids) return false;
            return selectedTags.every(tId => m.genre_ids.includes(Number(tId)));
          });
        }

        if (isNowPlaying && !showIncomplete) {
          const checkedPublicMovies = await Promise.all(uniqueResults.map(async (m: any) => {
            if (!m.poster_path || !m.genre_ids || m.genre_ids.length === 0) return null;
            if (m.vote_count < 3) {
              let hasCast = true;
              if (castCheckCache.has(m.id.toString())) hasCast = castCheckCache.get(m.id.toString())!;
              else {
                try {
                  const credRes = await fetch(`https://api.themoviedb.org/3/movie/${m.id}/credits?api_key=${tmdbApiKey}`);
                  const credData = await credRes.json();
                  hasCast = credData.cast && credData.cast.length > 0;
                  castCheckCache.set(m.id.toString(), hasCast);
                } catch(e) { hasCast = true; }
              }
              if (!hasCast) return null;
            }
            return m;
          }));
          uniqueResults = checkedPublicMovies.filter(Boolean);
        }

        const mapped = uniqueResults.map((m: any) => ({
          id: m.id.toString(), title: m.title || m.original_title, posterUrl: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : '',
          releaseDate: m.release_date || '不明', apiSynopsis: m.overview || '', voteAverage: m.vote_average ? m.vote_average.toFixed(1) : '0.0', runtimeMinutes: 0
        }));

        let fullyFiltered = mapped;
        
        if ((appliedFilters.enableRuntime || sortOrder === 'runtime_desc' || sortOrder === 'runtime_asc') && !isNormalGenre) {
          const resultsWithRuntime = await Promise.all(mapped.map(async (m: any) => {
            if (runtimeCache.has(m.id)) return { ...m, runtimeMinutes: runtimeCache.get(m.id) };
            try {
              const detailRes = await fetch(`https://api.themoviedb.org/3/movie/${m.id}?api_key=${tmdbApiKey}`);
              const detail = await detailRes.json();
              const rt = detail.runtime || 0;
              runtimeCache.set(m.id, rt);
              return { ...m, runtimeMinutes: rt };
            } catch(e) { return { ...m, runtimeMinutes: 0 }; }
          }));
          fullyFiltered = resultsWithRuntime.filter(m => {
            if (!appliedFilters.enableRuntime) return true;
            return m.runtimeMinutes >= appliedFilters.runtimeMin && m.runtimeMinutes <= appliedFilters.runtimeMax;
          });
        }

        if (apiPage === 1) {
          setDisplayList(getSortedBlock(fullyFiltered));
        } else {
          setDisplayList(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newItems = fullyFiltered.filter(f => !existingIds.has(f.id));
            return [...prev, ...getSortedBlock(newItems)];
          });
        }
      } catch (err) {} finally { setIsSearching(false); }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTitle, selectedTags, appliedFilters, forceSearch, activeTab, genreViewCategory, apiPage, sortOrder, getSortedBlock, searchPerson, searchCollection, showAdult, showIncomplete]);

  useEffect(() => {
    setApiPage(1);
    setNextApiPage(1);
  }, [sortOrder]);

  const handleApplyFilters = () => {
    setAppliedFilters(tempFilters);
    setShowFilters(false);
    setApiPage(1);
    setNextApiPage(1);
    if (searchTitle === '' && selectedTags.length === 0 && searchPerson === null && searchCollection === null && !tempFilters.enableYear && !tempFilters.enableRuntime && !tempFilters.enableRating) {
      setForceSearch(true);
    } else {
      setForceSearch(false);
    }
  };

  const getCollectionData = useCallback((movieId: string) => {
    return myCollection.find(item => item.movieId === movieId);
  }, [myCollection]);

  const toggleTagSelection = (genreId: string) => {
    setSelectedTags(prev => prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId]);
    setApiPage(1); setNextApiPage(1); setForceSearch(false); setSearchPerson(null); setSearchCollection(null);
  };

  const handlePersonSearch = (person: { id: number, name: string, type: 'cast' | 'director' }) => {
    setSearchTitle(''); setSelectedTags([]); setSearchPerson(person); setSearchCollection(null);
    setApiPage(1); setNextApiPage(1); setForceSearch(false); setActiveTab('home'); updateModalState(null);
  };

  const handleCollectionSearch = (collection: { id: number, name: string }) => {
    setSearchTitle(''); setSelectedTags([]); setSearchPerson(null); setSearchCollection(collection);
    setApiPage(1); setNextApiPage(1); setForceSearch(false); setActiveTab('home'); updateModalState(null);
  };
  
  const clearPersonSearch = () => {
    setSearchPerson(null);
    if (!searchTitle && selectedTags.length === 0 && !isFilterApplied && searchCollection === null) resetSearch();
    else { setApiPage(1); setNextApiPage(1); setForceSearch(true); }
  };

  const clearCollectionSearch = () => {
    setSearchCollection(null);
    if (!searchTitle && selectedTags.length === 0 && !isFilterApplied && searchPerson === null) resetSearch();
    else { setApiPage(1); setNextApiPage(1); setForceSearch(true); }
  };

  const resetSearch = () => {
    setSearchTitle(''); setSelectedTags([]); setSearchPerson(null); setSearchCollection(null);
    setTempFilters(defaultFilters); setAppliedFilters(defaultFilters); setShowFilters(false);
    setApiPage(1); setNextApiPage(1); setSortOrder('release_desc'); setForceSearch(false); setDisplayList([]);
  };

  const handleOpenGenreList = (category: string) => {
    setGenreViewCategory(category); setSortOrder('release_desc'); setApiPage(1); setNextApiPage(1); setDisplayList([]);
    setTabStates(prev => ({ ...prev, genre_view: { modalMode: null, viewingMovie: null } }));
    setActiveTab('genre_view');
  };

  const openDetailModal = (movie: any, originTab: string) => {
    setFromTab(originTab); updateModalState('detail', movie);
  };

  const openReviewModal = (movie: any) => {
    const existing = getCollectionData(movie.id);
    setEditScore(existing?.score || 0.0);
    setEditAiContent(existing?.aiContent ?? '');
    setEditMyReview(existing?.myReview ?? '');
    updateModalState('review', movie);
  };

  const saveToSupabase = async (payload: any) => {
    if (!supabase) return;
    try {
      await supabase.from('user_movies').upsert({
        movie_id: payload.movieId, movie_data: payload.movieData, status: payload.status,
        score: payload.score || null, ai_content: payload.aiContent || null, my_review: payload.myReview || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'movie_id' });
    } catch (err) {}
  };

  const handleDeleteFromCollection = async (movieId: string) => {
    setMyCollection(prev => prev.filter(item => item.movieId !== movieId));
    if (supabase) await supabase.from('user_movies').delete().eq('movie_id', movieId);
    updateModalState(null);
  };

  const handleBatchDelete = async () => {
    const idsToDelete = Array.from(selectedForDeletion);
    setMyCollection(prev => prev.filter(item => !idsToDelete.includes(item.movieId)));
    if (supabase) await supabase.from('user_movies').delete().in('movie_id', idsToDelete);
    setSelectedForDeletion(new Set()); setIsSelectionMode(false); setShowBatchDeleteConfirm(false);
  };

  const triggerFlyAnimation = (targetTab: 'watchlist' | 'watched', movieUrl: string, onStart: () => void) => {
    const targetEl = document.getElementById(`tab-btn-${targetTab}`);
    
    if (targetEl) {
      const targetRect = targetEl.getBoundingClientRect();
      
      // 画面中央に大きめのポスター（幅140px, 高さ210px）を強制的に出現させる
      const startWidth = 140;
      const startHeight = 210;
      const startLeft = (window.innerWidth - startWidth) / 2;
      const startTop = (window.innerHeight - startHeight) / 2 - 30; // 画面中央より少し上
      
      const startRect = {
        top: startTop,
        left: startLeft,
        width: startWidth,
        height: startHeight,
      };

      setFlyingPoster({ url: movieUrl, start: startRect as DOMRect, target: targetRect });
      
      // ラグを防ぐため、裏の重い処理を少し遅らせる
      setTimeout(() => {
        onStart();
      }, 50);
      
      setTimeout(() => { setFlyingPoster(null); }, 900);
    } else { 
      onStart(); 
    }
  };

  const handleAddWatchlist = async (movie: any) => {
    triggerFlyAnimation('watchlist', movie.posterUrl, async () => {
      updateModalState(null); 
      const newEntry = { movieId: movie.id, movieData: movie, status: 'watchlist', updatedAt: Date.now() };
      setMyCollection(prev => [...prev.filter(item => item.movieId !== movie.id), newEntry]);
      await saveToSupabase(newEntry);
    });
  };

  const handleQuickWatch = async () => {
    if (!currentViewingMovie) return;
    setConfirmMovie(currentViewingMovie);
    triggerFlyAnimation('watched', currentViewingMovie.posterUrl, () => {
      updateModalState(null); setShowReviewConfirm(true); 
    });
  };

  const confirmQuickWatch = async (doReview: boolean) => {
    if (!confirmMovie) return;
    setShowReviewConfirm(false);
    const existing = getCollectionData(confirmMovie.id);
    const newEntry = {
      movieId: confirmMovie.id, movieData: confirmMovie, status: 'watched',
      score: existing?.score || 0.0, aiContent: existing?.aiContent || '', myReview: existing?.myReview || '', updatedAt: Date.now()
    };
    setMyCollection(prev => [...prev.filter(item => item.movieId !== confirmMovie.id), newEntry]);
    saveToSupabase(newEntry);

    if (doReview) {
      setActiveTab('watched');
      setTabStates(prev => ({ 
        ...prev, watchlist: { modalMode: null, viewingMovie: null }, watched: { modalMode: 'review', viewingMovie: confirmMovie } 
      }));
      setEditScore(existing?.score || 0.0); setEditAiContent(existing?.aiContent ?? ''); setEditMyReview(existing?.myReview ?? '');
    }
    setConfirmMovie(null);
  };

  const handleSaveReview = async () => {
    if (!currentViewingMovie) return;
    const existing = getCollectionData(currentViewingMovie.id);
    const isDirectReview = !existing || existing.status === 'none';
    const reviewEntry = {
      movieId: currentViewingMovie.id, movieData: currentViewingMovie, status: 'watched',
      score: Number(editScore.toFixed(1)), aiContent: editAiContent, myReview: editMyReview, updatedAt: Date.now()
    };
    setMyCollection(prev => [...prev.filter(item => item.movieId !== currentViewingMovie.id), reviewEntry]);
    await saveToSupabase(reviewEntry);

    if (isDirectReview && currentModalMode === 'review') {
      triggerFlyAnimation('watched', currentViewingMovie.posterUrl, () => { updateModalState(null); });
    } else { updateModalState(null); }
  };

  const handleGenerateAiPlot = async () => {
    if (!currentViewingMovie) return;
    setIsAiLoading(true);
    setTimeout(() => {
      setEditAiContent(`【『${currentViewingMovie.title}』の内容・展開】\n予測不可能なプロットが展開され、登場人物たちの葛藤が鮮やかに描かれます。\n\n【結末・考察】\nラストの感動的なカタルシスは必見のクオリティです。`);
      setIsAiLoading(false);
    }, 1500);
  };

  const handleTabClick = (targetTab: string) => {
    if (activeTab === targetTab) {
      if (targetTab === 'home') resetSearch();
      setTabStates(prev => ({ ...prev, [targetTab]: { modalMode: null, viewingMovie: null } }));
      setIsSelectionMode(false);
    } else { setActiveTab(targetTab); }
  };

  const handleAppTitleClick = () => {
    setActiveTab('home');
    setTabStates(prev => ({ ...prev, home: { modalMode: null, viewingMovie: null } }));
    resetSearch();
  };

  // --- トップヘッダー（固定用） ---
  const renderAppHeader = () => (
    <header className="sticky top-0 z-[150] bg-[#141414]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-zinc-800/80 shrink-0">
      <div className="flex items-center gap-2 cursor-pointer" onClick={handleAppTitleClick}>
        <Film className="text-red-600" size={20} />
        <span className="text-white font-black text-xl tracking-tighter">MY CINEMA LOG</span>
      </div>
      <button id="hamburger-btn" onClick={() => setIsMenuOpen(p => !p)} className="p-1 cursor-pointer text-zinc-400 hover:text-white transition">
        <Menu size={24} />
      </button>
    </header>
  );

  // --- 検索用の共通ヘッダー（手前・奥の切り替え） ---
  // --- 検索用の共通ヘッダー（1つに統合） ---
  const renderSearchHeader = () => {
    const handleFilterToggle = () => {
      if (!showFilters) { setTempFilters(appliedFilters); setShowFilters(true); } 
      else { setShowFilters(false); }
    };

    return (
      <div className="shrink-0 z-30 bg-[#141414]/95 backdrop-blur-md pt-3 pb-3 px-4 border-b border-zinc-800/50">
        <div className="flex flex-col gap-2.5 relative">
          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text" 
                value={searchTitle} 
                onChange={(e) => { 
                  setSearchTitle(e.target.value); 
                  setApiPage(1); setNextApiPage(1); setForceSearch(false); setSearchPerson(null); setSearchCollection(null); 
                }} 
                placeholder="映画を検索..." 
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-8 text-white font-medium focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-all placeholder:text-zinc-500 ios-safe-input" 
              />
              {searchTitle && (
                <button onClick={() => { setSearchTitle(''); setApiPage(1); setNextApiPage(1); setForceSearch(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 cursor-pointer"><X size={16} /></button>
              )}
            </div>
            <button onClick={handleFilterToggle} className={`filter-toggle-btn w-[42px] h-[42px] rounded-full border flex items-center justify-center transition shrink-0 cursor-pointer ${isFilterApplied ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>
              <SlidersHorizontal size={16} />
            </button>
          </div>
          
          {searchPerson && (
            <div className="flex items-center gap-2 pt-0.5 px-1">
              <span className="text-zinc-200 text-[11px] font-bold bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700 flex items-center gap-1 shadow-md">
                {searchPerson.type === 'director' ? '監督' : 'キャスト'}: {searchPerson.name}
                <button onClick={clearPersonSearch} className="ml-1 text-zinc-400 hover:text-white cursor-pointer"><X size={14} /></button>
              </span>
            </div>
          )}

          {searchCollection && (
            <div className="flex items-center gap-2 pt-0.5 px-1">
              <span className="text-zinc-200 text-[11px] font-bold bg-zinc-800 px-3 py-1 rounded-full border border-zinc-700 flex items-center gap-1 shadow-md">
                シリーズ: {searchCollection.name}
                <button onClick={clearCollectionSearch} className="ml-1 text-zinc-400 hover:text-white cursor-pointer"><X size={14} /></button>
              </span>
            </div>
          )}

          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {apiGenres.filter(g => selectedTags.includes(g.id.toString())).map(g => (
                <button key={g.id} onClick={() => toggleTagSelection(g.id.toString())} className="px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer bg-red-600 text-white border border-red-500 shadow-md flex items-center gap-1">{g.name} <X size={12} /></button>
              ))}
            </div>
          )}

          <div className="flex overflow-x-auto gap-1.5 py-1 [&::-webkit-scrollbar]:hidden">
            {apiGenres.filter(g => !selectedTags.includes(g.id.toString())).map((g) => (
              <button key={g.id} onClick={() => toggleTagSelection(g.id.toString())} className="px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer border bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white">{g.name}</button>
            ))}
          </div>

          {isSearchActive && (
            <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 mt-1">
              <div className="flex items-center gap-2">
                <button onClick={resetSearch} className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-300 hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-bold" title="検索条件をクリア">
                  <ArrowLeft size={16} /> <span>クリア</span>
                </button>
                <h3 className="text-zinc-300 text-xs font-bold flex items-center gap-1.5">検索結果 {isSearching && <Loader2 size={12} className="animate-spin text-red-500" />}</h3>
              </div>
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-[11px] font-medium rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer">
                <option value="release_desc">公開日が新しい順</option>
                <option value="release_asc">公開日が古い順</option>
                <option value="runtime_desc">上映時間が長い順</option>
                <option value="runtime_asc">上映時間が短い順</option>
                <option value="rating_desc">評価が高い順</option>
                <option value="rating_asc">評価が低い順</option>
              </select>
            </div>
          )}

          {showFilters && (
            <div ref={filterMenuRef} className="absolute top-full right-0 left-0 mt-2 bg-zinc-900 p-4 rounded-xl border border-zinc-700 shadow-2xl z-50 animate-in fade-in">
               <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-2">
                  <h4 className="text-sm font-bold text-white">フィルター設定</h4>
                </div>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                      <input type="checkbox" checked={tempFilters.enableYear} onChange={e => setTempFilters(p => ({...p, enableYear: e.target.checked}))} className="accent-red-600 w-3.5 h-3.5" /> 公開年
                    </label>
                    {tempFilters.enableYear && <DualRangeSlider min={1900} max={THIS_YEAR} step={1} minVal={tempFilters.yearMin} maxVal={tempFilters.yearMax} onChange={(minV, maxV) => setTempFilters(p => ({...p, yearMin: minV, yearMax: maxV}))} unit="年" />}
                  </div>
                  <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                      <input type="checkbox" checked={tempFilters.enableRuntime} onChange={e => setTempFilters(p => ({...p, enableRuntime: e.target.checked}))} className="accent-red-600 w-3.5 h-3.5" /> 上映時間
                    </label>
                    {tempFilters.enableRuntime && <DualRangeSlider min={0} max={300} step={5} minVal={tempFilters.runtimeMin} maxVal={tempFilters.runtimeMax} onChange={(minV, maxV) => setTempFilters(p => ({...p, runtimeMin: minV, runtimeMax: maxV}))} unit="分" />}
                  </div>
                  <div className="space-y-2 pt-2 border-t border-zinc-800/50">
                    <label className="flex items-center gap-2 text-xs font-bold text-zinc-300 cursor-pointer">
                      <input type="checkbox" checked={tempFilters.enableRating} onChange={e => setTempFilters(p => ({...p, enableRating: e.target.checked}))} className="accent-red-600 w-3.5 h-3.5" /> 評価
                    </label>
                    {tempFilters.enableRating && <DualRangeSlider min={0.0} max={10.0} step={0.1} minVal={tempFilters.ratingMin} maxVal={tempFilters.ratingMax} onChange={(minV, maxV) => setTempFilters(p => ({...p, ratingMin: minV, ratingMax: maxV}))} />}
                  </div>
                </div>
                <div className="flex gap-3 mt-6 pt-4 border-t border-zinc-800">
                  <button onClick={() => { setTempFilters(defaultFilters); setAppliedFilters(defaultFilters); setShowFilters(false); setApiPage(1); setNextApiPage(1); setForceSearch(false); }} className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition cursor-pointer">クリア</button>
                  <button onClick={handleApplyFilters} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition cursor-pointer">適用 (OK)</button>
                </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- ベースホーム（常に奥で待機） ---
  // --- ベースホーム ---
  const renderBaseHome = () => {
    const recommendedList = homeCategoriesData['おすすめ'] || [];
    return (
      <div className="flex-1 overflow-y-auto space-y-6 pb-8">
        {isHomeLoading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-500"><Loader2 size={32} className="animate-spin text-red-600" /><p className="text-xs font-bold">取得中...</p></div>
        ) : (
          <>
            {recommendedList.length > 0 && (
              <div className="px-4 pt-3">
                <h3 className="text-zinc-100 font-bold text-sm mb-2">おすすめ作品</h3>
                <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden shadow-2xl cursor-pointer bg-zinc-900 flex"
                  onClick={() => openDetailModal(recommendedList[heroIndex], 'home')}
                  onTouchStart={e => heroTouchStartX.current = e.touches[0].clientX}
                  onTouchEnd={e => {
                    const diff = e.changedTouches[0].clientX - heroTouchStartX.current;
                    const topLength = Math.min(recommendedList.length, 10);
                    if (diff > 50) setHeroIndex(prev => (prev - 1 + topLength) % topLength);
                    if (diff < -50) setHeroIndex(prev => (prev + 1) % topLength);
                  }}
                >
                  <div className="flex w-full h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${heroIndex * 100}%)` }}>
                    {recommendedList.slice(0, 10).map((movie) => (
                      <div key={movie.id} className="w-full h-full flex-shrink-0 relative">
                        <img src={movie.backdropUrl || movie.posterUrl} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent p-4 flex flex-col justify-end">
                          <h4 className="text-white font-extrabold text-base line-clamp-1 drop-shadow-md">{movie.title}</h4>
                          <p className="text-zinc-300 text-[11px] line-clamp-1 mt-0.5">{movie.apiSynopsis}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-2 right-3 flex gap-1.5 z-10 flex-wrap justify-end max-w-[50%]">
                    {recommendedList.slice(0, 10).map((_, idx) => (
                      <span key={idx} className={`h-0.5 rounded-full transition-all ${idx === heroIndex ? 'bg-white/80 w-3' : 'bg-white/30 w-1.5'}`} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            {CATEGORIES.map(category => {
              if (category === 'おすすめ') return null;
              const allMovies = homeCategoriesData[category] || [];
              if (allMovies.length === 0) return null;
              const isNowPlaying = category === '公開中';
              return (
                <div key={category} className="space-y-2.5">
                  <div className="flex justify-between items-end px-4">
                    <h3 className={`font-bold ${isNowPlaying ? 'text-red-500 text-base tracking-wide' : 'text-zinc-100 text-sm'}`}>{category}</h3>
                    <button onClick={() => handleOpenGenreList(category)} className="text-[11px] font-bold text-zinc-400 hover:text-white flex items-center gap-0.5 cursor-pointer">すべて見る <ChevronRight size={12} /></button>
                  </div>
                  <div className="flex overflow-x-auto snap-x px-4 gap-2.5 pb-2 pt-1 [&::-webkit-scrollbar]:hidden">
                    {allMovies.slice(0, 10).map((movie: any) => {
                      const status = getCollectionData(movie.id)?.status;
                      return (
                        <div key={movie.id} onClick={() => openDetailModal(movie, 'home')} className={`flex-none snap-start relative rounded-md overflow-hidden active:scale-95 transition-transform cursor-pointer group shadow-lg ${isNowPlaying ? 'w-[125px]' : 'w-[100px]'}`}>
                          {movie.posterUrl ? <img src={movie.posterUrl} className="w-full aspect-[2/3] object-cover bg-zinc-800 group-hover:brightness-75 transition" /> : <div className="w-full aspect-[2/3] bg-zinc-800 flex items-center justify-center p-1 text-center text-[10px] text-zinc-500">{movie.title}</div>}
                          {status && <div className="absolute top-1 right-1 bg-black/70 rounded-full p-1 backdrop-blur-md border border-white/10 z-10">{status === 'watched' ? <CheckCircle2 size={12} className="text-green-500" /> : <Bookmark size={12} className="text-white" />}</div>}
                          {isNowPlaying && <div className="absolute top-1 left-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">上映中</div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  };

  // --- 検索レイヤー（検索時のみ手前に被さり、スライド対象になる） ---
  // --- 検索結果レイヤー ---
  const renderSearchLayer = () => {
    const visibleSearchResults = displayList;
    return (
      <div className="flex-1 overflow-y-auto pb-6 px-4 pt-4">
        {visibleSearchResults.length > 0 ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              {visibleSearchResults.map((movie: any) => (
                <div key={movie.id} onClick={() => openDetailModal(movie, 'home')} className="cursor-pointer active:scale-95 transition-transform group relative">
                  {movie.posterUrl ? <img src={movie.posterUrl} className="w-full aspect-[2/3] object-cover rounded-md shadow-md bg-zinc-800 group-hover:brightness-75 transition" /> : <div className="w-full aspect-[2/3] bg-zinc-800 rounded-md shadow-md flex items-center justify-center p-2 text-[10px] text-zinc-500">{movie.title}</div>}
                  {getCollectionData(movie.id)?.status && <div className="absolute top-1 right-1 bg-black/70 rounded-full p-1 backdrop-blur-md border border-white/10 z-10">{getCollectionData(movie.id)?.status === 'watched' ? <CheckCircle2 size={12} className="text-green-500" /> : <Bookmark size={12} className="text-white" />}</div>}
                </div>
              ))}
            </div>
            {nextApiPage <= totalApiPages && (
              <div className="py-6 flex justify-center">
                <button onClick={() => { if(!isSearching){ setApiPage(nextApiPage); } }} disabled={isSearching} className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-full transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg">
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} さらに読み込む
                </button>
              </div>
            )}
          </>
        ) : (!isSearching && <p className="text-zinc-500 text-xs text-center mt-10">作品が見つかりません</p>)}
      </div>
    );
  };

  // --- 全て見る画面（手前に被さり、スライド対象になる） ---
  const renderGenreView = () => {
    if (!genreViewCategory) return null;
    const visibleGenreList = displayList;

    return (
      <>
        <header className="shrink-0 bg-[#141414]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <button onClick={() => { setActiveTab('home'); setSortOrder('release_desc'); setDisplayList([]); }} className="text-zinc-400 hover:text-white p-1 cursor-pointer"><ArrowLeft size={22} /></button>
            <h2 className="text-base font-bold text-white">{genreViewCategory}</h2>
          </div>
          {genreViewCategory === '公開中' && (
            <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-[11px] font-medium rounded-lg px-2 py-1 focus:outline-none cursor-pointer">
              <option value="release_desc">公開日が新しい順</option>
              <option value="release_asc">公開日が古い順</option>
              <option value="runtime_desc">上映時間が長い順</option>
              <option value="runtime_asc">上映時間が短い順</option>
              <option value="rating_desc">評価が高い順</option>
              <option value="rating_asc">評価が低い順</option>
            </select>
          )}
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          {visibleGenreList.length > 0 ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                {visibleGenreList.map((movie: any) => {
                  const status = getCollectionData(movie.id)?.status;
                  return (
                    <div key={movie.id} onClick={() => openDetailModal(movie, 'genre_view')} className="cursor-pointer active:scale-95 transition-transform group relative">
                      {movie.posterUrl ? <img src={movie.posterUrl} className="w-full aspect-[2/3] object-cover rounded-md shadow-md bg-zinc-800 group-hover:brightness-75" /> : <div className="w-full aspect-[2/3] bg-zinc-800 rounded-md shadow-md flex items-center justify-center p-2 text-center text-[10px] text-zinc-500">{movie.title}</div>}
                      {status && <div className="absolute top-1 right-1 bg-black/70 rounded-full p-1 backdrop-blur-md border border-white/10 z-10">{status === 'watched' ? <CheckCircle2 size={12} className="text-green-500" /> : <Bookmark size={12} className="text-white" />}</div>}
                    </div>
                  );
                })}
              </div>
              {nextApiPage <= totalApiPages && (
                <div className="py-6 flex justify-center">
                  <button onClick={() => { if(!isSearching){ setApiPage(nextApiPage); } }} disabled={isSearching} className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-full transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-lg">
                    {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} さらに読み込む
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex justify-center mt-10"><Loader2 size={24} className="animate-spin text-red-600" /></div>
          )}
        </div>
      </>
    );
  };

  // --- 作品詳細画面（手前に被さり、スライド対象になる） ---
  const renderDetailModal = () => {
    if (!currentViewingMovie) return null;
    const collectionData = getCollectionData(currentViewingMovie.id);
    const status = collectionData?.status || 'none';
    const currentScore = collectionData?.score || 0;
    const face = getFaceRating(currentScore);
    const canDelete = status !== 'none' && (fromTab === 'watchlist' || fromTab === 'watched');
    const hasReviewData = currentScore > 0 || !!collectionData?.aiContent || !!collectionData?.myReview;

    return (
      <>
        <header className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-50 pointer-events-none">
          <button onClick={() => updateModalState(null)} className="pointer-events-auto p-2.5 bg-black/60 backdrop-blur-md text-white rounded-full hover:bg-black/80 transition cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          {canDelete && (
            <button onClick={() => updateModalState('delete_confirm')} className="pointer-events-auto p-2.5 bg-red-600/80 backdrop-blur-md text-white rounded-full hover:bg-red-700 transition cursor-pointer">
              <Trash2 size={18} />
            </button>
          )}
        </header>

        <div className="flex-1 overflow-y-auto pb-28">
          <div className="relative w-full aspect-[2/3] max-h-[50vh] bg-zinc-900 flex justify-center overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110" style={{ backgroundImage: `url(${currentViewingMovie.posterUrl})` }} />
            {currentViewingMovie.posterUrl ? <img ref={detailPosterRef} src={currentViewingMovie.posterUrl} className="relative h-full w-full object-cover shadow-2xl" /> : <div className="relative h-full flex items-center justify-center text-zinc-600">No Image</div>}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent" />
          </div>
          <div className="px-5 -mt-6 relative z-10 space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-white leading-tight mb-2">{currentViewingMovie.title}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-300">
                <span className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20"><Star size={12} className="fill-yellow-500" /> {currentViewingMovie.voteAverage}</span>
                <span className="flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded text-zinc-300"><Calendar size={12} /> {currentViewingMovie.releaseDate}</span>
                {movieExtraDetails?.runtime && <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300"><Clock size={12} className="inline mr-1" />{movieExtraDetails.runtime}</span>}
              </div>
            </div>
            {status === 'watched' && face && (
              <div className="flex items-center gap-4 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                <face.icon size={36} color={face.color} strokeWidth={1.2} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: face.color }}>{face.label}</div>
                  <div className="text-lg font-extrabold text-white">{currentScore.toFixed(1)}<span className="text-xs text-zinc-500"> /10.0</span></div>
                </div>
              </div>
            )}
            <p className="text-xs text-zinc-300 leading-relaxed font-medium">{currentViewingMovie.apiSynopsis}</p>
            {status === 'watched' && (collectionData?.aiContent || collectionData?.myReview) && (
              <div className="space-y-4 pt-4 border-t border-zinc-800/80">
                {collectionData?.aiContent && <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2"><h4 className="text-xs font-bold text-zinc-400">内容メモ</h4><p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{collectionData.aiContent}</p></div>}
                {collectionData?.myReview && <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2"><h4 className="text-xs font-bold text-zinc-400">自分の感想</h4><p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{collectionData.myReview}</p></div>}
              </div>
            )}
            <div className="space-y-4 pt-4 border-t border-zinc-800/80 text-xs">
              {isExtraLoading ? (
                <div className="flex items-center justify-center py-4 text-zinc-500 gap-2"><Loader2 size={16} className="animate-spin text-red-500" /></div>
              ) : movieExtraDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    <div>
                      <span className="text-zinc-500 block mb-1">監督</span>
                      {movieExtraDetails.directorObj ? (
                        <button onClick={() => handlePersonSearch(movieExtraDetails.directorObj)} className="text-zinc-200 font-bold hover:underline cursor-pointer">{movieExtraDetails.directorObj.name}</button>
                      ) : <span className="text-zinc-200 font-bold">不明</span>}
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-1">キャスト</span>
                      <div className="flex flex-col items-start gap-1">
                        {movieExtraDetails.castObjs.map((c: any) => (
                          <button key={c.id} onClick={() => handlePersonSearch(c)} className="text-zinc-200 font-bold line-clamp-1 hover:underline text-left cursor-pointer">{c.name}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {movieExtraDetails.collection && (
                    <div className="pt-2">
                      <span className="text-zinc-500 block mb-2">シリーズ</span>
                      <button onClick={() => handleCollectionSearch(movieExtraDetails.collection)} className="text-zinc-200 font-bold hover:underline cursor-pointer text-sm line-clamp-2 text-left">{movieExtraDetails.collection.name}</button>
                    </div>
                  )}
                  {movieExtraDetails.genres && movieExtraDetails.genres.length > 0 && (
                    <div className="pt-2">
                      <span className="text-zinc-500 block mb-2">作品タグ</span>
                      <div className="flex flex-wrap gap-2 pb-2">
                        {movieExtraDetails.genres.map((g: any) => (
                          <button key={g.id} onClick={() => {
                            updateModalState(null); setActiveTab('home'); setSelectedTags([g.id.toString()]); setSearchTitle(''); setSearchPerson(null); setSearchCollection(null); setShowFilters(false); setApiPage(1); setNextApiPage(1); setForceSearch(false); setSortOrder('release_desc');
                          }} className="px-3 py-1 rounded-full text-[11px] font-bold bg-zinc-900 text-zinc-300 border border-zinc-700 hover:text-white cursor-pointer transition-colors">{g.name}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {movieExtraDetails.streamingServices && movieExtraDetails.streamingServices.length > 0 && (
                    <div className="pt-2">
                      <span className="text-zinc-500 block mb-2">配信サービス</span>
                      <div className="flex flex-wrap gap-3 pb-2">
                        {movieExtraDetails.streamingServices.map((s: any, idx: number) => (
                          <a key={idx} href={s.url} target="_blank" rel="noopener noreferrer" className="block active:scale-95 transition-transform cursor-pointer">
                            <img src={s.logo} alt={s.name} className="w-10 h-10 rounded-xl shadow-md border border-zinc-800" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {relatedMovies.length > 0 && (
                    <div className="pt-2">
                      <span className="text-zinc-500 block mb-2">関連作品</span>
                      <div className="flex overflow-x-auto gap-2.5 pb-2 [&::-webkit-scrollbar]:hidden">
                        {relatedMovies.map((rm: any) => (
                          <div key={rm.id} onClick={() => openDetailModal(rm, fromTab)} className="flex-none w-[90px] rounded-lg overflow-hidden cursor-pointer active:scale-95 transition border border-zinc-800">
                            {rm.posterUrl ? <img src={rm.posterUrl} className="w-full aspect-[2/3] object-cover" /> : <div className="w-full aspect-[2/3] bg-zinc-800 flex items-center justify-center p-1 text-[9px] text-zinc-500 text-center">{rm.title}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 pb-safe bg-gradient-to-t from-[#141414] via-[#141414]/95 to-transparent pt-8 z-50 pointer-events-auto">
          {status === 'none' && (
            <div className="flex gap-3">
              <button onClick={() => handleAddWatchlist(currentViewingMovie)} className="flex-1 py-3.5 bg-zinc-800 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-zinc-700 active:scale-95 transition-all text-sm border border-zinc-700 cursor-pointer"><Plus size={18} /> みたい！</button>
              <button onClick={() => openReviewModal(currentViewingMovie)} className="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-red-700 active:scale-95 transition-all text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer"><Edit3 size={18} /> レビューする</button>
            </div>
          )}
          {status === 'watchlist' && (
            <div className="flex gap-3">
              <button onClick={handleQuickWatch} className="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-red-700 transition text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer"><CheckCircle2 size={18} /> みた！</button>
            </div>
          )}
          {status === 'watched' && (
            <button onClick={() => openReviewModal(currentViewingMovie)} className="w-full py-3.5 bg-red-600 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-red-700 active:scale-95 transition-all text-base shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer"><Edit3 size={18} /> {hasReviewData ? '修正する' : 'レビューする'}</button>
          )}
        </div>
      </>
    );
  };

  const renderReviewModal = () => {
    if (!currentViewingMovie) return null;
    const currentFace = getFaceRating(editScore);

    return (
      <>
        <header className="flex items-center justify-between p-4 bg-[#141414]/90 backdrop-blur-md sticky top-0 z-10 border-b border-zinc-800">
          <button onClick={() => updateModalState('detail')} className="p-2 text-zinc-400 hover:text-white transition cursor-pointer"><ArrowLeft size={22} /></button>
          <span className="font-bold text-sm text-zinc-100">レビューを記録</span>
          <button onClick={handleSaveReview} className="text-white font-bold text-sm px-4 py-1.5 rounded-md active:scale-95 transition-transform cursor-pointer bg-red-600 hover:bg-red-700">保存</button>
        </header>
        <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-28">
          <div className="flex gap-4 items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            {currentViewingMovie.posterUrl ? <img ref={detailPosterRef} src={currentViewingMovie.posterUrl} className="w-14 h-20 object-cover rounded shadow-md bg-zinc-800" /> : <div className="w-14 h-20 bg-zinc-800 rounded shadow-md" />}
            <div className="flex-1"><h2 className="text-base font-bold text-white leading-tight line-clamp-2">{currentViewingMovie.title}</h2><p className="text-xs text-zinc-400 mt-1">{currentViewingMovie.releaseDate}</p></div>
          </div>
          <div className="space-y-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-3">
              {currentFace ? (
                <currentFace.icon size={40} color={currentFace.color} strokeWidth={1.2} />
              ) : (
                <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-500 font-bold text-xs">-</div>
              )}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: currentFace?.color || '#a1a1aa' }}>{currentFace ? currentFace.label : '任意: 評価を付ける'}</span>
                <div className="text-2xl font-black text-white">{editScore.toFixed(1)}<span className="text-xs text-zinc-500"> /10.0</span></div>
              </div>
            </div>
            <input type="range" min="0" max="10" step="0.1" value={editScore} onChange={(e) => setEditScore(Number(e.target.value))} className="w-full accent-red-600 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer custom-range-slider" />
            <div className="grid grid-cols-5 gap-1 pt-1">
              {FACE_RATINGS.map((f) => {
                const isSelected = currentFace?.label === f.label;
                return (
                  <button key={f.score} onClick={() => setEditScore(f.score)} className={`flex flex-col items-center justify-center p-2 rounded-lg transition cursor-pointer border ${isSelected ? 'bg-zinc-800 border-zinc-600' : 'border-transparent hover:bg-zinc-800/50'}`}>
                    <f.icon size={26} color={f.color} strokeWidth={1.2} />{isSelected && <span className="text-[9px] mt-1 font-bold" style={{ color: f.color }}>{f.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-bold text-purple-400 flex items-center gap-2"><Wand2 size={16} /> 内容メモ</label>
              <button onClick={handleGenerateAiPlot} disabled={isAiLoading} className="text-xs px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-full font-bold flex items-center gap-1 active:scale-95 transition border border-purple-500/30 cursor-pointer">{isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} 自動生成</button>
            </div>
            <textarea value={editAiContent} onChange={(e) => setEditAiContent(e.target.value)} placeholder="映画の内容や展開を記録..." className="w-full bg-zinc-900 border border-purple-900/30 rounded-xl p-4 text-zinc-200 text-sm focus:outline-none min-h-[130px] resize-none transition" />
          </div>
          <div className="space-y-3">
            <label className="text-sm font-bold text-white">自分の感想</label>
            <textarea value={editMyReview} onChange={(e) => setEditMyReview(e.target.value)} placeholder="率直な感想を記録..." className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-200 text-sm focus:outline-none focus:border-zinc-500 min-h-[100px] resize-none transition" />
            <button onClick={handleSaveReview} className="w-full py-3.5 text-white font-bold rounded-xl shadow-lg active:scale-95 transition mt-2 cursor-pointer bg-red-600 hover:bg-red-700">保存する</button>
          </div>
        </div>
      </>
    );
  };

  const renderMyList = (statusFilter: 'watchlist' | 'watched') => {
    const list = myCollection.filter(item => item.status === statusFilter).sort((a, b) => b.updatedAt - a.updatedAt);
    const title = statusFilter === 'watched' ? '鑑賞済み' : 'みたい！リスト';
    return (
      <>
        <div className="shrink-0 bg-[#141414]/95 backdrop-blur-md px-4 py-2 flex items-center justify-between border-b border-zinc-800/50">
          <h2 className="text-lg font-extrabold text-zinc-500 tracking-tight">{title}</h2>
          <div className="flex items-center gap-3">
            {isSelectionMode ? (
              <>
                <button onClick={() => { setIsSelectionMode(false); setSelectedForDeletion(new Set()); }} className="text-xs text-zinc-400 cursor-pointer">キャンセル</button>
                <button onClick={() => selectedForDeletion.size > 0 && setShowBatchDeleteConfirm(true)} className={`text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer ${selectedForDeletion.size > 0 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>削除 ({selectedForDeletion.size})</button>
              </>
            ) : (
              <button onClick={() => setIsSelectionMode(true)} className="text-zinc-400 hover:text-white transition cursor-pointer"><Trash2 size={18}/></button>
            )}
          </div>
        </div>
        
        {showBatchDeleteConfirm && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-xs text-center space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white">確認</h3>
              <p className="text-xs text-zinc-400">{selectedForDeletion.size}件の作品をリストから削除しますか？</p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowBatchDeleteConfirm(false)} className="flex-1 py-2.5 bg-zinc-800 text-white rounded-lg text-xs font-bold cursor-pointer">キャンセル</button>
                <button onClick={handleBatchDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer">削除</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6">
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-600">
              {statusFilter === 'watched' ? <CheckCircle2 size={48} className="opacity-20 mb-4" /> : <Bookmark size={48} className="opacity-20 mb-4" />}
              <p className="text-xs font-medium">まだ作品がありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {list.map((item: any) => {
                const movie = item.movieData;
                const score = item.score || 0;
                const face = getFaceRating(score);
                const isSelected = selectedForDeletion.has(item.movieId);
                return (
                  <div key={item.movieId} className="relative">
                    <div
                      onClick={() => {
                        if (isSelectionMode) {
                          const newSet = new Set(selectedForDeletion);
                          isSelected ? newSet.delete(item.movieId) : newSet.add(item.movieId);
                          setSelectedForDeletion(newSet);
                        } else { openDetailModal(movie, statusFilter); }
                      }}
                      className={`relative rounded-md overflow-hidden shadow-md active:scale-95 transition-transform cursor-pointer group ${isSelectionMode && isSelected ? 'ring-2 ring-red-600 opacity-60' : ''}`}
                    >
                      {movie.posterUrl ? <img src={movie.posterUrl} className="w-full aspect-[2/3] object-cover bg-zinc-800 group-hover:brightness-75 transition" /> : <div className="w-full aspect-[2/3] bg-zinc-800 flex items-center justify-center text-center text-[10px] text-zinc-500 p-1">{movie.title}</div>}
                      {statusFilter === 'watched' && face && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-1.5 pt-4 flex justify-between items-center z-10 px-2">
                          <face.icon size={16} color={face.color} strokeWidth={1.2} />
                          <span className="text-[11px] text-white font-bold">{score.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    {isSelectionMode && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center bg-black/50 pointer-events-none z-10 shadow-lg">
                        {isSelected && <div className="w-3 h-3 bg-red-600 rounded-full" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="bg-[#141414] h-[100dvh] w-full flex justify-center font-sans selection:bg-red-900/30 text-zinc-200 overflow-hidden app-wrapper relative">
      <div className="landscape-overlay">
        <p>端末を縦向きにしてご利用ください</p>
      </div>

      <div className="w-full max-w-md h-full bg-[#141414] shadow-2xl relative flex flex-col overflow-hidden">
        
        {/* 全体モーダル等 */}
        {currentModalMode === 'delete_confirm' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-xs w-full text-center space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white">リストから削除しますか？</h3>
              <div className="flex gap-3 pt-2">
                <button onClick={() => updateModalState('detail')} className="flex-1 py-2.5 bg-zinc-800 text-white rounded-lg text-xs font-bold cursor-pointer">いいえ</button>
                <button onClick={() => handleDeleteFromCollection(currentViewingMovie.id)} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer">はい</button>
              </div>
            </div>
          </div>
        )}

        {/* --- 固定トップヘッダー --- */}
        {renderAppHeader()}

        <div ref={menuRef} className={`absolute top-0 right-0 bottom-0 w-64 bg-[#161616] border-l border-zinc-800/80 shadow-2xl z-[160] flex flex-col transition-transform duration-300 ease-in-out pointer-events-auto ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {menuView === 'main' ? (
            <div className="p-6 flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-base font-extrabold text-white tracking-wider">メニュー</h2>
                <button onClick={() => setIsMenuOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer"><X size={22} /></button>
              </div>
              <div className="space-y-3">
                <button onClick={() => setMenuView('settings')} className="w-full flex items-center gap-3 py-3 px-4 rounded-xl bg-zinc-950/60 hover:bg-zinc-800/80 border border-zinc-800/60 text-zinc-200 font-bold transition cursor-pointer text-sm">
                  <Settings size={18} className="text-red-500" /> 設定
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-3 mb-8">
                <button onClick={() => setMenuView('main')} className="text-zinc-400 hover:text-white cursor-pointer p-1"><ArrowLeft size={20} /></button>
                <h2 className="text-base font-bold text-white">設定</h2>
              </div>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-zinc-300">センシティブ作品を表示</label>
                  <input type="checkbox" checked={showAdult} onChange={e => setShowAdult(e.target.checked)} className="accent-red-600 w-4 h-4 cursor-pointer" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-zinc-300">非公式作品を表示</label>
                  <input type="checkbox" checked={showIncomplete} onChange={e => setShowIncomplete(e.target.checked)} className="accent-red-600 w-4 h-4 cursor-pointer" />
                </div>
              </div>
            </div>
          )}
        </div>

        {flyingPoster && (
          <div 
            className="fixed z-[300] pointer-events-none overflow-hidden shadow-2xl"
            style={{
              backgroundImage: `url(${flyingPoster.url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              animation: 'flyToTab 0.9s cubic-bezier(0.25, 1, 0.5, 1) forwards'
            }} 
          />
        )}

        {showReviewConfirm && confirmMovie && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-6 animate-in zoom-in">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-xs w-full text-center space-y-4 shadow-2xl">
              <CheckCircle2 size={48} className="mx-auto text-green-500 mb-2" />
              <h3 className="text-lg font-bold text-white">鑑賞済みに登録しました！</h3>
              <p className="text-xs text-zinc-400">今すぐレビューを記録しますか？</p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => confirmQuickWatch(false)} className="flex-1 py-2.5 bg-zinc-800 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-zinc-700 transition">あとで</button>
                <button onClick={() => confirmQuickWatch(true)} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-red-700 transition shadow-[0_0_15px_rgba(220,38,38,0.4)]">レビューする</button>
              </div>
            </div>
          </div>
        )}

        {/* --- スライドするメインコンテンツ群 --- */}
        <div className="flex-1 relative overflow-hidden flex flex-col min-h-0 bg-[#141414]">
          
          {/* ホーム画面のときは常に「1つの検索ヘッダー」を上に固定表示する */}
          {activeTab === 'home' && renderSearchHeader()}

          {/* ベースのホーム（検索していない時に表示。min-h-0を追加してスクロールを有効化） */}
          <div style={{ display: (activeTab === 'home' && !isSearchActive) ? 'flex' : 'none' }} className="flex-1 flex-col relative z-0 bg-[#141414] min-h-0">
            {renderBaseHome()}
          </div>

          {/* 検索結果（検索中のみ表示。フリックで戻る処理を実行。min-h-0を追加） */}
          {activeTab === 'home' && isSearchActive && (
            <div className="flex-1 flex flex-col relative z-10 bg-[#141414] animate-in fade-in min-h-0"
                 onTouchStart={handleTouchStart} onTouchEnd={(e) => handleTouchEnd(e, 'search')}>
              {renderSearchLayer()}
            </div>
          )}

          {/* レイヤー2: Genre View（全て見る画面。フリックで戻る処理を実行） */}
          <div style={{ display: activeTab === 'genre_view' ? 'flex' : 'none' }} className="w-full h-full flex-col absolute inset-0 z-20 bg-[#141414] animate-in fade-in duration-200"
               onTouchStart={handleTouchStart} onTouchEnd={(e) => handleTouchEnd(e, 'genre')}>
            {renderGenreView()}
          </div>

          {/* レイヤー3: MyList */}
          <div style={{ display: activeTab === 'watchlist' ? 'flex' : 'none' }} className="w-full h-full flex-col absolute inset-0 z-0 bg-[#141414]">{renderMyList('watchlist')}</div>
          <div style={{ display: activeTab === 'watched' ? 'flex' : 'none' }} className="w-full h-full flex-col absolute inset-0 z-0 bg-[#141414]">{renderMyList('watched')}</div>
          
          {/* レイヤー4: Detail Modal */}
          {(currentModalMode === 'detail') && (
            <div className={`w-full h-full flex flex-col absolute inset-0 z-[60] bg-[#141414] ${swipeOutTarget === 'detail' ? 'slide-out-right' : 'animate-in slide-in-from-bottom-10 fade-in duration-300'}`}
                 onTouchStart={handleTouchStart} onTouchEnd={(e) => handleTouchEnd(e, 'detail')}>
              {renderDetailModal()}
            </div>
          )}

          {/* レイヤー5: Review Modal */}
          {currentModalMode === 'review' && (
            <div className="w-full h-full flex flex-col absolute inset-0 z-[70] bg-[#141414] animate-in slide-in-from-bottom-10 fade-in duration-300">
              {renderReviewModal()}
            </div>
          )}
        </div>

        {/* --- 固定フッター --- */}
        <nav className="shrink-0 bg-[#141414]/98 backdrop-blur-xl border-t border-zinc-800 flex justify-around items-center py-2.5 px-3 pb-safe z-[150] relative">
          <button id="tab-btn-home" onClick={() => handleTabClick('home')} className={`flex flex-col items-center py-1 px-3 transition cursor-pointer ${activeTab === 'home' || activeTab === 'genre_view' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Home size={24} />
            <span className="text-xs mt-1 font-bold">ホーム</span>
          </button>
          <button id="tab-btn-watchlist" onClick={() => handleTabClick('watchlist')} className={`flex flex-col items-center py-1 px-3 transition cursor-pointer ${activeTab === 'watchlist' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Bookmark size={24} />
            <span className="text-xs mt-1 font-bold">みたい！</span>
          </button>
          <button id="tab-btn-watched" onClick={() => handleTabClick('watched')} className={`flex flex-col items-center py-1 px-3 transition cursor-pointer ${activeTab === 'watched' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <CheckCircle2 size={24} />
            <span className="text-xs mt-1 font-bold">鑑賞済み</span>
          </button>
        </nav>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        html, body {
          margin: 0; padding: 0;
          width: 100%; height: 100%;
          overflow: hidden !important; 
          overscroll-behavior: none !important;
          touch-action: pan-y;
          background-color: #141414;
        }
        #root, .app-wrapper {
          height: 100dvh;
          max-height: 100dvh;
        }
        .ios-safe-input { font-size: 16px !important; }
        .pb-safe { padding-bottom: max(0.75rem, env(safe-area-inset-bottom)); }
        .pt-safe { padding-top: max(0.5rem, env(safe-area-inset-top)); }
        .animate-in { animation: animateIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .zoom-in { animation: zoomIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes animateIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0); }
          to { transform: translateX(100%); }
        }
        @keyframes flyToTab {
          0% {
            top: ${flyingPoster?.start.top || 0}px;
            left: ${flyingPoster?.start.left || 0}px;
            width: ${flyingPoster?.start.width || 0}px;
            height: ${flyingPoster?.start.height || 0}px;
            opacity: 1;
            transform: scale(1);
            border-radius: 8px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }
          30% {
            transform: scale(1.05);
            opacity: 1;
          }
          100% {
            top: ${flyingPoster?.target.top || 0}px;
            left: ${flyingPoster?.target.left || 0}px;
            width: ${flyingPoster?.target.width || 0}px;
            height: ${flyingPoster?.target.height || 0}px;
            opacity: 0.1;
            transform: scale(0.2);
            border-radius: 50%;
          }
        }
        .slide-out-right {
          animation: slideOutRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        }
        
        input[type=range].custom-range-slider { pointer-events: none; }
        input[type=range].custom-range-slider::-webkit-slider-thumb {
          pointer-events: auto; -webkit-appearance: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
        }
        input[type=range].custom-range-slider::-moz-range-thumb {
          pointer-events: auto; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; border: none;
        }
        .landscape-overlay { display: none; }
        @media screen and (orientation: landscape) {
          .landscape-overlay { display: flex; position: fixed; inset: 0; background-color: #000; color: #fff; z-index: 99999; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; letter-spacing: 0.05em; }
          .app-wrapper > div:not(.landscape-overlay) { display: none !important; }
        }
      `}} />
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Star, Plus, ArrowLeft, Wand2, Loader2, Search, Bookmark, CheckCircle2, 
  Home, X, Calendar, Edit3, ChevronRight, SlidersHorizontal, Trash2,
  Frown, Annoyed, Meh, Smile, Laugh, Film
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- APIキー設定 (Vite環境変数) ---
const tmdbApiKey = import.meta.env?.VITE_TMDB_API_KEY || '';

// --- Supabase 初期化 ---
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// --- ジャンル定義とTMDbのジャンルIDマッピング ---
const GENRES: Record<string, string> = {
  'おすすめ': '',
  '公開中': 'now_playing', // 追加: 公開中の映画
  '名作アクション': '28',
  'アニメ': '16',
  'ヒューマンドラマ': '18',
  'SF・ファンタジー': '878',
  'ホラー・スリラー': '27',
  'コメディ': '35',
  'ロマンス': '10749'
};
const CATEGORIES = Object.keys(GENRES);

// 5段階の線画顔アイコン（シックな色味に変更）
const FACE_RATINGS = [
  { score: 2, label: 'クソ映画！', icon: Frown, color: '#7f1d1d' }, // Dark Red
  { score: 4, label: 'う〜ん...', icon: Annoyed, color: '#9d174d' }, // Dark Pink
  { score: 6, label: '普通', icon: Meh, color: '#a1a1aa' }, // Zinc
  { score: 8, label: '面白い', icon: Smile, color: '#ca8a04' }, // Dark Yellow
  { score: 10, label: '最高！', icon: Laugh, color: '#b91c1c' }, // Red
];

const getFaceRating = (score: number) => {
  if (score < 3) return FACE_RATINGS[0];
  if (score < 5) return FACE_RATINGS[1];
  if (score < 7) return FACE_RATINGS[2];
  if (score < 9) return FACE_RATINGS[3];
  return FACE_RATINGS[4];
};

const THIS_YEAR = new Date().getFullYear();

const FALLBACK_MOVIES: Record<string, any[]> = {
  'おすすめ': [
    { id: 'm1', title: '劇場版 呪術廻戦 0', genre: 'アニメ', posterUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/mktxHLSKIK1aXjJ9UxaA3wT69dO.jpg', backdropUrl: 'https://image.tmdb.org/t/p/w1280/3G1Q5xF40HnUBHOEvO1mNDcZ4B0.jpg', releaseDate: '2021-12-24', apiSynopsis: '幼少のころ、幼なじみの祈本里香を交通事故により目の前で失った乙骨憂太。', voteAverage: '8.5' }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [myCollection, setMyCollection] = useState<any[]>([]);
  const [modalMode, setModalMode] = useState<string | null>(null);
  const [viewingMovie, setViewingMovie] = useState<any>(null);
  const [fromTab, setFromTab] = useState<string>('home');

  // ホーム画面用データ
  const [homeCategoriesData, setHomeCategoriesData] = useState<Record<string, any[]>>({});
  const [isHomeLoading, setIsHomeLoading] = useState(true);
  const [genreViewCategory, setGenreViewCategory] = useState<string | null>(null);

  // 検索・絞り込み・ソート用
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTitle, setSearchTitle] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterYearMin, setFilterYearMin] = useState('1950');
  const [filterYearMax, setFilterYearMax] = useState(THIS_YEAR.toString());
  const [filterRatingMin, setFilterRatingMin] = useState('0');
  const [filterRatingMax, setFilterRatingMax] = useState('10');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortOrder, setSortOrder] = useState<string>('default');

  // レビュー編集用
  const [editScore, setEditScore] = useState(6.0);
  const [editAiContent, setEditAiContent] = useState('');
  const [editMyReview, setEditMyReview] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 詳細画面の拡張データ（関連作品追加）
  const [movieExtraDetails, setMovieExtraDetails] = useState<any>(null);
  const [relatedMovies, setRelatedMovies] = useState<any[]>([]);
  const [isExtraLoading, setIsExtraLoading] = useState(false);

  // ヒーロースライダー
  const [heroIndex, setHeroIndex] = useState(0);
  const heroTouchStartX = useRef(0);

  // 一括削除用ステート
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const isSearchActive = searchTitle || selectedTags.length > 0 || showFilters;

  // Supabaseコレクション取得
  useEffect(() => {
    const fetchCollection = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.from('user_movies').select('*');
        if (data) {
          setMyCollection(data.map(item => ({
            movieId: item.movie_id,
            movieData: item.movie_data,
            status: item.status,
            score: item.score || 0,
            aiContent: item.ai_content || '',
            myReview: item.my_review || '',
            updatedAt: new Date(item.updated_at).getTime()
          })));
        }
      } catch (err) {}
    };
    fetchCollection();
  }, []);

  // ホーム画面映画取得（「公開中」対応）
  useEffect(() => {
    const fetchHomeMovies = async () => {
      setIsHomeLoading(true);
      const newCategoryData: Record<string, any[]> = {};

      for (const cat of CATEGORIES) {
        let url = `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbApiKey}&language=ja-JP&page=1`;
        if (cat === '公開中') {
          url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${tmdbApiKey}&language=ja-JP&region=JP&page=1`;
        } else if (GENRES[cat]) {
          url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&language=ja-JP&with_genres=${GENRES[cat]}&sort_by=popularity.desc&page=1`;
        }

        try {
          if (!tmdbApiKey) throw new Error('API Key missing');
          const res = await fetch(url);
          const data = await res.json();

          if (data.results && data.results.length > 0) {
            let results = data.results;
            if (cat !== '公開中') results = results.sort(() => Math.random() - 0.5); // 公開中は人気順を維持
            
            newCategoryData[cat] = results.map((movie: any) => ({
              id: movie.id.toString(),
              title: movie.title || movie.original_title,
              genre: cat,
              genreIds: movie.genre_ids || [],
              posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
              backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : '',
              releaseDate: movie.release_date || '不明', // 完全な日付を保持
              apiSynopsis: movie.overview || 'あらすじ情報がありません。',
              voteAverage: movie.vote_average ? movie.vote_average.toFixed(1) : '0.0',
              popularity: movie.popularity || 0
            }));
          } else {
            newCategoryData[cat] = FALLBACK_MOVIES[cat] || FALLBACK_MOVIES['おすすめ'];
          }
        } catch (err) {
          newCategoryData[cat] = FALLBACK_MOVIES[cat] || FALLBACK_MOVIES['おすすめ'];
        }
      }
      setHomeCategoriesData(newCategoryData);
      setIsHomeLoading(false);
    };
    fetchHomeMovies();
  }, []);

  // おすすめバナーの自動オートスライド
  useEffect(() => {
    const recommendedList = homeCategoriesData['おすすめ'] || [];
    if (recommendedList.length === 0) return;
    const timer = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(recommendedList.length, 5));
    }, 5000);
    return () => clearInterval(timer);
  }, [homeCategoriesData, heroIndex]);

  // 詳細情報取得（関連作品追加）
  useEffect(() => {
    const fetchMovieDetails = async () => {
      if (!viewingMovie || !tmdbApiKey) return;
      setIsExtraLoading(true);
      try {
        const [detailRes, creditsRes, watchRes, recommendationsRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${viewingMovie.id}?api_key=${tmdbApiKey}&language=ja-JP`),
          fetch(`https://api.themoviedb.org/3/movie/${viewingMovie.id}/credits?api_key=${tmdbApiKey}&language=ja-JP`),
          fetch(`https://api.themoviedb.org/3/movie/${viewingMovie.id}/watch/providers?api_key=${tmdbApiKey}`),
          fetch(`https://api.themoviedb.org/3/movie/${viewingMovie.id}/recommendations?api_key=${tmdbApiKey}&language=ja-JP&page=1`)
        ]);

        const detail = await detailRes.json();
        const credits = await creditsRes.json();
        const watch = await watchRes.json();
        const recommendations = await recommendationsRes.json();

        const director = credits.crew?.find((c: any) => c.job === 'Director')?.name || '不明';
        const cast = credits.cast?.slice(0, 5).map((c: any) => c.name) || [];
        const productionCompanies = detail.production_companies?.map((p: any) => p.name) || [];
        const runtime = detail.runtime ? `${detail.runtime}分` : '';
        
        const jpProviders = watch.results?.JP?.flatrate || [];
        const streamingServices = jpProviders.map((p: any) => ({
          name: p.provider_name,
          logo: `https://image.tmdb.org/t/p/w90${p.logo_path}`,
          url: watch.results?.JP?.link || 'https://www.themoviedb.org/'
        }));

        setMovieExtraDetails({
          runtime,
          director,
          cast,
          productionCompanies,
          streamingServices,
          genres: detail.genres || []
        });

        if (recommendations.results) {
          setRelatedMovies(recommendations.results.slice(0, 10).map((rm: any) => ({
            id: rm.id.toString(),
            title: rm.title,
            posterUrl: rm.poster_path ? `https://image.tmdb.org/t/p/w500${rm.poster_path}` : '',
            releaseDate: rm.release_date || '不明',
            apiSynopsis: rm.overview || '',
            voteAverage: rm.vote_average ? rm.vote_average.toFixed(1) : '0.0'
          })));
        }

      } catch (err) {
        console.error(err);
      } finally {
        setIsExtraLoading(false);
      }
    };

    if (modalMode === 'detail') {
      setMovieExtraDetails(null);
      setRelatedMovies([]);
      fetchMovieDetails();
    }
  }, [viewingMovie, modalMode]);

  // 検索と詳細絞り込み
  useEffect(() => {
    if (!isSearchActive) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        if (!tmdbApiKey) return;
        
        // 検索ルーチン修正：APIの正しいエンドポイントを活用
        let url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&language=ja-JP&sort_by=popularity.desc&page=1`;
        if (searchTitle) {
          url = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&language=ja-JP&query=${encodeURIComponent(searchTitle)}&page=1`;
        } else if (selectedTags.length > 0) {
          url += `&with_genres=${selectedTags.join(',')}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        let results = data.results || [];

        // 詳細フィルター（公開年・評価の範囲指定）
        const filtered = results.filter((movie: any) => {
          const releaseYear = parseInt(movie.release_date?.substring(0, 4) || '0');
          const vote = movie.vote_average || 0;
          const yearMatch = releaseYear >= parseInt(filterYearMin) && releaseYear <= parseInt(filterYearMax);
          const ratingMatch = vote >= parseFloat(filterRatingMin) && vote <= parseFloat(filterRatingMax);
          return yearMatch && ratingMatch;
        });

        const mapped = filtered.map((movie: any) => ({
          id: movie.id.toString(),
          title: movie.title || movie.original_title,
          posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
          releaseDate: movie.release_date || '不明',
          apiSynopsis: movie.overview || 'あらすじ情報がありません。',
          voteAverage: movie.vote_average ? movie.vote_average.toFixed(1) : '0.0'
        }));

        setSearchResults(mapped);
      } catch (err) {
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTitle, selectedTags, filterYearMin, filterYearMax, filterRatingMin, filterRatingMax, isSearchActive]);

  const getCollectionData = useCallback((movieId: string) => {
    return myCollection.find(item => item.movieId === movieId);
  }, [myCollection]);

  const toggleTagSelection = (genreId: string) => {
    setSelectedTags(prev => prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId]);
  };

  const handleKeywordSearch = (keyword: string) => {
    setSearchTitle(keyword);
    setActiveTab('home');
    setModalMode(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetSearch = () => {
    setSearchTitle('');
    setSelectedTags([]);
    setShowFilters(false);
    setSortOrder('default'); // 検索リセット時にソートも初期化
  };

  const handleOpenGenreList = (category: string) => {
    setGenreViewCategory(category);
    setSortOrder('default'); // 開くときは標準ソート
    setActiveTab('genre_view');
  };

  const openDetailModal = (movie: any, originTab: string) => {
    setViewingMovie(movie);
    setFromTab(originTab);
    setModalMode('detail');
  };

  const openReviewModal = (movie: any) => {
    const existing = getCollectionData(movie.id);
    setViewingMovie(movie);
    const initScore = existing?.score !== undefined && existing?.score !== null && existing?.score > 0 ? existing.score : 6.0;
    setEditScore(initScore);
    setEditAiContent(existing?.aiContent ?? '');
    setEditMyReview(existing?.myReview ?? '');
    setModalMode('review');
  };

  const saveToSupabase = async (payload: any) => {
    if (!supabase) return;
    try {
      await supabase.from('user_movies').upsert({
        movie_id: payload.movieId,
        movie_data: payload.movieData,
        status: payload.status,
        score: payload.score || null,
        ai_content: payload.aiContent || null,
        my_review: payload.myReview || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'movie_id' });
    } catch (err) {}
  };

  const handleDeleteFromCollection = async (movieId: string) => {
    setMyCollection(prev => prev.filter(item => item.movieId !== movieId));
    if (supabase) await supabase.from('user_movies').delete().eq('movie_id', movieId);
    setModalMode(null);
  };

  const handleBatchDelete = async () => {
    const idsToDelete = Array.from(selectedForDeletion);
    setMyCollection(prev => prev.filter(item => !idsToDelete.includes(item.movieId)));
    if (supabase) await supabase.from('user_movies').delete().in('movie_id', idsToDelete);
    setSelectedForDeletion(new Set());
    setIsSelectionMode(false);
    setShowBatchDeleteConfirm(false);
  };

  const handleAddWatchlist = async (movie: any) => {
    const newEntry = { movieId: movie.id, movieData: movie, status: 'watchlist', updatedAt: Date.now() };
    setMyCollection(prev => [...prev.filter(item => item.movieId !== movie.id), newEntry]);
    await saveToSupabase(newEntry);
    setModalMode(null);
  };

  const handleQuickWatch = async (movie: any) => {
    const existing = getCollectionData(movie.id);
    const newEntry = {
      movieId: movie.id,
      movieData: movie,
      status: 'watched',
      score: existing?.score || 6.0,
      aiContent: existing?.aiContent || '',
      myReview: existing?.myReview || '',
      updatedAt: Date.now()
    };
    setMyCollection(prev => [...prev.filter(item => item.movieId !== movie.id), newEntry]);
    await saveToSupabase(newEntry);
  };

  const handleSaveReview = async () => {
    if (!viewingMovie) return;
    const reviewEntry = {
      movieId: viewingMovie.id,
      movieData: viewingMovie,
      status: 'watched',
      score: Number(editScore.toFixed(1)),
      aiContent: editAiContent,
      myReview: editMyReview,
      updatedAt: Date.now()
    };
    setMyCollection(prev => [...prev.filter(item => item.movieId !== viewingMovie.id), reviewEntry]);
    await saveToSupabase(reviewEntry);
    setModalMode(null);
  };

  const handleGenerateAiPlot = async () => {
    if (!viewingMovie) return;
    setIsAiLoading(true);
    setTimeout(() => {
      const title = viewingMovie.title;
      const aiText = `【『${title}』の内容・展開】\n予測不可能なプロットが展開され、登場人物たちの葛藤が鮮やかに描かれます。\n\n【結末・考察】\nラストの感動的なカタルシスは必見のクオリティです。`;
      setEditAiContent(aiText);
      setIsAiLoading(false);
    }, 1500);
  };

  // --- ソート処理ユーティリティ ---
  const getSortedMovies = (movies: any[]) => {
    if (sortOrder === 'default') return movies;
    return [...movies].sort((a, b) => {
      if (sortOrder.startsWith('release')) {
        const dateA = new Date(a.releaseDate === '不明' || !a.releaseDate ? '1900-01-01' : a.releaseDate).getTime();
        const dateB = new Date(b.releaseDate === '不明' || !b.releaseDate ? '1900-01-01' : b.releaseDate).getTime();
        return sortOrder === 'release_desc' ? dateB - dateA : dateA - dateB;
      }
      if (sortOrder.startsWith('rating')) {
        const ratingA = parseFloat(a.voteAverage || '0');
        const ratingB = parseFloat(b.voteAverage || '0');
        return sortOrder === 'rating_desc' ? ratingB - ratingA : ratingA - ratingB;
      }
      if (sortOrder.startsWith('runtime')) {
        const runA = parseInt(a.runtime || '0');
        const runB = parseInt(b.runtime || '0');
        return sortOrder === 'runtime_desc' ? runB - runA : runA - runB;
      }
      return 0;
    });
  };

  // --- ヘッダー共通コンポーネント ---
  const renderHeader = (title: string, showBatchActions: boolean = false) => (
    <header className="sticky top-0 z-40 bg-[#141414]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-zinc-800/80">
      <div className="flex items-center gap-2">
        {title === 'MY CINEMA LOG' && <Film className="text-red-600" size={20} />}
        <span className="text-white font-black text-xl tracking-tighter">{title}</span>
      </div>
      {showBatchActions ? (
        <div className="flex items-center gap-3">
          {isSelectionMode ? (
            <>
              <button onClick={() => { setIsSelectionMode(false); setSelectedForDeletion(new Set()); }} className="text-xs text-zinc-400">キャンセル</button>
              <button onClick={() => selectedForDeletion.size > 0 && setShowBatchDeleteConfirm(true)} className={`text-xs font-bold px-3 py-1.5 rounded transition ${selectedForDeletion.size > 0 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
                削除 ({selectedForDeletion.size})
              </button>
            </>
          ) : (
            <button onClick={() => setIsSelectionMode(true)} className="text-zinc-400 hover:text-white transition"><Trash2 size={18}/></button>
          )}
        </div>
      ) : (
        <div className="text-xs text-zinc-400 font-medium">映画管理アプリ</div>
      )}
    </header>
  );

  // --- 共通ヘッダーコンポーネント ---
  const renderAppHeader = () => (
    <header className="sticky top-0 z-40 bg-[#141414]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-zinc-800/80">
      <div className="flex items-center gap-2">
        <Film className="text-red-600" size={20} />
        <span className="text-white font-black text-xl tracking-tighter">MY CINEMA LOG</span>
      </div>
      <div className="text-xs text-zinc-400 font-medium">映画管理アプリ</div>
    </header>
  );

  // --- モーダル: 詳細 ---
  const renderDetailModal = () => {
    if (!viewingMovie) return null;
    const collectionData = getCollectionData(viewingMovie.id);
    const status = collectionData?.status || 'none';
    const currentScore = collectionData?.score || 0;
    const face = getFaceRating(currentScore);

    // リスト画面からの遷移時のみ削除ボタンを表示
    const canDelete = status !== 'none' && (fromTab === 'watchlist' || fromTab === 'watched');

    return (
      <div className="absolute inset-0 bg-[#141414] z-[60] flex flex-col pb-safe animate-in slide-in-from-bottom-10 fade-in duration-300">
        <header className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-50">
          <button onClick={() => setModalMode(null)} className="p-2.5 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          {canDelete && (
            <button onClick={() => setModalMode('delete_confirm')} className="p-2.5 bg-red-600/80 backdrop-blur-md text-white rounded-full hover:bg-red-700 transition cursor-pointer">
              <Trash2 size={18} />
            </button>
          )}
        </header>

        {modalMode === 'delete_confirm' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl max-w-xs w-full text-center space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white">リストから削除しますか？</h3>
              <p className="text-xs text-zinc-400">この操作は元に戻すことができません。</p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setModalMode('detail')} className="flex-1 py-2.5 bg-zinc-800 text-white rounded-lg text-xs font-bold">いいえ</button>
                <button onClick={() => handleDeleteFromCollection(viewingMovie.id)} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold">はい</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="relative w-full aspect-[2/3] max-h-[50vh] bg-zinc-900 flex justify-center overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110" style={{ backgroundImage: `url(${viewingMovie.posterUrl})` }} />
            {viewingMovie.posterUrl ? (
              <img src={viewingMovie.posterUrl} alt="" className="relative h-full w-full object-cover shadow-2xl" />
            ) : (
              <div className="relative h-full flex items-center justify-center text-zinc-600">No Image</div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent" />
          </div>

          <div className="px-5 -mt-6 relative z-10 space-y-6 pb-36">
            <div>
              <h2 className="text-2xl font-extrabold text-white leading-tight mb-2">{viewingMovie.title}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-300">
                <span className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                  <Star size={12} className="fill-yellow-500" /> {viewingMovie.voteAverage}
                </span>
                <span className="flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded text-zinc-300"><Calendar size={12} /> {viewingMovie.releaseDate}</span>
                {movieExtraDetails?.runtime && <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">{movieExtraDetails.runtime}</span>}
              </div>
            </div>

            {status === 'watched' && currentScore > 0 && (
              <div className="flex items-center gap-4 bg-zinc-900/80 p-4 rounded-xl border border-zinc-800">
                <face.icon size={36} color={face.color} strokeWidth={1.2} />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider" style={{ color: face.color }}>{face.label}</div>
                  <div className="text-lg font-extrabold text-white">{currentScore.toFixed(1)}<span className="text-xs text-zinc-500 font-normal"> /10.0</span></div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-zinc-300 leading-relaxed font-medium">{viewingMovie.apiSynopsis}</p>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-800/80 text-xs">
              {isExtraLoading ? (
                <div className="flex items-center justify-center py-4 text-zinc-500 gap-2"><Loader2 size={16} className="animate-spin text-red-500" /></div>
              ) : movieExtraDetails ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    <div>
                      <span className="text-zinc-500 block mb-1">監督</span>
                      <button onClick={() => handleKeywordSearch(movieExtraDetails.director)} className="text-zinc-200 font-bold hover:underline">{movieExtraDetails.director}</button>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-1">キャスト</span>
                      <div className="flex flex-col items-start gap-1">
                        {movieExtraDetails.cast.map((c: string) => (
                          <button key={c} onClick={() => handleKeywordSearch(c)} className="text-zinc-200 font-bold line-clamp-1 hover:underline text-left">{c}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {movieExtraDetails.productionCompanies.length > 0 && (
                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                      <span className="text-zinc-500 block mb-1">制作会社</span>
                      <div className="flex flex-wrap gap-2">
                        {movieExtraDetails.productionCompanies.map((c: string) => (
                          <button key={c} onClick={() => handleKeywordSearch(c)} className="text-zinc-200 font-medium hover:underline">{c}</button>
                        ))}
                      </div>
                    </div>
                  )}

                  {movieExtraDetails.streamingServices.length > 0 && (
                    <div>
                      <span className="text-zinc-500 block mb-1">配信サービス</span>
                      <div className="flex flex-wrap gap-2">
                        {movieExtraDetails.streamingServices.map((service: any, idx: number) => (
                          <a key={idx} href={service.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-lg text-zinc-200 font-bold border border-zinc-700">
                            {service.logo && <img src={service.logo} alt={service.name} className="w-4 h-4 rounded" />} {service.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* タグ表示（ここをタップでホームへ戻りタグ検索） */}
                  {movieExtraDetails.genres && movieExtraDetails.genres.length > 0 && (
                    <div className="pt-2">
                      <span className="text-zinc-500 block mb-2">作品タグ</span>
                      <div className="flex flex-wrap gap-2 pb-2">
                        {movieExtraDetails.genres.map((g: any) => (
                          <button 
                            key={g.id} 
                            onClick={() => {
                              setModalMode(null);
                              setActiveTab('home');
                              setSelectedTags([g.id.toString()]);
                              setSearchTitle('');
                              setShowFilters(false);
                              setSortOrder('default');
                            }} 
                            className="px-3 py-1 rounded-full text-[11px] font-bold bg-zinc-900 text-zinc-300 border border-zinc-700 hover:text-white cursor-pointer transition-colors"
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 関連作品 */}
                  {relatedMovies.length > 0 && (
                    <div className="pt-2">
                      <span className="text-zinc-500 block mb-2">関連作品</span>
                      <div className="flex overflow-x-auto gap-2.5 pb-2 [&::-webkit-scrollbar]:hidden">
                        {relatedMovies.map((rm) => (
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

            {status === 'watched' && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                {collectionData.aiContent && (
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <h4 className="text-xs font-bold text-zinc-400">内容</h4>
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{collectionData.aiContent}</p>
                  </div>
                )}
                {collectionData.myReview && (
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-2">
                    <h4 className="text-xs font-bold text-zinc-400">自分の感想</h4>
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{collectionData.myReview}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#141414] via-[#141414]/95 to-transparent pt-12 pb-safe border-t border-zinc-800/50 z-50 pointer-events-auto">
          {status === 'none' && (
            <div className="flex gap-3">
              <button onClick={() => handleAddWatchlist(viewingMovie)} className="flex-1 py-3.5 bg-zinc-800 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-zinc-700 active:scale-95 transition-all text-sm border border-zinc-700">
                <Plus size={18} /> みたい！
              </button>
              {/* ホーム・検索から開いた場合は勝手に鑑賞済みに入れず、レビュー入力を促す */}
              <button 
                onClick={() => openReviewModal(viewingMovie)} 
                className="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-red-700 active:scale-95 transition-all text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer"
              >
                <Edit3 size={18} /> レビューする
              </button>
            </div>
          )}

          {status === 'watchlist' && (
            <div className="flex gap-3">
              <button 
                onClick={async () => { await handleQuickWatch(viewingMovie); setActiveTab('watched'); setModalMode(null); }} 
                className="flex-1 py-3.5 bg-zinc-800 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-zinc-700 transition text-sm border border-zinc-700 cursor-pointer"
              >
                <CheckCircle2 size={18} className="text-green-500" /> みた！にする
              </button>
              <button onClick={() => openReviewModal(viewingMovie)} className="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-red-700 transition text-sm shadow-lg cursor-pointer">
                <Star size={18} className="fill-white" /> レビューを書く
              </button>
            </div>
          )}

          {status === 'watched' && (
            <button onClick={() => openReviewModal(viewingMovie)} className="w-full py-3.5 bg-red-600 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-red-700 active:scale-95 transition-all text-base shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">
              <Edit3 size={18} /> レビューを編集する
            </button>
          )}
        </div>
      </div>
    );
  };

  // --- モーダル: レビュー ---
  const renderReviewModal = () => {
    if (!viewingMovie) return null;
    const currentFace = getFaceRating(editScore);

    return (
      <div className="absolute inset-0 bg-[#141414] z-[70] flex flex-col pb-safe animate-in slide-in-from-bottom-10 fade-in duration-300">
        <header className="flex items-center justify-between p-4 bg-[#141414]/90 backdrop-blur-md sticky top-0 z-10 border-b border-zinc-800">
          <button onClick={() => setModalMode('detail')} className="p-2 text-zinc-400 hover:text-white transition cursor-pointer">
            <ArrowLeft size={22} />
          </button>
          <span className="font-bold text-sm text-zinc-100">レビューを記録</span>
          <button onClick={handleSaveReview} className="text-white font-bold text-sm px-4 py-1.5 bg-red-600 rounded-md active:scale-95 transition-transform hover:bg-red-700 cursor-pointer">
            保存
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-32">
          <div className="flex gap-4 items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
            {viewingMovie.posterUrl ? (
              <img src={viewingMovie.posterUrl} alt="" className="w-14 h-20 object-cover rounded shadow-md bg-zinc-800" />
            ) : (
              <div className="w-14 h-20 bg-zinc-800 rounded shadow-md"></div>
            )}
            <div className="flex-1">
              <h2 className="text-base font-bold text-white leading-tight line-clamp-2">{viewingMovie.title}</h2>
              <p className="text-xs text-zinc-400 mt-1">{viewingMovie.releaseDate}</p>
            </div>
          </div>

          <div className="space-y-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <currentFace.icon size={40} color={currentFace.color} strokeWidth={1.2} />
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: currentFace.color }}>{currentFace.label}</span>
                  <div className="text-2xl font-black text-white">{editScore.toFixed(1)}<span className="text-xs text-zinc-500"> /10.0</span></div>
                </div>
              </div>
            </div>
            {/* 0.1刻みで入力可能に */}
            <input
              type="range" min="0" max="10" step="0.1" value={editScore}
              onChange={(e) => setEditScore(Number(e.target.value))}
              className="w-full accent-red-600 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            
            {/* 顔アイコンの均等配置（グリッドレイアウト）と線幅の調整 */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {FACE_RATINGS.map((f) => {
                const isSelected = Math.abs(editScore - f.score) < 1.0;
                return (
                  <button
                    key={f.score} onClick={() => setEditScore(f.score)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition cursor-pointer border ${isSelected ? 'bg-zinc-800 border-zinc-600' : 'border-transparent hover:bg-zinc-800/50'}`}
                  >
                    <f.icon size={26} color={f.color} strokeWidth={1.2} />
                    {isSelected && <span className="text-[9px] mt-1 font-bold" style={{ color: f.color }}>{f.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-bold text-purple-400 flex items-center gap-2"><Wand2 size={16} /> 内容</label>
              <button onClick={handleGenerateAiPlot} disabled={isAiLoading} className="text-xs px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-full font-bold flex items-center gap-1 active:scale-95 transition border border-purple-500/30 cursor-pointer">
                {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} {isAiLoading ? '生成中...' : '自動生成'}
              </button>
            </div>
            <textarea
              value={editAiContent} onChange={(e) => setEditAiContent(e.target.value)}
              placeholder="映画の内容や展開を記録..."
              className="w-full bg-zinc-900 border border-purple-900/30 rounded-xl p-4 text-zinc-200 text-sm focus:outline-none min-h-[130px] leading-relaxed resize-none transition"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-white">自分の感想</label>
            <textarea
              value={editMyReview} onChange={(e) => setEditMyReview(e.target.value)}
              placeholder="率直な感想を記録..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-200 text-sm focus:outline-none focus:border-zinc-500 min-h-[100px] resize-none transition"
            />
            <button onClick={handleSaveReview} className="w-full py-3.5 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition cursor-pointer mt-2">
              保存する
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- ホーム画面 ---
  const renderHome = () => {
    const recommendedList = homeCategoriesData['おすすめ'] || [];
    const sortedSearchResults = getSortedMovies(searchResults); // ソート適用

    return (
      <div className="flex-1 overflow-y-auto pb-24 bg-[#141414]">
        
        {/* 共通ヘッダー */}
        {renderAppHeader()}

        {/* 検索・タグエリア */}
        <div className="sticky top-[49px] z-30 bg-[#141414]/95 backdrop-blur-md pt-3 pb-3 px-4 border-b border-zinc-800/50">
          <div className="flex flex-col gap-2.5">
            <div className="flex gap-2 relative">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="text" value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)}
                  placeholder="映画を検索..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-8 text-white text-xs focus:outline-none focus:border-red-500 transition-all placeholder:text-zinc-500"
                />
                {searchTitle && <button onClick={() => setSearchTitle('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 cursor-pointer"><X size={16} /></button>}
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition cursor-pointer shrink-0 ${showFilters ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>

            <div className="flex overflow-x-auto gap-1.5 py-1 [&::-webkit-scrollbar]:hidden">
              {/* 「おすすめ」と「公開中」を除外 */}
              {Object.entries(GENRES).filter(([k]) => k !== 'おすすめ' && k !== '公開中').map(([name, id]) => {
                const isSelected = selectedTags.includes(id);
                return (
                  <button key={id} onClick={() => toggleTagSelection(id)} className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer border ${isSelected ? 'bg-red-600 text-white border-red-500 shadow-md' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'}`}>
                    {name}
                  </button>
                );
              })}
            </div>

            {/* ダブルスライダーを模した入力欄付きの絞り込み */}
            {showFilters && (
              <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 space-y-4 animate-in fade-in">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300">公開年</label>
                  <div className="flex items-center gap-3">
                    <input type="number" value={filterYearMin} onChange={e => setFilterYearMin(e.target.value)} className="w-full bg-zinc-800 text-white text-sm p-2 rounded border border-zinc-700 text-center" />
                    <span className="text-zinc-500">〜</span>
                    <input type="number" value={filterYearMax} onChange={e => setFilterYearMax(e.target.value)} className="w-full bg-zinc-800 text-white text-sm p-2 rounded border border-zinc-700 text-center" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-end text-xs font-bold text-zinc-300">
                    <label>評価</label>
                    <span className="text-zinc-500 font-normal">{filterRatingMin} 以上 〜 {filterRatingMax} 以下</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="number" step="0.1" value={filterRatingMin} onChange={e => setFilterRatingMin(e.target.value)} className="w-16 bg-zinc-800 text-white text-sm p-2 rounded border border-zinc-700 text-center" />
                    <input type="range" min="0" max="10" step="0.1" value={filterRatingMax} onChange={e => setFilterRatingMax(e.target.value)} className="w-full accent-red-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                    <input type="number" step="0.1" value={filterRatingMax} onChange={e => setFilterRatingMax(e.target.value)} className="w-16 bg-zinc-800 text-white text-sm p-2 rounded border border-zinc-700 text-center" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {isSearchActive ? (
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-zinc-300 text-xs font-bold flex items-center gap-2">検索結果 {isSearching && <Loader2 size={12} className="animate-spin text-red-500" />}</h3>
              <div className="flex items-center gap-2">
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] rounded px-1.5 py-1 focus:outline-none cursor-pointer"
                >
                  <option value="default">標準</option>
                  <option value="release_desc">公開日 (新)</option>
                  <option value="release_asc">公開日 (古)</option>
                  <option value="rating_desc">評価 (高)</option>
                  <option value="rating_asc">評価 (低)</option>
                  <option value="runtime_desc">時間 (長)</option>
                  <option value="runtime_asc">時間 (短)</option>
                </select>
                <button onClick={resetSearch} className="text-[11px] text-zinc-500 hover:text-zinc-300">クリア</button>
              </div>
            </div>
            {sortedSearchResults.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {sortedSearchResults.map((movie: any) => (
                  <div key={movie.id} onClick={() => openDetailModal(movie, 'home')} className="cursor-pointer active:scale-95 transition-transform group relative">
                    {movie.posterUrl ? <img src={movie.posterUrl} className="w-full aspect-[2/3] object-cover rounded-md shadow-md bg-zinc-800 group-hover:brightness-75 transition" /> : <div className="w-full aspect-[2/3] bg-zinc-800 rounded-md shadow-md flex items-center justify-center p-2 text-[10px] text-zinc-500">{movie.title}</div>}
                    {getCollectionData(movie.id)?.status && <div className="absolute top-1 right-1 bg-black/70 rounded-full p-1 backdrop-blur-md border border-white/10 z-10">{getCollectionData(movie.id)?.status === 'watched' ? <CheckCircle2 size={12} className="text-green-500" /> : <Bookmark size={12} className="text-white" />}</div>}
                  </div>
                ))}
              </div>
            ) : (!isSearching && <p className="text-zinc-500 text-xs text-center mt-10">作品が見つかりません</p>)}
          </div>
        ) : (
          <div className="space-y-6 pb-8">
            {isHomeLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-500"><Loader2 size={32} className="animate-spin text-red-600" /><p className="text-xs font-bold">取得中...</p></div>
            ) : (
              <>
                {/* おすすめ作品 */}
                {recommendedList.length > 0 && (
                  <div className="px-4 pt-3">
                    <h3 className="text-zinc-100 font-bold text-sm mb-2">おすすめ作品</h3>
                    <div 
                      className="relative w-full aspect-[16/9] rounded-xl overflow-hidden shadow-2xl cursor-pointer bg-zinc-900 flex"
                      onClick={() => openDetailModal(recommendedList[heroIndex], 'home')}
                      onTouchStart={e => heroTouchStartX.current = e.touches[0].clientX}
                      onTouchEnd={e => {
                        const diff = e.changedTouches[0].clientX - heroTouchStartX.current;
                        const top5Length = Math.min(recommendedList.length, 5); // ←5件で固定
                        if (diff > 50) setHeroIndex(prev => (prev - 1 + top5Length) % top5Length);
                        if (diff < -50) setHeroIndex(prev => (prev + 1) % top5Length);
                      }}
                    >
                      <div className="flex w-full h-full transition-transform duration-500 ease-out" style={{ transform: `translateX(-${heroIndex * 100}%)` }}>
                        {recommendedList.slice(0, 5).map((movie) => ( // ←描画も上位5件のみに絞る
                          <div key={movie.id} className="w-full h-full flex-shrink-0 relative">
                            <img src={movie.backdropUrl || movie.posterUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent opacity-80" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent p-4 flex flex-col justify-end">
                              <h4 className="text-white font-extrabold text-base line-clamp-1 drop-shadow-md">{movie.title}</h4>
                              <p className="text-zinc-300 text-[11px] line-clamp-1 mt-0.5">{movie.apiSynopsis}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* ドットインジケーター：背景を消し、バーを細く控えめに調整 */}
                      <div className="absolute top-2 right-3 flex gap-1.5 z-10">
                        {recommendedList.slice(0, 5).map((_, idx) => (
                          <span key={idx} className={`h-0.5 rounded-full transition-all ${idx === heroIndex ? 'bg-white/80 w-4' : 'bg-white/30 w-1.5'}`} />
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
        )}
      </div>
    );
  };

  const renderGenreView = () => {
    if (!genreViewCategory) return null;
    const movies = homeCategoriesData[genreViewCategory] || [];
    const sortedMovies = getSortedMovies(movies); // ソート適用

    return (
      <div className="flex-1 overflow-y-auto pb-24 bg-[#141414] animate-in fade-in duration-200">
        <header className="sticky top-0 bg-[#141414]/90 backdrop-blur-md px-4 py-4 flex items-center justify-between z-30 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <button onClick={() => { setActiveTab('home'); setSortOrder('default'); }} className="text-zinc-400 hover:text-white p-1 cursor-pointer"><ArrowLeft size={22} /></button>
            <h2 className="text-lg font-bold text-white">{genreViewCategory}</h2>
          </div>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] rounded px-1.5 py-1 focus:outline-none cursor-pointer"
          >
            <option value="default">標準</option>
            <option value="release_desc">公開日 (新)</option>
            <option value="release_asc">公開日 (古)</option>
            <option value="rating_desc">評価 (高)</option>
            <option value="rating_asc">評価 (低)</option>
            <option value="runtime_desc">時間 (長)</option>
            <option value="runtime_asc">時間 (短)</option>
          </select>
        </header>
        <div className="p-4 grid grid-cols-3 gap-2">
          {sortedMovies.map((movie: any) => {
            const status = getCollectionData(movie.id)?.status;
            return (
              <div key={movie.id} onClick={() => openDetailModal(movie, 'genre_view')} className="cursor-pointer active:scale-95 transition-transform group relative">
                {movie.posterUrl ? <img src={movie.posterUrl} className="w-full aspect-[2/3] object-cover rounded-md shadow-md bg-zinc-800 group-hover:brightness-75" /> : <div className="w-full aspect-[2/3] bg-zinc-800 rounded-md shadow-md flex items-center justify-center p-2 text-center text-[10px] text-zinc-500">{movie.title}</div>}
                {status && <div className="absolute top-1 right-1 bg-black/70 rounded-full p-1 backdrop-blur-md border border-white/10 z-10">{status === 'watched' ? <CheckCircle2 size={12} className="text-green-500" /> : <Bookmark size={12} className="text-white" />}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMyList = (statusFilter: 'watchlist' | 'watched') => {
    // 修正: map内でスプレッドせず、そのままソートされた配列を利用してエラーを回避
    const list = myCollection
      .filter(item => item.status === statusFilter)
      .sort((a, b) => b.updatedAt - a.updatedAt);

    const title = statusFilter === 'watched' ? '鑑賞済み' : 'みたい！リスト';

    return (
      <div className="flex-1 overflow-y-auto pb-24 bg-[#141414]">
        
        {/* 共通ヘッダー呼び出し */}
        {renderAppHeader()}

        {/* 修正: ヘッダーUIを控えめ（小さく・薄く）に変更 */}
        <div className="sticky top-[49px] z-30 bg-[#141414]/95 backdrop-blur-md px-4 py-1.5 flex items-center justify-between border-b border-zinc-800/50">
          <h2 className="text-sm font-bold text-zinc-500 tracking-wide">{title}</h2>
          <div className="flex items-center gap-3">
            {isSelectionMode ? (
              <>
                <button onClick={() => { setIsSelectionMode(false); setSelectedForDeletion(new Set()); }} className="text-xs text-zinc-400">キャンセル</button>
                <button 
                  onClick={() => selectedForDeletion.size > 0 && setShowBatchDeleteConfirm(true)} 
                  className={`text-xs font-bold px-3 py-1.5 rounded transition ${selectedForDeletion.size > 0 ? 'bg-red-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                >
                  削除 ({selectedForDeletion.size})
                </button>
              </>
            ) : (
              <button onClick={() => setIsSelectionMode(true)} className="text-zinc-400 hover:text-white transition cursor-pointer"><Trash2 size={18}/></button>
            )}
          </div>
        </div>
        
        {/* --- 削除確認モーダル --- */}
        {showBatchDeleteConfirm && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl w-full max-w-xs text-center space-y-4 shadow-2xl">
              <h3 className="text-lg font-bold text-white">確認</h3>
              <p className="text-xs text-zinc-400">{selectedForDeletion.size}件の作品をリストから削除しますか？</p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowBatchDeleteConfirm(false)} className="flex-1 py-2.5 bg-zinc-800 text-white rounded-lg text-xs font-bold">キャンセル</button>
                <button onClick={handleBatchDelete} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold">削除</button>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 pt-4">
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
                        } else {
                          openDetailModal(movie, statusFilter);
                        }
                      }}
                      className={`relative rounded-md overflow-hidden shadow-md active:scale-95 transition-transform cursor-pointer group ${isSelectionMode && isSelected ? 'ring-2 ring-red-600 opacity-60' : ''}`}
                    >
                      {movie.posterUrl ? <img src={movie.posterUrl} className="w-full aspect-[2/3] object-cover bg-zinc-800 group-hover:brightness-75 transition" /> : <div className="w-full aspect-[2/3] bg-zinc-800 flex items-center justify-center text-center text-[10px] text-zinc-500 p-1">{movie.title}</div>}
                      {statusFilter === 'watched' && score > 0 && (
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
      </div>
    );
  };

  return (
    <div className="bg-black min-h-screen flex justify-center font-sans selection:bg-red-900/30 text-zinc-200">
      <div className="w-full max-w-md h-[100dvh] bg-[#141414] shadow-2xl overflow-hidden relative border-x border-zinc-900 flex flex-col">

        {modalMode && modalMode !== 'delete_confirm' && modalMode === 'detail' && renderDetailModal()}
        {modalMode && modalMode !== 'delete_confirm' && modalMode === 'review' && renderReviewModal()}
        {modalMode === 'delete_confirm' && renderDetailModal()}

        {!modalMode && activeTab === 'home' && renderHome()}
        {!modalMode && activeTab === 'genre_view' && renderGenreView()}
        {!modalMode && activeTab === 'watchlist' && renderMyList('watchlist')}
        {!modalMode && activeTab === 'watched' && renderMyList('watched')}

        {/* ボトムナビゲーション */}
        <nav className="absolute bottom-0 left-0 right-0 bg-[#141414]/95 backdrop-blur-xl border-t border-zinc-800/80 flex justify-around items-center pb-safe pt-2 px-2 z-40">
          <button onClick={() => { setActiveTab('home'); setModalMode(null); resetSearch(); }} className={`flex flex-col items-center p-2 transition cursor-pointer ${activeTab === 'home' || activeTab === 'genre_view' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Home size={20} />
            <span className="text-[10px] mt-1 font-bold">ホーム</span>
          </button>
          <button onClick={() => { setActiveTab('watchlist'); setModalMode(null); setIsSelectionMode(false); }} className={`flex flex-col items-center p-2 transition cursor-pointer ${activeTab === 'watchlist' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Bookmark size={20} />
            <span className="text-[10px] mt-1 font-bold">みたい！</span>
          </button>
          <button onClick={() => { setActiveTab('watched'); setModalMode(null); setIsSelectionMode(false); }} className={`flex flex-col items-center p-2 transition cursor-pointer ${activeTab === 'watched' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <CheckCircle2 size={20} />
            <span className="text-[10px] mt-1 font-bold">鑑賞済み</span>
          </button>
        </nav>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
        .animate-in { animation: animateIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes animateIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

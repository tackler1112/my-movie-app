import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Star, Plus, ArrowLeft, Wand2, Loader2, Search, Bookmark, CheckCircle2, 
  Home, X, Calendar, Edit3, ChevronRight, SlidersHorizontal, Trash2,
  Frown, Annoyed, Meh, Smile, Laugh, Film
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- APIキー設定 (Vite環境変数) ---
const tmdbApiKey = import.meta.env?.VITE_TMDB_API_KEY || '';
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// --- ジャンル定義 ---
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

// シックな色味と細い線の顔アイコン
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

const normalizeText = (str: string) => {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60))
    .replace(/[\s　]/g, '');
};

const THIS_YEAR = new Date().getFullYear();

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); 
  const [myCollection, setMyCollection] = useState<any[]>([]);
  const [modalMode, setModalMode] = useState<string | null>(null); 
  const [viewingMovie, setViewingMovie] = useState<any>(null);
  const [fromTab, setFromTab] = useState<string>('home');

  const [homeCategoriesData, setHomeCategoriesData] = useState<Record<string, any[]>>({});
  const [isHomeLoading, setIsHomeLoading] = useState(true);
  const [genreViewCategory, setGenreViewCategory] = useState<string | null>(null);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTitle, setSearchTitle] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterYearMin, setFilterYearMin] = useState('1950');
  const [filterYearMax, setFilterYearMax] = useState(THIS_YEAR.toString());
  const [filterRatingMin, setFilterRatingMin] = useState('0');
  const [filterRatingMax, setFilterRatingMax] = useState('10');
  
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [editScore, setEditScore] = useState(6.0);
  const [editAiContent, setEditAiContent] = useState('');
  const [editMyReview, setEditMyReview] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [movieExtraDetails, setMovieExtraDetails] = useState<any>(null);
  const [relatedMovies, setRelatedMovies] = useState<any[]>([]);
  const [isExtraLoading, setIsExtraLoading] = useState(false);

  const [heroIndex, setHeroIndex] = useState(0);
  const heroTouchStartX = useRef(0);

  // 一括削除用状態
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

  const isSearchActive = searchTitle || selectedTags.length > 0 || showFilters;

  useEffect(() => {
    const fetchCollection = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('user_movies').select('*');
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
    };
    fetchCollection();
  }, []);

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
          if (!tmdbApiKey) break;
          const res = await fetch(url);
          const data = await res.json();
          if (data.results) {
            newCategoryData[cat] = data.results.map((movie: any) => ({
              id: movie.id.toString(),
              title: movie.title,
              posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
              backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : '',
              releaseDate: movie.release_date || '不明',
              apiSynopsis: movie.overview || 'あらすじ情報なし',
              voteAverage: movie.vote_average ? movie.vote_average.toFixed(1) : '0.0'
            }));
          }
        } catch (err) {}
      }
      setHomeCategoriesData(newCategoryData);
      setIsHomeLoading(false);
    };
    fetchHomeMovies();
  }, []);

  useEffect(() => {
    const recommendedList = homeCategoriesData['おすすめ'] || [];
    if (recommendedList.length === 0) return;
    const timer = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(recommendedList.length, 5));
    }, 5000);
    return () => clearInterval(timer);
  }, [homeCategoriesData]);

  // 詳細情報と関連作品の取得
  const fetchMovieDetails = async (movie: any) => {
    if (!movie || !tmdbApiKey) return;
    setIsExtraLoading(true);
    setMovieExtraDetails(null);
    setRelatedMovies([]);
    try {
      const [detailRes, creditsRes, watchRes, relatedRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}?api_key=${tmdbApiKey}&language=ja-JP`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/credits?api_key=${tmdbApiKey}&language=ja-JP`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/watch/providers?api_key=${tmdbApiKey}`),
        fetch(`https://api.themoviedb.org/3/movie/${movie.id}/recommendations?api_key=${tmdbApiKey}&language=ja-JP`)
      ]);
      const detail = await detailRes.json();
      const credits = await creditsRes.json();
      const watch = await watchRes.json();
      const related = await relatedRes.json();

      setMovieExtraDetails({
        runtime: detail.runtime ? `${detail.runtime}分` : '',
        director: credits.crew?.find((c: any) => c.job === 'Director')?.name || '不明',
        cast: credits.cast?.slice(0, 5).map((c: any) => c.name) || [],
        productionCompanies: detail.production_companies?.map((p: any) => p.name) || [],
        genres: detail.genres || [],
        streamingServices: watch.results?.JP?.flatrate?.map((p: any) => ({ name: p.provider_name, logo: `https://image.tmdb.org/t/p/w90${p.logo_path}` })) || []
      });

      if (related.results) {
        setRelatedMovies(related.results.slice(0, 10).map((rm: any) => ({
          id: rm.id.toString(),
          title: rm.title,
          posterUrl: rm.poster_path ? `https://image.tmdb.org/t/p/w500${rm.poster_path}` : '',
          releaseDate: rm.release_date || '不明',
          apiSynopsis: rm.overview || '',
          voteAverage: rm.vote_average?.toFixed(1) || '0.0'
        })));
      }
    } catch (err) {} finally {
      setIsExtraLoading(false);
    }
  };

  useEffect(() => {
    if (modalMode === 'detail' && viewingMovie) {
      fetchMovieDetails(viewingMovie);
    }
  }, [viewingMovie, modalMode]);

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
        let url = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&language=ja-JP&query=${encodeURIComponent(searchTitle)}&page=1`;
        if (!searchTitle && selectedTags.length > 0) {
          url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&language=ja-JP&with_genres=${selectedTags.join(',')}&sort_by=popularity.desc`;
        }
        const res = await fetch(url);
        const data = await res.json();
        let results = data.results || [];

        const filtered = results.filter((movie: any) => {
          const year = parseInt(movie.release_date?.substring(0, 4) || '0');
          const vote = movie.vote_average || 0;
          return year >= parseInt(filterYearMin) && year <= parseInt(filterYearMax) &&
                 vote >= parseFloat(filterRatingMin) && vote <= parseFloat(filterRatingMax);
        });

        setSearchResults(filtered.map((movie: any) => ({
          id: movie.id.toString(),
          title: movie.title,
          posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
          releaseDate: movie.release_date || '不明',
          apiSynopsis: movie.overview || '',
          voteAverage: movie.vote_average ? movie.vote_average.toFixed(1) : '0.0'
        })));
      } catch (err) {} finally {
        setIsSearching(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTitle, selectedTags, filterYearMin, filterYearMax, filterRatingMin, filterRatingMax, isSearchActive]);

  const getCollectionData = useCallback((movieId: string) => myCollection.find(item => item.movieId === movieId), [myCollection]);

  const openDetailModal = (movie: any, originTab: string) => {
    setViewingMovie(movie);
    setFromTab(originTab);
    setModalMode('detail');
  };

  const openReviewModal = (movie: any) => {
    const existing = getCollectionData(movie.id);
    setViewingMovie(movie);
    setEditScore(existing?.score !== undefined ? existing.score : 6.0);
    setEditAiContent(existing?.aiContent ?? '');
    setEditMyReview(existing?.myReview ?? '');
    setModalMode('review');
  };

  const handleKeywordSearch = (keyword: string) => {
    setSearchTitle(keyword);
    setActiveTab('home');
    setModalMode(null);
  };

  const saveToSupabase = async (payload: any) => {
    if (!supabase) return;
    await supabase.from('user_movies').upsert({
      movie_id: payload.movieId,
      movie_data: payload.movieData,
      status: payload.status,
      score: payload.score || null,
      ai_content: payload.aiContent || null,
      my_review: payload.myReview || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'movie_id' });
  };

  const handleAddWatchlist = async (movie: any) => {
    const newEntry = { movieId: movie.id, movieData: movie, status: 'watchlist', updatedAt: Date.now() };
    setMyCollection(prev => [...prev.filter(item => item.movieId !== movie.id), newEntry]);
    await saveToSupabase(newEntry);
    setModalMode(null);
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

  const executeBatchDelete = async () => {
    const toDelete = Array.from(selectedForDeletion);
    setMyCollection(prev => prev.filter(item => !toDelete.includes(item.movieId)));
    if (supabase) {
      await supabase.from('user_movies').delete().in('movie_id', toDelete);
    }
    setSelectedForDeletion(new Set());
    setIsSelectionMode(false);
    setShowBatchDeleteConfirm(false);
  };

  // --- モーダル: 詳細 ---
  const renderDetailModal = () => {
    if (!viewingMovie) return null;
    const colData = getCollectionData(viewingMovie.id);
    const status = colData?.status || 'none';
    const score = colData?.score || 0;
    const face = getFaceRating(score);

    // ホーム・検索からの遷移時は削除ボタンを出さない
    const canDelete = status !== 'none' && (fromTab === 'watchlist' || fromTab === 'watched');

    return (
      <div className="absolute inset-0 bg-[#0a0a0a] z-[60] flex flex-col pb-safe animate-in slide-in-from-bottom-10 fade-in duration-300">
        <header className="flex items-center justify-between p-4 bg-gradient-to-b from-black/90 to-transparent absolute top-0 left-0 right-0 z-50">
          <button onClick={() => setModalMode(null)} className="p-2.5 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition">
            <ArrowLeft size={20} />
          </button>
          {canDelete && (
            <button onClick={() => setModalMode('delete_confirm')} className="p-2.5 bg-zinc-800/80 backdrop-blur-md text-white rounded-full hover:bg-zinc-700 transition">
              <Trash2 size={18} />
            </button>
          )}
        </header>

        {modalMode === 'delete_confirm' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-[80] flex items-center justify-center p-6">
            <div className="bg-[#141414] border border-zinc-800 p-6 rounded-2xl w-full max-w-xs text-center space-y-5">
              <h3 className="text-lg font-bold text-white">リストから削除しますか？</h3>
              <div className="flex gap-3">
                <button onClick={() => setModalMode('detail')} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl font-bold">キャンセル</button>
                <button onClick={async () => {
                  setMyCollection(prev => prev.filter(item => item.movieId !== viewingMovie.id));
                  if(supabase) await supabase.from('user_movies').delete().eq('movie_id', viewingMovie.id);
                  setModalMode(null);
                }} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">削除</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <div className="relative w-full aspect-[2/3] max-h-[45vh] bg-[#141414] overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center blur-xl opacity-30 scale-110" style={{ backgroundImage: `url(${viewingMovie.posterUrl})` }} />
            {viewingMovie.posterUrl && <img src={viewingMovie.posterUrl} alt="" className="relative h-full w-full object-contain" />}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
          </div>

          <div className="px-5 -mt-4 relative z-10 space-y-6 pb-36">
            <div>
              <h2 className="text-2xl font-black text-white leading-tight mb-2 tracking-tight">{viewingMovie.title}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-400">
                <span className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                  <Star size={12} className="fill-yellow-500" /> {viewingMovie.voteAverage}
                </span>
                <span className="bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">{viewingMovie.releaseDate}</span>
                {movieExtraDetails?.runtime && <span className="bg-zinc-800/80 px-2 py-0.5 rounded text-zinc-300">{movieExtraDetails.runtime}</span>}
              </div>
            </div>

            {status === 'watched' && score > 0 && (
              <div className="flex items-center gap-4 bg-zinc-900/40 p-4 rounded-xl border border-zinc-800/50">
                <face.icon size={36} color={face.color} strokeWidth={1.2} />
                <div>
                  <div className="text-[10px] font-bold tracking-wider" style={{ color: face.color }}>{face.label}</div>
                  <div className="text-lg font-black text-white">{score.toFixed(1)}</div>
                </div>
              </div>
            )}

            <p className="text-[13px] text-zinc-300 leading-relaxed">{viewingMovie.apiSynopsis}</p>

            {isExtraLoading ? (
              <div className="flex items-center justify-center py-4 text-zinc-500 gap-2"><Loader2 size={16} className="animate-spin" /></div>
            ) : movieExtraDetails ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">監督</span>
                    <button onClick={() => handleKeywordSearch(movieExtraDetails.director)} className="text-[13px] text-white font-bold hover:underline">{movieExtraDetails.director}</button>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">キャスト</span>
                    <div className="flex flex-col items-start">
                      {movieExtraDetails.cast.slice(0,3).map((c: string) => (
                        <button key={c} onClick={() => handleKeywordSearch(c)} className="text-[13px] text-zinc-200 hover:underline text-left">{c}</button>
                      ))}
                    </div>
                  </div>
                </div>
                {movieExtraDetails.productionCompanies.length > 0 && (
                  <div>
                    <span className="text-[10px] text-zinc-500 block mb-1">制作</span>
                    <div className="flex flex-wrap gap-2">
                      {movieExtraDetails.productionCompanies.map((c: string) => (
                        <button key={c} onClick={() => handleKeywordSearch(c)} className="text-[12px] text-zinc-300 bg-zinc-800/50 px-2 py-1 rounded hover:bg-zinc-700 transition">{c}</button>
                      ))}
                    </div>
                  </div>
                )}
                {relatedMovies.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-zinc-400 block mb-2">関連作品</span>
                    <div className="flex overflow-x-auto gap-2 pb-2 [&::-webkit-scrollbar]:hidden">
                      {relatedMovies.map(rm => (
                        <div key={rm.id} onClick={() => openDetailModal(rm, fromTab)} className="flex-none w-[80px] rounded-md overflow-hidden cursor-pointer active:scale-95 transition">
                          {rm.posterUrl ? <img src={rm.posterUrl} className="w-full h-[120px] object-cover" /> : <div className="w-full h-[120px] bg-zinc-800" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/95 to-transparent pt-12 pb-safe border-t border-zinc-900 z-50">
          {status === 'none' && (
            <div className="flex gap-3">
              <button onClick={() => handleAddWatchlist(viewingMovie)} className="flex-1 py-3.5 bg-zinc-800/80 backdrop-blur-md text-white font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-zinc-700 active:scale-95 transition-all text-sm border border-zinc-700">
                <Plus size={18} /> みたい！
              </button>
              <button 
                onClick={() => openReviewModal(viewingMovie)} 
                className="flex-1 py-3.5 bg-red-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-red-600 active:scale-95 transition-all text-sm"
              >
                <Edit3 size={18} /> レビューする
              </button>
            </div>
          )}
          {status === 'watchlist' && (
            <button onClick={() => openReviewModal(viewingMovie)} className="w-full py-3.5 bg-red-700 text-white font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-red-600 active:scale-95 transition-all text-sm">
              <Edit3 size={18} /> レビューする
            </button>
          )}
          {status === 'watched' && (
            <button onClick={() => openReviewModal(viewingMovie)} className="w-full py-3.5 bg-zinc-800 text-white font-bold rounded-xl flex justify-center items-center gap-2 hover:bg-zinc-700 active:scale-95 transition-all text-sm border border-zinc-700">
              <Edit3 size={18} /> レビューを編集する
            </button>
          )}
        </div>
      </div>
    );
  };

  // --- モーダル: レビュー ---
  const renderReviewModal = () => {
    const face = getFaceRating(editScore);
    return (
      <div className="absolute inset-0 bg-[#0a0a0a] z-[70] flex flex-col pb-safe animate-in slide-in-from-bottom-10 fade-in duration-300">
        <header className="flex items-center justify-between p-4 bg-[#0a0a0a]/90 backdrop-blur-md sticky top-0 z-10 border-b border-zinc-900">
          <button onClick={() => setModalMode('detail')} className="p-2 text-zinc-400 hover:text-white transition"><ArrowLeft size={22} /></button>
          <span className="font-bold text-sm text-zinc-100">レビューを記録</span>
          <button onClick={handleSaveReview} className="text-white font-bold text-sm px-4 py-1.5 bg-red-700 rounded-md active:scale-95 transition">保存</button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-32">
          <div className="flex gap-4 items-center">
            {viewingMovie.posterUrl && <img src={viewingMovie.posterUrl} className="w-16 h-24 object-cover rounded shadow-lg" />}
            <div>
              <h2 className="text-base font-bold text-white line-clamp-2 mb-1">{viewingMovie.title}</h2>
              <p className="text-xs text-zinc-400">{viewingMovie.releaseDate}</p>
            </div>
          </div>

          <div className="bg-[#141414] p-5 rounded-2xl border border-zinc-800/50 space-y-5">
            <div className="flex items-center gap-4">
              <face.icon size={44} color={face.color} strokeWidth={1.2} />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: face.color }}>{face.label}</span>
                <div className="text-3xl font-black text-white">{editScore.toFixed(1)}</div>
              </div>
            </div>
            <input
              type="range" min="0" max="10" step="0.1" value={editScore}
              onChange={(e) => setEditScore(Number(e.target.value))}
              className="w-full accent-red-700 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            {/* 均等配置のために grid を使用 */}
            <div className="grid grid-cols-5 gap-2 pt-2">
              {FACE_RATINGS.map((f) => (
                <button
                  key={f.score} onClick={() => setEditScore(f.score)}
                  className={`flex flex-col items-center p-2 rounded-xl border transition ${Math.abs(editScore - f.score) < 1.5 ? 'bg-zinc-800 border-zinc-600' : 'bg-transparent border-transparent'}`}
                >
                  <f.icon size={22} color={f.color} strokeWidth={1.2} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-[13px] font-bold text-indigo-400 flex items-center gap-1"><Wand2 size={14}/> AIあらすじ・結末</label>
              <button onClick={handleGenerateAiPlot} disabled={isAiLoading} className="text-[11px] px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20 active:scale-95 transition">
                {isAiLoading ? '生成中...' : '自動生成'}
              </button>
            </div>
            <textarea value={editAiContent} onChange={(e) => setEditAiContent(e.target.value)} className="w-full bg-[#141414] border border-zinc-800 rounded-xl p-4 text-zinc-300 text-sm focus:outline-none min-h-[120px] resize-none" placeholder="AIによる展開の記録..." />
          </div>

          <div className="space-y-3">
            <label className="text-[13px] font-bold text-white">自分の感想</label>
            <textarea value={editMyReview} onChange={(e) => setEditMyReview(e.target.value)} className="w-full bg-[#141414] border border-zinc-800 rounded-xl p-4 text-zinc-200 text-sm focus:outline-none min-h-[120px] resize-none" placeholder="感想を入力..." />
          </div>
        </div>
      </div>
    );
  };

  // --- ホーム画面 ---
  const renderHome = () => {
    const recommendedList = homeCategoriesData['おすすめ'] || [];
    return (
      <div className="flex-1 overflow-y-auto pb-24 bg-[#0a0a0a]">
        <header className="sticky top-0 z-40 bg-[#0a0a0a]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <Film className="text-red-700" size={20} />
            <span className="text-white font-black text-lg tracking-widest font-serif">MY CINEMA LOG</span>
          </div>
        </header>

        <div className="sticky top-[52px] z-30 bg-[#0a0a0a]/90 backdrop-blur-md px-4 py-3 border-b border-zinc-900">
          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
              <input type="text" value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)} placeholder="映画を検索..." className="w-full bg-[#141414] border border-zinc-800 rounded-lg py-2 pl-9 pr-8 text-white text-sm focus:outline-none" />
              {searchTitle && <button onClick={() => setSearchTitle('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"><X size={14} /></button>}
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className={`w-10 h-10 rounded-lg border flex items-center justify-center transition ${showFilters ? 'bg-red-700 border-red-600 text-white' : 'bg-[#141414] border-zinc-800 text-zinc-400'}`}>
              <SlidersHorizontal size={16} />
            </button>
          </div>
          {showFilters && (
            <div className="mt-3 bg-[#141414] p-4 rounded-xl border border-zinc-800 space-y-4">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-2">公開年: {filterYearMin} 〜 {filterYearMax}</label>
                <div className="flex items-center gap-2">
                  <input type="number" value={filterYearMin} onChange={e=>setFilterYearMin(e.target.value)} className="w-full bg-[#0a0a0a] text-white text-sm p-2 rounded border border-zinc-800 text-center" />
                  <span className="text-zinc-600">-</span>
                  <input type="number" value={filterYearMax} onChange={e=>setFilterYearMax(e.target.value)} className="w-full bg-[#0a0a0a] text-white text-sm p-2 rounded border border-zinc-800 text-center" />
                </div>
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-2">評価: {filterRatingMin} 〜 {filterRatingMax}</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" value={filterRatingMin} onChange={e=>setFilterRatingMin(e.target.value)} className="w-16 bg-[#0a0a0a] text-white text-sm p-2 rounded border border-zinc-800 text-center" />
                  <input type="range" min="0" max="10" step="0.1" value={filterRatingMax} onChange={e=>setFilterRatingMax(e.target.value)} className="w-full accent-red-700 h-1 bg-zinc-800 rounded-lg appearance-none" />
                  <input type="number" step="0.1" value={filterRatingMax} onChange={e=>setFilterRatingMax(e.target.value)} className="w-16 bg-[#0a0a0a] text-white text-sm p-2 rounded border border-zinc-800 text-center" />
                </div>
              </div>
            </div>
          )}
        </div>

        {isSearchActive ? (
          <div className="px-4 pt-4">
            <div className="grid grid-cols-3 gap-2">
              {searchResults.map((movie: any) => (
                <div key={movie.id} onClick={() => openDetailModal(movie, 'home')} className="cursor-pointer active:scale-95 transition relative rounded-md overflow-hidden">
                  {movie.posterUrl ? <img src={movie.posterUrl} className="w-full aspect-[2/3] object-cover bg-zinc-900" /> : <div className="w-full aspect-[2/3] bg-zinc-900" />}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 pb-8">
            {recommendedList.length > 0 && (
              <div className="pt-4">
                <div 
                  className="relative w-full aspect-[4/5] overflow-hidden cursor-pointer bg-black"
                  onClick={() => openDetailModal(recommendedList[heroIndex], 'home')}
                  onTouchStart={e => heroTouchStartX.current = e.touches[0].clientX}
                  onTouchEnd={e => {
                    const diff = e.changedTouches[0].clientX - heroTouchStartX.current;
                    if (diff > 50) setHeroIndex(prev => (prev - 1 + 5) % 5);
                    if (diff < -50) setHeroIndex(prev => (prev + 1) % 5);
                  }}
                >
                  {recommendedList.map((movie, idx) => (
                    <div 
                      key={movie.id} 
                      className={`absolute inset-0 transition-all duration-700 ease-in-out ${idx === heroIndex ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}
                    >
                      <img src={movie.posterUrl} className="w-full h-full object-cover opacity-80" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                      <div className="absolute bottom-6 left-6 right-6">
                        <h4 className="text-white font-black text-3xl leading-tight drop-shadow-lg">{movie.title}</h4>
                      </div>
                    </div>
                  ))}
                  <div className="absolute bottom-2 right-4 flex gap-1.5 z-10">
                    {recommendedList.slice(0,5).map((_, idx) => (
                      <span key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === heroIndex ? 'bg-red-600 w-4' : 'bg-white/30'}`} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {CATEGORIES.map(category => {
              if (category === 'おすすめ') return null;
              const movies = homeCategoriesData[category] || [];
              if (movies.length === 0) return null;
              
              // 公開中は大きめのカードにする
              const isNowPlaying = category === '公開中';
              
              return (
                <div key={category} className="space-y-3">
                  <div className="flex justify-between items-end px-4">
                    <h3 className={`text-white font-bold ${isNowPlaying ? 'text-lg text-red-500' : 'text-sm'}`}>{category}</h3>
                    <button onClick={() => { setGenreViewCategory(category); setActiveTab('genre_view'); }} className="text-[11px] font-bold text-zinc-500 flex items-center">すべて見る <ChevronRight size={14}/></button>
                  </div>
                  <div className="flex overflow-x-auto snap-x px-4 gap-3 pb-2 [&::-webkit-scrollbar]:hidden">
                    {movies.slice(0, 10).map((movie: any) => (
                      <div key={movie.id} onClick={() => openDetailModal(movie, 'home')} className={`flex-none snap-start relative rounded-lg overflow-hidden cursor-pointer ${isNowPlaying ? 'w-[140px]' : 'w-[100px]'}`}>
                        <img src={movie.posterUrl} className="w-full aspect-[2/3] object-cover bg-zinc-900" />
                        {isNowPlaying && (
                          <div className="absolute top-2 left-2 bg-red-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">上映中</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderGenreView = () => {
    const movies = homeCategoriesData[genreViewCategory || ''] || [];
    return (
      <div className="flex-1 overflow-y-auto pb-24 bg-[#0a0a0a] animate-in fade-in duration-200">
        <header className="sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-md px-4 py-4 flex items-center gap-3 z-30 border-b border-zinc-900">
          <button onClick={() => setActiveTab('home')} className="text-zinc-400"><ArrowLeft size={22} /></button>
          <h2 className="text-sm font-bold text-white">{genreViewCategory}</h2>
        </header>
        <div className="p-4 grid grid-cols-3 gap-2">
          {movies.map((movie: any) => (
            <div key={movie.id} onClick={() => openDetailModal(movie, 'genre_view')} className="rounded-md overflow-hidden cursor-pointer">
              <img src={movie.posterUrl} className="w-full aspect-[2/3] object-cover bg-zinc-900" />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMyList = (statusFilter: 'watchlist' | 'watched') => {
    const list = myCollection.filter(item => item.status === statusFilter).sort((a, b) => b.updatedAt - a.updatedAt);
    const title = statusFilter === 'watched' ? '鑑賞済み' : 'みたい！リスト';

    return (
      <div className="flex-1 flex flex-col bg-[#0a0a0a]">
        <header className="sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between z-30 border-b border-zinc-900">
          <h2 className="text-lg font-black text-white tracking-wide">{title}</h2>
          <div className="flex items-center gap-3">
            {isSelectionMode ? (
              <>
                <button onClick={() => { setIsSelectionMode(false); setSelectedForDeletion(new Set()); }} className="text-xs text-zinc-400">キャンセル</button>
                <button 
                  onClick={() => selectedForDeletion.size > 0 && setShowBatchDeleteConfirm(true)} 
                  className={`text-xs font-bold px-3 py-1.5 rounded-md transition ${selectedForDeletion.size > 0 ? 'bg-red-700 text-white' : 'bg-zinc-800 text-zinc-500'}`}
                >
                  削除 ({selectedForDeletion.size})
                </button>
              </>
            ) : (
              <button onClick={() => setIsSelectionMode(true)} className="text-zinc-400 hover:text-white"><Trash2 size={18}/></button>
            )}
          </div>
        </header>

        {showBatchDeleteConfirm && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-[80] flex items-center justify-center p-6">
            <div className="bg-[#141414] border border-zinc-800 p-6 rounded-2xl w-full max-w-xs text-center space-y-5">
              <h3 className="text-base font-bold text-white">{selectedForDeletion.size}件の映画を削除しますか？</h3>
              <div className="flex gap-3">
                <button onClick={() => setShowBatchDeleteConfirm(false)} className="flex-1 py-3 bg-zinc-800 text-white rounded-xl text-sm font-bold">いいえ</button>
                <button onClick={executeBatchDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm font-bold">はい</button>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pb-24 p-4">
          <div className="grid grid-cols-3 gap-2.5">
            {list.map((item: any) => {
              const movie = item.movieData;
              const isSelected = selectedForDeletion.has(item.movieId);
              const score = item.score || 0;
              const face = getFaceRating(score);

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
                    className={`relative rounded-lg overflow-hidden cursor-pointer transition ${isSelectionMode && isSelected ? 'ring-2 ring-red-600 opacity-60' : ''}`}
                  >
                    <img src={movie.posterUrl} className="w-full aspect-[2/3] object-cover bg-zinc-900" />
                    {statusFilter === 'watched' && score > 0 && (
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black to-transparent pt-6 pb-2 px-2 flex justify-between items-center">
                        <face.icon size={14} color={face.color} strokeWidth={1.5} />
                        <span className="text-[10px] text-white font-bold">{score.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  {isSelectionMode && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center bg-black/50 pointer-events-none">
                      {isSelected && <div className="w-2.5 h-2.5 bg-red-600 rounded-full" />}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-black min-h-screen flex justify-center font-sans selection:bg-red-900/50 text-zinc-200">
      <div className="w-full max-w-md h-[100dvh] bg-[#0a0a0a] shadow-2xl overflow-hidden relative border-x border-zinc-900 flex flex-col">
        {modalMode && modalMode !== 'delete_confirm' && modalMode === 'detail' && renderDetailModal()}
        {modalMode && modalMode !== 'delete_confirm' && modalMode === 'review' && renderReviewModal()}
        {modalMode === 'delete_confirm' && renderDetailModal()}

        {!modalMode && activeTab === 'home' && renderHome()}
        {!modalMode && activeTab === 'genre_view' && renderGenreView()}
        {!modalMode && activeTab === 'watchlist' && renderMyList('watchlist')}
        {!modalMode && activeTab === 'watched' && renderMyList('watched')}

        <nav className="absolute bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-zinc-900 flex justify-around items-center pb-safe pt-2 px-2 z-40">
          <button onClick={() => { setActiveTab('home'); setModalMode(null); }} className={`flex flex-col items-center p-2 transition ${activeTab === 'home' || activeTab === 'genre_view' ? 'text-white' : 'text-zinc-600'}`}>
            <Home size={22} strokeWidth={1.5} />
          </button>
          <button onClick={() => { setActiveTab('watchlist'); setModalMode(null); setIsSelectionMode(false); }} className={`flex flex-col items-center p-2 transition ${activeTab === 'watchlist' ? 'text-white' : 'text-zinc-600'}`}>
            <Bookmark size={22} strokeWidth={1.5} />
          </button>
          <button onClick={() => { setActiveTab('watched'); setModalMode(null); setIsSelectionMode(false); }} className={`flex flex-col items-center p-2 transition ${activeTab === 'watched' ? 'text-white' : 'text-zinc-600'}`}>
            <CheckCircle2 size={22} strokeWidth={1.5} />
          </button>
        </nav>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
        .animate-in { animation: animateIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes animateIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}

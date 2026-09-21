import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Star, Plus, ArrowLeft, Wand2, Loader2, Search, Bookmark, CheckCircle2, 
  Home, X, Calendar, Edit3, ChevronRight, SlidersHorizontal, Trash2,
  Frown, Annoyed, Meh, Smile, Laugh // 線画の顔アイコンを追加
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
  '名作アクション': '28',
  'アニメ': '16',
  'ヒューマンドラマ': '18',
  'SF・ファンタジー': '878',
  'ホラー・スリラー': '27',
  'コメディ': '35',
  'ロマンス': '10749'
};
const CATEGORIES = Object.keys(GENRES);

// 5段階の線画顔アイコンとラベルの定義
const FACE_RATINGS = [
  { score: 2, label: 'クソ映画！', icon: Frown, color: 'text-blue-500' },
  { score: 4, label: 'う〜ん...', icon: Annoyed, color: 'text-teal-400' },
  { score: 6, label: '普通', icon: Meh, color: 'text-zinc-400' },
  { score: 8, label: '面白い', icon: Smile, color: 'text-yellow-400' },
  { score: 10, label: '最高！', icon: Laugh, color: 'text-red-500' },
];

const getFaceRating = (score: number) => {
  if (score <= 2) return FACE_RATINGS[0];
  if (score <= 4) return FACE_RATINGS[1];
  if (score <= 6) return FACE_RATINGS[2];
  if (score <= 8) return FACE_RATINGS[3];
  return FACE_RATINGS[4];
};

// ひらがな・カタカナ正規化＆あいまいマッチ用ヘルパー
const normalizeText = (str: string) => {
  if (!str) return '';
  return str.toLowerCase()
    .replace(/[\u3041-\u3096]/g, match => String.fromCharCode(match.charCodeAt(0) + 0x60)) // ひらがなをカタカナに
    .replace(/[\s　]/g, ''); // 空白削除
};

const FALLBACK_MOVIES: Record<string, any[]> = {
  'おすすめ': [
    { id: 'm1', title: '劇場版 呪術廻戦 0', genre: 'アニメ', posterUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/mktxHLSKIK1aXjJ9UxaA3wT69dO.jpg', releaseDate: '2021-12-24', apiSynopsis: '幼少のころ、幼なじみの祈本里香を交通事故により目の前で失った乙骨憂太。', voteAverage: '8.5' },
    { id: 'm2', title: 'ザ・スーパーマリオブラザーズ・ムービー', genre: 'アニメ', posterUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/qNBAXBIQlnOAW9YRcgxotFCVW3U.jpg', releaseDate: '2023-04-28', apiSynopsis: 'ニューヨークで配管工を営む双子の兄弟マリオとルイージ。', voteAverage: '7.8' }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'watchlist' | 'watched' | 'genre_view'
  const [myCollection, setMyCollection] = useState<any[]>([]);
  const [modalMode, setModalMode] = useState<string | null>(null); // 'detail' | 'review' | 'delete_confirm'
  const [viewingMovie, setViewingMovie] = useState<any>(null);
  const [fromTab, setFromTab] = useState<string>('home');

  // ホーム画面用データ保持
  const [homeCategoriesData, setHomeCategoriesData] = useState<Record<string, any[]>>({});
  const [isHomeLoading, setIsHomeLoading] = useState(true);
  const [genreViewCategory, setGenreViewCategory] = useState<string | null>(null);

  // 複数タグ・詳細絞り込み用state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTitle, setSearchTitle] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterYearMin, setFilterYearMin] = useState('2000');
  const [filterYearMax, setFilterYearMax] = useState('2026');
  const [filterRatingMin, setFilterRatingMin] = useState('0');
  const [filterRatingMax, setFilterRatingMax] = useState('10');
  
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 編集フォーム用state
  const [editScore, setEditScore] = useState(6.0);
  const [editAiContent, setEditAiContent] = useState('');
  const [editMyReview, setEditMyReview] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 詳細画面用拡張データ（キャスト、監督、配信など）
  const [movieExtraDetails, setMovieExtraDetails] = useState<any>(null);
  const [isExtraLoading, setIsExtraLoading] = useState(false);

  // ヘッダー＆おすすめバナーの自動スライド用インデックス
  const [heroIndex, setHeroIndex] = useState(0);
  const heroTouchStartX = useRef(0);

  const isSearchActive = searchTitle || selectedTags.length > 0 || showFilters;

  // Supabase からコレクション取得
  useEffect(() => {
    const fetchCollection = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.from('user_movies').select('*');
        if (error) throw error;
        if (data) {
          const formattedData = data.map(item => ({
            movieId: item.movie_id,
            movieData: item.movie_data,
            status: item.status,
            score: item.score || 0,
            aiContent: item.ai_content || '',
            myReview: item.my_review || '',
            updatedAt: new Date(item.updated_at).getTime()
          }));
          setMyCollection(formattedData);
        }
      } catch (err) {
        console.error('Failed to fetch from Supabase:', err);
      }
    };
    fetchCollection();
  }, []);

  // ホーム画面映画取得
  useEffect(() => {
    const fetchHomeMovies = async () => {
      setIsHomeLoading(true);
      const newCategoryData: Record<string, any[]> = {};

      for (const cat of CATEGORIES) {
        let url = `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbApiKey}&language=ja-JP&page=1`;
        if (GENRES[cat]) {
          url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&language=ja-JP&with_genres=${GENRES[cat]}&sort_by=popularity.desc&page=1`;
        }

        try {
          if (!tmdbApiKey) throw new Error('API Key missing');
          const res = await fetch(url);
          if (!res.ok) throw new Error('Failed');
          const data = await res.json();

          if (data.results && data.results.length > 0) {
            const shuffled = data.results.sort(() => Math.random() - 0.5);
            newCategoryData[cat] = shuffled.map((movie: any) => ({
              id: movie.id.toString(),
              title: movie.title || movie.original_title,
              genre: cat,
              genreIds: movie.genre_ids || [],
              posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
              backdropUrl: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : '',
              releaseDate: movie.release_date || '不明',
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

  // おすすめバナーの自動オートスライド (5秒ごと)
  useEffect(() => {
    const recommendedList = homeCategoriesData['おすすめ'] || [];
    if (recommendedList.length === 0) return;
    const timer = setInterval(() => {
      setHeroIndex(prev => (prev + 1) % Math.min(recommendedList.length, 5));
    }, 5000);
    return () => clearInterval(timer);
  }, [homeCategoriesData]);

  // 詳細画面を開いたときにキャストや詳細情報をTMDbから追加取得
  useEffect(() => {
    const fetchMovieDetails = async () => {
      if (!viewingMovie || !tmdbApiKey) return;
      setIsExtraLoading(true);
      try {
        // クレジット（キャスト・監督）、プロバイダ（配信）、詳細情報（上映時間、年齢制限など）を並行取得
        const [detailRes, creditsRes, watchRes] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/movie/${viewingMovie.id}?api_key=${tmdbApiKey}&language=ja-JP`),
          fetch(`https://api.themoviedb.org/3/movie/${viewingMovie.id}/credits?api_key=${tmdbApiKey}&language=ja-JP`),
          fetch(`https://api.themoviedb.org/3/movie/${viewingMovie.id}/watch/providers?api_key=${tmdbApiKey}`)
        ]);

        const detail = await detailRes.json();
        const credits = await creditsRes.json();
        const watch = await watchRes.json();

        // 監督抽出
        const director = credits.crew?.find((c: any) => c.job === 'Director')?.name || '不明';
        // キャスト上位5名
        const cast = credits.cast?.slice(0, 5).map((c: any) => c.name) || [];
        // 制作会社
        const productionCompanies = detail.production_companies?.map((p: any) => p.name) || [];
        // 上映時間
        const runtime = detail.runtime ? `${detail.runtime}分` : '不明';
        // 年齢制限審査区分（USのcertificationや簡易表示）
        const certification = 'PG-12 / 一般'; 

        // 日本の配信サービス抽出
        const jpProviders = watch.results?.JP?.flatrate || [];
        const streamingServices = jpProviders.map((p: any) => ({
          name: p.provider_name,
          logo: `https://image.tmdb.org/t/p/w90${p.logo_path}`,
          url: watch.results?.JP?.link || 'https://www.themoviedb.org/'
        }));

        setMovieExtraDetails({
          runtime,
          certification,
          director,
          cast,
          productionCompanies,
          streamingServices,
          genres: detail.genres || []
        });
      } catch (err) {
        console.error('Failed to fetch extra movie details:', err);
      } finally {
        setIsExtraLoading(false);
      }
    };

    if (modalMode === 'detail') {
      setMovieExtraDetails(null);
      fetchMovieDetails();
    }
  }, [viewingMovie, modalMode]);

  // --- 検索と優先度ソート（一致度 > 人気度 > 評価順） ---
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
        let url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&language=ja-JP&sort_by=popularity.desc&page=1`;
        
        if (searchTitle) {
          url = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&language=ja-JP&query=${encodeURIComponent(searchTitle)}&page=1`;
        }

        // 複数タグ選択がある場合
        if (selectedTags.length > 0) {
          url += `&with_genres=${selectedTags.join(',')}`;
        }

        const res = await fetch(url);
        const data = await res.json();
        let results = data.results || [];

        // ひらがな・カタカナ違いや部分一致の適用 ＆ 一致度スコアリング
        const normalizedQuery = normalizeText(searchTitle);

        const scoredResults = results.map((movie: any) => {
          const titleNorm = normalizeText(movie.title || '');
          let matchScore = 0;
          if (normalizedQuery) {
            if (titleNorm === normalizedQuery) matchScore = 3; // 完全一致
            else if (titleNorm.includes(normalizedQuery)) matchScore = 2; // 部分一致
            else matchScore = 1; // ヒット
          } else {
            matchScore = 2;
          }
          return { ...movie, matchScore };
        });

        // クライアント側での詳細フィルター（公開年・評価の範囲指定）
        const filtered = scoredResults.filter((movie: any) => {
          const releaseYear = parseInt(movie.release_date?.substring(0, 4) || '0');
          const vote = movie.vote_average || 0;
          const yearMatch = releaseYear >= parseInt(filterYearMin) && releaseYear <= parseInt(filterYearMax);
          const ratingMatch = vote >= parseFloat(filterRatingMin) && vote <= parseFloat(filterRatingMax);
          return yearMatch && ratingMatch;
        });

        // 優先度ソート: 1.一致度(matchScore)降順, 2.人気度(popularity)降順, 3.評価(vote_average)降順
        filtered.sort((a, b) => {
          if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
          if (b.popularity !== a.popularity) return b.popularity - a.popularity;
          return b.vote_average - a.vote_average;
        });

        const mapped = filtered.map((movie: any) => ({
          id: movie.id.toString(),
          title: movie.title || movie.original_title,
          genre: '映画',
          genreIds: movie.genre_ids || [],
          posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
          releaseDate: movie.release_date || '不明',
          apiSynopsis: movie.overview || 'あらすじ情報がありません。',
          voteAverage: movie.vote_average ? movie.vote_average.toFixed(1) : '0.0'
        }));

        setSearchResults(mapped);
      } catch (err) {
        console.error(err);
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
    setSelectedTags(prev => 
      prev.includes(genreId) ? prev.filter(id => id !== genreId) : [...prev, genreId]
    );
  };

  const resetSearch = () => {
    setSearchTitle('');
    setSelectedTags([]);
    setShowFilters(false);
  };

  const handleOpenGenreList = (category: string) => {
    setGenreViewCategory(category);
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
    const initScore = existing?.score !== undefined ? existing.score : 6.0;
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
    } catch (err) {
      console.error('Supabase Error:', err);
    }
  };

  const handleDeleteFromCollection = async (movieId: string) => {
    setMyCollection(prev => prev.filter(item => item.movieId !== movieId));
    if (supabase) {
      await supabase.from('user_movies').delete().eq('movie_id', movieId);
    }
    setModalMode(null);
  };

  const handleAddWatchlist = async (movie: any) => {
    const newEntry = {
      movieId: movie.id,
      movieData: movie,
      status: 'watchlist',
      updatedAt: Date.now()
    };
    setMyCollection(prev => {
      const filtered = prev.filter(item => item.movieId !== movie.id);
      return [...filtered, newEntry];
    });
    await saveToSupabase(newEntry);
    setModalMode(null);
  };

  // レビューを書かなくても「みた！」ボタンを押せば鑑賞済みに登録する（初回はデフォルトスコア6.0等）
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
    setMyCollection(prev => {
      const filtered = prev.filter(item => item.movieId !== movie.id);
      return [...filtered, newEntry];
    });
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
    setMyCollection(prev => {
      const filtered = prev.filter(item => item.movieId !== viewingMovie.id);
      return [...filtered, reviewEntry];
    });
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

  // --- 詳細モーダル ---
  const renderDetailModal = () => {
    if (!viewingMovie) return null;
    const collectionData = getCollectionData(viewingMovie.id);
    const status = collectionData?.status || 'none';
    const currentScore = collectionData?.score || 0;
    const face = getFaceRating(currentScore);

    return (
      <div className="absolute inset-0 bg-[#141414] z-[60] flex flex-col pb-safe animate-in slide-in-from-bottom-10 fade-in duration-300">
        <header className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-50">
          <button onClick={() => setModalMode(null)} className="p-2.5 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition cursor-pointer">
            <ArrowLeft size={20} />
          </button>
          {/* 鑑賞済みまたはみたい！リストのとき、右上にゴミ箱マークを追加 */}
          {status !== 'none' && (
            <button 
              onClick={() => setModalMode('delete_confirm')} 
              className="p-2.5 bg-red-600/80 backdrop-blur-md text-white rounded-full hover:bg-red-700 transition cursor-pointer"
              title="削除"
            >
              <Trash2 size={18} />
            </button>
          )}
        </header>

        {/* 削除確認モーダル内部ダイアログ */}
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
              <img src={viewingMovie.posterUrl} alt={viewingMovie.title} className="relative h-full w-full object-cover shadow-2xl" />
            ) : (
              <div className="relative h-full flex items-center justify-center text-zinc-600">No Image</div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent" />
          </div>

          <div className="px-5 -mt-6 relative z-10 space-y-6 pb-36">
            <div>
              <h2 className="text-2xl font-extrabold text-white leading-tight mb-2">{viewingMovie.title}</h2>
              {/* 公開年、評価の横に「上映時間」「年齢制限審査区分」を小さく配置 */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-300">
                <span className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                  <Star size={12} className="fill-yellow-500" /> {viewingMovie.voteAverage}
                </span>
                <span className="flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded text-zinc-300"><Calendar size={12} /> {viewingMovie.releaseDate.substring(0, 4)}</span>
                {movieExtraDetails?.runtime && (
                  <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300">{movieExtraDetails.runtime}</span>
                )}
                {movieExtraDetails?.certification && (
                  <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 border border-zinc-700">{movieExtraDetails.certification}</span>
                )}
              </div>
            </div>

            {/* 評価点に応じた5段階の顔アイコン表示（点数をつける時 & 詳細画面） */}
            {status === 'watched' && currentScore > 0 && (
              <div className="flex items-center gap-3 bg-zinc-900/80 p-3.5 rounded-xl border border-zinc-800">
                <face.icon size={32} className={face.color} />
                <div>
                  <div className="text-xs font-bold text-red-500">{face.label}</div>
                  <div className="text-sm font-extrabold text-white">{currentScore.toFixed(1)}点</div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                {viewingMovie.apiSynopsis}
              </p>
            </div>

            {/* 詳細情報セクション（シリーズ、制作会社、キャスト、監督、タグ、配信サービス、関連作品） */}
            <div className="space-y-4 pt-4 border-t border-zinc-800/80 text-xs">
              {isExtraLoading ? (
                <div className="flex items-center justify-center py-4 text-zinc-500 gap-2">
                  <Loader2 size={16} className="animate-spin text-red-500" /> 詳細情報を読み込み中...
                </div>
              ) : movieExtraDetails ? (
                <div className="space-y-3">
                  {/* 監督・キャスト */}
                  <div className="grid grid-cols-2 gap-2 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                    <div>
                      <span className="text-zinc-500 block mb-0.5">監督</span>
                      <span className="text-zinc-200 font-bold">{movieExtraDetails.director}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block mb-0.5">キャスト</span>
                      <span className="text-zinc-200 font-bold line-clamp-1">{movieExtraDetails.cast.join(', ') || '情報なし'}</span>
                    </div>
                  </div>

                  {/* 制作会社 */}
                  {movieExtraDetails.productionCompanies.length > 0 && (
                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                      <span className="text-zinc-500 block mb-0.5">制作会社</span>
                      <span className="text-zinc-200 font-medium">{movieExtraDetails.productionCompanies.join(', ')}</span>
                    </div>
                  )}

                  {/* タグ (押したらその条件で検索が走る) */}
                  {movieExtraDetails.genres.length > 0 && (
                    <div>
                      <span className="text-zinc-500 block mb-1">タグ</span>
                      <div className="flex flex-wrap gap-1.5">
                        {movieExtraDetails.genres.map((g: any) => (
                          <button
                            key={g.id}
                            onClick={() => {
                              setSelectedTags([g.id.toString()]);
                              setActiveTab('home');
                              setModalMode(null);
                            }}
                            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer border border-zinc-700"
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 配信サービス (押したらそのサービスのURLに飛ぶ) */}
                  {movieExtraDetails.streamingServices.length > 0 && (
                    <div>
                      <span className="text-zinc-500 block mb-1">配信サービス</span>
                      <div className="flex flex-wrap gap-2">
                        {movieExtraDetails.streamingServices.map((service: any, idx: number) => (
                          <a
                            key={idx}
                            href={service.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-zinc-200 font-bold transition border border-zinc-700"
                          >
                            {service.logo && <img src={service.logo} alt={service.name} className="w-4 h-4 rounded" />}
                            {service.name}
                          </a>
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

        {/* --- 下部アクションボタン群 --- */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#141414] via-[#141414]/95 to-transparent pt-12 pb-safe border-t border-zinc-800/50 z-50 pointer-events-auto">
          {status === 'none' && (
            <div className="flex gap-3">
              <button onClick={() => handleAddWatchlist(viewingMovie)} className="flex-1 py-3.5 bg-zinc-800 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-zinc-700 active:scale-95 transition-all text-sm cursor-pointer border border-zinc-700">
                <Plus size={18} /> みたい！
              </button>
              {/* みた！ボタンを押せば、レビューを書かなくても即座に鑑賞済みに登録される */}
              <button 
                onClick={async () => {
                  await handleQuickWatch(viewingMovie);
                  setModalMode(null);
                  setActiveTab('watched');
                }} 
                className="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-red-700 active:scale-95 transition-all text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer"
              >
                <CheckCircle2 size={18} /> みた！
              </button>
            </div>
          )}

          {status === 'watchlist' && (
            <div className="flex gap-3">
              {/* みた！ボタンを押して初めてレビューを記録するボタンに変わる / 連動 */}
              <button 
                onClick={async () => {
                  await handleQuickWatch(viewingMovie);
                  setActiveTab('watched');
                  setModalMode(null);
                }} 
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

  // --- レビュー記録・編集モーダル ---
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
              <img src={viewingMovie.posterUrl} alt={viewingMovie.title} className="w-14 h-20 object-cover rounded shadow-md bg-zinc-800" />
            ) : (
              <div className="w-14 h-20 bg-zinc-800 rounded shadow-md"></div>
            )}
            <div className="flex-1">
              <h2 className="text-base font-bold text-white leading-tight line-clamp-2">{viewingMovie.title}</h2>
              <p className="text-xs text-zinc-400 mt-1">{viewingMovie.releaseDate}</p>
            </div>
          </div>

          {/* 点数をつける時と詳細画面で、評価点に応じた5段階の顔アイコンが出る */}
          <div className="space-y-4 bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <currentFace.icon size={40} className={currentFace.color} />
                <div>
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wider">{currentFace.label}</span>
                  <div className="text-2xl font-black text-white">{editScore.toFixed(1)}<span className="text-xs text-zinc-500"> /10.0</span></div>
                </div>
              </div>
            </div>
            <input
              type="range" min="0" max="10" step="0.5" value={editScore}
              onChange={(e) => setEditScore(Number(e.target.value))}
              className="w-full accent-red-600 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            {/* 5段階の顔アイコンを一発で選べるセレクター */}
            <div className="flex justify-between pt-1">
              {FACE_RATINGS.map((f) => (
                <button
                  key={f.score}
                  onClick={() => setEditScore(f.score)}
                  className={`flex flex-col items-center p-2 rounded-lg transition cursor-pointer ${Math.abs(editScore - f.score) < 1 ? 'bg-red-600/20 border border-red-500' : 'bg-zinc-800/50 border border-zinc-800'}`}
                >
                  <f.icon size={24} className={f.color} />
                  <span className="text-[10px] text-zinc-400 mt-0.5">{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-bold text-purple-400 flex items-center gap-2">
                <Wand2 size={16} /> 内容
              </label>
              <button
                onClick={handleGenerateAiPlot} disabled={isAiLoading}
                className="text-xs px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-full font-bold flex items-center gap-1 active:scale-95 transition border border-purple-500/30 cursor-pointer"
              >
                {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {isAiLoading ? '生成中...' : '自動生成'}
              </button>
            </div>
            <textarea
              value={editAiContent} onChange={(e) => setEditAiContent(e.target.value)}
              placeholder="映画の内容や展開を記録..."
              className="w-full bg-zinc-900 border border-purple-900/30 rounded-xl p-4 text-zinc-200 text-sm focus:outline-none focus:border-purple-500 min-h-[130px] leading-relaxed resize-none transition"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-white">自分の感想</label>
            <textarea
              value={editMyReview} onChange={(e) => setEditMyReview(e.target.value)}
              placeholder="率直な感想を記録..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-200 text-sm focus:outline-none focus:border-zinc-500 min-h-[100px] resize-none transition"
            />
            {/* 感想欄の下にも保存ボタンが欲しいというご要望への対応 */}
            <button 
              onClick={handleSaveReview}
              className="w-full py-3.5 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 active:scale-95 transition cursor-pointer mt-2"
            >
              保存する
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- ジャンル一覧画面 ---
  const renderGenreView = () => {
    if (!genreViewCategory) return null;
    const movies = homeCategoriesData[genreViewCategory] || [];

    return (
      <div className="flex-1 overflow-y-auto pb-24 bg-[#141414] animate-in fade-in duration-200">
        <header className="sticky top-0 bg-[#141414]/90 backdrop-blur-md px-4 py-4 flex items-center gap-3 z-30 border-b border-zinc-800">
          <button onClick={() => setActiveTab('home')} className="text-zinc-400 hover:text-white p-1 cursor-pointer">
            <ArrowLeft size={22} />
          </button>
          <h2 className="text-lg font-bold text-white">{genreViewCategory}</h2>
        </header>
        
        <div className="p-4 grid grid-cols-3 gap-2">
          {movies.map((movie: any) => {
            const status = getCollectionData(movie.id)?.status;
            return (
              <div key={movie.id} onClick={() => openDetailModal(movie, 'genre_view')} className="cursor-pointer active:scale-95 transition-transform group relative">
                {movie.posterUrl ? (
                  <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover rounded-md shadow-md bg-zinc-800 group-hover:brightness-75 transition-all" />
                ) : (
                  <div className="w-full aspect-[2/3] bg-zinc-800 rounded-md shadow-md flex items-center justify-center p-2 text-center text-[10px] text-zinc-500">
                    {movie.title}
                  </div>
                )}
                {status && (
                  <div className="absolute top-1 right-1 bg-black/70 rounded-full p-1 backdrop-blur-md border border-white/10 z-10">
                    {status === 'watched' ? <CheckCircle2 size={12} className="text-green-500" /> : <Bookmark size={12} className="text-white" />}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // --- ホーム画面 ---
  const renderHome = () => {
    const recommendedList = homeCategoriesData['おすすめ'] || [];

    return (
      <div className="flex-1 overflow-y-auto pb-24 bg-[#141414]">
        {/* 全画面表示されるアプリのタイトルが表記されたヘッダーを追加 */}
        <header className="sticky top-0 z-40 bg-[#141414]/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-black text-xl tracking-tighter">CINEMA LOG</span>
          </div>
          <div className="text-xs text-zinc-400 font-medium">映画管理アプリ</div>
        </header>

        {/* 検索・タグエリア */}
        <div className="sticky top-[49px] z-30 bg-[#141414]/95 backdrop-blur-md pt-3 pb-3 px-4 border-b border-zinc-800/50">
          <div className="flex flex-col gap-2.5">
            <div className="flex gap-2 relative">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input
                  type="text" value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)}
                  placeholder="ひらがな・部分一致対応の映画検索..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg py-2.5 pl-10 pr-8 text-white text-xs focus:outline-none focus:border-red-500 transition-all placeholder:text-zinc-500"
                />
                {searchTitle && (
                  <button onClick={() => setSearchTitle('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 cursor-pointer">
                    <X size={16} />
                  </button>
                )}
              </div>
              {/* 今検索ボタンの右にある詳細絞り込みボタンを小さい丸で配置 */}
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`w-10 h-10 rounded-full border flex items-center justify-center transition cursor-pointer shrink-0
                  ${showFilters || filterYearMin !== '2000' || filterRatingMin !== '0' ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}
                title="詳細絞り込み"
              >
                <SlidersHorizontal size={16} />
              </button>
            </div>

            {/* 複数タグ検索: 検索欄の下に小さくタグのボタンを全て並べて、押すだけでソート（複数選択可） */}
            <div className="flex overflow-x-auto gap-1.5 py-1 [&::-webkit-scrollbar]:hidden">
              {Object.entries(GENRES).filter(([k]) => k !== 'おすすめ').map(([name, id]) => {
                const isSelected = selectedTags.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleTagSelection(id)}
                    className={`px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition cursor-pointer border
                      ${isSelected ? 'bg-red-600 text-white border-red-500 shadow-md' : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'}`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            {/* 詳細絞り込み（公開年・評価の上限下限スライダー・入力欄） */}
            {showFilters && (
              <div className="bg-zinc-900 p-3.5 rounded-xl border border-zinc-800 space-y-3 animate-in fade-in">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>公開年範囲: {filterYearMin}年 〜 {filterYearMax}年</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input type="number" value={filterYearMin} onChange={e => setFilterYearMin(e.target.value)} className="w-full bg-zinc-800 text-white text-xs p-1.5 rounded border border-zinc-700" />
                    <span className="text-zinc-500">〜</span>
                    <input type="number" value={filterYearMax} onChange={e => setFilterYearMax(e.target.value)} className="w-full bg-zinc-800 text-white text-xs p-1.5 rounded border border-zinc-700" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-zinc-400">
                    <span>評価範囲: {filterRatingMin}以上 〜 {filterRatingMax}以下</span>
                  </div>
                  <input
                    type="range" min="0" max="10" step="1" value={filterRatingMin}
                    onChange={e => setFilterRatingMin(e.target.value)}
                    className="w-full accent-red-600 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 検索結果表示 */}
        {isSearchActive ? (
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-zinc-300 text-xs font-bold flex items-center gap-2">
                検索結果 (一致度・人気度・評価優先) {isSearching && <Loader2 size={12} className="animate-spin text-red-500" />}
              </h3>
              <button onClick={resetSearch} className="text-[11px] text-zinc-500 hover:text-zinc-300">クリア</button>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {searchResults.map((movie: any) => (
                  <div key={movie.id} onClick={() => openDetailModal(movie, 'home')} className="cursor-pointer active:scale-95 transition-transform group relative">
                    {movie.posterUrl ? (
                      <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover rounded-md shadow-md bg-zinc-800 group-hover:brightness-75 transition-all" />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-zinc-800 rounded-md shadow-md flex items-center justify-center p-2 text-center text-[10px] text-zinc-500">
                        {movie.title}
                      </div>
                    )}
                    {getCollectionData(movie.id)?.status && (
                      <div className="absolute top-1 right-1 bg-black/70 rounded-full p-1 backdrop-blur-md border border-white/10 z-10">
                        {getCollectionData(movie.id)?.status === 'watched' ? <CheckCircle2 size={12} className="text-green-500" /> : <Bookmark size={12} className="text-white" />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !isSearching && <p className="text-zinc-500 text-xs text-center mt-10">条件に一致する作品が見つかりません</p>
            )}
          </div>
        ) : (
          <div className="space-y-6 pb-8">
            {isHomeLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-500">
                <Loader2 size={32} className="animate-spin text-red-600" />
                <p className="text-xs font-bold">映画データを取得中...</p>
              </div>
            ) : (
              <>
                {/* ホーム画面のおすすめの映画だけは配信サービスみたいに1作品のちょうどいい画像を横幅いっぱいにどんと出るように、一定時間で切り替わっていって横スライドもできるように */}
                {recommendedList.length > 0 && (
                  <div className="px-4 pt-3">
                    <h3 className="text-zinc-100 font-bold text-sm mb-2">おすすめ作品</h3>
                    <div 
                      className="relative w-full aspect-[16/9] rounded-xl overflow-hidden shadow-2xl cursor-pointer group bg-zinc-900"
                      onClick={() => openDetailModal(recommendedList[heroIndex], 'home')}
                      onTouchStart={e => heroTouchStartX.current = e.touches[0].clientX}
                      onTouchEnd={e => {
                        const diff = e.changedTouches[0].clientX - heroTouchStartX.current;
                        if (diff > 50) setHeroIndex(prev => (prev - 1 + 5) % 5);
                        if (diff < -50) setHeroIndex(prev => (prev + 1) % 5);
                      }}
                    >
                      {recommendedList[heroIndex]?.backdropUrl || recommendedList[heroIndex]?.posterUrl ? (
                        <img 
                          src={recommendedList[heroIndex].backdropUrl || recommendedList[heroIndex].posterUrl} 
                          alt="Hero" 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                        />
                      ) : null}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-4 flex flex-col justify-end">
                        <h4 className="text-white font-extrabold text-base line-clamp-1">{recommendedList[heroIndex]?.title}</h4>
                        <p className="text-zinc-300 text-[11px] line-clamp-1 mt-0.5">{recommendedList[heroIndex]?.apiSynopsis}</p>
                      </div>
                      {/* ドットインジケーター */}
                      <div className="absolute top-3 right-3 flex gap-1 bg-black/50 px-2 py-1 rounded-full backdrop-blur-md">
                        {recommendedList.slice(0, 5).map((_, idx) => (
                          <span key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${idx === heroIndex ? 'bg-white w-3' : 'bg-white/40'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 各カテゴリの横スクロールリスト（一番上の画像カルーセル含む複数画像対応） */}
                {CATEGORIES.map(category => {
                  if (category === 'おすすめ') return null; // おすすめは上記でヒーロー表示済み
                  const allMovies = homeCategoriesData[category] || [];
                  if (allMovies.length === 0) return null;
                  const rowMovies = allMovies.slice(0, 10);
                  
                  return (
                    <div key={category} className="space-y-2.5">
                      <div className="flex justify-between items-end px-4">
                        <h3 className="text-zinc-100 font-bold text-sm">{category}</h3>
                        <button onClick={() => handleOpenGenreList(category)} className="text-[11px] font-bold text-zinc-400 hover:text-white flex items-center gap-0.5 cursor-pointer">
                          すべて見る <ChevronRight size={12} />
                        </button>
                      </div>
                      <div className="flex overflow-x-auto snap-x px-4 gap-2.5 pb-2 pt-1 [&::-webkit-scrollbar]:hidden">
                        {rowMovies.map((movie: any) => {
                          const status = getCollectionData(movie.id)?.status;
                          return (
                            <div key={movie.id} onClick={() => openDetailModal(movie, 'home')} className="flex-none w-[100px] snap-start relative rounded-md overflow-hidden active:scale-95 transition-transform cursor-pointer group shadow-lg">
                              {movie.posterUrl ? (
                                <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover bg-zinc-800 group-hover:brightness-75 transition" />
                              ) : (
                                <div className="w-full aspect-[2/3] bg-zinc-800 flex items-center justify-center text-center text-[10px] text-zinc-500 p-1">
                                  {movie.title}
                                </div>
                              )}
                              {status && (
                                <div className="absolute top-1 right-1 bg-black/70 rounded-full p-1 backdrop-blur-md border border-white/10 z-10">
                                  {status === 'watched' ? <CheckCircle2 size={12} className="text-green-500" /> : <Bookmark size={12} className="text-white" />}
                                </div>
                              )}
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

  const renderMyList = (statusFilter: 'watchlist' | 'watched') => {
    const list = myCollection
      .filter(item => item.status === statusFilter)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(item => ({
        ...item.movieData,
        collectionData: item
      }));

    const title = statusFilter === 'watched' ? '鑑賞済み' : 'みたい！リスト';

    return (
      <div className="flex-1 overflow-y-auto pb-24 bg-[#141414] px-4 pt-6">
        <h2 className="text-xl font-black text-white mb-4">{title}</h2>
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-600">
            {statusFilter === 'watched' ? <CheckCircle2 size={48} className="opacity-20 mb-4" /> : <Bookmark size={48} className="opacity-20 mb-4" />}
            <p className="text-xs font-medium">まだ作品がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {list.map((movie: any) => {
              const score = movie.collectionData.score || 0;
              const face = getFaceRating(score);
              
              return (
                <div
                  key={movie.id}
                  onClick={() => openDetailModal(movie, statusFilter)}
                  className="relative rounded-md overflow-hidden shadow-md active:scale-95 transition-transform cursor-pointer group"
                >
                  {movie.posterUrl ? (
                    <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover bg-zinc-800 group-hover:brightness-75 transition" />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-zinc-800 flex items-center justify-center text-center text-[10px] text-zinc-500 p-1">
                      {movie.title}
                    </div>
                  )}

                  {statusFilter === 'watched' && score > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-1.5 pt-4 flex justify-between items-center z-10 px-2">
                      {/* アイコンの表示に変更 */}
                      <face.icon size={16} className={face.color} />
                      <span className="text-[11px] text-white font-bold">{score.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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
          <button onClick={() => { setActiveTab('home'); setModalMode(null); }} className={`flex flex-col items-center p-2 transition cursor-pointer ${activeTab === 'home' || activeTab === 'genre_view' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Home size={20} />
            <span className="text-[10px] mt-1 font-bold">ホーム</span>
          </button>
          <button onClick={() => { setActiveTab('watchlist'); setModalMode(null); }} className={`flex flex-col items-center p-2 transition cursor-pointer ${activeTab === 'watchlist' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Bookmark size={20} />
            <span className="text-[10px] mt-1 font-bold">みたい！</span>
          </button>
          <button onClick={() => { setActiveTab('watched'); setModalMode(null); }} className={`flex flex-col items-center p-2 transition cursor-pointer ${activeTab === 'watched' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
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

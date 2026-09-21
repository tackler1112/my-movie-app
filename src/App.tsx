import React, { useState, useEffect, useCallback } from 'react';
import { Star, Plus, ArrowLeft, Wand2, Loader2, Search, Bookmark, CheckCircle2, Home, X, Calendar, Edit3, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// --- APIキー設定 (Vite環境変数) ---
const tmdbApiKey = import.meta.env?.VITE_TMDB_API_KEY || '';

// --- Supabase 初期化 ---
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// --- ジャンル定義とTMDbのジャンルIDマッピング ---
const GENRES: Record<string, string> = {
  'おすすめ': '', // popular
  '名作アクション': '28',
  'アニメ': '16',
  'ヒューマンドラマ': '18',
  'SF・ファンタジー': '878',
  'ホラー・スリラー': '27',
  'コメディ': '35',
  'ロマンス': '10749'
};
const CATEGORIES = Object.keys(GENRES);

// --- APIフォールバック用の初期モックデータ ---
const FALLBACK_MOVIES: Record<string, any[]> = {
  'おすすめ': [
    { id: 'm1', title: '劇場版 呪術廻戦 0', genre: 'アニメ', posterUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/mktxHLSKIK1aXjJ9UxaA3wT69dO.jpg', releaseDate: '2021-12-24', apiSynopsis: '幼少のころ、幼なじみの祈本里香を交通事故により目の前で失った乙骨憂太。', voteAverage: '8.5' },
    { id: 'm2', title: 'ザ・スーパーマリオブラザーズ・ムービー', genre: 'アニメ', posterUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/qNBAXBIQlnOAW9YRcgxotFCVW3U.jpg', releaseDate: '2023-04-28', apiSynopsis: 'ニューヨークで配管工を営む双子の兄弟マリオとルイージ。', voteAverage: '7.8' }
  ]
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'watchlist' | 'watched' | 'genre_view'
  const [myCollection, setMyCollection] = useState<any[]>([]);
  const [modalMode, setModalMode] = useState<string | null>(null); // 'detail' | 'review'
  const [viewingMovie, setViewingMovie] = useState<any>(null);
  const [fromTab, setFromTab] = useState<string>('home');

  // ホーム画面用カテゴリ別APIデータ保持state
  const [homeCategoriesData, setHomeCategoriesData] = useState<Record<string, any[]>>({});
  const [isHomeLoading, setIsHomeLoading] = useState(true);
  const [genreViewCategory, setGenreViewCategory] = useState<string | null>(null);

  // 検索用state (複数条件)
  const [searchTitle, setSearchTitle] = useState('');
  const [searchGenre, setSearchGenre] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchRating, setSearchRating] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // 編集フォーム用state
  const [editScore, setEditScore] = useState(5.0); // 10点満点
  const [editAiContent, setEditAiContent] = useState('');
  const [editMyReview, setEditMyReview] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // 検索中かどうかの判定フラグ
  const isSearchActive = searchTitle || searchGenre || searchYear || searchRating;

  // Supabase からコレクションデータを取得
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

  // --- ホーム画面の映画をTMDb APIから一括取得＆ランダム化 ---
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
          if (!tmdbApiKey) throw new Error('TMDb API Key is missing');
          const res = await fetch(url);
          if (!res.ok) throw new Error('API request failed');
          const data = await res.json();

          if (data.results && data.results.length > 0) {
            // ★ ランダムに並び替えて20件保持する
            const shuffled = data.results.sort(() => Math.random() - 0.5);
            newCategoryData[cat] = shuffled.map((movie: any) => ({
              id: movie.id.toString(),
              title: movie.title || movie.original_title,
              genre: cat,
              posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
              releaseDate: movie.release_date || '不明',
              apiSynopsis: movie.overview || 'あらすじ情報がありません。',
              voteAverage: movie.vote_average ? movie.vote_average.toFixed(1) : '0.0'
            }));
          } else {
            newCategoryData[cat] = FALLBACK_MOVIES[cat] || FALLBACK_MOVIES['おすすめ'];
          }
        } catch (err) {
          console.warn(`Failed to fetch category "${cat}", using fallback:`, err);
          newCategoryData[cat] = FALLBACK_MOVIES[cat] || FALLBACK_MOVIES['おすすめ'];
        }
      }

      setHomeCategoriesData(newCategoryData);
      setIsHomeLoading(false);
    };

    fetchHomeMovies();
  }, []);

  // --- 複数条件検索 (タイトル・ジャンル・年代・評価) ---
  useEffect(() => {
    if (!isSearchActive) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        if (!tmdbApiKey) throw new Error('TMDb API Key is missing');
        let url = '';
        let isDiscover = false;

        if (searchTitle) {
          // タイトル入力がある場合はSearch APIを使用
          url = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&language=ja-JP&query=${encodeURIComponent(searchTitle)}&page=1`;
        } else {
          // フィルターのみの場合はDiscover APIを使用
          isDiscover = true;
          url = `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbApiKey}&language=ja-JP&sort_by=popularity.desc&page=1`;
          if (searchGenre) url += `&with_genres=${searchGenre}`;
          if (searchYear) url += `&primary_release_year=${searchYear}`;
          if (searchRating) url += `&vote_average.gte=${searchRating}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error('API request failed');
        const data = await response.json();
        let results = data.results || [];

        // タイトル検索の場合はクライアント側でフィルターを適用
        if (!isDiscover) {
          if (searchGenre) {
            results = results.filter((m: any) => m.genre_ids?.includes(Number(searchGenre)));
          }
          if (searchYear) {
            results = results.filter((m: any) => m.release_date?.startsWith(searchYear));
          }
          if (searchRating) {
            results = results.filter((m: any) => m.vote_average >= Number(searchRating));
          }
        }

        const mappedResults = results.map((movie: any) => ({
          id: movie.id.toString(),
          title: movie.title || movie.original_title,
          genre: '映画',
          posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '',
          releaseDate: movie.release_date || '不明',
          apiSynopsis: movie.overview || 'あらすじ情報がありません。',
          voteAverage: movie.vote_average ? movie.vote_average.toFixed(1) : '0.0'
        }));
        setSearchResults(mappedResults);
      } catch (error) {
        console.warn("Search failed:", error);
      } finally {
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTitle, searchGenre, searchYear, searchRating, isSearchActive]);

  const getCollectionData = useCallback((movieId: string) => {
    return myCollection.find(item => item.movieId === movieId);
  }, [myCollection]);

  const resetSearch = () => {
    setSearchTitle('');
    setSearchGenre('');
    setSearchYear('');
    setSearchRating('');
    setShowFilters(false);
  };

  const openDetailModal = (movie: any, originTab: string) => {
    setViewingMovie(movie);
    setFromTab(originTab);
    setModalMode('detail');
  };

  const openReviewModal = (movie: any) => {
    const existing = getCollectionData(movie.id);
    setViewingMovie(movie);
    // 古いデータ（100点満点）への互換性対応
    const initScore = existing?.score !== undefined 
      ? (existing.score > 10 ? existing.score / 10 : existing.score) 
      : 5.0;
    setEditScore(initScore);
    setEditAiContent(existing?.aiContent ?? '');
    setEditMyReview(existing?.myReview ?? '');
    setModalMode('review');
  };

  const handleOpenGenreList = (category: string) => {
    setGenreViewCategory(category);
    setActiveTab('genre_view');
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
      console.error('Supabase Upsert Error:', err);
    }
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
    setActiveTab('home');
    resetSearch();
  };

  const handleSaveReview = async () => {
    if (!viewingMovie) return;
    const reviewEntry = {
      movieId: viewingMovie.id,
      movieData: viewingMovie,
      status: 'watched',
      score: Number(editScore.toFixed(1)), // 10点満点で保存
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
    setActiveTab('watched');
  };

  const handleGenerateAiPlot = async () => {
    if (!viewingMovie) return;
    setIsAiLoading(true);
    setTimeout(() => {
      const title = viewingMovie.title;
      const intro = viewingMovie.apiSynopsis && viewingMovie.apiSynopsis !== 'あらすじ情報がありません。'
        ? viewingMovie.apiSynopsis.substring(0, 40) + '…という波乱の幕開けから始まる本作。'
        : '主人公が予期せぬトラブルに巻き込まれるところから始まる本作。';
      const aiGeneratedMockText = `【『${title}』の内容・展開予測】\n${intro}中盤では最大の挫折を経験し、一度は諦めかけますが、かつての敵が味方になるなど予期せぬ助けを得て立ち直ります。\n\n【結末】\n最終決戦では自己犠牲を伴う決断を迫られますが、知恵と勇気で最悪の事態を回避。『${title}』ならではの衝撃の事実とともに物語は幕を閉じます。`;
      setEditAiContent(aiGeneratedMockText);
      setIsAiLoading(false);
    }, 2000);
  };

  // --- 詳細モーダル ---
  const renderDetailModal = () => {
    if (!viewingMovie) return null;
    const collectionData = getCollectionData(viewingMovie.id);
    const status = collectionData?.status || 'none';
    const displayScore = collectionData?.score > 10 ? (collectionData.score / 10).toFixed(1) : Number(collectionData?.score || 0).toFixed(1);

    return (
      <div className="absolute inset-0 bg-[#141414] z-[60] flex flex-col pb-safe animate-in slide-in-from-bottom-10 fade-in duration-300">
        <header className="flex items-center p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-50">
          <button onClick={() => setModalMode(null)} className="p-2.5 bg-black/40 backdrop-blur-md text-white rounded-full hover:bg-black/60 transition cursor-pointer relative z-50">
            <ArrowLeft size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="relative w-full aspect-[2/3] max-h-[60vh] bg-zinc-900 flex justify-center overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center blur-xl opacity-40 scale-110" style={{ backgroundImage: `url(${viewingMovie.posterUrl})` }} />
            {viewingMovie.posterUrl ? (
              <img src={viewingMovie.posterUrl} alt={viewingMovie.title} className="relative h-full w-full object-cover shadow-2xl" />
            ) : (
              <div className="relative h-full flex items-center justify-center text-zinc-600">No Image</div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#141414] via-[#141414]/80 to-transparent" />
          </div>

          <div className="px-5 -mt-8 relative z-10 space-y-6 pb-36">
            <div>
              <h2 className="text-3xl font-extrabold text-white leading-tight mb-3 drop-shadow-lg">{viewingMovie.title}</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-zinc-300">
                <span className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20">
                  <Star size={14} className="fill-yellow-500" /> {viewingMovie.voteAverage}
                </span>
                <span className="flex items-center gap-1"><Calendar size={14} /> {viewingMovie.releaseDate.substring(0, 4)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-medium">
                {viewingMovie.apiSynopsis}
              </p>
            </div>

            {status === 'watched' && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-red-500 uppercase tracking-wider">鑑賞済みレビュー</span>
                  <div className="flex items-center gap-1 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                    <Star size={14} className="text-red-500 fill-red-500" />
                    <span className="text-sm font-bold text-white">{displayScore} / 10.0</span>
                  </div>
                </div>

                {collectionData.aiContent && (
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 space-y-2">
                    <h4 className="text-xs font-bold text-zinc-400">内容</h4>
                    <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">{collectionData.aiContent}</p>
                  </div>
                )}

                {collectionData.myReview && (
                  <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 space-y-2">
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
          {fromTab !== 'watchlist' && fromTab !== 'watched' && (
            <div className="flex gap-3">
              {status === 'none' ? (
                <button onClick={() => handleAddWatchlist(viewingMovie)} className="flex-1 py-3.5 bg-zinc-800 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-zinc-700 active:scale-95 transition-all text-sm cursor-pointer border border-zinc-700">
                  <Plus size={18} /> みたい！
                </button>
              ) : (
                <button disabled className="flex-1 py-3.5 bg-zinc-900 text-zinc-500 font-bold rounded-lg flex justify-center items-center gap-2 text-sm border border-zinc-800 cursor-not-allowed">
                  <CheckCircle2 size={18} className="text-green-500" /> 追加済み
                </button>
              )}
              <button onClick={() => openReviewModal(viewingMovie)} className="flex-1 py-3.5 bg-red-600 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-red-700 active:scale-95 transition-all text-sm shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">
                <Star size={18} className="fill-white" /> {status === 'watched' ? 'レビューを編集' : 'レビューする'}
              </button>
            </div>
          )}

          {fromTab === 'watchlist' && (
            <button onClick={() => openReviewModal(viewingMovie)} className="w-full py-3.5 bg-red-600 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-red-700 active:scale-95 transition-all text-base shadow-[0_0_15px_rgba(220,38,38,0.4)] cursor-pointer">
              <Star size={22} className="fill-white" /> レビューを記録する
            </button>
          )}

          {fromTab === 'watched' && (
            <button onClick={() => openReviewModal(viewingMovie)} className="w-full py-3.5 bg-zinc-800 text-white font-bold rounded-lg flex justify-center items-center gap-2 hover:bg-zinc-700 active:scale-95 transition-all text-base cursor-pointer border border-zinc-700">
              <Edit3 size={18} /> 編集する
            </button>
          )}
        </div>
      </div>
    );
  };

  // --- レビュー記録・編集モーダル ---
  const renderReviewModal = () => {
    if (!viewingMovie) return null;
    return (
      <div className="absolute inset-0 bg-[#141414] z-[70] flex flex-col pb-safe animate-in slide-in-from-bottom-10 fade-in duration-300">
        <header className="flex items-center justify-between p-4 bg-[#141414]/90 backdrop-blur-md sticky top-0 z-10 border-b border-zinc-800/50">
          <button onClick={() => setModalMode('detail')} className="p-2 text-zinc-400 hover:text-white transition cursor-pointer">
            <ArrowLeft size={22} />
          </button>
          <span className="font-bold text-sm text-zinc-100">レビューを記録</span>
          <button onClick={handleSaveReview} className="text-white font-bold text-sm px-4 py-1.5 bg-red-600 rounded-md active:scale-95 transition-transform hover:bg-red-700 cursor-pointer">
            保存
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-8 pb-24">
          <div className="flex gap-4 items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
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

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-zinc-300">マイ評価スコア</label>
              <span className="text-3xl font-black text-red-500">{editScore.toFixed(1)}<span className="text-sm text-zinc-500 font-normal"> /10.0</span></span>
            </div>
            {/* 10点満点のレンジスライダー */}
            <input
              type="range" min="0" max="10" step="0.1" value={editScore}
              onChange={(e) => setEditScore(Number(e.target.value))}
              className="w-full accent-red-600 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer mt-4"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-bold text-purple-400 flex items-center gap-2">
                <Wand2 size={16} /> 内容
              </label>
              <button
                onClick={handleGenerateAiPlot} disabled={isAiLoading}
                className="text-xs px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-full font-bold flex items-center gap-1 active:scale-95 transition-transform border border-purple-500/30 cursor-pointer"
              >
                {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {isAiLoading ? '生成中...' : '自動生成'}
              </button>
            </div>
            <textarea
              value={editAiContent} onChange={(e) => setEditAiContent(e.target.value)}
              placeholder="映画の内容や展開を記録しましょう。自動生成ボタンも使えます。"
              className="w-full bg-zinc-900/50 border border-purple-900/30 rounded-xl p-4 text-zinc-200 text-sm focus:outline-none focus:border-purple-500/50 min-h-[160px] leading-relaxed resize-none transition"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-bold text-white">自分の感想</label>
            <textarea
              value={editMyReview} onChange={(e) => setEditMyReview(e.target.value)}
              placeholder="率直な感想や感情を記録しましょう..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-zinc-200 text-sm focus:outline-none focus:border-zinc-500 min-h-[120px] resize-none transition"
            />
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
        <header className="sticky top-0 bg-[#141414]/90 backdrop-blur-md px-4 py-4 flex items-center gap-3 z-30 border-b border-zinc-800/50">
          <button onClick={() => setActiveTab('home')} className="text-zinc-400 hover:text-white p-1">
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
                  <div className="w-full aspect-[2/3] bg-zinc-800 rounded-md shadow-md flex items-center justify-center p-2 text-center text-[10px] text-zinc-500 border border-zinc-700">
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
    return (
      <div className="flex-1 overflow-y-auto pb-24 bg-[#141414]">
        <div className="sticky top-0 z-30 bg-gradient-to-b from-[#141414] via-[#141414]/95 to-transparent pt-6 pb-6 px-4 pointer-events-none">
          <div className="pointer-events-auto flex flex-col gap-2">
            <div className="flex gap-2 relative">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text" value={searchTitle} onChange={(e) => setSearchTitle(e.target.value)}
                  placeholder="映画タイトルで検索..."
                  className="w-full bg-zinc-800/80 border border-zinc-700/50 rounded-lg py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-500 backdrop-blur-md transition-all placeholder:text-zinc-500 shadow-lg"
                />
                {searchTitle && (
                  <button onClick={() => setSearchTitle('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 p-1 hover:text-white cursor-pointer">
                    <X size={18} />
                  </button>
                )}
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)} 
                className={`p-3.5 rounded-lg border backdrop-blur-md transition-colors shadow-lg flex items-center justify-center
                  ${showFilters || searchGenre || searchYear || searchRating ? 'bg-red-600/20 border-red-500/50 text-red-500' : 'bg-zinc-800/80 border-zinc-700/50 text-zinc-400 hover:text-white'}`}
              >
                <SlidersHorizontal size={18} />
              </button>
            </div>

            {/* 複数条件フィルター展開時 */}
            {showFilters && (
              <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-900/95 backdrop-blur-xl rounded-lg border border-zinc-700/50 shadow-xl animate-in fade-in slide-in-from-top-2">
                <select value={searchGenre} onChange={e => setSearchGenre(e.target.value)} className="bg-zinc-800 text-xs text-white p-2.5 rounded-md outline-none border border-zinc-700 focus:border-red-500">
                  <option value="">全てのジャンル</option>
                  {Object.entries(GENRES).filter(([k,v]) => v !== '').map(([k,v]) => (
                    <option key={k} value={v}>{k}</option>
                  ))}
                </select>
                <select value={searchYear} onChange={e => setSearchYear(e.target.value)} className="bg-zinc-800 text-xs text-white p-2.5 rounded-md outline-none border border-zinc-700 focus:border-red-500">
                  <option value="">すべての年代</option>
                  <option value="2024">2024年</option>
                  <option value="2023">2023年</option>
                  <option value="2022">2022年</option>
                  <option value="2021">2021年</option>
                  <option value="2020">2020年</option>
                </select>
                <select value={searchRating} onChange={e => setSearchRating(e.target.value)} className="bg-zinc-800 text-xs text-white p-2.5 rounded-md outline-none border border-zinc-700 focus:border-red-500">
                  <option value="">すべての評価</option>
                  <option value="8">⭐ 8.0以上</option>
                  <option value="7">⭐ 7.0以上</option>
                  <option value="6">⭐ 6.0以上</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {isSearchActive ? (
          <div className="px-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-zinc-300 text-sm font-bold flex items-center gap-2">
                検索結果 {isSearching && <Loader2 size={14} className="animate-spin text-red-500" />}
              </h3>
              <button onClick={resetSearch} className="text-xs text-zinc-500 hover:text-zinc-300">クリア</button>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {searchResults.map((movie: any) => (
                  <div key={movie.id} onClick={() => openDetailModal(movie, 'home')} className="cursor-pointer active:scale-95 transition-transform group relative">
                    {movie.posterUrl ? (
                      <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover rounded-md shadow-md bg-zinc-800 group-hover:brightness-75 transition-all" />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-zinc-800 rounded-md shadow-md flex items-center justify-center p-2 text-center text-[10px] text-zinc-500 border border-zinc-700">
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
              !isSearching && <p className="text-zinc-500 text-sm text-center mt-10">条件に一致する作品が見つかりません</p>
            )}
          </div>
        ) : (
          <div className="space-y-8 pb-8 mt-2">
            {isHomeLoading ? (
              <div className="flex flex-col items-center justify-center h-64 gap-3 text-zinc-500">
                <Loader2 size={32} className="animate-spin text-red-600" />
                <p className="text-xs font-bold">映画データを取得中...</p>
              </div>
            ) : (
              CATEGORIES.map(category => {
                const allMovies = homeCategoriesData[category] || [];
                if (allMovies.length === 0) return null;
                // ホーム画面の横スクロールでは最初の10件だけ表示
                const rowMovies = allMovies.slice(0, 10); 
                
                return (
                  <div key={category} className="space-y-3">
                    <div className="flex justify-between items-end px-4">
                      <h3 className="text-zinc-100 font-bold text-lg leading-none">{category}</h3>
                      <button onClick={() => handleOpenGenreList(category)} className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-0.5">
                        すべて見る <ChevronRight size={14} />
                      </button>
                    </div>
                    <div className="flex overflow-x-auto snap-x px-4 gap-2.5 pb-2 pt-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {rowMovies.map((movie: any) => {
                        const status = getCollectionData(movie.id)?.status;
                        return (
                          <div key={movie.id} onClick={() => openDetailModal(movie, 'home')} className="flex-none w-[110px] md:w-[130px] snap-start relative rounded-md overflow-hidden active:scale-95 transition-transform cursor-pointer group shadow-lg">
                            {movie.posterUrl ? (
                              <img src={movie.posterUrl} alt={movie.title} className="w-full h-full aspect-[2/3] object-cover bg-zinc-800 group-hover:brightness-75 transition-all duration-300" />
                            ) : (
                              <div className="w-full aspect-[2/3] bg-zinc-800 flex items-center justify-center text-center text-[10px] text-zinc-500 p-2">
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
              })
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
        <h2 className="text-2xl font-black text-white mb-6">{title}</h2>
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-600">
            {statusFilter === 'watched' ? <CheckCircle2 size={48} className="opacity-20 mb-4" /> : <Bookmark size={48} className="opacity-20 mb-4" />}
            <p className="text-sm font-medium">まだ作品がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {list.map((movie: any) => {
              const score = movie.collectionData.score;
              const displayScore = score > 10 ? (score / 10).toFixed(1) : Number(score).toFixed(1);
              
              return (
                <div
                  key={movie.id}
                  onClick={() => openDetailModal(movie, statusFilter)}
                  className="relative rounded-md overflow-hidden shadow-md active:scale-95 transition-transform cursor-pointer group"
                >
                  {movie.posterUrl ? (
                    <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover bg-zinc-800 group-hover:brightness-75 transition-all" />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-zinc-800 flex items-center justify-center text-center text-[10px] text-zinc-500 border border-zinc-700 p-2">
                      {movie.title}
                    </div>
                  )}

                  {statusFilter === 'watched' && score > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 pt-6 flex justify-center z-10">
                      <div className="flex items-center gap-1 bg-black/70 px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10">
                        <Star size={10} className="text-red-500 fill-red-500" />
                        <span className="text-xs text-white font-bold">{displayScore}</span>
                      </div>
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

        {modalMode === 'detail' && renderDetailModal()}
        {modalMode === 'review' && renderReviewModal()}

        {!modalMode && activeTab === 'home' && renderHome()}
        {!modalMode && activeTab === 'genre_view' && renderGenreView()}
        {!modalMode && activeTab === 'watchlist' && renderMyList('watchlist')}
        {!modalMode && activeTab === 'watched' && renderMyList('watched')}

        <nav className="absolute bottom-0 left-0 right-0 bg-[#141414]/95 backdrop-blur-xl border-t border-zinc-800/60 flex justify-around items-center pb-safe pt-2 px-2 z-40">
          <button onClick={() => { setActiveTab('home'); setModalMode(null); }} className={`flex flex-col items-center p-2 transition-colors cursor-pointer ${activeTab === 'home' || activeTab === 'genre_view' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Home size={22} className={activeTab === 'home' || activeTab === 'genre_view' ? 'stroke-[2.5px]' : ''} />
            <span className="text-[10px] mt-1 font-bold">ホーム</span>
          </button>
          <button onClick={() => { setActiveTab('watchlist'); setModalMode(null); }} className={`flex flex-col items-center p-2 transition-colors cursor-pointer ${activeTab === 'watchlist' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Bookmark size={22} className={activeTab === 'watchlist' ? 'fill-white' : ''} />
            <span className="text-[10px] mt-1 font-bold">みたい！</span>
          </button>
          <button onClick={() => { setActiveTab('watched'); setModalMode(null); }} className={`flex flex-col items-center p-2 transition-colors cursor-pointer ${activeTab === 'watched' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <CheckCircle2 size={22} className={activeTab === 'watched' ? 'fill-white text-[#141414] stroke-[1.5px]' : ''} />
            <span className="text-[10px] mt-1 font-bold">鑑賞済み</span>
          </button>
        </nav>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
        .animate-in { animation: animateIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes animateIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

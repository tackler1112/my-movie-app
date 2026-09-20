import React, { useState, useEffect, useCallback } from 'react';
import { Star, Plus, ArrowLeft, Wand2, Loader2, Search, Bookmark, CheckCircle2, Home, X, Calendar, Info } from 'lucide-react';

// --- 初期表示用のモックデータ ---
const MOCK_MOVIES = [
  { 
    id: 'm1', title: '劇場版 呪術廻戦 0', genre: 'アニメ', category: 'おすすめ', 
    posterUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/mktxHLSKIK1aXjJ9UxaA3wT69dO.jpg',
    releaseDate: '2021-12-24',
    apiSynopsis: '幼少のころ、幼なじみの祈本里香を交通事故により目の前で失った乙骨憂太。怨霊と化した里香の呪いに苦しみ、自身の死を望む乙骨だったが、最強の呪術師・五条悟によって呪術高専に迎え入れられる。'
  },
  { 
    id: 'm2', title: 'ザ・スーパーマリオブラザーズ・ムービー', genre: 'アニメ・ゲーム', category: 'アニメ・ゲーム', 
    posterUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/qNBAXBIQlnOAW9YRcgxotFCVW3U.jpg',
    releaseDate: '2023-04-28',
    apiSynopsis: 'ニューヨークで配管工を営む双子の兄弟マリオとルイージ。謎の土管を通じて魔法に満ちた新世界に迷い込んだ二人は、離れ離れになってしまう。マリオは弟を見つけ出すため、壮大な冒険へと旅立つ。'
  },
  { 
    id: 'm3', title: 'ダークナイト', genre: 'アクション', category: '名作アクション', 
    posterUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    releaseDate: '2008-08-09',
    apiSynopsis: 'ゴッサム・シティーに、究極の悪が舞い降りた。ジョーカーと名乗るその男は、マフィアたちを操り、バットマンを嘲笑うかのように次々と犯罪を繰り返す。バットマンは最強の敵を前に、すべてを賭けた戦いに挑む。'
  },
  { 
    id: 'm4', title: 'インセプション', genre: 'SF', category: '名作アクション', 
    posterUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    releaseDate: '2010-07-23',
    apiSynopsis: '人が眠っている間にその潜在意識に侵入し、他人のアイデアを盗み出すという犯罪分野のスペシャリストのコブ。彼に課せられたミッションは、他人の頭の中にアイデアを植え付ける「インセプション」だった。'
  },
  { 
    id: 'm5', title: 'ショーシャンクの空に', genre: 'ドラマ', category: '名作ヒューマンドラマ', 
    posterUrl: 'https://image.tmdb.org/t/p/w600_and_h900_bestv2/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    releaseDate: '1995-06-03',
    apiSynopsis: '妻とその愛人を射殺した罪でショーシャンク刑務所送りとなった銀行員アンディ。初めは戸惑っていたが、やがて彼は自らの信念と希望を失わず、刑務所内の人間関係を静かに変えていく。'
  }
];

const CATEGORIES = ['おすすめ', '名作アクション', 'アニメ・ゲーム', '名作ヒューマンドラマ'];

export default function App() {
  const [activeTab, setActiveTab] = useState('home'); // 'home', 'watchlist', 'watched'
  
  // 検索関連
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // ユーザーのコレクション状態: { movieId, movieData, status: 'watchlist' | 'watched', score, aiContent, myReview, updatedAt }
  // ※iTunes APIの結果は動的なため、登録時に映画の基本データ(movieData)も一緒に保存します
  const [myCollection, setMyCollection] = useState([]);
  
  // モーダル管理: 'detail' (閲覧のみ), 'review' (編集)
  const [modalMode, setModalMode] = useState(null); 
  const [viewingMovie, setViewingMovie] = useState(null);

  // レビュー編集用の一時ステート
  const [editScore, setEditScore] = useState(50);
  const [editAiContent, setEditAiContent] = useState('');
  const [editMyReview, setEditMyReview] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // --- iTunes Search API 連携 (Debounce処理込み) ---
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await fetch(`https://itunes.apple.com/search?media=movie&term=${encodeURIComponent(searchQuery)}&country=JP&lang=ja_jp&limit=20`);
        const data = await response.json();
        
        const mappedResults = data.results.map((track: any) => ({
          id: track.trackId.toString(),
          title: track.trackName,
          genre: track.primaryGenreName,
          // iTunesのアートワークURLを高解像度に置換
          posterUrl: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '600x900bb') : '',
          releaseDate: track.releaseDate ? track.releaseDate.substring(0, 10) : '不明',
          apiSynopsis: track.longDescription || 'あらすじ情報がありません。'
        }));
        
        setSearchResults(mappedResults);
      } catch (error) {
        console.error("iTunes API Error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 500); // 500msのデバウンス

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const getCollectionData = useCallback((movieId: string) => {
    return myCollection.find(item => item.movieId === movieId);
  }, [myCollection]);

  const openDetailModal = (movie: any) => {
    setViewingMovie(movie);
    setModalMode('detail');
  };

  const openReviewModal = (movie: any) => {
    const existing = getCollectionData(movie.id);
    setViewingMovie(movie);
    setEditScore(existing?.score || 50);
    setEditAiContent(existing?.aiContent || '');
    setEditMyReview(existing?.myReview || '');
    setModalMode('review');
  };

  const handleAddWatchlist = (movie: any) => {
    setMyCollection(prev => [...prev, { 
      movieId: movie.id, 
      movieData: movie, // 今後リスト表示するためにデータ自体を保存
      status: 'watchlist',
      updatedAt: Date.now()
    }]);
    setModalMode(null);
  };

  const handleSaveReview = () => {
    if (!viewingMovie) return;
    
    setMyCollection(prev => {
      const filtered = prev.filter(item => item.movieId !== viewingMovie.id);
      return [...filtered, {
        movieId: viewingMovie.id,
        movieData: viewingMovie,
        status: 'watched',
        score: editScore,
        aiContent: editAiContent,
        myReview: editMyReview,
        updatedAt: Date.now()
      }];
    });
    setModalMode(null);
    setActiveTab('watched'); // 保存後は鑑賞済みリストへ移動
  };

  const handleGenerateAiPlot = () => {
    if (!viewingMovie) return;
    setIsAiLoading(true);
    
    // AI API通信をシミュレート（実際はここにOpenAI等のAPIコールを実装）
    setTimeout(() => {
      const mockPlot = `【${viewingMovie.title} の展開】\n物語の序盤、主人公は予期せぬトラブルに巻き込まれ、仲間と共に困難な旅に出ます。中盤では最大の挫折を経験し、一度は諦めかけますが、かつての敵が味方になるなど予期せぬ助けを得て立ち直ります。\n\n【結末】\n最終決戦では自己犠牲を伴う決断を迫られますが、知恵と勇気で最悪の事態を回避。黒幕の真の目的が明らかになり、衝撃の事実とともに物語は幕を閉じます。世界は平和を取り戻しますが、主人公の心には静かな変化が訪れていました。`;
      setEditAiContent(mockPlot);
      setIsAiLoading(false);
    }, 1500);
  };

  // --- 詳細モーダル（閲覧用） ---
  const renderDetailModal = () => {
    if (!viewingMovie) return null;
    const collectionData = getCollectionData(viewingMovie.id);
    const status = collectionData?.status || 'none';

    return (
      <div className="absolute inset-0 bg-black z-50 flex flex-col pb-safe animate-in slide-in-from-bottom-10 fade-in duration-200">
        <header className="flex items-center p-4 bg-black/80 backdrop-blur-md absolute top-0 left-0 right-0 z-10">
          <button onClick={() => setModalMode(null)} className="p-2 bg-zinc-800/80 text-white rounded-full">
            <ArrowLeft size={20} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="relative w-full aspect-[2/3] max-h-[50vh] bg-zinc-900 flex justify-center overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30" style={{ backgroundImage: `url(${viewingMovie.posterUrl})` }} />
            {viewingMovie.posterUrl ? (
              <img src={viewingMovie.posterUrl} alt={viewingMovie.title} className="relative h-full object-cover shadow-2xl" />
            ) : (
              <div className="relative h-full flex items-center justify-center text-zinc-600">No Image</div>
            )}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
          </div>

          <div className="px-5 -mt-6 relative z-10 space-y-6 pb-24">
            <div>
              <h2 className="text-2xl font-black text-white leading-tight mb-2">{viewingMovie.title}</h2>
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-400">
                <span className="flex items-center gap-1"><Calendar size={14} /> {viewingMovie.releaseDate}</span>
                <span className="px-2 py-0.5 bg-zinc-800 rounded-full">{viewingMovie.genre}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2"><Info size={16} /> 概要・あらすじ</h3>
              <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 whitespace-pre-wrap">
                {viewingMovie.apiSynopsis}
              </p>
            </div>
          </div>
        </div>

        {/* 下部アクションボタン */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pb-safe">
          {status === 'none' && (
            <button onClick={() => handleAddWatchlist(viewingMovie)} className="w-full py-4 bg-white text-black font-bold rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-transform">
              <Plus size={20} /> みたい！
            </button>
          )}
          
          {/* ホーム画面から開いていて、すでに見たいリストに入っている場合 */}
          {status === 'watchlist' && activeTab === 'home' && (
            <button disabled className="w-full py-4 bg-zinc-800 text-zinc-500 font-bold rounded-xl flex justify-center items-center gap-2">
              <CheckCircle2 size={20} /> 見たいリストに追加済み
            </button>
          )}

          {/* 見たいリストから開いた場合のみレビューへの導線を表示 */}
          {status === 'watchlist' && activeTab === 'watchlist' && (
            <button onClick={() => setModalMode('review')} className="w-full py-4 bg-amber-500 text-black font-bold rounded-xl flex justify-center items-center gap-2 active:scale-95 transition-transform shadow-[0_0_20px_rgba(245,158,11,0.3)]">
              <Star size={20} className="fill-black" /> レビューする
            </button>
          )}

          {status === 'watched' && (
            <button disabled className="w-full py-4 bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold rounded-xl flex justify-center items-center gap-2">
              <CheckCircle2 size={20} className="text-green-500" /> 鑑賞済み (スコア: {collectionData.score})
            </button>
          )}
        </div>
      </div>
    );
  };

  // --- レビュー入力モーダル ---
  const renderReviewModal = () => {
    if (!viewingMovie) return null;

    return (
      <div className="absolute inset-0 bg-zinc-950 z-[60] flex flex-col pb-safe animate-in slide-in-from-bottom-10 fade-in duration-200">
        <header className="flex items-center justify-between p-4 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10 border-b border-zinc-900">
          <button onClick={() => setModalMode(null)} className="p-2 text-zinc-400 hover:text-white">
            <X size={24} />
          </button>
          <span className="font-bold text-sm text-zinc-200">レビューを記録</span>
          <button onClick={handleSaveReview} className="text-amber-500 font-bold text-sm px-4 py-1.5 bg-amber-500/10 rounded-full active:scale-95 transition-transform">
            保存
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-8 pb-24">
          <div className="flex gap-4 items-center">
            {viewingMovie.posterUrl ? (
              <img src={viewingMovie.posterUrl} alt={viewingMovie.title} className="w-16 h-24 object-cover rounded-md shadow-lg bg-zinc-900" />
            ) : (
              <div className="w-16 h-24 bg-zinc-900 rounded-md shadow-lg"></div>
            )}
            <div className="flex-1">
              <h2 className="text-lg font-bold text-white leading-tight line-clamp-2">{viewingMovie.title}</h2>
              <p className="text-xs text-zinc-500 mt-1">{viewingMovie.releaseDate}</p>
            </div>
          </div>

          {/* スコア入力 */}
          <div className="space-y-3 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <div className="flex justify-between items-center">
              <label className="text-sm font-bold text-zinc-300">マイ評価スコア</label>
              <span className="text-3xl font-black text-amber-400">{editScore}<span className="text-sm text-zinc-600 font-normal"> /100</span></span>
            </div>
            <input
              type="range" min="0" max="100" value={editScore}
              onChange={(e) => setEditScore(Number(e.target.value))}
              className="w-full accent-amber-500 h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer mt-4"
            />
          </div>

          {/* AIによる展開・結末（編集可能） */}
          <div className="space-y-3">
            <div className="flex justify-between items-end">
              <label className="text-sm font-bold text-purple-400 flex items-center gap-2">
                <Wand2 size={16} /> AIによる展開・結末
              </label>
              <button 
                onClick={handleGenerateAiPlot} disabled={isAiLoading}
                className="text-xs px-3 py-1.5 bg-purple-600/20 text-purple-400 rounded-full font-bold flex items-center gap-1 active:scale-95 transition-transform"
              >
                {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                {isAiLoading ? '生成中...' : '自動生成'}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mb-2">※AIのハルシネーション対策のため、事実と異なる場合は自由に修正できます。</p>
            <textarea
              value={editAiContent}
              onChange={(e) => setEditAiContent(e.target.value)}
              placeholder="ここにAIが映画の展開から結末までを生成します。自分で直接書き込むことも可能です。"
              className="w-full bg-zinc-900/50 border border-purple-900/30 rounded-xl p-4 text-zinc-200 text-sm focus:outline-none focus:border-purple-500/50 min-h-[160px] leading-relaxed resize-none"
            />
          </div>

          {/* 自分の感想（分離） */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-white">自分の感想</label>
            <textarea
              value={editMyReview}
              onChange={(e) => setEditMyReview(e.target.value)}
              placeholder="ネタバレとは分けて、ここには率直な感想や感情を記録しましょう..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-200 text-sm focus:outline-none focus:border-zinc-500 min-h-[120px] resize-none"
            />
          </div>
        </div>
      </div>
    );
  };

  // --- ホーム画面（検索＆おすすめ） ---
  const renderHome = () => {
    return (
      <div className="flex-1 overflow-y-auto pb-24 bg-black">
        <div className="sticky top-0 z-10 bg-gradient-to-b from-black via-black/90 to-transparent pt-6 pb-6 px-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="映画タイトルで検索 (iTunes API連携)"
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-full py-3 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-zinc-500 backdrop-blur-md"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 p-1">
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {searchQuery ? (
          <div className="px-4">
            <h3 className="text-zinc-400 text-sm font-bold mb-4 flex items-center gap-2">
              検索結果 {isSearching && <Loader2 size={14} className="animate-spin" />}
            </h3>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {searchResults.map((movie: any) => (
                  <div key={movie.id} onClick={() => openDetailModal(movie)} className="cursor-pointer active:scale-95 transition-transform">
                    {movie.posterUrl ? (
                      <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover rounded-md bg-zinc-900" />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-zinc-900 rounded-md flex items-center justify-center p-2 text-center text-[10px] text-zinc-600 border border-zinc-800">
                        {movie.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              !isSearching && <p className="text-zinc-500 text-sm text-center mt-10">見つかりませんでした</p>
            )}
          </div>
        ) : (
          <div className="space-y-8 pb-8">
            {CATEGORIES.map(category => {
              const rowMovies = MOCK_MOVIES.filter(m => m.category === category);
              if (rowMovies.length === 0) return null;
              return (
                <div key={category} className="space-y-3">
                  <h3 className="text-white font-bold text-lg px-4">{category}</h3>
                  <div className="flex overflow-x-auto snap-x px-4 gap-3 pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {rowMovies.map(movie => {
                      const status = getCollectionData(movie.id)?.status;
                      return (
                        <div key={movie.id} onClick={() => openDetailModal(movie)} className="flex-none w-[110px] snap-start relative rounded-md overflow-hidden active:scale-95 transition-transform cursor-pointer">
                          <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover bg-zinc-900" />
                          {status && (
                            <div className="absolute top-1 right-1 bg-black/60 rounded-full p-1 backdrop-blur-sm">
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
          </div>
        )}
      </div>
    );
  };

  // --- 見たいリスト / 鑑賞済みリスト ---
  const renderMyList = (statusFilter: 'watchlist' | 'watched') => {
    // 保存された動的データからリストを生成
    const list = myCollection
      .filter(item => item.status === statusFilter)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(item => ({
        ...item.movieData,
        collectionData: item
      }));

    const title = statusFilter === 'watched' ? '鑑賞済み' : '見たい映画';

    return (
      <div className="flex-1 overflow-y-auto pb-24 bg-black px-4 pt-6">
        <h2 className="text-2xl font-black text-white mb-6">{title}</h2>
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-600">
            {statusFilter === 'watched' ? <CheckCircle2 size={48} className="opacity-20 mb-4" /> : <Bookmark size={48} className="opacity-20 mb-4" />}
            <p className="text-sm">まだ登録されていません</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {list.map((movie: any) => (
              <div 
                key={movie.id} 
                // 鑑賞済みなら「再編集」としてレビュー画面へ直行。見たいリストなら詳細画面へ。
                onClick={() => statusFilter === 'watched' ? openReviewModal(movie) : openDetailModal(movie)} 
                className="relative rounded-md overflow-hidden active:scale-95 transition-transform cursor-pointer"
              >
                {movie.posterUrl ? (
                  <img src={movie.posterUrl} alt={movie.title} className="w-full aspect-[2/3] object-cover bg-zinc-900" />
                ) : (
                  <div className="w-full aspect-[2/3] bg-zinc-900 flex items-center justify-center text-center text-[10px] text-zinc-600 border border-zinc-800 p-2">
                    {movie.title}
                  </div>
                )}
                
                {statusFilter === 'watched' && movie.collectionData.score > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 flex justify-center">
                    <div className="flex items-center gap-1">
                      <Star size={10} className="text-amber-400 fill-amber-400" />
                      <span className="text-xs text-amber-400 font-bold">{movie.collectionData.score}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#050505] min-h-screen flex justify-center font-sans selection:bg-zinc-800">
      <div className="w-full max-w-md h-[100dvh] bg-black shadow-2xl overflow-hidden relative border-x border-zinc-900 flex flex-col">
        
        {/* メインタブコンテンツ */}
        {!modalMode && activeTab === 'home' && renderHome()}
        {!modalMode && activeTab === 'watchlist' && renderMyList('watchlist')}
        {!modalMode && activeTab === 'watched' && renderMyList('watched')}
        
        {/* モーダル群 */}
        {modalMode === 'detail' && renderDetailModal()}
        {modalMode === 'review' && renderReviewModal()}

        {/* ボトムナビゲーション */}
        <nav className="absolute bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-zinc-900 flex justify-around items-center pb-safe pt-2 px-2 z-40">
          <button onClick={() => { setActiveTab('home'); setModalMode(null); }} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'home' ? 'text-white' : 'text-zinc-600'}`}>
            <Home size={22} className={activeTab === 'home' ? 'stroke-[2.5px]' : ''} />
            <span className="text-[10px] mt-1 font-bold">ホーム</span>
          </button>
          <button onClick={() => { setActiveTab('watchlist'); setModalMode(null); }} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'watchlist' ? 'text-white' : 'text-zinc-600'}`}>
            <Bookmark size={22} className={activeTab === 'watchlist' ? 'fill-white' : ''} />
            <span className="text-[10px] mt-1 font-bold">見たい</span>
          </button>
          <button onClick={() => { setActiveTab('watched'); setModalMode(null); }} className={`flex flex-col items-center p-2 transition-colors ${activeTab === 'watched' ? 'text-white' : 'text-zinc-600'}`}>
            <CheckCircle2 size={22} className={activeTab === 'watched' ? 'fill-white text-black stroke-[1.5px]' : ''} />
            <span className="text-[10px] mt-1 font-bold">鑑賞済み</span>
          </button>
        </nav>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
        .animate-in { animation: animateIn 0.2s ease-out forwards; }
        @keyframes animateIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}

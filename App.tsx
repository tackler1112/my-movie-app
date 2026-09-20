import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントの初期化（Vercelの環境変数から読み込む）
const supabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function App() {
  const [activeTab, setActiveTab] = useState('watchlist');
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // 初回ロード時にSupabaseからデータを取得
  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    const { data, error } = await supabase.from('movies').select('*').order('updated_at', { ascending: false });
    if (!error && data) {
      setMovies(data);
    }
  };

  // 映画検索 (iTunes API使用)
  const handleSearch = async (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=jp&media=movie&limit=5`);
      const data = await res.json();
      setSearchResults(data.results.map(item => ({
        id: item.trackId.toString(),
        title: item.trackName,
        poster_url: item.artworkUrl100.replace('100x100bb', '600x600bb'),
        release_date: item.releaseDate ? item.releaseDate.substring(0,4) : '不明',
        overview: item.longDescription || 'あらすじ情報なし'
      })));
    } catch (error) {
      console.error(error);
    }
  };

  // 映画をSupabaseに保存/更新
  const saveMovie = async (movieData) => {
    setLoading(true);
    const { error } = await supabase.from('movies').upsert({
      ...movieData,
      updated_at: new Date().toISOString()
    });
    if (!error) {
      await fetchMovies();
      setSelectedMovie(null);
      setIsEditing(false);
      setSearchQuery('');
      setSearchResults([]);
    }
    setLoading(false);
  };

  // 見たいリストに追加
  const addToWatchlist = (movie) => {
    saveMovie({
      id: movie.id,
      title: movie.title,
      poster_url: movie.poster_url,
      release_date: movie.release_date,
      overview: movie.overview,
      status: 'watchlist'
    });
  };

  // AI結末生成（モック）
  const generateAIReview = () => {
    setSelectedMovie({
      ...selectedMovie,
      ai_synopsis: `【AI生成】\n${selectedMovie.title}は、予期せぬ展開が続く傑作です。中盤での裏切りを経て、結末では主人公が自らの過去と向き合い、衝撃的な事実が明かされます。`
    });
  };

  return (
    <div className="min-h-screen bg-black text-zinc-200 pb-20 font-sans">
      {/* ヘッダー＆検索 */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md z-10 p-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold text-white mb-4 tracking-wider">MY MOVIE LOG</h1>
        <input
          type="text"
          placeholder="映画を検索..."
          value={searchQuery}
          onChange={handleSearch}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500"
        />
        {searchResults.length > 0 && (
          <div className="absolute left-4 right-4 mt-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
            {searchResults.map(movie => (
              <div key={movie.id} onClick={() => setSelectedMovie(movie)} className="flex items-center gap-3 p-3 border-b border-zinc-800 hover:bg-zinc-800 cursor-pointer">
                <img src={movie.poster_url} alt="" className="w-10 h-14 object-cover rounded" />
                <div>
                  <div className="font-bold text-white">{movie.title}</div>
                  <div className="text-xs text-zinc-400">{movie.release_date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* タブ */}
      <div className="flex p-4 gap-4 border-b border-zinc-800">
        <button onClick={() => setActiveTab('watchlist')} className={`flex-1 pb-2 font-bold transition-colors ${activeTab === 'watchlist' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-500'}`}>見たい</button>
        <button onClick={() => setActiveTab('watched')} className={`flex-1 pb-2 font-bold transition-colors ${activeTab === 'watched' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-zinc-500'}`}>鑑賞済み</button>
      </div>

      {/* 映画リスト */}
      <div className="grid grid-cols-3 gap-2 p-2">
        {movies.filter(m => m.status === activeTab).map(movie => (
          <div key={movie.id} onClick={() => { setSelectedMovie(movie); setIsEditing(activeTab === 'watched'); }} className="relative aspect-[2/3] rounded-lg overflow-hidden cursor-pointer">
            <img src={movie.poster_url} className="w-full h-full object-cover" alt={movie.title} />
            {activeTab === 'watched' && movie.rating > 0 && (
              <div className="absolute top-1 right-1 bg-black/80 text-yellow-500 text-xs font-bold px-1.5 py-0.5 rounded">★{movie.rating}</div>
            )}
          </div>
        ))}
      </div>

      {/* 詳細モーダル (ビューモード & 編集モード) */}
      {selectedMovie && (
        <div className="fixed inset-0 bg-black/95 z-50 overflow-y-auto">
          <div className="relative">
            <button onClick={() => { setSelectedMovie(null); setIsEditing(false); }} className="absolute top-4 right-4 z-10 bg-black/50 p-2 rounded-full text-white">✕</button>
            <div className="w-full aspect-[2/3] max-h-[50vh] relative">
              <img src={selectedMovie.poster_url} className="w-full h-full object-cover opacity-60" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
              <h2 className="absolute bottom-4 left-4 right-4 text-3xl font-bold text-white drop-shadow-lg">{selectedMovie.title}</h2>
            </div>
            
            <div className="p-4 space-y-6">
              {!isEditing ? (
                <>
                  <div className="text-zinc-400 text-sm">公開年: {selectedMovie.release_date}</div>
                  <p className="text-zinc-300 text-sm leading-relaxed">{selectedMovie.overview}</p>
                  {selectedMovie.status === 'watchlist' ? (
                    <button onClick={() => setIsEditing(true)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg mt-4">レビューする</button>
                  ) : (
                    <button onClick={() => addToWatchlist(selectedMovie)} className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-lg mt-4">見たいリストに追加</button>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">評価スコア (0-100)</label>
                    <input type="number" value={selectedMovie.rating || ''} onChange={e => setSelectedMovie({...selectedMovie, rating: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xl text-white" placeholder="85" />
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="block text-sm text-zinc-400">AIによる展開・結末 (編集可能)</label>
                      <button onClick={generateAIReview} className="text-xs bg-indigo-600/30 text-indigo-300 px-3 py-1 rounded">AI生成</button>
                    </div>
                    <textarea value={selectedMovie.ai_synopsis || ''} onChange={e => setSelectedMovie({...selectedMovie, ai_synopsis: e.target.value})} className="w-full bg-indigo-950/30 border border-indigo-900/50 rounded-lg p-3 text-sm text-indigo-100 h-32 focus:outline-none" placeholder="AIが生成したあらすじと結末がここに入ります。ハルシネーション（嘘）がある場合は手動で修正してください。" />
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">自分の感想</label>
                    <textarea value={selectedMovie.my_review || ''} onChange={e => setSelectedMovie({...selectedMovie, my_review: e.target.value})} className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm text-white h-32 focus:outline-none" placeholder="あなたの熱い感想を..." />
                  </div>
                  <button disabled={loading} onClick={() => saveMovie({ ...selectedMovie, status: 'watched' })} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg mt-4">
                    {loading ? '保存中...' : '完了して鑑賞済みへ'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

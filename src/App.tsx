import React, { useState } from 'react';

// 初期モックデータ（ローカル動作確認用）
const INITIAL_MOVIES = [
  {
    id: '1',
    title: 'インセプション',
    poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80',
    release_date: '2010',
    overview: '人の夢の中に入り込み、アイデアを盗み出す犯罪を描いたSFアクション大作。',
    rating_external: '★8.8',
    status: 'watchlist', // 'watchlist' | 'watched'
    ai_synopsis: '',
    my_review: '',
    rating: ''
  },
  {
    id: '2',
    title: 'インターステラー',
    poster_url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80',
    release_date: '2014',
    overview: '地球の寿命が尽きかける中、人類の存亡をかけて新しい惑星を探す宇宙飛行士たちの旅。',
    rating_external: '★8.7',
    status: 'watched',
    ai_synopsis: '【AI生成の展開・結末】主人公たちはワームホールを抜けて別の銀河系へ向かう。高次元の空間（五次元）での愛の交信を経て、人類移住計画を成功させる感動的な結末。',
    my_review: '音楽と映像のスケールが圧倒的で何回観ても泣ける。',
    rating: '95'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'watched'>('watchlist');
  const [searchQuery, setSearchQuery] = useState('');
  const [movies, setMovies] = useState(INITIAL_MOVIES);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  // 映画検索（iTunes API ＋ ローカル検索のフォールバック）
  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&country=jp&media=movie&limit=5`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        setSearchResults(data.results.map((item: any) => ({
          id: item.trackId.toString(),
          title: item.trackName,
          poster_url: item.artworkUrl100 ? item.artworkUrl100.replace('100x100bb', '600x600bb') : '',
          release_date: item.releaseDate ? item.releaseDate.substring(0, 4) : '不明',
          overview: item.longDescription || 'あらすじ情報なし',
          rating_external: '★7.5 (iTunes)',
          status: 'watchlist',
          ai_synopsis: '',
          my_review: '',
          rating: ''
        })));
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      setSearchResults([]);
    }
  };

  // 「みたい！」に追加
  const addToWatchlist = (movie: any) => {
    // 既にリストにあるか確認
    const exists = movies.some(m => m.id === movie.id);
    if (!exists) {
      setMovies([{ ...movie, status: 'watchlist' }, ...movies]);
    }
    setSelectedMovie(null);
    setSearchQuery('');
    setSearchResults([]);
    setActiveTab('watchlist');
  };

  // レビュー・編集内容の保存（鑑賞済みへ）
  const saveWatchedMovie = (updatedMovie: any) => {
    setMovies(movies.map(m => m.id === updatedMovie.id ? { ...updatedMovie, status: 'watched' } : m));
    setSelectedMovie(null);
    setIsEditing(false);
    setActiveTab('watched');
  };

  // AIによる展開・結末の自動生成モック
  const generateAIContent = () => {
    setSelectedMovie({
      ...selectedMovie,
      ai_synopsis: `【AI生成：${selectedMovie.title}の展開と結末】\n物語中盤から予想外の障害が発生し、主人公は最大の選択を迫られます。クライマックスでは全ての伏線が回収され、衝撃的かつ感動的な結末を迎えます。`
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#f4f4f5', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: '90px', maxWidth: '480px', margin: '0 auto' }}>
      
      {/* ヘッダー・検索エリア */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(9, 9, 11, 0.95)', backdropFilter: 'blur(10px)', zIndex: 10, padding: '16px', borderBottom: '1px solid #27272a' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', marginBottom: '12px', letterSpacing: '0.05em' }}>MY MOVIE LOG</h1>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="映画を検索して追加..."
            value={searchQuery}
            onChange={handleSearch}
            style={{ width: '100%', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '10px', padding: '12px 16px', color: '#fff', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
          />
          {searchResults.length > 0 && (
            <div style={{ position: 'absolute', left: 0, right: 0, top: '50px', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '10px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)', maxHeight: '300px', overflowY: 'auto', zIndex: 30 }}>
              {searchResults.map(movie => (
                <div key={movie.id} onClick={() => { setSelectedMovie(movie); setIsEditing(false); setSearchResults([]); }} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderBottom: '1px solid #27272a', cursor: 'pointer' }}>
                  <img src={movie.poster_url} alt="" style={{ width: '36px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} />
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{movie.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>公開: {movie.release_date} / 評価: {movie.rating_external}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* タブ切り替え */}
      <div style={{ display: 'flex', padding: '12px 16px', gap: '12px', borderBottom: '1px solid #27272a' }}>
        <button onClick={() => setActiveTab('watchlist')} style={{ flex: 1, padding: '10px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'watchlist' ? '#4f46e5' : '#18181b', color: activeTab === 'watchlist' ? '#fff' : '#a1a1aa', transition: 'all 0.2s' }}>
          見たいリスト ({movies.filter(m => m.status === 'watchlist').length})
        </button>
        <button onClick={() => setActiveTab('watched')} style={{ flex: 1, padding: '10px', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: activeTab === 'watched' ? '#4f46e5' : '#18181b', color: activeTab === 'watched' ? '#fff' : '#a1a1aa', transition: 'all 0.2s' }}>
          鑑賞済み ({movies.filter(m => m.status === 'watched').length})
        </button>
      </div>

      {/* 映画一覧グリッド */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', padding: '16px' }}>
        {movies.filter(m => m.status === activeTab).map(movie => (
          <div key={movie.id} onClick={() => { setSelectedMovie(movie); setIsEditing(activeTab === 'watched'); }} style={{ position: 'relative', aspectRatio: '2/3', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', backgroundColor: '#18181b', border: '1px solid #27272a' }}>
            <img src={movie.poster_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={movie.title} />
            {activeTab === 'watched' && movie.rating && (
              <div style={{ position: 'absolute', top: '6px', right: '6px', backgroundColor: 'rgba(0,0,0,0.85)', color: '#facc15', fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', border: '1px solid #ca8a04' }}>
                ★{movie.rating}
              </div>
            )}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)', padding: '16px 8px 8px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{movie.title}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 詳細・レビュー入力モーダル */}
      {selectedMovie && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 50, overflowY: 'auto' }}>
          <div style={{ position: 'relative', minHeight: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#09090b', maxWidth: '480px', margin: '0 auto' }}>
            
            {/* 閉じるボタン */}
            <button onClick={() => { setSelectedMovie(null); setIsEditing(false); }} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20, backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid #3f3f46', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

            {/* ヘッダー画像・タイトル */}
            <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative' }}>
              <img src={selectedMovie.poster_url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} alt="" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #09090b, transparent)' }} />
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                <span style={{ fontSize: '0.75rem', backgroundColor: '#3f3f46', color: '#fff', padding: '2px 8px', borderRadius: '4px' }}>公開: {selectedMovie.release_date}</span>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff', marginTop: '6px' }}>{selectedMovie.title}</h2>
              </div>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              
              {/* 基本情報（概要・外部評価） */}
              <div style={{ backgroundColor: '#18181b', padding: '16px', borderRadius: '10px', border: '1px solid #27272a' }}>
                <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '4px' }}>作品概要・外部評価 (外部API)</div>
                <div style={{ fontSize: '0.85rem', color: '#f4f4f5', marginBottom: '8px', lineHeight: '1.5' }}>{selectedMovie.overview}</div>
                <div style={{ fontSize: '0.85rem', color: '#facc15', fontWeight: 'bold' }}>外部評価: {selectedMovie.rating_external}</div>
              </div>

              {/* モード切り替え（見たいリストからの詳細 vs 鑑賞済み/編集） */}
              {!isEditing && selectedMovie.status === 'watchlist' ? (
                // 【見たいリストのプレビュー画面】: 感想やAI入力はなく「みたい！」ボタンのみ
                <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                  <button onClick={() => addToWatchlist(selectedMovie)} style={{ width: '100%', padding: '16px', backgroundColor: '#4f46e5', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)' }}>
                    ✨ 「みたい！」リストに追加する
                  </button>
                </div>
              ) : selectedMovie.status === 'watchlist' && !isEditing ? (
                // 万が一見たいリストから直接レビューに飛ぶ場合
                null
              ) : (
                // 【レビュー入力・鑑賞済み編集画面】
                <>
                  {/* スコア入力 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '6px' }}>自分の評価スコア (0-100)</label>
                    <input
                      type="number"
                      value={selectedMovie.rating || ''}
                      onChange={e => setSelectedMovie({...selectedMovie, rating: e.target.value})}
                      placeholder="例: 88"
                      style={{ width: '100%', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '12px', fontSize: '1.1rem', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* AI入力可能な映画内容（展開・結末・あらすじ） */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>AI生成：大まかな展開・結末 (手動編集可)</label>
                      <button onClick={generateAIContent} style={{ fontSize: '0.75rem', backgroundColor: '#312e81', color: '#c7d2fe', border: '1px solid #4f46e5', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}>
                        🤖 AIに内容を生成させる
                      </button>
                    </div>
                    <textarea
                      value={selectedMovie.ai_synopsis || ''}
                      onChange={e => setSelectedMovie({...selectedMovie, ai_synopsis: e.target.value})}
                      placeholder="AIが生成したあらすじや結末がここに入ります。ハルシネーション対策として直接書き換えて修正できます。"
                      style={{ width: '100%', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#e0e7ff', height: '120px', outline: 'none', boxSizing: 'border-box', lineHeight: '1.5' }}
                    />
                  </div>

                  {/* 自分の感想欄 */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '6px' }}>自分の感想 (分離して保存)</label>
                    <textarea
                      value={selectedMovie.my_review || ''}
                      onChange={e => setSelectedMovie({...selectedMovie, my_review: e.target.value})}
                      placeholder="あなた自身の率直な感想や感情をここに書き留めてください..."
                      style={{ width: '100%', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#fff', height: '120px', outline: 'none', boxSizing: 'border-box', lineHeight: '1.5' }}
                    />
                  </div>

                  {/* 完了ボタン */}
                  <button onClick={() => saveWatchedMovie(selectedMovie)} style={{ width: '100%', padding: '16px', backgroundColor: '#10b981', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginTop: '10px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)' }}>
                    💾 保存して鑑賞済みリストへ反映
                  </button>
                </>
              )}

              {/* 見たいリストにある映画を「レビューする（鑑賞済みに移動）」へ切り替えるボタン */}
              {selectedMovie.status === 'watchlist' && !isEditing && (
                <div style={{ borderTop: '1px solid #27272a', paddingTop: '16px', marginTop: 'auto' }}>
                  <button onClick={() => setIsEditing(true)} style={{ width: '100%', padding: '14px', backgroundColor: '#27272a', border: '1px solid #3f3f46', borderRadius: '10px', color: '#f4f4f5', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}>
                    ✍️ すでに鑑賞済みとしてレビューを入力する
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

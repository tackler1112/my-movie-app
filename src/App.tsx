import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

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

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    const { data, error } = await supabase.from('movies').select('*').order('updated_at', { ascending: false });
    if (!error && data) setMovies(data);
  };

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

  const addToWatchlist = (movie) => {
    saveMovie({ ...movie, status: 'watchlist' });
  };

  const generateAIReview = () => {
    setSelectedMovie({
      ...selectedMovie,
      ai_synopsis: `【AI生成】\n${selectedMovie.title}は、予期せぬ展開が続く傑作です。結末では主人公が自らの過去と向き合い、衝撃的な事実が明かされます。`
    });
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#e4e4e7', fontFamily: 'sans-serif', paddingBottom: '80px' }}>
      {/* ヘッダー＆検索 */}
      <div style={{ position: 'sticky', top: 0, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(8px)', zIndex: 10, padding: '16px', borderBottom: '1px solid #27272a' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff', marginBottom: '16px', letterSpacing: '0.05em' }}>MY MOVIE LOG</h1>
        <input
          type="text"
          placeholder="映画を検索..."
          value={searchQuery}
          onChange={handleSearch}
          style={{ width: '100%', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '12px', color: '#fff', outline: 'none', boxSizing: 'border-box' }}
        />
        {searchResults.length > 0 && (
          <div style={{ position: 'absolute', left: '16px', right: '16px', marginTop: '8px', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', maxHeight: '320px', overflowY: 'auto', zIndex: 20 }}>
            {searchResults.map(movie => (
              <div key={movie.id} onClick={() => setSelectedMovie(movie)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderBottom: '1px solid #27272a', cursor: 'pointer' }}>
                <img src={movie.poster_url} alt="" style={{ width: '40px', height: '56px', objectFit: 'cover', borderRadius: '4px' }} />
                <div>
                  <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.9rem' }}>{movie.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>{movie.release_date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* タブ */}
      <div style={{ display: 'flex', padding: '16px', gap: '16px', borderBottom: '1px solid #27272a' }}>
        <button onClick={() => setActiveTab('watchlist')} style={{ flex: 1, paddingBottom: '8px', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', color: activeTab === 'watchlist' ? '#818cf8' : '#71717a', borderBottom: activeTab === 'watchlist' ? '2px solid #818cf8' : 'none' }}>見たい</button>
        <button onClick={() => setActiveTab('watched')} style={{ flex: 1, paddingBottom: '8px', fontWeight: 'bold', background: 'none', border: 'none', cursor: 'pointer', color: activeTab === 'watched' ? '#818cf8' : '#71717a', borderBottom: activeTab === 'watched' ? '2px solid #818cf8' : 'none' }}>鑑賞済み</button>
      </div>

      {/* 映画リスト */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', padding: '8px' }}>
        {movies.filter(m => m.status === activeTab).map(movie => (
          <div key={movie.id} onClick={() => { setSelectedMovie(movie); setIsEditing(activeTab === 'watched'); }} style={{ position: 'relative', aspectRatio: '2/3', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', backgroundColor: '#18181b' }}>
            <img src={movie.poster_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={movie.title} />
            {activeTab === 'watched' && movie.rating > 0 && (
              <div style={{ position: 'absolute', top: '4px', right: '4px', backgroundColor: 'rgba(0,0,0,0.8)', color: '#eab308', fontSize: '0.75rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px' }}>★{movie.rating}</div>
            )}
          </div>
        ))}
      </div>

      {/* 詳細モーダル */}
      {selectedMovie && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.95)', zIndex: 50, overflowY: 'auto' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => { setSelectedMovie(null); setIsEditing(false); }} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: '#fff', fontSize: '1rem', cursor: 'pointer' }}>✕</button>
            <div style={{ width: '100%', aspectRatio: '2/3', maxHeight: '50vh', position: 'relative' }}>
              <img src={selectedMovie.poster_url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} alt="" />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #000, transparent)' }} />
              <h2 style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px', fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{selectedMovie.title}</h2>
            </div>
            
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {!isEditing ? (
                <>
                  <div style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>公開年: {selectedMovie.release_date}</div>
                  <p style={{ color: '#d4d4d8', fontSize: '0.9rem', lineHeight: '1.6' }}>{selectedMovie.overview}</p>
                  {selectedMovie.status === 'watchlist' ? (
                    <button onClick={() => setIsEditing(true)} style={{ width: '100%', padding: '16px', backgroundColor: '#4f46e5', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>レビューする</button>
                  ) : (
                    <button onClick={() => addToWatchlist(selectedMovie)} style={{ width: '100%', padding: '16px', backgroundColor: '#27272a', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>見たいリストに追加</button>
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '8px' }}>評価スコア (0-100)</label>
                    <input type="number" value={selectedMovie.rating || ''} onChange={e => setSelectedMovie({...selectedMovie, rating: e.target.value})} style={{ width: '100%', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '12px', fontSize: '1.25rem', color: '#fff', boxSizing: 'border-box' }} placeholder="85" />
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#a1a1aa' }}>AIによる展開・結末</label>
                      <button onClick={generateAIReview} style={{ fontSize: '0.75rem', backgroundColor: 'rgba(79, 70, 229, 0.3)', color: '#c7d2fe', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}>AI生成</button>
                    </div>
                    <textarea value={selectedMovie.ai_synopsis || ''} onChange={e => setSelectedMovie({...selectedMovie, ai_synopsis: e.target.value})} style={{ width: '100%', backgroundColor: '#1e1b4b', border: '1px solid #312e81', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#e0e7ff', height: '120px', boxSizing: 'border-box', outline: 'none' }} placeholder="AIが生成したあらすじと結末..." />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '8px' }}>自分の感想</label>
                    <textarea value={selectedMovie.my_review || ''} onChange={e => setSelectedMovie({...selectedMovie, my_review: e.target.value})} style={{ width: '100%', backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', padding: '12px', fontSize: '0.85rem', color: '#fff', height: '120px', boxSizing: 'border-box', outline: 'none' }} placeholder="あなたの熱い感想を..." />
                  </div>
                  <button disabled={loading} onClick={() => saveMovie({ ...selectedMovie, status: 'watched' })} style={{ width: '100%', padding: '16px', backgroundColor: '#4f46e5', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
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

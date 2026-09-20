import React, { useEffect, useState } from 'react';
import { Hero } from './components/Hero';
import { MovieCard } from './components/MovieCard';
import { getGenres, getTrendingMovies, getNowPlayingMovies, discoverMovies } from './lib/tmdb';
import { Movie, Genre } from './types';

function App() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [trending, setTrending] = useState<Movie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<Movie[]>([]);
  
  // 検索用ステート
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [minRating, setMinRating] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // 初期データの取得
  useEffect(() => {
    const fetchInitialData = async () => {
      const [genresData, trendingData, nowPlayingData] = await Promise.all([
        getGenres(),
        getTrendingMovies(),
        getNowPlayingMovies()
      ]);
      setGenres(genresData);
      setTrending(trendingData);
      setNowPlaying(nowPlayingData);
    };
    fetchInitialData();
  }, []);

  // 条件検索の実行
  useEffect(() => {
    if (!selectedGenre && !selectedYear && !minRating) {
      setIsSearching(false);
      return;
    }
    
    setIsSearching(true);
    const fetchSearch = async () => {
      const results = await discoverMovies(selectedGenre, selectedYear, minRating);
      setSearchResults(results);
    };
    fetchSearch();
  }, [selectedGenre, selectedYear, minRating]);

  // 横スクロール用リストコンポーネント（App.tsx内に定義）
  const MovieRow = ({ title, movies }: { title: string, movies: Movie[] }) => (
    <div className="mb-10 pl-4 md:pl-12">
      <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x">
        {movies.map(movie => (
          <div key={movie.id} className="min-w-[200px] md:min-w-[240px] snap-start">
            <MovieCard movie={movie} genres={genres} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans pb-20">
      {/* 検索・絞り込みフィルターバー (ガラスモーフィズム) */}
      <div className="sticky top-0 z-50 bg-black/60 backdrop-blur-md border-b border-gray-800 p-4 flex flex-wrap gap-4 items-center justify-center">
        <span className="font-bold text-gray-300">🔍 条件検索:</span>
        <select 
          className="bg-gray-800 text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-gray-500"
          value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}
        >
          <option value="">すべてのジャンル</option>
          {genres.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>

        <select 
          className="bg-gray-800 text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-gray-500"
          value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="">すべての年代</option>
          <option value="2024">2024年</option>
          <option value="2023">2023年</option>
          <option value="2022">2022年</option>
        </select>

        <select 
          className="bg-gray-800 text-white p-2 rounded border border-gray-700 focus:outline-none focus:border-gray-500"
          value={minRating} onChange={(e) => setMinRating(e.target.value)}
        >
          <option value="">すべての評価</option>
          <option value="8">★ 8.0 以上</option>
          <option value="7">★ 7.0 以上</option>
          <option value="6">★ 6.0 以上</option>
        </select>
        
        {isSearching && (
          <button onClick={() => { setSelectedGenre(''); setSelectedYear(''); setMinRating(''); }} className="text-sm text-gray-400 hover:text-white">
            クリア ✖
          </button>
        )}
      </div>

      {!isSearching && <Hero />}

      <div className="mt-8">
        {isSearching ? (
          <div className="px-4 md:px-12">
            <h2 className="text-2xl font-bold text-white mb-6">検索結果 ({searchResults.length}件)</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {searchResults.map(movie => (
                <MovieCard key={movie.id} movie={movie} genres={genres} />
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="-mt-20 relative z-20">
              <MovieRow title="今週のトレンド" movies={trending} />
            </div>
            <MovieRow title="現在上映中" movies={nowPlaying} />
          </>
        )}
      </div>
    </div>
  );
}

export default App;

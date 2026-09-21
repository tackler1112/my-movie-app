import React, { useEffect, useState } from 'react';
import { Movie } from '../types';
import { getPopularMovies } from '../lib/tmdb';

export const Hero: React.FC = () => {
  const [movie, setMovie] = useState<Movie | null>(null);

  useEffect(() => {
    const fetchRandomHero = async () => {
      try {
        const popular = await getPopularMovies();
        const randomIndex = Math.floor(Math.random() * popular.length);
        setMovie(popular[randomIndex]);
      } catch (error) {
        console.error("Hero movie fetch failed", error);
      }
    };
    fetchRandomHero();
  }, []);

  if (!movie) return <div className="h-[70vh] bg-gray-900 animate-pulse w-full"></div>;

  return (
    <div 
      className="relative w-full h-[70vh] bg-cover bg-center"
      style={{ backgroundImage: `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})` }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent"></div>
      
      <div className="absolute bottom-20 left-4 md:left-12 max-w-2xl z-10">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-lg">{movie.title}</h1>
        <div className="flex items-center gap-4 mb-4 text-sm font-medium">
          <span className="text-green-400 border border-green-400 px-2 py-0.5 rounded">TMDb {movie.vote_average.toFixed(1)}</span>
          <span className="text-gray-300">{movie.release_date}</span>
        </div>
        <p className="text-gray-300 text-sm md:text-lg line-clamp-3 mb-6 text-shadow-md">
          {movie.overview}
        </p>
        <div className="flex gap-4">
          <button className="bg-white text-black px-6 md:px-8 py-2 md:py-3 rounded md:text-lg font-bold hover:bg-gray-200 transition flex items-center gap-2">
            <span>▶</span> 再生する
          </button>
          <button className="bg-gray-500/60 backdrop-blur-md text-white px-6 md:px-8 py-2 md:py-3 rounded md:text-lg font-bold hover:bg-gray-500/80 transition flex items-center gap-2">
            <span>ℹ️</span> 詳細情報
          </button>
        </div>
      </div>
    </div>
  );
};

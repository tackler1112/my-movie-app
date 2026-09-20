import React, { useState } from 'react';
import { Movie, Genre } from '../types';
// ※ supabaseクライアントはご自身の環境に合わせてインポートしてください
// import { supabase } from '../lib/supabase';

interface Props {
  movie: Movie;
  genres: Genre[];
}

export const MovieCard: React.FC<Props> = ({ movie, genres }) => {
  const [userRating, setUserRating] = useState<number>(0);

  // Supabaseへ10段階評価を保存する処理（ダミー）
  const handleRate = async (rating: number) => {
    setUserRating(rating);
    console.log(`Movie ID: ${movie.id} に ${rating}/10 点をつけました`);
    // await supabase.from('reviews').upsert({ movie_id: movie.id, user_rating: rating });
  };

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden shadow-lg transition-transform duration-300 hover:scale-105 hover:z-10 group flex flex-col h-full border border-gray-800">
      <div className="relative aspect-[2/3] w-full overflow-hidden">
        {movie.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
            alt={movie.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">NO IMAGE</div>
        )}
        
        {/* 世界の評価 (TMDb) */}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1">
          <span className="text-yellow-400 text-sm">★</span>
          <span className="text-white font-bold text-sm">{movie.vote_average.toFixed(1)}</span>
        </div>
      </div>

      <div className="p-4 flex-grow flex flex-col">
        <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{movie.title}</h3>
        
        {/* 公式ジャンルタグ */}
        <div className="flex gap-1 flex-wrap mb-4">
          {movie.genre_ids.slice(0, 3).map(id => {
            const genre = genres.find(g => g.id === id);
            if (!genre) return null;
            return (
              <span key={id} className="px-2 py-0.5 bg-gray-800 text-gray-300 text-[10px] rounded-full border border-gray-700">
                {genre.name}
              </span>
            );
          })}
        </div>

        <div className="mt-auto pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-400 mb-1">あなたの評価 (10点満点)</p>
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <button
                key={i}
                onClick={() => handleRate(i + 1)}
                className={`text-lg transition-colors hover:text-yellow-400 ${
                  userRating > i ? 'text-yellow-400' : 'text-gray-600'
                }`}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

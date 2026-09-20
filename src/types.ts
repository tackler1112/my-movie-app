export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  vote_average: number; // TMDbの世界の評価 (10点満点)
  vote_count: number;
  genre_ids: number[];
  release_date: string;
}

export interface Genre {
  id: number;
  name: string;
}

// Supabaseに保存するユーザー独自の評価用型
export interface UserReview {
  movie_id: number;
  user_rating: number; // 1〜10点
  review_text?: string;
}

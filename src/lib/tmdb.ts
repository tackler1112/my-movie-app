import { Movie, Genre } from '../types';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';
const LANG = 'ja-JP';

// 基本的なフェッチ関数
const fetchFromTMDB = async (endpoint: string, params: string = '') => {
  const res = await fetch(`${BASE_URL}${endpoint}?api_key=${API_KEY}&language=${LANG}${params}`);
  if (!res.ok) throw new Error('TMDb API Error');
  return res.json();
};

export const getGenres = async (): Promise<Genre[]> => {
  const data = await fetchFromTMDB('/genre/movie/list');
  return data.genres;
};

export const getPopularMovies = async (): Promise<Movie[]> => {
  const data = await fetchFromTMDB('/movie/popular');
  return data.results;
};

export const getTrendingMovies = async (): Promise<Movie[]> => {
  const data = await fetchFromTMDB('/trending/movie/week');
  return data.results;
};

export const getNowPlayingMovies = async (): Promise<Movie[]> => {
  const data = await fetchFromTMDB('/movie/now_playing', '&region=JP');
  return data.results;
};

// 検索・絞り込み用（ジャンル、年、最低評価などを指定）
export const discoverMovies = async (genreId?: string, year?: string, minRating?: string): Promise<Movie[]> => {
  let params = '&sort_by=popularity.desc';
  if (genreId) params += `&with_genres=${genreId}`;
  if (year) params += `&primary_release_year=${year}`;
  if (minRating) params += `&vote_average.gte=${minRating}`;
  
  const data = await fetchFromTMDB('/discover/movie', params);
  return data.results;
};

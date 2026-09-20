import React, { useState, useEffect } from "react";

// --- 型定義 ---
type Movie = {
  id: number;
  title: string;
  posterUrl: string;
  releaseDate: string;
  description: string;
};

export default function App() {
  // --- 状態管理 (State) ---
  const [searchQuery, setSearchQuery] = useState("アクション"); // 初期検索ワード
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [myList, setMyList] = useState<number[]>([]); // 「みたい！」に追加した映画のIDリスト
  
  // AI生成用の状態
  const [aiTexts, setAiTexts] = useState<Record<number, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<number, boolean>>({});

  // --- 1. 映画検索機能 (iTunes APIを使用) ---
  const fetchMovies = async (query: string) => {
    if (!query) return;
    setLoading(true);
    try {
      // iTunesの公開APIを利用（APIキー不要で映画データが取れます）
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
        query
      )}&entity=movie&country=JP&lang=ja_jp&limit=10`;
      
      const response = await fetch(url);
      const data = await response.json();

      // 使いやすい形にデータを整形
      const formattedMovies: Movie[] = data.results.map((item: any) => ({
        id: item.trackId,
        title: item.trackName,
        // iTunesの画像URLを高画質(400x400)に変換
        posterUrl: item.artworkUrl100 ? item.artworkUrl100.replace("100x100bb", "400x400bb") : "",
        releaseDate: item.releaseDate ? item.releaseDate.split("T")[0] : "不明",
        description: item.longDescription || "あらすじ情報がありません。",
      }));

      setMovies(formattedMovies);
    } catch (error) {
      console.error("映画の取得に失敗しました", error);
      alert("映画データの取得に失敗しました。");
    } finally {
      setLoading(false);
    }
  };

  // 初回表示時に検索を実行
  useEffect(() => {
    fetchMovies(searchQuery);
  }, []);

  // 検索ボタンを押した時の処理
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMovies(searchQuery);
  };

  // --- 2. 「みたい！」ボタンの処理 ---
  const toggleMyList = (movieId: number) => {
    setMyList((prevList) => {
      // すでにリストにある場合は削除、ない場合は追加
      if (prevList.includes(movieId)) {
        return prevList.filter((id) => id !== movieId);
      } else {
        return [...prevList, movieId];
      }
    });
  };

  // --- 3. AIによる紹介文生成機能 (モック) ---
  const generateAiDescription = async (movie: Movie) => {
    // ローディング開始
    setAiLoading((prev) => ({ ...prev, [movie.id]: true }));

    // ※ここに本来はChatGPTやGeminiのAPIを呼び出す処理を書きます。
    // 今回はAIが考えているように見せるため、1.5秒待機させます。
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // タイトルを使ったそれっぽい紹介文を生成
    const mockAiResponse = `【AIからのオススメ！】\n『${movie.title}』は必見の映画です！\n公開日は${movie.releaseDate}。心揺さぶる展開と魅力的なキャラクターたちが、あなたを素晴らしい映像体験へと導いてくれるでしょう。休日のリラックスタイムにポップコーンと一緒に楽しむのがおすすめです！`;

    // 結果を保存
    setAiTexts((prev) => ({ ...prev, [movie.id]: mockAiResponse }));
    setAiLoading((prev) => ({ ...prev, [movie.id]: false }));
  };

  // --- 画面の描画 (UI) ---
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー (スマホ向けに上部固定) */}
      <header className="sticky top-0 z-10 bg-white shadow-sm px-4 py-4">
        <h1 className="text-xl font-bold text-gray-800 text-center">
          🎬 映画ディスカバリー
        </h1>
      </header>

      <main className="p-4 max-w-md mx-auto">
        {/* 検索フォーム */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-6">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="映画のタイトルなどで検索..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-5 py-3 rounded-lg font-semibold active:bg-blue-700 transition"
          >
            検索
          </button>
        </form>

        {/* ローディング表示 */}
        {loading && (
          <div className="text-center py-10 text-gray-500 font-medium">
            映画を探しています...
          </div>
        )}

        {/* 映画リスト表示 */}
        <div className="flex flex-col gap-6">
          {!loading && movies.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              映画が見つかりませんでした。別のキーワードでお試しください。
            </div>
          )}

          {movies.map((movie) => {
            const isWanted = myList.includes(movie.id);
            const isAiLoading = aiLoading[movie.id];
            const aiText = aiTexts[movie.id];

            return (
              <div
                key={movie.id}
                className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100"
              >
                {/* 映画ポスター */}
                {movie.posterUrl ? (
                  <img
                    src={movie.posterUrl}
                    alt={movie.title}
                    className="w-full h-64 object-cover bg-gray-200"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-200 flex items-center justify-center text-gray-400">
                    画像なし
                  </div>
                )}

                <div className="p-4 flex flex-col gap-4">
                  {/* タイトルと公開日 */}
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 leading-tight">
                      {movie.title}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      公開: {movie.releaseDate}
                    </p>
                  </div>

                  {/* あらすじ */}
                  <p className="text-gray-600 text-sm line-clamp-3">
                    {movie.description}
                  </p>

                  {/* AI紹介文エリア */}
                  <div className="bg-blue-50 rounded-xl p-4">
                    {aiText ? (
                      <div className="text-sm text-blue-900 whitespace-pre-wrap">
                        {aiText}
                      </div>
                    ) : (
                      <button
                        onClick={() => generateAiDescription(movie)}
                        disabled={isAiLoading}
                        className="w-full py-2 bg-white border border-blue-200 text-blue-600 font-semibold rounded-lg text-sm flex justify-center items-center active:bg-blue-100 transition"
                      >
                        {isAiLoading ? "AIが考えています..." : "✨ AIに紹介文を生成してもらう"}
                      </button>
                    )}
                  </div>

                  {/* みたい！ボタン */}
                  <button
                    onClick={() => toggleMyList(movie.id)}
                    className={`w-full py-3 rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2
                      ${
                        isWanted
                          ? "bg-pink-100 text-pink-600 border border-pink-200"
                          : "bg-pink-500 text-white active:bg-pink-600 shadow-sm"
                      }
                    `}
                  >
                    {isWanted ? "👀 みたい！リストに追加済み" : "💖 みたい！"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import "../index.css";
import DetailModal from "../components/DetailModal";

// Genre data constants
const SHARED_GENRES = {
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  9648: "Mystery",
  37: "Western",
};
const MOVIE_GENRES = {
  28: "Action",
  12: "Adventure",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
};
const TV_GENRES = {
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

function Search() {
  const [currentTab, setCurrentTab] = useState("title");
  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] = useState("multi");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [personContext, setPersonContext] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState({ id: null, type: "movie" });

  const location = useLocation();

  // --- INFINITE SCROLL LOGIC ---
  const observer = useRef();
  const lastElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prev) => prev + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  const getGenres = () => {
    const genres =
      selectedType === "movie"
        ? { ...SHARED_GENRES, ...MOVIE_GENRES }
        : { ...SHARED_GENRES, ...TV_GENRES };
    return Object.entries(genres).sort((a, b) => a[1].localeCompare(b[1]));
  };

  // --- CORE SEARCH LOGIC ---
  const fetchResults = async (pageNum, isNew) => {
    setLoading(true);
    try {
      let url = "";
      if (currentTab === "title") {
        url = `http://localhost:3000/search?q=${query}&page=${pageNum}&type=multi`;
      } else if (currentTab === "genre") {
        url = `http://localhost:3000/discover?genre=${selectedGenre}&type=${selectedType}&page=${pageNum}`;
      } else if (currentTab === "name") {
        url = `http://localhost:3000/search?q=${query}&page=${pageNum}&type=person`;
      }

      // Prevent empty searches
      if (!url || (currentTab !== "genre" && !query && isNew)) {
        setLoading(false);
        return;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!data.results || data.results.length === 0) {
        setHasMore(false);
      }

      setResults((prev) => (isNew ? data.results : [...prev, ...data.results]));

      if (data.personName && currentTab === "name") {
        setPersonContext(`Results for: ${data.personName}`);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Trigger for manual search
  const handleSearch = async (isNewSearch = true) => {
    if (isNewSearch) {
      setResults([]);
      setPage(1);
      setHasMore(true);
      await fetchResults(1, true);
    }
  };

  // Effect for Infinite Scroll (fetching next pages)
  useEffect(() => {
    if (page > 1) {
      fetchResults(page, false);
    }
  }, [page]);

  // Effect to listen for URL Parameter changes (e.g. from Genre Tags)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlTab = params.get("tab");
    const urlGenre = params.get("genre");
    const urlType = params.get("type");

    if (urlTab === "genre" && urlGenre) {
      // 1. Update State
      setCurrentTab("genre");
      setSelectedGenre(urlGenre);
      setSelectedType(urlType || "multi");

      // 2. Clear and Fetch
      setResults([]);
      setPage(1);
      setHasMore(true);

      // We call the fetch logic directly here because state updates are asynchronous
      // We use the variables from the URL directly to ensure the fetch is immediate
      const fetchFromURL = async () => {
        setLoading(true);
        try {
          const url = `http://localhost:3000/discover?genre=${urlGenre}&type=${
            urlType || "multi"
          }&page=1`;
          const response = await fetch(url);
          const data = await response.json();
          setResults(data.results || []);
          if (!data.results || data.results.length === 0) setHasMore(false);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
        }
      };
      fetchFromURL();
    }
  }, [location.search]);

  const openModal = (id, type) => {
    setSelectedItem({ id, type });
    setIsModalOpen(true);
  };

  return (
    <div className="search-page-container">
      <div className="main-box">
        <h1 className="search-title">Find Movies, TV & People</h1>

        <div className="tab-container">
          {["title", "genre", "name"].map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${currentTab === tab ? "active" : ""}`}
              onClick={() => {
                setCurrentTab(tab);
                setResults([]);
                setQuery("");
                setPersonContext("");
                setHasMore(true);
              }}
            >
              By {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="search-inputs">
          {currentTab === "title" && (
            <input
              type="text"
              placeholder="Enter title..."
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(true)}
            />
          )}

          {currentTab === "genre" && (
            <div className="genre-filters">
              <select
                className="search-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="multi">Movies & TV</option>
                <option value="movie">Movies Only</option>
                <option value="tv">TV Shows Only</option>
              </select>
              <select
                className="search-select"
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
              >
                <option value="">All Genres</option>
                {getGenres().map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {currentTab === "name" && (
            <input
              type="text"
              placeholder="Enter actor/director..."
              className="search-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(true)}
            />
          )}

          <button className="search-submit" onClick={() => handleSearch(true)}>
            Search
          </button>
        </div>
      </div>

      {personContext && <h3 className="context-header">{personContext}</h3>}

      <div className="results-grid">
        {results.map(
          (item, index) =>
            item.poster_path && (
              <div
                key={`${item.id}-${index}`}
                ref={results.length === index + 1 ? lastElementRef : null}
                className="movie-card"
                onClick={() => openModal(item.id, item.media_type || "movie")}
              >
                <img
                  src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                  alt={item.title || item.name}
                  title={item.title || item.name}
                />
              </div>
            )
        )}
      </div>

      {loading && <div className="spinner"></div>}

      <DetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemId={selectedItem.id}
        type={selectedItem.type}
      />
    </div>
  );
}

export default Search;

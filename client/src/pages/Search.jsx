import { useState, useEffect, useRef, useCallback } from 'react';
import '../index.css';
import DetailModal from '../components/DetailModal';

const SHARED_GENRES = { 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family", 9648: "Mystery", 37: "Western" };
const MOVIE_GENRES = { 28: "Action", 12: "Adventure", 14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music", 10749: "Romance", 878: "Science Fiction", 10770: "TV Movie", 53: "Thriller", 10752: "War" };
const TV_GENRES = { 10759: "Action & Adventure", 10762: "Kids", 10763: "News", 10764: "Reality", 10765: "Sci-Fi & Fantasy", 10766: "Soap", 10767: "Talk", 10768: "War & Politics" };

function Search() {
  const [currentTab, setCurrentTab] = useState('title');
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState('multi');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [personContext, setPersonContext] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState({ id: null, type: 'movie' });

  // --- INFINITE SCROLL LOGIC ---
  const observer = useRef();
  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const getGenres = () => {
    const genres = selectedType === 'movie' 
      ? { ...SHARED_GENRES, ...MOVIE_GENRES } 
      : { ...SHARED_GENRES, ...TV_GENRES };
    return Object.entries(genres).sort((a, b) => a[1].localeCompare(b[1]));
  };

  const openModal = (id, type) => {
    setSelectedItem({ id, type });
    setIsModalOpen(true);
  };

  // Trigger search when page changes or a new search is started
  useEffect(() => {
    if (page === 1 && results.length === 0 && !loading && query === '' && selectedGenre === '') return;
    handleSearch(false);
  }, [page]);

  const handleSearch = async (isNewSearch = true) => {
    if (isNewSearch) {
      setResults([]);
      setPage(1);
      setHasMore(true);
      if (page !== 1) return; // The useEffect will handle the fetch if page changes
    }
    
    setLoading(true);
    try {
      let url = "";
      if (currentTab === "title") {
        url = `http://localhost:3000/search?q=${query}&page=${page}&type=multi`;
      } else if (currentTab === "genre") {
        url = `http://localhost:3000/discover?genre=${selectedGenre}&type=${selectedType}&page=${page}`;
      } else if (currentTab === "name") {
        url = `http://localhost:3000/search?q=${query}&page=${page}&type=person`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.results.length === 0) setHasMore(false);
      
      setResults(prev => isNewSearch ? data.results : [...prev, ...data.results]);
      if (data.personName && currentTab === "name") setPersonContext(`Results for: ${data.personName}`);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-container">
      <div className="main-box">
        <h1>Find Movies, TV & People</h1>
        <div className="tab-container">
          {['title', 'genre', 'name'].map((tab) => (
            <button key={tab} className={`tab-btn ${currentTab === tab ? 'active' : ''}`} onClick={() => {setCurrentTab(tab); setResults([]);}}>
              By {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="search-inputs">
          {currentTab === 'title' && <input type="text" placeholder="Search title..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch(true)}/>}
          {currentTab === 'genre' && (
            <div className="genre-filters">
              <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}><option value="multi">Movies & TV</option><option value="movie">Movies Only</option><option value="tv">TV Shows Only</option></select>
              <select value={selectedGenre} onChange={(e) => setSelectedGenre(e.target.value)}><option value="">All Genres</option>{getGenres().map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select>
            </div>
          )}
          {currentTab === 'name' && <input type="text" placeholder="Search actor/director..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch(true)}/>}
          <button className="search-submit" onClick={() => handleSearch(true)}>Search</button>
        </div>
      </div>

      <div className="results-grid">
        {results.map((item, index) => {
          const isLastElement = results.length === index + 1;
          return (
            <div 
              key={`${item.id}-${index}`} 
              ref={isLastElement ? lastElementRef : null}
              className="movie-card" 
              onClick={() => openModal(item.id, item.media_type || 'movie')}
            >
              <img src={`https://image.tmdb.org/t/p/w200${item.poster_path}`} alt={item.title || item.name} />
            </div>
          );
        })}
      </div>
      
      {loading && <div className="spinner"></div>}

      <DetailModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} itemId={selectedItem.id} type={selectedItem.type} />
    </div>
  );
}

export default Search;
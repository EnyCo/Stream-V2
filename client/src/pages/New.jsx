import { useState, useEffect, useRef, useCallback } from "react";
import DetailModal from "../components/DetailModal";
import "../index.css";

function New() {
  const [results, setResults] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState({ id: null, type: "movie" });

  // 1. INFINITE SCROLL: Sentinel Ref for IntersectionObserver
  const observer = useRef();
  const lastElementRef = useCallback(
    (node) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        // If the last image is visible on screen, trigger next page
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore]
  );

  // 2. DATA FETCHING: Runs every time 'page' increments
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Calls your backend discover endpoint
        const response = await fetch(
          `http://localhost:3000/discover?page=${page}`
        );
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
          setHasMore(false);
        } else {
          // Append new results to the existing list
          setResults((prev) => [...prev, ...data.results]);
        }
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [page]);

  // 3. MODAL ACCESS: Function to trigger the shared DetailModal
  const openModal = (id, type) => {
    setSelectedItem({ id, type });
    setIsModalOpen(true);
  };

  return (
    <div className="new-releases-page">
      {/* Header section matching your original design */}
      <div className="main-box" style={{ textAlign: "center" }}>
        <h1>New Releases</h1>
        <p style={{ color: "#666" }}>Top movies & TV from the last 30 days.</p>
      </div>

      <div className="results-grid">
        {results.map((item, index) => {
          // Attach the ref to the very last item in the list
          const isLastItem = results.length === index + 1;

          return item.poster_path ? (
            <div
              key={`${item.id}-${index}`}
              ref={isLastItem ? lastElementRef : null}
              className="movie-card"
              onClick={() => openModal(item.id, item.media_type || "movie")}
            >
              <img
                src={`https://image.tmdb.org/t/p/w200${item.poster_path}`}
                alt={item.title || item.name}
                title={item.title || item.name}
              />
            </div>
          ) : null;
        })}
      </div>

      {/* Add the loading circle here */}
      {loading && <div className="spinner"></div>}

      {/* 4. THE SHARED MODAL: Accessible from anywhere in this file */}
      <DetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        itemId={selectedItem.id}
        type={selectedItem.type}
      />
    </div>
  );
}

export default New;

import React, { useEffect, useState } from 'react';
import './DetailModal.css';

function DetailModal({ isOpen, onClose, itemId, type }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !itemId) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:3000/details/${type}/${itemId}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Failed to fetch details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, itemId, type]);

  if (!isOpen) return null;

  // Helper logic for year, duration, and certificate (matching your global.js logic)
  const dateStr = data?.release_date || data?.first_air_date;
  const year = dateStr ? dateStr.split("-")[0] : "N/A";
  const trailer = data?.videos?.results?.find(v => v.type === "Trailer" && v.site === "YouTube");
  const logo = data?.images?.logos?.find(img => img.iso_639_1 === "en");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>&times;</button>
        
        {loading ? (
          <div className="modal-loading">Loading details...</div>
        ) : data && (
          <div 
            className="modal-body" 
            style={{
              backgroundImage: data.backdrop_path 
                ? `linear-gradient(to right, rgba(0,0,0,0.9) 20%, rgba(0,0,0,0.6) 80%), url('https://image.tmdb.org/t/p/w1280${data.backdrop_path}')` 
                : 'none'
            }}
          >
            <div className="modal-poster-container">
              <img 
                src={data.poster_path ? `https://image.tmdb.org/t/p/w300${data.poster_path}` : "https://via.placeholder.com/300x450"} 
                alt={data.title || data.name} 
              />
              <div className="modal-stats">
                <p>⭐ {data.vote_average?.toFixed(1)}/10</p>
              </div>
            </div>

            <div className="modal-info">
              {logo ? (
                <img className="modal-logo" src={`https://image.tmdb.org/t/p/w500${logo.file_path}`} alt="logo" />
              ) : (
                <h2>{data.title || data.name}</h2>
              )}
              
              <div className="modal-meta">
                <span>{year}</span> • <span>{type === 'movie' ? `${data.runtime}m` : `${data.number_of_seasons} Seasons`}</span>
              </div>

              {trailer && (
                <a href={`https://www.youtube.com/watch?v=${trailer.key}`} target="_blank" className="trailer-btn">
                  ▶ Watch Trailer
                </a>
              )}

              <h3>Overview</h3>
              <p>{data.overview || "No description available."}</p>

              <h3>Cast & Crew</h3>
              <p><strong>Top Cast:</strong> {data.credits?.cast?.slice(0, 3).map(c => c.name).join(", ")}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailModal;
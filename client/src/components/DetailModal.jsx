import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./DetailModal.css";

function DetailModal({ isOpen, onClose, itemId, type }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isOpen || !itemId) return;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:3000/details/${type}/${itemId}`
        );
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [isOpen, itemId, type]);

  if (!isOpen || !data) return null;

  // --- 1. ASSET HELPERS ---
  const logo = data.images?.logos?.find((img) => img.iso_639_1 === "en");
  const trailer = data.videos?.results?.find(
    (v) => v.type === "Trailer" && v.site === "YouTube"
  );

  // --- 2. METADATA LOGIC (From global.js) ---
  const dateStr = data.release_date || data.first_air_date;
  const year = dateStr ? dateStr.split("-")[0] : "N/A";

  // Maturity Rating Logic
  let cert = "NR";
  if (type === "movie" && data.release_dates) {
    const us = data.release_dates.results.find((r) => r.iso_3166_1 === "US");
    if (us?.release_dates) {
      cert =
        us.release_dates.find((r) => r.certification)?.certification || "NR";
    }
  } else if (type === "tv" && data.content_ratings) {
    cert =
      data.content_ratings.results.find((r) => r.iso_3166_1 === "US")?.rating ||
      "NR";
  }

  // Cast & Crew Logic
  const cast =
    data.credits?.cast
      ?.slice(0, 3)
      .map((c) => c.name)
      .join(", ") || "N/A";

  let director = "N/A";
  if (type === "movie" && data.credits?.crew) {
    director =
      data.credits.crew.find((c) => c.job === "Director")?.name || "N/A";
  } else if (type === "tv" && data.created_by?.length > 0) {
    director = data.created_by.map((c) => c.name).join(", ");
  }

  // --- 3. EVENT HANDLERS ---
  const handleGenreClick = (genreId) => {
    onClose(); // Close the modal first
    // Navigate to search page with immediate search parameters
    navigate(`/search?tab=genre&genre=${genreId}&type=${type}`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundImage: data.backdrop_path
            ? `linear-gradient(to right, rgba(0,0,0,0.9) 20%, rgba(0,0,0,0.6) 80%), url(https://image.tmdb.org/t/p/w1280${data.backdrop_path})`
            : "none",
          backgroundColor: "#000",
        }}
      >
        <span className="close-btn" onClick={onClose}>
          &times;
        </span>

        {loading ? (
          <div style={{ padding: "100px", textAlign: "center" }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="modal-body">
            <div className="modal-left">
              <img
                src={
                  data.poster_path
                    ? `https://image.tmdb.org/t/p/w300${data.poster_path}`
                    : "https://via.placeholder.com/300x450"
                }
                className="modal-poster"
                alt="poster"
              />

              {/* --- ENHANCED GENRE SECTION --- */}
              <div className="modal-genres">
                {data.genres?.length > 0 ? (
                  data.genres.map((g) => (
                    <span
                      key={g.id}
                      className="tag"
                      onClick={() => handleGenreClick(g.id)}
                      title={`Browse all ${g.name} ${
                        type === "movie" ? "Movies" : "Shows"
                      }`}
                    >
                      {g.name}
                    </span>
                  ))
                ) : (
                  <span className="tag">N/A</span>
                )}
              </div>

              <div className="rating">
                ⭐ {data.vote_average ? data.vote_average.toFixed(1) : "0.0"}/10
              </div>
            </div>

            <div className="modal-info">
              {/* Logo or Text Title */}
              {logo ? (
                <img
                  src={`https://image.tmdb.org/t/p/w500${logo.file_path}`}
                  className="modal-logo"
                  alt="logo"
                />
              ) : (
                <h2 className="modal-title">{data.title || data.name}</h2>
              )}

              {/* Meta Row (Year, Runtime, Cert) */}
              <div className="meta-row">
                <span>{year}</span> •{" "}
                <span>
                  {type === "movie"
                    ? `${data.runtime}m`
                    : `${data.number_of_seasons} Season${
                        data.number_of_seasons !== 1 ? "s" : ""
                      }`}
                </span>{" "}
                • <span className="cert-badge">{cert}</span>
              </div>

              {/* Trailer Button */}
              {trailer && (
                <a
                  href={`https://www.youtube.com/watch?v=${trailer.key}`}
                  target="_blank"
                  rel="noreferrer"
                  className="trailer-btn"
                >
                  ▶ Watch Trailer
                </a>
              )}

              <div className="section-divider"></div>

              <h3>Overview</h3>
              <p className="overview-text">
                {data.overview || "No description available."}
              </p>

              <div className="section-divider"></div>

              <div className="crew-info">
                <p>
                  <strong>Director:</strong> {director}
                </p>
                <p>
                  <strong>Top Cast:</strong> {cast}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DetailModal;

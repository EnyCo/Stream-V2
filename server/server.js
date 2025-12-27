require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");
const Bottleneck = require("bottleneck");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// --- RATE LIMITER ---
const limiter = new Bottleneck({
  minTime: 21,
  maxConcurrent: 10,
});
const limiterAxios = limiter.wrap(axios.get);

// --- HELPER: Clean Text ---
// 1. Replace symbols (like - or :) with a space so "Spider-Man" becomes "Spider Man"
// 2. Remove double spaces
// 3. Lowercase everything
function cleanQuery(text) {
  return text
    .replace(/[^\w\s]/gi, " ") // Replace symbols with space
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim()
    .toLowerCase();
}

// --- UPDATED: SEARCH ENDPOINT (Multi-Person Lookup) ---
app.get("/search", async (req, res) => {
  const { q, page } = req.query;
  const type = req.query.type || "multi";
  const pageNum = parseInt(page) || 1;

  try {
    // --- CASE 1: SEARCH BY NAME (Multiple People) ---
    // --- CASE 1: SEARCH BY NAME (Actors & Directors Only) ---
    if (type === "person") {
      // 1. Search for the Name
      const personSearch = await limiterAxios(
        `${TMDB_BASE_URL}/search/person`,
        {
          params: { api_key: process.env.TMDB_API_KEY, query: q },
        }
      );

      if (personSearch.data.results.length === 0) {
        return res.json({ results: [], personName: null });
      }

      // 2. Top 5 People
      const topPeople = personSearch.data.results.slice(0, 5);

      // Remove duplicates for the label
      const uniqueNames = [...new Set(topPeople.map((p) => p.name))];
      const namesFound = uniqueNames.join(", ");

      // 3. Fetch Credits
      const creditPromises = topPeople.map((person) =>
        limiterAxios(`${TMDB_BASE_URL}/person/${person.id}/combined_credits`, {
          params: { api_key: process.env.TMDB_API_KEY },
        })
      );

      const creditResponses = await Promise.all(creditPromises);

      // 4. Combine Work (STRICT FILTER APPLIED HERE)
      let allWorks = [];
      creditResponses.forEach((response) => {
        const cast = response.data.cast || []; // "Cast" implies Acting (Keep all)
        const crew = response.data.crew || [];

        // FILTER: Only keep Crew items where the Job is "Director"
        const directors = crew.filter((item) => item.job === "Director");

        // Add Actors and Directors to the pile
        allWorks.push(...cast, ...directors);
      });

      // 5. Remove Duplicates (by Movie ID)
      const uniqueWorksMap = new Map();
      allWorks.forEach((item) => {
        if (!uniqueWorksMap.has(item.id)) {
          uniqueWorksMap.set(item.id, item);
        }
      });
      const uniqueWorks = Array.from(uniqueWorksMap.values());

      // 6. Filter Junk & Sort by Popularity
      const cleanWorks = uniqueWorks
        .filter((item) => item.vote_count > 5)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

      // 7. Paginate
      const itemsPerPage = 20;
      const start = (pageNum - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const paginatedResults = cleanWorks.slice(start, end);

      return res.json({ results: paginatedResults, personName: namesFound });
    }

    // --- CASE 2: STANDARD SEARCH ---
    else {
      const endpoint = type === "multi" ? "search/multi" : `search/${type}`;
      const response = await limiterAxios(`${TMDB_BASE_URL}/${endpoint}`, {
        params: { api_key: process.env.TMDB_API_KEY, query: q, page: page },
      });

      const results = response.data.results.map((item) => ({
        ...item,
        media_type: item.media_type || type,
      }));

      res.json({ results });
    }
  } catch (error) {
    console.error("Search failed:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
});

// --- UPDATED: DETAILS ENDPOINT (Fetches Images & Videos) ---
app.get("/details/:type/:id", async (req, res) => {
  const { type, id } = req.params;
  try {
    const response = await limiterAxios(`${TMDB_BASE_URL}/${type}/${id}`, {
      params: {
        api_key: process.env.TMDB_API_KEY,
        // Request Credits, Ratings, Images (Logos/Backdrops), and Videos (Trailers)
        append_to_response:
          "credits,release_dates,content_ratings,images,videos",
        include_image_language: "en,null", // Prefer English or text-less images
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Details fetch failed:", error.message);
    res.status(500).json({ error: "Details fetch failed" });
  }
});

// --- UPDATED: DISCOVER (Supports Genre Filtering) ---
app.get("/discover", async (req, res) => {
  const page = req.query.page || 1;
  const genreId = req.query.genre;
  const type = req.query.type || "multi"; // 'movie', 'tv', or 'multi'

  try {
    const params = {
      api_key: process.env.TMDB_API_KEY,
      language: "en-US",
      sort_by: "popularity.desc",
      page: page,
      include_adult: false,
      include_video: false,
    };
    if (genreId) params.with_genres = genreId;

    const promises = [];

    // If type is 'movie' or 'multi', fetch movies
    if (type === "movie" || type === "multi") {
      promises.push(
        limiterAxios(`${TMDB_BASE_URL}/discover/movie`, { params }).then(
          (res) =>
            res.data.results.map((item) => ({ ...item, media_type: "movie" }))
        )
      );
    }

    // If type is 'tv' or 'multi', fetch TV
    if (type === "tv" || type === "multi") {
      promises.push(
        limiterAxios(`${TMDB_BASE_URL}/discover/tv`, { params }).then((res) =>
          res.data.results.map((item) => ({ ...item, media_type: "tv" }))
        )
      );
    }

    // Wait for all requests to finish
    const resultsArrays = await Promise.all(promises);

    // Flatten array of arrays into one big list
    const combined = resultsArrays
      .flat()
      .sort((a, b) => b.popularity - a.popularity);

    res.json({ results: combined });
  } catch (error) {
    console.error("Discover fetch failed:", error.message);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Rate Limiter Active: Max 49 req/sec`);
});

import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./Navbar.css"; 
import Explore from "./pages/Explore";
import Search from "./pages/Search";
import New from "./pages/New";
import About from "./pages/About"; 

function App() {
  return (
    <BrowserRouter>
      <nav className="navbar">
        <Link to="/" className="nav-link">Home</Link>
        <Link to="/search" className="nav-link">Search Movies</Link>
        <Link to="/new" className="nav-link">New Releases</Link>
        <Link to="/about" className="nav-link">About Us</Link>
      </nav>

      <main className="container" style={{ minHeight: "80vh" }}>
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route path="/search" element={<Search />} />
          <Route path="/new" element={<New />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>

      <footer className="footer">
        <p>Stream Search © 2025. Data provided by <a href="https://www.themoviedb.org/" target="_blank">TMDB</a>.</p>
      </footer>
    </BrowserRouter>
  );
}

export default App;
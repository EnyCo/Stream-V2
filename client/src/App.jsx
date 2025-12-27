import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import './Navbar.css'; // Import the new CSS file

import Explore from './pages/Explore';
import Search from './pages/Search';
import New from './pages/New';

function App() {
  return (
    <BrowserRouter>
      {/* Updated Nav with CSS classes */}
      <nav className="navbar">
        <Link to="/" className="nav-link">Explore</Link>
        <Link to="/search" className="nav-link">Search</Link>
        <Link to="/new" className="nav-link">New</Link>
      </nav>

      <div style={{ padding: '2rem' }}>
        <Routes>
          <Route path="/" element={<Explore />} />
          <Route path="/search" element={<Search />} />
          <Route path="/new" element={<New />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
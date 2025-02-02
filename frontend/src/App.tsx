import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import MemorialProfile from './pages/MemorialProfile';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-gray-100">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/memorial/:id" element={<MemorialProfile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
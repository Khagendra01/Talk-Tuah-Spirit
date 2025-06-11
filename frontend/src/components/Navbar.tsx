import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Ghost, Moon, Sun, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [isDark, setIsDark] = React.useState(true);
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const toggleTheme = () => setIsDark(!isDark);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <nav className="backdrop-blur-lg bg-gray-900/80 border-b border-gray-800 fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Ghost className="h-8 w-8 text-purple-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Talk Tuah Spirit
            </span>
          </Link>
          
          <div className="flex items-center space-x-4">
            {currentUser && (
              <>
                <span className="text-gray-300 text-sm">
                  {currentUser.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </button>
              </>
            )}
            {/* <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              {isDark ? (
                <Sun className="h-5 w-5 text-yellow-400" />
              ) : (
                <Moon className="h-5 w-5 text-blue-400" />
              )}
            </button> */}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
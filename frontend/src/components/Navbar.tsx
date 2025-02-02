import React from 'react';
import { Link } from 'react-router-dom';
import { Ghost, Moon, Sun } from 'lucide-react';

const Navbar = () => {
  const [isDark, setIsDark] = React.useState(true);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <nav className="backdrop-blur-lg bg-gray-900/80 border-b border-gray-800 fixed w-full z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <Ghost className="h-8 w-8 text-purple-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Talk Tuah Ghost
            </span>
          </Link>
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
    </nav>
  );
}

export default Navbar;
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

interface MemorialCardProps {
  _id: string;
  name: string;
  image: string;
  birth: string;
  death: string;
  voice: string;
  bio: string;
}

const MemorialCard = ({ _id, name, image, birth, death, voice, bio }: MemorialCardProps) => {
  return (
    <Link
      to={`/memorial/${_id}`}
      state={{ _id, name, image, birth, death, voice, bio }}
      className="group relative overflow-hidden rounded-xl bg-gray-800 hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent"></div>
      </div>
      <div className="absolute bottom-0 w-full p-4 space-y-2">
        <h3 className="text-xl font-bold text-white">{name}</h3>
        <div className="flex items-center space-x-4 text-sm text-gray-300">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>{birth} - {death}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default MemorialCard;
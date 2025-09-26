import React from 'react';
import { ShieldCheckIcon } from '@heroicons/react/24/solid';

const getScoreColor = (score) => {
    if (['A+', 'A', 'A-'].includes(score)) return 'bg-green-500';
    if (['B+', 'B', 'B-'].includes(score)) return 'bg-blue-500';
    if (['C+', 'C', 'C-'].includes(score)) return 'bg-yellow-500';
    return 'bg-red-500'; // For D and F scores
};

const Header = ({ score }) => {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-2">
        <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
        <span className="text-xl font-bold text-gray-800">DataGuardian</span>
      </div>
      <div className={`px-3 py-1 text-white font-bold text-lg rounded-md ${getScoreColor(score)}`}>
        {score}
      </div>
    </div>
  );
};

export default Header;
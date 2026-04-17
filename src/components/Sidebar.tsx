import React from 'react';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-100 h-screen sticky top-0 hidden lg:block">
      <div className="p-6">
        <ul className="space-y-2">
          <li className="p-2 bg-[#006837]/10 text-[#006837] rounded-lg font-medium">Dashboard</li>
          <li className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">Courses</li>
          <li className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">Results</li>
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;

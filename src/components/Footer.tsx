import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="py-8 bg-white border-t border-gray-100 text-center text-gray-400 text-sm">
      &copy; {new Date().getFullYear()} Michael Okpara University of Agriculture, Umudike
    </footer>
  );
};

export default Footer;

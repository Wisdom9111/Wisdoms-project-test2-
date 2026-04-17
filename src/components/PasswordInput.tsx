import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const PasswordInput: React.FC<PasswordInputProps> = ({ label, className, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="space-y-1 w-full">
      {label && (
        <label className="text-[12px] font-bold text-[#666666] uppercase tracking-wider block mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={showPassword ? 'text' : 'password'}
          className={`
            block w-full px-4 py-3.5 
            border-[1.5px] border-[#e0e0e0] rounded-[4px] 
            text-[16px] text-[#1a1a1a] placeholder-gray-400
            focus:border-mouau-green focus:ring-0
            transition-all duration-200 outline-none
            ${className}
          `}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
};

export default PasswordInput;

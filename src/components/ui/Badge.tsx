import React from 'react';

export const Badge: React.FC<{ label: string; className?: string }> = ({ label, className = '' }) => (
  <span
    className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${className}`}
  >
    {label}
  </span>
);

import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 to-pink-50 p-4 sm:p-6 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-6">
        {children}
      </div>
    </div>
  );
};

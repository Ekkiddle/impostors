import React from 'react';

export default function LoadingDots() {
    return (
        <div className="flex items-center justify-center bg-black text-white text-xl font-mono">
          <span className="text-3xl animate-bounce [animation-delay:0s]">.</span>
          <span className="text-3xl animate-bounce [animation-delay:0.1s]">.</span>
          <span className="text-3xl animate-bounce [animation-delay:0.2s]">.</span>
        </div>
      );
};


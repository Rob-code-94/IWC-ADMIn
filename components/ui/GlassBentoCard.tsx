import React from 'react';

interface GlassBentoCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}

const GlassBentoCard: React.FC<GlassBentoCardProps> = ({ children, className = '', title, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        /* iOS 18 LIQUID GLASS STACK */
        bg-white/70 
        backdrop-blur-2xl 
        border border-white/40 
        rounded-[2.5rem] 
        shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]
        
        transition-all 
        duration-400 
        ease-in-out 
        
        ${onClick ? 'cursor-pointer active:scale-[0.98] hover:bg-white/90' : 'hover:bg-white/80'}
        
        p-6 
        ${className}
      `}
    >
      {title && (
        <h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.15em] mb-4 pl-1">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};

export default GlassBentoCard;
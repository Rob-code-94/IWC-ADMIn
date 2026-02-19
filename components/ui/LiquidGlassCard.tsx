import React from 'react';

interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  title?: string;
  onClick?: () => void;
}

export const LiquidGlassCard: React.FC<LiquidGlassCardProps> = ({ children, className = '', title, onClick, ...rest }) => {
  return (
    <div
      onClick={onClick}
      {...rest}
      className={`
      /* iOS 18 LIQUID GLASS STACK */
      bg-white/70 
      backdrop-blur-2xl 
      
      /* THE SILK BORDER */
      border border-white/40 
      
      /* RADIUS: Apple standard 40px */
      rounded-[2.5rem] 
      
      /* SHADOW: Soft depth without black heavy lifting */
      shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]
      
      /* TRANSITION: Fluid iOS-style interaction */
      transition-all 
      duration-400 
      ease-[cubic-bezier(0.25,0.1,0.25,1)]
      
      /* TACTILE FEEDBACK */
      ${onClick ? 'cursor-pointer active:scale-[0.98] hover:bg-white/90' : 'hover:bg-white/80'}
      
      /* Layout & Spacing */
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

export default LiquidGlassCard;
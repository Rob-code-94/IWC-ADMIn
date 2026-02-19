import React from 'react';

export const VoiceInput: React.FC = () => {
  return (
    <div className="relative group">
      <input 
        type="text" 
        placeholder="Type or speak..."
        className="w-full bg-slate-100/50 text-slate-900 text-sm font-medium placeholder:text-slate-400 rounded-full py-4 px-6 pr-12 border border-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all shadow-inner"
      />
      <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
      </button>
    </div>
  );
};
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

interface VoiceTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

export const VoiceTextArea: React.FC<VoiceTextAreaProps> = ({ value, onChange, className, ...rest }) => {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const valueRef = useRef(value);

  // Sync value ref for the event handler closure to avoid stale state in onresult
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Browser compatibility check
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              transcript += event.results[i][0].transcript;
            }
          }

          if (transcript) {
            const currentValue = valueRef.current || '';
            // Append with a space if needed
            const newValue = currentValue + (currentValue && !currentValue.endsWith(' ') ? ' ' : '') + transcript;
            
            // Programmatically update the textarea to trigger React's onChange
            if (textareaRef.current) {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
              if (nativeInputValueSetter) {
                nativeInputValueSetter.call(textareaRef.current, newValue);
                
                // Dispatch input event for React to detect change
                const ev = new Event('input', { bubbles: true });
                textareaRef.current.dispatchEvent(ev);
              }
            }
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
    
    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert("Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
        return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      // State update handled in onend
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Error starting speech recognition:", err);
        setIsListening(false);
      }
    }
  };

  return (
    <div className="relative group w-full">
      <textarea 
        ref={textareaRef}
        value={value}
        onChange={onChange}
        {...rest}
        className={`w-full bg-slate-100/50 text-slate-900 text-sm font-medium placeholder:text-slate-400 rounded-[1.5rem] p-6 border border-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all resize-none shadow-inner ${className}`}
      />
       <button 
        type="button" 
        onClick={toggleListening}
        className={`absolute bottom-5 right-5 transition-all p-2.5 rounded-full shadow-sm flex items-center justify-center
            ${isListening ? 'bg-red-500 text-white animate-pulse shadow-red-500/30' : 'bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50'}
        `} 
        title={isListening ? "Stop Dictation" : "Start Dictation"}
       >
        {isListening ? <MicOff size={18} /> : <Mic size={18} />}
      </button>
    </div>
  );
};
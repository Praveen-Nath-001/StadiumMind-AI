import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
  highContrast: boolean;
  toggleHighContrast: () => void;
  largeText: boolean;
  toggleLargeText: () => void;
  textToSpeech: boolean;
  toggleTextToSpeech: () => void;
  speak: (text: string) => void;
  speechToTextSupport: boolean;
  isListening: boolean;
  startListening: (onResult: (transcript: string) => void) => void;
  stopListening: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [textToSpeech, setTextToSpeech] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechToTextSupport, setSpeechToTextSupport] = useState(false);
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  // Load preferences from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hc = localStorage.getItem('sm_high_contrast') === 'true';
      const lt = localStorage.getItem('sm_large_text') === 'true';
      const tts = localStorage.getItem('sm_text_to_speech') === 'true';
      setHighContrast(hc);
      setLargeText(lt);
      setTextToSpeech(tts);

      // Check Speech Recognition capability
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechToTextSupport(true);
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-US';
        setRecognitionInstance(rec);
      }
    }
  }, []);

  const toggleHighContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    localStorage.setItem('sm_high_contrast', String(next));
  };

  const toggleLargeText = () => {
    const next = !largeText;
    setLargeText(next);
    localStorage.setItem('sm_large_text', String(next));
  };

  const toggleTextToSpeech = () => {
    const next = !textToSpeech;
    setTextToSpeech(next);
    localStorage.setItem('sm_text_to_speech', String(next));
    if (next) {
      speak("Text to speech navigation assistant activated.");
    }
  };

  const speak = (text: string) => {
    if (!textToSpeech || typeof window === 'undefined') return;
    window.speechSynthesis.cancel(); // clear previous queue
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const startListening = (onResult: (transcript: string) => void) => {
    if (!recognitionInstance) return;
    try {
      setIsListening(true);
      recognitionInstance.start();
      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onResult(transcript);
        setIsListening(false);
      };
      recognitionInstance.onerror = () => {
        setIsListening(false);
      };
      recognitionInstance.onend = () => {
        setIsListening(false);
      };
    } catch (e) {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (!recognitionInstance) return;
    recognitionInstance.stop();
    setIsListening(false);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        toggleHighContrast,
        largeText,
        toggleLargeText,
        textToSpeech,
        toggleTextToSpeech,
        speak,
        speechToTextSupport,
        isListening,
        startListening,
        stopListening,
      }}
    >
      <div
        className={`${highContrast ? 'bg-black text-white border-2 border-white' : ''} ${
          largeText ? 'text-xl' : 'text-base'
        } min-h-screen`}
      >
        {children}
      </div>
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
export default useAccessibility;

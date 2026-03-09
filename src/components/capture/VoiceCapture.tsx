import { useState, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParsedVoiceInput } from '@/types/activity';
import { supabase } from '@/integrations/supabase/client';

interface VoiceCaptureProps {
  onCapture: (text: string, parsed: ParsedVoiceInput) => void;
  placeholder?: string;
}

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const VoiceCapture = ({ onCapture, placeholder = "Tap to speak..." }: VoiceCaptureProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      setTranscript(result[0].transcript);
      if (result.isFinal) {
        processVoiceInput(result[0].transcript);
      }
    };

    recognitionRef.current.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const processVoiceInput = async (text: string) => {
    setIsProcessing(true);

    try {
      const response = await supabase.functions.invoke('parse-voice-input', {
        body: { text },
      });

      if (response.error) throw response.error;
      const parsed: ParsedVoiceInput = response.data;
      onCapture(text, parsed);
    } catch {
      onCapture(text, {
        type: 'unknown',
        content: text,
        extracted: {},
        confidence: 0.3,
      });
    } finally {
      setIsProcessing(false);
      setTranscript('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          variant={isListening ? "destructive" : "outline"}
          size="icon"
          className={`rounded-full w-12 h-12 ${isListening ? 'animate-pulse' : ''}`}
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </Button>

        <div className="flex-1">
          {isListening ? (
            <div className="text-primary animate-pulse">Listening...</div>
          ) : transcript ? (
            <div className="text-foreground">{transcript}</div>
          ) : (
            <div className="text-muted-foreground">{placeholder}</div>
          )}
        </div>
      </div>

      {isListening && (
        <div className="flex justify-center gap-1">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-primary rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 20 + 10}px`,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default VoiceCapture;

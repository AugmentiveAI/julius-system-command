import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mic, Keyboard, Clock, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import VoiceCapture from './VoiceCapture';
import QuickEntry from './QuickEntry';
import { useActivityLog } from '@/hooks/useActivityLog';
import { useCalendarContext } from '@/hooks/useCalendarContext';
import { ParsedVoiceInput, QuickEntryData } from '@/types/activity';
import { toast } from 'sonner';

interface CaptureModalProps {
  open: boolean;
  onClose: () => void;
}

const CaptureModal = ({ open, onClose }: CaptureModalProps) => {
  const [activeTab, setActiveTab] = useState('quick');
  const { logFromVoice, logFromQuickEntry, logActivity } = useActivityLog();
  const { addEventFromText } = useCalendarContext();

  const handleVoiceCapture = (_text: string, parsed: ParsedVoiceInput) => {
    logFromVoice(parsed);
    toast.success(`Logged: ${parsed.content}`);
    if (parsed.confidence > 0.8) {
      setTimeout(onClose, 800);
    }
  };

  const handleQuickEntry = (entry: QuickEntryData) => {
    logFromQuickEntry(entry);
    toast.success(`Logged: ${entry.parsed.content}`);
    onClose();
  };

  const handleTimeLog = (minutes: number, category: string, description: string) => {
    logActivity('time_logged', description, { duration: minutes, category, source: 'manual' });
    toast.success(`Logged ${minutes} min on ${category}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Quick Capture</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="quick" className="flex items-center gap-1">
              <Keyboard className="w-4 h-4" />
              <span className="hidden sm:inline">Quick</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-1">
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">Voice</span>
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Time</span>
            </TabsTrigger>
            <TabsTrigger value="event" className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Event</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="mt-4">
            <QuickEntry onSubmit={handleQuickEntry} />
          </TabsContent>

          <TabsContent value="voice" className="mt-4">
            <VoiceCapture onCapture={handleVoiceCapture} />
          </TabsContent>

          <TabsContent value="time" className="mt-4">
            <TimeLogForm onSubmit={handleTimeLog} />
          </TabsContent>

          <TabsContent value="event" className="mt-4">
            <EventForm onSubmit={addEventFromText} onClose={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const TimeLogForm = ({ onSubmit }: { onSubmit: (min: number, cat: string, desc: string) => void }) => {
  const [minutes, setMinutes] = useState(30);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground">Duration</label>
        <div className="flex gap-2 mt-1 flex-wrap">
          {[15, 30, 45, 60, 90, 120].map(m => (
            <Button
              key={m}
              variant={minutes === m ? "default" : "outline"}
              size="sm"
              onClick={() => setMinutes(m)}
            >
              {m >= 60 ? `${m / 60}h` : `${m}m`}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-muted-foreground">Category</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {['outreach', 'client', 'automation', 'content', 'learning', 'admin'].map(cat => (
            <Button
              key={cat}
              variant={category === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm text-muted-foreground">What did you work on?</label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description..."
          className="mt-1"
        />
      </div>

      <Button
        className="w-full"
        disabled={!category || !description}
        onClick={() => onSubmit(minutes, category, description)}
      >
        Log Time
      </Button>
    </div>
  );
};

const EventForm = ({ onSubmit, onClose }: { onSubmit: (text: string) => Promise<any>; onClose: () => void }) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const result = await onSubmit(text);
      if (result) {
        toast.success(`Event created: ${result.title}`);
        onClose();
      } else {
        toast.error('Could not parse event. Try: "Meeting with David tomorrow at 2pm"');
      }
    } catch {
      toast.error('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm text-muted-foreground">Describe the event</label>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='e.g. "Meeting with David tomorrow at 2pm"'
          className="mt-1"
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
        />
      </div>
      <Button className="w-full" disabled={!text.trim() || loading} onClick={handleSubmit}>
        {loading ? 'Parsing...' : 'Add Event'}
      </Button>
    </div>
  );
};

export default CaptureModal;

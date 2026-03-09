import { useState, useRef, useEffect } from 'react';
import { Send, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QuickEntryData } from '@/types/activity';

interface QuickEntryProps {
  onSubmit: (entry: QuickEntryData) => void;
  placeholder?: string;
}

const PREFIXES: Record<string, { type: string; priority?: string }> = {
  '!': { type: 'task', priority: 'high' },
  '+': { type: 'done' },
  '#': { type: 'note' },
  '@': { type: 'time' },
  '*': { type: 'idea' },
};

const CATEGORY_TAGS: Record<string, string> = {
  '/o': 'outreach',
  '/c': 'client',
  '/a': 'automation',
  '/t': 'training',
  '/l': 'learning',
  '/p': 'personal',
};

function parseQuickEntry(text: string): QuickEntryData['parsed'] {
  let type: QuickEntryData['parsed']['type'] = 'note';
  let priority: 'high' | 'medium' | 'low' | undefined;
  let category: string | undefined;
  let duration: number | undefined;
  let content = text.trim();

  const firstChar = content[0];
  if (firstChar && PREFIXES[firstChar]) {
    const prefixData = PREFIXES[firstChar];
    type = prefixData.type as QuickEntryData['parsed']['type'];
    priority = prefixData.priority as 'high' | undefined;
    content = content.slice(1).trim();
  }

  for (const [tag, cat] of Object.entries(CATEGORY_TAGS)) {
    if (content.includes(tag)) {
      category = cat;
      content = content.replace(tag, '').trim();
    }
  }

  const durationMatch = content.match(/(\d+\.?\d*)\s*(h|hr|hrs|hour|hours|m|min|mins|minutes)/i);
  if (durationMatch) {
    const num = parseFloat(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    duration = unit.startsWith('h') ? num * 60 : num;
    content = content.replace(durationMatch[0], '').trim();
  }

  return { type, content, category, duration, priority };
}

function getTypeColor(type: string) {
  switch (type) {
    case 'task': return 'bg-primary/20 text-primary';
    case 'done': return 'bg-green-500/20 text-green-400';
    case 'note': return 'bg-muted text-muted-foreground';
    case 'time': return 'bg-amber-500/20 text-amber-400';
    case 'idea': return 'bg-purple-500/20 text-purple-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

const QuickEntry = ({ onSubmit, placeholder = "Quick capture... (! + # @ *)" }: QuickEntryProps) => {
  const [value, setValue] = useState('');
  const [preview, setPreview] = useState<QuickEntryData['parsed'] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!value.trim()) {
      setPreview(null);
      return;
    }
    setPreview(parseQuickEntry(value));
  }, [value]);

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit({ raw: value, parsed: parseQuickEntry(value) });
    setValue('');
    setPreview(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pr-10"
          />
          <Zap className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
        <Button onClick={handleSubmit} disabled={!value.trim()} size="icon">
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {preview && (
        <div className="p-2 bg-muted/50 rounded text-sm flex flex-wrap gap-2 items-center">
          <span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(preview.type)}`}>
            {preview.type}
          </span>
          {preview.category && (
            <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400">
              {preview.category}
            </span>
          )}
          {preview.duration && (
            <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400">
              {preview.duration}m
            </span>
          )}
          {preview.priority === 'high' && (
            <span className="px-2 py-0.5 rounded text-xs bg-destructive/20 text-destructive">
              high priority
            </span>
          )}
          <span className="text-muted-foreground flex-1">{preview.content}</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        <span className="mr-2">!</span>task
        <span className="mx-2">+</span>done
        <span className="mx-2">#</span>note
        <span className="mx-2">@</span>time
        <span className="mx-2">*</span>idea
        <span className="mx-2">|</span>
        <span className="mr-2">/o</span>outreach
        <span className="mr-2">/c</span>client
      </div>
    </div>
  );
};

export default QuickEntry;

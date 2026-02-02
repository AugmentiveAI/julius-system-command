import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InventoryItem } from '@/types/inventory';

interface ListCardProps {
  title: string;
  icon: React.ReactNode;
  items: InventoryItem[];
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  placeholder?: string;
}

export const ListCard = ({ title, icon, items, onAdd, onRemove, placeholder = 'Add new item...' }: ListCardProps) => {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onAdd(newItem.trim());
      setNewItem('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-display text-lg font-bold text-foreground">{title}</h3>
        <span className="ml-auto font-tech text-sm text-muted-foreground">
          {items.length} items
        </span>
      </div>

      {/* Add new item */}
      <div className="flex gap-2 mb-4">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value.slice(0, 100))}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-background border-border"
          maxLength={100}
        />
        <Button
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="bg-primary/20 text-primary hover:bg-primary/30 border border-primary/50"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Items list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {items.length === 0 ? (
          <p className="font-tech text-sm text-muted-foreground text-center py-4">
            No items yet.
          </p>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-md bg-background/50 px-3 py-2 group"
            >
              <span className="font-tech text-sm text-foreground truncate">
                {item.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(item.id)}
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

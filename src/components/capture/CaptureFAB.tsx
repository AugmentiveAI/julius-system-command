import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CaptureModal from './CaptureModal';

const CaptureFAB = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg z-40"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-6 h-6" />
      </Button>

      <CaptureModal open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default CaptureFAB;

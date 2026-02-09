import { createContext, useContext } from 'react';
import { SystemComm } from '@/hooks/useSystemComms';

interface SystemCommsContextType {
  enqueue: (comm: SystemComm) => void;
}

export const SystemCommsContext = createContext<SystemCommsContextType>({
  enqueue: () => {},
});

export function useSystemCommsContext() {
  return useContext(SystemCommsContext);
}

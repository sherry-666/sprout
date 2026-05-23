import React, { createContext, useContext, useState } from 'react';

interface QuickLogContextValue {
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
}

const QuickLogContext = createContext<QuickLogContextValue>({
  activeConversationId: null,
  setActiveConversationId: () => {},
});

export function QuickLogProvider({ children }: { children: React.ReactNode }) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  return (
    <QuickLogContext.Provider value={{ activeConversationId, setActiveConversationId }}>
      {children}
    </QuickLogContext.Provider>
  );
}

export const useQuickLog = () => useContext(QuickLogContext);

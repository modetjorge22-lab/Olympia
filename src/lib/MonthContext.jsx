import React, { createContext, useContext, useState } from 'react';

const MonthContext = createContext(null);

export function MonthProvider({ children }) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));

  const goBack = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goForward = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Navega a un mes concreto (acepta cualquier Date, ignora el día/hora).
  const goToMonth = (date) => {
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  };

  return (
    <MonthContext.Provider value={{ currentMonth, goBack, goForward, goToMonth }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const context = useContext(MonthContext);
  if (!context) throw new Error('useMonth must be used within MonthProvider');
  return context;
}

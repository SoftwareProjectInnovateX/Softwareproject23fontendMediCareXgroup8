import { createContext, useContext, useState, useEffect } from "react";

const DarkModeContext = createContext();

export function DarkModeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("customerDarkMode") === "true";
  });

  useEffect(() => {
    localStorage.setItem("customerDarkMode", isDark);
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  const toggleDark = () => setIsDark((prev) => !prev);

  return (
    <DarkModeContext.Provider value={{ isDark, toggleDark }}>
      {children}
    </DarkModeContext.Provider>
  );
}

// Custom hook — any component can call useDarkMode() to get isDark and toggleDark
export function useDarkMode() {
  return useContext(DarkModeContext);
}

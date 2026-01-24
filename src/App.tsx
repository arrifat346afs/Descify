import "./App.css";
import { Home } from "./app/Home";
import { Toaster } from "./components/ui/sonner";
import Navbar from "./app/_component/navigation/Navbar";
import { useEffect } from "react";
import { useSettings } from "./app/contexts/SettingsContext";
import { ConsoleProvider } from "./components/ConsoleContext";


function App() {
  const { hasApiKey, settingsDialog } = useSettings();

  // Check if API key is configured on mount
  useEffect(() => {
    if (!hasApiKey()) {
      // Open settings dialog with API Keys tab selected
      settingsDialog.setDefaultTab('apikeys');
      settingsDialog.setIsOpen(true);
    }
  }, []); // Only run once on mount

  return (
    <ConsoleProvider>
      <main className="flex-1">
        <div className="h-[35px]">
          <Navbar />
        </div>
        <Home />
        <Toaster />
        
      </main>
    </ConsoleProvider>
  );
}

export default App;

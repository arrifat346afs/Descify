import "./App.css";
import { Home } from "./app/Home";
import { Toaster } from "./components/ui/sonner";
import Navbar from "./app/_component/navigation/Navbar";
import { useEffect } from "react";
import { useSettings } from "./app/contexts/SettingsContext";
import { UpdateChecker } from "./components/UpdateChecker";

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
    <main className="flex-1">
      <div className="h-[35px]">
        <Navbar />
      </div>
      <Home />
      <Toaster />
      <UpdateChecker />
    </main>
  );
}

export default App;

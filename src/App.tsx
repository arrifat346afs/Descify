import "./App.css";
import { Home } from "./app/Home";
import { Toaster } from "./components/ui/sonner";
import Navbar from "./app/_component/navigation/Navbar";

function App() {
  return (
    <main className="flex-1 ">
      <div className="h-[35px]">
        <Navbar />
      </div>
      <Home />
      <Toaster />
    </main>
  );
}

export default App;

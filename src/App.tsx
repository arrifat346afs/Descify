// import { useState } from "react";
// import reactLogo from "./assets/react.svg";
// import { invoke } from "@tauri-apps/api/core";

import "./App.css";
import { Home } from "./app/Home";
import { Toaster } from "./components/ui/sonner";

function App() {


  return (
    <main className="flex-1 ">
      <Home/>
       <Toaster />
    </main>
  );
}

export default App;

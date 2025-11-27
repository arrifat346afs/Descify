import { Button } from "@/components/ui/button";
import Settings from "../settings/Settings";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { SettingsIcon } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  VscChromeClose,
  VscChromeMaximize,
  VscChromeMinimize,
  VscChromeRestore,
} from "react-icons/vsc";
import { ItemMedia } from "@/components/ui/item";
import logo from "../../../assets/tp.png";
import { useEffect, useState } from "react";
import { useSettings } from "@/app/contexts/SettingsContext";

const Navbar = () => {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);
  const { settingsDialog } = useSettings();

  useEffect(() => {
    // Check initial maximized state
    const checkMaximized = async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };
    checkMaximized();

    // Listen for window resize events to update maximized state
    const unlisten = appWindow.onResized(async () => {
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [appWindow]);
  return (
    <div className="flex justify-between items-center h-full">
      <div data-tauri-drag-region className="flex w-full">
        <div className="flex justify-center items-center">
          <ItemMedia variant="image">
            <img
              src={logo}
              alt="logo"
              style={{
                width: "25px",
                height: "auto", 
              }}
            />
          </ItemMedia>
        </div>
        <div className="flex justify-center items-center">
          <Dialog open={settingsDialog.isOpen} onOpenChange={settingsDialog.setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-transparent hover:bg-muted">
                <SettingsIcon className="w-8 h-8 text-white text-3xl" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <Settings />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex">
        <Button
          onClick={() => appWindow.minimize()}
          className=" bg-transparent text-white rounded-none  hover:bg-zinc-500/30"
        >
          <VscChromeMinimize />
        </Button>
        <Button
          onClick={() => appWindow.toggleMaximize()}
          className=" bg-transparent text-white rounded-none hover:bg-zinc-500/30"
        >
          {isMaximized ? <VscChromeRestore /> : <VscChromeMaximize />}
        </Button>
        <Button
          onClick={() => appWindow.close()}
          className=" bg-transparent text-white rounded-none hover:bg-red-500 hover:text-black"
        >
          <VscChromeClose />
        </Button>
      </div>
    </div>
  );
};

export default Navbar;

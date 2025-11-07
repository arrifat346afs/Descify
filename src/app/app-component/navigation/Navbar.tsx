import { Button } from "@/components/ui/button";
import Settings from "../settings/Settings";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { SettingsIcon } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  VscChromeClose,
  VscChromeMaximize,
  VscChromeMinimize,
} from "react-icons/vsc";
import { ItemMedia } from "@/components/ui/item";
import logo from "../../../assets/tp.png";

const Navbar = () => {
  const appWindow = getCurrentWindow();
  return (
    <div className="flex justify-between items-center  border-b h-[31px]">
      <div data-tauri-drag-region className="flex w-full">
        <div>
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
        <div>
          <Dialog>
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
          className="h-full bg-transparent text-white rounded-none  hover:bg-zinc-500/30"
        >
          <VscChromeMinimize />
        </Button>
        <Button
          onClick={() => appWindow.maximize()}
          className="h-full bg-transparent text-white rounded-none hover:bg-zinc-500/30"
        >
          <VscChromeMaximize />
        </Button>
        <Button
          onClick={() => appWindow.close()}
          className="h-full bg-transparent text-white rounded-none hover:bg-red-500 hover:text-black"
        >
          <VscChromeClose />
        </Button>
      </div>
    </div>
  );
};

export default Navbar;

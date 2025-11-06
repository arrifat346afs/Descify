import { Button } from "@/components/ui/button";
import Settings from "../settings/Settings";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { SettingsIcon } from "lucide-react";

const Navbar = () => {
  return (
    <div>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="bg-transparent hover:bg-muted"><SettingsIcon className="w-8 h-8 text-white text-3xl" /></Button>
        </DialogTrigger>
        <DialogContent>
          <Settings />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Navbar
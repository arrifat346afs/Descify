import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { TooltipWrapper } from "./tooltip-wrapper";


interface ThemeToggleProps extends React.ComponentProps<typeof Button> { }

export function ThemeToggle({ className, ...props }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const handleThemeToggle = (_event: React.MouseEvent<HTMLButtonElement>) => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  return (
    <TooltipWrapper label="Toggle theme" asChild>
      <Button variant={"ghost"}  className={cn("cursor-pointer text-3xl", className)} {...props} onClick={handleThemeToggle}>
        {theme === "light" ? <Moon /> : <Sun />}
      </Button>
    </TooltipWrapper>
  );
}
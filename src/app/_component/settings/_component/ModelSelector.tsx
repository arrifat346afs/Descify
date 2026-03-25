import { useState, useMemo, useRef, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import type { ModelInfo } from "@/app/lib/modelFetcher";

interface ModelSelectorProps {
    models: ModelInfo[];
    value: string;
    onValueChange: (value: string) => void;
    isLoading?: boolean;
    disabled?: boolean;
    placeholder?: string;
    searchPlaceholder?: string;
}

export function ModelSelector({
    models,
    value,
    onValueChange,
    isLoading = false,
    disabled = false,
    placeholder = "Select a model",
    searchPlaceholder = "Search models...",
}: ModelSelectorProps) {
    const [open, setOpen] = useState(false);

    const selectedModel = useMemo(
        () => models.find((model) => model.value === value),
        [models, value]
    );

    const containerRef = useRef<HTMLDivElement>(null);

    // Close when clicking outside
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    return (
        <div ref={containerRef} className="relative w-full">
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between px-3 font-normal"
                disabled={disabled || isLoading}
                onClick={() => setOpen((prev) => !prev)}
            >
                <span className="truncate">
                    {isLoading
                        ? "Loading models..."
                        : selectedModel
                            ? selectedModel.label
                            : placeholder}
                </span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>

            {open && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border bg-popover shadow-md ring-1 ring-foreground/10">
                    <Command>
                        <CommandInput placeholder={searchPlaceholder} />
                        <CommandList onWheel={(e) => e.stopPropagation()}>
                            <CommandEmpty>No models found.</CommandEmpty>
                            <CommandGroup heading="Available Models">
                                {models.map((model) => (
                                    <CommandItem
                                        key={model.value}
                                        value={model.label}
                                        onSelect={() => {
                                            onValueChange(model.value);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === model.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex flex-col">
                                            <span>{model.label}</span>
                                            {model.value !== model.label && (
                                                <span className="text-[10px] text-muted-foreground truncate max-w-[400px]">
                                                    {model.value}
                                                </span>
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </div>
            )}
        </div>
    );
}

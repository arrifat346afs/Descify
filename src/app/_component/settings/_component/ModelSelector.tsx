import { useState, useMemo } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    CommandDialog,
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

    // We don't need manual filtering here as CommandDialog's internal Command handles it beautifully by default
    // providing we set the 'value' on CommandItem correctly.
    // However, if we want custom filtering we can pass `shouldFilter={false}`.
    // For now, let's use the default filtering for better performance and behavior.

    const selectedModel = useMemo(
        () => models.find((model) => model.value === value),
        [models, value]
    );

    return (
        <>
            <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between px-3 font-normal"
                disabled={disabled || isLoading}
                onClick={() => setOpen(true)}
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

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder={searchPlaceholder} />
                <CommandList>
                    <CommandEmpty>No models found.</CommandEmpty>
                    <CommandGroup heading="Available Models">
                        {models.map((model) => (
                            <CommandItem
                                key={model.value}
                                value={model.label} // Use label for searching
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
            </CommandDialog>
        </>
    );
}

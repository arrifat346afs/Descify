import { useState, useMemo } from "react";
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
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

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between px-3 font-normal"
                    disabled={disabled || isLoading}
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
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[--radix-popover-trigger-width] p-0"
            >
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
            </PopoverContent>
        </Popover>
    );
}

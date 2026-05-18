"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ThumbnailScrollContainerProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  scrollRef?: React.RefObject<HTMLDivElement>;
}

export function ThumbnailScrollContainer({
  children,
  className,
  style,
  onScroll,
  scrollRef,
}: ThumbnailScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const ref = scrollRef ?? containerRef;

  const handleWheel = useCallback((e: WheelEvent) => {
    if (!isHovered) return;

    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      const container = ref.current;
      if (container) {
        container.scrollLeft += e.deltaY;
      }
    }
  }, [isHovered, ref]);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel, ref]);

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "overflow-x-auto overflow-y-hidden",
        "scrollbar-thin",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}
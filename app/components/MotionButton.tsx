"use client";

import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MotionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  active?: boolean;
}

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ label, active = false, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative flex h-10 w-full cursor-pointer items-center justify-center overflow-hidden rounded-full border border-zinc-500 px-3 py-2 outline-none text-sm transition-colors",
          "text-zinc-900",
          active && "font-semibold",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "circle pointer-events-none absolute inset-y-1 left-1 m-0 h-8 w-8 rounded-full bg-zinc-900 transition-all duration-500 group-hover:w-[calc(100%-0.5rem)]",
          )}
          aria-hidden="true"
        />
        <div className="icon pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 translate-x-0 text-xs text-white transition-transform duration-500 group-hover:translate-x-2">
          <ArrowRight className="size-3.5" />
        </div>
        <span className="button-text pointer-events-none z-10 whitespace-nowrap text-center text-[13px] font-medium tracking-tight text-zinc-900 transition-colors duration-500 group-hover:text-white">
          {label}
        </span>
      </button>
    );
  },
);

MotionButton.displayName = "MotionButton";


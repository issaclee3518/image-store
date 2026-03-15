"use client";

import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  /** true면 뒤로 가기 스타일: 화살표 왼쪽, 애니메이션 반대 방향 */
  back?: boolean;
}

const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ text = "Button", back = false, className, ...props }, ref) => {
  if (back) {
    return (
      <button
        ref={ref}
        className={cn(
          "group relative w-32 cursor-pointer overflow-hidden rounded-full border border-zinc-300 bg-white p-2 text-center text-sm font-semibold text-zinc-900",
          className,
        )}
        {...props}
      >
        <span className="inline-block transition-all duration-300 group-hover:-translate-x-12 group-hover:opacity-0">
          {text}
        </span>
        <div className="absolute top-0 z-10 flex h-full w-full -translate-x-12 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          <ArrowLeft className="h-4 w-4" />
          <span>{text}</span>
        </div>
        <div className="absolute right-[20%] top-[40%] h-2 w-2 scale-[1] rounded-lg bg-zinc-900 transition-all duration-300 group-hover:right-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[1.8]" />
      </button>
    );
  }
  return (
    <button
      ref={ref}
      className={cn(
        "group relative w-32 cursor-pointer overflow-hidden rounded-full border border-zinc-300 bg-white p-2 text-center text-sm font-semibold text-zinc-900",
        className,
      )}
      {...props}
    >
      <span className="inline-block translate-x-1 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
        {text}
      </span>
      <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100">
        <span>{text}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
      <div className="absolute left-[20%] top-[40%] h-2 w-2 scale-[1] rounded-lg bg-zinc-900 transition-all duration-300 group-hover:left-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[1.8]"></div>
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };

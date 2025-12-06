"use client";
import * as React from "react";

import { cn } from "@/lib/utils";
import { useDirection } from "@/components/providers/DirectionProvider";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, dir, ...props }, ref) => {
    const { isRTL } = useDirection();
    const inputDir = dir || (isRTL ? 'rtl' : 'ltr');
    
    // Check if className already specifies text alignment (including important modifiers)
    const classNameStr = typeof className === 'string' ? className : '';
    const hasTextAlign = classNameStr.includes('text-left') || classNameStr.includes('text-right') || classNameStr.includes('text-center');
    const hasImportantTextAlign = classNameStr.includes('!text-left') || classNameStr.includes('!text-right') || classNameStr.includes('!text-center');
    
    return (
      <input
        type={type}
        dir={inputDir}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          // Only apply auto text-right if no explicit text alignment is specified
          isRTL && !hasTextAlign && !hasImportantTextAlign ? 'text-right' : '',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

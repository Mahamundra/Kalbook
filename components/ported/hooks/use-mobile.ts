"use client";
import { useEffect, useState } from "react";

export function useIsMobile(breakpoint: number = 768) {
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const mq = typeof window !== "undefined" ? window.matchMedia(`(max-width: ${breakpoint}px)`) : null;
    const update = () => setIsMobile(!!mq?.matches);
    update();
    mq?.addEventListener("change", update);
    return () => mq?.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}



import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useEffect, useRef } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// For Future Iteration 

export const useAutoScroll = (dependency: any, autoScroll: boolean) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && autoScroll) {
      ref.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [dependency, autoScroll])

  return ref
}
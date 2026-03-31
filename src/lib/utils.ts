import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useEffect, useRef } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const useAutoScroll = (dependency: any, autoScroll: boolean) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && autoScroll) {
      ref.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [dependency, autoScroll])

  return ref
}

export const getBadgeColorFromHash = (str: string) => {
  const colors = [
    "bg-red-500/15 text-red-500 hover:bg-red-500/25",
    "bg-blue-500/15 text-blue-500 hover:bg-blue-500/25",
    "bg-green-500/15 text-green-500 hover:bg-green-500/25",
    "bg-yellow-500/15 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/25",
    "bg-purple-500/15 text-purple-500 hover:bg-purple-500/25",
    "bg-pink-500/15 text-pink-500 hover:bg-pink-500/25",
    "bg-indigo-500/15 text-indigo-500 hover:bg-indigo-500/25",
    "bg-teal-500/15 text-teal-500 hover:bg-teal-500/25",
    "bg-orange-500/15 text-orange-500 hover:bg-orange-500/25",
    "bg-cyan-500/15 text-cyan-500 hover:bg-cyan-500/25",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
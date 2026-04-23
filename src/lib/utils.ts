import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { useEffect, useRef } from "react"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const useAutoScroll = (dependency: any, autoScroll: boolean, options: ScrollIntoViewOptions = { behavior: "smooth" }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && autoScroll) {
      ref.current.scrollIntoView(options)
    }
  }, [dependency, autoScroll, options])

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
    "bg-amber-500/15 text-amber-600 dark:text-amber-500 hover:bg-amber-500/25",
    "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25",
    "bg-sky-500/15 text-sky-500 hover:bg-sky-500/25",
    "bg-lime-500/15 text-lime-600 dark:text-lime-500 hover:bg-lime-500/25",
    "bg-violet-500/15 text-violet-500 hover:bg-violet-500/25",
    "bg-fuchsia-500/15 text-fuchsia-500 hover:bg-fuchsia-500/25",
    "bg-rose-500/15 text-rose-500 hover:bg-rose-500/25",
    "bg-slate-500/15 text-slate-500 hover:bg-slate-500/25",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const getTextColorFromHash = (str: string) => {
  const colors = [
    "text-red-500",
    "text-blue-500",
    "text-green-500",
    "text-yellow-600 dark:text-yellow-500",
    "text-purple-500",
    "text-pink-500",
    "text-indigo-500",
    "text-teal-500",
    "text-orange-500",
    "text-cyan-500",
    "text-amber-600 dark:text-amber-500",
    "text-emerald-500",
    "text-sky-500",
    "text-lime-600 dark:text-lime-500",
    "text-violet-500",
    "text-fuchsia-500",
    "text-rose-500",
    "text-slate-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};
"use client";

import Image from "next/image";
import { FolderGit, FileText, Upload, Eraser, MessageSquare, Plus, Minus } from "lucide-react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { useTheme } from "next-themes";

interface MainHeaderProps {
  onUpload: () => void;
  onClear: () => void;
  runSpeed: number;
  onSpeedChange: (speed: number) => void;
  language: "c" | "cpp";
  onLanguageChange: (lang: "c" | "cpp") => void;
}

export function MainHeader({
  onUpload,
  onClear,
  runSpeed,
  onSpeedChange,
  language,
  onLanguageChange
}: MainHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-10 items-center ml-10 mr-10 mt-5 shrink-0">
      <div className="flex gap-2 items-center">
        <Image
          src="/LLVMLogo.svg"
          alt="LLVM Logo"
          width={30}
          height={30}
          className="dark:invert-0 invert"
          priority
        />
        <h1 className="text-3xl font-extrabold tracking-tight text-balance">Visualiser</h1>
      </div>
      <Menubar>
        <MenubarMenu>
          <MenubarTrigger>Code</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={onUpload}><Upload />Upload</MenubarItem>
            <MenubarItem onClick={onClear}><Eraser />Clear</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Language</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value={language} onValueChange={(val) => onLanguageChange(val as "c" | "cpp")}>
              <MenubarRadioItem value="c">C</MenubarRadioItem>
              <MenubarRadioItem value="cpp">C++</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Controls</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={() => onSpeedChange(runSpeed - 100)}><Plus />Run Speed</MenubarItem>
            <MenubarItem onClick={() => onSpeedChange(runSpeed + 100)}><Minus />Run Speed</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Theme</MenubarTrigger>
          <MenubarContent>
            <MenubarRadioGroup value={theme} onValueChange={setTheme}>
              <MenubarRadioItem value="light">Light</MenubarRadioItem>
              <MenubarRadioItem value="dark">Dark</MenubarRadioItem>
              <MenubarRadioItem value="system">System</MenubarRadioItem>
            </MenubarRadioGroup>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Feedback</MenubarTrigger>
          <MenubarContent>
            <a href="https://forms.gle/6YEx5dtdCyrQhByMA" target="_blank" rel="noopener noreferrer">
              <MenubarItem><MessageSquare />Let us know what you think</MenubarItem>
            </a>
          </MenubarContent>
        </MenubarMenu>
        <MenubarMenu>
          <MenubarTrigger>Info</MenubarTrigger>
          <MenubarContent>
            <a href="https://github.com/BartoszLiberda/LLVM-Visualiser" target="_blank" rel="noopener noreferrer">
              <MenubarItem><FolderGit />Project Repo</MenubarItem>
            </a>
            <a href="https://llvm.org/docs/" target="_blank" rel="noopener noreferrer">
              <MenubarItem><FileText />LLVM Documentation</MenubarItem>
            </a>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>
    </div>
  );
}

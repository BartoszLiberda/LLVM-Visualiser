"use client";

import Image from "next/image";
import { FolderGit, FileText, Upload, Eraser, MessageSquare } from "lucide-react";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarTrigger,
  MenubarCheckboxItem,
} from "@/components/ui/menubar";
import { useTheme } from "next-themes";

interface MainHeaderProps {
  onUpload: () => void;
  onClear: () => void;
  language: "c" | "cpp";
  onLanguageChange: (lang: "c" | "cpp") => void;
  showSource: boolean;
  setShowSource: (show: boolean) => void;
  showIR: boolean;
  setShowIR: (show: boolean) => void;
}

export function MainHeader({
  onUpload,
  onClear,
  language,
  onLanguageChange,
  showSource,
  setShowSource,
  showIR,
  setShowIR
}: MainHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col lg:flex-row flex-wrap gap-4 lg:gap-10 items-center px-4 md:px-10 mt-4 md:mt-5 shrink-0">
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
          <MenubarTrigger>View</MenubarTrigger>
          <MenubarContent>
            <MenubarCheckboxItem checked={showSource} onCheckedChange={setShowSource}>
              C/C++ Source
            </MenubarCheckboxItem>
            <MenubarCheckboxItem checked={showIR} onCheckedChange={setShowIR}>
              LLVM IR
            </MenubarCheckboxItem>
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

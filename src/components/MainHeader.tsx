"use client";

import Image from "next/image";
import { FolderGit, FileText, Upload, Eraser, MessageSquare, BookOpen } from "lucide-react";
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
  onExampleSelect: (code: string) => void;
}

const EXAMPLES = {
  c: [
    {
      name: "Basic Variable Arithmetic",
      code: `int main() {\n    int a = 10;\n    int b = 20;\n    int sum = a + b;\n    return sum;\n}`
    },
    {
      name: "Structs and Pointers",
      code: `struct Point {\n    int x;\n    int y;\n};\n\nint main() {\n    struct Point p;\n    p.x = 10;\n    p.y = 20;\n    int area = p.x * p.y;\n    return area;\n}`
    },
    {
      name: "Conditionals & Logic",
      code: `int max(int a, int b) {\n    if (a > b) return a;\n    return b;\n}\n\nint main() {\n    return max(42, 17);\n}`
    },
    {
      name: "Floating Point Operations",
      code: `int main() {\n    float a = 3.14f;\n    float b = 2.0f;\n    float result = a * b;\n    return (int)result;\n}`
    },
    {
      name: "State Machine (Switch)",
      code: `int process(int val) {\n    switch (val) {\n        case 1: return 10;\n        case 2: return 20;\n        default: return 0;\n    }\n}\n\nint main() {\n    return process(2);\n}`
    }
  ],
  cpp: [
    {
      name: "Function Calls & Return Values",
      code: `int add(int a, int b) {\n    return a + b;\n}\n\nint main() {\n    return add(10, 20);\n}`
    },
    {
      name: "Recursion (Factorial)",
      code: `int factorial(int n) {\n    if (n <= 1) return 1;\n    return n * factorial(n - 1);\n}\n\nint main() {\n    return factorial(5);\n}`
    },
    {
      name: "Iteration (For Loop)",
      code: `int main() {\n    int sum = 0;\n    for (int i = 0; i < 5; i++) {\n        sum += i;\n    }\n    return sum;\n}`
    },
    {
      name: "Floating Point Operations",
      code: `int main() {\n    float a = 3.14f;\n    float b = 2.0f;\n    float result = a * b;\n    return static_cast<int>(result);\n}`
    },
    {
      name: "State Machine (Switch)",
      code: `int process(int val) {\n    switch (val) {\n        case 1: return 10;\n        case 2: return 20;\n        default: return 0;\n    }\n}\n\nint main() {\n    return process(2);\n}`
    }
  ]
};

export function MainHeader({
  onUpload,
  onClear,
  language,
  onLanguageChange,
  showSource,
  setShowSource,
  showIR,
  setShowIR,
  onExampleSelect
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
          <MenubarTrigger>Examples</MenubarTrigger>
          <MenubarContent>
            {EXAMPLES[language].map((example, idx) => (
              <MenubarItem key={idx} onClick={() => onExampleSelect(example.code)}>
                <BookOpen className="w-4 h-4 mr-2" />
                {example.name}
              </MenubarItem>
            ))}
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

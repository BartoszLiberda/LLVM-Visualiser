"use client";

import Image from "next/image";
import { FolderGit, FileText, Upload, Eraser, MessageSquare, BookOpen, Lightbulb } from "lucide-react";
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
  onStartTutorial: () => void;
}

const EXAMPLES = {
  c: [
    {
      name: "Fibonacci (Recursion)",
      code: `int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

int main() {
    return fib(6);
}`
    },
    {
      name: "Bubble Sort",
      code: `int main() {
    int arr[4] = {4, 2, 8, 5};
    int n = 4;
    for (int i = 0; i < n - 1; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
    return arr[3];
}`
    },
    {
      name: "GCD (Euclidean Algorithm)",
      code: `int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

int main() {
    return gcd(48, 18);
}`
    },
    {
      name: "Array Sum",
      code: `int main() {
    int arr[5] = {10, 20, 30, 40, 50};
    int sum = 0;
    for (int i = 0; i < 5; i++) {
        sum += arr[i];
    }
    return sum;
}`
    },
    {
      name: "Pointer Swap",
      code: `void swap(int* a, int* b) {
    int temp = *a;
    *a = *b;
    *b = temp;
}

int main() {
    int x = 42, y = 7;
    swap(&x, &y);
    return x;
}`
    }
  ],
  cpp: [
    {
      name: "Fibonacci (Recursion)",
      code: `int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

int main() {
    return fib(6);
}`
    },
    {
      name: "Bubble Sort",
      code: `int main() {
    int arr[4] = {4, 2, 8, 5};
    for (int i = 0; i < 3; i++) {
        for (int j = 0; j < 3 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
        }
    }
    return arr[3];
}`
    },
    {
      name: "GCD (Euclidean Algorithm)",
      code: `int gcd(int a, int b) {
    while (b != 0) {
        int temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

int main() {
    return gcd(48, 18);
}`
    },
    {
      name: "C++ References (Swap)",
      code: `void swap(int &a, int &b) {
    int temp = a;
    a = b;
    b = temp;
}

int main() {
    int x = 100, y = 200;
    swap(x, y);
    return x;
}`
    },
    {
      name: "Simple Class",
      code: `class Point {
public:
    int x, y;
};

int main() {
    Point p;
    p.x = 10;
    p.y = 20;
    return p.x + p.y;
}`
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
  onExampleSelect,
  onStartTutorial
}: MainHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <div id="tour-header" className="flex flex-col lg:flex-row flex-wrap gap-3 lg:gap-8 items-center px-4 md:px-8 mt-3 md:mt-4 shrink-0">
      <div className="flex gap-2 items-center shrink-0">
        <Image
          src="/LLVMLogo.svg"
          alt="LLVM Logo"
          width={26}
          height={26}
          className="dark:invert-0 invert"
          priority
        />
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-balance">Visualiser</h1>
      </div>
      <div className="overflow-x-auto w-full lg:w-auto max-w-full">
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
              <MenubarItem onClick={onStartTutorial}>
                <Lightbulb />Welcome Guide
              </MenubarItem>
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
    </div>
  );
}

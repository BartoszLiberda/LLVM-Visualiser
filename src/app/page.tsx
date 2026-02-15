"use client";

import Editor from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useState } from "react"
import { Hammer, FileCodeCorner, Cpu, Play, SkipForward, FolderGit } from "lucide-react"

export default function Home() {
  const [inputCode, setInputCode] = useState(`int main() {\n  return 42;\n}`);
  const [outputCode, setOutputCode] = useState("// Compile to see LLVM here...");

  return (
    <div>
      <div className="flex justify-between items-center ml-10 mr-10 mt-5">
        <h1 className='text-3xl font-extrabold tracking-tight text-balance'>LLVM Visualiser</h1>
        <a href="https://github.com/BartoszLiberda/LLVM-Visualiser">
          <Button variant="secondary" className="cursor-pointer">
            <FolderGit />
            Project Repo
          </Button>
        </a>
      </div>
      <Separator className="mt-5" />
      <div className='flex flex-row ml-10 mr-10 mt-5'>
        <div className='w-1/3 mr-10'>
          <h1 className="flex items-center gap-2 ml-2 mb-1"><FileCodeCorner size={16} />C++</h1>
          <Editor
            className="p-1 border-1 outline-white"
            height="70vh"
            theme="vs-dark"
            defaultLanguage="cpp"
            value={inputCode}
            onChange={(val) => setInputCode(val ?? "")}
            options={{
              minimap: { enabled: false }
            }}
          />
        </div>
        <div className='w-1/3 mr-10'>
          <h1 className="flex items-center gap-2 ml-2 mb-1"><FileCodeCorner size={16} />LLVM</h1>
          <Editor
            className="p-1 border-1 outline-white"
            height="70vh"
            theme="vs-dark"
            defaultLanguage="ini"
            value={outputCode}
            options={{
              readOnly: true,
              minimap: { enabled: false }
            }}
          />
        </div>
        <div className="w-1/3">
          <h1 className="flex items-center gap-2 ml-2 mb-1"><Cpu size={16} />Register View</h1>
          <div className="h-[70vh] p-1 border-1 outline-white">

          </div>
        </div>
      </div>
      <div className="flex gap-5 ml-10 mt-10 w-2/3">
        <Button
          variant="secondary"
          className="cursor-pointer"
          onClick={() => {
            toast.promise(
              async () => {
                const response = await fetch("/api/compile", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: inputCode }),
                });
                const data = await response.json();
                if (!response.ok) {
                  throw new Error(data.error || "Server Error");
                }
                setOutputCode(data.result);
                return data;
              },
              {
                loading: "Compiling C++ code...",
                success: (data) => "Compilation complete!",
                error: (err) => `Error: ${err.message}`,
              }
            )
          }}
        >
          Compile
          <Hammer />
        </Button>
        <Button
          variant="secondary"
          className="cursor-pointer"
        >
          Run
          <Play />
        </Button>
        <Button
          variant="secondary"
          className="cursor-pointer"
        >
          Step
          <SkipForward />
        </Button>
      </div>
    </div>
  );
}

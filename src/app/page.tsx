"use client";

import Image from "next/image"

import Editor, { OnMount, Monaco } from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useState, useRef } from "react"
import { Hammer, FileCodeCorner, Cpu, Play, SkipForward, FolderGit, RefreshCcw, MemoryStick, Logs, GitCommitHorizontal, FileText, Upload, Eraser } from "lucide-react"
import { Simulator, semantics, grammar, Instruction } from "@/lib/simulator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { Slider } from "@/components/ui/slider"
import { useAutoScroll } from "@/lib/utils";
import RegisterView from "@/components/registerView"
import MemoryView from "@/components/memoryView"
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { useTheme } from "next-themes";

type MonacoEditor = Parameters<OnMount>[0];
type EditorDecorationsCollection = ReturnType<NonNullable<MonacoEditor>['createDecorationsCollection']>;

export default function Home() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [inputCode, setInputCode] = useState(`int main() {\n  return 1;\n}`);
  const [outputCode, setOutputCode] = useState<string>("// Compile to see LLVM here...");

  const [registers, setRegisters] = useState<Record<string, number>>({})
  const [memory, setMemory] = useState<Record<string, number>>({})
  const [logs, setLogs] = useState<string[]>([])
  const [pc, setPc] = useState(0)
  const [isFinished, setIsFinished] = useState(false)

  const irEditorRef = useRef<MonacoEditor | null>(null)
  const sourceEditorRef = useRef<MonacoEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const irDecorationRef = useRef<EditorDecorationsCollection | null>(null);
  const simRef = useRef<Simulator | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetSimulation = (optionalCode?: string) => {
    const match = grammar.match(optionalCode ?? outputCode);
    if (match.failed()) {
      toast.error("Unsupported Instruction");
      return;
    }

    try {
      const instructions: Instruction[] = semantics(match).parse();

      if (instructions.length === 0) {
        toast.warning("No instructions found");
        return;
      }

      simRef.current = new Simulator(instructions);
      setRegisters({});
      setMemory({});
      setLogs([]);
      setPc(0);
      setIsFinished(false);
      clearHighlights();

      toast.success("Simulation Reset");

    } catch (err: any) {
      console.error("Semantic Error:", err);
      toast.error(`Compiler Error: ${err.message}`);
    }
  }

  const step = (targetSteps?: number) => {
    let sim = simRef.current
    if (!sim) {
      resetSimulation()
      return
    }

    if (sim.isFinished && targetSteps === undefined) {
      resetSimulation()
      return
    }

    let targetPc = targetSteps !== undefined ? targetSteps : sim.pc + 1

    let shouldResetLogs = false
    if (targetPc < sim.pc) {
      const match = grammar.match(outputCode)
      if (match.failed()) return
      try {
        const instructions = semantics(match).parse()
        sim = new Simulator(instructions)
        simRef.current = sim
        shouldResetLogs = true
      } catch (err) {
        return
      }
    }

    const logsToAdd: string[] = []
    let lastLineExecuted: number | null = null

    while (sim.pc < targetPc && !sim.isFinished) {
      const currentPc = sim.pc
      const prevLogsLength = sim.logs.length

      const lineExecuted = sim.step()
      if (lineExecuted !== null) {
        lastLineExecuted = lineExecuted
      }

      const newLogs = sim.logs.slice(prevLogsLength).map(log => `Line ${currentPc + 2}: ${log}`)
      logsToAdd.push(...newLogs)
    }

    setRegisters({ ...sim.registers })
    setMemory({ ...sim.memory })

    if (shouldResetLogs) {
      setLogs(logsToAdd)
    } else {
      setLogs(prev => [...prev, ...logsToAdd])
    }

    setPc(sim.pc)
    setIsFinished(sim.isFinished)

    if (sim.pc === 0) {
      clearHighlights()
    } else if (lastLineExecuted !== null) {
      highlightLine(lastLineExecuted)
    }
  }

  const highlightLine = (lineNo: number) => {
    if (!irEditorRef.current || !monacoRef.current) {
      return
    }
    if (!irDecorationRef.current) {
      irDecorationRef.current = irEditorRef.current.createDecorationsCollection()
    }
    irDecorationRef.current.set([
      {
        range: new monacoRef.current.Range(lineNo, 1, lineNo, 1),
        options: {
          isWholeLine: true,
          className: "current-line-highlight"
        }
      }
    ])
    irEditorRef.current.revealLineInCenter(lineNo);
  }

  const clearHighlights = () => {
    irDecorationRef.current?.clear()
  }

  const handleIRMount: OnMount = (editor, monaco) => {
    irEditorRef.current = editor
    monacoRef.current = monaco
  }

  const handleSourceMount: OnMount = (editor, monaco) => {
    sourceEditorRef.current = editor
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      try {
        const text = await file.text()
        setInputCode(text)
      } catch (err) {
        console.error("Error reading file:", err)
        toast.error("Error reading file")
      }
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        const text = await file.text()
        setInputCode(text)
      } catch (err) {
        console.error("Error reading file:", err)
        toast.error("Error reading file")
      }
    }
    if (e.target) {
      e.target.value = ""
    }
  }

  return (
    <div onDragOver={handleDragOver} onDrop={handleDrop} className="flex flex-col h-screen overflow-hidden">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".cpp"
      />

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
              <MenubarItem onClick={() => fileInputRef.current?.click()}><Upload />Upload</MenubarItem>
              <MenubarItem onClick={() => setInputCode(`int main() {\n  return 1;\n}`)}><Eraser />Clear</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>Controls</MenubarTrigger>
            <MenubarContent>
              <MenubarItem><Hammer />Compile</MenubarItem>
              <MenubarItem><SkipForward />Step</MenubarItem>
              <MenubarItem onClick={() => step(simRef.current?.instructions.length)}><Play />Run</MenubarItem>
              <MenubarItem><RefreshCcw />Reset</MenubarItem>
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
            <MenubarTrigger>Info</MenubarTrigger>
            <MenubarContent>
              <a href="https://github.com/BartoszLiberda/LLVM-Visualiser">
                <MenubarItem><FolderGit />Project Repo</MenubarItem>
              </a>
              <a href="https://llvm.org/docs/">
                <MenubarItem><FileText />LLVM Documentation</MenubarItem>
              </a>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      </div>

      <Separator className="mt-5 shrink-0" />

      <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">

        <ResizablePanel defaultSize={30}>
          <div className="p-5 h-full">
            <h1 className="flex items-center gap-2 ml-2 mb-1"><FileCodeCorner size={16} />C++</h1>
            <Editor
              className="p-1"
              height="98%"
              theme={resolvedTheme === "light" ? "vs" : "vs-dark"}
              defaultLanguage="cpp"
              value={inputCode}
              onMount={handleSourceMount}
              onChange={(val) => setInputCode(val ?? "")}
              options={{
                scrollBeyondLastLine: false,
                minimap: { enabled: false }
              }}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={30}>
          <div className="p-5 h-full">
            <h1 className="flex items-center gap-2 ml-2 mb-1"><FileCodeCorner size={16} />LLVM</h1>
            <Editor
              className="p-1"
              height="98%"
              theme={resolvedTheme === "light" ? "vs" : "vs-dark"}
              defaultLanguage="ini"
              value={outputCode}
              onMount={handleIRMount}
              options={{
                readOnly: true,
                scrollBeyondLastLine: false,
                minimap: { enabled: false }
              }}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40}>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel defaultSize={70}>
              <div className="flex flex-row justify-between h-full p-5 pb-5">
                <div className="w-[47.5%] h-full flex flex-col overflow-hidden">
                  <h1 className="flex items-center gap-2 ml-2 mb-1 shrink-0"><Cpu size={16} />Register View</h1>
                  <div className="flex-1 min-h-0 p-2 border-1 outline-white">
                    <RegisterView registers={registers} />
                  </div>
                </div>
                <div className="w-[47.5%] h-full flex flex-col overflow-hidden">
                  <h1 className="flex items-center gap-2 ml-2 mb-1 shrink-0"><MemoryStick size={16} />Memory View</h1>
                  <div className="flex-1 min-h-0 p-2 border-1 outline-white">
                    <MemoryView memory={memory} />
                  </div>
                </div>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30}>
              <div className="flex flex-col h-full p-5 pt-5 overflow-hidden">
                <h1 className="flex items-center gap-2 ml-2 mb-1 shrink-0"><Logs size={16} />Logs</h1>
                <ScrollArea className="flex-1 min-h-0 pl-3 pt-2 border-1 outline-white">
                  {logs.map((log, index) => (
                    <div key={index} className="text-muted-foreground">
                      {log}
                    </div>
                  ))}
                  <div ref={useAutoScroll(logs.length, true)}></div>
                </ScrollArea>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>

      <Separator className="shrink-0" />

      <div className="flex flex-col xl:flex-row justify-between items-center p-6 md:p-8 shrink-0 gap-6">
        <div className="flex flex-wrap justify-center gap-3 md:gap-5 w-full xl:w-auto">
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
                  success: (data) => {
                    setOutputCode(data.result);
                    if (data.result != "// Compile to see LLVM here...") {
                      resetSimulation(data.result)
                    }
                    return "Compilation complete!";
                  },
                  error: (err) => `Error: ${err.message}`,
                }
              )
            }}
          >
            Compile
            <Hammer />
          </Button>
          <Button variant="secondary" className="cursor-pointer" onClick={() => step(simRef.current?.instructions.length)}>
            Run
            <Play />
          </Button>
          <Button variant="secondary" className="cursor-pointer" onClick={() => step()}>
            Step
            <SkipForward />
          </Button>
          <Button variant="secondary" className="cursor-pointer" onClick={() => resetSimulation()}>
            Reset
            <RefreshCcw />
          </Button>
        </div>
        <div className="flex flex-col gap-3 pb-3 w-full max-w-md xl:w-1/3">
          <h1 className="flex items-center gap-2"><GitCommitHorizontal size={16} />{`Step: ${pc}`}</h1>
          <Slider
            value={[pc]}
            onValueChange={(val) => step(val[0])}
            min={0}
            max={simRef.current?.instructions.length ?? 0}
            step={1}
            className="cursor-grab"
          />
        </div>
      </div >
    </div >
  );
}

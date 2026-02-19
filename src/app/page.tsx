"use client";

import Editor, { OnMount, Monaco } from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { useState, useRef } from "react"
import { Hammer, FileCodeCorner, Cpu, Play, SkipForward, FolderGit, RefreshCcw, MemoryStick } from "lucide-react"
import { Simulator, semantics, grammar, Instruction } from "@/lib/simulator"
import RegisterView from "@/components/registerView"
import MemoryView from "@/components/memoryView"

type MonacoEditor = Parameters<OnMount>[0];
type EditorDecorationsCollection = ReturnType<NonNullable<MonacoEditor>['createDecorationsCollection']>;

export default function Home() {
  const [inputCode, setInputCode] = useState(`int main() {\n  return 42;\n}`);
  const [outputCode, setOutputCode] = useState<string>("// Compile to see LLVM here...");

  const [registers, setRegisters] = useState<Record<string, number>>({})
  const [memory, setMemory] = useState<Record<string, number>>({})
  const [logs, setLogs] = useState<string[]>([])
  const [isFinished, setIsFinished] = useState(false)

  const irEditorRef = useRef<MonacoEditor | null>(null)
  const sourceEditorRef = useRef<MonacoEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const irDecorationRef = useRef<EditorDecorationsCollection | null>(null);
  const simRef = useRef<Simulator | null>(null)

  const resetSimulation = () => {
    const match = grammar.match(outputCode);
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
      setIsFinished(false);
      clearHighlights();

      toast.success("Simulation Reset");

    } catch (err: any) {
      console.error("Semantic Error:", err);
      toast.error(`Compiler Error: ${err.message}`);
    }
  }

  const step = () => {
    if (!simRef.current || simRef.current.isFinished) {
      resetSimulation()
      if (!simRef.current) {
        return
      }
    }
    const sim = simRef.current
    if (!sim) return

    const lineExecuted = sim.step()

    setRegisters({ ...sim.registers })
    setMemory({ ...sim.memory })
    setLogs([...sim.logs])
    setIsFinished(sim.isFinished)

    if (lineExecuted !== null) {
      highlightLine(lineExecuted)
    } else {
      clearHighlights()
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
            onMount={handleSourceMount}
            onChange={(val) => setInputCode(val ?? "")}
            options={{
              scrollBeyondLastLine: false,
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
            onMount={handleIRMount}
            options={{
              readOnly: true,
              scrollBeyondLastLine: false,
              minimap: { enabled: false }
            }}
          />
        </div>
        <div className="w-1/3">
          <div className="mb-10">
            <h1 className="flex items-center gap-2 ml-2 mb-1"><Cpu size={16} />Register View</h1>
            <div className="h-[31.20vh] p-1 border-1 outline-white">
              <RegisterView registers={registers} />
            </div>
          </div>
          <div>
            <h1 className="flex items-center gap-2 ml-2 mb-1"><MemoryStick size={16} />Memory View</h1>
            <div className="h-[31.20vh] p-1 border-1 outline-white">
              <MemoryView memory={memory} />
            </div>
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
                success: (data) => {
                  setOutputCode(data.result);
                  if (outputCode != "// Compile to see LLVM here...") {
                    resetSimulation()
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
          onClick={() => resetSimulation()}
        >
          Reset
          <RefreshCcw />
        </Button>
        <Button
          variant="secondary"
          className="cursor-pointer"
          onClick={() => step()}
        >
          Step
          <SkipForward />
        </Button>
      </div>
    </div>
  );
}

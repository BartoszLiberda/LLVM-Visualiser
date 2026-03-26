"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useSimulator } from "@/hooks/useSimulator";

import { Separator } from "@/components/ui/separator";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

import { MainHeader } from "@/components/MainHeader";
import { SourceEditor } from "@/components/SourceEditor";
import { IREditor } from "@/components/IREditor";
import { SimulatorWorkspace } from "@/components/SimulatorWorkspace";
import { SimulationControls } from "@/components/SimulationControls";

export default function Home() {
  const { resolvedTheme } = useTheme();

  const [inputCode, setInputCode] = useState(`int main() {\n  return 1;\n}`);
  const [outputCode, setOutputCode] = useState<string>("; Compile to see LLVM here...");
  const [language, setLanguage] = useState<"c" | "cpp">("cpp");
  const sourceEditorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    registers,
    memory,
    logs,
    stepCount,
    maxSteps,
    isRunning,
    runSpeed,
    setRunSpeed,
    resetSimulation,
    runSimulation,
    stopSimulation,
    step,
    handleIRMount,
    simReady,
  } = useSimulator();

  const handleSourceMount: OnMount = (editor) => {
    sourceEditorRef.current = editor;
  };

  const handleCompile = async () => {
    toast.promise(
      async () => {
        const response = await fetch("/api/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: inputCode, language }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Server Error");
        }
        return data;
      },
      {
        loading: "Compiling C++ code...",
        success: (data) => {
          setOutputCode(data.result);
          if (data.result !== "; Compile to see LLVM here...") {
            resetSimulation(data.result);
          }
          return "Compilation complete!";
        },
        error: (err) => `Error: ${err.message}`,
      }
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.c')) {
        setLanguage('c');
      } else if (fileName.endsWith('.cpp') || fileName.endsWith('.cc') || fileName.endsWith('.cxx')) {
        setLanguage('cpp');
      }
      
      try {
        const text = await file.text();
        setInputCode(text);
      } catch (err) {
        console.error("Error reading file:", err);
        toast.error("Error reading file");
      }
    }
    if (e.target) e.target.value = "";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.c')) {
        setLanguage('c');
      } else if (fileName.endsWith('.cpp') || fileName.endsWith('.cc') || fileName.endsWith('.cxx')) {
        setLanguage('cpp');
      }

      try {
        const text = await file.text();
        setInputCode(text);
      } catch (err) {
        console.error("Error reading file:", err);
        toast.error("Error reading file");
      }
    }
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      className="flex flex-col h-screen overflow-hidden"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".cpp, .c"
      />

      <MainHeader
        onUpload={() => fileInputRef.current?.click()}
        onClear={() => setInputCode(language === "c" ? `int main() {\n  return 1;\n}` : `int main() {\n  return 1;\n}`)}
        runSpeed={runSpeed}
        onSpeedChange={setRunSpeed}
        language={language}
        onLanguageChange={setLanguage}
      />

      <Separator className="mt-5 shrink-0" />

      <ResizablePanelGroup orientation="horizontal" className="flex-1 min-h-0">
        <ResizablePanel defaultSize={30}>
          <SourceEditor
            inputCode={inputCode}
            onInputChange={setInputCode}
            onMount={handleSourceMount}
            resolvedTheme={resolvedTheme}
            language={language}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={30}>
          <IREditor
            outputCode={outputCode}
            onMount={handleIRMount}
            resolvedTheme={resolvedTheme}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={40}>
          <SimulatorWorkspace
            registers={registers}
            memory={memory}
            logs={logs}
          />
        </ResizablePanel>
      </ResizablePanelGroup>

      <Separator className="shrink-0" />

      <SimulationControls
        onCompile={handleCompile}
        onRun={isRunning ? stopSimulation : runSimulation}
        onStep={(val) => step(val, outputCode)}
        onReset={() => resetSimulation(outputCode)}
        isRunning={isRunning}
        stepCount={stepCount}
        maxSteps={maxSteps}
        simReady={simReady}
      />
    </div>
  );
}

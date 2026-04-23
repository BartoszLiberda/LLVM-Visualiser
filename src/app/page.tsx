"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useSimulator } from "@/hooks/useSimulator";
import { useMediaQuery } from "@/hooks/useMediaQuery";

import { Separator } from "@/components/ui/separator";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

import { MainHeader } from "@/components/MainHeader";
import { SourceEditor } from "@/components/SourceEditor";
import { IREditor } from "@/components/IREditor";
import { SimulatorWorkspace } from "@/components/SimulatorWorkspace";
import { SimulationControls } from "@/components/SimulationControls";
import { WelcomeGuide } from "@/components/WelcomeGuide";
import { useEffect } from "react";

export default function Home() {
  const { resolvedTheme } = useTheme();

  const [inputCode, setInputCode] = useState(`int main() {\n  return 1;\n}`);
  const [outputCode, setOutputCode] = useState<string>("; Compile to see LLVM here...");
  const [language, setLanguage] = useState<"c" | "cpp">("cpp");
  const [showSource, setShowSource] = useState(true);
  const [showIR, setShowIR] = useState(true);
  const [runTour, setRunTour] = useState(false);
  const [tourKey, setTourKey] = useState(0);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const sourceEditorRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    registers,
    memory,
    callStack,
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

  const startTour = () => {
    setTourKey((k) => k + 1); // force Joyride remount → step index resets to 0
    setRunTour(true);
  };

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("hasSeenTutorial");
    if (!hasSeenTour) {
      localStorage.setItem("hasSeenTutorial", "true");
      startTour();
    }
  }, []);

  const handleTourFinish = () => {
    localStorage.setItem("hasSeenTutorial", "true");
    setRunTour(false);
  };


  const handleCompile = async () => {
    const langLabel = language === "c" ? "C" : "C++";
    toast.promise(
      async () => {
        const response = await fetch("/api/compile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: inputCode, language }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Compilation failed. Check your code for syntax errors.");
        }
        return data;
      },
      {
        loading: `Compiling ${langLabel} code\u2026`,
        success: (data: { result: string }) => {
          setOutputCode(data.result);
          if (data.result !== "; Compile to see LLVM here...") {
            resetSimulation(data.result);
          }
          return "Compilation successful \u2014 LLVM IR is ready.";
        },
        error: (err: Error) => err.message,
        duration: 7000,
      } as Parameters<typeof toast.promise>[1]
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
      className="flex flex-col overflow-hidden"
      style={{ height: '100dvh' }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".cpp, .c"
      />

      <WelcomeGuide key={tourKey} run={runTour} onFinish={handleTourFinish} />

      <MainHeader
        onUpload={() => fileInputRef.current?.click()}
        onClear={() => setInputCode(language === "c" ? `int main() {\n  return 1;\n}` : `int main() {\n  return 1;\n}`)}
        language={language}
        onLanguageChange={setLanguage}
        showSource={showSource}
        setShowSource={setShowSource}
        showIR={showIR}
        setShowIR={setShowIR}
        onExampleSelect={(code) => setInputCode(code)}
        onStartTutorial={startTour}
      />

      <Separator className="mt-3 md:mt-4 shrink-0" />

      <ResizablePanelGroup orientation={isDesktop ? "horizontal" : "vertical"} className="flex-1 min-h-0">
        {showSource && (
          <>
            <ResizablePanel defaultSize={30} id="tour-source-editor">
              <SourceEditor
                inputCode={inputCode}
                onInputChange={setInputCode}
                onMount={handleSourceMount}
                resolvedTheme={resolvedTheme}
                language={language}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        {showIR && (
          <>
            <ResizablePanel defaultSize={30} id="tour-ir-editor">
              <IREditor
                outputCode={outputCode}
                onMount={handleIRMount}
                resolvedTheme={resolvedTheme}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}

        <ResizablePanel defaultSize={40} id="tour-workspace">
          <SimulatorWorkspace
            registers={registers}
            memory={memory}
            callStack={callStack}
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
        runSpeed={runSpeed}
        onSpeedChange={setRunSpeed}
      />
    </div>
  );
}

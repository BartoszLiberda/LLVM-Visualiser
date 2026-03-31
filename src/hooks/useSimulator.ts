"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { OnMount } from "@monaco-editor/react";
import { Simulator, semantics, grammar, FunctionDef } from "@/lib/simulator";

type MonacoEditor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];
type EditorDecorationsCollection = ReturnType<NonNullable<MonacoEditor>['createDecorationsCollection']>;

export function useSimulator() {
  const [registers, setRegisters] = useState<Record<string, number>>({});
  const [memory, setMemory] = useState<Record<string, number>>({});
  const [logs, setLogs] = useState<string[]>([]);
  const [pc, setPc] = useState(0);
  const [stepCount, setStepCount] = useState(0);
  const stepCountRef = useRef(0);
  const [maxSteps, setMaxSteps] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [runSpeed, setRunSpeedState] = useState(200);
  const runSpeedRef = useRef(200);

  const setRunSpeed = useCallback((speed: number) => {
    setRunSpeedState(speed);
    runSpeedRef.current = speed;
  }, []);
  const isRunningRef = useRef(false);
  const [isRunning, setIsRunning] = useState(false);

  const irEditorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const irDecorationRef = useRef<EditorDecorationsCollection | null>(null);
  const simRef = useRef<Simulator | null>(null);
  const bpRef = useRef<Set<number>>(new Set());
  const bpDecorationRef = useRef<EditorDecorationsCollection | null>(null);

  const clearHighlights = useCallback(() => {
    irDecorationRef.current?.clear();
  }, []);

  const highlightLine = useCallback((lineNo: number) => {
    if (!irEditorRef.current || !monacoRef.current) return;

    if (!irDecorationRef.current) {
      irDecorationRef.current = irEditorRef.current.createDecorationsCollection();
    }

    irDecorationRef.current.set([
      {
        range: new monacoRef.current.Range(lineNo, 1, lineNo, 1),
        options: {
          isWholeLine: true,
          className: "current-line-highlight",
        },
      },
    ]);
    irEditorRef.current.revealLineInCenter(lineNo);
  }, []);

  const stopSimulation = useCallback(() => {
    isRunningRef.current = false;
    setIsRunning(false);
  }, []);

  const resetSimulation = useCallback((code: string) => {
    const match = grammar.match(code);
    if (match.failed()) {
      console.error("Parser Error:\n" + match.message);
      toast.error(`Parser Error: ${match.shortMessage}`);
      return;
    }

    try {
      const functionMap: Record<string, FunctionDef> = semantics(match).parse();

      if (Object.keys(functionMap).length === 0) {
        toast.warning("No functions found");
        return;
      }

      simRef.current = new Simulator(functionMap);

      const drySim = new Simulator(functionMap);
      let localMaxSteps = 0;
      while (!drySim.isFinished && drySim.step() !== null) {
        localMaxSteps++;
        if (localMaxSteps >= 2000) break;
      }
      setMaxSteps(localMaxSteps);

      setRegisters(simRef.current.currentFrame.registers);
      setMemory({});
      setLogs([]);
      setPc(0);
      setStepCount(0);
      stepCountRef.current = 0;
      setIsFinished(false);
      stopSimulation();

      const firstFunc = simRef.current.functions[simRef.current.currentFrame.funcName];
      if (firstFunc && firstFunc.instructions.length > 0) {
        highlightLine(firstFunc.instructions[0].line);
      } else {
        clearHighlights();
      }

      toast.success("Simulation Reset");
    } catch (err: any) {
      console.error("Semantic Error:", err);
      toast.error(`Compiler Error: ${err.message}`);
    }
  }, [clearHighlights, stopSimulation]);

  const step = useCallback((targetSteps?: number, currentCode?: string) => {
    let sim = simRef.current;
    if (!sim) {
      if (currentCode) resetSimulation(currentCode);
      return;
    }

    let target = targetSteps !== undefined ? targetSteps : stepCountRef.current + 1;

    let shouldResetLogs = false;
    if (target < stepCountRef.current) {
      const match = grammar.match(currentCode ?? "");
      if (match.failed()) return;
      try {
        const functionMap = semantics(match).parse();
        sim = new Simulator(functionMap);
        simRef.current = sim;
        shouldResetLogs = true;
      } catch (err) {
        return;
      }
    }

    const logsToAdd: string[] = [];
    let currentSimSteps = shouldResetLogs ? 0 : stepCountRef.current;
    const initialSimSteps = currentSimSteps;

    while (currentSimSteps < target && !sim.isFinished) {

      let currentLine = -1;
      const currentFunc = sim.functions[sim.currentFrame.funcName];
      if (currentFunc && sim.pc < currentFunc.instructions.length) {
        currentLine = currentFunc.instructions[sim.pc].line;
      }

      if (currentSimSteps > initialSimSteps && bpRef.current.has(currentLine)) {
        break;
      }

      const prevLogsLength = sim.logs.length;
      sim.step();

      const newLogs = sim.logs.slice(prevLogsLength).map((log) => log);
      logsToAdd.push(...newLogs);
      currentSimSteps++;
    }

    setRegisters({ ...sim.currentFrame.registers });
    setMemory({ ...sim.memory });

    if (shouldResetLogs) {
      setLogs(logsToAdd);
    } else {
      setLogs((prev) => [...prev, ...logsToAdd]);
    }

    setPc(sim.pc);
    setStepCount(currentSimSteps);
    stepCountRef.current = currentSimSteps;
    setIsFinished(sim.isFinished);

    if (sim.isFinished) {
      clearHighlights();
    } else {
      const currentFunc = sim.functions[sim.currentFrame.funcName];
      if (currentFunc && sim.pc < currentFunc.instructions.length) {
        highlightLine(currentFunc.instructions[sim.pc].line);
      } else {
        clearHighlights();
      }
    }
  }, [clearHighlights, highlightLine, resetSimulation]);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runSimulation = useCallback(async () => {
    if (!simRef.current || isRunningRef.current) return;

    isRunningRef.current = true;
    setIsRunning(true);

    while (isRunningRef.current && !simRef.current.isFinished) {
      step();

      let currentLine = -1;
      const currentFunc = simRef.current.functions[simRef.current.currentFrame.funcName];
      if (currentFunc && simRef.current.pc < currentFunc.instructions.length) {
        currentLine = currentFunc.instructions[simRef.current.pc].line;
      }

      if (bpRef.current.has(currentLine)) {
        break;
      }

      await delay(runSpeedRef.current);
    }

    isRunningRef.current = false;
    setIsRunning(false);
  }, [step]);

  const handleIRMount: OnMount = useCallback((editor, monaco) => {
    irEditorRef.current = editor;
    monacoRef.current = monaco;

    bpDecorationRef.current = editor.createDecorationsCollection();
    editor.onMouseDown((e) => {
      const isGutterClick =
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_DECORATIONS;

      if (isGutterClick && e.target.position) {
        const line = e.target.position.lineNumber;
        const bps = new Set(bpRef.current);
        if (bps.has(line)) {
          bps.delete(line)
        } else {
          bps.add(line);
        }
        bpRef.current = bps;
        const newDecorations = Array.from(bps).map((bpLine) => ({
          range: new monaco.Range(bpLine, 1, bpLine, 1),
          options: {
            isWholeLine: false,
            glyphMarginClassName: "breakpoint-glyph",
          },
        }));
        bpDecorationRef.current?.set(newDecorations);
      }
    });
  }, []);

  return {
    registers,
    memory,
    logs,
    pc,
    stepCount,
    maxSteps,
    isFinished,
    isRunning,
    runSpeed,
    setRunSpeed,
    resetSimulation,
    runSimulation,
    stopSimulation,
    step,
    handleIRMount,
    simReady: !!simRef.current,
  };
}

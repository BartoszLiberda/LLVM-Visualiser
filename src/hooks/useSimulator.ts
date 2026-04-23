"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { OnMount } from "@monaco-editor/react";
import { Simulator, semantics, grammar, FunctionDef, UnsupportedInstructionError } from "@/lib/simulator";
import { StackFrameUI } from "@/components/SimulatorWorkspace";

type MonacoEditor = Parameters<OnMount>[0];
type Monaco = Parameters<OnMount>[1];
type EditorDecorationsCollection = ReturnType<NonNullable<MonacoEditor>['createDecorationsCollection']>;

export function useSimulator() {
  const [registers, setRegisters] = useState<Record<string, number>>({});
  const [memory, setMemory] = useState<Record<string, number>>({});
  const [callStack, setCallStack] = useState<StackFrameUI[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [pc, setPc] = useState(0);
  const highlightedLineRef = useRef<number | null>(null);
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
      // Ohm messages are verbose — extract the short form for the toast
      const shortMsg = match.shortMessage ?? (match.message ?? 'Unknown parse error').split('\n')[0];
      console.error("Parser Error:\n" + match.message);
      toast.error(`Parse Error: ${shortMsg}`, {
        description: 'The LLVM IR could not be parsed. This may be caused by an unsupported construct or malformed compiler output.',
        duration: 6000,
      });
      return;
    }

    try {
      const programAst = semantics(match).parse();
      const functionMap: Record<string, FunctionDef> = programAst.functions;
      const globalVars = programAst.globalVars;

      if (Object.keys(functionMap).length === 0) {
        toast.warning('No executable functions found', {
          description:
            'The IR contains only declarations (declare) but no defined function bodies. Make sure your source code defines at least one function.',
          duration: 5000,
        });
        return;
      }

      simRef.current = new Simulator(functionMap, globalVars);

      const drySim = new Simulator(functionMap, globalVars);
      let localMaxSteps = 0;
      while (!drySim.isFinished && drySim.step() !== null) {
        localMaxSteps++;
        if (localMaxSteps >= 2000) break;
      }
      setMaxSteps(localMaxSteps);

      setRegisters(simRef.current.currentFrame.registers);
      setMemory({});
      const firstFuncName = simRef.current.currentFrame.funcName;
      const firstFuncDef = simRef.current.functions[firstFuncName];
      const args: Record<string, number> = {};
      if (firstFuncDef) {
        firstFuncDef.params.forEach(p => {
            args[p] = simRef.current!.currentFrame.registers[p] ?? 0;
        });
      }
      setCallStack([{ funcName: firstFuncName, args, isActive: true }]);
      setLogs([]);
      setPc(0);
      setStepCount(0);
      stepCountRef.current = 0;
      setIsFinished(false);
      stopSimulation();

      const firstFunc = simRef.current.functions[simRef.current.currentFrame.funcName];
      if (firstFunc && firstFunc.instructions.length > 0) {
        const firstLine = firstFunc.instructions[0].line;
        highlightLine(firstLine);
        highlightedLineRef.current = firstLine;
      } else {
        clearHighlights();
        highlightedLineRef.current = null;
      }

      toast.success("Simulation Reset");
    } catch (err: any) {
      console.error("Simulator init error:", err);
      if (err instanceof UnsupportedInstructionError) {
        toast.error(`Unsupported instruction: ${err.instrType}`, {
          description: err.message,
          duration: 7000,
        });
      } else {
        toast.error(`Initialisation Error: ${err.message}`, {
          description: 'Could not initialise the simulation. The IR may reference unsupported features.',
          duration: 6000,
        });
      }
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
        const programAst = semantics(match).parse();
        sim = new Simulator(programAst.functions, programAst.globalVars);
        simRef.current = sim;
        shouldResetLogs = true;
      } catch (err) {
        return;
      }
    }

    const logsToAdd: string[] = [];
    let currentSimSteps = shouldResetLogs ? 0 : stepCountRef.current;
    const initialSimSteps = currentSimSteps;

    let lastExecutedLine: number | null = null;
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
      lastExecutedLine = sim.step();

      const newLogs = sim.logs.slice(prevLogsLength).map((log) => log);
      logsToAdd.push(...newLogs);
      currentSimSteps++;
    }

    if (lastExecutedLine !== null) {
      highlightedLineRef.current = lastExecutedLine;
    }

    setRegisters({ ...sim.currentFrame.registers });
    setMemory({ ...sim.memory });
    const fullStack = [...sim.callStack, sim.currentFrame].map((f, i, arr) => {
      const func = sim!.functions[f.funcName];
      const args: Record<string, number> = {};
      if (func) {
        func.params.forEach(p => {
            args[p] = f.registers[p] ?? 0;
        });
      }
      return {
          funcName: f.funcName,
          args,
          isActive: i === arr.length - 1
      };
    });
    setCallStack(fullStack);

    if (shouldResetLogs) {
      setLogs(logsToAdd);
    } else {
      setLogs((prev) => [...prev, ...logsToAdd]);
    }

    setPc(sim.pc);
    setStepCount(currentSimSteps);
    stepCountRef.current = currentSimSteps;
    setIsFinished(sim.isFinished);

    if (sim.isFinished && !isRunningRef.current) {
      toast.success("Execution Finished", {
        description: "The program has reached a return or final instruction.",
      });
    } 
    
    if (highlightedLineRef.current !== null) {
      highlightLine(highlightedLineRef.current);
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
    callStack,
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

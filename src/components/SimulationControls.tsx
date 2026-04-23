"use client";

import { Hammer, Play, SkipForward, SkipBack, RefreshCcw, Pause, GitCommitHorizontal, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";

interface SimulationControlsProps {
  onCompile: () => void;
  onRun: () => void;
  onStep: (target?: number) => void;
  onReset: () => void;
  isRunning: boolean;
  stepCount: number;
  maxSteps: number;
  simReady: boolean;
  runSpeed: number;
  onSpeedChange: (speed: number) => void;
}

export function SimulationControls({
  onCompile,
  onRun,
  onStep,
  onReset,
  isRunning,
  stepCount,
  maxSteps,
  simReady,
  runSpeed,
  onSpeedChange,
}: SimulationControlsProps) {

  return (
    <div id="tour-controls" className="flex flex-col lg:flex-row justify-between items-center px-4 md:px-6 py-3 md:py-4 shrink-0 gap-3 md:gap-4">
      <div className="flex flex-wrap justify-center gap-2 md:gap-3 w-full lg:w-auto">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              className="cursor-pointer"
              onClick={onCompile}
            >
              Compile
              <Hammer />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Compile C++ To LLVM
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              className="cursor-pointer"
              disabled={!simReady || (stepCount === maxSteps && maxSteps > 0)}
              onClick={onRun}
            >
              {isRunning ? "Pause" : "Run"}
              {isRunning ? <Pause /> : <Play />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isRunning ? "Pause LLVM" : "Run LLVM"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" className="cursor-pointer" disabled={!simReady || stepCount === 0 || isRunning} onClick={() => onStep(stepCount - 1)}>
              <SkipBack />
              Back
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Step Back LLVM
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" className="cursor-pointer" disabled={!simReady || (stepCount === maxSteps && maxSteps > 0) || isRunning} onClick={() => onStep()}>
              Step
              <SkipForward />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Step LLVM
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" className="cursor-pointer" disabled={!simReady} onClick={onReset}>
              Reset
              <RefreshCcw />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Reset Simulation State
          </TooltipContent>
        </Tooltip>

      </div>

      <div className="flex flex-col lg:flex-row justify-center items-center gap-3 w-full flex-1 lg:justify-end">
        <div className="flex h-9 items-center justify-between gap-2 rounded-md border bg-background px-3 shadow-xs w-full lg:w-auto shrink-0">
          <span className="text-sm font-medium flex items-center gap-1.5 whitespace-nowrap text-foreground select-none"><Zap size={14} className="text-muted-foreground" />Speed</span>
          <div className="w-20 flex items-center">
              <Slider
                  value={[1000 - runSpeed]}
                  min={0}
                  max={1000}
                  step={10}
                  onValueChange={(val) => onSpeedChange(1000 - val[0])}
                  className="cursor-grab"
              />
          </div>
          <span className="text-xs font-medium w-[42px] text-right text-muted-foreground select-none">{runSpeed}ms</span>
        </div>

        <div className="flex h-9 items-center justify-between gap-2 rounded-md border bg-background px-3 shadow-xs w-full flex-1">
          <span className="text-sm font-medium flex items-center gap-1.5 whitespace-nowrap text-foreground select-none">
            <GitCommitHorizontal size={14} className="text-muted-foreground" />Step
          </span>
          <div className="flex-1 flex items-center min-w-0 mx-2">
              <Slider
                  value={[stepCount]}
                  min={0}
                  max={maxSteps}
                  step={1}
                  onValueChange={(val) => onStep(val[0])}
                  className="cursor-grab"
              />
          </div>
          <span className="text-xs font-medium w-[56px] whitespace-nowrap text-right text-muted-foreground select-none">{stepCount} / {maxSteps}</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Hammer, Play, SkipForward, RefreshCcw, Pause, GitCommitHorizontal } from "lucide-react";
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
}: SimulationControlsProps) {

  return (
    <div className="flex flex-col xl:flex-row justify-between items-center p-6 md:p-8 shrink-0 gap-6">
      <div className="flex flex-wrap justify-center gap-3 md:gap-5 w-full xl:w-auto">
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
      <div className="flex flex-col gap-3 pb-3 w-full max-w-md xl:w-1/3">
        <h1 className="flex items-center gap-2">
          <GitCommitHorizontal size={16} />
          {`Step: ${stepCount} / ${maxSteps}`}
        </h1>
        <Slider
          value={[stepCount]}
          onValueChange={(val) => onStep(val[0])}
          min={0}
          max={maxSteps}
          step={1}
          className="cursor-grab"
        />
      </div>
    </div>
  );
}

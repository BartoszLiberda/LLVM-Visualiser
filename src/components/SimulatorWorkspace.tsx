"use client";

import { useMemo } from "react";

import { Cpu, MemoryStick, Logs, Info, Layers } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import RegisterView from "./registerView";
import MemoryView from "./memoryView";
import { useAutoScroll, getBadgeColorFromHash } from "@/lib/utils";

export interface StackFrameUI {
  funcName: string;
  args: Record<string, number>;
  isActive: boolean;
}

interface SimulatorWorkspaceProps {
  registers: Record<string, number>;
  memory: Record<string, number>;
  callStack: StackFrameUI[];
  logs: string[];
}

export function SimulatorWorkspace({ registers, memory, callStack, logs }: SimulatorWorkspaceProps) {
  const logScrollRef = useAutoScroll(logs.length, true);
  const stackOptions = useMemo<ScrollIntoViewOptions>(() => ({ behavior: "smooth", inline: "end", block: "nearest" }), []);
  const stackScrollRef = useAutoScroll(callStack.length, true, stackOptions);

  return (
    <ResizablePanelGroup orientation="vertical" className="h-full">
      <ResizablePanel defaultSize={65} minSize={40}>
        <div className="flex flex-col h-full p-2 md:p-3 overflow-hidden gap-3">
          {/* Call Stack */}
          <div className="flex items-center gap-3 overflow-x-auto whitespace-nowrap bg-muted/20 border rounded-lg p-2 px-3 shrink-0 no-scrollbar shadow-sm min-h-[46px]">
            <span className="font-bold text-muted-foreground uppercase text-[10px] tracking-widest flex items-center gap-2 shrink-0">
              <Layers size={12} className="text-primary" />
              Stack
            </span>
            <div className="flex items-center gap-2 flex-1">
              {callStack.length === 0 ? (
                <span className="text-[11px] text-muted-foreground/60 italic font-mono ml-2">
                  Not running - Compile and step to see the call stack
                </span>
              ) : (
                callStack.map((frame, i) => (
                  <div key={i} className="flex items-center gap-2" ref={i === callStack.length - 1 ? stackScrollRef : null}>
                    <div className={`flex items-center rounded-md border overflow-hidden text-[11px] font-mono shadow-sm transition-all ${frame.isActive ? 'ring-1 ring-primary ring-offset-1 ring-offset-background scale-[1.02]' : 'opacity-80 hover:opacity-100'}`}>
                      <div className={`px-2 py-0.5 font-bold ${frame.isActive ? 'bg-primary text-primary-foreground' : `${getBadgeColorFromHash(frame.funcName + i)} border-r`}`}>
                        {frame.funcName}
                      </div>
                      <div className={`px-2 py-0.5 ${frame.isActive ? 'bg-primary/10 text-primary font-medium' : 'bg-background text-muted-foreground'}`}>
                        ({Object.entries(frame.args).length > 0
                          ? Object.entries(frame.args).map(([k, v]) => `${k}=${v >= 0x7000 ? '0x' + v.toString(16) : v}`).join(", ")
                          : "void"})
                      </div>
                    </div>
                    {i < callStack.length - 1 && (
                      <span className="text-muted-foreground/40 font-mono">→</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0 overflow-hidden">
            {/* Registers */}
            <div className="flex-1 flex flex-col min-h-[150px] lg:min-h-0 overflow-hidden rounded-lg border bg-card/50 shadow-sm">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                  <Cpu size={14} className="text-primary shrink-0" />
                  Registers
                  {callStack.length > 0 && (
                    <Badge variant="outline" className={`font-mono text-[10px] ml-1 px-1.5 py-0 h-4 border-transparent bg-muted/50 shadow-none truncate max-w-[120px] ${getBadgeColorFromHash(callStack[callStack.length - 1].funcName + (callStack.length - 1))}`}>
                      {callStack[callStack.length - 1].funcName}
                    </Badge>
                  )}
                </h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={14} className="text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Shows what is stored in registers for the current frame.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex-1 min-h-0">
                <RegisterView registers={registers} />
              </div>
            </div>

            {/* Memory View */}
            <div className="flex-1 flex flex-col min-h-[150px] lg:min-h-0 overflow-hidden rounded-lg border bg-card/50 shadow-sm">
              <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <MemoryStick size={14} className="text-primary" />
                  Memory View
                </h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={14} className="text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Shows what is stored in the global memory space.
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex-1 min-h-0">
                <MemoryView memory={memory} registers={registers} />
              </div>
            </div>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle className="bg-border/50" />

      <ResizablePanel defaultSize={35} minSize={20}>
        <div className="flex flex-col h-full p-2 md:p-3 overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden rounded-lg border bg-card/50 shadow-sm">
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Logs size={14} className="text-primary" />
                Execution Logs
              </h2>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={14} className="text-muted-foreground cursor-help hover:text-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent>
                  Real-time logs showing the step-by-step execution logic.
                </TooltipContent>
              </Tooltip>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-3">
                {logs.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic text-center py-8">
                    No logs yet. Compile and step through the code to see output.
                  </div>
                ) : (
                  logs.map((log, index) => {
                    const match = log.match(/^\[(@[\w.\-]+)(?:#(\d+))?\]\s*(.*)$/);
                    return (
                      <div key={index} className="text-muted-foreground mb-1.5 flex items-start gap-2 text-[13px] leading-snug font-mono">
                        {match ? (
                          <>
                            <Badge variant="outline" className={`font-mono mt-0.5 whitespace-nowrap px-1 py-0 h-auto text-[10px] border-transparent ${getBadgeColorFromHash(match[1] + (match[2] ?? ""))}`}>
                              {match[1]}
                            </Badge>
                            <span className="leading-relaxed whitespace-pre-wrap">{match[3]}</span>
                          </>
                        ) : (
                          <span className="leading-relaxed whitespace-pre-wrap">{log}</span>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={logScrollRef}></div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}



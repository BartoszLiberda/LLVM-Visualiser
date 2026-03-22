"use client";

import { Cpu, MemoryStick, Logs, Info } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import RegisterView from "./registerView";
import MemoryView from "./memoryView";
import { useAutoScroll } from "@/lib/utils";

interface SimulatorWorkspaceProps {
  registers: Record<string, number>;
  memory: Record<string, number>;
  logs: string[];
}

export function SimulatorWorkspace({ registers, memory, logs }: SimulatorWorkspaceProps) {
  const scrollRef = useAutoScroll(logs.length, true);

  return (
    <ResizablePanelGroup orientation="vertical">
      <ResizablePanel defaultSize={70}>
        <div className="flex flex-row justify-between h-full p-5 pb-5">
          <div className="w-[47.5%] h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between ml-2 mb-1">
              <h1 className="flex items-center gap-2 shrink-0"><Cpu size={16} />Register View</h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={16} className="text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  Shows what is stored in registers.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-1 min-h-0 p-2 border-1 outline-white">
              <RegisterView registers={registers} />
            </div>
          </div>
          <div className="w-[47.5%] h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-1 ml-2">
              <h1 className="flex items-center gap-2 shrink-0"><MemoryStick size={16} />Memory View</h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={16} className="text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  Shows what is stored in memory.
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex-1 min-h-0 p-2 border-1 outline-white">
              <MemoryView memory={memory} />
            </div>
          </div>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={30}>
        <div className="flex flex-col h-full p-5 pt-5 overflow-hidden">
          <div className="flex items-center justify-between mb-1 ml-2">
            <h1 className="flex items-center gap-2 shrink-0"><Logs size={16} />Logs</h1>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info size={16} className="text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                Brief description of what is happening during the execution line by line.
              </TooltipContent>
            </Tooltip>
          </div>
          <ScrollArea className="flex-1 min-h-0 pl-3 pt-2 border-1 outline-white">
            {logs.map((log, index) => (
              <div key={index} className="text-muted-foreground">
                {log}
              </div>
            ))}
            <div ref={scrollRef}></div>
          </ScrollArea>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

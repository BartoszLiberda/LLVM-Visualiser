"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { FileCodeCorner, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface IREditorProps {
  outputCode: string;
  onMount: OnMount;
  resolvedTheme: string | undefined;
}

export function IREditor({
  outputCode,
  onMount,
  resolvedTheme,
}: IREditorProps) {
  const theme = resolvedTheme === "light" ? "vs" : "vs-dark";

  return (
    <div className="p-5 h-full">
      <div className="flex items-center justify-between ml-2 mb-1">
        <h1 className="flex items-center gap-2"><FileCodeCorner size={16} />LLVM</h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info size={16} className="text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent>
            Shows the LLVM code, this window is read-only but breakpoints can be set.
          </TooltipContent>
        </Tooltip>
      </div>
      <Editor
        className="p-1"
        height="98%"
        theme={theme}
        defaultLanguage="ini"
        value={outputCode}
        onMount={onMount}
        options={{
          readOnly: true,
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
          glyphMargin: true,
        }}
      />
    </div>
  );
}

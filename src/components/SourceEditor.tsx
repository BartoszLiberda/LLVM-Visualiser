"use client";

import Editor, { OnMount } from "@monaco-editor/react";
import { FileCodeCorner, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SourceEditorProps {
  inputCode: string;
  onInputChange: (val: string) => void;
  onMount: OnMount;
  resolvedTheme: string | undefined;
  language: "c" | "cpp";
}

export function SourceEditor({
  inputCode,
  onInputChange,
  onMount,
  resolvedTheme,
  language
}: SourceEditorProps) {
  const theme = resolvedTheme === "light" ? "vs" : "vs-dark";

  return (
    <div className="flex flex-col p-3 md:p-4 h-full min-h-0">
      <div id="tour-source-header" className="flex items-center justify-between ml-2 mb-1">
        <h1 className="flex items-center gap-2"><FileCodeCorner size={16} />{language === "c" ? "C" : "C++"}</h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info size={16} className="text-muted-foreground cursor-help hover:text-foreground transition-colors" />
          </TooltipTrigger>
          <TooltipContent>
            Input C++ or C code here manually or by dragging and dropping a file, then press compile to see the LLVM.
          </TooltipContent>
        </Tooltip>
      </div>
      <Editor
        className="p-1"
        height="100%"
        theme={theme}
        language={language}
        value={inputCode}
        onMount={onMount}
        onChange={(val) => onInputChange(val ?? "")}
        options={{
          scrollBeyondLastLine: false,
          minimap: { enabled: false }
        }}
      />
    </div>
  );
}

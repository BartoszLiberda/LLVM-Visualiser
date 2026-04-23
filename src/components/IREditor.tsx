"use client";

import Editor, { OnMount, BeforeMount } from "@monaco-editor/react";
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

  const handleBeforeMount: BeforeMount = (monaco) => {

    if (monaco.languages.getLanguages().some((lang: { id: string }) => lang.id === "llvm")) {
      return;
    }

    monaco.languages.register({ id: "llvm" });
    monaco.languages.setMonarchTokensProvider("llvm", {
      defaultToken: "",
      tokenPostfix: ".llvm",

      keywords: [
        "define", "declare", "global", "constant", "private", "internal",
        "available_externally", "linkonce", "weak", "common", "appending",
        "extern_weak", "linkonce_odr", "weak_odr", "external", "thread_local",
        "zeroinitializer", "undef", "null", "to", "tail", "target", "datalayout",
        "volatile", "nuw", "nsw", "exact", "inbounds", "align", "addrspace",
        "section", "alias", "module", "asm", "sideeffect", "gc", "personality",
        "prologue", "ret", "br", "switch", "indirectbr", "invoke", "resume",
        "catchswitch", "catchret", "cleanupret", "unreachable", "add", "fadd",
        "sub", "fsub", "mul", "fmul", "udiv", "sdiv", "fdiv", "urem", "srem",
        "frem", "shl", "lshr", "ashr", "and", "or", "xor", "extractelement",
        "insertelement", "shufflevector", "extractvalue", "insertvalue", "alloca",
        "load", "store", "fence", "cmpxchg", "atomicrmw", "getelementptr",
        "trunc", "zext", "sext", "fptrunc", "fpext", "fptoui", "fptosi", "uitofp",
        "sitofp", "ptrtoint", "inttoptr", "bitcast", "addrspacecast", "icmp",
        "fcmp", "phi", "select", "call", "va_arg", "landingpad", "catchpad",
        "cleanuppad", "eq", "ne", "sge", "sgt", "sle", "slt", "uge", "ugt", "ule", "ult",
        "oeq", "ogt", "oge", "olt", "ole", "one", "ord", "uno", "ueq", "une",
        "true", "false"
      ],

      types: [
        "void", "i1", "i8", "i16", "i32", "i64", "i128", "half", "float", "double",
        "fp128", "x86_fp80", "ppc_fp128", "x86_mmx", "ptr", "label", "metadata"
      ],

      tokenizer: {
        root: [
          // Comments
          [/;.*$/, "comment"],

          // Labels
          [/^[a-zA-Z_$.\-0-9]+:/, "type.identifier"],

          // Globals and Registers
          [/[@%][a-zA-Z_$.\-0-9]+/, "variable.name"],

          // Types (explicit mapping since 'type' class colors nicely in Monaco)
          [/\b(?:i\d+|void|float|double|ptr|label|metadata)\b/, "type"],

          // Keywords & Modifiers
          [/[a-zA-Z_][a-zA-Z_0-9]*/, {
            cases: {
              "@keywords": "keyword",
              "@types": "type",
              "@default": "identifier"
            }
          }],

          // Numbers
          [/\b\d+\.\d+(?:e[+\-]?\d+)?\b/, "number.float"],
          [/\b0x[a-fA-F0-9]+\b/, "number.hex"],
          [/\b-?\d+\b/, "number"],

          // Strings
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/"/, { token: "string.quote", bracket: "@open", next: "@string" }],

          // Metadata
          [/![a-zA-Z_$.\-0-9]+/, "meta"],
        ],

        string: [
          [/[^\\"]+/, "string"],
          [/\\./, "string.escape.invalid"],
          [/"/, { token: "string.quote", bracket: "@close", next: "@pop" }]
        ],
      }
    });
  };

  return (
    <div className="flex flex-col p-3 md:p-4 h-full min-h-0">
      <div id="tour-ir-header" className="flex items-center justify-between ml-2 mb-1">
        <h1 className="flex items-center gap-2"><FileCodeCorner size={16} />LLVM IR</h1>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info size={16} className="text-muted-foreground cursor-help hover:text-foreground transition-colors" />
          </TooltipTrigger>
          <TooltipContent>
            Shows the LLVM code, this window is read-only but breakpoints can be set.
          </TooltipContent>
        </Tooltip>
      </div>
      <Editor
        className="p-1"
        height="100%"
        theme={theme}
        language="llvm"
        beforeMount={handleBeforeMount}
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

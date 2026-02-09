"use client";

import Editor from "@monaco-editor/react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useState } from "react"

export default function Home() {
  const [inputCode, setInputCode] = useState(`int main() {\n  return 42;\n}`);
  const [outputCode, setOutputCode] = useState("// LLVM IR will appear here...");

  return (
    <div>
      <h1 className='text-3xl font-extrabold tracking-tight text-balance ml-10 mt-10'>LLVM Visualiser</h1>
      <div className='flex flex-row ml-10 mr-10 mt-10'>
        <div className='w-1/3 mr-10'>
          <Editor
            height="70vh"
            theme="vs-dark"
            defaultLanguage="cpp"
            value={inputCode}
            onChange={(val) => setInputCode(val ?? "")}
            options={{
              minimap: { enabled: false }
            }}
          />
        </div>
        <div className='w-1/3'>
          <Editor
            height="70vh"
            theme="vs-dark"
            defaultLanguage="ini"
            value={outputCode}
            options={{
              readOnly: true,
              minimap: { enabled: false }
            }}
          />
        </div>
      </div>
      <div>
        <Button
          variant='default'
          onClick={() => {
            toast.promise(
              async () => {
                const response = await fetch("/api/compile", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: inputCode }), // Use your state variable here
                });
                const data = await response.json();
                if (!response.ok) {
                  throw new Error(data.error || "Server Error");
                }
                setOutputCode(data.result);
                return data;
              },
              {
                loading: "Compiling C++ code...",
                success: (data) => "Compilation complete!",
                error: (err) => `Error: ${err.message}`,
              }
            )
          }}
        >
          Compile
        </Button>
      </div>
    </div>
  );
}

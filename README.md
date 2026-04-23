# LLVM Visualiser & Simulator

LLVM Visualiser is an interactive web-based educational tool and runtime simulator designed to help developers demystify compilers. It allows you to write raw C/C++ code, compile it instantly into LLVM Intermediate Representation (IR), and step through the hardware-level execution of that code interactively. 

**🌐 Live Demo: [llvm.blnx.dev](https://llvm.blnx.dev)**

Built with Next.js, React, and a custom TypeScript execution engine, it provides a comprehensive visualization of CPU instructions, function scoping, and memory states.

## ✨ Features

- **Interactive Source Coding:** Write or drag-and-drop C/C++ files natively into the Monaco-powered editor.
- **In-Browser Compilation:** Server-side Clang compilation transpiles your code into unoptimized LLVM IR for educational analysis.
- **Educational Example Library:** Quickly load pre-verified examples like GCD, Bubble Sort, and recursive Array Sum to see the simulator in action.
- **Visual Call Stack:** Tracks nested and recursive algorithmic depths in real time with color-coded function frames and active argument tracking.
- **Scoped Register Views:** Displays active virtual CPU registers tied securely and explicitly to the active execution block/function.
- **Memory Segmentation:** Replicates the Heap and Stack boundaries visually with dynamically tracked pointers. 
  - **Globals:** Reside at `0x2000`
  - **Stack:** Dynamically allocated starting at `0x7000`
- **Visual Debugger:** Click on any IR line to set breakpoints. Run, Step, Pause, and fine-tune execution speeds to watch complex algorithmic maneuvers unfold line-by-line.
- **Native IR Parsing Engine:** Built natively in TypeScript using the `ohm-js` grammar framework, supporting a wide range of LLVM instructions:
  - **Flow Control:** `br`, `switch`, `phi`, `ret`, `invoke`.
  - **Memory:** `alloca`, `load`, `store`, `getelementptr`, `memcpy`, `memset`.
  - **Atomics:** `cmpxchg`, `atomicrmw`.
  - **Logic/Math:** Full suite of integer (`add`, `shl`, `icmp`) and floating-point (`fadd`, `fcmp`) operators.

## ⚠️ Limitations & Scope

As an educational tool, the simulator focuses on core logic rather than being a full production runtime. Note the following constraints:

- **No Standard Library:** Standard C/C++ library functions like `printf`, `malloc`, `std::cout`, or `std::vector` are not supported. Programs should be self-contained logic or use supported intrinsics.
- **Intrinsics:** Supports basic memory operations like `memcpy` and `memset`.
- **C++ Exceptions:** Exception handling (`try`/`catch`) has limited support, as the simulator focuses on standard control flow.
- **Concurrency:** The runtime is strictly single-threaded; `std::thread` or atomic synchronization will not behave as expected in a multi-threaded context.
- **Optimized Code:** The compiler is configured for `-O0` (no optimizations) to ensure the resulting IR is readable and maps clearly to your source code.

## 🚀 Getting Started

### Prerequisites

You will need **Node.js** installed. Ensure LLVM/Clang is accessible in your environment if you plan to run the backend locally.

### Development

Clone this repository and run the install script:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. New users are automatically greeted by an **Interactive Welcome Tour** that explains the layout and core concepts!

## 🧩 How It Works

The web app bridges standard web stack technologies with advanced compiler theories! 

1. **Compilation:** The backend (`/api/compile`) calls a server-side compiler via Child Processes to generate `.ll` LLVM format strings. 
2. **Parsing:** The frontend harnesses `ohm-js` with a comprehensive grammar that parses strings recursively to generate an Abstract Syntax Tree (AST) mirroring standard LLVM formats like basic blocks, branch conditions, mathematical operators, and dynamic GEP memory access formulas. 
3. **Execution Simulator:** A local instance of a Virtual CPU iterates over the AST frame-by-frame, directly parsing memory pointers, bit masking values for precision, computing offsets, and advancing the `pc` (Program Counter) natively!

## 🛠️ Built With

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Editor:** [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- **Grammar/Parsing:** [Ohm.js](https://ohmjs.org/)
- **Tour/Onboarding:** [React Joyride](https://react-joyride.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)

## 🤝 Contribution

Contributions, issues, and feature requests are welcome! If you'd like to help expand the set of supported LLVM OP Codes, feel free to dive into the parser module located at `src/lib/simulator.ts`.

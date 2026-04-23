"use client";

import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { STATUS } from "react-joyride";

// Import Joyride dynamically to avoid SSR issues
const Joyride: any = dynamic(
  () => import("react-joyride").then((mod: any) => mod.Joyride),
  { ssr: false }
);

interface WelcomeGuideProps {
  run: boolean;
  onFinish: () => void;
}

export function WelcomeGuide({ run, onFinish }: WelcomeGuideProps) {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const steps = [
    {
      target: "body",
      content: (
        <div className="text-left font-sans">
          <h3 className="text-xl font-bold mb-3">Welcome to LLVM Visualiser</h3>
          <p className="text-sm leading-relaxed mb-2">
            This tool lets you write C/C++ code, compile it to{" "}
            <strong>LLVM Intermediate Representation (IR)</strong>, and then
            step through its execution — watching registers, memory, and the
            call stack update in real time.
          </p>
          <p className="text-sm text-muted-foreground">
            This short tour will walk you through each part of the interface.
          </p>
        </div>
      ),
      placement: "center" as const,
    },
    {
      target: "#tour-header",
      content: (
        <div className="text-left font-sans space-y-2">
          <h4 className="font-semibold text-base mb-1">Menu Bar</h4>
          <ul className="text-sm list-disc pl-4 space-y-1.5">
            <li><strong>Code</strong> — Upload a <code>.c</code> / <code>.cpp</code> file or clear the editor</li>
            <li><strong>Examples</strong> — Load a ready-made snippet to explore</li>
            <li><strong>View</strong> — Show or hide the Source / IR panels</li>
            <li><strong>Language</strong> — Switch between C and C++</li>
            <li><strong>Theme</strong> — Toggle light / dark mode</li>
            <li><strong>Info → Welcome Guide</strong> — Replay this tour any time</li>
          </ul>
        </div>
      ),
      placement: "bottom" as const,
    },
    {
      target: "#tour-source-header",
      content: (
        <div className="text-left font-sans space-y-2">
          <h4 className="font-semibold text-base mb-1">Source Editor</h4>
          <p className="text-sm leading-relaxed">
            Write your <strong>C or C++ code</strong> here. You can also{" "}
            <strong>drag and drop</strong> a file straight onto the page to
            load it instantly.
          </p>
          <p className="text-sm text-muted-foreground">
            Tip: try one of the <strong>Examples</strong> from the menu if you
            want to jump straight to simulating.
          </p>
        </div>
      ),
      placement: "right" as const,
    },
    {
      target: "#tour-ir-header",
      content: (
        <div className="text-left font-sans space-y-2">
          <h4 className="font-semibold text-base mb-1">LLVM IR Output</h4>
          <p className="text-sm leading-relaxed">
            After you hit <strong>Compile</strong>, the generated{" "}
            <strong>LLVM IR</strong> appears here — the low-level instructions
            your code is reduced to before reaching machine code.
          </p>
          <p className="text-sm leading-relaxed">
            This editor is <em>read-only</em>, but you can{" "}
            <strong>click in the gutter (left margin)</strong> to set
            breakpoints — the simulation will pause there automatically.
          </p>
        </div>
      ),
      placement: "right" as const,
    },
    {
      target: "#tour-controls",
      content: (
        <div className="text-left font-sans space-y-2">
          <h4 className="font-semibold text-base mb-1">Simulation Controls</h4>
          <ul className="text-sm list-disc pl-4 space-y-1.5">
            <li><strong>Compile</strong> — Sends your code to the server and loads the IR</li>
            <li><strong>Run / Pause</strong> — Auto-plays through every IR instruction</li>
            <li><strong>Back / Step</strong> — Move one instruction at a time, forwards or backwards</li>
            <li><strong>Reset</strong> — Restart from instruction 0 without re-compiling</li>
            <li><strong>Speed slider</strong> — Controls the delay between auto-play steps</li>
            <li><strong>Step scrubber</strong> — Jump directly to any instruction in the trace</li>
          </ul>
        </div>
      ),
      placement: "top" as const,
    },
    {
      target: "#tour-workspace",
      content: (
        <div className="text-left font-sans space-y-2">
          <h4 className="font-semibold text-base mb-1">Simulator Workspace</h4>
          <p className="text-sm leading-relaxed mb-1">
            This panel updates live as instructions execute:
          </p>
          <ul className="text-sm list-disc pl-4 space-y-1.5">
            <li>
              <strong>Call Stack</strong> — Shows the active function call chain
              so you can follow recursion and nested calls.
            </li>
            <li>
              <strong>Registers</strong> — Displays only the SSA registers that
              belong to the <em>currently executing function</em>.
            </li>
            <li>
              <strong>Memory</strong> — Partitioned into <em>Globals</em> and{" "}
              <em>Stack</em> sections so you can see exactly which addresses are
              in play.
            </li>
            <li>
              <strong>Output Log</strong> — A chronological record of every
              instruction executed, useful for debugging.
            </li>
          </ul>
        </div>
      ),
      placement: "left" as const,
    },
    {
      target: "body",
      content: (
        <div className="text-left font-sans space-y-2">
          <h3 className="text-xl font-bold mb-2">You're all set!</h3>
          <p className="text-sm leading-relaxed">
            Try loading an <strong>Example</strong> from the menu, hit{" "}
            <strong>Compile</strong>, then use <strong>Step</strong> to walk
            through the IR one instruction at a time.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            You can replay this tour any time via{" "}
            <strong>Info → Welcome Guide</strong>.
          </p>
        </div>
      ),
      placement: "center" as const,
    },
  ];

  const handleEvent = (data: any) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onFinish();
    }
  };

  if (!mounted || !run) return null;

  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");

  return (
    <Joyride
      onEvent={handleEvent}
      continuous
      run={run}
      scrollToFirstStep
      steps={steps}
      locale={{
        back: "Back",
        close: "Close",
        last: "Finish",
        next: "Next",
        skip: "Skip tour",
      }}
      options={{
        buttons: ["back", "primary", "skip"],
        closeButtonAction: "skip",
        showProgress: true,
        skipBeacon: true,
        zIndex: 10000,
        primaryColor: "#3b82f6",
        backgroundColor: isDark ? "#2e2e2e" : "#ffffff",
        textColor: isDark ? "#f7f7f7" : "#171717",
        arrowColor: isDark ? "#2e2e2e" : "#ffffff",
        overlayColor: isDark ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0.45)",
      }}
      styles={{
        buttonPrimary: {
          backgroundColor: "#3b82f6",
          borderRadius: "6px",
          color: "#ffffff",
          fontWeight: 600,
        },
        buttonBack: {
          marginRight: 10,
          color: isDark ? "#a3a3a3" : "#737373",
        },
        buttonSkip: {
          color: isDark ? "#f7f7f7" : "#171717",
          fontWeight: 500,
          textDecoration: "underline",
        },
        tooltip: {
          borderRadius: "10px",
          fontFamily: "inherit",
          padding: "22px 24px",
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e8e8e8",
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.5)"
            : "0 4px 24px rgba(0,0,0,0.08)",
        },
        tooltipContainer: {
          textAlign: "left",
        },
        tooltipFooter: {
          marginTop: "14px",
        },
        beacon: { display: "none" },
        beaconInner: { display: "none" },
        beaconOuter: { display: "none" },
      }}
    />
  );
}

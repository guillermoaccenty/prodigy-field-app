"use client";
import { useEffect, useRef, useState, useCallback } from "react";

export type WakeWordState = "idle" | "listening" | "recording" | "saving";

const WAKE_PHRASES = ["accenty take note", "accenty take a note", "take note accenty"];
const STOP_PHRASES = ["done", "stop", "accenty stop", "end note", "save note"];

export function useWakeWord({
  onNote,
  enabled = true,
}: {
  onNote: (text: string) => void;
  enabled?: boolean;
}) {
  const [state, setState] = useState<WakeWordState>("idle");
  const [transcript, setTranscript] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const recognitionRef = useRef<any>(null);
  const stateRef = useRef<WakeWordState>("idle");
  const bufferRef = useRef("");

  stateRef.current = state;

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState("idle");
    setTranscript("");
    setStatusMsg("");
    bufferRef.current = "";
  }, []);

  const start = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    recognitionRef.current = r;

    r.onstart = () => {
      setState("listening");
      setStatusMsg('Say "Accenty take note" to start...');
    };

    r.onresult = (e: any) => {
      let finalChunk = "";
      let interimChunk = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalChunk += e.results[i][0].transcript;
        else interimChunk += e.results[i][0].transcript;
      }

      const combined = (bufferRef.current + " " + finalChunk + interimChunk)
        .toLowerCase()
        .trim();

      if (stateRef.current === "listening") {
        // Check for wake word
        if (WAKE_PHRASES.some((p) => combined.includes(p))) {
          bufferRef.current = "";
          setState("recording");
          setTranscript("");
          setStatusMsg('Recording... say "Done" to save.');
          // Vibrate if supported
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
      } else if (stateRef.current === "recording") {
        // Accumulate note content
        if (finalChunk) bufferRef.current += finalChunk;
        const display = bufferRef.current + interimChunk;

        // Strip wake word from beginning if it leaked in
        let cleaned = display;
        WAKE_PHRASES.forEach((p) => {
          cleaned = cleaned.replace(new RegExp(p, "gi"), "").trim();
        });

        setTranscript(cleaned);

        // Check for stop word
        const stopDetected = STOP_PHRASES.some((p) =>
          display.toLowerCase().includes(p)
        );
        if (stopDetected && bufferRef.current.trim().length > 5) {
          // Remove the stop word from the note
          let note = cleaned;
          STOP_PHRASES.forEach((p) => {
            note = note.replace(new RegExp(`\\b${p}\\b`, "gi"), "").trim();
          });
          if (note) {
            setState("saving");
            setStatusMsg("Saving note...");
            onNote(note);
            if (navigator.vibrate) navigator.vibrate(200);
            setTimeout(() => {
              bufferRef.current = "";
              setTranscript("");
              setState("listening");
              setStatusMsg('Say "Accenty take note" to start...');
            }, 1500);
          }
        }
      }
    };

    r.onerror = (e: any) => {
      if (e.error === "no-speech") return; // ignore, just restart
      stop();
    };

    // Auto-restart on end (browser stops recognition after silence)
    r.onend = () => {
      if (stateRef.current !== "idle") {
        try { r.start(); } catch {}
      }
    };

    r.start();
  }, [onNote, stop]);

  useEffect(() => {
    if (enabled) start();
    else stop();
    return () => stop();
  }, [enabled]);

  return { state, transcript, statusMsg, stop, start };
}

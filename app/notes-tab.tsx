"use client";
import { useState, useRef, useEffect, useCallback } from "react";

interface Note { id:number; author_name:string; content:string; created_at:string; }

const WAKE = ["accenty take note","accenty take a note","take note accenty","accenty note"];
const STOP = ["done","stop","accenty stop","end note","save note","save it"];

const C = {
  bg:"#0a0605", bg2:"#140a06", ember:"#ff6a1a",
  soft:"#ffab5e", fg:"#f5ede6", muted:"rgba(245,237,230,0.55)",
  dim:"rgba(245,237,230,0.28)", border:"rgba(255,106,26,0.28)",
};

type MicState = "off" | "wake" | "recording" | "saving";

export function NotesTab({ notes, onSave }: { notes: Note[]; onSave: (t:string)=>void }) {
  const [micState, setMicState] = useState<MicState>("off");
  const [transcript, setTranscript] = useState("");
  const [manualText, setManualText] = useState("");
  const [showManual, setShowManual] = useState(false);
  const recRef = useRef<any>(null);
  const stateRef = useRef<MicState>("off");
  const bufRef = useRef("");
  stateRef.current = micState;

  const stopAll = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setMicState("off");
    setTranscript("");
    bufRef.current = "";
  }, []);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Use Chrome for voice notes"); return; }

    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    recRef.current = r;

    r.onresult = (e: any) => {
      let fin = "", interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }

      const cur = stateRef.current;
      const full = (bufRef.current + " " + fin + interim).toLowerCase().trim();

      if (cur === "wake") {
        if (WAKE.some(w => full.includes(w))) {
          bufRef.current = "";
          setMicState("recording");
          setTranscript("");
          if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
        }
      } else if (cur === "recording") {
        if (fin) bufRef.current += fin;
        let display = (bufRef.current + interim).trim();
        // Strip wake phrase if leaked in
        WAKE.forEach(w => { display = display.replace(new RegExp(w, "gi"), "").trim(); });
        setTranscript(display);

        const hasStop = STOP.some(s => (bufRef.current + interim).toLowerCase().includes(s));
        if (hasStop && display.length > 3) {
          let note = display;
          STOP.forEach(s => { note = note.replace(new RegExp(`\\b${s}\\b`, "gi"), "").trim(); });
          if (note) {
            setMicState("saving");
            onSave(note);
            if (navigator.vibrate) navigator.vibrate(200);
            setTimeout(() => {
              bufRef.current = "";
              setTranscript("");
              setMicState("wake");
            }, 1500);
          }
        }
      }
    };

    r.onerror = (ev: any) => { if (ev.error !== "no-speech") stopAll(); };
    // Auto-restart on silence
    r.onend = () => { if (stateRef.current !== "off") { try { r.start(); } catch {} } };

    r.start();
    setMicState("wake");
    bufRef.current = "";
  }, [onSave, stopAll]);

  const toggleMic = () => {
    if (micState === "off") startListening();
    else stopAll();
  };

  const micColor = micState === "off" ? "rgba(255,255,255,0.07)" :
                   micState === "wake" ? "rgba(255,106,26,0.4)" :
                   micState === "recording" ? "linear-gradient(135deg,#ff6a1a,#ff3d00)" :
                   "linear-gradient(135deg,#4caf50,#2e7d32)";

  const micIcon = micState === "off" ? "🎤" :
                  micState === "wake" ? "👂" :
                  micState === "recording" ? "⏺" : "✓";

  const statusText = micState === "off" ? 'Tap 🎤 or say "Accenty take note"' :
                     micState === "wake" ? '👂 Listening for "Accenty take note"...' :
                     micState === "recording" ? `⏺ Recording... say "done" to save` :
                     "✓ Saving note...";

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column"}}>

      {/* Notes list */}
      <div style={{flex:1,overflowY:"auto" as const,background:C.bg}}>
        {notes.length === 0
          ? <div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",justifyContent:"center",height:140,gap:12,color:C.dim,fontSize:13}}>
              <span style={{fontSize:32}}>🎤</span>
              <span>Say <span style={{color:C.soft,fontWeight:600}}>"Accenty take note"</span> to start</span>
            </div>
          : notes.map((n, i) => (
            <div key={i} style={{background:C.bg,borderBottom:`1px solid rgba(255,106,26,0.07)`,padding:"13px 16px"}}>
              <div style={{fontSize:13,fontWeight:500,color:C.fg,marginBottom:5,lineHeight:1.5}}>{n.content}</div>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:11,color:C.dim}}>{new Date(n.created_at).toLocaleString()}</span>
                <span style={{fontSize:11,color:C.soft}}>{n.author_name}</span>
              </div>
            </div>
          ))
        }
      </div>

      {/* Live transcript while recording */}
      {micState === "recording" && transcript && (
        <div style={{background:"rgba(255,61,0,0.08)",borderTop:`1px solid rgba(255,106,26,0.2)`,padding:"10px 16px",fontSize:13,color:C.fg,lineHeight:1.5,fontStyle:"italic" as const}}>
          "{transcript}"
        </div>
      )}

      {/* Manual note input */}
      {showManual && (
        <div style={{background:C.bg2,borderTop:`1px solid ${C.border}`,padding:"10px 16px",display:"flex",gap:8}}>
          <input
            style={{flex:1,padding:"10px 12px",fontSize:13,background:"rgba(255,255,255,0.04)",border:`1px solid rgba(255,106,26,0.18)`,borderRadius:10,color:C.fg,outline:"none",fontFamily:"inherit"}}
            placeholder="Type a note..."
            value={manualText}
            onChange={e=>setManualText(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&manualText.trim()){onSave(manualText);setManualText("");setShowManual(false);}}}
          />
          <button
            onClick={()=>{if(manualText.trim()){onSave(manualText);setManualText("");setShowManual(false);}}}
            style={{background:"linear-gradient(135deg,#ff6a1a,#ff3d00)",color:"white",border:"none",borderRadius:10,padding:"10px 14px",fontSize:13,fontWeight:700 as const,cursor:"pointer"}}>
            Save
          </button>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{background:C.bg2,borderTop:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        {/* Mic button */}
        <button
          onClick={toggleMic}
          style={{width:50,height:50,borderRadius:"50%",background:micColor,border:"none",color:"white",fontSize:22,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",
            boxShadow: micState==="recording"?"0 0 0 4px rgba(255,61,0,0.3), 0 2px 14px rgba(255,61,0,0.4)":micState==="wake"?"0 0 0 3px rgba(255,106,26,0.2)":"none",
            animation: micState==="recording"?"none":"none",
            transition:"all 0.2s"}}>
          {micIcon}
        </button>

        {/* Status */}
        <div style={{flex:1,fontSize:12,color:micState==="recording"?C.fg:C.muted,lineHeight:1.4,fontWeight:micState==="recording"?500:400}}>
          {statusText}
        </div>

        {/* Keyboard button */}
        <button
          onClick={()=>setShowManual(p=>!p)}
          style={{background:showManual?"rgba(255,106,26,0.2)":"rgba(255,255,255,0.06)",border:`1px solid ${showManual?C.border:"rgba(255,255,255,0.08)"}`,borderRadius:8,padding:"8px 10px",fontSize:16,color:showManual?C.soft:C.muted,cursor:"pointer"}}>
          ⌨️
        </button>
      </div>
    </div>
  );
}

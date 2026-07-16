"use client";
import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { useWakeWord } from "./wakeword";
import { NotesTab } from "./notes-tab";

const API = process.env.NEXT_PUBLIC_API_URL || "https://proti.ai";
const FIELD_KEY = process.env.NEXT_PUBLIC_FIELD_KEY || "";
const fieldHeaders = { "X-Field-Key": FIELD_KEY, "Content-Type": "application/json" };

interface Investigation {
  id: number;
  claim_number: string|null;
  case_number: string|null;
  document_type: string|null;
  status: string;
  case_type: string|null;
  date_of_injury: string|null;
  date_assigned: string|null;
  due_date_original: string|null;
  assignment_days: number|null;
  assignment_desc: string|null;
  employer: string|null;
  insurance_carrier: string|null;
  claims_administrator: string|null;
  case_region: string|null;
  services_requested: string|null;
  is_reopen: boolean;
  ingested_at: string|null;
  subject_name: string|null;
  subject_dob: string|null;
  subject_sex: string|null;
  subject_race: string|null;
  subject_address: string|null;
  subject_height: string|null;
  subject_weight: string|null;
  subject_hair: string|null;
  subject_eyes: string|null;
  client_name: string|null;
  adjuster_name: string|null;
  adjuster_phone: string|null;
  adjuster_email: string|null;
  assigned_investigators: string|null;
  photo_path: string|null;
}
interface Note { id:number; author_name:string; content:string; created_at:string; }
interface TeamMember { investigator_id:number; investigator_name:string; lat:number; lng:number; battery_pct:number|null; heading_deg:number|null; is_active:boolean; recorded_at:string; ws_connected:boolean; }

type Screen = "login"|"cases"|"detail"|"team"|"search";
type Tab = "detail"|"notes"|"location"|"photos";

const C = {
  bg:"#0a0605", bg2:"#140a06", ember:"#ff6a1a", ember2:"#ff3d00",
  soft:"#ffab5e", fg:"#f5ede6", muted:"rgba(245,237,230,0.55)",
  dim:"rgba(245,237,230,0.28)", card:"rgba(24,15,10,0.92)",
  border:"rgba(255,106,26,0.28)",
};

function statusColor(s:string){ return s==="running"||s==="Open"?{bg:"rgba(255,106,26,0.15)",color:C.soft}:s==="pending"||s==="Rush"?{bg:"rgba(255,61,0,0.18)",color:C.ember}:{bg:"rgba(245,237,230,0.08)",color:C.dim}; }
function fmtDate(d:string|null){ if(!d)return"—"; return new Date(d).toLocaleDateString("en-US"); }
function fmtPhone(p:string[]|null){ return p&&p.length>0?p[0]:"—"; }
function fmtAddr(a:string[]|null){ return a&&a.length>0?a[0]:"Unknown"; }

const hdr=(extra?:any)=>({background:C.bg2,borderBottom:`1px solid ${C.border}`,padding:"13px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0,...extra});
const hbtn={background:"none" as const,border:"none",color:C.muted,padding:4,fontSize:18,cursor:"pointer" as const};
const gradBtn={background:"linear-gradient(135deg,#ff6a1a,#ff3d00)",color:"white",border:"none",borderRadius:12,padding:14,fontSize:15,fontWeight:700 as const,width:"100%",boxShadow:"0 4px 24px rgba(255,61,0,0.35)",cursor:"pointer" as const};
const inp={width:"100%",padding:"12px 14px",marginBottom:14,fontSize:14,background:"rgba(255,255,255,0.04)",border:`1px solid rgba(255,106,26,0.18)`,borderRadius:12,color:C.fg,outline:"none",fontFamily:"inherit"};

function DataRow({label,val,ember}:{label:string;val:string;ember?:boolean}){
  return(
    <div style={{display:"flex",padding:"7px 13px",borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
      <div style={{fontSize:11,fontWeight:600,color:C.muted,width:130,flexShrink:0}}>{label}</div>
      <div style={{fontSize:12,color:ember?C.soft:C.fg,flex:1,lineHeight:1.4}}>{val}</div>
    </div>
  );
}

export default function FieldApp(){
  const [screen,setScreen]=useState<Screen>("login");
  const [cases,setCases]=useState<Investigation[]>([]);
  const [cur,setCur]=useState<Investigation|null>(null);
  const [notes,setNotes]=useState<Note[]>([]);
  const [team,setTeam]=useState<TeamMember[]>([]);
  const [tab,setTab]=useState<Tab>("detail");
  const [loading,setLoading]=useState(false);
  const [noteModal,setNoteModal]=useState(false);
  const [noteText,setNoteText]=useState("");
  const [searchQ,setSearchQ]=useState("");
  const [loginLoading,setLoginLoading]=useState(false);
  const [user,setUser]=useState("");
  const [pass,setPass]=useState("");

  // Load cases from API
  const loadCases=useCallback(async()=>{
    setLoading(true);
    try{
      const r=await fetch(`${API}/api/field/cases?limit=50`,{headers:fieldHeaders});
      const d=await r.json();
      setCases(d.cases||[]);
    }catch(e){ console.error(e); }
    finally{ setLoading(false); }
  },[]);

  // Load team GPS
  const loadTeam=useCallback(async()=>{
    try{
      const r=await fetch(`${API}/api/field/team`,{headers:fieldHeaders});
      const d=await r.json();
      setTeam(d.investigators||[]);
    }catch(e){ console.error(e); }
  },[]);

  // Load notes for current case
  const loadNotes=useCallback(async(id:number)=>{
    try{
      const r=await fetch(`${API}/api/field/cases/${id}`,{headers:fieldHeaders});
      const d=await r.json();
      setNotes(d.notes||[]);
    }catch(e){ console.error(e); }
  },[]);

  useEffect(()=>{ if(screen==="cases")loadCases(); },[screen,loadCases]);
  useEffect(()=>{ if(screen==="team")loadTeam(); },[screen,loadTeam]);
  useEffect(()=>{ if(screen==="detail"&&tab==="notes"&&cur)loadNotes(cur.id); },[screen,tab,cur,loadNotes]);

  const openCase=(c:Investigation)=>{ setCur(c); setTab("detail"); setScreen("detail"); };

  const saveNote=async(text:string)=>{
    if(!text.trim()||!cur)return;
    await fetch(`${API}/api/field/cases/${cur.id}/notes`,{headers:{"X-Field-Key":FIELD_KEY,"Content-Type":"application/json"},
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({content:text,author:"Field Investigator"}),
    });
    loadNotes(cur.id);
  };


  const filtered=cases.filter(c=>{
    if(searchQ&&!(c.subject_name||'').toLowerCase().includes(searchQ.toLowerCase()))return false;
    return true;
  });

  const phone={maxWidth:420,margin:"0 auto",minHeight:"100dvh",display:"flex" as const,flexDirection:"column" as const,background:C.bg};

  // ── LOGIN ────────────────────────────────────────────────────────────────
  if(screen==="login") return(
    <div style={{...phone,justifyContent:"center",alignItems:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-80,left:"50%",transform:"translateX(-50%)",width:340,height:340,background:"radial-gradient(circle,rgba(255,61,0,0.18),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:1,width:"92%",maxWidth:400,background:C.card,border:`1px solid rgba(255,106,26,0.35)`,borderRadius:20,padding:"36px 28px 32px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <Image src="/logo4.png" alt="Accenty AI" width={80} height={80} style={{margin:"0 auto 12px",display:"block",filter:"drop-shadow(0 0 20px rgba(255,61,0,0.5))"}} priority/>
          <div style={{fontSize:18,fontWeight:700,color:C.fg}}>Field Case Management</div>
          <div style={{fontSize:12,color:C.muted,marginTop:4}}>Prodigy Investigations</div>
        </div>
        <button style={gradBtn} onClick={()=>{setLoginLoading(true);setTimeout(()=>{setLoginLoading(false);setScreen("cases")},1200)}}>
          {loginLoading?"Connecting...":"Sign in with Microsoft 365"}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0",fontSize:11,color:C.dim}}>
          <div style={{flex:1,height:1,background:"rgba(255,106,26,0.15)"}}/>or continue with credentials<div style={{flex:1,height:1,background:"rgba(255,106,26,0.15)"}}/>
        </div>
        <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:5}}>Username</div>
        <input style={inp} placeholder="investigator@prodigy.com" value={user} onChange={e=>setUser(e.target.value)}/>
        <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:5}}>Password</div>
        <input type="password" style={inp} placeholder="••••••••••" value={pass} onChange={e=>setPass(e.target.value)}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.muted,cursor:"pointer"}}><input type="checkbox" style={{accentColor:C.ember}}/>Remember me</label>
          <button style={{fontSize:12,color:C.soft,background:"none",border:"none",cursor:"pointer"}}>Forgot password?</button>
        </div>
        <button style={gradBtn} onClick={()=>{if(user&&pass)setScreen("cases")}}>Sign in</button>
        <div style={{textAlign:"center",marginTop:18,fontSize:11,color:C.dim}}>🔒 Single sign-on via Microsoft Entra ID</div>
      </div>
    </div>
  );

  // ── CASES LIST ───────────────────────────────────────────────────────────
  if(screen==="cases") return(
    <div style={phone}>
      <div style={hdr()}>
        <Image src="/logo4.png" alt="Accenty AI" width={28} height={28} style={{filter:"drop-shadow(0 0 6px rgba(255,61,0,0.4))"}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:700,color:C.fg}}>Prodigy</div>
          <div style={{fontSize:9,color:C.soft,letterSpacing:"1.5px",textTransform:"uppercase" as const}}>Investigations</div>
        </div>
        <button style={hbtn} onClick={()=>setScreen("search")}>⚙</button>
        <button style={hbtn} onClick={()=>setScreen("login")}>⏻</button>
      </div>
      <div style={{flex:1,overflowY:"auto" as const}}>
        {/* Team Connect banner */}
        <div style={{background:"rgba(255,106,26,0.06)",borderBottom:`1px solid ${C.border}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>{ loadTeam(); setScreen("team"); }}>
          <span style={{fontSize:20,color:C.ember}}>👥</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:C.fg}}>Team Connect</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:"#4caf50",display:"inline-block",marginRight:5,verticalAlign:"middle"}}/>
              {team.filter(t=>t.is_active).length} active investigators
            </div>
          </div>
          <span style={{color:C.dim}}>›</span>
        </div>
        {/* Cases */}
        {loading && <div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>Loading cases...</div>}
        {filtered.map(c=>{
          const sc=statusColor(c.status);
          return(
            <div key={c.id} style={{background:C.bg,borderBottom:`1px solid rgba(255,106,26,0.08)`,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>openCase(c)}>
              {/* Subject photo thumbnail */}
              <div style={{width:42,height:42,borderRadius:"50%",background:"rgba(255,106,26,0.12)",border:`1px solid ${C.border}`,flexShrink:0,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:C.muted}}>
                {c.photo_path ? <img src={`${API}/api/photos/thumb?path=${encodeURIComponent(c.photo_path)}`} style={{width:"100%",height:"100%",objectFit:"cover" as const}} alt="" onError={(e:any)=>e.target.style.display="none"}/> : "👤"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:600,color:C.fg}}>{c.subject_name}</div>
                <div style={{fontSize:11,color:C.muted,marginTop:2}}>{c.claim_number||`#${c.id}`} · {fmtDate(c.date_assigned||c.ingested_at)}</div>
                <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,marginTop:4,display:"inline-block",...sc}}>{c.status}</span>
              </div>
              <button style={{border:`1px solid ${C.border}`,borderRadius:20,padding:"5px 13px",fontSize:11,fontWeight:700,color:C.soft,background:"rgba(255,106,26,0.07)",cursor:"pointer"}} onClick={e=>{e.stopPropagation();openCase(c);}}>OPEN</button>
            </div>
          );
        })}
        {!loading&&filtered.length===0&&<div style={{padding:32,textAlign:"center",color:C.dim,fontSize:13}}>No cases found.</div>}
      </div>
    </div>
  );

  // ── TEAM CONNECT ─────────────────────────────────────────────────────────
  if(screen==="team") return(
    <div style={phone}>
      <div style={hdr()}>
        <button style={hbtn} onClick={()=>setScreen("cases")}>←</button>
        <h1 style={{flex:1,color:C.fg,fontSize:17,fontWeight:600,margin:0}}>Team Connect</h1>
        <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",background:"rgba(76,175,80,0.15)",color:"#81c784",borderRadius:6}}>LIVE</span>
      </div>
      <div style={{background:"rgba(255,106,26,0.06)",borderBottom:`1px solid ${C.border}`,padding:"11px 16px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:7,height:7,borderRadius:"50%",background:"#4caf50",display:"inline-block"}}/>
        <span style={{fontSize:12,color:C.muted}}>{team.filter(t=>t.is_active).length} of {team.length} investigators active</span>
        <button style={{marginLeft:"auto",background:"none",border:"none",color:C.ember,fontSize:11,cursor:"pointer",fontWeight:600}} onClick={loadTeam}>↻ Refresh</button>
      </div>
      {/* Live map */}
      {team.length>0&&(
        <div style={{height:200,background:"#0d1a20",position:"relative",overflow:"hidden",flexShrink:0}}>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:12}}>
            📍 {team.filter(t=>t.is_active).length} investigators on map
          </div>
          {team.filter(t=>t.is_active&&t.lat&&t.lng).map(inv=>(
            <div key={inv.investigator_id} style={{position:"absolute",left:"50%",top:"40%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:C.ember,border:`2px solid ${C.bg}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"white"}}>{(inv.investigator_name||"?").slice(0,2).toUpperCase()}</div>
              <div style={{fontSize:9,color:C.muted,background:C.bg2,borderRadius:3,padding:"1px 4px",marginTop:2,whiteSpace:"nowrap" as const}}>{inv.investigator_name?.split(" ")[0]||"Inv."}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{flex:1,overflowY:"auto" as const}}>
        {team.length===0&&<div style={{padding:32,textAlign:"center",color:C.dim,fontSize:13}}>No investigators tracked yet.</div>}
        {team.map(inv=>(
          <div key={inv.investigator_id} style={{background:C.bg,borderBottom:`1px solid rgba(255,106,26,0.07)`,padding:"13px 16px",display:"flex",alignItems:"center",gap:13}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:inv.is_active?"#7b1fa2":"#333",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white",flexShrink:0,position:"relative"}}>
              {(inv.investigator_name||"?").split(" ").map((n:string)=>n[0]).slice(0,2).join("")}
              <div style={{width:10,height:10,borderRadius:"50%",border:`2px solid ${C.bg}`,position:"absolute",bottom:0,right:0,background:inv.is_active?"#4caf50":"#555"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:C.fg}}>{inv.investigator_name||`Investigator #${inv.investigator_id}`}</div>
              {inv.lat&&inv.lng&&<div style={{fontSize:11,color:C.muted,marginTop:2}}>📍 {inv.lat.toFixed(4)}, {inv.lng.toFixed(4)}</div>}
              {inv.battery_pct&&<div style={{fontSize:10,color:C.dim,marginTop:2}}>🔋 {inv.battery_pct}%</div>}
              <div style={{fontSize:10,color:C.dim,marginTop:1}}>{new Date(inv.recorded_at).toLocaleTimeString()}</div>
            </div>
            <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,background:inv.is_active?"rgba(76,175,80,0.15)":"rgba(255,255,255,0.05)",color:inv.is_active?"#81c784":"#666"}}>{inv.is_active?"Active":"Offline"}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── SEARCH ───────────────────────────────────────────────────────────────
  if(screen==="search") return(
    <div style={phone}>
      <div style={hdr()}>
        <button style={hbtn} onClick={()=>setScreen("cases")}>←</button>
        <h1 style={{flex:1,color:C.fg,fontSize:17,fontWeight:600,margin:0}}>Search Cases</h1>
        <button style={{...hbtn,color:C.soft,fontSize:13,fontWeight:700}} onClick={()=>setScreen("cases")}>DONE</button>
        <button style={{...hbtn,fontSize:13,fontWeight:700}} onClick={()=>setSearchQ("")}>RESET</button>
      </div>
      <div style={{flex:1,overflowY:"auto" as const,padding:"18px 16px",background:C.bg}}>
        <div style={{fontSize:12,fontWeight:600,color:C.muted,marginBottom:5}}>Subject name</div>
        <input style={inp} placeholder="Search by name..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
      </div>
    </div>
  );

  // ── CASE DETAIL ──────────────────────────────────────────────────────────
  const c=cur!;
  const addr=c.subject_address||"Unknown";
  const phone1=c.adjuster_phone||"—";

  return(
    <div style={phone}>
      <div style={hdr()}>
        <button style={hbtn} onClick={()=>setScreen("cases")}>←</button>
        <h1 style={{flex:1,color:C.fg,fontSize:16,fontWeight:600,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" as const}}>{c.subject_name}</h1>
        {tab==="notes"&&<button style={{...hbtn,color:C.soft,fontSize:22}} onClick={()=>setNoteModal(true)}>+</button>}
      </div>

      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>

        {/* DETAIL */}
        {tab==="detail"&&<div style={{flex:1,overflowY:"auto" as const,background:C.bg}}>
          {/* Subject hero card */}
          <div style={{background:"rgba(255,106,26,0.05)",borderBottom:`1px solid ${C.border}`,padding:"16px",display:"flex",gap:14,alignItems:"flex-start"}}>
            <div style={{width:64,height:64,borderRadius:12,background:"rgba(255,106,26,0.12)",border:`1px solid ${C.border}`,flexShrink:0,overflow:"hidden",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,color:C.muted}}>
              {c.photo_path?<img src={`${API}/api/photos/thumb?path=${encodeURIComponent(c.photo_path)}`} style={{width:"100%",height:"100%",objectFit:"cover" as const}} alt="" onError={(e:any)=>e.target.style.display="none"}/>:"👤"}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:17,fontWeight:700,color:C.fg}}>{c.subject_name}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:3}}>{c.claim_number||`Case #${c.id}`}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:2}}>DOB: {fmtDate(c.subject_dob)} · {c.subject_sex||"?"}</div>
              <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,marginTop:6,display:"inline-block",...statusColor(c.status)}}>{c.status}</span>
            </div>
          </div>
          {/* Client card */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,margin:"8px 12px",overflow:"hidden"}}>
            <div style={{padding:"9px 13px",background:"rgba(255,106,26,0.07)",borderBottom:`1px solid rgba(255,106,26,0.12)`,fontSize:12,fontWeight:700,color:C.soft}}>Client Information</div>
            <DataRow label="Client" val={c.client_name||"—"} ember/>
            <DataRow label="Adjuster" val={c.adjuster_name||"—"} ember/>
            {c.adjuster_phone&&<DataRow label="Adj. Phone" val={c.adjuster_phone} ember/>}
            {c.adjuster_email&&<DataRow label="Adj. Email" val={c.adjuster_email}/>}
            {c.claims_administrator&&<DataRow label="Claims Admin" val={c.claims_administrator}/>}
          </div>
          {/* Case detail */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,margin:"8px 12px",overflow:"hidden"}}>
            <div style={{padding:"9px 13px",background:"rgba(255,106,26,0.07)",borderBottom:`1px solid rgba(255,106,26,0.12)`,fontSize:12,fontWeight:700,color:C.soft}}>Case Detail</div>
            <DataRow label="Claim #" val={c.claim_number||"—"}/>
            <DataRow label="Case Type" val={c.case_type||c.document_type||"—"}/>
            <DataRow label="Date Assigned" val={fmtDate(c.date_assigned)}/>
            <DataRow label="Due Date" val={fmtDate(c.due_date_original)}/>
            <DataRow label="Assignment" val={c.assignment_desc||`${c.assignment_days||"?"}-Day Surveillance`}/>
            {c.employer&&<DataRow label="Employer" val={c.employer}/>}
            <DataRow label="Date of Injury" val={fmtDate(c.date_of_injury)}/>
            {c.insurance_carrier&&<DataRow label="Insurance" val={c.insurance_carrier}/>}
            {c.case_region&&<DataRow label="Region" val={c.case_region}/>}
            {c.assigned_investigators&&<DataRow label="Investigators" val={c.assigned_investigators}/>}
            {c.is_reopen&&<DataRow label="Re-open" val="Yes"/>}
          </div>
          {/* Subject detail */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,margin:"8px 12px",overflow:"hidden"}}>
            <div style={{padding:"9px 13px",background:"rgba(255,106,26,0.07)",borderBottom:`1px solid rgba(255,106,26,0.12)`,fontSize:12,fontWeight:700,color:C.soft}}>Subject Information</div>
            <DataRow label="DOB" val={fmtDate(c.subject_dob)}/>
            <DataRow label="Sex / Race" val={`${c.subject_sex||"—"} / ${c.subject_race||"—"}`}/>
            {c.subject_height&&<DataRow label="Height" val={c.subject_height}/>}
            {c.subject_weight&&<DataRow label="Weight" val={c.subject_weight}/>}
            {c.subject_hair&&<DataRow label="Hair" val={c.subject_hair}/>}
            {c.subject_eyes&&<DataRow label="Eyes" val={c.subject_eyes}/>}
            <DataRow label="Address" val={addr}/>
          </div>
          <div style={{height:20}}/>
        </div>}

        {/* NOTES */}
        {tab==="notes"&&<NotesTab notes={notes} onSave={saveNote}/>}

        {/* LOCATION */}
        {tab==="location"&&<div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{flex:1,background:"#0d1a20",position:"relative",overflow:"hidden"}}>
            {/* Map grid */}
            <div style={{position:"absolute",left:0,right:0,top:"42%",height:4,background:"rgba(255,106,26,0.18)"}}/>
            <div style={{position:"absolute",left:0,right:0,top:"65%",height:2,background:"rgba(255,255,255,0.06)"}}/>
            <div style={{position:"absolute",left:0,right:0,top:"25%",height:1,background:"rgba(255,255,255,0.06)"}}/>
            <div style={{position:"absolute",top:0,bottom:0,left:"50%",width:4,background:"rgba(255,106,26,0.18)"}}/>
            <div style={{position:"absolute",top:0,bottom:0,left:"25%",width:1,background:"rgba(255,255,255,0.06)"}}/>
            <div style={{position:"absolute",top:0,bottom:0,left:"75%",width:1,background:"rgba(255,255,255,0.06)"}}/>
            {/* Blocks */}
            {[[27,26,20,10],[27,53,16,10],[67,26,20,10],[67,53,16,10]].map(([t,l,w,h],i)=>(
              <div key={i} style={{position:"absolute",top:`${t}%`,left:`${l}%`,width:`${w}%`,height:`${h}%`,background:"rgba(255,255,255,0.04)",borderRadius:2}}/>
            ))}
            <div style={{position:"absolute",top:"27%",left:"77%",width:"20%",height:"28%",background:"rgba(50,100,60,0.25)",borderRadius:3}}/>
            {/* Subject pin */}
            <div style={{position:"absolute",left:"46%",top:"35%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{width:28,height:28,background:"linear-gradient(135deg,#ff6a1a,#ff3d00)",borderRadius:"50% 50% 50% 0",transform:"rotate(-45deg)",border:"2px solid rgba(255,255,255,0.9)",boxShadow:"0 2px 8px rgba(255,61,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{transform:"rotate(45deg)",fontSize:12}}>👤</span>
              </div>
              <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:4,padding:"2px 7px",fontSize:10,fontWeight:600,color:C.fg,marginTop:5,whiteSpace:"nowrap" as const}}>{c.subject_name.split(" ")[0]}</div>
            </div>
            {/* Active investigators */}
            {team.filter(t=>t.is_active).slice(0,3).map((inv,idx)=>(
              <div key={inv.investigator_id} style={{position:"absolute",left:`${55+idx*12}%`,top:`${48+idx*8}%`,display:"flex",flexDirection:"column",alignItems:"center"}}>
                <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${C.bg}`,background:"#7b1fa2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"white",boxShadow:"0 1px 6px rgba(0,0,0,0.5)"}}>
                  {(inv.investigator_name||"?").split(" ").map((n:string)=>n[0]).slice(0,2).join("")}
                </div>
                <div style={{fontSize:9,fontWeight:600,color:C.muted,background:C.bg2,borderRadius:3,padding:"1px 4px",marginTop:2,whiteSpace:"nowrap" as const}}>{inv.investigator_name?.split(" ")[0]||"Inv."}</div>
              </div>
            ))}
            {team.filter(t=>t.is_active).length===0&&(
              <div style={{position:"absolute",bottom:16,left:0,right:0,textAlign:"center",fontSize:11,color:C.dim}}>No investigators currently tracked</div>
            )}
            {/* Zoom controls */}
            <div style={{position:"absolute",right:12,bottom:12,display:"flex",flexDirection:"column",gap:4}}>
              {["+","−"].map(b=><div key={b} style={{width:32,height:32,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:600,color:C.muted,cursor:"pointer"}}>{b}</div>)}
            </div>
          </div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,margin:"10px 12px",borderRadius:10,padding:"11px 13px"}}>
            <div style={{fontSize:14,fontWeight:600,color:C.fg,marginBottom:3}}>Subject Address</div>
            <div style={{fontSize:12,color:C.muted}}>{addr}</div>
            {c.subject_phones&&c.subject_phones.length>0&&<div style={{fontSize:12,color:C.soft,marginTop:4}}>📞 {phone1}</div>}
          </div>
        </div>}

        {/* PHOTOS */}
        {tab==="photos"&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:C.bg,gap:12}}>
          {c.photo_path?(
            <div style={{width:160,height:160,borderRadius:16,overflow:"hidden",border:`2px solid ${C.border}`}}>
              <img src={`${API}/api/photos/thumb?path=${encodeURIComponent(c.photo_path)}`} style={{width:"100%",height:"100%",objectFit:"cover" as const}} alt="Subject"/>
            </div>
          ):(
            <span style={{fontSize:48,color:C.dim}}>🖼</span>
          )}
          <p style={{fontSize:13,color:C.dim}}>{c.photo_path?"Reference photo":"No photos attached."}</p>
        </div>}
      </div>

      {/* Bottom nav */}
      <div style={{background:C.bg2,borderTop:`1px solid ${C.border}`,display:"flex",flexShrink:0}}>
        {(["detail","notes","location","photos"] as Tab[]).map(t=>(
          <button key={t} style={{flex:1,display:"flex" as const,flexDirection:"column" as const,alignItems:"center" as const,padding:"9px 4px",border:"none",background:"none",color:tab===t?C.ember:C.dim,fontSize:10,fontWeight:500 as const,gap:3,cursor:"pointer" as const}} onClick={()=>setTab(t)}>
            <span style={{fontSize:20}}>{t==="detail"?"ℹ️":t==="notes"?"📝":t==="location"?"📍":"🖼"}</span>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* Note modal */}
      {noteModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",zIndex:20}}>
          <div style={{background:C.bg2,border:`1px solid rgba(255,106,26,0.5)`,borderRadius:"18px 18px 0 0",padding:"20px 16px",width:"100%"}}>
            <div style={{fontSize:16,fontWeight:700,color:C.fg,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              New Note<button style={{background:"none",border:"none",fontSize:19,color:C.muted,cursor:"pointer"}} onClick={()=>setNoteModal(false)}>✕</button>
            </div>
            <textarea style={{...inp,height:90,resize:"none" as const,marginBottom:0}} placeholder="Field observation..." value={noteText} onChange={e=>setNoteText(e.target.value)}/>
            <div style={{display:"flex",gap:10,marginTop:10}}>
              <button style={{background:"linear-gradient(135deg,#ff6a1a,#ff3d00)",color:"white",border:"none",borderRadius:10,padding:"10px 18px",fontSize:13,fontWeight:700 as const,cursor:"pointer",flex:1}}
                onClick={()=>{saveNote(noteText);setNoteText("");setNoteModal(false);}}>Save Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

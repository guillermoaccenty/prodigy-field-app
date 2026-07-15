"use client";
import { useState, useRef, useCallback } from "react";

interface Case {
  id:string; caseNumber:string; subjectName:string; status:"Open"|"Rush"|"Closed";
  caseType:string; caseManager:string; dateReferred:string; dueDate:string;
  adjuster:string; employer:string; dateOfInjury:string;
  caseRegion:string; caseLocation:string;
  client:{name:string;contact:string;tag:string};
  subject:{name:string;alias:string;dob:string;age:number;phone:string;
    occupation:string;dl:string;ssn:string;employmentStatus:string;
    address:string;sex:string;race:string;typeOfInjury:string;
    restrictions:string;assignment:string;investigate:string};
  notes:Note[]; reportSections:string[];
}
interface Note{preview:string;datetime:string;type:string}
interface Inv{name:string;initials:string;color:string;status:"active"|"offline";location:string;case:string}

const CASES:Case[]=[
  {id:"1",caseNumber:"2026-07-13-SURV-08989-01",subjectName:"Dina Calix",status:"Open",
   caseType:"Workers Compensation - WC",caseManager:"Todd Montgomery Gullett",
   dateReferred:"07/13/2026",dueDate:"08/14/2026",adjuster:"Dawn Kajiyama",
   employer:"Decision HR Inc.",dateOfInjury:"05/19/2025",
   caseRegion:"West Coast",caseLocation:"Fontana, CA",
   client:{name:"AIG Claims Inc.",contact:"Dawn Kajiyama",tag:"SHI"},
   subject:{name:"Dina Calix",alias:"Dina Arely Calix",dob:"02/03/1969",age:57,
    phone:"(310) 634-7971",occupation:"Unknown",dl:"A8473859",ssn:"XXX-XX-6699",
    employmentStatus:"Terminated",address:"14760 El Molino Street, Fontana, CA 92335",
    sex:"Female",race:"Hispanic",typeOfInjury:"Right shoulder",
    restrictions:"No lift over 5 lbs, no push/pull over 10 lbs",
    assignment:"2-Day Surveillance",investigate:"Physical Activity, Hobbies"},
   notes:[{preview:"Hello, This is a confirmation of receipt...",datetime:"07/13/2026 10:01 AM",type:"Email"}],
   reportSections:["Surveillance","Summary","Preliminary Facts","Investigative Details","Telephonic Comm.","Interviews","Still Photography"]},
  {id:"2",caseNumber:"2026-07-10-SURV-08988-01",subjectName:"Leonard King",status:"Rush",
   caseType:"Workers Compensation - WC",caseManager:"Todd Montgomery Gullett",
   dateReferred:"07/10/2026",dueDate:"07/25/2026",adjuster:"Maria Santos",
   employer:"Pacific Logistics LLC",dateOfInjury:"03/12/2025",
   caseRegion:"West Coast",caseLocation:"Los Angeles, CA",
   client:{name:"Zurich Insurance",contact:"Maria Santos",tag:"ZUR"},
   subject:{name:"Leonard King",alias:"Leo King",dob:"05/14/1975",age:51,
    phone:"(323) 555-0182",occupation:"Forklift Operator",dl:"B9283746",ssn:"XXX-XX-XXXX",
    employmentStatus:"Active",address:"3421 W Pico Blvd, Los Angeles, CA 90019",
    sex:"Male",race:"Black",typeOfInjury:"Lower back",
    restrictions:"No lift over 20 lbs, no bending",
    assignment:"3-Day Surveillance",investigate:"Physical Activity"},
   notes:[],reportSections:["Surveillance","Summary","Preliminary Facts","Investigative Details"]},
  {id:"3",caseNumber:"2026-07-09-SURV-08987-01",subjectName:"Alisher Aliev",status:"Open",
   caseType:"Workers Compensation - WC",caseManager:"Todd Montgomery Gullett",
   dateReferred:"07/09/2026",dueDate:"08/01/2026",adjuster:"Kevin Park",
   employer:"West Coast Builders Inc.",dateOfInjury:"11/20/2024",
   caseRegion:"West Coast",caseLocation:"Riverside, CA",
   client:{name:"State Farm Insurance",contact:"Kevin Park",tag:"STF"},
   subject:{name:"Alisher Aliev",alias:"Al Aliev",dob:"09/22/1983",age:42,
    phone:"(951) 555-0133",occupation:"Construction Worker",dl:"C1234567",ssn:"XXX-XX-XXXX",
    employmentStatus:"Terminated",address:"9800 Magnolia Ave, Riverside, CA 92503",
    sex:"Male",race:"Asian",typeOfInjury:"Right knee",
    restrictions:"No standing over 30 min",
    assignment:"2-Day Surveillance",investigate:"Physical Activity"},
   notes:[],reportSections:["Surveillance","Summary","Investigative Details"]},
];

const TEAM:Inv[]=[
  {name:"Yasmine De La Rosa",initials:"YD",color:"#7b1fa2",status:"active",location:"Fontana, CA",case:"Dina Calix - SURV-08989"},
  {name:"Todd Gullett",initials:"TG",color:"#c41230",status:"active",location:"Office - Riverside HQ",case:"Manager on duty"},
  {name:"Rylee Adams",initials:"RA",color:"#1565c0",status:"offline",location:"Last seen: Los Angeles, CA",case:""},
];

type Screen="login"|"cases"|"detail"|"team"|"search";
type Tab="detail"|"report"|"notes"|"location"|"photos";

function badge(s:string){
  const bg=s==="Open"?"rgba(255,106,26,0.15)":s==="Rush"?"rgba(255,61,0,0.18)":"rgba(245,237,230,0.08)";
  const color=s==="Open"?"#ffab5e":s==="Rush"?"#ff6a1a":"rgba(245,237,230,0.45)";
  return {fontSize:10,fontWeight:700 as const,padding:"2px 8px",borderRadius:8,background:bg,color,display:"inline-block" as const,marginTop:5};
}

function DR({label,val,ember}:{label:string;val:string;ember?:boolean}){
  return(
    <div style={{display:"flex",padding:"7px 13px",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
      <div style={{fontSize:11,fontWeight:600,color:"var(--fg-muted)",width:130,flexShrink:0}}>{label}</div>
      <div style={{fontSize:12,color:ember?"#ffab5e":"var(--fg)",flex:1,lineHeight:1.4}}>{val}</div>
    </div>
  );
}

export default function FieldApp(){
  const [screen,setScreen]=useState<Screen>("login");
  const [cases,setCases]=useState<Case[]>(CASES);
  const [cur,setCur]=useState<Case|null>(null);
  const [tab,setTab]=useState<Tab>("detail");
  const [noteModal,setNoteModal]=useState(false);
  const [noteText,setNoteText]=useState("");
  const [noteType,setNoteType]=useState("Field Note");
  const [recording,setRecording]=useState(false);
  const [draft,setDraft]=useState("");
  const [searchQ,setSearchQ]=useState("");
  const [statuses,setStatuses]=useState(["Open","Rush"]);
  const [loginLoading,setLoginLoading]=useState(false);
  const [user,setUser]=useState("");
  const [pass,setPass]=useState("");
  const recRef=useRef<any>(null);

  const openCase=(c:Case)=>{setCur(c);setTab("detail");setScreen("detail");};

  const saveNote=(text:string,type:string)=>{
    if(!text.trim()||!cur)return;
    const now=new Date();
    const dt=`${String(now.getMonth()+1).padStart(2,"0")}/${String(now.getDate()).padStart(2,"0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    const note:Note={preview:text.slice(0,70)+(text.length>70?"...":""),datetime:dt,type};
    const updated=cases.map(c=>c.id===cur.id?{...c,notes:[note,...c.notes]}:c);
    setCases(updated);
    setCur(updated.find(c=>c.id===cur.id)!);
  };

  const toggleMic=useCallback(()=>{
    const SR=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if(!SR){alert("Usa Chrome para notas de voz");return;}
    if(recording){recRef.current?.stop();setRecording(false);}
    else{
      const r=new SR();r.lang="es-US";r.continuous=true;r.interimResults=true;
      let fin="";
      r.onresult=(e:any)=>{let int="";for(let i=e.resultIndex;i<e.results.length;i++){if(e.results[i].isFinal)fin+=e.results[i][0].transcript;else int+=e.results[i][0].transcript;}setDraft(fin+int);};
      r.onerror=()=>setRecording(false);
      r.start();recRef.current=r;setRecording(true);setDraft("");
    }
  },[recording]);

  const filtered=cases.filter(c=>{
    if(searchQ&&!c.subjectName.toLowerCase().includes(searchQ.toLowerCase())&&!c.caseNumber.includes(searchQ))return false;
    if(statuses.length&&!statuses.includes(c.status))return false;
    return true;
  });

  const phone={maxWidth:420,margin:"0 auto",minHeight:"100dvh",display:"flex" as const,flexDirection:"column" as const,background:"#0a0605"};
  const hdr={background:"#140a06",borderBottom:"1px solid rgba(255,106,26,0.28)",padding:"13px 16px",display:"flex" as const,alignItems:"center" as const,gap:12,flexShrink:0};
  const hbtn={background:"none" as const,border:"none",color:"rgba(245,237,230,0.55)",padding:4,fontSize:18,cursor:"pointer" as const};
  const gradBtn={background:"linear-gradient(135deg,#ff6a1a,#ff3d00)",color:"white",border:"none",borderRadius:12,padding:14,fontSize:15,fontWeight:700 as const,width:"100%",boxShadow:"0 4px 24px rgba(255,61,0,0.35)",cursor:"pointer" as const};
  const inp={width:"100%",padding:"12px 14px",marginBottom:14,fontSize:14,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,106,26,0.18)",borderRadius:12,color:"#f5ede6",outline:"none",fontFamily:"inherit"};
  const navBtn=(active:boolean)=>({flex:1,display:"flex" as const,flexDirection:"column" as const,alignItems:"center" as const,padding:"9px 4px",border:"none",background:"none",color:active?"#ff6a1a":"rgba(245,237,230,0.28)",fontSize:10,fontWeight:500 as const,gap:3,cursor:"pointer" as const});
  const card={background:"rgba(24,15,10,0.92)",border:"1px solid rgba(255,106,26,0.28)",borderRadius:10,margin:"8px 12px",overflow:"hidden" as const};
  const cardTitle={padding:"9px 13px",background:"rgba(255,106,26,0.07)",borderBottom:"1px solid rgba(255,106,26,0.12)",fontSize:12,fontWeight:700 as const,color:"#ffab5e"};
  const secH={background:"rgba(255,106,26,0.10)",borderTop:"1px solid rgba(255,106,26,0.12)",borderBottom:"1px solid rgba(255,106,26,0.12)",padding:"7px 16px",marginTop:4};

  if(screen==="login") return(
    <div style={{...phone,justifyContent:"center",alignItems:"center",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-80,left:"50%",transform:"translateX(-50%)",width:340,height:340,background:"radial-gradient(circle,rgba(255,61,0,0.18),transparent 70%)",pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:1,width:"92%",maxWidth:400,background:"rgba(24,15,10,0.92)",border:"1px solid rgba(255,106,26,0.35)",borderRadius:20,padding:"36px 28px 32px"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:72,height:72,margin:"0 auto 12px",background:"linear-gradient(135deg,#ff6a1a,#ff3d00)",borderRadius:"50% 50% 50% 0",transform:"rotate(-45deg)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(255,61,0,0.4)"}}>
            <span style={{transform:"rotate(45deg)",fontFamily:"Georgia,serif",fontSize:22,fontWeight:700,color:"white"}}>PI</span>
          </div>
          <div style={{fontSize:18,fontWeight:700,color:"#f5ede6"}}>Prodigy Investigations</div>
          <div style={{fontSize:12,color:"rgba(245,237,230,0.55)",marginTop:4}}>Field Case Management</div>
        </div>
        <button style={gradBtn} onClick={()=>{setLoginLoading(true);setTimeout(()=>{setLoginLoading(false);setScreen("cases")},1200)}}>
          {loginLoading?"Connecting to Microsoft 365...":"Sign in with Microsoft 365"}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0",fontSize:11,color:"rgba(245,237,230,0.28)"}}>
          <div style={{flex:1,height:1,background:"rgba(255,106,26,0.15)"}}/>or continue with credentials<div style={{flex:1,height:1,background:"rgba(255,106,26,0.15)"}}/>
        </div>
        <div style={{fontSize:12,fontWeight:600,color:"rgba(245,237,230,0.55)",marginBottom:5}}>Username</div>
        <input style={inp} placeholder="investigator@prodigy.com" value={user} onChange={e=>setUser(e.target.value)}/>
        <div style={{fontSize:12,fontWeight:600,color:"rgba(245,237,230,0.55)",marginBottom:5}}>Password</div>
        <input type="password" style={inp} placeholder="••••••••••" value={pass} onChange={e=>setPass(e.target.value)}/>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"rgba(245,237,230,0.55)",cursor:"pointer"}}><input type="checkbox" style={{accentColor:"#ff6a1a"}}/>Remember me</label>
          <button style={{fontSize:12,color:"#ffab5e",background:"none",border:"none",cursor:"pointer"}}>Forgot password?</button>
        </div>
        <button style={gradBtn} onClick={()=>{if(user&&pass)setScreen("cases")}}>Sign in</button>
        <div style={{textAlign:"center",marginTop:18,fontSize:11,color:"rgba(245,237,230,0.28)"}}>🔒 Single sign-on via Microsoft Entra ID</div>
      </div>
    </div>
  );

  if(screen==="cases") return(
    <div style={phone}>
      <div style={hdr}>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:700,color:"#f5ede6"}}>Prodigy</div>
          <div style={{fontSize:9,color:"#ffab5e",letterSpacing:"1.5px",textTransform:"uppercase" as const}}>Investigations</div>
        </div>
        <button style={hbtn} onClick={()=>setScreen("search")}>⚙</button>
        <button style={hbtn} onClick={()=>setScreen("login")}>⏻</button>
      </div>
      <div style={{flex:1,overflowY:"auto" as const}}>
        <div style={{background:"rgba(255,106,26,0.06)",borderBottom:"1px solid rgba(255,106,26,0.28)",padding:"12px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>setScreen("team")}>
          <span style={{fontSize:20,color:"#ff6a1a"}}>👥</span>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:"#f5ede6"}}>Team Connect</div>
            <div style={{fontSize:11,color:"rgba(245,237,230,0.55)",marginTop:2}}><span style={{width:7,height:7,borderRadius:"50%",background:"#4caf50",display:"inline-block",marginRight:5,verticalAlign:"middle"}}/>Yasmine & Todd active</div>
          </div>
          <span style={{color:"rgba(245,237,230,0.28)"}}>›</span>
        </div>
        {filtered.map(c=>(
          <div key={c.id} style={{background:"#0a0605",borderBottom:"1px solid rgba(255,106,26,0.08)",padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>openCase(c)}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:600,color:"#f5ede6"}}>{c.subjectName}</div>
              <div style={{fontSize:11,color:"rgba(245,237,230,0.55)",marginTop:3}}>{c.caseNumber}</div>
              <span style={badge(c.status)}>{c.status}</span>
            </div>
            <button style={{border:"1px solid rgba(255,106,26,0.28)",borderRadius:20,padding:"5px 13px",fontSize:11,fontWeight:700,color:"#ffab5e",background:"rgba(255,106,26,0.07)",cursor:"pointer"}} onClick={e=>{e.stopPropagation();openCase(c);}}>OPEN</button>
          </div>
        ))}
      </div>
    </div>
  );

  if(screen==="team") return(
    <div style={phone}>
      <div style={hdr}>
        <button style={hbtn} onClick={()=>setScreen("cases")}>←</button>
        <h1 style={{flex:1,color:"#f5ede6",fontSize:17,fontWeight:600,margin:0}}>Team Connect</h1>
        <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",background:"rgba(76,175,80,0.15)",color:"#81c784",borderRadius:6}}>LIVE</span>
      </div>
      <div style={{background:"rgba(255,106,26,0.06)",borderBottom:"1px solid rgba(255,106,26,0.28)",padding:"11px 16px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{width:7,height:7,borderRadius:"50%",background:"#4caf50",display:"inline-block"}}/>
        <span style={{fontSize:12,color:"rgba(245,237,230,0.55)"}}>2 of 3 investigators active</span>
      </div>
      <div style={{flex:1,overflowY:"auto" as const}}>
        {TEAM.map(inv=>(
          <div key={inv.name} style={{background:"#0a0605",borderBottom:"1px solid rgba(255,106,26,0.07)",padding:"13px 16px",display:"flex",alignItems:"center",gap:13}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:inv.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"white",flexShrink:0,position:"relative"}}>
              {inv.initials}
              <div style={{width:10,height:10,borderRadius:"50%",border:"2px solid #0a0605",position:"absolute",bottom:0,right:0,background:inv.status==="active"?"#4caf50":"#555"}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:600,color:"#f5ede6"}}>{inv.name}</div>
              <div style={{fontSize:11,color:"rgba(245,237,230,0.55)",marginTop:2}}>📍 {inv.location}</div>
              {inv.case&&<div style={{fontSize:10,color:"rgba(245,237,230,0.28)",marginTop:2}}>{inv.case}</div>}
            </div>
            <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:8,background:inv.status==="active"?"rgba(76,175,80,0.15)":"rgba(255,255,255,0.05)",color:inv.status==="active"?"#81c784":"#666"}}>{inv.status==="active"?"Active":"Offline"}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if(screen==="search") return(
    <div style={phone}>
      <div style={hdr}>
        <button style={hbtn} onClick={()=>setScreen("cases")}>←</button>
        <h1 style={{flex:1,color:"#f5ede6",fontSize:17,fontWeight:600,margin:0}}>Filter Cases</h1>
        <button style={{...hbtn,color:"#ffab5e",fontSize:13,fontWeight:700}} onClick={()=>setScreen("cases")}>DONE</button>
        <button style={{...hbtn,fontSize:13,fontWeight:700}} onClick={()=>{setSearchQ("");setStatuses(["Open","Rush"]);}}>RESET</button>
      </div>
      <div style={{flex:1,overflowY:"auto" as const,padding:"18px 16px",background:"#0a0605"}}>
        <div style={{fontSize:12,fontWeight:600,color:"rgba(245,237,230,0.55)",marginBottom:5}}>Subject / Case #</div>
        <input style={{...inp,marginBottom:16}} placeholder="Search..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
        <div style={{fontSize:12,fontWeight:600,color:"rgba(245,237,230,0.55)",marginBottom:10}}>Status</div>
        <div style={{display:"flex",flexWrap:"wrap" as const,gap:8}}>
          {["Open","Rush","Closed","On Hold"].map(s=>(
            <button key={s} style={{padding:"7px 14px",borderRadius:20,fontSize:12,fontWeight:700 as const,border:"none",cursor:"pointer",background:statuses.includes(s)?"linear-gradient(135deg,rgba(255,106,26,0.8),rgba(255,61,0,0.8))":"rgba(255,255,255,0.07)",color:statuses.includes(s)?"white":"rgba(245,237,230,0.55)"}}
              onClick={()=>setStatuses(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s])}>{s}</button>
          ))}
        </div>
      </div>
    </div>
  );

  const c=cur!;
  return(
    <div style={phone}>
      <div style={hdr}>
        <button style={hbtn} onClick={()=>setScreen("cases")}>←</button>
        <h1 style={{flex:1,color:"#f5ede6",fontSize:16,fontWeight:600,margin:0}}>{c.subjectName}</h1>
        {tab==="notes"&&<button style={{...hbtn,color:"#ffab5e",fontSize:22}} onClick={()=>setNoteModal(true)}>+</button>}
      </div>
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>

        {tab==="detail"&&<div style={{flex:1,overflowY:"auto" as const,background:"#0a0605"}}>
          <div style={secH}><span style={{fontSize:12,fontWeight:700,color:"#ffab5e",letterSpacing:"0.8px",textTransform:"uppercase" as const}}>Client Information</span></div>
          <div style={card}>
            <div style={cardTitle}>Primary Client</div>
            <DR label="Client" val={`${c.client.name} (${c.client.tag})`} ember/>
            <DR label="Contact" val={c.client.contact} ember/>
          </div>
          <div style={secH}><span style={{fontSize:12,fontWeight:700,color:"#ffab5e",letterSpacing:"0.8px",textTransform:"uppercase" as const}}>Case Detail</span></div>
          <div style={card}>
            {[["Case Type",c.caseType],["Manager",c.caseManager],["Date Referred",c.dateReferred],["Due Date",c.dueDate],["Adjuster",c.adjuster],["Employer",c.employer],["Injury Date",c.dateOfInjury],["Status",c.status],["Region",c.caseRegion],["Location",c.caseLocation]].map(([l,v])=><DR key={l} label={l} val={v}/>)}
          </div>
          <div style={secH}><span style={{fontSize:12,fontWeight:700,color:"#ffab5e",letterSpacing:"0.8px",textTransform:"uppercase" as const}}>Primary Subject</span></div>
          <div style={card}>
            {[["Full Name",c.subject.name],["Alias",c.subject.alias],["DOB",`${c.subject.dob} (Age ${c.subject.age})`],["Mobile",c.subject.phone],["Occupation",c.subject.occupation],["DL",c.subject.dl],["Employment",c.subject.employmentStatus],["Sex / Race",`${c.subject.sex} / ${c.subject.race}`]].map(([l,v])=><DR key={l} label={l} val={v} ember={l==="Mobile"}/>)}
          </div>
          <div style={card}><div style={cardTitle}>Address</div><div style={{padding:"10px 13px",fontSize:12,color:"#f5ede6"}}>{c.subject.address}</div></div>
          <div style={card}>
            <div style={cardTitle}>Injury & Assignment</div>
            {[["Type of Injury",c.subject.typeOfInjury],["Restrictions",c.subject.restrictions],["Assignment",c.subject.assignment],["Investigate",c.subject.investigate]].map(([l,v])=><DR key={l} label={l} val={v}/>)}
          </div>
          <div style={{height:20}}/>
        </div>}

        {tab==="report"&&<div style={{flex:1,overflowY:"auto" as const,background:"#0a0605",paddingTop:8}}>
          {c.reportSections.map(s=>(
            <div key={s} style={{display:"flex",justifyContent:"space-between",padding:"13px 16px",borderBottom:"1px solid rgba(255,106,26,0.07)"}}>
              <span style={{fontSize:14,color:"#f5ede6"}}>{s}</span>
              <span style={{fontSize:14,fontWeight:600,color:"rgba(245,237,230,0.55)"}}>0</span>
            </div>
          ))}
        </div>}

        {tab==="notes"&&<div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{flex:1,overflowY:"auto" as const,background:"#0a0605"}}>
            {c.notes.length===0
              ?<div style={{display:"flex",alignItems:"center",justifyContent:"center",height:100,color:"rgba(245,237,230,0.28)",fontSize:13}}>No notes yet.</div>
              :c.notes.map((n,i)=>(
                <div key={i} style={{background:"#0a0605",borderBottom:"1px solid rgba(255,106,26,0.07)",padding:"13px 16px"}}>
                  <div style={{fontSize:13,fontWeight:500,color:"#f5ede6",marginBottom:5}}>{n.preview}</div>
                  <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"rgba(245,237,230,0.28)"}}>{n.datetime}</span><span style={{fontSize:11,color:"#ffab5e"}}>{n.type}</span></div>
                </div>
              ))
            }
          </div>
          <div style={{background:"#140a06",borderTop:"1px solid rgba(255,106,26,0.28)",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
            <button onClick={toggleMic} style={{width:48,height:48,borderRadius:"50%",background:"linear-gradient(135deg,#ff6a1a,#ff3d00)",border:"none",color:"white",fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",boxShadow:"0 2px 14px rgba(255,61,0,0.3)",animation:recording?"pulse-ember 1s infinite":"none"}}>
              {recording?"⏹":"🎤"}
            </button>
            <div style={{flex:1,fontSize:12,color:"rgba(245,237,230,0.55)",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,106,26,0.18)",borderRadius:8,padding:"8px 11px",minHeight:36,lineHeight:1.4}}>
              {draft||(recording?"Escuchando...":"Toca el microfono para dictar una nota...")}
            </div>
            <button disabled={!draft.trim()} onClick={()=>{saveNote(draft,"Voice Note");setDraft("");recRef.current?.stop();setRecording(false);}}
              style={{background:draft.trim()?"linear-gradient(135deg,#ff6a1a,#ff3d00)":"rgba(255,255,255,0.07)",color:draft.trim()?"white":"rgba(245,237,230,0.28)",border:"none",borderRadius:8,padding:"8px 12px",fontSize:12,fontWeight:700 as const,flexShrink:0,cursor:draft.trim()?"pointer":"default"}}>
              Guardar
            </button>
          </div>
        </div>}

        {tab==="location"&&<div style={{flex:1,display:"flex",flexDirection:"column"}}>
          <div style={{flex:1,background:"#0d1a20",position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",left:0,right:0,top:"42%",height:2,background:"rgba(255,106,26,0.18)"}}/>
            <div style={{position:"absolute",left:0,right:0,top:"62%",height:1,background:"rgba(255,255,255,0.07)"}}/>
            <div style={{position:"absolute",left:0,right:0,top:"28%",height:1,background:"rgba(255,255,255,0.07)"}}/>
            <div style={{position:"absolute",top:0,bottom:0,left:"50%",width:4,background:"rgba(255,106,26,0.18)"}}/>
            <div style={{position:"absolute",top:0,bottom:0,left:"22%",width:1,background:"rgba(255,255,255,0.07)"}}/>
            <div style={{position:"absolute",top:0,bottom:0,left:"72%",width:1,background:"rgba(255,255,255,0.07)"}}/>
            <div style={{position:"absolute",top:"29%",left:"24%",width:"23%",height:"11%",background:"rgba(255,255,255,0.04)",borderRadius:2}}/>
            <div style={{position:"absolute",top:"29%",left:"52%",width:"18%",height:"11%",background:"rgba(255,255,255,0.04)",borderRadius:2}}/>
            <div style={{position:"absolute",top:"64%",left:"24%",width:"23%",height:"12%",background:"rgba(255,255,255,0.04)",borderRadius:2}}/>
            <div style={{position:"absolute",top:"29%",left:"74%",width:"22%",height:"30%",background:"rgba(50,100,60,0.3)",borderRadius:3}}/>
            <div style={{position:"absolute",left:"46%",top:"34%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{width:28,height:28,background:"linear-gradient(135deg,#ff6a1a,#ff3d00)",borderRadius:"50% 50% 50% 0",transform:"rotate(-45deg)",border:"2px solid rgba(255,255,255,0.9)",boxShadow:"0 2px 8px rgba(255,61,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{transform:"rotate(45deg)",fontSize:12}}>🏠</span>
              </div>
              <div style={{background:"#140a06",border:"1px solid rgba(255,106,26,0.28)",borderRadius:4,padding:"2px 7px",fontSize:10,fontWeight:600,color:"#f5ede6",marginTop:5,whiteSpace:"nowrap" as const}}>{c.subject.name.split(" ")[0]}</div>
            </div>
            <div style={{position:"absolute",left:"62%",top:"50%",display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{width:22,height:22,borderRadius:"50%",border:"2px solid #0a0605",background:"#7b1fa2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700,color:"white"}}>YD</div>
              <div style={{fontSize:9,fontWeight:600,color:"rgba(245,237,230,0.55)",background:"#140a06",borderRadius:3,padding:"1px 4px",marginTop:2,whiteSpace:"nowrap" as const}}>Yasmine</div>
            </div>
            <div style={{position:"absolute",right:12,bottom:12,display:"flex",flexDirection:"column",gap:4}}>
              {["+","−"].map(b=><div key={b} style={{width:32,height:32,background:"#140a06",border:"1px solid rgba(255,106,26,0.28)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:600,color:"rgba(245,237,230,0.55)",cursor:"pointer"}}>{b}</div>)}
            </div>
          </div>
          <div style={{background:"rgba(24,15,10,0.92)",border:"1px solid rgba(255,106,26,0.28)",margin:"10px 12px",borderRadius:10,padding:"11px 13px"}}>
            <div style={{fontSize:14,fontWeight:600,color:"#f5ede6",marginBottom:3}}>{c.caseLocation}</div>
            <div style={{fontSize:12,color:"rgba(245,237,230,0.55)"}}>{c.subject.address}</div>
            <span style={{display:"inline-flex",alignItems:"center",gap:4,background:"rgba(255,106,26,0.15)",color:"#ffab5e",fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:8,marginTop:7}}>📍 {c.subject.assignment}</span>
          </div>
        </div>}

        {tab==="photos"&&<div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0a0605",gap:10}}>
          <span style={{fontSize:44,color:"rgba(245,237,230,0.28)"}}>🖼</span>
          <p style={{fontSize:13,color:"rgba(245,237,230,0.28)"}}>No photos attached.</p>
        </div>}
      </div>

      <div style={{background:"#140a06",borderTop:"1px solid rgba(255,106,26,0.28)",display:"flex",flexShrink:0}}>
        {(["detail","report","notes","location","photos"] as Tab[]).map(t=>(
          <button key={t} style={navBtn(tab===t)} onClick={()=>setTab(t)}>
            <span style={{fontSize:20}}>{t==="detail"?"ℹ️":t==="report"?"📊":t==="notes"?"📝":t==="location"?"📍":"🖼"}</span>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {noteModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"flex-end",zIndex:20}}>
          <div style={{background:"#140a06",border:"1px solid rgba(255,106,26,0.5)",borderRadius:"18px 18px 0 0",padding:"20px 16px",width:"100%"}}>
            <div style={{fontSize:16,fontWeight:700,color:"#f5ede6",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              New Note<button style={{background:"none",border:"none",fontSize:19,color:"rgba(245,237,230,0.55)",cursor:"pointer"}} onClick={()=>setNoteModal(false)}>✕</button>
            </div>
            <textarea style={{...inp,height:90,resize:"none" as const,marginBottom:0}} placeholder="Field observation..." value={noteText} onChange={e=>setNoteText(e.target.value)}/>
            <div style={{display:"flex",gap:10,marginTop:10}}>
              <select style={{flex:1,padding:"10px 12px",fontSize:13,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,106,26,0.18)",borderRadius:10,color:"#f5ede6"}} value={noteType} onChange={e=>setNoteType(e.target.value)}>
                {["Field Note","Email","Phone","Observation"].map(t=><option key={t}>{t}</option>)}
              </select>
              <button style={{background:"linear-gradient(135deg,#ff6a1a,#ff3d00)",color:"white",border:"none",borderRadius:10,padding:"10px 18px",fontSize:13,fontWeight:700 as const,cursor:"pointer"}}
                onClick={()=>{saveNote(noteText,noteType);setNoteText("");setNoteModal(false);}}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

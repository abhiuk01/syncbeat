
import React,{useEffect,useRef,useState}from"react";
import{socket,serverUrl}from"./socket";
import{extractYouTubeId,thumb}from"./youtube";
import type{RoomState,ChatMessage,Song}from"./types";
import{Music2,Sun,Moon,LogIn,Plus,Play,Pause,SkipForward,Volume2,VolumeX,Maximize2,MessageCircle,Users,Mic,MicOff,Headphones,Copy,Crown,UserMinus,LogOut,Send,Smile,X,Radio,Wifi,Loader2,Shield,UserCog,GripVertical,MoreHorizontal,Heart,ThumbsUp,Sparkles,Settings,Volume1}from"lucide-react";

declare global{interface Window{YT:any;onYouTubeIframeAPIReady?:()=>void}}

const fmt=(n:number)=>{const s=Math.max(0,Math.floor(n||0));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")};

function App(){
 const [view,setView]=useState<"name"|"mode"|"create"|"join"|"solo"|"room">("name");
 const [room,setRoom]=useState<RoomState|null>(null),[chat,setChat]=useState<ChatMessage[]>([]);
 const [name,setName]=useState(()=>localStorage.getItem("syncbeat:name")||"");
 const [roomName,setRoomName]=useState("Friday Night Mix"),[password,setPassword]=useState("");
 const [joinCode,setJoinCode]=useState(()=>new URLSearchParams(location.search).get("room")?.toUpperCase()||"");
 const [joinPass,setJoinPass]=useState(""),[error,setError]=useState(""),[theme,setTheme]=useState<"dark"|"light">("dark"),[online,setOnline]=useState(false);

 useEffect(()=>{document.documentElement.classList.toggle("light",theme==="light")},[theme]);
 useEffect(()=>{
  const c=()=>setOnline(true),d=()=>setOnline(false);
  socket.on("connect",c);socket.on("disconnect",d);
  return()=>{socket.off("connect",c);socket.off("disconnect",d)};
 },[]);
 useEffect(()=>{
  const rs=(s:RoomState)=>{setRoom(s);setView("room");const q=new URLSearchParams();q.set("room",s.code);history.replaceState({}, "", location.pathname+"?"+q.toString())};
  const cm=(m:ChatMessage)=>setChat(x=>[...x,m].slice(-200));
  const cr=(x:any)=>setChat(c=>c.map(m=>m.id===x.id?{...m,reactions:x.reactions}:m));
  const k=()=>{setRoom(null);setView("mode");history.replaceState({},"",location.pathname);setError("You were removed from the room.")};
  socket.on("room:state",rs);socket.on("chat:message",cm);socket.on("chat:reaction",cr);socket.on("room:kicked",k);
  return()=>{socket.off("room:state",rs);socket.off("chat:message",cm);socket.off("chat:reaction",cr);socket.off("room:kicked",k)}
 },[]);

 const saveName=()=>{const n=name.trim();if(!n)return;setName(n);localStorage.setItem("syncbeat:name",n);setError("");setView("mode")};
 const create=()=>{setError("");socket.connect();socket.emit("room:create",{name:roomName,userName:name,password:password||undefined},(r:any)=>r?.error?setError(r.error):(setRoom(r.state),setChat([]),setView("room"),(()=>{const q=new URLSearchParams();q.set("room",r.state.code);history.replaceState({},"",location.pathname+"?"+q.toString())})()))};
 const join=()=>{setError("");socket.connect();socket.emit("room:join",{code:joinCode,userName:name,password:joinPass||undefined},(r:any)=>r?.error?setError(r.error):(setRoom(r.state),setChat(r.chat||[]),setView("room"),(()=>{const q=new URLSearchParams();q.set("room",r.state.code);history.replaceState({},"",location.pathname+"?"+q.toString())})()))};
 const goMode=()=>{setError("");setView("mode")};

 if(view==="room"&&room)return <Room room={room} chat={chat} theme={theme} setTheme={setTheme} onLeave={()=>{socket.disconnect();setRoom(null);setView("mode");history.replaceState({},"",location.pathname)}}/>;
 if(view==="solo")return <Solo name={name} theme={theme} setTheme={setTheme} onBack={goMode}/>;
 return <Home step={view==="name"?"name":view} name={name} setName={setName} saveName={saveName} roomName={roomName} setRoomName={setRoomName} password={password} setPassword={setPassword} joinCode={joinCode} setJoinCode={setJoinCode} joinPass={joinPass} setJoinPass={setJoinPass} create={create} join={join} error={error} theme={theme} setTheme={setTheme} online={online} onMode={setView}/>;
}

function Home(p:any){
 const invited=Boolean(p.joinCode);
 const isName=p.step==="name", isCreate=p.step==="create", isJoin=p.step==="join";
 return <div className="min-h-screen gradient-bg"><div className="noise"/>
  <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6"><button onClick={()=>p.step!=="name"&&p.onMode("mode")} className="rounded-xl"><Logo/></button><div className="flex items-center gap-3">{!isName&&<span className="hidden text-xs text-white/40 sm:block">{p.online?"Connected":"Ready to connect"}</span>}<button aria-label="Toggle theme" onClick={()=>p.setTheme(p.theme==="dark"?"light":"dark")} className="glass rounded-full p-2">{p.theme==="dark"?<Sun size={17}/>:<Moon size={17}/>}</button></div></header>
  <main className="mx-auto max-w-6xl px-5 pb-16 pt-8">
   {isName?<section className="mx-auto max-w-xl pt-10 text-center sm:pt-16">
    <div className="mx-auto mb-7 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-400 to-cyan-300 text-black shadow-2xl"><Music2 size={28}/></div>
    <p className="text-xs font-bold uppercase tracking-[.25em] text-violet-300/70">Welcome to SyncBeat</p>
    <h1 className="mt-4 text-5xl font-extrabold tracking-tight sm:text-6xl">What should we<br/><span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">call you?</span></h1>
    <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-white/45">Enter your name once. Then choose how you want to listen.</p>
    <div className="glass glow mx-auto mt-8 rounded-[28px] p-6 text-left sm:p-8">
      {p.error&&<div className="mb-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{p.error}</div>}
      <Field label="Your name"><input autoFocus value={p.name} onChange={e=>p.setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&p.saveName()} placeholder="e.g. Abhi" maxLength={32} className="input"/></Field>
      <button disabled={!p.name.trim()} onClick={p.saveName} className="action">Enter SyncBeat <LogIn size={17}/></button>
    </div>
   </section>:<section>
    <div className="mb-8 text-center"><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-semibold text-violet-200"><Radio size={13}/> {invited?"You have a room invite":"You're in"}</div>
     <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">Hey, {p.name} 👋</h1>
     <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-white/45">How do you want to listen today?</p>
    </div>
    {p.error&&<div className="mx-auto mb-5 max-w-4xl rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{p.error}</div>}
    {isCreate?<div className="mx-auto max-w-xl glass glow rounded-[28px] p-6 sm:p-8">
      <button onClick={()=>p.onMode("mode")} className="mb-5 inline-flex items-center gap-2 text-xs text-white/40 hover:text-white/70">← Back to listening modes</button>
      <h2 className="text-2xl font-bold">Create a private room</h2><p className="mt-1 text-xs text-white/35">You become the host and control shared playback.</p>
      <div className="mt-6"><Field label="Room name"><input autoFocus value={p.roomName} onChange={e=>p.setRoomName(e.target.value)} maxLength={60} className="input"/></Field><Field label="Password (optional)"><input type="password" value={p.password} onChange={e=>p.setPassword(e.target.value)} maxLength={100} className="input"/></Field><button disabled={!p.roomName.trim()} onClick={p.create} className="action">Create room <Plus size={17}/></button></div>
    </div>:isJoin?<div className="mx-auto max-w-xl glass glow rounded-[28px] p-6 sm:p-8">
      <button onClick={()=>p.onMode("mode")} className="mb-5 inline-flex items-center gap-2 text-xs text-white/40 hover:text-white/70">← Back to listening modes</button>
      <h2 className="text-2xl font-bold">Join a friend's room</h2><p className="mt-1 text-xs text-white/35">{invited?"The invite code is ready below.":"Enter the 6-character room code."}</p>
      <div className="mt-6"><Field label="Room code"><input autoFocus value={p.joinCode} maxLength={6} onChange={e=>p.setJoinCode(e.target.value.replace(/[^A-Za-z0-9]/g,"").toUpperCase())} placeholder="ABC123" className="input font-mono tracking-[.28em]"/></Field><Field label="Password (if required)"><input type="password" value={p.joinPass} onChange={e=>p.setJoinPass(e.target.value)} className="input"/></Field><button disabled={p.joinCode.length!==6} onClick={p.join} className="action">Join room <LogIn size={17}/></button></div>
    </div>:<div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-3">
      <ModeCard icon={<Headphones size={24}/>} label="Listen solo" title="Just me" text="Play YouTube videos privately with a clean player and no room setup." onClick={()=>p.onMode("solo")}/>
      <ModeCard featured icon={<Users size={24}/>} label="With friends" title="Create a room" text="Start a private room, invite friends, sync music, chat and use voice." onClick={()=>p.onMode("create")}/>
      <ModeCard icon={<LogIn size={24}/>} label="Have a code?" title="Join a room" text="Enter your friend's 6-character code and jump straight in." onClick={()=>p.onMode("join")}/>
    </div>}
    <div className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-2 text-[11px] text-white/30"><span className="glass rounded-full px-3 py-2">Official YouTube embeds</span><span className="glass rounded-full px-3 py-2">WebRTC voice</span><span className="glass rounded-full px-3 py-2">Private room codes</span></div>
   </section>}
  </main>
 </div>
}
function ModeCard({icon,label,title,text,onClick,featured=false}:{icon:React.ReactNode;label:string;title:string;text:string;onClick:()=>void;featured?:boolean}){
 return <button onClick={onClick} className={"group text-left glass rounded-[26px] p-6 transition duration-300 hover:-translate-y-1 hover:border-violet-300/30 hover:bg-white/[.05] "+(featured?"glow border-violet-300/20":"")}>
  <div className="flex items-center justify-between"><div className={"grid h-12 w-12 place-items-center rounded-2xl "+(featured?"bg-violet-400/15 text-violet-200":"bg-white/[.06] text-white/70")}>{icon}</div><span className="text-[10px] font-semibold uppercase tracking-[.2em] text-white/25">{label}</span></div>
  <h2 className="mt-8 text-xl font-bold">{title}</h2><p className="mt-2 min-h-[48px] text-sm leading-6 text-white/40">{text}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-white/65 transition group-hover:gap-3">Continue <span>→</span></span>
 </button>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="mb-4 block"><span className="mb-2 block text-xs font-semibold text-white/45">{label}</span>{children}</label>}
function Logo(){return <div className="flex items-center gap-2.5"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-400 to-cyan-300 text-black"><Music2 size={19}/></div><span className="text-lg font-extrabold">SyncBeat</span></div>}

function Solo({name,theme,setTheme,onBack}:{name:string;theme:"dark"|"light";setTheme:any;onBack:()=>void}){
 const mount=useRef<HTMLDivElement>(null),yt=useRef<any>(null),[url,setUrl]=useState(""),[videoId,setVideoId]=useState(""),[ready,setReady]=useState(false),[playing,setPlaying]=useState(false),[pos,setPos]=useState(0),[dur,setDur]=useState(0),[vol,setVol]=useState(70),[error,setError]=useState("");
 useEffect(()=>{const init=()=>{if(!mount.current||!videoId)return;setReady(false);yt.current?.destroy?.();yt.current=new window.YT.Player(mount.current,{videoId,playerVars:{playsinline:1,controls:0,rel:0},events:{onReady:(e:any)=>{setReady(true);setDur(e.target.getDuration());e.target.setVolume(vol)},onStateChange:(e:any)=>{setPlaying(e.data===1);if(e.data===0)setPlaying(false);if(e.data===-1)setError("This video cannot be embedded or is unavailable. Try another YouTube video.")}}})};if((window as any).YT?.Player)init();else window.onYouTubeIframeAPIReady=init;const t=setInterval(()=>{if(yt.current?.getCurrentTime){setPos(yt.current.getCurrentTime());setDur(yt.current.getDuration?.()||0)}},500);return()=>{clearInterval(t);yt.current?.destroy?.();yt.current=null}},[videoId]);
 const load=()=>{const id=extractYouTubeId(url);if(!id){setError("Paste a valid YouTube URL or 11-character video ID.");return}setError("");setVideoId(id)};
 return <div className="min-h-screen gradient-bg"><div className="noise"/><header className="sticky top-0 z-20 border-b border-white/[.06] bg-[#07080c]/80 backdrop-blur-xl"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3"><button onClick={onBack}><Logo/></button><div className="flex items-center gap-2"><span className="hidden text-xs text-white/35 sm:block">Listening solo • {name}</span><button onClick={()=>setTheme(theme==="dark"?"light":"dark")} className="rounded-lg border border-white/10 p-2">{theme==="dark"?<Sun size={16}/>:<Moon size={16}/>}</button></div></div></header>
  <main className="mx-auto max-w-5xl p-4 sm:p-6"><div className="mb-5"><button onClick={onBack} className="text-xs text-white/35 hover:text-white/60">← Listening modes</button><h1 className="mt-3 text-3xl font-extrabold">Listen solo</h1><p className="mt-1 text-sm text-white/35">Paste a YouTube link. SyncBeat uses the official YouTube player.</p></div>
   <div className="glass rounded-2xl p-3 sm:p-4"><div className="flex flex-col gap-2 sm:flex-row"><input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()} placeholder="https://youtube.com/watch?v=..." className="input flex-1"/><button onClick={load} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Load video</button></div>{error&&<div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</div>}</div>
   <div className="glass mt-4 overflow-hidden rounded-2xl"><div className="relative"><div ref={mount} className="yt-frame pointer-events-none"/>{!videoId&&<div className="absolute inset-0 grid place-items-center bg-[#090a0f]/70 p-6 text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[.05] text-white/50"><Music2/></div><p className="mt-3 text-sm text-white/50">Your video will appear here.</p></div></div>}{videoId&&!ready&&!error&&<div className="absolute inset-0 grid place-items-center bg-[#090a0f]/70"><Loader2 className="animate-spin text-white/50"/></div>}</div>
    <div className="p-4"><div className="flex items-center justify-between"><div className="text-xs text-white/35">{playing?"Playing":"Paused"}{videoId?" • "+videoId:""}</div><button disabled={!ready} onClick={()=>{if(playing)yt.current?.pauseVideo?.();else yt.current?.playVideo?.()}} className="grid h-10 w-10 place-items-center rounded-full bg-white text-black disabled:opacity-30">{playing?<Pause size={17}/>:<Play size={17} fill="currentColor"/>}</button></div><input disabled={!ready} type="range" min="0" max={dur||1} value={Math.min(pos,dur||1)} onChange={e=>{const v=Number(e.target.value);setPos(v);yt.current?.seekTo?.(v,true)}} className="range mt-3 w-full"/><div className="flex justify-between text-[11px] text-white/30"><span>{fmt(pos)}</span><span>{fmt(dur)}</span></div><div className="mt-3 flex items-center gap-3"><button onClick={()=>{const v=vol?0:70;setVol(v);yt.current?.setVolume?.(v)}}>{vol?<Volume2 size={17}/>:<VolumeX size={17}/>}</button><input aria-label="Volume" type="range" min="0" max="100" value={vol} onChange={e=>{const v=Number(e.target.value);setVol(v);yt.current?.setVolume?.(v)}} className="range w-28"/><button onClick={()=>yt.current?.getIframe?.()?.requestFullscreen?.()} className="ml-auto"><Maximize2 size={16}/></button></div></div>
   </div>
  </main></div>
}

function Room({room,chat,theme,setTheme,onLeave}:{room:RoomState;chat:ChatMessage[];theme:string;setTheme:any;onLeave:()=>void}){
 const[panel,setPanel]=useState<"chat"|"people">("chat");
 const[add,setAdd]=useState("");
 const[notice,setNotice]=useState("");
 const[low,setLow]=useState(false);
 const[settings,setSettings]=useState(false);
 const host=room.hostId===socket.id;
 const me=room.participants.find(p=>p.id===socket.id);
 const canControl=host||Boolean(me?.canControl);
 const invite=location.href;

 useEffect(()=>{
  const onKey=(e:KeyboardEvent)=>{
   if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement) return;
   if(e.code==="Space"&&canControl){e.preventDefault();socket.emit("player:action",{type:room.isPlaying?"pause":"play",position:room.position})}
   if(e.key.toLowerCase()==="c")document.getElementById("chat-input")?.focus();
   if(e.key.toLowerCase()==="m")socket.emit("voice:mute",!(me?.muted));
  };
  window.addEventListener("keydown",onKey);
  return()=>window.removeEventListener("keydown",onKey);
 },[canControl,room.isPlaying,room.position,me?.muted]);

 const flash=(text:string)=>{setNotice(text);window.setTimeout(()=>setNotice(""),1600)};
 const copy=async()=>{try{await navigator.clipboard.writeText(invite);flash("Invite link copied")}catch{flash(invite)}};
 const addSong=()=>{
  const id=extractYouTubeId(add);
  if(!id)return flash("Paste a valid YouTube URL or video ID");
  socket.emit("queue:add",{id,title:"YouTube video "+id,thumbnail:thumb(id),addedBy:me?.name||"Guest"});
  setAdd("");flash("Added to shared queue");
 };

 return <div className="min-h-screen gradient-bg">
  <div className="noise"/>
  <header className="sticky top-0 z-30 border-b border-white/[.06] bg-[#07080c]/85 backdrop-blur-xl">
   <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3">
    <button onClick={onLeave} aria-label="Leave room"><Logo/></button>
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2"><span className="truncate text-sm font-bold">{room.name}</span>{host&&<span className="inline-flex items-center gap-1 rounded-full bg-violet-400/10 px-2 py-1 text-[10px] font-semibold text-violet-200"><Shield size={11}/>HOST</span>}{canControl&&!host&&<span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold text-cyan-200"><UserCog size={11}/>DJ</span>}</div>
      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/35"><span className="font-mono">#{room.code}</span><span>•</span><span className="text-emerald-300">{room.participants.length} online</span></div>
    </div>
    <div className="hidden items-center gap-2 sm:flex">
      <button onClick={copy} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2 text-xs font-semibold hover:bg-white/[.06]"><Copy size={14}/>Share room</button>
      <button onClick={()=>setSettings(v=>!v)} aria-label="Room settings" className={"rounded-xl border border-white/10 p-2 "+(settings?"bg-white/[.08]":"bg-white/[.03]")}><Settings size={16}/></button>
      <button onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label="Toggle theme" className="rounded-xl border border-white/10 bg-white/[.03] p-2">{theme==="dark"?<Sun size={16}/>:<Moon size={16}/>}</button>
      <button onClick={onLeave} aria-label="Leave room" className="rounded-xl border border-red-400/10 bg-red-400/[.03] p-2 text-red-300"><LogOut size={16}/></button>
    </div>
    <button onClick={()=>setPanel(panel==="chat"?"people":"chat")} className="rounded-xl border border-white/10 bg-white/[.03] p-2 sm:hidden">{panel==="chat"?<Users size={16}/>:<MessageCircle size={16}/>}</button>
   </div>
  </header>

  {settings&&<div className="mx-auto max-w-[1500px] px-4 pt-4">
   <div className="glass rounded-2xl p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-violet-300/70">Room controls</p><p className="mt-1 text-sm text-white/45">Only the host and approved DJs can control shared playback.</p></div>
      <div className="flex items-center gap-2"><button onClick={copy} className="rounded-xl border border-white/10 px-3 py-2 text-xs">Copy invite</button><button onClick={()=>setSettings(false)} className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black">Done</button></div>
    </div>
   </div>
  </div>}

  <main className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[220px_minmax(0,1fr)_360px]">
   <aside className="glass hidden min-h-[760px] rounded-2xl p-3 lg:flex lg:flex-col">
    <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-3">
      <div className="text-[10px] font-bold uppercase tracking-[.18em] text-white/25">Room</div>
      <div className="mt-2 truncate text-sm font-bold">{room.name}</div>
      <div className="mt-1 font-mono text-xs text-white/25">#{room.code}</div>
    </div>
    <div className="mt-4 grid grid-cols-2 gap-2">
      <MiniStat label="Online" value={String(room.participants.length)}/>
      <MiniStat label="Queue" value={String(room.queue.length)}/>
    </div>
    <div className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-white/25">People</div>
    <div className="scrollbar mt-2 flex-1 overflow-y-auto">
      <People room={room} host={host}/>
    </div>
    <button onClick={copy} className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-3 py-2.5 text-xs font-semibold"><Copy size={14}/>Copy invite link</button>
    <button onClick={onLeave} className="mt-2 rounded-xl px-3 py-2.5 text-left text-xs text-red-300 hover:bg-red-400/[.05]">Leave room</button>
   </aside>

   <section className="min-w-0">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.22em] text-violet-300/65">Listening together</p><h1 className="mt-1 truncate text-xl font-extrabold sm:text-2xl">{room.current?.title||"Nothing is playing"}</h1></div>
      <div className="flex items-center gap-2 text-[10px] text-white/35"><span className="h-2 w-2 rounded-full bg-emerald-400"/>{room.participants.length} in room</div>
    </div>
    <Player room={room} control={canControl} low={low}/>
    
    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="glass rounded-2xl p-4">
       <div className="flex items-start justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-violet-300/65">Up next</p><h2 className="mt-1 text-base font-bold">Shared queue</h2><p className="mt-1 text-[11px] text-white/30">Anyone can add. Host/DJs decide what plays.</p></div>
        <span className="rounded-full border border-white/10 bg-white/[.03] px-2.5 py-1 text-[10px] font-mono text-white/45">{room.queue.length}</span>
       </div>
       <div className="mt-4 flex gap-2">
        <input value={add} onChange={e=>setAdd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSong()} placeholder="Paste YouTube URL or video ID" className="input flex-1"/>
        <button onClick={addSong} className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-violet-500/20"><Plus size={15}/>Add</button>
       </div>
       <div className="mt-3 space-y-1.5">{room.queue.length===0?<div className="rounded-xl border border-dashed border-white/10 py-10 text-center"><Music2 className="mx-auto text-white/20" size={22}/><p className="mt-2 text-xs text-white/30">No songs queued yet.</p><p className="mt-1 text-[10px] text-white/20">Paste a YouTube link above to add the first one.</p></div>:room.queue.map((s,i)=><QueueRow key={s.id+"-"+i} song={s} index={i} controller={canControl} host={host}/>)}</div>
      </section>

      <Voice low={low} setLow={setLow}/>
    </div>
   </section>

   <aside className={"glass flex min-h-[760px] flex-col overflow-hidden rounded-2xl "+(panel==="chat"?"":"hidden lg:flex")}>
    <div className="flex items-center justify-between border-b border-white/[.06] px-4 py-3">
      <div className="flex gap-1 rounded-xl bg-white/[.03] p-1">
        <button onClick={()=>setPanel("chat")} className={"inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold "+(panel==="chat"?"bg-white text-black":"text-white/45")}><MessageCircle size={14}/>Chat</button>
        <button onClick={()=>setPanel("people")} className={"inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold "+(panel==="people"?"bg-white text-black":"text-white/45")}><Users size={14}/>People</button>
      </div>
      <div className="text-[10px] text-white/25">{panel==="chat"?"Live messages":"Room members"}</div>
    </div>
    {panel==="chat"?<ChatBox chat={chat}/>:<div className="scrollbar flex-1 overflow-y-auto p-3"><People room={room} host={host}/></div>}
   </aside>
  </main>
  {notice&&<div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-[#151722] px-4 py-2 text-xs font-semibold shadow-2xl">{notice}</div>}
 </div>
}

function MiniStat({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-white/[.06] bg-white/[.02] p-2.5"><p className="text-[9px] uppercase tracking-[.12em] text-white/25">{label}</p><p className="mt-1 text-sm font-bold">{value}</p></div>}

function QueueRow({song,index,controller,host}:{song:Song;index:number;controller:boolean;host:boolean}){
 return <div draggable={controller} onDragStart={e=>e.dataTransfer.setData("text/plain",String(index))} onDragOver={e=>e.preventDefault()} onDrop={e=>{if(!controller)return;const from=Number(e.dataTransfer.getData("text/plain"));if(Number.isInteger(from)&&from!==index)socket.emit("queue:reorder",{from,to:index})}} className="group flex items-center gap-3 rounded-xl border border-transparent p-2.5 hover:border-white/[.06] hover:bg-white/[.025]">
   {controller?<GripVertical className="shrink-0 text-white/20" size={15}/>:<div className="w-[15px] shrink-0 text-center text-[10px] text-white/20">{index+1}</div>}
   <img src={song.thumbnail} className="h-11 w-20 shrink-0 rounded-lg object-cover" alt=""/>
   <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{song.title}</p><p className="mt-1 truncate text-[10px] text-white/30">Added by {song.addedBy}</p></div>
   {controller&&<div className="flex items-center gap-1 opacity-80"><button onClick={()=>socket.emit("player:action",{type:"load",song,index,removeFromQueue:true})} title="Play next" className="rounded-lg p-2 hover:bg-white/[.06]"><Play size={14}/></button>{(host||controller)&&<button onClick={()=>socket.emit("queue:remove",index)} title="Remove" className="rounded-lg p-2 text-red-300/70 hover:bg-red-400/[.06]"><X size={14}/></button>}</div>}
 </div>
}

function Player({room,control,low}:{room:RoomState;control:boolean;low:boolean}){
 const mount=useRef<HTMLDivElement>(null),yt=useRef<any>(null);
 const[ready,setReady]=useState(false),[pos,setPos]=useState(room.position),[dur,setDur]=useState(0),[vol,setVol]=useState(70),[err,setErr]=useState("");
 const applying=useRef(false);
 useEffect(()=>{
  setErr("");setReady(false);
  const init=()=>{
   if(!mount.current||!room.current)return;
   yt.current?.destroy?.();
   yt.current=new window.YT.Player(mount.current,{videoId:room.current.id,playerVars:{playsinline:1,controls:0,rel:0,modestbranding:1,disablekb:1},events:{
    onReady:(e:any)=>{setReady(true);setDur(e.target.getDuration()||0);e.target.setVolume(vol);e.target.seekTo(room.position,true);if(room.isPlaying)e.target.playVideo?.()},
    onStateChange:(e:any)=>{if(e.data===0&&control)socket.emit("player:action",{type:"ended"});if(e.data===-1)setErr("YouTube could not play this video here. Choose another video.")}
   }});
  };
  if((window as any).YT?.Player)init();else window.onYouTubeIframeAPIReady=init;
  const timer=window.setInterval(()=>{const p=yt.current;if(p?.getCurrentTime){const now=p.getCurrentTime();setPos(now);if(control&&p.getPlayerState?.()===1)socket.emit("player:action",{type:"seek",position:now})}},2500);
  return()=>{window.clearInterval(timer);yt.current?.destroy?.();yt.current=null};
 },[room.current?.id]);
 useEffect(()=>{
  if(!ready||!yt.current||!room.current)return;
  const local=yt.current.getCurrentTime?.()||0;
  applying.current=true;
  if(Math.abs(local-room.position)>1.4)yt.current.seekTo(room.position,true);
  if(room.isPlaying)yt.current.playVideo?.();else yt.current.pauseVideo?.();
  setTimeout(()=>{applying.current=false},250);
 },[ready,room.isPlaying,room.position,room.current?.id]);

 const toggle=()=>{if(!control)return;socket.emit("player:action",{type:room.isPlaying?"pause":"play",position:pos})};
 const seek=(v:number)=>{setPos(v);if(control){yt.current?.seekTo?.(v,true);socket.emit("player:action",{type:"seek",position:v})}};
 const next=()=>{if(control)socket.emit("player:action",{type:"next"})};

 return <div className="glass overflow-hidden rounded-2xl">
   <div className="relative">
    <div ref={mount} className="yt-frame"/>
    {(!ready||err)&&<div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#090a0f]/75 p-6 text-center">{err?<div><div className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-red-400/10 text-red-300"><X/></div><p className="mt-3 text-sm text-white/70">{err}</p><p className="mt-2 text-xs text-white/30">Embedding can be disabled by the owner, or the video can be private, restricted or unavailable.</p></div>:<Loader2 className="animate-spin text-white/45"/>}</div>}
   </div>
   <div className="p-4 sm:p-5">
     <div className="flex items-center justify-between gap-3">
       <div className="min-w-0"><p className="text-[10px] uppercase tracking-[.18em] text-white/25">Player</p><p className="mt-1 text-xs font-semibold text-white/60">{control?"You have DJ control":"Playback is controlled by the host / DJ"}</p></div>
       <div className="flex items-center gap-1.5"><button disabled={!control} onClick={()=>seek(Math.max(0,pos-10))} className="rounded-xl border border-white/10 px-2.5 py-2 text-[10px] font-bold disabled:opacity-25">−10</button><button disabled={!control} onClick={toggle} className="grid h-11 w-11 place-items-center rounded-full bg-white text-black shadow-lg disabled:opacity-25">{room.isPlaying?<Pause size={17}/>:<Play size={17} fill="currentColor"/>}</button><button disabled={!control} onClick={()=>seek(Math.min(dur,pos+10))} className="rounded-xl border border-white/10 px-2.5 py-2 text-[10px] font-bold disabled:opacity-25">+10</button><button disabled={!control||!room.queue.length} onClick={next} title="Next track" className="rounded-xl border border-white/10 p-2 disabled:opacity-25"><SkipForward size={15}/></button></div>
     </div>
     <div className="mt-4 flex items-center gap-2 text-[10px] text-white/30"><span>{fmt(pos)}</span><input disabled={!control} aria-label="Playback position" type="range" min="0" max={dur||1} value={Math.min(pos,dur||1)} onChange={e=>seek(Number(e.target.value))} className="range w-full"/><span>{fmt(dur)}</span></div>
     <div className="mt-3 flex items-center gap-2"><Volume1 size={14} className="text-white/35"/><input aria-label="Personal volume" type="range" min="0" max="100" value={vol} onChange={e=>{const v=Number(e.target.value);setVol(v);yt.current?.setVolume?.(v)}} className="range w-32"/><span className="text-[10px] text-white/25">Personal volume</span><span className="ml-auto text-[10px] text-emerald-300/70">{room.isPlaying?"Playing in sync":"Paused for everyone"}</span></div>
   </div>
 </div>
}

function ChatBox({chat}:{chat:ChatMessage[]}){
 const[text,setText]=useState(""),[typing,setTyping]=useState(""),[picker,setPicker]=useState(false);
 const bottom=useRef<HTMLDivElement>(null);
 useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"})},[chat,typing]);
 useEffect(()=>{const onTyping=(x:any)=>setTyping(x?.typing?x?.name||"Someone":"");socket.on("chat:typing",onTyping);return()=>socket.off("chat:typing",onTyping)},[]);
 const send=()=>{if(text.trim()){socket.emit("chat:send",text);setText("");socket.emit("chat:typing",false)}};
 const react=(id:string,key:string)=>socket.emit("chat:react",{id,emoji:key});
 const chips=[["heart",<Heart size={12}/>],["like",<ThumbsUp size={12}/>],["spark",<Sparkles size={12}/>]];
 const pickerItems=[["❤️","heart"],["👍","like"],["✨","spark"],["👏","clap"],["🔥","fire"],["😂","laugh"]];
 return <div className="flex min-h-0 flex-1 flex-col">
  <div className="scrollbar flex-1 overflow-y-auto p-4">
   {chat.length===0?<div className="grid h-full min-h-[300px] place-items-center text-center"><div><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[.03] text-white/20"><MessageCircle/></div><p className="mt-3 text-sm font-semibold text-white/45">Start the conversation</p><p className="mt-1 text-xs text-white/25">Messages are live for everyone in this room.</p></div></div>:chat.map(m=><div key={m.id} className={"mb-4 "+(m.userId==="system"?"text-center":"")}>
     <div className="flex items-center gap-2"><span className={"text-[11px] font-semibold "+(m.userId==="system"?"text-violet-200/60":"text-white/80")}>{m.name}</span>{m.userId!=="system"&&<span className="text-[9px] text-white/20">{new Date(m.ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</span>}</div>
     <div className={"mt-1 rounded-xl px-3 py-2 text-xs leading-5 "+(m.userId==="system"?"text-white/30":"border border-white/[.05] bg-white/[.025] text-white/65")}>{m.text}</div>
     {m.userId!=="system"&&<div className="mt-1.5 flex items-center gap-1">{Object.entries(m.reactions).filter(([,v])=>v.length).map(([key,v])=><button key={key} onClick={()=>react(m.id,key)} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[.03] px-2 py-1 text-[9px] text-white/60"><span>{key==="heart"?"♥":key==="like"?"👍":key==="spark"?"✦":key==="clap"?"👏":key==="fire"?"🔥":"😂"}</span>{v.length}</button>)}<div className="relative"><button onClick={()=>setPicker(p=>!p)} title="Add reaction" className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-1 text-[9px] text-white/35"><Smile size={11}/>React</button>{picker&&<div className="absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-xl border border-white/10 bg-[#151722] p-2 shadow-2xl">{pickerItems.map(([symbol,key])=><button key={key} onClick={()=>{react(m.id,key);setPicker(false)}} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/[.06]">{symbol}</button>)}</div>}</div></div>}
   </div>)}
   <div ref={bottom}/>
   {typing&&<div className="text-[10px] text-white/25">{typing} is typing…</div>}
  </div>
  <div className="border-t border-white/[.06] p-3">
   <div className="flex gap-2"><input id="chat-input" value={text} onChange={e=>{setText(e.target.value);socket.emit("chat:typing",Boolean(e.target.value.trim()))}} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Message the room…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.03] px-3 py-3 text-xs outline-none focus:border-violet-300/40"/><button onClick={send} aria-label="Send message" className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500 text-white shadow-lg shadow-violet-500/20"><Send size={15}/></button></div>
  </div>
 </div>
}

function People({room,host}:{room:RoomState;host:boolean}){
 return <div className="space-y-1.5">{room.participants.map(p=>{
  const self=p.id===socket.id;
  return <div key={p.id} className="group rounded-xl border border-transparent p-2.5 hover:border-white/[.06] hover:bg-white/[.025]">
   <div className="flex items-center gap-3">
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-400/30 to-cyan-300/20 text-xs font-bold text-white">{p.name.slice(0,1).toUpperCase()}</div>
    <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{p.name}{self?" (you)":""}</p><div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] text-white/25">{p.isHost&&<span className="inline-flex items-center gap-1 text-amber-300"><Crown size={10}/>Host</span>}{p.canControl&&!p.isHost&&<span className="inline-flex items-center gap-1 text-cyan-300"><UserCog size={10}/>DJ</span>}{p.voiceJoined&&<span className="inline-flex items-center gap-1 text-emerald-300/70"><Mic size={9}/>Voice</span>}{p.muted&&<span className="text-red-300">Muted</span>}</div></div>
    {host&&!self&&<button title="Participant actions" onClick={()=>socket.emit("participant:set-control",p.id)} className={"rounded-lg border border-white/10 p-2 text-white/45 hover:bg-white/[.06] "+(p.canControl?"bg-cyan-400/10 text-cyan-200":"")}><UserCog size={14}/></button>}
   </div>
   {host&&!self&&<div className="mt-2 hidden gap-2 group-hover:flex"><button onClick={()=>socket.emit("participant:set-control",p.id)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px]">{p.canControl?"Remove DJ power":"Give DJ power"}</button><button onClick={()=>socket.emit("host:transfer",p.id)} className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[9px]">Make host</button><button onClick={()=>socket.emit("participant:kick",p.id)} className="rounded-lg border border-red-400/10 px-2.5 py-1.5 text-[9px] text-red-300">Remove</button></div>}
  </div>
 })}</div>
}


function Voice({low,setLow}:{low:boolean;setLow:any}){
 const[joined,setJoined]=useState(false),[muted,setMuted]=useState(false),[deaf,setDeaf]=useState(false),[error,setError]=useState(""),[ptt,setPtt]=useState(false),[speaking,setSpeaking]=useState(false),[peerIds,setPeerIds]=useState<string[]>([]),[volumes,setVolumes]=useState<Record<string,number>>({});
 const local=useRef<MediaStream|null>(null),peers=useRef<Record<string,RTCPeerConnection>>({}),audios=useRef<Record<string,HTMLAudioElement>>({});
 const cfg=useRef<RTCConfiguration>({iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:stun1.l.google.com:19302"}]});
 const deafRef=useRef(deaf),volRef=useRef(volumes),pttRef=useRef(ptt),speakingRef=useRef(speaking),mutedRef=useRef(muted);
 useEffect(()=>{deafRef.current=deaf;Object.values(audios.current).forEach(a=>a.muted=deaf)},[deaf]);
 useEffect(()=>{volRef.current=volumes;Object.entries(audios.current).forEach(([id,a])=>a.volume=(volumes[id]??100)/100)},[volumes]);
 useEffect(()=>{pttRef.current=ptt;speakingRef.current=speaking;mutedRef.current=muted;local.current?.getAudioTracks().forEach(t=>t.enabled=ptt?(!muted&&speaking):!muted)},[ptt,speaking,muted]);

 useEffect(()=>{
  fetch(serverUrl+"/config").then(r=>r.json()).then(x=>{if(Array.isArray(x.stunUrls)&&x.stunUrls.length)cfg.current={iceServers:x.stunUrls.map((u:string)=>({urls:u}))}}).catch(()=>{});

  const makePeer=(peerId:string)=>{
   if(peers.current[peerId])return peers.current[peerId];
   const pc=new RTCPeerConnection(cfg.current);
   local.current?.getTracks().forEach(track=>pc.addTrack(track,local.current!));
   pc.onicecandidate=e=>{if(e.candidate)socket.emit("voice:signal",{peerId,data:{candidate:e.candidate}})};
   pc.onconnectionstatechange=()=>{if(["failed","closed","disconnected"].includes(pc.connectionState)){pc.close();delete peers.current[peerId];audios.current[peerId]?.remove();delete audios.current[peerId];setPeerIds(ids=>ids.filter(id=>id!==peerId))}};
   pc.ontrack=e=>{
    let audio=audios.current[peerId];
    if(!audio){audio=new Audio();audio.autoplay=true;audio.playsInline=true;audios.current[peerId]=audio}
    audio.srcObject=e.streams[0];
    audio.muted=deafRef.current;
    audio.volume=(volRef.current[peerId]??100)/100;
    audio.play().catch(()=>{});
    setPeerIds(ids=>ids.includes(peerId)?ids:[...ids,peerId]);
   };
   peers.current[peerId]=pc;
   return pc;
  };

  const onSignal=async({peerId,data}:any)=>{
   if(!local.current||!peerId)return;
   const pc=makePeer(peerId);
   try{
    if(data?.type==="offer"){
      await pc.setRemoteDescription(data);
      const answer=await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit("voice:signal",{peerId,data:pc.localDescription});
    }else if(data?.type==="answer"){
      await pc.setRemoteDescription(data);
    }else if(data?.candidate){
      await pc.addIceCandidate(data.candidate);
    }
   }catch{}
  };

  const onPeers=async({peerIds:ids}:any)=>{
   if(!local.current||!Array.isArray(ids))return;
   for(const id of ids){
    const pc=makePeer(id);
    try{
      const offer=await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("voice:signal",{peerId:id,data:pc.localDescription});
    }catch{}
   }
  };

  const onLeft=({peerId}:any)=>{
   peers.current[peerId]?.close();
   delete peers.current[peerId];
   audios.current[peerId]?.remove();
   delete audios.current[peerId];
   setPeerIds(ids=>ids.filter(id=>id!==peerId));
  };

  socket.on("voice:signal",onSignal);
  socket.on("voice:peers",onPeers);
  socket.on("voice:peer-left",onLeft);
  return()=>{
   socket.off("voice:signal",onSignal);
   socket.off("voice:peers",onPeers);
   socket.off("voice:peer-left",onLeft);
   Object.values(peers.current).forEach(pc=>pc.close());
   peers.current={};
   Object.values(audios.current).forEach(a=>a.remove());
   audios.current={};
  };
 },[]);

 const setTrackState=(enabled:boolean)=>local.current?.getAudioTracks().forEach(track=>track.enabled=enabled);

 const join=async()=>{
  setError("");
  if(!navigator.mediaDevices?.getUserMedia){setError("This browser does not support microphone access.");return}
  try{
   local.current=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   setTrackState(!muted&&!ptt);
   socket.emit("voice:join");
   setJoined(true);
  }catch(e:any){
   setError(e?.name==="NotAllowedError"?"Microphone permission was denied. Allow microphone access and try again.":"Could not access your microphone. Check browser permissions.");
  }
 };

 const leave=()=>{
  local.current?.getTracks().forEach(t=>t.stop());
  local.current=null;
  Object.values(peers.current).forEach(pc=>pc.close());
  peers.current={};
  Object.values(audios.current).forEach(a=>a.remove());
  audios.current={};
  setPeerIds([]);
  socket.emit("voice:leave");
  setJoined(false);
  setSpeaking(false);
 };

 const toggleMute=()=>{
  if(!local.current)return;
  const next=!muted;
  setMuted(next);
  if(!ptt)setTrackState(!next);
  socket.emit("voice:mute",next);
 };

 useEffect(()=>{
  const down=(e:KeyboardEvent)=>{
   if(!ptt||!joined||muted)return;
   if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;
   if(e.key.toLowerCase()==="v"){e.preventDefault();setSpeaking(true)}
  };
  const up=(e:KeyboardEvent)=>{if(e.key.toLowerCase()==="v")setSpeaking(false)};
  window.addEventListener("keydown",down);window.addEventListener("keyup",up);
  return()=>{window.removeEventListener("keydown",down);window.removeEventListener("keyup",up)};
 },[ptt,joined,muted]);

 return <section className="glass rounded-2xl p-4">
  <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-300/60">Live voice</p><h2 className="mt-1 text-base font-bold">Talk together</h2></div><span className={"rounded-full border px-2.5 py-1 text-[9px] font-semibold "+(joined?"border-emerald-400/20 text-emerald-300":"border-white/10 text-white/30")}>{joined?"ON":"OFF"}</span></div>
  <div className="mt-4 rounded-xl border border-white/[.06] bg-white/[.02] p-3">
   <p className="text-[10px] text-white/35">Peer-to-peer WebRTC audio • public STUN for development</p>
   <div className="mt-3 flex gap-2">
    <button onClick={joined?leave:join} className="flex-1 rounded-xl bg-violet-500 px-3 py-2.5 text-xs font-bold">{joined?"Leave voice":"Join voice"}</button>
    <button disabled={!joined} onClick={toggleMute} className={"rounded-xl border border-white/10 p-2.5 disabled:opacity-25 "+(muted?"bg-red-400/10 text-red-200":"")} title="Mute microphone">{muted?<MicOff size={15}/>:<Mic size={15}/>}</button>
    <button disabled={!joined} onClick={()=>setDeaf(v=>!v)} className={"rounded-xl border border-white/10 p-2.5 disabled:opacity-25 "+(deaf?"bg-red-400/10":"")} title="Deafen"><Headphones size={15}/></button>
   </div>
   <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={!joined} onClick={()=>setPtt(v=>!v)} className={"rounded-lg border border-white/10 px-2.5 py-2 text-[10px] disabled:opacity-25 "+(ptt?"bg-cyan-400/10 text-cyan-200":"")}>{ptt?"Push-to-talk: V":"Normal microphone"}</button><label className="flex items-center gap-2 rounded-lg border border-white/10 px-2.5 py-2 text-[10px] text-white/35"><input type="checkbox" checked={low} onChange={e=>setLow(e.target.checked)}/>Low bandwidth</label></div>
  </div>
  {ptt&&joined&&<div className={"mt-3 rounded-xl border px-3 py-2 text-center text-[10px] "+(speaking?"border-emerald-400/20 bg-emerald-400/10 text-emerald-200":"border-white/10 text-white/30")}>{speaking?"Talking — release V to stop":"Hold V to talk"}</div>}
  {error&&<div className="mt-3 rounded-xl border border-red-400/15 bg-red-400/10 p-2.5 text-[10px] leading-4 text-red-200">{error}</div>}
  {joined&&peerIds.length>0&&<div className="mt-3 space-y-2"><p className="text-[9px] font-bold uppercase tracking-[.15em] text-white/25">Participant volumes</p>{peerIds.map(id=><div key={id} className="flex items-center gap-2 rounded-lg border border-white/[.05] px-2.5 py-2"><Volume2 size={12} className="text-white/25"/><span className="min-w-0 flex-1 truncate text-[10px] text-white/40">User {id.slice(0,6)}</span><input aria-label="Participant volume" type="range" min="0" max="100" value={volumes[id]??100} onChange={e=>setVolumes(v=>({...v,[id]:Number(e.target.value)}))} className="range w-20"/></div>)}</div>}
  {joined&&peerIds.length===0&&<p className="mt-3 text-[10px] text-white/25">No other voice participants yet.</p>}
  <p className="mt-3 text-[10px] leading-4 text-white/20">For production voice, add a TURN server for restrictive NAT/firewall networks.</p>
 </section>
}

export default App;

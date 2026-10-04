
import express from"express";
import{createServer}from"http";
import{Server}from"socket.io";
import{z}from"zod";
import crypto from"crypto";
import path from"path";
import{fileURLToPath}from"url";

const __filename=fileURLToPath(import.meta.url),__dirname=path.dirname(__filename);
const clientDist=path.resolve(__dirname,"../../client/dist");
const app=express(),http=createServer(app);
const port=Number(process.env.PORT||3001);
const allowed=process.env.CLIENT_ORIGIN||true;
const io=new Server(http,{cors:{origin:allowed,methods:["GET","POST"]},maxHttpBufferSize:1e6});
app.use(express.json({limit:"100kb"}));
app.use(express.static(clientDist));
const rooms=new Map<string,Room>();
type Song={id:string;title:string;thumbnail:string;duration?:number;addedBy:string};
type Participant={id:string;name:string;isHost:boolean;voiceJoined:boolean;muted:boolean};
type Chat={id:string;userId:string;name:string;text:string;ts:number;reactions:Record<string,string[]>};
type Room={code:string;name:string;passwordHash?:string;hostId:string;participants:Map<string,Participant>;queue:Song[];current:Song|null;isPlaying:boolean;position:number;updatedAt:number;chat:Chat[]};

const roomSchema=z.object({name:z.string().trim().min(1).max(60),userName:z.string().trim().min(1).max(32),password:z.string().max(100).optional()});
const joinSchema=z.object({code:z.string().trim().regex(/^[A-Z0-9]{6}$/),userName:z.string().trim().min(1).max(32),password:z.string().max(100).optional()});
const textSchema=z.string().trim().min(1).max(500);
const songSchema=z.object({id:z.string().regex(/^[A-Za-z0-9_-]{11}$/),title:z.string().trim().min(1).max(160),thumbnail:z.string().url().max(500),duration:z.number().int().min(0).max(86400).optional(),addedBy:z.string().trim().min(1).max(32)});
const limits=new Map<string,{at:number;count:number}>();
const ok=(id:string,max=30)=>{const n=Date.now(),r=limits.get(id);if(!r||n-r.at>60000){limits.set(id,{at:n,count:1});return true}r.count++;return r.count<=max};
const hash=(p:string)=>crypto.createHash("sha256").update(p).digest("hex");
const makeCode=()=>{let c="";do c=crypto.randomBytes(4).toString("base64url").slice(0,6).toUpperCase();while(rooms.has(c));return c};
const pub=(r:Room)=>({code:r.code,name:r.name,hasPassword:!!r.passwordHash,hostId:r.hostId,participants:[...r.participants.values()],queue:r.queue,current:r.current,isPlaying:r.isPlaying,position:r.position,updatedAt:r.updatedAt});
const emitState=(r:Room)=>io.to(r.code).emit("room:state",pub(r));
const system=(r:Room,text:string)=>io.to(r.code).emit("chat:message",{id:crypto.randomUUID(),userId:"system",name:"SyncBeat",text,ts:Date.now(),reactions:{}});

app.get("/health",(_,res)=>res.json({ok:true,rooms:rooms.size}));
app.get("/config",(_,res)=>res.json({stunUrls:(process.env.STUN_URLS||"stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302").split(",").filter(Boolean)}));

io.on("connection",s=>{
 s.on("keepalive",()=>{});
 s.on("room:create",(raw:any,ack:any)=>{if(!ok(s.id,10))return ack({error:"Too many requests"});const p=roomSchema.safeParse(raw);if(!p.success)return ack({error:"Invalid room details"});const c=makeCode();const r:Room={code:c,name:p.data.name,hostId:s.id,passwordHash:p.data.password?hash(p.data.password):undefined,participants:new Map([[s.id,{id:s.id,name:p.data.userName,isHost:true,voiceJoined:false,muted:false}]]),queue:[],current:null,isPlaying:false,position:0,updatedAt:Date.now(),chat:[]};rooms.set(c,r);s.join(c);s.data.roomCode=c;s.data.name=p.data.userName;ack({state:pub(r)})});
 s.on("room:join",(raw:any,ack:any)=>{if(!ok(s.id,10))return ack({error:"Too many requests"});const p=joinSchema.safeParse(raw);if(!p.success)return ack({error:"Invalid room code or name"});const r=rooms.get(p.data.code);if(!r)return ack({error:"Room not found"});if(r.passwordHash&&hash(p.data.password||"")!==r.passwordHash)return ack({error:"Incorrect room password"});r.participants.set(s.id,{id:s.id,name:p.data.userName,isHost:false,voiceJoined:false,muted:false});s.join(r.code);s.data.roomCode=r.code;s.data.name=p.data.userName;ack({state:pub(r),chat:r.chat.slice(-100)});system(r,p.data.userName+" joined the room");emitState(r)});
 const get=()=>s.data.roomCode?rooms.get(s.data.roomCode):undefined;
 s.on("sync:request",()=>{const r=get();if(r)s.emit("room:state",pub(r))});
 s.on("player:action",(a:any)=>{const r=get();if(!r||r.hostId!==s.id||!ok(s.id,60))return;if(a?.type==="play")r.isPlaying=true;else if(a?.type==="pause")r.isPlaying=false;else if(a?.type==="seek"&&Number.isFinite(a.position))r.position=Math.max(0,a.position);else if(a?.type==="load"&&songSchema.safeParse(a.song).success){r.current=a.song;r.position=0;r.isPlaying=false;system(r,"Now playing: "+a.song.title)}else if(a?.type==="ended"){if(r.queue.length){r.current=r.queue.shift()!;r.position=0;r.isPlaying=true;system(r,"Now playing: "+r.current.title)}else r.isPlaying=false}r.updatedAt=Date.now();emitState(r)});
 s.on("queue:add",(raw:any)=>{const r=get();if(!r||!ok(s.id,30))return;const p=songSchema.safeParse(raw);if(!p.success)return;r.queue.push(p.data);emitState(r)});
 s.on("queue:remove",(i:number)=>{const r=get();if(!r||r.hostId!==s.id||!ok(s.id,30)||!Number.isInteger(i))return;r.queue.splice(i,1);emitState(r)});
 s.on("queue:reorder",(from:number,to:number)=>{const r=get();if(!r||r.hostId!==s.id||!ok(s.id,30)||from<0||to<0||from>=r.queue.length||to>=r.queue.length)return;const[x]=r.queue.splice(from,1);r.queue.splice(to,0,x);emitState(r)});
 s.on("chat:send",(text:string)=>{const r=get();if(!r||!ok(s.id,15))return;const p=textSchema.safeParse(text);if(!p.success)return;const m={id:crypto.randomUUID(),userId:s.id,name:s.data.name,text:p.data,ts:Date.now(),reactions:{}};r.chat.push(m);r.chat=r.chat.slice(-200);io.to(r.code).emit("chat:message",m)});
 s.on("chat:typing",(typing:boolean)=>{const r=get();if(r)s.to(r.code).emit("chat:typing",{userId:s.id,name:s.data.name,typing:!!typing})});
 s.on("chat:react",(p:any)=>{const r=get();if(!r)return;const m=r.chat.find(x=>x.id===p?.id),emoji=typeof p?.emoji==="string"?p.emoji.slice(0,8):"";if(!m||!emoji)return;(m.reactions[emoji]??=[]);const a=m.reactions[emoji],i=a.indexOf(s.id);if(i>=0)a.splice(i,1);else if(a.length<100)a.push(s.id);io.to(r.code).emit("chat:reaction",{id:m.id,reactions:m.reactions})});
 s.on("voice:join",()=>{const r=get();if(!r)return;const p=r.participants.get(s.id);if(p)p.voiceJoined=true;emitState(r);s.to(r.code).emit("voice:peer-joined",{peerId:s.id})});
 s.on("voice:leave",()=>{const r=get();if(!r)return;const p=r.participants.get(s.id);if(p)p.voiceJoined=false;emitState(r);s.to(r.code).emit("voice:peer-left",{peerId:s.id})});
 s.on("voice:signal",(d:any)=>{const r=get();if(r&&typeof d?.peerId==="string")io.to(d.peerId).emit("voice:signal",{peerId:s.id,data:d.data})});
 s.on("voice:mute",(muted:boolean)=>{const r=get();if(!r)return;const p=r.participants.get(s.id);if(p)p.muted=!!muted;system(r,(p?.name||"Someone")+" "+(muted?"muted":"unmuted")+" voice");emitState(r)});
 s.on("host:transfer",(id:string)=>{const r=get();if(!r||r.hostId!==s.id||!r.participants.has(id))return;r.hostId=id;for(const p of r.participants.values())p.isHost=p.id===id;system(r,(r.participants.get(id)?.name||"Participant")+" is now the host");emitState(r)});
 s.on("participant:kick",(id:string)=>{const r=get();if(!r||r.hostId!==s.id||id===s.id)return;const t=io.sockets.sockets.get(id);if(t){t.emit("room:kicked");t.leave(r.code);t.data.roomCode=undefined}r.participants.delete(id);system(r,"A participant was removed by the host");emitState(r)});
 s.on("disconnect",()=>{const r=get();if(!r)return;const wasHost=r.hostId===s.id;r.participants.delete(s.id);if(wasHost){const n=r.participants.values().next().value;if(n){r.hostId=n.id;for(const p of r.participants.values())p.isHost=p.id===n.id;system(r,n.name+" is now the host")}else{rooms.delete(r.code);return}}system(r,(s.data.name||"Someone")+" left the room");emitState(r)})
});
app.get("*",(req,res)=>{if(req.path==="/health"||req.path==="/config")return res.end();res.sendFile(path.join(clientDist,"index.html"))});
http.listen(port,"0.0.0.0",()=>console.log("SyncBeat listening on "+port));

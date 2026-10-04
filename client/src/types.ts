export type Song={id:string,title:string,thumbnail:string,duration?:number,addedBy:string};
export type Participant={id:string,name:string,isHost:boolean,voiceJoined?:boolean,muted?:boolean};
export type RoomState={code:string,name:string,hasPassword:boolean,hostId:string,participants:Participant[],queue:Song[],current:Song|null,isPlaying:boolean,position:number,updatedAt:number};
export type ChatMessage={id:string,userId:string,name:string,text:string,ts:number,reactions:Record<string,string[]>};

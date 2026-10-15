import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
export class BrowserSession {
  socket: WebSocket;
  sequence=0;
  pending=new Map<number,{resolve:(value:Record<string,unknown>)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  events:{method:string;sessionId?:string;params:Record<string,unknown>}[]=[];
  constructor(socket:WebSocket){this.socket=socket;socket.addEventListener('message',event=>{
    const result=JSON.parse(String(event.data));
    if(result.id){const pending=this.pending.get(result.id);if(!pending)return;clearTimeout(pending.timer);this.pending.delete(result.id);result.error?pending.reject(new Error(result.error.message)):pending.resolve(result.result??{});}
    else this.events.push(result);
  });}
  static async connect(){
    const directory=process.env.CHROME_USER_DATA_DIR||path.join(os.homedir(),'Library/Application Support/Google/Chrome');
    const [port,wsPath]=fs.readFileSync(path.join(directory,'DevToolsActivePort'),'utf8').trim().split(/\r?\n/);
    if(!/^\d+$/.test(port)||!wsPath?.startsWith('/devtools/browser/'))throw new Error('Chrome discovery file is invalid; reconnect the configured Chrome.');
    const socket=new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
    await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Chrome connection timed out')),10000);socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});socket.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Chrome connection failed; check process permissions and remote debugging.'));},{once:true});});
    return new BrowserSession(socket);
  }
  async send<T=Record<string,unknown>>(method:string,params:Record<string,unknown>={},sessionId?:string):Promise<T>{
    return new Promise((resolve,reject)=>{const id=++this.sequence;const timer=setTimeout(()=>{this.pending.delete(id);reject(new Error(`CDP timeout: ${method}`));},20000);this.pending.set(id,{resolve:value=>resolve(value as T),reject,timer});this.socket.send(JSON.stringify({id,method,params,sessionId}));});
  }
  async evaluate<T>(sessionId:string,expression:string):Promise<T>{
    const result=await this.send<{result:{value:T};exceptionDetails?:unknown}>('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true},sessionId);
    if(result.exceptionDetails)throw new Error('Browser evaluation failed: '+JSON.stringify(result.exceptionDetails));return result.result.value;
  }
  close(){for(const pending of this.pending.values()){clearTimeout(pending.timer);pending.reject(new Error('Session closed'));}this.pending.clear();this.socket.close();}
}

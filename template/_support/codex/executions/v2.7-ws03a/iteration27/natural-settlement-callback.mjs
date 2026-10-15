export async function waitForNaturalRevealSettlement(){
 const element=document.querySelector('.game-hero__copy.reveal.reveal--1');if(!element)throw Error('Missing representative reveal ancestor');
 const initialStyle=getComputedStyle(element),before={animationName:initialStyle.animationName,animationDuration:initialStyle.animationDuration,animationDelay:initialStyle.animationDelay,animationTimingFunction:initialStyle.animationTimingFunction,animationFillMode:initialStyle.animationFillMode,animationPlayState:initialStyle.animationPlayState,animations:element.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime})),transform:initialStyle.transform,opacity:initialStyle.opacity};
 const durations=initialStyle.animationDuration.split(',').map(v=>v.trim().endsWith('ms')?parseFloat(v):parseFloat(v)*1000),delays=initialStyle.animationDelay.split(',').map(v=>v.trim().endsWith('ms')?parseFloat(v):parseFloat(v)*1000);
 const limitMs=Math.max(...durations.map((d,i)=>d+(delays[i%delays.length]??0)+1000),2000),started=performance.now(),observations=[];let consecutive=0;
 while(performance.now()-started<=limitMs){
  await new Promise(resolve=>requestAnimationFrame(resolve));
  const style=getComputedStyle(element),animations=element.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime})),identity=style.transform==='none'||new DOMMatrixReadOnly(style.transform).isIdentity;
  const settled=animations.every(a=>a.playState==='finished')&&identity&&style.opacity==='1';
  consecutive=settled?consecutive+1:0;observations.push({elapsedMs:performance.now()-started,transform:style.transform,opacity:style.opacity,animations,exactIdentity:identity,settled,consecutiveSettledFrames:consecutive});
  if(consecutive>=2)return {status:'PASS',selector:'.game-hero__copy.reveal.reveal--1',before,limitMs,observations,naturallyFinished:true,intervention:false};
 }
 return {status:'BLOCKED',selector:'.game-hero__copy.reveal.reveal--1',before,limitMs,observations,naturallyFinished:false,intervention:false};
}

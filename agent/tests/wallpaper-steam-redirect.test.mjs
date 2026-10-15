import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {gameSteamUrl,bindBrowserPolicy} from '../src/bsk-policy.mjs';
import {publicPageCapture,sanitizePublicCapture} from '../src/bsk-command-gate.mjs';

const root='https://store.steampowered.com/app/431960/';
const slug='https://store.steampowered.com/app/431960/Wallpaper_Engine/';
const game={name:'Wallpaper Engine',steamAppId:'431960',steamUrl:root};
const policy=bindBrowserPolicy({allowedPages:[],allowedStages:['game-homepage-icon-research']},{
  gameIdentity:game.name,gameMetadata:{steamAppId:game.steamAppId,steam:game.steamUrl}
});
function capture(locationUrl, schema='jsonld') {
 const document={
   get cookie(){throw Error('COOKIE_ACCESS_FORBIDDEN');},
   body:{get innerText(){throw Error('BODY_READ_FORBIDDEN');}},
   querySelectorAll(){return schema==='jsonld'?[{textContent:JSON.stringify({
    '@type':'Product',name:game.name,url:root,description:'Animated wallpaper software on Steam',
    vendorAccount:'DO_NOT_READ'
   })}]:[];},
   querySelector(s){
     const obj={'#appHubAppName':game.name,
       'meta[property="og:title"]':'Wallpaper Engine on Steam',
       'meta[property="og:url"]':slug,
       'meta[property="og:description"]':'Public details of Wallpaper Engine software'};
     if(!obj[s])return null;
     return{textContent:obj[s],getAttribute(){return obj[s]}};
   }
 };
 return runInNewContext(publicPageCapture(policy),{URL,document,location:{href:locationUrl}});
}
test('Steam canonical numeric App ID safely accepts one human-readable product slug',()=>{
 for(const item of [root,root.slice(0,-1),slug,slug.slice(0,-1),slug+'?l=english'])
   assert.equal(gameSteamUrl(item,game),true,item);
 assert.equal(policy.atomicFileTransferSupported,undefined);
});
test('same-app slug cannot authorize another App ID, another domain, private or nested routes',()=>{
 for(const item of [
   'https://store.steampowered.com/app/431961/Wallpaper_Engine/',
   'https://store.steampowered.com/app/431960/Wallpaper_Engine/reviews/',
   'https://store.steampowered.com/app/431960/Wallpaper_Engine/%2e%2e/',
   'https://store.steampowered.com/app/431960/Wallpaper_Engine/extra',
   'https://store.steampowered.com/account/',
   'http://store.steampowered.com/app/431960/Wallpaper_Engine/',
   'https://example.com/app/431960/Wallpaper_Engine/',
   'https://store.steampowered.com/app/431960/Wallpaper%2FEngine/',
   'https://store.steampowered.com/app/431960/Wallpaper_Engine/#account'
 ])assert.equal(gameSteamUrl(item,game),false,item);
});
test('canonical slug permits exact same slug or numeric root only, not alternate slug',()=>{
 const explicit={...game,steamUrl:slug};
 assert.equal(gameSteamUrl(root,explicit),true);
 assert.equal(gameSteamUrl(slug,explicit),true);
 assert.equal(gameSteamUrl('https://store.steampowered.com/app/431960/Other_Slug/',explicit),false);
});
test('trusted capture accepts real same-AppID slug redirect with matching public JSON-LD product identity',()=>{
 const result=capture(slug);
 assert.equal(result.readAllowed,true);
 assert.equal(result.sourceSchema,'STEAM_PUBLIC_GAME_JSON_LD_V1');
 const data=sanitizePublicCapture(result,policy);
 assert.equal(data.content.name,'Wallpaper Engine');
 assert.equal(data.content.url,root);
 assert.equal(data.content.description,'Animated wallpaper software on Steam');
 assert.doesNotMatch(JSON.stringify(data),/DO_NOT_READ/);
});
test('trusted capture accepts same-AppID slug redirect via exact OpenGraph public fallback',()=>{
 const result=capture(slug,'meta');
 assert.equal(result.readAllowed,true);
 assert.equal(result.sourceSchema,'STEAM_PUBLIC_GAME_META_V1');
 const data=sanitizePublicCapture(result,policy);
 assert.equal(data.content.name,'Wallpaper Engine');
});
test('unauthorized slug redirects and other app IDs still do not produce a usable captured source',()=>{
 for(const location of ['https://store.steampowered.com/app/570/Dota_2/',
  'https://store.steampowered.com/app/431960/Wallpaper_Engine/extra/',
  'https://store.steampowered.com/app/431960/Wallpaper_Engine/?token=secret'
 ]) {
   const result=capture(location);
   assert.equal(result.readAllowed,false);
   assert.throws(()=>sanitizePublicCapture(result,policy));
 }
});

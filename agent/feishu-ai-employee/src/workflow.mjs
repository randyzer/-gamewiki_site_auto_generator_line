import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import { STAGE, STAGES as stageNames, stageName, stageIndex } from '../../src/stages.mjs';
export const STAGES = stageNames.map(name => [name, ['gameName', 'sitePath',
 ...(name === STAGE.KEYWORD_RESEARCH ? ['keywordsFile'] : []),
 ...(name === STAGE.DEPLOYMENT_PLAN ? ['domain', 'repository'] : [])]]);
export function inputCheck(input, phase = STAGE.HOMEPAGE_RESEARCH) {
 const requested=STAGES.slice(0,stageIndex(stageName(phase))+1).flatMap(([skill,fields])=>fields.map(field=>({field,skill})));
 const seen=new Set(),missing=[];
 for(const r of requested){if(seen.has(r.field))continue;seen.add(r.field);
  const val=input[r.field];
  if(typeof val!=='string'||!val.trim())missing.push(r);
  else if(['sitePath','keywordsFile'].includes(r.field)&&!path.isAbsolute(val))missing.push(r);
  else if(r.field==='keywordsFile'&&!existsSync(val))missing.push(r);
 }
 return {ready:!missing.length,missing};
}
export function inventory(){
 const file=fileURLToPath(new URL('../../config/skill-manifest.json',import.meta.url));
 if(!existsSync(file))throw Error('Skill manifest missing');
 const manifest=JSON.parse(readFileSync(file,'utf8'));
 return manifest.skills.map(x=>({name:x.name,sha256:x.sha256,available:x.available,source:x.source}));
}
export function verifySkill(name){
 const entry=inventory().find(x=>x.name===name);
 if(!entry?.available||!entry.sha256)throw Error('Required skill unavailable: '+name);
 return entry;
}

import os,json,hashlib,stat,subprocess,sys
from pathlib import Path
base=Path('/Users/randyz/work/coding/hot_words_web');out=base/'template/codex/executions/v2.7-ws06a/iteration21';excluded={'.git','node_modules','dist','.astro','.astro-cache','.vite-cache','.vitest-cache','.wrangler','coverage','.browser-evidence','.DS_Store'}
allowed=['template/codex/executions/v2.7-ws06a/iteration21/','template/codex/prompts/v2.7-ws06a/iteration21-current-source-development-readiness-audit-plan.md']
def snap():
 d={}
 for root in ['template','Repo_hotgameweb','gameweb']:
  if not (base/root).exists():continue
  for folder,dirs,files in os.walk(base/root,followlinks=False):
   dirs[:]=[n for n in dirs if n not in excluded and not n.startswith('.env') and not any(str(Path(folder,n).relative_to(base)).startswith(p) for p in allowed)]
   for name in files+[n for n in dirs if Path(folder,n).is_symlink()]:
    p=Path(folder,name);rel=str(p.relative_to(base))
    if name in excluded or name.startswith('.env') or any(rel.startswith(a) for a in allowed):continue
    s=p.lstat();d[rel]={'sha256':hashlib.sha256(os.readlink(p).encode() if p.is_symlink() else p.read_bytes()).hexdigest(),'mode':s.st_mode&511,'symlink':p.is_symlink()}
 return d
p=out/'preflight.json';pre=json.loads(p.read_text())
if sys.argv[1]=='capture':
 pre['allProtected']=snap();pre['allProtectedCount']=len(pre['allProtected']);p.write_text(json.dumps(pre,indent=2)+'\n');print('protected',pre['allProtectedCount'])
else:
 now=snap();old=pre['allProtected'];errors=[k for k,v in old.items() if now.get(k)!=v]+[k for k in now if k not in old]
 triad=json.loads((out/'current-triad-identity.json').read_text())['triad']
 for v in triad.values():
  for args,expected in [(['branch','--show-current'],v['branch']),(['rev-parse','HEAD'],v['head']),(['rev-parse','HEAD^{tree}'],v['tree'])]:
   if subprocess.check_output(['git',*args],cwd=v['root'],text=True).strip()!=expected:errors.append(v['root']+' git drift')
 contract=base/'Repo_hotgameweb/GAME_SOP_V2.7_CANDIDATE/docs/COMMERCIAL_GAME_SITE_PRODUCT_CONTRACT_V2.7.md';import re
 section=contract.read_text().split('## H. Product Contract v0.2',1)[1].split('## I. Applicability Model',1)[0]
 ids=re.findall(r'^\| ([A-Z]+-\d+) \|',section,re.M)
 if len(ids)!=41 or len(set(ids))!=41:errors.append('Registry IDs drift')
 result={'status':'PASS' if not errors else 'FAIL','protectedFilesUnchanged':len(old),'contractRegistryIds':len(ids),'errors':errors,'productDelta':0 if not errors else 'UNKNOWN','governanceDelta':0 if not errors else 'UNKNOWN'}
 (out/'integrity-check.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));sys.exit(bool(errors))

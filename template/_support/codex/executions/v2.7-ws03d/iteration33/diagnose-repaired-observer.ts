import {observeFreshness} from './freshness-observation.mjs';
import {createRequire} from 'node:module';import {createHash} from 'node:crypto';import {readFileSync,writeFileSync} from 'node:fs';import {join} from 'node:path';
const root=process.cwd(),out=join(root,'../../template/codex/executions/v2.7-ws03d/iteration33');
const save=(n:string,d:unknown)=>writeFileSync(join(out,n),JSON.stringify(d,null,2)+'\n',{flag:'wx'});
const assert=(v:unknown,m:string)=>{if(!v)throw Error(m)};
async function main(){
 const text=Function.prototype.toString.call(observeFreshness),sha=(v:string|Buffer)=>createHash('sha256').update(v).digest('hex');
 writeFileSync(join(out,'iteration33-observer-serialized.txt'),text+'\n',{flag:'wx'});
 const serialization={status:text.includes('__name')?'FAIL':'PASS',nameHelperReferences:(text.match(/__name/g)??[]).length,serializedSha256:sha(text),sourceSha256:sha(readFileSync(join(out,'freshness-observation.mjs'))),runtime:'node_modules/.bin/tsx',standaloneNoInjectedHelpers:true,qualificationAttempts:0};save('observer-serialization-check.json',serialization);assert(serialization.nameHelperReferences===0,'Repaired callback still has __name');
 const labels=['Published','Last updated','Sources checked','Live status'],dates=['2026-08-10','2026-09-20','2026-09-21','2026-09-22'];
 const rows=labels.map((label,i)=>'<div><dt>'+label+'</dt><dd>'+(i===3?'Observed live ':'')+'<time datetime="'+dates[i]+'">'+dates[i]+'</time>'+(i===3?' <a href="https://example.com/qa-live-status">Status source</a>':'')+'</dd></div>').join('');
 const documents=[{'@type':'Article',headline:'Direct',datePublished:dates[0]},{'@graph':[null,7,[{'@type':'Article',headline:'Graph',dateModified:dates[1]}]]}];
 const html='<html><body><article><dl class="article__meta">'+rows+'</dl></article>'+documents.map(d=>'<script type="application/ld+json">'+JSON.stringify(d)+'</script>').join('')+'</body></html>';
 const pw=createRequire(join(root,'package.json'))('playwright'),report:any={diagnosticOnly:true,qualificationAttempts:0,retries:0,rows:[],overall:'FAIL',allBrowsersClosedNormally:false};
 try{
  for(const engine of ['chromium','firefox','webkit']){
   const browser=await pw[engine].launch({headless:true});
   try{
    const page=await browser.newPage();await page.setContent(html);const good=await page.evaluate(observeFreshness);
    await page.setContent(html.replace('</body>','<script type="application/ld+json">{ malformed</script></body>'));const negative=await page.evaluate(observeFreshness);
    const checks={returnKeysExact:JSON.stringify(Object.keys(good))===JSON.stringify(['rows','articles','parseErrors','bodyText','html']),metadataExact:JSON.stringify(good.rows.map((r:any)=>r.label))===JSON.stringify(labels)&&JSON.stringify(good.rows.map((r:any)=>r.times[0].datetime))===JSON.stringify(dates)&&good.rows[3].links[0].href==='https://example.com/qa-live-status',articleAndGraphExact:JSON.stringify(good.articles)===JSON.stringify([documents[0],(documents[1] as any)['@graph'][2][0]]),noParseErrors:good.parseErrors.length===0,bodyTextAndHtml:good.bodyText.includes('Observed live')&&good.html.includes('article__meta'),malformedRecorded:negative.parseErrors.length===1&&negative.articles.length===2&&negative.rows.length===4};
    report.rows.push({engine,version:browser.version(),checks,positive:good,negativeParseErrors:negative.parseErrors,passed:Object.values(checks).every(Boolean)});await page.close();
   }finally{await browser.close();}
  }
  report.allBrowsersClosedNormally=true;report.overall=report.rows.length===3&&report.rows.every((r:any)=>r.passed)?'PASS':'FAIL';
 }finally{save('browser-observer-diagnostic.json',report);}
 assert(report.overall==='PASS'&&report.allBrowsersClosedNormally,'Observer browser diagnostic STOP');console.log(JSON.stringify({serialization,browserDiagnostic:report.overall,engines:report.rows.length,qualificationAttempts:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});

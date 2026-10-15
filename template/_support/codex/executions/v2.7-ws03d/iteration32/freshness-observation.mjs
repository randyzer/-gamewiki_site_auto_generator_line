export function observeFreshness() {
 const metadata=document.querySelector('article .article__meta');
 const rows=[...(metadata?.children??[])].map(row=>({label:row.querySelector('dt')?.textContent?.trim(),text:row.querySelector('dd')?.textContent?.trim(),times:[...row.querySelectorAll('time')].map(t=>({datetime:t.getAttribute('datetime'),text:t.textContent?.trim()})),links:[...row.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),text:a.textContent?.trim()}))}));
 const articles=[],parseErrors=[];
 function visit(node){if(Array.isArray(node)){node.forEach(visit);return}if(!node||typeof node!=='object')return;if(node['@type']==='Article')articles.push(node);if(node['@graph'])visit(node['@graph']);}
 for(const script of document.querySelectorAll('script[type="application/ld+json"]')){try{visit(JSON.parse(script.textContent??''))}catch(e){parseErrors.push(String(e))}}
 return {rows,articles,parseErrors,bodyText:document.body.innerText,html:document.documentElement.outerHTML};
}

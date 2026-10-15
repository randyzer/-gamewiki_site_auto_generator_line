// This code runs ONLY inside the browser on the single favicon.io converter page.
// No document.body, cookies, local storage, page HTML, or unbounded selectors.
export function captureFaviconPublicControls() {
  const url=location.href;
  if (url!=='https://favicon.io/favicon-converter/')
    return {url,readAllowed:false,status:'CAPTURE_CONTEXT_CHANGED'};
  const selected=(selector)=>document.querySelectorAll(selector).length;
  const controls=[];
  const up=selected('input[type="file"]');
  if(up===1)controls.push({kind:'upload',selector:'input[type="file"]'});
  // bsk upload clicks a visible chooser trigger, not a hidden file input.
  // Accept only an unambiguous associated <label for="safe-id">, never text heuristics.
  let chooserTrigger=null;
  if(up===1 && typeof document.querySelector==='function') {
    const input=document.querySelector('input[type="file"]');
    const id=input?.getAttribute?.('id');
    if(typeof id==='string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id)) {
      const selector='label[for="'+id+'"]';
      const labels=document.querySelectorAll(selector);
      if(labels.length===1 && typeof labels[0]?.getClientRects==='function' &&
        labels[0].getClientRects().length>0)chooserTrigger={kind:'upload',selector};
    }
    if(!chooserTrigger) {
      const selector='label:has(input[type="file"])';
      const labels=document.querySelectorAll(selector);
      if(labels.length===1 && typeof labels[0]?.getClientRects==='function' &&
        labels[0].getClientRects().length>0)chooserTrigger={kind:'upload',selector};
    }
  }
  const candidates=['a[download]','a#download','button#download'];
  let count=0,selector=null;
  for(const item of candidates){
    if(selected(item)===1){count++;selector=item;}
  }
  // Distinct CSS patterns may hit the same control. Never guess among multiple.
  if(count===1)controls.push({kind:'download',selector});
  if(location.href!==url)return {url,readAllowed:false,status:'CAPTURE_CONTEXT_CHANGED'};
  const input=up===1&&typeof document.querySelector==='function'
    ?document.querySelector('input[type="file"]'):null;
  // Diagnostics are only bounded booleans/counts for fixed selector probes.
  // No element contents, IDs, classes, HTML, URLs or text leave the page.
  const diagnosticSelectors=[
    'label:has(input[type="file"])',
    '[role="button"]:has(input[type="file"])',
    'button:has(input[type="file"])',
    '[class*="dropzone"]',
    '[class*="upload"]'
  ];
  const probeCounts=diagnosticSelectors.map(selector=>Math.min(20,selected(selector)));
  const potentialDropzone=probeCounts[3]===1&&typeof document.querySelector==='function'
    ?document.querySelector('[class*="dropzone"]'):null;
  const dropzoneRendered=typeof potentialDropzone?.getClientRects==='function'
    &&potentialDropzone.getClientRects().length>0;
  const dropzoneContainsInput=!!potentialDropzone?.contains?.(input);
  const dropTarget=dropzoneRendered&&dropzoneContainsInput&&probeCounts[3]===1
    ?{kind:'upload',selector:'[class*="dropzone"]'}:null;
  const inspection={
    fileInputMatches:Math.min(20,up),
    downloadSelectorMatches:Math.min(20,count),
    chooserTriggerVerified:!!chooserTrigger,
    fileInputRendered:typeof input?.getClientRects==='function'&&input.getClientRects().length>0,
    fileInputDisabled:input?.disabled===true,
    clickableAncestorFound:!!input?.closest?.('label,button,[role="button"]'),
    nestedLabelCount:probeCounts[0],nestedButtonCount:probeCounts[1]+probeCounts[2],
    dropzoneClassCount:probeCounts[3],uploadClassCount:probeCounts[4],
    dropzoneRendered,dropzoneContainsInput
  };
  return {url,readAllowed:true,sourceSchema:'FAVICON_PUBLIC_CONTROLS_V1',
    controls,chooserTrigger,dropTarget,inspection};
}
export function sanitizeFaviconPublicControls(capture) {
  if(!capture||capture.url!=='https://favicon.io/favicon-converter/'||
    capture.readAllowed!==true||capture.sourceSchema!=='FAVICON_PUBLIC_CONTROLS_V1'||
    !Array.isArray(capture.controls)||capture.controls.length>2)
    throw Error('CAPTURE_CONTEXT_CHANGED');
  const allowed={
    upload:new Set(['input[type="file"]']),
    download:new Set(['a[download]','a#download','button#download'])
  };
  const seen=new Set();
  for(const c of capture.controls){
    if(!allowed[c?.kind]?.has(c?.selector)||seen.has(c.kind))
      throw Error('CAPTURE_CONTEXT_CHANGED');
    seen.add(c.kind);
  }
  const trigger=capture.chooserTrigger;
  const pattern=/^label\[for="[A-Za-z][A-Za-z0-9_-]{0,63}"\]$/;
  if(trigger!==null && trigger!==undefined && (
     trigger.kind!=='upload' || typeof trigger.selector!=='string' ||
     !(pattern.test(trigger.selector)||trigger.selector==='label:has(input[type="file"])')))
    throw Error('CAPTURE_CONTEXT_CHANGED');
  const dropTarget=capture.dropTarget;
  if(dropTarget!==null && dropTarget!==undefined&&(
    dropTarget.kind!=='upload'||dropTarget.selector!=='[class*="dropzone"]'))
    throw Error('CAPTURE_CONTEXT_CHANGED');
  const inspect=capture.inspection;
  const boolKeys=['chooserTriggerVerified','fileInputRendered','fileInputDisabled',
    'clickableAncestorFound','dropzoneRendered','dropzoneContainsInput'];
  const numberKeys=['fileInputMatches','downloadSelectorMatches','nestedLabelCount',
    'nestedButtonCount','dropzoneClassCount','uploadClassCount'];
  if(!inspect||typeof inspect!=='object'||Array.isArray(inspect)||
     boolKeys.some(k=>typeof inspect[k]!=='boolean')||
     numberKeys.some(k=>!Number.isInteger(inspect[k])||inspect[k]<0||inspect[k]>20))
     throw Error('CAPTURE_CONTEXT_CHANGED');
  return {url:capture.url,readAllowed:true,sourceSchema:capture.sourceSchema,
    controls:capture.controls.map(({kind,selector})=>({kind,selector})),
    chooserTrigger:trigger?{kind:'upload',selector:trigger.selector}:null,
    dropTarget:dropTarget?{kind:'upload',selector:'[class*="dropzone"]'}:null,
    inspection:Object.fromEntries([...boolKeys,...numberKeys].map(k=>[k,inspect[k]]))};
}

export function collectHomeObservation(){
      const html=document.documentElement,cs=getComputedStyle(html),body=getComputedStyle(document.body);
      const one=(q)=>{const e=document.querySelector(q);if(!e)throw Error('Missing representative surface '+q);const s=getComputedStyle(e),r=e.getBoundingClientRect();return {font:s.fontFamily,padding:s.paddingTop,minHeight:s.minHeight,height:r.height,width:r.width,radius:s.borderTopLeftRadius,border:s.borderColor,transform:s.transform,shadow:s.boxShadow};};
      return {roles:{font:html.dataset.themeFont,density:html.dataset.themeDensity,shape:html.dataset.themeShape,state:html.dataset.themeState},family:document.body.dataset.pageFamily,bodyFont:body.fontFamily,heading:one('.game-hero__copy h1'),utility:one('.eyebrow'),card:one('.portal-card'),control:one('.button'),shell:one('.shell'),tokens:Object.fromEntries(['shell-gutter','card-padding','control-min-height','section-spacing','font-utility','media-radius'].map(k=>[k,cs.getPropertyValue('--role-'+k).trim()]))};
}
export function collectHoveredCardObservation(e){const s=getComputedStyle(e);return{transform:s.transform,shadow:s.boxShadow,border:s.borderColor};}
export function collectArticleObservation(){return {font:getComputedStyle(document.querySelector('h1')).fontFamily,family:document.body.dataset.pageFamily,fontRole:document.documentElement.dataset.themeFont};}

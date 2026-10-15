export function observeImageInstances() {
 return [...document.querySelectorAll('figure[data-media-id="qa.image"] img')].map((image, index) => {
  const rect=image.getBoundingClientRect();
  return {index,placement:image.closest('[data-media-placement]')?.getAttribute('data-media-placement') ?? 'inline',loading:image.getAttribute('loading'),currentSrc:image.currentSrc,complete:image.complete,naturalWidth:image.naturalWidth,naturalHeight:image.naturalHeight,rect:{top:rect.top,bottom:rect.bottom,width:rect.width,height:rect.height},viewportHeight:innerHeight,inViewport:rect.bottom>0&&rect.top<innerHeight,performanceResources:performance.getEntriesByName(image.currentSrc).map(entry=>({name:entry.name,startTime:entry.startTime,duration:entry.duration,transferSize:entry.transferSize,encodedBodySize:entry.encodedBodySize,decodedBodySize:entry.decodedBodySize}))};
 });
}
export function imageHasExpectedNaturalSize(image) { return image.complete && image.naturalWidth===1200 && image.naturalHeight===675; }
export function imageNativeLoadReady(image) { return image.complete && image.naturalWidth>0; }

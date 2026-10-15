export function observeMedia() {
  return [...document.querySelectorAll('figure[data-media-id]')].map(figure => {
    const image = figure.querySelector('img');
    const wrapper = figure.querySelector('.video-embed');
    const rect = wrapper?.getBoundingClientRect() ?? image?.getBoundingClientRect();
    return { id: figure.getAttribute('data-media-id'), image: image ? { width: image.getAttribute('width'), height: image.getAttribute('height'), naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight, complete: image.complete } : null,
      rect: rect ? { width: rect.width, height: rect.height } : null,
      ratio: wrapper ? getComputedStyle(wrapper).aspectRatio : null,
      equivalent: figure.querySelector('.media-equivalent')?.textContent.trim() ?? null,
      credit: figure.querySelector('.media-credit')?.textContent.trim() ?? null,
      sources: [...figure.querySelectorAll('figcaption a')].map(a => a.getAttribute('href')),
      html: figure.outerHTML };
  });
}
export function localVideoMetadataReady() { return [...document.querySelectorAll('video')].every(video => video.readyState >= 1 && video.videoWidth > 0 && video.videoHeight > 0); }
export function observePageComposition() { return { viewportWidth: innerWidth, scrollWidth: document.documentElement.scrollWidth, mainText: document.querySelector('main')?.textContent.trim().length ?? 0, emptyMediaShells: [...document.querySelectorAll('[data-media-placement],.screenshot-gallery')].filter(el => !el.querySelector('figure[data-media-id]')).length, mediaCount: document.querySelectorAll('figure[data-media-id]').length }; }

export function observeShareHead() {
 const fields=['og:image','og:image:width','og:image:height','og:image:alt','twitter:image','twitter:image:alt','twitter:card'];
 const values=Object.fromEntries(fields.map(field=>[field,[...document.head.querySelectorAll('meta')].filter(meta=>meta.getAttribute(field.startsWith('og:')?'property':'name')===field).map(meta=>meta.getAttribute('content'))]));
 return {values,headHtml:document.head.innerHTML,bodyFigures:document.body.querySelectorAll('figure[data-media-id]').length,sharePlacements:document.body.querySelectorAll('[data-media-placement="share"]').length};
}

export function observeSearchState() {
 const console=document.querySelector('.search-console');
 return {state:console?.getAttribute('data-search-state')??null,formCount:document.querySelectorAll('form[role="search"]').length,note:console?.querySelector('.search-console__note')?.textContent?.trim()??'',consoleText:console?.textContent??'',results:[...document.querySelectorAll('.search-results li')].map(li=>({url:li.querySelector('a')?.getAttribute('href'),title:li.querySelector('strong')?.textContent?.trim(),excerpt:li.querySelector('p')?.textContent?.trim()})),searchNav:[...document.querySelectorAll('a')].map(a=>a.getAttribute('href')).filter(href=>href==='/search/'),query:new URL(location.href).searchParams.get('q')};
}

export function keywordServiceStops(value = []) {
  if (!Array.isArray(value) || new Set(value).size !== value.length ||
      value.some(service => !['youtube-subtitles', 'steam-community'].includes(service)))
    throw Error('KEYWORD_SERVICE_STOPS_INVALID');
  return [...value];
}

export function suspendSubtitleRequests(script) {
  if (!script.startsWith('#!/bin/sh\n')) throw Error('YTDLP_WRAPPER_INVALID');
  return '#!/bin/sh\n' +
    'for argument do\n' +
    '  case "$argument" in\n' +
    '    --write-sub|--write-sub=*|--write-subs|--write-subs=*|--write-auto-sub|--write-auto-sub=*|--write-auto-subs|--write-auto-subs=*)\n' +
    '      echo "KEYWORD_SERVICE_SUSPENDED: youtube-subtitles; a new operator decision is required" >&2; exit 75 ;;\n' +
    '  esac\n' +
    'done\n' + script.slice('#!/bin/sh\n'.length);
}

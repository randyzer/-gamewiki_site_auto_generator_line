const SERVICES = Object.freeze(['youtube-subtitles', 'steam-community']);

function serviceList(value, errorCode) {
  if (!Array.isArray(value) || new Set(value).size !== value.length ||
      value.some(service => !SERVICES.includes(service)))
    throw Error(errorCode);
  return [...value];
}

export function keywordServiceStops(value = []) {
  return serviceList(value, 'KEYWORD_SERVICE_STOPS_INVALID');
}

export function keywordServiceResumes(value = []) {
  return serviceList(value, 'KEYWORD_SERVICE_RESUMES_INVALID');
}

export function recoveredKeywordServiceDecisions({ historicalStops = [], serviceStops = [], serviceResumes = [], suppliedInputs = {} }) {
  const historical = keywordServiceStops(historicalStops).sort();
  const stopped = keywordServiceStops(serviceStops);
  const resumed = keywordServiceResumes(serviceResumes);
  if (!historical.length) {
    if (resumed.length) throw Error('KEYWORD_SERVICE_DECISION_INVALID: cannot resume a service without a recovered restriction');
    return { historicalStops: historical, serviceStops: stopped, serviceResumes: resumed };
  }
  if (!Object.hasOwn(suppliedInputs, 'keywordServiceStops') || !Object.hasOwn(suppliedInputs, 'keywordServiceResumes'))
    throw Error('KEYWORD_SERVICE_DECISION_REQUIRED: current inputs must explicitly set keywordServiceStops and keywordServiceResumes for ' + historical.join(', '));
  const overlap = stopped.filter(service => resumed.includes(service));
  if (overlap.length) throw Error('KEYWORD_SERVICE_DECISION_INVALID: a service cannot be both suspended and resumed: ' + overlap.join(', '));
  const unrelated = resumed.filter(service => !historical.includes(service));
  if (unrelated.length) throw Error('KEYWORD_SERVICE_DECISION_INVALID: no recovered restriction exists for ' + unrelated.join(', '));
  const missing = historical.filter(service => !stopped.includes(service) && !resumed.includes(service));
  if (missing.length) throw Error('KEYWORD_SERVICE_DECISION_REQUIRED: choose suspend or resume for ' + missing.join(', '));
  return { historicalStops: historical, serviceStops: stopped, serviceResumes: resumed };
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

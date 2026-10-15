// Only bsk's machine-readable, typed error fields are trusted.
// Strings, body text, log lines, and nested arbitrary website data are NEVER
// interpreted as a permission to retry/drop files.
const REASONS=new Set(['file_input_not_activated','file_input_not_found',
  'target_not_found','target_not_visible','upload_failed','unsupported_operation']);
const EFFECTS=new Set(['none','unknown','committed']);
export function safeBskUploadEffect(output){
  if(typeof output!=='string'||output.length===0||output.length>65536)
    return {reason:'UNVERIFIED',effectState:'unverified'};
  let parsed;
  try {parsed=JSON.parse(output);}
  catch {return {reason:'UNVERIFIED',effectState:'unverified'};}
  if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))
    return {reason:'UNVERIFIED',effectState:'unverified'};
  const typed=parsed.error&&typeof parsed.error==='object'&&!Array.isArray(parsed.error)
    ? parsed.error : parsed;
  const reason=typed.reason;
  const effectState=typed.effect_state??typed.effectState;
  return {
    reason:typeof reason==='string'&&REASONS.has(reason)?reason:'UNVERIFIED',
    effectState:typeof effectState==='string'&&EFFECTS.has(effectState)?effectState:'unverified'
  };
}

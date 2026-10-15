import { inflateSync } from 'node:zlib';

function crc32(bytes) {
  let value=0xffffffff;
  for (const byte of bytes) { value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^(0xedb88320&-(value&1)); }
  return (value^0xffffffff)>>>0;
}
export function validateFaviconPng(bytes) {
  const invalid=()=>{throw Error('PNG must be a complete 512px image with alpha and no hidden metadata');};
  if (bytes.length<57 || bytes.length>8*1024*1024 || bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') invalid();
  let offset=8,header,ended=false,idatEnded=false;const compressed=[];
  while(offset<bytes.length) {
    if (offset+12>bytes.length || ended) invalid();
    const length=bytes.readUInt32BE(offset),end=offset+12+length;
    if(end>bytes.length)invalid();
    const typeBytes=bytes.subarray(offset+4,offset+8);
    if([...typeBytes].some(byte=>!(byte>=65&&byte<=90)&&!(byte>=97&&byte<=122)))invalid();
    const type=typeBytes.toString('latin1'),data=bytes.subarray(offset+8,end-4);
    if(crc32(bytes.subarray(offset+4,end-4))!==bytes.readUInt32BE(end-4))invalid();
    if(type==='IHDR') {
      if(header || offset!==8 || length!==13 || data.readUInt32BE(0)!==512 || data.readUInt32BE(4)!==512 ||
        data[8]!==8 || ![4,6].includes(data[9]) || data[10]!==0 || data[11]!==0 || data[12]!==0)invalid();
      header=data;
    } else if(type==='IDAT') {
      if(!header || idatEnded || length===0)invalid();compressed.push(data);
    } else if(type==='IEND') {
      if(!header || !compressed.length || length!==0)invalid();ended=true;
    } else if(['sRGB','gAMA','cHRM','pHYs'].includes(type)) {
      if(!header || compressed.length || !({sRGB:1,gAMA:4,cHRM:32,pHYs:9}[type]===length))invalid();
    } else invalid();
    if(type!=='IDAT'&&compressed.length)idatEnded=true;
    offset=end;
  }
  if(!ended)invalid();
  const stride=512*(header[9]===6?4:2)+1,expected=stride*512;
  let decoded;
  try { decoded=inflateSync(Buffer.concat(compressed),{maxOutputLength:expected,info:true}); } catch { invalid(); }
  if(decoded.buffer.length!==expected || decoded.engine.bytesWritten!==Buffer.concat(compressed).length)invalid();
  for(let row=0;row<512;row++)if(decoded.buffer[row*stride]>4)invalid();
  return true;
}

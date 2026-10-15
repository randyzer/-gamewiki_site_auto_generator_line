import 'dotenv/config';
const resp=await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_id:process.env.FEISHU_APP_ID,app_secret:process.env.FEISHU_APP_SECRET})});
const a=await resp.json();if(a.code!==0||!a.tenant_access_token)throw new Error('Token request failed: '+a.code);
const r=await fetch('https://open.feishu.cn/open-apis/bot/v3/info',{headers:{Authorization:'Bearer '+a.tenant_access_token}});
const b=await r.json();
console.log(JSON.stringify({tokenGranted:true,botResponseCode:b.code,bot:{app_name:b.bot?.app_name,open_id:b.bot?.open_id,bot_name:b.bot?.bot_name}},null,2));
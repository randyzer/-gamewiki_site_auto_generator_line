import 'dotenv/config';
const tokenRes=await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_id:process.env.FEISHU_APP_ID,app_secret:process.env.FEISHU_APP_SECRET})});
const x=await tokenRes.json();if(x.code!==0)throw Error('Token invalid');
const r=await fetch('https://open.feishu.cn/open-apis/application/v6/applications/cli_aa476f5e72789ccc?user_id_type=open_id',{headers:{Authorization:'Bearer '+x.tenant_access_token}});
const y=await r.json();
console.log(JSON.stringify({http:r.status,code:y.code,keys:Object.keys(y.data||{}),owner_id:y.data?.app?.owner_id||y.data?.owner_id||null},null,2));
import 'dotenv/config';
const auth=await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({app_id:process.env.FEISHU_APP_ID,app_secret:process.env.FEISHU_APP_SECRET})});
const a=await auth.json();if(a.code!==0)throw Error('Auth failed');
const resp=await fetch('https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+a.tenant_access_token},body:JSON.stringify({receive_id:'ou_f7ea3a36087dcb6829ac2690d66c1102',msg_type:'text',content:JSON.stringify({text:'游戏网站 AI 工程师：飞书通信通道已建立，正在进行受控联调。无需回复。'})})});
const result=await resp.json();
console.log(JSON.stringify({http:resp.status,code:result.code,msg:result.msg,created:!!result.data?.message_id},null,2));
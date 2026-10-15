import 'dotenv/config';
import * as lark from '@larksuiteoapi/node-sdk';
const appId=process.env.FEISHU_APP_ID,appSecret=process.env.FEISHU_APP_SECRET;
if(!appId||!appSecret)throw new Error('missing credentials');
const ws=new lark.WSClient({appId,appSecret,domain:lark.Domain.Feishu,loggerLevel:lark.LoggerLevel.info});
const dispatcher=new lark.EventDispatcher({}).register({'im.message.receive_v1':async (event)=>{const id=event?.sender?.sender_id?.open_id;if(id)console.log('INBOUND_USER_OPEN_ID',id);}});
await ws.start({eventDispatcher:dispatcher});
console.log('FEISHU_WS_CONNECTED');
process.on('SIGTERM',()=>process.exit(0));
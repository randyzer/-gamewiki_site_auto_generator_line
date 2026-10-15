import {checkLocalBrowserSkillFileAccess} from '../src/chrome-file-url-permission.mjs';

const status=await checkLocalBrowserSkillFileAccess();
console.log(JSON.stringify({schemaVersion:1,inspection:'READ_ONLY_CHROME_EXTENSION_PERMISSION',...status,
  verifiedTransfer:false,productionTransferEnabled:false},null,2));
if(status.status!=='ENABLED')process.exitCode=2;

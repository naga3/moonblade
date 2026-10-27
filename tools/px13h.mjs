import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {readFileSync,existsSync,writeFileSync,renameSync} from 'node:fs';
export const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const PX13H=resolve(process.env.PX13H||join(ROOT,'../px13h'));
export function writeChanged(file,data){
 if(existsSync(file)&&readFileSync(file,'utf8')===data)return false;
 const temp=`${file}.${process.pid}.tmp`;
 writeFileSync(temp,data);renameSync(temp,file);return true;
}

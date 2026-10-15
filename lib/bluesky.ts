import initial from './initial.json';
import type {Story} from './feeds';
export const wolvesList='at://did:plc:7giugsiydb7mj2j3a5u6nuyn/app.bsky.graph.list/3lal4p6r7w62f';
const wolvesPattern=/timberwolves|\bwolves\b|timbies|anthony edwards|\bant\b|naz reid|jaden mcdaniels|rudy gobert|lamelo ball|jonathan kuminga|chris finch|ayo dosunmu|canis hoopus/i;
export function parseBlueskyFeed(json:any,team='wolves',pattern:RegExp=wolvesPattern):Story[]{
 return (json.feed||[]).flatMap((item:any)=>{const p=item.post,r=p?.record,a=p?.author;if(!r||r.reply||item.reason||!a?.handle||p.labels?.some((l:any)=>['!hide','!warn','porn','sexual','graphic-media'].includes(l.val)))return [];const title=String(r.text||'').trim();const context=title+' '+(p.embed?.external?.title||'')+' '+(p.embed?.record?.value?.text||'');if(!pattern.test(context)||!title||!Number.isFinite(Date.parse(r.createdAt)))return [];const key=p.uri?.split('/').pop();if(!key)return [];const url='https://bsky.app/profile/'+encodeURIComponent(a.handle)+'/post/'+encodeURIComponent(key);return [{id:url,url,title,date:r.createdAt,source:'Bluesky · '+(a.displayName?.trim()||a.handle),teams:[team],kind:'social',avatar:a.avatar}]});
}
export async function wolvesBluesky(limit=12,withAvatars=true){const stories:Story[]=[];let cursor='';for(let page=0;page<2;page++){const r=await fetch('https://public.api.bsky.app/xrpc/app.bsky.feed.getListFeed?list='+encodeURIComponent(wolvesList)+'&limit=100'+(cursor?'&cursor='+encodeURIComponent(cursor):''),{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('Bluesky feed unavailable');const json=await r.json() as any;stories.push(...parseBlueskyFeed(json));cursor=json.cursor||'';if(!cursor||stories.length>=limit)break;}const latest=[...new Map(stories.map(s=>[s.url,s])).values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,limit);if(withAvatars)await inlineAvatars(latest);return latest;}

const avatarCache=new Map<string,string>();
const authorKey=(s:Story)=>s.url.split('/profile/')[1]?.split('/post/')[0]||s.source;
const knownAvatars=new Map<string,string>((initial.stories as Story[]).filter(s=>s.kind==='social'&&s.avatar?.startsWith('data:image/')).map(s=>[authorKey(s),s.avatar!]));
const avatarPending=new Map<string,Promise<string|undefined>>();
function thumbnail(url:string){const u=new URL(url);if(u.protocol!=='https:'||u.hostname!=='cdn.bsky.app'||!/^\/img\/avatar(?:_thumbnail)?\/plain\//.test(u.pathname))return '';u.pathname=u.pathname.replace('/img/avatar/','/img/avatar_thumbnail/');return u.href}
async function downloadAvatar(url:string):Promise<string|undefined>{
 const cached=avatarCache.get(url);if(cached)return cached;
 const pending=avatarPending.get(url);if(pending)return pending;
 const work=(async()=>{try{
 const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(12000),headers:{Accept:'image/webp,image/png,image/jpeg'}});
 if(!r.ok)return;const bytes=new Uint8Array(await r.arrayBuffer());if(!bytes.length||bytes.length>250000)return;
 // Check bytes as well as MIME: some image caches return application/octet-stream.
 let mime=r.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)mime='image/jpeg';
 else if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)mime='image/png';
 else if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')mime='image/webp';
 else return;
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);const image='data:'+mime+';base64,'+btoa(binary);
 if(avatarCache.size>=100)avatarCache.delete(avatarCache.keys().next().value!);avatarCache.set(url,image);return image;
 }catch{return undefined}})();avatarPending.set(url,work);try{return await work}finally{avatarPending.delete(url)}
}
export async function inlineAvatars(stories:Story[]){
 await Promise.all(stories.map(async s=>{
 const previous=knownAvatars.get(authorKey(s));
 if(s.avatar?.startsWith('data:image/')){knownAvatars.set(authorKey(s),s.avatar);return}
 let image:string|undefined;
 try{if(s.avatar){const small=thumbnail(s.avatar);if(small){image=await downloadAvatar(small);if(!image&&small!==s.avatar)image=await downloadAvatar(s.avatar)}}}catch{}
 s.avatar=image||previous;
 if(s.avatar){if(knownAvatars.size>=150)knownAvatars.delete(knownAvatars.keys().next().value!);knownAvatars.set(authorKey(s),s.avatar)}
 }));
}

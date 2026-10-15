import {teams} from '../../../lib/teams';
import {mergeLiveScoreboard,type Game} from '../../../lib/feeds';
let cached:{checked:string;games:Game[];unavailable:string[]}|null=null;
export async function GET(){
 if(cached&&Date.now()-Date.parse(cached.checked)<30000)return Response.json(cached,{headers:{'Cache-Control':'no-store'}});
 const checked=new Date().toISOString(),games:Game[]=[],unavailable:string[]=[];
 const leagues=[...new Set(teams.map(t=>t.league).filter(Boolean))];
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replace(/-/g,'');
 await Promise.all(leagues.map(async league=>{try{const r=await fetch('https://site.api.espn.com/apis/site/v2/sports/'+league+'/scoreboard?dates='+date+'&limit=100',{signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();mergeLiveScoreboard(games,await r.json(),league);}catch{unavailable.push(league)}}));
 cached={checked,games,unavailable};return Response.json(cached,{headers:{'Cache-Control':'no-store'}});
}

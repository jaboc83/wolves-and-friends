import {teams} from './teams';
import type {HubData,Story} from './feeds';
export function activeStories(stories:Story[]){return stories.map(s=>({...s,teams:s.teams.filter(id=>teams.some(t=>t.id===id))})).filter(s=>s.teams.length)}
export function activeHub(d:HubData):HubData{return {...d,stories:activeStories(d.stories),games:d.games.filter(g=>teams.some(t=>t.id===g.team)),health:d.health.filter(h=>h.teams.some(id=>teams.some(t=>t.id===id)))}}

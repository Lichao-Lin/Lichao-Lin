import { mkdir, writeFile } from 'node:fs/promises';

const username = process.env.USERNAME || 'Lichao-Lin';
if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required.');
const query = `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }`;
const response = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { login: username } }),
  signal: AbortSignal.timeout(30000)
});
if (!response.ok) throw new Error(`GitHub API failed: ${response.status}`);
const result = await response.json();
if (result.errors?.length) throw new Error('GitHub returned GraphQL errors; existing charts preserved.');
const calendar = result.data?.user?.contributionsCollection?.contributionCalendar;
if (!calendar?.weeks?.length) throw new Error('Contribution calendar unavailable.');
const days = calendar.weeks.flatMap(w => w.contributionDays).sort((a,b) => a.date.localeCompare(b.date)).slice(-31);
if (days.length !== 31 || days.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !Number.isInteger(d.contributionCount) || d.contributionCount < 0)) throw new Error('Invalid daily contribution data.');
for (let i=1;i<days.length;i++) if (Date.parse(days[i].date)-Date.parse(days[i-1].date)!==86400000) throw new Error('Non-contiguous daily data.');
const themes = {
  dark: { bg:'#0d1117', text:'#e6edf3', muted:'#8b949e', grid:'#30363d', line:'#60a5fa', dot:'#ff917a' },
  light: { bg:'#ffffff', text:'#17202d', muted:'#667085', grid:'#d8dfe9', line:'#2563eb', dot:'#d35b41' }
};
const max = Math.max(...days.map(d=>d.contributionCount));
const step = Math.max(1, Math.ceil(max/5));
const top = step*5;
const x = i => 76+i*(1048/30);
const y = n => 330-n/top*230;
const outputs=[];
for (const [mode,t] of Object.entries(themes)) {
  let grid='', dots='';
  for(let i=0;i<=5;i++) { const n=i*step; grid+=`<path d="M76 ${y(n)}H1124" stroke="${t.grid}" stroke-dasharray="3 3"/><text x="62" y="${y(n)+4}" text-anchor="end" fill="${t.text}" font-size="12">${n}</text>`; }
  days.forEach((d,i)=>{
    grid+=`<path d="M${x(i)} 100V330" stroke="${t.grid}" stroke-dasharray="3 3"/><text x="${x(i)}" y="351" text-anchor="middle" font-size="11" fill="${t.text}">${Number(d.date.slice(-2))}</text>`;
    dots+=`<circle cx="${x(i)}" cy="${y(d.contributionCount)}" r="4" fill="${t.dot}"><title>${d.date}: ${d.contributionCount} contributions</title></circle>`;
  });
  const points=days.map((d,i)=>`${x(i)},${y(d.contributionCount)}`).join(' ');
  const total=days.reduce((n,d)=>n+d.contributionCount,0);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="420" viewBox="0 0 1200 420" role="img" aria-labelledby="title desc"><title id="title">Daily GitHub contributions — ${username}</title><desc id="desc">${days[0].date} to ${days.at(-1).date}; ${total} contributions. Each point represents a real daily count from the GitHub contribution calendar.</desc><rect width="1200" height="420" rx="14" fill="${t.bg}"/><g font-family="Segoe UI,Arial,sans-serif"><text x="600" y="42" text-anchor="middle" fill="${t.text}" font-size="20" font-weight="600">Contribution Graph</text><text x="600" y="69" text-anchor="middle" fill="${t.muted}" font-size="12">${days[0].date} — ${days.at(-1).date} · ${total} contributions</text>${grid}<polyline points="${points}" fill="none" stroke="${t.line}" stroke-width="3" stroke-linejoin="round"/>${dots}<text x="600" y="386" text-anchor="middle" fill="${t.text}" font-size="13">Days</text><text transform="translate(25 215) rotate(-90)" text-anchor="middle" fill="${t.text}" font-size="13">Contributions</text></g></svg>\n`;
  outputs.push([`activity-${mode}.svg`,svg]);
}
await mkdir('assets/activity', { recursive:true });
for(const [file,svg] of outputs) await writeFile(`assets/activity/${file}`,svg);
await writeFile('assets/activity/contributions.json',JSON.stringify({username,source:'GitHub GraphQL contributionCalendar',generatedAt:new Date().toISOString(),days},null,2)+'\n');
console.log(`Generated charts from ${days.length} real daily counts (${days[0].date} to ${days.at(-1).date}).`);

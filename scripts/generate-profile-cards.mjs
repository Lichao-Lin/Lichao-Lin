import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Use the original fork's SVG renderers with public REST data. This avoids
// cross-repository GraphQL permissions and never reads private repositories.
const core = resolve(process.env.STATS_CORE_PATH || '.stats-generator');
const load = (file) => import(pathToFileURL(resolve(core, file)));
const { renderStatsCard } = await load('src/cards/stats.js');
const { renderTopLanguages } = await load('src/cards/top-languages.js');
const { renderRepoCard } = await load('src/cards/repo.js');
const username = 'Lichao-Lin';
const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
async function get(path) {
  const response = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Public GitHub data request failed (${response.status}). Existing cards preserved.`);
  return response.json();
}

const repos = [];
for (let page = 1; ; page++) {
  const batch = await get(`/users/${username}/repos?type=owner&per_page=100&page=${page}`);
  repos.push(...batch.filter(repo => !repo.private && !repo.fork && !repo.archived));
  if (batch.length < 100) break;
}
if (!repos.length) throw new Error('No public original repositories found.');
const scope = repos.map(repo => `repo:${repo.full_name}`).join(' ');
async function count(endpoint, query) {
  const result = await get(`/search/${endpoint}?per_page=1&q=${encodeURIComponent(`${query} ${scope}`)}`);
  if (result.incomplete_results || !Number.isInteger(result.total_count)) throw new Error('Incomplete public search results.');
  return result.total_count;
}
const totalCommits = await count('commits', `author:${username}`);
const totalPRs = await count('issues', 'is:pr');
const totalIssues = await count('issues', 'is:issue');
const colors = { Python: '#3572a5', HTML: '#e34c26', CSS: '#563d7c', JavaScript: '#f1e05a', TypeScript: '#3178c6', Vue: '#41b883', Shell: '#89e051', PowerShell: '#012456', 'C++': '#f34b7d', C: '#555555', R: '#198ce7', MATLAB: '#e16737', 'Jupyter Notebook': '#da5b0b', Dockerfile: '#384d54', Mermaid: '#ff3670', 'TSQL': '#e38c00', SQL: '#e38c00' };
const languages = {};
for (const repo of repos) {
  const data = await get(`/repos/${repo.full_name}/languages`);
  for (const [name, size] of Object.entries(data)) {
    languages[name] ||= { name, color: colors[name] || '#8ba7ba', size: 0 };
    languages[name].size += size;
  }
}
const palette = { bg_color: '0b1220', title_color: '77d8c5', text_color: 'b8c7d5', icon_color: '77d8c5', hide_border: true, border_radius: 0, disable_animations: true };
const stats = { name: username, totalStars: repos.reduce((sum, repo) => sum + repo.stargazers_count, 0), totalCommits, totalPRs, totalIssues, contributedTo: 0, rank: { level: '', percentile: 100 } };
const outputs = [
  ['stats', renderStatsCard(stats, { ...palette, custom_title: 'Public Repository Activity', show_icons: true, hide_rank: true, hide: ['contribs'], include_all_commits: true, card_width: 480, line_height: 28 }), 210],
  ['languages', renderTopLanguages(languages, { ...palette, custom_title: 'Language Landscape', layout: 'compact', langs_count: 8, card_width: 480 }), 210],
];
for (const [name, repoName] of [['rumorbench', 'LLM-RumorBench'], ['research', 'research-scripts'], ['taskpool', 'TaskPool'], ['travel', 'Scrapy-Travel-Recommender']]) {
  const repo = repos.find(item => item.name === repoName);
  if (!repo) throw new Error(`Public project missing: ${repoName}`);
  const data = { name: repo.name, nameWithOwner: repo.full_name, description: repo.description, isArchived: repo.archived, isTemplate: repo.is_template, starCount: repo.stargazers_count, forkCount: repo.forks_count, primaryLanguage: repo.language ? { name: repo.language, color: colors[repo.language] || '#8ba7ba' } : null };
  outputs.push([name, renderRepoCard(data, { ...palette, description_lines_count: 3 }), 200]);
}

const framed = outputs.map(([name, svg, minHeight]) => {
  if (!svg.includes('<svg') || svg.includes('data-testid="message"')) throw new Error(`Card rendering failed: ${name}`);
  const root = svg.match(/<svg\b[^>]*>/)?.[0];
  const width = Number(root?.match(/\bwidth="([\d.]+)(?:px)?"/)?.[1]);
  const height = Number(root?.match(/\bheight="([\d.]+)(?:px)?"/)?.[1]);
  if (!width || !height) throw new Error(`Invalid SVG dimensions: ${name}`);
  const outerHeight = Math.max(minHeight, height + 16);
  return [name, `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="${outerHeight}" viewBox="0 0 480 ${outerHeight}" role="img" aria-label="${name}"><rect x="0.5" y="0.5" width="479" height="${outerHeight - 1}" rx="14" fill="#0b1220" stroke="#233447"/>${svg.replace(root, root.replace('<svg', `<svg x="${(480 - width) / 2}" y="${(outerHeight - height) / 2}"`))}</svg>`];
});
// A fetch/render failure above leaves every existing card untouched.
await mkdir('assets/cards', { recursive: true });
for (const [name, svg] of framed) {
  await writeFile(`assets/cards/${name}.svg`, svg, 'utf8');
  console.log(`Generated ${name}.svg`);
}

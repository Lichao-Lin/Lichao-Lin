import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Render with the pinned Lichao-Lin/github-readme-stats checkout.
// Authentication is supplied only through the workflow's ephemeral GITHUB_TOKEN.
const core = resolve(process.env.STATS_CORE_PATH || '.stats-generator');
const username = 'Lichao-Lin';
const palette = {
  username,
  bg_color: '0b1220',
  title_color: '77d8c5',
  text_color: 'b8c7d5',
  icon_color: '77d8c5',
  hide_border: 'true',
  border_radius: '0',
  disable_animations: 'true',
};
const cards = [
  ['stats', 'index', { custom_title: 'Open-source Activity', show_icons: 'true', hide_rank: 'true', card_width: '480', line_height: '25' }, 210],
  ['languages', 'top-langs', { custom_title: 'Language Landscape', layout: 'compact', langs_count: '8', card_width: '480', exclude_repo: 'contribution_matrices,data-analysis-for-econometrics-studies,Ars-Informatica,nice-skills' }, 210],
  ['rumorbench', 'pin', { repo: 'LLM-RumorBench', description_lines_count: '3' }, 200],
  ['research', 'pin', { repo: 'research-scripts', description_lines_count: '3' }, 200],
  ['taskpool', 'pin', { repo: 'TaskPool', description_lines_count: '3' }, 200],
  ['travel', 'pin', { repo: 'Scrapy-Travel-Recommender', description_lines_count: '3' }, 200],
];

const outputs = [];
for (const [name, api, options, minHeight] of cards) {
  const { default: render } = await import(pathToFileURL(resolve(core, 'api', `${api}.js`)));
  let svg;
  await render({ query: { ...palette, ...options } }, {
    setHeader() {},
    send(value) { svg = value; return value; },
  });
  if (!svg?.includes('<svg') || svg.includes('data-testid="message"')) {
    throw new Error(`Card ${name} could not be generated; existing cards were preserved.`);
  }
  const root = svg.match(/<svg\b[^>]*>/)?.[0];
  const width = Number(root?.match(/\bwidth="([\d.]+)(?:px)?"/)?.[1]);
  const height = Number(root?.match(/\bheight="([\d.]+)(?:px)?"/)?.[1]);
  if (!width || !height) throw new Error(`Invalid SVG dimensions: ${name}`);
  const outerHeight = Math.max(minHeight, height + 16);
  const framed = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="${outerHeight}" viewBox="0 0 480 ${outerHeight}" role="img" aria-label="${name}"><rect x="0.5" y="0.5" width="479" height="${outerHeight - 1}" rx="14" fill="#0b1220" stroke="#233447"/>${svg.replace(root, root.replace('<svg', `<svg x="${(480 - width) / 2}" y="${(outerHeight - height) / 2}"`))}</svg>`;
  outputs.push([name, framed]);
}

// Publish only after all cards have succeeded, so API failures leave valid images intact.
await mkdir('assets/cards', { recursive: true });
for (const [name, svg] of outputs) {
  await writeFile(`assets/cards/${name}.svg`, svg, 'utf8');
  console.log(`Generated ${name}.svg`);
}

import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const out = new URL('../assets/portfolio/', import.meta.url);
await mkdir(out, { recursive: true });
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const themes = {
  dark: { bg:'#101318', fg:'#F0F3F8', muted:'#A4ADBB', line:'#2C333E', accent:'#A8C7FA', panel:'#171C24' },
  light: { bg:'#F8FAFD', fg:'#17202D', muted:'#566173', line:'#D8DFE9', accent:'#315CA8', panel:'#EDF2FA' }
};
const projects = [
  { key:'har', name:'HAR–Residual–LSTM', tags:'TIME SERIES / PYTORCH', en:['Cross-asset volatility','HAR baselines with LSTM residual learning.','Temporal evaluation and Docker experiments.'], zh:['跨资产波动率预测','结合 HAR 基线与 LSTM 残差学习。','时间划分评估与 Docker 实验环境。'] },
  { key:'rumor', name:'LLM–RumorBench', tags:'LLM EVALUATION / STATISTICS', en:['Understanding model responses','Multimodal interventions for rumor detection.','Agreement metrics and statistical analysis.'], zh:['理解大模型的判断','面向谣言识别的多模态干预实验。','一致性指标与多视角统计分析。'] },
  { key:'termxk', name:'Termxk', tags:'DESKTOP / PYTHON / SQLITE', en:['A workspace for everyday tasks','Local task management, rewards and logs.','An offline desktop app with persistent storage.'], zh:['为日常任务构建工作台','本地任务管理、个人奖励与日常记录。','支持离线使用，SQLite 持久存储。'] },
  { key:'travel', name:'Travel Recommender', tags:'VUE / DJANGO / MYSQL', en:['From user activity to discovery','A travel recommendation application.','Connecting web interfaces, APIs and data.'], zh:['从用户行为到旅行发现','旅游景点推荐应用。','连接前端交互、后端接口与业务数据。'] }
];
const svg = (w,h,t,title,body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><rect x=".5" y=".5" width="${w-1}" height="${h-1}" rx="16" fill="${t.bg}" stroke="${t.line}"/><g font-family="Segoe UI,Microsoft YaHei,Arial,sans-serif">${body}</g></svg>\n`;
for (const [mode,t] of Object.entries(themes)) {
  for (const locale of ['en','zh']) {
    const zh = locale === 'zh';
    // An abstract research lattice, deliberately independent of activity data.
    let lattice = '';
    for(let row=0;row<6;row++) for(let col=0;col<6;col++) {
      const x=740+(col-row)*19, y=117+(col+row)*10;
      const h=10+((row*7+col*11)%5)*11;
      lattice += `<path d="M${x} ${y-h}l18 10-18 10-18-10z" fill="${t.accent}" opacity="${.22+(row+col)*.045}"/><path d="M${x-18} ${y-h+10}l18 10v${h}l-18-10z" fill="${t.accent}" opacity=".12"/><path d="M${x} ${y-h+20}l18-10v${h}l-18 10z" fill="${t.accent}" opacity=".25"/>`;
    }
    const hero = `<text x="44" y="49" fill="${t.accent}" font-size="12" letter-spacing="3">RESEARCH / CODE / SYSTEMS</text><text x="42" y="118" fill="${t.fg}" font-size="52" font-weight="650">Lichao Lin<tspan fill="${t.accent}">.</tspan></text><text x="44" y="158" fill="${t.muted}" font-size="19">${zh?'从研究问题，到模型与工具。':'From research questions to models and tools.'}</text><path d="M44 191H580" stroke="${t.line}"/><text x="44" y="222" fill="${t.muted}" font-size="13">${zh?'闽江大学　 /　机器学习 · 时间序列 · 软件工具':'Minjiang University  /  Machine learning · Time series · Software'}</text>${lattice}`;
    await writeFile(new URL(`hero-${locale}-${mode}.svg`,out), svg(960,260,t,'Lichao Lin — Research, Code & Systems',hero));
    for (const [i,p] of projects.entries()) {
      const copy=p[locale];
      const body=`<text x="26" y="34" fill="${t.accent}" font-size="10" letter-spacing="1.5">0${i+1} / ${p.tags}</text><text x="26" y="79" fill="${t.fg}" font-size="26" font-weight="650">${p.name}</text><text x="26" y="111" fill="${t.fg}" font-size="15">${copy[0]}</text><path d="M26 134H454" stroke="${t.line}"/><text x="26" y="162" fill="${t.muted}" font-size="14">${copy[1]}</text><text x="26" y="185" fill="${t.muted}" font-size="14">${copy[2]}</text><text x="26" y="222" fill="${t.accent}" font-size="11" letter-spacing="1.5">${zh?'查看项目':'EXPLORE PROJECT'} ↗</text>`;
      await writeFile(new URL(`${p.key}-${locale}-${mode}.svg`,out),svg(480,246,t,`${p.name}: ${copy.join(' ')}`,body));
    }
  }
}
console.log(`Generated 20 bilingual, theme-aware portfolio assets in ${fileURLToPath(out)}`);

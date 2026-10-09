import fs from 'node:fs/promises';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const checkout = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const fixtureRoot = process.argv[2];
const snapshotsPath = process.argv[3];
const outputRoot = process.argv[4];
if (!fixtureRoot || !snapshotsPath || !outputRoot) throw new Error('Usage: node scripts/replay-preserved-chart-evidence.mjs FIXTURE_ROOT SNAPSHOTS_JSON OUTPUT_DIR');
await fs.mkdir(outputRoot, {recursive:true});
const {normalizeChartReviewPolicy, observeChartInBrowser} = await import(pathToFileURL(`${checkout}/src/chart-review.mjs`));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const snapshots = JSON.parse(await fs.readFile(snapshotsPath, 'utf8'));
const sourcePaths = {
  data: `${fixtureRoot}/dist/data.js`,
  original_chart: `${fixtureRoot}/snapshot-R1-accepted-before-label-fix/src/TideChart.jsx`,
  repaired_chart: `${fixtureRoot}/src/TideChart.jsx`,
  scale: `${fixtureRoot}/src/tide.js`,
};
const sourceHashes = Object.fromEntries(await Promise.all(Object.entries(sourcePaths).map(async ([name,path]) => [name, {path,sha256:sha(await fs.readFile(path))}])));
const context = vm.createContext({});
vm.runInContext(await fs.readFile(sourcePaths.data,'utf8') + ';globalThis.data=TIDE_DATA;',context,{timeout:1000});
const sourceData = JSON.parse(JSON.stringify(context.data));
const scale = samples => {
  const heights=samples.map(p=>p.height);
  const min=Math.min(0,Math.floor(Math.min(...heights)*2)/2);
  let max=Math.ceil(Math.max(...heights)*2)/2;
  if(max<=Math.max(...heights)) max+=.5;
  const step=max-min>3?1:.5;
  const ticks=[];for(let n=min;n<=max+1e-9;n+=step)ticks.push(Math.round(n*100)/100);
  if(ticks.at(-1)<max)ticks.push(ticks.at(-1)+step);
  return [min,ticks.at(-1)];
};
const batches=[];
for(const version of ['original','repaired']) for(const viewportId of ['desktop','mobile']) for(const date of sourceData.dates){
  const cases=snapshots.filter(s=>s.version===version&&s.viewport.id===viewportId&&s.date===date);
  const policy=normalizeChartReviewPolicy({
    required_viewports:[cases[0].viewport],
    data_cases:cases.map(snapshot=>{
      const samples=sourceData.stations.find(s=>s.id===snapshot.station).days[date].samples;
      const [, ,width,height]=snapshot.view_box.split(/\s+/).map(Number);
      const compact=width<520;
      const pad={left:compact?40:52,right:compact?14:20,top:version==='original'?28:46,bottom:version==='original'?40:44};
      return {state_id:`${snapshot.station}-${date}`,
        source_ref:`${sourcePaths.data}#sha256=${sourceHashes.data.sha256}`,
        selection:{location:snapshot.station,day:date},
        points:samples.map(s=>({x:s.hour,y:s.height})),x_domain:[0,24],y_domain:scale(samples),
        plot_by_viewport:{[viewportId]:{x:pad.left,y:pad.top,width:width-pad.left-pad.right,height:height-pad.top-pad.bottom}},
        plot_source_ref:`${sourceHashes[`${version}_chart`].path}#sha256=${sourceHashes[`${version}_chart`].sha256}`};
    })
  });
  const candidate={chart_review_manifest:{chart_selector:'svg.tide-chart',series_selector:'.tide-chart__line',selection_selectors:{location:'#location',day:'#day'},states:cases.map(s=>({state_id:`${s.station}-${date}`,rendered_html:s.rendered_html}))}};
  const result=await observeChartInBrowser({candidate,implementationContract:{id:'judgmentkit.preserved-chart-regression',chart_review_policy:policy}});
  await fs.writeFile(`${outputRoot}/${version}-${viewportId}-${date}.json`,JSON.stringify(result,null,2));
  const entry={version,viewport_id:viewportId,date,outcome:result.outcome,diagnostics:result.diagnostics,coverage:result.coverage,environment:result.environment,
    binding:{candidate_sha256:result.candidate_sha256,contract_sha256:result.contract_sha256,policy_sha256:result.policy_sha256,manifest_sha256:result.manifest_sha256},
    snapshots:cases.map(s=>({state_id:`${s.station}-${date}`,html_sha256:sha(s.rendered_html)})),
    observations:result.observations?.map(o=>({state_id:o.state_id,viewport:o.viewport,html_sha256:o.html_sha256,checks:o.observation.checks,diagnostics:o.observation.diagnostics,plot_geometry_origin:o.observation.plot_geometry_origin}))};
  batches.push(entry);
  console.log(JSON.stringify({version,viewportId,date,outcome:entry.outcome,observations:entry.observations?.length,untested:entry.coverage?.untested?.length}));
}
const all=batches.flatMap(b=>b.observations?.map(o=>({version:b.version,...o}))??[]);
const summary=Object.fromEntries(['original','repaired'].map(version=>{
  const cases=all.filter(o=>o.version===version);
  return [version,{snapshots:cases.length,collision_failures:cases.filter(o=>o.checks.find(c=>c.id==='label_collision')?.outcome==='fail').length,clipping_failures:cases.filter(o=>o.checks.find(c=>c.id==='label_clipping')?.outcome==='fail').length,data_failures:cases.filter(o=>o.checks.find(c=>c.id==='selected_data_correspondence')?.outcome==='fail').length,passing_snapshots:cases.filter(o=>o.checks.length===3&&o.checks.every(c=>c.outcome==='pass')).length}];
}));
const observer_source_sha256=sha(await fs.readFile(`${checkout}/src/chart-review.mjs`));
const snapshots_sha256=sha(await fs.readFile(snapshotsPath));
const report={observer_source_sha256,snapshots_sha256,scope:'General JudgmentKit chart observer regression; preserved applications were not modified.',source_files:sourceHashes,capture:'Isolated Chromium browser captured exact selected DOM, inlined existing CSS and removed executable scripts. Native selected values were serialized. Static observer rerendered each snapshot independently. Plot coordinates are attributed to preserved source implementation; data truth comes from preserved data.js.',unsupported:['interactive transitions are not attested by static observer','human task completion','Artifact Inspector authority attestation'],summary,batches};
await fs.writeFile(`${outputRoot}/report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify(summary));
if(summary.original.snapshots!==56||summary.repaired.snapshots!==56||summary.original.collision_failures!==56||summary.repaired.passing_snapshots!==56)process.exitCode=1;

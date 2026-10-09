import { createHash } from "node:crypto";

const object = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value) => typeof value === "string" && value.trim().length > 0;
export const CHART_REVIEW_CHECKS = Object.freeze(["label_collision", "label_clipping", "selected_data_correspondence"]);
export const CHART_REVIEW_POLICY_ID = "judgmentkit.chart-review.v1";

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (object(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
export function chartEvidenceDigest(value) { return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex"); }
export function chartReviewCandidateDigest(candidate) {
  const next = structuredClone(candidate);
  if (object(next)) delete next.chart_review_evidence;
  return chartEvidenceDigest(next);
}
function invalid(path, message) {
  const error = new Error(`${path}: ${message}`);
  error.code = "invalid_chart_review_policy";
  error.details = { path };
  throw error;
}

/** Expected data is owned by the active implementation contract, not the UI. */
export function normalizeChartReviewPolicy(input) {
  if (input === undefined || input === null) return null;
  if (!object(input)) invalid("chart_review_policy", "must be an object");
  if (input.id !== undefined && input.id !== CHART_REVIEW_POLICY_ID) invalid("chart_review_policy.id", "unsupported policy identifier");
  if (input.version !== undefined && input.version !== "1.0.0") invalid("chart_review_policy.version", "unsupported policy version");
  const checks = input.required_checks ?? CHART_REVIEW_CHECKS;
  if (!Array.isArray(checks) || checks.length === 0 || checks.some((check) => !CHART_REVIEW_CHECKS.includes(check)) || new Set(checks).size !== checks.length) invalid("chart_review_policy.required_checks", "use unique supported check identifiers");
  const viewports = input.required_viewports ?? [{ id: "desktop", width: 1280, height: 800 }, { id: "mobile", width: 390, height: 844 }];
  if (!Array.isArray(viewports) || viewports.length === 0 || viewports.length > 4 || new Set(viewports.map((entry) => entry?.id)).size !== viewports.length) invalid("chart_review_policy.required_viewports", "declare one to four unique viewports");
  viewports.forEach((entry, index) => {
    if (!object(entry) || !text(entry.id) || !Number.isInteger(entry.width) || !Number.isInteger(entry.height) || entry.width < 200 || entry.width > 3840 || entry.height < 200 || entry.height > 2160) invalid(`chart_review_policy.required_viewports[${index}]`, "declare an id and bounded integer width/height");
  });
  const cases = input.data_cases;
  if (!Array.isArray(cases) || cases.length === 0 || cases.length > 16 || new Set(cases.map((entry) => entry?.state_id)).size !== cases.length) invalid("chart_review_policy.data_cases", "declare one to sixteen unique data states");
  const normalizedCases = cases.map((entry, index) => {
    const prefix = `chart_review_policy.data_cases[${index}]`;
    if (!object(entry) || !text(entry.state_id) || !text(entry.source_ref)) invalid(prefix, "each state requires state_id and attributed source_ref");
    if (!Array.isArray(entry.points) || entry.points.length < 2 || entry.points.length > 256 || entry.points.some((point) => !object(point) || !Number.isFinite(point.x) || !Number.isFinite(point.y))) invalid(`${prefix}.points`, "declare 2 to 256 finite x/y data points");
    for (const key of ["x_domain", "y_domain"]) if (!Array.isArray(entry[key]) || entry[key].length !== 2 || !entry[key].every(Number.isFinite) || entry[key][0] >= entry[key][1]) invalid(`${prefix}.${key}`, "declare an increasing finite two-value domain");
    if (entry.points.some((point, pointIndex) => point.x < entry.x_domain[0] || point.x > entry.x_domain[1] || point.y < entry.y_domain[0] || point.y > entry.y_domain[1] || (pointIndex > 0 && point.x <= entry.points[pointIndex - 1].x))) invalid(`${prefix}.points`, "points must increase in x and fit their declared domains");
    const selection = entry.selection ?? {};
    if (!object(selection) || Object.entries(selection).some(([key, value]) => !text(key) || typeof value !== "string")) invalid(`${prefix}.selection`, "map control ids to exact selected values");
    if (entry.required_labels !== undefined && (!Array.isArray(entry.required_labels) || entry.required_labels.length > 128 || entry.required_labels.some((label) => !object(label) || !text(label.text) || !text(label.role)))) invalid(`${prefix}.required_labels`, "declare at most 128 source-owned labels with text and role");
    if (entry.plot_by_viewport !== undefined) {
      if (!object(entry.plot_by_viewport) || !text(entry.plot_source_ref)) invalid(`${prefix}.plot_by_viewport`, "source-owned SVG plot coordinates require plot_source_ref");
      for (const viewport of viewports) {
        const plot = entry.plot_by_viewport[viewport.id];
        if (!object(plot) || ![plot.x, plot.y, plot.width, plot.height].every(Number.isFinite) || plot.width <= 0 || plot.height <= 0) invalid(`${prefix}.plot_by_viewport.${viewport.id}`, "declare finite SVG x/y and positive width/height");
      }
    }
    const source = { source_ref: entry.source_ref, selection, points: entry.points.map(({ x, y }) => ({ x, y })), x_domain: entry.x_domain, y_domain: entry.y_domain, ...(entry.required_labels ? { required_labels: entry.required_labels.map(({ text, role }) => ({ text, role })) } : {}), ...(entry.plot_by_viewport ? { plot_by_viewport: entry.plot_by_viewport, plot_source_ref: entry.plot_source_ref } : {}) };
    const digest = chartEvidenceDigest(source);
    if (entry.data_sha256 !== undefined && entry.data_sha256 !== digest) invalid(`${prefix}.data_sha256`, "data digest does not match the declared source data");
    return { state_id: entry.state_id, ...source, data_sha256: digest };
  });
  const tolerance = input.max_series_delta_css_px ?? 1.5;
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 3) invalid("chart_review_policy.max_series_delta_css_px", "use a tolerance between 0 and 3 CSS pixels");
  return { id: CHART_REVIEW_POLICY_ID, version: "1.0.0", required_checks: [...checks], required_viewports: viewports.map(({ id, width, height }) => ({ id, width, height })), data_cases: normalizedCases, max_series_delta_css_px: tolerance, evidence_authority: "trusted_static_browser_observation", unsupported_claims: ["interactive_selection_transitions", "canvas_or_webgl_data_correspondence", "axis_label_unit_semantics", "chart_accessibility_compliance", "human_task_completion", "artifact_inspector_interactive_attestation"] };
}

export function inspectChartManifest(candidate, policy) {
  if (!policy) return [];
  const diagnostics = [];
  const issue = (code, path, message) => diagnostics.push({ code, path, message });
  const manifest = candidate?.chart_review_manifest;
  if (!object(manifest)) {
    issue("chart_manifest_required", "candidate.chart_review_manifest", "The active chart policy requires selectors and snapshots for every data state; a no-applicability claim cannot disable it.");
    return diagnostics;
  }
  for (const key of ["chart_selector", "series_selector", ...(policy.data_cases.some((entry) => !entry.plot_by_viewport) ? ["plot_selector"] : [])]) if (!text(manifest[key])) issue("chart_selector_required", `candidate.chart_review_manifest.${key}`, "Declare the rendered chart, plot area, and data series selectors.");
  if (!Array.isArray(manifest.states)) issue("chart_states_required", "candidate.chart_review_manifest.states", "Declare an array containing each contract-required data state.");
  else {
    const states = manifest.states;
    const ids = states.map((state) => state?.state_id);
    if (new Set(ids).size !== ids.length || states.some((state) => !object(state) || !text(state.state_id))) issue("chart_state_identity_invalid", "candidate.chart_review_manifest.states", "Use unique nonempty state ids.");
    for (const expected of policy.data_cases) {
      const state = states.find((entry) => entry?.state_id === expected.state_id);
      if (!state) issue("chart_required_state_missing", "candidate.chart_review_manifest.states", `Provide the ${expected.state_id} snapshot required by the contract.`);
      else if (!text(state.rendered_html ?? candidate.rendered_html)) issue("chart_state_html_missing", "candidate.chart_review_manifest.states", `Provide safe self-contained rendered HTML for ${expected.state_id}.`);
    }
  }
  const selectors = manifest.selection_selectors ?? {};
  if (!object(selectors)) issue("chart_selection_selectors_invalid", "candidate.chart_review_manifest.selection_selectors", "Map contract control ids to rendered CSS selectors.");
  else for (const key of new Set(policy.data_cases.flatMap((entry) => Object.keys(entry.selection)))) if (!text(selectors[key])) issue("chart_selection_selector_missing", `candidate.chart_review_manifest.selection_selectors.${key}`, "Declare the native selected-value control for this contract selection.");
  return diagnostics;
}

export function chartObservationExpression(manifest, expected, policy, viewport, { admissionOnly = false } = {}) {
  return `(() => {
    const manifest = ${JSON.stringify(manifest)};
    const expected = ${JSON.stringify(expected)};
    const viewportId = ${JSON.stringify(viewport?.id)};
    const policy = ${JSON.stringify({ required_checks: policy.required_checks, max_series_delta_css_px: policy.max_series_delta_css_px, admission_only: admissionOnly })};
    const checks = []; const diagnostics = [];
    const box = (element) => { const r = element.getBoundingClientRect(); return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; };
    const target = (selector, path) => { let nodes; try { nodes = [...document.querySelectorAll(selector)]; } catch { diagnostics.push({code:'selector_syntax_invalid',path,message:'Use a valid CSS selector.'}); return null; } if (nodes.length !== 1) { diagnostics.push({code:'chart_selector_target_invalid',path,message:'Target exactly one rendered element.',observed_count:nodes.length}); return null; } return nodes[0]; };
    const chart = target(manifest.chart_selector,'candidate.chart_review_manifest.chart_selector');
    const sourcePlot = expected.plot_by_viewport?.[viewportId];
    const plot = sourcePlot ? null : target(manifest.plot_selector,'candidate.chart_review_manifest.plot_selector');
    const series = target(manifest.series_selector,'candidate.chart_review_manifest.series_selector');
    const selections = {};
    for (const [id, value] of Object.entries(expected.selection)) {
      const element = target(manifest.selection_selectors[id],'candidate.chart_review_manifest.selection_selectors.'+id);
      if (element && !element.matches('select,input,[role="combobox"]')) diagnostics.push({code:'chart_selection_target_not_control',path:'candidate.chart_review_manifest.selection_selectors.'+id,message:'Target the actual selected-value control.'});
      selections[id] = element ? (element.value ?? element.getAttribute('aria-valuetext') ?? null) : null;
    }
    if (diagnostics.length) return {diagnostics,checks,selected_values:selections};
    if (!chart.contains(series) || (plot && !chart.contains(plot))) return {diagnostics:[{code:'chart_selector_outside_chart',path:'candidate.chart_review_manifest',message:'The plot and series must belong to the declared chart.'}],checks,selected_values:selections};
    if(policy.admission_only) return {diagnostics,checks,selected_values:selections};
    const bounds = box(chart);
    let plotBounds;
    if(sourcePlot){if(!(chart instanceof SVGSVGElement))return {diagnostics:[{code:'source_plot_requires_svg',path:'candidate.chart_review_manifest.chart_selector',message:'Source-owned SVG coordinates require the actual SVG root.'}],checks};const matrix=chart.getScreenCTM();const a=new DOMPoint(sourcePlot.x,sourcePlot.y).matrixTransform(matrix),b=new DOMPoint(sourcePlot.x+sourcePlot.width,sourcePlot.y+sourcePlot.height).matrixTransform(matrix);plotBounds={left:a.x,top:a.y,right:b.x,bottom:b.y,width:b.x-a.x,height:b.y-a.y};}
    else plotBounds=box(plot);
    if (bounds.width <= 0 || bounds.height <= 0 || plotBounds.width <= 0 || plotBounds.height <= 0) return {diagnostics,checks:policy.required_checks.map(id=>({id,status:'observed',outcome:'fail',reason:'The declared chart or plot has no rendered area.'})),selected_values:selections};
    const visible = (element) => { for(let node=element;node;node=node.parentElement){const style=getComputedStyle(node);if(style.display==='none'||['hidden','collapse'].includes(style.visibility)||Number(style.opacity)===0)return false;}return true; };
    const hasComplexClip = (element) => { for(let node=element;node;node=node.parentElement){const style=getComputedStyle(node);if((style.clipPath&&style.clipPath!=='none')||(style.maskImage&&style.maskImage!=='none')||(node.getAttribute('clip-path')&&node.getAttribute('clip-path')!=='none')||(node.getAttribute('mask')&&node.getAttribute('mask')!=='none'))return true;}return false; };
    const labels = [...chart.querySelectorAll('text')].filter((element) => { const r=box(element); return visible(element) && r.width>0 && r.height>0 && element.textContent.trim(); }).map((element,index) => ({element,index,text:element.textContent.trim(),rect:box(element)}));
    if(labels.length>512)return {diagnostics:[{code:'chart_label_limit_exceeded',path:'candidate.chart_review_manifest',message:'Chart observation supports at most 512 visible text labels.'}],checks};
    const missingRequiredLabels=(expected.required_labels??[]).filter(required=>!labels.some(label=>label.text===required.text));
    const clippingUnsupported=labels.some(label=>hasComplexClip(label.element));
    const collisions = [];
    for (let i=0;i<labels.length;i++) for (let j=i+1;j<labels.length;j++) { const a=labels[i].rect,b=labels[j].rect; const w=Math.min(a.right,b.right)-Math.max(a.left,b.left),h=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top); if(w>0.5 && h>0.5) collisions.push({first:labels[i].text,second:labels[j].text,overlap_css_px:{width:w,height:h}}); }
    const clipped=[];
    for(const label of labels){
      const r=label.rect; const clip={...bounds};
      for(let ancestor=label.element.parentElement;ancestor;ancestor=ancestor.parentElement){
        const style=getComputedStyle(ancestor); let b=box(ancestor);
        if(ancestor instanceof HTMLElement || ancestor instanceof SVGSVGElement){
          const html=ancestor instanceof HTMLElement;
          const left=html?ancestor.clientLeft:parseFloat(style.borderLeftWidth)||0;
          const top=html?ancestor.clientTop:parseFloat(style.borderTopWidth)||0;
          const width=html?ancestor.offsetWidth:ancestor.clientWidth+left+(parseFloat(style.borderRightWidth)||0);
          const height=html?ancestor.offsetHeight:ancestor.clientHeight+top+(parseFloat(style.borderBottomWidth)||0);
          const scaleX=width>0?b.width/width:1,scaleY=height>0?b.height/height:1;
          const innerLeft=b.left+left*scaleX,innerTop=b.top+top*scaleY;
          b={left:innerLeft,top:innerTop,right:innerLeft+ancestor.clientWidth*scaleX,bottom:innerTop+ancestor.clientHeight*scaleY};
        }
        if(['hidden','clip','scroll','auto'].includes(style.overflowX)){clip.left=Math.max(clip.left,b.left);clip.right=Math.min(clip.right,b.right);}
        if(['hidden','clip','scroll','auto'].includes(style.overflowY)){clip.top=Math.max(clip.top,b.top);clip.bottom=Math.min(clip.bottom,b.bottom);}
      }
      if(r.left<clip.left-0.5||r.right>clip.right+0.5||r.top<clip.top-0.5||r.bottom>clip.bottom+0.5||r.left<-.5||r.right>innerWidth+.5) clipped.push({text:label.text,rect:r,clip});
    }
    if(policy.required_checks.includes('label_collision')) checks.push({id:'label_collision',status:labels.length||missingRequiredLabels.length?'observed':'untested',outcome:missingRequiredLabels.length?'fail':labels.length?(collisions.length?'fail':'pass'):'review_required',label_count:labels.length,findings:collisions,missing_required_labels:missingRequiredLabels});
    if(policy.required_checks.includes('label_clipping')) checks.push({id:'label_clipping',status:clippingUnsupported?'untested':labels.length||missingRequiredLabels.length?'observed':'untested',outcome:missingRequiredLabels.length?'fail':clippingUnsupported?'review_required':labels.length?(clipped.length?'fail':'pass'):'review_required',label_count:labels.length,findings:clipped,missing_required_labels:missingRequiredLabels,...(clippingUnsupported?{reason:'SVG/CSS clip paths or masks require a supported visibility observer.'}:{})});
    if(policy.required_checks.includes('selected_data_correspondence')) {
      const expectedPoints=expected.points.map((point)=>({x:plotBounds.left+(point.x-expected.x_domain[0])/(expected.x_domain[1]-expected.x_domain[0])*plotBounds.width,y:plotBounds.bottom-(point.y-expected.y_domain[0])/(expected.y_domain[1]-expected.y_domain[0])*plotBounds.height}));
      const seriesStyle=getComputedStyle(series),seriesBounds=box(series);
      const painted=seriesStyle.stroke!=='none' && !/rgba\\([^)]*,\\s*0\\)$/.test(seriesStyle.stroke) && Number(seriesStyle.strokeOpacity)!==0 && parseFloat(seriesStyle.strokeWidth)>0;
      const geometrySupported=series instanceof SVGGeometryElement && ['path','polyline'].includes(series.tagName.toLowerCase()) && series.getScreenCTM();
      const supported=geometrySupported && visible(series) && painted && seriesBounds.width>0;
      if(geometrySupported&&!supported) checks.push({id:'selected_data_correspondence',status:'observed',outcome:'fail',reason:'The required data series is hidden, unpainted, or has no rendered width.'});
      else if(!supported||hasComplexClip(series)) checks.push({id:'selected_data_correspondence',status:'untested',outcome:'review_required',reason:hasComplexClip(series)?'SVG/CSS clip paths or masks prevent verification of visible series correspondence.':'Only rendered SVG path/polyline series are supported.'});
      else {
        const matrix=series.getScreenCTM(); const length=series.getTotalLength(); const count=Math.min(2048,Math.max(32,Math.ceil(length*2))); const actualPoints=[];
        for(let i=0;i<=count;i++){const p=series.getPointAtLength(length*i/count);const q=new DOMPoint(p.x,p.y).matrixTransform(matrix);actualPoints.push({x:q.x,y:q.y});}
        const distance=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
        const toSegments=(p,points)=>Math.min(...points.slice(1).map((b,i)=>distance(p,points[i],b)));
        const dataDelta=Math.max(...expectedPoints.map((p)=>toSegments(p,actualPoints)),...actualPoints.map((p)=>toSegments(p,expectedPoints)));
        const selectedMatches=Object.entries(expected.selection).every(([id,value])=>selections[id]===value);
        const actualStart=actualPoints[0], actualEnd=actualPoints.at(-1);
        const endpointsMatch=Math.hypot(actualStart.x-expectedPoints[0].x,actualStart.y-expectedPoints[0].y)<=policy.max_series_delta_css_px && Math.hypot(actualEnd.x-expectedPoints.at(-1).x,actualEnd.y-expectedPoints.at(-1).y)<=policy.max_series_delta_css_px;
        checks.push({id:'selected_data_correspondence',status:'observed',outcome:selectedMatches&&endpointsMatch&&dataDelta<=policy.max_series_delta_css_px?'pass':'fail',selected_values:selections,expected_selected_values:expected.selection,source_ref:expected.source_ref,data_sha256:expected.data_sha256,max_series_delta_css_px:dataDelta,endpoints_match:endpointsMatch,series_tag:series.tagName.toLowerCase(),observed_geometry_points:actualPoints.length});
      }
    }
    return {diagnostics,checks,selected_values:selections,chart_bounds:bounds,plot_bounds:plotBounds,label_geometry_scope:expected.required_labels?.length?'contract_required_labels_and_visible_svg_text':'visible_svg_text_only',label_visibility:expected.required_labels?.length?'required_label_text_verified':'not_tested_without_contract_required_labels',plot_geometry_origin:sourcePlot?'contract_owned_svg_coordinates':'observed_plot_element',...(sourcePlot?{plot_source_ref:expected.plot_source_ref}:{})};
  })()`;
}

export async function observeChartInBrowser({ candidate, implementationContract } = {}) {
  const policy = implementationContract?.chart_review_policy;
  if (!policy) return { applicable: false, coverage: { declared: [], observed: [], untested: [] } };
  const diagnostics = inspectChartManifest(candidate, policy);
  if (diagnostics.length) return { applicable: true, diagnostics, outcome: "not_reviewed" };
  const manifest = candidate.chart_review_manifest;
  const { observeStaticDocumentsInBrowser } = await import("./visual-composition-browser-runtime.mjs");
  const documents = policy.data_cases.map((dataCase) => ({ id: dataCase.state_id, html: manifest.states.find((state) => state.state_id === dataCase.state_id).rendered_html ?? candidate.rendered_html }));
  const measured = await observeStaticDocumentsInBrowser({ documents, viewports: policy.required_viewports, expressionForDocument: (document, viewport) => chartObservationExpression(manifest, policy.data_cases.find((entry) => entry.state_id === document.id), policy, viewport) });
  const declared = policy.data_cases.flatMap(({ state_id }) => policy.required_viewports.flatMap(({ id }) => policy.required_checks.map((check) => ({ state_id, viewport_id: id, check }))));
  if (!measured.observations) return { applicable: true, reason: measured.reason, outcome: "review_required", coverage: { declared, observed: [], untested: declared, unsupported: policy.unsupported_claims }, findings: [{severity:"review_required",check:"chart_review",code:"chart_browser_observation_unavailable",message:"Independent chart observation is unavailable; no chart behavior is verified."}] };
  const binding = { candidate_sha256: chartReviewCandidateDigest(candidate), contract_sha256: chartEvidenceDigest(implementationContract), policy_sha256: chartEvidenceDigest(policy), manifest_sha256: chartEvidenceDigest(manifest) };
  const observed = measured.observations.flatMap((entry) => entry.observation.checks.filter((check) => check.status === "observed").map((check) => ({ state_id: entry.state_id, viewport_id: entry.viewport.id, check: check.id, outcome: check.outcome })));
  const untested = declared.filter((entry) => !observed.some((actual) => actual.state_id === entry.state_id && actual.viewport_id === entry.viewport_id && actual.check === entry.check));
  const findings = measured.observations.flatMap((entry) => entry.observation.checks.filter((check) => check.outcome !== "pass").map((check) => ({ severity: check.outcome === "fail" ? "fail" : "review_required", check: "chart_review", code: `chart_${check.id}_${check.outcome}`, message: `${check.id} ${check.outcome === "fail" ? "failed" : "remains untested"} for ${entry.state_id} at ${entry.viewport.id}.`, state_id: entry.state_id, viewport_id: entry.viewport.id, evidence: check })));
  const admissionDiagnostics = measured.observations.flatMap((entry) => entry.observation.diagnostics.map((diagnostic) => ({ ...diagnostic, state_id: entry.state_id, viewport_id: entry.viewport.id })));
  return { applicable: true, kind: "chart_review_evidence", version: "1.0.0", ...binding, environment: measured.environment, outcome: admissionDiagnostics.length ? "not_reviewed" : findings.some((finding) => finding.severity === "fail") ? "fail" : untested.length ? "review_required" : "pass", diagnostics: admissionDiagnostics, coverage: { declared, observed, untested, unsupported: policy.unsupported_claims, source_authenticity: "attributed_contract_input_not_independently_verified", label_geometry_scope: "visible_svg_text_plus_contract_required_labels_when_supplied" }, observations: measured.observations, findings };
}

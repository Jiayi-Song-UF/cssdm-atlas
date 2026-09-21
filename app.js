/* All numeric values are decoded in the original EPSG:32617 grid. */
"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const state = {meta: null, catalog: [], indices: null, countyIds: null, lookup: null,
    current: null, codes: null, map: null, image: null, vectors: null, base: null,
    controller: null, sequence: 0, imageURL: null, features: [], suppressHash: false};
  const stops = [[68,1,84],[59,82,139],[33,145,140],[94,201,98],[253,231,37]];
  const palette = Array.from({length: 256}, (_, i) => {
    const t = i / 255 * (stops.length - 1), a = Math.min(Math.floor(t), stops.length - 2), f = t - a;
    return stops[a].map((v, c) => Math.round(v * (1 - f) + stops[a + 1][c] * f));
  });
  const number = v => v === 0 || v === 1 ? String(v) : (Math.abs(v) < .001 ? v.toExponential(2) : v.toFixed(3));
  const status = (text, error = false) => { $("status").textContent = text; $("status").classList.toggle("error", error); };
  async function fetchJSON(path) {
    const response = await fetch(path, {cache: "no-cache"});
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    return response.json();
  }
  async function fetchBytes(path, signal) {
    const response = await fetch(path, {signal});
    if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    // Also accepts hosts that automatically decode Content-Encoding: gzip.
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) return bytes;
    if (!globalThis.DecompressionStream) throw new Error("Please use a recent Chrome, Edge, Firefox or Safari browser (gzip decoding required).");
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  function range() {
    if ($("scale").value === "relative" && state.current) {
      let [lo, , hi] = state.current.quantiles;
      if (hi <= lo) { lo = state.current.min; hi = state.current.max; }
      if (hi > lo) return [lo, hi];
    }
    return [0, 1];
  }
  function updateLegend() {
    const [lo, hi] = range();
    $("legend-min").textContent = number(lo); $("legend-mid").textContent = number((lo + hi) / 2); $("legend-max").textContent = number(hi);
    $("scale-note").textContent = $("scale").value === "relative"
      ? "Statewide species percentiles. Colors outside this range are clipped; scores are unchanged. Not for cross-species color comparison."
      : "Fixed 0–1 scale across species and counties. Scores are not validated occupancy probabilities.";
    if (state.current) $("precision").textContent = `Approximate web values · rounding error ≤ ${(state.current.step / 2).toExponential(2)}`;
  }
  async function renderRaster(sequence) {
    if (!state.codes || !state.current) return;
    updateLegend();
    const canvas = document.createElement("canvas");
    canvas.width = state.meta.width; canvas.height = state.meta.height;
    const ctx = canvas.getContext("2d"), img = ctx.createImageData(canvas.width, canvas.height);
    const [lo, hi] = range(), item = state.current;
    const colors = Array.from({length: 256}, (_, code) => palette[Math.max(0, Math.min(255, Math.round(((item.min + code * item.step) - lo) / (hi - lo) * 255)))]);
    for (let i = 0; i < state.indices.length; i++) {
      const p = state.indices[i] * 4, color = colors[state.codes[i]];
      img.data[p] = color[0]; img.data[p + 1] = color[1]; img.data[p + 2] = color[2]; img.data[p + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("The browser could not render the raster image.");
    if (sequence !== state.sequence) return;
    const nextURL = URL.createObjectURL(blob), previousURL = state.imageURL;
    state.imageURL = nextURL;
    const source = new ol.source.ImageStatic({url: nextURL, projection: state.meta.crs, imageExtent: state.meta.extent, interpolate: false});
    source.once("imageloadend", () => { if (previousURL) URL.revokeObjectURL(previousURL); });
    source.once("imageloaderror", () => status("Raster display failed. Try another species or reload the page.", true));
    state.image.setSource(source);
  }
  function filterSpecies() {
    const query = $("search").value.trim().toLowerCase(), kingdom = $("kingdom").value;
    const items = state.catalog.filter(s => (!kingdom || s.kingdom === kingdom) && (!query || s.name.toLowerCase().includes(query) || s.speciesKey.includes(query)));
    $("species").replaceChildren(...items.map(s => new Option(s.name, String(s.id))));
    if (state.current && items.some(s => s.id === state.current.id)) $("species").value = String(state.current.id);
    else $("species").selectedIndex = -1;
    $("species-count").textContent = `${items.length.toLocaleString()} of ${state.catalog.length.toLocaleString()} species · select below`;
  }
  function clearInspection() {
    $("inspection").replaceChildren();
    const title = document.createElement("strong"), body = document.createElement("p");
    title.textContent = "Inspect a location"; body.textContent = "Click the map to read a grid-cell prediction.";
    $("inspection").append(title, body);
  }
  async function selectSpecies(item) {
    if (!item) return;
    const sequence = ++state.sequence;
    state.controller?.abort(); state.controller = new AbortController();
    state.codes = null; state.current = item; state.image.setSource(null);
    $("selected-name").textContent = item.name; $("selected-kingdom").textContent = item.kingdom.toUpperCase();
    $("selected-detail").textContent = `Species key ${item.speciesKey} · five-model mean · 66 counties`;
    $("species").value = String(item.id);
    clearInspection(); updateLegend(); updateHash();
    status(`Loading statewide prediction… ${(item.bytes / 1024).toFixed(0)} KB`);
    try {
      const bytes = await fetchBytes(`data/${item.file}`, state.controller.signal);
      if (sequence !== state.sequence) return;
      if (bytes.length !== state.meta.n_cells) throw new Error("Prediction file length does not match the grid.");
      state.codes = bytes;
      await renderRaster(sequence);
      if (sequence === state.sequence) status("");
    } catch (error) {
      if (error.name !== "AbortError" && sequence === state.sequence) status(`Unable to load species: ${error.message}`, true);
    }
  }
  function inspect(coordinate) {
    const [x, y] = ol.proj.transform(coordinate, "EPSG:3857", state.meta.crs);
    const [lon, lat] = ol.proj.toLonLat(coordinate);
    const col = Math.floor((x - state.meta.extent[0]) / state.meta.pixel_size_m);
    const row = Math.floor((state.meta.extent[3] - y) / state.meta.pixel_size_m);
    const index = col >= 0 && col < state.meta.width && row >= 0 && row < state.meta.height ? state.lookup[row * state.meta.width + col] : -1;
    const box = $("inspection"); box.replaceChildren();
    const title = document.createElement("strong"), value = document.createElement("span"), body = document.createElement("p");
    value.className = "score";
    if (index >= 0 && state.codes) {
      const score = state.current.min + state.codes[index] * state.current.step;
      title.textContent = `${state.meta.counties[state.countyIds[index]].name} County`;
      value.textContent = `≈ ${number(score)}`;
      body.textContent = `${state.current.name} · model score, rounding error ≤ ${(state.current.step / 2).toExponential(2)}. Cell ${row}, ${col}.`;
      box.dataset.score = String(score); box.dataset.gridIndex = String(row * state.meta.width + col);
    } else {
      const feature = state.vectors.getSource().getFeaturesAtCoordinate(coordinate)[0];
      title.textContent = feature ? `${feature.get("name")} County` : "Outside prediction coverage";
      value.textContent = "No data";
      body.textContent = feature?.get("available") === false ? "Source imagery is unavailable for Monroe. This is not a prediction of zero." : index >= 0 ? "Wait for the selected species to finish loading." : "No prediction at this grid cell. Missing data are never filled with zero.";
      delete box.dataset.score; delete box.dataset.gridIndex;
    }
    const position = document.createElement("p"); position.className = "small"; position.textContent = `${lat.toFixed(5)}°, ${lon.toFixed(5)}°`;
    box.append(title, value, body, position);
  }
  function fitFlorida() {
    state.map.getView().fit(state.vectors.getSource().getExtent(), {padding: [135, 50, 85, 35], duration: 350});
    $("county").value = "";
  }
  function updateHash() {
    if (!state.map || !state.current || state.suppressHash) return;
    const view = state.map.getView(), center = view.getCenter();
    if (!center) return;
    const [lon, lat] = ol.proj.toLonLat(center);
    const params = new URLSearchParams({species: state.current.speciesKey, lon: lon.toFixed(5), lat: lat.toFixed(5), z: view.getZoom().toFixed(2), scale: $("scale").value});
    history.replaceState(null, "", `${location.pathname}${location.search}#${params}`);
  }
  function applyView(params) {
    const keys = ["lon", "lat", "z"], [lon, lat, zoom] = keys.map(k => Number(params.get(k)));
    if (keys.every(k => params.has(k)) && [lon, lat, zoom].every(Number.isFinite) && lon >= -180 && lon <= 180 && lat > -85 && lat < 85 && zoom >= 4 && zoom <= 17) {
      state.map.getView().setCenter(ol.proj.fromLonLat([lon, lat])); state.map.getView().setZoom(zoom);
    } else fitFlorida();
  }
  async function main() {
    if (location.protocol === "file:") throw new Error("Open this folder with a local HTTP server, or publish it to GitHub Pages. Double-clicking index.html cannot load the data.");
    if (!globalThis.ol || !globalThis.proj4) throw new Error("Map libraries are missing. Upload the complete vendor folder.");
    const initial = new URLSearchParams(location.hash.slice(1));
    const [meta, catalog, boundaries, ready] = await Promise.all([fetchJSON("data/metadata.json"), fetchJSON("data/species.json"), fetchJSON("data/counties.geojson"), fetchJSON("data/READY.json")]);
    if (!ready.passed || catalog.length !== meta.n_species) throw new Error("Atlas export is incomplete or failed validation.");
    Object.assign(state, {meta, catalog});
    const [indexBytes, countyIds] = await Promise.all([fetchBytes(`data/${meta.indices}`), fetchBytes(`data/${meta.county_ids}`)]);
    if (indexBytes.length !== meta.n_cells * 4 || countyIds.length !== meta.n_cells) throw new Error("Grid metadata length mismatch.");
    const view = new DataView(indexBytes.buffer, indexBytes.byteOffset, indexBytes.byteLength);
    state.indices = new Uint32Array(meta.n_cells); state.countyIds = countyIds;
    state.lookup = new Int32Array(meta.width * meta.height).fill(-1);
    for (let i = 0; i < meta.n_cells; i++) {
      const index = view.getUint32(i * 4, true);
      if (index >= state.lookup.length || state.lookup[index] !== -1 || countyIds[i] >= meta.n_counties) throw new Error("Invalid or duplicate grid index.");
      state.indices[i] = index; state.lookup[index] = i;
    }
    proj4.defs(meta.crs, "+proj=utm +zone=17 +datum=WGS84 +units=m +no_defs"); ol.proj.proj4.register(proj4);
    const vectorSource = new ol.source.Vector({features: new ol.format.GeoJSON().readFeatures(boundaries, {featureProjection: "EPSG:3857"})});
    const lineStyle = new ol.style.Style({stroke: new ol.style.Stroke({color:"rgba(29,56,47,.55)", width:.8})});
    const missingStyle = new ol.style.Style({stroke:new ol.style.Stroke({color:"#73847a",width:1,lineDash:[4,4]}), fill:new ol.style.Fill({color:"rgba(136,151,141,.40)"})});
    state.vectors = new ol.layer.Vector({source:vectorSource, style: feature => feature.get("available") === false ? missingStyle : ($("boundaries").checked ? lineStyle : null)});
    state.base = new ol.layer.Tile({source:new ol.source.OSM()});
    state.image = new ol.layer.Image({opacity:.85});
    state.map = new ol.Map({target:"map", layers:[state.base,state.image,state.vectors], view:new ol.View({center:ol.proj.fromLonLat([-83.5,28]),zoom:6,minZoom:4,maxZoom:17}), controls:ol.control.defaults.defaults().extend([new ol.control.ScaleLine()])});
    state.features = vectorSource.getFeatures().sort((a,b)=>a.get("name").localeCompare(b.get("name")));
    $("county").append(...state.features.map(f=>new Option(`${f.get("name")}${f.get("available") ? "" : " — no data"}`, f.get("fips"))));
    $("kingdom").append(...[...new Set(catalog.map(s=>s.kingdom))].sort().map(k=>new Option(k,k)));
    for (const id of ["search","kingdom","species","county","scale","opacity","boundaries","basemap","home","share"]) $(id).disabled=false;
    filterSpecies();
    $("search").addEventListener("input",filterSpecies); $("kingdom").addEventListener("change",filterSpecies);
    $("species").addEventListener("change",()=>selectSpecies(catalog.find(s=>s.id===Number($("species").value))));
    $("scale").addEventListener("change",async()=>{updateHash();try{await renderRaster(state.sequence);}catch(e){status(e.message,true);}});
    $("opacity").addEventListener("input",()=>{state.image.setOpacity(Number($("opacity").value)/100);$("opacity-value").textContent=`${$("opacity").value}%`;});
    $("boundaries").addEventListener("change",()=>state.vectors.changed());
    $("basemap").addEventListener("change",()=>state.base.setVisible($("basemap").checked));
    $("county").addEventListener("change",()=>{const f=state.features.find(f=>f.get("fips")===$("county").value);if(f)state.map.getView().fit(f.getGeometry().getExtent(),{padding:[140,50,110,40],duration:350,maxZoom:11});else fitFlorida();});
    $("home").addEventListener("click",fitFlorida);
    $("share").addEventListener("click",async()=>{updateHash();try{await navigator.clipboard.writeText(location.href);$("share").textContent="Link copied";setTimeout(()=>$("share").textContent="Copy map link",1800);}catch{window.prompt("Copy this map link:",location.href);}});
    state.map.on("singleclick",event=>inspect(event.coordinate)); state.map.on("moveend",updateHash);
    $("scale").value=initial.get("scale")==="relative"?"relative":"absolute";
    state.suppressHash=true; applyView(initial); state.suppressHash=false;
    const item=catalog.find(s=>s.speciesKey===initial.get("species")) || catalog.find(s=>s.name==="Cardinalis cardinalis") || catalog[0];
    await selectSpecies(item);
    window.addEventListener("hashchange",()=>{const params=new URLSearchParams(location.hash.slice(1));const next=catalog.find(s=>s.speciesKey===params.get("species"));state.suppressHash=true;applyView(params);$("scale").value=params.get("scale")==="relative"?"relative":"absolute";state.suppressHash=false;$("search").value="";$("kingdom").value="";filterSpecies();if(next)selectSpecies(next);});
    // Read-only hooks for reproducible browser QA; no user data is collected.
    window.CSSDM_ATLAS={state,inspect,selectSpecies,range};
  }
  main().catch(error=>{console.error(error);status(`Atlas could not start: ${error.message}`,true);$("selected-name").textContent="Atlas unavailable";});
})();

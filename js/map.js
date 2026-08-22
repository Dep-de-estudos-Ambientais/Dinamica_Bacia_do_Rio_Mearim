const BASEMAPS = {
  positron: 'https://tiles.openfreemap.org/styles/positron',
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark'
};

const palette = ['#386641','#6a994e','#a7c957','#bc6c25','#dda15e','#457b9d','#8d6e63','#7b2cbf','#2a9d8f','#e76f51','#5f6f52','#9c6644','#577590','#43aa8b','#f4a261','#8a817c','#669bbc','#9b5de5','#588157','#b56576','#4f772d','#90a955','#31572c','#9a6d38'];
const layerState = {
  bacia:true, municipios:true, sedes:true, rios_principais:true,
  hidrografia:false, geologia:false, relevo:false, hipsometria:false,
  solos:false, geodiversidade:false, terras_indigenas:false, ucs:false,
  aptidao:false
};
const cache = new Map();
const categoryColors = {};
const handlersBound = new Set();
let baciaBounds = null;
let thematicOpacity = 0.62;

const map = new maplibregl.Map({
  container: 'map',
  style: BASEMAPS.positron,
  center: [-45.9, -5.2],
  zoom: 5.7,
  attributionControl: true
});
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}), 'top-right');
map.addControl(new maplibregl.ScaleControl({maxWidth:120, unit:'metric'}), 'bottom-right');
window.mearimMap = map;
console.info('[Atlas Mearim] MapLibre iniciado:', maplibregl.version || 'versão não informada');

map.on('error', event => console.warn('[Atlas Mearim] Erro do mapa:', event?.error?.message || event?.error || event));

const loading = document.getElementById('loading');
const sidebar = document.getElementById('sidebar');
const legendPanel = document.getElementById('legendPanel');
const legendContent = document.getElementById('legendContent');

function setLoading(v, label='Carregando camada…') {
  loading.textContent = label;
  loading.classList.toggle('hidden', !v);
}
async function getData(key, url) {
  if (cache.has(key)) return cache.get(key);
  setLoading(true, 'Carregando ' + key.replaceAll('_',' ') + '…');
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Falha ao carregar ${url} (${r.status})`);
  const d = await r.json();
  cache.set(key, d);
  setLoading(false);
  return d;
}
function boundsFromGeoJSON(gj) {
  const b = new maplibregl.LngLatBounds();
  const walk = c => {
    if (typeof c?.[0] === 'number') { b.extend(c); return; }
    c?.forEach(walk);
  };
  gj.features.forEach(f => f.geometry?.coordinates && walk(f.geometry.coordinates));
  return b;
}
function colorFor(value,index){ return palette[index % palette.length]; }
function categoryMatch(field,values){
  const expr=['match',['get',field]];
  values.forEach((v,i)=>expr.push(v,colorFor(v,i)));
  expr.push('#b8c2bb');
  return expr;
}
function uniqueValues(gj,field){
  return [...new Set(gj.features.map(f=>f.properties?.[field]).filter(v=>v!==null&&v!==undefined&&v!==''))]
    .sort((a,b)=>String(a).localeCompare(String(b),'pt-BR'));
}
function safe(v){ return (v===null||v===undefined||v==='') ? '—' : String(v); }
function fmt(v,d=1){ const n=Number(v); return Number.isFinite(n) ? n.toLocaleString('pt-BR',{maximumFractionDigits:d}) : '—'; }
function popupHtml(title,rows){
  return `<h3 class="popup-title">${safe(title)}</h3><div class="popup-table">${rows.map(([a,b])=>`<span>${a}</span><strong>${safe(b)}</strong>`).join('')}</div>`;
}
function bindClickOnce(layerId, handler){
  const key='click:'+layerId;
  if (handlersBound.has(key)) return;
  map.on('click',layerId,handler);
  handlersBound.add(key);
}
function bindPointerOnce(layerId){
  const key='pointer:'+layerId;
  if (handlersBound.has(key)) return;
  map.on('mouseenter',layerId,()=>map.getCanvas().style.cursor='pointer');
  map.on('mouseleave',layerId,()=>map.getCanvas().style.cursor='');
  handlersBound.add(key);
}

async function addBacia(){
  const gj=await getData('bacia','data/limite_bacia.geojson');
  baciaBounds=boundsFromGeoJSON(gj);
  if(!map.getSource('bacia')) map.addSource('bacia',{type:'geojson',data:gj});
  map.addLayer({id:'bacia-fill',type:'fill',source:'bacia',paint:{'fill-color':'#2d7a53','fill-opacity':0.025}});
  map.addLayer({id:'bacia-line',type:'line',source:'bacia',paint:{'line-color':'#14532d','line-width':['interpolate',['linear'],['zoom'],5,2.4,10,4.2]}});
  bindClickOnce('bacia-fill',e=>{const p=e.features?.[0]?.properties||{};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(p.nome||p.bacia||'Bacia do Rio Mearim', [['Área',fmt(p.area_km2,1)+' km²']])).addTo(map);});
}

async function addMunicipios(){
  const gj=await getData('municipios','data/municipios_bacia.geojson');
  if(!map.getSource('municipios')) map.addSource('municipios',{type:'geojson',data:gj});
  map.addLayer({id:'municipios-fill',type:'fill',source:'municipios',paint:{'fill-color':'#718078','fill-opacity':0.04}});
  map.addLayer({id:'municipios-line',type:'line',source:'municipios',paint:{'line-color':'#4b5b53','line-width':0.75,'line-opacity':0.8}});
  bindClickOnce('municipios-fill',e=>{const p=e.features?.[0]?.properties||{};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(p.nome,[['Código IBGE',p.codigo],['Área municipal',fmt(p.area_km2,1)+' km²'],['Bioma',p.bioma],['Pop. 2022',p.pop_2022 ? Number(p.pop_2022).toLocaleString('pt-BR') : '—'],['Pop. 2025',p.pop_2025 ? Number(p.pop_2025).toLocaleString('pt-BR') : '—']])).addTo(map);});
  bindPointerOnce('municipios-fill');
  fillMunicipioSelect(gj);
}

async function addSedes(){
  const gj=await getData('sedes','data/sedes_municipais.geojson');
  if(!map.getSource('sedes')) map.addSource('sedes',{type:'geojson',data:gj});
  map.addLayer({id:'sedes-circle',type:'circle',source:'sedes',paint:{'circle-radius':['interpolate',['linear'],['zoom'],5,3,9,6],'circle-color':'#173126','circle-stroke-color':'#fff','circle-stroke-width':1.3}});
  map.addLayer({id:'sedes-label',type:'symbol',source:'sedes',minzoom:7,layout:{'text-field':['get','nome'],'text-size':10,'text-offset':[0,1.2],'text-anchor':'top'},paint:{'text-color':'#173126','text-halo-color':'#fff','text-halo-width':1.2}});
  bindClickOnce('sedes-circle',e=>{const p=e.features?.[0]?.properties||{};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(p.nome,[['Código IBGE',p.codigo],['UF',String(p.uf||'').toUpperCase()]])).addTo(map);});
  bindPointerOnce('sedes-circle');
}

async function addRiosPrincipais(){
  const defs=[
    ['rio_mearim','data/rio_mearim.geojson','#1d4ed8','Rio Mearim'],
    ['rio_grajau','data/rio_grajau.geojson','#0ea5e9','Rio Grajaú'],
    ['rio_pindare','data/rio_pindare.geojson','#06b6d4','Rio Pindaré']
  ];
  for(const [key,url,color,label] of defs){
    const gj=await getData(key,url);
    if(!map.getSource(key)) map.addSource(key,{type:'geojson',data:gj});
    map.addLayer({id:key+'-line',type:'line',source:key,paint:{'line-color':color,'line-width':['interpolate',['linear'],['zoom'],5,1.6,9,3.1,13,5],'line-opacity':0.95}});
    map.addLayer({id:key+'-label',type:'symbol',source:key,minzoom:6.5,layout:{'symbol-placement':'line','text-field':label,'text-size':11,'text-allow-overlap':false},paint:{'text-color':color,'text-halo-color':'#fff','text-halo-width':1.3}});
    bindClickOnce(key+'-line',e=>new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(label,[['Curso principal',label]])).addTo(map));
    bindPointerOnce(key+'-line');
  }
}

async function addHidrografia(){
  const gj=await getData('hidrografia','data/hidrografia.geojson');
  if(!map.getSource('hidrografia')) map.addSource('hidrografia',{type:'geojson',data:gj});
  map.addLayer({id:'hidrografia-line',type:'line',source:'hidrografia',paint:{'line-color':'#2f7da0','line-width':['interpolate',['linear'],['zoom'],5,.35,9,1,13,1.8],'line-opacity':0.72}});
  map.addLayer({id:'hidrografia-label',type:'symbol',source:'hidrografia',minzoom:10,layout:{'symbol-placement':'line','text-field':['coalesce',['get','nome'],''],'text-size':9,'text-allow-overlap':false},paint:{'text-color':'#235d78','text-halo-color':'#fff','text-halo-width':1.1}});
  bindClickOnce('hidrografia-line',e=>{const p=e.features?.[0]?.properties||{};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml('Hidrografia',[['Nome',p.nome],['Comprimento informado',p.comprimento_m ? fmt(p.comprimento_m,0)+' m' : '—']])).addTo(map);});
  bindPointerOnce('hidrografia-line');
}

async function addCategoricalPolygon({key,url,field,title,popupRows,lineColor='rgba(55,44,32,.48)'}){
  const gj=await getData(key,url);
  const vals=uniqueValues(gj,field); categoryColors[key]={values:vals,title};
  if(!map.getSource(key)) map.addSource(key,{type:'geojson',data:gj});
  map.addLayer({id:key+'-fill',type:'fill',source:key,paint:{'fill-color':categoryMatch(field,vals),'fill-opacity':thematicOpacity}});
  map.addLayer({id:key+'-line',type:'line',source:key,paint:{'line-color':lineColor,'line-width':0.55}});
  bindClickOnce(key+'-fill',e=>{const p=e.features?.[0]?.properties||{};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(title,popupRows(p))).addTo(map);});
  bindPointerOnce(key+'-fill');
}

const addGeologia=()=>addCategoricalPolygon({key:'geologia',url:'data/geologia.geojson',field:'unidade',title:'Geologia',popupRows:p=>[['Unidade',p.unidade]]});
const addRelevo=()=>addCategoricalPolygon({key:'relevo',url:'data/relevo.geojson',field:'classe',title:'Relevo',popupRows:p=>[['Classe',p.classe]]});
const addHipsometria=()=>addCategoricalPolygon({key:'hipsometria',url:'data/hipsometria.geojson',field:'classe',title:'Hipsometria',popupRows:p=>[['Classe',p.classe],['Área informada',p.area_km2 ? fmt(p.area_km2,1)+' km²' : '—']]});
const addSolos=()=>addCategoricalPolygon({key:'solos',url:'data/solos.geojson',field:'ordem',title:'Solos',popupRows:p=>[['Ordem',p.ordem],['Legenda detalhada',p.legenda]]});
const addGeodiversidade=()=>addCategoricalPolygon({key:'geodiversidade',url:'data/geodiversidade.geojson',field:'unidade',title:'Geodiversidade',popupRows:p=>[['Unidade',p.unidade],['Sigla',p.sigla],['Hierarquia',p.hierarquia],['Litotipo',p.litotipo],['Domínio',p.dominio],['Relevo',p.relevo]]});
const addAptidao=()=>addCategoricalPolygon({key:'aptidao',url:'data/aptidao_agricola.geojson',field:'classe',title:'Aptidão agrícola',popupRows:p=>[['Classe',p.classe],['Área informada',p.area_km2 ? fmt(p.area_km2,1)+' km²' : '—']]});

async function addTerrasIndigenas(){
  const gj=await getData('terras_indigenas','data/terras_indigenas.geojson');
  if(!map.getSource('terras_indigenas')) map.addSource('terras_indigenas',{type:'geojson',data:gj});
  map.addLayer({id:'terras_indigenas-fill',type:'fill',source:'terras_indigenas',paint:{'fill-color':'#c2410c','fill-opacity':Math.min(thematicOpacity,.52)}});
  map.addLayer({id:'terras_indigenas-line',type:'line',source:'terras_indigenas',paint:{'line-color':'#9a3412','line-width':1.2}});
  bindClickOnce('terras_indigenas-fill',e=>{const p=e.features?.[0]?.properties||{};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(p.nome||'Terra Indígena',[['Fase',p.fase],['Superfície informada',p.superficie_ha ? fmt(p.superficie_ha,0)+' ha' : '—']])).addTo(map);});
  bindPointerOnce('terras_indigenas-fill');
}

async function addUcs(){
  const gj=await getData('ucs','data/unidades_conservacao.geojson');
  if(!map.getSource('ucs')) map.addSource('ucs',{type:'geojson',data:gj});
  map.addLayer({id:'ucs-fill',type:'fill',source:'ucs',paint:{'fill-color':'#15803d','fill-opacity':Math.min(thematicOpacity,.46)}});
  map.addLayer({id:'ucs-line',type:'line',source:'ucs',paint:{'line-color':'#166534','line-width':1.25}});
  bindClickOnce('ucs-fill',e=>{const p=e.features?.[0]?.properties||{};const nome=p.nome_estadual||p.nome_federal||'Unidade de Conservação';new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(nome,[['Categoria',p.categoria],['Grupo',p.grupo],['Esfera',p.esfera],['Ano de criação',p.ano_criacao]])).addTo(map);});
  bindPointerOnce('ucs-fill');
}

const adders={
  bacia:addBacia, municipios:addMunicipios, sedes:addSedes, rios_principais:addRiosPrincipais,
  hidrografia:addHidrografia, geologia:addGeologia, relevo:addRelevo, hipsometria:addHipsometria,
  solos:addSolos, geodiversidade:addGeodiversidade, terras_indigenas:addTerrasIndigenas, ucs:addUcs,
  aptidao:addAptidao
};
const ids={
  bacia:['bacia-fill','bacia-line'], municipios:['municipios-fill','municipios-line'], sedes:['sedes-circle','sedes-label'],
  rios_principais:['rio_mearim-line','rio_mearim-label','rio_grajau-line','rio_grajau-label','rio_pindare-line','rio_pindare-label'],
  hidrografia:['hidrografia-line','hidrografia-label'], geologia:['geologia-fill','geologia-line'], relevo:['relevo-fill','relevo-line'],
  hipsometria:['hipsometria-fill','hipsometria-line'], solos:['solos-fill','solos-line'], geodiversidade:['geodiversidade-fill','geodiversidade-line'],
  terras_indigenas:['terras_indigenas-fill','terras_indigenas-line'], ucs:['ucs-fill','ucs-line'], aptidao:['aptidao-fill','aptidao-line']
};
function exists(key){ return ids[key].some(id=>map.getLayer(id)); }
async function setLayer(key,on){
  layerState[key]=on;
  try{
    if(on&&!exists(key)) await adders[key]();
    ids[key].forEach(id=>{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none');});
    updateLegend();
  }catch(err){
    setLoading(false); console.error('[Atlas Mearim]',err); layerState[key]=false;
    const input=document.querySelector(`input[data-layer="${key}"]`); if(input)input.checked=false;
    alert('Não foi possível carregar esta camada. Consulte o Console do navegador para detalhes.');
  }
}

function updateLegend(){
  let html='';
  for(const key of ['geologia','relevo','hipsometria','solos','geodiversidade','aptidao']){
    if(layerState[key]&&categoryColors[key]){
      const {values,title}=categoryColors[key];
      html+=`<div class="legend-title">${title}</div><div class="legend-list">${values.map((v,i)=>`<div class="legend-item"><i class="swatch" style="background:${colorFor(v,i)}"></i><span>${safe(v)}</span></div>`).join('')}</div>`;
    }
  }
  if(layerState.rios_principais) html+='<div class="legend-title">Rios principais</div><div class="legend-item"><i class="line-swatch" style="background:#1d4ed8"></i><span>Rio Mearim</span></div><div class="legend-item"><i class="line-swatch" style="background:#0ea5e9"></i><span>Rio Grajaú</span></div><div class="legend-item"><i class="line-swatch" style="background:#06b6d4"></i><span>Rio Pindaré</span></div>';
  if(layerState.hidrografia) html+='<div class="legend-title">Rede hidrográfica</div><div class="legend-item"><i class="line-swatch" style="background:#2f7da0"></i><span>Curso d\'água</span></div>';
  if(layerState.terras_indigenas) html+='<div class="legend-title">Proteção territorial</div><div class="legend-item"><i class="swatch" style="background:#c2410c"></i><span>Terra Indígena</span></div>';
  if(layerState.ucs) html+='<div class="legend-item"><i class="swatch" style="background:#15803d"></i><span>Unidade de Conservação</span></div>';
  legendContent.innerHTML=html;
  legendPanel.classList.toggle('hidden',!html);
}

function fillMunicipioSelect(gj){
  const sel=document.getElementById('municipioSelect'); if(sel.options.length>1)return;
  gj.features.slice().sort((a,b)=>safe(a.properties.nome).localeCompare(safe(b.properties.nome),'pt-BR')).forEach(f=>{const o=document.createElement('option');o.value=f.properties.codigo;o.textContent=f.properties.nome;sel.appendChild(o);});
}
async function zoomMunicipio(){
  const code=document.getElementById('municipioSelect').value;if(!code)return;
  const gj=await getData('municipios','data/municipios_bacia.geojson');
  const f=gj.features.find(x=>String(x.properties.codigo)===String(code));
  if(f)map.fitBounds(boundsFromGeoJSON({features:[f]}),{padding:70,duration:700});
}
async function rehydrate(){
  for(const [k,on] of Object.entries(layerState)) if(on) await adders[k]();
  updateLegend();
}
function applyOpacity(){
  const polygonKeys=['geologia','relevo','hipsometria','solos','geodiversidade','aptidao'];
  polygonKeys.forEach(k=>{const id=k+'-fill';if(map.getLayer(id))map.setPaintProperty(id,'fill-opacity',thematicOpacity);});
  if(map.getLayer('terras_indigenas-fill')) map.setPaintProperty('terras_indigenas-fill','fill-opacity',Math.min(thematicOpacity,.52));
  if(map.getLayer('ucs-fill')) map.setPaintProperty('ucs-fill','fill-opacity',Math.min(thematicOpacity,.46));
}

map.on('load',async()=>{
  await rehydrate();
  if(baciaBounds) map.fitBounds(baciaBounds,{padding:55,duration:900});
  const mun=await getData('municipios','data/municipios_bacia.geojson'); fillMunicipioSelect(mun);
});

document.querySelectorAll('input[data-layer]').forEach(el=>el.addEventListener('change',e=>setLayer(e.target.dataset.layer,e.target.checked)));
document.getElementById('menuBtn').addEventListener('click',()=>{sidebar.classList.toggle('closed');document.body.classList.toggle('sidebar-closed');setTimeout(()=>map.resize(),260);});
document.getElementById('homeBtn').addEventListener('click',()=>{if(baciaBounds)map.fitBounds(baciaBounds,{padding:55,duration:700});});
document.getElementById('zoomMunicipioBtn').addEventListener('click',zoomMunicipio);
document.getElementById('municipioSelect').addEventListener('keydown',e=>{if(e.key==='Enter')zoomMunicipio();});
document.getElementById('basemapSelect').addEventListener('change',e=>{
  setLoading(true,'Trocando mapa-base…'); map.setStyle(BASEMAPS[e.target.value]);
  map.once('style.load',async()=>{await rehydrate();applyOpacity();setLoading(false);});
});
document.getElementById('thematicOpacity').addEventListener('input',e=>{thematicOpacity=Number(e.target.value)/100;applyOpacity();});

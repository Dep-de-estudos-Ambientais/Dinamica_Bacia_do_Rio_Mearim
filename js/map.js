// Mapas-base rasterizados mantidos DENTRO DO MESMO estilo MapLibre.
// Assim, a troca do mapa-base não usa map.setStyle(), que removeria todas
// as fontes e camadas GeoJSON do Atlas. Alternamos apenas a visibilidade
// das duas camadas raster, preservando Municípios, Sedes, Rios e demais temas.
const BASE_STYLE = {
  version: 8,
  sources: {
    esriWorldImagery: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: 'Tiles &copy; Esri — World Imagery'
    },
    osmStandard: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }
  },
  layers: [
    {
      id: 'basemap-satellite',
      type: 'raster',
      source: 'esriWorldImagery',
      layout: { visibility: 'visible' }
    },
    {
      id: 'basemap-osm',
      type: 'raster',
      source: 'osmStandard',
      layout: { visibility: 'none' }
    }
  ]
};

function setBasemap(name) {
  const satelliteVisible = name === 'satellite';
  const osmVisible = name === 'osm';

  if (map.getLayer('basemap-satellite')) {
    map.setLayoutProperty(
      'basemap-satellite',
      'visibility',
      satelliteVisible ? 'visible' : 'none'
    );
  }

  if (map.getLayer('basemap-osm')) {
    map.setLayoutProperty(
      'basemap-osm',
      'visibility',
      osmVisible ? 'visible' : 'none'
    );
  }

  // As camadas de referência continuam acima dos temas e do mapa-base.
  raiseReferenceLayers();
}

// Paleta de contingência para qualquer categoria sem cor explícita.
const palette = ['#386641','#6a994e','#a7c957','#bc6c25','#dda15e','#457b9d','#8d6e63','#7b2cbf','#2a9d8f','#e76f51','#5f6f52','#9c6644','#577590','#43aa8b','#f4a261','#8a817c','#669bbc','#9b5de5','#588157','#b56576','#4f772d','#90a955','#31572c','#9a6d38'];

// Cores recuperadas dos arquivos ArcGIS .lyr fornecidos para o estudo.
// Os .lyr armazenam as cores em CIELAB; os valores abaixo são equivalentes sRGB
// usados no navegador.
const LYR_COLORS = {
  geologia: {
    'Barreiras':'#ffce27','Coberturas Lateríticas Imaturas':'#fbeaa1','Coberturas Lateríticas Maturas':'#f9db97',
    'Codó':'#ecfeca','Corda':'#56b560','Depósitos Aluvionares':'#fff4d3','Depósitos colúvio-eluviais':'#ffe083',
    'Depósitos de pântanos e mangues':'#faf8d8','Depósitos flúvio-lagunares':'#f5f590','Grajaú':'#b6e1ba',
    'Ipixuna':'#c8d1a6','Itapecuru':'#b8d1bd','Mosquito':'#00e1fe','Rosário':'#ff978e','Sambaíba, Grupo Balsas':'#b8cebd'
  },
  relevo: {
    'Baixos platôs':'#7c0034','Baixos platôs dissecados':'#9f8315','Degraus estruturais e rebordos erosivos':'#e1afc7',
    'Domínio de colinas dissecadas e de morros baixos':'#49fb30','Domínio de morros e de serras baixas':'#00e7b9',
    'Domínios de colinas amplas e suaves':'#d7fdcc','Inselbergs e outros relevos residuais':'#eb8cfc','Planaltos':'#cf640e',
    'Planícies fluviais ou flúvio-lacustres':'#fffecc','Planícies flúvio-marinhas':'#9dbfc5',
    'Superfícies aplainadas retocadas ou degradadas':'#eae6f0','Vales encaixados':'#9e5978'
  },
  hipsometria: {
    '0 - 78,12':'#007210','78,13 - 170,07':'#88b721','170,08 - 251,20':'#fefd32',
    '251,21 - 335,03':'#ffab1f','335,04 - 686,58':'#ff3f08'
  },
  solos: {
    'Argissolo Amarelo':'#f6d6d2','Argissolo Vermelho':'#f89592','Argissolo Vermelho-Amarelo':'#ffb893',
    'Gleissolo Haplico':'#c1dff1','Gleissolo Melanico':'#7efbfb','Gleissolo Tiomorfico':'#7bb2d5',
    'Latossolo Amarelo':'#ffd674','Latossolo Vermelho':'#f9c695','Latossolo Vermelho-Amarelo':'#fadab6',
    'Luvissolo Cromico':'#dfa72b','Luvissolo Háplico':'#ddc023','Neossolo Flúvico':'#f1efe3',
    'Neossolo Litólico':'#a7a6a6','Neossolo Quartzarênico':'#fefd8c','Nitossolo Vermelho':'#bb4d09',
    'Plintossolo Argilúvico':'#f59dd3','Plintossolo Haplico':'#dfc7d3','Plintossolo Petrico':'#f3bcd4',
    'Vertissolo Ebanico':'#97a086','Água':'#0085fc'
  },
  geodiversidade: {
    'DCDL':'#eac792','DCDLi':'#f2d0a3','DCGR2salc':'#ff9554','DCSR':'#fbefcc','DCT':'#fee05a',
    'DCa':'#fdf0c8','DCfl':'#fffcdb','DCm':'#ffecd1','DSVMPae':'#a3b487','DSVMPaef':'#dbe5c4',
    'DSVMPasaf':'#7ec358','DSVMPsabc':'#68a555','DVMba':'#0061b5'
  },
  aptidao: {'B/A':'#4afb30','B/P':'#eae92d','N/R':'#bfbfbf','R/A':'#ff2b06','R/P':'#fffecc'}
};

const layerState = {
  bacia:true, municipios:true, sedes:true, rios_principais:true,
  massas_agua:false, hidrografia:false, geologia:false, relevo:false, hipsometria:false,
  solos:false, geodiversidade:false, terras_indigenas:false, ucs:false, aptidao:false
};
const cache = new Map();
const categoryColors = {};
const handlersBound = new Set();
let baciaBounds = null;
let thematicOpacity = 0.62;

const map = new maplibregl.Map({
  container: 'map', style: BASE_STYLE, center: [-45.9, -5.2], zoom: 5.7, attributionControl: true
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

function setLoading(v, label='Carregando camada…') { loading.textContent=label; loading.classList.toggle('hidden',!v); }
async function getData(key,url){
  if(cache.has(key)) return cache.get(key);
  setLoading(true,'Carregando '+key.replaceAll('_',' ')+'…');
  const r=await fetch(url); if(!r.ok) throw new Error(`Falha ao carregar ${url} (${r.status})`);
  const d=await r.json(); cache.set(key,d); setLoading(false); return d;
}
function boundsFromGeoJSON(gj){ const b=new maplibregl.LngLatBounds(); const walk=c=>{if(typeof c?.[0]==='number'){b.extend(c);return;}c?.forEach(walk);}; gj.features.forEach(f=>f.geometry?.coordinates&&walk(f.geometry.coordinates)); return b; }
function colorFor(value,index){ return palette[index % palette.length]; }
function uniqueValues(gj,field){ return [...new Set(gj.features.map(f=>f.properties?.[field]).filter(v=>v!==null&&v!==undefined&&v!==''))].sort((a,b)=>String(a).localeCompare(String(b),'pt-BR')); }
function colorExpression(field,values,colorMap={}){ const expr=['match',['get',field]]; values.forEach((v,i)=>expr.push(v,colorMap[v]||colorFor(v,i))); expr.push('#b8c2bb'); return expr; }
function safe(v){ return (v===null||v===undefined||v==='')?'—':String(v); }
function fmt(v,d=1){ const n=Number(v); return Number.isFinite(n)?n.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—'; }
function popupHtml(title,rows){ return `<h3 class="popup-title">${safe(title)}</h3><div class="popup-table">${rows.map(([a,b])=>`<span>${a}</span><strong>${safe(b)}</strong>`).join('')}</div>`; }
function firstProperty(p,names){ for(const n of names){ if(p[n]!==undefined&&p[n]!==null&&p[n]!=='') return p[n]; } return null; }
function genericRows(p,max=5){ const skip=/^(objectid|fid|id|shape|shape_leng|shape_area)$/i; return Object.entries(p||{}).filter(([k,v])=>!skip.test(k)&&v!==null&&v!==undefined&&v!=='').slice(0,max).map(([k,v])=>[k.replaceAll('_',' '),v]); }
function bindClickOnce(layerId,handler){ const key='click:'+layerId;if(handlersBound.has(key))return;map.on('click',layerId,handler);handlersBound.add(key); }
function bindPointerOnce(layerId){ const key='pointer:'+layerId;if(handlersBound.has(key))return;map.on('mouseenter',layerId,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',layerId,()=>map.getCanvas().style.cursor='');handlersBound.add(key); }

// Mantém Limite da bacia, Municípios e Sedes acima de toda camada temática.
function raiseReferenceLayers(){
  const ordered=['bacia-fill','municipios-fill','bacia-line','municipios-line','sedes-circle','sedes-label'];
  ordered.forEach(id=>{ if(map.getLayer(id)) map.moveLayer(id); });
}

async function addBacia(){
  const gj=await getData('bacia','data/limite_bacia.geojson'); baciaBounds=boundsFromGeoJSON(gj);
  if(!map.getSource('bacia')) map.addSource('bacia',{type:'geojson',data:gj});
  map.addLayer({id:'bacia-fill',type:'fill',source:'bacia',paint:{'fill-color':'#2d7a53','fill-opacity':0.012}});
  map.addLayer({id:'bacia-line',type:'line',source:'bacia',paint:{'line-color':'#14532d','line-width':['interpolate',['linear'],['zoom'],5,2.7,10,4.5]}});
  bindClickOnce('bacia-fill',e=>{const p=e.features?.[0]?.properties||{};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(p.nome||p.bacia||'Bacia do Rio Mearim',[['Área',fmt(p.area_km2,2)+' km²']])).addTo(map);});
}
async function addMunicipios(){
  const gj=await getData('municipios','data/municipios_bacia.geojson'); if(!map.getSource('municipios')) map.addSource('municipios',{type:'geojson',data:gj});
  map.addLayer({id:'municipios-fill',type:'fill',source:'municipios',paint:{'fill-color':'#718078','fill-opacity':0.012}});
  map.addLayer({id:'municipios-line',type:'line',source:'municipios',paint:{'line-color':'#394a42','line-width':['interpolate',['linear'],['zoom'],5,.8,10,1.4],'line-opacity':0.95}});
  bindClickOnce('municipios-fill',e=>{const p=e.features?.[0]?.properties||{};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(p.nome,[['Código IBGE',p.codigo],['Área municipal',fmt(p.area_km2,1)+' km²'],['Bioma',p.bioma],['Pop. 2022',p.pop_2022?Number(p.pop_2022).toLocaleString('pt-BR'):'—'],['Pop. 2025',p.pop_2025?Number(p.pop_2025).toLocaleString('pt-BR'):'—']])).addTo(map);});
  bindPointerOnce('municipios-fill'); fillMunicipioSelect(gj);
}
async function addSedes(){
  const gj=await getData('sedes','data/sedes_municipais.geojson'); if(!map.getSource('sedes')) map.addSource('sedes',{type:'geojson',data:gj});
  map.addLayer({id:'sedes-circle',type:'circle',source:'sedes',paint:{'circle-radius':['interpolate',['linear'],['zoom'],5,3.2,9,6.2],'circle-color':'#173126','circle-stroke-color':'#fff','circle-stroke-width':1.5}});
  map.addLayer({id:'sedes-label',type:'symbol',source:'sedes',minzoom:7,layout:{'text-field':['get','nome'],'text-size':10,'text-offset':[0,1.2],'text-anchor':'top'},paint:{'text-color':'#173126','text-halo-color':'#fff','text-halo-width':1.4}});
  bindClickOnce('sedes-circle',e=>{const p=e.features?.[0]?.properties||{};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(p.nome,[['Código IBGE',p.codigo],['UF',String(p.uf||'').toUpperCase()]])).addTo(map);}); bindPointerOnce('sedes-circle');
}
async function addRiosPrincipais(){
  const defs=[['rio_mearim','data/rio_mearim.geojson','#1d4ed8','Rio Mearim'],['rio_grajau','data/rio_grajau.geojson','#0ea5e9','Rio Grajaú'],['rio_pindare','data/rio_pindare.geojson','#06b6d4','Rio Pindaré']];
  for(const [key,url,color,label] of defs){ const gj=await getData(key,url);if(!map.getSource(key))map.addSource(key,{type:'geojson',data:gj});map.addLayer({id:key+'-line',type:'line',source:key,paint:{'line-color':color,'line-width':['interpolate',['linear'],['zoom'],5,1.6,9,3.1,13,5],'line-opacity':0.95}});map.addLayer({id:key+'-label',type:'symbol',source:key,minzoom:6.5,layout:{'symbol-placement':'line','text-field':label,'text-size':11,'text-allow-overlap':false},paint:{'text-color':color,'text-halo-color':'#fff','text-halo-width':1.3}});bindClickOnce(key+'-line',e=>new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(label,[['Curso principal',label]])).addTo(map));bindPointerOnce(key+'-line'); }
}
async function addMassasAgua(){
  const gj=await getData('massas_agua','data/Lagos_Mearim.geojson'); if(!map.getSource('massas_agua')) map.addSource('massas_agua',{type:'geojson',data:gj});
  map.addLayer({id:'massas_agua-fill',type:'fill',source:'massas_agua',paint:{'fill-color':'#2f9ed6','fill-opacity':Math.min(.78,Math.max(.40,thematicOpacity+.08))}});
  map.addLayer({id:'massas_agua-line',type:'line',source:'massas_agua',paint:{'line-color':'#126b9b','line-width':1.05,'line-opacity':.95}});
  bindClickOnce('massas_agua-fill',e=>{const p=e.features?.[0]?.properties||{};const nome=firstProperty(p,['nome','NOME','Nome','name','DENOMINACAO','denominacao'])||'Massa de água';const rows=genericRows(p,6);new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(nome,rows.length?rows:[['Camada','Massa de água']])).addTo(map);}); bindPointerOnce('massas_agua-fill');
}
async function addHidrografia(){
  const gj=await getData('hidrografia','data/hidrografia.geojson');if(!map.getSource('hidrografia'))map.addSource('hidrografia',{type:'geojson',data:gj});map.addLayer({id:'hidrografia-line',type:'line',source:'hidrografia',paint:{'line-color':'#2f7da0','line-width':['interpolate',['linear'],['zoom'],5,.35,9,1,13,1.8],'line-opacity':0.72}});map.addLayer({id:'hidrografia-label',type:'symbol',source:'hidrografia',minzoom:10,layout:{'symbol-placement':'line','text-field':['coalesce',['get','nome'],''],'text-size':9,'text-allow-overlap':false},paint:{'text-color':'#235d78','text-halo-color':'#fff','text-halo-width':1.1}});bindClickOnce('hidrografia-line',e=>{const p=e.features?.[0]?.properties||{};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml('Hidrografia',[['Nome',p.nome],['Comprimento informado',p.comprimento_m?fmt(p.comprimento_m,0)+' m':'—']])).addTo(map);});bindPointerOnce('hidrografia-line');
}
async function addCategoricalPolygon({key,url,field,title,popupRows,colorMap={},lineColor='rgba(55,44,32,.48)'}){
  const gj=await getData(key,url); const vals=uniqueValues(gj,field); categoryColors[key]={values:vals,title,colorMap};
  if(!map.getSource(key))map.addSource(key,{type:'geojson',data:gj});
  map.addLayer({id:key+'-fill',type:'fill',source:key,paint:{'fill-color':colorExpression(field,vals,colorMap),'fill-opacity':thematicOpacity}});
  map.addLayer({id:key+'-line',type:'line',source:key,paint:{'line-color':lineColor,'line-width':.55}});
  bindClickOnce(key+'-fill',e=>{const p=e.features?.[0]?.properties||{};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(title,popupRows(p))).addTo(map);});bindPointerOnce(key+'-fill');
}
const addGeologia=()=>addCategoricalPolygon({key:'geologia',url:'data/geologia.geojson',field:'unidade',title:'Geologia',colorMap:LYR_COLORS.geologia,popupRows:p=>[['Unidade',p.unidade]]});
const addRelevo=()=>addCategoricalPolygon({key:'relevo',url:'data/relevo.geojson',field:'classe',title:'Relevo',colorMap:LYR_COLORS.relevo,popupRows:p=>[['Classe',p.classe]]});
const addHipsometria=()=>addCategoricalPolygon({key:'hipsometria',url:'data/hipsometria.geojson',field:'classe',title:'Hipsometria',colorMap:LYR_COLORS.hipsometria,popupRows:p=>[['Classe',p.classe],['Área informada',p.area_km2?fmt(p.area_km2,1)+' km²':'—']]});
const addSolos=()=>addCategoricalPolygon({key:'solos',url:'data/solos.geojson',field:'ordem',title:'Solos',colorMap:LYR_COLORS.solos,popupRows:p=>[['Ordem',p.ordem],['Legenda detalhada',p.legenda]]});
const addGeodiversidade=()=>addCategoricalPolygon({key:'geodiversidade',url:'data/geodiversidade.geojson',field:'cod_unigeo',title:'Geodiversidade',colorMap:LYR_COLORS.geodiversidade,popupRows:p=>[['Código da unidade',p.cod_unigeo],['Unidade geológica',p.unidade],['Sigla',p.sigla],['Unidade geodiversidade',p.unigeo],['Domínio',p.dominio],['Relevo',p.relevo]]});
const addAptidao=()=>addCategoricalPolygon({key:'aptidao',url:'data/aptidao_agricola.geojson',field:'classe',title:'Aptidão agrícola',colorMap:LYR_COLORS.aptidao,popupRows:p=>[['Classe',p.classe],['Área informada',p.area_km2?fmt(p.area_km2,1)+' km²':'—']]});
async function addTerrasIndigenas(){const gj=await getData('terras_indigenas','data/terras_indigenas.geojson');if(!map.getSource('terras_indigenas'))map.addSource('terras_indigenas',{type:'geojson',data:gj});map.addLayer({id:'terras_indigenas-fill',type:'fill',source:'terras_indigenas',paint:{'fill-color':'#c2410c','fill-opacity':Math.min(thematicOpacity,.52)}});map.addLayer({id:'terras_indigenas-line',type:'line',source:'terras_indigenas',paint:{'line-color':'#9a3412','line-width':1.2}});bindClickOnce('terras_indigenas-fill',e=>{const p=e.features?.[0]?.properties||{};new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(p.nome||'Terra Indígena',[['Fase',p.fase],['Superfície informada',p.superficie_ha?fmt(p.superficie_ha,0)+' ha':'—']])).addTo(map);});bindPointerOnce('terras_indigenas-fill');}
async function addUcs(){const gj=await getData('ucs','data/unidades_conservacao.geojson');if(!map.getSource('ucs'))map.addSource('ucs',{type:'geojson',data:gj});map.addLayer({id:'ucs-fill',type:'fill',source:'ucs',paint:{'fill-color':'#15803d','fill-opacity':Math.min(thematicOpacity,.46)}});map.addLayer({id:'ucs-line',type:'line',source:'ucs',paint:{'line-color':'#166534','line-width':1.25}});bindClickOnce('ucs-fill',e=>{const p=e.features?.[0]?.properties||{};const nome=p.nome_estadual||p.nome_federal||'Unidade de Conservação';new maplibregl.Popup().setLngLat(e.lngLat).setHTML(popupHtml(nome,[['Categoria',p.categoria],['Grupo',p.grupo],['Esfera',p.esfera],['Ano de criação',p.ano_criacao]])).addTo(map);});bindPointerOnce('ucs-fill');}

const adders={bacia:addBacia,municipios:addMunicipios,sedes:addSedes,rios_principais:addRiosPrincipais,massas_agua:addMassasAgua,hidrografia:addHidrografia,geologia:addGeologia,relevo:addRelevo,hipsometria:addHipsometria,solos:addSolos,geodiversidade:addGeodiversidade,terras_indigenas:addTerrasIndigenas,ucs:addUcs,aptidao:addAptidao};
const ids={
  bacia:['bacia-fill','bacia-line'],municipios:['municipios-fill','municipios-line'],sedes:['sedes-circle','sedes-label'],
  rios_principais:['rio_mearim-line','rio_mearim-label','rio_grajau-line','rio_grajau-label','rio_pindare-line','rio_pindare-label'],
  massas_agua:['massas_agua-fill','massas_agua-line'],hidrografia:['hidrografia-line','hidrografia-label'],
  geologia:['geologia-fill','geologia-line'],relevo:['relevo-fill','relevo-line'],hipsometria:['hipsometria-fill','hipsometria-line'],solos:['solos-fill','solos-line'],geodiversidade:['geodiversidade-fill','geodiversidade-line'],terras_indigenas:['terras_indigenas-fill','terras_indigenas-line'],ucs:['ucs-fill','ucs-line'],aptidao:['aptidao-fill','aptidao-line']
};
function exists(key){return ids[key].some(id=>map.getLayer(id));}
async function setLayer(key,on){
  layerState[key]=on;
  try{
    if(on&&!exists(key)) await adders[key]();
    ids[key].forEach(id=>{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none');});
    raiseReferenceLayers(); updateLegend();
  }catch(err){setLoading(false);console.error('[Atlas Mearim]',err);layerState[key]=false;const input=document.querySelector(`input[data-layer="${key}"]`);if(input)input.checked=false;alert('Não foi possível carregar esta camada. Consulte o Console do navegador para detalhes.');}
}
function updateLegend(){
  let html='';
  for(const key of ['geologia','relevo','hipsometria','solos','geodiversidade','aptidao']){
    if(layerState[key]&&categoryColors[key]){const {values,title,colorMap}=categoryColors[key];html+=`<div class="legend-title">${title}</div><div class="legend-list">${values.map((v,i)=>`<div class="legend-item"><i class="swatch" style="background:${colorMap[v]||colorFor(v,i)}"></i><span>${safe(v)}</span></div>`).join('')}</div>`;}
  }
  if(layerState.rios_principais) html+='<div class="legend-title">Rios principais</div><div class="legend-item"><i class="line-swatch" style="background:#1d4ed8"></i><span>Rio Mearim</span></div><div class="legend-item"><i class="line-swatch" style="background:#0ea5e9"></i><span>Rio Grajaú</span></div><div class="legend-item"><i class="line-swatch" style="background:#06b6d4"></i><span>Rio Pindaré</span></div>';
  if(layerState.massas_agua) html+='<div class="legend-title">Massas de água</div><div class="legend-item"><i class="swatch" style="background:#2f9ed6"></i><span>Lagos e outras massas de água</span></div>';
  if(layerState.hidrografia) html+='<div class="legend-title">Rede hidrográfica</div><div class="legend-item"><i class="line-swatch" style="background:#2f7da0"></i><span>Curso d\'água</span></div>';
  if(layerState.terras_indigenas) html+='<div class="legend-title">Proteção territorial</div><div class="legend-item"><i class="swatch" style="background:#c2410c"></i><span>Terra Indígena</span></div>';
  if(layerState.ucs) html+='<div class="legend-item"><i class="swatch" style="background:#15803d"></i><span>Unidade de Conservação</span></div>';
  legendContent.innerHTML=html; legendPanel.classList.toggle('hidden',!html);
}
function fillMunicipioSelect(gj){const sel=document.getElementById('municipioSelect');if(sel.options.length>1)return;gj.features.slice().sort((a,b)=>safe(a.properties.nome).localeCompare(safe(b.properties.nome),'pt-BR')).forEach(f=>{const o=document.createElement('option');o.value=f.properties.codigo;o.textContent=f.properties.nome;sel.appendChild(o);});}
async function zoomMunicipio(){const code=document.getElementById('municipioSelect').value;if(!code)return;const gj=await getData('municipios','data/municipios_bacia.geojson');const f=gj.features.find(x=>String(x.properties.codigo)===String(code));if(f)map.fitBounds(boundsFromGeoJSON({features:[f]}),{padding:70,duration:700});}
async function rehydrate(){for(const [k,on] of Object.entries(layerState))if(on)await adders[k]();raiseReferenceLayers();updateLegend();}
function applyOpacity(){['geologia','relevo','hipsometria','solos','geodiversidade','aptidao'].forEach(k=>{const id=k+'-fill';if(map.getLayer(id))map.setPaintProperty(id,'fill-opacity',thematicOpacity);});if(map.getLayer('massas_agua-fill'))map.setPaintProperty('massas_agua-fill','fill-opacity',Math.min(.78,Math.max(.40,thematicOpacity+.08)));if(map.getLayer('terras_indigenas-fill'))map.setPaintProperty('terras_indigenas-fill','fill-opacity',Math.min(thematicOpacity,.52));if(map.getLayer('ucs-fill'))map.setPaintProperty('ucs-fill','fill-opacity',Math.min(thematicOpacity,.46));raiseReferenceLayers();}

map.on('load',async()=>{await rehydrate();if(baciaBounds)map.fitBounds(baciaBounds,{padding:55,duration:900});const mun=await getData('municipios','data/municipios_bacia.geojson');fillMunicipioSelect(mun);});
document.querySelectorAll('input[data-layer]').forEach(el=>el.addEventListener('change',e=>setLayer(e.target.dataset.layer,e.target.checked)));
document.getElementById('menuBtn').addEventListener('click',()=>{sidebar.classList.toggle('closed');document.body.classList.toggle('sidebar-closed');setTimeout(()=>map.resize(),260);});
document.getElementById('homeBtn').addEventListener('click',()=>{if(baciaBounds)map.fitBounds(baciaBounds,{padding:55,duration:700});});
document.getElementById('zoomMunicipioBtn').addEventListener('click',zoomMunicipio);
document.getElementById('municipioSelect').addEventListener('keydown',e=>{if(e.key==='Enter')zoomMunicipio();});
document.getElementById('basemapSelect').addEventListener('change',e=>{setLoading(true,'Trocando mapa-base…');setBasemap(e.target.value);window.setTimeout(()=>setLoading(false),120);});
document.getElementById('thematicOpacity').addEventListener('input',e=>{thematicOpacity=Number(e.target.value)/100;applyOpacity();});

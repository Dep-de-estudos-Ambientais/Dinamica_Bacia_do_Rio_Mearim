// ============================================================================
// BACIA HIDROGRÁFICA DO RIO MEARIM
// APP MAPBIOMAS — MÓDULOS TEMÁTICOS
//
// MÓDULO 1 — USO E COBERTURA DA TERRA:
// 1. Mapa temporal (padrão)
// 2. Comparar anos (Swipe / Lado a lado)
//    - Comparativo de áreas
//    - Principais transições de uso e cobertura
//    - Destaque espacial da transição selecionada
//
// MÓDULO 2 — DINÂMICA DA ÁGUA:
// 1. Superfície anual
// 2. Comparar anos (ganhos, perdas e saldo)
// 3. Frequência histórica da água
//
// RESPONSIVIDADE:
// - Mobile: mapa em tela cheia + painel de controles sobreposto
// - Tablet: painel lateral compacto
// - Desktop: painel lateral completo
//
// MapBiomas Brasil — Coleção 10.1 + MapBiomas Água — Coleção 4 | 1985–2024
// ============================================================================


// ============================================================================
// 1. DADOS
// ============================================================================

var bacia = ee.FeatureCollection(
  'projects/deaimesc/assets/bacia_mearim'
);

var mapbiomas = ee.Image(
  'projects/mapbiomas-public/assets/brazil/lulc/collection10_1/' +
  'mapbiomas_brazil_collection10_1_coverage_v1'
);


// MapBiomas Água — Coleção 4
// Asset oficial de superfície de água (série anual 1985–2024).
var mapbiomasAgua = ee.Image(
  'projects/mapbiomas-public/assets/brazil/water/collection4/' +
  'mapbiomas_brazil_collection4_water_v3'
);

// Asset oficial de classificação dos tipos de corpos hídricos.
var mapbiomasCorposAgua = ee.Image(
  'projects/mapbiomas-public/assets/brazil/water/collection4/' +
  'mapbiomas_brazil_collection4_water_bodies_v1'
);

// Máscara raster da bacia.
// É reaplicada depois de qualquer unmask para garantir que NENHUM
// raster seja exibido fora da Bacia do Rio Mearim.
var mascaraBaciaRaster = ee.Image
  .constant(1)
  .clipToCollection(bacia)
  .selfMask();


// ============================================================================
// 2. LEGENDA MAPBIOMAS
// ============================================================================

var CLASS_CODES = [
  1, 3, 4, 5, 6, 49,
  10, 11, 12, 32, 29, 50,
  14, 15, 18, 19, 39, 20, 40, 62, 41,
  36, 46, 47, 35, 48,
  9, 21,
  22, 23, 24, 30, 75, 25,
  26, 33, 31,
  27
];

var CLASS_NAMES = [
  'Floresta',
  'Formação Florestal',
  'Formação Savânica',
  'Mangue',
  'Floresta Alagável',
  'Restinga Arbórea',
  'Vegetação Herbácea e Arbustiva',
  'Campo Alagado e Área Pantanosa',
  'Formação Campestre',
  'Apicum',
  'Afloramento Rochoso',
  'Restinga Herbácea',
  'Agropecuária',
  'Pastagem',
  'Agricultura',
  'Lavoura Temporária',
  'Soja',
  'Cana',
  'Arroz',
  'Algodão',
  'Outras Lavouras Temporárias',
  'Lavoura Perene',
  'Café',
  'Citrus',
  'Dendê',
  'Outras Lavouras Perenes',
  'Silvicultura',
  'Mosaico de Usos',
  'Área não Vegetada',
  'Praia, Duna e Areal',
  'Área Urbanizada',
  'Mineração',
  'Usina Fotovoltaica',
  'Outras Áreas não Vegetadas',
  "Corpo d'água",
  'Rio, Lago e Oceano',
  'Aquicultura',
  'Não Observado'
];

var CLASS_COLORS = [
  '1f8d49', '1f8d49', '7dc975', '04381d', '007785', '02d659',
  'd6bc74', '519799', 'd6bc74', 'fc8114', 'ffaa5f', 'ad5100',
  'ffefc3', 'edde8e', 'e974ed', 'c27ba0', 'f5b3c8', 'db7093',
  'c71585', 'ff69b4', 'f54ca9', 'd082de', 'd68fe2', '9932cc',
  '9065d0', 'e6ccff', '7a5900', 'ffefc3', 'd4271e', 'ffa07a',
  'd4271e', '9c0027', 'c12100', 'db4d4f', '2532e4', '2532e4',
  '091077', 'ffffff'
];


// ============================================================================
// 3. FUNÇÕES AUXILIARES
// ============================================================================

function indiceClasse(codigo) {
  return CLASS_CODES.indexOf(Number(codigo));
}

function nomeClasse(codigo) {
  var indice = indiceClasse(codigo);
  return indice >= 0 ? CLASS_NAMES[indice] : 'Classe ' + codigo;
}

function corClasse(codigo) {
  var indice = indiceClasse(codigo);
  return indice >= 0 ? CLASS_COLORS[indice] : '999999';
}

function imagemAno(ano) {
  return mapbiomas
    .select('classification_' + ano)
    .clipToCollection(bacia);
}

function imagemVisual(ano) {
  return imagemAno(ano).remap(
    CLASS_CODES,
    ee.List.sequence(0, CLASS_CODES.length - 1)
  );
}

function formatarNumero(valor, casas) {
  if (valor === null || valor === undefined || isNaN(valor)) {
    return '—';
  }

  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas
  });
}

function camadaLimite() {
  var limite = bacia.style({
    color: '111111',
    fillColor: '00000000',
    width: 2
  });

  return ui.Map.Layer(
    limite,
    {},
    'Limite da Bacia do Mearim',
    true,
    1
  );
}


// ============================================================================
// 3.1. FUNÇÕES AUXILIARES — MAPBIOMAS ÁGUA
// ============================================================================

// A integração anual da Coleção 4 usa bandas classification_YYYY.
// O resultado é normalizado para 0/1, mantendo máscara somente na bacia.
function aguaAnoBinaria(ano) {
  return mapbiomasAgua
    .select('classification_' + ano)
    .unmask(0)
    .gt(0)
    .rename('agua')
    .updateMask(mascaraBaciaRaster);
}

// Para visualização, mantém somente os pixels classificados como água.
function aguaAnoVisual(ano) {
  return aguaAnoBinaria(ano)
    .selfMask()
    .rename('agua');
}

// O asset de corpos hídricos é anual e pode ter prefixo diferente de
// "water_". Por isso selecionamos a banda que contém o ano desejado.
// O select([0]) garante uma única banda mesmo que o padrão encontre mais.
function corposAguaAno(ano) {
  var bruto = mapbiomasCorposAgua
    .select('.*' + ano + '.*')
    .select([0])
    .rename('tipo')
    .updateMask(mascaraBaciaRaster);

  // O produto metodológico trabalha com:
  // 1 Natural | 2 Reservatórios | 3 Hidrelétricas | 4 Água em mineração
  // 5 Aquicultura. A Coleção 4 disponibiliza essas cinco classes no produto
  // de classificação de corpos hídricos (beta).
  return bruto.updateMask(
    bruto.gte(1).and(bruto.lte(5))
  );
}

function areaMascaraKm2(mascara) {
  var area = ee.Image
    .pixelArea()
    .divide(1000000)
    .rename('area_km2')
    .updateMask(mascara);

  var resultado = area.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: bacia.geometry(),
    scale: 30,
    maxPixels: 1e13,
    tileScale: 4
  });

  return ee.Number(
    ee.Algorithms.If(
      resultado.get('area_km2'),
      resultado.get('area_km2'),
      0
    )
  );
}

function areaAguaAnoKm2(ano) {
  return areaMascaraKm2(
    aguaAnoBinaria(ano).eq(1)
  );
}

// Frequência histórica da ocorrência de água no mapa anual.
// Ex.: 100 = classificado como água em todos os anos da série.
function frequenciaAguaHistorica() {
  var imagens = [];

  for (var anoFreq = 1985; anoFreq <= 2024; anoFreq++) {
    imagens.push(
      aguaAnoBinaria(anoFreq)
        .unmask(0)
        .updateMask(mascaraBaciaRaster)
    );
  }

  return ee.ImageCollection
    .fromImages(imagens)
    .mean()
    .multiply(100)
    .rename('frequencia')
    .updateMask(mascaraBaciaRaster);
}

// Classes de frequência para a interface.
// 1 = baixa frequência (>0 e <10%)
// 2 = infrequente (10–49%)
// 3 = intermitente (50–90%)
// 4 = permanente (>90% e ocorrência em pelo menos um dos 3 últimos anos)
function classeFrequenciaAgua() {
  var freq = frequenciaAguaHistorica();

  var ocorreuUltimos3 = aguaAnoBinaria(2022)
    .add(aguaAnoBinaria(2023))
    .add(aguaAnoBinaria(2024))
    .gt(0);

  var classe = ee.Image(0)
    .where(freq.gt(0).and(freq.lt(10)), 1)
    .where(freq.gte(10).and(freq.lt(50)), 2)
    .where(freq.gte(50).and(freq.lte(90)), 3)
    .where(freq.gt(90).and(ocorreuUltimos3), 4)
    .rename('classe_freq')
    .updateMask(mascaraBaciaRaster);

  // Mostra apenas áreas que tiveram ao menos uma ocorrência anual.
  return classe.updateMask(freq.gt(0));
}

function nomeFrequenciaAgua(valor) {
  valor = Number(valor);

  if (valor > 90) return 'Permanente';
  if (valor >= 50) return 'Intermitente';
  if (valor >= 10) return 'Infrequente';
  if (valor > 0) return 'Baixa frequência';

  return 'Sem ocorrência anual';
}

var TIPOS_AGUA_CODES = [1, 2, 3, 4, 5];

var TIPOS_AGUA_NAMES = [
  'Natural',
  'Reservatório',
  'Hidrelétrica',
  'Água em mineração',
  'Aquicultura'
];

// Cores de visualização do App (não substituem a legenda metodológica).
var TIPOS_AGUA_COLORS = [
  '2b83ba',
  'fdae61',
  '7b3294',
  'd7191c',
  '1a9850'
];

function indiceTipoAgua(codigo) {
  return TIPOS_AGUA_CODES.indexOf(Number(codigo));
}

function nomeTipoAgua(codigo) {
  var indice = indiceTipoAgua(codigo);
  return indice >= 0
    ? TIPOS_AGUA_NAMES[indice]
    : 'Tipo ' + codigo;
}

function corTipoAgua(codigo) {
  var indice = indiceTipoAgua(codigo);
  return indice >= 0
    ? TIPOS_AGUA_COLORS[indice]
    : '999999';
}

function adicionarLinhaLegenda(painelDestino, codigo, complemento) {
  var quadrado = ui.Label({
    value: '',
    style: {
      backgroundColor: '#' + corClasse(codigo),
      padding: '7px',
      margin: '1px 7px 3px 0',
      border: '1px solid #dddddd'
    }
  });

  var texto = nomeClasse(codigo);
  if (complemento) {
    texto += '  |  ' + complemento;
  }

  var label = ui.Label({
    value: texto,
    style: {
      fontSize: '10px',
      color: '#444444',
      margin: '2px 0 3px 0'
    }
  });

  painelDestino.add(
    ui.Panel({
      widgets: [quadrado, label],
      layout: ui.Panel.Layout.flow('horizontal')
    })
  );
}


// ============================================================================
// 4. ESTADO DA APLICAÇÃO
// ============================================================================

var moduloAtual = 'Uso e Cobertura da Terra';
var modoAtual = 'Mapa temporal';
var modoUsoAtual = 'Mapa temporal';

var anoSimples = 2024;
var anoA = 1985;
var anoB = 2024;

// Estado do módulo Água.
var anoAgua = 2024;
var anoAguaA = 1985;
var anoAguaB = 2024;
var anoCorposAgua = 2024;
var modoAguaAtual = 'Superfície anual';

var dispositivoAtual = 'desktop';
var ultimoBreakpoint = null;
var menuMobileAberto = false;

var ANOS = [];
for (var anoLista = 1985; anoLista <= 2024; anoLista++) {
  ANOS.push(String(anoLista));
}


// ============================================================================
// 5. MAPAS
// ============================================================================

var mapaSimples = ui.Map();
var mapaA = ui.Map();
var mapaB = ui.Map();

mapaSimples.setOptions('HYBRID');
mapaA.setOptions('HYBRID');
mapaB.setOptions('HYBRID');

[mapaSimples, mapaA, mapaB].forEach(function(mapa) {
  mapa.style().set({
    cursor: 'crosshair',
    stretch: 'both'
  });
});

var linker = ui.Map.Linker(
  [mapaSimples, mapaA, mapaB],
  'change-bounds'
);


// ============================================================================
// 6. RÓTULOS DOS MAPAS COMPARATIVOS
// ============================================================================

var labelMapaA = ui.Label({
  value: String(anoA),
  style: {
    position: 'top-left',
    margin: '12px',
    padding: '6px 12px',
    backgroundColor: '#ffffffee',
    color: '#174b32',
    fontWeight: 'bold',
    fontSize: '18px',
    border: '1px solid #dddddd'
  }
});

var labelMapaB = ui.Label({
  value: String(anoB),
  style: {
    // top-center evita conflito com os controles nativos Mapa/Satélite
    position: 'top-center',
    margin: '12px',
    padding: '6px 12px',
    backgroundColor: '#ffffffee',
    color: '#174b32',
    fontWeight: 'bold',
    fontSize: '18px',
    border: '1px solid #dddddd'
  }
});

mapaA.add(labelMapaA);
mapaB.add(labelMapaB);



// ============================================================================
// 6.1. MÓDULO TEMÁTICO
// ============================================================================

var seletorModulo = ui.Select({
  items: [
    'Uso e Cobertura da Terra',
    'Dinâmica da Água'
  ],
  value: 'Uso e Cobertura da Terra',
  style: {
    stretch: 'horizontal',
    margin: '3px 0 8px 0'
  }
});

var painelModulo = ui.Panel({
  widgets: [
    ui.Label({
      value: 'MÓDULO TEMÁTICO',
      style: {
        fontSize: '10px',
        fontWeight: 'bold',
        color: '#555555',
        margin: '0 0 2px 0'
      }
    }),
    seletorModulo
  ],
  style: {
    stretch: 'horizontal',
    margin: '0 0 10px 0',
    padding: '0 0 10px 0',
    border: '0 0 1px 0 solid #dddddd'
  }
});

// ============================================================================
// 7. CONTROLE DE VISUALIZAÇÃO
// ============================================================================

var seletorVisualizacao = ui.Select({
  items: ['Mapa temporal', 'Comparar anos'],
  value: 'Mapa temporal',
  style: {
    stretch: 'horizontal',
    margin: '3px 0 8px 0'
  }
});

var painelVisualizacao = ui.Panel({
  widgets: [
    ui.Label({
      value: 'ALTERAR VISUALIZAÇÃO',
      style: {
        fontSize: '10px',
        fontWeight: 'bold',
        color: '#555555',
        margin: '0 0 2px 0'
      }
    }),
    seletorVisualizacao
  ],
  style: {
    stretch: 'horizontal',
    margin: '0 0 10px 0',
    padding: '0 0 10px 0',
    border: '0 0 1px 0 solid #dddddd'
  }
});


// ============================================================================
// 8. CONTROLES DO MAPA TEMPORAL
// ============================================================================

var labelAnoSimples = ui.Label({
  value: String(anoSimples),
  style: {
    fontSize: '27px',
    fontWeight: 'bold',
    color: '#176b45',
    margin: '0 0 4px 0'
  }
});

var sliderAnoSimples = ui.Slider({
  min: 1985,
  max: 2024,
  value: anoSimples,
  step: 1,
  style: {
    stretch: 'horizontal',
    margin: '0 0 2px 0'
  }
});

var extremosSlider = ui.Panel({
  widgets: [
    ui.Label('1985', {
      fontSize: '9px',
      color: '#777777',
      stretch: 'horizontal'
    }),
    ui.Label('2024', {
      fontSize: '9px',
      color: '#777777',
      textAlign: 'right',
      stretch: 'horizontal'
    })
  ],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {stretch: 'horizontal'}
});

var infoSimples = ui.Label({
  value: 'Clique em qualquer ponto dentro da bacia.',
  style: {
    fontSize: '11px',
    color: '#444444',
    backgroundColor: '#f1f6f3',
    padding: '9px',
    stretch: 'horizontal',
    whiteSpace: 'pre'
  }
});

var legendaSimplesStatus = ui.Label({
  value: 'Identificando classes...',
  style: {
    fontSize: '9px',
    color: '#888888',
    margin: '0 0 5px 0'
  }
});

var legendaSimples = ui.Panel({
  style: {stretch: 'horizontal'}
});

var controlesSimples = ui.Panel({
  widgets: [
    ui.Label('ANO DE REFERÊNCIA', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555'
    }),
    labelAnoSimples,
    sliderAnoSimples,
    extremosSlider,
    ui.Label('IDENTIFICAÇÃO', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '18px 0 5px 0'
    }),
    infoSimples,
    ui.Label('LEGENDA — ÁREA VISÍVEL', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '18px 0 3px 0'
    }),
    legendaSimplesStatus,
    legendaSimples
  ],
  style: {stretch: 'horizontal'}
});


// ============================================================================
// 9. CONTROLES DA COMPARAÇÃO
// ============================================================================

var selectAnoA = ui.Select({
  items: ANOS,
  value: String(anoA),
  style: {
    stretch: 'horizontal',
    margin: '2px 0 10px 0'
  }
});

var selectAnoB = ui.Select({
  items: ANOS,
  value: String(anoB),
  style: {
    stretch: 'horizontal',
    margin: '2px 0 10px 0'
  }
});

var selectModoComparacao = ui.Select({
  items: ['Swipe', 'Lado a lado'],
  value: 'Swipe',
  style: {
    stretch: 'horizontal',
    margin: '2px 0 12px 0'
  }
});

var infoComparacao = ui.Label({
  value: 'Clique em qualquer ponto para comparar os dois anos.',
  style: {
    fontSize: '11px',
    color: '#444444',
    backgroundColor: '#f1f6f3',
    padding: '9px',
    stretch: 'horizontal',
    whiteSpace: 'pre'
  }
});

var legendaComparacaoStatus = ui.Label({
  value: 'Identificando classes...',
  style: {
    fontSize: '9px',
    color: '#888888',
    margin: '0 0 5px 0'
  }
});

var legendaComparacao = ui.Panel({
  style: {stretch: 'horizontal'}
});

var resumoMudanca = ui.Label({
  value: 'Calculando...',
  style: {
    backgroundColor: '#eef5f0',
    color: '#174b32',
    padding: '10px',
    fontSize: '11px',
    stretch: 'horizontal',
    whiteSpace: 'pre',
    margin: '0 0 8px 0'
  }
});

var tabelaAreas = ui.Panel({
  style: {stretch: 'horizontal'}
});


// ============================================================================
// 9.1. ANÁLISE DE TRANSIÇÕES
// ============================================================================
//
// A análise de transições é executada sob demanda.
// Isso evita cálculos pesados toda vez que o usuário muda um ano,
// abre o modo de comparação ou movimenta o mapa.
//

var statusTransicoes = ui.Label({
  value: 'Selecione os anos e clique em "Calcular transições".',
  style: {
    fontSize: '9px',
    color: '#777777',
    margin: '0 0 6px 0',
    whiteSpace: 'pre',
    stretch: 'horizontal'
  }
});

var botaoCalcularTransicoes = ui.Button({
  label: 'Calcular transições',
  style: {
    stretch: 'horizontal',
    margin: '0 0 8px 0'
  }
});

var tabelaTransicoes = ui.Panel({
  style: {
    stretch: 'horizontal'
  }
});


// Cartão exibido quando uma transição é selecionada para destaque espacial.
var infoDestaqueTransicao = ui.Label({
  value: '',
  style: {
    fontSize: '10px',
    color: '#333333',
    whiteSpace: 'pre',
    stretch: 'horizontal'
  }
});

var botaoLimparDestaque = ui.Button({
  label: 'Limpar destaque',
  style: {
    stretch: 'horizontal',
    margin: '8px 0 0 0'
  }
});

var painelDestaqueTransicao = ui.Panel({
  widgets: [
    ui.Label('TRANSIÇÃO DESTACADA NO MAPA', {
      fontSize: '9px',
      fontWeight: 'bold',
      color: '#666666',
      margin: '0 0 5px 0'
    }),
    infoDestaqueTransicao,
    botaoLimparDestaque
  ],
  style: {
    stretch: 'horizontal',
    backgroundColor: '#fff8d9',
    border: '1px solid #ead37a',
    padding: '9px',
    margin: '4px 0 8px 0',
    shown: false
  }
});

var controlesComparacao = ui.Panel({
  widgets: [
    ui.Label('ANO A', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555'
    }),
    selectAnoA,
    ui.Label('ANO B', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555'
    }),
    selectAnoB,
    ui.Label('TIPO DE COMPARAÇÃO', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '4px 0 0 0'
    }),
    selectModoComparacao,
    ui.Label('IDENTIFICAÇÃO', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '10px 0 5px 0'
    }),
    infoComparacao,
    ui.Label('LEGENDA — ÁREA VISÍVEL', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '18px 0 3px 0'
    }),
    legendaComparacaoStatus,
    legendaComparacao,
    ui.Label('COMPARATIVO DE ÁREAS — BACIA INTEIRA', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '20px 0 5px 0'
    }),
    resumoMudanca,
    tabelaAreas,

    ui.Label('PRINCIPAIS TRANSIÇÕES ENTRE OS ANOS', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '20px 0 4px 0'
    }),

    ui.Label(
      'Identifica de qual classe para qual classe ocorreram as maiores mudanças na bacia.',
      {
        fontSize: '9px',
        color: '#777777',
        margin: '0 0 7px 0'
      }
    ),

    botaoCalcularTransicoes,
    statusTransicoes,
    painelDestaqueTransicao,
    tabelaTransicoes
  ],
  style: {stretch: 'horizontal'}
});



// ============================================================================
// 9.2. CONTROLES — MÓDULO DINÂMICA DA ÁGUA
// ============================================================================

// --------------------------------------------------------------------------
// Superfície anual
// --------------------------------------------------------------------------

var labelAnoAgua = ui.Label({
  value: String(anoAgua),
  style: {
    fontSize: '27px',
    fontWeight: 'bold',
    color: '#176b45',
    margin: '0 0 4px 0'
  }
});

var sliderAnoAgua = ui.Slider({
  min: 1985,
  max: 2024,
  value: anoAgua,
  step: 1,
  style: {
    stretch: 'horizontal',
    margin: '0 0 2px 0'
  }
});

var extremosSliderAgua = ui.Panel({
  widgets: [
    ui.Label('1985', {
      fontSize: '9px',
      color: '#777777',
      stretch: 'horizontal'
    }),
    ui.Label('2024', {
      fontSize: '9px',
      color: '#777777',
      textAlign: 'right',
      stretch: 'horizontal'
    })
  ],
  layout: ui.Panel.Layout.flow('horizontal'),
  style: {stretch: 'horizontal'}
});

var resumoAguaAnual = ui.Label({
  value: 'Calculando superfície de água...',
  style: {
    backgroundColor: '#eef6fb',
    color: '#174b32',
    padding: '10px',
    fontSize: '11px',
    stretch: 'horizontal',
    whiteSpace: 'pre',
    margin: '8px 0 8px 0'
  }
});

var infoAguaAnual = ui.Label({
  value: 'Clique em qualquer ponto dentro da bacia.',
  style: {
    fontSize: '11px',
    color: '#444444',
    backgroundColor: '#f1f6f3',
    padding: '9px',
    stretch: 'horizontal',
    whiteSpace: 'pre'
  }
});

var legendaAguaAnual = ui.Panel({
  widgets: [
    ui.Panel({
      widgets: [
        ui.Label({
          value: '',
          style: {
            backgroundColor: '#2474b5',
            padding: '7px',
            margin: '1px 7px 3px 0',
            border: '1px solid #dddddd'
          }
        }),
        ui.Label('Superfície de água', {
          fontSize: '10px',
          color: '#444444',
          margin: '2px 0 3px 0'
        })
      ],
      layout: ui.Panel.Layout.flow('horizontal')
    })
  ],
  style: {stretch: 'horizontal'}
});

var controlesAguaAnual = ui.Panel({
  widgets: [
    ui.Label('ANO DE REFERÊNCIA', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555'
    }),
    labelAnoAgua,
    sliderAnoAgua,
    extremosSliderAgua,
    ui.Label('SUPERFÍCIE DE ÁGUA — BACIA INTEIRA', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '18px 0 5px 0'
    }),
    resumoAguaAnual,
    ui.Label('IDENTIFICAÇÃO', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '18px 0 5px 0'
    }),
    infoAguaAnual,
    ui.Label('LEGENDA', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '18px 0 5px 0'
    }),
    legendaAguaAnual,
    ui.Label(
      'Fonte: MapBiomas Água — Coleção 4. Série anual 1985–2024.',
      {
        fontSize: '9px',
        color: '#777777',
        margin: '16px 0 0 0'
      }
    )
  ],
  style: {stretch: 'horizontal'}
});


// --------------------------------------------------------------------------
// Comparar anos — Água
// --------------------------------------------------------------------------

var selectAnoAguaA = ui.Select({
  items: ANOS,
  value: String(anoAguaA),
  style: {
    stretch: 'horizontal',
    margin: '2px 0 10px 0'
  }
});

var selectAnoAguaB = ui.Select({
  items: ANOS,
  value: String(anoAguaB),
  style: {
    stretch: 'horizontal',
    margin: '2px 0 10px 0'
  }
});

var selectModoComparacaoAgua = ui.Select({
  items: ['Swipe', 'Lado a lado'],
  value: 'Swipe',
  style: {
    stretch: 'horizontal',
    margin: '2px 0 12px 0'
  }
});

var resumoComparacaoAgua = ui.Label({
  value: 'Calculando dinâmica da água...',
  style: {
    backgroundColor: '#eef6fb',
    color: '#174b32',
    padding: '10px',
    fontSize: '11px',
    stretch: 'horizontal',
    whiteSpace: 'pre',
    margin: '0 0 8px 0'
  }
});

var infoComparacaoAgua = ui.Label({
  value: 'Clique em qualquer ponto para comparar os dois anos.',
  style: {
    fontSize: '11px',
    color: '#444444',
    backgroundColor: '#f1f6f3',
    padding: '9px',
    stretch: 'horizontal',
    whiteSpace: 'pre'
  }
});

function criarLinhaLegendaAgua(cor, texto) {
  return ui.Panel({
    widgets: [
      ui.Label({
        value: '',
        style: {
          backgroundColor: '#' + cor,
          padding: '7px',
          margin: '1px 7px 3px 0',
          border: '1px solid #dddddd'
        }
      }),
      ui.Label(texto, {
        fontSize: '10px',
        color: '#444444',
        margin: '2px 0 3px 0'
      })
    ],
    layout: ui.Panel.Layout.flow('horizontal')
  });
}

var legendaComparacaoAgua = ui.Panel({
  widgets: [
    criarLinhaLegendaAgua('2474b5', 'Superfície de água no ano'),
    criarLinhaLegendaAgua('2ca25f', 'Ganho de superfície de água'),
    criarLinhaLegendaAgua('de2d26', 'Perda de superfície de água')
  ],
  style: {stretch: 'horizontal'}
});

var controlesComparacaoAgua = ui.Panel({
  widgets: [
    ui.Label('ANO A', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555'
    }),
    selectAnoAguaA,
    ui.Label('ANO B', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555'
    }),
    selectAnoAguaB,
    ui.Label('TIPO DE COMPARAÇÃO', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '4px 0 0 0'
    }),
    selectModoComparacaoAgua,
    ui.Label('DINÂMICA DA SUPERFÍCIE DE ÁGUA', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '16px 0 5px 0'
    }),
    resumoComparacaoAgua,
    ui.Label('IDENTIFICAÇÃO', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '16px 0 5px 0'
    }),
    infoComparacaoAgua,
    ui.Label('LEGENDA', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '18px 0 5px 0'
    }),
    legendaComparacaoAgua
  ],
  style: {stretch: 'horizontal'}
});


// --------------------------------------------------------------------------
// Frequência histórica da água
// --------------------------------------------------------------------------

var resumoFrequenciaAgua = ui.Label({
  value: 'Calculando frequência histórica...',
  style: {
    backgroundColor: '#eef6fb',
    color: '#174b32',
    padding: '10px',
    fontSize: '11px',
    stretch: 'horizontal',
    whiteSpace: 'pre',
    margin: '0 0 8px 0'
  }
});

var infoFrequenciaAgua = ui.Label({
  value: 'Clique no mapa para consultar a frequência histórica do pixel.',
  style: {
    fontSize: '11px',
    color: '#444444',
    backgroundColor: '#f1f6f3',
    padding: '9px',
    stretch: 'horizontal',
    whiteSpace: 'pre'
  }
});

var legendaFrequenciaAgua = ui.Panel({
  widgets: [
    criarLinhaLegendaAgua('c6dbef', 'Baixa frequência (>0 e <10%)'),
    criarLinhaLegendaAgua('9ecae1', 'Infrequente (10–49%)'),
    criarLinhaLegendaAgua('4292c6', 'Intermitente (50–90%)'),
    criarLinhaLegendaAgua('084594', 'Permanente (>90%)')
  ],
  style: {stretch: 'horizontal'}
});

var controlesFrequenciaAgua = ui.Panel({
  widgets: [
    ui.Label('FREQUÊNCIA HISTÓRICA ANUAL', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555'
    }),
    ui.Label(
      'Mostra a frequência com que cada pixel apresentou superfície de água no mapa anual entre 1985 e 2024.',
      {
        fontSize: '9px',
        color: '#777777',
        margin: '4px 0 10px 0'
      }
    ),
    resumoFrequenciaAgua,
    ui.Label('IDENTIFICAÇÃO', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '16px 0 5px 0'
    }),
    infoFrequenciaAgua,
    ui.Label('LEGENDA', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '18px 0 5px 0'
    }),
    legendaFrequenciaAgua,
    ui.Label(
      'Pixels sem ocorrência anual de água na série ficam transparentes.',
      {
        fontSize: '9px',
        color: '#777777',
        margin: '10px 0 0 0'
      }
    )
  ],
  style: {stretch: 'horizontal'}
});


// --------------------------------------------------------------------------
// Tipos de corpos hídricos
// --------------------------------------------------------------------------

var selectAnoCorposAgua = ui.Select({
  items: ANOS,
  value: String(anoCorposAgua),
  style: {
    stretch: 'horizontal',
    margin: '2px 0 10px 0'
  }
});

var infoCorposAgua = ui.Label({
  value: 'Clique em um corpo hídrico para identificar seu tipo.',
  style: {
    fontSize: '11px',
    color: '#444444',
    backgroundColor: '#f1f6f3',
    padding: '9px',
    stretch: 'horizontal',
    whiteSpace: 'pre'
  }
});

var tabelaTiposAgua = ui.Panel({
  style: {stretch: 'horizontal'}
});

var legendaTiposAgua = ui.Panel({
  style: {stretch: 'horizontal'}
});

TIPOS_AGUA_CODES.forEach(function(codigoTipo) {
  legendaTiposAgua.add(
    criarLinhaLegendaAgua(
      corTipoAgua(codigoTipo),
      nomeTipoAgua(codigoTipo)
    )
  );
});

var controlesCorposAgua = ui.Panel({
  widgets: [
    ui.Label('ANO DE REFERÊNCIA', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555'
    }),
    selectAnoCorposAgua,
    ui.Label('TIPOS DE CORPOS HÍDRICOS — BACIA INTEIRA', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '18px 0 5px 0'
    }),
    tabelaTiposAgua,
    ui.Label('IDENTIFICAÇÃO', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '18px 0 5px 0'
    }),
    infoCorposAgua,
    ui.Label('LEGENDA', {
      fontSize: '10px',
      fontWeight: 'bold',
      color: '#555555',
      margin: '18px 0 5px 0'
    }),
    legendaTiposAgua,
    ui.Label(
      'Classes: Natural, Reservatório, Hidrelétrica, Água em mineração e Aquicultura.',
      {
        fontSize: '9px',
        color: '#777777',
        margin: '10px 0 0 0'
      }
    )
  ],
  style: {stretch: 'horizontal'}
});


// ============================================================================
// 10. BOTÕES MOBILE
// ============================================================================

var botaoFecharMobile = ui.Button({
  label: '✕ Fechar controles',
  style: {
    stretch: 'horizontal',
    margin: '0 0 10px 0',
    shown: false
  }
});

var botaoMenuMobile = ui.Button({
  label: '☰ Controles',
  style: {
    position: 'top-left',
    margin: '10px',
    shown: false
  }
});


// ============================================================================
// 11. PAINÉIS PRINCIPAIS
// ============================================================================

var painelControlesDinamicos = ui.Panel({
  style: {stretch: 'horizontal'}
});

var painelEsquerdo = ui.Panel({
  widgets: [
    botaoFecharMobile,
    painelModulo,
    painelVisualizacao,
    painelControlesDinamicos
  ],
  style: {
    width: '380px',
    padding: '14px',
    backgroundColor: '#ffffff'
  }
});

var comparador = ui.SplitPanel({
  firstPanel: mapaA,
  secondPanel: mapaB,
  orientation: 'horizontal',
  wipe: true,
  style: {stretch: 'both'}
});

var painelComparador = ui.Panel({
  widgets: [comparador],
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    stretch: 'both',
    padding: '0px',
    margin: '0px'
  }
});

var painelMapaDinamico = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {
    stretch: 'both',
    padding: '0px',
    margin: '0px'
  }
});


// ============================================================================
// 12. DESENHO DO MAPA TEMPORAL
// ============================================================================

function desenharMapaSimples(ano) {
  ano = Math.round(ano);
  anoSimples = ano;

  labelAnoSimples.setValue(String(ano));

  var camadaUso = ui.Map.Layer(
    imagemVisual(ano),
    {
      min: 0,
      max: CLASS_CODES.length - 1,
      palette: CLASS_COLORS
    },
    'Uso e Cobertura ' + ano,
    true,
    1
  );

  mapaSimples.layers().reset([
    camadaUso,
    camadaLimite()
  ]);

  infoSimples.setValue(
    'Ano: ' + ano +
    '\nClique no mapa para identificar a classe.'
  );

  legendaSimplesDebounced();
}


// ============================================================================
// 13. DESENHO DOS MAPAS DE COMPARAÇÃO
// ============================================================================

function desenharMapaComparacao(mapa, ano) {
  var camadaUso = ui.Map.Layer(
    imagemVisual(ano),
    {
      min: 0,
      max: CLASS_CODES.length - 1,
      palette: CLASS_COLORS
    },
    'Uso e Cobertura ' + ano,
    true,
    1
  );

  mapa.layers().reset([
    camadaUso,
    camadaLimite()
  ]);
}

function desenharComparacao() {
  labelMapaA.setValue(String(anoA));
  labelMapaB.setValue(String(anoB));

  desenharMapaComparacao(mapaA, anoA);
  desenharMapaComparacao(mapaB, anoB);

  infoComparacao.setValue(
    'Clique no mapa para comparar ' + anoA + ' e ' + anoB + '.'
  );

  legendaComparacaoDebounced();
}


// ============================================================================
// 14. LEGENDA DINÂMICA - MAPA TEMPORAL
// ============================================================================

var requisicaoLegendaSimples = 0;

function atualizarLegendaSimples() {
  if (
    moduloAtual !== 'Uso e Cobertura da Terra' ||
    modoAtual !== 'Mapa temporal'
  ) return;

  var id = ++requisicaoLegendaSimples;
  legendaSimplesStatus.setValue('Atualizando legenda...');

  var bounds = mapaSimples.getBounds();
  if (!bounds) return;

  var areaTela = ee.Geometry.Rectangle(bounds, null, false);
  var escala = Number(mapaSimples.getScale());
  escala = Math.max(30, Math.min(250, escala));

  imagemAno(anoSimples)
    .rename('classe')
    .reduceRegion({
      reducer: ee.Reducer.frequencyHistogram(),
      geometry: areaTela,
      scale: escala,
      bestEffort: true,
      maxPixels: 10000000,
      tileScale: 4
    })
    .get('classe')
    .evaluate(function(histograma) {
      if (id !== requisicaoLegendaSimples) return;

      legendaSimples.clear();
      histograma = histograma || {};

      var presentes = Object.keys(histograma).map(Number);

      if (presentes.length === 0) {
        legendaSimplesStatus.setValue(
          'Nenhuma classe da bacia está visível.'
        );
        return;
      }

      legendaSimplesStatus.setValue(
        presentes.length +
        (presentes.length === 1 ? ' classe visível' : ' classes visíveis')
      );

      CLASS_CODES.forEach(function(codigo) {
        if (presentes.indexOf(codigo) >= 0) {
          adicionarLinhaLegenda(legendaSimples, codigo, '');
        }
      });
    });
}


// ============================================================================
// 15. LEGENDA DINÂMICA - COMPARAÇÃO
// ============================================================================

var requisicaoLegendaComparacao = 0;

function atualizarLegendaComparacao() {
  if (
    moduloAtual !== 'Uso e Cobertura da Terra' ||
    modoAtual !== 'Comparar anos'
  ) return;

  var id = ++requisicaoLegendaComparacao;
  legendaComparacaoStatus.setValue('Atualizando legenda...');

  var bounds = mapaA.getBounds();
  if (!bounds) return;

  var areaTela = ee.Geometry.Rectangle(bounds, null, false);
  var escala = Number(mapaA.getScale());
  escala = Math.max(30, Math.min(250, escala));

  ee.Image.cat([
    imagemAno(anoA).rename('anoA'),
    imagemAno(anoB).rename('anoB')
  ])
  .reduceRegion({
    reducer: ee.Reducer.frequencyHistogram(),
    geometry: areaTela,
    scale: escala,
    bestEffort: true,
    maxPixels: 10000000,
    tileScale: 4
  })
  .evaluate(function(resultado) {
    if (id !== requisicaoLegendaComparacao) return;

    legendaComparacao.clear();
    resultado = resultado || {};

    var histA = resultado.anoA || {};
    var histB = resultado.anoB || {};
    var codigosPresentes = {};

    Object.keys(histA).forEach(function(codigo) {
      codigosPresentes[codigo] = true;
    });

    Object.keys(histB).forEach(function(codigo) {
      codigosPresentes[codigo] = true;
    });

    var lista = Object.keys(codigosPresentes).map(Number);

    if (lista.length === 0) {
      legendaComparacaoStatus.setValue(
        'Nenhuma classe da bacia está visível.'
      );
      return;
    }

    legendaComparacaoStatus.setValue(
      lista.length +
      (lista.length === 1 ? ' classe visível' : ' classes visíveis')
    );

    CLASS_CODES.forEach(function(codigo) {
      if (lista.indexOf(codigo) < 0) return;

      var emA = histA[String(codigo)] !== undefined;
      var emB = histB[String(codigo)] !== undefined;
      var complemento = '';

      if (emA && emB) complemento = anoA + ' • ' + anoB;
      else if (emA) complemento = String(anoA);
      else if (emB) complemento = String(anoB);

      adicionarLinhaLegenda(
        legendaComparacao,
        codigo,
        complemento
      );
    });
  });
}

var legendaSimplesDebounced = ui.util.debounce(
  atualizarLegendaSimples,
  650
);

var legendaComparacaoDebounced = ui.util.debounce(
  atualizarLegendaComparacao,
  650
);

mapaSimples.onChangeBounds(function() {
  if (
    moduloAtual === 'Uso e Cobertura da Terra' &&
    modoAtual === 'Mapa temporal'
  ) {
    legendaSimplesDebounced();
  }
});

mapaA.onChangeBounds(function() {
  if (
    moduloAtual === 'Uso e Cobertura da Terra' &&
    modoAtual === 'Comparar anos'
  ) {
    legendaComparacaoDebounced();
  }
});

// mapaB não precisa de outro listener de extensão porque mapaA e mapaB
// já estão sincronizados pelo ui.Map.Linker. Isso evita chamadas duplicadas.


// ============================================================================
// 16. CONSULTA - MAPA TEMPORAL
// ============================================================================

mapaSimples.onClick(function(coords) {
  if (moduloAtual === 'Dinâmica da Água') {
    if (modoAtual === 'Superfície anual') {
      consultarAguaAnual(coords);
      return;
    }

    if (modoAtual === 'Frequência da água') {
      consultarFrequenciaAgua(coords);
      return;
    }

    if (modoAtual === 'Tipos de corpos hídricos') {
      consultarCorposAgua(coords);
      return;
    }
  }

  infoSimples.setValue('Consultando...');

  var ponto = ee.Geometry.Point([coords.lon, coords.lat]);

  imagemAno(anoSimples)
    .rename('classe')
    .reduceRegion({
      reducer: ee.Reducer.first(),
      geometry: ponto,
      scale: 30,
      maxPixels: 10000
    })
    .get('classe')
    .evaluate(function(valor) {
      if (valor === null || valor === undefined) {
        infoSimples.setValue('Ponto fora da Bacia do Rio Mearim.');
        return;
      }

      infoSimples.setValue(
        'Ano: ' + anoSimples +
        '\nClasse: ' + nomeClasse(valor) +
        '\nCódigo MapBiomas: ' + valor +
        '\nLatitude: ' + coords.lat.toFixed(5) +
        '\nLongitude: ' + coords.lon.toFixed(5)
      );
    });
});


// ============================================================================
// 17. CONSULTA - COMPARAÇÃO
// ============================================================================

function consultarComparacao(coords) {
  if (moduloAtual === 'Dinâmica da Água') {
    consultarComparacaoAgua(coords);
    return;
  }

  infoComparacao.setValue('Consultando...');

  var ponto = ee.Geometry.Point([coords.lon, coords.lat]);

  ee.Image.cat([
    imagemAno(anoA).rename('A'),
    imagemAno(anoB).rename('B')
  ])
  .reduceRegion({
    reducer: ee.Reducer.first(),
    geometry: ponto,
    scale: 30,
    maxPixels: 10000
  })
  .evaluate(function(resultado) {
    resultado = resultado || {};

    var valorA = resultado.A;
    var valorB = resultado.B;

    if (valorA === null || valorA === undefined) {
      infoComparacao.setValue('Ponto fora da Bacia do Rio Mearim.');
      return;
    }

    var mudou = Number(valorA) !== Number(valorB);

    infoComparacao.setValue(
      anoA + ': ' + nomeClasse(valorA) +
      '\n' +
      anoB + ': ' + nomeClasse(valorB) +
      '\n\n' +
      (mudou
        ? '● Houve mudança de classe'
        : '● A classe permaneceu igual') +
      '\nLatitude: ' + coords.lat.toFixed(5) +
      '\nLongitude: ' + coords.lon.toFixed(5)
    );
  });
}

mapaA.onClick(consultarComparacao);
mapaB.onClick(consultarComparacao);


// ============================================================================
// 18. ÁREA POR CLASSE
// ============================================================================

function areaPorClasse(ano) {
  var classe = imagemAno(ano).rename('classe');

  var area = ee.Image
    .pixelArea()
    .divide(1000000)
    .rename('area_km2');

  var resultado = area
    .addBands(classe)
    .reduceRegion({
      reducer: ee.Reducer.sum().group({
        groupField: 1,
        groupName: 'classe'
      }),
      geometry: bacia.geometry(),
      scale: 30,
      maxPixels: 1e13,
      tileScale: 4
    });

  return ee.List(resultado.get('groups'));
}

function areaQueMudou(primeiroAno, segundoAno) {
  var mudou = imagemAno(primeiroAno)
    .neq(imagemAno(segundoAno))
    .rename('mudou')
    .selfMask();

  var areaMudou = ee.Image
    .pixelArea()
    .divide(1000000)
    .rename('area_mudou')
    .updateMask(mudou);

  var resultado = areaMudou.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: bacia.geometry(),
    scale: 30,
    maxPixels: 1e13,
    tileScale: 4
  });

  return ee.Number(
    ee.Algorithms.If(
      resultado.get('area_mudou'),
      resultado.get('area_mudou'),
      0
    )
  );
}


// ============================================================================
// 19. LARGURAS DA TABELA CONFORME A TELA
// ============================================================================

function obterLargurasTabela() {
  if (dispositivoAtual === 'mobile') {
    return {
      classe: '118px',
      nome: '103px',
      ano: '48px',
      delta: '52px',
      fonte: '8px'
    };
  }

  if (dispositivoAtual === 'tablet') {
    return {
      classe: '128px',
      nome: '113px',
      ano: '54px',
      delta: '58px',
      fonte: '8px'
    };
  }

  return {
    classe: '150px',
    nome: '134px',
    ano: '62px',
    delta: '64px',
    fonte: '9px'
  };
}


// ============================================================================
// 20. COMPARATIVO DE ÁREAS
// ============================================================================

var requisicaoAreas = 0;

// Cache client-side usado apenas para exibir a porcentagem da transição
// selecionada em relação à área total da bacia.
var areaBaciaKm2Cache = null;

function atualizarComparacaoAreas() {
  if (
    moduloAtual !== 'Uso e Cobertura da Terra' ||
    modoAtual !== 'Comparar anos'
  ) return;

  var id = ++requisicaoAreas;
  tabelaAreas.clear();

  tabelaAreas.add(
    ui.Label('Calculando áreas...', {
      fontSize: '10px',
      color: '#777777'
    })
  );

  resumoMudanca.setValue('Calculando mudanças...');

  var pacote = ee.Dictionary({
    areasA: areaPorClasse(anoA),
    areasB: areaPorClasse(anoB),
    areaMudou: areaQueMudou(anoA, anoB),
    areaBacia: bacia.geometry().area(1).divide(1000000)
  });

  pacote.evaluate(function(resultado) {
    if (id !== requisicaoAreas) return;

    resultado = resultado || {};

    var gruposA = resultado.areasA || [];
    var gruposB = resultado.areasB || [];

    function transformar(grupos) {
      var obj = {};
      grupos.forEach(function(item) {
        obj[String(item.classe)] = Number(item.sum);
      });
      return obj;
    }

    var areasA = transformar(gruposA);
    var areasB = transformar(gruposB);
    var todosCodigos = {};

    Object.keys(areasA).forEach(function(codigo) {
      todosCodigos[codigo] = true;
    });

    Object.keys(areasB).forEach(function(codigo) {
      todosCodigos[codigo] = true;
    });

    var lista = Object.keys(todosCodigos).map(Number);

    lista.sort(function(a, b) {
      var tamanhoA = Math.max(
        areasA[String(a)] || 0,
        areasB[String(a)] || 0
      );

      var tamanhoB = Math.max(
        areasA[String(b)] || 0,
        areasB[String(b)] || 0
      );

      return tamanhoB - tamanhoA;
    });

    tabelaAreas.clear();

    var larguras = obterLargurasTabela();

    tabelaAreas.add(
      ui.Panel({
        widgets: [
          ui.Label('Classe', {
            width: larguras.classe,
            fontSize: larguras.fonte,
            fontWeight: 'bold'
          }),
          ui.Label(String(anoA), {
            width: larguras.ano,
            fontSize: larguras.fonte,
            fontWeight: 'bold',
            textAlign: 'right'
          }),
          ui.Label(String(anoB), {
            width: larguras.ano,
            fontSize: larguras.fonte,
            fontWeight: 'bold',
            textAlign: 'right'
          }),
          ui.Label('Δ km²', {
            width: larguras.delta,
            fontSize: larguras.fonte,
            fontWeight: 'bold',
            textAlign: 'right'
          })
        ],
        layout: ui.Panel.Layout.flow('horizontal'),
        style: {
          margin: '0 0 5px 0',
          padding: '0 0 4px 0'
        }
      })
    );

    lista.forEach(function(codigo) {
      var valorA = areasA[String(codigo)] || 0;
      var valorB = areasB[String(codigo)] || 0;
      var diferenca = valorB - valorA;
      var sinal = diferenca > 0 ? '+' : '';

      var quadrado = ui.Label({
        value: '',
        style: {
          backgroundColor: '#' + corClasse(codigo),
          padding: '5px',
          margin: '3px 5px 0 0',
          border: '1px solid #dddddd'
        }
      });

      var nome = ui.Label({
        value: nomeClasse(codigo),
        style: {
          width: larguras.nome,
          fontSize: larguras.fonte,
          color: '#444444'
        }
      });

      var celulaClasse = ui.Panel({
        widgets: [quadrado, nome],
        layout: ui.Panel.Layout.flow('horizontal'),
        style: {width: larguras.classe}
      });

      var celulaA = ui.Label({
        value: formatarNumero(valorA, 1),
        style: {
          width: larguras.ano,
          fontSize: larguras.fonte,
          textAlign: 'right'
        }
      });

      var celulaB = ui.Label({
        value: formatarNumero(valorB, 1),
        style: {
          width: larguras.ano,
          fontSize: larguras.fonte,
          textAlign: 'right'
        }
      });

      var corDelta = '#666666';
      if (diferenca > 0) corDelta = '#176b45';
      if (diferenca < 0) corDelta = '#a13b32';

      var celulaDelta = ui.Label({
        value: sinal + formatarNumero(diferenca, 1),
        style: {
          width: larguras.delta,
          fontSize: larguras.fonte,
          textAlign: 'right',
          color: corDelta
        }
      });

      tabelaAreas.add(
        ui.Panel({
          widgets: [
            celulaClasse,
            celulaA,
            celulaB,
            celulaDelta
          ],
          layout: ui.Panel.Layout.flow('horizontal'),
          style: {margin: '1px 0'}
        })
      );
    });

    var areaMudou = Number(resultado.areaMudou) || 0;
    var areaBacia = Number(resultado.areaBacia) || 0;

    areaBaciaKm2Cache = areaBacia;

    var percentual = areaBacia > 0
      ? (areaMudou / areaBacia) * 100
      : 0;

    resumoMudanca.setValue(
      'Mudança entre ' + anoA + ' e ' + anoB +
      '\n\n' +
      formatarNumero(areaMudou, 1) + ' km² mudaram de classe' +
      '\n' +
      formatarNumero(percentual, 1) + '% da área da bacia'
    );
  });
}



// ============================================================================
// 20.1. TRANSIÇÕES DE USO E COBERTURA
// ============================================================================
//
// Cada par origem → destino recebe um código único:
//   transição = (classe_origem * 100) + classe_destino
//
// Como os códigos MapBiomas utilizados aqui são menores que 100,
// a operação é reversível:
//   origem  = floor(transição / 100)
//   destino = transição % 100
//
// A área é calculada em km² com ee.Image.pixelArea().
//

var requisicaoTransicoes = 0;

// Guarda apenas informações client-side da transição atualmente destacada.
var transicaoSelecionada = null;


// Retorna uma máscara binária dos pixels que eram "origem" em anoA
// e passaram a ser "destino" em anoB.
function mascaraTransicao(origem, destino) {
  var classeA = imagemAno(anoA);
  var classeB = imagemAno(anoB);

  return classeA
    .eq(origem)
    .and(
      classeB.eq(destino)
    )
    .selfMask()
    .rename('transicao_selecionada');
}


// Remove a sobreposição de transição dos dois mapas.
function limparDestaqueTransicao(redesenharMapas) {
  transicaoSelecionada = null;

  painelDestaqueTransicao
    .style()
    .set('shown', false);

  infoDestaqueTransicao.setValue('');

  if (
    redesenharMapas !== false &&
    moduloAtual === 'Uso e Cobertura da Terra' &&
    modoAtual === 'Comparar anos'
  ) {
    desenharComparacao();
  }
}


// Destaca espacialmente a conversão selecionada em ambos os mapas.
// O mesmo conjunto de pixels aparece nos lados A e B, facilitando
// a comparação no modo Swipe ou lado a lado.
function destacarTransicao(origem, destino, areaKm2) {
  origem = Number(origem);
  destino = Number(destino);
  areaKm2 = Number(areaKm2) || 0;

  transicaoSelecionada = {
    origem: origem,
    destino: destino,
    area: areaKm2,
    anoA: anoA,
    anoB: anoB
  };

  // Remove qualquer destaque anterior sem alterar os anos escolhidos.
  desenharComparacao();

  var mascara = mascaraTransicao(
    origem,
    destino
  );

  var nomeCamada =
    'Destaque: ' +
    nomeClasse(origem) +
    ' → ' +
    nomeClasse(destino);

  // Amarelo intenso foi escolhido para funcionar sobre o raster temático
  // e também sobre o mapa-base híbrido/satélite.
  var visDestaque = {
    min: 1,
    max: 1,
    palette: ['FFEA00']
  };

  mapaA.addLayer(
    mascara,
    visDestaque,
    nomeCamada,
    true,
    0.92
  );

  mapaB.addLayer(
    mascara,
    visDestaque,
    nomeCamada,
    true,
    0.92
  );

  var percentual = null;

  if (
    areaBaciaKm2Cache !== null &&
    areaBaciaKm2Cache > 0
  ) {
    percentual =
      (areaKm2 / areaBaciaKm2Cache) * 100;
  }

  var texto =
    anoA +
    ': ' +
    nomeClasse(origem) +
    '\n' +
    anoB +
    ': ' +
    nomeClasse(destino) +
    '\n\n' +
    'Área da transição: ' +
    formatarNumero(areaKm2, 1) +
    ' km²';

  if (percentual !== null) {
    texto +=
      '\n' +
      formatarNumero(percentual, 2) +
      '% da área da bacia';
  }

  texto +=
    '\n\nOs pixels em amarelo mostram onde essa mudança ocorreu.';

  infoDestaqueTransicao.setValue(
    texto
  );

  painelDestaqueTransicao
    .style()
    .set('shown', true);
}


botaoLimparDestaque.onClick(function() {
  limparDestaqueTransicao(true);
});


function invalidarTransicoes() {
  requisicaoTransicoes++;

  // Se os anos mudarem ou a interface for remontada,
  // um destaque antigo deixa de ser semanticamente válido.
  limparDestaqueTransicao(false);

  tabelaTransicoes.clear();

  statusTransicoes.setValue(
    'Anos alterados. Clique em "Calcular transições" para atualizar.'
  );
}


function gruposTransicoes(primeiroAno, segundoAno) {
  var origem = imagemAno(primeiroAno)
    .rename('origem');

  var destino = imagemAno(segundoAno)
    .rename('destino');

  var codigoTransicao = origem
    .multiply(100)
    .add(destino)
    .rename('transicao');

  var areaKm2 = ee.Image
    .pixelArea()
    .divide(1000000)
    .rename('area_km2');

  var imagemAnalise = areaKm2
    .addBands(codigoTransicao);

  var resultado = imagemAnalise.reduceRegion({
    reducer: ee.Reducer
      .sum()
      .group({
        groupField: 1,
        groupName: 'transicao'
      }),

    geometry: bacia.geometry(),
    scale: 30,
    maxPixels: 1e13,
    tileScale: 4
  });

  return ee.List(resultado.get('groups'));
}


function limiteTransicoesTela() {
  if (dispositivoAtual === 'mobile') {
    return 10;
  }

  if (dispositivoAtual === 'tablet') {
    return 15;
  }

  return 20;
}


function largurasTabelaTransicoes() {
  if (dispositivoAtual === 'mobile') {
    return {
      descricao: '230px',
      area: '72px',
      fonte: '8px'
    };
  }

  if (dispositivoAtual === 'tablet') {
    return {
      descricao: '205px',
      area: '70px',
      fonte: '8px'
    };
  }

  return {
    descricao: '270px',
    area: '78px',
    fonte: '9px'
  };
}


function criarMarcadorClasse(codigo) {
  return ui.Label({
    value: '',
    style: {
      backgroundColor: '#' + corClasse(codigo),
      padding: '4px',
      margin: '3px 4px 0 0',
      border: '1px solid #dddddd'
    }
  });
}


function calcularTransicoes() {
  if (
    moduloAtual !== 'Uso e Cobertura da Terra' ||
    modoAtual !== 'Comparar anos'
  ) {
    return;
  }

  var id = ++requisicaoTransicoes;

  tabelaTransicoes.clear();

  statusTransicoes.setValue(
    'Calculando transições entre ' + anoA + ' e ' + anoB + '...'
  );

  tabelaTransicoes.add(
    ui.Label('Processando pixels da bacia...', {
      fontSize: '9px',
      color: '#777777'
    })
  );

  gruposTransicoes(anoA, anoB)
    .evaluate(function(grupos) {
      if (id !== requisicaoTransicoes) {
        return;
      }

      grupos = grupos || [];

      var transicoes = [];

      grupos.forEach(function(item) {
        var codigo = Number(item.transicao);
        var area = Number(item.sum) || 0;

        var origem = Math.floor(codigo / 100);
        var destino = codigo % 100;

        // Nesta tabela mostramos apenas mudanças reais.
        if (origem === destino) {
          return;
        }

        // Ignora qualquer código que não esteja na legenda utilizada pelo App.
        if (
          indiceClasse(origem) < 0 ||
          indiceClasse(destino) < 0
        ) {
          return;
        }

        transicoes.push({
          origem: origem,
          destino: destino,
          area: area
        });
      });

      transicoes.sort(function(a, b) {
        return b.area - a.area;
      });

      tabelaTransicoes.clear();

      if (transicoes.length === 0) {
        statusTransicoes.setValue(
          'Não foram identificadas mudanças de classe entre os anos selecionados.'
        );
        return;
      }

      var areaTotalMudancas = transicoes.reduce(
        function(total, item) {
          return total + item.area;
        },
        0
      );

      var limite = limiteTransicoesTela();
      var mostrar = transicoes.slice(0, limite);
      var larguras = largurasTabelaTransicoes();

      statusTransicoes.setValue(
        'Foram identificados ' +
        transicoes.length +
        ' tipos de transição.\n' +
        'A tabela mostra as ' +
        mostrar.length +
        ' maiores, que somam ' +
        formatarNumero(
          mostrar.reduce(function(total, item) {
            return total + item.area;
          }, 0),
          1
        ) +
        ' km².'
      );

      tabelaTransicoes.add(
        ui.Panel({
          widgets: [
            ui.Label('Origem → destino', {
              width: larguras.descricao,
              fontSize: larguras.fonte,
              fontWeight: 'bold'
            }),

            ui.Label('Área km²', {
              width: larguras.area,
              fontSize: larguras.fonte,
              fontWeight: 'bold',
              textAlign: 'right'
            }),

            ui.Label('Mapa', {
              width:
                dispositivoAtual === 'mobile'
                  ? '48px'
                  : '66px',
              fontSize: larguras.fonte,
              fontWeight: 'bold',
              textAlign: 'center',
              margin: '0 0 0 5px'
            })
          ],

          layout: ui.Panel.Layout.flow('horizontal'),

          style: {
            margin: '0 0 5px 0',
            padding: '0 0 4px 0'
          }
        })
      );

      mostrar.forEach(function(item) {
        // Cópias locais evitam qualquer ambiguidade de fechamento (closure)
        // quando os botões são clicados depois que o loop terminou.
        var origemItem = Number(item.origem);
        var destinoItem = Number(item.destino);
        var areaItem = Number(item.area) || 0;

        var descricao = ui.Panel({
          widgets: [
            criarMarcadorClasse(origemItem),

            ui.Label(
              nomeClasse(origemItem),
              {
                fontSize: larguras.fonte,
                color: '#444444'
              }
            ),

            ui.Label(' → ', {
              fontSize: larguras.fonte,
              color: '#777777'
            }),

            criarMarcadorClasse(destinoItem),

            ui.Label(
              nomeClasse(destinoItem),
              {
                fontSize: larguras.fonte,
                color: '#444444'
              }
            )
          ],

          layout: ui.Panel.Layout.flow('horizontal'),

          style: {
            width: larguras.descricao
          }
        });

        var areaLabel = ui.Label({
          value: formatarNumero(areaItem, 1),
          style: {
            width: larguras.area,
            fontSize: larguras.fonte,
            textAlign: 'right',
            color: '#444444'
          }
        });

        var botaoMapa = ui.Button({
          label:
            dispositivoAtual === 'mobile'
              ? 'Ver'
              : 'Destacar',
          onClick: function() {
            destacarTransicao(
              origemItem,
              destinoItem,
              areaItem
            );
          },
          style: {
            width:
              dispositivoAtual === 'mobile'
                ? '48px'
                : '66px',
            fontSize: larguras.fonte,
            margin: '0 0 0 5px'
          }
        });

        tabelaTransicoes.add(
          ui.Panel({
            widgets: [
              descricao,
              areaLabel,
              botaoMapa
            ],

            layout: ui.Panel.Layout.flow('horizontal'),

            style: {
              margin: '1px 0'
            }
          })
        );
      });

      tabelaTransicoes.add(
        ui.Label(
          'Área total que mudou de classe: ' +
          formatarNumero(areaTotalMudancas, 1) +
          ' km².',
          {
            fontSize: '9px',
            color: '#666666',
            margin: '8px 0 0 0'
          }
        )
      );
    });
}


botaoCalcularTransicoes.onClick(function() {
  calcularTransicoes();
});



// ============================================================================
// 20.2. MÓDULO DINÂMICA DA ÁGUA
// ============================================================================

var requisicaoAreaAgua = 0;
var requisicaoComparacaoAgua = 0;
var requisicaoFrequenciaAgua = 0;
var requisicaoTiposAgua = 0;


// --------------------------------------------------------------------------
// Superfície anual
// --------------------------------------------------------------------------

function desenharAguaAnual(ano) {
  ano = Math.round(ano);
  anoAgua = ano;
  labelAnoAgua.setValue(String(ano));

  var camadaAgua = ui.Map.Layer(
    aguaAnoVisual(ano),
    {
      min: 1,
      max: 1,
      palette: ['2474b5']
    },
    'Superfície de água ' + ano,
    true,
    0.95
  );

  mapaSimples.layers().reset([
    camadaAgua,
    camadaLimite()
  ]);

  infoAguaAnual.setValue(
    'Ano: ' + ano +
    '\nClique no mapa para consultar o pixel.'
  );

  atualizarAreaAguaAnual();
}


function atualizarAreaAguaAnual() {
  if (
    moduloAtual !== 'Dinâmica da Água' ||
    modoAtual !== 'Superfície anual'
  ) {
    return;
  }

  var id = ++requisicaoAreaAgua;

  resumoAguaAnual.setValue(
    'Calculando superfície de água em ' + anoAgua + '...'
  );

  ee.Dictionary({
    areaAgua: areaAguaAnoKm2(anoAgua),
    areaBacia: bacia.geometry().area(1).divide(1000000)
  }).evaluate(function(resultado) {
    if (id !== requisicaoAreaAgua) return;

    resultado = resultado || {};

    var areaAgua = Number(resultado.areaAgua) || 0;
    var areaBacia = Number(resultado.areaBacia) || 0;
    var percentual = areaBacia > 0
      ? (areaAgua / areaBacia) * 100
      : 0;

    resumoAguaAnual.setValue(
      'Ano: ' + anoAgua +
      '\n\n' +
      'Superfície de água: ' +
      formatarNumero(areaAgua, 1) +
      ' km²' +
      '\n' +
      'Participação na bacia: ' +
      formatarNumero(percentual, 2) +
      '%'
    );
  });
}


function consultarAguaAnual(coords) {
  infoAguaAnual.setValue('Consultando...');

  var ponto = ee.Geometry.Point([
    coords.lon,
    coords.lat
  ]);

  aguaAnoBinaria(anoAgua)
    .reduceRegion({
      reducer: ee.Reducer.first(),
      geometry: ponto,
      scale: 30,
      maxPixels: 10000
    })
    .get('agua')
    .evaluate(function(valor) {
      if (valor === null || valor === undefined) {
        infoAguaAnual.setValue(
          'Ponto fora da Bacia do Rio Mearim.'
        );
        return;
      }

      var situacao = Number(valor) === 1
        ? 'Água'
        : 'Não água';

      infoAguaAnual.setValue(
        'Ano: ' + anoAgua +
        '\nSituação: ' + situacao +
        '\nLatitude: ' + coords.lat.toFixed(5) +
        '\nLongitude: ' + coords.lon.toFixed(5)
      );
    });
}


// --------------------------------------------------------------------------
// Comparar anos — Água
// --------------------------------------------------------------------------

function mascarasMudancaAgua() {
  var aguaA = aguaAnoBinaria(anoAguaA);
  var aguaB = aguaAnoBinaria(anoAguaB);

  return {
    aguaA: aguaA,
    aguaB: aguaB,
    ganho: aguaA.eq(0).and(aguaB.eq(1)).selfMask(),
    perda: aguaA.eq(1).and(aguaB.eq(0)).selfMask(),
    permaneceu: aguaA.eq(1).and(aguaB.eq(1)).selfMask()
  };
}


function desenharComparacaoAgua() {
  labelMapaA.setValue(String(anoAguaA));
  labelMapaB.setValue(String(anoAguaB));

  var mudancas = mascarasMudancaAgua();

  var camadaAguaA = ui.Map.Layer(
    mudancas.aguaA.selfMask(),
    {
      min: 1,
      max: 1,
      palette: ['2474b5']
    },
    'Água ' + anoAguaA,
    true,
    0.95
  );

  var camadaAguaB = ui.Map.Layer(
    mudancas.aguaB.selfMask(),
    {
      min: 1,
      max: 1,
      palette: ['2474b5']
    },
    'Água ' + anoAguaB,
    true,
    0.95
  );

  // À esquerda, vermelho evidencia onde havia água e deixou de haver.
  var camadaPerda = ui.Map.Layer(
    mudancas.perda,
    {
      min: 1,
      max: 1,
      palette: ['de2d26']
    },
    'Perda de água',
    true,
    0.95
  );

  // À direita, verde evidencia onde surgiu água no segundo ano.
  var camadaGanho = ui.Map.Layer(
    mudancas.ganho,
    {
      min: 1,
      max: 1,
      palette: ['2ca25f']
    },
    'Ganho de água',
    true,
    0.95
  );

  mapaA.layers().reset([
    camadaAguaA,
    camadaPerda,
    camadaLimite()
  ]);

  mapaB.layers().reset([
    camadaAguaB,
    camadaGanho,
    camadaLimite()
  ]);

  infoComparacaoAgua.setValue(
    'Clique no mapa para comparar ' +
    anoAguaA +
    ' e ' +
    anoAguaB +
    '.'
  );

  atualizarComparacaoAgua();
}


function atualizarComparacaoAgua() {
  if (
    moduloAtual !== 'Dinâmica da Água' ||
    modoAtual !== 'Comparar anos'
  ) {
    return;
  }

  var id = ++requisicaoComparacaoAgua;
  var mudancas = mascarasMudancaAgua();

  resumoComparacaoAgua.setValue(
    'Calculando dinâmica entre ' +
    anoAguaA +
    ' e ' +
    anoAguaB +
    '...'
  );

  ee.Dictionary({
    areaA: areaMascaraKm2(mudancas.aguaA.eq(1)),
    areaB: areaMascaraKm2(mudancas.aguaB.eq(1)),
    ganho: areaMascaraKm2(mudancas.ganho),
    perda: areaMascaraKm2(mudancas.perda)
  }).evaluate(function(resultado) {
    if (id !== requisicaoComparacaoAgua) return;

    resultado = resultado || {};

    var areaA = Number(resultado.areaA) || 0;
    var areaB = Number(resultado.areaB) || 0;
    var ganho = Number(resultado.ganho) || 0;
    var perda = Number(resultado.perda) || 0;
    var saldo = areaB - areaA;

    var pct = areaA > 0
      ? (saldo / areaA) * 100
      : null;

    var sinalSaldo = saldo > 0 ? '+' : '';
    var textoPct = pct === null
      ? '—'
      : ((pct > 0 ? '+' : '') + formatarNumero(pct, 1) + '%');

    resumoComparacaoAgua.setValue(
      anoAguaA + ': ' +
      formatarNumero(areaA, 1) +
      ' km²' +
      '\n' +
      anoAguaB + ': ' +
      formatarNumero(areaB, 1) +
      ' km²' +
      '\n\n' +
      'Ganho: +' +
      formatarNumero(ganho, 1) +
      ' km²' +
      '\n' +
      'Perda: -' +
      formatarNumero(perda, 1) +
      ' km²' +
      '\n' +
      'Saldo: ' +
      sinalSaldo +
      formatarNumero(saldo, 1) +
      ' km²' +
      '\n' +
      'Variação relativa: ' +
      textoPct
    );
  });
}


function consultarComparacaoAgua(coords) {
  infoComparacaoAgua.setValue('Consultando...');

  var ponto = ee.Geometry.Point([
    coords.lon,
    coords.lat
  ]);

  ee.Image.cat([
    aguaAnoBinaria(anoAguaA).rename('A'),
    aguaAnoBinaria(anoAguaB).rename('B')
  ])
  .reduceRegion({
    reducer: ee.Reducer.first(),
    geometry: ponto,
    scale: 30,
    maxPixels: 10000
  })
  .evaluate(function(resultado) {
    resultado = resultado || {};

    var valorA = resultado.A;
    var valorB = resultado.B;

    if (
      valorA === null ||
      valorA === undefined ||
      valorB === null ||
      valorB === undefined
    ) {
      infoComparacaoAgua.setValue(
        'Ponto fora da Bacia do Rio Mearim.'
      );
      return;
    }

    var a = Number(valorA) === 1;
    var b = Number(valorB) === 1;
    var mudanca;

    if (a && b) {
      mudanca = 'Permaneceu com água';
    } else if (!a && b) {
      mudanca = 'Ganho de superfície de água';
    } else if (a && !b) {
      mudanca = 'Perda de superfície de água';
    } else {
      mudanca = 'Permaneceu sem água';
    }

    infoComparacaoAgua.setValue(
      anoAguaA + ': ' + (a ? 'Água' : 'Não água') +
      '\n' +
      anoAguaB + ': ' + (b ? 'Água' : 'Não água') +
      '\n\n' +
      'Situação: ' + mudanca +
      '\nLatitude: ' + coords.lat.toFixed(5) +
      '\nLongitude: ' + coords.lon.toFixed(5)
    );
  });
}


// --------------------------------------------------------------------------
// Frequência histórica da água
// --------------------------------------------------------------------------

function desenharFrequenciaAgua() {
  var classe = classeFrequenciaAgua();

  var camada = ui.Map.Layer(
    classe,
    {
      min: 1,
      max: 4,
      palette: [
        'c6dbef',
        '9ecae1',
        '4292c6',
        '084594'
      ]
    },
    'Frequência histórica da água 1985–2024',
    true,
    0.95
  );

  mapaSimples.layers().reset([
    camada,
    camadaLimite()
  ]);

  infoFrequenciaAgua.setValue(
    'Clique no mapa para consultar a frequência histórica do pixel.'
  );

  atualizarResumoFrequenciaAgua();
}


function atualizarResumoFrequenciaAgua() {
  if (
    moduloAtual !== 'Dinâmica da Água' ||
    modoAtual !== 'Frequência da água'
  ) {
    return;
  }

  var id = ++requisicaoFrequenciaAgua;
  var freq = frequenciaAguaHistorica();

  var ocorreuUltimos3 = aguaAnoBinaria(2022)
    .add(aguaAnoBinaria(2023))
    .add(aguaAnoBinaria(2024))
    .gt(0);

  var baixa = freq.gt(0).and(freq.lt(10));
  var infrequente = freq.gte(10).and(freq.lt(50));
  var intermitente = freq.gte(50).and(freq.lte(90));
  var permanente = freq.gt(90).and(ocorreuUltimos3);

  resumoFrequenciaAgua.setValue(
    'Calculando áreas por frequência...'
  );

  ee.Dictionary({
    baixa: areaMascaraKm2(baixa),
    infrequente: areaMascaraKm2(infrequente),
    intermitente: areaMascaraKm2(intermitente),
    permanente: areaMascaraKm2(permanente)
  }).evaluate(function(resultado) {
    if (id !== requisicaoFrequenciaAgua) return;

    resultado = resultado || {};

    var baixaArea = Number(resultado.baixa) || 0;
    var infArea = Number(resultado.infrequente) || 0;
    var intArea = Number(resultado.intermitente) || 0;
    var perArea = Number(resultado.permanente) || 0;

    var totalOcorrencia =
      baixaArea +
      infArea +
      intArea +
      perArea;

    resumoFrequenciaAgua.setValue(
      'Área com alguma ocorrência anual: ' +
      formatarNumero(totalOcorrencia, 1) +
      ' km²' +
      '\n\n' +
      'Permanente: ' +
      formatarNumero(perArea, 1) +
      ' km²' +
      '\n' +
      'Intermitente: ' +
      formatarNumero(intArea, 1) +
      ' km²' +
      '\n' +
      'Infrequente: ' +
      formatarNumero(infArea, 1) +
      ' km²' +
      '\n' +
      'Baixa frequência: ' +
      formatarNumero(baixaArea, 1) +
      ' km²'
    );
  });
}


function consultarFrequenciaAgua(coords) {
  infoFrequenciaAgua.setValue('Consultando...');

  var ponto = ee.Geometry.Point([
    coords.lon,
    coords.lat
  ]);

  frequenciaAguaHistorica()
    .reduceRegion({
      reducer: ee.Reducer.first(),
      geometry: ponto,
      scale: 30,
      maxPixels: 10000
    })
    .get('frequencia')
    .evaluate(function(valor) {
      if (valor === null || valor === undefined) {
        infoFrequenciaAgua.setValue(
          'Ponto fora da Bacia do Rio Mearim.'
        );
        return;
      }

      var frequencia = Number(valor);

      infoFrequenciaAgua.setValue(
        'Frequência anual: ' +
        formatarNumero(frequencia, 1) +
        '%' +
        '\nClasse: ' +
        nomeFrequenciaAgua(frequencia) +
        '\nLatitude: ' +
        coords.lat.toFixed(5) +
        '\nLongitude: ' +
        coords.lon.toFixed(5)
      );
    });
}


// --------------------------------------------------------------------------
// Tipos de corpos hídricos
// --------------------------------------------------------------------------

function desenharCorposAgua(ano) {
  anoCorposAgua = Number(ano);

  var tipo = corposAguaAno(anoCorposAgua);

  var visual = tipo.remap(
    TIPOS_AGUA_CODES,
    ee.List.sequence(1, TIPOS_AGUA_CODES.length)
  );

  var camada = ui.Map.Layer(
    visual,
    {
      min: 1,
      max: 4,
      palette: TIPOS_AGUA_COLORS
    },
    'Tipos de corpos hídricos ' + anoCorposAgua,
    true,
    0.95
  );

  mapaSimples.layers().reset([
    camada,
    camadaLimite()
  ]);

  infoCorposAgua.setValue(
    'Ano: ' +
    anoCorposAgua +
    '\nClique em um corpo hídrico para identificar seu tipo.'
  );

  atualizarAreasTiposAgua();
}


function atualizarAreasTiposAgua() {
  if (
    moduloAtual !== 'Dinâmica da Água' ||
    modoAtual !== 'Tipos de corpos hídricos'
  ) {
    return;
  }

  var id = ++requisicaoTiposAgua;

  tabelaTiposAgua.clear();
  tabelaTiposAgua.add(
    ui.Label('Calculando áreas por tipo...', {
      fontSize: '10px',
      color: '#777777'
    })
  );

  var tipo = corposAguaAno(anoCorposAgua)
    .rename('tipo');

  var area = ee.Image
    .pixelArea()
    .divide(1000000)
    .rename('area_km2');

  var resultado = area
    .addBands(tipo)
    .reduceRegion({
      reducer: ee.Reducer
        .sum()
        .group({
          groupField: 1,
          groupName: 'tipo'
        }),
      geometry: bacia.geometry(),
      scale: 30,
      maxPixels: 1e13,
      tileScale: 4
    });

  ee.List(resultado.get('groups'))
    .evaluate(function(grupos) {
      if (id !== requisicaoTiposAgua) return;

      grupos = grupos || [];
      tabelaTiposAgua.clear();

      var areas = {};

      grupos.forEach(function(item) {
        areas[String(item.tipo)] =
          Number(item.sum) || 0;
      });

      var total = 0;

      TIPOS_AGUA_CODES.forEach(function(codigo) {
        var areaTipo =
          areas[String(codigo)] || 0;

        total += areaTipo;

        tabelaTiposAgua.add(
          ui.Panel({
            widgets: [
              ui.Panel({
                widgets: [
                  ui.Label({
                    value: '',
                    style: {
                      backgroundColor:
                        '#' + corTipoAgua(codigo),
                      padding: '5px',
                      margin: '3px 5px 0 0',
                      border: '1px solid #dddddd'
                    }
                  }),
                  ui.Label(
                    nomeTipoAgua(codigo),
                    {
                      fontSize: '9px',
                      color: '#444444'
                    }
                  )
                ],
                layout:
                  ui.Panel.Layout.flow('horizontal'),
                style: {
                  stretch: 'horizontal'
                }
              }),
              ui.Label(
                formatarNumero(areaTipo, 1) +
                ' km²',
                {
                  fontSize: '9px',
                  color: '#444444',
                  textAlign: 'right',
                  width: '80px'
                }
              )
            ],
            layout:
              ui.Panel.Layout.flow('horizontal'),
            style: {
              stretch: 'horizontal',
              margin: '1px 0'
            }
          })
        );
      });

      tabelaTiposAgua.add(
        ui.Label(
          'Área total classificada: ' +
          formatarNumero(total, 1) +
          ' km²',
          {
            fontSize: '9px',
            color: '#666666',
            margin: '8px 0 0 0'
          }
        )
      );
    });
}


function consultarCorposAgua(coords) {
  infoCorposAgua.setValue('Consultando...');

  var ponto = ee.Geometry.Point([
    coords.lon,
    coords.lat
  ]);

  corposAguaAno(anoCorposAgua)
    .reduceRegion({
      reducer: ee.Reducer.first(),
      geometry: ponto,
      scale: 30,
      maxPixels: 10000
    })
    .get('tipo')
    .evaluate(function(valor) {
      if (valor === null || valor === undefined) {
        infoCorposAgua.setValue(
          'Não foi identificado corpo hídrico neste ponto ' +
          'ou o ponto está fora da bacia.'
        );
        return;
      }

      infoCorposAgua.setValue(
        'Ano: ' + anoCorposAgua +
        '\nTipo: ' + nomeTipoAgua(valor) +
        '\nCódigo: ' + valor +
        '\nLatitude: ' + coords.lat.toFixed(5) +
        '\nLongitude: ' + coords.lon.toFixed(5)
      );
    });
}


// --------------------------------------------------------------------------
// Troca das visualizações do módulo Água
// --------------------------------------------------------------------------

function mostrarAguaAnual() {
  modoAtual = 'Superfície anual';
  modoAguaAtual = modoAtual;

  painelControlesDinamicos
    .widgets()
    .reset([
      controlesAguaAnual
    ]);

  painelMapaDinamico
    .widgets()
    .reset([
      mapaSimples
    ]);

  desenharAguaAnual(anoAgua);
}


function mostrarComparacaoAgua() {
  modoAtual = 'Comparar anos';
  modoAguaAtual = modoAtual;

  painelControlesDinamicos
    .widgets()
    .reset([
      controlesComparacaoAgua
    ]);

  painelMapaDinamico
    .widgets()
    .reset([
      painelComparador
    ]);

  if (dispositivoAtual === 'mobile') {
    selectModoComparacaoAgua
      .items()
      .reset(['Swipe']);

    selectModoComparacaoAgua
      .setValue('Swipe', false);

    comparador.setWipe(true);
  } else {
    var valor = selectModoComparacaoAgua.getValue();

    selectModoComparacaoAgua
      .items()
      .reset([
        'Swipe',
        'Lado a lado'
      ]);

    if (
      valor !== 'Swipe' &&
      valor !== 'Lado a lado'
    ) {
      valor = 'Swipe';
    }

    selectModoComparacaoAgua
      .setValue(valor, false);

    comparador.setWipe(
      valor === 'Swipe'
    );
  }

  desenharComparacaoAgua();
}


function mostrarFrequenciaAgua() {
  modoAtual = 'Frequência da água';
  modoAguaAtual = modoAtual;

  painelControlesDinamicos
    .widgets()
    .reset([
      controlesFrequenciaAgua
    ]);

  painelMapaDinamico
    .widgets()
    .reset([
      mapaSimples
    ]);

  desenharFrequenciaAgua();
}


function mostrarCorposAgua() {
  modoAtual = 'Tipos de corpos hídricos';
  modoAguaAtual = modoAtual;

  painelControlesDinamicos
    .widgets()
    .reset([
      controlesCorposAgua
    ]);

  painelMapaDinamico
    .widgets()
    .reset([
      mapaSimples
    ]);

  desenharCorposAgua(
    anoCorposAgua
  );
}


function mostrarVisualizacaoAgua(valor) {
  if (valor === 'Superfície anual') {
    mostrarAguaAnual();
    return;
  }

  if (valor === 'Comparar anos') {
    mostrarComparacaoAgua();
    return;
  }

  if (valor === 'Frequência da água') {
    mostrarFrequenciaAgua();
    return;
  }

  mostrarCorposAgua();
}


// ============================================================================
// 21. EVENTOS DOS ANOS E DAS COMPARAÇÕES
// ============================================================================

// Uso e cobertura.
sliderAnoSimples.onChange(function(valor) {
  if (moduloAtual === 'Uso e Cobertura da Terra') {
    desenharMapaSimples(Math.round(valor));
  }
});

function atualizarComparacaoCompleta() {
  if (moduloAtual !== 'Uso e Cobertura da Terra') return;

  desenharComparacao();
  atualizarComparacaoAreas();
  invalidarTransicoes();
}

selectAnoA.onChange(function(valor) {
  anoA = parseInt(valor, 10);

  if (moduloAtual === 'Uso e Cobertura da Terra') {
    atualizarComparacaoCompleta();
  }
});

selectAnoB.onChange(function(valor) {
  anoB = parseInt(valor, 10);

  if (moduloAtual === 'Uso e Cobertura da Terra') {
    atualizarComparacaoCompleta();
  }
});

selectModoComparacao.onChange(function(valor) {
  if (moduloAtual !== 'Uso e Cobertura da Terra') return;

  comparador.setWipe(valor === 'Swipe');
  legendaComparacaoDebounced();
});


// Água — superfície anual.
sliderAnoAgua.onChange(function(valor) {
  anoAgua = Math.round(valor);

  if (
    moduloAtual === 'Dinâmica da Água' &&
    modoAtual === 'Superfície anual'
  ) {
    desenharAguaAnual(anoAgua);
  }
});


// Água — comparação.
selectAnoAguaA.onChange(function(valor) {
  anoAguaA = parseInt(valor, 10);

  if (
    moduloAtual === 'Dinâmica da Água' &&
    modoAtual === 'Comparar anos'
  ) {
    desenharComparacaoAgua();
  }
});

selectAnoAguaB.onChange(function(valor) {
  anoAguaB = parseInt(valor, 10);

  if (
    moduloAtual === 'Dinâmica da Água' &&
    modoAtual === 'Comparar anos'
  ) {
    desenharComparacaoAgua();
  }
});

selectModoComparacaoAgua.onChange(function(valor) {
  if (moduloAtual !== 'Dinâmica da Água') return;

  comparador.setWipe(valor === 'Swipe');
});


// Água — tipos de corpos hídricos.
selectAnoCorposAgua.onChange(function(valor) {
  anoCorposAgua = parseInt(valor, 10);

  if (
    moduloAtual === 'Dinâmica da Água' &&
    modoAtual === 'Tipos de corpos hídricos'
  ) {
    desenharCorposAgua(anoCorposAgua);
  }
});


// ============================================================================
// 22. TROCA DE MÓDULO E DE VISUALIZAÇÃO
// ============================================================================

// --------------------------------------------------------------------------
// Uso e Cobertura da Terra
// --------------------------------------------------------------------------

function mostrarMapaTemporal() {
  modoAtual = 'Mapa temporal';
  modoUsoAtual = modoAtual;

  // O destaque espacial pertence exclusivamente ao modo de comparação.
  limparDestaqueTransicao(false);

  painelControlesDinamicos.widgets().reset([
    controlesSimples
  ]);

  painelMapaDinamico.widgets().reset([
    mapaSimples
  ]);

  desenharMapaSimples(anoSimples);
  legendaSimplesDebounced();
}

function mostrarComparacao() {
  modoAtual = 'Comparar anos';
  modoUsoAtual = modoAtual;

  painelControlesDinamicos.widgets().reset([
    controlesComparacao
  ]);

  painelMapaDinamico.widgets().reset([
    painelComparador
  ]);

  // Em celular, Swipe é obrigatório para preservar a largura útil.
  if (dispositivoAtual === 'mobile') {
    selectModoComparacao.items().reset(['Swipe']);
    selectModoComparacao.setValue('Swipe', false);
    comparador.setWipe(true);
  } else {
    var valor = selectModoComparacao.getValue();

    selectModoComparacao.items().reset([
      'Swipe',
      'Lado a lado'
    ]);

    if (
      valor !== 'Swipe' &&
      valor !== 'Lado a lado'
    ) {
      valor = 'Swipe';
    }

    selectModoComparacao.setValue(valor, false);
    comparador.setWipe(valor === 'Swipe');
  }

  atualizarComparacaoCompleta();
  legendaComparacaoDebounced();
}

function mostrarVisualizacaoUso(valor) {
  if (valor === 'Comparar anos') {
    mostrarComparacao();
  } else {
    mostrarMapaTemporal();
  }
}


// --------------------------------------------------------------------------
// Seletor de visualização
// --------------------------------------------------------------------------

seletorVisualizacao.onChange(function(valor) {
  if (moduloAtual === 'Dinâmica da Água') {
    mostrarVisualizacaoAgua(valor);
  } else {
    mostrarVisualizacaoUso(valor);
  }
});


// --------------------------------------------------------------------------
// Seletor de módulo temático
// --------------------------------------------------------------------------

seletorModulo.onChange(function(valor) {
  moduloAtual = valor;

  // Cancela respostas assíncronas de painéis que deixaram de estar ativos.
  requisicaoAreas++;
  requisicaoTransicoes++;
  requisicaoAreaAgua++;
  requisicaoComparacaoAgua++;
  requisicaoFrequenciaAgua++;
  requisicaoTiposAgua++;

  limparDestaqueTransicao(false);

  if (moduloAtual === 'Dinâmica da Água') {
    seletorVisualizacao.items().reset([
      'Superfície anual',
      'Comparar anos',
      'Frequência da água'
    ]);

    if (
      modoAguaAtual !== 'Superfície anual' &&
      modoAguaAtual !== 'Comparar anos' &&
      modoAguaAtual !== 'Frequência da água'
    ) {
      modoAguaAtual = 'Superfície anual';
    }

    seletorVisualizacao.setValue(
      modoAguaAtual,
      false
    );

    mostrarVisualizacaoAgua(
      modoAguaAtual
    );

  } else {
    seletorVisualizacao.items().reset([
      'Mapa temporal',
      'Comparar anos'
    ]);

    if (
      modoUsoAtual !== 'Mapa temporal' &&
      modoUsoAtual !== 'Comparar anos'
    ) {
      modoUsoAtual = 'Mapa temporal';
    }

    seletorVisualizacao.setValue(
      modoUsoAtual,
      false
    );

    mostrarVisualizacaoUso(
      modoUsoAtual
    );
  }
});


// ============================================================================
// 23. CONTROLES DO MAPA POR DISPOSITIVO
// ============================================================================

function configurarControlesMapa(tipo) {
  var mobile = tipo === 'mobile';
  var tablet = tipo === 'tablet';

  [mapaSimples, mapaA, mapaB].forEach(function(mapa) {
    mapa.setControlVisibility({
      layerList: false,
      zoomControl: !mobile,
      scaleControl: !mobile && !tablet,
      mapTypeControl: !mobile,
      fullscreenControl: true,
      drawingToolsControl: false
    });
  });
}


// ============================================================================
// 24. MENU MOBILE
// ============================================================================

function atualizarVisibilidadeMenuMobile() {
  if (dispositivoAtual !== 'mobile') {
    painelEsquerdo.style().set('shown', true);
    botaoMenuMobile.style().set('shown', false);
    botaoFecharMobile.style().set('shown', false);
    return;
  }

  painelEsquerdo.style().set('shown', menuMobileAberto);
  botaoMenuMobile.style().set('shown', !menuMobileAberto);
  botaoFecharMobile.style().set('shown', menuMobileAberto);
}

botaoMenuMobile.onClick(function() {
  menuMobileAberto = true;
  atualizarVisibilidadeMenuMobile();
});

botaoFecharMobile.onClick(function() {
  menuMobileAberto = false;
  atualizarVisibilidadeMenuMobile();
});


// ============================================================================
// 25. RESPONSIVIDADE
// ============================================================================

function aplicarResponsividade(info) {
  var tipo;

  if (info.is_mobile || info.width < 650) {
    tipo = 'mobile';
  } else if (info.is_tablet || info.width < 1050) {
    tipo = 'tablet';
  } else {
    tipo = 'desktop';
  }

  dispositivoAtual = tipo;

  // Ajustes que podem ocorrer mesmo sem troca de breakpoint.
  configurarControlesMapa(tipo);

  if (tipo === 'mobile') {
    labelMapaA.style().set({
      fontSize: '14px',
      padding: '4px 8px',
      margin: '8px'
    });

    labelMapaB.style().set({
      fontSize: '14px',
      padding: '4px 8px',
      margin: '8px'
    });

    // No celular, os dois módulos usam apenas Swipe.
    if (selectModoComparacao.getValue() !== 'Swipe') {
      selectModoComparacao.setValue('Swipe', false);
    }

    if (selectModoComparacaoAgua.getValue() !== 'Swipe') {
      selectModoComparacaoAgua.setValue('Swipe', false);
    }

    selectModoComparacao.items().reset(['Swipe']);
    selectModoComparacaoAgua.items().reset(['Swipe']);
    comparador.setWipe(true);
  } else {
    labelMapaA.style().set({
      fontSize: '18px',
      padding: '6px 12px',
      margin: '12px'
    });

    labelMapaB.style().set({
      fontSize: '18px',
      padding: '6px 12px',
      margin: '12px'
    });

    var valorAtualComparacao = selectModoComparacao.getValue();
    var valorAtualComparacaoAgua = selectModoComparacaoAgua.getValue();

    selectModoComparacao.items().reset([
      'Swipe',
      'Lado a lado'
    ]);

    selectModoComparacaoAgua.items().reset([
      'Swipe',
      'Lado a lado'
    ]);

    if (
      valorAtualComparacao !== 'Swipe' &&
      valorAtualComparacao !== 'Lado a lado'
    ) {
      valorAtualComparacao = 'Swipe';
    }

    if (
      valorAtualComparacaoAgua !== 'Swipe' &&
      valorAtualComparacaoAgua !== 'Lado a lado'
    ) {
      valorAtualComparacaoAgua = 'Swipe';
    }

    selectModoComparacao.setValue(
      valorAtualComparacao,
      false
    );

    selectModoComparacaoAgua.setValue(
      valorAtualComparacaoAgua,
      false
    );

    // O SplitPanel é compartilhado; aplica o valor do módulo ativo.
    if (
      moduloAtual === 'Dinâmica da Água' &&
      modoAtual === 'Comparar anos'
    ) {
      comparador.setWipe(
        valorAtualComparacaoAgua === 'Swipe'
      );
    } else {
      comparador.setWipe(
        valorAtualComparacao === 'Swipe'
      );
    }
  }

  // Só remonta a raiz quando muda a categoria de tela.
  if (ultimoBreakpoint !== tipo) {
    ultimoBreakpoint = tipo;

    if (tipo === 'mobile') {
      menuMobileAberto = false;

      ui.root.setLayout(
        ui.Panel.Layout.absolute()
      );

      painelMapaDinamico.style().set({
        position: 'top-left',
        width: '100%',
        height: '100%',
        stretch: 'both',
        padding: '0px',
        margin: '0px'
      });

      painelEsquerdo.style().set({
        position: 'top-left',
        width: '88%',
        maxWidth: '360px',
        height: '84%',
        maxHeight: '84%',
        margin: '54px 8px 8px 8px',
        padding: '12px',
        backgroundColor: '#ffffff'
      });

      botaoMenuMobile.style().set({
        position: 'top-left',
        margin: '10px'
      });

      ui.root.widgets().reset([
        painelMapaDinamico,
        painelEsquerdo,
        botaoMenuMobile
      ]);

      atualizarVisibilidadeMenuMobile();

    } else {
      ui.root.setLayout(
        ui.Panel.Layout.flow('horizontal')
      );

      painelMapaDinamico.style().set({
        width: '100%',
        height: '100%',
        stretch: 'both',
        padding: '0px',
        margin: '0px'
      });

      if (tipo === 'tablet') {
        painelEsquerdo.style().set({
          width: '300px',
          maxWidth: '300px',
          height: '100%',
          maxHeight: '100%',
          margin: '0px',
          padding: '10px',
          backgroundColor: '#ffffff',
          shown: true
        });
      } else {
        painelEsquerdo.style().set({
          width: '380px',
          maxWidth: '380px',
          height: '100%',
          maxHeight: '100%',
          margin: '0px',
          padding: '14px',
          backgroundColor: '#ffffff',
          shown: true
        });
      }

      botaoMenuMobile.style().set('shown', false);
      botaoFecharMobile.style().set('shown', false);

      ui.root.widgets().reset([
        painelEsquerdo,
        painelMapaDinamico
      ]);
    }

    // Recria resultados dependentes do módulo/tela.
    if (
      moduloAtual === 'Uso e Cobertura da Terra' &&
      modoAtual === 'Comparar anos'
    ) {
      atualizarComparacaoAreas();
      invalidarTransicoes();
    }

    if (
      moduloAtual === 'Dinâmica da Água' &&
      modoAtual === 'Comparar anos'
    ) {
      atualizarComparacaoAgua();
    }

    if (
      moduloAtual === 'Dinâmica da Água' &&
      modoAtual === 'Tipos de corpos hídricos'
    ) {
      atualizarAreasTiposAgua();
    }
  }
}


// ============================================================================
// 26. INICIALIZAÇÃO
// ============================================================================

// Visualização padrão.
painelControlesDinamicos.widgets().reset([
  controlesSimples
]);

painelMapaDinamico.widgets().reset([
  mapaSimples
]);

desenharMapaSimples(anoSimples);

// Fallback inicial em layout desktop.
ui.root.setLayout(
  ui.Panel.Layout.flow('horizontal')
);

ui.root.widgets().reset([
  painelEsquerdo,
  painelMapaDinamico
]);

// Centraliza e sincroniza os três mapas.
mapaSimples.centerObject(
  bacia,
  7,
  function() {
    legendaSimplesDebounced();
  }
);

// Ajuste automático para celular, tablet ou computador.
ui.root.onResize(function(info) {
  aplicarResponsividade(info);
});

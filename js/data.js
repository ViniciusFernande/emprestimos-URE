// Gerenciamento de Dados e Persistência Local (LocalStorage)
// Sistema de Gestão de Agendas - Analistas

const STORAGE_KEYS = {
  ANALYSTS: 'sg_analistas',
  SCHOOLS: 'sg_escolas',
  SCHEDULES: 'sg_agendamentos',
  SETTINGS: 'sg_configuracoes',
  QUEUE: 'sg_filas_visita',
  WHATSAPP_TEMPLATE: 'sg_whatsapp_template',
  THEME: 'sg_selected_theme',
  URE_ATTENDANCES: 'sg_ure_atendimentos',
  ABSENCES: 'sg_analistas_ausencias'
};

// Categorias padrão de assuntos
const PREDEFINED_SUBJECTS = [
  { id: 'manutencao_maquinas', name: 'Manutenção de Máquinas', type: 'manutencao' },
  { id: 'conectividade', name: 'Conectividade', type: 'manutencao' },
  { id: 'espelhamento_dvr', name: 'Espelhamento DVR', type: 'manutencao' },
  { id: 'formatar_maquinas', name: 'Formatar Maquinas', type: 'manutencao' },
  { id: 'verificar_ap', name: 'Verificar AP', type: 'manutencao' },
  { id: 'inventario_escolar', name: 'Inventário Escolar', type: 'inventario' },
  { id: 'chamado_interno', name: 'Chamado Interno', type: 'manutencao' }
];

// Dados iniciais padrão (8 Analistas)
const SEED_ANALYSTS = (typeof window !== 'undefined' && window.HISTORICAL_SEED_DATA && window.HISTORICAL_SEED_DATA.analysts)
  ? window.HISTORICAL_SEED_DATA.analysts
  : [];

const SEED_SCHOOLS = [
  {
    "cie": "16196",
    "name": "ACCACIO VASCONCELOS CAMARGO PROF",
    "director": "NADIA CRISTINE SANDOVAL PAULA SANTOS",
    "phone": "",
    "neighborhood": "",
    "cpf": "161.839.378-27",
    "rg": "20984136"
  },
  {
    "cie": "16299",
    "name": "AGGEO PEREIRA DO AMARAL PROFESSOR",
    "director": "REGINA ISABEL TOLEDO VIEIRA VIANA",
    "phone": "",
    "neighborhood": "",
    "cpf": "795.619.938-72",
    "rg": "8545147"
  },
  {
    "cie": "16184",
    "name": "ALTAMIR GONCALVES PROFESSOR",
    "director": "ALESSANDRA FLORIANO GALHARDO",
    "phone": "",
    "neighborhood": "",
    "cpf": "124.914.638-06",
    "rg": "22849332"
  },
  {
    "cie": "905318",
    "name": "AMELIA CESAR MACHADO ARAUJO PROFA",
    "director": "LIGIA",
    "phone": "",
    "neighborhood": "",
    "cpf": "387.758.078-58",
    "rg": "48594248"
  },
  {
    "cie": "918593",
    "name": "ANA CECILIA MARTINS PROFESSORA",
    "director": "FLAVIA HIDALGO SANTOS VIEGAS",
    "phone": "",
    "neighborhood": "",
    "cpf": "144.795.748-24",
    "rg": "24453668-5"
  },
  {
    "cie": "900400",
    "name": "ANTONIA LUCCHESI PROFESSORA",
    "director": "RAFAEL TADEU SANTOS",
    "phone": "",
    "neighborhood": "",
    "cpf": "318.230.408-96",
    "rg": "34072718"
  },
  {
    "cie": "43497",
    "name": "ANTONIO CORDEIRO PROFESSOR",
    "director": "LUCIANO BARBOSA DA SILVA",
    "phone": "",
    "neighborhood": "",
    "cpf": "148.120.698-23",
    "rg": "22354847"
  },
  {
    "cie": "16391",
    "name": "ANTONIO MIGUEL PEREIRA JUNIOR",
    "director": "GISELE DALAVA CARONE",
    "phone": "",
    "neighborhood": "",
    "cpf": "144.888.878-64",
    "rg": "24452377"
  },
  {
    "cie": "16433",
    "name": "ANTONIO PADILHA",
    "director": "LUIZ ANTONIO DIAS JORGE",
    "phone": "",
    "neighborhood": "",
    "cpf": "050.472.468-17",
    "rg": "7673145"
  },
  {
    "cie": "920236",
    "name": "ANTONIO VIEIRA CAMPOS",
    "director": "VANESSA ABOU NASSER HINGST",
    "phone": "",
    "neighborhood": "",
    "cpf": "167.310.838-52",
    "rg": "24201519"
  },
  {
    "cie": "16408",
    "name": "ARQUIMINIO MARQUES DA SILVA PROF",
    "director": "MAGALI MARIA DE SOUZA",
    "phone": "",
    "neighborhood": "",
    "cpf": "081.821.368-06",
    "rg": "16380521"
  },
  {
    "cie": "16251",
    "name": "ARTHUR CYRILLO FREIRE DOUTOR",
    "director": "ALESSANDRO LUCIO",
    "phone": "",
    "neighborhood": "",
    "cpf": "087.003.088-46",
    "rg": "16879009"
  },
  {
    "cie": "36648",
    "name": "BALTAZAR FERNANDES",
    "director": "MARCELO RODRIGUES",
    "phone": "",
    "neighborhood": "",
    "cpf": "221.451.938-63",
    "rg": "34335172"
  },
  {
    "cie": "922031",
    "name": "BEATHRIS CAIXEIRO D CISTIA PROFA",
    "director": "ISIS FREITAS DE OLIVEIRA",
    "phone": "",
    "neighborhood": "",
    "cpf": "269.147.118-79",
    "rg": "30650121-1"
  },
  {
    "cie": "16248",
    "name": "BRIGADEIRO TOBIAS",
    "director": "SERGIO ADALBERTO ARMENIO",
    "phone": "",
    "neighborhood": "",
    "cpf": "029.745.658-08",
    "rg": "11617962"
  },
  {
    "cie": "980109",
    "name": "CEEJA NORBERTO SOARES RAMOS PROF",
    "director": "SIMONE MOTA PORTILHO",
    "phone": "",
    "neighborhood": "",
    "cpf": "167.358.788-76",
    "rg": "23401009"
  },
  {
    "cie": "36651",
    "name": "DIOGENES ALMEIDA MARINS PROFESSOR",
    "director": "JOSE AUGUSTO MARINS",
    "phone": "",
    "neighborhood": "",
    "cpf": "081.857.288-44",
    "rg": "14439506"
  },
  {
    "cie": "919925",
    "name": "DIONYSIO VIEIRA PROFESSOR",
    "director": "ANDREA APARECIDA RODRIGUES",
    "phone": "",
    "neighborhood": "",
    "cpf": "141.624.628-28",
    "rg": "22657639"
  },
  {
    "cie": "924106",
    "name": "DULCE ESMERALDA B FERREIRA PROFA",
    "director": "LUCIANO JESUINO BEZERRA",
    "phone": "",
    "neighborhood": "",
    "cpf": "067.396.418-38",
    "rg": "23626029"
  },
  {
    "cie": "42419",
    "name": "ELZA SALVESTRO BONILHA PROFESSORA",
    "director": "MARIA LUCIA DA FONSECA CESARINI",
    "phone": "",
    "neighborhood": "",
    "cpf": "010.167.698-06",
    "rg": "12141020"
  },
  {
    "cie": "478912",
    "name": "ELZIDE CELESTINA SOUZA PACHECO TUNUCHI PROFA",
    "director": "TATIANA DE SOUZA SERVIO VRECK",
    "phone": "",
    "neighborhood": "",
    "cpf": "291.979.698-42",
    "rg": "25828877"
  },
  {
    "cie": "16385",
    "name": "ENEAS PROENCA DE ARRUDA PROFESSOR",
    "director": "KATIA ADAMECZ MURBAK GUISE",
    "phone": "",
    "neighborhood": "",
    "cpf": "079.408.878-31",
    "rg": "9560161"
  },
  {
    "cie": "16366",
    "name": "ESCOLASTICA ROSA DE ALMEIDA PROFA",
    "director": "EDSON MARIO SILVA PEREIRA",
    "phone": "",
    "neighborhood": "",
    "cpf": "081.868.228-01",
    "rg": "16877174"
  },
  {
    "cie": "16135",
    "name": "EZEQUIEL MACHADO NASCIMENTO PROF",
    "director": "DANIELLA VIEIRA DA SILVA",
    "phone": "",
    "neighborhood": "",
    "cpf": "347.652.118-43",
    "rg": "47629303"
  },
  {
    "cie": "495104",
    "name": "FERNANDA DE C PIRES PROFA",
    "director": "SEVERINO DE ASSISIS SILVA",
    "phone": "",
    "neighborhood": "",
    "cpf": "134.820.288-26",
    "rg": "24113928"
  },
  {
    "cie": "903279",
    "name": "FLAVIO GAGLIARDI PROFESSOR",
    "director": "HIAGO APARECIDO DE ABREU",
    "phone": "",
    "neighborhood": "",
    "cpf": "423.935.698-98",
    "rg": "48474558"
  },
  {
    "cie": "16172",
    "name": "FRANCISCO CAMARGO CESAR",
    "director": "DANIEL FLORENTINO DE LIMA",
    "phone": "",
    "neighborhood": "",
    "cpf": "048.698.496-66",
    "rg": "30650066"
  },
  {
    "cie": "16421",
    "name": "FRANCISCO COCCARO PROFESSOR",
    "director": "FRED SILVA FILHO",
    "phone": "",
    "neighborhood": "",
    "cpf": "104.832.198-35",
    "rg": "14982075"
  },
  {
    "cie": "16202",
    "name": "FRANCISCO EUPHRASIO MONTEIRO",
    "director": "RUBENS JOAQUIM NUNES",
    "phone": "",
    "neighborhood": "",
    "cpf": "074.303.218-79",
    "rg": "13659030"
  },
  {
    "cie": "16111",
    "name": "GENESIO MACHADO PROFESSOR",
    "director": "ANA PAULA ERNANDES CAMARGO MALTA",
    "phone": "",
    "neighborhood": "",
    "cpf": "113.059.128-02",
    "rg": "20251891-7"
  },
  {
    "cie": "914629",
    "name": "GENEZIA IZABEL C MENCACCI PROFA",
    "director": "JOSE MILTON SALVADOR",
    "phone": "",
    "neighborhood": "",
    "cpf": "020.823.698-89",
    "rg": "12301798"
  },
  {
    "cie": "560510",
    "name": "GERALDO ESPIRITO S F ALMEIDA PROF",
    "director": "ROSELI MATAVELLI",
    "phone": "",
    "neighborhood": "",
    "cpf": "065.361.898-09",
    "rg": "12977742"
  },
  {
    "cie": "900382",
    "name": "GUALBERTO MOREIRA DOUTOR",
    "director": "ANDRE LUIZ GAROFALO",
    "phone": "",
    "neighborhood": "",
    "cpf": "140.502.238-80",
    "rg": "23734134"
  },
  {
    "cie": "900369",
    "name": "GUIOMAR CAMOLESI SOUZA PROFESSORA",
    "director": "LUCIMARA JOSE ROSA",
    "phone": "",
    "neighborhood": "",
    "cpf": "156.571.878-06",
    "rg": "18961352"
  },
  {
    "cie": "41658",
    "name": "GUMERCINDO GONCALVES",
    "director": "",
    "phone": "",
    "neighborhood": "",
    "cpf": "026.822.348-36",
    "rg": "10227195"
  },
  {
    "cie": "70282",
    "name": "HELIO DEL CISTIA",
    "director": "SUELI CANDIDA MENDES",
    "phone": "",
    "neighborhood": "",
    "cpf": "122.862.258-26",
    "rg": "14054680"
  },
  {
    "cie": "16214",
    "name": "HUMBERTO DE CAMPOS",
    "director": "TALITA",
    "phone": "",
    "neighborhood": "",
    "cpf": "099.057.928-05",
    "rg": "19637648"
  },
  {
    "cie": "903255",
    "name": "IDA YOLANDA L DE BARROS PROFA",
    "director": "SIMONE VELOSO STIPP DE SOUZA",
    "phone": "",
    "neighborhood": "",
    "cpf": "148.998.458-55",
    "rg": "19824219"
  },
  {
    "cie": "905306",
    "name": "ISABEL LOPES MONTEIRO PROFESSORA",
    "director": "IVAN JOSE DIAS PEREIRA",
    "phone": "",
    "neighborhood": "",
    "cpf": "662.863.018-87",
    "rg": "6045057"
  },
  {
    "cie": "39780",
    "name": "IZABEL RODRIGUES GALVAO PROFA",
    "director": "VANIA ROSENDO DE LIMA SILVA",
    "phone": "",
    "neighborhood": "",
    "cpf": "118.051.348-76",
    "rg": "20283141"
  },
  {
    "cie": "16226",
    "name": "JOAO CLIMACO DE CAMARGO PIRES",
    "director": "MARLI FERREIRA CARVALHO",
    "phone": "",
    "neighborhood": "",
    "cpf": "071.957.498-60",
    "rg": "16382276"
  },
  {
    "cie": "905324",
    "name": "JOAO MACHADO DE ARAUJO DOUTOR",
    "director": "ANA PAULA DUARTE SAMPAIO",
    "phone": "",
    "neighborhood": "",
    "cpf": "110.251.508-64",
    "rg": "21363246"
  },
  {
    "cie": "905297",
    "name": "JOAO RODRIGUES BUENO",
    "director": "GILBERTO RODRIGUES DE CAMPOS",
    "phone": "",
    "neighborhood": "",
    "cpf": "122.593.108-85",
    "rg": "13435972"
  },
  {
    "cie": "16093",
    "name": "JOAO SOARES MONSENHOR",
    "director": "ELIZABETH ISAIAS DA SILVA SANTOS",
    "phone": "",
    "neighborhood": "",
    "cpf": "084.793.558-24",
    "rg": "19306780"
  },
  {
    "cie": "38957",
    "name": "JOAQUIM IZIDORO MARINS PROFESSOR",
    "director": "JOEMIR DUTRA JUNIOR",
    "phone": "",
    "neighborhood": "",
    "cpf": "046.556.188-84",
    "rg": "15936051"
  },
  {
    "cie": "914630",
    "name": "JORDINA AMARAL ARRUDA PROFA",
    "director": "WELIKA FABIOLA DA CONCEICAO RIBEIRO",
    "phone": "",
    "neighborhood": "",
    "cpf": "122.521.368-12",
    "rg": "21970895"
  },
  {
    "cie": "16100",
    "name": "JORGE MADUREIRA PROFESSOR",
    "director": "ANGELA REGINA ASSANO",
    "phone": "",
    "neighborhood": "",
    "cpf": "124.963.798-89",
    "rg": "18371081"
  },
  {
    "cie": "16263",
    "name": "JOSE ODIN DE ARRUDA PROFESSOR",
    "director": "KATIA CARRASCO MARQUES",
    "phone": "",
    "neighborhood": "",
    "cpf": "164.427.678-09",
    "rg": "28064528"
  },
  {
    "cie": "16305",
    "name": "JOSE QUEVEDO PROFESSOR",
    "director": "ALINE FERNANDA MARTINS",
    "phone": "",
    "neighborhood": "",
    "cpf": "197.342.308-16",
    "rg": "28094265"
  },
  {
    "cie": "903280",
    "name": "JOSE REGINATO PROFESSOR",
    "director": "PATRICIA FELICIANO BARROS",
    "phone": "",
    "neighborhood": "",
    "cpf": "146.137.668-85",
    "rg": "18636007"
  },
  {
    "cie": "900370",
    "name": "JOSE ROQUE DE ALMEIDA ROSA PROF",
    "director": "ANA FLAVIA ROSA NOGUEIRA PONTES DOS SANTOS",
    "phone": "",
    "neighborhood": "",
    "cpf": "187.537.518-09",
    "rg": "24629938"
  },
  {
    "cie": "16317",
    "name": "JULIA RIOS ATHAYDE PROFESSORA",
    "director": "MONICA ROJO PEREIRA",
    "phone": "",
    "neighborhood": "",
    "cpf": "117.726.228-26",
    "rg": "17237296"
  },
  {
    "cie": "16160",
    "name": "JULIO BIERREMBACH LIMA PROFESSOR",
    "director": "VANESSA KELLY DA SILVA",
    "phone": "",
    "neighborhood": "",
    "cpf": "197.442.568-18",
    "rg": "29116994"
  },
  {
    "cie": "46991",
    "name": "JULIO PRESTES DE ALBUQUERQUE DR",
    "director": "ARLETE FERNANDES VELLOZO",
    "phone": "",
    "neighborhood": "",
    "cpf": "071.946.758-62",
    "rg": "12977568"
  },
  {
    "cie": "16329",
    "name": "LAILA GALEP SACKER PROFESSORA",
    "director": "VERA LUCIA LEONEL",
    "phone": "",
    "neighborhood": "",
    "cpf": "183.072.278-60",
    "rg": "14242816"
  },
  {
    "cie": "16330",
    "name": "LAURO SANCHEZ PROFESSOR",
    "director": "HALISAN JOSIANE DA COSTA",
    "phone": "",
    "neighborhood": "",
    "cpf": "219.267.688-33",
    "rg": "30113215"
  },
  {
    "cie": "16412",
    "name": "LUIZ GONZAGA CAMARGO FLEURY PROF",
    "director": "CLAUDIONOR FRANCISCO DA SILVA",
    "phone": "",
    "neighborhood": "",
    "cpf": "109.205.348-48",
    "rg": "21512137"
  },
  {
    "cie": "919913",
    "name": "LUIZ NOGUEIRA MARTINS SENADOR",
    "director": "DEBORA PERPETUO VALLINI FABRICIO",
    "phone": "",
    "neighborhood": "",
    "cpf": "099.248.858-30",
    "rg": "18664406"
  },
  {
    "cie": "39779",
    "name": "MARCO ANTONIO MENCACCI PROFESSOR",
    "director": "SILVANA APARECIDA DE ARAUJO SILVA",
    "phone": "",
    "neighborhood": "",
    "cpf": "301.860.678-79",
    "rg": "36799987"
  },
  {
    "cie": "564953",
    "name": "MARIA CANDIDA DE B ARAUJO PROFA",
    "director": "RENATO MOREIRA DE LIMA",
    "phone": "",
    "neighborhood": "",
    "cpf": "134.223.668-81",
    "rg": "24574653"
  },
  {
    "cie": "518591",
    "name": "MARIA HELENA GAZZI BONADIO PROFA",
    "director": "KATIA MARIA DOMINGOS DA SILVA VIEIRA",
    "phone": "",
    "neighborhood": "",
    "cpf": "122.885.138-70",
    "rg": "22984986"
  },
  {
    "cie": "42444",
    "name": "MARIA ONDINA ANDRADE PROFª",
    "director": "EDUARDO BENITEZ PELIZER",
    "phone": "",
    "neighborhood": "",
    "cpf": "306.223.598-51",
    "rg": "29793029"
  },
  {
    "cie": "900357",
    "name": "MARINA GROHMANN SOARES FERNANDES",
    "director": "EVERSON GIMENEZ VSQUEZ",
    "phone": "",
    "neighborhood": "",
    "cpf": "122.476.688-10",
    "rg": "19438853"
  },
  {
    "cie": "16275",
    "name": "MARIO GUILHERME NOTARI",
    "director": "SILVIO",
    "phone": "",
    "neighborhood": "",
    "cpf": "221.382.918-71",
    "rg": "30209494"
  },
  {
    "cie": "16287",
    "name": "MONTEIRO LOBATO",
    "director": "RODOLDO ERNESTO DA SILVA DINIZ",
    "phone": "",
    "neighborhood": "",
    "cpf": "149.721.278-21",
    "rg": "16880743"
  },
  {
    "cie": "922024",
    "name": "NAZIRA NAGIB J M RODRIGUES PROFA",
    "director": "SERGIO LUIS GERONUTTI",
    "phone": "",
    "neighborhood": "",
    "cpf": "058.028.778-55",
    "rg": "14861027"
  },
  {
    "cie": "16378",
    "name": "OSSIS SALVESTRINI MENDES PROFA",
    "director": "MAGDA SOUZA DE JESUS",
    "phone": "",
    "neighborhood": "",
    "cpf": "122.643.828-80",
    "rg": "22403488"
  },
  {
    "cie": "914617",
    "name": "OVIDIO ANTONIO DE SOUZA REVDO",
    "director": "LAERCIO LUCIO ALVES",
    "phone": "",
    "neighborhood": "",
    "cpf": "263.152.878-67",
    "rg": "29903827"
  },
  {
    "cie": "16147",
    "name": "PORTO SEGURO VISCONDE DE",
    "director": "HELENICE MARQUES LOPES",
    "phone": "",
    "neighborhood": "",
    "cpf": "045.868.218-76",
    "rg": "14862802"
  },
  {
    "cie": "920228",
    "name": "RAFAEL ORSI FILHO PROFESSOR",
    "director": "MERI KERN SARUBO",
    "phone": "",
    "neighborhood": "",
    "cpf": "046.580.348-24",
    "rg": "13809060"
  },
  {
    "cie": "42420",
    "name": "RENATO SENECA DE SA FLEURY PROF",
    "director": "EDNEY COUTO DE SOUZA",
    "phone": "",
    "neighborhood": "",
    "cpf": "150.491.318-39",
    "rg": "20229999"
  },
  {
    "cie": "922742",
    "name": "ROBERTO PASCHOALICK PROFESSOR",
    "director": "JAVARA IVELIZE GARCIA SEBASTIAO BELISARIO",
    "phone": "",
    "neighborhood": "",
    "cpf": "050.761.278-71",
    "rg": "13680981"
  },
  {
    "cie": "900345",
    "name": "ROQUE CONCEICAO MARTINS PROFESSOR",
    "director": "RONALD FRANCA",
    "phone": "",
    "neighborhood": "",
    "cpf": "106.011.708-81",
    "rg": "21455984"
  },
  {
    "cie": "905331",
    "name": "ROSEMARY DE MELLO M PEREIRA PROFA",
    "director": "ERICA ALVES DA ROCHA",
    "phone": "",
    "neighborhood": "",
    "cpf": "160.087.128-38",
    "rg": "22404733"
  },
  {
    "cie": "922754",
    "name": "SARAH SALVESTRO PROFESSORA",
    "director": "ARLETE ALVES JACINTO",
    "phone": "",
    "neighborhood": "",
    "cpf": "020.746.038-86",
    "rg": "12627618"
  },
  {
    "cie": "16159",
    "name": "VERGUEIRO SENADOR",
    "director": "SANDRA SUSETE SANTIAGO STIEVANO",
    "phone": "",
    "neighborhood": "",
    "cpf": "173.583.758-07",
    "rg": "20022955"
  },
  {
    "cie": "41646",
    "name": "WALDEMAR DE FREITAS ROSA PROF",
    "director": "VANDA CRISTINA NUNES",
    "phone": "",
    "neighborhood": "",
    "cpf": "144.806.068-07",
    "rg": "20423159"
  },
  {
    "cie": "924885",
    "name": "WANDA COSTA DAHER PROFESSORA",
    "director": "JULIANA GONZAGA DA SILVA",
    "phone": "",
    "neighborhood": "",
    "cpf": "328.260.508-00",
    "rg": "41483647"
  },
  {
    "cie": "914605",
    "name": "WILSON RAMOS BRANDAO PROFESSOR",
    "director": "ANA  PAULA DOMINGUES ZACARDI",
    "phone": "",
    "neighborhood": "",
    "cpf": "214.703.948-98",
    "rg": "34074044"
  },
  {
    "cie": "903267",
    "name": "ZELIA DULCE DE CAMPOS MAIA PROFA",
    "director": "ANA CUSTODIA DE SA MUNIZ",
    "phone": "",
    "neighborhood": "",
    "cpf": "248.867.004-97",
    "rg": "23649369"
  }
];

function generateInitialSchedules() {
  return []; // Sistema limpo: sem agendamentos fictícios gerados automaticamente
}

class DataStore {
  constructor() {
    this.init();
  }

  init() {
    const existingAnalysts = this.getAnalysts();
    const seedAnalysts = (typeof window !== 'undefined' && window.HISTORICAL_SEED_DATA && window.HISTORICAL_SEED_DATA.analysts) ? window.HISTORICAL_SEED_DATA.analysts : (typeof SEED_ANALYSTS !== 'undefined' ? SEED_ANALYSTS : []);
    
    // Se a lista de analistas estiver vazia ou menor que os analistas da equipe (10 analistas), funde/repopula
    if (!existingAnalysts || existingAnalysts.length < (seedAnalysts.length || 10)) {
      const mergedMap = new Map();
      seedAnalysts.forEach(a => mergedMap.set(a.id, a));
      if (existingAnalysts) {
        existingAnalysts.forEach(a => mergedMap.set(a.id, { ...mergedMap.get(a.id), ...a }));
      }
      this.setAnalysts(Array.from(mergedMap.values()));
    }

    if (!localStorage.getItem(STORAGE_KEYS.SCHOOLS)) {
      this.setSchools(SEED_SCHOOLS);
    }
    const existingSchedules = this.getSchedules();
    if (!existingSchedules || existingSchedules.length === 0) {
      this.setSchedules(generateInitialSchedules());
    }
    if (!localStorage.getItem(STORAGE_KEYS.ABSENCES)) {
      const initAbsences = (typeof window !== 'undefined' && window.HISTORICAL_SEED_DATA && window.HISTORICAL_SEED_DATA.absences) ? window.HISTORICAL_SEED_DATA.absences : [];
      if (initAbsences.length > 0) {
        localStorage.setItem(STORAGE_KEYS.ABSENCES, JSON.stringify(initAbsences));
      }
    }
  }

  resetToDefault() {
    localStorage.removeItem(STORAGE_KEYS.ANALYSTS);
    localStorage.removeItem(STORAGE_KEYS.SCHOOLS);
    localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
    localStorage.removeItem(STORAGE_KEYS.QUEUE);
    this.init();
  }

  // --- ANALISTAS ---
  getAnalysts() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.ANALYSTS)) || [];
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
    } catch {
      return [];
    }
  }

  setAnalysts(analysts) {
    localStorage.setItem(STORAGE_KEYS.ANALYSTS, JSON.stringify(analysts));
  }

  getAnalystById(id) {
    return this.getAnalysts().find(a => a.id === id);
  }

  saveAnalyst(analyst) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveAnalyst(analyst);
    const list = this.getAnalysts();
    const idx = list.findIndex(a => a.id === analyst.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...analyst };
    } else {
      list.push(analyst);
    }
    this.setAnalysts(list);
  }

  deleteAnalyst(id) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.deleteAnalyst(id);
    const list = this.getAnalysts().filter(a => a.id !== id);
    this.setAnalysts(list);
  }

  // --- ESCOLAS ---
  getSchools() {
    try {
      const list = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHOOLS)) || [];
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }));
    } catch {
      return [];
    }
  }

  setSchools(schools) {
    localStorage.setItem(STORAGE_KEYS.SCHOOLS, JSON.stringify(schools));
  }

  getSchoolByCie(cie) {
    return this.getSchools().find(s => String(s.cie).trim() === String(cie).trim());
  }

  saveSchool(school) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveSchool(school);
    const list = this.getSchools();
    const idx = list.findIndex(s => String(s.cie).trim() === String(school.cie).trim());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...school };
    } else {
      list.push(school);
    }
    this.setSchools(list);
  }

  deleteSchool(cie) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.deleteSchool(cie);
    const list = this.getSchools().filter(s => String(s.cie).trim() !== String(cie).trim());
    this.setSchools(list);
  }

  // --- AGENDAMENTOS ---
  deduplicateSchedules(schedules) {
    if (!Array.isArray(schedules) || schedules.length === 0) return [];
    // Retorna todos os agendamentos cadastrados preservando retornos e ordens com mesma O.S.
    return schedules;
  }
  getSchedules() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCHEDULES)) || [];
      return this.deduplicateSchedules(raw);
    } catch {
      return [];
    }
  }

  setSchedules(schedules) {
    const cleanList = this.deduplicateSchedules(schedules);
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(cleanList));
  }

  saveSchedule(sched) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveSchedule(sched);
    const list = this.getSchedules();
    const idx = list.findIndex(s => s.id === sched.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...sched };
    } else {
      list.unshift(sched);
    }
    this.setSchedules(list);
  }

  deleteSchedule(id) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.deleteSchedule(id);
    const list = this.getSchedules().filter(s => String(s.id).trim() !== String(id).trim());
    this.setSchedules(list);
  }

  clearAllSchedules() {
    this.setSchedules([]);
  }

  toggleScheduleCompleted(id) {
    const list = this.getSchedules();
    const item = list.find(s => String(s.id).trim() === String(id).trim());
    if (item) {
      item.completed = !item.completed;
      this.setSchedules(list);
      if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveSchedule(item);
      return item.completed;
    }
    return false;
  }

  // --- FILAS DE VISITA ---
  getQueue() {
    try {
      const q = localStorage.getItem(STORAGE_KEYS.QUEUE);
      if (!q) {
        const seed = this.getInitialQueueSeed();
        this.setQueue(seed);
        return seed;
      }
      return JSON.parse(q) || [];
    } catch {
      return [];
    }
  }

  setQueue(queue) {
    localStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
  }

// ==========================================
  // AUSÊNCIAS DOS ANALISTAS (DAY OFF, ATESTADO, ETC)
  // ==========================================
  getAbsences() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ABSENCES)) || [];
    } catch {
      return [];
    }
  }

  saveAbsences(list) {
    try {
      localStorage.setItem(STORAGE_KEYS.ABSENCES, JSON.stringify(list));
    } catch (e) {
      console.error('Erro ao salvar ausências:', e);
    }
  }

  getAbsence(analystId, dateStr) {
    const list = this.getAbsences();
    const existing = list.find(a => String(a.analystId).trim() === String(analystId).trim() && a.date === dateStr);
    if (existing) {
      return existing;
    }
    // Se o analista for Pleno, o status padrão diário é automaticamente 'fixo_ure'
    const analyst = this.getAnalystById(analystId);
    if (analyst && (analyst.role || '').toLowerCase().includes('pleno')) {
      return {
        id: `${analystId}_${dateStr}`,
        analystId,
        date: dateStr,
        reason: 'fixo_ure',
        note: '',
        isDefaultPleno: true
      };
    }
    return null;
  }

  setAbsence(analystId, dateStr, reason, note = '') {
    if (typeof FirestoreSync !== 'undefined' && FirestoreSync.saveAbsence) {
      FirestoreSync.saveAbsence({ id: `${analystId}_${dateStr}`, analystId, date: dateStr, reason, note, updatedAt: Date.now() });
    }
    const list = this.getAbsences();
    const idx = list.findIndex(a => String(a.analystId).trim() === String(analystId).trim() && a.date === dateStr);
    const item = { id: `${analystId}_${dateStr}`, analystId, date: dateStr, reason, note, updatedAt: Date.now() };
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.push(item);
    }
    this.saveAbsences(list);
    return item;
  }

  removeAbsence(analystId, dateStr) {
    if (typeof FirestoreSync !== 'undefined' && FirestoreSync.deleteAbsence) {
      FirestoreSync.deleteAbsence(`${analystId}_${dateStr}`);
    }
    const list = this.getAbsences().filter(a => !(String(a.analystId).trim() === String(analystId).trim() && a.date === dateStr));
    this.saveAbsences(list);
  }

    // ==========================================
  // ATENDIMENTOS URE (INTERNO)
  // ==========================================
  getUreAttendances() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.URE_ATTENDANCES)) || [];
    } catch (e) {
      return [];
    }
  }

  saveUreAttendances(list) {
    try {
      localStorage.setItem(STORAGE_KEYS.URE_ATTENDANCES, JSON.stringify(list));
    } catch (e) {
      console.error('Erro ao salvar atendimentos URE:', e);
    }
  }

  saveUreAttendance(attendance) {
    if (typeof FirestoreSync !== 'undefined' && FirestoreSync.saveUreAttendance) {
      FirestoreSync.saveUreAttendance(attendance);
    }
    const list = this.getUreAttendances();
    if (!attendance.id) {
      attendance.id = 'ure_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    }
    if (!attendance.createdAt) {
      attendance.createdAt = Date.now();
    }
    const idx = list.findIndex(a => String(a.id).trim() === String(attendance.id).trim());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...attendance };
    } else {
      list.unshift(attendance);
    }
    this.saveUreAttendances(list);
    return attendance;
  }

  deleteUreAttendance(id) {
    if (typeof FirestoreSync !== 'undefined' && FirestoreSync.deleteUreAttendance) {
      FirestoreSync.deleteUreAttendance(id);
    }
    const list = this.getUreAttendances().filter(a => String(a.id).trim() !== String(id).trim());
    this.saveUreAttendances(list);
  }

  getQueueItemById(id) {
    return this.getQueue().find(q => String(q.id).trim() === String(id).trim());
  }

  saveQueueItem(item) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveQueueItem(item);
    const list = this.getQueue();
    const now = Date.now();
    if (!item.createdAt) {
      item.createdAt = now;
    }

    const idx = list.findIndex(q => String(q.id).trim() === String(item.id).trim());
    if (idx >= 0) {
      const oldItem = list[idx];
      item.createdAt = oldItem.createdAt || item.createdAt;
      // Se foi alterada para urgente agora, registra o momento da urgência
      if (item.priority === 'urgente') {
        item.urgentSince = oldItem.urgentSince || now;
      }
      list[idx] = { ...list[idx], ...item };
    } else {
      // Nova escola colocada na fila
      if (item.priority === 'urgente') {
        item.urgentSince = now;
      }
      list.push(item);
    }
    this.setQueue(list);
  }

  deleteQueueItem(id) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.deleteQueueItem(id);
    const list = this.getQueue().filter(q => String(q.id).trim() !== String(id).trim());
    this.setQueue(list);
  }

  getInitialQueueSeed() {
    return []; // Fila inicial limpa sem registros fictícios
  }

  // --- MODELO DE MENSAGEM DO WHATSAPP ---
  getDefaultWhatsappTemplate() {
    return `*SG - SISTEMA DE GESTÃO DE AGENDAS*
Olá *{analista}*, segue sua ordem de atendimento:

*O.S.:* {os}
*Data:* {data}
*Escola:* {escola}
*CIE:* {cie}
*Diretor(a):* {diretor}
*Assunto:* {assunto}
*Observações:* {obs}

_Por favor, confirme o recebimento e anexe a ordem concluída._`;
  }

  getWhatsappTemplate() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.WHATSAPP_TEMPLATE);
      return saved ? saved : this.getDefaultWhatsappTemplate();
    } catch {
      return this.getDefaultWhatsappTemplate();
    }
  }

  setWhatsappTemplate(template) {
    if (typeof FirestoreSync !== 'undefined') FirestoreSync.saveWhatsappTemplate(template);
    try {
      localStorage.setItem(STORAGE_KEYS.WHATSAPP_TEMPLATE, template);
    } catch (e) {
      console.error(e);
    }
  }

}

const store = new DataStore();

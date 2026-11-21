export const CATEGORIES = [
  'Dolor y fiebre',
  'Antiinflamatorio',
  'Antibióticos',
  'Digestivo',
  'Cardiovascular',
  'Colesterol',
  'Diabetes',
  'Tiroides',
  'Salud mental',
  'Alergias',
  'Respiratorio',
  'Vitaminas',
  'Cuidado'
];

const solid = /comprimid|comp\b|tablet|tab\b|gragea|recubiert/;
const caps = /capsul|cap\b|gragea/;

export const MEDS = [
  {
    id: 'paracetamol-500',
    name: 'Paracetamol',
    strength: '500 mg',
    form: 'Comprimidos',
    category: 'Dolor y fiebre',
    pack: 16,
    packUnit: 'comprimidos',
    popular: true,
    query: 'paracetamol 500',
    aliases: ['tapsin', 'geniol', 'paracetamol', 'dolor', 'fiebre'],
    rules: {
      include: [/paracetamol/],
      exclude: [/pseudoefedrina|clorfenamina|cafeina|tramadol|codeina|propifenazona|metamizol|diclofenaco|ibuprofeno|jarabe|gotas|supositorio/],
      dose: [/\b500\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'paracetamol-1000',
    name: 'Paracetamol',
    strength: '1 g',
    form: 'Comprimidos',
    category: 'Dolor y fiebre',
    pack: 10,
    packUnit: 'comprimidos',
    popular: false,
    query: 'paracetamol 1 g',
    aliases: ['paracetamol 1g', 'tapsin', 'dolor', 'fiebre'],
    rules: {
      include: [/paracetamol/],
      exclude: [/pseudoefedrina|clorfenamina|cafeina|tramadol|codeina|propifenazona|metamizol|diclofenaco|ibuprofeno|jarabe|gotas|supositorio|500\s*(?:mg|miligramos?)/],
      dose: [/\b1\s*(?:g|gr|gramo)\b/],
      forms: [solid]
    }
  },
  {
    id: 'ibuprofeno-400',
    name: 'Ibuprofeno',
    strength: '400 mg',
    form: 'Comprimidos',
    category: 'Dolor y fiebre',
    pack: 20,
    packUnit: 'comprimidos',
    popular: true,
    query: 'ibuprofeno 400',
    aliases: ['ibupirac', 'ibuprofeno', 'antiinflamatorio', 'dolor'],
    rules: {
      include: [/ibuprofeno/],
      exclude: [/paracetamol|codeina|pseudoefedrina|jarabe|gotas|suspension|pediatrico/],
      dose: [/\b400\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'ibuprofeno-600',
    name: 'Ibuprofeno',
    strength: '600 mg',
    form: 'Comprimidos',
    category: 'Dolor y fiebre',
    pack: 10,
    packUnit: 'comprimidos',
    popular: false,
    query: 'ibuprofeno 600',
    aliases: ['ibupirac', 'ibuprofeno', 'dolor'],
    rules: {
      include: [/ibuprofeno/],
      exclude: [/paracetamol|codeina|pseudoefedrina|jarabe|gotas|suspension|pediatrico/],
      dose: [/\b600\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'aspirina-100',
    name: 'Ácido acetilsalicílico',
    strength: '100 mg',
    form: 'Comprimidos',
    category: 'Cardiovascular',
    pack: 28,
    packUnit: 'comprimidos',
    popular: false,
    query: 'aspirina 100',
    aliases: ['aspirina', 'aas', 'cartia', 'antiagregante'],
    rules: {
      include: [/aspirina|acetilsalicilico|aas\b/],
      exclude: [/500\s*mg|paracetamol|cafeina|codeina/],
      dose: [/\b100\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'naproxeno-550',
    name: 'Naproxeno',
    strength: '550 mg',
    form: 'Comprimidos',
    category: 'Dolor y fiebre',
    pack: 10,
    packUnit: 'comprimidos',
    popular: false,
    query: 'naproxeno 550',
    aliases: ['naproxeno', 'dolor', 'antiinflamatorio'],
    rules: {
      include: [/naproxeno/],
      exclude: [/sodico.*275|paracetamol|esomeprazol|jarabe/],
      dose: [/\b550\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'diclofenaco-gel',
    name: 'Diclofenaco gel',
    strength: '1%',
    form: 'Gel 60 g',
    category: 'Antiinflamatorio',
    pack: 60,
    packUnit: 'g',
    popular: true,
    query: 'diclofenaco gel 1%',
    aliases: [
      'voltaren',
      'diclofenaco',
      'diclofenaco de sodio',
      'diclofenaco sodico',
      'gel',
      'dolor muscular'
    ],
    rules: {
      include: [/diclofenaco/],
      brands: ['lertus'],
      exclude: [/comprimid|inyectable|supositorio|gotas|parche/],
      dose: [/\b1(?:[.,]16)?\s*%/],
      forms: [/gel/]
    }
  },
  {
    id: 'diclofenaco-50',
    name: 'Diclofenaco',
    strength: '50 mg',
    form: 'Comprimidos',
    category: 'Antiinflamatorio',
    pack: 20,
    packUnit: 'comprimidos',
    popular: false,
    query: 'diclofenaco 50',
    aliases: [
      'diclofenaco de sodio',
      'diclofenaco sodico',
      'diclofenaco',
      'lertus',
      'antiinflamatorio',
      'dolor'
    ],
    rules: {
      include: [/diclofenaco|diclofenac/],
      brands: ['lertus'],
      exclude: [/gel|crema|emulgel|inyect|supositor|parche|gotas|solucion|topico|spray|1(?:[.,]16)?\s*%/],
      dose: [/\b50\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'amoxicilina-500',
    name: 'Amoxicilina',
    strength: '500 mg',
    form: 'Cápsulas',
    category: 'Antibióticos',
    pack: 21,
    packUnit: 'cápsulas',
    popular: false,
    query: 'amoxicilina 500',
    aliases: ['amoxicilina', 'antibiotico'],
    rules: {
      include: [/amoxicilina/],
      exclude: [/clavulanico|suspension|jarabe|polvo/],
      dose: [/\b500\s*(?:mg|miligramos?)\b/],
      forms: [caps, solid]
    }
  },
  {
    id: 'amoxicilina-clavulanico',
    name: 'Amoxicilina + ác. clavulánico',
    strength: '875 / 125 mg',
    form: 'Comprimidos',
    category: 'Antibióticos',
    pack: 14,
    packUnit: 'comprimidos',
    popular: false,
    query: 'amoxicilina clavulanico 875',
    aliases: ['clavulin', 'amoxicilina', 'clavulanico', 'antibiotico'],
    rules: {
      include: [/amoxicilina/, /clavulanico/],
      exclude: [/suspension|jarabe|polvo|500\s*(?:mg|\/)/],
      dose: [/\b875\s*(?:\/|y)?\s*125\b/],
      forms: [solid]
    }
  },
  {
    id: 'azitromicina-500',
    name: 'Azitromicina',
    strength: '500 mg',
    form: 'Comprimidos',
    category: 'Antibióticos',
    pack: 3,
    packUnit: 'comprimidos',
    popular: false,
    query: 'azitromicina 500',
    aliases: ['azitromicina', 'antibiotico'],
    rules: {
      include: [/azitromicina/],
      exclude: [/suspension|jarabe|polvo|200\s*mg/],
      dose: [/\b500\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'cefalexina-500',
    name: 'Cefalexina',
    strength: '500 mg',
    form: 'Cápsulas',
    category: 'Antibióticos',
    pack: 20,
    packUnit: 'cápsulas',
    popular: false,
    query: 'cefalexina 500',
    aliases: ['cefalexina', 'antibiotico'],
    rules: {
      include: [/cefalexina/],
      exclude: [/suspension|jarabe|polvo/],
      dose: [/\b500\s*(?:mg|miligramos?)\b/],
      forms: [caps, solid]
    }
  },
  {
    id: 'metronidazol-500',
    name: 'Metronidazol',
    strength: '500 mg',
    form: 'Comprimidos',
    category: 'Antibióticos',
    pack: 20,
    packUnit: 'comprimidos',
    popular: false,
    query: 'metronidazol 500',
    aliases: ['metronidazol', 'antibiotico'],
    rules: {
      include: [/metronidazol/],
      exclude: [/ovulo|crema|gel|suspension/],
      dose: [/\b500\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'fluconazol-150',
    name: 'Fluconazol',
    strength: '150 mg',
    form: 'Cápsulas',
    category: 'Antibióticos',
    pack: 2,
    packUnit: 'cápsulas',
    popular: false,
    query: 'fluconazol 150',
    aliases: ['fluconazol', 'hongos'],
    rules: {
      include: [/fluconazol/],
      exclude: [/crema|ovulo|locion|200\s*mg/],
      dose: [/\b150\s*(?:mg|miligramos?)\b/],
      forms: [caps, solid]
    }
  },
  {
    id: 'omeprazol-20',
    name: 'Omeprazol',
    strength: '20 mg',
    form: 'Cápsulas',
    category: 'Digestivo',
    pack: 28,
    packUnit: 'cápsulas',
    popular: true,
    query: 'omeprazol 20',
    aliases: ['losec', 'omeprazol', 'estomago', 'reflujo'],
    rules: {
      include: [/omeprazol/],
      exclude: [/40\s*mg|suspension|jarabe|polvo|capsula.*10\s*mg/],
      dose: [/\b20\s*(?:mg|miligramos?)\b/],
      forms: [caps, solid]
    }
  },
  {
    id: 'pantoprazol-40',
    name: 'Pantoprazol',
    strength: '40 mg',
    form: 'Comprimidos',
    category: 'Digestivo',
    pack: 28,
    packUnit: 'comprimidos',
    popular: false,
    query: 'pantoprazol 40',
    aliases: ['pantoprazol', 'estomago', 'reflujo'],
    rules: {
      include: [/pantoprazol/],
      brands: ['pantocal', 'pantab'],
      exclude: [/20\s*mg|suspension|inyectable/],
      dose: [/\b40\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'losartan-50',
    name: 'Losartán',
    strength: '50 mg',
    form: 'Comprimidos',
    category: 'Cardiovascular',
    pack: 30,
    packUnit: 'comprimidos',
    popular: true,
    query: 'losartan 50',
    aliases: ['cozaar', 'losartan', 'presion'],
    rules: {
      include: [/losartan/],
      exclude: [/100\s*mg|diuretico|hidroclorotiazida/],
      dose: [/\b50\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'enalapril-10',
    name: 'Enalapril',
    strength: '10 mg',
    form: 'Comprimidos',
    category: 'Cardiovascular',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'enalapril 10',
    aliases: ['enalapril', 'presion'],
    rules: {
      include: [/enalapril/],
      exclude: [/5\s*mg|20\s*mg|hidroclorotiazida/],
      dose: [/\b10\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'valsartan-160',
    name: 'Valsartán',
    strength: '160 mg',
    form: 'Comprimidos',
    category: 'Cardiovascular',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'valsartan 160',
    aliases: ['valsartan', 'presion'],
    rules: {
      include: [/valsartan/],
      exclude: [/80\s*mg|320\s*mg|hidroclorotiazida/],
      dose: [/\b160\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'carvedilol-6',
    name: 'Carvedilol',
    strength: '6,25 mg',
    form: 'Comprimidos',
    category: 'Cardiovascular',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'carvedilol 6.25',
    aliases: ['carvedilol', 'corazon', 'presion'],
    rules: {
      include: [/carvedilol/],
      brands: ['betaplex', 'cilokare'],
      exclude: [/(?<![\d.,])12[.,]5\b|(?<![\d.,])25\s*mg\b/],
      dose: [/\b6[.,]25\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'furosemida-40',
    name: 'Furosemida',
    strength: '40 mg',
    form: 'Comprimidos',
    category: 'Cardiovascular',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'furosemida 40',
    aliases: ['furosemida', 'diuretico'],
    rules: {
      include: [/furosemida/],
      exclude: [/20\s*mg|inyectable/],
      dose: [/\b40\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'atorvastatina-20',
    name: 'Atorvastatina',
    strength: '20 mg',
    form: 'Comprimidos',
    category: 'Colesterol',
    pack: 30,
    packUnit: 'comprimidos',
    popular: true,
    query: 'atorvastatina 20',
    aliases: ['lipitor', 'atorvastatina', 'colesterol'],
    rules: {
      include: [/atorvastatina/],
      exclude: [/10\s*mg|40\s*mg|80\s*mg/],
      dose: [/\b20\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'rosuvastatina-10',
    name: 'Rosuvastatina',
    strength: '10 mg',
    form: 'Comprimidos',
    category: 'Colesterol',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'rosuvastatina 10',
    aliases: ['rosuvastatina', 'colesterol'],
    rules: {
      include: [/rosuvastatina/],
      exclude: [/5\s*mg|20\s*mg|40\s*mg/],
      dose: [/\b10\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'metformina-850',
    name: 'Metformina',
    strength: '850 mg',
    form: 'Comprimidos',
    category: 'Diabetes',
    pack: 30,
    packUnit: 'comprimidos',
    popular: true,
    query: 'metformina 850',
    aliases: ['glifage', 'metformina', 'diabetes', 'azucar'],
    rules: {
      include: [/metformina/],
      exclude: [/500\s*mg|1000\s*mg|1\s*g|sustancia liberacion/],
      dose: [/\b850\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'gliclazida-30',
    name: 'Gliclazida',
    strength: '30 mg',
    form: 'Comprimidos',
    category: 'Diabetes',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'gliclazida 30',
    aliases: ['gliclazida', 'diabetes'],
    rules: {
      include: [/gliclazida/],
      exclude: [/60\s*mg|80\s*mg/],
      dose: [/\b30\s*(?:mg|miligramos?)\b/],
      forms: [/comprimid|tablet|liberacion|recubiert/]
    }
  },
  {
    id: 'gliclazida-60',
    name: 'Gliclazida',
    strength: '60 mg',
    form: 'Comprimidos LP',
    category: 'Diabetes',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'gliclazida 60',
    aliases: ['gliclazida', 'diamicron', 'glikem', 'diabetes'],
    rules: {
      include: [/gliclazida/],
      brands: ['glikem', 'diamicron'],
      exclude: [/\b30\s*mg\b/],
      dose: [/\b60\s*(?:mg|miligramos?)\b/],
      forms: [/comprimid|tablet|liberacion|recubiert/]
    }
  },
  {
    id: 'levotiroxina-50',
    name: 'Levotiroxina',
    strength: '50 mcg',
    form: 'Comprimidos',
    category: 'Tiroides',
    pack: 50,
    packUnit: 'comprimidos',
    popular: true,
    query: 'levotiroxina 50',
    aliases: ['eutirox', 'levotiroxina', 'tiroides'],
    rules: {
      include: [/levotiroxina/],
      exclude: [/100\s*(?:mcg|ug|µg)|25\s*(?:mcg|ug|µg)|75\s*(?:mcg|ug|µg)/],
      dose: [/\b50\s*(?:mcg|ug|µg|microgramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'sertralina-50',
    name: 'Sertralina',
    strength: '50 mg',
    form: 'Comprimidos',
    category: 'Salud mental',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'sertralina 50',
    aliases: ['sertralina', 'animo', 'depresion'],
    rules: {
      include: [/sertralina/],
      exclude: [/100\s*mg|25\s*mg/],
      dose: [/\b50\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'escitalopram-10',
    name: 'Escitalopram',
    strength: '10 mg',
    form: 'Comprimidos',
    category: 'Salud mental',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'escitalopram 10',
    aliases: ['escitalopram', 'animo', 'ansiedad'],
    rules: {
      include: [/escitalopram/],
      exclude: [/5\s*mg|20\s*mg/],
      dose: [/\b10\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'loratadina-10',
    name: 'Loratadina',
    strength: '10 mg',
    form: 'Comprimidos',
    category: 'Alergias',
    pack: 10,
    packUnit: 'comprimidos',
    popular: true,
    query: 'loratadina 10',
    aliases: ['clarityne', 'loratadina', 'alergia'],
    rules: {
      include: [/loratadina/],
      exclude: [/jarabe|solucion|5\s*mg|pseudoefedrina/],
      dose: [/\b10\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'cetirizina-10',
    name: 'Cetirizina',
    strength: '10 mg',
    form: 'Comprimidos',
    category: 'Alergias',
    pack: 10,
    packUnit: 'comprimidos',
    popular: false,
    query: 'cetirizina 10',
    aliases: ['cetirizina', 'alergia'],
    rules: {
      include: [/cetirizina/],
      exclude: [/jarabe|solucion|gotas|5\s*mg/],
      dose: [/\b10\s*(?:mg|miligramos?)\b/],
      forms: [solid]
    }
  },
  {
    id: 'salbutamol-aerosol',
    name: 'Salbutamol',
    strength: '100 mcg',
    form: 'Inhalador',
    category: 'Respiratorio',
    pack: 200,
    packUnit: 'dosis',
    popular: false,
    query: 'salbutamol aerosol 100',
    aliases: ['aerolin', 'ventolin', 'salbutamol', 'asma'],
    rules: {
      include: [/salbutamol/],
      exclude: [/jarabe|solucion.*oral|nebulizar|comprimid|sulfato.*tableta/],
      dose: [/\b100\s*(?:mcg|ug|µg|microgramos?)\b/],
      forms: [/aerosol|inhalador|inhalacion/]
    }
  },
  {
    id: 'budesonida-aerosol',
    name: 'Budesonida',
    strength: '200 mcg',
    form: 'Inhalador',
    category: 'Respiratorio',
    pack: 200,
    packUnit: 'dosis',
    popular: false,
    query: 'budesonida aerosol 200',
    aliases: ['budesonida', 'pulmicort', 'asma'],
    rules: {
      include: [/budesonida/],
      exclude: [/jarabe|solucion.*oral|nebulizar|comprimid|100\s*(?:mcg|ug|µg)/],
      dose: [/\b200\s*(?:mcg|ug|µg|microgramos?)\b/],
      forms: [/aerosol|inhalador|inhalacion/]
    }
  },
  {
    id: 'vitamina-d-1000',
    name: 'Vitamina D',
    strength: '1000 UI',
    form: 'Comprimidos',
    category: 'Vitaminas',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'vitamina d 1000',
    aliases: ['vitamina d', 'colecalciferol', 'vitamina'],
    rules: {
      include: [/vitamina\s*d|colecalciferol/],
      exclude: [/gotas|solucion|5000|50000|2000/],
      dose: [/\b(?:1000|1[.,]000)\s*(?:ui|iu)\b/],
      forms: [solid, caps]
    }
  },
  {
    id: 'vitamina-d-800',
    name: 'Vitamina D',
    strength: '800 UI',
    form: 'Comprimidos',
    category: 'Vitaminas',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'vitamina d 800',
    aliases: ['vitamina d', 'vitde', 'd3', 'vitamina'],
    rules: {
      include: [/vitamina\s*d|colecalciferol/],
      brands: ['vitde'],
      exclude: [/gotas|solucion|1000|5000|50000|2000/],
      dose: [/\b800\s*(?:ui|iu)\b/],
      forms: [solid, caps]
    }
  },
  {
    id: 'complejo-b',
    name: 'Complejo B',
    strength: 'Comprimidos',
    form: 'Comprimidos',
    category: 'Vitaminas',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'complejo b',
    aliases: ['complejo b', 'vitamina b', 'neurubion'],
    rules: {
      include: [/complejo\s*b|vitamina\s*b/],
      exclude: [/inyectable|solucion inyectable|jarabe/],
      dose: [],
      forms: [solid, caps]
    }
  },
  {
    id: 'hierro-100',
    name: 'Hierro',
    strength: '100 mg',
    form: 'Comprimidos',
    category: 'Vitaminas',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'hierro 100',
    aliases: ['hierro', 'ferroso', 'anemia'],
    rules: {
      include: [/hierro|ferroso|fumarato ferroso|sulfato ferroso/],
      brands: ['eritrofer', 'maltofer', 'hemoval'],
      exclude: [/jarabe|gotas|suspension|inyectable/],
      dose: [/\b100\s*(?:mg|miligramos?)\b/],
      forms: [solid, caps]
    }
  },
  {
    id: 'suero-oral',
    name: 'Suero oral',
    strength: '500 ml',
    form: 'Solución',
    category: 'Digestivo',
    pack: 500,
    packUnit: 'ml',
    popular: false,
    query: 'suero oral 500',
    aliases: ['suero oral', 'rehidratante', 'deshidratacion'],
    rules: {
      include: [/suero/],
      exclude: [/inyectable|fisiologico.*inyect|nasal|oftalmico/],
      dose: [/\b500\s*(?:ml|cc)\b/],
      forms: [/solucion|oral|bebible|polvo|sobre/]
    }
  },
  {
    id: 'melatonina-3',
    name: 'Melatonina',
    strength: '3 mg',
    form: 'Comprimidos',
    category: 'Vitaminas',
    pack: 30,
    packUnit: 'comprimidos',
    popular: false,
    query: 'melatonina 3',
    aliases: ['melatonina', 'dormir', 'sueno'],
    rules: {
      include: [/melatonina/],
      exclude: [/gotas|5\s*mg|1\s*mg|jarabe/],
      dose: [/\b3\s*(?:mg|miligramos?)\b/],
      forms: [solid, caps, /gummy|goma/]
    }
  }
];

const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9%.,/\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export function medById(id) {
  return MEDS.find((med) => med.id === id) || null;
}

export function medLabel(med) {
  return `${med.name} ${med.strength} · ${med.form}`;
}

export function medPackLabel(med) {
  return `${med.pack} ${med.packUnit}`;
}

const SEARCH_FILLERS = new Set([
  'de',
  'del',
  'la',
  'el',
  'los',
  'las',
  'con',
  'para',
  'por',
  'y',
  'o',
  'en',
  'sodio',
  'sodico',
  'sodica',
  'disodico',
  'potasico',
  'potasica',
  'calcico',
  'calcica',
  'hidrocloruro',
  'clorhidrato',
  'diclorhidrato',
  'hidrato',
  'monohidrato',
  'comprimidos',
  'comprimido',
  'tabletas',
  'tableta',
  'capsulas',
  'capsula'
]);

function scoreMeds(q, limit) {
  const scored = [];
  for (const med of MEDS) {
    const haystacks = [med.name, med.strength, med.form, med.category, ...med.aliases].map(normalize);
    let score = 0;
    if (normalize(med.name).startsWith(q)) score += 60;
    if (normalize(`${med.name} ${med.strength}`).includes(q)) score += 50;
    for (const h of haystacks) {
      if (h === q) score += 40;
      else if (h.includes(q)) score += 20;
    }
    if (q.split(' ').every((part) => haystacks.some((h) => h.includes(part)))) score += 15;
    const topical = /gel|crema|emulgel|topico|spray|locion/;
    if (!topical.test(q) && topical.test(normalize(med.form))) score -= 6;
    if (score > 0) scored.push({ med, score: score + (med.popular ? 3 : 0) });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.med.name.localeCompare(b.med.name))
    .slice(0, limit)
    .map((entry) => entry.med);
}

export function searchMeds(query, limit = 8) {
  const q = normalize(query);
  if (!q) {
    return MEDS.filter((med) => med.popular).slice(0, limit);
  }
  const direct = scoreMeds(q, limit);
  if (direct.length) return direct;

  const core = q.split(' ').filter((part) => part && !SEARCH_FILLERS.has(part));
  const simplified = core.join(' ').trim();
  if (simplified && simplified !== q) {
    return scoreMeds(simplified, limit);
  }
  return [];
}

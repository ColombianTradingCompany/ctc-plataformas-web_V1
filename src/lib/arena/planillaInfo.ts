// GENERADO por scripts/build-planilla-info.mjs a partir del catálogo INFO de la Coffee Datasheet Tool — NO editar a mano.
// V5.153 (owner, 2026-10-05): los botones «i» de la planilla de evaluación explican cada concepto con las MISMAS palabras que
// la herramienta (ES · EN), con la norma que lo respalda. Para cambiar un texto, cámbielo en la herramienta y regenere.

import type { IdiomaDePlanilla } from "./planillaI18n";

export type ClaveDeInfo =
  | "dif"
  | "prep"
  | "sesion"
  | "lotes"
  | "partes"
  | "tueste"
  | "rueda"
  | "sca_esc"
  | "sca_fragrance"
  | "sca_flavor"
  | "sca_aftertaste"
  | "sca_acidity"
  | "sca_body"
  | "sca_balance"
  | "sca_uniformity"
  | "sca_clean_cup"
  | "sca_sweetness"
  | "sca_cuppers"
  | "sca_def"
  | "sca_taint"
  | "sca_fault"
  | "cva_acidez"
  | "sca_punt"
  | "cva_dos"
  | "cva_int"
  | "cva_cata"
  | "cva_gustos"
  | "cva_textura"
  | "cva_aff"
  | "cva_notasA"
  | "cva_tazas"
  | "cva_punt"
  | "sec_fragrance"
  | "sec_aroma"
  | "sec_flavor"
  | "sec_aftertaste"
  | "sec_acidity"
  | "sec_sweetness"
  | "sec_mouthfeel"
  | "sec_overall"
  | "f_muestra"
  | "f_color"
  | "f_def"
  | "f_cls"
  | "f_mallas"
  | "perfil"
  | "f_hum"
  | "f_aw"
  | "f_dens"
  | "f_registro"
  | "f_factor_rep"
  | "f_factor"
  | "e_que"
  | "e_cultivo"
  | "e_proceso"
  | "e_comercio"
  | "e_certs"
  | "e_otro";

export type InfoDePlanilla = { titulo: string; texto: string; std: string };

export const INFO_PLANILLA: Record<IdiomaDePlanilla, Record<ClaveDeInfo, InfoDePlanilla>> = {
  "es": {
    "dif": {
      "titulo": "SCA 2004 y CVA no son lo mismo",
      "texto": "Las dos vienen de la Specialty Coffee Association, y por eso se confunden.\nSCA 2004 es el protocolo de catación clásico: diez atributos que se suman en un solo puntaje de 0 a 100. En ese número van mezcladas dos cosas: cómo es el café y qué tanto le gusta al catador.\nCVA (Coffee Value Assessment, estándares SCA 102 a 105, publicados en 2024 y 2025) reemplaza al protocolo de 2004 y separa cuatro evaluaciones: física (el grano verde), descriptiva (qué hay y cuánto, sin opinar), afectiva (qué tan alta es la impresión de calidad; es la única que produce puntaje) y extrínseca (lo que se sabe del café: origen, proceso, comercio, certificaciones).\nUn 84 del formulario 2004 y un 84 del CVA no son comparables: salen de escalas y fórmulas distintas. Por eso esta herramienta te hace elegir un método y lo deja escrito en cada pantalla y en la ficha.",
      "std": "SCA 102–105 · SCA 2004"
    },
    "prep": {
      "titulo": "Preparación de la muestra y mecánica de catación",
      "texto": "La preparación es la misma para los dos métodos en lo esencial; el estándar SCA 102 (2024) es el vigente.\n• Tueste: medio, de catación — lectura Agtron «Gourmet» 63 (L* 26–29). Reposo de 8 a 24 horas.\n• Dosis: 8,25 g de café por cada 150 mL de capacidad de la taza (± 0,2 g), cada taza pesada y molida por separado.\n• Molienda: 70–75 % pasa por malla 20 US (850 µm).\n• Agua: 93 ± 3 °C, hasta el borde.\n• Tazas: cinco por muestra para la afectiva y para el formulario 2004 (así se puede juzgar la uniformidad); de tres a cinco para la descriptiva.\n• Pasos: fragancia en seco → agua y aroma con la costra intacta → romper la costra a los 3–5 minutos → limpiar → probar desde unos 70 °C, al menos tres rondas mientras enfría.\n• Sesión: máximo 6 cafés.\nSi la muestra no está en tueste medio o hubo otra desviación, se informa a todas las partes.",
      "std": "SCA 102-2024"
    },
    "sesion": {
      "titulo": "Datos de la sesión",
      "texto": "Nombre, fecha y objetivo encabezan todos los formatos. El objetivo importa: en la evaluación afectiva el catador califica según su preferencia o según la de un mercado que conoce, y quien lea la ficha necesita saber cuál.\nPara evaluar con el CVA no hace falta un certificado: los estándares y formatos son abiertos. Si tu evaluación debe pesar ante compradores o concursos, la credencial que el gremio reconoce es la licencia Q Grader de la SCA; si tienes SCA ID o licencia, anótala aquí.",
      "std": "SCA 103 · 104 · 105"
    },
    "lotes": {
      "titulo": "Uno o varios lotes",
      "texto": "Cada lote es una muestra con su propio perfil, su granulometría y su parte extrínseca. Puedes entrar y salir de cada uno para catarlos en paralelo, como en la mesa: primero la fragancia de todos, luego el aroma, luego la boca.\nEl código es el número de muestra de los formatos: úsalo para catar a ciegas y deja el nombre para después. El estándar recomienda un máximo de 6 cafés por sesión.",
      "std": "SCA 102-2024 · 7.2"
    },
    "partes": {
      "titulo": "Las tres partes",
      "texto": "Puedes llenar una, dos o las tres: Perfil de sabores (la taza), Granulometría (el grano verde: defectos, humedad, tamaño) y Caracterización extrínseca (lo que se sabe del café). Una parte apagada no aparece ni en pantalla ni en la ficha; lo que ya tenía llenado no se borra.\nEl estándar pide mantener la información extrínseca separada de la evaluación sensorial para no sesgarla, y reunir todo en un solo expediente al final. Pueden hacerlas personas distintas.",
      "std": "SCA 105-2025 · 5.2"
    },
    "tueste": {
      "titulo": "Nivel de tueste",
      "texto": "Antes de catar se estima a la vista el nivel de tueste de la muestra y se anota. El de catación es medio: lectura Agtron «Gourmet» de 63. Un tueste distinto cambia la taza, así que se declara.\nSi quieres medirlo, el Disco Agtron del taller lo lee desde una foto.",
      "std": "SCA 102-2024 · 5.1 · SCA 103 · 6.1"
    },
    "rueda": {
      "titulo": "La rueda de sabores",
      "texto": "Tres anillos, de adentro hacia afuera: familia, subcategoría y descriptor. Cata primero en amplio («es frutal») y avanza hacia el borde para precisar («es una baya… es frambuesa»).\nEs la misma rueda de la Rueda del Café del taller y de la planilla del Centro de Calidad: una sola taxonomía, inspirada en la Coffee Taster's Flavor Wheel de la SCA y World Coffee Research.\nCon SCA 2004 las notas son libres. Con CVA, cada nota que toques marca la casilla CATA de su categoría en la lista que tengas activa (nariz o boca) y queda escrita como descriptor.",
      "std": "SCA/WCR Flavor Wheel · SCA 103 · 5.1"
    },
    "sca_esc": {
      "titulo": "La escala de 6 a 10",
      "texto": "Los siete atributos con escala se califican de 6,00 a 10,00 en pasos de 0,25: 6 = bueno, 7 = muy bueno, 8 = excelente, 9 = sobresaliente. Por debajo de 6 el café no es de especialidad y el formulario no baja más.\nAquí la calificación es de calidad: describes y juzgas en el mismo número. Es la diferencia de fondo con el CVA, que separa las dos cosas.",
      "std": "SCA 2004"
    },
    "sca_fragrance": {
      "titulo": "Fragancia / Aroma",
      "texto": "Un solo atributo en el formulario 2004. Se evalúa en tres momentos: el olor del café molido en seco (fragancia), el de la costra al romperla y el de la bebida mientras reposa (aroma).\nEn el CVA son dos secciones separadas.",
      "std": "SCA 2004"
    },
    "sca_flavor": {
      "titulo": "Sabor",
      "texto": "La impresión principal del café en la boca: la suma del gusto y del aroma retronasal, entre la primera impresión y el sabor residual. Se califica su intensidad, calidad y complejidad.",
      "std": "SCA 2004"
    },
    "sca_aftertaste": {
      "titulo": "Sabor residual",
      "texto": "Lo que queda en el paladar después de expulsar o tragar el café, y cuánto dura. Un sabor residual corto o desagradable baja la calificación.",
      "std": "SCA 2004"
    },
    "sca_acidity": {
      "titulo": "Acidez",
      "texto": "Se califica la calidad de la acidez —brillante cuando es favorable, agria cuando no—, no cuánta hay. Su intensidad (alta, media, baja) se anota aparte y no suma ni resta: una acidez alta puede ser lo esperado en un origen y un exceso en otro.",
      "std": "SCA 2004"
    },
    "sca_body": {
      "titulo": "Cuerpo",
      "texto": "La sensación táctil del líquido en la boca, sobre todo entre la lengua y el paladar. Se califica su calidad; el nivel (pesado, medio, ligero) se anota aparte y no suma ni resta: un cuerpo ligero puede ser tan bueno como uno pesado.\nEn el CVA esta sección se llama «sensación en boca» y abarca también la textura y la astringencia.",
      "std": "SCA 2004"
    },
    "sca_balance": {
      "titulo": "Balance",
      "texto": "Cómo se complementan o contrastan el sabor, el sabor residual, la acidez y el cuerpo. Si a la muestra le falta alguno o uno domina a los demás, el balance baja.\nEl CVA no tiene esta casilla: el balance entra en la impresión global.",
      "std": "SCA 2004"
    },
    "sca_uniformity": {
      "titulo": "Uniformidad",
      "texto": "Consistencia del sabor entre las cinco tazas de la muestra. Cada taza igual a las demás vale 2 puntos; la que sabe distinto pierde los suyos.",
      "std": "SCA 2004"
    },
    "sca_clean_cup": {
      "titulo": "Taza limpia",
      "texto": "Ausencia de impresiones negativas desde el primer sorbo hasta el sabor residual. 2 puntos por cada taza limpia; cualquier sabor o aroma ajeno al café descalifica la taza.",
      "std": "SCA 2004"
    },
    "sca_sweetness": {
      "titulo": "Dulzor",
      "texto": "La plenitud agradable del sabor que dan ciertos carbohidratos; lo contrario es una taza agria, astringente o «verde». 2 puntos por cada taza que lo muestra.\nEn el CVA el dulzor tiene escala propia de intensidad y de impresión de calidad.",
      "std": "SCA 2004"
    },
    "sca_cuppers": {
      "titulo": "Puntaje del catador",
      "texto": "La valoración integral y personal de la muestra: lo que el catador piensa del conjunto. Es el único atributo abiertamente subjetivo del formulario 2004.",
      "std": "SCA 2004"
    },
    "sca_def": {
      "titulo": "Defectos de taza",
      "texto": "Sabores negativos que restan calidad. Leve (taint): se nota, pero no domina; suele estar en lo aromático — 2 puntos por taza. Grave (fault): domina o hace la taza desagradable — 4 puntos por taza.\nSe multiplica la intensidad por el número de tazas afectadas y el resultado se resta de la suma de los diez atributos.",
      "std": "SCA 2004"
    },
    "sca_taint": {
      "titulo": "Defecto leve · taint",
      "texto": "Un sabor o un olor ajeno que se nota pero no domina la taza; suele estar en lo aromático.\nResta 2 puntos por cada taza que lo tenga. Marca la taza y di cuál es el defecto.",
      "std": "SCA 2004"
    },
    "sca_fault": {
      "titulo": "Defecto grave · fault",
      "texto": "Un sabor ajeno que domina la taza o la vuelve desagradable; suele estar en el gusto.\nResta 4 puntos por cada taza que lo tenga. Marca la taza y di cuál es el defecto.",
      "std": "SCA 2004"
    },
    "cva_acidez": {
      "titulo": "Tipo de acidez",
      "texto": "El formato descriptivo pide elegir una: seca —herbal, a pasto, agria— o dulce —jugosa, frutal, brillante—.\nDescribe el carácter de la acidez; su fuerza va en la escala de 0 a 15. No entra en el puntaje.",
      "std": "SCA 103"
    },
    "sca_punt": {
      "titulo": "El puntaje SCA 2004",
      "texto": "Puntaje final = suma de los diez atributos − defectos.\nLectura del total: 90–100 sobresaliente · 85–89,99 excelente · 80–84,99 muy bueno · menos de 80, por debajo de la calidad de especialidad.\nNo hay puntaje hasta que los diez atributos están calificados: una suma a medias no es un puntaje.",
      "std": "SCA 2004"
    },
    "cva_dos": {
      "titulo": "Dos columnas, dos preguntas",
      "texto": "Cada sección de la taza se responde dos veces, y las respuestas no se copian una de otra:\nDescriptiva (izquierda): «¿qué hay y cuánto?». Intensidad de 0 a 15 y casillas CATA. Es descripción objetiva: una acidez de 13 solo dice que hay mucha, no que sea buena.\nAfectiva (derecha): «¿qué tan alta es mi impresión de calidad?». De 1 a 9. Esa misma acidez intensa puede parecerte brillante (8) o agresiva (4).\nSolo la afectiva produce puntaje. Hacerlas juntas, sección por sección, es la «evaluación combinada» del estándar.",
      "std": "SCA 103-2024 · SCA 104-2024"
    },
    "cva_int": {
      "titulo": "Intensidad de 0 a 15",
      "texto": "Se califica la fuerza total de la sección, no la de cada nota: si la fragancia tiene una nota frutal fuerte y una de chocolate sutil, no se puntúan por separado — se marca qué tan fuerte es la fragancia completa.\n0–5 baja · 5–10 media · 10–15 alta. Se registra el entero más cercano. Intensidad no es calidad ni deseabilidad.",
      "std": "SCA 103-2024 · 6.2"
    },
    "cva_cata": {
      "titulo": "Casillas CATA",
      "texto": "CATA = check-all-that-apply: una lista de categorías donde se marcan las que mejor representan el café. Hay una lista para la nariz (fragancia y aroma juntas) y otra para la boca (sabor y sabor residual juntos): hasta 5 en cada una.\nLas casillas son los círculos interior y medio de la rueda de sabores. El descriptor preciso («arándano») se escribe en las notas; si lo tocas en la rueda, la herramienta marca la casilla («Bayas») y anota el descriptor.\nEsta herramienta cuenta la casilla más específica: «Bayas» trae consigo «Afrutado» sin contarlo dos veces.",
      "std": "SCA 103-2024 · 6.3"
    },
    "cva_gustos": {
      "titulo": "Gustos predominantes",
      "texto": "Hasta 2 gustos básicos que sobresalgan entre el sabor y el sabor residual: salado, ácido, dulce, amargo, umami.\nTodo café tiene amargo: márcalo solo si destaca, sobre todo frente a los otros cafés de la mesa.",
      "std": "SCA 103-2024 · 6.3.2"
    },
    "cva_textura": {
      "titulo": "Textura en boca",
      "texto": "Hasta 2 opciones que describan la calidad de la sensación en boca. Su intensidad —el cuerpo o espesor— ya está en la escala de 0 a 15.\nÁspero: partículas finas, como un café turco. Aceitoso: como café con un poco de mantequilla. Suave: como un almíbar. Deja seca la boca: astringencia. Metálico: recuerda a una lata o al papel aluminio.",
      "std": "SCA 103-2024 · 5.3 · 6.3.3"
    },
    "cva_aff": {
      "titulo": "Impresión de calidad de 1 a 9",
      "texto": "La escala tiene un punto medio verdadero: 5 = ni alta ni baja. Por debajo, la impresión es cada vez más baja (1 = extremadamente baja); por encima, cada vez más alta (9 = extremadamente alta).\nRefleja tu preferencia o la de un mercado que conoces bien — por eso importa el objetivo de la sesión. Úsala de forma intuitiva y sin dejarte influir por otros catadores. Admite cuartos de punto (7,25 · 7,5 · 7,75).",
      "std": "SCA 104-2024 · 5.2"
    },
    "cva_notasA": {
      "titulo": "Notas afectivas",
      "texto": "No repiten la descripción: justifican la calificación. Explican por qué esa impresión de calidad — un juicio subjetivo— resulta de lo que percibiste.",
      "std": "SCA 104-2024 · 5.3"
    },
    "cva_tazas": {
      "titulo": "Uniformidad y defectos",
      "texto": "No uniforme: una taza con una característica cualitativamente distinta de las demás. Que una taza sea solo más o menos intensa no cuenta: suele ser un error de preparación.\nDefectuosa: el formato solo admite tres defectos sensoriales —mohoso, fenólico, papa— y hay que decir cuál. Sin tipo, la taza no cuenta como defectuosa.\nToda taza defectuosa se marca también como no uniforme, salvo que las cinco tengan el mismo defecto. Resta 2 puntos cada taza no uniforme y 4 puntos cada taza defectuosa.",
      "std": "SCA 104-2024 · 5.4"
    },
    "cva_punt": {
      "titulo": "El puntaje afectivo CVA",
      "texto": "S = 0,65625 × (suma de las ocho secciones) + 52,75 − 2 × (tazas no uniformes) − 4 × (tazas defectuosas), redondeado al 0,25 más cercano.\nPuntos de referencia: ocho 5 (neutral) = 79; ocho 9 = 100; ocho 1 = 58.\nLas intensidades y las casillas CATA nunca entran en la fórmula: describen, no califican. Y este número no se compara con el del formulario 2004.",
      "std": "SCA 104-2024 · 5.5"
    },
    "sec_fragrance": {
      "titulo": "Fragancia",
      "texto": "El olor del café molido en seco, antes del agua. Es puramente olfativa (por la nariz, ortonasal).",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_aroma": {
      "titulo": "Aroma",
      "texto": "El olor de la bebida, evaluado en dos momentos: recién servida el agua, con la costra intacta, y al romper la costra.",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_flavor": {
      "titulo": "Sabor",
      "texto": "La percepción combinada del gusto y del olor retronasal mientras el café está en la boca. El cerebro la funde en una sola impresión.",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_aftertaste": {
      "titulo": "Sabor residual",
      "texto": "Lo que dejan los restos de la bebida en boca y garganta después de expulsarla o tragarla: gusto, olor retronasal y duración.",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_acidity": {
      "titulo": "Acidez",
      "texto": "La percepción del gusto ácido que provoca la bebida, que varía en intensidad y en carácter. No tiene lista CATA: su carácter se describe con palabras propias en las notas (cítrica, málica, vinosa…).",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_sweetness": {
      "titulo": "Dulzor",
      "texto": "La percepción de dulzor, por el gusto o por vía retronasal. Tampoco tiene lista CATA: descríbelo en las notas (panela, miel, fruta madura…).",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_mouthfeel": {
      "titulo": "Sensación en boca",
      "texto": "La percepción táctil de la bebida, sin contar la temperatura: su espesor (viscosidad), su textura y otras sensaciones como la astringencia.",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_overall": {
      "titulo": "Impresión global",
      "texto": "La impresión general de calidad del café, incluido lo que no cubren las otras secciones: el balance y tu preferencia personal. Se califica al final. Solo existe en la parte afectiva y cuenta una vez, como las demás.",
      "std": "SCA 104-2024 · 4.3"
    },
    "f_muestra": {
      "titulo": "La muestra de café verde",
      "texto": "El conteo de defectos se hace sobre 350 g de café verde. Si tu muestra pesa otra cosa, escríbelo: los porcentajes de mallas se calculan contra ese peso.\nReferencias habituales del estándar SCA de café verde: humedad de 10 a 12 % y actividad de agua menor de 0,70. La densidad no es un campo del formato: es un dato que CTCx pide en sus fichas (por encima de 700 g/L suele indicar un grano denso, de altura).",
      "std": "Formato físico CVA · SCA café verde"
    },
    "f_color": {
      "titulo": "Color",
      "texto": "El color del grano verde, en las ocho opciones del formato: de verde-azul (fresco, bien secado) a parduzco (envejecido o mal almacenado). Se mira con luz de día o luz blanca.",
      "std": "Formato físico CVA"
    },
    "f_def": {
      "titulo": "Defectos y equivalencias",
      "texto": "Se cuentan los granos de cada tipo y se convierten en defectos completos con la equivalencia del formato: «5:1» quiere decir que cinco granos hacen un defecto completo; «1:1», que cada grano es un defecto.\nLa herramienta cuenta solo los defectos enteros: 7 granos partidos (5:1) son 1 defecto completo.\nCategoría 1 (primarios): los que más dañan la taza. Categoría 2 (secundarios): menos graves, pero afectan la consistencia.",
      "std": "Formato físico CVA · SCA café verde"
    },
    "f_cls": {
      "titulo": "Clasificación de café verde",
      "texto": "Referencia clásica de la SCA sobre 350 g: especialidad = ningún defecto de categoría 1 y hasta 5 defectos completos, sin quakers; premium = hasta 8 defectos completos, hasta 3 quakers; exchange = de 9 a 23; por debajo del estándar = de 24 a 86; fuera de grado = más de 86.\nLos quakers son granos que no tuestan (quedan pálidos); se cuentan en 100 g de café tostado.\nEs una referencia: lo que manda es la especificación de tu contrato.",
      "std": "Clasificación SCA de café verde arábica"
    },
    "f_mallas": {
      "titulo": "Tamaño por mallas",
      "texto": "La granulometría reparte la muestra por tamaño: el número de la malla es el diámetro del orificio en 1/64 de pulgada (malla 17 ≈ 6,75 mm). Se pesa lo que retiene cada malla.\nCon CVA se llena el formato oficial, de la malla 10 a la 23. Con SCA 2004 se usan las agrupaciones comerciales de Colombia: Supremo (17 y más), Extra (16), Europa (15), UGQ (14).\nLa suma debe acercarse al peso de la muestra; la diferencia es lo que no retuvo ninguna malla.",
      "std": "Formato físico CVA · práctica colombiana"
    },
    "perfil": {
      "titulo": "Perfil de taza · notas descriptivas",
      "texto": "El texto libre del catador: qué recuerda la taza, cómo evoluciona al enfriarse, qué la distingue. No entra en ningún puntaje.\nEs el complemento de la rueda: la rueda marca qué se percibió (y en qué etapa, con qué intensidad); aquí se cuenta cómo. Un comprador lee primero el puntaje y después estas líneas.",
      "std": "SCA 103-2024 · 6.3 · práctica del catador"
    },
    "f_hum": {
      "titulo": "Humedad del grano",
      "texto": "El agua que contiene el grano, en porcentaje de su peso. Para café verde de exportación el rango aceptado es 10–12 %: por debajo el grano envejece y pierde taza; por encima, riesgo de moho y de pérdida de peso en tránsito.\nLa humedad del pergamino se mide antes de trillar (en Colombia se compra a 10–12 %); la del verde, después. Son dos lecturas distintas: anote cada una en su casilla.",
      "std": "SCA café verde · ISO 6673"
    },
    "f_aw": {
      "titulo": "Actividad de agua (aw)",
      "texto": "No es lo mismo que la humedad: la aw mide el agua disponible en el grano —la que puede usar un hongo—, en una escala de 0 a 1. Por eso anticipa el riesgo de moho mejor que el porcentaje de humedad.\nPara café verde se busca por debajo de 0,70; por encima de 0,75 el riesgo de crecimiento de moho y de ocratoxina sube de verdad. Se mide con un equipo de aw, no con un medidor de humedad.",
      "std": "SCA café verde · práctica de laboratorio"
    },
    "f_dens": {
      "titulo": "Densidad del grano verde",
      "texto": "Masa por volumen del café verde, en gramos por litro (densidad aparente, medida en una probeta). Rango habitual: 650–800 g/L.\nUn grano más denso suele venir de mayor altitud y de maduración lenta: es más firme y aguanta mejor el tueste. Es un dato físico que acompaña a la taza, no la reemplaza.",
      "std": "Práctica de laboratorio · café verde"
    },
    "f_registro": {
      "titulo": "Registrar el detalle · cuál defecto es cuál",
      "texto": "Los gramos de defecto primario y secundario bastan para el factor. El detalle dice qué había: cuántos granos de cada defecto, y cuántos defectos completos hacen según su equivalencia (1:1, 3:1, 5:1, 10:1).\nEs lo que pide el formato físico: con 350 g de muestra, los primarios (negro, agrio, cereza seca, hongos, materia extraña, broca) y los secundarios (parciales, pergamino, flotador, inmaduro, averanado, concha, partido, cascarilla, insecto leve). El detalle no cambia los gramos ni el factor: documenta la muestra y sostiene la clasificación del verde.",
      "std": "Formato físico CVA · SCA café verde"
    },
    "f_factor_rep": {
      "titulo": "Factor de rendimiento reportado",
      "texto": "Si su laboratorio ya calculó el factor con su propio procedimiento, escríbalo aquí tal cual lo reporta. Es opcional.\nCuando hay pesos de trilla (muestra de pergamino, verde restante y defectos), manda el factor derivado de esos pesos; el reportado vale cuando no los hay. Los dos quedan en la planilla.",
      "std": "Práctica colombiana (FNC) · CTCx"
    },
    "f_factor": {
      "titulo": "Factor de rendimiento",
      "texto": "No es del SCA ni del CVA: es la medida con la que se compra café pergamino en Colombia.\nFactor = 70 × muestra de pergamino ÷ grano sano, donde grano sano = verde tras la trilla − defectos. Con la muestra estándar de 250 g, un factor de 92 quiere decir que hacen falta 92 kg de pergamino para sacar 70 kg de café verde exportable. Cuanto más bajo, mejor rinde.",
      "std": "Práctica colombiana (FNC) · CTCx"
    },
    "e_que": {
      "titulo": "La evaluación extrínseca",
      "texto": "Los atributos extrínsecos son la información y los símbolos que acompañan al café por la cadena: de dónde viene, quién lo produjo, cómo se procesó, qué certificaciones tiene. También generan valor.\nEl evaluador documenta, no califica: responde «¿qué sé de este café, más allá de la taza y del grano?». El formato trae casillas para los atributos más reconocidos y espacio libre para todo lo demás; que algo no tenga casilla no lo hace menos importante. Casi ningún café llena todas.",
      "std": "SCA 105-2025"
    },
    "e_cultivo": {
      "titulo": "Cultivo",
      "texto": "Casillas del formato: país, región (departamento, municipio, vereda), finca o cooperativa, productor(es), especie, variedad(es), fecha o año de cosecha y «otro».\nComo información relevante puedes añadir altitud, latitud y longitud, sombrío, podas, fertilización y forma de recolección. En esta herramienta, altitud, georreferencia y municipio encienden la casilla «otro».",
      "std": "SCA 105-2025 · 5.3"
    },
    "e_proceso": {
      "titulo": "Procesamiento",
      "texto": "Casillas: nombre de los beneficiadores (beneficio húmedo, trilla, otro), tipo de proceso (lavado, natural, otro), descafeinado y descripción del proceso.\nUn honey no es lavado ni natural: se marca «otro» y se escribe «honey». La referencia del estándar es la última capa que queda sobre la semilla al terminar el secado: fruto (natural), mucílago (honey), pergamino (lavado), semilla (trillado húmedo).\nUna frase corta ya vale como descripción, pero el detalle —tiempos y temperatura de fermentación, cultivos iniciadores, cualquier saborizante— suele ser valioso.",
      "std": "SCA 105-2025 · 5.4"
    },
    "e_comercio": {
      "titulo": "Comercio",
      "texto": "Casillas: clasificación (Supremo, Excelso EP, SHB…), número OIC, importador, exportador, precio al productor, tamaño del lote y «otro».\nComo información relevante: modelo de compra (directo, spot), precio FOB, prima, trazabilidad, términos de pago, años de relación entre comprador y vendedor. El proveedor, la identificación tributaria, el código de lote CTCx y la partida arancelaria son datos de la ficha CTCx y encienden «otro».",
      "std": "SCA 105-2025 · 5.5"
    },
    "e_certs": {
      "titulo": "Certificaciones",
      "texto": "Casillas del formato: 4C, comercio justo, orgánico, Rainforest Alliance, inocuidad alimentaria y «otra».\nComo descriptores libres caben otros esquemas de tercera parte (Bird Friendly, Regenerative Organic), verificaciones de empresa (Nespresso AAA, C.A.F.E. Practices) e indicaciones geográficas (Café de Colombia). El EUDR no es una certificación sino un requisito legal de la Unión Europea; se anota aquí porque el comprador europeo lo pide.\nAñade número de certificado, vigencia y enlace de verificación.",
      "std": "SCA 105-2025 · 5.6"
    },
    "e_otro": {
      "titulo": "Otro",
      "texto": "La casilla del formato es premios y reconocimientos: lote o finca ganadora de Taza de la Excelencia, café usado por un campeón de baristas, reconocimientos de sostenibilidad.\nY cabe cualquier otro atributo que sume valor en la cadena: la historia de la finca, si el productor es mujer o joven, el impacto social o ambiental del café.",
      "std": "SCA 105-2025 · 5.7"
    }
  },
  "en": {
    "dif": {
      "titulo": "SCA 2004 and CVA are not the same",
      "texto": "Both come from the Specialty Coffee Association, which is why they get confused.\nSCA 2004 is the classic cupping protocol: ten attributes added into a single score from 0 to 100. That number blends two things: what the coffee is like and how much the cupper likes it.\nCVA (Coffee Value Assessment, SCA Standards 102 to 105, published in 2024 and 2025) supersedes the 2004 protocol and separates four assessments: physical (the green bean), descriptive (what is there and how much, with no judgement), affective (how high the impression of quality is; the only one that yields a score) and extrinsic (what is known about the coffee: origin, process, trade, certifications).\nAn 84 on the 2004 form and an 84 on the CVA are not comparable: they come from different scales and formulas. That is why this tool makes you pick a method and states it on every screen and on the datasheet.",
      "std": "SCA 102–105 · SCA 2004"
    },
    "prep": {
      "titulo": "Sample preparation and tasting mechanics",
      "texto": "Preparation is essentially the same for both methods; SCA Standard 102 (2024) is the one in force.\n• Roast: medium, cupping level — Agtron “Gourmet” reading of 63 (L* 26–29). Rest for 8 to 24 hours.\n• Dose: 8.25 g of coffee per 150 mL of cup capacity (± 0.2 g), each cup weighed and ground separately.\n• Grind: 70–75 % passes a US 20 mesh sieve (850 µm).\n• Water: 93 ± 3 °C, poured to the rim.\n• Cups: five per sample for the affective assessment and for the 2004 form (so uniformity can be judged); three to five for the descriptive one.\n• Steps: dry fragrance → water and aroma with the crust intact → break the crust at 3–5 minutes → skim → taste from about 70 °C, at least three rounds as it cools.\n• Session: 6 coffees at most.\nIf the sample is not at a medium roast, or any other deviation occurs, all parties must be told.",
      "std": "SCA 102-2024"
    },
    "sesion": {
      "titulo": "Session details",
      "texto": "Name, date and purpose head every form. The purpose matters: in the affective assessment the cupper rates according to their own preference or that of a market they know, and whoever reads the datasheet needs to know which.\nYou do not need a certificate to assess with the CVA: the standards and forms are open. If your assessment must carry weight with buyers or competitions, the credential the trade recognises is the SCA Q Grader license; if you have an SCA ID or license, note it here.",
      "std": "SCA 103 · 104 · 105"
    },
    "lotes": {
      "titulo": "One lot or several",
      "texto": "Each lot is a sample with its own profile, physical data and extrinsic part. You can move in and out of each one to cup them in parallel, as at the table: fragrance for all first, then aroma, then the mouth.\nThe code is the sample number on the forms: use it to cup blind and leave the name for later. The standard recommends a maximum of 6 coffees per session.",
      "std": "SCA 102-2024 · 7.2"
    },
    "partes": {
      "titulo": "The three parts",
      "texto": "You can fill in one, two or all three: Flavour profile (the cup), Physical grading (the green bean: defects, moisture, size) and Extrinsic characterisation (what is known about the coffee). A part that is switched off shows neither on screen nor on the datasheet; what was already filled in is not deleted.\nThe standard asks that extrinsic information be kept separate from the sensory assessment so as not to bias it, and that everything be compiled into a single dossier at the end. Different people may complete them.",
      "std": "SCA 105-2025 · 5.2"
    },
    "tueste": {
      "titulo": "Roast level",
      "texto": "Before cupping, the sample's roast level is estimated visually and recorded. Cupping level is medium: an Agtron “Gourmet” reading of 63. A different roast changes the cup, so it is declared.\nIf you want to measure it, the workshop's Agtron Dial reads it from a photo.",
      "std": "SCA 102-2024 · 5.1 · SCA 103 · 6.1"
    },
    "rueda": {
      "titulo": "The flavour wheel",
      "texto": "Three rings, from the inside out: family, subcategory and descriptor. Taste broadly first (“it is fruity”) and move towards the rim to get specific (“it is a berry… it is raspberry”).\nIt is the same wheel as the workshop's Coffee Wheel and the Quality Centre's scoresheet: a single taxonomy, inspired by the SCA and World Coffee Research Coffee Taster's Flavor Wheel.\nWith SCA 2004 the notes are free. With CVA, each note you tap ticks the CATA box for its category in whichever list is active (nose or mouth) and is recorded as a descriptor.",
      "std": "SCA/WCR Flavor Wheel · SCA 103 · 5.1"
    },
    "sca_esc": {
      "titulo": "The 6 to 10 scale",
      "texto": "The seven scaled attributes are rated from 6.00 to 10.00 in 0.25 steps: 6 = good, 7 = very good, 8 = excellent, 9 = outstanding. Below 6 the coffee is not specialty and the form goes no lower.\nHere the rating is one of quality: you describe and judge in the same number. That is the core difference from the CVA, which separates the two.",
      "std": "SCA 2004"
    },
    "sca_fragrance": {
      "titulo": "Fragrance / Aroma",
      "texto": "A single attribute on the 2004 form. It is assessed at three moments: the smell of the dry grounds (fragrance), of the crust as it is broken, and of the brew as it steeps (aroma).\nIn the CVA these are two separate sections.",
      "std": "SCA 2004"
    },
    "sca_flavor": {
      "titulo": "Flavor",
      "texto": "The coffee's main character in the mouth: the combination of taste and retronasal aroma, between the first impression and the aftertaste. Its intensity, quality and complexity are rated.",
      "std": "SCA 2004"
    },
    "sca_aftertaste": {
      "titulo": "Aftertaste",
      "texto": "What remains on the palate after the coffee is expelled or swallowed, and how long it lasts. A short or unpleasant aftertaste lowers the rating.",
      "std": "SCA 2004"
    },
    "sca_acidity": {
      "titulo": "Acidity",
      "texto": "What is rated is the quality of the acidity — bright when favourable, sour when not — not how much there is. Its intensity (high, medium, low) is noted separately and neither adds nor subtracts: high acidity may be expected in one origin and excessive in another.",
      "std": "SCA 2004"
    },
    "sca_body": {
      "titulo": "Body",
      "texto": "The tactile feel of the liquid in the mouth, especially between the tongue and the roof of the mouth. Its quality is rated; the level (heavy, medium, thin) is noted separately and neither adds nor subtracts: a light body can be as good as a heavy one.\nIn the CVA this section is called “mouthfeel” and also covers texture and astringency.",
      "std": "SCA 2004"
    },
    "sca_balance": {
      "titulo": "Balance",
      "texto": "How flavor, aftertaste, acidity and body complement or contrast with each other. If the sample lacks one of them, or one overpowers the rest, balance drops.\nThe CVA has no such box: balance is part of the overall impression.",
      "std": "SCA 2004"
    },
    "sca_uniformity": {
      "titulo": "Uniformity",
      "texto": "Consistency of flavor across the sample's five cups. Each cup that matches the others is worth 2 points; a cup that tastes different loses its points.",
      "std": "SCA 2004"
    },
    "sca_clean_cup": {
      "titulo": "Clean cup",
      "texto": "Absence of negative impressions from the first sip to the aftertaste. 2 points for each clean cup; any non-coffee taste or aroma disqualifies the cup.",
      "std": "SCA 2004"
    },
    "sca_sweetness": {
      "titulo": "Sweetness",
      "texto": "The pleasing fullness of flavor given by certain carbohydrates; its opposite is a sour, astringent or “green” cup. 2 points for each cup that shows it.\nIn the CVA sweetness has its own intensity and impression-of-quality scales.",
      "std": "SCA 2004"
    },
    "sca_cuppers": {
      "titulo": "Overall (cupper's score)",
      "texto": "The cupper's holistic, personal rating of the sample: what they think of the whole. It is the only openly subjective attribute on the 2004 form.",
      "std": "SCA 2004"
    },
    "sca_def": {
      "titulo": "Cup defects",
      "texto": "Negative flavors that detract from quality. Taint: noticeable but not overwhelming, usually in the aromatics — 2 points per cup. Fault: overwhelming, or makes the cup unpalatable — 4 points per cup.\nThe intensity is multiplied by the number of cups affected and the result is subtracted from the sum of the ten attributes.",
      "std": "SCA 2004"
    },
    "sca_taint": {
      "titulo": "Taint",
      "texto": "An off-flavor or off-odor that is noticeable but not overwhelming, usually found in the aromatics.\nIt subtracts 2 points for each cup that shows it. Mark the cup and say which defect it is.",
      "std": "SCA 2004"
    },
    "sca_fault": {
      "titulo": "Fault",
      "texto": "An off-flavor that overwhelms the cup or makes it unpalatable, usually found in the taste.\nIt subtracts 4 points for each cup that shows it. Mark the cup and say which defect it is.",
      "std": "SCA 2004"
    },
    "cva_acidez": {
      "titulo": "Acidity type",
      "texto": "The descriptive form asks you to choose one: dry — herby, grassy, tart — or sweet — juicy, fruit-like, bright.\nIt describes the character of the acidity; its strength goes on the 0 to 15 scale. It does not enter the score.",
      "std": "SCA 103"
    },
    "sca_punt": {
      "titulo": "The SCA 2004 score",
      "texto": "Final score = sum of the ten attributes − defects.\nReading the total: 90–100 outstanding · 85–89.99 excellent · 80–84.99 very good · under 80, below specialty quality.\nThere is no score until all ten attributes are rated: a half-finished sum is not a score.",
      "std": "SCA 2004"
    },
    "cva_dos": {
      "titulo": "Two columns, two questions",
      "texto": "Each cup section is answered twice, and the answers are not copied from one another:\nDescriptive (left): “what is there, and how much?”. Intensity from 0 to 15 and CATA boxes. It is objective description: an acidity of 13 only says there is a lot of it, not that it is good.\nAffective (right): “how high is my impression of quality?”. From 1 to 9. That same intense acidity may strike you as bright (8) or harsh (4).\nOnly the affective part yields a score. Doing both together, section by section, is the standard's “combined assessment”.",
      "std": "SCA 103-2024 · SCA 104-2024"
    },
    "cva_int": {
      "titulo": "Intensity from 0 to 15",
      "texto": "You rate the total strength of the section, not of each note: if the fragrance has a strong fruity note and a subtle chocolate one, they are not scored separately — you mark how strong the whole fragrance is.\n0–5 low · 5–10 medium · 10–15 high. The nearest whole number is recorded. Intensity is not quality or desirability.",
      "std": "SCA 103-2024 · 6.2"
    },
    "cva_cata": {
      "titulo": "CATA boxes",
      "texto": "CATA = check-all-that-apply: a list of categories where you tick those that best represent the coffee. There is one list for the nose (fragrance and aroma together) and another for the mouth (flavor and aftertaste together): up to 5 in each.\nThe boxes are the inner and middle circles of the flavour wheel. The precise descriptor (“blueberry”) is written in the notes; if you tap it on the wheel, the tool ticks the box (“Berry”) and notes the descriptor.\nThis tool counts the most specific box: “Berry” brings “Fruity” with it without counting twice.",
      "std": "SCA 103-2024 · 6.3"
    },
    "cva_gustos": {
      "titulo": "Main tastes",
      "texto": "Up to 2 basic tastes that stand out across flavor and aftertaste: salty, sour, sweet, bitter, umami.\nAll coffees have bitterness: tick it only if it stands out, especially against the other coffees on the table.",
      "std": "SCA 103-2024 · 6.3.2"
    },
    "cva_textura": {
      "titulo": "Mouthfeel texture",
      "texto": "Up to 2 options describing the quality of the mouthfeel. Its intensity — body or thickness — is already on the 0 to 15 scale.\nRough: fine particles, as in ibrik coffee. Oily: like coffee with a little butter. Smooth: like a syrup. Mouth-drying: astringency. Metallic: reminiscent of tin cans or aluminium foil.",
      "std": "SCA 103-2024 · 5.3 · 6.3.3"
    },
    "cva_aff": {
      "titulo": "Impression of quality from 1 to 9",
      "texto": "The scale has a true midpoint: 5 = neither high nor low. Below it, the impression gets lower (1 = extremely low); above it, higher (9 = extremely high).\nIt reflects your own preference or that of a market you know well — which is why the session's purpose matters. Use it intuitively and without being influenced by other cuppers. Quarter points are allowed (7.25 · 7.5 · 7.75).",
      "std": "SCA 104-2024 · 5.2"
    },
    "cva_notasA": {
      "titulo": "Affective notes",
      "texto": "They do not repeat the description: they justify the rating. They explain why that impression of quality — a subjective judgement — follows from what you perceived.",
      "std": "SCA 104-2024 · 5.3"
    },
    "cva_tazas": {
      "titulo": "Uniformity and defects",
      "texto": "Non-uniform: a cup with a characteristic that is qualitatively different from the rest. A cup that is merely more or less intense does not count: that is usually a brewing error.\nDefective: the form allows only three sensory defects — moldy, phenolic, potato — and you must say which. Without a type, the cup does not count as defective.\nEvery defective cup is also marked non-uniform, except when all five share the same defect. Each non-uniform cup deducts 2 points and each defective cup 4 points.",
      "std": "SCA 104-2024 · 5.4"
    },
    "cva_punt": {
      "titulo": "The CVA affective score",
      "texto": "S = 0.65625 × (sum of the eight sections) + 52.75 − 2 × (non-uniform cups) − 4 × (defective cups), rounded to the nearest 0.25.\nReference points: eight 5s (neutral) = 79; eight 9s = 100; eight 1s = 58.\nIntensities and CATA boxes never enter the formula: they describe, they do not judge. And this number is not to be compared with the 2004 form's.",
      "std": "SCA 104-2024 · 5.5"
    },
    "sec_fragrance": {
      "titulo": "Fragrance",
      "texto": "The smell of the dry coffee grounds, before water. Purely olfactory (through the nose, orthonasal).",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_aroma": {
      "titulo": "Aroma",
      "texto": "The smell of the brew, assessed at two moments: right after pouring, with the crust intact, and as the crust is broken.",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_flavor": {
      "titulo": "Flavor",
      "texto": "The combined perception of taste and retronasal smell while the coffee is in the mouth. The brain merges them into a single impression.",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_aftertaste": {
      "titulo": "Aftertaste",
      "texto": "What the remnants of the brew leave in the mouth and throat after it is ejected or swallowed: taste, retronasal smell and length.",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_acidity": {
      "titulo": "Acidity",
      "texto": "The perception of sour taste provoked by the brew, which varies in intensity and character. It has no CATA list: describe its character in your own words in the notes (citric, malic, winey…).",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_sweetness": {
      "titulo": "Sweetness",
      "texto": "The perception of sweetness, gustatory or retronasal. It has no CATA list either: describe it in the notes (panela, honey, ripe fruit…).",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_mouthfeel": {
      "titulo": "Mouthfeel",
      "texto": "The tactile perception of the brew, excluding temperature: its thickness (viscosity), its texture and other sensations such as astringency.",
      "std": "SCA 102-2024 · 4.4"
    },
    "sec_overall": {
      "titulo": "Overall",
      "texto": "The general impression of quality of the coffee, including what the other sections do not cover: balance and your personal preference. It is rated at the end. It exists only in the affective part and counts once, like the rest.",
      "std": "SCA 104-2024 · 4.3"
    },
    "f_muestra": {
      "titulo": "The green coffee sample",
      "texto": "Defects are counted on 350 g of green coffee. If your sample weighs something else, enter it: screen percentages are calculated against that weight.\nUsual references from the SCA green coffee standard: moisture from 10 to 12 % and water activity below 0.70. Density is not a field on the form: it is something CTCx asks for on its datasheets (above 700 g/L usually points to a dense, high-grown bean).",
      "std": "Formato físico CVA · SCA café verde"
    },
    "f_color": {
      "titulo": "Colour",
      "texto": "The colour of the green bean, in the form's eight options: from blue-green (fresh, well dried) to brownish (aged or poorly stored). Judge it under daylight or white light.",
      "std": "Formato físico CVA"
    },
    "f_def": {
      "titulo": "Defects and equivalences",
      "texto": "You count the beans of each type and convert them into full defects using the form's equivalence: “5:1” means five beans make one full defect; “1:1”, each bean is one defect.\nThe tool counts whole defects only: 7 broken beans (5:1) are 1 full defect.\nCategory 1 (primary): those that harm the cup most. Category 2 (secondary): less serious, but they affect consistency.",
      "std": "Formato físico CVA · SCA café verde"
    },
    "f_cls": {
      "titulo": "Green coffee classification",
      "texto": "The classic SCA reference on 350 g: specialty = no category 1 defects and up to 5 full defects, no quakers; premium = up to 8 full defects, up to 3 quakers; exchange = 9 to 23; below standard = 24 to 86; off grade = more than 86.\nQuakers are beans that do not roast (they stay pale); they are counted in 100 g of roasted coffee.\nIt is a reference: what governs is your contract's specification.",
      "std": "Clasificación SCA de café verde arábica"
    },
    "f_mallas": {
      "titulo": "Size by screens",
      "texto": "Screening splits the sample by size: the screen number is the hole diameter in 1/64 of an inch (screen 17 ≈ 6.75 mm). You weigh what each screen retains.\nWith CVA you fill in the official form, screens 10 to 23. With SCA 2004 the Colombian commercial groupings are used: Supremo (17 and up), Extra (16), Europa (15), UGQ (14).\nThe sum should approach the sample weight; the difference is what no screen retained.",
      "std": "Formato físico CVA · práctica colombiana"
    },
    "perfil": {
      "titulo": "Cup profile · descriptive notes",
      "texto": "The cupper's free text: what the cup recalls, how it evolves as it cools, what sets it apart. It enters no score.\nIt complements the wheel: the wheel marks what was perceived (and at which stage, with what intensity); here you tell how. A buyer reads the score first and then these lines.",
      "std": "SCA 103-2024 · 6.3 · práctica del catador"
    },
    "f_hum": {
      "titulo": "Bean moisture",
      "texto": "The water held in the bean, as a percentage of its weight. For export green coffee the accepted range is 10–12%: below it the bean ages and loses cup; above it, mould risk and weight loss in transit.\nParchment moisture is measured before hulling (in Colombia it is bought at 10–12%); green moisture after. They are two different readings: record each in its own box.",
      "std": "SCA café verde · ISO 6673"
    },
    "f_aw": {
      "titulo": "Water activity (aw)",
      "texto": "Not the same as moisture: aw measures the water available in the bean — the water a fungus can use — on a scale from 0 to 1. That is why it anticipates mould risk better than the moisture percentage.\nFor green coffee the target is below 0.70; above 0.75 the risk of mould growth and ochratoxin rises for real. It is measured with an aw meter, not a moisture meter.",
      "std": "SCA café verde · práctica de laboratorio"
    },
    "f_dens": {
      "titulo": "Green bean density",
      "texto": "Mass per volume of the green coffee, in grams per litre (bulk density, measured in a graduated cylinder). Usual range: 650–800 g/L.\nA denser bean usually comes from higher altitude and slower ripening: it is firmer and stands up better to roasting. It is a physical datum that accompanies the cup; it does not replace it.",
      "std": "Práctica de laboratorio · café verde"
    },
    "f_registro": {
      "titulo": "Record the detail · which defect is which",
      "texto": "The grams of primary and secondary defects are enough for the factor. The detail says what was there: how many beans of each defect, and how many full defects they make by their equivalence (1:1, 3:1, 5:1, 10:1).\nIt is what the physical form asks for: on a 350 g sample, the primaries (black, sour, dried cherry, fungus, foreign matter, borer) and the secondaries (partials, parchment, floater, immature, withered, shell, broken, hull, slight insect). The detail does not change the grams or the factor: it documents the sample and supports the green grading.",
      "std": "Formato físico CVA · SCA café verde"
    },
    "f_factor_rep": {
      "titulo": "Reported yield factor",
      "texto": "If your lab has already calculated the factor with its own procedure, enter it here as reported. It is optional.\nWhen hulling weights exist (parchment sample, remaining green and defects), the factor derived from those weights governs; the reported one counts when they are missing. Both stay on the sheet.",
      "std": "Práctica colombiana (FNC) · CTCx"
    },
    "f_factor": {
      "titulo": "Yield factor",
      "texto": "This is neither SCA nor CVA: it is the measure used to buy parchment coffee in Colombia.\nFactor = 70 × parchment sample ÷ sound beans, where sound beans = green after hulling − defects. With the standard 250 g sample, a factor of 92 means it takes 92 kg of parchment to obtain 70 kg of exportable green coffee. The lower, the better the yield.",
      "std": "Práctica colombiana (FNC) · CTCx"
    },
    "e_que": {
      "titulo": "The extrinsic assessment",
      "texto": "Extrinsic attributes are the information and symbols that travel with the coffee along the chain: where it comes from, who produced it, how it was processed, which certifications it holds. They generate value too.\nThe assessor documents; they do not rate: they answer “what do I know about this coffee, beyond the cup and the bean?”. The form has boxes for the most widely recognised attributes and free space for everything else; something not having a box does not make it less important. Hardly any coffee fills them all.",
      "std": "SCA 105-2025"
    },
    "e_cultivo": {
      "titulo": "Farming",
      "texto": "Boxes on the form: country, region (state, municipality, village), farm or co-op, producer(s), species, variety(ies), harvest date or year, and “other”.\nAs relevant information you can add altitude, latitude and longitude, shade, pruning, fertilising and harvesting approach. In this tool, altitude, georeference and municipality light up the “other” box.",
      "std": "SCA 105-2025 · 5.3"
    },
    "e_proceso": {
      "titulo": "Processing",
      "texto": "Boxes: name of processors (wet mill, dry mill, other), process type (washed, natural, other), decaffeinated and process description.\nA honey is neither washed nor natural: tick “other” and write “honey”. The standard's reference is the last layer left on the seed at the end of drying: fruit (natural), mucilage (honey), parchment (washed), seed (wet-hulled).\nA short sentence already counts as a description, but detail — fermentation time and temperature, starter cultures, any flavouring aids — is usually valuable.",
      "std": "SCA 105-2025 · 5.4"
    },
    "e_comercio": {
      "titulo": "Trading",
      "texto": "Boxes: grade (Supremo, Excelso EP, SHB…), ICO number, importer, exporter, farm gate price, lot size and “other”.\nAs relevant information: trading model (direct trade, spot), FOB price, premium, traceability, payment terms, length of the buyer–seller relationship. Supplier, tax ID, CTCx lot code and HS code are CTCx datasheet fields and light up “other”.",
      "std": "SCA 105-2025 · 5.5"
    },
    "e_certs": {
      "titulo": "Certifications",
      "texto": "Boxes on the form: 4C, fair trade, organic, Rainforest Alliance, food safety and “other”.\nAs free descriptors you can add other third-party schemes (Bird Friendly, Regenerative Organic), company verification schemes (Nespresso AAA, C.A.F.E. Practices) and geographical indications (Café de Colombia). The EUDR is not a certification but a legal requirement of the European Union; it is noted here because European buyers ask for it.\nAdd certificate number, validity dates and verification link.",
      "std": "SCA 105-2025 · 5.6"
    },
    "e_otro": {
      "titulo": "Other",
      "texto": "The box on the form is awards: a Cup of Excellence winning lot or farm, a coffee used by a barista champion, sustainability awards.\nAny other attribute that adds value along the chain belongs here too: the farm story, the producer's gender or youth status, the coffee's social or environmental impact.",
      "std": "SCA 105-2025 · 5.7"
    }
  }
};

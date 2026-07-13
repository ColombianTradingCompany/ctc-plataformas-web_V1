// Ported verbatim from V5_CTC_Green_Coffee_Datasheet.html — the official CTC
// green coffee datasheet tool. Field names match the source's data-field
// keys exactly so the underlying logic/calculations stay faithful.

export type Variety = { v: string; l: string; e: string; c: string };

export const VARIETIES: Variety[] = [
  { v: "Typica", l: "Landrace de Etiopía vía Yemen", e: "arabica", c: "Considerada la base de la caficultura mundial; posee porte alto, baja productividad y una taza elegante con acidez limpia y dulzor." },
  { v: "Bourbon", l: "Mutación natural de Typica", e: "arabica", c: "Mayor productividad que Typica; frutos rojos o amarillos densos, dulzura acaramelada, cuerpo redondo y acidez compleja muy apreciada en especialidad." },
  { v: "Caturra", l: "Mutación enana del Bourbon", e: "arabica", c: "Porte bajo que permite alta densidad; muy productivo, acidez viva y cuerpo medio. Es el estándar de productividad en Latinoamérica." },
  { v: "Mundo Novo", l: "Híbrido natural Typica x Bourbon", e: "arabica", c: "Originado en Brasil; planta muy alta, vigorosa y productiva. Taza de alta calidad pero sensible a enfermedades y vientos fuertes." },
  { v: "Catuai", l: "Híbrido Mundo Novo x Caturra", e: "arabica", c: "Planta compacta y altamente productiva; hereda el enanismo del Caturra y el vigor del Mundo Novo. Perfil de taza balanceado." },
  { v: "Variedad Colombia", l: "Caturra x Híbrido de Timor", e: "arabica", c: "Primera variedad compuesta resistente de Cenicafé; porte bajo, alta productividad, resistente a roya con el perfil clásico suave colombiano." },
  { v: "Castillo (General)", l: "Variedad Colombia x Progenies F5", e: "arabica", c: "Evolución de la variedad Colombia; mayor tamaño de grano, resistencia durable a roya y perfil balanceado con notas cítricas." },
  { v: "Tabi", l: "(Typica x Bourbon) x H. de Timor", e: "arabica", c: "Variedad de porte alto; produce granos de tamaño extraordinario (supremo), alta resistencia a roya y calidad sensorial superior." },
  { v: "Cenicafé 1", l: "Caturra x Híbrido de Timor 1343", e: "arabica", c: "Lanzada en 2016; porte muy bajo tipo Caturra, resistente a roya y CBD, con calidad física de exportación excepcional." },
  { v: "Castillo 2", l: "Cruces multilineales avanzados", e: "arabica", c: "Generación 2024; mayor resiliencia climática, incorpora nuevas fuentes de resistencia de Arábicas africanos y Arasari para sostenibilidad a largo plazo." },
  { v: "Umbral", l: "Selección avanzada de Cenicafé", e: "arabica", c: "Nueva variedad 2025 para cambio climático; productiva a msnm, tolerante a altas temperaturas y estrés hídrico severo." },
  { v: "Castillo Norte", l: "Regionalización de Castillo", e: "arabica", c: "Adaptada a la Sierra Nevada de Santa Marta; perfil achocolatado, cuerpo alto y resistencia optimizada a razas locales de roya." },
  { v: "Castillo Centro", l: "Regionalización de Castillo", e: "arabica", c: "Diseñada para el Eje Cafetero; optimizada para floraciones bimodales, alta productividad y equilibrio sensorial entre acidez y dulzor." },
  { v: "Castillo Sur", l: "Regionalización de Castillo", e: "arabica", c: "Adaptada a Nariño y Huila; optimizada para altitudes extremas, resalta acidez cítrica y notas florales intensas muy demandadas." },
  { v: "Maragogipe", l: "Mutación de Typica", e: "arabica", c: "Grano gigante \"elefante\"; porte muy alto, internudos largos, baja producción pero taza muy suave con notas de nuez." },
  { v: "Gesha", l: "Landrace etíope (Montaña Gesha)", e: "arabica", c: "Variedad icónica de subasta; perfil extremadamente floral (jazmín), notas cítricas bergamota, cuerpo sedoso y claridad parecida al té." },
  { v: "SL28", l: "Selección Scott Labs (Tanzania)", e: "arabica", c: "El orgullo de Kenia; resistente a sequía, acidez vibrante a grosella negra, cuerpo jugoso y gran complejidad en taza." },
  { v: "SL34", l: "Selección Scott Labs (Borbón/Etíope)", e: "arabica", c: "Similar a SL28 pero adaptada a zonas de alta lluvia; porte alto, vigoroso y perfil complejo con cuerpo denso." },
  { v: "Batian", l: "Selección SL28, SL34, Sudan Rume", e: "arabica", c: "Variedad keniana moderna; resistente a roya y CBD, alta productividad, cosecha precoz y calidad sensorial equivalente a SL28." },
  { v: "Ruiru 11", l: "Híbrido complejo Catimor x SL", e: "arabica", c: "Compacto y resistente a todo; desarrollado en Kenia para densidad extrema, con producción masiva y calidad aceptable bien procesada." },
  { v: "Pacas", l: "Mutación de Bourbon", e: "arabica", c: "Descubierta en El Salvador; porte bajo y compacto, muy productivo en altura, con taza dulce de notas equilibradas." },
  { v: "Villa Sarchi", l: "Mutación de Bourbon", e: "arabica", c: "Descubierta en Costa Rica; porte bajo, adaptable a vientos fuertes y gran altitud, con acidez elegante y brillante." },
  { v: "Pacamara", l: "Híbrido Pacas x Maragogipe", e: "arabica", c: "Grano gigante; combina el enanismo con calidad excepcional, notas especiadas, achocolatadas, cuerpo cremoso y acidez málica compleja." },
  { v: "Maracaturra", l: "Híbrido Maragogipe x Caturra", e: "arabica", c: "Grano extragrande; combina tamaño y productividad, perfil muy dulce con notas de frutas amarillas y cuerpo sedoso." },
  { v: "Borbón Rosado", l: "Landrace etíope (Huila, Col.)", e: "arabica", c: "Grano rosado único; altísima glucosa que produce perfiles dulces intensos, florales (rosas), con notas a durazno y bayas." },
  { v: "Chiroso", l: "Landrace etíope (Urrao, Col.)", e: "arabica", c: "Grano alargado; complejidad floral y cítrica superior (mandarina), cuerpo sedoso. Es el \"Geisha colombiano\" por su calidad en catación." },
  { v: "Wush Wush", l: "Landrace etíope (Wushwush)", e: "arabica", c: "Perfil tropical exótico; extremadamente dulce con notas a fruta madura, lavanda y especias orientales. Muy adaptable en Colombia." },
  { v: "Sidra", l: "Híbrido Typica x Bourbon", e: "arabica", c: "Desarrollado en Ecuador; combina dulzura y acidez. Perfil complejo vinoso con notas de bayas rojas y flores blancas." },
  { v: "Papayo", l: "Mutación probable de B. Rosado", e: "arabica", c: "Grano alargado tipo papaya (Huila); perfil dulce a chocolate con leche, caramelo y frutas tropicales muy marcadas." },
  { v: "Ombligón", l: "Landrace etíope (Acevedo, Col.)", e: "arabica", c: "Grano grande con disco saliente; perfil sedoso, complejo, con notas cítricas, chocolate fino y frutas de hueso. Café de competencia." },
  { v: "Laurina", l: "Mutación de Bourbon (Pointu)", e: "arabica", c: "Bajo contenido natural de cafeína; árbol tipo pino, taza dulce, suave, baja acidez y muy poco amargor." },
  { v: "Moka (Mocha)", l: "Mutación enana de Bourbon", e: "arabica", c: "Granos minúsculos redondos; originario de Yemen, sabor distintivo a chocolate amargo, cuerpo denso y perfil aromático único." },
  { v: "K7", l: "Selección de Kent (Kenia)", e: "arabica", c: "Porte alto; resistente a roya y CBD en África Oriental. Taza equilibrada con cuerpo medio-alto y dulzura notable." },
  { v: "Kent", l: "Selección de Typica (India)", e: "arabica", c: "Primera variedad seleccionada por resistencia a roya; vigorosa, con taza elegante de notas florales y acidez bien balanceada." },
  { v: "S795", l: "Híbrido S288 x Kent", e: "arabica", c: "Muy popular en Asia; resistente a roya, taza con notas a jarabe de arce, azúcar moreno y cuerpo redondo." },
  { v: "Java", l: "Landrace etíope vía Indonesia", e: "arabica", c: "Adaptada a sombra; resistente a CBD, grano alargado, calidad de taza alta similar a etíopes, dulce, floral y limpia." },
  { v: "Marsellesa", l: "Sarchimor (Villa Sarchi x HdT)", e: "arabica", c: "Híbrido moderno de Nicaragua; resistente a roya, acidez superior al Caturra, aroma floral y excelente cuerpo para especialidad." },
  { v: "Arara", l: "Híbrido Obatã x Catuai Amarillo", e: "arabica", c: "\"Geisha brasileño\"; cerezas amarillas grandes, resistente a sequía, extremadamente dulce con notas de almendra y chocolate." },
  { v: "Starmaya", l: "Marsellesa x Mutación Etíope", e: "arabica", c: "Único híbrido F1 por semilla; resistente a roya, alta productividad, acidez brillante y perfil dulce clásico de Centroamérica." },
  { v: "Centroamericano", l: "Híbrido F1 Sarchimor x Etíope", e: "arabica", c: "Vigor híbrido; altísima productividad y calidad, resistente a roya y nematodos, perfil cítrico floral ideal para sistemas agroforestales." },
  { v: "Milenio", l: "Sarchimor x Sudan Rume", e: "arabica", c: "Híbrido F1; combina resistencia a enfermedades con la finura sensorial del Sudan Rume, notas frutales y acidez málica." },
  { v: "Evaluna", l: "Selección híbrida CIRAD/ECOM", e: "arabica", c: "Porte bajo; adaptada a altitudes extremas, productividad masiva y calidad de taza superior con acidez brillante y limpia." },
  { v: "Esperanza", l: "Selección híbrida avanzada", e: "arabica", c: "Muy productiva y tolerante a roya; adaptada a climas húmedos, perfil sensorial equilibrado con buena densidad de frutos." },
  { v: "Casiopea", l: "Cruce Caturra x Landrace Etíope", e: "arabica", c: "Calidad excepcional sobre msnm; alta productividad, perfil floral complejo y cuerpo sedoso muy competitivo en catación." },
  { v: "Obatã", l: "Sarchimor (HdT x V. Sarchi)", e: "arabica", c: "Vigorosa y resistente; desarrollada en Brasil para zonas medias, ofrece taza limpia, equilibrada y rendimientos agrícolas estables." },
  { v: "Catucaí", l: "Icatu x Catuai", e: "arabica", c: "Cruce brasileño; combina resistencia de Robusta vía Icatu con calidad de Catuai. Muy productivo, notas achocolatadas intensas." },
  { v: "Icatu", l: "(Robusta x Bourbon) x M. Novo", e: "arabica", c: "Híbrido interespecífico retrocruzado; vigor de Robusta con calidad Arábica, resistente a enfermedades y muy productivo comercialmente." },
  { v: "Pache", l: "Mutación de Typica", e: "arabica", c: "Enana (San Bernardo); ideal para zonas de viento, produce taza dulce con notas de chocolate y baja acidez." },
  { v: "Bernardina", l: "Landrace etíope (El Salvador)", e: "arabica", c: "Redescubierta recientemente; genética etíope pura, perfil complejo con notas de durazno, flor de naranjo, té y miel." },
  { v: "Nemaya", l: "Selección de C. canephora", e: "canephora", c: "Robusta especializado; alta resistencia a nematodos de raíz, usado casi exclusivamente como portainjerto para proteger variedades de Arábica." },
  { v: "BP 534", l: "Selección de germoplasma", e: "canephora", c: "Selección de Indonesia; alta productividad en ambientes húmedos, granos de tamaño promedio y resistencia aceptable a patógenos locales fúngicos." },
  { v: "BP 939", l: "Selección de germoplasma", e: "canephora", c: "Clon indonesio calificado como \"Fine Robusta\"; destaca por alta puntuación sensorial en taza y adaptabilidad en altitudes medias." },
  { v: "Roubi 1", l: "Selección masal mejorada", e: "canephora", c: "Selección de República Centroafricana; combina excelente rendimiento agrícola con buena calidad de bebida y alta aceptación por caficultores." },
  { v: "Roubi 6", l: "Selección de alto vigor", e: "canephora", c: "Selección de porte vigoroso; reconocida por su gran calidad de taza para la especie y resistencia superior a enfermedades." },
  { v: "BRS 2314", l: "Selección Embrapa", e: "canephora", c: "Desarrollado en Brasil; planta de porte bajo con granos grandes, específicamente adaptada para tolerar periodos prolongados de sequía hídrica." },
  { v: "BRS 3137", l: "Selección de porte compacto", e: "canephora", c: "Cultivar brasileño de porte reducido; permite alta densidad de siembra y mantiene productividad elevada en condiciones climáticas muy secas." },
  { v: "TR4", l: "Selección comercial masiva", e: "canephora", c: "Variedad líder en Vietnam; destaca por su alto rendimiento, amplia adaptación geográfica y notable resistencia a plagas y enfermedades." },
  { v: "TR9", l: "Selección de gran calidad", e: "canephora", c: "Selección vietnamita de rendimiento masivo; ofrece gran tamaño de grano y una de las mejores calidades sensoriales para Robusta." },
  { v: "TR11", l: "Selección vigorosa industrial", e: "canephora", c: "Variedad vietnamita vigorosa; combina crecimiento fuerte con rendimiento superior, fundamental para la producción comercial de café soluble a escala." },
  { v: "Nganda", l: "Landrace tradicional", e: "canephora", c: "Variante arbustiva de Uganda; valorada por su adaptabilidad tradicional, hábito de crecimiento rastrero y perfil de sabor balanceado distintivo." },
  { v: "Kouilou", l: "Landrace rústico", e: "canephora", c: "Originaria de África Occidental; planta rústica de granos pequeños pero producción abundante, esencial en programas globales de mejora genética." },
  { v: "Conilon", l: "Selección comercial brasileña", e: "canephora", c: "Nombre brasileño del Robusta; seleccionado por su vigor, gran cuerpo y resistencia, ideal para mezclas de espresso de calidad." },
  { v: "INIFAP 00-28", l: "Selección masal mexicana", e: "canephora", c: "Clon mexicano de porte alto; produce hojas y frutos grandes, registrando el mayor rendimiento histórico en la costa chiapaneca." },
  { v: "KR1", l: "Selección resistente CWD", e: "canephora", c: "Selección de Uganda; destaca por su resistencia específica a la marchitez del café y su alta productividad comercial estable." },
  { v: "KR6", l: "Selección de ladera", e: "canephora", c: "Variedad ugandesa mejorada; ofrece un equilibrio entre resistencia a enfermedades foliares y altos niveles de cosecha para pequeños productores." },
  { v: "Barako", l: "Landrace tradicional", e: "liberica", c: "Variedad filipina de sabor amargo intenso; presenta granos gigantes y un aroma picante único que recuerda al anís silvestre." },
  { v: "Kapeng Barako", l: "Selección regional", e: "liberica", c: "Tradición de Filipinas; apreciada por su perfil sensorial ahumado y floral, constituye un símbolo de la identidad cafetera asiática." },
  { v: "Excelsa", l: "Landrace africano", e: "liberica var", c: "Variedad de gran tamaño; ofrece perfil afrutado con notas de tamarindo, frutos rojos y acidez marcada muy distintiva." },
  { v: "Liberica Excelsa", l: "Selección sudeste asiático", e: "liberica var", c: "Selección del sudeste asiático; planta resistente que requiere cosecha manual selectiva debido a la maduración desigual de sus frutos." },
  { v: "Stenophylla", l: "Landrace silvestre", e: "stenophylla", c: "Especie tolerante al calor extremo; posee granos púrpuras y un sabor dulce y floral que rivaliza con el Arábica." },
  { v: "Racemosa", l: "Landrace de Mozambique", e: "racemosa", c: "Adaptada a aridez extrema; hábito deciduo, maduración rápida, granos diminutos con muy baja cafeína y perfil de sabor dulce." },
  { v: "Eugenioides", l: "Landrace de Kenia", e: "eugenioides", c: "Progenitor del Arábica; posee dulzor natural extraordinario, bajísima cafeína y notas que recuerdan a cereales y granos tostados." },
  { v: "Charrieriana", l: "Landrace de Camerún", e: "charrieriana", c: "Especie de Camerún; única variedad conocida naturalmente libre de cafeína, descubierta recientemente con un gran potencial científico y comercial." },
  { v: "Congensis", l: "Landrace diploide", e: "congensis", c: "Especie diploide de selvas húmedas; utilizada en hibridaciones para mejorar la calidad sensorial y la resistencia foliar del Robusta." },
  { v: "Mauritiana", l: "Landrace de Madagascar", e: "mauritiana", c: "Landrace de las Islas Mascareñas; adaptada a climas insulares, funciona como una reserva genética vital frente a desafíos climáticos." },
  { v: "Salvatrix", l: "Especie silvestre", e: "salvatrix", c: "Especie silvestre africana; destaca por su bajo contenido de cafeína y presencia del marcador bioquímico amargo exclusivo llamado mozambioside." },
  { v: "Pseudozanguebariae", l: "Taxón de África Oriental", e: "pseudozanguebariae", c: "Originaria del este de África; altamente adaptada a la sequía y caracterizada por una composición rica en trigonelina y mozambioside." },
  { v: "Anthonyi", l: "Especie autocompatible", e: "anthonyi", c: "Especie diploide autocompatible; recurso genético clave para desarrollar variedades comerciales que no requieran polinización cruzada externa para reproducirse." },
  { v: "Heterocalyx", l: "Especie autógama", e: "heterocalyx", c: "Especie autógama del Congo; de gran interés científico para asegurar la producción uniforme de semillas en entornos con climas variables." },
];

export const DEP_MUNI: Record<string, string[]> = {
  "Multi-Origin": ["Multi-Origin"],
  "Santander": ["Aratoca", "Barbosa", "Barichara", "Barrancabermeja", "Bucaramanga", "California", "Capitanejo", "Charalá", "Charta", "Cimitarra", "Concepción", "Curití", "El Carmen de Chucurí", "Floridablanca", "Girón", "Guadalupe", "La Belleza", "Landázuri", "Lebrija", "Los Santos", "Matanza", "Mogotes", "Málaga", "Oiba", "Palmas del Socorro", "Piedecuesta", "Pinchote", "Puente Nacional", "Puerto Wilches", "Rionegro", "Sabana de Torres", "San Gil", "San Vicente de Chucurí", "Simacota", "Socorro", "Suaita", "Suratá", "Tona", "Vetas", "Villanueva", "Vélez", "Zapatoca"],
  "Norte de Santander": ["Arboledas", "Bochalema", "Bucarasica", "Chinácota", "Chitagá", "Convención", "Cucutilla", "Cáchira", "Cácota", "Cúcuta", "Durania", "El Carmen", "El Tarra", "El Zulia", "Gramalote", "Hacarí", "Herrán", "La Esperanza", "La Playa de Belén", "Labateca", "Los Patios", "Lourdes", "Mutiscua", "Ocaña", "Pamplona", "Pamplonita", "Puerto Santander", "Ragonvalia", "Salazar de Las Palmas", "San Calixto", "San Cayetano", "Santiago", "Sardinata", "Silos", "Teorama", "Tibú", "Toledo", "Villa Caro", "Villa del Rosario", "Ábrego"],
  "Antioquia": ["Abejorral", "Abriaquí", "Alejandría", "Amagá", "Amalfi", "Andes", "Angelópolis", "Angostura", "Anorí", "Anzá", "Apartadó", "Arboletes", "Argelia", "Armenia", "Barbosa", "Bello", "Belmira", "Betania", "Betulia", "Briceño", "Buriticá", "Caicedo", "Caldas", "Campamento", "Caracolí", "Caramanta", "Carepa", "Carmen de Viboral", "Carolina del Príncipe", "Caucasia", "Cañasgordas", "Chigorodó", "Cisneros", "Ciudad Bolívar", "Cocorná", "Concepción", "Concordia", "Copacabana", "Cáceres", "Dabeiba", "Donmatías", "Ebéjico", "El Bagre", "El Carmen de Viboral", "El Peñol", "El Retiro", "El Santuario", "Entrerríos", "Envigado", "Fredonia", "Frontino", "Giraldo", "Girardota", "Granada", "Guadalupe", "Guarne", "Guatapé", "Gómez Plata", "Heliconia", "Hispania", "Itagüí", "Ituango", "Jardín", "Jericó", "La Ceja", "La Estrella", "La Pintada", "La Unión", "Liborina", "Maceo", "Marinilla", "Medellín", "Montebello", "Murindó", "Mutatá", "Nariño", "Nechí", "Necoclí", "Olaya", "Peque", "Pueblorrico", "Puerto Berrío", "Puerto Nare", "Puerto Triunfo", "Remedios", "Rionegro", "Sabanalarga", "Sabaneta", "Salgar", "San Andrés de Cuerquia", "San Carlos", "San Francisco", "San Jerónimo", "San José de la Montaña", "San Juan de Urabá", "San Luis", "San Pedro de Urabá", "San Pedro de los Milagros", "San Rafael", "San Roque", "San Vicente Ferrer", "Santa Bárbara", "Santa Fe de Antioquia", "Santa Rosa de Osos", "Santo Domingo", "Segovia", "Sonsón", "Sopetrán", "Tarazá", "Tarso", "Titiribí", "Toledo", "Turbo", "Támesis", "Uramita", "Urrao", "Valdivia", "Valparaíso", "Vegachí", "Venecia", "Vigía del Fuerte", "Yalí", "Yarumal", "Yolombó", "Yondó", "Zaragoza"],
  "Huila": ["Acevedo", "Aipe", "Algeciras", "Altamira", "Baraya", "Campoalegre", "Colombia", "El Agrado", "Elías", "Garzón", "Gigante", "Guadalupe", "Hobo", "Isnos", "La Argentina", "La Plata", "Neiva", "Nátaga", "Oporapa", "Paicol", "Paipa", "Palermo", "Palestina", "Pital", "Pitalito", "Rivera", "Saladoblanco", "San Agustín", "Santa María", "Suaza", "Tarqui", "Tello", "Teruel", "Tesalia", "Timaná", "Villavieja", "Yaguará", "Íquira"],
  "Tolima": ["Alpujarra", "Alvarado", "Ambalema", "Anzoátegui", "Armero Guayabal", "Ataco", "Cajamarca", "Carmen de Apicalá", "Casabianca", "Chaparral", "Coello", "Coyaima", "Cunday", "Dolores", "Espinal", "Falan", "Flandes", "Fresno", "Guamo", "Herveo", "Honda", "Ibagué", "Icononzo", "Lérida", "Líbano", "Mariquita", "Melgar", "Murillo", "Natagaima", "Ortega", "Palocabildo", "Piedras", "Planadas", "Prado", "Purificación", "Rioblanco", "Roncesvalles", "Rovira", "Saldaña", "San Antonio", "San Luis", "Santa Isabel", "Suárez", "Valle de San Juan", "Venadillo", "Villahermosa", "Villarrica"],
  "Nariño": ["Albán", "Aldana", "Ancuya", "Arboleda", "Barbacoas", "Belén", "Buesaco", "Chachagüí", "Colón", "Consacá", "Contadero", "Cuaspud", "Cumbal", "Cumbitara", "Córdoba", "El Charco", "El Peñol", "El Rosario", "El Tablón de Gómez", "El Tambo", "Francisco Pizarro", "Funes", "Guachucal", "Guaitarilla", "Gualmatán", "Iles", "Imués", "Ipiales", "La Cruz", "La Florida", "La Llanada", "La Tola", "La Unión", "Leiva", "Linares", "Los Andes", "Magüí Payán", "Mallama", "Mosquera", "Nariño", "Olaya Herrera", "Ospina", "Pasto", "Policarpa", "Potosí", "Providencia", "Puerres", "Pupiales", "Ricaurte", "Roberto Payán", "Samaniego", "San Bernardo", "San Lorenzo", "San Pablo", "San Pedro de Cartago", "Sandoná", "Santa Bárbara", "Santacruz", "Sapuyes", "Taminango", "Tangua", "Tumaco", "Túquerres", "Yacuanquer"],
  "Cauca": ["Cajibío", "El Tambo", "Inzá", "La Sierra", "Morales", "Piendamó", "Silvia", "Sotará", "Timbío", "Toribío"],
  "Caldas": ["Aguadas", "Anserma", "Chinchiná", "Manizales", "Manzanares", "Neira", "Palestina", "Pensilvania", "Riosucio", "Villamaría"],
  "Risaralda": ["Apía", "Balboa", "Belén de Umbría", "Guática", "Marsella", "Mistrató", "Pereira", "Quinchía", "Santa Rosa de Cabal", "Santuario"],
  "Quindío": ["Armenia", "Buenavista", "Calarcá", "Circasia", "Filandia", "Génova", "Montenegro", "Pijao", "Quimbaya", "Salento"],
  "Valle del Cauca": ["Ansermanuevo", "Bolívar", "Caicedonia", "Calima El Darién", "El Cairo", "El Águila", "Restrepo", "Sevilla", "Trujillo", "Versalles"],
  "Magdalena": ["Ciénaga", "Fundación", "Santa Marta"],
  "Cesar": ["Codazzi", "La Paz", "Pueblo Bello", "Valledupar"],
  "La Guajira": ["San Juan del Cesar", "Villanueva"],
  "Cundinamarca": ["Fusagasugá", "La Mesa", "San Juan de Rioseco", "Tibacuy", "Viotá"],
  "Boyacá": ["Chitaraque", "Miraflores", "Moniquirá", "Togüí", "Zetaquira"],
  "Meta": ["Lejanías", "Mesetas", "San Juan de Arama"],
  "Caquetá": ["El Doncello", "Florencia"],
  "Casanare": ["Nunchía", "Támara"],
  "Putumayo": ["Mocoa", "Sibundoy"],
  "Arauca": ["Tame"],
  "Chocó": ["El Carmen de Atrato"],
};

// Only green (unroasted) commercial coffee + subproducts -- CTC exports green
// coffee, so the roasted (0901.21/22) and seed-stock (0901.11.10) HS codes were
// dropped.
export const HS_CODES: [string, string][] = [
  ["Café verde comercial — Sin descafeinar, sin tostar", "0901.11.90.00"],
  ["Café verde comercial — Descafeinado, sin tostar", "0901.12.00.00"],
  ["Otros subproductos del café (cáscaras, pieles y sucedáneos)", "0901.90.00.00"],
];

// B1 physical measurements that are optional -- the producer may not know them
// yet. Each can be marked "No lo sé aún" (key stored in b1_unknown); when so,
// its `why` line is added to the reassurance message on "Completar FT y
// continuar". field = the FichaFormData input it controls.
export const B1_OPTIONAL_FIELDS: { key: string; field: "green_bean_humidity" | "green_bean_density" | "water_activity" | "yield_factor_producer"; why: string }[] = [
  { key: "humidity", field: "green_bean_humidity", why: "La humedad del grano define la estabilidad del café durante el almacenamiento." },
  { key: "density", field: "green_bean_density", why: "La densidad del grano se relaciona con la altitud de cultivo y la firmeza física." },
  { key: "water_activity", field: "water_activity", why: "La actividad de agua (aW) anticipa el riesgo de moho mejor que la humedad por sí sola." },
  { key: "yield_factor", field: "yield_factor_producer", why: "El factor de rendimiento indica cuánto café verde exportable rinde su pergamino." },
];

export const ORIGIN_CERTS: [string, string][] = [
  ["origin_cert_dor", "(DOR) Denominación de Origen Regional"],
  ["origin_cert_do", "(DO) Denominación de Origen Protegida"],
  ["origin_cert_igp", "(IGP) Indicación Geográfica Protegida"],
  ["origin_cert_fedecafe", "Café de Colombia (FEDECAFE)"],
];

export const CERT_INFO: Record<string, string> = {
  origin_cert_dor: "Certificación regional colombiana que vincula el lote a una región cafetera específica con características reconocidas.",
  origin_cert_do: "Protección legal que garantiza que el café proviene de una zona geográfica delimitada con cualidades propias de ese origen.",
  origin_cert_igp: "Distintivo que vincula la calidad o reputación del café a su origen geográfico, sin exigir el mismo rigor que una DO.",
  origin_cert_fedecafe: "Sello de la Federación Nacional de Cafeteros de Colombia que certifica el origen 100% colombiano del café.",
  intl_eudr: "Reglamento europeo (UE) 2023/1115: exige probar que el café no proviene de tierras deforestadas después de diciembre de 2020. Obligatorio para exportar a la UE.",
  intl_rainforest: "Certifica prácticas de sostenibilidad ambiental y social en la finca, incluyendo conservación de bosque y bienestar de trabajadores.",
  intl_organic: "Certifica la ausencia de agroquímicos sintéticos durante el cultivo y el procesamiento, bajo los estándares USDA, UE o JAS.",
  intl_eujas: "Equivalencia entre los estándares orgánicos de la Unión Europea y Japón (JAS), útil para exportar a ambos mercados con un solo certificado.",
  intl_birdfriendly: "Certificación del Smithsonian Migratory Bird Center para café cultivado bajo sombra que preserva hábitat de aves migratorias.",
  intl_foe: "Certificación internacional de sostenibilidad ambiental otorgada por la red Friend of the Earth.",
  intl_iwca: "International Women's Coffee Alliance: reconoce la participación activa de mujeres en la producción y la cadena de valor del café.",
  intl_cafe: "Programa propio de Starbucks (Coffee and Farmer Equity) que evalúa calidad, prácticas responsables y trazabilidad.",
  intl_bpa: "Estándar de Buenas Prácticas Agrícolas: manejo responsable del cultivo, uso seguro de insumos y trazabilidad básica.",
  intl_fairtrade: "Garantiza un precio mínimo y condiciones comerciales justas para el productor, certificado por Fairtrade International (FLO).",
  intl_spp: "Símbolo de Pequeños Productores: sello de comercio justo administrado directamente por organizaciones de pequeños productores.",
  intl_fairtradeusa: "Versión estadounidense del sello de comercio justo, con estándares propios de Fairtrade USA.",
  intl_demeter: "Certificación de agricultura biodinámica; más estricta que la orgánica en cuanto a manejo del suelo y los ciclos naturales.",
  intl_nespresso: "Programa propio de calidad y sostenibilidad de Nespresso (AAA Sustainable Quality Program).",
  intl_globalgap: "Estándar internacional de buenas prácticas agrícolas, seguridad alimentaria y trazabilidad, reconocido globalmente.",
};

export const INTL_CERTS: [string, string, string][] = [
  ["intl_eudr", "Regulatorio", "EUDR (EU 2023/1115)"],
  ["intl_rainforest", "Sostenibilidad", "Rainforest Alliance"],
  ["intl_organic", "Sostenibilidad", "Orgánico (USDA / EU / JAS)"],
  ["intl_eujas", "Sostenibilidad", "EU JAS"],
  ["intl_birdfriendly", "Sostenibilidad", "Bird-Friendly (SMBC)"],
  ["intl_foe", "Sostenibilidad", "Friend of the Earth"],
  ["intl_iwca", "Sostenibilidad", "IWCA"],
  ["intl_cafe", "Calidad", "C.A.F.E. (Starbucks)"],
  ["intl_bpa", "Calidad", "BPA (Buenas Prácticas Agrícolas)"],
  ["intl_fairtrade", "Comercio", "Fairtrade (FLO)"],
  ["intl_spp", "Comercio", "SPP – Símbolo Pequeños Productores"],
  ["intl_fairtradeusa", "Comercio", "Fairtrade USA"],
  ["intl_demeter", "Especializado", "Demeter (Biodinámico)"],
  ["intl_nespresso", "Especializado", "Nespresso AAA"],
  ["intl_globalgap", "Especializado", "GLOBALG.A.P"],
];

export const SCA_ATTRS: [string, string][] = [
  ["fragrance", "Fragrance/Aroma"], ["flavor", "Flavor"], ["aftertaste", "Aftertaste"],
  ["acidity", "Acidity"], ["body", "Body"], ["balance", "Balance"],
  ["uniformity", "Uniformity"], ["clean_cup", "Clean Cup"], ["sweetness", "Sweetness"],
  ["cuppers", "Cupper's Score"],
];

export const MESH: [string, string][] = [
  ["mesh_supremo_plus", "Supremo + (M18)"], ["mesh_supremo", "Supremo (M17)"],
  ["mesh_extra", "Extra (M16)"], ["mesh_europa", "Europa (M15)"],
  ["mesh_ugq", "UGQ (M14)"], ["mesh_peaberry", "Pea Berry (M13–12)"], ["mesh_residue", "Residuo"],
];

export type VarietyRow = { pct: string; name: string };

export type FichaFormData = {
  // A1 — Identidad & Comercio
  product_name: string; razon_social: string; nit_rut: string; ctc_uid: string;
  productor: string; species: string; revision_date: string; product_type: string;
  hs_code: string; harvest_year: string; harvest_season: string;
  // A2 — Origen
  origin_category: string; estate: string; country: string; region_dep: string;
  county_muni: string; county_muni_text: string; masl: string; geo_ref: string;
  plantation_age: string; multi_origin_specs: string;
  // Only used when origin_category !== "Single Estate" -- lets a blend draw from
  // more than one of the producer's own registered fincas. Stores real finca ids
  // (not names) so each origin's EUDR status can actually be rolled up -- see
  // src/lib/eudr.ts.
  additional_estate_ids: string[];
  // A3 — Certificados de Origen
  origin_cert_dor: boolean; origin_cert_do: boolean; origin_cert_igp: boolean; origin_cert_fedecafe: boolean;
  origin_cert_other: boolean; origin_cert_other_text: string; awards: string; about_origin: string;
  // A4 — Certificados Internacionales
  intl_eudr: boolean; intl_rainforest: boolean; intl_organic: boolean; intl_eujas: boolean;
  intl_birdfriendly: boolean; intl_foe: boolean; intl_iwca: boolean; intl_cafe: boolean;
  intl_bpa: boolean; intl_fairtrade: boolean; intl_spp: boolean; intl_fairtradeusa: boolean;
  intl_demeter: boolean; intl_nespresso: boolean; intl_globalgap: boolean;
  intl_other: boolean; intl_cert_other_text: string;
  // Archivos de soporte para certificados marcados en A3/A4, por clave de certificado
  cert_attachments: Record<string, { assetId: string; fileName: string }>;
  // A5 — EUDR / Debida Diligencia. Fuente de verdad real son las columnas de `lots`
  // (para que BCP pueda leer/editarlas directo) -- estos campos viajan aquí solo
  // para que el pane se edite igual que el resto de la Ficha; ver FichaView.tsx.
  eudr_custody_stages: string[];
  // "ctc_standard" = CTC Parchment Storage Standard (sacos de yute + liner
  // hermético + tarjeta indicadora de humedad + QR del lote); "custom" = the
  // producer describes their own method in eudr_custody_notes.
  eudr_custody_method: "" | "ctc_standard" | "custom";
  eudr_custody_notes: string;
  eudr_country_risk: string;
  eudr_chain_complexity: string;
  eudr_product_risk: string;
  eudr_illegality_indicators: boolean | null;
  eudr_docs_available: boolean | null;
  eudr_cert_scheme: string;
  eudr_risk_level: "" | "insignificante" | "no_insignificante";
  eudr_mitigation_actions: string;
  eudr_mitigation_effective: boolean | null;
  eudr_mitigation_responsible: string;
  // B1 — Variedades & Caracterización Básica
  varieties: VarietyRow[];
  green_bean_humidity: string; green_bean_density: string; water_activity: string;
  base_processing: string; special_processing: string; yield_factor_producer: string;
  // Keys (see B1_OPTIONAL_FIELDS) the producer marked "No lo sé aún" -- these
  // physical measurements are optional; CTC determines them on evaluation.
  b1_unknown: string[];
  // B2 — Perfil de Taza · SCA
  cupping_profile: string;
  sca_fragrance: string; sca_flavor: string; sca_aftertaste: string; sca_acidity: string;
  sca_body: string; sca_balance: string; sca_uniformity: string; sca_clean_cup: string;
  sca_sweetness: string; sca_cuppers: string;
  // B3 — Caracterización Física · Granulometría & Factor
  fa_green_remainder: string; fa_start: string; fa_parch_hum: string;
  fa_primary_defect: string; fa_secondary_defect: string;
  mesh_supremo_plus: string; mesh_supremo: string; mesh_extra: string; mesh_europa: string;
  mesh_ugq: string; mesh_peaberry: string; mesh_residue: string;
  // B4 — Notas & Referencias Q-Grader
  analysis_notes: string; qgrader_1: string; qgrader_2: string; qgrader_3: string;
  // FT2 sub-stage: A3/A4/B2/B3 can each be explicitly declared "no lo sé / no
  // aplica" instead of filled in -- see FichaView.tsx's ft2 gate. Only these
  // four panes get this; A1/A2/B1 (FT) and A5/B4 (EUDR/Video) are always
  // required with real data, no N/A escape hatch.
  ft2_a3_na: boolean;
  ft2_a4_na: boolean;
  ft2_b2_na: boolean;
  ft2_b3_na: boolean;
};

export const EMPTY_FICHA: FichaFormData = {
  product_name: "", razon_social: "", nit_rut: "", ctc_uid: "",
  productor: "", species: "", revision_date: "", product_type: "",
  hs_code: "", harvest_year: "", harvest_season: "",
  origin_category: "", estate: "", country: "", region_dep: "",
  county_muni: "", county_muni_text: "", masl: "", geo_ref: "",
  plantation_age: "", multi_origin_specs: "",
  additional_estate_ids: [],
  origin_cert_dor: false, origin_cert_do: false, origin_cert_igp: false, origin_cert_fedecafe: false,
  origin_cert_other: false, origin_cert_other_text: "", awards: "", about_origin: "",
  intl_eudr: false, intl_rainforest: false, intl_organic: false, intl_eujas: false,
  intl_birdfriendly: false, intl_foe: false, intl_iwca: false, intl_cafe: false,
  intl_bpa: false, intl_fairtrade: false, intl_spp: false, intl_fairtradeusa: false,
  intl_demeter: false, intl_nespresso: false, intl_globalgap: false,
  intl_other: false, intl_cert_other_text: "",
  cert_attachments: {},
  eudr_custody_stages: [],
  eudr_custody_method: "",
  eudr_custody_notes: "",
  eudr_country_risk: "Estándar",
  eudr_chain_complexity: "",
  eudr_product_risk: "",
  eudr_illegality_indicators: null,
  eudr_docs_available: null,
  eudr_cert_scheme: "",
  eudr_risk_level: "",
  eudr_mitigation_actions: "",
  eudr_mitigation_effective: null,
  eudr_mitigation_responsible: "",
  varieties: [{ pct: "", name: "" }],
  green_bean_humidity: "", green_bean_density: "", water_activity: "",
  base_processing: "", special_processing: "", yield_factor_producer: "",
  b1_unknown: [],
  cupping_profile: "",
  sca_fragrance: "", sca_flavor: "", sca_aftertaste: "", sca_acidity: "",
  sca_body: "", sca_balance: "", sca_uniformity: "", sca_clean_cup: "",
  sca_sweetness: "", sca_cuppers: "",
  fa_green_remainder: "", fa_start: "", fa_parch_hum: "",
  fa_primary_defect: "", fa_secondary_defect: "",
  mesh_supremo_plus: "", mesh_supremo: "", mesh_extra: "", mesh_europa: "",
  mesh_ugq: "", mesh_peaberry: "", mesh_residue: "",
  analysis_notes: "", qgrader_1: "", qgrader_2: "", qgrader_3: "",
  ft2_a3_na: false, ft2_a4_na: false, ft2_b2_na: false, ft2_b3_na: false,
};

export const num = (v: string) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

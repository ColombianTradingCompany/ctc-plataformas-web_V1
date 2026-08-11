"use client";

import { useState } from "react";
import { InfoPanel, type InfoEntry } from "@/components/InfoPanel";
import { useLang, type Lang } from "@/components/lang/i18n";
import styles from "./FaqSection.module.css";

// ── Preguntas frecuentes (2026-08-11) ────────────────────────────────────────
// Esta sección NO es contenido nuevo: es el desagüe de la reforma. Al dejar la
// página en franjas y titulares, se cayeron del recorrido bloques que decían
// cosas que un caficultor necesita saber antes de abrir una cuenta — cuánto
// cuesta, qué pasa si no gana, cómo se pacta el precio, qué es el EUDR, qué es
// Cherry Picked, los cinco pasos para participar.
//
// Nada de eso se tiró. Vive aquí, en once fichas que se abren al tocarlas: quien
// viene a mirar recorre la página sin tropezar con letra pequeña, y quien viene
// a decidir encuentra TODA la letra pequeña junta y en un solo sitio.
//
// Las respuestas son las de los bloques originales, no un resumen: si el owner
// cambia una cifra, este es el archivo donde se cambia.

type Faq = { q: string; lead: string; bullets: string[] };

type Dict = {
  eyebrow: string;
  h2: string;
  h2em: string;
  intro: string;
  hint: string;
  groups: { label: string; items: Faq[] }[];
};

const T: Record<Lang, Dict> = {
  es: {
    eyebrow: "Preguntas frecuentes",
    h2: "Todo lo que hay que saber ",
    h2em: "antes de abrir una cuenta.",
    intro:
      "La letra pequeña, junta y sin rodeos. Toque cualquier pregunta para ver la respuesta completa.",
    hint: "Toque una pregunta",
    groups: [
      {
        label: "Empezar",
        items: [
          {
            q: "¿Qué es Kaffetal Regal?",
            lead:
              "El portal donde un caficultor colombiano registra lo suyo, lo mide contra un panel profesional y —si la taza habla— llega a Europa con su nombre puesto.",
            bullets: [
              "Durante generaciones el café colombiano salió al mundo sin el nombre de quien lo hizo posible. Kaffetal Regal existe para acabar con eso.",
              "Usted registra su finca y arma la ficha de sus lotes sin pagar nada, e inscribe a la Arena el lote que quiera medir.",
              "Se presenta a ciegas ante Q-Graders. Si su taza habla, entra con nombre propio a Cherry Picked, nuestra vitrina de microlotes en Europa.",
              "Y si esta vez no alcanza el galardón, la inscripción igual le deja algo que ningún intermediario le ha dado jamás: una evaluación seria, una certificación y el mapa exacto de cómo mejorar.",
            ],
          },
          {
            q: "¿Cómo participo, paso a paso?",
            lead:
              "Cinco pasos entre su lote y la Arena, todos desde su cuenta y a su ritmo. En cada uno hay un video de capacitación esperándolo.",
            bullets: [
              "1 · Cree su cuenta gratis. Su información general se registra una sola vez: razón social, identificación legal (NIT/CC) y nombre del agricultor. Cinco minutos, sin costo.",
              "2 · Registre sus fincas. Un proveedor puede tener varias, cada una con su ubicación completa, geolocalización (requisito EUDR), altura, historia y características.",
              "3 · Llene la ficha técnica del lote. Cada café se asocia a una de sus fincas y hereda su origen; usted completa variedades, proceso, perfil y caracterización física.",
              "4 · Adjunte sus videos. De 1 a 2 minutos cada uno: usted y su equipo, cada finca, cada café con su cosecha y beneficio. Con el celular y buena luz queda perfecto.",
              "5 · Inscriba el lote y envíe la muestra: 2 kg de pergamino a nuestro laboratorio, por su cuenta. Con la inscripción al día y la muestra recibida, su lote entra en fila para la Arena.",
            ],
          },
          {
            q: "¿Cuánto cuesta?",
            lead:
              "Registrar su finca y armar la ficha no cuesta nada. Solo se paga el lote que decide medir: $80.000 por lote y por cosecha.",
            bullets: [
              "Esos $80.000 cubren la catación profesional a ciegas, el factor de rendimiento, la certificación CTC y el feedback del panel — gane o no gane.",
              "El envío de la muestra de 2 kg de pergamino corre por su cuenta.",
              "¿Su primera vez? Escríbanos: CTC otorga descuentos y exenciones a los productores que quiere ver en la mesa.",
            ],
          },
        ],
      },
      {
        label: "El dinero",
        items: [
          {
            q: "¿Cómo se pacta el precio?",
            lead:
              "CTC no compra el café para revender: nuestro cometido es blindar su contrato comercial. Lo que firma un galardonado es un contrato de opción de compra a 3 meses.",
            bullets: [
              "El precio se pacta el día de la firma con relación al precio de referencia internacional y al precio de referencia de Fedecafé de ese día.",
              "Desde ese momento queda independiente de sus fluctuaciones durante todo el periodo de la temporada.",
              "Ni usted persigue al mercado, ni el tostador en Europa compra a ciegas: el número pactado es el número pagado, con transparencia total en toda la cadena.",
              "La única compra inmediata son los 15 kg de muestras, pagados de entrada.",
            ],
          },
          {
            q: "¿CTC me compra el café?",
            lead:
              "De entrada solo las muestras. El resto se congela a un precio pactado y se paga al corte, cuando el café sale.",
            bullets: [
              "Si su lote es galardonado, CTC le compra de entrada 15 kg de pergamino para muestras.",
              "Su café —con su nombre, su finca y sus videos— queda frente a tostadores de toda Europa en Cherry Picked.",
              "Usted congela una cantidad pactada de su stock por 3 meses bajo las condiciones de venta, y al final de cada mes puede liberar parte si el mercado local le toca la puerta.",
              "Al final del mes 3: corte de cuentas, pago total, despacho a CTC — y renovable.",
            ],
          },
          {
            q: "¿Cuántas oportunidades tengo al año?",
            lead: "Dos. Dos cosechas al año —principal y mitaca— son dos Arenas y dos catálogos en Europa.",
            bullets: [
              "Su café no espera un año para su segunda oportunidad.",
              "Cada cosecha tiene su propia ventana de admisión de lotes, su Arena y su temporada de venta.",
              "Las dos temporadas cubren el año entero sin dejar hueco: abril–julio y agosto–marzo.",
            ],
          },
        ],
      },
      {
        label: "La red",
        items: [
          {
            q: "¿Qué hace CTC exactamente?",
            lead: "De la muestra al contenedor, seis cosas concretas — y ninguna de ellas es comprarle barato.",
            bullets: [
              "Recibe y gestiona el material de muestras: registro, custodia y preparación para el panel.",
              "Administra, cataloga y reporta los resultados de las cataciones profesionales.",
              "Certifica a todos los inscritos, ganen o no, con feedback de mejora del panel.",
              "Publica los lotes galardonados en Cherry Picked: su nombre, su finca, sus videos y su grado.",
              "Confirma por escrito cada aumento de compra a medida que entran pedidos de Europa.",
              "Corte, pago total y logística al final del mes 3: trilla, empaque y consolidación del contenedor.",
            ],
          },
          {
            q: "¿Qué es Cherry Picked?",
            lead:
              "La vitrina de CTC en Europa: la plataforma donde tostadores de todo el continente compran fracciones de los microlotes galardonados en la Arena.",
            bullets: [
              "El nombre del productor, su finca, sus videos y su grado quedan a la vista en cada compra.",
              "Cada tostador que entra mejora la prima que podemos ofrecerle — sin que usted cambie una sola cosa de su café.",
              "Y cada productor que entra hace el catálogo más atractivo, lo que atrae más tostadores. Más red, mejor precio, para todos al mismo tiempo.",
            ],
          },
          {
            q: "¿El camino de mi café, de principio a fin?",
            lead: "Cuatro estaciones, dos veces al año.",
            bullets: [
              "1 · Kaffetal Regal: registra su finca y arma la ficha de su lote.",
              "2 · Cupping Arena: la taza habla, a ciegas, ante Q-Graders invitados.",
              "3 · Certificación CTC: para todos los inscritos, con la retroalimentación del panel.",
              "4 · Cherry Picked: su nombre, en Europa.",
            ],
          },
        ],
      },
      {
        label: "Los papeles",
        items: [
          {
            q: "¿Qué es el EUDR y por qué me importa?",
            lead:
              "Es el Reglamento (UE) 2023/1115 contra la deforestación. La Unión Europea solo permite comercializar café que demuestre no estar vinculado a deforestación — y aplica a todo café que toque puerto europeo, incluido el suyo.",
            bullets: [
              "Libre de deforestación: el café debe provenir de predios donde no haya habido deforestación después del 31 de diciembre de 2020.",
              "Legalidad: producido conforme a la ley colombiana — tenencia de la tierra, ambiente y derechos laborales.",
              "Geolocalización de cada predio: coordenadas GPS del lugar exacto donde crece el café. Si el predio supera las 4 hectáreas se exige el polígono completo, no solo un punto.",
              "Declaración de debida diligencia presentada en el sistema de la UE antes del despacho; su número de referencia acompaña cada embarque.",
              "El polígono de su finca se levanta UNA vez y vale para toda la vida del predio. Se hace ahora, sirve para siempre.",
            ],
          },
          {
            q: "¿Y si no gano?",
            lead: "Se lleva el diagnóstico. Es lo que otros pagan en dólares y ninguna cooperativa le entrega.",
            bullets: [
              "La certificación CTC es gratuita para todos los inscritos, galardonados o no, e incluye puntaje, perfil sensorial y la retroalimentación de mejora del panel.",
              "Lo que recibe de vuelta queda suyo: es su historial, no el nuestro.",
              "Cada lote que completa suma a un historial que solo usted tiene: qué varietal a qué altura, qué fermentación repite puntaje. Ese acervo se construye cosecha a cosecha y no se compra con dinero.",
            ],
          },
          {
            q: "¿Qué garantiza que lo pactado se cumpla?",
            lead: "Transparencia de punta a punta, y un registro que se puede comprobar años después.",
            bullets: [
              "El trato se firma con cantidades, precios y fechas claras.",
              "Cada evaluación guarda sus testigos físicos y un sello criptográfico verificable (asistido con blockchain).",
              "Ese mismo registro, unido a la geolocalización de su finca, alimenta la trazabilidad que exige el EUDR para entrar a Europa.",
              "Lo pactado se puede comprobar. Siempre.",
            ],
          },
        ],
      },
    ],
  },
  en: {
    eyebrow: "Frequently asked questions",
    h2: "Everything worth knowing ",
    h2em: "before opening an account.",
    intro: "The small print, all together and without detours. Tap any question for the full answer.",
    hint: "Tap a question",
    groups: [
      {
        label: "Getting started",
        items: [
          {
            q: "What is Kaffetal Regal?",
            lead:
              "The portal where a Colombian coffee grower registers what's theirs, measures it against a professional panel and — if the cup speaks — reaches Europe with their name on it.",
            bullets: [
              "For generations Colombian coffee went out into the world without the name of the person who made it possible. Kaffetal Regal exists to end that.",
              "You register your farm and build your lots' datasheet at no cost, and enter into the Arena the lot you want to measure.",
              "You stand blind before Q-Graders. If your cup speaks, you enter Cherry Picked — our microlot storefront in Europe — under your own name.",
              "And if the award doesn't come this time, the entry still leaves you something no middleman ever gave you: a serious evaluation, a certification and the exact map of how to improve.",
            ],
          },
          {
            q: "How do I take part, step by step?",
            lead:
              "Five steps between your lot and the Arena, all from your account and at your own pace. Each one has a training video waiting for you.",
            bullets: [
              "1 · Create your free account. Your general information is registered once: legal name, tax ID and the farmer's name. Five minutes, at no cost.",
              "2 · Register your farms. A supplier can have several, each with full location, geolocation (an EUDR requirement), altitude, history and characteristics.",
              "3 · Fill in the lot datasheet. Each coffee is linked to one of your farms and inherits its origin; you complete varieties, process, profile and physical characterisation.",
              "4 · Attach your videos. One to two minutes each: you and your team, each farm, each coffee with its harvest and milling. A phone and good light is enough.",
              "5 · Enter the lot and send the sample: 2 kg of parchment to our lab, at your cost. With the entry paid and the sample received, your lot joins the queue for the Arena.",
            ],
          },
          {
            q: "How much does it cost?",
            lead:
              "Registering your farm and building the datasheet costs nothing. You only pay for the lot you decide to measure: $80,000 COP per lot, per harvest.",
            bullets: [
              "That fee covers the professional blind cupping, the yield factor, the CTC certification and the panel's feedback — win or lose.",
              "Shipping the 2 kg parchment sample is at your cost.",
              "First time? Write to us: CTC grants discounts and exemptions to the producers it wants at the table.",
            ],
          },
        ],
      },
      {
        label: "The money",
        items: [
          {
            q: "How is the price agreed?",
            lead:
              "CTC doesn't buy your coffee to resell it: our job is to armor your commercial contract. What an awarded producer signs is a 3-month purchase-option contract.",
            bullets: [
              "The price is agreed on signing day against that day's international reference and Fedecafé reference.",
              "From that moment it stays independent of their fluctuations for the whole season.",
              "You don't chase the market, and the roaster in Europe doesn't buy blind: the number agreed is the number paid, with full transparency across the chain.",
              "The only immediate purchase is the 15 kg of samples, paid upfront.",
            ],
          },
          {
            q: "Does CTC buy my coffee?",
            lead:
              "Upfront, only the samples. The rest is frozen at an agreed price and paid at settlement, when the coffee ships.",
            bullets: [
              "If your lot is awarded, CTC buys 15 kg of parchment upfront for samples.",
              "Your coffee — with your name, your farm and your videos — stands before roasters across Europe on Cherry Picked.",
              "You freeze an agreed quantity of your stock for 3 months under the sale conditions, and at the end of each month you can release part of it if the local market knocks.",
              "At the end of month 3: settlement, full payment, dispatch to CTC — and renewable.",
            ],
          },
          {
            q: "How many chances do I get a year?",
            lead: "Two. Two harvests a year — main and mitaca — mean two Arenas and two catalogues in Europe.",
            bullets: [
              "Your coffee doesn't wait a year for its second chance.",
              "Each harvest has its own lot-admission window, its Arena and its sales season.",
              "The two seasons cover the whole year without a gap: April–July and August–March.",
            ],
          },
        ],
      },
      {
        label: "The network",
        items: [
          {
            q: "What exactly does CTC do?",
            lead: "From the sample to the container, six concrete things — and none of them is buying from you cheaply.",
            bullets: [
              "Receives and manages the sample material: registration, custody and preparation for the panel.",
              "Administers, catalogues and reports the results of the professional cuppings.",
              "Certifies every entrant, win or lose, with improvement feedback from the panel.",
              "Publishes awarded lots on Cherry Picked: your name, your farm, your videos and your grade.",
              "Confirms every purchase increase in writing as orders come in from Europe.",
              "Settlement, full payment and logistics at the end of month 3: milling, packing and container consolidation.",
            ],
          },
          {
            q: "What is Cherry Picked?",
            lead:
              "CTC's storefront in Europe: the platform where roasters across the continent buy fractions of the microlots awarded in the Arena.",
            bullets: [
              "The producer's name, farm, videos and grade are in plain sight on every purchase.",
              "Every roaster who joins improves the premium we can offer you — without you changing a single thing about your coffee.",
              "And every producer who joins makes the catalogue more attractive, which draws more roasters. More network, better price, for everyone at once.",
            ],
          },
          {
            q: "What is my coffee's journey, end to end?",
            lead: "Four stations, twice a year.",
            bullets: [
              "1 · Kaffetal Regal: register your farm and build your lot's datasheet.",
              "2 · Cupping Arena: the cup speaks, blind, before invited Q-Graders.",
              "3 · CTC Certification: for every entrant, with the panel's feedback.",
              "4 · Cherry Picked: your name, in Europe.",
            ],
          },
        ],
      },
      {
        label: "The paperwork",
        items: [
          {
            q: "What is the EUDR and why does it matter to me?",
            lead:
              "It is Regulation (EU) 2023/1115 against deforestation. The European Union only allows coffee to be traded if it can prove it isn't linked to deforestation — and it applies to any coffee touching a European port, yours included.",
            bullets: [
              "Deforestation-free: the coffee must come from plots with no deforestation after 31 December 2020.",
              "Legality: produced in line with Colombian law — land tenure, environment and labour rights.",
              "Geolocation of each plot: GPS coordinates of the exact place the coffee grows. Above 4 hectares the full polygon is required, not just a point.",
              "A due-diligence declaration filed in the EU system before dispatch; its reference number travels with every shipment.",
              "Your farm's polygon is surveyed ONCE and holds for the life of the plot. Done now, it serves forever.",
            ],
          },
          {
            q: "And if I don't win?",
            lead: "You keep the diagnosis. It's what others pay for in dollars and no cooperative hands you.",
            bullets: [
              "The CTC certification is free for every entrant, awarded or not, and includes score, sensory profile and the panel's improvement feedback.",
              "What you get back is yours: it's your record, not ours.",
              "Every lot you complete adds to a history only you have: which variety at which altitude, which fermentation repeats a score. That body of knowledge is built harvest by harvest and can't be bought.",
            ],
          },
          {
            q: "What guarantees that what was agreed is honoured?",
            lead: "End-to-end transparency, and a record that can still be verified years later.",
            bullets: [
              "The deal is signed with clear quantities, prices and dates.",
              "Every evaluation keeps its physical witnesses and a verifiable cryptographic seal (blockchain-assisted).",
              "That same record, joined to your farm's geolocation, feeds the traceability the EUDR requires to enter Europe.",
              "What was agreed can be verified. Always.",
            ],
          },
        ],
      },
    ],
  },
  de: {
    eyebrow: "Häufige Fragen",
    h2: "Alles, was man wissen sollte, ",
    h2em: "bevor man ein Konto eröffnet.",
    intro: "Das Kleingedruckte, gesammelt und ohne Umwege. Tippen Sie eine Frage an für die ganze Antwort.",
    hint: "Tippen Sie eine Frage an",
    groups: [
      {
        label: "Anfangen",
        items: [
          {
            q: "Was ist Kaffetal Regal?",
            lead:
              "Das Portal, in dem ein kolumbianischer Kaffeebauer das Seine registriert, es an einem Fachpanel misst und — wenn die Tasse spricht — mit eigenem Namen nach Europa kommt.",
            bullets: [
              "Über Generationen ging kolumbianischer Kaffee ohne den Namen derer in die Welt, die ihn möglich machten. Kaffetal Regal existiert, um damit Schluss zu machen.",
              "Sie registrieren Ihre Finca und erstellen das Datenblatt Ihrer Lots kostenlos und melden das Lot zur Arena an, das Sie messen wollen.",
              "Sie treten blind vor Q-Grader an. Wenn Ihre Tasse spricht, kommen Sie unter eigenem Namen zu Cherry Picked, unserem Microlot-Schaufenster in Europa.",
              "Und wenn es diesmal nicht zur Prämierung reicht, hinterlässt die Anmeldung trotzdem etwas, das Ihnen kein Zwischenhändler je gegeben hat: eine seriöse Bewertung, eine Zertifizierung und die genaue Karte, wie Sie besser werden.",
            ],
          },
          {
            q: "Wie mache ich mit, Schritt für Schritt?",
            lead:
              "Fünf Schritte zwischen Ihrem Lot und der Arena, alle aus Ihrem Konto und in Ihrem Tempo. Zu jedem wartet ein Schulungsvideo.",
            bullets: [
              "1 · Eröffnen Sie Ihr kostenloses Konto. Ihre allgemeinen Daten werden einmal erfasst: Firmenname, Steuernummer und Name des Landwirts. Fünf Minuten, kostenlos.",
              "2 · Registrieren Sie Ihre Fincas. Ein Lieferant kann mehrere haben, jede mit vollständiger Lage, Geolokalisierung (EUDR-Pflicht), Höhe, Geschichte und Merkmalen.",
              "3 · Füllen Sie das Datenblatt des Lots aus. Jeder Kaffee gehört zu einer Ihrer Fincas und erbt deren Ursprung; Sie ergänzen Varietäten, Aufbereitung, Profil und physische Charakterisierung.",
              "4 · Laden Sie Ihre Videos hoch. Je ein bis zwei Minuten: Sie und Ihr Team, jede Finca, jeder Kaffee mit Ernte und Aufbereitung. Handy und gutes Licht genügen.",
              "5 · Melden Sie das Lot an und senden Sie das Muster: 2 kg Pergamino an unser Labor, auf Ihre Kosten. Mit bezahlter Anmeldung und eingegangenem Muster steht Ihr Lot in der Reihe für die Arena.",
            ],
          },
          {
            q: "Was kostet das?",
            lead:
              "Die Finca zu registrieren und das Datenblatt zu erstellen kostet nichts. Bezahlt wird nur das Lot, das Sie messen wollen: 80.000 COP pro Lot und Ernte.",
            bullets: [
              "Das deckt die professionelle Blindverkostung, den Ausbeutefaktor, die CTC-Zertifizierung und das Feedback des Panels — ob Sie gewinnen oder nicht.",
              "Der Versand des 2-kg-Musters geht auf Ihre Kosten.",
              "Ihr erstes Mal? Schreiben Sie uns: CTC gewährt Rabatte und Befreiungen für die Produzenten, die es am Tisch sehen will.",
            ],
          },
        ],
      },
      {
        label: "Das Geld",
        items: [
          {
            q: "Wie wird der Preis vereinbart?",
            lead:
              "CTC kauft Ihren Kaffee nicht zum Weiterverkauf: Unsere Aufgabe ist es, Ihren Handelsvertrag abzusichern. Was ein Prämierter unterschreibt, ist ein Kaufoptionsvertrag über 3 Monate.",
            bullets: [
              "Der Preis wird am Tag der Unterschrift gegen den internationalen Referenzpreis und den Fedecafé-Referenzpreis dieses Tages vereinbart.",
              "Ab diesem Moment bleibt er unabhängig von deren Schwankungen für die gesamte Saison.",
              "Weder jagen Sie dem Markt hinterher, noch kauft der Röster in Europa blind: Die vereinbarte Zahl ist die gezahlte Zahl, mit voller Transparenz entlang der Kette.",
              "Der einzige Sofortkauf sind die 15 kg Muster, im Voraus bezahlt.",
            ],
          },
          {
            q: "Kauft CTC meinen Kaffee?",
            lead:
              "Sofort nur die Muster. Der Rest wird zum vereinbarten Preis eingefroren und bei der Abrechnung bezahlt, wenn der Kaffee hinausgeht.",
            bullets: [
              "Wird Ihr Lot prämiert, kauft CTC sofort 15 kg Pergamino für Muster.",
              "Ihr Kaffee — mit Ihrem Namen, Ihrer Finca und Ihren Videos — steht auf Cherry Picked vor Röstern aus ganz Europa.",
              "Sie frieren eine vereinbarte Menge Ihres Bestands für 3 Monate zu den Verkaufsbedingungen ein und können am Ende jedes Monats einen Teil freigeben, wenn der lokale Markt anklopft.",
              "Am Ende von Monat 3: Abrechnung, volle Zahlung, Versand an CTC — und verlängerbar.",
            ],
          },
          {
            q: "Wie viele Chancen habe ich im Jahr?",
            lead: "Zwei. Zwei Ernten pro Jahr — Haupternte und Mitaca — bedeuten zwei Arenas und zwei Kataloge in Europa.",
            bullets: [
              "Ihr Kaffee wartet kein Jahr auf seine zweite Chance.",
              "Jede Ernte hat ihr eigenes Fenster für die Lot-Zulassung, ihre Arena und ihre Verkaufssaison.",
              "Die beiden Saisons decken das ganze Jahr ohne Lücke ab: April–Juli und August–März.",
            ],
          },
        ],
      },
      {
        label: "Das Netzwerk",
        items: [
          {
            q: "Was macht CTC genau?",
            lead: "Vom Muster bis zum Container sechs konkrete Dinge — und keines davon ist, Ihnen billig abzukaufen.",
            bullets: [
              "Empfängt und verwaltet das Mustermaterial: Registrierung, Verwahrung und Vorbereitung für das Panel.",
              "Verwaltet, katalogisiert und berichtet die Ergebnisse der professionellen Verkostungen.",
              "Zertifiziert alle Angemeldeten, ob sie gewinnen oder nicht, mit Verbesserungs-Feedback des Panels.",
              "Veröffentlicht die prämierten Lots auf Cherry Picked: Ihr Name, Ihre Finca, Ihre Videos und Ihr Grad.",
              "Bestätigt jede Kauferhöhung schriftlich, sobald Bestellungen aus Europa eingehen.",
              "Abrechnung, volle Zahlung und Logistik am Ende von Monat 3: Schälung, Verpackung und Konsolidierung des Containers.",
            ],
          },
          {
            q: "Was ist Cherry Picked?",
            lead:
              "Das Schaufenster von CTC in Europa: die Plattform, auf der Röster des ganzen Kontinents Fraktionen der in der Arena prämierten Microlots kaufen.",
            bullets: [
              "Name des Produzenten, Finca, Videos und Grad sind bei jedem Kauf sichtbar.",
              "Jeder Röster, der dazukommt, verbessert die Prämie, die wir Ihnen bieten können — ohne dass Sie an Ihrem Kaffee irgendetwas ändern.",
              "Und jeder Produzent, der dazukommt, macht den Katalog attraktiver, was mehr Röster anzieht. Mehr Netz, besserer Preis, für alle zugleich.",
            ],
          },
          {
            q: "Der Weg meines Kaffees, von Anfang bis Ende?",
            lead: "Vier Stationen, zweimal im Jahr.",
            bullets: [
              "1 · Kaffetal Regal: Finca registrieren und das Datenblatt des Lots erstellen.",
              "2 · Cupping Arena: Die Tasse spricht, blind, vor eingeladenen Q-Gradern.",
              "3 · CTC-Zertifizierung: für alle Angemeldeten, mit dem Feedback des Panels.",
              "4 · Cherry Picked: Ihr Name, in Europa.",
            ],
          },
        ],
      },
      {
        label: "Die Papiere",
        items: [
          {
            q: "Was ist die EUDR und warum betrifft sie mich?",
            lead:
              "Es ist die Verordnung (EU) 2023/1115 gegen Entwaldung. Die Europäische Union lässt nur Kaffee zu, der nachweislich nicht mit Entwaldung verbunden ist — und sie gilt für jeden Kaffee, der einen europäischen Hafen berührt, auch für Ihren.",
            bullets: [
              "Entwaldungsfrei: Der Kaffee muss von Flächen stammen, auf denen es nach dem 31. Dezember 2020 keine Entwaldung gab.",
              "Legalität: erzeugt nach kolumbianischem Recht — Landbesitz, Umwelt und Arbeitsrechte.",
              "Geolokalisierung jeder Fläche: GPS-Koordinaten des genauen Orts, an dem der Kaffee wächst. Über 4 Hektar wird das vollständige Polygon verlangt, nicht nur ein Punkt.",
              "Eine Sorgfaltserklärung, vor dem Versand im EU-System eingereicht; ihre Referenznummer begleitet jede Verschiffung.",
              "Das Polygon Ihrer Finca wird EINMAL erhoben und gilt für die gesamte Lebensdauer der Fläche. Jetzt gemacht, für immer gültig.",
            ],
          },
          {
            q: "Und wenn ich nicht gewinne?",
            lead: "Sie behalten die Diagnose. Sie ist das, wofür andere in Dollar zahlen und was Ihnen keine Kooperative gibt.",
            bullets: [
              "Die CTC-Zertifizierung ist für alle Angemeldeten kostenlos, prämiert oder nicht, und enthält Punktzahl, sensorisches Profil und das Verbesserungs-Feedback des Panels.",
              "Was Sie zurückbekommen, gehört Ihnen: Es ist Ihre Historie, nicht unsere.",
              "Jedes abgeschlossene Lot ergänzt eine Historie, die nur Sie haben: welche Varietät in welcher Höhe, welche Fermentation die Punktzahl wiederholt. Dieser Fundus wächst Ernte um Ernte und lässt sich nicht kaufen.",
            ],
          },
          {
            q: "Was garantiert, dass das Vereinbarte eingehalten wird?",
            lead: "Transparenz von Ende zu Ende und ein Eintrag, der noch Jahre später überprüfbar ist.",
            bullets: [
              "Der Vertrag wird mit klaren Mengen, Preisen und Daten unterschrieben.",
              "Jede Bewertung bewahrt ihre physischen Zeugen und ein überprüfbares kryptografisches Siegel (blockchain-gestützt).",
              "Derselbe Eintrag, verbunden mit der Geolokalisierung Ihrer Finca, speist die Rückverfolgbarkeit, die die EUDR für die Einreise nach Europa verlangt.",
              "Das Vereinbarte lässt sich überprüfen. Immer.",
            ],
          },
        ],
      },
    ],
  },
};

export function FaqSection() {
  const t = T[useLang()];
  const [entry, setEntry] = useState<InfoEntry | null>(null);

  return (
    <section id="faq">
      <div className="wrap">
        <div className="sec-head">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h2>
              {t.h2}
              <em>{t.h2em}</em>
            </h2>
          </div>
          <p>{t.intro}</p>
        </div>

        <p className={styles.hint}>{t.hint}</p>

        <div className={styles.groups}>
          {t.groups.map((g) => (
            <div className={styles.group} key={g.label}>
              <p className={styles.groupLabel}>{g.label}</p>
              <ul className={styles.list}>
                {g.items.map((f) => (
                  <li key={f.q}>
                    <button
                      className={styles.q}
                      onClick={() =>
                        setEntry({
                          key: f.q,
                          eyebrow: g.label,
                          title: f.q,
                          lead: f.lead,
                          bullets: f.bullets,
                          accent: "var(--accent)",
                        })
                      }
                    >
                      <span>{f.q}</span>
                      <i aria-hidden>+</i>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <InfoPanel entry={entry} onClose={() => setEntry(null)} />
    </section>
  );
}

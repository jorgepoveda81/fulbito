// Catalogo de jugadores de FULBITO. Todos los de tipo 'field' suman exactamente
// 11 puntos entre sus 5 habilidades (seccion 3 de las reglas); los 'keeper' suman 7.
// Ningun jugador de la tienda es "mejor" que otro en total, solo tiene otra forma
// de repartir los mismos puntos: es coleccionar variedad, no comprar ventaja.
//
// Para agregar un jugador nuevo: copia un objeto, cambia nombre/skills/costo y
// fíjate que la suma siga dando 11 (o 7 para arquero). Si no da justo, el
// jugador no se puede usar (se valida al guardar el equipo).

export const FIELD_SKILL_SUM = 11;
export const KEEPER_SKILL_SUM = 7;

export const TEAM_COLOR_PALETTE = [
  '#2f6fe0', '#e0432f', '#2fa84f', '#9b59ff',
  '#ff8c2f', '#2fd0c0', '#ff4fa0', '#ffd23f',
];

// Patron de la camiseta: puramente visual, se dibuja sobre el mismo circulo de
// siempre (ver fillPlayerCircle en js/game.js). Nunca cambia una habilidad.
export const TEAM_KIT_PATTERNS = [
  { id: 'solid', name: 'Solida' },
  { id: 'stripes', name: 'Rayas' },
  { id: 'sash', name: 'Franja' },
  { id: 'hoop', name: 'Aro' },
];

export function sumSkills(skills){
  return Object.values(skills).reduce((a, b) => a + (Number(b) || 0), 0);
}

// El equipo con el que arranca cualquier cuenta nueva, gratis (cost: 0).
export const STARTER_ROSTER = [
  { id:'st-gk',  type:'keeper', role:'Arquero',        name:'Manolo Manos de Piedra', rarity:'comun', cost:0,
    skills:{ altura:2, velocidad:2, volada:2, salto:1 } },
  { id:'st-d1',  type:'field',  role:'Defensor',       name:'El Muro',      rarity:'comun', cost:0,
    skills:{ fuerza:3, pase:2, precision:2, tiro:1, defensa:3 } },
  { id:'st-d2',  type:'field',  role:'Defensor',       name:'La Roca',      rarity:'comun', cost:0,
    skills:{ fuerza:3, pase:2, precision:2, tiro:1, defensa:3 } },
  { id:'st-m1',  type:'field',  role:'Mediocampista',  name:'Motorcito',    rarity:'comun', cost:0,
    skills:{ fuerza:2, pase:3, precision:3, tiro:1, defensa:2 } },
  { id:'st-m2',  type:'field',  role:'Mediocampista',  name:'El Cerebro',   rarity:'comun', cost:0,
    skills:{ fuerza:2, pase:3, precision:2, tiro:2, defensa:2 } },
  { id:'st-f1',  type:'field',  role:'Delantero',      name:'Gambeta',      rarity:'comun', cost:0,
    skills:{ fuerza:2, pase:1, precision:3, tiro:4, defensa:1 } },
  { id:'st-c1',  type:'field',  role:'Todoterreno',    name:'El Capi',      rarity:'comun', cost:0,
    skills:{ fuerza:3, pase:2, precision:3, tiro:2, defensa:1 } },
];

// Jugadores que se compran en la tienda con monedas ganadas jugando.
export const STORE_CATALOG = [
  { id:'sh-francotirador', type:'field', role:'Delantero',     name:'Francotirador',      rarity:'rara',       cost:220,
    skills:{ fuerza:1, pase:1, precision:4, tiro:5, defensa:0 } },
  { id:'sh-muralla',       type:'field', role:'Defensor',      name:'Muralla Humana',     rarity:'comun',      cost:100,
    skills:{ fuerza:2, pase:2, precision:1, tiro:1, defensa:5 } },
  { id:'sh-manodedios',    type:'field', role:'Todoterreno',   name:'Mano de Dios',       rarity:'comun',      cost:90,
    skills:{ fuerza:2, pase:2, precision:2, tiro:3, defensa:2 } },
  { id:'sh-rayo',          type:'field', role:'Delantero',     name:'Rayo',               rarity:'rara',       cost:240,
    skills:{ fuerza:5, pase:2, precision:2, tiro:1, defensa:1 } },
  { id:'sh-pasemagico',    type:'field', role:'Mediocampista', name:'El Pase Magico',     rarity:'comun',      cost:110,
    skills:{ fuerza:1, pase:5, precision:2, tiro:1, defensa:2 } },
  { id:'sh-precisionlaser',type:'field', role:'Delantero',     name:'Precision Laser',    rarity:'rara',       cost:230,
    skills:{ fuerza:1, pase:2, precision:5, tiro:2, defensa:1 } },
  { id:'sh-todoterreno',   type:'field', role:'Todoterreno',   name:'Todo Terreno',       rarity:'comun',      cost:90,
    skills:{ fuerza:2, pase:2, precision:3, tiro:2, defensa:2 } },
  { id:'sh-tanque',        type:'field', role:'Defensor',      name:'El Tanque',          rarity:'rara',       cost:220,
    skills:{ fuerza:4, pase:1, precision:1, tiro:1, defensa:4 } },
  { id:'sh-gambetaloca',   type:'field', role:'Delantero',     name:'Gambeta Loca',       rarity:'comun',      cost:120,
    skills:{ fuerza:1, pase:2, precision:4, tiro:3, defensa:1 } },
  { id:'sh-contragolpe',   type:'field', role:'Mediocampista', name:'Contragolpe',        rarity:'comun',      cost:130,
    skills:{ fuerza:4, pase:3, precision:1, tiro:2, defensa:1 } },
  { id:'sh-ultimohombre',  type:'field', role:'Defensor',      name:'Ultimo Hombre',      rarity:'legendaria', cost:420,
    skills:{ fuerza:1, pase:1, precision:1, tiro:1, defensa:7 } },
  { id:'sh-killerdelarea', type:'field', role:'Delantero',     name:'Killer del Area',    rarity:'legendaria', cost:450,
    skills:{ fuerza:1, pase:1, precision:2, tiro:6, defensa:1 } },
  { id:'sh-metronomo',     type:'field', role:'Mediocampista', name:'El Metronomo',       rarity:'comun',      cost:110,
    skills:{ fuerza:1, pase:4, precision:3, tiro:1, defensa:2 } },
  { id:'sh-doblefilo',     type:'field', role:'Todoterreno',   name:'Doble Filo',         rarity:'comun',      cost:100,
    skills:{ fuerza:3, pase:2, precision:2, tiro:3, defensa:1 } },
  { id:'sh-lasombra',      type:'field', role:'Defensor',      name:'La Sombra',          rarity:'comun',      cost:95,
    skills:{ fuerza:2, pase:1, precision:3, tiro:2, defensa:3 } },
  { id:'sh-capitanhierro', type:'field', role:'Todoterreno',   name:'Capitan de Hierro',  rarity:'rara',       cost:210,
    skills:{ fuerza:3, pase:3, precision:2, tiro:2, defensa:1 } },

  { id:'sh-pulpo',   type:'keeper', role:'Arquero', name:'Pulpo',      rarity:'comun',      cost:90,
    skills:{ altura:1, velocidad:2, volada:3, salto:1 } },
  { id:'sh-torre',   type:'keeper', role:'Arquero', name:'Torre',      rarity:'comun',      cost:90,
    skills:{ altura:3, velocidad:1, volada:1, salto:2 } },
  { id:'sh-felino',  type:'keeper', role:'Arquero', name:'Felino',     rarity:'rara',       cost:200,
    skills:{ altura:1, velocidad:4, volada:1, salto:1 } },
  { id:'sh-sanmiguel', type:'keeper', role:'Arquero', name:'San Miguel', rarity:'legendaria', cost:400,
    skills:{ altura:2, velocidad:1, volada:2, salto:2 } },
];

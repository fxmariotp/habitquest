// ─── CLASES ───────────────────────────────────
export const CLASSES = [
  { lv: 1,  name: 'Aprendiz',        nameEn: 'Apprentice',    avatar: '🧙', title: 'El camino comienza',      titleEn: 'The path begins' },
  { lv: 3,  name: 'Iniciado',        nameEn: 'Initiate',      avatar: '🧝', title: 'Los primeros pasos',      titleEn: 'First steps' },
  { lv: 5,  name: 'Viajero',         nameEn: 'Wanderer',      avatar: '🗺️', title: 'Explorando el mundo',     titleEn: 'Exploring the world' },
  { lv: 8,  name: 'Guerrero',        nameEn: 'Warrior',       avatar: '⚔️', title: 'Forjado en combate',      titleEn: 'Forged in battle' },
  { lv: 12, name: 'Campeón',         nameEn: 'Champion',      avatar: '🏆', title: 'Elegido por el destino',  titleEn: 'Chosen by destiny' },
  { lv: 16, name: 'Héroe',           nameEn: 'Hero',          avatar: '🦸', title: 'Leyenda viviente',        titleEn: 'Living legend' },
  { lv: 20, name: 'Maestro',         nameEn: 'Master',        avatar: '🌟', title: 'Domina lo imposible',     titleEn: 'Masters the impossible' },
  { lv: 25, name: 'Gran Maestro',    nameEn: 'Grand Master',  avatar: '👑', title: 'El mundo te conoce',      titleEn: 'The world knows you' },
  { lv: 30, name: 'Semidiós',        nameEn: 'Demigod',       avatar: '⚡', title: 'Más allá de lo humano',   titleEn: 'Beyond human' },
  { lv: 40, name: 'Dios del Hábito', nameEn: 'Habit God',     avatar: '🌌', title: 'Forjador de realidades',  titleEn: 'Forger of realities' },
]

export function getClass(level, lang = 'es') {
  let cls = CLASSES[0]
  CLASSES.forEach(c => { if (level >= c.lv) cls = c })
  return {
    ...cls,
    displayName: lang === 'en' ? cls.nameEn : cls.name,
    displayTitle: lang === 'en' ? cls.titleEn : cls.title,
  }
}

// ─── EXP ──────────────────────────────────────
export const DIFF_EXP = { easy: 20, normal: 40, hard: 80, legendary: 150 }

export function expForLevel(lv) {
  return Math.floor(100 * Math.pow(1.15, lv - 1))
}

export function streakMultiplier(maxStreak) {
  if (maxStreak >= 30) return 2.0
  if (maxStreak >= 14) return 1.5
  if (maxStreak >= 7)  return 1.2
  return 1.0
}

// Devuelve { level, exp, expToNext } después de ganar base EXP con multiplicador
export function applyExp(currentLevel, currentExp, currentExpToNext, baseExp, multi = 1) {
  let exp = currentExp + Math.floor(baseExp * multi)
  let level = currentLevel
  let expToNext = currentExpToNext
  let levelsGained = 0

  while (exp >= expToNext) {
    exp -= expToNext
    level++
    expToNext = expForLevel(level)
    levelsGained++
  }

  return { level, exp, expToNext, levelsGained }
}

// ─── STAT CATEGORIES ──────────────────────────
export const STAT_CATS = {
  body:       ['stat_str', 'stat_vit'],
  mind:       ['stat_wis', 'stat_int'],
  discipline: ['stat_dis'],
  skill:      ['stat_agi', 'stat_int'],
  social:     ['stat_wis', 'stat_dis'],
  other:      [],
}

// ─── POWERUPS ─────────────────────────────────
export const POWERUPS = [
  { id: 'aura_gold',   name: 'Aura dorada',    nameEn: 'Golden aura',   icon: '✨', lv: 3  },
  { id: 'ki_sparks',   name: 'Ki orbitante',   nameEn: 'Orbiting Ki',   icon: '⚡', lv: 5  },
  { id: 'aura_green',  name: 'Aura verde',     nameEn: 'Green aura',    icon: '💚', lv: 7  },
  { id: 'aura_blue',   name: 'Aura arcana',    nameEn: 'Arcane aura',   icon: '💠', lv: 10 },
  { id: 'aura_fire',   name: 'Fuego interior', nameEn: 'Inner fire',    icon: '🔥', lv: 14 },
  { id: 'aura_purple', name: 'Ki oscuro',      nameEn: 'Dark Ki',       icon: '🌑', lv: 20 },
  { id: 'divine',      name: 'Forma divina',   nameEn: 'Divine form',   icon: '🌟', lv: 30 },
]

// ─── LOGROS ───────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'first_habit',    name: 'Primer paso',       nameEn: 'First step',        icon: '👣', desc: 'Completa tu primer hábito',          descEn: 'Complete your first habit',        check: s => s.total_done >= 1 },
  { id: 'streak_3',       name: 'Racha de fuego',    nameEn: 'Fire streak',        icon: '🔥', desc: 'Mantén una racha de 3 días',          descEn: 'Keep a 3-day streak',              check: s => s._maxStreak >= 3 },
  { id: 'streak_7',       name: 'Semana perfecta',   nameEn: 'Perfect week',       icon: '💎', desc: '7 días seguidos',                     descEn: '7 days in a row',                  check: s => s._maxStreak >= 7 },
  { id: 'streak_30',      name: 'Mes invicto',       nameEn: 'Undefeated month',   icon: '🌟', desc: '30 días de racha',                    descEn: '30-day streak',                    check: s => s._maxStreak >= 30 },
  { id: 'level5',         name: 'Viajero',           nameEn: 'Wanderer',           icon: '🗺️', desc: 'Alcanza el nivel 5',                  descEn: 'Reach level 5',                    check: s => s.level >= 5 },
  { id: 'level10',        name: 'Veterano',          nameEn: 'Veteran',            icon: '⚔️', desc: 'Alcanza el nivel 10',                 descEn: 'Reach level 10',                   check: s => s.level >= 10 },
  { id: 'level20',        name: 'Maestro',           nameEn: 'Master',             icon: '👑', desc: 'Alcanza el nivel 20',                 descEn: 'Reach level 20',                   check: s => s.level >= 20 },
  { id: 'exp1000',        name: 'Millar de EXP',     nameEn: 'EXP Thousand',       icon: '💰', desc: 'Acumula 1000 EXP en total',           descEn: 'Accumulate 1000 total EXP',        check: s => s.total_exp >= 1000 },
  { id: 'exp10000',       name: 'Veterano del EXP',  nameEn: 'EXP Veteran',        icon: '💎', desc: 'Acumula 10000 EXP en total',          descEn: 'Accumulate 10000 total EXP',       check: s => s.total_exp >= 10000 },
  { id: 'habits5',        name: 'Coleccionista',     nameEn: 'Collector',          icon: '📦', desc: 'Ten 5 hábitos activos',               descEn: 'Have 5 active habits',             check: s => (s._habitCount || 0) >= 5 },
  { id: 'legendary_done', name: 'Leyenda',           nameEn: 'Legend',             icon: '🟣', desc: 'Completa un hábito legendario',       descEn: 'Complete a legendary habit',       check: s => s._legendaryDone },
  { id: 'goal_done',      name: 'Objetivo cumplido', nameEn: 'Goal achieved',      icon: '🎯', desc: 'Completa tu primer objetivo',         descEn: 'Complete your first goal',         check: s => s.goals_done >= 1 },
  { id: 'done100',        name: 'Centurión',         nameEn: 'Centurion',          icon: '💯', desc: '100 hábitos completados',             descEn: '100 habits completed',             check: s => s.total_done >= 100 },
  { id: 'done365',        name: 'Dios del hábito',   nameEn: 'Habit God',          icon: '🌌', desc: '365 hábitos completados',             descEn: '365 habits completed',             check: s => s.total_done >= 365 },
]

// ─── AVATARES disponibles ──────────────────────
export const AVATARS = ['🧙','🧝','⚔️','🦸','🌟','👑','⚡','🌌','🔥','💎','🐉','🦊','🐺','🦁','🐯','🦅','🌙','☀️','🌊','🏔️']

// ─── Streak icon ──────────────────────────────
export function streakIcon(n) {
  if (n >= 30) return '🌟'
  if (n >= 14) return '💎'
  if (n >= 7)  return '🔥'
  if (n >= 3)  return '⚡'
  return ''
}

// ─── Fecha helpers ────────────────────────────
export function todayStr()   { return new Date().toISOString().split('T')[0] }
export function weekStr()    { const d=new Date(),j=new Date(d.getFullYear(),0,1); return d.getFullYear()+'-W'+Math.ceil(((d-j)/864e5+j.getDay()+1)/7) }
export function monthStr()   { const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1) }

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  getClass, DIFF_EXP, expForLevel, streakMultiplier, applyExp,
  STAT_CATS, ACHIEVEMENTS, todayStr, weekStr, monthStr, streakIcon
} from '../lib/game'
import { playSound } from '../lib/sound'

const DEFAULT_PROFILE = {
  level: 1, exp: 0, exp_to_next: 100,
  total_exp: 0, total_done: 0, goals_done: 0,
  hp: 100, max_hp: 100, mp: 0, max_mp: 50,
  stat_str: 1, stat_vit: 1, stat_int: 1,
  stat_dis: 1, stat_agi: 1, stat_wis: 1,
  class_name: 'Aprendiz', title: 'El camino comienza',
  sound_on: true, language: 'es', avatar_emoji: '🧙',
  display_name: '', username: '',
}

export function useGame(userId) {
  const [profile, setProfile]       = useState(null)
  const [habits, setHabits]         = useState([])
  const [goals, setGoals]           = useState([])
  const [achievements, setAchievements] = useState([])
  const [toasts, setToasts]         = useState([])
  const [loading, setLoading]       = useState(true)
  const profileRef = useRef(null)

  // ── helpers ──────────────────────────────────
  const lang = profile?.language || 'es'
  const soundOn = profile?.sound_on ?? true

  function addToast(big, sub, duration = 2800) {
    const id = Date.now() + Math.random()
    setToasts(t => [...t, { id, big, sub }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration + 400)
  }

  function floatExp(amount, x, y) {
    const el = document.createElement('div')
    el.className = 'exp-float'
    el.textContent = `+${amount} EXP`
    el.style.cssText = `left:${(x||400)-30}px;top:${(y||300)-20}px;`
    document.body.appendChild(el)
    setTimeout(() => el.remove(), 1500)
  }

  // ── load initial data ─────────────────────────
  useEffect(() => {
    if (!userId) return
    loadAll()
  }, [userId])

  async function loadAll() {
    setLoading(true)
    const [{ data: prof }, { data: hab }, { data: gol }, { data: ach }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('habits').select('*').eq('user_id', userId).order('order_idx'),
      supabase.from('goals').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('achievements').select('*').eq('user_id', userId),
    ])
    if (prof) { setProfile(prof); profileRef.current = prof }
    if (hab) setHabits(hab)
    if (gol) setGoals(gol)
    if (ach) setAchievements(ach)

    // daily reset check
    await checkDailyReset(prof, hab)
    setLoading(false)
  }

  // ── daily / weekly / monthly reset ───────────
  async function checkDailyReset(prof, habList) {
    if (!prof || !habList) return
    const { data: reset } = await supabase
      .from('daily_resets').select('*').eq('user_id', userId).single()
    if (!reset) return

    const today = todayStr()
    const week  = weekStr()
    const month = monthStr()
    let profileUpdates = {}
    let needsSave = false

    if (reset.last_reset !== today) {
      // process yesterday's habits
      const updates = []
      for (const h of habList) {
        if (h.done_today) {
          const newStreak = (h.streak || 0) + 1
          const newBest   = Math.max(newStreak, h.best_streak || 0)
          updates.push(supabase.from('habits').update({ done_today: false, streak: newStreak, best_streak: newBest }).eq('id', h.id))
        } else {
          if ((h.streak || 0) > 0) {
            updates.push(supabase.from('habits').update({ done_today: false, streak: 0 }).eq('id', h.id))
          } else {
            updates.push(supabase.from('habits').update({ done_today: false }).eq('id', h.id))
          }
        }
      }
      await Promise.all(updates)
      needsSave = true
    }

    // weekly reset
    if (reset.last_week !== week) {
      await supabase.from('goals').update({ progress: 0 }).eq('user_id', userId).eq('type', 'weekly')
      needsSave = true
    }

    // monthly reset
    if (reset.last_month !== month) {
      await supabase.from('goals').update({ progress: 0 }).eq('user_id', userId).eq('type', 'monthly')
      needsSave = true
    }

    if (needsSave) {
      await supabase.from('daily_resets')
        .update({ last_reset: today, last_week: week, last_month: month })
        .eq('user_id', userId)
      // reload habits after reset
      const { data: fresh } = await supabase.from('habits').select('*').eq('user_id', userId).order('order_idx')
      if (fresh) setHabits(fresh)
      const { data: freshGoals } = await supabase.from('goals').select('*').eq('user_id', userId)
      if (freshGoals) setGoals(freshGoals)
    }
  }

  // ── EXP + level logic ─────────────────────────
  async function gainExp(baseExp, x, y, currentProfile) {
    const prof = currentProfile || profileRef.current
    if (!prof) return 0

    const maxStr = Math.max(0, ...habits.map(h => Math.max(h.streak || 0, h.best_streak || 0)))
    const multi  = streakMultiplier(maxStr)
    const total  = Math.floor(baseExp * multi)

    floatExp(total, x, y)

    const result = applyExp(prof.level, prof.exp, prof.exp_to_next, baseExp, multi)
    const newTotalExp = (prof.total_exp || 0) + total

    const updates = {
      level:       result.level,
      exp:         result.exp,
      exp_to_next: result.expToNext,
      total_exp:   newTotalExp,
    }

    if (result.levelsGained > 0) {
      // stat bonuses on level up
      updates.stat_str = (prof.stat_str || 1) + result.levelsGained
      updates.stat_vit = (prof.stat_vit || 1) + result.levelsGained
      updates.stat_int = (prof.stat_int || 1) + result.levelsGained
      updates.stat_dis = (prof.stat_dis || 1) + result.levelsGained
      updates.stat_agi = (prof.stat_agi || 1) + result.levelsGained
      updates.stat_wis = (prof.stat_wis || 1) + result.levelsGained
      updates.max_hp   = 100 + (result.level - 1) * 10
      updates.hp       = updates.max_hp
      updates.max_mp   = 50  + (result.level - 1) * 5

      const cls = getClass(result.level, lang)
      updates.class_name = cls.displayName
      updates.title      = cls.displayTitle

      addToast(lang === 'en' ? '⬆ LEVEL UP' : '⬆ NIVEL ARRIBA',
               `${lang === 'en' ? 'Level' : 'Nivel'} ${result.level} — ${cls.displayName}`)
      if (soundOn) playSound('levelup')

      await supabase.from('activity_feed').insert({
        user_id: userId,
        event_type: 'level_up',
        event_data: { level: result.level, class_name: cls.displayName }
      })
    }

    const { data: updated } = await supabase
      .from('profiles').update(updates).eq('id', userId).select().single()

    if (updated) { setProfile(updated); profileRef.current = updated }
    return total
  }

  // ── HABITS ───────────────────────────────────
  async function addHabit(name, category, difficulty) {
    const { data, error } = await supabase.from('habits').insert({
      user_id: userId, name, category, difficulty,
      streak: 0, best_streak: 0, done_today: false,
      order_idx: habits.length,
    }).select().single()
    if (!error && data) setHabits(h => [...h, data])
    await checkAchievements({ _habitCount: habits.length + 1 })
  }

  async function completeHabit(habitId, x, y) {
    const h = habits.find(h => h.id === habitId)
    if (!h) return

    // ── DESMARCAR (undo) ──────────────────────────
    if (h.done_today) {
      setHabits(hs => hs.map(x => x.id === habitId ? { ...x, done_today: false } : x))
      await supabase.from('habits').update({ done_today: false }).eq('id', habitId)
      // revert total_done and exp (best effort — restar lo ganado)
      const prof = profileRef.current
      const revertExp = DIFF_EXP[h.difficulty]
      const newTotalDone = Math.max(0, (prof?.total_done || 1) - 1)
      const newTotalExp  = Math.max(0, (prof?.total_exp  || 0) - revertExp)
      const newExp       = Math.max(0, (prof?.exp        || 0) - revertExp)
      await supabase.from('profiles').update({
        total_done: newTotalDone,
        total_exp:  newTotalExp,
        exp:        newExp,
      }).eq('id', userId)
      // delete last log entry for this habit today
      await supabase.from('habit_logs')
        .delete()
        .eq('user_id', userId)
        .eq('habit_id', habitId)
        .eq('logged_date', todayStr())
      const { data: freshProf } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (freshProf) { setProfile(freshProf); profileRef.current = freshProf }
      return
    }

    // ── MARCAR COMPLETADO ─────────────────────────
    // optimistic update
    setHabits(hs => hs.map(x => x.id === habitId ? { ...x, done_today: true } : x))

    const prof = profileRef.current
    const newMp = Math.min((prof?.max_mp || 50), (prof?.mp || 0) + 5)

    // stat updates from category
    const statBumps = {}
    ;(STAT_CATS[h.category] || []).forEach(k => {
      statBumps[k] = (prof?.[k] || 1) + 1
    })

    const newTotalDone = (prof?.total_done || 0) + 1
    await supabase.from('profiles').update({ mp: newMp, total_done: newTotalDone, ...statBumps }).eq('id', userId)
    await supabase.from('habits').update({ done_today: true }).eq('id', habitId)

    const expGained = await gainExp(DIFF_EXP[h.difficulty], x, y)
    if (soundOn) playSound('complete')

    // log it
    await supabase.from('habit_logs').insert({
      user_id: userId, habit_id: habitId,
      habit_name: h.name, difficulty: h.difficulty,
      exp_gained: expGained, logged_date: todayStr()
    })

    // feed
    await supabase.from('activity_feed').insert({
      user_id: userId,
      event_type: 'habit_done',
      event_data: { habit_name: h.name, difficulty: h.difficulty, exp: expGained, streak: h.streak }
    })

    // tick goals
    const updatedGoals = []
    for (const g of goals) {
      if (g.progress < g.target) {
        const newProg = g.progress + 1
        const completed = newProg >= g.target
        await supabase.from('goals').update({ progress: newProg, completed }).eq('id', g.id)
        updatedGoals.push({ ...g, progress: newProg, completed })
        if (completed) {
          const reward = g.type === 'weekly' ? 300 : 1000
          await gainExp(reward, 600, 300)
          await supabase.from('profiles').update({ goals_done: (prof?.goals_done || 0) + 1 }).eq('id', userId)
          addToast(lang === 'en' ? '🎯 GOAL COMPLETED' : '🎯 OBJETIVO LOGRADO', g.name)
          if (soundOn) playSound('goal')
        }
      } else {
        updatedGoals.push(g)
      }
    }
    setGoals(updatedGoals)

    // reload profile for accurate stats
    const { data: freshProf } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (freshProf) { setProfile(freshProf); profileRef.current = freshProf }

    await checkAchievements({
      _legendaryDone: h.difficulty === 'legendary',
    })
  }

  async function deleteHabit(habitId) {
    setHabits(hs => hs.filter(h => h.id !== habitId))
    await supabase.from('habits').delete().eq('id', habitId)
  }

  // ── GOALS ────────────────────────────────────
  async function addGoal(name, type, target) {
    const periodKey = type === 'weekly' ? weekStr() : monthStr()
    const { data, error } = await supabase.from('goals').insert({
      user_id: userId, name, type, target, progress: 0, completed: false, period_key: periodKey
    }).select().single()
    if (!error && data) setGoals(g => [...g, data])
  }

  async function tickGoal(goalId, x, y) {
    const g = goals.find(g => g.id === goalId)
    if (!g || g.progress >= g.target) return

    const newProg = g.progress + 1
    const completed = newProg >= g.target
    setGoals(gs => gs.map(x => x.id === goalId ? { ...x, progress: newProg, completed } : x))
    await supabase.from('goals').update({ progress: newProg, completed }).eq('id', goalId)

    const e = await gainExp(15, x, y)
    if (completed) {
      const reward = g.type === 'weekly' ? 300 : 1000
      await gainExp(reward, x, y)
      const prof = profileRef.current
      await supabase.from('profiles').update({ goals_done: (prof?.goals_done || 0) + 1 }).eq('id', userId)
      addToast(lang === 'en' ? '🎯 GOAL COMPLETED' : '🎯 OBJETIVO LOGRADO', g.name)
      if (soundOn) playSound('goal')
      await supabase.from('activity_feed').insert({
        user_id: userId, event_type: 'goal_done',
        event_data: { goal_name: g.name, type: g.type }
      })
    }

    const { data: freshProf } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (freshProf) { setProfile(freshProf); profileRef.current = freshProf }
    await checkAchievements({})
  }

  async function deleteGoal(goalId) {
    setGoals(gs => gs.filter(g => g.id !== goalId))
    await supabase.from('goals').delete().eq('id', goalId)
  }

  // ── ACHIEVEMENTS ──────────────────────────────
  async function checkAchievements(extra = {}) {
    const prof = profileRef.current
    if (!prof) return
    const maxStr = Math.max(0, ...habits.map(h => Math.max(h.streak || 0, h.best_streak || 0)))
    const checkState = {
      ...prof,
      _maxStreak:    maxStr,
      _habitCount:   extra._habitCount ?? habits.length,
      _legendaryDone: extra._legendaryDone ?? false,
      goals_done:    prof.goals_done || 0,
    }

    const alreadyUnlocked = new Set(achievements.map(a => a.achievement_id))
    const newOnes = []

    for (const ach of ACHIEVEMENTS) {
      if (!alreadyUnlocked.has(ach.id) && ach.check(checkState)) {
        newOnes.push(ach)
      }
    }

    if (newOnes.length) {
      const inserts = newOnes.map(a => ({ user_id: userId, achievement_id: a.id }))
      const { data } = await supabase.from('achievements').insert(inserts).select()
      if (data) setAchievements(ac => [...ac, ...data])

      for (const a of newOnes) {
        addToast(
          lang === 'en' ? '🏆 ACHIEVEMENT UNLOCKED' : '🏆 LOGRO DESBLOQUEADO',
          `${a.icon} ${lang === 'en' ? a.nameEn : a.name}`
        )
        if (soundOn) playSound('achievement')
        await supabase.from('activity_feed').insert({
          user_id: userId, event_type: 'achievement',
          event_data: { achievement_id: a.id, name: a.name, icon: a.icon }
        })
      }
    }
  }

  // ── PROFILE UPDATE ────────────────────────────
  async function updateProfile(updates) {
    const { data } = await supabase.from('profiles').update(updates).eq('id', userId).select().single()
    if (data) { setProfile(data); profileRef.current = data }
  }

  return {
    profile, habits, goals, achievements, toasts, loading,
    addHabit, completeHabit, deleteHabit,
    addGoal, tickGoal, deleteGoal,
    updateProfile, loadAll,
    lang, soundOn,
  }
}

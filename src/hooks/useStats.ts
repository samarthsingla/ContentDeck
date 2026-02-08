import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '../context/SupabaseProvider'
import { localDateString } from '../lib/utils'
import type { Bookmark, StatusHistoryEntry } from '../types'

export interface Stats {
  completedThisWeek: number
  completedThisMonth: number
  currentStreak: number
  avgCompletionDays: number
  totalBookmarks: number
  byStatus: { unread: number; reading: number; done: number }
  bySource: Record<string, number>
  dailyCompletions: { date: string; count: number }[]
}

export function useStats(bookmarks: Bookmark[]) {
  const db = useSupabase()

  const historyQuery = useQuery({
    queryKey: ['statusHistory'],
    queryFn: async () => {
      // Only fetch last 90 days
      const since = new Date()
      since.setDate(since.getDate() - 90)
      const { data, error } = await db
        .from('status_history')
        .select('*')
        .gte('changed_at', since.toISOString())
        .order('changed_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as StatusHistoryEntry[]
    },
  })

  const stats = computeStats(bookmarks, historyQuery.data ?? [])

  return {
    stats,
    isLoading: historyQuery.isLoading,
  }
}

function computeStats(bookmarks: Bookmark[], history: StatusHistoryEntry[]): Stats {
  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const monthAgo = new Date(now)
  monthAgo.setMonth(monthAgo.getMonth() - 1)

  // Completions from history (status changed to 'done')
  const completions = history.filter((h) => h.new_status === 'done')

  const completedThisWeek = completions.filter(
    (h) => new Date(h.changed_at) >= weekAgo
  ).length

  const completedThisMonth = completions.filter(
    (h) => new Date(h.changed_at) >= monthAgo
  ).length

  // Streak: consecutive days with at least one completion
  const completionDates = new Set(
    completions.map((h) => localDateString(new Date(h.changed_at)))
  )
  let currentStreak = 0
  const checkDate = new Date(now)
  // Check today first
  if (completionDates.has(localDateString(checkDate))) {
    currentStreak = 1
    checkDate.setDate(checkDate.getDate() - 1)
    while (completionDates.has(localDateString(checkDate))) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    }
  } else {
    // Check if yesterday was the last day (streak might still be active if today isn't done yet)
    checkDate.setDate(checkDate.getDate() - 1)
    while (completionDates.has(localDateString(checkDate))) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    }
  }

  // Average completion time (from started_reading_at to finished_at)
  const completedBookmarks = bookmarks.filter((b) => b.started_reading_at && b.finished_at)
  let avgCompletionDays = 0
  if (completedBookmarks.length > 0) {
    const totalMs = completedBookmarks.reduce((sum, b) => {
      const start = new Date(b.started_reading_at!).getTime()
      const end = new Date(b.finished_at!).getTime()
      return sum + (end - start)
    }, 0)
    avgCompletionDays = Math.round(totalMs / completedBookmarks.length / (1000 * 60 * 60 * 24) * 10) / 10
  }

  // By status
  const byStatus = {
    unread: bookmarks.filter((b) => b.status === 'unread').length,
    reading: bookmarks.filter((b) => b.status === 'reading').length,
    done: bookmarks.filter((b) => b.status === 'done').length,
  }

  // By source
  const bySource: Record<string, number> = {}
  for (const b of bookmarks) {
    bySource[b.source_type] = (bySource[b.source_type] ?? 0) + 1
  }

  // Daily completions (last 30 days)
  const dailyCompletions: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = localDateString(d)
    const count = completions.filter(
      (h) => localDateString(new Date(h.changed_at)) === dateStr
    ).length
    dailyCompletions.push({ date: dateStr, count })
  }

  return {
    completedThisWeek,
    completedThisMonth,
    currentStreak,
    avgCompletionDays,
    totalBookmarks: bookmarks.length,
    byStatus,
    bySource,
    dailyCompletions,
  }
}

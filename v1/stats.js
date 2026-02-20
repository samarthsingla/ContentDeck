// ═══════════════════════════════════════════
// ContentDeck v4.0 — Reading Stats
// https://github.com/aditya30103/ContentDeck
// ═══════════════════════════════════════════

window.Stats = {
  history: [],

  async loadHistory(db) {
    const { data } = await db
      .from('status_history')
      .select('*')
      .order('changed_at', { ascending: false });
    this.history = data || [];
  },

  computeStats(bookmarks, tagAreas) {
    const now = new Date();
    const weekAgo = new Date(now - 7 * 86400000);
    const monthAgo = new Date(now - 30 * 86400000);

    // Completed counts
    const completedThisWeek = this.history.filter(
      h => h.new_status === 'done' && new Date(h.changed_at) >= weekAgo
    ).length;

    const completedThisMonth = this.history.filter(
      h => h.new_status === 'done' && new Date(h.changed_at) >= monthAgo
    ).length;

    // Current streak: consecutive days with any status change
    const streak = this._computeStreak();

    // Average days from created → finished
    const finished = bookmarks.filter(b => b.finished_at);
    let avgDays = 0;
    if (finished.length) {
      const totalDays = finished.reduce((sum, b) => {
        return sum + (new Date(b.finished_at) - new Date(b.created_at)) / 86400000;
      }, 0);
      avgDays = Math.round(totalDays / finished.length * 10) / 10;
    }

    // Per-tag breakdown (completed by area)
    const tagBreakdown = {};
    const doneBookmarks = bookmarks.filter(b => b.status === 'done');
    for (const bm of doneBookmarks) {
      for (const tag of (bm.tags || [])) {
        tagBreakdown[tag] = (tagBreakdown[tag] || 0) + 1;
      }
    }

    // Daily completion counts (last 30 days)
    const dailyCounts = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(now - i * 86400000);
      const key = d.toISOString().slice(0, 10);
      dailyCounts[key] = 0;
    }
    for (const h of this.history) {
      if (h.new_status === 'done') {
        const key = new Date(h.changed_at).toISOString().slice(0, 10);
        if (key in dailyCounts) dailyCounts[key]++;
      }
    }

    return { completedThisWeek, completedThisMonth, streak, avgDays, tagBreakdown, dailyCounts };
  },

  _computeStreak() {
    if (!this.history.length) return 0;

    const days = new Set();
    for (const h of this.history) {
      days.add(new Date(h.changed_at).toISOString().slice(0, 10));
    }

    const sorted = [...days].sort().reverse();
    const today = new Date().toISOString().slice(0, 10);

    // Streak must include today or yesterday
    if (sorted[0] !== today) {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (sorted[0] !== yesterday) return 0;
    }

    let streak = 1;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (prev - curr) / 86400000;
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  },

  renderStatsModal(stats) {
    const dailyKeys = Object.keys(stats.dailyCounts).sort();
    const dailyVals = dailyKeys.map(k => stats.dailyCounts[k]);
    const maxVal = Math.max(...dailyVals, 1);

    const barsHtml = dailyKeys.map((key, i) => {
      const val = dailyVals[i];
      const pct = (val / maxVal) * 100;
      const day = key.slice(8, 10);
      return `<div class="chart-bar-wrap" title="${key}: ${val}">
        <div class="chart-bar" style="height:${Math.max(pct, 2)}%"></div>
        ${i % 5 === 0 ? `<span class="chart-label">${day}</span>` : ''}
      </div>`;
    }).join('');

    // Tag breakdown
    const tagEntries = Object.entries(stats.tagBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
    const tagHtml = tagEntries.length
      ? tagEntries.map(([name, count]) =>
        `<div class="tag-stat-row"><span>${name}</span><span class="tag-stat-count">${count}</span></div>`
      ).join('')
      : '<div class="tag-stat-row" style="color:var(--text-tertiary)">No completed tagged bookmarks yet</div>';

    return `
      <div class="handle"></div>
      <h2>Reading Stats</h2>

      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-card-num">${stats.completedThisWeek}</div>
          <div class="stat-card-label">This Week</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-num">${stats.completedThisMonth}</div>
          <div class="stat-card-label">This Month</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-num">${stats.streak}</div>
          <div class="stat-card-label">Day Streak</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-num">${stats.avgDays}d</div>
          <div class="stat-card-label">Avg to Finish</div>
        </div>
      </div>

      <div class="section-title" style="border-top:none;margin-top:10px">30-Day Completions</div>
      <div class="stats-chart">${barsHtml}</div>

      <div class="section-title">Top Areas</div>
      <div class="tag-stats">${tagHtml}</div>

      <div class="modal-btns" style="margin-top:16px">
        <button class="btn btn-cancel" onclick="closeModal()">Close</button>
      </div>`;
  },
};

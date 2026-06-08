import React, { useCallback, useEffect, useState } from 'react';
import { MonthForecast, OverdueProblem, Problem } from '../types';
import { api } from '../renderer/api';
import { toIso, parseIsoLocal } from '../dateUtils';
import { ratingLabel } from '../ratings';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// 'YYYY-MM' for a given year/monthIndex(0-11).
function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

export default function ForecastScreen(): React.ReactElement {
  const todayIso = toIso(new Date());
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() }; // month: 0-11
  });
  const [data, setData] = useState<MonthForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string>(todayIso);
  // Overdue panel: null = showing a day; otherwise showing the overdue list.
  const [overdue, setOverdue] = useState<OverdueProblem[] | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());

  const key = monthKey(cursor.year, cursor.month);

  const load = useCallback(async () => {
    setLoading(true);
    const d = await api.forecast.getMonth(key);
    setData(d);
    setLoading(false);
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  function step(delta: number): void {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const days = data?.days ?? {};

  // Build the grid: leading blanks + each day of the month.
  const first = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toIso(new Date(cursor.year, cursor.month, d)));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const sel = days[selected];
  const selPast = selected < todayIso;

  function openProblem(p: Problem): void {
    if (p.leetcode_url) api.shell.openUrl(p.leetcode_url);
  }

  function selectDay(iso: string): void {
    setOverdue(null);
    setSelected(iso);
  }

  async function showOverdue(): Promise<void> {
    setOverdue(await api.forecast.getOverdue());
  }

  async function addToToday(p: OverdueProblem): Promise<void> {
    const res = await api.queue.addProblem(p.id);
    // ok, or already there → treat as "in today's queue"
    if (res.ok || res.reason === 'already_in_queue') {
      setAddedIds((prev) => new Set(prev).add(p.id));
    }
  }

  function daysOverdue(due: string): number {
    return Math.round((parseIsoLocal(todayIso).getTime() - parseIsoLocal(due).getTime()) / 86400000);
  }

  return (
    <>
      <div className="queue-header" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Forecast</div>
          <div className="queue-date">Reviews due ahead · problems solved in the past</div>
        </div>
      </div>

      <div className="forecast-summary">
        <button
          className={'forecast-stat clickable' + (overdue ? ' active' : '')}
          onClick={showOverdue}
          title="Show overdue problems"
        >
          <div className="forecast-stat-value" style={{ color: (data?.overdue ?? 0) > 0 ? 'var(--warning)' : 'var(--text)' }}>
            {data?.overdue ?? 0}
          </div>
          <div className="forecast-stat-label">Overdue ›</div>
        </button>
        <div className="forecast-stat">
          <div className="forecast-stat-value">{data?.newCount ?? 0}</div>
          <div className="forecast-stat-label">Not yet started</div>
        </div>
      </div>

      <div className="forecast-nav">
        <button className="btn btn-sm" onClick={() => step(-1)}>← Prev</button>
        <span className="forecast-nav-label">{MONTH_NAMES[cursor.month]} {cursor.year}</span>
        <button className="btn btn-sm" onClick={() => step(1)}>Next →</button>
      </div>

      {loading ? (
        <div className="spinner">Loading…</div>
      ) : (
        <>
          <div className="forecast-weekdays">
            {WEEKDAYS.map((d, i) => <div key={i} className="forecast-weekday">{d}</div>)}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="forecast-week">
              {week.map((iso, ci) => {
                if (!iso) return <div key={ci} className="forecast-day empty" />;
                const day = days[iso];
                const dueN = day?.due.length ?? 0;
                const revN = day?.reviewed.length ?? 0;
                const isToday = iso === todayIso;
                const isPast = iso < todayIso;
                const count = isPast ? revN : dueN;
                const hasItems = count > 0;
                // Past activity is green (done); upcoming due is accent (to-do).
                const bg = !hasItems
                  ? undefined
                  : isPast
                    ? 'rgba(61, 189, 110, 0.22)'
                    : 'rgba(94, 155, 255, 0.22)';
                return (
                  <div
                    key={ci}
                    className={
                      'forecast-day clickable' +
                      (isToday ? ' today' : '') +
                      (!overdue && iso === selected ? ' selected' : '')
                    }
                    style={bg ? { background: bg } : undefined}
                    onClick={() => selectDay(iso)}
                    title={`${iso}`}
                  >
                    <span className="forecast-day-num">{Number(iso.slice(8))}</span>
                    {hasItems && <span className="forecast-day-count">{count}</span>}
                  </div>
                );
              })}
            </div>
          ))}

          <div className="forecast-detail">
            {overdue ? (
              <>
                <div className="forecast-detail-title">Overdue · {overdue.length}</div>
                {overdue.length === 0 ? (
                  <div className="forecast-detail-empty">Nothing overdue — you&apos;re caught up.</div>
                ) : (
                  <>
                    <div className="forecast-detail-empty" style={{ marginBottom: 8 }}>
                      Past their due date. “+ Today” pulls one into your queue so you can review it
                      (works even for disabled topics).
                    </div>
                    {overdue.map((p) => (
                      <div key={p.id} className="forecast-detail-row">
                        <button className="link-btn" onClick={() => openProblem(p)}>{p.title}</button>
                        <span className="cell-muted">{p.topic}</span>
                        <span className={`difficulty-badge ${p.difficulty}`}>{p.difficulty}</span>
                        <span className="cell-muted">{daysOverdue(p.due)}d overdue</span>
                        <button
                          className="btn btn-sm"
                          style={{ marginLeft: 'auto' }}
                          onClick={() => addToToday(p)}
                          disabled={addedIds.has(p.id)}
                        >
                          {addedIds.has(p.id) ? 'Added' : '+ Today'}
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </>
            ) : (
            <>
            <div className="forecast-detail-title">
              {parseIsoLocal(selected).toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
              {selected === todayIso && ' · today'}
            </div>

            {selPast ? (
              (sel?.reviewed.length ?? 0) === 0 ? (
                <div className="forecast-detail-empty">Nothing solved this day.</div>
              ) : (
                sel!.reviewed.map((p, i) => (
                  <div key={i} className="forecast-detail-row">
                    <button className="link-btn" onClick={() => openProblem(p)}>{p.title}</button>
                    <span className="cell-muted">{p.topic}</span>
                    <span className={`difficulty-badge ${p.difficulty}`}>{p.difficulty}</span>
                    <span className="cell-muted" style={{ marginLeft: 'auto' }}>
                      {p.rating} — {ratingLabel(p.rating)}
                    </span>
                  </div>
                ))
              )
            ) : (sel?.due.length ?? 0) === 0 ? (
              <div className="forecast-detail-empty">
                Nothing scheduled. {selected === todayIso && 'New problems are pulled in via the Today tab.'}
              </div>
            ) : (
              sel!.due.map((p, i) => (
                <div key={i} className="forecast-detail-row">
                  <button className="link-btn" onClick={() => openProblem(p)}>{p.title}</button>
                  <span className="cell-muted">{p.topic}</span>
                  <span className={`difficulty-badge ${p.difficulty}`}>{p.difficulty}</span>
                </div>
              ))
            )}
            </>
            )}
          </div>
        </>
      )}
    </>
  );
}

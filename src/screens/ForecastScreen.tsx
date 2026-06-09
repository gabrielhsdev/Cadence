import React, { useCallback, useEffect, useState } from 'react';
import { ForecastDay, MonthForecast, OverdueProblem, Problem } from '../types';
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

// Calendar cell tint: past activity is green (done), upcoming due is accent (to-do).
function cellBackground(hasItems: boolean, isPast: boolean): string | undefined {
  if (!hasItems) return undefined;
  return isPast ? 'rgba(61, 189, 110, 0.22)' : 'rgba(94, 155, 255, 0.22)';
}

function openProblem(p: Problem): void {
  if (p.leetcode_url) api.shell.openUrl(p.leetcode_url);
}

// One problem in a detail list: title (opens LeetCode) + topic + difficulty,
// with an optional trailing slot (rating, "days overdue", an action button).
function ProblemRow({ problem, trailing }: { problem: Problem; trailing?: React.ReactNode }): React.ReactElement {
  return (
    <div className="forecast-detail-row">
      <button className="link-btn" onClick={() => openProblem(problem)}>{problem.title}</button>
      <span className="cell-muted">{problem.topic}</span>
      <span className={`difficulty-badge ${problem.difficulty}`}>{problem.difficulty}</span>
      {trailing}
    </div>
  );
}

// Detail for a clicked calendar day: problems solved (past) or due (today/future).
function DayDetail({ day, isPast, isToday, dateLabel }: {
  day?: ForecastDay;
  isPast: boolean;
  isToday: boolean;
  dateLabel: string;
}): React.ReactElement {
  const reviewed = day?.reviewed ?? [];
  const due = day?.due ?? [];

  let body: React.ReactNode;
  if (isPast) {
    body =
      reviewed.length === 0 ? (
        <div className="forecast-detail-empty">Nothing solved this day.</div>
      ) : (
        reviewed.map((p, i) => (
          <ProblemRow
            key={i}
            problem={p}
            trailing={<span className="cell-muted" style={{ marginLeft: 'auto' }}>{p.rating} — {ratingLabel(p.rating)}</span>}
          />
        ))
      );
  } else {
    body =
      due.length === 0 ? (
        <div className="forecast-detail-empty">
          Nothing scheduled.{isToday && ' New problems are pulled in via the Today tab.'}
        </div>
      ) : (
        due.map((p, i) => <ProblemRow key={i} problem={p} />)
      );
  }

  return (
    <>
      <div className="forecast-detail-title">{dateLabel}{isToday && ' · today'}</div>
      {body}
    </>
  );
}

// The Overdue list: each problem with how late it is and a "+ Today" action.
function OverdueList({ items, addedIds, onAdd, today }: {
  items: OverdueProblem[];
  addedIds: Set<number>;
  onAdd: (p: OverdueProblem) => void;
  today: string;
}): React.ReactElement {
  const daysOverdue = (due: string): number =>
    Math.round((parseIsoLocal(today).getTime() - parseIsoLocal(due).getTime()) / 86400000);
  return (
    <>
      <div className="forecast-detail-title">Overdue · {items.length}</div>
      {items.length === 0 ? (
        <div className="forecast-detail-empty">Nothing overdue — you&apos;re caught up.</div>
      ) : (
        <>
          <div className="forecast-detail-empty" style={{ marginBottom: 8 }}>
            Past their due date. “+ Today” pulls one into your queue to review (works even for
            disabled topics).
          </div>
          {items.map((p) => (
            <ProblemRow
              key={p.id}
              problem={p}
              trailing={
                <>
                  <span className="cell-muted">{daysOverdue(p.due)}d overdue</span>
                  <button
                    className="btn btn-sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => onAdd(p)}
                    disabled={addedIds.has(p.id)}
                  >
                    {addedIds.has(p.id) ? 'Added' : '+ Today'}
                  </button>
                </>
              }
            />
          ))}
        </>
      )}
    </>
  );
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

  return (
    <>
      <div className="queue-header" style={{ marginBottom: 16 }}>
        <div>
          <div className="screen-title">Forecast</div>
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
                const bg = cellBackground(hasItems, isPast);
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
              <OverdueList items={overdue} addedIds={addedIds} onAdd={addToToday} today={todayIso} />
            ) : (
              <DayDetail
                day={days[selected]}
                isPast={selected < todayIso}
                isToday={selected === todayIso}
                dateLabel={parseIsoLocal(selected).toLocaleDateString('en-US', {
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                })}
              />
            )}
          </div>
        </>
      )}
    </>
  );
}

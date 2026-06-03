import React, { useCallback, useEffect, useState } from 'react';
import { ReviewForecast } from '../types';
import { api } from '../renderer/api';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const HORIZON_DAYS = 90;
const ACCENT_RGB = '94, 155, 255';

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface Cell {
  iso: string;
  date: Date;
  count: number;
  isToday: boolean;
}

export default function ForecastScreen(): React.ReactElement {
  const [forecast, setForecast] = useState<ReviewForecast | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await api.forecast.get();
    setForecast(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !forecast) return <div className="spinner">Loading forecast…</div>;

  const countByDate = new Map(forecast.upcoming.map((u) => [u.date, u.count]));
  const maxCount = forecast.upcoming.reduce((m, u) => Math.max(m, u.count), 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = toIso(today);

  // Build a flat list of day cells from the start of this week through the
  // horizon, padding the first week so weekday columns line up.
  const cells: Cell[] = [];
  for (let i = 0; i < today.getDay(); i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (today.getDay() - i));
    cells.push({ iso: '', date: d, count: 0, isToday: false });
  }
  for (let i = 0; i <= HORIZON_DAYS; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const iso = toIso(d);
    cells.push({ iso, date: d, count: countByDate.get(iso) ?? 0, isToday: iso === todayIso });
  }

  // Chunk into weeks of 7.
  const weeks: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const totalUpcoming = forecast.upcoming.reduce((s, u) => s + u.count, 0);
  const dueToday = countByDate.get(todayIso) ?? 0;

  function cellStyle(count: number): React.CSSProperties {
    if (count === 0) return {};
    const intensity = 0.15 + 0.65 * (maxCount > 0 ? count / maxCount : 0);
    return { background: `rgba(${ACCENT_RGB}, ${intensity.toFixed(3)})` };
  }

  return (
    <>
      <div className="queue-header" style={{ marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>Forecast</div>
          <div className="queue-date">Problems becoming due over the next {HORIZON_DAYS} days</div>
        </div>
      </div>

      <div className="forecast-summary">
        <div className="forecast-stat">
          <div className="forecast-stat-value" style={{ color: forecast.overdue > 0 ? 'var(--warning)' : 'var(--text)' }}>
            {forecast.overdue}
          </div>
          <div className="forecast-stat-label">Overdue</div>
        </div>
        <div className="forecast-stat">
          <div className="forecast-stat-value">{dueToday}</div>
          <div className="forecast-stat-label">Due today</div>
        </div>
        <div className="forecast-stat">
          <div className="forecast-stat-value">{totalUpcoming}</div>
          <div className="forecast-stat-label">Next {HORIZON_DAYS} days</div>
        </div>
        <div className="forecast-stat">
          <div className="forecast-stat-value">{forecast.newCount}</div>
          <div className="forecast-stat-label">Not yet started</div>
        </div>
      </div>

      {totalUpcoming === 0 && forecast.overdue === 0 ? (
        <div className="empty-state">
          <h3>Nothing scheduled yet</h3>
          <p>
            Review problems from your daily queue and FSRS will schedule them here. The more
            you review, the more your future fills in.
          </p>
        </div>
      ) : (
        <>
          <div className="forecast-weekdays">
            {WEEKDAYS.map((d, i) => (
              <div key={i} className="forecast-weekday">{d}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="forecast-week">
              {week.map((cell, ci) => {
                if (!cell.iso) return <div key={ci} className="forecast-day empty" />;
                const showMonth = cell.date.getDate() === 1 || (wi === 0 && ci === 0) || cell.isToday;
                return (
                  <div
                    key={ci}
                    className={`forecast-day${cell.isToday ? ' today' : ''}`}
                    style={cellStyle(cell.count)}
                    title={`${cell.iso}: ${cell.count} due`}
                  >
                    <span className="forecast-day-num">
                      {showMonth
                        ? cell.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : cell.date.getDate()}
                    </span>
                    {cell.count > 0 && <span className="forecast-day-count">{cell.count}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </>
      )}
    </>
  );
}

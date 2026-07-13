import type { CSSProperties } from 'react';

export interface AnalyticsChartPoint {
  label: string;
  value: number;
  detail: string;
}

export interface AnalyticsRankItem {
  label: string;
  value: number;
  detail: string;
}

export interface AnalyticsBarChartProps {
  points: AnalyticsChartPoint[];
  valueFormatter: (value: number) => string;
  ariaLabel: string;
  emptyTitle: string;
  emptyText: string;
}

export interface AnalyticsRankingProps {
  items: AnalyticsRankItem[];
  valueFormatter: (value: number) => string;
  emptyTitle: string;
  emptyText: string;
}

function safeValue(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function EmptyAnalytics({ title, text, ariaLabel }: { title: string; text: string; ariaLabel?: string }) {
  return (
    <div className="empty-state analytics-empty" role="status" aria-label={ariaLabel}>
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

export function AnalyticsBarChart({
  points,
  valueFormatter,
  ariaLabel,
  emptyTitle,
  emptyText
}: AnalyticsBarChartProps) {
  const values = points.map((point) => safeValue(point.value));
  const maximum = Math.max(0, ...values);

  if (!points.length) {
    return <EmptyAnalytics title={emptyTitle} text={emptyText} ariaLabel={ariaLabel} />;
  }

  return (
    <figure className="analytics-bar-chart">
      <figcaption className="analytics-visually-hidden">{ariaLabel}</figcaption>
      <div className="analytics-bar-scroll" tabIndex={0} aria-label={`${ariaLabel}. Scroll horizontally to see every data point.`}>
        <ol className="analytics-bar-list">
          {points.map((point, index) => {
            const value = values[index];
            const percentage = value > 0 ? Math.max(4, (value / maximum) * 100) : 0;
            const barStyle = { '--analytics-bar-size': `${percentage}%` } as CSSProperties;

            return (
              <li className="analytics-bar-item" key={`${point.label}-${index}`}>
                <span className="analytics-bar-label" title={point.label}>{point.label}</span>
                <strong className="analytics-bar-value">{valueFormatter(value)}</strong>
                <span className="analytics-bar-detail" title={point.detail}>{point.detail}</span>
                <span className="analytics-bar-track" aria-hidden="true">
                  <span className="analytics-bar-fill" style={barStyle} />
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </figure>
  );
}

export function AnalyticsRanking({
  items,
  valueFormatter,
  emptyTitle,
  emptyText
}: AnalyticsRankingProps) {
  const values = items.map((item) => safeValue(item.value));
  const maximum = Math.max(0, ...values);

  if (!items.length) {
    return <EmptyAnalytics title={emptyTitle} text={emptyText} />;
  }

  return (
    <div className="analytics-ranking">
      <ol className="analytics-ranking-list">
        {items.map((item, index) => {
          const value = values[index];
          const percentage = value > 0 ? Math.max(3, (value / maximum) * 100) : 0;
          const progressStyle = { '--analytics-rank-size': `${percentage}%` } as CSSProperties;

          return (
            <li className="analytics-ranking-item" key={`${item.label}-${index}`}>
              <span className="analytics-rank-number" aria-hidden="true">{index + 1}</span>
              <div className="analytics-rank-content">
                <div className="analytics-rank-heading">
                  <strong title={item.label}>{item.label}</strong>
                  <span>{valueFormatter(value)}</span>
                </div>
                <span className="analytics-rank-detail">{item.detail}</span>
                <span className="analytics-rank-track" aria-hidden="true">
                  <span className="analytics-rank-fill" style={progressStyle} />
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

import React, { useMemo } from 'react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { Medication, ActivityEntry } from '../types';

/* ── Colours ──────────────────────────────────────── */
const STATUS_COLORS: Record<string, string> = {
    manufactured: '#6366f1',
    received: '#f59e0b',
    arrived: '#22c55e',
};

const EXPIRY_COLORS = {
    overdue: '#ef4444',
    within30: '#f59e0b',
    within90: '#6366f1',
    safe: '#22c55e',
};

/* ── Pipeline donut ───────────────────────────────── */
type PipelineDonutProps = { medications: Medication[] };

const PipelineDonut: React.FC<PipelineDonutProps> = ({ medications }) => {
    const data = useMemo(() => {
        const counts: Record<string, number> = { manufactured: 0, received: 0, arrived: 0 };
        medications.forEach((m) => { counts[m.status || 'manufactured'] = (counts[m.status || 'manufactured'] || 0) + 1; });
        return Object.entries(counts)
            .filter(([, v]) => v > 0)
            .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value, key: name }));
    }, [medications]);

    if (data.length === 0) {
        return <p className="chart-empty">No medication data yet.</p>;
    }

    return (
        <ResponsiveContainer width="100%" height={220}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={54}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                >
                    {data.map((entry) => (
                        <Cell key={entry.key} fill={STATUS_COLORS[entry.key] || '#a1a1aa'} />
                    ))}
                </Pie>
                <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--stroke)', borderRadius: 6, fontSize: '0.82rem' }}
                    itemStyle={{ color: 'var(--ink)' }}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

/* ── Activity bar chart (14 days) ─────────────────── */
type ActivityBarsProps = { entries: ActivityEntry[] };

const ActivityBars: React.FC<ActivityBarsProps> = ({ entries }) => {
    const data = useMemo(() => {
        const now = new Date();
        const buckets: Record<string, number> = {};
        for (let i = 13; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            buckets[d.toISOString().slice(5, 10)] = 0; // MM-DD
        }
        entries.forEach((e) => {
            const key = new Date(e.createdAt).toISOString().slice(5, 10);
            if (key in buckets) {
                buckets[key] += e.serialNumbers?.length || 1;
            }
        });
        return Object.entries(buckets).map(([date, count]) => ({ date, count }));
    }, [entries]);

    const hasData = data.some((d) => d.count > 0);

    if (!hasData) {
        return <p className="chart-empty">No activity in the last 14 days.</p>;
    }

    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" />
                <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--stroke)' }}
                />
                <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    tickLine={false}
                    axisLine={false}
                />
                <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--stroke)', borderRadius: 6, fontSize: '0.82rem' }}
                    itemStyle={{ color: 'var(--ink)' }}
                    labelStyle={{ color: 'var(--muted)' }}
                />
                <Bar dataKey="count" name="Operations" fill="#6366f1" radius={[3, 3, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

/* ── Expiry proximity chart ───────────────────────── */
type ExpiryChartProps = { medications: Medication[] };

const ExpiryChart: React.FC<ExpiryChartProps> = ({ medications }) => {
    const data = useMemo(() => {
        const now = Date.now();
        const d30 = 30 * 86400000;
        const d90 = 90 * 86400000;
        let overdue = 0, within30 = 0, within90 = 0, safe = 0;
        medications.forEach((m) => {
            if (!m.expiryDate) return;
            const diff = new Date(m.expiryDate).getTime() - now;
            if (diff < 0) overdue++;
            else if (diff <= d30) within30++;
            else if (diff <= d90) within90++;
            else safe++;
        });
        return [
            { name: 'Expired', value: overdue, key: 'overdue' },
            { name: '< 30 days', value: within30, key: 'within30' },
            { name: '< 90 days', value: within90, key: 'within90' },
            { name: '90+ days', value: safe, key: 'safe' },
        ].filter((d) => d.value > 0);
    }, [medications]);

    if (data.length === 0) {
        return <p className="chart-empty">No expiry data available.</p>;
    }

    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--stroke)" horizontal={false} />
                <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: 'var(--muted)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--stroke)' }}
                />
                <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: 'var(--muted)' }}
                    tickLine={false}
                    axisLine={false}
                    width={72}
                />
                <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--stroke)', borderRadius: 6, fontSize: '0.82rem' }}
                    itemStyle={{ color: 'var(--ink)' }}
                />
                <Bar dataKey="value" name="Medications" radius={[0, 3, 3, 0]}>
                    {data.map((entry) => (
                        <Cell key={entry.key} fill={EXPIRY_COLORS[entry.key as keyof typeof EXPIRY_COLORS] || '#a1a1aa'} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

/* ── Legend ────────────────────────────────────────── */
const ChartLegend: React.FC<{ items: { color: string; label: string }[] }> = ({ items }) => (
    <div className="chart-legend">
        {items.map((item) => (
            <span key={item.label} className="chart-legend__item">
                <span className="chart-legend__dot" style={{ background: item.color }} />
                {item.label}
            </span>
        ))}
    </div>
);

/* ── Exported composite ───────────────────────────── */
type DashboardChartsProps = {
    medications: Medication[];
    activityEntries: ActivityEntry[];
    activityLoading: boolean;
};

const DashboardCharts: React.FC<DashboardChartsProps> = ({ medications, activityEntries, activityLoading }) => (
    <div className="dashboard__charts">
        <div className="dashboard__chart-card">
            <h3 className="dashboard__chart-title">Pipeline status</h3>
            <PipelineDonut medications={medications} />
            <ChartLegend items={[
                { color: STATUS_COLORS.manufactured, label: 'Manufactured' },
                { color: STATUS_COLORS.received, label: 'Received' },
                { color: STATUS_COLORS.arrived, label: 'Arrived' },
            ]} />
        </div>
        <div className="dashboard__chart-card">
            <h3 className="dashboard__chart-title">Activity (14 days)</h3>
            {activityLoading
                ? <p className="chart-empty">Loading activity...</p>
                : <ActivityBars entries={activityEntries} />
            }
        </div>
        <div className="dashboard__chart-card">
            <h3 className="dashboard__chart-title">Expiry proximity</h3>
            <ExpiryChart medications={medications} />
            <ChartLegend items={[
                { color: EXPIRY_COLORS.overdue, label: 'Expired' },
                { color: EXPIRY_COLORS.within30, label: '< 30 days' },
                { color: EXPIRY_COLORS.within90, label: '< 90 days' },
                { color: EXPIRY_COLORS.safe, label: '90+ days' },
            ]} />
        </div>
    </div>
);

export default DashboardCharts;

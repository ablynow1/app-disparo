'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

interface ChartData {
    name: string;
    total: number;
}

export function DisparosChart({ data }: { data: ChartData[] }) {
    if (!data || data.length === 0) {
        return (
            <div className="flex h-full w-full items-center justify-center text-zinc-500 text-sm">
                Nenhum dado de disparo recente.
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <XAxis
                    dataKey="name"
                    stroke="#52525b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                />
                <YAxis
                    stroke="#52525b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                    cursor={{ fill: '#27272a' }} // hover effect on the bar column
                    contentStyle={{
                        backgroundColor: '#18181b', // zinc-900
                        border: '1px solid #27272a', // zinc-800
                        borderRadius: '12px',
                        color: '#f4f4f5', // zinc-100
                        fontSize: '12px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                    }}
                    itemStyle={{ color: '#818cf8', fontWeight: 'bold' }} // indigo-400
                    labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }} // zinc-400
                    formatter={(value: any) => [value, 'Disparos']}
                />
                <Bar
                    dataKey="total"
                    fill="#6366f1" // indigo-500
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";

type RevenuePoint = {
  label: string;
  value: number;
};

type OrderStatusPoint = {
  status: string;
  total: number;
};

export function DashboardCharts({
  revenueData,
  orderStatusData,
}: {
  revenueData: RevenuePoint[];
  orderStatusData: OrderStatusPoint[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard title="Revenue Window (IDR)" height={260}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={revenueData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" axisLine={false} tickLine={false} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => shortIdr(Number(value))}
            />
            <Tooltip
              formatter={(value) => formatIdrNumber(Number(value))}
              cursor={{ fill: "rgba(15, 23, 42, 0.05)" }}
            />
            <Bar dataKey="value" fill="#0f172a" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Order per Status" height={260}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={orderStatusData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="status" axisLine={false} tickLine={false} />
            <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="total" fill="#1d4ed8" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  height,
  children,
}: {
  title: string;
  height: number;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-4 text-sm font-medium text-neutral-700">{title}</h3>
      <div style={{ height }}>{children}</div>
    </div>
  );
}

function shortIdr(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${value}`;
}

function formatIdrNumber(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

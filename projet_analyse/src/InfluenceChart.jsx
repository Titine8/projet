import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from "recharts";

const InfluenceChart = React.memo(({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <BarChart
      layout="vertical"
      data={data.map(i => ({ name: i.column, influence: i.influence || 0 }))}
      margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
      barSize={30}
    >
      <CartesianGrid stroke="#ddd" strokeDasharray="4 4" />
      <XAxis type="number" />
      <YAxis
        dataKey="name"
        type="category"
        width={120}
        tick={{ fontSize: 14, fill: "#333" }}
      />
      <Tooltip formatter={val => val.toFixed(2) + "%"} />
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00074d" stopOpacity={0.8} />
          <stop offset="100%" stopColor="#00bcd4" stopOpacity={0.8} />
        </linearGradient>
      </defs>
      <Bar dataKey="influence" fill="url(#barGradient)" radius={[6, 6, 6, 6]}>
        <LabelList
          dataKey="influence"
          position="right"
          formatter={val => val.toFixed(2)}
          style={{ fill: "#00074d", fontWeight: 600 }}
        />
      </Bar>
    </BarChart>
  </ResponsiveContainer>
));

export default InfluenceChart;

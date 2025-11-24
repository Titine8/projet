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
  <div style={{ width: "100%", height: "100%", backgroundColor: "#ffffff", padding: 10, borderRadius: 8 }}>
    {/* Titre du graphique */}
    <h3 style={{ textAlign: "center", marginBottom: 10, color: "#00074d" }}>
      Colonnes les plus influentes sur la cible
    </h3>

    {/* Graphique */}
    <ResponsiveContainer width="100%" height="90%">
      <BarChart
        layout="vertical"
        data={data.map(i => ({ name: i.column, influence: i.influence || 0 }))}
        margin={{ top: 10, right: 20, left: 20, bottom: 10 }}
        barGap={5}
        barCategoryGap="20%"
      >
        <CartesianGrid stroke="#ddd" strokeDasharray="4 4" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          dataKey="name"
          type="category"
          width={150}
          tick={{ fontSize: 12, fill: "#333" }}
        />
        <Tooltip formatter={val => val.toFixed(2) + "%"} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#00074d" stopOpacity={0.8} />
            <stop offset="100%" stopColor="#00bcd4" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <Bar
          dataKey="influence"
          fill="url(#barGradient)"
          radius={[6, 6, 6, 6]}
          isAnimationActive={true}
          animationDuration={800}
          maxBarSize={20}
        >
          <LabelList
            dataKey="influence"
            position="right"
            formatter={val => val.toFixed(2) + "%"}
            style={{ fill: "#00074d", fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
));

export default InfluenceChart;

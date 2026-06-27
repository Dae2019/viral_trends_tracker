import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { CategoryDistribution } from "../types";

interface Props {
  data: CategoryDistribution[];
  onSelectCategory?: (category: string | null) => void;
  selectedCategory: string | null;
}

export default function CategoryPieChart({ data, onSelectCategory, selectedCategory }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 font-mono text-sm">
        No category distribution data available.
      </div>
    );
  }

  const handleSliceClick = (entry: CategoryDistribution) => {
    if (onSelectCategory) {
      if (selectedCategory === entry.name) {
        onSelectCategory(null); // Deselect
      } else {
        onSelectCategory(entry.name); // Select
      }
    }
  };

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="relative flex items-center justify-center h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
              nameKey="name"
              cursor="pointer"
            >
              {data.map((entry) => {
                const isSelected = selectedCategory === entry.name;
                const isAnySelected = selectedCategory !== null;
                return (
                  <Cell
                    key={`cell-${entry.name}`}
                    fill={entry.color}
                    onClick={() => handleSliceClick(entry)}
                    className="transition-all duration-300 outline-none"
                    style={{
                      opacity: isAnySelected && !isSelected ? 0.35 : 1,
                      transform: isSelected ? "scale(1.05)" : "scale(1)",
                      transformOrigin: "center"
                    }}
                  />
                );
              })}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const dataPoint = payload[0].payload as CategoryDistribution;
                  return (
                    <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded shadow-xl backdrop-blur-md">
                      <p className="font-sans font-semibold text-xs text-white uppercase tracking-wider mb-0.5">
                        {dataPoint.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs font-mono">
                        <span className="text-gray-400">Share:</span>
                        <span className="text-teal-400 font-bold">{dataPoint.value}%</span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs font-mono">
                        <span className="text-gray-400">Topics:</span>
                        <span className="text-white">{dataPoint.count} trends</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label inside Donut Chart */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">
            {selectedCategory ? "Filtered" : "Total Share"}
          </span>
          <span className="text-2xl font-display font-bold text-white mt-0.5">
            {selectedCategory ? selectedCategory : "100%"}
          </span>
        </div>
      </div>

      {/* Visual Legend with Custom Toggles */}
      <div className="grid grid-cols-2 gap-2 mt-2 max-h-24 overflow-y-auto custom-scrollbar px-1">
        {data.map((entry) => {
          const isSelected = selectedCategory === entry.name;
          const isAnySelected = selectedCategory !== null;
          return (
            <button
              key={entry.name}
              onClick={() => handleSliceClick(entry)}
              className={`flex items-center space-x-2 text-left p-1.5 rounded transition-all duration-200 hover:bg-slate-800 ${
                isSelected ? "bg-slate-800/80 border border-slate-700" : "border border-transparent"
              } ${isAnySelected && !isSelected ? "opacity-50" : "opacity-100"}`}
            >
              <span
                className="w-2 h-2 rounded-sm shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <div className="min-w-0 flex-1 flex items-baseline justify-between space-x-1">
                <span className="text-xs text-gray-300 font-medium truncate font-sans">
                  {entry.name}
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {entry.value}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

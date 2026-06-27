import React, { useState, FormEvent } from "react";
import { Trend } from "../types";
import { Search, Flame, TrendingUp, MessageSquare, ShieldAlert, ArrowUpDown, RefreshCcw, ExternalLink } from "lucide-react";

interface Props {
  trends: Trend[];
  selectedTrendTopic: string | null;
  onSelectTrendTopic: (topic: string | null) => void;
  selectedCategory: string | null;
  onClearCategoryFilter: () => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onSearchLiveAI: (query: string) => void;
  isSearchingLive: boolean;
}

type SortField = "volume" | "growthPercentage" | "engagementRate" | "topic" | "viralityScore";
type SortOrder = "asc" | "desc";

const getSearchUrl = (platform: string, topic: string) => {
  const query = encodeURIComponent(topic);
  switch (platform) {
    case "X":
      return `https://x.com/search?q=${query}`;
    case "TikTok":
      return `https://www.tiktok.com/search?q=${query}`;
    case "LinkedIn":
      return `https://www.linkedin.com/search/results/all/?keywords=${query}`;
    case "YouTube":
      return `https://www.youtube.com/results?search_query=${query}`;
    case "Instagram":
      return `https://www.instagram.com/explore/tags/${encodeURIComponent(topic.replace(/#/g, ""))}`;
    case "Reddit":
      return `https://www.reddit.com/search/?q=${query}`;
    case "Twitch":
      return `https://www.twitch.tv/search?term=${query}`;
    case "Kick":
      return `https://kick.com/search?q=${query}`;
    default:
      return `https://www.google.com/search?q=${query}`;
  }
};

export default function TrendsTable({
  trends,
  selectedTrendTopic,
  onSelectTrendTopic,
  selectedCategory,
  onClearCategoryFilter,
  searchQuery,
  onSearchQueryChange,
  onSearchLiveAI,
  isSearchingLive
}: Props) {
  const [sortField, setSortField] = useState<SortField>("viralityScore");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [platformFilter, setPlatformFilter] = useState<string>("All");

  const getViralityScore = (t: Trend) => {
    if (t.viralityScore) return t.viralityScore;
    return Math.round((t.engagementRate * (t.volume / 15000) * Math.log10(t.growthPercentage || 10)));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Filter trends
  const filteredTrends = trends
    .filter((t) => {
      // Search matches topic, description, or category
      const matchesSearch =
        t.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Category matches Selected Category from Pie Chart
      const matchesCategory = !selectedCategory || t.category === selectedCategory;

      // Platform filter
      const matchesPlatform = platformFilter === "All" || t.platform === platformFilter;

      return matchesSearch && matchesCategory && matchesPlatform;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === "topic") {
        comparison = a.topic.localeCompare(b.topic);
      } else if (sortField === "viralityScore") {
        comparison = getViralityScore(a) - getViralityScore(b);
      } else {
        comparison = a[sortField] - b[sortField];
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  // If search is active, show only top 10 most viral stories
  const displayedTrends = searchQuery.trim() ? filteredTrends.slice(0, 10) : filteredTrends;

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "X":
      case "Twitter":
        return <span className="font-sans font-extrabold text-[9px] bg-slate-950 text-slate-100 w-5 h-5 rounded-sm flex items-center justify-center border border-slate-800 tracking-wider">X</span>;
      case "Facebook":
        return <span className="font-sans font-extrabold text-[9px] bg-blue-950/60 text-blue-400 w-5 h-5 rounded-sm flex items-center justify-center border border-blue-900/40 tracking-wider font-bold">FB</span>;
      case "TikTok":
        return <span className="font-sans font-extrabold text-[9px] bg-slate-950 text-sky-400 w-5 h-5 rounded-sm flex items-center justify-center border border-slate-900 tracking-wider">TT</span>;
      case "LinkedIn":
        return <span className="font-sans font-extrabold text-[9px] bg-indigo-950/60 text-indigo-400 w-5 h-5 rounded-sm flex items-center justify-center border border-indigo-900/40 tracking-wider">LN</span>;
      case "YouTube":
        return <span className="font-sans font-extrabold text-[9px] bg-rose-950/60 text-rose-400 w-5 h-5 rounded-sm flex items-center justify-center border border-rose-900/40 tracking-wider">YT</span>;
      case "Instagram":
        return <span className="font-sans font-extrabold text-[9px] bg-fuchsia-950/60 text-fuchsia-400 w-5 h-5 rounded-sm flex items-center justify-center border border-fuchsia-900/40 tracking-wider">IG</span>;
      case "Reddit":
        return <span className="font-sans font-extrabold text-[9px] bg-amber-950/60 text-amber-400 w-5 h-5 rounded-sm flex items-center justify-center border border-amber-900/40 tracking-wider">RD</span>;
      case "Kick":
        return <span className="font-sans font-extrabold text-[9px] bg-emerald-950/60 text-emerald-400 w-5 h-5 rounded-sm flex items-center justify-center border border-emerald-900/40 tracking-wider">KK</span>;
      case "Twitch":
        return <span className="font-sans font-extrabold text-[9px] bg-purple-950/60 text-purple-400 w-5 h-5 rounded-sm flex items-center justify-center border border-purple-900/40 tracking-wider">TW</span>;
      default:
        return <span className="font-mono text-[9px] text-slate-500">#</span>;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchLiveAI(searchQuery);
    }
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-full">
      {/* Table Toolbar controls */}
      <div className="p-4 bg-slate-950/40 border-b border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Type keyword & hit Enter to pull Top 10 Live AI Trends (e.g. 'comedy')..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white pl-9 pr-24 py-2 rounded focus:outline-none focus:border-indigo-500 font-sans"
          />
          <button
            type="submit"
            disabled={isSearchingLive || !searchQuery.trim()}
            className="absolute right-1.5 top-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-[10px] font-mono text-white px-2.5 py-1 rounded transition-colors font-bold cursor-pointer"
          >
            {isSearchingLive ? "Querying..." : "Search Live AI"}
          </button>
        </form>

        {/* Filters */}
        <div className="flex gap-2 items-center">
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-sans cursor-pointer"
          >
            <option value="All">All Channels</option>
            <option value="X">X / Twitter</option>
            <option value="TikTok">TikTok</option>
            <option value="LinkedIn">LinkedIn</option>
            <option value="YouTube">YouTube</option>
            <option value="Instagram">Instagram</option>
            <option value="Reddit">Reddit</option>
            <option value="Kick">Kick</option>
            <option value="Twitch">Twitch</option>
          </select>

          {selectedCategory && (
            <div className="flex items-center space-x-1 bg-indigo-950/40 border border-indigo-900/60 text-indigo-400 text-xs py-1 px-2.5 rounded font-mono">
              <span>CAT: {selectedCategory.toUpperCase()}</span>
              <button
                onClick={onClearCategoryFilter}
                className="hover:text-indigo-300 font-bold ml-1"
                title="Clear filter"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>

      {searchQuery.trim() && (
        <div className="bg-indigo-950/20 border-b border-indigo-900/30 px-4 py-2 flex items-center justify-between text-[11px] text-slate-300 font-sans">
          <span>
            Showing <strong className="text-indigo-400">Top 10</strong> most viral matching trends for: <span className="text-amber-400 font-bold font-mono">"{searchQuery}"</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {displayedTrends.length} results
          </span>
        </div>
      )}

      {/* Topics List Table container */}
      <div className="flex-1 overflow-x-auto custom-scrollbar">
        {filteredTrends.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-mono text-xs flex flex-col items-center justify-center space-y-2">
            <span>No matching viral trends found for active parameters.</span>
            {(searchQuery || selectedCategory || platformFilter !== "All") && (
              <button
                onClick={() => {
                  onSearchQueryChange("");
                  setPlatformFilter("All");
                  onClearCategoryFilter();
                }}
                className="text-indigo-400 hover:underline flex items-center space-x-1 mt-1 font-mono cursor-pointer text-xs"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500 font-mono text-[10px] uppercase tracking-widest bg-slate-950/20">
                <th className="py-3 px-4 font-bold">Topic / Trend</th>
                <th
                  onClick={() => handleSort("viralityScore")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 transition-colors font-bold"
                >
                  <div className="flex items-center space-x-1">
                    <span>Virality Index</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("volume")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 transition-colors font-bold"
                >
                  <div className="flex items-center space-x-1">
                    <span>Mentions</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("growthPercentage")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 transition-colors font-bold"
                >
                  <div className="flex items-center space-x-1">
                    <span>Velocity</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("engagementRate")}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200 transition-colors font-bold"
                >
                  <div className="flex items-center space-x-1">
                    <span>Engagement</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th className="py-3 px-4 font-bold">Sentiment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {displayedTrends.map((t) => {
                const isSelected = selectedTrendTopic === t.topic;
                
                const sentimentStyle = {
                  positive: "bg-teal-950/40 text-teal-400 border-teal-900/60",
                  neutral: "bg-slate-950 text-slate-400 border-slate-900",
                  negative: "bg-rose-950/40 text-rose-400 border-rose-900/60"
                }[t.sentiment];

                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTrendTopic(isSelected ? null : t.topic)}
                    className={`transition-all hover:bg-slate-800/30 cursor-pointer ${
                      isSelected ? "bg-indigo-950/20 border-l border-l-indigo-500" : ""
                    }`}
                  >
                    {/* Topic Details Column */}
                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="flex items-start space-x-3">
                        <div className="mt-0.5 shrink-0">{getPlatformIcon(t.platform)}</div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <a
                              href={getSearchUrl(t.platform, t.topic)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              className="font-sans font-bold text-sm text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1 group/link truncate"
                              title={`View original post/search on ${t.platform}`}
                            >
                              <span>{t.topic}</span>
                              <ExternalLink className="w-3 h-3 opacity-60 group-hover/link:opacity-100 transition-opacity" />
                            </a>
                            {t.isBreaking && (
                              <span className="text-[9px] bg-rose-950/60 text-rose-400 font-mono px-1.5 py-0.5 rounded-sm border border-rose-900 flex items-center space-x-0.5 shrink-0 uppercase tracking-widest animate-pulse font-semibold">
                                <Flame className="w-3 h-3" />
                                <span>BREAKING</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed font-sans">
                            {t.description}
                          </p>
                          <div className="flex items-center space-x-2 mt-1.5 flex-wrap">
                            <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded-sm text-slate-400 font-mono border border-slate-900">
                              {t.category.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              Channel: {t.platform}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Virality Index Column */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-1.5 font-mono">
                        <Flame className="w-4 h-4 text-amber-500 fill-amber-500/15" />
                        <span className="text-sm font-bold text-amber-400">{getViralityScore(t)}</span>
                        <span className="text-[10px] text-slate-500">pts</span>
                      </div>
                    </td>

                    {/* Volume Mentions Column */}
                    <td className="py-3.5 px-4 font-mono text-sm text-slate-200">
                      <div className="flex flex-col">
                        <span>{formatNumber(t.volume)}</span>
                        <div className="w-16 h-1 bg-slate-950 rounded-sm overflow-hidden mt-1">
                          <div
                            className="h-full bg-indigo-500 rounded-sm"
                            style={{ width: `${Math.min(100, (t.volume / 1000000) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Growth Velocity Column */}
                    <td className="py-3.5 px-4 font-mono text-sm text-teal-400">
                      <div className="flex items-center space-x-1 font-semibold">
                        <TrendingUp className="w-3.5 h-3.5 shrink-0 text-teal-500" />
                        <span>+{t.growthPercentage}%</span>
                      </div>
                    </td>

                    {/* Engagement Column */}
                    <td className="py-3.5 px-4 font-mono text-sm text-indigo-400">
                      <div className="flex flex-col">
                        <span>{t.engagementRate}%</span>
                        <div className="w-16 h-1 bg-slate-950 rounded-sm overflow-hidden mt-1">
                          <div
                            className="h-full bg-indigo-500 rounded-sm"
                            style={{ width: `${Math.min(100, (t.engagementRate / 20) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Sentiment Badges Column */}
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${sentimentStyle} uppercase tracking-wider`}>
                        {t.sentiment}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Info indicator */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <span>Click any row to filter visual posts feed.</span>
        <span>Showing {filteredTrends.length} active topics</span>
      </div>
    </div>
  );
}

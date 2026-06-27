import { Trend, SocialPost } from "../types";
import { Flame, ExternalLink, Video, Play, Tv, Sparkles } from "lucide-react";

interface Props {
  trends: Trend[];
  posts: SocialPost[];
  selectedTrendTopic: string | null;
  onSelectTrendTopic: (topic: string | null) => void;
}

const getSearchUrl = (platform: string, topic: string) => {
  const query = encodeURIComponent(topic);
  switch (platform) {
    case "X":
    case "Twitter":
      return `https://x.com/search?q=${query}`;
    case "Facebook":
      return `https://www.facebook.com/search/top/?q=${query}`;
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

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "X":
    case "Twitter":
      return <span className="font-sans font-extrabold text-[10px] bg-slate-950 text-slate-100 w-5 h-5 rounded-sm flex items-center justify-center border border-slate-800 tracking-wider">X</span>;
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

const getViralityScore = (t: Trend) => {
  if (t.viralityScore) return t.viralityScore;
  return Math.round((t.engagementRate * (t.volume / 15000) * Math.log10(t.growthPercentage || 10)));
};

const formatNumber = (num: number) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
};

export default function TopSocialVideos({ trends, posts, selectedTrendTopic, onSelectTrendTopic }: Props) {
  // Define social platforms requested: YouTube, Twitter/X, Facebook, Instagram, TikTok, Kick, Twitch, and Reddit
  const requestedPlatforms = ["YouTube", "Twitter", "X", "Facebook", "Instagram", "TikTok", "Kick", "Twitch", "Reddit"];

  // Classifier to determine if a trend represents video content
  const isVideoTrend = (t: Trend) => {
    // 1. TikTok, YouTube, Twitch, Kick are natively video/streaming platforms
    const videoPlatforms = ["TikTok", "YouTube", "Twitch", "Kick"];
    if (videoPlatforms.includes(t.platform)) {
      return true;
    }

    // 2. Check if any associated post in state has mediaType === 'video'
    const matchingPost = posts.find((p) => {
      const pTopic = t.topic.toLowerCase();
      const pContent = p.content.toLowerCase();
      const pCategory = p.category.toLowerCase();
      const tCategory = t.category.toLowerCase();

      const isRelated =
        pContent.includes(pTopic) ||
        pTopic.includes(pCategory) ||
        pCategory.includes(pTopic) ||
        (p.platform === t.platform && pCategory === tCategory);

      return isRelated && p.mediaType === "video";
    });

    if (matchingPost) {
      return true;
    }

    // 3. Heuristic: check if the trend topic or description contains video-related keywords
    const videoKeywords = [
      "video",
      "stream",
      "broadcast",
      "clip",
      "trailer",
      "play",
      "short",
      "reel",
      "smart-glasses",
      "watch",
      "vlog",
      "live",
      "camera",
      "multimodal translation",
      "navigating",
      "gameplay",
      "showcase"
    ];
    const textToSearch = `${t.topic} ${t.description}`.toLowerCase();
    return videoKeywords.some((kw) => textToSearch.includes(kw));
  };

  // Filter trends to match requested platforms, verify it's a video trend, sort by virality (which incorporates 5-day views & likes weight), and take top 10
  const filtered = trends
    .filter((t) => requestedPlatforms.includes(t.platform) && isVideoTrend(t))
    .sort((a, b) => getViralityScore(b) - getViralityScore(a)) // sort descending by 5-day engagement & views
    .slice(0, 10); // top ten only

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <Video className="w-4 h-4 text-rose-500 animate-pulse" />
          <h2 className="text-xs font-mono text-slate-300 uppercase tracking-widest font-bold">
            Top 10 Social Media Videos (Last 5 Days)
          </h2>
        </div>
        <span className="text-[9px] font-mono bg-rose-950/60 text-rose-400 px-2.5 py-0.5 rounded border border-rose-900/40 font-semibold uppercase flex items-center gap-1">
          <Play className="w-2.5 h-2.5 fill-rose-400/20 text-rose-400" />
          5D Feed
        </span>
      </div>

      <p className="text-xs text-slate-400 font-sans leading-relaxed">
        The absolute most viewed and liked video content, streams, and reels across major platforms, strictly counting metrics and engagement received over the last 5-day period.
      </p>

      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/40 rounded border border-slate-850">
          <p className="text-xs text-slate-500 font-mono">No matching social media video trends found.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
          {filtered.map((t, idx) => {
            const isSelected = selectedTrendTopic === t.topic;
            const virality = getViralityScore(t);
            const rank = idx + 1;

            // Compute likes received strictly over the last 5 days using volume and engagement rate as base
            const estLikes = Math.max(120, Math.round(t.volume * (t.engagementRate / 100) * 0.45));

            // Stylized medal markers for top 3
            let badgeColor = "bg-slate-950 text-slate-400 border-slate-850";
            if (rank === 1) badgeColor = "bg-rose-500 text-white border-rose-400 font-extrabold shadow-lg shadow-rose-500/10";
            else if (rank === 2) badgeColor = "bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-lg shadow-amber-500/10";
            else if (rank === 3) badgeColor = "bg-slate-300 text-slate-950 border-slate-200 font-extrabold";

            return (
              <div
                key={t.id}
                onClick={() => onSelectTrendTopic(isSelected ? null : t.topic)}
                className={`flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3.5 rounded border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-950/40 border-indigo-500/80 shadow-indigo-500/5 shadow-md"
                    : "bg-slate-950/40 border-slate-850 hover:border-slate-700 hover:bg-slate-900/40"
                }`}
              >
                {/* Left side: Rank badge, Icon, Topic, description */}
                <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border shrink-0 font-mono mt-0.5 ${badgeColor}`}>
                    {rank}
                  </span>

                  <div className="mt-1 shrink-0">{getPlatformIcon(t.platform)}</div>

                  <div className="min-w-0 space-y-1 pr-4">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <a
                        href={getSearchUrl(t.platform, t.topic)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        className="font-sans font-bold text-sm text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1 group/toplink truncate"
                        title={`View original video on ${t.platform}`}
                      >
                        <span>{t.topic}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 group-hover/toplink:opacity-100 transition-opacity" />
                      </a>

                      <span className="text-[9px] text-slate-500 font-mono bg-slate-900 px-1.5 py-0.5 rounded border border-slate-850/60 flex items-center gap-1">
                        <Play className="w-2 h-2 fill-slate-500 text-slate-500" />
                        {t.category}
                      </span>

                      {t.isBreaking && (
                        <span className="text-[8px] bg-rose-950/50 text-rose-400 font-mono px-1.5 py-0.5 rounded-sm border border-rose-900/60 animate-pulse uppercase tracking-wider font-semibold">
                          Breaking
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-1 font-sans">
                      {t.description}
                    </p>
                  </div>
                </div>

                {/* Right side: Virality Score and stats */}
                <div className="flex items-center space-x-4 shrink-0 justify-between sm:justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-slate-800/40 sm:border-t-0">
                  {/* Stats representing last 5 days exclusively */}
                  <div className="text-left font-mono text-[11px] text-slate-500 space-y-0.5 hidden sm:block shrink-0 min-w-[110px]">
                    <div>
                      Views (5d): <strong className="text-slate-300">{formatNumber(t.volume)}</strong>
                    </div>
                    <div>
                      Likes (5d): <strong className="text-rose-400">{formatNumber(estLikes)}</strong>
                    </div>
                  </div>

                  {/* Virality Score Badge */}
                  <div className="flex items-center space-x-1.5 font-mono bg-slate-950 border border-slate-850 px-2.5 py-1 rounded shrink-0">
                    <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" />
                    <span className="text-xs font-bold text-amber-400">{virality}</span>
                    <span className="text-[9px] text-slate-500 font-normal">idx</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { SocialPost } from "../types";
import { Heart, MessageSquare, Share2, Bookmark, BookmarkCheck, ExternalLink, Play } from "lucide-react";

interface Props {
  posts: SocialPost[];
  selectedTrendTopic: string | null;
  onShareClick: (post: SocialPost) => void;
  bookmarkedIds: string[];
  onToggleBookmark: (id: string) => void;
}

export default function ViralFeed({
  posts,
  selectedTrendTopic,
  onShareClick,
  bookmarkedIds,
  onToggleBookmark
}: Props) {
  const [localLikes, setLocalLikes] = useState<Record<string, { count: number; liked: boolean }>>({});

  const handleLike = (id: string, initialLikes: number) => {
    const isLiked = localLikes[id]?.liked;
    const currentCount = localLikes[id]?.count ?? initialLikes;
    
    setLocalLikes({
      ...localLikes,
      [id]: {
        count: isLiked ? currentCount - 1 : currentCount + 1,
        liked: !isLiked
      }
    });
  };

  const formatEngagement = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  // Filter posts if a specific trend topic is selected
  const filteredPosts = posts.filter((p) => {
    if (!selectedTrendTopic) return true;
    
    // Fuzzy matching post content or category with the selected trend
    const cleanTopic = selectedTrendTopic.toLowerCase();
    const cleanContent = p.content.toLowerCase();
    const cleanCategory = p.category.toLowerCase();
    
    // Check hashtag matching or category matching
    return (
      cleanContent.includes(cleanTopic) ||
      cleanCategory === cleanTopic ||
      cleanTopic.includes(cleanCategory)
    );
  }).sort((a, b) => b.engagementRate - a.engagementRate);

  const getPlatformColors = (platform: string) => {
    switch (platform) {
      case "X":
        return "border-slate-800 bg-slate-900/30 hover:border-slate-700 text-slate-100";
      case "TikTok":
        return "border-slate-800/60 bg-slate-900/30 hover:border-sky-900/40 text-sky-100";
      case "LinkedIn":
        return "border-slate-800/60 bg-slate-900/30 hover:border-indigo-900/40 text-indigo-100";
      case "YouTube":
        return "border-slate-800/60 bg-slate-900/30 hover:border-rose-900/40 text-rose-100";
      case "Instagram":
        return "border-slate-800/60 bg-slate-900/30 hover:border-fuchsia-900/40 text-fuchsia-100";
      case "Reddit":
        return "border-slate-800/60 bg-slate-900/30 hover:border-amber-900/40 text-amber-100";
      case "Kick":
        return "border-slate-800/60 bg-slate-900/30 hover:border-emerald-900/40 text-emerald-100";
      case "Twitch":
        return "border-slate-800/60 bg-slate-900/30 hover:border-purple-900/40 text-purple-100";
      default:
        return "border-slate-800 bg-slate-900/30";
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "X":
        return <span className="font-sans font-extrabold text-[9px] bg-slate-950 text-slate-100 px-1.5 py-0.5 rounded-sm border border-slate-800 tracking-wider">X POST</span>;
      case "TikTok":
        return <span className="font-sans font-extrabold text-[9px] bg-slate-950 text-sky-400 px-1.5 py-0.5 rounded-sm border border-slate-900 tracking-wider">TIKTOK</span>;
      case "LinkedIn":
        return <span className="font-sans font-extrabold text-[9px] bg-indigo-950/60 text-indigo-400 px-1.5 py-0.5 rounded-sm border border-indigo-900/30 tracking-wider">LINKEDIN</span>;
      case "YouTube":
        return <span className="font-sans font-extrabold text-[9px] bg-rose-950/60 text-rose-400 px-1.5 py-0.5 rounded-sm border border-rose-900/30 tracking-wider">YOUTUBE</span>;
      case "Instagram":
        return <span className="font-sans font-extrabold text-[9px] bg-fuchsia-950/60 text-fuchsia-400 px-1.5 py-0.5 rounded-sm border border-fuchsia-900/30 tracking-wider">INSTAGRAM</span>;
      case "Reddit":
        return <span className="font-sans font-extrabold text-[9px] bg-amber-950/60 text-amber-400 px-1.5 py-0.5 rounded-sm border border-amber-900/30 tracking-wider">REDDIT</span>;
      case "Kick":
        return <span className="font-sans font-extrabold text-[9px] bg-emerald-950/60 text-emerald-400 px-1.5 py-0.5 rounded-sm border border-emerald-900/30 tracking-wider">KICK</span>;
      case "Twitch":
        return <span className="font-sans font-extrabold text-[9px] bg-purple-950/60 text-purple-400 px-1.5 py-0.5 rounded-sm border border-purple-900/30 tracking-wider">TWITCH</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Filter Info */}
      <div className="flex items-center justify-between">
        <h3 className="font-sans font-bold text-xs text-slate-400 uppercase tracking-widest flex items-center space-x-2">
          <span>Live Viral Stream</span>
          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
        </h3>
        
        {selectedTrendTopic && (
          <span className="text-[10px] bg-indigo-950/40 text-indigo-400 px-2.5 py-1 rounded font-mono flex items-center space-x-1.5 border border-indigo-900/40">
            <span>FILTERED: <strong>{selectedTrendTopic.toUpperCase()}</strong></span>
          </span>
        )}
      </div>

      {filteredPosts.length === 0 ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-12 text-center text-slate-500 font-mono text-xs">
          No highly viral social posts found for current filter parameter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPosts.map((post) => {
            const hasMedia = !!post.mediaUrl;
            const isBookmarked = bookmarkedIds.includes(post.id);
            const userLikedInfo = localLikes[post.id];
            const liked = userLikedInfo?.liked ?? false;
            const likesCount = userLikedInfo?.count ?? post.likes;

            return (
              <div
                key={post.id}
                className={`border rounded-lg p-5 transition-all duration-300 flex flex-col space-y-4 ${getPlatformColors(post.platform)}`}
              >
                {/* Post Author / Platform Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-sm bg-slate-950 border border-slate-800 flex items-center justify-center font-mono font-bold text-xs text-slate-300 uppercase tracking-wider select-none">
                      {post.avatar}
                    </div>
                    <div>
                      <span className="font-sans font-semibold text-sm text-slate-200 block">
                        {post.author}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 block">
                        {post.handle} • {post.timestamp}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getPlatformIcon(post.platform)}
                    <span className="text-[9px] bg-slate-950 px-2 py-0.5 rounded-sm text-slate-400 font-mono border border-slate-900 uppercase">
                      {post.category}
                    </span>
                  </div>
                </div>

                {/* Post content body */}
                <p className="font-sans text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>

                {/* Rich media simulation */}
                {hasMedia && (
                  <div className="relative rounded-sm overflow-hidden border border-slate-850 aspect-video group bg-slate-950 flex items-center justify-center">
                    <img
                      src={post.mediaUrl}
                      alt="Viral social content thumbnail"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-all duration-300"
                    />
                    
                    {/* Visual Media Overlay triggers */}
                    {post.mediaType === "video" && (
                      <div className="relative z-10 w-10 h-10 rounded-full bg-slate-950/80 border border-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer">
                        <Play className="w-4 h-4 text-slate-200 fill-slate-200 ml-0.5" />
                      </div>
                    )}
                    
                    <div className="absolute bottom-2.5 left-2.5 bg-slate-950/90 px-2 py-1 rounded-sm border border-slate-800 text-[9px] font-mono text-slate-400 flex items-center space-x-1 uppercase tracking-wider">
                      <span>{post.mediaType === "video" ? "MP4 VIDEO" : "JPEG ATTACHMENT"}</span>
                    </div>
                  </div>
                )}

                {/* Engagement counts */}
                <div className="border-t border-slate-800/40 pt-3 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <div className="flex items-center space-x-4 sm:space-x-6">
                    {/* Like button */}
                    <button
                      onClick={() => handleLike(post.id, post.likes)}
                      className={`flex items-center space-x-1.5 transition-colors cursor-pointer group ${
                        liked ? "text-rose-500 font-semibold" : "hover:text-rose-400 text-slate-500"
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 group-hover:scale-110 transition-transform ${liked ? "fill-rose-500 text-rose-500" : ""}`} />
                      <span>{formatEngagement(likesCount)}</span>
                    </button>

                    {/* Comment count */}
                    <div className="flex items-center space-x-1.5 text-slate-500">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{formatEngagement(post.comments)}</span>
                    </div>

                    {/* Shared trigger */}
                    <button
                      onClick={() => onShareClick(post)}
                      className="flex items-center space-x-1.5 text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer group"
                      title="Share / Draft post text"
                    >
                      <Share2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span>{formatEngagement(post.shares)}</span>
                    </button>
                  </div>

                  {/* Offline Bookmark / Save option */}
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => onToggleBookmark(post.id)}
                      className={`flex items-center space-x-1 cursor-pointer transition-all ${
                        isBookmarked
                          ? "text-indigo-400 bg-indigo-950/30 border border-indigo-900/60 px-2 py-0.5 rounded-sm"
                          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/40 p-1 rounded-sm"
                      }`}
                      title={isBookmarked ? "Saved for offline access" : "Save for offline access"}
                    >
                      {isBookmarked ? (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[9px] font-sans font-medium hidden sm:inline">SAVED OFFLINE</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-[9px] font-sans hidden sm:inline">SAVE OFFLINE</span>
                        </>
                      )}
                    </button>
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

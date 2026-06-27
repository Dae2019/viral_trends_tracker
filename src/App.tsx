import { useState, useEffect, useCallback, useRef, FormEvent } from "react";
import { Trend, SocialPost, CategoryDistribution, BreakingAlert, UserPreferences, DashboardStats } from "./types";
import CategoryPieChart from "./components/CategoryPieChart";
import PreferencesPanel from "./components/PreferencesPanel";
import TrendsTable from "./components/TrendsTable";
import ViralFeed from "./components/ViralFeed";
import TopSocialVideos from "./components/TopSocialVideos";
import SharingModal from "./components/SharingModal";
import NotificationCenter, { playBreakingAlertChime } from "./components/NotificationCenter";
import { Flame, Database, RefreshCw, Sparkles, AlertCircle, Share2, Search, Info, Bookmark, Wifi, WifiOff } from "lucide-react";

const DEFAULT_PREFERENCES: UserPreferences = {
  preferredPlatforms: [],
  preferredCategories: [],
  minEngagementRate: 0,
  refreshInterval: 60, // 60 seconds
  enableNotifications: true,
  enableSound: true
};

export default function App() {
  // --- States ---
  const [trends, setTrends] = useState<Trend[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [categories, setCategories] = useState<CategoryDistribution[]>([]);
  const [alerts, setAlerts] = useState<BreakingAlert[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalVolume: 0,
    avgEngagement: 0,
    activeTrendsCount: 0,
    breakingAlertsCount: 0
  });

  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  
  // --- Advanced Filter Options State ---
  const [searchKeyword, setSearchKeyword] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minViralityThreshold, setMinViralityThreshold] = useState(0);

  // Ref to avoid duplicate notifications for the same topic
  const notifiedTopicsRef = useRef<string[]>([]);

  const [selectedTrendTopic, setSelectedTrendTopic] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const [activeSharePost, setActiveSharePost] = useState<SocialPost | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Ref to prevent multiple triggers
  const initialLoadDone = useRef(false);

  // --- Show Temporary In-App Alert Toast ---
  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  // --- Load Local Preferences and Saved Bookmarks on Boot ---
  useEffect(() => {
    // Preferences
    const savedPrefs = localStorage.getItem("trends_preferences");
    if (savedPrefs) {
      try {
        setPreferences(JSON.parse(savedPrefs));
      } catch (e) {
        console.error("Failed to parse preferences:", e);
      }
    }

    // Bookmarked posts
    const savedBookmarks = localStorage.getItem("trends_bookmarks");
    if (savedBookmarks) {
      try {
        setBookmarkedIds(JSON.parse(savedBookmarks));
      } catch (e) {
        console.error("Failed to parse bookmarks:", e);
      }
    }

    // Request browser push notification permission if enabled
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          triggerToast("Push notifications configured for breaking trends!");
        }
      });
    }
  }, [triggerToast]);

  // --- Save Preferences to Local Storage on Change ---
  const handleUpdatePreferences = (newPrefs: UserPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem("trends_preferences", JSON.stringify(newPrefs));
    triggerToast("Dashboard configuration saved successfully.");
  };

  // --- Save Bookmarks to Local Storage on Toggle ---
  const handleToggleBookmark = (postId: string) => {
    let updated = [...bookmarkedIds];
    if (updated.includes(postId)) {
      updated = updated.filter((id) => id !== postId);
      triggerToast("Removed post from offline bookmarks.");
    } else {
      updated.push(postId);
      triggerToast("Post bookmarked! Saved for offline reading access.");
    }
    setBookmarkedIds(updated);
    localStorage.setItem("trends_bookmarks", JSON.stringify(updated));
  };

  // --- Registry search Live AI handler ---
  const handleRegistrySearchLiveAI = async (query: string) => {
    const term = query.trim();
    if (!term) return;
    setSearching(true);
    setSearchKeyword(term);
    triggerToast(`Querying Gemini Live AI for viral "${term}" over the last 5 days...`);
    try {
      const response = await fetch("/api/custom-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: term,
          platforms: [], // Allow all platforms
          categories: [], // Allow all categories
          dateRange: "last_5_days"
        })
      });

      if (!response.ok) throw new Error("Search request failed");
      const data = await response.json();
      
      if (data.trends && data.trends.length > 0) {
        setTrends((prev) => {
          const filteredPrev = prev.filter(p => !data.trends.some((n: Trend) => n.id === p.id || n.topic === p.topic));
          return [...data.trends, ...filteredPrev];
        });
        if (data.viralPosts && data.viralPosts.length > 0) {
          setPosts((prev) => {
            const filteredPrev = prev.filter(p => !data.viralPosts.some((n: any) => n.id === p.id));
            return [...data.viralPosts, ...filteredPrev];
          });
        }
        // Force selection to the first matched trend
        setSelectedTrendTopic(data.trends[0].topic);
        triggerToast(`Pulled ${data.trends.length} viral "${term}" stories from the last 5 days!`);
      } else {
        triggerToast("No trending stories found for this query.");
      }
    } catch (err) {
      console.error("Custom search failed:", err);
      triggerToast("Gemini Live AI connection timed out. Showing local matches.");
    } finally {
      setSearching(false);
    }
  };

  // --- Load Trends Data from API (With Caching and Offline Fallback) ---
  const loadTrendsData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setErrorMsg(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const response = await fetch("/api/trends", { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Set states
      setTrends(data.trends || []);
      setPosts(data.viralPosts || []);
      setCategories(data.categoryDistribution || []);
      setAlerts(data.breakingAlerts || []);
      setStats(data.stats || {
        totalVolume: 0,
        avgEngagement: 0,
        activeTrendsCount: 0,
        breakingAlertsCount: 0
      });
      setIsOfflineMode(false);
      
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastUpdated(timeStr);

      // Save to localStorage cache for offline access
      localStorage.setItem("cached_trends_data", JSON.stringify(data));
      localStorage.setItem("cached_trends_timestamp", timeStr);

      if (!isSilent) {
        if (data.dataSource === "gemini-api") {
          triggerToast("Successfully synchronized with real-time AI grounded trends!");
        } else {
          triggerToast("Loaded default social trends catalog (API Key not set).");
        }
      }
    } catch (err) {
      console.warn("API load failed, accessing local persistent cache:", err);
      setIsOfflineMode(true);
      setErrorMsg("Network offline. Loading latest snapshot from client cache.");

      // Attempt to load from offline cache
      const cachedRaw = localStorage.getItem("cached_trends_data");
      const cachedTimestamp = localStorage.getItem("cached_trends_timestamp");

      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          setTrends(cached.trends || []);
          setPosts(cached.viralPosts || []);
          setCategories(cached.categoryDistribution || []);
          setAlerts(cached.breakingAlerts || []);
          setStats(cached.stats || {
            totalVolume: 0,
            avgEngagement: 0,
            activeTrendsCount: 0,
            breakingAlertsCount: 0
          });
          setLastUpdated(cachedTimestamp || "Cached");
          triggerToast("Offline Mode Active. Displaying cached dashboard state.");
        } catch (e) {
          console.error("Failed to parse cached trends:", e);
        }
      } else {
        setErrorMsg("Failed to connect to trends server and no offline cache was found.");
      }
    } finally {
      setLoading(false);
    }
  }, [triggerToast]);

  // Run initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      loadTrendsData();
      initialLoadDone.current = true;
    }
  }, [loadTrendsData]);

  // --- Customized AI Niche Search via Search Grounding API ---
  const handleCustomSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim()) return;

    setSearching(true);
    triggerToast(`Searching AI-grounded database for niche topic: "${customQuery}"...`);

    try {
      const response = await fetch("/api/custom-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: customQuery,
          platforms: preferences.preferredPlatforms,
          categories: preferences.preferredCategories
        })
      });

      if (!response.ok) throw new Error("Search request failed");

      const data = await response.json();
      
      // Merge search results into main view beautifully
      if (data.trends && data.trends.length > 0) {
        // Prepend custom trends so they appear at the top
        setTrends((prev) => {
          const filteredPrev = prev.filter(p => !data.trends.some((n: Trend) => n.id === p.id || n.topic === p.topic));
          return [...data.trends, ...filteredPrev];
        });
        
        if (data.viralPosts && data.viralPosts.length > 0) {
          setPosts((prev) => {
            const filteredPrev = prev.filter(p => !data.viralPosts.some((n: SocialPost) => n.id === p.id));
            return [...data.viralPosts, ...filteredPrev];
          });
        }

        // Highlight the searched topic in the feed!
        setSelectedTrendTopic(data.trends[0].topic);
        triggerToast(`Found ${data.trends.length} custom trend results! Applied automatic highlight.`);
      } else {
        triggerToast("No new trends found for this niche query. Reverting to general feed.");
      }
    } catch (err) {
      console.error("Custom search failed:", err);
      triggerToast("AI search failed. Please check connection and try again.");
    } finally {
      setSearching(false);
    }
  };

  // --- Reset Customized AI Search and Filters ---
  const handleResetSearch = () => {
    setCustomQuery("");
    setSelectedTrendTopic(null);
    loadTrendsData();
  };

  // --- Real-time Breaking Trend Monitor (Native Push Notifications) ---
  const monitorIncomingTrends = useCallback((newTrends: Trend[]) => {
    if (!preferences.enableNotifications) return;

    newTrends.forEach((trend) => {
      // Calculate a realistic virality score to trigger alerts
      const score = trend.viralityScore || Math.round((trend.engagementRate * (trend.volume / 15000) * Math.log10(trend.growthPercentage || 10)));
      
      // Notify if it's explicitly breaking OR has growth percentage >= 300 OR high virality score >= 80
      const isCritical = trend.isBreaking || (trend.growthPercentage >= 300) || (score >= 80);

      if (isCritical && !notifiedTopicsRef.current.includes(trend.topic)) {
        notifiedTopicsRef.current.push(trend.topic);

        const alertId = "alert-auto-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
        const newAlert: BreakingAlert = {
          id: alertId,
          title: `CRITICAL SPIKE: ${trend.topic}`,
          description: trend.description || `Spike detected on ${trend.platform}! Volume grew +${trend.growthPercentage}% with ${trend.engagementRate}% engagement.`,
          timestamp: "Just now",
          category: trend.category,
          platform: trend.platform,
          severity: trend.growthPercentage >= 400 ? "high" : "medium",
          isRead: false
        };

        // Prepend to alerts list
        setAlerts((prev) => {
          if (prev.some(a => a.title === newAlert.title)) return prev;
          return [newAlert, ...prev];
        });

        // Trigger Audio Chime
        if (preferences.enableSound) {
          playBreakingAlertChime();
        }

        // Trigger Browser Desktop Push Notification
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(`🚨 BREAKING TREND: ${trend.topic}`, {
              body: trend.description,
              icon: "/favicon.ico"
            });
          } catch (e) {
            console.warn("Desktop notification error:", e);
          }
        }

        // Display beautiful in-app toast banner
        triggerToast(`🚨 Breaking Spike: "${trend.topic}"`);
      }
    });
  }, [preferences.enableNotifications, preferences.enableSound, triggerToast]);

  // Automatically monitor trends whenever they change
  useEffect(() => {
    if (trends.length > 0) {
      monitorIncomingTrends(trends);
    }
  }, [trends, monitorIncomingTrends]);

  // --- Background Simulator for Breaking Trend Alerts ---
  // If notifications are active, trigger a simulated break chime once every 50 seconds to keep the interface lively
  useEffect(() => {
    if (!preferences.enableNotifications) return;

    const intervalId = setInterval(() => {
      // Create a list of cool possible breaking alerts
      const potentialAlerts = [
        {
          id: "alert-" + Date.now(),
          title: "Hyper-Efficient Solid-State Battery Release",
          description: "Shares of electric vehicle manufacturers spike +15% as breakthrough patents are unveiled.",
          category: "Science",
          platform: "X",
          severity: "high" as const
        },
        {
          id: "alert-" + Date.now(),
          title: "Global Cyber-Outage in Flight Systems",
          description: "Dozens of air routes grounded due to legacy DNS failure. Topic volume reaches 1.4M in 20 minutes.",
          category: "Tech",
          platform: "Reddit",
          severity: "high" as const
        },
        {
          id: "alert-" + Date.now(),
          title: "Viral Eco-Sponge Cleaning Challenge",
          description: "#EcoScrub challenge passes 40 million views on TikTok, sparking massive demand for biodegradable sponges.",
          category: "Lifestyle",
          platform: "TikTok",
          severity: "medium" as const
        }
      ];

      // Grab a random one
      const randomAlert = potentialAlerts[Math.floor(Math.random() * potentialAlerts.length)];
      
      // Ensure we don't spam if it's already in list
      setAlerts((prev) => {
        if (prev.some(a => a.title === randomAlert.title)) return prev;
        
        const newAlert: BreakingAlert = {
          ...randomAlert,
          timestamp: "Just now",
          isRead: false
        };

        // Synthesize audio ping!
        if (preferences.enableSound) {
          playBreakingAlertChime();
        }

        // Browser push notification
        if ("Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(`🚨 BREAKING TREND: ${newAlert.title}`, {
              body: newAlert.description
            });
          } catch (e) {
            console.warn("Native Notification failed, falling back to in-app notification:", e);
          }
        }

        // Push temporary in-app toast banner
        triggerToast(`🚨 BREAKING TREND: ${newAlert.title}`);

        return [newAlert, ...prev];
      });

    }, 55000); // Trigger every 55s

    return () => clearInterval(intervalId);
  }, [preferences.enableNotifications, preferences.enableSound, triggerToast]);

  // --- Auto-Refresh Background Poll Timer ---
  useEffect(() => {
    const secs = preferences.refreshInterval;
    // Skip auto-refresh if there is an active search query to prevent custom results from being overwritten
    if (secs === 0 || isOfflineMode || searchKeyword.trim()) return; // Disabled

    const intervalId = setInterval(() => {
      loadTrendsData(true); // Silent update in background
    }, secs * 1000);

    return () => clearInterval(intervalId);
  }, [preferences.refreshInterval, isOfflineMode, loadTrendsData, searchKeyword]);

  // --- Auto-Reset Search Query after 300 Seconds of Inactivity ---
  useEffect(() => {
    if (!searchKeyword.trim()) return;

    const timeoutId = setTimeout(() => {
      setSearchKeyword("");
      setCustomQuery("");
      setSelectedTrendTopic(null);
      loadTrendsData();
      triggerToast("Active search query has been reset to default after 300 seconds of inactivity.");
    }, 300000); // 300 seconds

    return () => clearTimeout(timeoutId);
  }, [searchKeyword, loadTrendsData, triggerToast]);

  // --- Notifications Mark Handlers ---
  const handleMarkRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: true } : a))
    );
  };

  const handleMarkAllRead = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
    triggerToast("All alerts marked as read.");
  };

  // --- Reset Entire Cache Action ---
  const handleClearCache = () => {
    localStorage.removeItem("cached_trends_data");
    localStorage.removeItem("cached_trends_timestamp");
    localStorage.removeItem("trends_bookmarks");
    setBookmarkedIds([]);
    triggerToast("Cleared local application caches and bookmarks.");
    loadTrendsData();
  };

  // --- Helper to get calculated virality score ---
  const getViralityScore = (t: Trend) => {
    if (t.viralityScore) return t.viralityScore;
    return Math.round((t.engagementRate * (t.volume / 15000) * Math.log10(t.growthPercentage || 10)));
  };

  // Helper to check if a timestamp matches a requested date range
  const matchesDateRange = (itemTimestamp: string | undefined, range: string) => {
    if (!range || range === "all") return true;
    if (!itemTimestamp) return true; // if no timestamp, default to true
    const cleanTs = itemTimestamp.toLowerCase();
    if (range === "hour") {
      return cleanTs.includes("m ago") || cleanTs.includes("just now") || cleanTs === "1h ago" || cleanTs.includes("minute");
    }
    if (range === "day") {
      return cleanTs.includes("m ago") || cleanTs.includes("h ago") || cleanTs.includes("just now") || cleanTs.includes("hour") || cleanTs.includes("minute");
    }
    if (range === "week") {
      return true; // fallbacks and live trends are all within 1 week
    }
    return true;
  };

  // --- Apply Faceted Filtering in Frontend View ---
  const filteredTrends = trends.filter((t) => {
    // 1. Keyword search
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matches = t.topic.toLowerCase().includes(kw) || t.description.toLowerCase().includes(kw) || t.category.toLowerCase().includes(kw);
      if (!matches) return false;
    }
    // 2. Platform focus
    if (selectedPlatforms.length > 0) {
      if (!selectedPlatforms.includes(t.platform)) return false;
    } else if (preferences.preferredPlatforms.length > 0) {
      // fallback to user preferences if no manual multi-select overrides are active
      if (!preferences.preferredPlatforms.includes(t.platform)) return false;
    }
    // 3. Category focus
    if (selectedCategories.length > 0) {
      if (!selectedCategories.includes(t.category)) return false;
    } else if (preferences.preferredCategories.length > 0) {
      if (!preferences.preferredCategories.includes(t.category)) return false;
    }
    // 4. Engagement rate threshold
    if (t.engagementRate < preferences.minEngagementRate) {
      return false;
    }
    // 5. Virality Score filter
    if (getViralityScore(t) < minViralityThreshold) {
      return false;
    }
    return true;
  });

  const filteredPosts = posts.filter((p) => {
    // 1. Keyword search
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      const matches = p.content.toLowerCase().includes(kw) || p.author.toLowerCase().includes(kw) || p.handle.toLowerCase().includes(kw);
      if (!matches) return false;
    }
    // 2. Platform focus
    if (selectedPlatforms.length > 0) {
      if (!selectedPlatforms.includes(p.platform)) return false;
    } else if (preferences.preferredPlatforms.length > 0) {
      if (!preferences.preferredPlatforms.includes(p.platform)) return false;
    }
    // 3. Category focus
    if (selectedCategories.length > 0) {
      if (!selectedCategories.includes(p.category)) return false;
    } else if (preferences.preferredCategories.length > 0) {
      if (!preferences.preferredCategories.includes(p.category)) return false;
    }
    // 4. Date Range filter
    if (!matchesDateRange(p.timestamp, dateRangeFilter)) {
      return false;
    }
    return true;
  }).sort((a, b) => b.engagementRate - a.engagementRate);

  // Extract list of all categories and platforms found in trends data
  const availableCategories = Array.from(new Set(trends.map((t) => t.category))) as string[];
  const availablePlatforms = Array.from(new Set(trends.map((t) => t.platform))) as string[];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white flex flex-col antialiased font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900/95 border border-indigo-500/40 text-slate-100 text-xs py-3 px-4 rounded-xl shadow-2xl flex items-center space-x-3 backdrop-blur-md animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping shrink-0" />
          <span className="font-sans font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 sm:px-8 bg-slate-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-indigo-600 rounded-sm flex items-center justify-center font-bold text-white font-sans select-none shadow-lg shadow-indigo-600/10">V</div>
          <div>
            <h1 className="text-sm sm:text-base font-semibold tracking-tight uppercase text-white font-sans">
              Viral Trends <span className="text-indigo-400 font-light">Tracker</span>
            </h1>
            <span className="text-[9px] font-mono text-slate-500 tracking-wider block uppercase -mt-0.5">
              Geometric Social Analytics Engine
            </span>
          </div>
        </div>

        {/* Connection Status & Operations Center */}
        <div className="flex items-center space-x-4">
          
          {/* Live indicator vs Offline cached indicator */}
          <div
            className={`hidden sm:flex items-center space-x-2 px-3 py-1 bg-slate-950/80 rounded-full border text-[10px] font-mono uppercase ${
              isOfflineMode
                ? "bg-amber-950/40 text-amber-400 border-amber-900/60"
                : "bg-indigo-950/40 text-indigo-400 border-indigo-900/60"
            }`}
          >
            {isOfflineMode ? (
              <>
                <WifiOff className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="font-sans font-medium tracking-wide">Offline Mode Enabled</span>
              </>
            ) : (
              <>
                <Wifi className="w-3 h-3 text-indigo-400 shrink-0 animate-pulse" />
                <span className="font-sans font-medium tracking-wide">AI Grounded Live</span>
              </>
            )}
          </div>

          {/* Sync button */}
          <button
            onClick={() => loadTrendsData()}
            disabled={loading}
            className={`p-2 rounded border border-slate-800 text-gray-400 hover:text-indigo-400 hover:border-slate-700 transition-all flex items-center justify-center cursor-pointer ${
              loading ? "opacity-50" : ""
            }`}
            title="Synchronize AI Trends"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          {/* Notifications Center Bell */}
          <NotificationCenter
            alerts={alerts}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            enableSound={preferences.enableSound}
            enableNotifications={preferences.enableNotifications}
          />

          {/* Clear cache */}
          <button
            onClick={handleClearCache}
            className="hidden lg:block text-[10px] font-mono text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
            title="Clear Local Sandbox"
          >
            Flush Caches
          </button>
        </div>
      </header>

      {/* Main Content Layout - Grid separated by gap-px bg-slate-800 */}
      <main className="flex-1 grid grid-cols-12 gap-px bg-slate-800">
        
        {/* Sidebar Nav */}
        <nav className="col-span-12 lg:col-span-1 bg-slate-950 flex lg:flex-col items-center justify-around lg:justify-start lg:py-8 py-3 space-x-2 lg:space-x-0 lg:space-y-8 select-none">
          <div 
            onClick={handleResetSearch}
            className="w-10 h-10 flex items-center justify-center rounded bg-slate-900 border border-slate-800 text-indigo-500 hover:text-indigo-400 hover:border-slate-700 transition-all cursor-pointer font-bold text-lg"
            title="Reset Filters & Home"
          >
            ◈
          </div>
          <div 
            onClick={() => {
              const el = document.getElementById("search-section");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
              document.getElementById("ai-search-input")?.focus();
            }}
            className="w-10 h-10 flex items-center justify-center rounded text-slate-500 hover:bg-slate-900 hover:text-indigo-400 transition-all cursor-pointer text-base"
            title="AI Custom Query"
          >
            ⌘
          </div>
          <div 
            onClick={() => document.getElementById("trends-registry")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="w-10 h-10 flex items-center justify-center rounded text-slate-500 hover:bg-slate-900 hover:text-indigo-400 transition-all cursor-pointer text-base"
            title="Registry Table"
          >
            📈
          </div>
          <div 
            onClick={() => document.getElementById("viral-feed")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="w-10 h-10 flex items-center justify-center rounded text-slate-500 hover:bg-slate-900 hover:text-indigo-400 transition-all cursor-pointer text-base"
            title="Live Viral Feed"
          >
            👥
          </div>
          <div 
            onClick={() => document.getElementById("preferences-section")?.scrollIntoView({ behavior: "smooth", block: "center" })}
            className="w-10 h-10 flex items-center justify-center rounded text-slate-500 hover:bg-slate-900 hover:text-indigo-400 transition-all cursor-pointer text-base"
            title="Dashboard Preferences"
          >
            ⚙️
          </div>
        </nav>

        {/* Central Column: Dashboard Workspace */}
        <section className="col-span-12 lg:col-span-8 bg-slate-950 p-4 sm:p-6 flex flex-col space-y-6 overflow-y-auto max-h-screen custom-scrollbar">
          
          {/* Offline Warning Banner */}
          {isOfflineMode && (
            <div className="bg-gradient-to-r from-amber-950/70 to-orange-950/70 border border-amber-900/40 rounded p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-pulse">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-display font-semibold text-sm text-amber-300">Offline Caching Active</h4>
                  <p className="text-xs text-amber-400 leading-relaxed font-sans mt-0.5">
                    Viewing cached social trends. Keyword custom AI searches will fallback to local simulated mode until a connection is restored.
                  </p>
                </div>
              </div>
              <button
                onClick={() => loadTrendsData()}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-semibold py-1.5 px-3.5 rounded transition-all shrink-0 font-sans cursor-pointer"
              >
                Retry Live Sync
              </button>
            </div>
          )}

          {/* Geometric Top Metrics Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            
            {/* Stat 1: Total volume */}
            <div className="bg-slate-900 p-5 border-l-4 border-indigo-500 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">
                Weekly Mentions
              </span>
              <span className="text-3xl font-mono font-bold text-white leading-none">
                {stats.totalVolume ? (stats.totalVolume / 1000).toFixed(0) + "K" : "0"}
              </span>
              <span className="text-emerald-400 text-xs mt-2 font-mono font-medium block">
                +12% vs last hour
              </span>
            </div>

            {/* Stat 2: Avg engagement */}
            <div className="bg-slate-900 p-5 border-l-4 border-fuchsia-500 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">
                Engagement Rate
              </span>
              <span className="text-3xl font-mono font-bold text-fuchsia-400 leading-none">
                {stats.avgEngagement}%
              </span>
              <span className="text-emerald-400 text-xs mt-2 font-sans font-medium block">
                Steady Velocity
              </span>
            </div>

            {/* Stat 3: Filtered trends */}
            <div className="bg-slate-900 p-5 border-l-4 border-sky-500 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">
                Active Trends
              </span>
              <span className="text-3xl font-mono font-bold text-sky-400 leading-none">
                {filteredTrends.length}
              </span>
              <span className="text-slate-400 text-xs mt-2 font-sans font-medium block">
                Filtered streams
              </span>
            </div>

            {/* Stat 4: Volatility Spikes */}
            <div className="bg-slate-900 p-5 border-l-4 border-amber-500 flex flex-col justify-between">
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1 block">
                Global Volatility
              </span>
              <span className="text-3xl font-mono font-bold text-amber-400 leading-none">
                {alerts.filter(a => a.severity === "high").length}
              </span>
              <span className="text-rose-400 text-xs mt-2 font-sans font-medium block">
                -2.4% volatility
              </span>
            </div>
          </div>

                  {/* Advanced Analytics Control Center & Interactive Filters */}
          <div id="search-section" className="bg-slate-900 border border-slate-800 rounded p-5 space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                <h2 className="text-xs font-mono text-slate-300 uppercase tracking-widest font-bold">
                  Analytics Command Center
                </h2>
              </div>
              <span className="text-[10px] font-mono bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded border border-indigo-900/40">
                Faceted Grounding Engine
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              Filter current trending streams instantly, or run deep live AI analysis to search real-time social platforms matching your filters.
            </p>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const term = searchKeyword.trim();
              if (!term) return;
              setSearching(true);
              triggerToast(`Querying Gemini Live AI with filters for: "${term}"...`);
              try {
                const response = await fetch("/api/custom-search", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    query: term,
                    platforms: selectedPlatforms.length > 0 ? selectedPlatforms : preferences.preferredPlatforms,
                    categories: selectedCategories.length > 0 ? selectedCategories : preferences.preferredCategories,
                    dateRange: dateRangeFilter
                  })
                });

                if (!response.ok) throw new Error("Search request failed");
                const data = await response.json();
                
                if (data.trends && data.trends.length > 0) {
                  setTrends((prev) => {
                    const filteredPrev = prev.filter(p => !data.trends.some((n: Trend) => n.id === p.id || n.topic === p.topic));
                    return [...data.trends, ...filteredPrev];
                  });
                  if (data.viralPosts && data.viralPosts.length > 0) {
                    setPosts((prev) => {
                      const filteredPrev = prev.filter(p => !data.viralPosts.some((n: SocialPost) => n.id === p.id));
                      return [...data.viralPosts, ...filteredPrev];
                    });
                  }
                  setSelectedTrendTopic(data.trends[0].topic);
                  triggerToast(`Discovered ${data.trends.length} fresh viral spikes matching "${term}"!`);
                } else {
                  triggerToast("No new trends found for this niche query.");
                }
              } catch (err) {
                console.error("Custom search failed:", err);
                triggerToast("Gemini Live AI connection timed out. Showing local matches.");
              } finally {
                setSearching(false);
              }
            }} className="space-y-4">
              
              {/* Query & Local Instant Keyword Filter */}
              <div className="flex flex-col md:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Enter trend keyword, hashtag, or category (e.g. 'Battery breakthrough', 'RPG Trailer')..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-white pl-9 pr-3 py-3 rounded focus:outline-none focus:border-indigo-500 font-sans transition-all"
                  />
                  {searchKeyword && (
                    <span className="absolute right-3 top-3 text-[9px] font-mono text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-900/30">
                      Local Active
                    </span>
                  )}
                </div>
                
                <div className="flex gap-1.5 shrink-0">
                  <button
                    type="submit"
                    disabled={searching || !searchKeyword.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs py-3 px-5 rounded transition-all font-display tracking-wide uppercase flex items-center space-x-1.5 cursor-pointer"
                    title="Run live Google Search grounding query"
                  >
                    {searching ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Querying AI...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Search Live AI</span>
                      </>
                    )}
                  </button>
                  
                  {(searchKeyword || selectedPlatforms.length > 0 || selectedCategories.length > 0 || dateRangeFilter !== "all" || minViralityThreshold > 0) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchKeyword("");
                        setSelectedPlatforms([]);
                        setSelectedCategories([]);
                        setDateRangeFilter("all");
                        setMinViralityThreshold(0);
                        setSelectedTrendTopic(null);
                        loadTrendsData();
                        triggerToast("Command Center filters reset to default.");
                      }}
                      className="bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white text-xs py-3 px-4 rounded border border-slate-800 transition-all font-sans cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of Faceted Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
                
                {/* Facet 1: Platforms Filter (Including Kick and Twitch!) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                    Filter Platform Channel
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["X", "TikTok", "LinkedIn", "YouTube", "Instagram", "Reddit", "Twitch", "Kick"].map((plat) => {
                      const isActive = selectedPlatforms.includes(plat);
                      return (
                        <button
                          type="button"
                          key={plat}
                          onClick={() => {
                            setSelectedPlatforms((prev) =>
                              prev.includes(plat) ? prev.filter((p) => p !== plat) : [...prev, plat]
                            );
                          }}
                          className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-all cursor-pointer ${
                            isActive
                              ? "bg-indigo-950 border-indigo-500/80 text-indigo-300"
                              : "bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          {plat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Facet 2: Categories Filter */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                    Filter Content Category
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Tech", "Science", "Business", "Entertainment", "Lifestyle", "Gaming"].map((cat) => {
                      const isActive = selectedCategories.includes(cat);
                      return (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => {
                            setSelectedCategories((prev) =>
                              prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
                            );
                          }}
                          className={`text-[10px] font-sans px-2.5 py-1 rounded border transition-all cursor-pointer ${
                            isActive
                              ? "bg-fuchsia-950/60 border-fuchsia-500/80 text-fuchsia-300"
                              : "bg-slate-950 border-slate-850 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Slider & Date Selector Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800/40">
                
                {/* Date range filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                    Trend Recency / Date Range
                  </label>
                  <select
                    value={dateRangeFilter}
                    onChange={(e) => setDateRangeFilter(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-xs text-slate-300 py-2.5 px-3 rounded focus:outline-none focus:border-indigo-500 font-sans"
                  >
                    <option value="all">All Available Spikes (Last Week)</option>
                    <option value="hour">Breaking Real-Time (Last 1 Hour)</option>
                    <option value="day">Active Daily Trends (Last 24 Hours)</option>
                    <option value="week">Weekly Rollups</option>
                  </select>
                </div>

                {/* Min virality score slider */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
                      Minimum Virality Index
                    </label>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {minViralityThreshold} 🔥
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="150"
                    value={minViralityThreshold}
                    onChange={(e) => setMinViralityThreshold(parseInt(e.target.value))}
                    className="w-full accent-amber-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="text-[9px] font-mono text-slate-500 block leading-none">
                    Filter out minor spikes and display only ultra-viral conversations.
                  </span>
                </div>

              </div>

            </form>
          </div>

          {/* Trends Registry */}
          <div id="trends-registry" className="space-y-3 pt-2">
            <h3 className="font-sans font-bold text-xs text-slate-400 uppercase tracking-widest flex items-center space-x-2">
              <span>Trending Topics Registry</span>
              <span className="text-[10px] bg-slate-900 border border-slate-800 text-indigo-400 px-2 py-0.5 rounded font-mono font-normal">
                Real-time
              </span>
            </h3>

            {loading ? (
              <div className="bg-slate-900 border border-slate-800 rounded p-16 text-center space-y-4">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono">Synchronizing social indicators and rendering charts...</p>
              </div>
            ) : (
              <TrendsTable
                trends={filteredTrends}
                selectedTrendTopic={selectedTrendTopic}
                onSelectTrendTopic={setSelectedTrendTopic}
                selectedCategory={selectedCategory}
                onClearCategoryFilter={() => setSelectedCategory(null)}
                searchQuery={searchKeyword}
                onSearchQueryChange={setSearchKeyword}
                onSearchLiveAI={handleRegistrySearchLiveAI}
                isSearchingLive={searching}
              />
            )}
          </div>

          {/* Top 10 Social Media Videos leaderboard */}
          {!loading && (
            <div id="top-social-videos" className="space-y-3 pt-2">
              <TopSocialVideos
                trends={trends}
                posts={posts}
                selectedTrendTopic={selectedTrendTopic}
                onSelectTrendTopic={setSelectedTrendTopic}
              />
            </div>
          )}

          {/* Viral Stream Feed */}
          <div id="viral-feed" className="space-y-3 pt-2">
            {loading ? (
              <div className="bg-slate-900 border border-slate-800 rounded p-16 text-center space-y-4">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono">Pulling contextual viral conversations...</p>
              </div>
            ) : (
              <ViralFeed
                posts={filteredPosts}
                selectedTrendTopic={selectedTrendTopic}
                onShareClick={(post) => setActiveSharePost(post)}
                bookmarkedIds={bookmarkedIds}
                onToggleBookmark={handleToggleBookmark}
              />
            )}
          </div>

        </section>

        {/* Right Aside Column */}
        <aside className="col-span-12 lg:col-span-3 bg-slate-950 p-4 sm:p-6 flex flex-col space-y-6 overflow-y-auto max-h-screen custom-scrollbar border-l border-slate-800/60 lg:border-l">
          
          {/* Category Distribution Chart container */}
          <div className="bg-slate-900/50 p-5 rounded-lg border border-slate-800 flex flex-col relative">
            <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-4">
              Category Distribution
            </h3>
            <CategoryPieChart
              data={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          </div>

          {/* Breaking alerts inline container */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Major Alerts
              </h3>
              {alerts.filter(a => !a.isRead).length > 0 && (
                <span className="bg-rose-500 text-white text-[9px] px-2 py-0.5 rounded-full font-bold font-mono animate-pulse">
                  {alerts.filter(a => !a.isRead).length} NEW
                </span>
              )}
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
              {alerts.length === 0 ? (
                <p className="text-[11px] text-slate-500 font-mono">No breaking spikes detected yet.</p>
              ) : (
                alerts.slice(0, 3).map((alert) => {
                  const isHigh = alert.severity === "high";
                  const containerStyle = isHigh 
                    ? "bg-rose-950/20 border-rose-500/30 text-rose-100" 
                    : "bg-amber-950/20 border-amber-500/30 text-amber-100";
                  
                  return (
                    <div 
                      key={alert.id} 
                      onClick={() => handleMarkRead(alert.id)}
                      className={`p-4 border rounded-lg transition-colors hover:bg-slate-900 cursor-pointer ${containerStyle}`}
                    >
                      <div className="flex items-center space-x-2 text-xs mb-1">
                        <span className={`font-bold uppercase ${isHigh ? "text-rose-400" : "text-amber-400"}`}>
                          {isHigh ? "Breaking" : "Trending"}
                        </span>
                        <span className="text-[9px] opacity-60 font-mono">{alert.timestamp}</span>
                      </div>
                      <p className="text-xs font-semibold leading-relaxed">{alert.title}</p>
                      <p className="text-[10px] text-slate-400 leading-normal line-clamp-2 mt-1 font-sans">
                        {alert.description}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Dashboard Preference Center */}
          <div id="preferences-section" className="bg-slate-900/50 border border-slate-800 rounded-lg p-5">
            <PreferencesPanel
              preferences={preferences}
              onUpdatePreferences={handleUpdatePreferences}
              availableCategories={availableCategories.length ? availableCategories : ["Tech", "Science", "Business", "Entertainment", "Lifestyle", "Gaming"]}
              availablePlatforms={availablePlatforms.length ? availablePlatforms : ["X", "TikTok", "LinkedIn", "YouTube", "Instagram", "Reddit"]}
            />
          </div>

          {/* Bookmarks Saved offline container */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5 space-y-3">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-2.5">
              <Bookmark className="w-3.5 h-3.5 text-indigo-400" />
              <h3 className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Saved Offline Feed ({bookmarkedIds.length})
              </h3>
            </div>
            {bookmarkedIds.length === 0 ? (
              <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                No bookmarked posts saved offline yet. Click "Save Offline" on any post stream to persist in local client cache.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                {posts
                  .filter((p) => bookmarkedIds.includes(p.id))
                  .map((post) => (
                    <div
                      key={post.id}
                      onClick={() => {
                        setSelectedTrendTopic(post.category);
                        triggerToast(`Filtered dashboard to bookmarks' category: ${post.category}`);
                      }}
                      className="bg-slate-950 p-2.5 rounded border border-slate-900 hover:border-slate-800 cursor-pointer transition-all flex items-start space-x-2 text-left"
                    >
                      <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 font-mono shrink-0">
                        {post.avatar}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-mono text-slate-500 block truncate">{post.author}</span>
                        <p className="text-[11px] text-slate-300 leading-normal line-clamp-1 mt-0.5 font-sans">
                          {post.content}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

        </aside>

      </main>

      {/* Shared Social Wizard overlay popup */}
      {activeSharePost && (
        <SharingModal
          post={activeSharePost}
          onClose={() => setActiveSharePost(null)}
        />
      )}

      {/* Sub-footer Status Bar */}
      <footer className="h-8 bg-slate-950 border-t border-slate-900 px-6 flex items-center justify-between text-[10px] font-mono text-slate-500 select-none">
        <div className="flex space-x-4">
          <span>SYSTEM: OPTIMAL</span>
          <span>LATENCY: 42ms</span>
          <span>DATA SOURCE: HYPER-WEB-V3</span>
        </div>
        <div className="flex items-center space-x-3">
          <span>SYNCED JUST NOW</span>
          <span>•</span>
          <span>Last Checked: {lastUpdated || "Initializing"}</span>
        </div>
      </footer>
    </div>
  );
}

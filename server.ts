import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK lazily to prevent crashing on boot if key is missing.
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (key && key !== "MY_GEMINI_API_KEY") {
      try {
        aiClient = new GoogleGenAI({
          apiKey: key,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
        console.log("Gemini API Client initialized successfully.");
      } catch (err) {
        console.error("Failed to initialize Gemini API Client:", err);
      }
    }
  }
  return aiClient;
}

// Robust fallback data for late June 2026
const fallbackTrends = [
  {
    id: "t1",
    topic: "Project Nebula AI Assistant",
    category: "Tech",
    platform: "X",
    engagementRate: 14.2,
    volume: 620000,
    growthPercentage: 340,
    sentiment: "positive",
    description: "Developers and tech creators are sharing screenshots of Project Nebula's new offline local agent capabilities, praising its sub-10ms latency.",
    isBreaking: true
  },
  {
    id: "t2",
    topic: "SpaceX Mars Rover Assembly",
    category: "Science",
    platform: "YouTube",
    engagementRate: 8.8,
    volume: 450000,
    growthPercentage: 120,
    sentiment: "positive",
    description: "Live streams and structural engineering breakdown videos of the next-generation Mars rover assembly are drawing millions of views.",
    isBreaking: false
  },
  {
    id: "t3",
    topic: "The 4-Day Workweek Bill",
    category: "Business",
    platform: "LinkedIn",
    engagementRate: 11.5,
    volume: 290000,
    growthPercentage: 85,
    sentiment: "neutral",
    description: "Professionals are intensely debating the newly proposed flexible working laws, sharing organizational studies and team management challenges.",
    isBreaking: false
  },
  {
    id: "t4",
    topic: "Retro-Future Synthwave Loop",
    category: "Entertainment",
    platform: "TikTok",
    engagementRate: 18.4,
    volume: 830000,
    growthPercentage: 210,
    sentiment: "positive",
    description: "A new audio loop blending 80s analog synthesizers with modern lo-fi beats has gone viral as the backing track for thousands of aesthetic lifestyle clips.",
    isBreaking: true
  },
  {
    id: "t5",
    topic: "Quantum Batteries Breakthrough",
    category: "Science",
    platform: "Reddit",
    engagementRate: 9.6,
    volume: 180000,
    growthPercentage: 420,
    sentiment: "positive",
    description: "A research paper detailing room-temperature rapid-charging characteristics of quantum-dot batteries has sparked massive theoretical debates on green tech.",
    isBreaking: true
  },
  {
    id: "t6",
    topic: "The Slow-Living Screen Detox",
    category: "Lifestyle",
    platform: "Instagram",
    engagementRate: 6.9,
    volume: 320000,
    growthPercentage: 65,
    sentiment: "positive",
    description: "Creators are documenting slow mornings, screen-free reading hours, and rustic bedroom aesthetics under the trending tag #DigitalDetox.",
    isBreaking: false
  },
  {
    id: "t7",
    topic: "Neon Cybernetic RPG Trailer",
    category: "Gaming",
    platform: "YouTube",
    engagementRate: 15.1,
    volume: 510000,
    growthPercentage: 175,
    sentiment: "positive",
    description: "A surprise 4K cinematic trailer for an upcoming neo-cyberpunk sandbox RPG has gamers dissecting every frame for environmental details and lore.",
    isBreaking: false
  },
  {
    id: "t8",
    topic: "Vortex League Championship Stream",
    category: "Gaming",
    platform: "Twitch",
    engagementRate: 16.7,
    volume: 380000,
    growthPercentage: 290,
    sentiment: "positive",
    description: "The Grand Finals of the Vortex Arena League are drawing over 250,000 concurrent viewers on Twitch, with live chat pacing at 5,000 messages per minute.",
    isBreaking: true
  },
  {
    id: "t9",
    topic: "The $1M Streamer Creator Fund",
    category: "Entertainment",
    platform: "Kick",
    engagementRate: 13.5,
    volume: 150000,
    growthPercentage: 180,
    sentiment: "positive",
    description: "Kick announces a massive new compensation tier for sub-1,000 viewer streamers, sparking a surge of transfers and broadcast setups.",
    isBreaking: false
  },
  {
    id: "t10",
    topic: "Hyper-Efficient Solar Glazing",
    category: "Science",
    platform: "LinkedIn",
    engagementRate: 11.2,
    volume: 195000,
    growthPercentage: 310,
    sentiment: "positive",
    description: "Material scientists are demonstrating transparent photovoltaic window laminates that convert high-rise skyscrapers into vertical power generators.",
    isBreaking: false
  },
  {
    id: "t11",
    topic: "AI-Enhanced AR Smart-Glasses Prototype",
    category: "Tech",
    platform: "Facebook",
    engagementRate: 12.3,
    volume: 270000,
    growthPercentage: 195,
    sentiment: "positive",
    description: "Hands-on video reviews of Meta's latest lightweight prototype AR smart-glasses are trending across groups and feed posts.",
    isBreaking: false
  },
  {
    id: "t12",
    topic: "Decentralized Finance Regulation Sparks Discussion",
    category: "Business",
    platform: "Twitter",
    engagementRate: 9.4,
    volume: 310000,
    growthPercentage: 130,
    sentiment: "neutral",
    description: "Crypto enthusiasts and financial analysts discuss the implications of new SEC digital asset classifications.",
    isBreaking: false
  }
];

const fallbackPosts = [
  {
    id: "p1",
    author: "Alex Rivers",
    handle: "@arivers_dev",
    platform: "X",
    avatar: "AR",
    content: "Just tested Project Nebula's local offline agent on my laptop. It parsed a 10,000-line codebase in 8ms with zero cloud overhead. This is the paradigm shift we've been waiting for! 🤯🚀 #ProjectNebula #LocalAI",
    timestamp: "12m ago",
    likes: 12400,
    shares: 3200,
    comments: 480,
    views: 185000,
    engagementRate: 14.5,
    category: "Tech",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "p2",
    author: "Astrophysics Daily",
    handle: "astrophysics_daily",
    platform: "YouTube",
    avatar: "AD",
    content: "SpaceX is currently assembling the Mars Exploration Rover in South Texas. This segment walks through the mechanical robotic arms and state-of-the-art landing suspension that will absorb impact on Mars in 2028. Check out the link below for full telemetry breakdowns!",
    timestamp: "1h ago",
    likes: 45000,
    shares: 8900,
    comments: 2400,
    views: 620000,
    engagementRate: 9.1,
    category: "Science",
    mediaType: "video",
    mediaUrl: "https://images.unsplash.com/photo-1541185933-ef5d8ed016c2?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "p3",
    author: "Elena Vance",
    handle: "elena-vance-consulting",
    platform: "LinkedIn",
    avatar: "EV",
    content: "The newly proposed 4-Day Workweek Bill isn't just about 'working less'—it's an operational redesign. Companies in the trial report a 22% increase in productivity, a 40% reduction in mental exhaustion, and higher retention. As leaders, are we ready to measure outputs rather than screen time? Let's discuss in the comments.",
    timestamp: "3h ago",
    likes: 8300,
    shares: 1100,
    comments: 920,
    views: 95000,
    engagementRate: 11.2,
    category: "Business",
    mediaType: "text"
  },
  {
    id: "p4",
    author: "Luna Beats",
    handle: "@lunabeats_official",
    platform: "TikTok",
    avatar: "LB",
    content: "My new track 'Midnight Neon' is officially out! 🎹✨ This retro 80s synth loop is perfect for your slow walks, gaming sessions, or aesthetic room tours. Feel free to use the audio and tag me, I'll be reacting to the best ones! #synthwave #neonvibes #lofi",
    timestamp: "5h ago",
    likes: 132000,
    shares: 24500,
    comments: 3100,
    views: 1200000,
    engagementRate: 19.8,
    category: "Entertainment",
    mediaType: "video",
    mediaUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "p5",
    author: "Mila Sterling",
    handle: "@milasterling",
    platform: "Instagram",
    avatar: "MS",
    content: "Unplugged Sunday. Spent the entire morning reading on the balcony, making fresh lavender tea, and resisting the urge to check notifications. Our attention is a finite resource—remember to protect it. ☕🌿📖\n#DigitalDetox #SlowLiving #Mindfulness",
    timestamp: "6h ago",
    likes: 24500,
    shares: 1800,
    comments: 340,
    views: 110000,
    engagementRate: 7.2,
    category: "Lifestyle",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "p6",
    author: "Vortex Arena",
    handle: "vortex_championships",
    platform: "Twitch",
    avatar: "VA",
    content: "WE HAVE OUR CHAMPIONS! 🏆 Vortex League Grand Finals finishes with a legendary 3v3 overtime clutch play! Thanks to the 280,000 of you who watched live! VOD is up now! #VortexChamps #TwitchGaming",
    timestamp: "45m ago",
    likes: 85000,
    shares: 12400,
    comments: 11000,
    views: 380000,
    engagementRate: 16.2,
    category: "Gaming",
    mediaType: "video",
    mediaUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "p7",
    author: "Zane Broadcasts",
    handle: "@zane_on_kick",
    platform: "Kick",
    avatar: "ZB",
    content: "This new $1M Creator Fund from Kick is an absolute game-changer for independent streamers. Getting flat hourly rates plus sub splits is finally making streaming sustainable for everyone. Moving my daily stream to Kick starting tomorrow!",
    timestamp: "2h ago",
    likes: 12000,
    shares: 2300,
    comments: 980,
    views: 65000,
    engagementRate: 12.8,
    category: "Entertainment",
    mediaType: "text"
  },
  {
    id: "p8",
    author: "Dr. Elena Rostova",
    handle: "@elena_energy_tech",
    platform: "LinkedIn",
    avatar: "ER",
    content: "Absolutely thrilled to showcase our transparent solar-dot glazing on a real scale. These laminates replace standard commercial windows, absorbing infrared light to generate up to 150W per square meter while maintaining complete clarity. High-rises can now function as giant vertical solar arrays! 🏢☀️🔋\n#GreenTech #SolarEnergy #SustainableDesign",
    timestamp: "3h ago",
    likes: 42000,
    shares: 8500,
    comments: 1200,
    views: 195000,
    engagementRate: 11.2,
    category: "Science",
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "p9",
    author: "Meta Tech Lab",
    handle: "meta_vision_group",
    platform: "Facebook",
    avatar: "M",
    content: "Our newest AR prototype glasses look just like regular eyewear but embed real-time multimodal translation and voice navigation. Lightweight, day-long battery, and 100% locally computed. Check out this live first-person demo of a developer navigating Kyoto with no phone! 🕶️🌐✨\n#MetaQuest #ARSmartglasses #FutureOfTech",
    timestamp: "1h ago",
    likes: 56000,
    shares: 11200,
    comments: 4300,
    views: 270000,
    engagementRate: 12.3,
    category: "Tech",
    mediaType: "video",
    mediaUrl: "https://images.unsplash.com/photo-1593508512255-86ab42a8e620?q=80&w=600&auto=format&fit=crop"
  },
  {
    id: "p10",
    author: "Crypto Ledger",
    handle: "@LedgerInsights",
    platform: "Twitter",
    avatar: "CL",
    content: "BREAKING: Landmark DeFi regulatory framework proposal published. It sets clear safe-harbors for non-custodial decentralized liquidity protocols while requiring registration for centralized brokers. Huge win for open-source protocol devs, but highly restrictive for off-shore entities. Full breakdown thread below 🧵👇",
    timestamp: "4h ago",
    likes: 29000,
    shares: 8900,
    comments: 1800,
    views: 310000,
    engagementRate: 9.4,
    category: "Business",
    mediaType: "text"
  }
];

const fallbackCategories = [
  { name: "Tech", value: 30, count: 3, color: "#6366F1" }, // Indigo
  { name: "Science", value: 20, count: 2, color: "#14B8A6" }, // Teal
  { name: "Business", value: 15, count: 2, color: "#38BDF8" }, // Sky
  { name: "Entertainment", value: 15, count: 2, color: "#D946EF" }, // Fuchsia
  { name: "Lifestyle", value: 10, count: 1, color: "#8B5CF6" }, // Violet
  { name: "Gaming", value: 10, count: 1, color: "#F59E0B" } // Amber
];

const fallbackAlerts = [
  {
    id: "a1",
    title: "Project Nebula Local LLM Launches",
    description: "Developers globally report extremely low latency. Topic volume reaches 600K mentions.",
    timestamp: "Just now",
    category: "Tech",
    platform: "X",
    severity: "high",
    isRead: false
  },
  {
    id: "a2",
    title: "Quantum Battery Paper Published",
    description: "Peer-reviewed paper shows 10x capacity gains in micro-cells. Sparks global investment debate.",
    timestamp: "15m ago",
    category: "Science",
    platform: "Reddit",
    severity: "medium",
    isRead: false
  },
  {
    id: "a3",
    title: "Synthwave Audio Goes Hyper-Viral",
    description: "#SynthwaveLoop crosses 1.2M videos created in under 12 hours.",
    timestamp: "1h ago",
    category: "Entertainment",
    platform: "TikTok",
    severity: "info",
    isRead: false
  }
];

// Helper to calculate summary metrics
function getStats(trends: any[], alerts: any[]) {
  const totalVolume = trends.reduce((acc, t) => acc + t.volume, 0);
  const avgEngagement = trends.length ? trends.reduce((acc, t) => acc + t.engagementRate, 0) / trends.length : 0;
  return {
    totalVolume,
    avgEngagement: parseFloat(avgEngagement.toFixed(1)),
    activeTrendsCount: trends.length,
    breakingAlertsCount: alerts.filter(a => a.severity === "high").length
  };
}

// REST API for general trends & posts
app.get("/api/trends", async (req, res) => {
  const ai = getAiClient();
  
  if (!ai) {
    console.log("No Gemini API key or initialization failed. Serving rich local fallbacks.");
    return res.json({
      trends: fallbackTrends,
      viralPosts: fallbackPosts,
      categoryDistribution: fallbackCategories,
      breakingAlerts: fallbackAlerts,
      stats: getStats(fallbackTrends, fallbackAlerts),
      dataSource: "fallback"
    });
  }

  try {
    // Generate trending topics using real-time Google Search grounding
    const currentTimeStr = new Date().toISOString();
    const prompt = `Analyze real-time viral social media content, memes, and trending topics across major platforms (X, Twitter, Facebook, TikTok, LinkedIn, YouTube, Instagram, Reddit, Kick, Twitch).
The current local time is: ${currentTimeStr} (Late June 2026).
Search Google and social media to find the absolute most popular viral trends, topics, discussions, and associated viral posts right now.
Provide a fully cohesive real-time analysis of the trends.

Return a JSON object containing:
1. "trends": A list of 6-8 trending topics. For each, provide: "id" (unique string), "topic" (string, the name of the topic/hashtag), "category" (one of Tech, Science, Business, Entertainment, Lifestyle, Gaming, Sports), "platform" (one of X, Twitter, Facebook, TikTok, LinkedIn, YouTube, Instagram, Reddit, Kick, Twitch), "engagementRate" (number, between 2.0 and 25.0, representing % engagement), "volume" (integer, weekly post volume, e.g. 50000 to 1500000), "growthPercentage" (integer, growth rate, e.g. 50 to 800), "sentiment" (one of positive, neutral, negative), "description" (string, summary of why it's viral), "isBreaking" (boolean).
2. "viralPosts": A list of 4-5 illustrative viral social media posts for these topics. Each post should have: "id" (unique string), "author" (string, name), "handle" (string, username), "platform" (matching trend platform), "avatar" (initials like 'JD'), "content" (string, the post body, matching the vibe of the platform), "timestamp" (string like '12m ago' or '2h ago'), "likes" (integer), "shares" (integer), "comments" (integer), "views" (optional integer), "engagementRate" (number), "category" (string), "mediaType" (one of text, image, video), "mediaUrl" (use unspash photo URLs appropriate for the topic, or leave undefined).
3. "categoryDistribution": List of categories found in "trends" with "name", "value" (percentage summing to 100), "count" (integer), and "color" (hex color code).
4. "breakingAlerts": A list of 2-3 breaking alerts for major high-growth or critical breaking news/trends today.

Adhere strictly to this requested structure. Be realistic, specific, and base it on actual web searches of real trends for late June 2026 if possible. If Google search fails or returns sparse data, synthesize extremely realistic up-to-date technological, scientific, business, or lifestyle trends appropriate for 2026.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trends: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  category: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  engagementRate: { type: Type.NUMBER },
                  volume: { type: Type.INTEGER },
                  growthPercentage: { type: Type.INTEGER },
                  sentiment: { type: Type.STRING },
                  description: { type: Type.STRING },
                  isBreaking: { type: Type.BOOLEAN }
                },
                required: ["id", "topic", "category", "platform", "engagementRate", "volume", "growthPercentage", "sentiment", "description", "isBreaking"]
              }
            },
            viralPosts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  author: { type: Type.STRING },
                  handle: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  avatar: { type: Type.STRING },
                  content: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                  likes: { type: Type.INTEGER },
                  shares: { type: Type.INTEGER },
                  comments: { type: Type.INTEGER },
                  views: { type: Type.INTEGER },
                  engagementRate: { type: Type.NUMBER },
                  category: { type: Type.STRING },
                  mediaType: { type: Type.STRING },
                  mediaUrl: { type: Type.STRING }
                },
                required: ["id", "author", "handle", "platform", "avatar", "content", "timestamp", "likes", "shares", "comments", "engagementRate", "category"]
              }
            },
            categoryDistribution: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  value: { type: Type.NUMBER },
                  count: { type: Type.INTEGER },
                  color: { type: Type.STRING }
                },
                required: ["name", "value", "count", "color"]
              }
            },
            breakingAlerts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  timestamp: { type: Type.STRING },
                  category: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  severity: { type: Type.STRING }
                },
                required: ["id", "title", "description", "timestamp", "category", "platform", "severity"]
              }
            }
          },
          required: ["trends", "viralPosts", "categoryDistribution", "breakingAlerts"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response text from Gemini");
    }

    const data = JSON.parse(text);
    
    // Supplement breakingAlerts with a standard read state
    const processedAlerts = (data.breakingAlerts || []).map((alert: any) => ({
      ...alert,
      isRead: false
    }));

    // Re-verify and map the colors beautifully
    const colorPalette = ["#6366F1", "#14B8A6", "#38BDF8", "#D946EF", "#8B5CF6", "#F59E0B", "#F43F5E", "#EC4899"];
    const processedCategories = (data.categoryDistribution || []).map((cat: any, i: number) => ({
      ...cat,
      color: cat.color || colorPalette[i % colorPalette.length]
    }));

    res.json({
      trends: data.trends || fallbackTrends,
      viralPosts: data.viralPosts || fallbackPosts,
      categoryDistribution: processedCategories.length ? processedCategories : fallbackCategories,
      breakingAlerts: processedAlerts.length ? processedAlerts : fallbackAlerts,
      stats: getStats(data.trends || fallbackTrends, processedAlerts.length ? processedAlerts : fallbackAlerts),
      dataSource: "gemini-api"
    });

  } catch (error) {
    const isQuotaError = error instanceof Error && (
      error.message.includes("429") ||
      error.message.toLowerCase().includes("quota") ||
      error.message.includes("RESOURCE_EXHAUSTED")
    );

    if (isQuotaError) {
      console.warn("Gemini API quota exhausted (429). Serving robust local fallback trends gracefully.");
    } else {
      console.error("Error generating live Gemini trends:", error);
    }

    // Graceful fallback on error so application always stays functional
    res.json({
      trends: fallbackTrends,
      viralPosts: fallbackPosts,
      categoryDistribution: fallbackCategories,
      breakingAlerts: fallbackAlerts,
      stats: getStats(fallbackTrends, fallbackAlerts),
      dataSource: "fallback",
      error: error instanceof Error ? error.message : "Unknown error",
      isQuotaFallback: isQuotaError
    });
  }
});

// Helper to generate search results locally when offline, rate-limited, or when no API key exists
function getFallbackSearchResults(query: string, platforms?: string[], categories?: string[]) {
  const lowerQuery = (query || "").toLowerCase();
  let filteredTrends = fallbackTrends.filter(t => {
    const matchesQuery = !query || t.topic.toLowerCase().includes(lowerQuery) || t.description.toLowerCase().includes(lowerQuery);
    const matchesPlatform = !platforms || platforms.length === 0 || platforms.includes(t.platform);
    const matchesCategory = !categories || categories.length === 0 || categories.includes(t.category);
    return matchesQuery && matchesPlatform && matchesCategory;
  });

  if (filteredTrends.length === 0 && query) {
    // Synthesize 10 cool custom mock results matching user niche over the last 120 hours
    const platformsList = ["YouTube", "Twitter", "Facebook", "Instagram", "TikTok", "Kick", "Twitch", "Reddit"];
    const categoriesList = ["Tech", "Science", "Business", "Entertainment", "Lifestyle", "Gaming", "Sports"];
    
    const capitalizedQuery = query.charAt(0).toUpperCase() + query.slice(1);
    const customTopicIdeas = [
      `Viral ${capitalizedQuery} Clips`,
      `The Hottest ${capitalizedQuery} Trend`,
      `${capitalizedQuery} Video Challenge`,
      `Unexpected ${capitalizedQuery} Masterclass`,
      `Cringe-worthy ${capitalizedQuery} Reels`,
      `Late-night ${capitalizedQuery} Shorts`,
      `The Ultimate ${capitalizedQuery} TikTok Sound`,
      `Interactive ${capitalizedQuery} Livestreams`,
      `Niche ${capitalizedQuery} Community Spotlight`,
      `The Rise of ${capitalizedQuery} Indie Creators`
    ];

    filteredTrends = Array.from({ length: 10 }).map((_, idx) => {
      const platform = platformsList[idx % platformsList.length];
      const category = categoriesList[idx % categoriesList.length];
      const growth = 220 + (9 - idx) * 35;
      // Counting views received ONLY over the last 120-hour period
      const volume = 45000 + (9 - idx) * 8500;
      const engagement = 9.2 + (9 - idx) * 1.1;
      
      return {
        id: `synth-${idx + 1}`,
        topic: customTopicIdeas[idx] || `${capitalizedQuery} Trend ${idx + 1}`,
        category: idx === 0 || idx === 4 ? "Entertainment" : category,
        platform: platform,
        engagementRate: Number(engagement.toFixed(1)),
        volume: volume,
        growthPercentage: growth,
        sentiment: idx % 3 === 0 ? "positive" : idx % 3 === 1 ? "neutral" : "negative",
        description: `Highly engaging, viral ${query} video content trending on ${platform}. Audiences are reacting intensely to these latest clips.`,
        isBreaking: idx < 2
      };
    });
  } else {
    // Make sure fallback trends have their volume representing only views received in the last 5 days
    filteredTrends = filteredTrends.map(t => ({
      ...t,
      volume: Math.round(t.volume * 0.18) // Scale down to count only views received over the last 5 days
    }));
  }

  const filteredPosts = fallbackPosts.filter(p => {
    const matchesPlatform = !platforms || platforms.length === 0 || platforms.includes(p.platform);
    const matchesCategory = !categories || categories.length === 0 || categories.includes(p.category);
    return matchesPlatform && matchesCategory;
  });

  const finalPosts = (filteredPosts.length ? filteredPosts : fallbackPosts.slice(0, 4)).map((p, idx) => ({
    ...p,
    // Counting likes and views received ONLY over the last five-day period
    likes: Math.round(p.likes * 0.2 + (idx * 45) + 120),
    views: Math.round((p.views || p.likes * 12) * 0.18 + (idx * 450) + 1500),
    comments: Math.round(p.comments * 0.18 + 15),
    shares: Math.round(p.shares * 0.15 + 8),
    timestamp: "Past 5 days"
  }));

  return {
    trends: filteredTrends,
    viralPosts: finalPosts,
    stats: getStats(filteredTrends, []),
    dataSource: "fallback-search"
  };
}

// POST endpoint for user-customized dashboard queries (e.g. searching specific niches)
app.post("/api/custom-search", async (req, res) => {
  const { query, platforms, categories, dateRange } = req.body;
  const ai = getAiClient();

  if (!ai) {
    // If offline or no key, filter fallback data matching platforms and categories, or return a synthesized mock result
    const fallbackResults = getFallbackSearchResults(query, platforms, categories);
    return res.json(fallbackResults);
  }

  try {
    const prompt = `Perform a Google Search grounding query to analyze social media trends specifically for the following user request:
Search keyword/concept/category: "${query || "any viral topic"}"
Platform Focus: ${platforms && platforms.length ? platforms.join(", ") : "All platform channels (YouTube, Twitter/X, Facebook, Instagram, TikTok, Kick, Twitch, Reddit)"}
Category Focus: ${categories && categories.length ? categories.join(", ") : "All categories (highly customized to match the type of \"${query}\")"}
Target Time Range: Exactly the last 120 hours (retrieve the current most viral topics or video content over the last 120-hour period)

CRITICAL REQUIREMENT ON METRICS (LIKES AND VIEWS):
- All returned metrics for topics ("volume" representing views) and posts ("likes" and "views") MUST strictly represent only the numbers received and accumulated OVER THE LAST 120 HOURS ONLY.
- Do NOT provide cumulative or all-time historical views/likes. If a topic or video is older, only estimate and include the delta of views and likes received within the past 120 hours.

CRITICAL TEXT AND TITLE RULE (NO TIME-FRAME LABELS IN TITLES):
- DO NOT include literal words or phrases like "last 5 days", "last five days", "120 hours", "past five days", "recent 5 days", "5-day", "five day", or "120h" inside the "topic" (the title of the trend) or the post's "content" field.
- The "topic" field must contain an authentic, realistic, and natural title of a viral trend or video (e.g. "Epic Comedy Prank Fail", "Unbelievable Dog Jumps", "Figma Design Rant", "Niche Comedy Satire Boom"). Do not decorate titles with date ranges, timeframes, or filtering metadata.

Search Grounding Instructions:
- Query Google Search for viral topics, videos, reels, threads, tweets, and trending content matching the keyword/type "${query}" from the past 5 days (e.g., "viral ${query} videos past 5 days", "hottest ${query} trends last 5 days").
- Identify the absolute most viral topics or videos.
- Return EXACTLY 10 highly realistic and fresh trending topics in the "trends" list. Each topic should have a customized category, relevant platform, volume (views received within the last 120 hours), growth, and represent real-world social buzz over the past 5 days.
- Ensure the "description" field explains the specific content, creative angle, and social reaction.
- Provide 4-5 associated illustrative social media posts in the "viralPosts" list. Make sure to estimate their individual likes and views representing ONLY the counts received over the last 120 hours.

Be highly contextual and grounded in real web activities. Ensure valid JSON return matching the schema.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trends: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  topic: { type: Type.STRING },
                  category: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  engagementRate: { type: Type.NUMBER },
                  volume: { type: Type.INTEGER, description: "Views received strictly over the last 5 days" },
                  growthPercentage: { type: Type.INTEGER },
                  sentiment: { type: Type.STRING },
                  description: { type: Type.STRING },
                  isBreaking: { type: Type.BOOLEAN }
                },
                required: ["id", "topic", "category", "platform", "engagementRate", "volume", "growthPercentage", "sentiment", "description", "isBreaking"]
              }
            },
            viralPosts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  author: { type: Type.STRING },
                  handle: { type: Type.STRING },
                  platform: { type: Type.STRING },
                  avatar: { type: Type.STRING },
                  content: { type: Type.STRING },
                  timestamp: { type: Type.STRING, description: "e.g. '2 days ago' or within last 5 days" },
                  likes: { type: Type.INTEGER, description: "Likes received strictly over the last 5 days" },
                  shares: { type: Type.INTEGER, description: "Shares received strictly over the last 5 days" },
                  comments: { type: Type.INTEGER, description: "Comments received strictly over the last 5 days" },
                  views: { type: Type.INTEGER, description: "Views received strictly over the last 5 days" },
                  engagementRate: { type: Type.NUMBER },
                  category: { type: Type.STRING }
                },
                required: ["id", "author", "handle", "platform", "avatar", "content", "timestamp", "likes", "shares", "comments", "views", "engagementRate", "category"]
              }
            }
          },
          required: ["trends", "viralPosts"]
        }
      }
    });

    const data = JSON.parse(response.text || "{}");
    res.json({
      trends: data.trends || [],
      viralPosts: data.viralPosts || [],
      stats: getStats(data.trends || [], []),
      dataSource: "gemini-custom-api"
    });
  } catch (error) {
    const isQuotaError = error instanceof Error && (
      error.message.includes("429") ||
      error.message.toLowerCase().includes("quota") ||
      error.message.includes("RESOURCE_EXHAUSTED")
    );

    if (isQuotaError) {
      console.warn("Gemini API custom search quota exceeded (429). Serving robust local search results gracefully.");
    } else {
      console.error("Custom search failed, serving filtered fallbacks:", error);
    }

    const fallbackResults = getFallbackSearchResults(query, platforms, categories);
    res.json({
      ...fallbackResults,
      error: error instanceof Error ? error.message : "Unknown error",
      isQuotaFallback: isQuotaError
    });
  }
});


// Vite Dev Server / Static Assets handling
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

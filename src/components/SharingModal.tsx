import { useState } from "react";
import { SocialPost } from "../types";
import { X, Copy, Check, Twitter, Linkedin, MessageSquare, ExternalLink, Sparkles } from "lucide-react";

interface Props {
  post: SocialPost | null;
  onClose: () => void;
}

export default function SharingModal({ post, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState<"X" | "LinkedIn" | "Reddit" | "Slack">("X");

  // Generate a customized viral post sharing template when post shifts
  useState(() => {
    if (post) {
      const generated = `Check out this trending topic on "${post.category}"! 🔥\n\n"${post.author} (${post.handle}) writes: ${
        post.content.length > 120 ? post.content.substring(0, 117) + "..." : post.content
      }"\n\nAnalyzed via Viral Trends Tracker.`;
      setDraftContent(generated);
    }
  });

  if (!post) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(draftContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const shareToPlatform = () => {
    const encodedText = encodeURIComponent(draftContent);
    let shareUrl = "";

    switch (selectedPlatform) {
      case "X":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case "LinkedIn":
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
          "https://ai.studio/build"
        )}&summary=${encodedText}`;
        break;
      case "Reddit":
        shareUrl = `https://www.reddit.com/submit?title=${encodeURIComponent(
          "Viral Trend Detected!"
        )}&text=${encodedText}`;
        break;
      case "Slack":
        // Mock slack message trigger
        alert("Copied to clipboard formatted for Slack channels!");
        handleCopy();
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Simulate how many viral impressions this share would generate
  const simulatedImpressions = Math.floor(post.likes * 1.8 + post.engagementRate * 500);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Backdrop trigger */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl relative z-10 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h4 className="font-sans font-bold text-xs text-slate-200 uppercase tracking-widest">
              Viral Share Wizard
            </h4>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal body */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed font-sans">
            Draft and publish a curated snippet of this viral post to expand the conversation on your active channels:
          </p>

          {/* Quick Platform tabs */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { id: "X", label: "X / Twitter", icon: <Twitter className="w-3.5 h-3.5" /> },
              { id: "LinkedIn", label: "LinkedIn", icon: <Linkedin className="w-3.5 h-3.5" /> },
              { id: "Reddit", label: "Reddit", icon: <span className="font-bold text-[10px]">RD</span> },
              { id: "Slack", label: "Slack", icon: <MessageSquare className="w-3.5 h-3.5" /> }
            ].map((plat) => {
              const active = selectedPlatform === plat.id;
              return (
                <button
                  key={plat.id}
                  onClick={() => {
                    setSelectedPlatform(plat.id as any);
                    // Regene draft with customized hashtag
                    const suffix = plat.id === "LinkedIn" ? "\n\n#analytics #socialmedia #trends" : "\n\n#ViralTrends #AI";
                    const generated = `Check out this trending topic on "${post.category}"! 🔥\n\n"${post.author} (${post.handle}) writes: ${
                      post.content.length > 120 ? post.content.substring(0, 117) + "..." : post.content
                    }"${suffix}`;
                    setDraftContent(generated);
                  }}
                  className={`text-[11px] font-sans py-2 rounded border transition-all flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-1.5 cursor-pointer ${
                    active
                      ? "bg-indigo-950/40 border-indigo-900 text-indigo-400 font-medium"
                      : "bg-slate-950 border-slate-900 text-slate-500 hover:text-slate-200"
                  }`}
                >
                  {plat.icon}
                  <span>{plat.id}</span>
                </button>
              );
            })}
          </div>

          {/* Text Area */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-baseline">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Draft Content ({draftContent.length} chars)
              </label>
              <button
                onClick={handleCopy}
                className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-indigo-400 animate-pulse" />
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>COPY DRAFT</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={5}
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans custom-scrollbar"
            />
          </div>

          {/* Simulated stats card */}
          <div className="bg-slate-950 rounded p-3.5 border border-slate-800/80 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">
                Estimated Organic Reach
              </span>
              <span className="text-sm font-display font-bold text-indigo-400 block font-mono">
                ~{simulatedImpressions.toLocaleString()} views
              </span>
            </div>
            <span className="text-[9px] text-slate-500 font-mono leading-relaxed text-right max-w-44 block">
              Based on the topic's high velocity rate (+{post.likes} reference metrics).
            </span>
          </div>
        </div>

        {/* Action footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end space-x-2">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-3.5 py-2 hover:bg-slate-800 rounded font-sans transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={shareToPlatform}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 px-4 rounded transition-all font-sans flex items-center space-x-1 cursor-pointer"
          >
            <span>Publish via {selectedPlatform}</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}

import { ChangeEvent } from "react";
import { UserPreferences } from "../types";
import { Sliders, Check, RefreshCw, Bell, Volume2, ShieldAlert } from "lucide-react";

interface Props {
  preferences: UserPreferences;
  onUpdatePreferences: (prefs: UserPreferences) => void;
  availableCategories: string[];
  availablePlatforms: string[];
}

export default function PreferencesPanel({
  preferences,
  onUpdatePreferences,
  availableCategories,
  availablePlatforms
}: Props) {

  const togglePlatform = (platform: string) => {
    let list = [...preferences.preferredPlatforms];
    if (list.includes(platform)) {
      list = list.filter((p) => p !== platform);
    } else {
      list.push(platform);
    }
    // Don't empty out everything, fallback to all
    onUpdatePreferences({ ...preferences, preferredPlatforms: list });
  };

  const toggleCategory = (category: string) => {
    let list = [...preferences.preferredCategories];
    if (list.includes(category)) {
      list = list.filter((c) => c !== category);
    } else {
      list.push(category);
    }
    onUpdatePreferences({ ...preferences, preferredCategories: list });
  };

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    onUpdatePreferences({
      ...preferences,
      minEngagementRate: parseFloat(e.target.value)
    });
  };

  const handleIntervalChange = (e: ChangeEvent<HTMLSelectElement>) => {
    onUpdatePreferences({
      ...preferences,
      refreshInterval: parseInt(e.target.value, 10)
    });
  };

  const toggleNotifications = () => {
    onUpdatePreferences({
      ...preferences,
      enableNotifications: !preferences.enableNotifications
    });
  };

  const toggleSound = () => {
    onUpdatePreferences({
      ...preferences,
      enableSound: !preferences.enableSound
    });
  };

  const resetToDefaults = () => {
    onUpdatePreferences({
      preferredPlatforms: [], // Empty means select all
      preferredCategories: [], // Empty means select all
      minEngagementRate: 0,
      refreshInterval: 60, // 60 seconds
      enableNotifications: true,
      enableSound: true
    });
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-5 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h3 className="font-sans font-bold text-slate-300 text-xs uppercase tracking-widest">
            Dashboard Preferences
          </h3>
        </div>
        <button
          onClick={resetToDefaults}
          className="text-[10px] text-gray-500 hover:text-white hover:underline transition-all font-mono"
        >
          Reset Defaults
        </button>
      </div>

      {/* Platforms Focus Filter */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block">
          Platform Focus
        </label>
        <div className="flex flex-wrap gap-1.5">
          {availablePlatforms.map((p) => {
            const isSelected = preferences.preferredPlatforms.includes(p);
            return (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={`text-xs px-2.5 py-1 rounded transition-all flex items-center space-x-1 border font-sans ${
                  isSelected
                    ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/60 font-medium"
                    : "bg-slate-950 text-gray-400 border-slate-900 hover:text-gray-200"
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                <span>{p}</span>
              </button>
            );
          })}
        </div>
        <span className="text-[9px] text-gray-500 font-mono block">
          {preferences.preferredPlatforms.length === 0
            ? "Showing all platforms by default."
            : `Showing selected: ${preferences.preferredPlatforms.join(", ")}.`}
        </span>
      </div>

      {/* Categories Focus Filter */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block">
          Category Focus
        </label>
        <div className="flex flex-wrap gap-1.5">
          {availableCategories.map((c) => {
            const isSelected = preferences.preferredCategories.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleCategory(c)}
                className={`text-xs px-2.5 py-1 rounded transition-all flex items-center space-x-1 border font-sans ${
                  isSelected
                    ? "bg-indigo-950/40 text-indigo-400 border-indigo-900 font-medium"
                    : "bg-slate-950 text-gray-400 border-slate-900 hover:text-gray-200"
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                <span>{c}</span>
              </button>
            );
          })}
        </div>
        <span className="text-[9px] text-gray-500 font-mono block">
          {preferences.preferredCategories.length === 0
            ? "Showing all categories by default."
            : `Showing selected: ${preferences.preferredCategories.join(", ")}.`}
        </span>
      </div>

      {/* Minimum Engagement Rate Slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-baseline">
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
            Min Engagement Rate
          </label>
          <span className="text-xs font-mono text-indigo-400 font-bold">
            {preferences.minEngagementRate}% +
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="15"
          step="0.5"
          value={preferences.minEngagementRate}
          onChange={handleSliderChange}
          className="w-full h-1 bg-slate-950 rounded cursor-pointer accent-indigo-500 transition-all"
        />
        <div className="flex justify-between text-[9px] text-gray-500 font-mono">
          <span>0% (All posts)</span>
          <span>15% (Ultra viral)</span>
        </div>
      </div>

      {/* Auto Refresh Configuration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 flex items-center space-x-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin-slow" />
            <span>AI Refresh Interval</span>
          </label>
          <select
            value={preferences.refreshInterval}
            onChange={handleIntervalChange}
            className="bg-slate-950 border border-slate-800 text-xs text-white rounded px-2 py-1 font-mono focus:outline-none focus:border-indigo-500"
          >
            <option value="30">30 seconds</option>
            <option value="60">1 minute</option>
            <option value="180">3 minutes</option>
            <option value="300">5 minutes</option>
            <option value="0">Manual only</option>
          </select>
        </div>
        <p className="text-[9px] text-gray-500 font-mono leading-relaxed">
          How frequently background sync fetches freshly analyzed viral content and breaks from Gemini.
        </p>
      </div>

      {/* Notification Preferences */}
      <div className="border-t border-slate-800/80 pt-4 space-y-3">
        <label className="text-[10px] font-mono uppercase tracking-wider text-gray-500 block">
          System Alerts
        </label>
        
        {/* Toggle Notifications */}
        <button
          onClick={toggleNotifications}
          className="w-full flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-900 hover:border-slate-800 transition-all text-left"
        >
          <div className="flex items-center space-x-3">
            <div className={`p-1.5 rounded ${preferences.enableNotifications ? "bg-indigo-950/60 text-indigo-400" : "bg-slate-900 text-gray-500"}`}>
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-300 block">Breaking Trend Alerts</span>
              <span className="text-[9px] text-gray-500 block">Trigger real-time desktop & in-app alerts</span>
            </div>
          </div>
          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${preferences.enableNotifications ? "bg-indigo-600" : "bg-slate-800"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${preferences.enableNotifications ? "translate-x-4" : "translate-x-0"}`} />
          </div>
        </button>

        {/* Toggle sound alerts */}
        <button
          onClick={toggleSound}
          disabled={!preferences.enableNotifications}
          className={`w-full flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-900 hover:border-slate-800 transition-all text-left ${
            !preferences.enableNotifications ? "opacity-40 cursor-not-allowed" : "opacity-100"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-1.5 rounded ${preferences.enableSound && preferences.enableNotifications ? "bg-sky-950/60 text-sky-400" : "bg-slate-900 text-gray-500"}`}>
              <Volume2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-300 block">Auditory Cues</span>
              <span className="text-[9px] text-gray-500 block">Play alert tones for major break spikes</span>
            </div>
          </div>
          <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${preferences.enableSound && preferences.enableNotifications ? "bg-indigo-600" : "bg-slate-800"}`}>
            <div className={`w-3 h-3 rounded-full bg-white transition-transform duration-200 ${preferences.enableSound && preferences.enableNotifications ? "translate-x-4" : "translate-x-0"}`} />
          </div>
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { BreakingAlert } from "../types";
import { Bell, BellOff, Check, AlertTriangle, Info, Zap, Volume2 } from "lucide-react";

interface Props {
  alerts: BreakingAlert[];
  onMarkAllRead: () => void;
  onMarkRead: (id: string) => void;
  enableSound: boolean;
  enableNotifications: boolean;
}

// Custom browser Web Audio API synthesizer for the chime (zero dependencies!)
export const playBreakingAlertChime = () => {
  try {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtxClass) return;
    const audioCtx = new AudioCtxClass();
    
    // Play a dual-tone chime (A5 and E6) for a modern tech sound
    const now = audioCtx.currentTime;
    
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0.05, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    // Nice clean synth ping chime
    playTone(880, now, 0.4); // A5
    playTone(1318.51, now + 0.08, 0.5); // E6
  } catch (e) {
    console.warn("Failed to synthesize notification chime:", e);
  }
};

export default function NotificationCenter({
  alerts,
  onMarkAllRead,
  onMarkRead,
  enableSound,
  enableNotifications
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>("default");

  useEffect(() => {
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === "granted") {
        new Notification("Notifications Enabled!", {
          body: "You will now receive desktop notifications for major breaking social media trends.",
          icon: "/favicon.ico"
        });
        if (enableSound) playBreakingAlertChime();
      }
    } catch (err) {
      console.error("Error requesting notification permission:", err);
    }
  };

  const unreadAlerts = alerts.filter((a) => !a.isRead);

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded border transition-all duration-300 flex items-center justify-center cursor-pointer ${
          isOpen
            ? "bg-slate-800 border-slate-600 text-white"
            : "bg-slate-900 border-slate-800 text-gray-400 hover:text-white hover:border-slate-700"
        }`}
        title="Breaking Alerts"
      >
        <Bell className={`w-5 h-5 ${unreadAlerts.length > 0 ? "animate-swing" : ""}`} />
        
        {unreadAlerts.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-slate-950 animate-pulse">
            {unreadAlerts.length}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          {/* Backdrop overlay to close */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-slate-900/95 border border-slate-800 rounded shadow-2xl z-50 overflow-hidden flex flex-col max-h-[480px]">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 backdrop-blur-md">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-indigo-400" />
                <h4 className="font-sans font-bold text-xs text-slate-200 uppercase tracking-widest">
                  Breaking Trend Alerts
                </h4>
              </div>
              {unreadAlerts.length > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 hover:underline transition-all flex items-center space-x-1"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>

            {/* Permission Requester Banner */}
            {enableNotifications && permissionStatus === "default" && (
              <div className="bg-gradient-to-r from-indigo-950/80 to-sky-950/80 border-b border-indigo-900/40 p-3 flex flex-col space-y-2">
                <span className="text-[11px] text-indigo-300 font-sans leading-relaxed">
                  Enable desktop push alerts for immediate breaking news when the app is minimized.
                </span>
                <button
                  onClick={requestBrowserPermission}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-1 px-2.5 rounded transition-all font-sans text-center self-start"
                >
                  Enable Push Notifications
                </button>
              </div>
            )}

            {/* Notifications List */}
            <div className="overflow-y-auto custom-scrollbar flex-1 divide-y divide-slate-800/60 max-h-80">
              {alerts.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center justify-center space-y-2">
                  <BellOff className="w-8 h-8 text-gray-600" />
                  <p className="text-xs text-gray-500 font-mono">No breaking alerts active right now.</p>
                </div>
              ) : (
                alerts.map((alert) => {
                  const severityConfig = {
                    high: {
                      icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
                      border: "border-rose-950/40 bg-rose-950/10",
                      badge: "bg-rose-950 text-rose-400 border-rose-900/60"
                    },
                    medium: {
                      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
                      border: "border-amber-950/40 bg-amber-950/10",
                      badge: "bg-amber-950 text-amber-400 border-amber-900/60"
                    },
                    info: {
                      icon: <Info className="w-4 h-4 text-sky-400" />,
                      border: "border-sky-950/40 bg-sky-950/10",
                      badge: "bg-sky-950 text-sky-400 border-sky-900/60"
                    }
                  }[alert.severity] || {
                    icon: <Info className="w-4 h-4 text-gray-400" />,
                    border: "border-slate-850",
                    badge: "bg-slate-800 text-gray-400"
                  };

                  return (
                    <div
                      key={alert.id}
                      className={`p-3.5 transition-all flex items-start space-x-3 text-left ${
                        !alert.isRead ? "bg-slate-800/30" : "bg-slate-900/40"
                      } ${severityConfig.border}`}
                    >
                      <div className="mt-0.5 shrink-0">{severityConfig.icon}</div>
                      
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between space-x-2">
                          <span className="font-sans font-semibold text-xs text-white leading-snug">
                            {alert.title}
                          </span>
                          <span className="text-[9px] font-mono text-gray-500 shrink-0">
                            {alert.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed font-sans">
                          {alert.description}
                        </p>
                        
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center space-x-1.5">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${severityConfig.badge}`}>
                              {alert.severity.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {alert.platform} • {alert.category}
                            </span>
                          </div>
                          
                          {!alert.isRead && (
                            <button
                              onClick={() => onMarkRead(alert.id)}
                              className="text-[10px] font-mono text-slate-500 hover:text-indigo-400 transition-colors"
                              title="Mark as read"
                            >
                              Mark Read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Sound test */}
            <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-gray-500 font-mono">
              <span>Alert volume: Active</span>
              <button
                onClick={playBreakingAlertChime}
                disabled={!enableSound}
                className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-all cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Test Audio</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

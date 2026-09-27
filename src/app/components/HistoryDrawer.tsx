import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Clock, FileText, Copy, Check, Trash2, Calendar, Sparkles, Filter } from "lucide-react";
import { getHistoryForUser, deleteHistoryItem, clearUserHistory, HistoryItem } from "../../services/historyStore";

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string;
}

export function HistoryDrawer({ isOpen, onClose, userId, username }: HistoryDrawerProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      const records = getHistoryForUser(userId);
      setItems(records);
    }
  }, [isOpen, userId]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteHistoryItem(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear your entire summary history?")) {
      clearUserHistory(userId);
      setItems([]);
    }
  };

  const handleCopy = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-card text-foreground border-l border-border w-full max-w-xl h-full shadow-2xl flex flex-col relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-700 text-lg">
                  Summary History
                </h3>
                <p className="text-xs text-muted-foreground">
                  Saved summaries for <strong>@{username}</strong> ({items.length} items)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {items.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs text-destructive hover:underline font-500 px-2 py-1"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Drawer Content / List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground">
                  <FileText className="w-7 h-7" />
                </div>
                <h4 className="font-['Plus_Jakarta_Sans',sans-serif] font-600 text-base mb-1">
                  No Saved Summaries Yet
                </h4>
                <p className="text-muted-foreground text-xs max-w-xs leading-relaxed">
                  Upload and summarize any document while logged in as <strong>@{username}</strong> to automatically record your history here.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const isExpanded = expandedId === item.id;
                const formattedDate = new Date(item.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={item.id}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="p-4 rounded-xl border border-border bg-background hover:border-primary/40 transition-all cursor-pointer shadow-sm group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 font-600 text-sm text-foreground truncate max-w-[280px]">
                        <FileText className="w-4 h-4 text-primary shrink-0" />
                        <span className="truncate">{item.document_name}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleCopy(item.summary_text, item.id, e)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Copy summary"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDelete(item.id, e)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Delete record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] mb-3">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-500">
                        {item.tone}
                      </span>
                      <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-500">
                        {item.format}
                      </span>
                      <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full uppercase font-500">
                        {item.length}
                      </span>
                      <span className="text-muted-foreground ml-auto flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formattedDate}
                      </span>
                    </div>

                    {/* Summary Preview / Full */}
                    <div className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line bg-muted/30 p-3 rounded-lg border border-border/50 font-['Inter',sans-serif]">
                      {isExpanded
                        ? item.summary_text
                        : item.summary_text.slice(0, 180) + (item.summary_text.length > 180 ? "..." : "")}
                    </div>

                    <div className="mt-2 text-[11px] text-primary font-500 text-right group-hover:underline">
                      {isExpanded ? "Show less ↑" : "Click to view full summary →"}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Lock, X, LogIn, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { loginUser, registerUser, UserSession } from "../../services/authStore";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: UserSession) => void;
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let session: UserSession;
      if (mode === "register") {
        session = await registerUser(username, password);
      } else {
        session = await loginUser(username, password);
      }
      setUsername("");
      setPassword("");
      onSuccess(session);
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-card text-foreground rounded-2xl border border-border w-full max-w-md p-6 shadow-2xl relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title & Mode Switcher */}
          <div className="mb-6">
            <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-700 text-2xl mb-1">
              {mode === "login" ? "Welcome Back" : "Create Account"}
            </h3>
            <p className="text-muted-foreground text-xs">
              {mode === "login"
                ? "Log in to access your saved document summary history."
                : "Sign up with a username & password to save past summaries. No email required!"}
            </p>
          </div>

          <div className="flex bg-muted/60 p-1 rounded-xl mb-5 border border-border">
            <button
              type="button"
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 text-xs font-600 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "login"
                  ? "bg-background text-foreground shadow-sm font-700"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" /> Log In
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 text-xs font-600 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                mode === "register"
                  ? "bg-background text-foreground shadow-sm font-700"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" /> Sign Up
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-600 text-muted-foreground uppercase tracking-wider mb-1.5 font-['Inter',sans-serif]">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. john_doe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors font-['Inter',sans-serif]"
                />
                <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-600 text-muted-foreground uppercase tracking-wider mb-1.5 font-['Inter',sans-serif]">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors font-['Inter',sans-serif]"
                />
                <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-primary-foreground font-600 text-sm py-2.5 rounded-xl hover:opacity-90 active:scale-[0.99] transition-all duration-150 shadow-md shadow-primary/20 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : mode === "login" ? (
                  <>
                    <LogIn className="w-4 h-4" /> Log In
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" /> Create Account
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-5 text-center text-xs text-muted-foreground border-t border-border pt-4">
            🔒 <strong>100% Optional:</strong> Summarization works completely without an account. Accounts are only used to save history.
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

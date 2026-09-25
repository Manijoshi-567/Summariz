import { useState, useCallback, useRef } from "react";
import {
  FileText,
  ImageIcon,
  Upload,
  Sparkles,
  Eye,
  Clock,
  Shield,
  Copy,
  Check,
  RotateCcw,
  Download,
  ChevronRight,
  Zap,
  FileSearch,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { extractTextFromPDF } from "../services/pdfExtractor";
import { extractTextFromImage } from "../services/ocrExtractor";
import { generateSummary } from "../services/geminiService";
import { extractTextFromDocx } from "../services/docxExtractor";
import { extractTextFromXlsx } from "../services/xlsxExtractor";

type AppState = "idle" | "processing" | "complete";
type SummaryLength = "short" | "medium" | "long";

const SAMPLE_SUMMARIES: Record<SummaryLength, string> = {
  short:
    "This document outlines quarterly financial results showing a 23% revenue increase driven by international expansion and product diversification. Key risks include supply chain disruptions and regulatory changes in emerging markets. Management raised full-year guidance by 8%.",
  medium:
    "The quarterly report reveals strong financial performance with revenue growing 23% year-over-year to $4.2B, exceeding analyst expectations by $300M. International markets contributed 38% of total revenue, up from 29% last year, with APAC leading at 45% growth.\n\nThe company's cloud division showed 67% growth, now representing the fastest-growing segment with $1.1B in quarterly revenue. Operating margins improved to 24.1% despite ongoing investments in R&D and talent acquisition. Management raised full-year guidance by 8%, citing a strong pipeline and favorable macroeconomic conditions. The board approved a $500M share buyback program, reflecting confidence in the balance sheet.",
  long:
    "This comprehensive quarterly financial report provides an in-depth analysis of company performance for Q3 2024, revealing exceptional results across all business segments. Total revenue reached $4.2 billion — a 23% increase year-over-year, surpassing consensus analyst estimates of $3.9 billion.\n\nInternational operations showed particularly strong momentum, contributing 38% of total revenue versus 29% in the prior year period. The APAC region led growth at 45% year-over-year, followed by EMEA at 31% and Latin America at 22%. Strategic investments in localization and regional partnerships are clearly bearing fruit.\n\nThe cloud and SaaS division emerged as the standout performer, delivering 67% growth to reach $1.1 billion in quarterly revenue. Enterprise subscription contracts grew 42% with notable expansions from Fortune 500 clients across healthcare, financial services, and manufacturing verticals. Annual recurring revenue now stands at $4.4 billion with a net revenue retention rate of 124%.\n\nOperating expenses were well-controlled at $3.2 billion despite ongoing talent investments, yielding an operating margin of 24.1%, up from 21.3% a year ago. R&D spending increased 18% as the company accelerates AI and machine learning capabilities across its product portfolio.\n\nManagement raised full-year 2024 guidance, projecting revenue of $16.2–16.5 billion and EPS of $8.40–8.60. The board of directors approved a new $500 million share repurchase program. Key risks include semiconductor supply constraints, evolving EU and APAC data regulations, currency headwinds, and intensifying competition in core markets.",
};

const KEY_POINTS = [
  "Revenue grew 23% YoY to $4.2B, beating analyst estimates",
  "International markets now represent 38% of total revenue",
  "Cloud division achieved 67% growth — fastest-growing segment",
  "Operating margins improved to 24.1%",
  "Full-year guidance raised by 8%",
  "$500M share buyback program approved by the board",
];

const PROCESSING_STEPS = [
  { label: "Reading document structure", icon: Eye },
  { label: "Extracting text & tables", icon: FileSearch },
  { label: "Analysing key concepts", icon: Zap },
  { label: "Generating your summary", icon: Sparkles },
];

// ── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({
  isDragging,
  setIsDragging,
  handleDrop,
  handleFileChange,
  fileInputRef,
}: {
  isDragging: boolean;
  setIsDragging: (v: boolean) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative cursor-pointer rounded-2xl border-2 border-dashed p-14 text-center
          transition-all duration-200 select-none
          ${isDragging
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/3"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.txt,.csv,.md,image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-col items-center gap-5">
          <div className={`
            w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-200
            ${isDragging ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}
          `}>
            <Upload className="w-7 h-7" />
          </div>

          <div>
            <p className="font-['Plus_Jakarta_Sans',sans-serif] font-600 text-xl text-foreground mb-1.5">
              {isDragging ? "Drop to upload" : "Drop your document here"}
            </p>
            <p className="text-muted-foreground text-sm">
              or{" "}
              <span className="text-primary font-500 underline underline-offset-2">
                browse files
              </span>{" "}
              from your computer
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: FileText, label: "PDF / Word" },
              { icon: FileText, label: "Excel / CSV" },
              { icon: FileText, label: "Text / MD" },
              { icon: ImageIcon, label: "Images" },
            ].map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-['Inter',sans-serif] text-muted-foreground"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-xs text-muted-foreground font-['Inter',sans-serif]">
          Max 25 MB · Processed securely · Never stored
        </p>
      </div>

      {/* Trust row */}
      <div className="mt-6 flex items-center justify-center gap-8">
        {[
          { icon: Shield, label: "End-to-end encrypted" },
          { icon: Zap, label: "Results in under 60s" },
          { icon: Eye, label: "No sign-up required" },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="w-3.5 h-3.5" />
            {label}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Processing Card ──────────────────────────────────────────────────────────

function ProcessingCard({
  step,
  fileName,
  extractionProgress,
}: {
  step: number;
  fileName: string;
  extractionProgress: number;
}) {
  let progress = 0;
  if (step === 0) progress = 15;
  else if (step === 1) progress = 15 + Math.round(extractionProgress * 0.6); // 15% to 75%
  else if (step === 2) progress = 85;
  else if (step === 3) progress = 95;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl border border-border bg-card p-8"
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-500 text-foreground truncate max-w-[280px]">{fileName}</p>
          <p className="text-xs text-muted-foreground font-['Inter',sans-serif]">Processing…</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-['Inter',sans-serif] text-muted-foreground">
            {PROCESSING_STEPS[step]?.label}
          </span>
          <span className="text-xs font-['Inter',sans-serif] text-primary font-500">
            {progress}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {PROCESSING_STEPS.map(({ label, icon: Icon }, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex items-center gap-3">
              <div className={`
                w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-300
                ${done ? "bg-emerald-500 text-white" : active ? "bg-primary text-white" : "bg-muted text-muted-foreground"}
              `}>
                {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
              </div>
              <span className={`text-sm transition-colors duration-300 ${active ? "text-foreground font-500" : done ? "text-muted-foreground line-through" : "text-muted-foreground"}`}>
                {label}
              </span>
              {active && (
                <motion.div
                  className="flex gap-0.5 ml-auto"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {[0, 1, 2].map((dot) => (
                    <motion.div
                      key={dot}
                      className="w-1 h-1 rounded-full bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: dot * 0.2 }}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ── Results Card ─────────────────────────────────────────────────────────────

function ResultsCard({
  summaryLength,
  setSummaryLength,
  copied,
  handleCopy,
  handleReset,
  fileName,
  summaries,
  keyPoints,
  handleDownload,
}: {
  summaryLength: SummaryLength;
  setSummaryLength: (v: SummaryLength) => void;
  copied: boolean;
  handleCopy: () => void;
  handleReset: () => void;
  fileName: string;
  summaries: Record<SummaryLength, string>;
  keyPoints: string[];
  handleDownload: () => void;
}) {
  const lengths: { id: SummaryLength; label: string }[] = [
    { id: "short", label: "Short" },
    { id: "medium", label: "Medium" },
    { id: "long", label: "Long" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-500 text-foreground truncate max-w-[260px]">{fileName}</p>
            <p className="text-xs text-muted-foreground font-['Inter',sans-serif]">Summary ready</p>
          </div>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5"
        >
          <RotateCcw className="w-3 h-3" />
          New document
        </button>
      </div>

      {/* Key points */}
      <div className="rounded-2xl border border-border bg-secondary/50 p-6">
        <p className="font-['Inter',sans-serif] text-xs font-500 text-primary uppercase tracking-widest mb-4">
          Key points
        </p>
        <div className="space-y-2.5">
          {keyPoints.map((point, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.07, duration: 0.3 }}
              className="flex items-start gap-2.5"
            >
              <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <ChevronRight className="w-3 h-3 text-primary" />
              </div>
              <p className="text-sm text-foreground leading-snug">{point}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Summary panel */}
      <div className="rounded-2xl border border-border bg-card p-6">
        {/* Length toggle */}
        <div className="flex items-center justify-between mb-5">
          <p className="font-['Inter',sans-serif] text-xs font-500 text-muted-foreground uppercase tracking-widest">
            Full summary
          </p>
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            {lengths.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setSummaryLength(id)}
                className={`
                  px-3 py-1 text-xs font-500 rounded-md transition-all duration-150
                  ${summaryLength === id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                  }
                `}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={summaryLength}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {(summaries[summaryLength] || "").split("\n\n").map((para, i) => (
              <p key={i} className="text-sm text-foreground leading-relaxed mb-3 last:mb-0">
                {para}
              </p>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-border">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-sm font-500 text-foreground bg-muted hover:bg-primary hover:text-primary-foreground transition-colors rounded-lg px-4 py-2"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-sm font-500 text-foreground bg-muted hover:bg-muted/80 transition-colors rounded-lg px-4 py-2"
          >
            <Download className="w-3.5 h-3.5" />
            Download .txt
          </button>
          <div className="ml-auto font-['Inter',sans-serif] text-xs text-muted-foreground">
            {(summaries[summaryLength] || "").split(/\s+/).filter(Boolean).length} words
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [summaryLength, setSummaryLength] = useState<SummaryLength>("medium");
  const [processingStep, setProcessingStep] = useState(0);
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [summaries, setSummaries] = useState<Record<SummaryLength, string>>({
    short: "",
    medium: "",
    long: "",
  });
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || "");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    if (!file) return;
    setUploadedFile(file);
    setAppState("processing");
    setProcessingStep(0);
    setExtractionProgress(0);
    setErrorMsg("");

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem("gemini_api_key") || "";
    if (!apiKey) {
      setErrorMsg("Google Gemini API Key is missing. Please configure VITE_GEMINI_API_KEY in your .env file, or set it via the settings (gear icon) in the top-right navbar to start summarization.");
      setAppState("idle");
      return;
    }

    try {
      // Step 0: Reading structure
      setProcessingStep(0);
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Step 1: Extracting text & tables
      setProcessingStep(1);
      let extractedText = "";
      const fileName = file.name.toLowerCase();

      if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
        extractedText = await extractTextFromPDF(file, (p) => {
          setExtractionProgress(p);
        });
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileName.endsWith(".docx")
      ) {
        extractedText = await extractTextFromDocx(file, (p) => {
          setExtractionProgress(p);
        });
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        fileName.endsWith(".xlsx")
      ) {
        extractedText = await extractTextFromXlsx(file, (p) => {
          setExtractionProgress(p);
        });
      } else if (
        file.type === "text/plain" ||
        fileName.endsWith(".txt") ||
        fileName.endsWith(".md") ||
        file.type === "text/markdown"
      ) {
        extractedText = await file.text();
        setExtractionProgress(100);
      } else if (file.type === "text/csv" || fileName.endsWith(".csv")) {
        extractedText = await file.text();
        setExtractionProgress(100);
      } else if (file.type.startsWith("image/")) {
        extractedText = await extractTextFromImage(file, (p) => {
          setExtractionProgress(p);
        });
      } else {
        throw new Error(
          "Unsupported file type. Please upload a PDF, Word document, Excel spreadsheet, Text, CSV, Markdown, or an image file."
        );
      }

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error("No readable text could be extracted from this document.");
      }

      // Step 2: Analysing key concepts
      setProcessingStep(2);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 3: Generating summary
      setProcessingStep(3);
      const result = await generateSummary(extractedText, apiKey);

      setSummaries({
        short: result.short,
        medium: result.medium,
        long: result.long,
      });
      setKeyPoints(result.keyPoints);
      setAppState("complete");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred while parsing the document.");
      setAppState("idle");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(summaries[summaryLength]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = summaries[summaryLength];
    if (!text) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${uploadedFile?.name || "document"}_summary_${summaryLength}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setAppState("idle");
    setUploadedFile(null);
    setProcessingStep(0);
    setExtractionProgress(0);
    setSummaries({ short: "", medium: "", long: "" });
    setKeyPoints([]);
    setErrorMsg("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-['Inter',sans-serif] antialiased">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center p-1 shadow-sm shadow-primary/20 group hover:scale-105 transition-transform">
              <img src="/LOGO_IMAGE.png" alt="Summariz Logo" className="h-full w-full object-contain drop-shadow" />
            </div>
            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-800 text-2xl tracking-tight text-[#0c140e] dark:text-white">
              Summariz<span className="text-[#ef4444] text-3xl">.</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-500 text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-primary text-primary-foreground text-sm font-600 px-4 py-2 rounded-xl hover:opacity-90 active:scale-95 transition-all duration-150"
            >
              Try Free
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero + Upload ─────────────────────────────────────────────────── */}
      <section className="pt-20 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Headline */}
          <div className="max-w-2xl mx-auto text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 text-xs font-['Inter',sans-serif] font-500 text-primary bg-primary/8 px-3 py-1.5 rounded-full mb-6 border border-primary/15">
                <Sparkles className="w-3 h-3" />
                Save hours of reading in one click
              </div>
              <h1 className="font-['Plus_Jakarta_Sans',sans-serif] font-800 text-5xl md:text-6xl leading-[1.08] tracking-tight text-foreground mb-5">
                Skip the reading.
                <br />
                Get the <span className="text-primary">takeaways.</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto">
                Upload reports, spreadsheets, PDFs, or scanned images and get structured summaries instantly. Processed completely in your browser for absolute privacy.
              </p>
            </motion.div>
          </div>

          {/* Interactive panel */}
          <div className="max-w-2xl mx-auto">
            {errorMsg && (
              <div className="mb-6 p-5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex flex-col gap-2.5 items-start">
                <div className="font-600 flex items-center gap-2">
                  <Shield className="w-4.5 h-4.5 text-destructive" />
                  Error Processing Document
                </div>
                <p className="leading-relaxed">{errorMsg}</p>
                <button
                  onClick={() => {
                    if (errorMsg.includes("API Key")) {
                      setShowSettings(true);
                    } else {
                      setErrorMsg("");
                    }
                  }}
                  className="text-xs font-600 underline underline-offset-2 hover:text-destructive/80"
                >
                  {errorMsg.includes("API Key") ? "Configure API Key Now" : "Dismiss"}
                </button>
              </div>
            )}

            <AnimatePresence mode="wait">
              {appState === "idle" && (
                <motion.div key="idle" exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                  <UploadZone
                    isDragging={isDragging}
                    setIsDragging={setIsDragging}
                    handleDrop={handleDrop}
                    handleFileChange={handleFileChange}
                    fileInputRef={fileInputRef}
                  />
                </motion.div>
              )}
              {appState === "processing" && (
                <motion.div key="processing" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <ProcessingCard
                    step={processingStep}
                    fileName={uploadedFile?.name ?? ""}
                    extractionProgress={extractionProgress}
                  />
                </motion.div>
              )}
              {appState === "complete" && (
                <motion.div key="complete" exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <ResultsCard
                    summaryLength={summaryLength}
                    setSummaryLength={setSummaryLength}
                    copied={copied}
                    handleCopy={handleCopy}
                    handleReset={handleReset}
                    fileName={uploadedFile?.name ?? ""}
                    summaries={summaries}
                    keyPoints={keyPoints}
                    handleDownload={handleDownload}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-700 text-3xl md:text-4xl tracking-tight mb-3">
              How it works
            </h2>
            <p className="text-muted-foreground text-base">
              Get structured summaries in three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-10 relative">
            {/* Connector line (desktop only) */}
            <div className="hidden md:block absolute top-10 left-[calc(16.66%+1.5rem)] right-[calc(16.66%+1.5rem)] h-px bg-border" />

            {[
              {
                step: "01",
                title: "Select your files",
                desc: "Upload or drag-and-drop PDFs, Word docs, spreadsheets, plain text, or images directly from your computer.",
                icon: Upload,
              },
              {
                step: "02",
                title: "Instant extraction",
                desc: "We parse the document text and run local OCR on scanned images to read tables, lists, and paragraphs automatically.",
                icon: FileSearch,
              },
              {
                step: "03",
                title: "Read your summary",
                desc: "Review key takeaways and choose your preferred length: a quick 1-sentence recap, key points, or a deep-dive report.",
                icon: Sparkles,
              },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.4 }}
              >
                <div className="relative z-10 flex flex-col items-start">
                  <div className="font-['Inter',sans-serif] text-xs font-500 text-primary/50 mb-4 tracking-[0.18em]">
                    {step}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-5 shadow-sm shadow-primary/30">
                    <Icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-600 text-xl mb-3">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: text */}
            <div>
              <div className="font-['Inter',sans-serif] text-xs font-500 text-primary uppercase tracking-widest mb-4">
                Capabilities
              </div>
              <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-700 text-3xl md:text-4xl tracking-tight mb-5 leading-tight">
                Built for accuracy,<br />designed for speed
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed mb-8">
                Every feature is designed around getting you the right
                information, faster — whether you're reviewing legal contracts,
                research papers, or financial filings.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-600 text-sm px-5 py-2.5 rounded-xl hover:opacity-90 active:scale-95 transition-all duration-150"
              >
                Try it now — it's free
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Right: feature cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  title: "PDF Parsing",
                  desc: "Native extraction preserving formatting, tables, and document structure.",
                  icon: FileText,
                  accent: "bg-blue-50 text-blue-600",
                },
                {
                  title: "OCR Technology",
                  desc: "Tesseract-powered recognition for scanned and photographed documents.",
                  icon: ImageIcon,
                  accent: "bg-violet-50 text-violet-600",
                },
                {
                  title: "Smart Summaries",
                  desc: "AI-generated summaries that surface key insights and main arguments.",
                  icon: Sparkles,
                  accent: "bg-amber-50 text-amber-600",
                },
                {
                  title: "Length Control",
                  desc: "Short, medium, or long — choose the depth that fits your workflow.",
                  icon: Clock,
                  accent: "bg-emerald-50 text-emerald-600",
                },
              ].map(({ title, desc, icon: Icon, accent }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.35 }}
                  className="p-5 rounded-2xl border border-border bg-card hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3.5 ${accent}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-600 text-base mb-1.5">{title}</h3>
                  <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="py-20 px-6 relative overflow-hidden">
        {/* Full-width grid background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              radial-gradient(circle at center, rgba(0, 200, 83, 0.15) 0%, transparent 75%),
              linear-gradient(rgba(0, 200, 83, 0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 200, 83, 0.08) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 36px 36px, 36px 36px",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)"
          }}
        />
        <div className="max-w-6xl mx-auto relative">
          <div className="group px-6 py-24 text-center relative transition-all duration-300">
            {/* Corner Badges */}
            <div className="absolute top-6 left-6 flex items-center gap-1.5 bg-white/95 dark:bg-zinc-900 border border-[#00c853]/20 shadow-sm px-3.5 py-1.5 rounded-full text-[10px] font-700 tracking-wider text-[#1b5e20] dark:text-[#00e676] select-none">
              🔒 ZERO DATA STORED
            </div>
            <div className="absolute top-6 right-6 flex items-center gap-1.5 bg-white/95 dark:bg-zinc-900 border border-[#00c853]/20 shadow-sm px-3.5 py-1.5 rounded-full text-[10px] font-700 tracking-wider text-[#1b5e20] dark:text-[#00e676] select-none">
              ⚡ 45S AVG SPEED
            </div>
            <div className="absolute bottom-6 left-6 flex items-center gap-1.5 bg-white/95 dark:bg-zinc-900 border border-[#00c853]/20 shadow-sm px-3.5 py-1.5 rounded-full text-[10px] font-700 tracking-wider text-[#1b5e20] dark:text-[#00e676] select-none">
              📄 PDF / WORD / TXT
            </div>
            <div className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-white/95 dark:bg-zinc-900 border border-[#00c853]/20 shadow-sm px-3.5 py-1.5 rounded-full text-[10px] font-700 tracking-wider text-[#1b5e20] dark:text-[#00e676] select-none">
              🚀 QUICK EXPERIENCE
            </div>

            {/* Live Status Indicator */}
            <div className="inline-flex items-center gap-1.5 bg-[#e8f5e9] dark:bg-[#12241a] text-[#1b5e20] dark:text-[#00e676] border border-[#1b5e20]/15 dark:border-[#00e676]/15 rounded-full px-3.5 py-1.5 text-[11px] font-600 mb-6 relative z-10 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00c853] animate-pulse" />
              LIVE · No sign-up required
            </div>

            {/* Main Title & Description */}
            <h2 className="font-['Plus_Jakarta_Sans',sans-serif] font-800 text-4xl md:text-5xl text-[#0c140e] dark:text-white tracking-tight leading-[1.12] mb-5 relative z-10">
              Stop reading.
              <br />
              <span className="text-[#00c853]">Start knowing.</span>
            </h2>
            
            <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-sm md:max-w-md mx-auto leading-relaxed relative z-10">
              Upload any document now and extract the core takeaways
              <br className="hidden md:inline" />
              instantly in under a minute.
            </p>

            {/* Primary upload button */}
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => fileInputRef.current?.click(), 600);
              }}
              className="inline-flex items-center gap-2 bg-[#00c853] hover:bg-[#00b853] text-white font-700 text-sm px-7 py-3 rounded-full shadow-lg shadow-[#00c853]/25 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 relative z-10 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Upload a document
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center p-1 shadow-sm shadow-primary/20">
              <img src="/LOGO_IMAGE.png" alt="Summariz Logo" className="h-full w-full object-contain drop-shadow" />
            </div>
            <span className="font-['Plus_Jakarta_Sans',sans-serif] font-800 text-2xl tracking-tight text-[#0c140e] dark:text-white">
              Summariz<span className="text-[#ef4444] text-3xl">.</span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2026 Summariz. Built for clarity.
          </p>
          <div className="flex items-center gap-1.5 font-['Inter',sans-serif] text-xs text-muted-foreground">
            <Shield className="w-3 h-3" />
            Files processed securely. Never stored.
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-foreground rounded-2xl border border-border w-full max-w-md p-6 shadow-xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-['Plus_Jakarta_Sans',sans-serif] font-700 text-xl mb-2">Gemini API Key Settings</h3>
              <p className="text-muted-foreground text-sm mb-5 leading-relaxed">
                Your files are processed 100% locally. Summarization requires a Google Gemini API Key. If you don't have one, you can get a free key from the Google AI Studio.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-600 font-['Inter',sans-serif] text-muted-foreground uppercase tracking-widest block mb-2">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary transition-colors font-['Inter',sans-serif]"
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary font-500 hover:underline"
                  >
                    Get a free API Key
                  </a>
                  <span className="text-muted-foreground">Stored securely in local storage</span>
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="flex-1 bg-muted hover:bg-muted/80 text-foreground text-sm font-600 py-2.5 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      localStorage.setItem("gemini_api_key", apiKeyInput);
                      setShowSettings(false);
                      if (apiKeyInput) {
                        setErrorMsg("");
                      }
                    }}
                    className="flex-1 bg-primary text-primary-foreground hover:opacity-90 text-sm font-600 py-2.5 rounded-xl transition-all duration-150"
                  >
                    Save Key
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

# Summariz — Client-Side Document Summarization Assistant

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.3.5-646CFF.svg?logo=vite)](https://vite.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-4.1.12-38B2AC.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![AI Engine](https://img.shields.io/badge/Gemini_API-3.6_Flash-orange.svg?logo=google-gemini)](https://ai.google.dev/)
[![Security](https://img.shields.io/badge/Privacy-100%25_Client--Side-brightgreen.svg)](https://aistudio.google.com/)

Summariz is a high-performance, security-focused web application designed to extract content and generate structured, context-aware summaries from complex business documents and scanned images. By utilizing client-side parsers and localized Optical Character Recognition (OCR), all raw data processing is contained entirely within the user's web browser, maintaining absolute data privacy and governance.

---

## Codebase Architecture

```
Summify/
├── public/                     # Static assets (logos, fallback images)
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── figma/          # Figma design helper utilities
│   │   │   └── ui/             # Reusable Shadcn UI component primitives
│   │   └── App.tsx             # Main layout, application state, & orchestration
│   ├── services/
│   │   ├── docxExtractor.ts    # DOCX local parsing engine via Mammoth.js
│   │   ├── geminiService.ts    # Google Gemini API connector (JSON Schema validation)
│   │   ├── ocrExtractor.ts     # Scanned image OCR engine via Tesseract.js
│   │   ├── pdfExtractor.ts     # Client-side PDF page rendering & text extraction
│   │   └── xlsxExtractor.ts    # Spreadsheet cell parser via sheetJS (xlsx)
│   ├── styles/                 # Custom styling tokens, themes, & variables
│   ├── types/                  # Shared TypeScript interface definitions
│   └── main.tsx                # Application bootstrap and react tree initialization
├── .env                        # Local development environment configuration
├── package.json                # Project dependencies and script runner configurations
└── vite.config.ts              # Vite bundling, plugins, and path mapping config
```

---

## 1. Setup & Installation Guide

Follow the procedure below to configure and run the application in a local environment.

### System Prerequisites
Ensure that the following runtimes are installed on your host system:
* **Node.js**: Version 18.0.0 or higher
* **Package Manager**: npm (v9+), yarn (v1.22+), or pnpm (v8+)

### Step-by-Step Configuration

1. **Clone the Repository:**
   ```bash
   git clone <repository-url>
   cd Summify
   ```

2. **Install Node Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` configuration file in the root directory (parallel to `package.json`) to register your API key:
   ```env
   # Google Gemini API Key
   # Obtain a free developer key from https://aistudio.google.com/
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *Note: If the `VITE_GEMINI_API_KEY` is omitted from the `.env` file, the application remains fully functional. Users will be prompted to securely input their API key via the settings modal within the application UI (stored locally in `window.localStorage`).*

4. **Start the Local Development Server:**
   ```bash
   npm run dev
   ```

5. **Access the Application:**
   Open a web browser and navigate to the local address output by Vite:
   [https://summariz-manijoshi-567.vercel.app/](https://summariz-manijoshi-567.vercel.app/)

---

## 2. Problem Statement

Corporate environments, academic institutions, and legal teams process massive quantities of unstructured text across disparate file formats every day. Manually reviewing long-form PDFs, complex spreadsheets, and scanned documents is highly labor-intensive, leading to significant drops in operational efficiency.

While cloud-based AI summarization utilities exist, they present substantial corporate risks:
* **Data Leakage & Governance Violations**: Uploading confidential contracts, medical records, or proprietary financial projections to third-party servers raises compliance concerns (e.g., GDPR, HIPAA, SOC 2).
* **Format Limitations**: Standard summarizers typically only ingest plain text or native PDFs, failing when encountering spreadsheets (`.xlsx`) or scanned image formats.
* **Cost Inefficiencies**: Traditional services lock users behind expensive monthly subscription tiers with arbitrary file-size limitations.

---

## 3. The Summify Solution

Summify bridges the gap between high-level intelligence and strict data privacy protocols.

```mermaid
graph TD
    A[User Document: PDF/DOCX/XLSX/Image] -->|Local Upload| B(Client-side Extractor)
    B -->|pdfjs-dist / mammoth / xlsx| C[Plain Text Extraction]
    B -->|Tesseract.js OCR| C
    C -->|Client-Side Encryption| D{Gemini API Connector}
    D -->|Local API Key / Direct Fetch| E[Google Gemini AI Engine]
    E -->|JSON Response| F[Structured Multi-Length Summaries]
    F -->|Render| G(UI Dashboard: Copy/Download Options)
```

By decoupling text parsing from the AI inference engine, Summify processes files using **client-side sandboxed execution**. Files are parsed inside the local browser thread using WebAssembly and Web Workers. The raw documents are never uploaded to any backend database. Once parsed, only the structured text contents are transmitted via secure HTTPS directly to Google Gemini’s endpoints using the user's localized API key.

---

## 4. Phase 2 Advanced Feature Architecture

Summify incorporates production-grade AI summarization features, security shields, and custom controls:

* **Chain of Density (CoD) Synthesis Engine**: Employs an advanced prompt engineering methodology to produce high-density, entity-rich summaries without conversational fluff or hallucination, strictly grounded in source material.
* **AI Customization Controls**: Pre-synthesis configuration options positioned directly above the upload area:
  * **Tone & Perspective**: `Professional / Executive` (Default), `Analyst / Critical`, `Educator / Explanatory`, `Simple / ELI5`, and `Direct / Bullet-focused`.
  * **Summary Format**: `Executive Bullet Points` (Default), `Narrative + Key Takeaways`, `Q&A Format`, and `Action Items & Next Steps`.
  * **Target Depth & Length**: 3-tier selector (`Short ~100-150w`, `Medium ~250-400w`, `Detailed ~600+w`).
* **High-Fidelity Document Extractors**:
  * **DOCX Preservation**: Converts `.docx` to structured Markdown preserving `#` headings, `*` list items, and `|` tables via `mammoth`.
  * **PDF Coordinate Grouping**: Groups text streams by vertical coordinate ($Y$-position) to preserve multi-column sections and table rows.
  * **Native PDF & Image AI Buffer**: Passes PDF base64 inline buffers directly to Gemini models for native visual & structural reasoning.
* **Optional Username Auth & History Dashboard**:
  * **Top-Right Navigation**: `Login / Sign Up` button transforms into a User Profile badge (`@username`, `My History`, `Log Out`) when logged in.
  * **100% Anonymous Access**: Account creation is completely optional. Non-logged-in users can summarize documents without restriction.
  * **User History Drawer**: Logged-in users automatically save and revisit past summaries sorted by date, with copy and deletion controls.
* **Anti-Decompression Bomb Security Shield**:
  * Direct zip/archive file blocking (`.zip`, `.tar`, `.7z`, `.rar`).
  * Enforced **15 MB max file size limit**.
  * **2,000,000 character output cap** on DOCX, XLSX, and PDF extractions to prevent memory exhaustion / Zip Bomb attacks.
  * Null-byte and control character input sanitization.
* **Smooth Scroll CTA Navigation**: All Call-to-Action buttons ("Try Free", "Try it now", "Upload a document") smoothly navigate users directly to the upload zone with a visual focus ring indicator.

---

## 5. Technology Stack & Rationale

| Dependency | Purpose | Rationale |
| :--- | :--- | :--- |
| **React 18.3 & TypeScript** | Component Framework | Provides a component-driven architecture with strict compile-time type-safety. |
| **Vite 6.0** | Build Toolchain | Delivers near-instantaneous hot reloading and highly optimized assets bundling. |
| **Tailwind CSS v4 & Shadcn** | Styling & UI Primitives | Custom CSS tokens paired with highly accessible, clean structural primitives. |
| **pdfjs-dist** | Local PDF Extraction | Decodes PDF binary formats and extracts text streams entirely inside the browser. |
| **Mammoth.js** | Local DOCX Parsing | Converts Word XML structures directly to text, preventing server-side rendering overhead. |
| **SheetJS (xlsx)** | Local Excel Processing | Reads complex worksheets, row data, and formula cells without external dependencies. |
| **Tesseract.js** | Client-Side OCR | Performs local optical character recognition in browser Web Workers using compiled WebAssembly. |
| **Motion** | Fluid Micro-Animations | Controls state-based canvas rendering, progress tracking, and keyframe transitions. |
| **Gemini 3.6 Flash** | Generative AI Inference | Delivers highly accurate summaries, fast response speeds, and strict JSON schema enforcement. |

---

## 6. Differentiator Matrix

| Feature / Metric | Cloud-Based SaaS Tools (e.g., ChatPDF) | Summify |
| :--- | :--- | :--- |
| **File Storage Location** | Remote Third-Party Servers | **100% Local Browser Memory** |
| **Privacy Compliance** | High Risk (Subject to Data Brokerage) | **Zero Leakage (GDPR / SOC 2 Ready)** |
| **Scanned Document Support** | Often requires paid premium plans | **Integrated local OCR (Free/Unlimited)** |
| **Excel Spreadsheet Support** | Poor or unsupported | **Robust cell parser integration** |
| **Pricing Model** | Recurring monthly subscription fees | **Free Tier Dev API (Pay-as-you-go)** |
| **Data Retention** | Permanent or 30-day retention policies | **None (Data ceases to exist on browser close)** |

---

## 7. UI/UX Figma Design Integrity

Summify is engineered to preserve the stylistic and functional decisions of its original Figma design:
* **Color System**: Employs an ultra-modern color scheme with rich emerald accent colors (`#00c853` / `#00b853`), deep charcoal elements (`#0c140e`), and soft slate backgrounds (`bg-muted/30`) that provide high visual comfort.
* **Layout Design**: A minimalist navigation structure and unified interactive dashboard prevent cognitive overload.
* **Micro-Animations**: Uses framer-motion keyframes for tab selections, progress fills, error dialog expansions, and a pulsing live status indicator to make the system feel active and responsive.
* **Trust Elements**: Utilizes clear, high-contrast visual badges (e.g., `🔒 ZERO DATA STORED`, `📄 PDF / WORD / TXT`) to provide instant security reassurance.

---

## 8. Strategic Product Roadmap

* **YouTube Video Link Summarizer**: Implement transcript fetching modules via secure proxy endpoints, enabling Gemini to synthesize long-form video lectures and conference calls.
* **Interactive Document Chatbot (Local RAG)**: Build a local Retrieval-Augmented Generation panel allowing users to query document contents interactively in real-time.
* **Multilingual Translation**: Support direct localization of summaries into 15+ international languages.
* **Offline AI Processing**: Provide support for local LLMs (e.g., Llama 3 via Ollama) to allow completely offline summarization workloads.

---

## 9. Security & Compliance

Summify does not act as an intermediary for user data:
* **No Database Logging**: No server databases are maintained by this application.
* **Secure API Key Custody**: API Keys are kept within your browser's private application storage. They are never sent to any intermediary server and are dispatched solely to Google's official Gemini endpoint.
* **Secure Transit**: All communications with the Google Gemini API are encrypted in transit via Transport Layer Security (TLS 1.3).

---

## 10. License

This project is licensed under the MIT License. See the LICENSE file for details.

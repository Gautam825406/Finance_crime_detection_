"use client";

import { useRef, useState, type ChangeEvent } from "react";

interface CSVUploaderProps {
  onUpload: (csvText: string) => void;
  isLoading: boolean;
}

export default function CSVUploader({ onUpload, isLoading }: CSVUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [fileError, setFileError] = useState<string>("");
  const [csvContent, setCsvContent] = useState<string>("");

  function handleFileChange(e: ChangeEvent<HTMLInputElement>): void {
    setFileError("");
    setCsvContent("");
    setFileName("");

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".csv")) {
      setFileError("Only .csv files are accepted.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        setCsvContent(text);
      }
    };
    reader.onerror = () => {
      setFileError("Failed to read file.");
    };
    reader.readAsText(file);
  }

  function handleAnalyze(): void {
    if (!csvContent) {
      setFileError("Please select a CSV file first.");
      return;
    }
    onUpload(csvContent);
  }

  function handleReset(): void {
    setFileName("");
    setFileError("");
    setCsvContent("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="glass rounded-2xl p-6 shadow-card">
      <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2.5 tracking-tight">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600/20 to-violet-600/20 border border-blue-500/20 flex items-center justify-center">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        Upload Transaction CSV
      </h2>

      <div className="space-y-4">
        <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-blue-500/40 transition-all duration-300 hover:bg-white/[0.01] cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-upload"
          />
          <label
            htmlFor="csv-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-white/5">
              <svg className="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <span className="text-slate-300 text-sm font-medium">
              {fileName ? fileName : "Click to select a .csv file"}
            </span>
            <span className="text-slate-600 text-xs">
              Required: transaction_id, sender_id, receiver_id, amount, timestamp
            </span>
          </label>
        </div>

        {fileError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl text-sm">
            {fileError}
          </div>
        )}

        {fileName && !fileError && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {fileName} loaded successfully
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !csvContent}
            className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-semibold py-3 px-6 rounded-xl transition-all btn-lift disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Analyze Transactions
              </>
            )}
          </button>

          <button
            onClick={handleReset}
            disabled={isLoading}
            className="bg-white/5 hover:bg-white/10 disabled:opacity-30 text-slate-300 font-medium py-3 px-5 rounded-xl transition-all border border-white/5 hover:border-white/10"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

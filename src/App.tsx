/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { Upload, Link as LinkIcon, AlertCircle, CheckCircle2, XCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';

interface AnalysisDetail {
  status: boolean;
  label: string;
  value: string;
  why: string;
}

interface AnalysisResult {
  url: string;
  hasToC: boolean;
  hasFAQ: boolean;
  error?: string;
  status: 'pending' | 'loading' | 'success' | 'error';
  details?: {
    keywords: AnalysisDetail;
    nesting: AnalysisDetail;
  };
  listAnalysis?: {
    isPresent: boolean;
    isStandard: boolean;
  };
}

export default function App() {
  const [urls, setUrls] = useState<string>('');
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const toggleRow = (idx: number) => {
    setExpandedRow(expandedRow === idx ? null : idx);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      const extractedUrls = data
        .flat()
        .filter(cell => typeof cell === 'string' && cell.startsWith('http'))
        .join('\n');
      
      setUrls(prev => prev ? prev + '\n' + extractedUrls : extractedUrls);
    };
    reader.readAsBinaryString(file);
  };

  const analyzeUrls = async () => {
    const urlList = urls.split('\n').map(u => u.trim()).filter(u => u !== '');
    if (urlList.length === 0) return;

    setIsAnalyzing(true);
    const initialResults: AnalysisResult[] = urlList.map(url => ({
      url,
      hasToC: false,
      hasFAQ: false,
      status: 'loading'
    }));
    setResults(initialResults);

    const updatedResults = [...initialResults];

    for (let i = 0; i < urlList.length; i++) {
      const url = urlList[i];
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url })
        });
        const data = await response.json();
        
        updatedResults[i] = {
          ...data,
          status: response.ok ? 'success' : 'error'
        };
      } catch (err: any) {
        updatedResults[i] = {
          url,
          hasToC: false,
          hasFAQ: false,
          status: 'error',
          error: err.message
        };
      }
      setResults([...updatedResults]);
    }
    setIsAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#141414] font-sans p-6 md:p-12">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
          >
            1.1 ToC -  faq - list control elements for VW PKW Urls
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-600 italic"
          >
            With this tool, we can analyze the following points: Missing ToC on relevant pages
          </motion.p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <section className="bg-white p-8 rounded-2xl shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              <LinkIcon size={16} />
              Manual Input
            </div>
            <textarea
              className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black focus:border-transparent transition-all resize-none font-mono text-sm"
              placeholder="Enter URLs (one per line)..."
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
            />
          </section>

          <section className="bg-white p-8 rounded-2xl shadow-sm border border-black/5 flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
              <FileSpreadsheet size={16} />
              Excel Upload
            </div>
            <label className="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-black/20 transition-all">
              <Upload className="text-gray-400 mb-4" size={32} />
              <span className="text-sm text-gray-600 font-medium">Click to upload or drag and drop</span>
              <span className="text-xs text-gray-400 mt-1">Excel files (.xlsx, .xls)</span>
              <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
            </label>
          </section>
        </div>

        <div className="flex justify-center mb-12">
          <button
            onClick={analyzeUrls}
            disabled={isAnalyzing || !urls.trim()}
            className="px-12 py-4 bg-[#141414] text-white rounded-full font-bold text-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-3 shadow-xl shadow-black/10"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="animate-spin" />
                Analyzing...
              </>
            ) : (
              'Start Analysis'
            )}
          </button>
        </div>

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-bottom border-gray-100">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">URL</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">ToC Detected</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">List Analysis</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">FAQ Detected</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, idx) => (
                      <React.Fragment key={idx}>
                        <tr 
                          onClick={() => result.hasToC && toggleRow(idx)}
                          className={`border-b border-gray-50 transition-colors ${
                            result.hasToC ? 'cursor-pointer hover:bg-gray-50' : ''
                          }`}
                        >
                          <td className="px-6 py-4 font-mono text-xs truncate max-w-md" title={result.url}>
                            {result.url}
                          </td>
                          <td className="px-6 py-4">
                            {result.status === 'loading' ? (
                              <div className="h-4 w-12 bg-gray-100 animate-pulse rounded" />
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                result.hasToC 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-rose-100 text-rose-700'
                              }`}>
                                {result.hasToC ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                {result.hasToC ? 'TRUE' : 'FALSE'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {result.status === 'loading' ? (
                              <div className="h-4 w-24 bg-gray-100 animate-pulse rounded" />
                            ) : result.listAnalysis ? (
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">Is a list there?</span>
                                  <span className={`text-[10px] font-black ${result.listAnalysis.isPresent ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    {result.listAnalysis.isPresent ? 'TRUE' : 'FALSE'}
                                  </span>
                                </div>
                                {result.listAnalysis.isPresent && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Developed with ul/ol?</span>
                                    <span className={`text-[10px] font-black ${result.listAnalysis.isStandard ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {result.listAnalysis.isStandard ? 'TRUE' : 'FALSE'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-6 py-4">
                            {result.status === 'loading' ? (
                              <div className="h-4 w-12 bg-gray-100 animate-pulse rounded" />
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                result.hasFAQ 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-rose-100 text-rose-700'
                              }`}>
                                {result.hasFAQ ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                {result.hasFAQ ? 'TRUE' : 'FALSE'}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {result.status === 'loading' && (
                              <span className="text-xs text-gray-400 flex items-center gap-2">
                                <Loader2 size={12} className="animate-spin" />
                                Checking...
                              </span>
                            )}
                            {result.status === 'success' && (
                              <span className="text-xs text-emerald-600 font-medium">
                                {result.hasToC ? 'Click to view details' : 'Completed'}
                              </span>
                            )}
                            {result.status === 'error' && (
                              <span className="text-xs text-rose-600 font-medium flex items-center gap-1" title={result.error}>
                                <AlertCircle size={12} />
                                Error
                              </span>
                            )}
                          </td>
                        </tr>
                        <AnimatePresence>
                          {expandedRow === idx && result.details && (
                            <motion.tr
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="bg-gray-50/50"
                            >
                              <td colSpan={5} className="px-6 py-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {Object.entries(result.details as Record<string, AnalysisDetail>).map(([key, detail]) => (
                                    <div key={key} className="bg-white p-4 rounded-xl border border-black/5 shadow-sm">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                          {detail.label}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                          detail.status ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                        }`}>
                                          {detail.status ? 'Passed' : 'Failed'}
                                        </span>
                                      </div>
                                      <p className="text-sm font-semibold mb-1">{detail.value}</p>
                                      <p className="text-xs text-gray-500 italic">
                                        <span className="font-bold not-italic mr-1">Why?</span>
                                        {detail.why}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

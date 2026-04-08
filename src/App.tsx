import React, { useState, useRef } from 'react';
import { Upload, FileText, BookOpen, AlertCircle, CheckCircle2, Loader2, X, Info, ChevronDown, Download } from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } from 'docx';
import { GoogleGenAI } from '@google/genai';

export default function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [courseLevel, setCourseLevel] = useState('基礎科');
  const [courseName, setCourseName] = useState('');
  const [teacherConcerns, setTeacherConcerns] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);
    setError(null);

    try {
      // 預留 API Key 變數 (在此環境中自動帶入環境變數，若無則使用預設提示)
      // const API_KEY = process.env.GEMINI_API_KEY || 'API_KEY_HERE';
      
      // 讀取所有上傳的檔案並轉換為 Base64
      const fileParts = await Promise.all(
        files.map(async (file) => {
          const base64EncodedDataPromise = new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.readAsDataURL(file);
          });
          
          let mimeType = file.type;
          if (!mimeType) {
            if (file.name.endsWith('.pdf')) mimeType = 'application/pdf';
            else if (file.name.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            else if (file.name.endsWith('.doc')) mimeType = 'application/msword';
            else mimeType = 'text/plain';
          }

          return {
            inlineData: { 
              data: await base64EncodedDataPromise, 
              mimeType 
            }
          };
        })
      );

const prompt = `
科目名稱：\${courseName || '未命名科目'}
課程程度：\${courseLevel}
教師特別顧慮或牧養處境：\${teacherConcerns || '無'}

請讀取附件的大綱，並結合老師的顧慮，嚴格遵守《中國神學研究院人工智能使用指引 v1.6》的規範，輸出完整的 JSON 格式（包含 appendix1_table 和 teacher_checklist）。

請確保 appendix1_table 完整包含以下 17 項 AI 使用類別：
1. 基本資料搜尋與篩選
2. 文件整理與分類
3. 語法、拼寫和標點檢查
4. 用字、風格和表達建議
5. 輔助理解複雜概念
6. 聖經原文輔助練習
7. 聖經原文初步翻譯或字義查詢
8. 生成文本摘要與概述
9. 生成初步研究思路或大綱
10. 生成初步的書目或參考文獻列表
11. 生成非文字內容用於輔助展示
12. 作對談伙伴或啟發工具
13. 生成學術寫作的片段或草稿
14. 進行初步的數據分析或模式識別
15. 模擬或角色扮演
16. 使用代理式AI (Agentic AI) 執行複雜研究任務
17. 其他：

JSON 格式要求：
{
  "appendix1_table": [
    {
      "category_id": 1,
      "task": "基本資料搜尋與篩選",
      "status": "允許使用 (無需披露)" | "允許使用 (需披露)" | "不允許使用",
      "note": "結合課程大綱與老師顧慮的具體規範說明"
    }
    // ... 必須依照上述順序，完整輸出 1 至 17 項
  ],
  "teacher_checklist": [
    "針對此課程 AI 使用的具體教學與評估建議 1",
    "針對此課程的學術誠信或牧養數據去識別化建議 2"
  ]
}
`;

// 建構發送給 API 的 JSON payload
const payload = {
  systemInstruction: {
    parts: [
      {
        text: "你是一位中神教務助理。請根據《中國神學研究院人工智能使用指引 v1.6》，針對用戶提供的課程大綱與設定，輸出包含 17 項 AI 權限的 appendix1_table 以及 teacher_checklist。請注意：若課程涉及實踐、牧養處境或敏感數據，必須強制要求學生落實資料去識別化，以確保數據安全與基督教道德價值。"
      }
    ]
  },
  contents: [
    {
      role: "user",
      parts: [
        ...fileParts,
        { text: prompt }
      ]
    }
  ],
  generationConfig: {
    responseMimeType: "application/json"
  }
};
      // 使用 fetch 發送請求到 Google Gemini 3.1 Pro API
// 1. 定義您的 Google Apps Script Web App 網址 (請替換為您實際取得的 URL)
const gasWebAppUrl = 'https://script.google.com/macros/s/AKfycbyMXLHlh9lcPzsrONo1l1cs_6JVkdM5Q8NrJo2esiNxHwnAm_dYo-MhaoCAYL2UqrDYEA/exec'; 

// 2. 發送請求至您的安全代理 (不再需要帶入 API_KEY)
const response = await fetch(gasWebAppUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'text/plain;charset=utf-8', // GAS 接收 POST 請求時，建議使用 text/plain 以避免 CORS 預檢請求 (Preflight) 問題
  },
  body: JSON.stringify(payload)
});

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API 請求失敗 (狀態碼: ${response.status})`);
      }

      const data = await response.json();
      const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!responseText) throw new Error("API 回傳內容為空");
      
      const parsedResult = JSON.parse(responseText);
      
      setResult({
        courseName: courseName || '未命名科目',
        level: courseLevel,
        appendix1_table: parsedResult.appendix1_table || [],
        teacher_checklist: parsedResult.teacher_checklist || []
      });

    } catch (err: any) {
      console.error("API 請求失敗:", err);
      setError(err.message || "發生未知錯誤，請確認上傳的檔案格式是否支援，或稍後再試。");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToWord = async () => {
    if (!result) return;

    const tableRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "任務 / 應用場景", bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "許可狀態", bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "備註 / 條件", bold: true })] })] }),
        ],
      }),
      ...result.appendix1_table.map((item: any) => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(item.task)] }),
          new TableCell({ children: [new Paragraph(item.status)] }),
          new TableCell({ children: [new Paragraph(item.note)] }),
        ],
      }))
    ];

    const doc = new Document({
      creator: "CGST AI Guideline Generator",
      title: "AI 使用指引",
      styles: {
        default: {
          document: {
            run: {
              font: {
                ascii: "Arial",
                eastAsia: "Microsoft JhengHei",
                hAnsi: "Arial",
                cs: "Arial",
              },
            },
          },
        },
      },
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "神學課程 AI 指引生成系統 - 生成結果",
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `科目名稱：`, bold: true }),
              new TextRun(result.courseName),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `課程程度：`, bold: true }),
              new TextRun(result.level),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            text: "附錄 1：課程中使用 AI 清單",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: tableRows,
          }),
          new Paragraph({ text: "", spacing: { after: 400 } }),
          new Paragraph({
            text: "教師教學與評估建議",
            heading: HeadingLevel.HEADING_2,
            spacing: { after: 200 },
          }),
          ...result.teacher_checklist.map((rec: string) => new Paragraph({
            text: rec,
            bullet: { level: 0 },
            spacing: { after: 100 },
          }))
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.courseName}_AI_使用指引.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '允許': return 'bg-green-100 text-green-800 border-green-200';
      case '有條件允許': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '不建議': return 'bg-orange-100 text-orange-800 border-orange-200';
      case '不允許': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-[#003366] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center gap-4">
          <BookOpen className="w-8 h-8 text-blue-200" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">神學課程 AI 指引生成系統</h1>
            <p className="text-blue-200 text-sm mt-1">中國神學研究院 (CGST) 專用</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-[#003366] mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                課程資訊輸入
              </h2>

              <div className="space-y-5">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    課程大綱或其他資料
                  </label>
                  <div 
                    className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:border-[#003366] transition-colors cursor-pointer bg-slate-50"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-10 w-10 text-slate-400" />
                      <div className="flex text-sm text-slate-600 justify-center">
                        <span className="relative rounded-md font-medium text-[#003366] hover:text-blue-800 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#003366]">
                          上傳檔案
                        </span>
                        <p className="pl-1"></p>
                      </div>
                      <p className="text-xs text-slate-500">支援 .pdf</p>
                    </div>
                  </div>
                  <input 
                    type="file" 
                    multiple 
                    accept=".pdf,.doc,.docx" 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  
                  {files.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {files.map((file, index) => (
                        <li key={index} className="flex items-center justify-between py-2 px-3 bg-blue-50 rounded-md border border-blue-100">
                          <span className="text-sm text-slate-700 truncate max-w-[200px]">{file.name}</span>
                          <button 
                            onClick={() => removeFile(index)}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Course Level */}
                <div>
                  <label htmlFor="level" className="block text-sm font-medium text-slate-700 mb-2">
                    課程程度
                  </label>
                  <div className="relative">
                    <select
                      id="level"
                      value={courseLevel}
                      onChange={(e) => setCourseLevel(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2.5 text-base border-slate-300 focus:outline-none focus:ring-[#003366] focus:border-[#003366] sm:text-sm rounded-lg border appearance-none bg-white"
                    >
                      <option value="基礎科">基礎科</option>
                      <option value="必修科">必修科</option>
                      <option value="選修科">選修科</option>
                      <option value="其他">其他</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Course Name */}
                <div>
                  <label htmlFor="courseName" className="block text-sm font-medium text-slate-700 mb-2">
                    科目名稱
                  </label>
                  <input
                    type="text"
                    id="courseName"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    placeholder="請輸入科目名稱"
                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-[#003366] focus:border-[#003366] sm:text-sm"
                  />
                </div>

                {/* Teacher Concerns */}
                <div>
                  <label htmlFor="concerns" className="block text-sm font-medium text-slate-700 mb-2">
                    教師特別顧慮或牧養處境
                  </label>
                  <textarea
                    id="concerns"
                    rows={4}
                    value={teacherConcerns}
                    onChange={(e) => setTeacherConcerns(e.target.value)}
                    placeholder="例如：此科目涉及個案分析，嚴禁上傳真實個資..."
                    className="block w-full px-3 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-[#003366] focus:border-[#003366] sm:text-sm resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-[#003366] hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003366] transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      生成中...
                    </>
                  ) : (
                    '生成 AI 使用指引'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[600px] flex flex-col">
              <h2 className="text-xl font-bold text-[#003366] mb-6 border-b border-slate-100 pb-4">
                生成結果
              </h2>

              {isGenerating ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
                  <Loader2 className="w-12 h-12 animate-spin text-[#003366]" />
                  <p className="text-lg font-medium text-[#003366]">正在進行神學邏輯分析與規則對照...</p>
                  <p className="text-sm">這可能需要幾秒鐘的時間</p>
                </div>
              ) : result ? (
                <div className="space-y-8 animate-in fade-in duration-500">
                  
                  {/* Result Header */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-bold text-[#003366]">{result.courseName}</h3>
                      <p className="text-sm text-blue-800 mt-1">課程程度：{result.level}</p>
                    </div>
                    <button
                      onClick={exportToWord}
                      className="flex items-center gap-2 px-4 py-2 bg-white text-[#003366] border border-[#003366] rounded-md hover:bg-blue-50 transition-colors text-sm font-medium shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      匯出為 Word
                    </button>
                  </div>

                  {/* Table Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#003366]" />
                      附錄 1：課程中使用 AI 清單
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/3">
                              任務 / 應用場景
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/4">
                              許可狀態
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              備註 / 條件
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                          {result.appendix1_table.map((item: any, index: number) => (
                            <tr key={index} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                {item.task}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                                  {item.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-600">
                                {item.note}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Recommendations Section */}
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-[#003366]" />
                      教師教學與評估建議
                    </h3>
                    <div className="bg-slate-50 rounded-lg border border-slate-200 p-5">
                      <ul className="space-y-3">
                        {result.teacher_checklist.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start gap-3">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#003366] text-white flex items-center justify-center text-xs font-bold mt-0.5">
                              {index + 1}
                            </span>
                            <span className="text-slate-700 text-sm leading-relaxed">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-4">
                  <Info className="w-12 h-12 text-slate-300" />
                  <p className="text-lg">請在左側輸入課程資訊並點擊生成</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold">發生錯誤</h3>
            </div>
            <p className="text-slate-600 mb-6 break-words">
              {error}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors"
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

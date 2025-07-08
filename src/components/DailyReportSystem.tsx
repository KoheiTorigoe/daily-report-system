import React, { useState, useEffect } from 'react';
import { MessageCircle, Clock, User, Building, FileText, Plus, Download, Calendar, BookOpen, BarChart3, Database, AlertCircle, Sparkles } from 'lucide-react';

// データ型定義
interface WorkHistory {
  id: string;
  date: string;
  user_name: string;
  client_name: string;
  work_type: string;
  start_time: string;
  end_time: string;
  duration: number;
  work_detail: string;
  result: string;
  issues: string;
  created_at: string;
  daily_report_included: boolean;
}

interface DailyReport {
  id: string;
  date: string;
  user_name: string;
  related_history_ids: string[];
  daily_summary: string;
  achievements: string;
  tomorrow_goals: string;
  overall_issues: string;
  report_to_manager: string;
  created_at: string;
}

// AI設定
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

// Supabase設定（環境変数対応）
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://byquekqumujmxgfrdppa.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5cXVla3F1bXVqbXhnZnJkcHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NTAwNDQsImV4cCI6MjA2NzUyNjA0NH0.GKXe3rsH3jAPADU00poZgYol_jxlZLc96qvCjZlZEr0';

// AI APIクラス
class GeminiAI {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateResponse(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Gemini API キーが設定されていません');
    }

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${response.status} - ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text;
      } else {
        throw new Error('APIレスポンスが不正です');
      }
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }
}

// AIアシスタントクラス
class WorkHistoryAI {
  private ai: GeminiAI;
  
  constructor() {
    this.ai = new GeminiAI(GEMINI_API_KEY || '');
  }

  async getNextQuestion(step: number, previousAnswers: string[], currentAnswer?: string): Promise<string> {
    const baseQuestions = [
      "お疲れさまでした！今日の作業履歴を記録していきましょう。どちらの客先での作業が完了しましたか？",
      "ありがとうございます。どのような種類の作業でしたか？（例：システム開発、保守作業、会議、調査など）",
      "作業時間について教えてください。何時から何時まで作業されましたか？（例：9:00-17:00、14:30-16:45など）",
      "作業の詳しい内容について教えてください。",
      "今日の作業の成果はいかがでしたか？",
      "作業中に感じた課題や問題点はありましたか？"
    ];

    if (step < baseQuestions.length) {
      return baseQuestions[step];
    }

    // AIを使用してより自然な質問を生成
    if (GEMINI_API_KEY) {
      try {
        const prompt = `
あなたは作業履歴記録のアシスタントです。ユーザーから以下の情報を収集しています：

これまでの回答:
${previousAnswers.map((answer, index) => `${index + 1}. ${answer}`).join('\n')}

現在の回答: ${currentAnswer || ''}

次に聞くべき適切な質問を日本語で簡潔に（50文字以内）生成してください。
親しみやすく、業務的すぎない口調でお願いします。`;

        return await this.ai.generateResponse(prompt);
      } catch (error) {
        console.error('AI Question Generation Error:', error);
      }
    }

    return baseQuestions[step % baseQuestions.length];
  }

  async generateDailySummary(histories: WorkHistory[]): Promise<string> {
    if (!GEMINI_API_KEY || histories.length === 0) {
      return "AI機能を使用するにはAPIキーの設定が必要です。または記録された履歴がありません。";
    }

    try {
      const historyText = histories.map(h => 
        `【${h.client_name}】${h.work_type} (${h.start_time}-${h.end_time}) - ${h.work_detail} | 成果: ${h.result}`
      ).join('\n');

      const prompt = `
以下の作業履歴を基に、簡潔で具体的な日報サマリーを作成してください：

${historyText}

要件：
- 200-300文字程度
- 客先名と主要成果を明記
- 業務報告に適した丁寧な文体
- 箇条書きではなく文章形式
- 具体的な数値や成果を強調`;

      return await this.ai.generateResponse(prompt);
    } catch (error: any) {
      console.error('AI Summary Error:', error);
      return `AIサマリー生成エラー: ${error.message}`;
    }
  }

  async generateTomorrowGoals(histories: WorkHistory[], todaySummary: string): Promise<string> {
    if (!GEMINI_API_KEY) {
      return "明日の目標設定にはAPIキーが必要です。";
    }

    try {
      const prompt = `
本日の作業サマリー：
${todaySummary}

本日の作業詳細：
${histories.map(h => `${h.client_name}: ${h.work_type} - ${h.issues || '課題なし'}`).join('\n')}

上記を踏まえて、明日の具体的な目標を3つ提案してください：
- 実行可能で測定可能な目標
- 今日の課題を改善する内容
- ビジネス価値を意識した目標
- 各目標50文字以内`;

      return await this.ai.generateResponse(prompt);
    } catch (error: any) {
      console.error('AI Tomorrow Goals Error:', error);
      return `AI目標生成エラー: ${error.message}`;
    }
  }

  async generateManagerReport(histories: WorkHistory[], summary: string): Promise<string> {
    if (!GEMINI_API_KEY) {
      return "管理者向けレポート作成にはAPIキーが必要です。";
    }

    try {
      const totalHours = Math.floor(histories.reduce((sum, h) => sum + h.duration, 0) / 60);
      const clientCount = new Set(histories.map(h => h.client_name)).size;

      const prompt = `
以下の情報から管理者向けの簡潔な報告を作成してください：

作業サマリー: ${summary}
総作業時間: ${totalHours}時間
訪問客先数: ${clientCount}社

要件：
- 管理者が知りたい重要事項を優先
- 150文字以内
- 成果と課題を明確に分離
- 必要に応じて数値を含める`;

      return await this.ai.generateResponse(prompt);
    } catch (error: any) {
      console.error('AI Manager Report Error:', error);
      return `AI管理者レポート生成エラー: ${error.message}`;
    }
  }
}

// Supabaseクライアント（本番対応版）
const supabaseClient = {
  async insert(table: string, data: any) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`✅ Supabase INSERT成功: ${table}`, result);
      return { data: result[0] || data, error: null };
    } catch (error: any) {
      console.error(`❌ Supabase INSERT エラー: ${table}`, error);
      return { data: null, error: error.message };
    }
  },
  
  async select(table: string, filter?: any) {
    try {
      let url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
      if (filter?.user_email) {
        url += `&user_email=eq.${encodeURIComponent(filter.user_email)}`;
      }
      if (filter?.date) {
        url += `&date=eq.${filter.date}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`✅ Supabase SELECT成功: ${table}`, result);
      return { data: result, error: null };
    } catch (error: any) {
      console.error(`❌ Supabase SELECT エラー: ${table}`, error);
      return { data: [], error: error.message };
    }
  }
};

const DailyReportSystem = () => {
  const [histories, setHistories] = useState<WorkHistory[]>([]);
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([]);
  const [currentHistory, setCurrentHistory] = useState<Partial<WorkHistory>>({});
  const [currentReport, setCurrentReport] = useState<Partial<DailyReport>>({});
  const [conversationStep, setConversationStep] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isCreatingReport, setIsCreatingReport] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'report' | 'deploy'>('history');
  const [messages, setMessages] = useState<{text: string, isUser: boolean}[]>([]);
  const [userInput, setUserInput] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [storageMode, setStorageMode] = useState<'local' | 'supabase'>('local');
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  
  // AI関連の状態
  const [aiAssistant] = useState(new WorkHistoryAI());
  const [aiStatus, setAiStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [conversationAnswers, setConversationAnswers] = useState<string[]>([]);
  const [reportStep, setReportStep] = useState(0);

  // 初期化
  useEffect(() => {
    if (!userName) {
      const name = prompt('お名前を入力してください：') || 'テストユーザー';
      const email = prompt('メールアドレスを入力してください：') || 'test@example.com';
      setUserName(name);
      setUserEmail(email);
      loadData();
    }
    
    // AI可用性チェック
    checkAIAvailability();
  }, [userName]);

  // AI可用性チェック
  const checkAIAvailability = () => {
    if (GEMINI_API_KEY && GEMINI_API_KEY.length > 10) {
      setAiStatus('available');
    } else {
      setAiStatus('unavailable');
    }
  };

  // データ読み込み
  const loadData = async () => {
    const savedHistories = localStorage.getItem('work_histories');
    const savedReports = localStorage.getItem('daily_reports');
    
    if (savedHistories) {
      setHistories(JSON.parse(savedHistories));
    }
    if (savedReports) {
      setDailyReports(JSON.parse(savedReports));
    }
  };

  // ストレージモード切り替え
  const switchStorageMode = async (mode: 'local' | 'supabase') => {
    setStorageMode(mode);
    setConnectionStatus('unknown');
    
    if (mode === 'supabase') {
      alert('Supabaseモードに切り替えました。「データベース接続確認」で動作確認してください。');
    } else {
      alert('ローカルストレージモードに切り替えました。');
    }
  };

  // Supabase接続テスト
  const testSupabaseConnection = async () => {
    try {
      setConnectionStatus('unknown');
      const result = await supabaseClient.select('workhistories', { user_email: userEmail });
      
      if (result.error) {
        setConnectionStatus('error');
        alert(`❌ データベース接続エラー:\n${result.error}\n\nテーブルが作成されていない可能性があります。`);
        return false;
      } else {
        setConnectionStatus('success');
        alert('✅ Supabaseデータベースに正常に接続できました！\n\nSupabaseモードでの運用が可能です。');
        return true;
      }
    } catch (error: any) {
      setConnectionStatus('error');
      alert(`❌ 接続エラー: ${error.message}`);
      return false;
    }
  };

  // AI対話開始（改良版）
  const startAIRecording = async () => {
    setIsRecording(true);
    setConversationStep(0);
    setConversationAnswers([]);
    setCurrentHistory({
      id: generateUUID(),
      date: new Date().toISOString().split('T')[0],
      user_name: userName,
      created_at: new Date().toISOString(),
      daily_report_included: false
    });
    setMessages([]);
    
    try {
      const firstQuestion = await aiAssistant.getNextQuestion(0, []);
      await addMessage(firstQuestion, false);
    } catch (error) {
      await addMessage("お疲れさまでした！今日の作業履歴を記録していきましょう。どちらの客先での作業が完了しましたか？", false);
    }
  };

  // AI日報作成開始（改良版）
  const startAIReportCreation = async () => {
    if (histories.length === 0) {
      alert('日報を作成するには、先に履歴を記録してください。');
      return;
    }

    setIsCreatingReport(true);
    setMessages([]);
    setActiveTab('report');
    setReportStep(0);
    
    setCurrentReport({
      id: generateUUID(),
      date: new Date().toISOString().split('T')[0],
      user_name: userName,
      related_history_ids: histories.map(h => h.id),
      created_at: new Date().toISOString()
    });

    const analysisMessage = generateHistoryAnalysis();
    await addMessage(analysisMessage, false);
    
    setTimeout(async () => {
      if (aiStatus === 'available') {
        setIsAiProcessing(true);
        try {
          const aiSummary = await aiAssistant.generateDailySummary(histories);
          await addMessage(`AIが分析した本日のサマリー：\n\n${aiSummary}`, false);
          setTimeout(async () => {
            await addMessage("この内容で問題なければ「OK」、修正したい場合は修正内容を教えてください。", false);
          }, 1500);
        } catch (error) {
          await addMessage("AI分析でエラーが発生しました。手動で日報を作成していきましょう。今日一日を振り返って、全体的にはいかがでしたか？", false);
        } finally {
          setIsAiProcessing(false);
        }
      } else {
        await addMessage("今日一日を振り返って、全体的にはいかがでしたか？", false);
      }
    }, 1500);
  };

  // 履歴分析メッセージ生成
  const generateHistoryAnalysis = (): string => {
    const clientNames = [...new Set(histories.map(h => h.client_name))];
    const workTypes = [...new Set(histories.map(h => h.work_type))];
    const totalDuration = histories.reduce((sum, h) => sum + h.duration, 0);
    
    return `📊 本日の作業分析結果：\n• 訪問客先: ${clientNames.join('、')} (${clientNames.length}社)\n• 作業種別: ${workTypes.join('、')}\n• 総作業時間: ${Math.floor(totalDuration/60)}時間${totalDuration%60}分\n• 記録件数: ${histories.length}件`;
  };

  // メッセージ追加
  const addMessage = async (text: string, isUser: boolean) => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        setMessages(prev => [...prev, { text, isUser }]);
        resolve();
      }, 500);
    });
  };

  // ユーザー入力処理（AI統合版）
  const handleUserInput = async () => {
    if (!userInput.trim()) return;

    setMessages(prev => [...prev, { text: userInput, isUser: true }]);
    
    if (isRecording) {
      // 履歴記録処理
      const fields = ['client_name', 'work_type', 'start_time', 'work_detail', 'result', 'issues'];
      const currentField = fields[conversationStep];
      
      const updatedHistory = { ...currentHistory };
      const newAnswers = [...conversationAnswers, userInput];
      setConversationAnswers(newAnswers);
      
      if (currentField === 'start_time') {
        const timeMatch = userInput.match(/(\d{1,2}):?(\d{2})?\s*[-~〜]\s*(\d{1,2}):?(\d{2})?/);
        if (timeMatch) {
          updatedHistory.start_time = `${timeMatch[1].padStart(2, '0')}:${(timeMatch[2] || '00').padStart(2, '0')}`;
          updatedHistory.end_time = `${timeMatch[3].padStart(2, '0')}:${(timeMatch[4] || '00').padStart(2, '0')}`;
          updatedHistory.duration = calculateDuration(updatedHistory.start_time!, updatedHistory.end_time!);
        }
      } else {
        (updatedHistory as any)[currentField] = userInput;
      }
      setCurrentHistory(updatedHistory);

      if (conversationStep < fields.length - 1) {
        setConversationStep(conversationStep + 1);
        setIsAiProcessing(true);
        
        try {
          const nextQuestion = await aiAssistant.getNextQuestion(conversationStep + 1, newAnswers, userInput);
          setTimeout(async () => {
            await addMessage(nextQuestion, false);
            setIsAiProcessing(false);
          }, 1000);
        } catch (error) {
          const fallbackQuestions = [
            "ありがとうございます。どのような種類の作業でしたか？",
            "作業時間について教えてください。何時から何時まで作業されましたか？",
            "作業の詳しい内容について教えてください。",
            "今日の作業の成果はいかがでしたか？",
            "作業中に感じた課題や問題点はありましたか？"
          ];
          setTimeout(async () => {
            await addMessage(fallbackQuestions[conversationStep], false);
            setIsAiProcessing(false);
          }, 1000);
        }
      } else {
        // 履歴記録完了
        const completedHistory = updatedHistory as WorkHistory;
        setHistories(prev => {
          const newHistories = [...prev, completedHistory];
          localStorage.setItem('work_histories', JSON.stringify(newHistories));
          return newHistories;
        });
        
        setTimeout(async () => {
          await addMessage(`✅ 記録が完了しました！\n\n${completedHistory.client_name}での${completedHistory.work_type}が保存されました。`, false);
          setIsRecording(false);
          setConversationStep(0);
          setConversationAnswers([]);
        }, 1000);
      }
    } else if (isCreatingReport) {
      // 日報作成処理（AI統合版）
      if (reportStep === 0) {
        // サマリー確認段階
        if (userInput.toLowerCase().includes('ok') || userInput.includes('問題ない') || userInput.includes('大丈夫')) {
          setCurrentReport(prev => ({ ...prev, daily_summary: messages.find(m => m.text.includes('AIが分析した'))?.text.split('：\n\n')[1] || '' }));
          setReportStep(1);
          
          if (aiStatus === 'available') {
            setIsAiProcessing(true);
            try {
              const tomorrowGoals = await aiAssistant.generateTomorrowGoals(histories, currentReport.daily_summary || '');
              setTimeout(async () => {
                await addMessage(`明日の目標提案：\n\n${tomorrowGoals}`, false);
                await addMessage("この目標で問題なければ「OK」、修正したい場合は修正内容を教えてください。", false);
                setIsAiProcessing(false);
              }, 1000);
            } catch (error) {
              await addMessage("明日の目標を教えてください。", false);
              setIsAiProcessing(false);
            }
          } else {
            await addMessage("明日の目標を教えてください。", false);
          }
        } else {
          setCurrentReport(prev => ({ ...prev, daily_summary: userInput }));
          setReportStep(1);
          await addMessage("ありがとうございます。では、明日の目標を教えてください。", false);
        }
      } else if (reportStep === 1) {
        // 明日の目標設定段階
        setCurrentReport(prev => ({ ...prev, tomorrow_goals: userInput }));
        setReportStep(2);
        
        if (aiStatus === 'available') {
          setIsAiProcessing(true);
          try {
            const managerReport = await aiAssistant.generateManagerReport(histories, currentReport.daily_summary || '');
            setTimeout(async () => {
              await addMessage(`管理者向けレポート案：\n\n${managerReport}`, false);
              await addMessage("この内容で日報を完成させますか？「完成」で終了、修正があれば教えてください。", false);
              setIsAiProcessing(false);
            }, 1000);
          } catch (error) {
            await addMessage("最後に、管理者への報告事項があれば教えてください。", false);
            setIsAiProcessing(false);
          }
        } else {
          await addMessage("最後に、管理者への報告事項があれば教えてください。", false);
        }
      } else {
        // 最終確認段階
        if (userInput.includes('完成') || userInput.toLowerCase().includes('ok')) {
          const completedReport: DailyReport = {
            ...currentReport,
            report_to_manager: currentReport.report_to_manager || messages.find(m => m.text.includes('管理者向けレポート'))?.text.split('：\n\n')[1] || ''
          } as DailyReport;
          
          setDailyReports(prev => {
            const newReports = [...prev, completedReport];
            localStorage.setItem('daily_reports', JSON.stringify(newReports));
            return newReports;
          });
          
          await addMessage("🎉 日報が完成しました！お疲れさまでした。", false);
          setIsCreatingReport(false);
          setReportStep(0);
        } else {
          setCurrentReport(prev => ({ ...prev, report_to_manager: userInput }));
          await addMessage("修正内容を反映しました。日報を完成させますか？「完成」で終了してください。", false);
        }
      }
    }

    setUserInput('');
  };

  // 時間計算
  const calculateDuration = (startTime: string, endTime: string): number => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return endMinutes - startMinutes;
  };

  // UUID生成
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // CSV エクスポート
  const exportToCSV = () => {
    if (histories.length === 0) {
      alert('エクスポートする履歴がありません。');
      return;
    }

    const headers = [
      'ID', '日付', '氏名', '客先名', '作業種別', '開始時刻', '終了時刻', 
      '所要時間(分)', '作業内容詳細', '成果・結果', '課題・問題点', '登録日時'
    ];

    const csvContent = [
      headers.join(','),
      ...histories.map(h => [
        h.id, h.date, h.user_name, h.client_name, h.work_type,
        h.start_time, h.end_time, h.duration, 
        `"${h.work_detail}"`, `"${h.result}"`, `"${h.issues}"`, h.created_at
      ].join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `work_histories_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // AIステータス表示コンポーネント
  const AIStatusIndicator = () => (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
      aiStatus === 'available' 
        ? 'bg-green-100 text-green-800' 
        : aiStatus === 'unavailable'
        ? 'bg-red-100 text-red-800'
        : 'bg-gray-100 text-gray-800'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        aiStatus === 'available' ? 'bg-green-500' : 
        aiStatus === 'unavailable' ? 'bg-red-500' : 'bg-gray-500'
      }`}></div>
      <span>
        {aiStatus === 'available' ? 'Gemini AI 有効' : 
         aiStatus === 'unavailable' ? 'AI 無効' : 'AI状態 確認中'}
      </span>
      {isAiProcessing && (
        <div className="animate-spin w-3 h-3 border border-gray-400 border-t-transparent rounded-full"></div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-blue-600" />
                {aiStatus === 'available' && <Sparkles className="h-5 w-5 text-yellow-500" />}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {aiStatus === 'available' ? 'AI日報システム' : '日報システム'}
                </h1>
                <p className="text-gray-600">
                  {aiStatus === 'available' 
                    ? 'Gemini AI搭載 履歴記録＋日報作成' 
                    : '履歴記録機構 + 日報作成機構'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <AIStatusIndicator />
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <User className="h-4 w-4" />
                <span>{userName} ({userEmail})</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  storageMode === 'local' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {storageMode === 'local' ? 'ローカル保存' : 'Supabase連携'}
                </span>
              </div>
            </div>
          </div>
          
          {/* AI設定警告 */}
          {aiStatus === 'unavailable' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2 text-yellow-800">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">🚀 AI機能を有効にして体験をアップグレード！</span>
              </div>
              <div className="mt-2 text-sm text-yellow-700">
                <p><strong>手順：</strong> 1) Google AI StudioでGemini APIキー取得 → 2) Vercel環境変数「REACT_APP_GEMINI_API_KEY」設定 → 3) 再デプロイ</p>
                <p><strong>メリット：</strong> より自然な対話、自動サマリー生成、スマートな提案機能</p>
              </div>
            </div>
          )}
          
          {/* タブ */}
          <div className="flex space-x-1 mt-6 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
                activeTab === 'history' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>履歴記録</span>
              {aiStatus === 'available' && <Sparkles className="h-3 w-3 text-yellow-500" />}
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
                activeTab === 'report' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>日報作成</span>
              {aiStatus === 'available' && <Sparkles className="h-3 w-3 text-yellow-500" />}
            </button>
            <button
              onClick={() => setActiveTab('deploy')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-md transition-colors ${
                activeTab === 'deploy' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Database className="h-4 w-4" />
              <span>公開設定</span>
            </button>
          </div>
        </div>

        {activeTab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 対話エリア */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {aiStatus === 'available' ? 'Gemini AI対話による履歴記録' : 'AI対話による履歴記録'}
                </h2>
                {aiStatus === 'available' && <Sparkles className="h-4 w-4 text-yellow-500" />}
              </div>

              {/* メッセージエリア */}
              <div className="h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                {messages.length === 0 && !isRecording && (
                  <div className="text-center text-gray-500 mt-20">
                    <div className="mb-2">
                      {aiStatus === 'available' 
                        ? '🤖 Gemini AIが自然な対話で履歴記録をサポート' 
                        : 'AI対話機能で自然な履歴記録をサポート'
                      }
                    </div>
                    <div className="text-sm">「AI対話で履歴記録」をクリックして開始しましょう</div>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`mb-3 ${msg.isUser ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block p-3 rounded-lg max-w-xs ${
                      msg.isUser 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  </div>
                ))}
                {isAiProcessing && (
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 text-gray-500">
                      <div className="animate-spin w-4 h-4 border border-gray-400 border-t-transparent rounded-full"></div>
                      <span className="text-sm">AIが回答を生成中...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 入力エリア */}
              {isRecording && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isAiProcessing && handleUserInput()}
                    placeholder="回答を入力してください..."
                    disabled={isAiProcessing}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                  <button
                    onClick={handleUserInput}
                    disabled={isAiProcessing}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    送信
                  </button>
                </div>
              )}

              {/* 履歴記録開始ボタン */}
              {!isRecording && (
                <button
                  onClick={startAIRecording}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-3 text-white rounded-md ${
                    aiStatus === 'available' 
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' 
                      : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700'
                  }`}
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>
                    {aiStatus === 'available' ? 'Gemini AI対話で履歴記録' : 'AI対話で履歴記録'}
                  </span>
                  {aiStatus === 'available' && <Sparkles className="h-4 w-4" />}
                </button>
              )}
            </div>

            {/* 履歴一覧 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">本日の履歴</h2>
                </div>
                {histories.length > 0 && (
                  <button
                    onClick={exportToCSV}
                    className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>CSV出力</span>
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {histories.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    まだ履歴がありません
                  </div>
                ) : (
                  histories.map((history) => (
                    <div key={history.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{history.client_name}</span>
                        </div>
                        <span className="text-sm text-gray-500">
                          {history.start_time} - {history.end_time} ({history.duration}分)
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div><span className="font-medium">作業：</span>{history.work_type}</div>
                        <div><span className="font-medium">内容：</span>{history.work_detail}</div>
                        <div><span className="font-medium">成果：</span>{history.result}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 日報対話エリア */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    {aiStatus === 'available' ? 'Gemini AI日報作成' : 'AI日報作成'}
                  </h2>
                  {aiStatus === 'available' && <Sparkles className="h-4 w-4 text-yellow-500" />}
                </div>
                {histories.length > 0 && !isCreatingReport && (
                  <button
                    onClick={startAIReportCreation}
                    className={`flex items-center space-x-2 px-3 py-2 text-white rounded-md text-sm ${
                      aiStatus === 'available' 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
                    }`}
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>
                      {aiStatus === 'available' ? 'Gemini AI日報作成' : 'AI日報作成'}
                    </span>
                    {aiStatus === 'available' && <Sparkles className="h-3 w-3" />}
                  </button>
                )}
              </div>

              {/* メッセージエリア */}
              <div className="h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                {messages.length === 0 && !isCreatingReport && (
                  <div className="text-center text-gray-500 mt-20">
                    {histories.length === 0 
                      ? '履歴を記録してからAI日報作成を開始してください' 
                      : aiStatus === 'available'
                      ? '🤖 Gemini AIが履歴を分析して日報を自動生成'
                      : 'AI対話による日報作成をサポート'
                    }
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className={`mb-3 ${msg.isUser ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block p-3 rounded-lg max-w-xs ${
                      msg.isUser 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    </div>
                  </div>
                ))}
                {isAiProcessing && (
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-2 text-gray-500">
                      <div className="animate-spin w-4 h-4 border border-gray-400 border-t-transparent rounded-full"></div>
                      <span className="text-sm">AIが日報を生成中...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 入力エリア */}
              {isCreatingReport && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isAiProcessing && handleUserInput()}
                    placeholder="回答を入力してください..."
                    disabled={isAiProcessing}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
                  />
                  <button
                    onClick={handleUserInput}
                    disabled={isAiProcessing}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400"
                  >
                    送信
                  </button>
                </div>
              )}
            </div>

            {/* 日報一覧 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <BookOpen className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">日報一覧</h2>
              </div>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {dailyReports.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    まだ日報がありません
                  </div>
                ) : (
                  dailyReports.map((report) => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">{report.date}</span>
                        </div>
                        {aiStatus === 'available' && (
                          <span className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                            <Sparkles className="h-3 w-3" />
                            <span>AI生成</span>
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        <div><span className="font-medium">総括：</span>{report.daily_summary}</div>
                        <div><span className="font-medium">成果：</span>{report.achievements}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deploy' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Supabase接続設定 */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Database className="h-5 w-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">データベース設定</h2>
              </div>

              <div className="space-y-4">
                {/* ストレージモード選択 */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">データ保存方式</h3>
                  <div className="flex space-x-3 mb-3">
                    <button
                      onClick={() => switchStorageMode('local')}
                      className={`px-4 py-2 rounded text-sm font-medium ${
                        storageMode === 'local'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      ローカル保存
                    </button>
                    <button
                      onClick={() => switchStorageMode('supabase')}
                      className={`px-4 py-2 rounded text-sm font-medium ${
                        storageMode === 'supabase'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Supabase連携
                    </button>
                  </div>
                  
                  {/* 接続状況表示 */}
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`w-3 h-3 rounded-full ${
                        connectionStatus === 'success' ? 'bg-green-500' : 
                        connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                      }`}></span>
                      <span className="text-sm font-medium">
                        {connectionStatus === 'success' ? 'Supabase接続成功' : 
                         connectionStatus === 'error' ? 'Supabase接続エラー' : 
                         storageMode === 'supabase' ? 'Supabase選択中' : 'ローカル保存中'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">
                      <div>URL: {SUPABASE_URL}</div>
                      <div>Status: {connectionStatus === 'unknown' ? '未確認' : connectionStatus}</div>
                    </div>
                  </div>

                  <button
                    onClick={testSupabaseConnection}
                    className="w-full mt-3 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    データベース接続確認
                  </button>
                </div>

                {/* 環境変数情報 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">環境変数設定状況</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <div>✅ SUPABASE_URL: 設定済み</div>
                    <div>✅ SUPABASE_ANON_KEY: 設定済み</div>
                    <div className={aiStatus === 'available' ? 'text-green-800' : 'text-yellow-800'}>
                      {aiStatus === 'available' 
                        ? '✅ GEMINI_API_KEY: 設定済み（AI機能有効）' 
                        : '⚠️ GEMINI_API_KEY: 未設定（基本機能で動作）'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 公開設定ガイド */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center space-x-2 mb-4">
                <FileText className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900">本番公開ガイド</h2>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">
                    🚀 Vercel本番公開（推奨）
                  </h3>
                  <ul className="text-sm text-green-800 space-y-1">
                    <li>• GitHub連携で自動デプロイ</li>
                    <li>• 無料プラン利用可能</li>
                    <li>• 高速CDN配信</li>
                    <li>• 環境変数設定対応</li>
                  </ul>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-medium text-yellow-900 mb-2">
                    📋 公開前チェックリスト
                  </h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>☑️ Reactアプリ正常動作</li>
                    <li>☑️ Tailwind CSS適用確認</li>
                    <li>☑️ 基本機能動作確認</li>
                    <li>☑️ GitHubリポジトリ作成</li>
                    <li>☑️ Vercelデプロイ設定</li>
                    <li className={aiStatus === 'available' ? 'text-green-800' : ''}>
                      {aiStatus === 'available' ? '☑️' : '⬜'} AI環境変数設定
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">
                    🎯 次のステップ
                  </h3>
                  <div className="text-sm text-blue-800">
                    {aiStatus === 'available' 
                      ? '🎉 AI機能付き完全版として運用開始可能！さらなる機能拡張も検討できます。'
                      : 'ローカル環境での動作確認完了。AI機能追加でさらに高機能化可能！'
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 統計情報 */}
        <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center space-x-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">本日の統計</h2>
            {aiStatus === 'available' && (
              <span className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                <Sparkles className="h-3 w-3" />
                <span>AI分析対応</span>
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{histories.length}</div>
              <div className="text-sm text-gray-600">作業件数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {histories.reduce((sum, h) => sum + h.duration, 0)}
              </div>
              <div className="text-sm text-gray-600">総作業時間（分）</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(histories.map(h => h.client_name)).size}
              </div>
              <div className="text-sm text-gray-600">訪問客先数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {new Set(histories.map(h => h.work_type)).size}
              </div>
              <div className="text-sm text-gray-600">作業種別数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{dailyReports.length}</div>
              <div className="text-sm text-gray-600">作成済日報</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyReportSystem;
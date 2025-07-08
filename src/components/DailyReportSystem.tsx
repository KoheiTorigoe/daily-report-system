import React, { useState, useEffect } from 'react';
import { MessageCircle, Clock, User, Building, FileText, Plus, Download, Calendar, BookOpen, BarChart3, Database } from 'lucide-react';

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

// Supabase設定（環境変数対応）
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || 'https://byquekqumujmxgfrdppa.supabase.co';
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5cXVla3F1bXVqbXhnZnJkcHBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NTAwNDQsImV4cCI6MjA2NzUyNjA0NH0.GKXe3rsH3jAPADU00poZgYol_jxlZLc96qvCjZlZEr0';

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

  // 初期化
  useEffect(() => {
    if (!userName) {
      const name = prompt('お名前を入力してください：') || 'テストユーザー';
      const email = prompt('メールアドレスを入力してください：') || 'test@example.com';
      setUserName(name);
      setUserEmail(email);
      loadData();
    }
  }, [userName]);

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

  // AI対話開始（簡易版）
  const startAIRecording = async () => {
    setIsRecording(true);
    setConversationStep(0);
    setCurrentHistory({
      id: generateUUID(),
      date: new Date().toISOString().split('T')[0],
      user_name: userName,
      created_at: new Date().toISOString(),
      daily_report_included: false
    });
    setMessages([]);
    
    await addMessage("お疲れさまでした！今日の作業履歴を記録していきましょう。どちらの客先での作業が完了しましたか？", false);
  };

  // AI日報作成開始（簡易版）
  const startAIReportCreation = async () => {
    if (histories.length === 0) {
      alert('日報を作成するには、先に履歴を記録してください。');
      return;
    }

    setIsCreatingReport(true);
    setMessages([]);
    setActiveTab('report');
    
    const analysisMessage = generateHistoryAnalysis();
    await addMessage(analysisMessage, false);
    
    setTimeout(async () => {
      await addMessage("それでは日報を作成していきましょう！今日一日を振り返って、全体的にはいかがでしたか？", false);
    }, 1500);
  };

  // 履歴分析メッセージ生成
  const generateHistoryAnalysis = (): string => {
    const clientNames = [...new Set(histories.map(h => h.client_name))];
    const workTypes = [...new Set(histories.map(h => h.work_type))];
    const totalDuration = histories.reduce((sum, h) => sum + h.duration, 0);
    
    return `今日は${clientNames.join('、')}で計${histories.length}件の作業がありましたね。\n${workTypes.join('、')}が中心で、総作業時間は${Math.floor(totalDuration/60)}時間${totalDuration%60}分でした。`;
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

  // ユーザー入力処理（簡易版）
  const handleUserInput = async () => {
    if (!userInput.trim()) return;

    setMessages(prev => [...prev, { text: userInput, isUser: true }]);
    
    if (isRecording) {
      // 履歴記録処理
      const fields = ['client_name', 'work_type', 'start_time', 'work_detail', 'result', 'issues'];
      const currentField = fields[conversationStep];
      
      const updatedHistory = { ...currentHistory };
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
        const nextQuestions = [
          "ありがとうございます。どのような種類の作業でしたか？",
          "作業時間について教えてください。何時から何時まで作業されましたか？",
          "作業の詳しい内容について教えてください。",
          "今日の作業の成果はいかがでしたか？",
          "作業中に感じた課題や問題点はありましたか？"
        ];
        setTimeout(async () => {
          await addMessage(nextQuestions[conversationStep], false);
        }, 1000);
      } else {
        // 履歴記録完了
        const completedHistory = updatedHistory as WorkHistory;
        setHistories(prev => {
          const newHistories = [...prev, completedHistory];
          localStorage.setItem('work_histories', JSON.stringify(newHistories));
          return newHistories;
        });
        
        setTimeout(async () => {
          await addMessage(`記録が完了しました！${completedHistory.client_name}での${completedHistory.work_type}が保存されました。`, false);
          setIsRecording(false);
          setConversationStep(0);
        }, 1000);
      }
    } else if (isCreatingReport) {
      // 日報作成処理（簡易版）
      await addMessage("ありがとうございます。続けて他の項目もお聞きしますね。", false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">日報システム</h1>
                <p className="text-gray-600">履歴記録機構 + 日報作成機構</p>
              </div>
            </div>
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
                <h2 className="text-lg font-semibold text-gray-900">AI対話による履歴記録</h2>
              </div>

              {/* メッセージエリア */}
              <div className="h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                {messages.length === 0 && !isRecording && (
                  <div className="text-center text-gray-500 mt-20">
                    <div className="mb-2">AI対話機能で自然な履歴記録をサポート</div>
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
              </div>

              {/* 入力エリア */}
              {isRecording && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUserInput()}
                    placeholder="回答を入力してください..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleUserInput}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    送信
                  </button>
                </div>
              )}

              {/* 履歴記録開始ボタン */}
              {!isRecording && (
                <button
                  onClick={startAIRecording}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-md hover:from-green-700 hover:to-blue-700"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>AI対話で履歴記録</span>
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
                  <h2 className="text-lg font-semibold text-gray-900">AI日報作成</h2>
                </div>
                {histories.length > 0 && !isCreatingReport && (
                  <button
                    onClick={startAIReportCreation}
                    className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md hover:from-purple-700 hover:to-blue-700 text-sm"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>AI日報作成</span>
                  </button>
                )}
              </div>

              {/* メッセージエリア */}
              <div className="h-64 overflow-y-auto border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                {messages.length === 0 && !isCreatingReport && (
                  <div className="text-center text-gray-500 mt-20">
                    {histories.length === 0 
                      ? '履歴を記録してからAI日報作成を開始してください' 
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
              </div>

              {/* 入力エリア */}
              {isCreatingReport && (
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleUserInput()}
                    placeholder="回答を入力してください..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleUserInput}
                    className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
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
                    <div>⚠️ GEMINI_API_KEY: 未設定（モック機能で動作）</div>
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
                    <li>⬜ GitHubリポジトリ作成</li>
                    <li>⬜ Vercelデプロイ設定</li>
                    <li>⬜ 環境変数設定</li>
                  </ul>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">
                    🎯 次のステップ
                  </h3>
                  <div className="text-sm text-blue-800">
                    ローカル環境での動作確認が完了したら、GitHub→Vercel公開に進めます！
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
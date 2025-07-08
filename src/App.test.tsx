import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// モック環境変数
Object.defineProperty(window, 'prompt', {
  value: jest.fn().mockReturnValue('テストユーザー'),
  writable: true,
});

// Vercel環境向けテスト設定
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = {
    ...originalEnv,
    REACT_APP_SUPABASE_URL: 'https://test.supabase.co',
    REACT_APP_SUPABASE_ANON_KEY: 'test-key',
    REACT_APP_GEMINI_API_KEY: 'test-gemini-key'
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('日報システム', () => {
  test('メインタイトルが表示される', () => {
    render(<App />);
    
    // タイトルの確認（AI機能有効/無効両方に対応）
    const titleElement = screen.getByText(/日報システム/i);
    expect(titleElement).toBeInTheDocument();
  });

  test('タブナビゲーションが表示される', () => {
    render(<App />);
    
    // 主要タブの確認
    expect(screen.getByText('履歴記録')).toBeInTheDocument();
    expect(screen.getByText('日報作成')).toBeInTheDocument();
    expect(screen.getByText('公開設定')).toBeInTheDocument();
  });

  test('統計情報セクションが表示される', () => {
    render(<App />);
    
    // 統計情報の確認
    expect(screen.getByText('本日の統計')).toBeInTheDocument();
    expect(screen.getByText('作業件数')).toBeInTheDocument();
    expect(screen.getByText('総作業時間（分）')).toBeInTheDocument();
  });

  test('AI機能の状態表示', () => {
    render(<App />);
    
    // AI状態の確認（有効/無効どちらかが表示されることを確認）
    const aiStatus = screen.getByText(/AI|Gemini/i);
    expect(aiStatus).toBeInTheDocument();
  });
});

// React Testing Library用のカスタムマッチャー
expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null;
    return {
      message: () => pass 
        ? `要素が見つかりました` 
        : `要素が見つかりませんでした`,
      pass,
    };
  },
});
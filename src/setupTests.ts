// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// 環境変数のモック
process.env.REACT_APP_SUPABASE_URL = 'https://test.supabase.co';
process.env.REACT_APP_SUPABASE_ANON_KEY = 'test-key';
process.env.REACT_APP_GEMINI_API_KEY = 'test-gemini-key';

// グローバルなモック設定
global.fetch = jest.fn();
global.prompt = jest.fn(() => 'テストユーザー');
global.alert = jest.fn();

// コンソール警告の抑制（テスト環境用）
const originalWarn = console.warn;
beforeAll(() => {
  console.warn = (...args: any[]) => {
    if (
      typeof args[0] === 'string' && 
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
});
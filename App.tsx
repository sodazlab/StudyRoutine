import { useEffect, useState, useCallback } from 'react';
import { Layout } from './components/ui/Layout';
import { ChildDashboard } from './components/ChildDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { getUsers, getParentPin, saveSupabaseConfig, resetSupabaseConfig, isSupabaseConfigured } from './services/supabase';
import { User } from './types';
import { Modal } from './components/ui/Modal';

type ViewState = 'connecting' | 'config' | 'setup' | 'login' | 'child' | 'parent';

function App() {
  const [view, setView] = useState<ViewState>('connecting');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLongLoading, setIsLongLoading] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [inputPin, setInputPin] = useState("");
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");

  const startConnectionCheck = useCallback(async () => {
    // 1. Check for URL parameters first (Magic Link)
    const params = new URLSearchParams(window.location.search);
    const u = params.get('u');
    const k = params.get('k');
    
    if (u && k) {
      try {
        saveSupabaseConfig(u, k);
        // Clear query params for security and clean URL
        window.history.replaceState({}, document.title, window.location.origin);
      } catch (e) {
        console.error("Magic link config failed", e);
      }
    }

    if (!isSupabaseConfigured()) {
      setView('config');
      return;
    }

    setIsLongLoading(false);
    setError(null);
    setView('connecting');

    const timer = setTimeout(() => {
      setIsLongLoading(true);
    }, 10000);

    try {
      const fetchedUsers = await getUsers();
      clearTimeout(timer);
      setUsers(fetchedUsers);
      if (fetchedUsers.length === 0) {
        setView('setup');
      } else {
        setView('login');
      }
    } catch (e: any) {
      clearTimeout(timer);
      console.error("App Init Error Catch:", e);
      
      if (e.message === "TABLE_NOT_FOUND") {
         setError("DATABASE_SETUP_REQUIRED");
      } else {
         setError(e.message || "서버 연결에 실패했습니다.");
      }
      setView('config');
    }
  }, []);

  useEffect(() => {
    startConnectionCheck();
  }, [startConnectionCheck]);

  const handleConfigSubmit = async () => {
    try {
      saveSupabaseConfig(supabaseUrl, supabaseKey);
      await startConnectionCheck();
    } catch (e) {
      alert("올바르지 않은 정보입니다. URL과 Key를 확인해주세요.");
    }
  };

  const handleManualConnect = () => {
    setView('config');
    setError("연결 시간이 초과되었습니다.");
  };

  const handleUserSelect = (user: User) => {
    setCurrentUser(user);
    setView('child');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView('login');
  };

  const handleParentAccess = () => {
    setPinModalOpen(true);
    setInputPin("");
  };

  const verifyPin = async () => {
    try {
      const correctPin = await getParentPin();
      if (inputPin === correctPin) {
        setPinModalOpen(false);
        setView('parent');
      } else {
        alert("비밀번호가 틀렸습니다.");
        setInputPin("");
      }
    } catch (e) {
      alert("비밀번호 확인 중 오류가 발생했습니다.");
    }
  };

  if (view === 'connecting') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-80 text-center space-y-6">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-500 border-t-transparent"></div>
          <h2 className="text-2xl font-bold text-gray-800">서버에 연결하고 있어요...</h2>
          {isLongLoading && (
            <button onClick={handleManualConnect} className="text-indigo-600 font-bold underline">설정 화면으로 가기</button>
          )}
        </div>
      </Layout>
    );
  }

  if (view === 'config') {
    return (
      <Layout>
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100 w-full">
          <div className="text-center mb-6">
            <span className="text-4xl">⚡</span>
            <h1 className="text-2xl font-bold text-gray-900">Supabase 연결</h1>
          </div>

          {error === "DATABASE_SETUP_REQUIRED" ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 text-sm text-amber-800">
              <h3 className="font-bold mb-2">🚨 테이블이 없습니다!</h3>
              <p className="mb-3">수파베이스 프로젝트의 <strong>SQL Editor</strong>에서 아래 쿼리를 복사해서 실행(Run)해 주세요.</p>
              <pre className="bg-white/50 p-3 rounded-lg text-[10px] overflow-x-auto border border-amber-300 font-mono mb-3">
{`CREATE TABLE users (id uuid primary key default gen_random_uuid(), name text, avatar text, created_at timestamptz default now());
CREATE TABLE tasks (id uuid primary key default gen_random_uuid(), child_id uuid references users(id) on delete cascade, title text, day_of_week int, created_at timestamptz default now());
CREATE TABLE records (id uuid primary key default gen_random_uuid(), child_id uuid references users(id) on delete cascade, task_id uuid references tasks(id) on delete cascade, status text, reason text, date date, created_at timestamptz default now());
CREATE TABLE settings (id text primary key, parent_pin text, created_at timestamptz default now());`}
              </pre>
              <button onClick={() => startConnectionCheck()} className="w-full bg-amber-600 text-white py-2 rounded-xl font-bold">SQL 실행 후 다시 시도</button>
            </div>
          ) : error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold mb-4 text-center border border-red-100">{error}</div>
          )}
          
          <div className="space-y-4">
            <input type="text" className="w-full p-3 border rounded-xl text-gray-900 bg-gray-50" placeholder='Project URL' value={supabaseUrl} onChange={(e) => setSupabaseUrl(e.target.value)} />
            <input type="password" className="w-full p-3 border rounded-xl text-gray-900 bg-gray-50" placeholder='Anon Key' value={supabaseKey} onChange={(e) => setSupabaseKey(e.target.value)} />
            <button onClick={handleConfigSubmit} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl">연결하기</button>
            <button onClick={resetSupabaseConfig} className="w-full text-xs text-gray-400 underline">설정 초기화</button>
          </div>
        </div>
      </Layout>
    );
  }

  if (view === 'setup') {
    return (
      <Layout>
        <ParentDashboard onBack={() => window.location.reload()} />
      </Layout>
    );
  }

  if (view === 'login') {
    return (
      <Layout>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">누구인가요? 🤔</h1>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {users.map(user => (
            <button key={user.id} onClick={() => handleUserSelect(user)} className="bg-white p-6 rounded-3xl shadow-md flex flex-col items-center border border-gray-100">
              <span className="text-6xl mb-2">{user.avatar}</span>
              <span className="font-bold text-xl text-gray-800">{user.name}</span>
            </button>
          ))}
        </div>
        <div className="mt-8 text-center">
          <button onClick={handleParentAccess} className="text-sm font-bold text-gray-500 bg-white/50 border px-5 py-2.5 rounded-full hover:bg-white transition-all">🔒 부모님 설정</button>
        </div>
        <Modal isOpen={pinModalOpen} onClose={() => setPinModalOpen(false)} title="부모님 확인">
           <div className="space-y-4">
             <input type="password" inputMode="numeric" maxLength={4} value={inputPin} onChange={(e) => setInputPin(e.target.value)} className="w-full text-center text-2xl p-3 border rounded-xl text-gray-900" autoFocus />
             <button onClick={verifyPin} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl">확인</button>
           </div>
        </Modal>
      </Layout>
    );
  }

  if (view === 'child' && currentUser) {
    return <Layout><ChildDashboard currentUser={currentUser} onLogout={handleLogout} /></Layout>;
  }

  if (view === 'parent') {
    return <Layout><ParentDashboard onBack={() => setView('login')} /></Layout>;
  }

  return null;
}

export default App;
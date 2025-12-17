import { useEffect, useState } from 'react';
import { Layout } from './components/ui/Layout';
import { ChildDashboard } from './components/ChildDashboard';
import { ParentDashboard } from './components/ParentDashboard';
import { getUsers, getParentPin, saveSupabaseConfig, resetSupabaseConfig, isSupabaseConfigured } from './services/supabase';
import { User } from './types';
import { Modal } from './components/ui/Modal';

// Simple view state machine
type ViewState = 'connecting' | 'config' | 'setup' | 'login' | 'child' | 'parent';

function App() {
  const [view, setView] = useState<ViewState>('connecting');
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Timeout State for Connecting View
  const [isLongLoading, setIsLongLoading] = useState(false);

  // Pin State
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [inputPin, setInputPin] = useState("");

  // Config State
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");

  useEffect(() => {
    let timer: any;

    const init = async () => {
      // 1. If not configured at all, go straight to config
      if (!isSupabaseConfigured()) {
        setView('config');
        return;
      }

      // 2. Start timer for long loading (10s)
      timer = setTimeout(() => {
        setIsLongLoading(true);
      }, 10000);

      // 3. Try to fetch users to verify connection
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
        console.error("App Init Error:", e);
        
        let msg = "서버 연결에 실패했습니다. 설정을 확인해주세요.";
        
        if (e.message === "TABLE_NOT_FOUND") {
           msg = "⚠️ 데이터베이스 테이블이 없습니다.\nSupabase SQL Editor에서 테이블 생성 쿼리를 실행해주세요.";
        } else if (e.message) {
           msg = `오류: ${e.message}`;
        }
        
        setError(msg);
        setView('config');
      }
    };

    init();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleConfigSubmit = () => {
    try {
      saveSupabaseConfig(supabaseUrl, supabaseKey);
    } catch (e) {
      alert("올바르지 않은 정보입니다. URL과 Key를 확인해주세요.");
    }
  };

  const handleManualConnect = () => {
    setView('config');
    setError("연결 시간이 초과되었습니다. 설정을 다시 확인해보세요.");
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
      console.error(e);
      alert("비밀번호 확인 중 오류가 발생했습니다.");
    }
  };

  // Connecting View
  if (view === 'connecting') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-80 text-center space-y-6">
          <div className="relative">
             <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-100 border-t-indigo-500"></div>
             <div className="absolute inset-0 flex items-center justify-center text-xl">
               ⚡
             </div>
          </div>
          
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {isLongLoading ? "연결이 지연되고 있어요 😓" : "서버에 연결하고 있어요..."}
            </h2>
            <p className="text-gray-500 font-medium text-sm">
              {isLongLoading ? "네트워크 상태를 확인하거나 설정을 다시 해보세요." : "Supabase와 통신 중입니다!"}
            </p>
          </div>

          {isLongLoading && (
            <button 
              onClick={handleManualConnect}
              className="bg-white border border-gray-300 text-gray-700 font-bold py-3 px-6 rounded-xl shadow-sm hover:bg-gray-50 hover:text-indigo-600 transition-all animate-pulse"
            >
              🛠️ 서버 설정화면으로 이동
            </button>
          )}
        </div>
      </Layout>
    );
  }

  // Config / Error View
  if (view === 'config') {
    return (
      <Layout>
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-gray-100 w-full animate-[scale-in_0.3s_ease-out]">
          <div className="text-center mb-6">
            <span className="text-4xl mb-2 block">⚡</span>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Supabase 연결</h1>
            <p className="text-gray-500 text-sm">
              Supabase 프로젝트 대시보드에서<br/>
              URL과 Anon Key를 복사해오세요.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold mb-4 text-center whitespace-pre-line border border-red-100">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Project URL</label>
              <input 
                type="text"
                className="w-full p-3 border border-gray-300 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder='https://your-project.supabase.co'
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Anon / Public Key</label>
              <input 
                type="password"
                className="w-full p-3 border border-gray-300 rounded-xl text-sm bg-gray-50 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                placeholder='eyJh...'
                value={supabaseKey}
                onChange={(e) => setSupabaseKey(e.target.value)}
              />
            </div>
            
            <button 
              onClick={handleConfigSubmit}
              disabled={!supabaseUrl.trim() || !supabaseKey.trim()}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              연결하기
            </button>

            <div className="flex justify-center mt-2">
               <button 
                 onClick={() => window.location.reload()}
                 className="text-xs text-gray-400 hover:text-green-600 underline"
               >
                 새로고침
               </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl text-xs text-gray-500 leading-relaxed border border-gray-100">
              <strong>💡 설정 찾는 법:</strong><br/>
              Supabase Dashboard &gt; Project Settings &gt; API 섹션에서 URL과 <code>anon public</code> 키를 찾을 수 있습니다.
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Setup View (No users found)
  if (view === 'setup') {
    return (
      <Layout>
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">환영합니다! 👋</h1>
          <p className="text-gray-500 font-medium">먼저 아이들을 등록하고 루틴을 만들어주세요.</p>
        </div>
        <ParentDashboard onBack={() => window.location.reload()} />
      </Layout>
    );
  }

  // Login View
  if (view === 'login') {
    return (
      <Layout>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">누구인가요? 🤔</h1>
          <p className="text-gray-500 font-medium">자신의 캐릭터를 선택해주세요!</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {users.map(user => (
            <button
              key={user.id}
              onClick={() => handleUserSelect(user)}
              className="bg-white p-6 rounded-3xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col items-center gap-2 border border-gray-100"
            >
              <span className="text-6xl mb-2">{user.avatar}</span>
              <span className="font-bold text-xl text-gray-800">{user.name}</span>
            </button>
          ))}
        </div>

        <div className="mt-12 text-center flex flex-col gap-3">
          <button 
            onClick={handleParentAccess}
            className="text-sm font-bold text-gray-500 bg-white/50 border border-white px-5 py-2.5 rounded-full hover:bg-white hover:text-indigo-600 hover:shadow-sm transition-all"
          >
            🔒 부모님 설정 바로가기
          </button>
          <button 
            onClick={() => {
              if(confirm("정말 서버 연결을 끊고 설정을 초기화하시겠습니까?")) {
                resetSupabaseConfig();
              }
            }}
            className="text-xs text-gray-400 hover:text-red-500 underline"
          >
            서버 재설정
          </button>
        </div>

        <Modal 
          isOpen={pinModalOpen} 
          onClose={() => setPinModalOpen(false)}
          title="부모님 확인"
        >
           <div className="space-y-4">
            <p className="text-center text-gray-600 text-sm font-medium">비밀번호를 입력해주세요.</p>
             <input 
               type="password" 
               inputMode="numeric"
               maxLength={4}
               value={inputPin} 
               onChange={(e) => setInputPin(e.target.value)}
               className="w-full text-center text-2xl tracking-widest p-3 border border-gray-300 rounded-xl bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
               autoFocus
             />
             <button 
               onClick={verifyPin}
               className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 shadow-md transition-colors"
             >
               확인
             </button>
           </div>
        </Modal>
      </Layout>
    );
  }

  // Child Dashboard
  if (view === 'child' && currentUser) {
    return (
      <Layout>
        <ChildDashboard currentUser={currentUser} onLogout={handleLogout} />
      </Layout>
    );
  }

  // Parent Dashboard
  if (view === 'parent') {
    return (
      <Layout>
        <ParentDashboard onBack={() => setView('login')} />
      </Layout>
    );
  }

  return null;
}

export default App;
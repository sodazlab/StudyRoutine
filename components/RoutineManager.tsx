import React, { useEffect, useState } from 'react';
import { User, Task } from '../types';
import { getUsers, addUser, getTasks, addTask, deleteTask, copyRoutine, setParentPin } from '../services/supabase';
import { AVATARS, DAYS_OF_WEEK } from '../constants';
import { Modal } from './ui/Modal';

export const RoutineManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'users' | 'routine' | 'settings'>('users');

  // Add User State
  const [newUserName, setNewUserName] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  // Routine State
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState<number>(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isCopying, setIsCopying] = useState(false);

  // Copy State
  const [copyTargetDay, setCopyTargetDay] = useState<number>((new Date().getDay() + 1) % 7);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Settings State
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (users.length > 0 && !selectedChildId) {
      setSelectedChildId(users[0].id);
    }
  }, [users, selectedChildId]);

  useEffect(() => {
    if (selectedChildId) {
      loadTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildId, selectedDay]);

  const loadUsers = async () => {
    const data = await getUsers();
    setUsers(data);
  };

  const loadTasks = async () => {
    const data = await getTasks(selectedChildId, selectedDay);
    setTasks(data);
  };

  const handleAddUser = async () => {
    if (!newUserName) return;
    await addUser(newUserName, selectedAvatar);
    setNewUserName("");
    loadUsers();
  };

  const handleAddTask = async () => {
    if (!newTaskTitle) return;
    await addTask(selectedChildId, newTaskTitle, selectedDay);
    setNewTaskTitle("");
    loadTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    loadTasks();
  };

  const initiateCopyRoutine = () => {
    if (copyTargetDay === selectedDay) {
      alert("같은 요일로는 복사할 수 없습니다.");
      return;
    }
    if (tasks.length === 0) {
      alert("복사할 할 일이 없습니다. 먼저 할 일을 등록해주세요.");
      return;
    }
    setConfirmModalOpen(true);
  };

  const executeCopyRoutine = async () => {
    setConfirmModalOpen(false);
    setIsCopying(true);
    try {
      await copyRoutine(selectedChildId, selectedDay, copyTargetDay);
      alert("복사가 완료되었습니다! 확인을 위해 해당 요일로 이동합니다.");
      setSelectedDay(copyTargetDay); 
    } catch (e) {
      console.error(e);
      alert("복사 중 오류가 발생했습니다.");
    } finally {
      setIsCopying(false);
    }
  };

  const handleChangePin = async () => {
    if (newPin.length !== 4 || isNaN(Number(newPin))) {
      alert("비밀번호는 4자리 숫자여야 합니다.");
      return;
    }
    if (newPin !== confirmPin) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    try {
      await setParentPin(newPin);
      alert("비밀번호가 변경되었습니다.");
      setNewPin("");
      setConfirmPin("");
    } catch (e) {
      console.error(e);
      alert("비밀번호 변경 중 오류가 발생했습니다.");
    }
  };

  const inputClass = "w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white placeholder-gray-400 font-medium";
  const selectClass = "p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white font-medium";

  return (
    <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-gray-100">
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        <button 
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-4 font-bold text-sm sm:text-base transition-colors ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}
        >
          아이들 관리
        </button>
        <button 
          onClick={() => setActiveTab('routine')}
          className={`flex-1 py-4 font-bold text-sm sm:text-base transition-colors ${activeTab === 'routine' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}
        >
          루틴 설정
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-4 font-bold text-sm sm:text-base transition-colors ${activeTab === 'settings' ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-500' : 'text-gray-400 hover:text-gray-600'}`}
        >
          설정
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">새로운 아이 등록</label>
              <input 
                type="text" 
                placeholder="이름 (예: 지수)" 
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className={inputClass}
              />
              
              <div className="my-4">
                <p className="text-xs font-bold text-gray-500 mb-2">아바타 선택</p>
                <div className="flex gap-3 overflow-x-auto p-2 border border-gray-100 rounded-xl bg-gray-50/50">
                  {AVATARS.map(avatar => (
                    <button
                      key={avatar}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`shrink-0 w-14 h-14 text-3xl rounded-2xl flex items-center justify-center transition-all border ${
                        selectedAvatar === avatar 
                          ? 'bg-indigo-100 border-indigo-500 scale-110 shadow-md ring-2 ring-indigo-200 ring-offset-1 z-10' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleAddUser}
                className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-md active:scale-95"
              >
                등록하기
              </button>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="font-bold text-gray-700 mb-3">등록된 아이들</h3>
              <div className="flex flex-wrap gap-3">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-4 py-2 rounded-full">
                    <span className="text-xl">{u.avatar}</span>
                    <span className="font-bold text-gray-800">{u.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routine' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                 <label className="text-xs font-bold text-gray-500">아이 선택</label>
                 <select 
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className={selectClass}
                >
                  {users.map(u => <option key={u.id} value={u.id}>{u.avatar} {u.name}</option>)}
                </select>
              </div>
              
              <div className="flex flex-col gap-1">
                 <label className="text-xs font-bold text-gray-500">요일 선택</label>
                 <select 
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(Number(e.target.value))}
                  className={selectClass}
                >
                  {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <input 
                type="text" 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="할 일 입력 (예: 양치하기)"
                className={inputClass}
              />
              <button 
                onClick={handleAddTask}
                className="bg-indigo-600 text-white w-14 rounded-xl flex items-center justify-center font-bold text-2xl hover:bg-indigo-700 shadow-md transition-colors"
              >
                +
              </button>
            </div>

            <div className="space-y-3">
              {tasks.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                  <p className="text-gray-400 font-medium">등록된 할 일이 없어요.</p>
                </div>
              )}
              {tasks.map(task => (
                <div key={task.id} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-4 rounded-xl hover:bg-white hover:shadow-sm transition-all">
                  <span className="font-bold text-gray-700">{task.title}</span>
                  <button 
                    onClick={() => handleDeleteTask(task.id)}
                    className="text-red-400 hover:text-red-600 text-sm font-medium px-2 py-1"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 pt-6 mt-2">
              <h4 className="font-bold text-sm text-gray-600 mb-3 flex items-center gap-2">
                ⚡ 루틴 복사하기
              </h4>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-wrap items-center gap-3">
                <span className="text-sm font-bold text-gray-600">현재 요일을</span>
                <select 
                  value={copyTargetDay}
                  onChange={(e) => setCopyTargetDay(Number(e.target.value))}
                  className="p-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
                <span className="text-sm font-bold text-gray-600">로</span>
                <button 
                  onClick={initiateCopyRoutine}
                  disabled={isCopying}
                  className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-50 ml-auto disabled:opacity-50 shadow-sm transition-colors"
                >
                  {isCopying ? '복사중...' : '복사하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100">
              <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                🔐 부모님 페이지 비밀번호 변경
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-indigo-700 mb-1">새 비밀번호 (4자리)</label>
                  <input 
                    type="password" 
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className={inputClass}
                    placeholder="숫자 4자리 입력"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-indigo-700 mb-1">비밀번호 확인</label>
                  <input 
                    type="password" 
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    className={inputClass}
                    placeholder="한 번 더 입력"
                    inputMode="numeric"
                  />
                </div>
                <button 
                  onClick={handleChangePin}
                  className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-md mt-2"
                >
                  비밀번호 변경하기
                </button>
              </div>
              <p className="text-xs text-indigo-400 mt-4 text-center font-medium">
                * 초기 비밀번호는 0000 입니다.
              </p>
            </div>
          </div>
        )}

        <Modal 
          isOpen={confirmModalOpen} 
          onClose={() => setConfirmModalOpen(false)} 
          title="루틴 복사 확인"
        >
          <div className="space-y-5">
            <p className="text-gray-700 font-medium leading-relaxed">
              <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{DAYS_OF_WEEK[selectedDay]}</span>의 루틴을 <br/>
              <span className="font-bold text-pink-500 bg-pink-50 px-2 py-0.5 rounded">{DAYS_OF_WEEK[copyTargetDay]}</span>(으)로 복사하시겠습니까?
            </p>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-red-600 font-bold leading-tight">
                주의: {DAYS_OF_WEEK[copyTargetDay]}에 이미 등록된 할 일이 있다면 모두 삭제되고 덮어씌워집니다.
              </p>
            </div>
            <button 
              onClick={executeCopyRoutine}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-xl font-bold shadow-md active:scale-95 transition-transform"
            >
              네, 복사할게요!
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
};
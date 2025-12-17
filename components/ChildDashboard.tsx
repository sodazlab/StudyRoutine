import React, { useEffect, useState } from 'react';
import { User, Task, Record } from '../types';
import { getTasks, getTodayRecords, addRecord, deleteRecord } from '../services/supabase';
import { DAYS_OF_WEEK, PASS_REASONS } from '../constants';
import { Modal } from './ui/Modal';
import confetti from 'canvas-confetti';

interface ChildDashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export const ChildDashboard: React.FC<ChildDashboardProps> = ({ currentUser, onLogout }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pass Modal State
  const [passModalOpen, setPassModalOpen] = useState(false);
  const [selectedTaskForPass, setSelectedTaskForPass] = useState<Task | null>(null);
  const [passReason, setPassReason] = useState("");

  const today = new Date();
  const dateString = today.toISOString().split('T')[0];
  const dayOfWeek = today.getDay();

  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedTasks, fetchedRecords] = await Promise.all([
        getTasks(currentUser.id, dayOfWeek),
        getTodayRecords(currentUser.id, dateString)
      ]);
      setTasks(fetchedTasks);
      setRecords(fetchedRecords);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Derived State
  const progress = tasks.length > 0 
    ? Math.round((records.length / tasks.length) * 100) 
    : 0;

  useEffect(() => {
    if (tasks.length > 0 && records.length === tasks.length) {
       confetti({
         particleCount: 150,
         spread: 70,
         origin: { y: 0.6 }
       });
    }
  }, [records.length, tasks.length]);

  const handleCheck = async (task: Task) => {
    // Check is handled in onClick of the button.
    // If record doesn't exist, we add it.
    const newRecord: Omit<Record, 'id'> = {
      childId: currentUser.id,
      taskId: task.id,
      status: 'done',
      date: dateString
    };
    
    const savedRecord = await addRecord(newRecord);
    setRecords([...records, savedRecord]);
  };

  const handleUndo = async (record: Record) => {
    await deleteRecord(record.id);
    setRecords(records.filter(r => r.id !== record.id));
  };

  const openPassModal = (task: Task) => {
    setSelectedTaskForPass(task);
    setPassReason("");
    setPassModalOpen(true);
  };

  const handlePassSubmit = async () => {
    if (!selectedTaskForPass || !passReason) return;

    const newRecord: Omit<Record, 'id'> = {
      childId: currentUser.id,
      taskId: selectedTaskForPass.id,
      status: 'pass',
      reason: passReason,
      date: dateString
    };

    const savedRecord = await addRecord(newRecord);
    setRecords([...records, savedRecord]);
    setPassModalOpen(false);
    setSelectedTaskForPass(null);
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-3xl p-5 shadow-lg border border-white/50">
        <div className="flex items-center gap-4">
          <div className="text-5xl bg-indigo-50 p-2 rounded-2xl">{currentUser.avatar}</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentUser.name}</h1>
            <p className="text-gray-500 font-medium text-sm">{dateString} <span className="text-indigo-600 font-bold">({DAYS_OF_WEEK[dayOfWeek]})</span></p>
          </div>
        </div>
        <button onClick={onLogout} className="text-sm font-bold text-gray-400 underline hover:text-gray-600">
          나가기
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-3xl p-6 shadow-lg border border-white/50">
        <div className="flex justify-between mb-3">
          <span className="font-bold text-gray-700">오늘의 달성률</span>
          <span className="font-bold text-indigo-600 text-lg">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-5 overflow-hidden shadow-inner">
          <div 
            className="bg-gradient-to-r from-indigo-500 to-pink-500 h-5 rounded-full transition-all duration-700 ease-out shadow-sm"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-gray-500 font-medium">로딩 중...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-12 bg-white/60 rounded-3xl text-gray-500 font-medium border-2 border-dashed border-gray-300">
            오늘은 할 일이 없어요! 신난다! 🎉
          </div>
        ) : (
          tasks.map(task => {
            const record = records.find(r => r.taskId === task.id);
            const isDone = record?.status === 'done';
            const isPass = record?.status === 'pass';

            return (
              <div key={task.id} className={`bg-white rounded-3xl p-5 shadow-md flex items-center justify-between transition-all border ${record ? 'bg-gray-50 border-gray-100' : 'border-gray-100 hover:border-indigo-200 hover:shadow-lg'}`}>
                <div className="flex items-center gap-4">
                  {/* Custom Checkbox */}
                  <button 
                    onClick={() => record ? handleUndo(record) : handleCheck(task)}
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${
                      isDone ? 'bg-green-500 border-green-500 text-white shadow-md scale-105' :
                      isPass ? 'bg-gray-200 border-gray-200 text-gray-500' :
                      'border-gray-200 bg-white text-gray-300 hover:border-green-400 hover:text-green-200'
                    }`}
                  >
                    {isDone && <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    {isPass && <span className="text-xs font-bold">PASS</span>}
                    {!record && <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  
                  <div>
                    <h3 className={`font-bold text-lg ${record ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {task.title}
                    </h3>
                    {isPass && <p className="text-xs font-bold text-pink-400 mt-1">{record?.reason}</p>}
                  </div>
                </div>

                {!record && (
                  <button 
                    onClick={() => openPassModal(task)}
                    className="px-4 py-2 text-sm font-bold text-gray-500 bg-gray-100 rounded-xl hover:bg-gray-200 hover:text-gray-700 transition-colors"
                  >
                    PASS
                  </button>
                )}
                {record && (
                    <button 
                        onClick={() => handleUndo(record)}
                        className="text-xs font-bold text-gray-400 hover:text-red-500 underline px-2"
                    >
                        취소
                    </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pass Reason Modal */}
      <Modal 
        isOpen={passModalOpen} 
        onClose={() => setPassModalOpen(false)}
        title="왜 못 했나요? 🥺"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PASS_REASONS.map(reason => (
              <button
                key={reason}
                onClick={() => setPassReason(reason)}
                className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all ${
                  passReason === reason 
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={passReason}
            onChange={(e) => setPassReason(e.target.value)}
            placeholder="직접 입력하기..."
            className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-white font-medium placeholder-gray-400"
          />
          <button
            onClick={handlePassSubmit}
            disabled={!passReason}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-xl font-bold shadow-md disabled:opacity-50 active:scale-95 transition-transform"
          >
            확인 (PASS 하기)
          </button>
        </div>
      </Modal>
    </div>
  );
};
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { User } from '../types';
import { getWeeklyRecords, getUsers, getTasks } from '../services/supabase';
import { DAYS_OF_WEEK } from '../constants';

interface DayDetail {
  date: string;
  dayLabel: string;
  tasks: {
    title: string;
    status: 'done' | 'pass' | 'none';
    reason?: string;
  }[];
}

export const WeeklyStats: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [detailedLogs, setDetailedLogs] = useState<DayDetail[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getUsers().then(fetchedUsers => {
      setUsers(fetchedUsers);
      if (fetchedUsers.length > 0) {
        setSelectedChildId(fetchedUsers[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedChildId) return;
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedChildId]);

  const fetchStats = async () => {
    setLoading(true);
    // 1. Determine Week Range (Mon - Sun)
    const current = new Date(selectedDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); 
    
    const monday = new Date(current);
    monday.setDate(diff);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startStr = monday.toISOString().split('T')[0];
    const endStr = sunday.toISOString().split('T')[0];

    try {
      // 2. Fetch Data
      const [allRecords, allTasks] = await Promise.all([
        getWeeklyRecords(startStr, endStr),
        getTasks(selectedChildId)
      ]);

      const childRecords = allRecords.filter(r => r.childId === selectedChildId);

      // 3. Process Data for Chart and Details
      const weekOrder = [1, 2, 3, 4, 5, 6, 0];
      const dayLabelsShort = ["월", "화", "수", "목", "금", "토", "일"];

      const stats = weekOrder.map((dayIndex, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];

        const dayTasks = allTasks.filter(t => t.dayOfWeek === dayIndex);
        const doneRecords = childRecords.filter(r => r.date === dateStr && r.status === 'done');
        
        const percentage = dayTasks.length > 0 ? Math.round((doneRecords.length / dayTasks.length) * 100) : 0;

        return {
          name: dayLabelsShort[i],
          percentage,
          done: doneRecords.length,
          total: dayTasks.length,
          date: dateStr
        };
      });

      // 4. Detailed Log Processing
      const logs = weekOrder.map((dayIndex, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        const dayTasks = allTasks.filter(t => t.dayOfWeek === dayIndex);
        const dayRecords = childRecords.filter(r => r.date === dateStr);

        return {
          date: dateStr,
          dayLabel: DAYS_OF_WEEK[dayIndex],
          tasks: dayTasks.map(task => {
            const record = dayRecords.find(r => r.taskId === task.id);
            return {
              title: task.title,
              status: (record?.status || 'none') as 'done' | 'pass' | 'none',
              reason: record?.reason
            };
          })
        };
      });

      setChartData(stats);
      setDetailedLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500 ml-1">아이 선택</label>
          <select 
            value={selectedChildId}
            onChange={(e) => setSelectedChildId(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-gray-50 font-bold appearance-none cursor-pointer"
          >
            {users.map(u => <option key={u.id} value={u.id}>{u.avatar} {u.name}</option>)}
          </select>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <label className="text-xs font-bold text-gray-500 ml-1">날짜 선택 (주간 이동)</label>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-gray-900 bg-gray-50 font-bold cursor-pointer"
          />
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <span className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600">📊</span> 주간 달성률
        </h3>
        <div className="h-64 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center text-gray-400 font-medium">데이터 로딩 중...</div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#6b7280', fontSize: 13, fontWeight: 700 }} 
                  dy={10}
                />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'Noto Sans KR' }}
                  itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                  formatter={(value: any, _name: any, props: any) => [`${value}% (${props.payload.done}/${props.payload.total}개)`, '달성률']}
                />
                <Bar dataKey="percentage" radius={[8, 8, 8, 8]} barSize={32}>
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index >= 5 ? '#f472b6' : '#6366f1'} /> 
                  ))}
                  <LabelList 
                    dataKey="percentage" 
                    position="top" 
                    formatter={(val: number) => val > 0 ? `${val}%` : ''} 
                    style={{ fill: '#374151', fontWeight: 'bold', fontSize: '11px' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">내역이 없습니다.</div>
          )}
        </div>
      </div>

      {/* Detailed Activity Log */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-800 ml-2 flex items-center gap-2">
          <span className="p-1.5 bg-amber-100 rounded-lg text-amber-600">📝</span> 주간 활동 상세 (PASS 사유)
        </h3>
        
        <div className="space-y-4">
          {detailedLogs.map((day, idx) => {
            const hasTasks = day.tasks.length > 0;
            const isToday = day.date === new Date().toISOString().split('T')[0];

            if (!hasTasks) return null;

            return (
              <div key={idx} className={`bg-white rounded-3xl border ${isToday ? 'border-indigo-300 ring-1 ring-indigo-100 shadow-md' : 'border-gray-100 shadow-sm'} overflow-hidden`}>
                <div className={`px-5 py-3 flex justify-between items-center ${isToday ? 'bg-indigo-50' : 'bg-gray-50'}`}>
                  <span className="font-bold text-gray-700">{day.dayLabel} <span className="text-xs font-normal text-gray-400 ml-1">{day.date}</span></span>
                  {isToday && <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-bold">TODAY</span>}
                </div>
                <div className="p-4 space-y-3">
                  {day.tasks.map((task, tIdx) => (
                    <div key={tIdx} className="flex items-start gap-3">
                      <div className={`mt-1.5 shrink-0 w-2.5 h-2.5 rounded-full ${
                        task.status === 'done' ? 'bg-green-500' : 
                        task.status === 'pass' ? 'bg-amber-500' : 'bg-gray-200'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${task.status === 'none' ? 'text-gray-400' : 'text-gray-700'}`}>{task.title}</span>
                          {task.status === 'done' && <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">완료</span>}
                          {task.status === 'pass' && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">PASS</span>}
                        </div>
                        {task.status === 'pass' && task.reason && (
                          <div className="mt-2 bg-amber-50 border border-amber-100 p-3 rounded-2xl relative">
                            <div className="absolute -top-1.5 left-4 w-3 h-3 bg-amber-50 border-t border-l border-amber-100 rotate-45"></div>
                            <p className="text-xs font-bold text-amber-800 leading-relaxed">
                              사유: {task.reason}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
        <p className="text-xs text-center text-indigo-500 font-bold leading-relaxed">
          💡 아이들이 입력한 PASS 사유를 확인하고 따뜻한 대화를 나눠보세요!
        </p>
      </div>
    </div>
  );
};
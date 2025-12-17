import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts';
import { User } from '../types';
import { getWeeklyRecords, getUsers, getTasks } from '../services/firebase';

export const WeeklyStats: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedChildId, setSelectedChildId] = useState<string>('');
  const [data, setData] = useState<any[]>([]);
  const [users, setUsers] = useState<User[]>([]);

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
    // 1. Determine Week Range (Mon - Sun)
    const current = new Date(selectedDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    
    const monday = new Date(current);
    monday.setDate(diff);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const startStr = monday.toISOString().split('T')[0];
    const endStr = sunday.toISOString().split('T')[0];

    // 2. Fetch Data
    const [allRecords, allTasks] = await Promise.all([
      getWeeklyRecords(startStr, endStr),
      getTasks(selectedChildId) // Get all tasks for this child to determine denominator
    ]);

    // 3. Process Data for Mon(1) to Sun(0)
    // Indices for visual order: Mon(1), Tue(2), Wed(3), Thu(4), Fri(5), Sat(6), Sun(0)
    const weekOrder = [1, 2, 3, 4, 5, 6, 0];
    const dayLabels = ["월", "화", "수", "목", "금", "토", "일"];

    const stats = weekOrder.map((dayIndex, i) => {
      // Find date string for this specific day in the selected week
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];

      // Total tasks for this day of week
      const dayTasks = allTasks.filter(t => t.dayOfWeek === dayIndex);
      const total = dayTasks.length;

      // Completed records for this specific date
      const dayRecords = allRecords.filter(r => r.childId === selectedChildId && r.date === dateStr && r.status === 'done');
      const done = dayRecords.length;

      // Calculate percentage
      const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

      return {
        name: dayLabels[i],
        percentage,
        done,
        total,
        date: dateStr
      };
    });

    setData(stats);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-sm font-bold text-gray-700">아이 선택</label>
          <div className="relative">
            <select 
              value={selectedChildId}
              onChange={(e) => setSelectedChildId(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-gray-50 hover:bg-white transition-colors font-medium appearance-none cursor-pointer"
            >
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <label className="text-sm font-bold text-gray-700">날짜 선택 (해당 주간)</label>
          <div className="relative w-full">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              onClick={(e) => {
                // Ensure the picker opens on click for better UX
                if ('showPicker' in e.currentTarget) {
                  try {
                    (e.currentTarget as any).showPicker();
                  } catch (err) {
                    // Ignore error if not supported or blocked
                  }
                }
              }}
              className="w-full p-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 bg-gray-50 hover:bg-white transition-colors font-medium cursor-pointer"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="h-64 w-full">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#4b5563', fontSize: 14, fontWeight: 500 }} 
                dy={10}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip 
                cursor={{fill: '#f3f4f6'}}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Noto Sans KR' }}
                itemStyle={{ color: '#1f2937', fontWeight: 'bold' }}
                formatter={(value: any, _name: any, props: any) => [`${value}% (${props.payload.done} / ${props.payload.total}개)`, '달성률']}
                labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
              />
              <Bar dataKey="percentage" radius={[6, 6, 6, 6]}>
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={index >= 5 ? '#f472b6' : '#818cf8'} /> // Weekend pink, Weekday indigo
                ))}
                <LabelList 
                  dataKey="percentage" 
                  position="top" 
                  formatter={(val: number) => `${val}%`} 
                  style={{ fill: '#374151', fontWeight: 'bold', fontSize: '13px', fontFamily: 'Noto Sans KR' }} 
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400 font-medium">데이터를 불러오는 중...</div>
        )}
      </div>
      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
        <p className="text-xs text-center text-gray-500 font-medium">
          * '완료'한 항목만 집계됩니다. (PASS는 통계에서 제외)
        </p>
      </div>
    </div>
  );
};
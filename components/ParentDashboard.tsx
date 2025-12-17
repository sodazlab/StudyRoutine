import React from 'react';
import { RoutineManager } from './RoutineManager';
import { WeeklyStats } from './WeeklyStats';

interface ParentDashboardProps {
  onBack: () => void;
}

export const ParentDashboard: React.FC<ParentDashboardProps> = ({ onBack }) => {
  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">부모님 페이지 👨‍👩‍👧‍👦</h1>
        <button 
          onClick={onBack}
          className="bg-white text-gray-600 px-4 py-2 rounded-full shadow-sm text-sm font-bold hover:bg-gray-50"
        >
          돌아가기
        </button>
      </div>

      <section>
        <h2 className="text-lg font-bold text-gray-700 mb-3 ml-2">📊 주간 리포트</h2>
        <div className="bg-white p-6 rounded-3xl shadow-lg">
          <WeeklyStats />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-bold text-gray-700 mb-3 ml-2">⚙️ 설정 및 관리</h2>
        <RoutineManager />
      </section>
    </div>
  );
};

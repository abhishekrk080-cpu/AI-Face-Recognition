import { useMemo } from 'react';
import { useStudents } from '../hooks/useStudents';
import { useAttendance } from '../hooks/useAttendance';
import { useCountUp } from '../hooks/useCountUp';
import { format, subDays, parseISO, isSameDay } from 'date-fns';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Users, UserCheck, UserX, Activity, Trophy, BookOpen } from 'lucide-react';

const COLORS = ['#10B981', '#EF4444', '#4F46E5', '#F59E0B', '#8B5CF6'];

function StatCard({ title, value, icon: Icon, colorClass, suffix = '' }: any) {
  const animatedValue = useCountUp(value);
  return (
    <div className="glass-card p-6 flex items-center justify-between relative overflow-hidden group">
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity ${colorClass}`} />
      <div>
        <p className="text-text-secondary text-sm font-medium mb-1">{title}</p>
        <h3 className="text-3xl font-bold text-white">
          {animatedValue}{suffix}
        </h3>
      </div>
      <div className={`p-4 rounded-2xl ${colorClass} bg-opacity-10 backdrop-blur-sm border border-white/5`}>
        <Icon className={`w-8 h-8 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
  );
}

export function Dashboard() {
  const { students, loading: studentsLoading } = useStudents();
  const { records, loading: recordsLoading } = useAttendance();

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const totalStudents = students.length;
    
    // Today's stats
    const presentToday = new Set(records.filter(r => r.date === today && r.status === 'Present').map(r => r.studentId)).size;
    const absentToday = totalStudents - presentToday;
    
    // Overall rate
    const totalPossibleAttendance = totalStudents * (records.length > 0 ? new Set(records.map(r => r.date)).size : 1); // rough estimate based on active days
    const totalPresent = records.filter(r => r.status === 'Present').length;
    const overallRate = totalPossibleAttendance > 0 ? Math.round((totalPresent / totalPossibleAttendance) * 100) : 0;

    // Last 14 days bar chart
    const last14Days = Array.from({ length: 14 }).map((_, i) => {
      const d = subDays(new Date(), 13 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const present = new Set(records.filter(r => r.date === dateStr && r.status === 'Present').map(r => r.studentId)).size;
      return {
        name: format(d, 'MMM dd'),
        Present: present,
        Absent: totalStudents - present
      };
    });

    // Pie chart (Overall Present vs Absent)
    const pieData = [
      { name: 'Present', value: totalPresent },
      { name: 'Absent', value: Math.max(0, totalPossibleAttendance - totalPresent) }
    ];

    // Leaderboard
    const studentAttendanceCount: Record<string, number> = {};
    records.filter(r => r.status === 'Present').forEach(r => {
      studentAttendanceCount[r.studentId] = (studentAttendanceCount[r.studentId] || 0) + 1;
    });
    
    const leaderboard = Object.entries(studentAttendanceCount)
      .map(([studentId, count]) => {
        const student = students.find(s => s.studentId === studentId);
        return {
          studentId,
          name: student?.name || 'Unknown',
          course: student?.course || 'Unknown',
          count,
          photoURL: student?.photoURL
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Course breakdown
    const courseStats: Record<string, { present: number, total: number }> = {};
    students.forEach(s => {
      if (!courseStats[s.course]) courseStats[s.course] = { present: 0, total: 0 };
      courseStats[s.course].total += 1; // Assuming 1 day for simplicity, or we can calculate per active day
    });
    
    records.filter(r => r.status === 'Present').forEach(r => {
      if (courseStats[r.course]) {
        courseStats[r.course].present += 1;
      }
    });

    const courseData = Object.entries(courseStats).map(([course, data]) => ({
      course,
      rate: data.total > 0 ? Math.round((data.present / (data.total * new Set(records.map(r => r.date)).size)) * 100) : 0
    })).sort((a, b) => b.rate - a.rate);

    // Last 30 days line chart
    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const d = subDays(new Date(), 29 - i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const present = new Set(records.filter(r => r.date === dateStr && r.status === 'Present').map(r => r.studentId)).size;
      return {
        name: format(d, 'MMM dd'),
        Attendance: present > 0 ? Math.round((present / totalStudents) * 100) : 0
      };
    });

    return {
      totalStudents,
      presentToday,
      absentToday,
      overallRate,
      last14Days,
      last30Days,
      pieData,
      leaderboard,
      courseData
    };
  }, [students, records]);

  if (studentsLoading || recordsLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold">Analytics Dashboard</h2>
        <p className="text-text-secondary">Overview of student attendance and engagement.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Students" value={stats.totalStudents} icon={Users} colorClass="bg-blue-500" />
        <StatCard title="Present Today" value={stats.presentToday} icon={UserCheck} colorClass="bg-emerald-500" />
        <StatCard title="Absent Today" value={stats.absentToday} icon={UserX} colorClass="bg-red-500" />
        <StatCard title="Overall Rate" value={stats.overallRate} suffix="%" icon={Activity} colorClass="bg-violet-500" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bar Chart */}
        <div className="lg:col-span-2 glass-card p-6">
          <h3 className="text-lg font-semibold mb-6">Attendance Trend (Last 14 Days)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.last14Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1A1A2E', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{ fill: '#ffffff05' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar dataKey="Present" fill="#10B981" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="Absent" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-6 flex flex-col">
          <h3 className="text-lg font-semibold mb-2">Overall Distribution</h3>
          <div className="flex-1 min-h-[300px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {stats.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1A1A2E', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
              <span className="text-3xl font-bold text-white">{stats.overallRate}%</span>
              <span className="text-xs text-text-secondary">Avg Rate</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-6">Attendance Rate Trend (Last 30 Days)</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.last30Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="name" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
              <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `${val}%`} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1A1A2E', borderColor: '#ffffff10', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
              />
              <Line type="monotone" dataKey="Attendance" stroke="#4F46E5" strokeWidth={3} dot={false} activeDot={{ r: 6, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Leaderboard */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold">Top Attendees</h3>
          </div>
          <div className="space-y-4">
            {stats.leaderboard.length === 0 ? (
              <p className="text-text-secondary text-center py-4">No attendance data yet.</p>
            ) : (
              stats.leaderboard.map((student, idx) => (
                <div key={student.studentId} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-8 text-center font-bold text-text-secondary">#{idx + 1}</div>
                    <img 
                      src={student.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`} 
                      alt={student.name} 
                      className="w-10 h-10 rounded-full object-cover bg-surface"
                    />
                    <div>
                      <p className="font-medium text-white text-sm">{student.name}</p>
                      <p className="text-xs text-text-secondary">{student.course}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-400">{student.count}</p>
                    <p className="text-xs text-text-secondary">Days Present</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Course Breakdown */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-semibold">Course Attendance Rate</h3>
          </div>
          <div className="space-y-5">
            {stats.courseData.length === 0 ? (
              <p className="text-text-secondary text-center py-4">No course data yet.</p>
            ) : (
              stats.courseData.map((course) => (
                <div key={course.course}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-white">{course.course}</span>
                    <span className="text-text-secondary">{course.rate}%</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-primary-500 to-violet-500 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${course.rate}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

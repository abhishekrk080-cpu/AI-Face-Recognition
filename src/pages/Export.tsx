import { useState, useMemo } from 'react';
import { useStudents } from '../hooks/useStudents';
import { useAttendance } from '../hooks/useAttendance';
import { useToast } from '../components/Toast';
import { Download, FileSpreadsheet, Calendar, Filter, RefreshCw } from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { cn } from '../lib/utils';

export function Export() {
  const { students } = useStudents();
  const { records, loading } = useAttendance();
  const { toast } = useToast();

  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [courseFilter, setCourseFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const courses = useMemo(() => Array.from(new Set(students.map(s => s.course))), [students]);

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const recordDate = parseISO(record.date);
      const start = startOfDay(parseISO(startDate));
      const end = endOfDay(parseISO(endDate));
      
      const withinDateRange = isWithinInterval(recordDate, { start, end });
      const matchesCourse = courseFilter ? record.course === courseFilter : true;
      const matchesStudent = studentFilter 
        ? record.studentName.toLowerCase().includes(studentFilter.toLowerCase()) || 
          record.studentId.toLowerCase().includes(studentFilter.toLowerCase())
        : true;

      return withinDateRange && matchesCourse && matchesStudent;
    });
  }, [records, startDate, endDate, courseFilter, studentFilter]);

  const exportDetailedCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['Student ID', 'Name', 'Course', 'Date', 'Time', 'Status', 'Confidence %', 'Method'];
      const rows = filteredRecords.map(r => [
        r.studentId,
        `"${r.studentName}"`,
        `"${r.course}"`,
        r.date,
        r.time,
        r.status,
        Math.round(r.confidence * 100),
        `"${r.method}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csvContent, `attendance_detailed_${format(new Date(), 'yyyyMMdd')}.csv`);
      toast('Detailed CSV exported successfully!', 'success');
    } catch (err) {
      toast('Failed to export CSV', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const exportSummaryCSV = () => {
    setIsExporting(true);
    try {
      const summary: Record<string, { name: string, course: string, present: number, total: number }> = {};
      
      // Calculate total active days in the filtered range
      const uniqueDates = new Set(filteredRecords.map(r => r.date)).size || 1;

      // Initialize all filtered students
      students.forEach(s => {
        if ((!courseFilter || s.course === courseFilter) && 
            (!studentFilter || s.name.toLowerCase().includes(studentFilter.toLowerCase()) || s.studentId.toLowerCase().includes(studentFilter.toLowerCase()))) {
          summary[s.studentId] = { name: s.name, course: s.course, present: 0, total: uniqueDates };
        }
      });

      // Count presence
      filteredRecords.forEach(r => {
        if (summary[r.studentId] && r.status === 'Present') {
          summary[r.studentId].present += 1;
        }
      });

      const headers = ['Student ID', 'Name', 'Course', 'Total Present', 'Total Absent', 'Attendance %'];
      const rows = Object.entries(summary).map(([id, data]) => {
        const absent = Math.max(0, data.total - data.present);
        const rate = Math.round((data.present / data.total) * 100);
        return [
          id,
          `"${data.name}"`,
          `"${data.course}"`,
          data.present,
          absent,
          rate
        ];
      });

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      downloadCSV(csvContent, `attendance_summary_${format(new Date(), 'yyyyMMdd')}.csv`);
      toast('Summary CSV exported successfully!', 'success');
    } catch (err) {
      toast('Failed to export summary CSV', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Export & Reports</h2>
        <p className="text-text-secondary">Generate and download attendance reports.</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Filters Sidebar */}
        <div className="glass-card p-6 space-y-6 lg:col-span-1 h-fit">
          <div className="flex items-center gap-2 text-lg font-semibold border-b border-white/10 pb-4">
            <Filter className="w-5 h-5 text-primary-400" />
            Report Filters
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Start Date
              </label>
              <input 
                type="date" 
                className="glass-input w-full"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary flex items-center gap-2">
                <Calendar className="w-4 h-4" /> End Date
              </label>
              <input 
                type="date" 
                className="glass-input w-full"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Course</label>
              <select 
                className="glass-input w-full appearance-none bg-surface"
                value={courseFilter}
                onChange={e => setCourseFilter(e.target.value)}
              >
                <option value="">All Courses</option>
                {courses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-secondary">Student Search</label>
              <input 
                type="text" 
                placeholder="Name or ID..." 
                className="glass-input w-full"
                value={studentFilter}
                onChange={e => setStudentFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 space-y-3">
            <p className="text-sm text-center text-text-secondary mb-4">
              Exporting <strong className="text-white">{filteredRecords.length}</strong> records
            </p>
            <button 
              onClick={exportDetailedCSV}
              disabled={isExporting || filteredRecords.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              Detailed CSV
            </button>
            <button 
              onClick={exportSummaryCSV}
              disabled={isExporting || filteredRecords.length === 0}
              className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 border border-white/10"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Summary CSV
            </button>
          </div>
        </div>

        {/* Preview Table */}
        <div className="glass-card lg:col-span-3 overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <h3 className="font-semibold">Data Preview</h3>
            <span className="text-xs text-text-secondary px-2 py-1 rounded bg-white/10">Showing up to 100 rows</span>
          </div>
          
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-text-secondary">
                <FileSpreadsheet className="w-12 h-12 opacity-20 mb-4" />
                <p>No records found for the selected filters.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-sm">
                <thead className="sticky top-0 bg-surface/95 backdrop-blur-sm z-10 shadow-sm">
                  <tr className="border-b border-white/10">
                    <th className="p-3 font-medium text-text-secondary">Date</th>
                    <th className="p-3 font-medium text-text-secondary">Time</th>
                    <th className="p-3 font-medium text-text-secondary">Student</th>
                    <th className="p-3 font-medium text-text-secondary">Course</th>
                    <th className="p-3 font-medium text-text-secondary">Status</th>
                    <th className="p-3 font-medium text-text-secondary">Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.slice(0, 100).map(record => (
                    <tr key={record.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="p-3 whitespace-nowrap">{format(parseISO(record.date), 'MMM dd, yyyy')}</td>
                      <td className="p-3 text-text-secondary">{record.time}</td>
                      <td className="p-3">
                        <div className="font-medium text-white">{record.studentName}</div>
                        <div className="text-xs text-text-secondary">{record.studentId}</div>
                      </td>
                      <td className="p-3 text-text-secondary">{record.course}</td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2 py-1 rounded-md text-xs font-medium",
                          record.status === 'Present' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                        )}>
                          {record.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-text-secondary">{record.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useAttendance } from '../hooks/useAttendance';
import { useStudents } from '../hooks/useStudents';
import { useToast } from '../components/Toast';
import { format, parseISO } from 'date-fns';
import { Search, Filter, Edit2, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { AttendanceRecord } from '../types';
import { cn } from '../lib/utils';

export function Records() {
  const { records, loading: recordsLoading, deleteAttendance, editAttendance, markAttendance } = useAttendance();
  const { students, loading: studentsLoading } = useStudents();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [courseFilter, setCourseFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const courses = useMemo(() => {
    const uniqueCourses = new Set(students.map(s => s.course));
    return Array.from(uniqueCourses);
  }, [students]);

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<'Present' | 'Absent'>('Present');
  const [editMethod, setEditMethod] = useState<'Face Recognition' | 'Manual Override'>('Manual Override');

  // Delete Modal State
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);

  const filteredRecords = useMemo(() => {
    let filtered = records;

    if (dateFilter) {
      filtered = filtered.filter(r => r.date === dateFilter);
    }

    if (courseFilter) {
      filtered = filtered.filter(r => r.course === courseFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.studentName.toLowerCase().includes(lowerSearch) || 
        r.studentId.toLowerCase().includes(lowerSearch) ||
        r.course.toLowerCase().includes(lowerSearch)
      );
    }

    return filtered;
  }, [records, searchTerm, dateFilter, courseFilter, statusFilter]);

  const handleDeleteClick = (record: AttendanceRecord) => {
    setRecordToDelete(record);
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      const res = await deleteAttendance(recordToDelete.studentId, recordToDelete.date);
      if (res.success) {
        toast(`Record deleted successfully`, 'success');
      } else {
        toast(`Failed to delete record: ${res.message}`, 'error');
      }
    } catch (err) {
      toast(`Failed to delete record`, 'error');
    } finally {
      setRecordToDelete(null);
    }
  };

  const handleEditClick = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setEditStatus(record.status as 'Present' | 'Absent');
    setEditMethod(record.method as 'Face Recognition' | 'Manual Override');
  };

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    try {
      // Update existing record
      await editAttendance(editingRecord.studentId, editingRecord.date, {
        status: editStatus,
        method: editMethod
      });
      toast(`Attendance updated successfully`, 'success');
      setEditingRecord(null);
    } catch (err) {
      toast(`Failed to update attendance`, 'error');
    }
  };

  const isLoading = recordsLoading || studentsLoading;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Attendance Records</h2>
          <p className="text-text-secondary">View and manage student attendance history</p>
        </div>
      </div>

      <div className="glass-card p-4 flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input 
            type="text" 
            placeholder="Search by name, ID, or course..." 
            className="glass-input w-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="relative sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <select 
            className="glass-input w-full pl-10 appearance-none bg-surface"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="relative sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <select 
            className="glass-input w-full pl-10 appearance-none bg-surface"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Absent">Absent</option>
          </select>
        </div>
        <div className="relative sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
          <input 
            type="date" 
            className="glass-input w-full pl-10"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 font-medium text-text-secondary">Student</th>
                <th className="p-4 font-medium text-text-secondary">Course</th>
                <th className="p-4 font-medium text-text-secondary">Date & Time</th>
                <th className="p-4 font-medium text-text-secondary">Method</th>
                <th className="p-4 font-medium text-text-secondary">Status</th>
                <th className="p-4 font-medium text-text-secondary text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-secondary">
                    Loading records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-secondary">
                    No attendance records found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const student = students.find(s => s.studentId === record.studentId);
                  
                  return (
                    <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={student?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${record.studentName}`} 
                            alt={record.studentName} 
                            className="w-10 h-10 rounded-full object-cover bg-surface"
                          />
                          <div>
                            <p className="font-medium text-white">{record.studentName}</p>
                            <p className="text-sm text-text-secondary">{record.studentId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-text-secondary">{record.course}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="text-white">{record.date}</span>
                          <span className="text-sm text-text-secondary flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {record.time}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface border border-white/10 text-text-secondary">
                          {record.method}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                          record.status === 'Present' 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border-red-500/20"
                        )}>
                          {record.status === 'Present' ? (
                            <CheckCircle className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {record.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button 
                            onClick={() => handleEditClick(record)}
                            className="p-1.5 rounded-lg hover:bg-primary-500/20 text-text-secondary hover:text-primary-400 transition-colors"
                            title="Edit Record"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteClick(record)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-text-secondary hover:text-red-400 transition-colors"
                            title="Delete Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-semibold mb-4 text-white">Edit Attendance Record</h3>
            
            <div className="flex items-center gap-4 mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
              <img 
                src={`https://api.dicebear.com/7.x/initials/svg?seed=${editingRecord.studentName}`} 
                alt={editingRecord.studentName} 
                className="w-12 h-12 rounded-full object-cover bg-surface"
              />
              <div>
                <p className="font-medium text-white">{editingRecord.studentName}</p>
                <p className="text-sm text-text-secondary">{editingRecord.studentId}</p>
                <p className="text-xs text-text-secondary mt-1">{editingRecord.date} at {editingRecord.time}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Status</label>
                <select 
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as 'Present' | 'Absent')}
                  className="w-full bg-bg-dark border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">Method</label>
                <select 
                  value={editMethod}
                  onChange={(e) => setEditMethod(e.target.value as 'Face Recognition' | 'Manual Override')}
                  className="w-full bg-bg-dark border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary-500 transition-colors"
                >
                  <option value="Face Recognition">Face Recognition</option>
                  <option value="Manual Override">Manual Override</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="btn-primary py-2 px-6"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-semibold mb-2 text-white">Delete Attendance Record</h3>
            <p className="text-text-secondary mb-6">
              Are you sure you want to delete the attendance record for <span className="text-white font-medium">{recordToDelete.studentName}</span> on <span className="text-white font-medium">{recordToDelete.date}</span>? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 rounded-lg text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="btn-primary py-2 px-6 bg-red-500 hover:bg-red-600 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

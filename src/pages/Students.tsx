import React, { useState, useMemo } from 'react';
import { useStudents } from '../hooks/useStudents';
import { useAttendance } from '../hooks/useAttendance';
import { useToast } from '../components/Toast';
import { Search, Filter, MoreVertical, Trash2, Edit2, User, Users, Calendar, BookOpen, Clock, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import { Student } from '../types';

export function Students() {
  const { students, loading, deleteStudent, updateStudent } = useStudents();
  const { records } = useAttendance();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Student>>({});

  const courses = useMemo(() => Array.from(new Set(students.map(s => s.course))), [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            s.studentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCourse = courseFilter ? s.course === courseFilter : true;
      return matchesSearch && matchesCourse;
    });
  }, [students, searchTerm, courseFilter]);

  const handleDelete = async (student: Student) => {
    if (window.confirm(`Are you sure you want to delete ${student.name}? This action cannot be undone.`)) {
      try {
        await deleteStudent(student.id, student.photoURL);
        toast(`${student.name} deleted successfully`, 'success');
        if (selectedStudent?.id === student.id) setSelectedStudent(null);
      } catch (err) {
        toast(`Failed to delete student`, 'error');
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    
    try {
      await updateStudent(selectedStudent.id, editData);
      toast(`Student updated successfully`, 'success');
      setIsEditing(false);
      setSelectedStudent({ ...selectedStudent, ...editData } as Student);
    } catch (err) {
      toast(`Failed to update student`, 'error');
    }
  };

  const getAttendanceRate = (studentId: string) => {
    const studentRecords = records.filter(r => r.studentId === studentId);
    const present = studentRecords.filter(r => r.status === 'Present').length;
    const totalActiveDays = new Set(records.map(r => r.date)).size || 1;
    return Math.round((present / totalActiveDays) * 100);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-48 skeleton"></div>
        <div className="h-20 w-full skeleton"></div>
        <div className="h-[400px] w-full skeleton"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Student Management</h2>
          <p className="text-text-secondary">Manage registered students and view their attendance history.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input 
              type="text" 
              placeholder="Search name or ID..." 
              className="glass-input pl-10 w-full md:w-64"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <select 
              className="glass-input pl-10 appearance-none bg-surface"
              value={courseFilter}
              onChange={e => setCourseFilter(e.target.value)}
            >
              <option value="">All Courses</option>
              {courses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="p-4 font-medium text-text-secondary">Student</th>
                <th className="p-4 font-medium text-text-secondary">ID</th>
                <th className="p-4 font-medium text-text-secondary">Course</th>
                <th className="p-4 font-medium text-text-secondary">Attendance</th>
                <th className="p-4 font-medium text-text-secondary text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-text-secondary">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-12 h-12 opacity-20" />
                      <p>No students found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => {
                  const rate = getAttendanceRate(student.studentId);
                  return (
                    <tr 
                      key={student.id} 
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => setSelectedStudent(student)}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={student.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`} 
                            alt={student.name} 
                            className="w-10 h-10 rounded-full object-cover bg-surface"
                          />
                          <div>
                            <p className="font-medium text-white">{student.name}</p>
                            <p className="text-xs text-text-secondary">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-text-secondary">{student.studentId}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full bg-primary-500/10 text-primary-400 text-xs font-medium border border-primary-500/20">
                          {student.course}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={cn("h-1.5 rounded-full", rate >= 75 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500")} 
                              style={{ width: `${rate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium">{rate}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(student); }}
                          className="p-2 text-text-secondary hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-surface border-white/10 shadow-2xl relative">
            <button 
              onClick={() => { setSelectedStudent(null); setIsEditing(false); }}
              className="absolute top-4 right-4 p-2 text-text-secondary hover:text-white bg-white/5 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <img 
                  src={selectedStudent.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${selectedStudent.name}`} 
                  alt={selectedStudent.name} 
                  className="w-32 h-32 rounded-2xl object-cover border-4 border-white/10 shadow-xl"
                />
                
                <div className="flex-1 w-full">
                  {isEditing ? (
                    <form onSubmit={handleUpdate} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1 col-span-2">
                          <label className="text-xs text-text-secondary">Name</label>
                          <input type="text" className="glass-input w-full py-1.5" value={editData.name ?? selectedStudent.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary">Email</label>
                          <input type="email" className="glass-input w-full py-1.5" value={editData.email ?? selectedStudent.email} onChange={e => setEditData({...editData, email: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary">Course</label>
                          <input type="text" className="glass-input w-full py-1.5" value={editData.course ?? selectedStudent.course} onChange={e => setEditData({...editData, course: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-text-secondary">Semester</label>
                          <input type="text" className="glass-input w-full py-1.5" value={editData.semester ?? selectedStudent.semester} onChange={e => setEditData({...editData, semester: e.target.value})} />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button type="submit" className="btn-primary py-1.5 px-4 text-sm">Save Changes</button>
                        <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary py-1.5 px-4 text-sm">Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-bold text-white">{selectedStudent.name}</h3>
                        <button 
                          onClick={() => { setIsEditing(true); setEditData({}); }}
                          className="p-2 text-text-secondary hover:text-primary-400 bg-white/5 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-3 gap-x-6 mt-4">
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <User className="w-4 h-4" />
                          <span className="text-white">{selectedStudent.studentId}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <BookOpen className="w-4 h-4" />
                          <span className="text-white">{selectedStudent.course}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Calendar className="w-4 h-4" />
                          <span className="text-white">{selectedStudent.semester}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Clock className="w-4 h-4" />
                          <span className="text-white">Registered {format(selectedStudent.registeredAt, 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-white/10">
                <h4 className="text-lg font-semibold mb-4">Recent Attendance</h4>
                <div className="space-y-2">
                  {records.filter(r => r.studentId === selectedStudent.studentId).slice(0, 5).map(record => (
                    <div key={record.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full", record.status === 'Present' ? "bg-emerald-500" : "bg-red-500")} />
                        <span className="font-medium text-white">{format(parseISO(record.date), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-text-secondary">
                        <span>{record.time}</span>
                        <span className="px-2 py-0.5 rounded-md bg-white/10 text-xs">{record.method}</span>
                      </div>
                    </div>
                  ))}
                  {records.filter(r => r.studentId === selectedStudent.studentId).length === 0 && (
                    <p className="text-center text-text-secondary py-4">No attendance records found.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

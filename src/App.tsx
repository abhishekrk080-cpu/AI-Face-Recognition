/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Register } from './pages/Register';
import { Attendance } from './pages/Attendance';
import { Students } from './pages/Students';
import { Records } from './pages/Records';
import { Export } from './pages/Export';

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="register" element={<Register />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="records" element={<Records />} />
            <Route path="students" element={<Students />} />
            <Route path="export" element={<Export />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

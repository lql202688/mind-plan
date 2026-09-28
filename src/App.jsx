import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import Dashboard from './pages/Dashboard.jsx'
import NotePage from './pages/NotePage.jsx'
import PlanPage from './pages/PlanPage.jsx'
import MoodJournalPage from './pages/MoodJournalPage.jsx'
import StatsPage from './pages/StatsPage.jsx'
import ModelPage from './pages/ModelPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

// 路由表：AppShell 作为外壳，内部嵌套各业务页面
export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/notes" element={<NotePage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/mood" element={<MoodJournalPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/model" element={<ModelPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}

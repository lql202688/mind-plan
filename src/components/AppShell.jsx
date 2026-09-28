import React from 'react'
import { NavLink } from 'react-router-dom'
import FloatingCat from './FloatingCat.jsx'
import { useApp } from '../state/AppContext.jsx'

// ============ AppShell 外壳 ============
// DOM 结构固定：div.app-shell > aside.left-nav + main.app-content
// PC 端：左侧垂直导航；移动端 (<768px) 由 CSS 自动切换到底部横向胶囊导航
export default function AppShell({ children }) {
  // 悬浮小精灵开关(系统设置中配置,持久化于 localStorage)
  const { preferences } = useApp()
  const floatingCatEnabled = preferences?.floatingCatEnabled !== false

  // 导航菜单：纯中文文字，禁止特殊符号
  const navItems = [
    { to: '/', label: '首页仪表盘', end: true, tag: '今日' },
    { to: '/notes', label: '笔记管理', tag: '学习' },
    { to: '/plan', label: '备考规划', tag: '冲刺' },
    { to: '/mood', label: '备考心情', tag: '心态' },
    { to: '/stats', label: '进度统计', tag: '数据' },
    { to: '/model', label: 'AI模型', tag: '本地' },
    { to: '/settings', label: '系统设置', tag: '本机' }
  ]

  const renderNavItems = () =>
    navItems.map(item => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.end}
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span>{item.label}</span>
        <span className="nav-tag">{item.tag}</span>
      </NavLink>
    ))

  return (
    <div className="app-shell">
      <aside className="left-nav">
        <div className="nav-brand">MindPlan</div>
        {renderNavItems()}
      </aside>

      <main className="app-content">
        {children}
      </main>

      {/* 移动端底部胶囊导航，仅 <768px 显示 */}
      <nav className="bottom-nav">
        {renderNavItems()}
      </nav>

      {/* 全局悬浮笔记小精灵,所有页面可见,独立于路由;可在系统设置中关闭 */}
      {floatingCatEnabled && <FloatingCat />}
    </div>
  )
}

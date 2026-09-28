import React, { useMemo, useState } from 'react'
import { useApp, isToday, PRIORITY_LABEL, PRIORITY_TAG } from '../state/AppContext.jsx'

// ============ Dashboard 仪表盘首页 ============
export default function Dashboard() {
  const { tasks, addTask, toggleTask, deleteTask, aiSchedule, aiMode, preferences } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [scheduleMsg, setScheduleMsg] = useState('')

  // 今日日期
  const today = new Date()
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  const weekDay = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()]

  // 今日任务（按截止日期匹配今日）
  const todayTasks = useMemo(() => {
    return tasks.filter(t => isToday(t.deadline) || isToday(t.createdAt))
  }, [tasks])

  const pendingTasks = todayTasks.filter(t => !t.completed)
  const completedTasks = todayTasks.filter(t => t.completed)

  // 总预估时长（分钟）
  const totalMinutes = useMemo(() => {
    return todayTasks.reduce((sum, t) => sum + (Number(t.estimatedMinutes) || 0), 0)
  }, [todayTasks])

  const hours = (totalMinutes / 60).toFixed(1)
  const isOverload = totalMinutes > 240 // 大于 4 小时

  // 复习堆积统计:全部未完成的复习任务(读取设置中的提醒阈值)
  const reviewBacklog = useMemo(() => {
    return tasks.filter(t => t.isReview && !t.completed).length
  }, [tasks])
  const backlogThreshold = preferences?.reviewBacklogThreshold ?? 8
  const isBacklogOver = reviewBacklog > backlogThreshold

  // AI 问候语
  const greeting = (() => {
    const h = today.getHours()
    if (h < 11) return '早上好，新的一天元气满满'
    if (h < 14) return '中午好，记得劳逸结合'
    if (h < 18) return '下午好，专注当下收获更多'
    if (h < 22) return '晚上好，复盘今日所学'
    return '夜深了，注意休息'
  })()

  // AI 简易排程
  const handleSchedule = () => {
    const sorted = aiSchedule()
    setScheduleMsg(
      `已执行 AI ${aiMode === 'local' ? '本地模型' : '规则引擎'}排程：` +
      `共 ${sorted.length} 项待办，建议从「${sorted[0]?.name || '无任务'}」开始。`
    )
  }

  return (
    <div>
      {/* Hero AI 问候区 */}
      <div className="hero">
        <div className="hero-blob-3" />
        <div className="hero-blob-4" />
        <div className="hero-content">
          <div className="hero-greet">{greeting}</div>
          <div className="hero-date">{dateStr} 星期{weekDay} · 本地AI学业助手</div>
          <div className="hero-stats">
            <div className="hero-stat">
              <span className="hero-stat-num">{todayTasks.length}</span>
              <span className="hero-stat-label">今日任务</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">{completedTasks.length}</span>
              <span className="hero-stat-label">已完成</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num">{pendingTasks.length}</span>
              <span className="hero-stat-label">待完成</span>
            </div>
            <div className="hero-stat">
              <span className="hero-stat-num" style={{ color: isOverload ? '#F59E0B' : '#EC4899' }}>
                {hours}h
              </span>
              <span className="hero-stat-label">预估时长</span>
            </div>
          </div>
        </div>
      </div>

      {/* 过载预警 */}
      {isOverload && (
        <div className="alert alert-warn">
          今日任务总预估 {hours} 小时，已超过 4 小时，注意合理分配精力，避免过载。
        </div>
      )}

      {/* 复习堆积提醒(阈值在系统设置中配置) */}
      {isBacklogOver && (
        <div className="alert alert-warn">
          复习堆积提醒：当前有 {reviewBacklog} 项未完成的复习任务，已超过你设置的 {backlogThreshold} 条阈值，
          建议尽快消化或调整 AI 排程强度。
        </div>
      )}

      {/* 操作区 */}
      <div className="card">
        <div className="card-title">
          <span>今日任务时间轴</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={handleSchedule}>
              AI 简易排程
            </button>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              新增任务
            </button>
          </div>
        </div>

        {scheduleMsg && <div className="alert alert-info">{scheduleMsg}</div>}

        {todayTasks.length === 0 ? (
          <div className="empty">今日还没有任务，点击「新增任务」开始规划吧</div>
        ) : (
          <div className="timeline">
            {todayTasks.map(task => (
              <div key={task.id} className={`timeline-item${task.completed ? ' completed' : ''}`}>
                <TaskItem
                  task={task}
                  onToggle={() => toggleTask(task.id)}
                  onDelete={() => deleteTask(task.id)}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 新增任务弹窗 */}
      {showModal && (
        <TaskModal
          onClose={() => setShowModal(false)}
          onSubmit={(task) => {
            addTask(task)
            setShowModal(false)
          }}
        />
      )}
    </div>
  )
}

// ============ 任务项组件 ============
function TaskItem({ task, onToggle, onDelete }) {
  return (
    <div className={`task-item${task.completed ? ' completed' : ''}`}>
      <div
        className={`task-check${task.completed ? ' checked' : ''}`}
        onClick={onToggle}
        role="checkbox"
        aria-checked={task.completed}
      >
        {task.completed && '✓'}
      </div>
      <div className="task-main">
        <div className="task-name">{task.name}</div>
        <div className="task-meta">
          <span className={`tag ${PRIORITY_TAG[task.priority] || 'tag-mid'}`}>
            {PRIORITY_LABEL[task.priority] || '中优先级'}
          </span>
          <span>预估 {task.estimatedMinutes || 0} 分钟</span>
          {task.deadline && <span>截止 {task.deadline.slice(0, 16).replace('T', ' ')}</span>}
          {task.isReview && <span className="tag tag-review">复习</span>}
        </div>
      </div>
      <div className="task-actions">
        <button className="icon-btn danger" onClick={onDelete}>删除</button>
      </div>
    </div>
  )
}

// ============ 新增任务弹窗 ============
function TaskModal({ onClose, onSubmit }) {
  const [name, setName] = useState('')
  const [estimatedMinutes, setEstimatedMinutes] = useState(30)
  const [priority, setPriority] = useState('mid')
  const [deadline, setDeadline] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      estimatedMinutes: Number(estimatedMinutes) || 0,
      priority,
      deadline: deadline ? new Date(deadline).toISOString() : new Date().toISOString()
    })
  }

  // 默认截止时间为今日 18:00
  const defaultDeadline = (() => {
    const d = new Date()
    d.setHours(18, 0, 0, 0)
    return d.toISOString().slice(0, 16)
  })()

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">新增任务</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">任务名称</label>
            <input
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例如：复习数据结构第三章"
              autoFocus
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">预估耗时（分钟）</label>
              <input
                type="number"
                min="5"
                step="5"
                className="form-input"
                value={estimatedMinutes}
                onChange={e => setEstimatedMinutes(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">优先级</label>
              <select
                className="form-select"
                value={priority}
                onChange={e => setPriority(e.target.value)}
              >
                <option value="high">高优先级</option>
                <option value="mid">中优先级</option>
                <option value="low">低优先级</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">截止日期时间</label>
            <input
              type="datetime-local"
              className="form-input"
              defaultValue={defaultDeadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>取消</button>
            <button type="submit" className="btn btn-primary">保存任务</button>
          </div>
        </form>
      </div>
    </div>
  )
}

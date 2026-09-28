import React, { useMemo, useRef, useState } from 'react'
import {
  useApp,
  STORAGE_KEY,
  SCHEDULE_INTENSITY_OPTIONS,
  REVIEW_THRESHOLD_OPTIONS
} from '../state/AppContext.jsx'

// ============ SettingsPage 系统设置 ============
// 布局(自上而下):数据说明 → 数据概览 → 备份与恢复 → 学习偏好 → 系统信息 → 危险操作(最底部)
const APP_VERSION = 'MindPlan-V1.0'

// 字节大小格式化
function formatBytes(bytes) {
  if (!bytes) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function SettingsPage() {
  const {
    resetAll, tasks, notes, exams,
    preferences, setPreference,
    exportData, importData
  } = useApp()

  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [backupMsg, setBackupMsg] = useState('')

  // 导入相关状态
  const fileInputRef = useRef(null)
  const [pendingImport, setPendingImport] = useState(null) // 待确认导入的数据
  const [importFileName, setImportFileName] = useState('')

  // ============ localStorage 占用统计 ============
  const storageUsage = useMemo(() => {
    let total = 0
    let appBytes = 0
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        const value = localStorage.getItem(key) || ''
        // 中文等字符按 UTF-16 近似估算,再转字节:用 Blob 更准确
        total += value.length
        if (key === STORAGE_KEY) appBytes += value.length
      }
    } catch (err) {
      console.warn('统计存储占用失败:', err)
    }
    // 粗略换算(UTF-16 2 字节/字符),仅用于展示大致占用
    return {
      totalText: formatBytes(total * 2),
      appText: formatBytes(appBytes * 2)
    }
  }, [tasks, notes, exams, preferences])

  // ============ 导出 JSON 备份 ============
  const handleExport = () => {
    try {
      const data = exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `MindPlan备份_${stamp}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setBackupMsg('备份文件已开始下载')
      setTimeout(() => setBackupMsg(''), 3000)
    } catch (err) {
      setBackupMsg(`导出失败:${err?.message || err}`)
      setTimeout(() => setBackupMsg(''), 4000)
    }
  }

  // ============ 选择备份文件:解析后弹确认框 ============
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 允许重复选择同一文件
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (
          !parsed ||
          !Array.isArray(parsed.tasks) ||
          !Array.isArray(parsed.notes) ||
          !Array.isArray(parsed.exams)
        ) {
          setBackupMsg('备份文件格式不正确,请选择 MindPlan 导出的 JSON 文件')
          setTimeout(() => setBackupMsg(''), 4000)
          return
        }
        setPendingImport(parsed)
        setImportFileName(file.name)
      } catch (err) {
        setBackupMsg(`备份文件解析失败:${err?.message || err}`)
        setTimeout(() => setBackupMsg(''), 4000)
      }
    }
    reader.onerror = () => {
      setBackupMsg('读取备份文件失败')
      setTimeout(() => setBackupMsg(''), 4000)
    }
    reader.readAsText(file)
  }

  // 确认导入:覆盖当前任务、笔记、考试
  const confirmImport = () => {
    if (!pendingImport) return
    importData(pendingImport)
    const count = pendingImport.tasks.length + pendingImport.notes.length + pendingImport.exams.length
    setPendingImport(null)
    setImportFileName('')
    setBackupMsg(
      `数据恢复成功:任务 ${pendingImport.tasks.length} 项、笔记 ${pendingImport.notes.length} 条、考试 ${pendingImport.exams.length} 场,共 ${count} 条记录`
    )
    setTimeout(() => setBackupMsg(''), 5000)
  }

  // ============ 一键重置 ============
  const handleReset = () => {
    resetAll()
    setShowResetConfirm(false)
    setResetMsg('系统已重置，所有笔记、任务、考试数据已清空')
    setTimeout(() => setResetMsg(''), 4000)
  }

  return (
    <div>
      <div className="page-title">系统设置</div>
      <div className="page-subtitle">本地数据、备份恢复与学习偏好配置</div>

      {/* 1. 数据存储说明 */}
      <div className="card">
        <div className="card-title"><span>数据存储说明</span></div>
        <div style={{ color: '#64748B', fontSize: 14, lineHeight: 1.9 }}>
          本应用全部数据（任务、笔记、考试、心情、学习偏好、AI 模式设置）均保存在浏览器本机 localStorage 中，
          不上传至任何服务器。请勿在浏览器中清除站点数据，否则将导致已记录内容丢失。
        </div>

        {/* 2. 数据统计卡片 */}
        <div style={{ marginTop: 14 }}>
          <div className="stat-grid">
            <div className="stat-block">
              <div className="num">{tasks.length}</div>
              <div className="label">任务数据</div>
            </div>
            <div className="stat-block">
              <div className="num">{notes.length}</div>
              <div className="label">笔记数据</div>
            </div>
            <div className="stat-block">
              <div className="num">{exams.length}</div>
              <div className="label">考试数据</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 数据备份与恢复 */}
      <div className="card">
        <div className="card-title">
          <span>数据备份与恢复</span>
          <span className="tag tag-info">JSON 本地文件</span>
        </div>
        <div className="setting-desc">
          导出会将全部备考任务、笔记、考试记录打包下载为 JSON 备份文件；
          导入备份将覆盖当前数据，请谨慎操作。
        </div>

        {backupMsg && <div className="alert alert-info" style={{ marginBottom: 12 }}>{backupMsg}</div>}

        <div className="backup-actions">
          <button className="btn btn-primary" onClick={handleExport}>
            导出全部数据(JSON)
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            导入备份恢复数据
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* 4. 学习偏好配置 */}
      <div className="card">
        <div className="card-title">
          <span>学习偏好配置</span>
          <span className="tag tag-info">自动保存到本机</span>
        </div>

        {/* AI 排程强度 */}
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-name">AI 排程强度</div>
            <div className="setting-desc">
              生成 AI 复习计划时按档位控制复习任务数量,
              当前「{SCHEDULE_INTENSITY_OPTIONS.find(o => o.key === preferences.scheduleIntensity)?.label}」
              最多生成 {SCHEDULE_INTENSITY_OPTIONS.find(o => o.key === preferences.scheduleIntensity)?.taskCap} 项
            </div>
          </div>
          <select
            className="form-select setting-control"
            value={preferences.scheduleIntensity}
            onChange={(e) => setPreference('scheduleIntensity', e.target.value)}
          >
            {SCHEDULE_INTENSITY_OPTIONS.map(opt => (
              <option key={opt.key} value={opt.key}>
                {opt.label}（{opt.desc}）
              </option>
            ))}
          </select>
        </div>

        {/* 复习堆积提醒阈值 */}
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-name">复习堆积提醒阈值</div>
            <div className="setting-desc">
              首页仪表盘待复习任务超过该条数时给出堆积提醒
            </div>
          </div>
          <select
            className="form-select setting-control"
            value={preferences.reviewBacklogThreshold}
            onChange={(e) => setPreference('reviewBacklogThreshold', Number(e.target.value))}
          >
            {REVIEW_THRESHOLD_OPTIONS.map(n => (
              <option key={n} value={n}>{n} 条</option>
            ))}
          </select>
        </div>

        {/* 悬浮笔记小精灵开关 */}
        <div className="setting-row">
          <div className="setting-info">
            <div className="setting-name">悬浮笔记小精灵</div>
            <div className="setting-desc">
              开启后右下角显示便签纸小精灵,可随时快速记录笔记;关闭后所有页面不再显示
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={preferences.floatingCatEnabled}
            className={`switch${preferences.floatingCatEnabled ? ' on' : ''}`}
            onClick={() => setPreference('floatingCatEnabled', !preferences.floatingCatEnabled)}
          >
            <span className="switch-knob" />
          </button>
        </div>
      </div>

      {/* 5. 系统信息 */}
      <div className="card">
        <div className="card-title"><span>系统信息</span></div>
        <div className="info-list">
          <div className="info-row">
            <span className="info-label">项目版本</span>
            <span className="info-value">
              <span className="tag tag-mid">{APP_VERSION}</span>
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">MindPlan 数据占用</span>
            <span className="info-value">{storageUsage.appText}</span>
          </div>
          <div className="info-row">
            <span className="info-label">浏览器 localStorage 总占用(估算)</span>
            <span className="info-value">{storageUsage.totalText}</span>
          </div>
        </div>
      </div>

      {/* 6. 危险操作(置于最底部,防误触) */}
      <div className="card danger-card">
        <div className="card-title"><span>危险操作</span></div>
        <div className="alert alert-danger">
          一键重置将清空 localStorage 中所有任务、笔记、考试、心情数据并恢复默认偏好,操作不可恢复,请谨慎执行。
        </div>
        <button className="btn btn-danger" onClick={() => setShowResetConfirm(true)}>
          一键重置系统
        </button>
        {resetMsg && (
          <div className="alert alert-info" style={{ marginTop: 12 }}>{resetMsg}</div>
        )}
      </div>

      {/* 重置确认弹窗 */}
      {showResetConfirm && (
        <div className="modal-mask" onClick={() => setShowResetConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <div className="modal-title">确认重置系统</div>
              <button className="modal-close" onClick={() => setShowResetConfirm(false)}>×</button>
            </div>
            <div style={{ fontSize: 14, color: '#1E293B', lineHeight: 1.8, padding: '6px 0' }}>
              即将清空以下全部数据，操作不可恢复：
              <ul style={{ marginTop: 8, paddingLeft: 20, color: '#64748B' }}>
                <li>任务：{tasks.length} 项</li>
                <li>笔记：{notes.length} 条</li>
                <li>考试：{exams.length} 场</li>
              </ul>
              确认要继续重置吗？
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowResetConfirm(false)}>取消</button>
              <button className="btn btn-danger" onClick={handleReset}>确认重置</button>
            </div>
          </div>
        </div>
      )}

      {/* 导入覆盖警告弹窗 */}
      {pendingImport && (
        <div className="modal-mask" onClick={() => setPendingImport(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div className="modal-title">确认导入备份</div>
              <button className="modal-close" onClick={() => setPendingImport(null)}>×</button>
            </div>
            <div style={{ fontSize: 14, color: '#1E293B', lineHeight: 1.8, padding: '6px 0' }}>
              <div className="alert alert-warn" style={{ marginBottom: 10 }}>
                警告:导入备份会覆盖当前全部任务、笔记、考试数据,当前数据将无法找回。
              </div>
              <div style={{ color: '#64748B' }}>
                备份文件:{importFileName}
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>任务:{pendingImport.tasks.length} 项</li>
                  <li>笔记:{pendingImport.notes.length} 条</li>
                  <li>考试:{pendingImport.exams.length} 场</li>
                  {pendingImport.exportedAt && (
                    <li>导出时间:{new Date(pendingImport.exportedAt).toLocaleString('zh-CN')}</li>
                  )}
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setPendingImport(null)}>取消</button>
              <button className="btn btn-danger" onClick={confirmImport}>确认覆盖导入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

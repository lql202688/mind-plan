import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useApp, MOOD_OPTIONS, MOOD_MAP, MOOD_QUOTES } from '../state/AppContext.jsx'

// ============ MoodJournalPage 备考心情 ============
// 记录每日备考情绪与想法、随机鼓励语录、Canvas 情绪折线图
// 数据存储：本地模式存 localStorage；登录后绑 userId（后续接 Supabase 时替换存储层）
export default function MoodJournalPage() {
  const { moods, addMood, deleteMood, user } = useApp()
  const [selectedMood, setSelectedMood] = useState('')
  const [note, setNote] = useState('')
  const [quote, setQuote] = useState('')
  const [msg, setMsg] = useState('')
  const canvasRef = useRef(null)

  // 随机鼓励语录
  const refreshQuote = () => {
    const idx = Math.floor(Math.random() * MOOD_QUOTES.length)
    setQuote(MOOD_QUOTES[idx])
  }
  useEffect(() => {
    refreshQuote()
  }, [])

  // 提交心情记录
  const handleSubmit = () => {
    if (!selectedMood) {
      setMsg('请先选择一个今日情绪')
      setTimeout(() => setMsg(''), 3000)
      return
    }
    addMood({ mood: selectedMood, note: note.trim() })
    setMsg('心情记录已保存')
    setSelectedMood('')
    setNote('')
    setTimeout(() => setMsg(''), 3000)
    // 保存后刷新一句鼓励语录
    refreshQuote()
  }

  // 最近 14 天情绪数据（按日期聚合，取当日最新一条）
  const moodTrend = useMemo(() => {
    const days = []
    const now = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const dayStr = d.toISOString().slice(0, 10)
      const dayMoods = moods
        .filter(m => m.createdAt?.slice(0, 10) === dayStr)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      const latest = dayMoods[0]
      days.push({
        date: dayStr,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        value: latest ? MOOD_MAP[latest.mood]?.value : null,
        mood: latest ? latest.mood : null
      })
    }
    return days
  }, [moods])

  // Canvas 绘制情绪折线图
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.clientWidth || 720
    const cssH = 260
    canvas.width = cssW * dpr
    canvas.height = cssH * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    const padding = { top: 20, right: 20, bottom: 40, left: 50 }
    const chartW = cssW - padding.left - padding.right
    const chartH = cssH - padding.top - padding.bottom
    const yMin = 1
    const yMax = 4

    // Y 轴网格与刻度
    ctx.strokeStyle = '#E2E8F0'
    ctx.fillStyle = '#64748B'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    const yLabels = [
      { v: 4, label: '干劲十足' },
      { v: 3, label: '心态平稳' },
      { v: 2, label: '疲惫' },
      { v: 1, label: '焦虑' }
    ]
    yLabels.forEach(({ v, label }) => {
      const y = padding.top + chartH - ((v - yMin) / (yMax - yMin)) * chartH
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + chartW, y)
      ctx.strokeStyle = '#E2E8F0'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillText(label, padding.left - 8, y)
    })

    // 数据点坐标
    const points = moodTrend.map((d, i) => {
      const x = padding.left + (chartW / (moodTrend.length - 1)) * i
      const y = d.value != null
        ? padding.top + chartH - ((d.value - yMin) / (yMax - yMin)) * chartH
        : null
      return { ...d, x, y }
    })

    // 画折线（仅连接有值的点）
    const validPoints = points.filter(p => p.y != null)
    if (validPoints.length > 1) {
      ctx.beginPath()
      validPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      })
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // 画数据点
    points.forEach(p => {
      if (p.y == null) return
      const color = MOOD_MAP[p.mood]?.color || '#3B82F6'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // X 轴标签（间隔显示）
    ctx.fillStyle = '#64748B'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = '11px sans-serif'
    points.forEach((p, i) => {
      if (i % 2 === 0 || i === points.length - 1) {
        ctx.fillText(p.label, p.x, padding.top + chartH + 8)
      }
    })

    // X 轴底线
    ctx.strokeStyle = '#CBD5E1'
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top + chartH)
    ctx.lineTo(padding.left + chartW, padding.top + chartH)
    ctx.stroke()
  }, [moodTrend])

  return (
    <div>
      <div className="page-title">备考心情</div>
      <div className="page-subtitle">记录每日备考心态,缓解焦虑,看见自己的情绪起伏</div>

      {msg && <div className="alert alert-info">{msg}</div>}

      {/* 随机鼓励语录 */}
      <div className="card mood-quote-card">
        <div className="mood-quote-text">「{quote}」</div>
        <button className="btn btn-secondary btn-sm" onClick={refreshQuote}>
          换一句
        </button>
      </div>

      {/* 今日心情记录 */}
      <div className="card">
        <div className="card-title">
          <span>记录今日心情</span>
          <span className="tag tag-info">{user ? `已登录 · ${user.email}` : '本地模式'}</span>
        </div>

        <div className="mood-picker">
          {MOOD_OPTIONS.map(opt => (
            <button
              key={opt.key}
              className={`mood-opt${selectedMood === opt.key ? ' active' : ''}`}
              onClick={() => setSelectedMood(opt.key)}
              style={{ borderColor: selectedMood === opt.key ? opt.color : undefined }}
            >
              <span className="mood-emoji">{opt.emoji}</span>
              <span className="mood-label">{opt.label}</span>
            </button>
          ))}
        </div>

        <div className="form-group" style={{ marginTop: 16 }}>
          <label className="form-label">今日备考想法(选填)</label>
          <textarea
            className="form-textarea"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="写下此刻的感受、压力、或者想对自己说的话..."
            rows={4}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSubmit}>保存心情记录</button>
        </div>
      </div>

      {/* 情绪变化折线图 */}
      <div className="card">
        <div className="card-title">
          <span>近 14 天情绪变化</span>
          <span className="tag tag-info">原生 Canvas 绘制</span>
        </div>
        <div className="chart-wrap">
          <canvas ref={canvasRef} className="bar-chart" />
        </div>
        {moods.length === 0 && (
          <div className="empty">还没有心情记录,记录第一条即可看到情绪曲线</div>
        )}
      </div>

      {/* 历史记录 */}
      <div className="card">
        <div className="card-title">
          <span>心情历史记录</span>
          <span className="tag tag-info">共 {moods.length} 条</span>
        </div>
        {moods.length === 0 ? (
          <div className="empty">还没有心情记录</div>
        ) : (
          moods.map(m => {
            const opt = MOOD_MAP[m.mood]
            return (
              <div key={m.id} className="mood-record">
                <div className="mood-record-left">
                  <span className="mood-emoji-lg">{opt?.emoji}</span>
                  <div>
                    <div className="mood-record-mood" style={{ color: opt?.color }}>
                      {opt?.label}
                    </div>
                    {m.note && <div className="mood-record-note">{m.note}</div>}
                    <div className="mood-record-time">
                      {new Date(m.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
                <button
                  className="icon-btn danger"
                  onClick={() => deleteMood(m.id)}
                >
                  删除
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

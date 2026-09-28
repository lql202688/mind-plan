import React, { useEffect, useMemo, useRef } from 'react'
import { useApp, MOOD_MAP } from '../state/AppContext.jsx'

// ============ StatsPage 进度统计 ============
// 读取全局任务数据；原生 Canvas 绘制蓝色平滑折线图展示每周学习时长
export default function StatsPage() {
  const { tasks, moods } = useApp()
  const canvasRef = useRef(null)
  const moodCanvasRef = useRef(null)

  // 任务统计
  const stats = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter(t => t.completed).length
    const incomplete = total - completed
    const totalMinutes = tasks.reduce((s, t) => s + (Number(t.estimatedMinutes) || 0), 0)
    return { total, completed, incomplete, totalMinutes, totalHours: (totalMinutes / 60).toFixed(1) }
  }, [tasks])

  // 固定 4 个周节点(周一):8/31、9/7、9/14、9/21,按任务创建日期归类到所在周
  const weeklyData = useMemo(() => {
    const year = new Date().getFullYear()
    const weekStarts = [
      new Date(year, 7, 31),  // 8/31 周一
      new Date(year, 8, 7),   // 9/7 周一
      new Date(year, 8, 14),  // 9/14 周一
      new Date(year, 8, 21)   // 9/21 周一
    ]
    return weekStarts.map((start) => {
      const end = new Date(start)
      end.setDate(start.getDate() + 6) // 周日结束
      end.setHours(23, 59, 59, 999)

      const minutes = tasks
        .filter(t => {
          const created = new Date(t.createdAt)
          return created >= start && created <= end
        })
        .reduce((s, t) => s + (Number(t.estimatedMinutes) || 0), 0)

      return {
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        minutes
      }
    })
  }, [tasks])

  // Canvas 绘制蓝色平滑折线图
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    // 高分屏适配
    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.clientWidth || 720
    const cssH = 260
    canvas.width = cssW * dpr
    canvas.height = cssH * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    // 顶部预留数值标签空间
    const padding = { top: 34, right: 24, bottom: 40, left: 50 }
    const chartW = cssW - padding.left - padding.right
    const chartH = cssH - padding.top - padding.bottom
    const maxVal = Math.max(60, ...weeklyData.map(w => w.minutes))
    // Y 轴单位转换：分钟 -> 小时
    const maxHours = Math.ceil(maxVal / 60) || 1

    // 绘制 Y 轴网格与刻度
    ctx.fillStyle = '#64748B'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    const gridLines = 4
    for (let i = 0; i <= gridLines; i++) {
      const y = padding.top + (chartH * i) / gridLines
      ctx.beginPath()
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + chartW, y)
      ctx.lineWidth = 1
      ctx.strokeStyle = '#E2E8F0'
      ctx.stroke()
      const valHours = ((maxHours * (gridLines - i)) / gridLines).toFixed(1)
      ctx.fillText(`${valHours}h`, padding.left - 8, y)
    }

    // 数据点坐标
    const stepX = chartW / (weeklyData.length - 1)
    const points = weeklyData.map((w, i) => ({
      x: padding.left + stepX * i,
      y: padding.top + chartH - (w.minutes / maxVal) * chartH,
      data: w
    }))

    // 折线下方极淡蓝色填充区域
    if (points.length > 1) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, padding.top + chartH)
      ctx.lineTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const cur = points[i]
        const midX = (prev.x + cur.x) / 2
        ctx.quadraticCurveTo(prev.x, prev.y, midX, (prev.y + cur.y) / 2)
      }
      const last = points[points.length - 1]
      ctx.lineTo(last.x, last.y)
      ctx.lineTo(last.x, padding.top + chartH)
      ctx.closePath()
      const areaGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH)
      areaGrad.addColorStop(0, 'rgba(59, 130, 246, 0.16)')
      areaGrad.addColorStop(1, 'rgba(59, 130, 246, 0.01)')
      ctx.fillStyle = areaGrad
      ctx.fill()
    }

    // 蓝色平滑曲线(中点二次贝塞尔)
    if (points.length > 1) {
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1]
        const cur = points[i]
        const midX = (prev.x + cur.x) / 2
        ctx.quadraticCurveTo(prev.x, prev.y, midX, (prev.y + cur.y) / 2)
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y)
      ctx.strokeStyle = '#3B82F6'
      ctx.lineWidth = 2.5
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke()
    }

    // 实心圆点 + 数值标签 + X 轴标签
    points.forEach((p) => {
      // 实心圆点(蓝色填充,白色描边)
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
      ctx.fillStyle = '#3B82F6'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = '#FFFFFF'
      ctx.stroke()

      // 点上方时长数值
      const hours = (p.data.minutes / 60).toFixed(1)
      ctx.fillStyle = '#1E293B'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.font = '600 12px sans-serif'
      ctx.fillText(`${hours}h`, p.x, p.y - 10)

      // X 轴标签
      ctx.fillStyle = '#64748B'
      ctx.textBaseline = 'top'
      ctx.font = '12px sans-serif'
      ctx.fillText(p.data.label, p.x, padding.top + chartH + 8)
    })

    // X 轴底线
    ctx.strokeStyle = '#CBD5E1'
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top + chartH)
    ctx.lineTo(padding.left + chartW, padding.top + chartH)
    ctx.stroke()
  }, [weeklyData])

  // 最近 14 天情绪趋势数据
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
    const canvas = moodCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.clientWidth || 720
    const cssH = 240
    canvas.width = cssW * dpr
    canvas.height = cssH * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    const padding = { top: 20, right: 20, bottom: 40, left: 50 }
    const chartW = cssW - padding.left - padding.right
    const chartH = cssH - padding.top - padding.bottom
    const yMin = 1
    const yMax = 4

    // Y 轴刻度
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

    // 数据点
    const points = moodTrend.map((d, i) => {
      const x = padding.left + (chartW / (moodTrend.length - 1)) * i
      const y = d.value != null
        ? padding.top + chartH - ((d.value - yMin) / (yMax - yMin)) * chartH
        : null
      return { ...d, x, y }
    })

    // 折线
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

    // 数据点
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

    // X 轴标签
    ctx.fillStyle = '#64748B'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.font = '11px sans-serif'
    points.forEach((p, i) => {
      if (i % 2 === 0 || i === points.length - 1) {
        ctx.fillText(p.label, p.x, padding.top + chartH + 8)
      }
    })

    ctx.strokeStyle = '#CBD5E1'
    ctx.beginPath()
    ctx.moveTo(padding.left, padding.top + chartH)
    ctx.lineTo(padding.left + chartW, padding.top + chartH)
    ctx.stroke()
  }, [moodTrend])

  return (
    <div>
      <div className="page-title">进度统计</div>
      <div className="page-subtitle">基于全局任务数据汇总学习时长，原生 Canvas 绘制蓝色平滑折线图</div>

      {/* 统计数字块 */}
      <div className="stat-grid">
        <div className="stat-block">
          <div className="num">{stats.total}</div>
          <div className="label">总任务数量</div>
        </div>
        <div className="stat-block">
          <div className="num" style={{ color: '#10B981' }}>{stats.completed}</div>
          <div className="label">已完成任务</div>
        </div>
        <div className="stat-block">
          <div className="num" style={{ color: '#F59E0B' }}>{stats.incomplete}</div>
          <div className="label">未完成任务</div>
        </div>
        <div className="stat-block">
          <div className="num" style={{ color: '#3B82F6' }}>{stats.totalHours}h</div>
          <div className="label">累计学习时长</div>
        </div>
      </div>

      {/* 学习时长折线图 */}
      <div className="card">
        <div className="card-title">
          <span>近 4 周学习时长</span>
          <span className="tag tag-info">原生Canvas绘制（折线图）</span>
        </div>
        <div className="chart-wrap">
          <canvas ref={canvasRef} className="bar-chart" />
        </div>
        {weeklyData.every(w => w.minutes === 0) && (
          <div className="empty">暂无学习时长数据，添加任务后即可统计</div>
        )}
      </div>

      {/* 情绪折线图 */}
      <div className="card">
        <div className="card-title">
          <span>近 14 天备考心情变化</span>
          <span className="tag tag-info">原生 Canvas 绘制</span>
        </div>
        <div className="chart-wrap">
          <canvas ref={moodCanvasRef} className="bar-chart" />
        </div>
        {moods.length === 0 && (
          <div className="empty">暂无心情数据,在「备考心情」页面记录后即可查看趋势</div>
        )}
      </div>
    </div>
  )
}

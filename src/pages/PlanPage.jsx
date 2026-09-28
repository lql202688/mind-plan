import React, { useState } from 'react'
import { useApp, SCHEDULE_INTENSITY_OPTIONS } from '../state/AppContext.jsx'

// ============ 内置 AI 推理引擎(纯前端模拟) ============
// 根据考试名称动态分析知识板块,生成复习分段标题
// 不硬编码具体章节词库,仅按学科维度匹配通用复习技能
function aiAnalyzeExamSections(examName) {
  const n = examName.toLowerCase()

  // 学科画像:仅用于匹配通用复习技能维度,不是章节标题词库
  const subjectProfiles = [
    {
      match: (s) => /英语|英文|四级|六级|cet|雅思|托福|外语/.test(s),
      skills: ['听力训练', '阅读突破', '写作模板', '翻译技巧', '词汇速记', '语法梳理']
    },
    {
      match: (s) => /数学|高数|微积分|线代|概率|统计/.test(s),
      skills: ['概念梳理', '公式推导', '题型训练', '错题复盘', '真题演练']
    },
    {
      match: (s) => /计算机|编程|算法|数据结构|操作系统|网络|数据库|c\+\+|python|java/.test(s),
      skills: ['概念原理', '算法分析', '代码实现', '复杂度优化', '真题实战']
    },
    {
      match: (s) => /物理|化学|生物/.test(s),
      skills: ['概念理解', '公式应用', '实验分析', '题型训练', '错题整理']
    },
    {
      match: (s) => /政治|历史|地理|语文|文学/.test(s),
      skills: ['知识框架', '重点背诵', '真题分析', '答题模板', '素材积累']
    }
  ]

  // 默认通用复习维度(适配任何未识别学科)
  const defaultSkills = ['基础巩固', '核心考点', '专项突破', '真题演练', '查漏补缺', '模拟冲刺']

  const profile = subjectProfiles.find((p) => p.match(n))
  const skills = profile ? profile.skills : defaultSkills

  // 动态生成本次备考对应的复习板块标题
  return skills.map((skill) => `${examName} - ${skill}`)
}

// ============ PlanPage 备考规划 ============
// 录入考试 + AI 简易排程(动态生成复习任务) + DDL 压力预警
export default function PlanPage() {
  const { exams, addExam, deleteExam, addTasks, preferences } = useApp()
  const intensity = SCHEDULE_INTENSITY_OPTIONS.find(o => o.key === preferences.scheduleIntensity)
    || SCHEDULE_INTENSITY_OPTIONS[1]
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [alertMsg, setAlertMsg] = useState('')
  const [alertType, setAlertType] = useState('') // 'warn' | 'info' | 'success' | 'danger'
  const [generating, setGenerating] = useState(null) // 正在生成计划的 exam id

  // 计算剩余天数
  const daysLeft = (examDateStr) => {
    const exam = new Date(examDateStr)
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    exam.setHours(0, 0, 0, 0)
    return Math.ceil((exam - now) / (1000 * 60 * 60 * 24))
  }

  // 保存考试
  const handleAddExam = () => {
    if (!name.trim() || !date) return
    addExam({ name: name.trim(), date: new Date(date).toISOString() })
    setName('')
    setDate('')
    setAlertType('info')
    setAlertMsg('考试已保存,点击「AI 简易排程」可一键生成复习任务')
    setTimeout(() => setAlertMsg(''), 4000)
  }

  // AI 简易排程:读取考试名称,由内置模型分析板块并批量生成复习任务
  const handleGeneratePlan = (exam) => {
    const days = daysLeft(exam.date)
    if (days <= 0) {
      setAlertType('danger')
      setAlertMsg(`「${exam.name}」已结束或就在今日,无法生成复习计划`)
      return
    }

    setGenerating(exam.id)
    setAlertType('info')
    setAlertMsg(`AI 正在分析「${exam.name}」的知识板块,请稍候...`)

    // 模拟模型推理延迟(前端模拟,真实场景由本地大模型完成)
    setTimeout(() => {
      try {
        // 由内置模型动态生成复习板块标题
        const sections = aiAnalyzeExamSections(exam.name)

        // 根据剩余天数 + 用户设置的排程强度档位控制任务总量
        const maxTasks = Math.min(Math.max(days, 3), intensity.taskCap)
        // 板块数量不足时循环生成多轮强化任务
        const picked = []
        for (let i = 0; i < maxTasks; i++) {
          const round = Math.floor(i / sections.length)
          const base = sections[i % sections.length]
          picked.push(round === 0 ? base : `${base}(第${round + 1}轮强化)`)
        }
        const totalTasks = picked.length

        // 任务分配参数
        const tasksPerDay = Math.ceil(totalTasks / days)
        const newTasks = picked.map((sectionTitle, i) => {
          const dayOffset = Math.floor(i / tasksPerDay) + 1
          const due = new Date()
          due.setDate(due.getDate() + Math.min(dayOffset, days))
          due.setHours(20, 0, 0, 0)
          return {
            name: sectionTitle,
            estimatedMinutes: 45 + Math.floor(Math.random() * 45), // 45-90 分钟
            priority: days <= 7 ? 'high' : days <= 14 ? 'mid' : 'low',
            deadline: due.toISOString()
          }
        })

        addTasks(newTasks)

        // DDL 压力预警
        if (days <= 7 && totalTasks >= 8) {
          setAlertType('warn')
          setAlertMsg(
            `DDL 压力预警:「${exam.name}」仅剩 ${days} 天,已生成 ${totalTasks} 项复习任务,` +
            `任务总量较大,建议每日加大学习强度。`
          )
        } else {
          setAlertType('success')
          setAlertMsg(
            `AI 已按「${intensity.label}」强度为「${exam.name}」分析出 ${totalTasks} 个复习任务,` +
            `剩余 ${days} 天,建议每日完成 ${tasksPerDay} 项。可在首页仪表盘查看。`
          )
        }
      } catch (e) {
        setAlertType('danger')
        setAlertMsg(`AI 排程失败:${e?.message || e}`)
      } finally {
        setGenerating(null)
        setTimeout(() => setAlertMsg(''), 5000)
      }
    }, 900)
  }

  return (
    <div>
      <div className="page-title">备考规划</div>
      <div className="page-subtitle">录入考试信息,AI 简易排程自动分析知识板块并生成复习任务</div>

      {alertMsg && <div className={`alert alert-${alertType}`}>{alertMsg}</div>}

      {/* 录入考试 */}
      <div className="card">
        <div className="card-title">
          <span>新增考试</span>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">考试名称</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如:英语四级 / 高等数学期末考试"
            />
          </div>
          <div className="form-group">
            <label className="form-label">考试日期</label>
            <input
              type="date"
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleAddExam}>保存考试</button>
        </div>
      </div>

      {/* 考试列表 */}
      <div className="card">
        <div className="card-title">
          <span>考试列表与 AI 排程</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="tag tag-mid">排程强度 · {intensity.label}</span>
            <span className="tag tag-info">共 {exams.length} 场</span>
          </div>
        </div>
        {exams.length === 0 ? (
          <div className="empty">还没有录入考试,先在上方添加一场考试</div>
        ) : (
          exams.map((exam) => {
            const days = daysLeft(exam.date)
            const isGenerating = generating === exam.id
            return (
              <div key={exam.id} className="task-item" style={{ marginBottom: 12 }}>
                <div className="task-main">
                  <div className="task-name">{exam.name}</div>
                  <div className="task-meta">
                    <span className="tag tag-info">
                      考试日期 {new Date(exam.date).toLocaleDateString('zh-CN')}
                    </span>
                    <span className={`tag ${days <= 7 ? 'tag-high' : days <= 14 ? 'tag-mid' : 'tag-low'}`}>
                      剩余 {days > 0 ? days : 0} 天
                    </span>
                  </div>
                </div>
                <div className="task-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleGeneratePlan(exam)}
                    disabled={days <= 0 || isGenerating}
                  >
                    {isGenerating ? 'AI 排程中...' : 'AI 简易排程'}
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() => deleteExam(exam.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

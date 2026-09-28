import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react'

// ============ 全局状态上下文 ============
// 统一管理任务、笔记、考试、心情、AI 模式；localStorage 持久化（try-catch 容错）
// 存储层抽象：本地模式走 localStorage；后续接入 Supabase 时替换 syncToCloud 即可

const STORAGE_KEY = 'mindplan_state_v1'
export { STORAGE_KEY }

const AppContext = createContext(null)

// 默认学习偏好
const defaultPreferences = {
  scheduleIntensity: 'normal', // 'loose'(宽松) | 'normal'(适中) | 'high'(高强度)
  reviewBacklogThreshold: 8,   // 复习堆积提醒阈值: 5 | 8 | 12
  floatingCatEnabled: true     // 悬浮笔记小精灵开关
}

// 默认状态
const defaultState = {
  tasks: [],      // { id, name, estimatedMinutes, priority(high/mid/low), deadline, completed, createdAt, isReview }
  notes: [],      // { id, title, body, createdAt, source(text/ocr/quick) }
  exams: [],      // { id, name, date, createdAt }
  moods: [],      // { id, mood(anxious/tired/calm/energetic), note, createdAt, userId }
  user: null,     // { id, email } 预留 Supabase 登录用户，本地模式为 null
  preferences: defaultPreferences, // 学习偏好配置
  aiMode: 'local', // 'local'(本地模型推理) | 'rule'(降级规则引擎)
  modelLoadProgress: 0
}

// ============ localStorage 读写工具 ============
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw)
    return {
      ...defaultState,
      ...parsed,
      // 兼容缺失字段
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      notes: Array.isArray(parsed.notes) ? parsed.notes : [],
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
      moods: Array.isArray(parsed.moods) ? parsed.moods : [],
      user: parsed.user || null,
      preferences: { ...defaultPreferences, ...(parsed.preferences || {}) }
    }
  } catch (err) {
    console.warn('读取本地状态失败，使用默认状态:', err)
    return defaultState
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('写入本地状态失败:', err)
  }
}

// ============ ID 生成 ============
function genId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ============ Reducer ============
function reducer(state, action) {
  switch (action.type) {
    case 'ADD_TASK': {
      return { ...state, tasks: [...state.tasks, action.payload] }
    }
    case 'ADD_TASKS': {
      return { ...state, tasks: [...state.tasks, ...action.payload] }
    }
    case 'TOGGLE_TASK': {
      return {
        ...state,
        tasks: state.tasks.map(t =>
          t.id === action.payload ? { ...t, completed: !t.completed } : t
        )
      }
    }
    case 'DELETE_TASK': {
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) }
    }
    case 'CLEAR_TASKS': {
      return { ...state, tasks: [] }
    }
    case 'ADD_NOTE': {
      return { ...state, notes: [action.payload, ...state.notes] }
    }
    case 'DELETE_NOTE': {
      return { ...state, notes: state.notes.filter(n => n.id !== action.payload) }
    }
    case 'ADD_EXAM': {
      return { ...state, exams: [...state.exams, action.payload] }
    }
    case 'DELETE_EXAM': {
      return { ...state, exams: state.exams.filter(e => e.id !== action.payload) }
    }
    case 'SET_AI_MODE': {
      return { ...state, aiMode: action.payload }
    }
    case 'SET_MODEL_PROGRESS': {
      return { ...state, modelLoadProgress: action.payload }
    }
    case 'ADD_MOOD': {
      return { ...state, moods: [action.payload, ...state.moods] }
    }
    case 'DELETE_MOOD': {
      return { ...state, moods: state.moods.filter(m => m.id !== action.payload) }
    }
    case 'SET_USER': {
      return { ...state, user: action.payload }
    }
    case 'SET_PREFERENCE': {
      return {
        ...state,
        preferences: { ...state.preferences, [action.payload.key]: action.payload.value }
      }
    }
    case 'IMPORT_DATA': {
      // 用备份覆盖任务、笔记、考试;其余配置保留
      const { tasks, notes, exams } = action.payload
      return {
        ...state,
        tasks: Array.isArray(tasks) ? tasks : state.tasks,
        notes: Array.isArray(notes) ? notes : state.notes,
        exams: Array.isArray(exams) ? exams : state.exams
      }
    }
    case 'RESET_ALL': {
      return { ...defaultState, preferences: { ...defaultPreferences } }
    }
    default:
      return state
  }
}

// ============ Provider ============
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  // 状态变化自动持久化
  useEffect(() => {
    saveState(state)
  }, [state])

  // 封装常用动作
  const addTask = useCallback((task) => {
    dispatch({
      type: 'ADD_TASK',
      payload: {
        id: genId('task'),
        completed: false,
        createdAt: new Date().toISOString(),
        isReview: false,
        ...task
      }
    })
  }, [])

  const addTasks = useCallback((tasks) => {
    dispatch({
      type: 'ADD_TASKS',
      payload: tasks.map((t, i) => ({
        id: genId('task'),
        completed: false,
        createdAt: new Date().toISOString(),
        isReview: true,
        ...t
      }))
    })
  }, [])

  const toggleTask = useCallback((id) => {
    dispatch({ type: 'TOGGLE_TASK', payload: id })
  }, [])

  const deleteTask = useCallback((id) => {
    dispatch({ type: 'DELETE_TASK', payload: id })
  }, [])

  const addNote = useCallback((note) => {
    dispatch({
      type: 'ADD_NOTE',
      payload: {
        id: genId('note'),
        createdAt: new Date().toISOString(),
        source: 'text',
        ...note
      }
    })
  }, [])

  const deleteNote = useCallback((id) => {
    dispatch({ type: 'DELETE_NOTE', payload: id })
  }, [])

  const addExam = useCallback((exam) => {
    dispatch({
      type: 'ADD_EXAM',
      payload: {
        id: genId('exam'),
        createdAt: new Date().toISOString(),
        ...exam
      }
    })
  }, [])

  const deleteExam = useCallback((id) => {
    dispatch({ type: 'DELETE_EXAM', payload: id })
  }, [])

  const setAiMode = useCallback((mode) => {
    dispatch({ type: 'SET_AI_MODE', payload: mode })
  }, [])

  const setModelProgress = useCallback((p) => {
    dispatch({ type: 'SET_MODEL_PROGRESS', payload: p })
  }, [])

  const addMood = useCallback((mood) => {
    dispatch({
      type: 'ADD_MOOD',
      payload: {
        id: genId('mood'),
        createdAt: new Date().toISOString(),
        userId: state.user?.id || null, // 绑定登录用户；本地模式为 null
        ...mood
      }
    })
  }, [state.user])

  const deleteMood = useCallback((id) => {
    dispatch({ type: 'DELETE_MOOD', payload: id })
  }, [])

  const setUser = useCallback((user) => {
    dispatch({ type: 'SET_USER', payload: user })
  }, [])

  const setPreference = useCallback((key, value) => {
    dispatch({ type: 'SET_PREFERENCE', payload: { key, value } })
  }, [])

  const importData = useCallback((data) => {
    dispatch({ type: 'IMPORT_DATA', payload: data })
  }, [])

  // 导出备份数据(任务、笔记、考试)
  const exportData = useCallback(() => ({
    app: 'MindPlan',
    version: 'MindPlan-V1.0',
    exportedAt: new Date().toISOString(),
    tasks: state.tasks,
    notes: state.notes,
    exams: state.exams
  }), [state.tasks, state.notes, state.exams])

  const resetAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.warn('清空 localStorage 失败:', err)
    }
    dispatch({ type: 'RESET_ALL' })
  }, [])

  // AI 简易排程（规则引擎）：将今日未完成任务按优先级与截止时间排序
  const aiSchedule = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10)
    const pending = state.tasks.filter(t => !t.completed)
    const priorityWeight = { high: 0, mid: 1, low: 2 }
    const sorted = [...pending].sort((a, b) => {
      // 今日任务排前面
      const aToday = (a.deadline || '').slice(0, 10) === today ? 0 : 1
      const bToday = (b.deadline || '').slice(0, 10) === today ? 0 : 1
      if (aToday !== bToday) return aToday - bToday
      // 优先级高排前
      const pa = priorityWeight[a.priority] ?? 1
      const pb = priorityWeight[b.priority] ?? 1
      if (pa !== pb) return pa - pb
      // 截止时间早排前
      return (a.deadline || '').localeCompare(b.deadline || '')
    })
    return sorted
  }, [state.tasks])

  const value = {
    ...state,
    addTask,
    addTasks,
    toggleTask,
    deleteTask,
    addNote,
    deleteNote,
    addExam,
    deleteExam,
    setAiMode,
    setModelProgress,
    addMood,
    deleteMood,
    setUser,
    setPreference,
    importData,
    exportData,
    resetAll,
    aiSchedule
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// ============ Hook ============
export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) {
    throw new Error('useApp 必须在 AppProvider 内使用')
  }
  return ctx
}

// 工具函数导出：今日任务过滤、优先级中文映射
export function isToday(dateStr) {
  if (!dateStr) return false
  return dateStr.slice(0, 10) === new Date().toISOString().slice(0, 10)
}

export const PRIORITY_LABEL = { high: '高优先级', mid: '中优先级', low: '低优先级' }
export const PRIORITY_TAG = { high: 'tag-high', mid: 'tag-mid', low: 'tag-low' }

// ============ 学习偏好配置项 ============
// AI 排程强度:控制自动生成复习任务的数量上限
export const SCHEDULE_INTENSITY_OPTIONS = [
  { key: 'loose', label: '宽松', taskCap: 5, desc: '任务量少,节奏舒缓' },
  { key: 'normal', label: '适中', taskCap: 9, desc: '均衡推进,稳步备考' },
  { key: 'high', label: '高强度', taskCap: 14, desc: '任务密集,冲刺提分' }
]

export const REVIEW_THRESHOLD_OPTIONS = [5, 8, 12]

// ============ 备考心情配置 ============
// 四种情绪：焦虑、疲惫、心态平稳、干劲十足
// value 用于折线图数值化展示（1-4）
export const MOOD_OPTIONS = [
  { key: 'anxious', label: '焦虑', emoji: '😰', value: 1, color: '#EF4444' },
  { key: 'tired', label: '疲惫', emoji: '😴', value: 2, color: '#F59E0B' },
  { key: 'calm', label: '心态平稳', emoji: '😌', value: 3, color: '#10B981' },
  { key: 'energetic', label: '干劲十足', emoji: '💪', value: 4, color: '#3B82F6' }
]

export const MOOD_MAP = MOOD_OPTIONS.reduce((acc, m) => {
  acc[m.key] = m
  return acc
}, {})

// 备考鼓励语录库
export const MOOD_QUOTES = [
  '备考的路虽长,但每一步都算数,你已经比昨天更强了。',
  '焦虑只是大脑在提醒你重视这件事,深呼吸,继续前进。',
  '累了就休息,但不要放弃,山顶的风景值得现在的坚持。',
  '你不需要和别人比节奏,按自己的步调稳稳走就好。',
  '今天的努力,是考场上从容的底气。',
  '把大目标拆成小任务,完成一个就离上岸近一步。',
  '备考不是百米冲刺,是马拉松,稳住心态最重要。',
  '你已经坚持到现在了,这本身就是一种胜利。',
  '错题不是失败,是帮你找到提分空间的路标。',
  '相信自己,你付出的每一分努力都不会被辜负。',
  '暂时的低谷是反弹前的蓄力,加油。',
  '保持节奏,保持睡眠,保持信心,你可以的。'
]

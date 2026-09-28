import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'

// ============ FloatingCat 悬浮笔记小精灵(便签纸形象) ============
// 全局固定悬浮于右下角,每个页面都显示(AppShell 挂载)
// 功能:待机呼吸浮动 + 眨眼 + 星星闪烁;可轻微拖动;点击滑出快速笔记面板
// 保存对接全局 addNote;成功后播放开心摇晃动画(弯眼笑)+ toast
// 纯 SVG + CSS 动画,轻量无依赖;后续闪卡/番茄钟可与之共存

const QUICK_TAGS = [
  { key: 'word', label: '生词' },
  { key: 'idea', label: '灵感' },
  { key: 'point', label: '知识点' },
  { key: 'todo', label: '待办' }
]

const CAT_W = 74
const CAT_H = 68
const DRAG_THRESHOLD = 6 // 小于该位移视为点击

export default function FloatingCat() {
  const { addNote } = useApp()

  const [panelOpen, setPanelOpen] = useState(false)
  const [text, setText] = useState('')
  const [tag, setTag] = useState('point')
  const [happy, setHappy] = useState(false)
  const [toast, setToast] = useState(false)
  const [pos, setPos] = useState(null) // null = CSS 默认右下角;{x, y} = 拖动后位置
  const [isDragging, setIsDragging] = useState(false)

  const dragRef = useRef({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 })
  const catInnerRef = useRef(null)
  const happyTimer = useRef(null)
  const happyStartTimer = useRef(null)
  const toastTimer = useRef(null)

  useEffect(() => () => {
    clearTimeout(happyTimer.current)
    clearTimeout(happyStartTimer.current)
    clearTimeout(toastTimer.current)
  }, [])

  // ============ 拖拽(Pointer Events,兼容鼠标/触摸) ============
  // pointerdown 后在 window 上监听 move/up,保证移出元素也能继续拖拽
  const onPointerDown = (e) => {
    // 面板打开时点击猫由 click 语义处理,不启动拖拽阻断
    const rect = e.currentTarget.getBoundingClientRect()
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      originX: rect.left,
      originY: rect.top
    }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (_) { /* 部分环境合成事件不支持捕获,忽略 */ }

    const onMove = (ev) => {
      const d = dragRef.current
      if (!d.active) return
      const dx = ev.clientX - d.startX
      const dy = ev.clientY - d.startY
      if (!d.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        d.moved = true
        setIsDragging(true)
      }
      if (d.moved) {
        const maxX = window.innerWidth - CAT_W
        const maxY = window.innerHeight - CAT_H
        setPos({
          x: Math.min(Math.max(d.originX + dx, 8), maxX - 8),
          y: Math.min(Math.max(d.originY + dy, 8), maxY - 8)
        })
      }
    }

    const onUp = () => {
      const d = dragRef.current
      const wasClick = d.active && !d.moved
      d.active = false
      d.moved = false
      setIsDragging(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      // 未发生拖动 → 视为点击,切换面板
      if (wasClick) setPanelOpen(open => !open)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // ============ 保存快速笔记 ============
  const handleSave = useCallback(() => {
    const content = text.trim()
    if (!content) return
    const tagLabel = QUICK_TAGS.find(t => t.key === tag)?.label || '知识点'
    const title = `[${tagLabel}] ${content.slice(0, 20)}`
    addNote({ title, body: content, source: 'quick', tag: tagLabel })
    setText('')
    setPanelOpen(false)

    // 开心摇晃动画:setTimeout 触发(后台标签页 rAF 会被暂停,setTimeout 仍可运行)
    // 强制重流保证连续保存时动画能重新播放
    clearTimeout(happyStartTimer.current)
    clearTimeout(happyTimer.current)
    setHappy(false)
    catInnerRef.current?.classList.remove('fc-happy')
    happyStartTimer.current = setTimeout(() => {
      setHappy(true)
      const node = catInnerRef.current
      if (node) {
        void node.offsetWidth // 强制重流,重启 CSS 动画
        node.classList.add('fc-happy')
      }
    }, 30)
    happyTimer.current = setTimeout(() => {
      setHappy(false)
      catInnerRef.current?.classList.remove('fc-happy')
    }, 900)

    // toast 提示
    setToast(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(false), 2200)
  }, [text, tag, addNote])

  const closePanel = () => setPanelOpen(false)

  // ESC 关闭面板
  useEffect(() => {
    if (!panelOpen) return
    const onKey = (e) => { if (e.key === 'Escape') closePanel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen])

  const catStyle = pos
    ? { left: pos.x, top: pos.y, right: 'auto', bottom: 'auto' }
    : undefined

  return (
    <>
      {/* 遮罩:面板打开时点击空白处收起 */}
      {panelOpen && <div className="fc-overlay" onClick={closePanel} />}

      {/* 便签纸小精灵本体 */}
      <div
        className={`fc-cat-wrap${isDragging ? ' fc-dragging' : ''}`}
        style={catStyle}
        onPointerDown={onPointerDown}
        role="button"
        aria-label="快速笔记小精灵"
        title="点击记录快速笔记,可拖动"
      >
        <div className="fc-cat" ref={catInnerRef}>
          <CatSvg happy={happy} />
        </div>
      </div>

      {/* 右侧快速笔记面板 */}
      <aside className={`fc-panel${panelOpen ? ' open' : ''}`} aria-hidden={!panelOpen}>
        <div className="fc-panel-header">
          <span className="fc-panel-title">快速笔记</span>
          <button className="fc-close" onClick={closePanel} aria-label="关闭">×</button>
        </div>

        <div className="fc-panel-body">
          <textarea
            className="form-textarea fc-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="随手记下临时想法、生词、备考知识点..."
            rows={5}
            autoFocus={panelOpen}
          />

          <div className="fc-tags">
            {QUICK_TAGS.map(t => (
              <button
                key={t.key}
                className={`fc-tag${tag === t.key ? ' active' : ''}`}
                onClick={() => setTag(t.key)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-primary fc-save"
            onClick={handleSave}
            disabled={!text.trim()}
          >
            保存笔记
          </button>
          <div className="fc-hint">保存后可在「笔记管理」中查看完整内容</div>
        </div>
      </aside>

      {/* Toast */}
      <div className={`fc-toast${toast ? ' show' : ''}`}>快速笔记保存成功!</div>
    </>
  )
}

// ============ 便签纸小精灵 SVG(奶油黄便签 + 薄荷绿四肢 + 铅笔) ============
function CatSvg({ happy }) {
  return (
    <svg viewBox="0 0 126 106" width="74" height="68" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fc-note-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FEFCE8" />
          <stop offset="1" stopColor="#FDE68A" />
        </linearGradient>
      </defs>

      {/* 左侧小星星(缓慢闪烁) */}
      <path
        className="fc-sparkle"
        d="M15 21 L17 25.5 L21.5 27.5 L17 29.5 L15 34 L13 29.5 L8.5 27.5 L13 25.5 Z"
        fill="#FDE047"
      />

      {/* 后层浅绿便签 */}
      <rect x="31" y="29" width="64" height="60" rx="10" fill="#BDEBD8" />

      {/* 左腿 + 脚 */}
      <path d="M53 85 Q49 92 47 96" fill="none" stroke="#5FD1B0" strokeWidth="4.5" strokeLinecap="round" />
      <ellipse cx="45.5" cy="99.5" rx="5.8" ry="4.6" fill="#8CE3C4" stroke="#52C9A6" strokeWidth="1.2" />
      {/* 右腿 + 脚 */}
      <path d="M69 85 Q73 92 75 96" fill="none" stroke="#5FD1B0" strokeWidth="4.5" strokeLinecap="round" />
      <ellipse cx="76.5" cy="99.5" rx="5.8" ry="4.6" fill="#8CE3C4" stroke="#52C9A6" strokeWidth="1.2" />

      {/* 左胳膊 + 三瓣小手 */}
      <path d="M27 58 Q20 56 15 47" fill="none" stroke="#5FD1B0" strokeWidth="4.5" strokeLinecap="round" />
      <g fill="#8CE3C4" stroke="#52C9A6" strokeWidth="1.1">
        <circle cx="13" cy="44" r="4.6" />
        <circle cx="9.2" cy="40.5" r="2.7" />
        <circle cx="13" cy="38" r="2.7" />
        <circle cx="16.8" cy="40.5" r="2.7" />
      </g>

      {/* 右胳膊(高举握铅笔) */}
      <path d="M93 56 Q101 52 106 44" fill="none" stroke="#5FD1B0" strokeWidth="4.5" strokeLinecap="round" />

      {/* 铅笔(斜举在右手上方) */}
      <g transform="translate(109 15) rotate(32)">
        <rect x="-3.2" y="-11" width="6.4" height="7" rx="3" fill="#FB7185" />
        <rect x="-3.2" y="-5" width="6.4" height="4" fill="#D1D5DB" />
        <line x1="-3.2" y1="-3.4" x2="3.2" y2="-3.4" stroke="#9CA3AF" strokeWidth="0.8" />
        <rect x="-3.2" y="-1" width="6.4" height="20" rx="1" fill="#FBBF24" />
        <line x1="0" y1="0" x2="0" y2="18" stroke="#F59E0B" strokeWidth="0.8" />
        <path d="M-3.2 19 L3.2 19 L0 26 Z" fill="#FDE8B3" />
        <path d="M-1.3 22.6 L1.3 22.6 L0 26 Z" fill="#374151" />
      </g>

      {/* 右手三瓣 */}
      <g fill="#8CE3C4" stroke="#52C9A6" strokeWidth="1.1">
        <circle cx="107.5" cy="42" r="4.6" />
        <circle cx="103.7" cy="38.5" r="2.7" />
        <circle cx="107.5" cy="36" r="2.7" />
        <circle cx="111.3" cy="38.5" r="2.7" />
      </g>

      {/* 前层黄色便签主体 */}
      <rect
        x="27" y="24" width="64" height="60" rx="10"
        fill="url(#fc-note-grad)"
        stroke="#F2D58A" strokeWidth="1.2"
      />

      {/* 顶部半透明胶带(带锯齿边) */}
      <path
        d="M47 17 l2.6 -2.4 2.6 2.4 2.6 -2.4 2.6 2.4 2.6 -2.4 2.6 2.4 2.6 -2.4 2.6 2.4 2.6 -2.4 2.6 2.4 v11 l-2.6 -2 -2.6 2 -2.6 -2 -2.6 2 -2.6 -2 -2.6 2 -2.6 -2 -2.6 2 -2.6 -2 -2.6 2 z"
        fill="#FFFDF2" opacity="0.85"
      />

      {/* 腮红 */}
      <ellipse cx="39" cy="61" rx="4.6" ry="3.1" fill="#FCA5A5" opacity="0.55" />
      <ellipse cx="81" cy="61" rx="4.6" ry="3.1" fill="#FCA5A5" opacity="0.55" />

      {/* 眼睛(正常眨眼 / 开心弯眼) */}
      {happy ? (
        <>
          <path d="M39 52 Q47 44.5 55 52" fill="none" stroke="#1F2937" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M65 52 Q73 44.5 81 52" fill="none" stroke="#1F2937" strokeWidth="2.6" strokeLinecap="round" />
        </>
      ) : (
        <g>
          <g className="fc-eye fc-eye-l">
            <circle cx="47" cy="51" r="8.6" fill="#1F2937" />
            <circle cx="44" cy="47.6" r="2.7" fill="#FFFFFF" />
            <circle cx="50.4" cy="54.2" r="1.2" fill="#FFFFFF" />
          </g>
          <g className="fc-eye fc-eye-r">
            <circle cx="73" cy="51" r="8.6" fill="#1F2937" />
            <circle cx="70" cy="47.6" r="2.7" fill="#FFFFFF" />
            <circle cx="76.4" cy="54.2" r="1.2" fill="#FFFFFF" />
          </g>
        </g>
      )}

      {/* 微笑 */}
      <path d="M55 60 Q60 65.5 65 60" fill="none" stroke="#7C3A15" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

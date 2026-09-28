import React, { useRef, useState } from 'react'
import { useApp } from '../state/AppContext.jsx'

// 静态资源基础路径：本地为 '/'，GitHub Pages 构建为 '/mindplan/'
const BASE = import.meta.env.BASE_URL

// ============ NotePage 笔记管理 ============
// 支持新建文本笔记、删除笔记、上传图片 + 真实 OCR 识别（tesseract-wasm）
// 识别结果回填到笔记编辑框，可继续编辑后保存
export default function NotePage() {
  const { notes, addNote, deleteNote } = useApp()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrMsg, setOcrMsg] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [imagePreview, setImagePreview] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [lang, setLang] = useState('chi_sim')
  const [bodyFromOcr, setBodyFromOcr] = useState(false)
  const fileRef = useRef(null)

  // 保存文本笔记（OCR 识别回填后也可走此通道）
  const handleSaveText = () => {
    if (!title.trim() && !body.trim()) return
    addNote({
      title: title.trim() || '无标题笔记',
      body: body.trim(),
      source: bodyFromOcr ? 'ocr' : 'text'
    })
    setTitle('')
    setBody('')
    setBodyFromOcr(false)
  }

  // 选择图片：预览，不立即识别
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImagePreview(ev.target.result)
      setOcrMsg('已选择图片，点击“开始识别”按钮进行 OCR')
    }
    reader.readAsDataURL(file)
  }

  // 清除已选图片
  const handleClearImage = () => {
    setImageFile(null)
    setImagePreview('')
    setOcrMsg('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // 真实 OCR 识别：tesseract-wasm
  const handleRunOCR = async () => {
    if (!imageFile) return
    setOcrLoading(true)
    setOcrMsg('正在加载 OCR 引擎与语言模型，请稍候...')
    setOcrProgress(5)

    // 动态加载 OCRClient，避免阻塞首屏
    const { OCRClient } = await import('tesseract-wasm')

    // 把 public 下的 wasm 二进制 fetch 后传给 worker，确保完全离线
    let wasmBinary
    try {
      const wasmResp = await fetch(`${BASE}tesseract-core.wasm`)
      if (!wasmResp.ok) throw new Error('wasm 下载失败')
      wasmBinary = await wasmResp.arrayBuffer()
    } catch (e) {
      setOcrLoading(false)
      setOcrMsg('OCR 引擎加载失败：' + (e?.message || e))
      return
    }

    const ocr = new OCRClient({
      workerURL: `${BASE}tesseract-worker.js`,
      wasmBinary
    })

    try {
      setOcrProgress(20)
      setOcrMsg('正在加载语言模型（' + (lang === 'chi_sim' ? '简体中文' : '英文') + '）...')

      // 加载语言包：始终从项目本地静态路径读取，不联网下载
      await ocr.loadModel(`${BASE}tessdata/${lang}.traineddata`)

      setOcrProgress(45)
      setOcrMsg('正在识别图片文字...')

      // 把 File 转成 ImageBitmap
      const bitmap = await createImageBitmap(imageFile)
      await ocr.loadImage(bitmap)

      setOcrProgress(70)

      // 执行识别，带进度回调
      const text = await ocr.getText((ratio) => {
        // ratio 是 0..1，识别进度
        setOcrProgress(70 + Math.floor(ratio * 25))
      })

      setOcrProgress(100)

      const cleanText = (text || '').trim()
      if (!cleanText) {
        setOcrMsg('未识别到文字，请尝试更换图片或调整清晰度')
      } else {
        // 识别结果回填到笔记编辑框，用户可继续编辑
        setBody(prev => prev ? prev + '\n' + cleanText : cleanText)
        setBodyFromOcr(true)
        if (!title.trim()) {
          // 自动用识别内容前 20 字作标题
          setTitle(cleanText.slice(0, 20).replace(/\s+/g, ' '))
        }
        setOcrMsg('识别完成，结果已回填到编辑框，可继续编辑后保存')
      }
    } catch (err) {
      setOcrMsg('识别失败：' + (err?.message || err))
    } finally {
      try { await ocr.destroy() } catch (e) { /* ignore */ }
      setOcrLoading(false)
      // 3 秒后清掉提示，但保留识别出的内容
      setTimeout(() => setOcrMsg(''), 4000)
    }
  }

  return (
    <div>
      <div className="page-title">笔记管理</div>
      <div className="page-subtitle">记录学习要点，支持上传图片进行真实 OCR 文字识别</div>

      {/* 新建文本笔记（含 OCR 回填内容编辑） */}
      <div className="card">
        <div className="card-title">
          <span>新建文本笔记</span>
        </div>
        <div className="form-group">
          <label className="form-label">标题</label>
          <input
            className="form-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="给笔记起个标题"
          />
        </div>
        <div className="form-group">
          <label className="form-label">正文</label>
          <textarea
            className="form-textarea"
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="记录今日学习内容、知识点、思考... 或上传图片后用 OCR 识别结果回填此处"
            rows={8}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={handleSaveText}>保存笔记</button>
        </div>
      </div>

      {/* 图片上传 + 真实 OCR */}
      <div className="card">
        <div className="card-title">
          <span>图片 OCR 识别</span>
          <span className="tag tag-info">tesseract-wasm</span>
        </div>

        {/* 语言选择 */}
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">识别语言</label>
          <select
            className="form-input"
            value={lang}
            onChange={e => setLang(e.target.value)}
            style={{ maxWidth: 240 }}
          >
            <option value="chi_sim">简体中文</option>
            <option value="eng">英文</option>
          </select>
        </div>

        {/* 上传区 */}
        {!imagePreview && (
          <div
            className="upload-area"
            onClick={() => fileRef.current?.click()}
          >
            <div style={{ fontSize: 16, fontWeight: 500 }}>
              点击上传图片，识别后回填编辑框
            </div>
            <div className="upload-hint">
              支持 JPG / PNG，本地 tesseract-wasm 离线识别，不上传服务器
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* 图片预览 + 识别按钮 */}
        {imagePreview && (
          <div className="image-preview-wrap">
            <img src={imagePreview} alt="待识别" className="image-preview" />
            <div className="image-actions">
              <button
                className="btn btn-primary"
                onClick={handleRunOCR}
                disabled={ocrLoading}
              >
                {ocrLoading ? '识别中...' : '开始识别'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleClearImage}
                disabled={ocrLoading}
              >
                清除图片
              </button>
            </div>
          </div>
        )}

        {/* OCR 进度 */}
        {ocrLoading && (
          <div className="alert alert-info" style={{ marginTop: 12 }}>
            <div className="progress-bar" style={{ flex: 1, marginRight: 10 }}>
              <div className="progress-fill" style={{ width: `${ocrProgress}%` }} />
            </div>
            <span style={{ marginLeft: 8, minWidth: 48 }}>{ocrProgress}%</span>
          </div>
        )}
        {ocrMsg && !ocrLoading && (
          <div className="alert alert-info" style={{ marginTop: 12 }}>{ocrMsg}</div>
        )}
      </div>

      {/* 笔记列表 */}
      <div className="card">
        <div className="card-title">
          <span>笔记列表</span>
          <span className="tag tag-info">共 {notes.length} 条</span>
        </div>
        {notes.length === 0 ? (
          <div className="empty">还没有笔记，开始记录第一篇吧</div>
        ) : (
          notes.map(note => {
            const sourceLabel = note.source === 'ocr'
              ? 'OCR 识别'
              : note.source === 'quick'
                ? `快速笔记${note.tag ? ` · ${note.tag}` : ''}`
                : '手动创建'
            return (
            <div key={note.id} className={`note-card${note.source === 'ocr' ? ' ocr' : note.source === 'quick' ? ' quick' : ''}`}>
              <div className="note-title">{note.title}</div>
              <div className="note-body">{note.body}</div>
              <div className="note-meta">
                <span>
                  {sourceLabel} ·{' '}
                  {new Date(note.createdAt).toLocaleString('zh-CN')}
                </span>
                <button
                  className="icon-btn danger"
                  onClick={() => deleteNote(note.id)}
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

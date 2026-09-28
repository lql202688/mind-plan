import React, { useEffect, useRef } from 'react'
import { useApp } from '../state/AppContext.jsx'

// ============ ModelPage AI 模型页面 ============
// 模拟本地大模型加载进度动画；本地推理 vs 降级规则引擎模式切换
export default function ModelPage() {
  const { aiMode, setAiMode, modelLoadProgress, setModelProgress } = useApp()
  const timerRef = useRef(null)

  // 进入页面时模拟加载进度动画（仅当进度为 0 时启动）
  useEffect(() => {
    if (modelLoadProgress > 0 && modelLoadProgress < 100) {
      // 继续未完成的加载
      startLoading(modelLoadProgress)
    } else if (modelLoadProgress === 0) {
      startLoading(0)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const startLoading = (from) => {
    if (timerRef.current) clearInterval(timerRef.current)
    let p = from
    setModelProgress(p)
    timerRef.current = setInterval(() => {
      // 模拟不均匀加载，越接近 100 步长越小
      const step = p < 70 ? 5 : p < 90 ? 2 : 1
      p = Math.min(100, p + step)
      setModelProgress(p)
      if (p >= 100 && timerRef.current) {
        clearInterval(timerRef.current)
      }
    }, 120)
  }

  const handleReload = () => {
    startLoading(0)
  }

  const handleSwitchMode = (mode) => {
    setAiMode(mode)
  }

  const isLocal = aiMode === 'local'
  const loaded = modelLoadProgress >= 100

  return (
    <div>
      <div className="page-title">AI 模型</div>
      <div className="page-subtitle">本地大模型推理与降级规则引擎模式切换</div>

      {/* 模型加载进度 */}
      <div className="card">
        <div className="card-title">
          <span>本地模型加载</span>
          <span className="tag tag-info">MindPlan-Local-1.5B</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
          <div className="progress-bar" style={{ flex: 1 }}>
            <div
              className="progress-fill"
              style={{ width: `${modelLoadProgress}%` }}
            />
          </div>
          <div style={{ fontWeight: 600, color: '#3B82F6', minWidth: 48 }}>
            {modelLoadProgress}%
          </div>
        </div>
        <div style={{ color: '#64748B', fontSize: 13, marginBottom: 14 }}>
          {loaded
            ? '模型加载完成，可使用本地推理模式'
            : '正在加载模型权重，请稍候...'}
        </div>
        <button className="btn btn-secondary" onClick={handleReload}>
          重新加载模型
        </button>
      </div>

      {/* 模式切换 */}
      <div className="card">
        <div className="card-title">
          <span>运行模式切换</span>
          <span className={`tag ${isLocal ? 'tag-info' : 'tag-review'}`}>
            当前：{isLocal ? '本地推理模式' : '规则引擎模式'}
          </span>
        </div>
        <div className="mode-switch" style={{ marginBottom: 16 }}>
          <button
            className={isLocal ? 'active' : ''}
            onClick={() => handleSwitchMode('local')}
            disabled={!loaded}
          >
            本地模型推理
          </button>
          <button
            className={!isLocal ? 'active' : ''}
            onClick={() => handleSwitchMode('rule')}
          >
            降级 - 规则引擎
          </button>
        </div>
        <div style={{ color: '#64748B', fontSize: 14, lineHeight: 1.8 }}>
          {isLocal
            ? '本地模型推理模式：模拟调用本地大语言模型生成学习建议，响应更智能但耗时略长。' +
              (loaded ? '当前模型已就绪，可正常使用。' : '当前模型仍在加载，请等待完成。')
            : '降级规则引擎模式：当本地模型不可用时自动切换，基于预设规则完成任务排程与提醒，响应快速稳定。'
          }
        </div>
        {!loaded && isLocal && (
          <div className="alert alert-warn" style={{ marginTop: 12 }}>
            本地模型尚未加载完成，当前模式下功能将受限，建议等待加载完成或切换至规则引擎。
          </div>
        )}
      </div>

      {/* 模型信息 */}
      <div className="card">
        <div className="card-title"><span>模型信息</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
          <div>
            <div style={{ color: '#64748B', marginBottom: 4 }}>模型名称</div>
            <div>MindPlan-Local-1.5B（模拟）</div>
          </div>
          <div>
            <div style={{ color: '#64748B', marginBottom: 4 }}>参数量</div>
            <div>约 15 亿（模拟）</div>
          </div>
          <div>
            <div style={{ color: '#64748B', marginBottom: 4 }}>推理方式</div>
            <div>前端模拟</div>
          </div>
          <div>
            <div style={{ color: '#64748B', marginBottom: 4 }}>数据上传</div>
            <div>全部本地，不上传服务器</div>
          </div>
        </div>
      </div>
    </div>
  )
}

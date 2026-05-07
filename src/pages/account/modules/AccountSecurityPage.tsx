import { useState } from 'react'
import { AccountBreadcrumb } from '../AccountBreadcrumb'

export function AccountSecurityPage() {
  const [showDelete, setShowDelete] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  return (
    <div>
      <AccountBreadcrumb current="安全设置" />
      <h1 className="font-serif text-2xl font-semibold text-[var(--brand-deep)] md:text-3xl">安全设置</h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">演示环境密码仅存本机；请勿使用生产密码。</p>

      <section className="card mt-8 space-y-6 p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-[var(--brand-deep)]">修改密码</h2>
        <label className="tm-field">
          <span className="tm-field-label">当前密码</span>
          <input className="tm-input" type="password" autoComplete="current-password" />
        </label>
        <label className="tm-field">
          <span className="tm-field-label">新密码（至少 8 位，含数字与字母）</span>
          <input className="tm-input" type="password" autoComplete="new-password" />
        </label>
        <label className="tm-field">
          <span className="tm-field-label">确认新密码</span>
          <input className="tm-input" type="password" autoComplete="new-password" />
        </label>
        <button type="button" className="tm-btn tm-btn-primary" onClick={() => alert('演示：未提交到服务器。')}>
          更新密码
        </button>
      </section>

      <section className="card mt-6 space-y-4 p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-[var(--brand-deep)]">绑定手机 / 邮箱</h2>
        <p className="text-sm text-[var(--text-secondary)]">演示阶段仅展示验证码 UI 流程占位。</p>
        <button type="button" className="tm-btn tm-btn-secondary text-sm">
          绑定手机（演示）
        </button>
        <button type="button" className="tm-btn tm-btn-secondary text-sm">
          绑定邮箱（演示）
        </button>
      </section>

      <section className="card mt-6 p-6 shadow-[var(--shadow-soft)]">
        <h2 className="text-base font-semibold text-red-800">注销账号</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">注销后演示数据将从本机清除，且不可恢复。</p>
        <button type="button" className="mt-4 text-sm font-medium text-red-700 underline-offset-2 hover:underline" onClick={() => setShowDelete(true)}>
          申请注销账号
        </button>
      </section>

      {showDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="max-w-md rounded-2xl border border-[rgba(47,79,58,0.12)] bg-[var(--bg-surface)] p-6 shadow-xl">
            <h3 id="delete-title" className="font-serif text-lg font-semibold text-[var(--brand-deep)]">
              确认注销
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">输入「确认注销」并验证登录密码后提交（演示）。</p>
            <input
              className="tm-input mt-4"
              placeholder="确认注销"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <input className="tm-input mt-3" type="password" placeholder="登录密码" autoComplete="current-password" />
            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button type="button" className="tm-btn tm-btn-secondary" onClick={() => setShowDelete(false)}>
                取消
              </button>
              <button
                type="button"
                className="rounded-[999px] bg-red-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-800"
                onClick={() => alert('演示：未执行注销。')}
              >
                确认注销
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

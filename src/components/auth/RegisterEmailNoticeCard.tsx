import { Link } from 'react-router-dom'

type Props = {
  email: string
  loginHref: string
  /** 加入流程等场景的补充说明 */
  variant?: 'default' | 'join_flow'
}

export function RegisterEmailNoticeCard({ email, loginHref, variant = 'default' }: Props) {
  return (
    <div className="tm-register-notice" role="status" aria-live="polite">
      <p className="tm-register-notice-title">感谢注册</p>
      <p className="tm-register-notice-highlight">请查收邮件完成验证</p>
      <p className="tm-register-notice-body">
        我们已向 <span className="font-medium text-[var(--text-primary)]">{email}</span>{' '}
        发送确认邮件。请点击邮件中的链接完成验证后，再使用「登录」进入账户。
        {variant === 'join_flow'
          ? ' 验证并登录后，请返回本页从「已有账号」路径完成登记，或重新打开加入流程。'
          : null}
      </p>
      <p className="mt-5 text-sm">
        <Link className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline" to={loginHref}>
          前往登录
        </Link>
      </p>
    </div>
  )
}

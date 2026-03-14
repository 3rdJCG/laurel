type BannerLevel = 'critical' | 'warning'

type Props = {
  level: BannerLevel
  message: string
  filePath?: string
  onClose: () => void
  onRetry?: () => void
}

export function ErrorBanner({ level, message, filePath, onClose, onRetry }: Props): JSX.Element {
  const handleShowFile = async (): Promise<void> => {
    if (filePath) {
      await window.api.invoke('dialog:show-item-in-folder', filePath)
    }
  }

  return (
    <div className={`error-banner error-banner--${level}`}>
      <span className="error-banner-message">{message}</span>
      <div className="error-banner-actions">
        {filePath && (
          <button onClick={handleShowFile}>ファイルを開く</button>
        )}
        {onRetry && (
          <button onClick={onRetry}>再試行</button>
        )}
        <button onClick={onClose}>×</button>
      </div>
    </div>
  )
}

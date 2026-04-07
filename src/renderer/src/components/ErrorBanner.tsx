import { Alert, Button, Group } from '@mantine/core'

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
    <Alert
      color={level === 'critical' ? 'red' : 'yellow'}
      variant="light"
      withCloseButton
      onClose={onClose}
      mb="xs"
    >
      <Group gap="xs" wrap="nowrap" align="center">
        <span style={{ flex: 1 }}>{message}</span>
        {filePath && (
          <Button size="xs" variant="subtle" onClick={handleShowFile}>
            ファイルを開く
          </Button>
        )}
        {onRetry && (
          <Button size="xs" variant="subtle" onClick={onRetry}>
            再試行
          </Button>
        )}
      </Group>
    </Alert>
  )
}

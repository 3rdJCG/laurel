import { useState, useEffect } from 'react'
import { Modal, Text, Stack, Divider, Button, Group } from '@mantine/core'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: Props): JSX.Element {
  const [version, setVersion] = useState('')

  useEffect(() => {
    if (isOpen) {
      window.api.invoke('app:get-version').then((v) => setVersion(v as string))
    }
  }, [isOpen])

  return (
    <Modal opened={isOpen} onClose={onClose} title="Laurel について" size="sm" centered>
      <Stack gap="xs">
        <Text size="sm"><strong>バージョン:</strong> {version}</Text>
        <Text size="sm"><strong>ライセンス:</strong> MIT License</Text>
        <Divider />
        <Text size="sm" c="dimmed">
          このアプリは外部サーバーへデータを送信しません。すべてのデータはローカルに保存されます。
        </Text>
        <Group justify="flex-end" mt="xs">
          <Button variant="default" size="xs" onClick={onClose}>閉じる</Button>
        </Group>
      </Stack>
    </Modal>
  )
}

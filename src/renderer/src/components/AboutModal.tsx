import { useState, useEffect } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function AboutModal({ isOpen, onClose }: Props): JSX.Element | null {
  const [version, setVersion] = useState('')

  useEffect(() => {
    if (isOpen) {
      window.api.invoke('app:get-version').then((v) => setVersion(v as string))
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Laurel について</h2>
        <p><strong>バージョン:</strong> {version}</p>
        <p><strong>ライセンス:</strong> MIT License</p>
        <hr />
        <p>このアプリは外部サーバーへデータを送信しません。すべてのデータはローカルに保存されます。</p>
        <div className="modal-footer">
          <button onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  )
}

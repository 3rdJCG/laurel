import { useRef, useState, useEffect } from 'react'
import { Box, Group, Text, Stack, Button, Divider, Badge } from '@mantine/core'
import { IconExternalLink, IconAlertCircle, IconPaperclip, IconChevronDown, IconChevronUp } from '@tabler/icons-react'
import type { MailData } from '../types'

function ExpandableText({ children }: { children: string }): JSX.Element {
  const textRef = useRef<HTMLParagraphElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const el = textRef.current
    if (!el) return
    setOverflows(el.scrollHeight > el.clientHeight)
  }, [children])

  return (
    <Group gap={4} align="flex-start" style={{ flex: 1, minWidth: 0 }}>
      <Text
        ref={textRef}
        size="xs"
        style={{ flex: 1, wordBreak: 'break-all', ...(expanded ? {} : { overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }) }}
      >
        {children}
      </Text>
      {(overflows || expanded) && (
        <Box
          style={{ cursor: 'pointer', color: 'var(--mantine-color-dimmed)', flexShrink: 0, lineHeight: 1, paddingTop: 1 }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
        </Box>
      )}
    </Group>
  )
}

const ALLOWED_TAGS = new Set(['p', 'br', 'hr', 'strong', 'b', 'em', 'a', 'ul', 'ol', 'li'])
const SKIP_TAGS = new Set(['style', 'script', 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'head'])

function processNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (node.nodeType !== Node.ELEMENT_NODE) return ''

  const el = node as Element
  const tag = el.tagName.toLowerCase()

  if (SKIP_TAGS.has(tag)) return ''

  const children = Array.from(el.childNodes).map(processNode).join('')

  if (!ALLOWED_TAGS.has(tag)) return children  // div/span/font等はタグを外して中身だけ

  if (tag === 'br' || tag === 'hr') return `<${tag}>`
  if (tag === 'a') {
    const href = el.getAttribute('href')
    return href ? `<a href="${href}">${children}</a>` : children
  }
  return `<${tag}>${children}</${tag}>`
}

function sanitizeForOutlook(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(doc.body.childNodes).map(processNode).join('')
}

type Props = {
  mailData: MailData
}

export function MailTab({ mailData }: Props): JSX.Element {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [iframeHeight, setIframeHeight] = useState(200)

  const receivedDate = new Date(mailData.datetime.received).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  })

  const handleOpenOriginal = (): void => {
    window.api.invoke('shell:open-external', mailData.link)
  }

  const handleForward = (): void => {
    const subject = mailData.subject ? `Fw: ${mailData.subject}` : ''
    const sanitized = sanitizeForOutlook(mailData.body)
    const body = `<br><br><hr>${sanitized}`
    const url = `https://outlook.office.com/mail/deeplink/compose?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.api.invoke('shell:open-external', url)
  }

  const handleIframeLoad = (): void => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    setIframeHeight(doc.documentElement.scrollHeight || doc.body.scrollHeight)

    // リンクをブラウザで開く
    doc.addEventListener('click', (e) => {
      const target = (e.target as Element).closest('a')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href || href.startsWith('#')) return
      e.preventDefault()
      window.api.invoke('shell:open-external', href)
    })

    // 画像等の遅延読み込みに対応
    const ro = new ResizeObserver(() => {
      const h = doc.documentElement.scrollHeight || doc.body.scrollHeight
      if (h > 0) setIframeHeight(h)
    })
    ro.observe(doc.body)
  }

  return (
    <Box>
      {/* Mail metadata */}
      <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-dark-5)' }}>
        <Stack gap={6}>
          <Group gap="xs" align="flex-start">
            <Text size="xs" c="dimmed" w={56} style={{ flexShrink: 0 }}>差出人</Text>
            <ExpandableText>{mailData.from}</ExpandableText>
          </Group>

          <Group gap="xs" align="flex-start">
            <Text size="xs" c="dimmed" w={56} style={{ flexShrink: 0 }}>受信日時</Text>
            <Text size="xs">{receivedDate}</Text>
          </Group>

          {mailData.cc && (
            <Group gap="xs" align="flex-start">
              <Text size="xs" c="dimmed" w={56} style={{ flexShrink: 0 }}>CC</Text>
              <ExpandableText>{mailData.cc}</ExpandableText>
            </Group>
          )}

          <Group gap={6} mt={4}>
            {mailData.importance === 'high' && (
              <Badge size="xs" color="red" leftSection={<IconAlertCircle size={10} />}>重要</Badge>
            )}
            {mailData.flags.hasAttachments === 'True' && (
              <Badge size="xs" color="gray" leftSection={<IconPaperclip size={10} />}>添付あり</Badge>
            )}
          </Group>
        </Stack>

        <Divider my="sm" />

        <Group gap="xs">
          <Button
            size="xs"
            variant="light"
            leftSection={<IconExternalLink size={12} />}
            onClick={handleOpenOriginal}
          >
            Original Email を開く
          </Button>
          <Button
            size="xs"
            variant="light"
            color="teal"
            leftSection={<IconExternalLink size={12} />}
            onClick={handleForward}
          >
            このメールを転送
          </Button>
        </Group>
      </Box>

      {/* Mail body */}
      <Box style={{ background: '#fff' }}>
        <iframe
          ref={iframeRef}
          srcDoc={mailData.body}
          sandbox="allow-same-origin"
          onLoad={handleIframeLoad}
          style={{
            width: '100%',
            height: iframeHeight,
            border: 'none',
            display: 'block'
          }}
          title="メール本文"
        />
      </Box>
    </Box>
  )
}

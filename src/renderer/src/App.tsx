import { useState, useRef, useCallback, useEffect } from 'react'
import { MantineProvider, AppShell, createTheme } from '@mantine/core'
import { useLocalStorage } from '@mantine/hooks'
import { Notifications } from '@mantine/notifications'
import { DataProvider, useData } from './context/DataContext'
import { HomeScreen } from './screens/HomeScreen'
import { ProjectScreen } from './screens/ProjectScreen'
import { TaskDetailScreen } from './screens/TaskDetailScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { Sidebar, type View } from './components/Sidebar'
import { AboutModal } from './components/AboutModal'

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: "'IBM Plex Sans JP', system-ui, -apple-system, sans-serif",
  fontSizes: {
    xs: '11px',
    sm: '12px',
    md: '13px',
    lg: '14px',
    xl: '16px'
  },
  colors: {
    dark: [
      '#C1C2C5',
      '#A6A7AB',
      '#909296',
      '#5C5F66',
      '#373A40',
      '#2C2E33',
      '#25262B',
      '#1A1B1E',
      '#141517',
      '#101113'
    ]
  },
  components: {
    Button: {
      defaultProps: { size: 'xs' }
    },
    ActionIcon: {
      defaultProps: { size: 'sm', variant: 'subtle' }
    }
  }
})

const COLLAPSED_KEY = 'sidebar-collapsed'
const SIDEBAR_WIDTH = 200
const SIDEBAR_COLLAPSED_WIDTH = 48

function AppContent(): JSX.Element {
  const { projects } = useData()
  const [currentView, setCurrentView] = useState<View>({ type: 'home' })
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const [collapsed, setCollapsed] = useLocalStorage<boolean>({
    key: COLLAPSED_KEY,
    defaultValue: false
  })
  const settingsIsDirtyRef = useRef<() => boolean>(() => false)
  const historyRef = useRef<View[]>([])

  const handleNavigate = useCallback(
    (view: View, historyOverride?: View): void => {
      if (currentView.type === 'settings' && settingsIsDirtyRef.current()) {
        const ok = window.confirm('設定の変更が保存されていません。破棄して移動しますか？')
        if (!ok) return
      }
      // Project間の遷移は履歴に積まない（戻るでHomeに戻るようにする）
      const skipHistory = currentView.type === 'project' && view.type === 'project'
      if (!skipHistory) {
        historyRef.current.push(historyOverride ?? currentView)
      }
      setCurrentView(view)
    },
    [currentView]
  )

  const handleBack = useCallback((): void => {
    const prev = historyRef.current.pop()
    if (prev) {
      setCurrentView(prev)
    }
  }, [])

  useEffect(() => {
    const onMouseUp = (e: MouseEvent): void => {
      // Mouse button 3 = browser back button
      if (e.button === 3) {
        e.preventDefault()
        handleBack()
      }
    }
    window.addEventListener('mouseup', onMouseUp)
    return () => window.removeEventListener('mouseup', onMouseUp)
  }, [handleBack])

  const renderMain = (): JSX.Element => {
    if (currentView.type === 'project') {
      return (
        <ProjectScreen
          projectId={currentView.projectId}
          initialTab={currentView.initialTab}
          onNavigateHome={handleBack}
          onNavigateToTask={(projectId, taskId, fromTab) =>
            handleNavigate(
              { type: 'task', projectId, taskId, fromTab },
              { type: 'project', projectId: currentView.projectId, initialTab: fromTab ?? 'tasks' }
            )
          }
        />
      )
    }
    if (currentView.type === 'task') {
      return (
        <TaskDetailScreen
          projectId={currentView.projectId}
          taskId={currentView.taskId}
          onNavigateBack={handleBack}
        />
      )
    }
    if (currentView.type === 'settings') {
      return (
        <SettingsScreen
          registerDirtyChecker={(fn) => {
            settingsIsDirtyRef.current = fn
          }}
        />
      )
    }
    return (
      <HomeScreen
        onNavigateToProject={(projectId) => handleNavigate({ type: 'project', projectId })}
        onNavigateToSettings={() => handleNavigate({ type: 'settings' })}
      />
    )
  }

  return (
    <AppShell
      navbar={{
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        breakpoint: 0
      }}
      padding={0}
    >
      <AppShell.Navbar>
        <Sidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          currentView={currentView}
          projects={projects}
          onNavigate={handleNavigate}
          onAboutOpen={() => setIsAboutOpen(true)}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        {renderMain()}
      </AppShell.Main>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </AppShell>
  )
}

function App(): JSX.Element {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications />
      <DataProvider>
        <AppContent />
      </DataProvider>
    </MantineProvider>
  )
}

export default App

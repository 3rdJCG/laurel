import { useState, useRef } from 'react'
import { DataProvider, useData } from './context/DataContext'
import { HomeScreen } from './screens/HomeScreen'
import { ProjectScreen } from './screens/ProjectScreen'
import { TaskDetailScreen } from './screens/TaskDetailScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { Sidebar, type View } from './components/Sidebar'
import { AboutModal } from './components/AboutModal'

function AppContent(): JSX.Element {
  const { projects } = useData()
  const [currentView, setCurrentView] = useState<View>({ type: 'home' })
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const settingsIsDirtyRef = useRef<() => boolean>(() => false)

  const handleNavigate = (view: View): void => {
    if (currentView.type === 'settings' && settingsIsDirtyRef.current()) {
      const ok = window.confirm('設定の変更が保存されていません。破棄して移動しますか？')
      if (!ok) return
    }
    setCurrentView(view)
  }

  const renderMain = (): JSX.Element => {
    if (currentView.type === 'project') {
      return (
        <ProjectScreen
          projectId={currentView.projectId}
          onNavigateHome={() => setCurrentView({ type: 'home' })}
          onNavigateToTask={(projectId, taskId) =>
            setCurrentView({ type: 'task', projectId, taskId })
          }
        />
      )
    }
    if (currentView.type === 'task') {
      return (
        <TaskDetailScreen
          projectId={currentView.projectId}
          taskId={currentView.taskId}
          onNavigateBack={() =>
            setCurrentView({ type: 'project', projectId: currentView.projectId })
          }
        />
      )
    }
    if (currentView.type === 'settings') {
      return <SettingsScreen registerDirtyChecker={(fn) => { settingsIsDirtyRef.current = fn }} />
    }
    return (
      <HomeScreen
        onNavigateToProject={(projectId) => setCurrentView({ type: 'project', projectId })}
      />
    )
  }

  return (
    <div className="app-layout">
      <Sidebar
        currentView={currentView}
        projects={projects}
        onNavigate={handleNavigate}
        onAboutOpen={() => setIsAboutOpen(true)}
      />
      <main className="app-main">
        {renderMain()}
      </main>

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  )
}

function App(): JSX.Element {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  )
}

export default App

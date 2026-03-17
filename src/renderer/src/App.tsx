import { useState } from 'react'
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
      return <SettingsScreen />
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
        onNavigate={setCurrentView}
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

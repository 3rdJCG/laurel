import { useState } from 'react'
import { DataProvider, useData } from './context/DataContext'
import { HomeScreen } from './screens/HomeScreen'
import { ProjectScreen } from './screens/ProjectScreen'
import { Sidebar, type View } from './components/Sidebar'
import { SettingsModal } from './components/SettingsModal'
import { AboutModal } from './components/AboutModal'

function AppContent(): JSX.Element {
  const { projects } = useData()
  const [currentView, setCurrentView] = useState<View>({ type: 'home' })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)

  const renderMain = (): JSX.Element => {
    if (currentView.type === 'project') {
      return (
        <ProjectScreen
          projectId={currentView.projectId}
          onNavigateHome={() => setCurrentView({ type: 'home' })}
        />
      )
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
        onSettingsOpen={() => setIsSettingsOpen(true)}
        onAboutOpen={() => setIsAboutOpen(true)}
      />
      <main className="app-main">
        {renderMain()}
      </main>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
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

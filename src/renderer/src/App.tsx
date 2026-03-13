import { useState } from 'react'
import { DataProvider } from './context/DataContext'
import { HomeScreen } from './screens/HomeScreen'
import { ProjectScreen } from './screens/ProjectScreen'

type ScreenState = { screen: 'home' } | { screen: 'project'; projectId: string }

function AppContent(): JSX.Element {
  const [screenState, setScreenState] = useState<ScreenState>({ screen: 'home' })

  const navigateToProject = (projectId: string): void => {
    setScreenState({ screen: 'project', projectId })
  }

  const navigateHome = (): void => {
    setScreenState({ screen: 'home' })
  }

  if (screenState.screen === 'project') {
    return (
      <ProjectScreen
        projectId={screenState.projectId}
        onNavigateHome={navigateHome}
      />
    )
  }

  return <HomeScreen onNavigateToProject={navigateToProject} />
}

function App(): JSX.Element {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  )
}

export default App

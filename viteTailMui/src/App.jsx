import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ResponsiveAppBar from './components/ResponsiveAppBar'
import Dashboard from './pages/mainPage'
import Login from './pages/login'
import Signup from './pages/signUp'
import ErrorPage from './pages/errorPage'
import ToolPage from './pages/toolPage'
import History from './pages/history'

function App() {
  return (
    <AuthProvider>
      <Router>
        <ResponsiveAppBar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/history" element={<History />} />
          <Route path="/tools/:toolId" element={<ToolPage />} />
          <Route path="*" element={<ErrorPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
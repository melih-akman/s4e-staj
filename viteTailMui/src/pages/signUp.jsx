import { useState } from 'react'
import { useNavigate } from 'react-router-dom' // Bu satırı ekleyin
import { useAuth } from '../contexts/AuthContext'
import { updateProfile } from 'firebase/auth'
import { TextField, Button, Box, Typography, Alert, Paper } from '@mui/material'

function Signup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setError('')
      setLoading(true)
      
      // Kullanıcı oluştur
      const userCredential = await signup(formData.email, formData.password)
      
      // Kullanıcının displayName'ini güncelle
      await updateProfile(userCredential.user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      })
      
      navigate('/')
    } catch (error) {
      setError('Kayıt başarısız: ' + error.message)
    }
    setLoading(false)
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      minWidth: '100vw',
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(to right, #38014f, #130059)'
    }}>
      <Paper elevation={6} sx={{ maxWidth: 400, p: 4, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom textAlign="center">
          Kayıt Ol
        </Typography>
        
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Ad"
            value={formData.firstName}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Soyad"
            value={formData.lastName}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Şifre"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            margin="normal"
            required
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{ 
              mt: 3, 
              mb: 2,
              background: 'linear-gradient(to right, #38014f, #130059)'
            }}
          >
            {loading ? 'Kayıt olunuyor...' : 'Kayıt Ol'}
          </Button>
        </form>
      </Paper>
    </Box>
  )
}

export default Signup
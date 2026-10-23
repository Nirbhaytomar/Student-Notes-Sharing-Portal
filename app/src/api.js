import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : '/api'
export const SERVER_BASE = API_BASE === '/api' ? '' : API_BASE.replace(/\/api$/, '')
const api = axios.create({ baseURL: API_BASE, timeout: 20000 })
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
export function getError(error) {
  if (error?.response?.data?.error) return error.response.data.error
  if (error?.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.'
  if (!error?.response) return 'Cannot connect to the server. Make sure the backend and MongoDB are running.'
  return 'Something went wrong. Please try again.'
}
export default api

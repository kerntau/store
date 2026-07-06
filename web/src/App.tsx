import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Storefront from './public/Storefront'

const AdminApp = lazy(() => import('./admin/AdminApp'))
const ProductPage = lazy(() => import('./public/ProductPage'))
const QueryPage = lazy(() => import('./public/QueryPage'))
const OrderPage = lazy(() => import('./public/OrderPage'))

function PageFallback() {
  return (
    <Box sx={{ display: 'grid', minHeight: '100dvh', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Storefront />} />
        <Route path="/item/:id" element={<ProductPage />} />
        <Route path="/query" element={<QueryPage />} />
        <Route path="/order/:tradeNo" element={<OrderPage />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

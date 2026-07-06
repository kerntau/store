import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import ListAltOutlinedIcon from '@mui/icons-material/ListAltOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import AppBar from '@mui/material/AppBar'
import Avatar from '@mui/material/Avatar'
import Box from '@mui/material/Box'
import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Stack from '@mui/material/Stack'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

const AdminCards = lazy(() => import('./AdminCards'))
const AdminDashboard = lazy(() => import('./AdminDashboard'))
const AdminLogin = lazy(() => import('./AdminLogin'))
const AdminOrders = lazy(() => import('./AdminOrders'))
const AdminProducts = lazy(() => import('./AdminProducts'))

const drawerWidth = 250

const navItems = [
  {
    section: 'Main',
    items: [{ path: '/admin', label: '控制台', icon: <DashboardOutlinedIcon /> }],
  },
  {
    section: 'Trade',
    items: [
      { path: '/admin/products', label: '商品管理', icon: <ShoppingBagOutlinedIcon /> },
      { path: '/admin/cards', label: '卡密管理', icon: <Inventory2OutlinedIcon /> },
      { path: '/admin/orders', label: '商品订单', icon: <ReceiptLongOutlinedIcon /> },
    ],
  },
  {
    section: 'Config',
    items: [
      { path: '/', label: '返回店铺', icon: <HomeOutlinedIcon /> },
      { path: '/admin/login', label: '管理员', icon: <SettingsOutlinedIcon /> },
    ],
  },
]

const mobileNavItems = [
  { path: '/admin', label: '控制台', icon: <DashboardOutlinedIcon /> },
  { path: '/admin/products', label: '商品', icon: <ShoppingBagOutlinedIcon /> },
  { path: '/admin/cards', label: '卡密', icon: <Inventory2OutlinedIcon /> },
  { path: '/admin/orders', label: '订单', icon: <ReceiptLongOutlinedIcon /> },
]

export default function AdminApp() {
  const token = localStorage.getItem('admin_token')
  const location = useLocation()
  const navigate = useNavigate()

  if (!token && location.pathname !== '/admin/login') {
    return <Navigate to="/admin/login" replace />
  }

  if (location.pathname === '/admin/login') {
    return (
      <Suspense fallback={<AdminRouteFallback />}>
        <AdminLogin />
      </Suspense>
    )
  }

  return (
    <Box
      className="admin-shell"
      sx={{
        minHeight: '100dvh',
        bgcolor: 'background.default',
      }}
    >
      <AppBar
        color="inherit"
        elevation={0}
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'rgba(255,255,255,0.78)',
          backdropFilter: 'saturate(180%) blur(20px)',
        }}
      >
        <Toolbar sx={{ gap: 2, minHeight: 65 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flex: 1 }}>
            <Chip
              size="small"
              color="success"
              label="离线版"
              variant="outlined"
              className="admin-top-badge"
            />
            <Typography color="text.secondary" variant="body2">
              发卡系统管理后台
            </Typography>
          </Stack>
          <Button
            color="inherit"
            startIcon={<LogoutOutlinedIcon />}
            onClick={() => {
              localStorage.removeItem('admin_token')
              navigate('/admin/login', { replace: true })
            }}
          >
            退出
          </Button>
          <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main' }}>
            <ListAltOutlinedIcon fontSize="small" />
          </Avatar>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: 'rgba(255,255,255,0.88)',
            backdropFilter: 'saturate(180%) blur(20px)',
          },
        }}
      >
        <Toolbar sx={{ minHeight: 65 }}>
          <StackBrand />
        </Toolbar>
        <Divider />
        <List sx={{ p: 1.25 }}>
          {navItems.map((group) => (
            <Box key={group.section} sx={{ mb: 1 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: 'block',
                  px: 2,
                  py: 1.25,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                }}
              >
                {group.section}
              </Typography>
              {group.items.map((item) => {
                const selected =
                  item.path === '/admin'
                    ? location.pathname === '/admin'
                    : location.pathname === item.path
                return (
                  <ListItemButton
                    key={item.path}
                    selected={selected}
                    onClick={() => {
                      if (item.path === '/admin/login') {
                        localStorage.removeItem('admin_token')
                      }
                      navigate(item.path)
                    }}
                    sx={{
                      borderRadius: 1.5,
                      minHeight: 44,
                      mb: 0.25,
                      transition: 'transform 180ms ease, box-shadow 180ms ease',
                      '&.Mui-selected': {
                        bgcolor: 'transparent',
                        color: 'primary.main',
                        transform: 'translateX(2px)',
                        boxShadow: '0 2px 6px rgba(56,189,248,.14)',
                        '&:before': {
                          content: '""',
                          position: 'absolute',
                          top: 8,
                          bottom: 8,
                          left: 0,
                          width: 3,
                          borderRadius: '0 3px 3px 0',
                          bgcolor: '#38bdf8',
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      slotProps={{
                        primary: { sx: { fontWeight: selected ? 700 : 600 } },
                      }}
                    />
                  </ListItemButton>
                )
              })}
            </Box>
          ))}
        </List>
      </Drawer>

      <Box
        component="main"
        sx={{
          ml: { md: `${drawerWidth}px` },
          pt: 9,
          px: { xs: 2, md: 3 },
          pb: { xs: 11, md: 4 },
        }}
      >
        <Suspense fallback={<AdminRouteFallback />}>
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="/products" element={<AdminProducts />} />
            <Route path="/cards" element={<AdminCards />} />
            <Route path="/orders" element={<AdminOrders />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </Box>

      <BottomNavigation
        className="admin-bottom-nav"
        showLabels
        value={
          mobileNavItems.find((item) =>
            item.path === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(item.path),
          )?.path ?? '/admin'
        }
        onChange={(_, value: string) => navigate(value)}
        sx={{ display: { xs: 'flex', md: 'none' } }}
      >
        {mobileNavItems.map((item) => (
          <BottomNavigationAction
            key={item.path}
            value={item.path}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Box>
  )
}

function AdminRouteFallback() {
  return (
    <Box sx={{ display: 'grid', minHeight: 360, placeItems: 'center' }}>
      <Typography color="text.secondary">加载中...</Typography>
    </Box>
  )
}

function StackBrand() {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
      <Avatar src="/favicon.ico" sx={{ width: 28, height: 28 }} />
      <Box>
        <Typography variant="h6" sx={{ lineHeight: 1.1, color: 'grey.600' }}>
          Modern Faka
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Admin Console
        </Typography>
      </Box>
    </Stack>
  )
}

import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { api, money } from '../api/client'
import type { Product } from '../api/types'
import PublicLayout from './PublicLayout'

export default function Storefront() {
  const [categoryId, setCategoryId] = useState<number | 'all'>('all')
  const [keyword, setKeyword] = useState('')

  const productsQuery = useQuery({
    queryKey: ['public-products'],
    queryFn: () => api<Product[]>('/api/public/products'),
  })
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const categories = useMemo(() => {
    const ids = Array.from(new Set(products.map((product) => product.categoryId)))
    return ids.map((id) => ({
      id,
      name: id === 1 ? '默认分类' : `分类 ${id}`,
      total: products.filter((product) => product.categoryId === id).length,
    }))
  }, [products])
  const filteredProducts = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return products.filter((product) => {
      const matchesCategory =
        categoryId === 'all' || product.categoryId === categoryId
      const matchesKeyword =
        !normalized ||
        `${product.name} ${product.description}`.toLowerCase().includes(normalized)
      return matchesCategory && matchesKeyword
    })
  }, [categoryId, keyword, products])

  return (
    <PublicLayout searchValue={keyword} onSearchChange={setKeyword}>
      <Stack spacing={2}>
        <Panel title="公告" icon={<CampaignOutlinedIcon fontSize="small" />}>
          <Typography color="text.secondary">
            自动发货商品支付成功后立即展示发货内容；手动发货商品支付后进入待处理状态，发货完成后可凭订单号和邮箱查询。
          </Typography>
        </Panel>

        <Panel title="购买" icon={<ShoppingCartOutlinedIcon fontSize="small" />}>
          <Stack spacing={2}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Chip
                clickable
                className={categoryId === 'all' ? 'acg-chip-active' : 'acg-chip'}
                icon={<CategoryOutlinedIcon />}
                label={`全部商品 ${products.length}`}
                onClick={() => setCategoryId('all')}
              />
              {categories.map((category) => (
                <Chip
                  clickable
                  key={category.id}
                  className={categoryId === category.id ? 'acg-chip-active' : 'acg-chip'}
                  label={`${category.name} ${category.total}`}
                  onClick={() => setCategoryId(category.id)}
                />
              ))}
            </Stack>

            {productsQuery.isLoading && (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <CircularProgress size={22} />
                <Typography color="text.secondary">努力加载中...</Typography>
              </Stack>
            )}
            {productsQuery.error && <Alert severity="error">商品加载失败。</Alert>}
            {!productsQuery.isLoading && filteredProducts.length === 0 && (
              <Box className="item-message">没有商品</Box>
            )}

            <Grid container spacing={2}>
              {filteredProducts.map((product) => (
                <Grid key={product.id} size={{ xs: 12, sm: 6, lg: 3 }}>
                  <ProductCard product={product} />
                </Grid>
              ))}
            </Grid>
          </Stack>
        </Panel>
      </Stack>
    </PublicLayout>
  )
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="acg-panel">
      <Box className="acg-panel-header">
        <Box className="acg-panel-icon">{icon}</Box>
        <Typography variant="h6" className="acg-panel-title">
          {title}
        </Typography>
      </Box>
      <CardContent className="acg-panel-body">{children}</CardContent>
    </Card>
  )
}

function ProductCard({ product }: { product: Product }) {
  const soldOut = product.deliveryMode === 'auto' && product.availableStock === 0
  return (
    <Card
      component={RouterLink}
      to={`/item/${product.id}`}
      className={`acg-product-card ${soldOut ? 'soldout' : ''}`}
    >
      <Box
        className="acg-product-thumb"
        sx={{
          background: product.cover
            ? `url("${product.cover}") center/cover no-repeat`
            : 'linear-gradient(135deg, rgba(186,230,253,.72), rgba(240,249,255,.9))',
        }}
      />
      <CardContent className="acg-product-body">
        <Stack spacing={1}>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', gap: 0.75 }}>
            <span className="badge-soft badge-soft-success">
              {product.deliveryMode === 'auto' ? '自动发货' : '在线发货'}
            </span>
          </Stack>
          <Typography className="goods-title">{product.name}</Typography>
          <Box className="stat-row">
            <Box className="price">
              <span className="unit">¥</span>
              {money(product.priceCents).replace('¥', '')}
            </Box>
          </Box>
          <Box className="stat-bottom">
            <span>
              库存：
              {product.availableStock >= 0 ? product.availableStock : '充足'}
            </span>
            <span>已售：{product.soldCount}</span>
          </Box>
        </Stack>
      </CardContent>
      {soldOut && <Box className="soldout-ribbon">售罄</Box>}
    </Card>
  )
}

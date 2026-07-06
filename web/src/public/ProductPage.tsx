import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined'
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import PhoneIphoneOutlinedIcon from '@mui/icons-material/PhoneIphoneOutlined'
import RemoveOutlinedIcon from '@mui/icons-material/RemoveOutlined'
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Grid from '@mui/material/Grid'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, money } from '../api/client'
import type { Order, Product } from '../api/types'
import PublicLayout from './PublicLayout'

export default function ProductPage() {
  const { id = '' } = useParams()
  const productId = Number(id)
  const [email, setEmail] = useState('')
  const [contact, setContact] = useState('')
  const [password, setPassword] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)

  const productQuery = useQuery({
    queryKey: ['public-product', productId],
    queryFn: () => api<Product>(`/api/public/products/${productId}`),
    enabled: productId > 0,
  })
  const product = productQuery.data

  const createOrder = useMutation({
    mutationFn: () =>
      api<Order>('/api/public/orders', {
        method: 'POST',
        body: JSON.stringify({
          productId,
          quantity,
          buyerEmail: email,
          buyerContact: contact,
          queryPassword: password,
        }),
      }),
  })

  if (productQuery.isLoading) {
    return (
      <PublicLayout>
        <CircularProgress />
      </PublicLayout>
    )
  }

  if (productQuery.error || !product) {
    return (
      <PublicLayout>
        <Alert severity="error">商品不存在或已下架。</Alert>
      </PublicLayout>
    )
  }

  const currentProduct = product
  const soldOut =
    currentProduct.deliveryMode === 'auto' && currentProduct.availableStock === 0
  const amount = currentProduct.priceCents * quantity
  const normalizedEmail = email.trim()
  const emailError =
    submitted && (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
  const quantityError =
    submitted &&
    ((product.buyMin > 0 && quantity < product.buyMin) ||
      (product.buyMax > 0 && quantity > product.buyMax))
  const canSubmit = !soldOut && !emailError && !quantityError && Boolean(normalizedEmail)

  function submitOrder() {
    setSubmitted(true)
    const invalidEmail =
      !normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    const invalidQuantity =
      (currentProduct.buyMin > 0 && quantity < currentProduct.buyMin) ||
      (currentProduct.buyMax > 0 && quantity > currentProduct.buyMax)
    if (invalidEmail || invalidQuantity || soldOut) {
      return
    }
    createOrder.mutate()
  }

  return (
    <PublicLayout>
      <Stack spacing={2}>
        <Card className="acg-panel product-detail-panel">
          <CardContent className="product-detail-content">
            <Grid container spacing={{ xs: 2.5, md: 3.5 }} sx={{ alignItems: 'flex-start' }}>
              <Grid size={{ xs: 12, lg: 6 }}>
                <Box className="acg-detail-cover">
                  {product.cover ? (
                    <Box
                      component="img"
                      src={product.cover}
                      alt={product.name}
                      className="item-cover"
                    />
                  ) : (
                    <Box className="acg-cover-placeholder">
                      <Inventory2OutlinedIcon sx={{ fontSize: 54 }} />
                    </Box>
                  )}
                </Box>
              </Grid>

              <Grid size={{ xs: 12, lg: 6 }}>
                <Stack className="product-detail-side">
                  <Box>
                    <Typography variant="h4" component="h1" className="product-detail-title">
                      {product.name}
                    </Typography>
                    <Typography className="product-detail-subtitle">
                      填写接收信息，支付完成后按商品发货方式处理。
                    </Typography>
                  </Box>

                  <Stack className="product-meta-row">
                    <span className="badge-soft badge-soft-success">
                      <VerifiedOutlinedIcon className="badge-icon" />
                      {product.deliveryMode === 'auto' ? '自动发货' : '在线发货'}
                    </span>
                    <span className="badge-soft badge-soft-primary">
                      <LocalOfferOutlinedIcon className="badge-icon" />
                      已售 {product.soldCount}
                    </span>
                    <span
                      className={`badge-soft ${
                        soldOut ? 'badge-soft-danger' : 'badge-soft-success'
                      }`}
                    >
                      <Inventory2OutlinedIcon className="badge-icon" />
                      {soldOut
                        ? '已售罄'
                        : `库存 ${
                            product.availableStock >= 0
                              ? product.availableStock
                              : '充足'
                          }`}
                    </span>
                  </Stack>

                  <Box className="price acg-detail-price">
                    <span className="unit">¥</span>
                    {money(product.priceCents).replace('¥', '')}
                  </Box>

                  <Stack component="form" className="product-order-form">
                    <Field label="接收邮箱">
                      <TextField
                        required
                        fullWidth
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="请输入您的接收邮箱"
                        type="email"
                        autoComplete="email"
                        error={emailError}
                        helperText={emailError ? '请输入可用于接收发货提醒的邮箱。' : ' '}
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <EmailOutlinedIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </Field>
                    <Field label="联系方式">
                      <TextField
                        fullWidth
                        value={contact}
                        onChange={(event) => setContact(event.target.value)}
                        placeholder="请输入您的联系方式"
                        helperText=" "
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <PhoneIphoneOutlinedIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </Field>
                    <Field label="查询密码">
                      <TextField
                        fullWidth
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="设置查询订单的密码"
                        type="password"
                        autoComplete="new-password"
                        helperText=" "
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <LockOutlinedIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </Field>
                    <Field label="购买数量">
                      <Box className="qty-group-mui">
                        <IconButton
                          aria-label="减少购买数量"
                          size="small"
                          onClick={() =>
                            setQuantity((value) =>
                              Math.max(product.buyMin || 1, value - 1),
                            )
                          }
                        >
                          <RemoveOutlinedIcon fontSize="small" />
                        </IconButton>
                        <TextField
                          value={quantity}
                          onChange={(event) =>
                            setQuantity(
                              Math.max(product.buyMin || 1, Number(event.target.value) || 1),
                            )
                          }
                          type="number"
                          error={quantityError}
                          slotProps={{
                            htmlInput: { min: product.buyMin || 1 },
                          }}
                        />
                        <IconButton
                          aria-label="增加购买数量"
                          size="small"
                          onClick={() =>
                            setQuantity((value) =>
                              product.buyMax > 0
                                ? Math.min(product.buyMax, value + 1)
                                : value + 1,
                            )
                          }
                        >
                          <AddOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Field>

                    <Box className="cash-pay-mui">
                      <Typography className="cash-pay-title">
                        <CreditCardOutlinedIcon fontSize="small" />
                        付款
                      </Typography>
                      <Divider sx={{ my: 1.5 }} />
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                        <Button
                          className="pay-option active"
                          variant="contained"
                          disabled={soldOut || createOrder.isPending || (submitted && !canSubmit)}
                          onClick={submitOrder}
                        >
                          {createOrder.isPending
                            ? '正在创建...'
                            : `创建订单 ¥${(amount / 100).toFixed(2)}`}
                        </Button>
                      </Stack>
                    </Box>

                    {createOrder.error && (
                      <Alert severity="error">{createOrder.error.message}</Alert>
                    )}
                  </Stack>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Panel title="宝贝详情" icon={<InfoOutlinedIcon fontSize="small" />}>
          <Box className="secret-box">
            {product.description || '暂无商品说明。'}
          </Box>
        </Panel>
      </Stack>

      <Dialog
        open={Boolean(createOrder.data)}
        onClose={() => undefined}
        fullWidth
        maxWidth="xs"
        className="ios-sheet"
      >
        <DialogTitle>订单已创建</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="success">请保存订单号，支付完成后可直接查看发货内容。</Alert>
            <Box className="ios-order-number">
              <Typography variant="body2" color="text.secondary">
                订单号
              </Typography>
              <Typography className="mono" sx={{ fontWeight: 800, wordBreak: 'break-all' }}>
                {createOrder.data?.tradeNo}
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<ContentCopyOutlinedIcon />}
            onClick={async () => {
              if (createOrder.data?.tradeNo) {
                await navigator.clipboard.writeText(createOrder.data.tradeNo)
                setCopied(true)
              }
            }}
          >
            复制订单号
          </Button>
          <Button variant="contained" href={createOrder.data?.payUrl}>
            去支付
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={copied}
        autoHideDuration={2200}
        message="订单号已复制"
        onClose={() => setCopied(false)}
      />
    </PublicLayout>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography className="form-label-mui">{label}</Typography>
      {children}
    </Box>
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

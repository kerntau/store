import AddOutlinedIcon from '@mui/icons-material/AddOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined'
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import MenuItem from '@mui/material/MenuItem'
import Snackbar from '@mui/material/Snackbar'
import Stack from '@mui/material/Stack'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import { DataGrid, type GridColDef, type GridRowSelectionModel } from '@mui/x-data-grid'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { api, money } from '../api/client'
import type { Product } from '../api/types'
import {
  AdminCard,
  AdminPage,
  AdminStat,
  SoftStatus,
  TableSearch,
  ToolbarRow,
} from './AdminUi'
import { selectedNumberIds } from './AdminTools'

type Category = {
  id: number
  name: string
}

const emptySelection: GridRowSelectionModel = { type: 'include', ids: new Set() }
const defaultForm = {
  id: 0,
  categoryId: 1,
  name: '',
  description: '',
  cover: '',
  price: '1.00',
  deliveryMode: 'auto' as Product['deliveryMode'],
  autoDeliveryOrder: 'oldest' as Product['autoDeliveryOrder'],
  manualText: '已支付，正在发货中，请稍后查询。',
  queryPasswordMode: 'optional' as Product['queryPasswordMode'],
  status: 'enabled',
  stockVisible: true,
  buyMin: '1',
  buyMax: '0',
}

export default function AdminProducts() {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('all')
  const [rowSelectionModel, setRowSelectionModel] =
    useState<GridRowSelectionModel>(emptySelection)
  const [form, setForm] = useState(defaultForm)

  const productsQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => api<Product[]>('/api/admin/products'),
  })
  const categoriesQuery = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => api<Category[]>('/api/admin/categories'),
  })
  const saveProduct = useMutation({
    mutationFn: () =>
      api<Product>('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          id: form.id,
          categoryId: form.categoryId,
          name: form.name.trim(),
          description: form.description.trim(),
          cover: form.cover.trim(),
          priceCents: Math.round(Number(form.price || 0) * 100),
          deliveryMode: form.deliveryMode,
          autoDeliveryOrder: form.autoDeliveryOrder,
          manualText: form.manualText.trim(),
          queryPasswordMode: form.queryPasswordMode,
          status: form.status,
          stockVisible: form.stockVisible,
          buyMin: Number(form.buyMin) || 1,
          buyMax: Number(form.buyMax) || 0,
        }),
      }),
    onSuccess: () => {
      setOpen(false)
      setForm(defaultForm)
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setNotice(form.id > 0 ? '商品已更新。' : '商品已创建。')
    },
  })
  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data])
  const filteredProducts = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    return products.filter((product) => {
      const matchesKeyword =
        !normalized ||
        `${product.name} ${product.description}`.toLowerCase().includes(normalized)
      const matchesStatus = status === 'all' || product.status === status
      return matchesKeyword && matchesStatus
    })
  }, [keyword, products, status])
  const selectedProductIds = selectedNumberIds(rowSelectionModel, filteredProducts)
  const batchStatus = useMutation({
    mutationFn: (nextStatus: string) =>
      api<{ updated: number }>('/api/admin/products/batch-status', {
        method: 'POST',
        body: JSON.stringify({
          ids: selectedProductIds,
          status: nextStatus,
        }),
      }),
    onSuccess: (data) => {
      setRowSelectionModel(emptySelection)
      queryClient.invalidateQueries({ queryKey: ['admin-products'] })
      setNotice(`已更新 ${data.updated} 个商品。`)
    },
  })
  const enabledCount = products.filter((product) => product.status === 'enabled').length
  const disabledCount = products.filter((product) => product.status !== 'enabled').length
  const autoCount = products.filter((product) => product.deliveryMode === 'auto').length
  const manualCount = products.filter((product) => product.deliveryMode === 'manual').length
  const hasSelection = selectedProductIds.length > 0

  function openCreateDialog() {
    setForm(defaultForm)
    setOpen(true)
  }

  const openEditDialog = useCallback((product: Product) => {
    setForm({
      id: product.id,
      categoryId: product.categoryId,
      name: product.name,
      description: product.description,
      cover: product.cover,
      price: (product.priceCents / 100).toFixed(2),
      deliveryMode: product.deliveryMode,
      autoDeliveryOrder: product.autoDeliveryOrder,
      manualText: product.manualText,
      queryPasswordMode: product.queryPasswordMode,
      status: product.status,
      stockVisible: product.stockVisible,
      buyMin: String(product.buyMin || 1),
      buyMax: String(product.buyMax || 0),
    })
    setOpen(true)
  }, [])

  const columns = useMemo<GridColDef<Product>[]>(
    () => [
      { field: 'id', headerName: 'ID', width: 80 },
      { field: 'name', headerName: '商品', flex: 1, minWidth: 190 },
      {
        field: 'priceCents',
        headerName: '价格',
        width: 120,
        valueFormatter: (value) => money(Number(value)),
      },
      {
        field: 'deliveryMode',
        headerName: '发货',
        width: 120,
        renderCell: ({ value }) => (
          <SoftStatus
            color={value === 'auto' ? 'success' : 'primary'}
            label={value === 'auto' ? '自动发货' : '手动发货'}
          />
        ),
      },
      {
        field: 'availableStock',
        headerName: '库存',
        width: 110,
      },
      {
        field: 'soldCount',
        headerName: '销量',
        width: 110,
      },
      {
        field: 'status',
        headerName: '状态',
        width: 110,
        renderCell: ({ value }) => (
          <SoftStatus
            color={value === 'enabled' ? 'success' : 'default'}
            label={value === 'enabled' ? '已上架' : '未上架'}
          />
        ),
      },
      {
        field: 'actions',
        headerName: '操作',
        width: 110,
        sortable: false,
        renderCell: ({ row }) => (
          <Button
            size="small"
            startIcon={<EditOutlinedIcon />}
            onClick={() => openEditDialog(row)}
          >
            编辑
          </Button>
        ),
      },
    ],
    [openEditDialog],
  )

  return (
    <AdminPage title="商品管理" crumbs={['Trade', '商品管理']}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 2 }}>
          <AdminStat label="总商品" value={products.length} tone="primary" />
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <AdminStat label="已上架" value={enabledCount} tone="success" />
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <AdminStat label="未上架" value={disabledCount} tone="danger" />
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <AdminStat label="自动发货" value={autoCount} tone="info" />
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <AdminStat label="手动发货" value={manualCount} tone="dark" />
        </Grid>
        <Grid size={{ xs: 6, md: 2 }}>
          <AdminStat label="可售库存" value={products.reduce((sum, item) => sum + Math.max(0, item.availableStock), 0)} tone="success" />
        </Grid>
      </Grid>

      {productsQuery.error && <Alert severity="error">商品加载失败。</Alert>}
      <AdminCard
        toolbar={
          <ToolbarRow>
            <Button
              variant="contained"
              startIcon={<AddOutlinedIcon />}
              onClick={openCreateDialog}
            >
              添加商品
            </Button>
            <Button
              variant="outlined"
              startIcon={<KeyboardArrowUpOutlinedIcon />}
              disabled={!hasSelection || batchStatus.isPending}
              onClick={() => batchStatus.mutate('enabled')}
            >
              上架选中商品
            </Button>
            <Button
              color="inherit"
              variant="outlined"
              startIcon={<KeyboardArrowDownOutlinedIcon />}
              disabled={!hasSelection || batchStatus.isPending}
              onClick={() => batchStatus.mutate('disabled')}
            >
              下架选中商品
            </Button>
            <Button
              color="error"
              variant="outlined"
              startIcon={<DeleteOutlineOutlinedIcon />}
              disabled
            >
              删除需二次确认
            </Button>
          </ToolbarRow>
        }
      >
        <Stack spacing={1.5}>
          <TableSearch>
            <TextField
              label="商品关键词"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              sx={{ minWidth: { md: 260 } }}
            />
            <TextField
              select
              label="上架状态"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              sx={{ minWidth: { md: 160 } }}
            >
              <MenuItem value="all">全部状态</MenuItem>
              <MenuItem value="enabled">已上架</MenuItem>
              <MenuItem value="disabled">未上架</MenuItem>
            </TextField>
          </TableSearch>
          <Box className="admin-grid-wrap">
            <DataGrid
              rows={filteredProducts}
              columns={columns}
              loading={productsQuery.isLoading}
              checkboxSelection
              rowSelectionModel={rowSelectionModel}
              onRowSelectionModelChange={setRowSelectionModel}
              pageSizeOptions={[10, 25, 50]}
              initialState={{
                pagination: { paginationModel: { pageSize: 10, page: 0 } },
              }}
              disableRowSelectionOnClick
            />
          </Box>
        </Stack>
      </AdminCard>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{form.id > 0 ? '编辑商品' : '新建商品'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="分类"
                value={form.categoryId}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    categoryId: Number(event.target.value),
                  }))
                }
              >
                {(categoriesQuery.data ?? [{ id: 1, name: '默认分类' }]).map(
                  (category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ),
                )}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                select
                label="状态"
                value={form.status}
                onChange={(event) =>
                  setForm((old) => ({ ...old, status: event.target.value }))
                }
              >
                <MenuItem value="enabled">已上架</MenuItem>
                <MenuItem value="disabled">未上架</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                fullWidth
                label="商品名称"
                value={form.name}
                onChange={(event) =>
                  setForm((old) => ({ ...old, name: event.target.value }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="价格"
                type="number"
                value={form.price}
                onChange={(event) =>
                  setForm((old) => ({ ...old, price: event.target.value }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="封面图 URL"
                value={form.cover}
                onChange={(event) =>
                  setForm((old) => ({ ...old, cover: event.target.value }))
                }
                helperText="建议 16:9 图片，前台会按比例展示。"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="说明"
                multiline
                minRows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((old) => ({ ...old, description: event.target.value }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                select
                label="发货模式"
                value={form.deliveryMode}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    deliveryMode: event.target.value as Product['deliveryMode'],
                  }))
                }
              >
                <MenuItem value="auto">自动发货</MenuItem>
                <MenuItem value="manual">手动发货</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                select
                label="自动发货顺序"
                value={form.autoDeliveryOrder}
                disabled={form.deliveryMode !== 'auto'}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    autoDeliveryOrder: event.target.value as Product['autoDeliveryOrder'],
                  }))
                }
              >
                <MenuItem value="oldest">最早导入优先</MenuItem>
                <MenuItem value="newest">最新导入优先</MenuItem>
                <MenuItem value="random">随机发货</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                select
                label="查询密码"
                value={form.queryPasswordMode}
                onChange={(event) =>
                  setForm((old) => ({
                    ...old,
                    queryPasswordMode: event.target.value as Product['queryPasswordMode'],
                  }))
                }
              >
                <MenuItem value="none">不需要</MenuItem>
                <MenuItem value="optional">买家可选</MenuItem>
                <MenuItem value="required">必须设置</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="最小购买数"
                type="number"
                value={form.buyMin}
                onChange={(event) =>
                  setForm((old) => ({ ...old, buyMin: event.target.value }))
                }
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="最大购买数"
                type="number"
                value={form.buyMax}
                onChange={(event) =>
                  setForm((old) => ({ ...old, buyMax: event.target.value }))
                }
                helperText="0 表示不限。"
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.stockVisible}
                    onChange={(event) =>
                      setForm((old) => ({ ...old, stockVisible: event.target.checked }))
                    }
                  />
                }
                label="前台显示库存"
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="手动发货提示"
                multiline
                minRows={2}
                value={form.manualText}
                disabled={form.deliveryMode !== 'manual'}
                onChange={(event) =>
                  setForm((old) => ({ ...old, manualText: event.target.value }))
                }
              />
            </Grid>
            {saveProduct.error && (
              <Grid size={{ xs: 12 }}>
                <Alert severity="error">{saveProduct.error.message}</Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>取消</Button>
          <Button
            variant="contained"
            disabled={!form.name || saveProduct.isPending}
            onClick={() => saveProduct.mutate()}
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2800}
        message={notice}
        onClose={() => setNotice('')}
      />
    </AdminPage>
  )
}

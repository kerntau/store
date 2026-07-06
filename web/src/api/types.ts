export type ApiResponse<T> = {
  code: number
  msg?: string
  data: T
}

export type Product = {
  id: number
  categoryId: number
  name: string
  description: string
  cover: string
  priceCents: number
  status: string
  deliveryMode: 'auto' | 'manual'
  autoDeliveryOrder: 'oldest' | 'newest' | 'random'
  manualText: string
  queryPasswordMode: 'none' | 'optional' | 'required'
  stockVisible: boolean
  buyMin: number
  buyMax: number
  availableStock: number
  soldCount: number
}

export type Order = {
  id: number
  tradeNo: string
  productId: number
  productName: string
  quantity: number
  amountCents: number
  buyerEmail: string
  buyerContact: string
  paymentStatus: 'pending' | 'paid' | 'failed' | 'cancelled'
  deliveryStatus: 'pending' | 'delivered'
  deliveryContent?: string
  payUrl: string
  paidAt?: string
  deliveredAt?: string
  createdAt: string
}

export type Card = {
  id: number
  productId: number
  secret: string
  previewText: string
  status: 'available' | 'sold' | 'locked'
  note: string
  createdAt: string
}

export type DashboardStats = {
  productCount: number
  orderCount: number
  paidOrders: number
  revenueCents: number
  stockCount: number
}

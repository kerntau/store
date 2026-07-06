package app

import "time"

type Admin struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	Name         string    `json:"name"`
	PasswordHash string    `json:"-"`
	CreatedAt    time.Time `json:"createdAt"`
}

type Category struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Sort      int       `json:"sort"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Product struct {
	ID                int64     `json:"id"`
	CategoryID        int64     `json:"categoryId"`
	Name              string    `json:"name"`
	Description       string    `json:"description"`
	Cover             string    `json:"cover"`
	PriceCents        int64     `json:"priceCents"`
	Status            string    `json:"status"`
	DeliveryMode      string    `json:"deliveryMode"`
	AutoDeliveryOrder string    `json:"autoDeliveryOrder"`
	ManualText        string    `json:"manualText"`
	QueryPasswordMode string    `json:"queryPasswordMode"`
	StockVisible      bool      `json:"stockVisible"`
	BuyMin            int       `json:"buyMin"`
	BuyMax            int       `json:"buyMax"`
	AvailableStock    int       `json:"availableStock"`
	SoldCount         int64     `json:"soldCount"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type Card struct {
	ID          int64      `json:"id"`
	ProductID   int64      `json:"productId"`
	Secret      string     `json:"secret"`
	PreviewText string     `json:"previewText"`
	Status      string     `json:"status"`
	SoldOrderID *int64     `json:"soldOrderId"`
	SoldAt      *time.Time `json:"soldAt"`
	Note        string     `json:"note"`
	CreatedAt   time.Time  `json:"createdAt"`
}

type Order struct {
	ID               int64      `json:"id"`
	TradeNo          string     `json:"tradeNo"`
	ProductID        int64      `json:"productId"`
	ProductName      string     `json:"productName"`
	Quantity         int        `json:"quantity"`
	AmountCents      int64      `json:"amountCents"`
	BuyerEmail       string     `json:"buyerEmail"`
	BuyerContact     string     `json:"buyerContact"`
	PaymentChannelID *int64     `json:"paymentChannelId"`
	PaymentStatus    string     `json:"paymentStatus"`
	DeliveryStatus   string     `json:"deliveryStatus"`
	DeliveryContent  string     `json:"deliveryContent,omitempty"`
	PayURL           string     `json:"payUrl"`
	PaidAt           *time.Time `json:"paidAt"`
	DeliveredAt      *time.Time `json:"deliveredAt"`
	CreatedIP        string     `json:"createdIp"`
	CreatedUserAgent string     `json:"createdUserAgent"`
	CreatedAt        time.Time  `json:"createdAt"`
}

type APIResponse struct {
	Code int         `json:"code"`
	Msg  string      `json:"msg,omitempty"`
	Data interface{} `json:"data,omitempty"`
}

const (
	StatusEnabled  = "enabled"
	StatusDisabled = "disabled"

	DeliveryAuto   = "auto"
	DeliveryManual = "manual"

	PaymentPending   = "pending"
	PaymentPaid      = "paid"
	PaymentFailed    = "failed"
	PaymentCancelled = "cancelled"

	DeliveryPending   = "pending"
	DeliveryDelivered = "delivered"

	CardAvailable = "available"
	CardSold      = "sold"
	CardLocked    = "locked"
)

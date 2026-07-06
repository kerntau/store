package app

import (
	"errors"
	"net/http"
)

func (a *App) loadProduct(r *http.Request, id int64) (Product, error) {
	var p Product
	err := a.db.QueryRow(r.Context(), `
		select p.id,p.category_id,p.name,p.description,p.cover,p.price_cents,p.status,
		       p.delivery_mode,p.auto_delivery_order,p.manual_text,p.query_password_mode,
		       p.stock_visible,p.buy_min,p.buy_max,p.created_at,p.updated_at,
		       coalesce(stock.available_stock,0),coalesce(sales.sold_count,0)
		from products p
		left join (
			select product_id,count(*) as available_stock
			from product_cards
			where status='available'
			group by product_id
		) stock on stock.product_id=p.id
		left join (
			select product_id,coalesce(sum(quantity),0) as sold_count
			from orders
			where payment_status='paid'
			group by product_id
		) sales on sales.product_id=p.id
		where p.id=$1
		`, id).
		Scan(&p.ID, &p.CategoryID, &p.Name, &p.Description, &p.Cover, &p.PriceCents, &p.Status,
			&p.DeliveryMode, &p.AutoDeliveryOrder, &p.ManualText, &p.QueryPasswordMode,
			&p.StockVisible, &p.BuyMin, &p.BuyMax, &p.CreatedAt, &p.UpdatedAt, &p.AvailableStock, &p.SoldCount)
	return p, err
}

func (a *App) loadOrderByTradeNo(r *http.Request, tradeNo string) (Order, error) {
	var o Order
	var channelID int64
	err := a.db.QueryRow(r.Context(), `
		select o.id,o.trade_no,o.product_id,p.name,o.quantity,o.amount_cents,o.buyer_email,o.buyer_contact,
		       coalesce(o.payment_channel_id,0),o.payment_status,o.delivery_status,coalesce(o.delivery_content,''),
		       coalesce(o.pay_url,''),o.paid_at,o.delivered_at,o.created_ip,o.created_user_agent,o.created_at
		from orders o
		join products p on p.id=o.product_id
		where o.trade_no=$1`, tradeNo).
		Scan(&o.ID, &o.TradeNo, &o.ProductID, &o.ProductName, &o.Quantity, &o.AmountCents, &o.BuyerEmail, &o.BuyerContact,
			&channelID, &o.PaymentStatus, &o.DeliveryStatus, &o.DeliveryContent,
			&o.PayURL, &o.PaidAt, &o.DeliveredAt, &o.CreatedIP, &o.CreatedUserAgent, &o.CreatedAt)
	if channelID > 0 {
		o.PaymentChannelID = &channelID
	}
	return o, err
}

func (a *App) loadOrderByKeyword(r *http.Request, keyword string) (Order, error) {
	var o Order
	var channelID int64
	normalized := normalizeEmail(keyword)
	err := a.db.QueryRow(r.Context(), `
		select o.id,o.trade_no,o.product_id,p.name,o.quantity,o.amount_cents,o.buyer_email,o.buyer_contact,
		       coalesce(o.payment_channel_id,0),o.payment_status,o.delivery_status,coalesce(o.delivery_content,''),
		       coalesce(o.pay_url,''),o.paid_at,o.delivered_at,o.created_ip,o.created_user_agent,o.created_at
		from orders o
		join products p on p.id=o.product_id
		where o.trade_no=$1 or lower(o.buyer_email)=$2 or o.buyer_contact=$1
		order by o.id desc
		limit 1`, keyword, normalized).
		Scan(&o.ID, &o.TradeNo, &o.ProductID, &o.ProductName, &o.Quantity, &o.AmountCents, &o.BuyerEmail, &o.BuyerContact,
			&channelID, &o.PaymentStatus, &o.DeliveryStatus, &o.DeliveryContent,
			&o.PayURL, &o.PaidAt, &o.DeliveredAt, &o.CreatedIP, &o.CreatedUserAgent, &o.CreatedAt)
	if channelID > 0 {
		o.PaymentChannelID = &channelID
	}
	return o, err
}

func (a *App) verifyQueryPassword(r *http.Request, orderID int64, password string) error {
	var hash *string
	if err := a.db.QueryRow(r.Context(), `select query_password_hash from orders where id=$1`, orderID).Scan(&hash); err != nil {
		return errors.New("order not found")
	}
	if hash == nil || *hash == "" {
		return nil
	}
	if password == "" || !checkPassword(*hash, password) {
		return errors.New("query password is incorrect")
	}
	return nil
}

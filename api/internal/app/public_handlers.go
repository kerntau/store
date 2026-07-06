package app

import (
	"fmt"
	"net/http"
	"net/mail"
	"strings"

	"github.com/go-chi/chi/v5"
)

func (a *App) publicProducts(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Query(r.Context(), `
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
		where p.status='enabled'
		order by p.id desc`)
	if err != nil {
		fail(w, http.StatusInternalServerError, "load products failed")
		return
	}
	defer rows.Close()

	products := []Product{}
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.CategoryID, &p.Name, &p.Description, &p.Cover, &p.PriceCents, &p.Status, &p.DeliveryMode, &p.AutoDeliveryOrder, &p.ManualText, &p.QueryPasswordMode, &p.StockVisible, &p.BuyMin, &p.BuyMax, &p.CreatedAt, &p.UpdatedAt, &p.AvailableStock, &p.SoldCount); err != nil {
			fail(w, http.StatusInternalServerError, "scan products failed")
			return
		}
		if !p.StockVisible {
			p.AvailableStock = -1
		}
		products = append(products, p)
	}
	if err := rows.Err(); err != nil {
		fail(w, http.StatusInternalServerError, "scan products failed")
		return
	}
	respond(w, http.StatusOK, "success", products)
}

func (a *App) publicProduct(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDParam(r, "id")
	if err != nil {
		fail(w, http.StatusBadRequest, "invalid product id")
		return
	}
	p, err := a.loadProduct(r, id)
	if err != nil || p.Status != StatusEnabled {
		fail(w, http.StatusNotFound, "product not found")
		return
	}
	if !p.StockVisible {
		p.AvailableStock = -1
	}
	respond(w, http.StatusOK, "success", p)
}

type createOrderRequest struct {
	ProductID     int64  `json:"productId"`
	Quantity      int    `json:"quantity"`
	BuyerEmail    string `json:"buyerEmail"`
	BuyerContact  string `json:"buyerContact"`
	QueryPassword string `json:"queryPassword"`
	PayChannelID  *int64 `json:"payChannelId"`
}

func (a *App) createOrder(w http.ResponseWriter, r *http.Request) {
	var req createOrderRequest
	if err := decode(r, &req); err != nil {
		fail(w, http.StatusBadRequest, "invalid request")
		return
	}
	req.BuyerEmail = normalizeEmail(req.BuyerEmail)
	req.BuyerContact = strings.TrimSpace(req.BuyerContact)
	if req.ProductID <= 0 || req.Quantity <= 0 || !validEmail(req.BuyerEmail) {
		fail(w, http.StatusBadRequest, "product, quantity and email are required")
		return
	}

	product, err := a.loadProduct(r, req.ProductID)
	if err != nil || product.Status != StatusEnabled {
		fail(w, http.StatusBadRequest, "product is not available")
		return
	}
	if product.BuyMin > 0 && req.Quantity < product.BuyMin {
		fail(w, http.StatusBadRequest, fmt.Sprintf("minimum quantity is %d", product.BuyMin))
		return
	}
	if product.BuyMax > 0 && req.Quantity > product.BuyMax {
		fail(w, http.StatusBadRequest, fmt.Sprintf("maximum quantity is %d", product.BuyMax))
		return
	}
	if product.DeliveryMode == DeliveryAuto && product.AvailableStock < req.Quantity {
		fail(w, http.StatusConflict, "stock is not enough")
		return
	}
	if req.PayChannelID != nil {
		var enabled bool
		err := a.db.QueryRow(r.Context(), `select enabled from payment_channels where id=$1`, *req.PayChannelID).Scan(&enabled)
		if err != nil || !enabled {
			fail(w, http.StatusBadRequest, "payment channel is not available")
			return
		}
	}

	no, err := tradeNo()
	if err != nil {
		fail(w, http.StatusInternalServerError, "trade number failed")
		return
	}
	var passwordHash *string
	switch product.QueryPasswordMode {
	case "required":
		if strings.TrimSpace(req.QueryPassword) == "" {
			fail(w, http.StatusBadRequest, "query password is required")
			return
		}
		h, err := hashPassword(req.QueryPassword)
		if err != nil {
			fail(w, http.StatusInternalServerError, "password hash failed")
			return
		}
		passwordHash = &h
	case "optional":
		if strings.TrimSpace(req.QueryPassword) != "" {
			h, err := hashPassword(req.QueryPassword)
			if err != nil {
				fail(w, http.StatusInternalServerError, "password hash failed")
				return
			}
			passwordHash = &h
		}
	case "none":
	default:
		fail(w, http.StatusBadRequest, "product query password mode is invalid")
		return
	}

	amount := product.PriceCents * int64(req.Quantity)
	payURL := fmt.Sprintf("%s/api/payments/mock/success/%s", requestBaseURL(r), no)
	row := a.db.QueryRow(r.Context(), `
		insert into orders(trade_no,product_id,quantity,amount_cents,buyer_email,buyer_contact,query_password_hash,
		                   payment_channel_id,payment_status,delivery_status,pay_url,created_ip,created_user_agent,created_at)
		values($1,$2,$3,$4,$5,$6,$7,$8,'pending','pending',$9,$10,$11,now())
		returning id,created_at`,
		no, req.ProductID, req.Quantity, amount, req.BuyerEmail, req.BuyerContact, passwordHash, req.PayChannelID, payURL, r.RemoteAddr, r.UserAgent())
	var order Order
	order.TradeNo = no
	order.ProductID = req.ProductID
	order.ProductName = product.Name
	order.Quantity = req.Quantity
	order.AmountCents = amount
	order.BuyerEmail = req.BuyerEmail
	order.BuyerContact = req.BuyerContact
	order.PayURL = payURL
	order.PaymentStatus = PaymentPending
	order.DeliveryStatus = DeliveryPending
	if err := row.Scan(&order.ID, &order.CreatedAt); err != nil {
		fail(w, http.StatusInternalServerError, "create order failed")
		return
	}

	respond(w, http.StatusOK, "order created", order)
}

func (a *App) orderStatus(w http.ResponseWriter, r *http.Request) {
	order, err := a.loadOrderByTradeNo(r, chiParam(r, "tradeNo"))
	if err != nil {
		fail(w, http.StatusNotFound, "order not found")
		return
	}
	respond(w, http.StatusOK, "success", publicOrder(order))
}

type queryOrderRequest struct {
	Keyword       string `json:"keyword"`
	BuyerEmail    string `json:"buyerEmail"`
	QueryPassword string `json:"queryPassword"`
}

func (a *App) queryOrder(w http.ResponseWriter, r *http.Request) {
	var req queryOrderRequest
	if err := decode(r, &req); err != nil {
		fail(w, http.StatusBadRequest, "invalid request")
		return
	}
	keyword := strings.TrimSpace(req.Keyword)
	if keyword == "" {
		fail(w, http.StatusBadRequest, "order number or contact is required")
		return
	}
	order, err := a.loadOrderByKeyword(r, keyword)
	if err != nil {
		fail(w, http.StatusNotFound, "order not found")
		return
	}
	if req.BuyerEmail != "" && normalizeEmail(order.BuyerEmail) != normalizeEmail(req.BuyerEmail) {
		fail(w, http.StatusNotFound, "order not found")
		return
	}
	if err := a.verifyQueryPassword(r, order.ID, req.QueryPassword); err != nil {
		fail(w, http.StatusForbidden, err.Error())
		return
	}
	respond(w, http.StatusOK, "success", publicOrder(order))
}

func (a *App) orderSecret(w http.ResponseWriter, r *http.Request) {
	var req queryOrderRequest
	if err := decode(r, &req); err != nil {
		fail(w, http.StatusBadRequest, "invalid request")
		return
	}
	order, err := a.loadOrderByTradeNo(r, chiParam(r, "tradeNo"))
	if err != nil {
		fail(w, http.StatusNotFound, "order not found")
		return
	}
	if normalizeEmail(order.BuyerEmail) != normalizeEmail(req.BuyerEmail) {
		fail(w, http.StatusForbidden, "email does not match")
		return
	}
	if err := a.verifyQueryPassword(r, order.ID, req.QueryPassword); err != nil {
		fail(w, http.StatusForbidden, err.Error())
		return
	}
	if order.PaymentStatus != PaymentPaid {
		fail(w, http.StatusConflict, "order is not paid")
		return
	}
	if order.DeliveryStatus != DeliveryDelivered {
		fail(w, http.StatusConflict, "order is waiting for delivery")
		return
	}
	respond(w, http.StatusOK, "success", map[string]string{"secret": order.DeliveryContent})
}

func chiParam(r *http.Request, name string) string {
	return strings.TrimSpace(chi.URLParam(r, name))
}

func requestBaseURL(r *http.Request) string {
	scheme := r.Header.Get("X-Forwarded-Proto")
	if scheme == "" {
		scheme = "http"
	}
	host := r.Header.Get("X-Forwarded-Host")
	if host == "" {
		host = r.Host
	}
	return scheme + "://" + host
}

func validEmail(email string) bool {
	if email == "" {
		return false
	}
	addr, err := mail.ParseAddress(email)
	return err == nil && normalizeEmail(addr.Address) == email
}

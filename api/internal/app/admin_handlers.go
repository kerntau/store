package app

import (
	"net/http"
	"strconv"
	"strings"
	"time"
)

func (a *App) adminLogin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := decode(r, &req); err != nil {
		fail(w, http.StatusBadRequest, "invalid request")
		return
	}

	var admin Admin
	err := a.db.QueryRow(r.Context(), `select id,email,name,password_hash,created_at from admins where email=$1`, normalizeEmail(req.Email)).
		Scan(&admin.ID, &admin.Email, &admin.Name, &admin.PasswordHash, &admin.CreatedAt)
	if err != nil || !checkPassword(admin.PasswordHash, req.Password) {
		fail(w, http.StatusUnauthorized, "email or password is incorrect")
		return
	}
	t, err := token()
	if err != nil {
		fail(w, http.StatusInternalServerError, "create token failed")
		return
	}
	if err := a.redis.Set(r.Context(), "admin_session:"+t, admin.ID, a.cfg.SessionTTL).Err(); err != nil {
		fail(w, http.StatusInternalServerError, "save session failed")
		return
	}
	respond(w, http.StatusOK, "login success", map[string]interface{}{"token": t, "admin": admin})
}

func (a *App) adminLogout(w http.ResponseWriter, r *http.Request) {
	raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	if raw != "" {
		_ = a.redis.Del(r.Context(), "admin_session:"+raw).Err()
	}
	respond(w, http.StatusOK, "logout success", nil)
}

func (a *App) adminDashboard(w http.ResponseWriter, r *http.Request) {
	var stats struct {
		ProductCount int64 `json:"productCount"`
		OrderCount   int64 `json:"orderCount"`
		PaidOrders   int64 `json:"paidOrders"`
		RevenueCents int64 `json:"revenueCents"`
		StockCount   int64 `json:"stockCount"`
	}
	_ = a.db.QueryRow(r.Context(), `select count(*) from products`).Scan(&stats.ProductCount)
	_ = a.db.QueryRow(r.Context(), `select count(*) from orders`).Scan(&stats.OrderCount)
	_ = a.db.QueryRow(r.Context(), `select count(*), coalesce(sum(amount_cents),0) from orders where payment_status='paid'`).Scan(&stats.PaidOrders, &stats.RevenueCents)
	_ = a.db.QueryRow(r.Context(), `select count(*) from product_cards where status='available'`).Scan(&stats.StockCount)
	respond(w, http.StatusOK, "success", stats)
}

func (a *App) adminCategories(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Query(r.Context(), `select id,name,sort,status,created_at,updated_at from categories order by sort asc,id desc`)
	if err != nil {
		fail(w, http.StatusInternalServerError, "load categories failed")
		return
	}
	defer rows.Close()
	list := []Category{}
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Sort, &c.Status, &c.CreatedAt, &c.UpdatedAt); err != nil {
			fail(w, http.StatusInternalServerError, "scan categories failed")
			return
		}
		list = append(list, c)
	}
	respond(w, http.StatusOK, "success", list)
}

func (a *App) adminSaveCategory(w http.ResponseWriter, r *http.Request) {
	var req Category
	if err := decode(r, &req); err != nil || strings.TrimSpace(req.Name) == "" {
		fail(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.Status == "" {
		req.Status = StatusEnabled
	}
	if !validStatus(req.Status) {
		fail(w, http.StatusBadRequest, "category status is invalid")
		return
	}
	if req.ID > 0 {
		tag, err := a.db.Exec(r.Context(), `update categories set name=$2,sort=$3,status=$4,updated_at=now() where id=$1`, req.ID, strings.TrimSpace(req.Name), req.Sort, req.Status)
		if err != nil {
			fail(w, http.StatusInternalServerError, "update category failed")
			return
		}
		if tag.RowsAffected() == 0 {
			fail(w, http.StatusNotFound, "category not found")
			return
		}
		a.audit(r.Context(), "updated category "+req.Name)
	} else {
		if err := a.db.QueryRow(r.Context(), `insert into categories(name,sort,status,created_at,updated_at) values($1,$2,$3,now(),now()) returning id`, strings.TrimSpace(req.Name), req.Sort, req.Status).Scan(&req.ID); err != nil {
			fail(w, http.StatusInternalServerError, "create category failed")
			return
		}
		a.audit(r.Context(), "created category "+req.Name)
	}
	respond(w, http.StatusOK, "saved", req)
}

func (a *App) adminProducts(w http.ResponseWriter, r *http.Request) {
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
		products = append(products, p)
	}
	if err := rows.Err(); err != nil {
		fail(w, http.StatusInternalServerError, "scan products failed")
		return
	}
	respond(w, http.StatusOK, "success", products)
}

func (a *App) adminSaveProduct(w http.ResponseWriter, r *http.Request) {
	var req Product
	if err := decode(r, &req); err != nil || req.CategoryID <= 0 || strings.TrimSpace(req.Name) == "" {
		fail(w, http.StatusBadRequest, "category and name are required")
		return
	}
	req.Name = strings.TrimSpace(req.Name)
	req.Cover = strings.TrimSpace(req.Cover)
	if req.Status == "" {
		req.Status = StatusEnabled
	}
	if req.DeliveryMode == "" {
		req.DeliveryMode = DeliveryAuto
	}
	if req.AutoDeliveryOrder == "" {
		req.AutoDeliveryOrder = "oldest"
	}
	if req.QueryPasswordMode == "" {
		req.QueryPasswordMode = "optional"
	}
	if req.BuyMin == 0 {
		req.BuyMin = 1
	}
	if msg := validateProduct(req); msg != "" {
		fail(w, http.StatusBadRequest, msg)
		return
	}
	var categoryExists bool
	_ = a.db.QueryRow(r.Context(), `select exists(select 1 from categories where id=$1)`, req.CategoryID).Scan(&categoryExists)
	if !categoryExists {
		fail(w, http.StatusBadRequest, "category does not exist")
		return
	}
	if req.ID > 0 {
		tag, err := a.db.Exec(r.Context(), `
			update products set category_id=$2,name=$3,description=$4,cover=$5,price_cents=$6,status=$7,
			 delivery_mode=$8,auto_delivery_order=$9,manual_text=$10,query_password_mode=$11,
			 stock_visible=$12,buy_min=$13,buy_max=$14,updated_at=now()
			where id=$1`,
			req.ID, req.CategoryID, req.Name, req.Description, req.Cover, req.PriceCents, req.Status,
			req.DeliveryMode, req.AutoDeliveryOrder, req.ManualText, req.QueryPasswordMode,
			req.StockVisible, req.BuyMin, req.BuyMax)
		if err != nil {
			fail(w, http.StatusInternalServerError, "update product failed")
			return
		}
		if tag.RowsAffected() == 0 {
			fail(w, http.StatusNotFound, "product not found")
			return
		}
		a.audit(r.Context(), "updated product "+req.Name)
	} else {
		err := a.db.QueryRow(r.Context(), `
			insert into products(category_id,name,description,cover,price_cents,status,delivery_mode,auto_delivery_order,
			 manual_text,query_password_mode,stock_visible,buy_min,buy_max,created_at,updated_at)
			values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,now(),now()) returning id`,
			req.CategoryID, req.Name, req.Description, req.Cover, req.PriceCents, req.Status,
			req.DeliveryMode, req.AutoDeliveryOrder, req.ManualText, req.QueryPasswordMode,
			req.StockVisible, req.BuyMin, req.BuyMax).Scan(&req.ID)
		if err != nil {
			fail(w, http.StatusInternalServerError, "create product failed")
			return
		}
		a.audit(r.Context(), "created product "+req.Name)
	}
	respond(w, http.StatusOK, "saved", req)
}

func (a *App) adminBatchProductStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs    []int64 `json:"ids"`
		Status string  `json:"status"`
	}
	if err := decode(r, &req); err != nil || len(req.IDs) == 0 {
		fail(w, http.StatusBadRequest, "product ids are required")
		return
	}
	if !validStatus(req.Status) {
		fail(w, http.StatusBadRequest, "product status is invalid")
		return
	}
	tag, err := a.db.Exec(r.Context(), `update products set status=$2, updated_at=now() where id=any($1::bigint[])`, req.IDs, req.Status)
	if err != nil {
		fail(w, http.StatusInternalServerError, "update products failed")
		return
	}
	a.audit(r.Context(), "batch updated product status")
	respond(w, http.StatusOK, "updated", map[string]int64{"updated": tag.RowsAffected()})
}

func (a *App) adminCards(w http.ResponseWriter, r *http.Request) {
	productID, _ := strconv.ParseInt(r.URL.Query().Get("productId"), 10, 64)
	sql := `select id,product_id,secret,preview_text,status,sold_order_id,sold_at,note,created_at from product_cards`
	args := []interface{}{}
	if productID > 0 {
		sql += ` where product_id=$1`
		args = append(args, productID)
	}
	sql += ` order by id desc limit 500`
	rows, err := a.db.Query(r.Context(), sql, args...)
	if err != nil {
		fail(w, http.StatusInternalServerError, "load cards failed")
		return
	}
	defer rows.Close()
	list := []Card{}
	for rows.Next() {
		var c Card
		if err := rows.Scan(&c.ID, &c.ProductID, &c.Secret, &c.PreviewText, &c.Status, &c.SoldOrderID, &c.SoldAt, &c.Note, &c.CreatedAt); err != nil {
			fail(w, http.StatusInternalServerError, "scan cards failed")
			return
		}
		list = append(list, c)
	}
	respond(w, http.StatusOK, "success", list)
}

func (a *App) adminImportCards(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ProductID int64  `json:"productId"`
		Secrets   string `json:"secrets"`
		Unique    bool   `json:"unique"`
		Note      string `json:"note"`
	}
	if err := decode(r, &req); err != nil || req.ProductID <= 0 {
		fail(w, http.StatusBadRequest, "product and secrets are required")
		return
	}
	var productExists bool
	_ = a.db.QueryRow(r.Context(), `select exists(select 1 from products where id=$1)`, req.ProductID).Scan(&productExists)
	if !productExists {
		fail(w, http.StatusBadRequest, "product does not exist")
		return
	}
	lines := strings.Split(strings.ReplaceAll(req.Secrets, "\r\n", "\n"), "\n")
	success, skipped := 0, 0
	for _, line := range lines {
		secret := strings.TrimSpace(line)
		if secret == "" {
			continue
		}
		if req.Unique {
			var exists bool
			_ = a.db.QueryRow(r.Context(), `select exists(select 1 from product_cards where product_id=$1 and secret=$2)`, req.ProductID, secret).Scan(&exists)
			if exists {
				skipped++
				continue
			}
		}
		if _, err := a.db.Exec(r.Context(), `insert into product_cards(product_id,secret,status,note,created_at) values($1,$2,'available',$3,now())`, req.ProductID, secret, strings.TrimSpace(req.Note)); err != nil {
			skipped++
			continue
		}
		success++
	}
	a.audit(r.Context(), "imported cards")
	respond(w, http.StatusOK, "imported", map[string]int{"success": success, "skipped": skipped})
}

func (a *App) adminBatchCardStatus(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs    []int64 `json:"ids"`
		Status string  `json:"status"`
	}
	if err := decode(r, &req); err != nil || len(req.IDs) == 0 {
		fail(w, http.StatusBadRequest, "card ids are required")
		return
	}
	if req.Status != CardAvailable && req.Status != CardLocked {
		fail(w, http.StatusBadRequest, "card status is invalid")
		return
	}
	tag, err := a.db.Exec(r.Context(), `update product_cards set status=$2 where id=any($1::bigint[]) and status!='sold'`, req.IDs, req.Status)
	if err != nil {
		fail(w, http.StatusInternalServerError, "update cards failed")
		return
	}
	a.audit(r.Context(), "batch updated card status")
	respond(w, http.StatusOK, "updated", map[string]int64{"updated": tag.RowsAffected()})
}

func (a *App) adminDeleteCards(w http.ResponseWriter, r *http.Request) {
	var req struct {
		IDs []int64 `json:"ids"`
	}
	if err := decode(r, &req); err != nil || len(req.IDs) == 0 {
		fail(w, http.StatusBadRequest, "card ids are required")
		return
	}
	tag, err := a.db.Exec(r.Context(), `delete from product_cards where id=any($1::bigint[]) and status!='sold'`, req.IDs)
	if err != nil {
		fail(w, http.StatusInternalServerError, "delete cards failed")
		return
	}
	a.audit(r.Context(), "batch deleted cards")
	respond(w, http.StatusOK, "deleted", map[string]int64{"deleted": tag.RowsAffected()})
}

func (a *App) adminSetCardStatus(status string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id, err := parseIDParam(r, "id")
		if err != nil {
			fail(w, http.StatusBadRequest, "invalid card id")
			return
		}
		tag, err := a.db.Exec(r.Context(), `update product_cards set status=$2 where id=$1 and status!='sold'`, id, status)
		if err != nil {
			fail(w, http.StatusInternalServerError, "update card failed")
			return
		}
		if tag.RowsAffected() == 0 {
			fail(w, http.StatusBadRequest, "card is sold or does not exist")
			return
		}
		a.audit(r.Context(), "updated card status")
		respond(w, http.StatusOK, "updated", nil)
	}
}

func (a *App) adminOrders(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Query(r.Context(), `
		select o.id,o.trade_no,o.product_id,p.name,o.quantity,o.amount_cents,o.buyer_email,o.buyer_contact,
		       coalesce(o.payment_channel_id,0),o.payment_status,o.delivery_status,coalesce(o.delivery_content,''),
		       coalesce(o.pay_url,''),o.paid_at,o.delivered_at,o.created_ip,o.created_user_agent,o.created_at
		from orders o join products p on p.id=o.product_id order by o.id desc limit 500`)
	if err != nil {
		fail(w, http.StatusInternalServerError, "load orders failed")
		return
	}
	defer rows.Close()
	list := []Order{}
	for rows.Next() {
		var o Order
		var channelID int64
		if err := rows.Scan(&o.ID, &o.TradeNo, &o.ProductID, &o.ProductName, &o.Quantity, &o.AmountCents, &o.BuyerEmail, &o.BuyerContact,
			&channelID, &o.PaymentStatus, &o.DeliveryStatus, &o.DeliveryContent,
			&o.PayURL, &o.PaidAt, &o.DeliveredAt, &o.CreatedIP, &o.CreatedUserAgent, &o.CreatedAt); err != nil {
			fail(w, http.StatusInternalServerError, "scan orders failed")
			return
		}
		if channelID > 0 {
			o.PaymentChannelID = &channelID
		}
		list = append(list, o)
	}
	respond(w, http.StatusOK, "success", list)
}

func (a *App) adminCleanupPendingOrders(w http.ResponseWriter, r *http.Request) {
	tag, err := a.db.Exec(r.Context(), `delete from orders where payment_status='pending' and created_at < now() - interval '24 hours'`)
	if err != nil {
		fail(w, http.StatusInternalServerError, "cleanup orders failed")
		return
	}
	a.audit(r.Context(), "cleaned pending orders")
	respond(w, http.StatusOK, "cleaned", map[string]int64{"deleted": tag.RowsAffected()})
}

func (a *App) adminDeliverOrder(w http.ResponseWriter, r *http.Request) {
	id, err := parseIDParam(r, "id")
	if err != nil {
		fail(w, http.StatusBadRequest, "invalid order id")
		return
	}
	var req struct {
		Content string `json:"content"`
	}
	if err := decode(r, &req); err != nil || strings.TrimSpace(req.Content) == "" {
		fail(w, http.StatusBadRequest, "delivery content is required")
		return
	}
	content := strings.TrimSpace(req.Content)
	var tradeNo string
	if err := a.db.QueryRow(r.Context(), `
		update orders o set delivery_content=$2,delivery_status='delivered',delivered_at=now()
		from products p
		where o.id=$1 and o.product_id=p.id and o.payment_status='paid' and o.delivery_status='pending' and p.delivery_mode='manual'
		returning trade_no`, id, content).Scan(&tradeNo); err != nil {
		fail(w, http.StatusBadRequest, "order is not a paid pending manual-delivery order")
		return
	}
	a.audit(r.Context(), "manual delivered order "+tradeNo)
	order, err := a.loadOrderByTradeNo(r, tradeNo)
	if err != nil {
		fail(w, http.StatusInternalServerError, "load delivered order failed")
		return
	}
	order.DeliveryContent = content
	a.sendDeliveryEmail(r.Context(), order)
	respond(w, http.StatusOK, "delivered", nil)
}

func validStatus(status string) bool {
	return status == StatusEnabled || status == StatusDisabled
}

func validateProduct(p Product) string {
	if !validStatus(p.Status) {
		return "product status is invalid"
	}
	if p.DeliveryMode != DeliveryAuto && p.DeliveryMode != DeliveryManual {
		return "delivery mode is invalid"
	}
	if p.AutoDeliveryOrder != "oldest" && p.AutoDeliveryOrder != "newest" && p.AutoDeliveryOrder != "random" {
		return "auto delivery order is invalid"
	}
	if p.QueryPasswordMode != "none" && p.QueryPasswordMode != "optional" && p.QueryPasswordMode != "required" {
		return "query password mode is invalid"
	}
	if p.PriceCents < 0 {
		return "price must be greater than or equal to 0"
	}
	if p.BuyMin <= 0 {
		return "minimum quantity must be greater than 0"
	}
	if p.BuyMax < 0 {
		return "maximum quantity is invalid"
	}
	if p.BuyMax > 0 && p.BuyMax < p.BuyMin {
		return "maximum quantity must be greater than or equal to minimum quantity"
	}
	return ""
}

func (a *App) adminLogs(w http.ResponseWriter, r *http.Request) {
	rows, err := a.db.Query(r.Context(), `
		select l.id,coalesce(a.email,''),l.content,l.created_at
		from operation_logs l left join admins a on a.id=l.admin_id
		order by l.id desc limit 200`)
	if err != nil {
		fail(w, http.StatusInternalServerError, "load logs failed")
		return
	}
	defer rows.Close()
	type logRow struct {
		ID        int64     `json:"id"`
		Admin     string    `json:"admin"`
		Content   string    `json:"content"`
		CreatedAt time.Time `json:"createdAt"`
	}
	list := []logRow{}
	for rows.Next() {
		var row logRow
		if err := rows.Scan(&row.ID, &row.Admin, &row.Content, &row.CreatedAt); err != nil {
			fail(w, http.StatusInternalServerError, "scan logs failed")
			return
		}
		list = append(list, row)
	}
	respond(w, http.StatusOK, "success", list)
}

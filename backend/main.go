package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()

	// Hook para calcular comisiones al crear una venta
	app.OnRecordBeforeCreateRequest("sales").BindFunc(func(e *core.RecordCreateEvent) error {
		// 1. Obtener la tienda para saber la comisión de la plataforma
		shopId := e.Record.GetString("shop")
		if shopId == "" {
			return nil // O retornar error si es obligatorio
		}

		shop, err := app.FindRecordById("shops", shopId)
		if err != nil {
			return err
		}

		totalAmount := e.Record.GetFloat("total_amount")

		// 2. Calcular comisión de la plataforma
		// La comisión está guardada como porcentaje (ej. 5 para 5%)
		platformRate := shop.GetFloat("commission_rate")
		platformFee := totalAmount * (platformRate / 100)
		e.Record.Set("platform_fee", platformFee)

		// 3. Calcular comisión de afiliado si existe
		affiliateId := e.Record.GetString("affiliate")
		if affiliateId != "" {
			affiliate, err := app.FindRecordById("affiliates", affiliateId)
			if err == nil {
				// Validar que el afiliado esté activo (opcional, si agregamos campo 'active')
				affiliateRate := affiliate.GetFloat("commission_rate")
				affiliateComm := totalAmount * (affiliateRate / 100)
				e.Record.Set("affiliate_commission", affiliateComm)
			}
		}

		return e.Next()
	})

	// Hook para validar que el producto pertenece a la tienda antes de guardar un precio
	app.OnRecordBeforeCreateRequest("product_prices").BindFunc(func(e *core.RecordCreateEvent) error {
		productId := e.Record.GetString("product")
		product, err := app.FindRecordById("products", productId)
		if err != nil {
			return err
		}

		// Aquí podríamos validar más lógica de negocio, como rangos de precios mínimos
		if e.Record.GetFloat("price") < product.GetFloat("base_price") {
			// Advertencia o error si el precio es menor al base (opcional)
			// return errors.New("el precio no puede ser menor al precio base del producto")
		}
		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

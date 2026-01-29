package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
)

func main() {
	app := pocketbase.New()

	// --- CONFIGURACIÓN DE MIGRACIONES Y ADMIN ---
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: true,
	})

	// Inicialización: Admin y Esquema via Hook
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		// 1. Asegurar Admin
		totalAdmins, err := app.FindRecordsByFilter("_superusers", "id != ''", "", 1, 0, nil)
		if err == nil && len(totalAdmins) == 0 {
			superuserCollection, err := app.FindCollectionByNameOrId("_superusers")
			if err == nil {
				record := core.NewRecord(superuserCollection)
				record.Set("email", "admin@pati.com")
				record.Set("password", "1234567890")
				if err := app.Save(record); err != nil {
					log.Printf("❌ ERROR CREANDO ADMIN: %v", err)
				} else {
					log.Println("✅ Admin creado: admin@pati.com")
				}
			}
		}

		// 2. Asegurar Esquema
		log.Println("🔄 Iniciando verificación de esquema...")
		if err := ensureSchema(app); err != nil {
			log.Printf("❌ CRITICAL ERROR ASEGURANDO ESQUEMA: %v", err)
		} else {
			log.Println("✅ Esquema verificado correctamente.")
		}

		return e.Next()
	})

	// Endpoint para forzar reparación de esquema manualmente
	app.OnBeforeServe().Add(func(e *core.ServeEvent) error {
		e.Router.GET("/api/fix-schema", func(c *core.RequestEvent) error {
			if err := ensureSchema(app); err != nil {
				return c.String(500, "Error reparando esquema: "+err.Error())
			}
			return c.String(200, "Esquema reparado y verificado correctamente.")
		})
		return nil
	})

	// --- LÓGICA DE NEGOCIO ---
	// Hook para calcular comisiones al crear una venta
	app.OnRecordCreateRequest("sales").BindFunc(func(e *core.RecordRequestEvent) error {
		shopId := e.Record.GetString("shop")
		if shopId == "" {
			return nil
		}

		shop, err := app.FindRecordById("shops", shopId)
		if err != nil {
			return err
		}

		totalAmount := e.Record.GetFloat("total_amount")

		platformRate := shop.GetFloat("commission_rate")
		platformFee := totalAmount * (platformRate / 100)
		e.Record.Set("platform_fee", platformFee)

		affiliateId := e.Record.GetString("affiliate")
		if affiliateId != "" {
			affiliate, err := app.FindRecordById("affiliates", affiliateId)
			if err == nil {
				affiliateRate := affiliate.GetFloat("commission_rate")
				affiliateComm := totalAmount * (affiliateRate / 100)
				e.Record.Set("affiliate_commission", affiliateComm)
			}
		}

		return e.Next()
	})

	// Hook para validar precios de productos
	app.OnRecordCreateRequest("product_prices").BindFunc(func(e *core.RecordRequestEvent) error {
		productId := e.Record.GetString("product")
		product, err := app.FindRecordById("products", productId)
		if err != nil {
			return err
		}

		if e.Record.GetFloat("price") < product.GetFloat("base_price") {
			// Lógica de validación
		}
		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// ensureSchema crea o repara las colecciones necesarias
func ensureSchema(app *pocketbase.PocketBase) error {
	usersCol, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}
	log.Printf("ℹ️ ID de colección 'users': %s", usersCol.Id)

	// --- SHOPS ---
	shopsCol, err := app.FindCollectionByNameOrId("shops")
	recreateShops := false
	if err == nil {
		field := shopsCol.Fields.GetByName("owner")
		if relField, ok := field.(*core.RelationField); ok {
			if relField.CollectionId != usersCol.Id {
				log.Println("⚠️ ID de owner en 'shops' incorrecto. Marcado para recreación.")
				recreateShops = true
			}
		} else {
			recreateShops = true
		}
	}

	if recreateShops {
		log.Println("⚠️ Inconsistencia crítica en Shops. Ejecutando limpieza en cascada...")
		if sales, _ := app.FindCollectionByNameOrId("sales"); sales != nil {
			app.Delete(sales)
		}
		if products, _ := app.FindCollectionByNameOrId("products"); products != nil {
			app.Delete(products)
		}
		
		log.Println("🗑️ Eliminando colección 'shops' corrupta...")
		if err := app.Delete(shopsCol); err != nil {
			return err
		}
		shopsCol = nil
	}

	if shopsCol == nil {
		log.Println("🛠️ Creando colección 'shops'...")
		shopsCol = core.NewBaseCollection("shops")
		shopsCol.Fields.Add(&core.TextField{Name: "name", Required: true})
		shopsCol.Fields.Add(&core.NumberField{Name: "commission_rate"})
		shopsCol.Fields.Add(&core.RelationField{
			Name: "owner",
			CollectionId: usersCol.Id,
			MaxSelect: 1,
		})
		
		rule := ""
		shopsCol.ListRule = &rule
		shopsCol.ViewRule = &rule

		if err := app.Save(shopsCol); err != nil {
			return err
		}
	}

	// --- PRODUCTS ---
	productsCol, err := app.FindCollectionByNameOrId("products")
	if err == nil {
		field := productsCol.Fields.GetByName("shop")
		if relField, ok := field.(*core.RelationField); ok {
			if relField.CollectionId != shopsCol.Id {
				log.Println("⚠️ ID de shop en 'products' incorrecto. Recreando...")
				if sales, _ := app.FindCollectionByNameOrId("sales"); sales != nil {
					app.Delete(sales)
				}
				app.Delete(productsCol)
				productsCol = nil
			}
		}
		
		if productsCol != nil && productsCol.Fields.GetByName("image") == nil {
			log.Println("⚠️ Falta campo 'image' en 'products'. Recreando para actualizar esquema...")
			if sales, _ := app.FindCollectionByNameOrId("sales"); sales != nil {
				app.Delete(sales)
			}
			app.Delete(productsCol)
			productsCol = nil
		}
	}

	if productsCol == nil {
		log.Println("🛠️ Creando colección 'products'...")
		productsCol = core.NewBaseCollection("products")
		productsCol.Fields.Add(&core.TextField{Name: "name", Required: true})
		productsCol.Fields.Add(&core.NumberField{Name: "price"})
		productsCol.Fields.Add(&core.JSONField{Name: "group_prices"})
		productsCol.Fields.Add(&core.FileField{
			Name: "image",
			MaxSelect: 1,
			MaxSize: 5242880,
			MimeTypes: []string{"image/jpeg", "image/png", "image/svg+xml", "image/gif", "image/webp"},
		})
		productsCol.Fields.Add(&core.RelationField{
			Name: "shop",
			CollectionId: shopsCol.Id,
			MaxSelect: 1,
		})
		
		rule := ""
		productsCol.ListRule = &rule
		productsCol.ViewRule = &rule

		if err := app.Save(productsCol); err != nil {
			return err
		}
	}

	// --- AFFILIATES ---
	affiliatesCol, err := app.FindCollectionByNameOrId("affiliates")
	if err == nil {
		field := affiliatesCol.Fields.GetByName("user")
		if relField, ok := field.(*core.RelationField); ok {
			if relField.CollectionId != usersCol.Id {
				if sales, _ := app.FindCollectionByNameOrId("sales"); sales != nil {
					app.Delete(sales)
				}
				app.Delete(affiliatesCol)
				affiliatesCol = nil
			}
		}
	}

	if affiliatesCol == nil {
		log.Println("🛠️ Creando colección 'affiliates'...")
		affiliatesCol = core.NewBaseCollection("affiliates")
		affiliatesCol.Fields.Add(&core.TextField{Name: "code", Required: true})
		affiliatesCol.Fields.Add(&core.RelationField{
			Name: "user",
			CollectionId: usersCol.Id,
			MaxSelect: 1,
		})
		if err := app.Save(affiliatesCol); err != nil {
			return err
		}
	}
	
	// --- SALES ---
	salesCol, err := app.FindCollectionByNameOrId("sales")
	if err == nil {
		field := salesCol.Fields.GetByName("shop")
		if relField, ok := field.(*core.RelationField); ok {
			if relField.CollectionId != shopsCol.Id {
				app.Delete(salesCol)
				salesCol = nil
			}
		}
	}

	if salesCol == nil {
		log.Println("🛠️ Creando colección 'sales'...")
		salesCol = core.NewBaseCollection("sales")
		salesCol.Fields.Add(&core.NumberField{Name: "amount"})
		salesCol.Fields.Add(&core.RelationField{
			Name: "shop",
			CollectionId: shopsCol.Id,
			MaxSelect: 1,
		})
		salesCol.Fields.Add(&core.RelationField{
			Name: "product",
			CollectionId: productsCol.Id,
			MaxSelect: 1,
		})
		salesCol.Fields.Add(&core.RelationField{
			Name: "affiliate",
			CollectionId: affiliatesCol.Id,
			MaxSelect: 1,
		})
		if err := app.Save(salesCol); err != nil {
			return err
		}
	}

	return nil
}
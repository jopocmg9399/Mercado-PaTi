package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()

	// Inicialización: Admin y Esquema via Hook
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		// 1. Asegurar Admin
		totalAdmins, err := app.CountRecords("_superusers")
		if err == nil && totalAdmins == 0 {
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
			log.Printf("❌ ERROR ASEGURANDO ESQUEMA: %v", err)
		} else {
			log.Println("✅ Esquema verificado correctamente.")
		}

		return e.Next()
	})

	// Endpoint para forzar reparación de esquema manualmente
	app.OnBeforeServe().BindFunc(func(e *core.ServeEvent) error {
		e.Router.GET("/api/fix-schema", func(c *core.RequestEvent) error {
			if err := ensureSchema(app); err != nil {
				return c.String(500, "Error reparando esquema: "+err.Error())
			}
			return c.String(200, "Esquema reparado y verificado correctamente.")
		})
		return e.Next()
	})

	// --- LÓGICA DE NEGOCIO ---
	app.OnRecordCreateRequest().BindFunc(func(e *core.RecordRequestEvent) error {
		if e.Collection.Name != "sales" {
			return e.Next()
		}

		shopId := e.Record.GetString("shop")
		if shopId == "" {
			return e.Next()
		}

		shop, err := app.FindRecordById("shops", shopId)
		if err != nil {
			return err
		}

		// Usamos 'amount' para coincidir con el esquema
		totalAmount := e.Record.GetFloat("amount")

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

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// ensureSchema crea las colecciones necesarias automáticamente
func ensureSchema(app *pocketbase.PocketBase) error {
	// 1. Obtener ID de colección Users (necesario para relaciones)
	usersCol, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}

	// 2. SHOPS
	shopsCol, err := app.FindCollectionByNameOrId("shops")
	if err != nil {
		log.Println("🛠️ Creando colección: shops")
		shopsCol = core.NewBaseCollection("shops")
		shopsCol.Fields.Add(core.NewTextField("name"))
		shopsCol.Fields.Add(core.NewNumberField("commission_rate"))
		
		ownerRel := core.NewRelationField("owner")
		ownerRel.CollectionId = usersCol.Id
		ownerRel.MaxSelect = 1
		shopsCol.Fields.Add(ownerRel)

		if err := app.Save(shopsCol); err != nil {
			return err
		}
	}

	// 3. PRODUCTS
	productsCol, err := app.FindCollectionByNameOrId("products")
	if err != nil {
		log.Println("🛠️ Creando colección: products")
		productsCol = core.NewBaseCollection("products")
		productsCol.Fields.Add(core.NewTextField("name"))
		productsCol.Fields.Add(core.NewNumberField("price"))
		
		shopRel := core.NewRelationField("shop")
		shopRel.CollectionId = shopsCol.Id
		shopRel.CascadeDelete = true
		shopRel.MaxSelect = 1
		productsCol.Fields.Add(shopRel)

		imgRel := core.NewFileField("image")
		imgRel.MaxSelect = 1
		productsCol.Fields.Add(imgRel)

		if err := app.Save(productsCol); err != nil {
			return err
		}
	}

	// 4. AFFILIATES
	affiliatesCol, err := app.FindCollectionByNameOrId("affiliates")
	if err != nil {
		log.Println("🛠️ Creando colección: affiliates")
		affiliatesCol = core.NewBaseCollection("affiliates")
		
		codeField := core.NewTextField("code")
		affiliatesCol.Fields.Add(codeField)
		
		affiliatesCol.Fields.Add(core.NewNumberField("commission_rate"))

		userRel := core.NewRelationField("user")
		userRel.CollectionId = usersCol.Id
		userRel.MaxSelect = 1
		affiliatesCol.Fields.Add(userRel)

		if err := app.Save(affiliatesCol); err != nil {
			return err
		}
	}

	// 5. SALES
	salesCol, err := app.FindCollectionByNameOrId("sales")
	if err != nil {
		log.Println("🛠️ Creando colección: sales")
		salesCol = core.NewBaseCollection("sales")
		salesCol.Fields.Add(core.NewNumberField("amount"))
		salesCol.Fields.Add(core.NewNumberField("platform_fee"))
		salesCol.Fields.Add(core.NewNumberField("affiliate_commission"))

		shopRel := core.NewRelationField("shop")
		shopRel.CollectionId = shopsCol.Id
		shopRel.MaxSelect = 1
		salesCol.Fields.Add(shopRel)

		prodRel := core.NewRelationField("product")
		prodRel.CollectionId = productsCol.Id
		prodRel.MaxSelect = 1
		salesCol.Fields.Add(prodRel)

		affRel := core.NewRelationField("affiliate")
		affRel.CollectionId = affiliatesCol.Id
		affRel.MaxSelect = 1
		salesCol.Fields.Add(affRel)

		if err := app.Save(salesCol); err != nil {
			return err
		}
	}

	return nil
}

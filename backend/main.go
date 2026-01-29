package main

import (
	"log"
	"strings"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"
	
	// Importar migraciones (se debe crear el paquete, pero lo haremos inline o en carpeta)
	// Para simplificar en este entorno sin multi-archivo fácil, usaremos automigrate o
	// definiremos la migración aquí mismo si es posible, pero PocketBase prefiere archivos.
	// Vamos a registrar una migración programática directamente.
)

func main() {
	app := pocketbase.New()

	// Registrar comando de migraciones (necesario para que se ejecuten al inicio con --automigrate)
	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		Automigrate: true, // Esto habilita la auto-migración de esquemas si cambiamos structs
	})

	// Inicialización: Admin y Esquema via Hook (Más seguro que migraciones si no tenemos CLI access)
	// PERO vamos a hacerlo con logs EXPLICITOS y panic si falla para ver el error en Render.
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

		// 2. Asegurar Esquema con Logs Fuertes
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
			return c.String(200, "Esquema reparado y verificado correctamente. Reinicia el frontend si es necesario.")
		})
		return nil
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// ensureSchema crea o repara las colecciones necesarias
func ensureSchema(app *pocketbase.PocketBase) error {
	// Obtener la colección 'users' real
	usersCol, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}
	log.Printf("ℹ️ ID de colección 'users': %s", usersCol.Id)

	// --- SHOPS (y limpieza en cascada si es necesario) ---
	shopsCol, err := app.FindCollectionByNameOrId("shops")
	recreateShops := false
	if err == nil {
		// Verificar integridad
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
		// Borrar dependientes primero para evitar errores de FK
		if sales, _ := app.FindCollectionByNameOrId("sales"); sales != nil {
			log.Println("🗑️ Borrando 'sales' por dependencia...")
			app.DeleteCollection(sales)
		}
		if products, _ := app.FindCollectionByNameOrId("products"); products != nil {
			log.Println("🗑️ Borrando 'products' por dependencia...")
			app.DeleteCollection(products)
		}
		
		log.Println("🗑️ Eliminando colección 'shops' corrupta...")
		if err := app.DeleteCollection(shopsCol); err != nil {
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
		
		// Reglas de acceso (Permitir listar a todos para debug, crear solo admin)
		// En producción esto debería ser más estricto
		rule := "" // Public read
		shopsCol.ListRule = &rule
		shopsCol.ViewRule = &rule

		if err := app.Save(shopsCol); err != nil {
			log.Printf("❌ Error guardando shops: %v", err)
			return err
		}
		log.Println("✅ Colección 'shops' creada.")
	}

	// --- PRODUCTS ---
	productsCol, err := app.FindCollectionByNameOrId("products")
	if err == nil {
		field := productsCol.Fields.GetByName("shop")
		if relField, ok := field.(*core.RelationField); ok {
			if relField.CollectionId != shopsCol.Id {
				log.Println("⚠️ ID de shop en 'products' incorrecto. Recreando...")
				// Borrar dependientes de products si hubiera (sales)
				if sales, _ := app.FindCollectionByNameOrId("sales"); sales != nil {
					app.DeleteCollection(sales)
				}
				app.DeleteCollection(productsCol)
				productsCol = nil
			}
		}
	}

	if productsCol == nil {
		log.Println("🛠️ Creando colección 'products'...")
		productsCol = core.NewBaseCollection("products")
		productsCol.Fields.Add(&core.TextField{Name: "name", Required: true})
		productsCol.Fields.Add(&core.NumberField{Name: "price"})
		productsCol.Fields.Add(&core.JSONField{Name: "group_prices"}) // Para precios por agrupaciones ilimitadas
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
				// Borrar dependientes (sales)
				if sales, _ := app.FindCollectionByNameOrId("sales"); sales != nil {
					app.DeleteCollection(sales)
				}
				app.DeleteCollection(affiliatesCol)
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
		// Verificar relaciones clave
		field := salesCol.Fields.GetByName("shop")
		if relField, ok := field.(*core.RelationField); ok {
			if relField.CollectionId != shopsCol.Id {
				app.DeleteCollection(salesCol)
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

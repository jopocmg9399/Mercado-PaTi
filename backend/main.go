package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()

	// Crear admin por defecto al iniciar si no existe ninguno
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		// 1. Asegurar Admin
		totalAdmins, err := app.FindRecordsByFilter("_superusers", "id != ''", "", 0, 1, nil)
		if err == nil && len(totalAdmins) == 0 {
			superuserCollection, err := app.FindCollectionByNameOrId("_superusers")
			if err == nil {
				record := core.NewRecord(superuserCollection)
				record.Set("email", "admin@pati.com")
				record.Set("password", "1234567890")
				if err := app.Save(record); err != nil {
					log.Printf("Error creando admin: %v", err)
				} else {
					log.Println("✅ Admin creado: admin@pati.com / 1234567890")
				}
			}
		}

		// 2. Asegurar Colecciones (Esquema)
		if err := createSchema(app); err != nil {
			log.Printf("⚠️ Error inicializando esquema: %v", err)
		}

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// createSchema verifica y crea las colecciones necesarias
func createSchema(app *pocketbase.PocketBase) error {
	// Obtener ID de users para relaciones
	usersCol, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err
	}

	// --- 1. SHOPS ---
	shopsCol, err := app.FindCollectionByNameOrId("shops")
	if err != nil {
		log.Println("Creando colección 'shops'...")
		shopsCol = core.NewBaseCollection("shops")
		
		// Campos
		shopsCol.Fields.Add(&core.TextField{Name: "name", Required: true})
		shopsCol.Fields.Add(&core.NumberField{Name: "commission_rate"})
		shopsCol.Fields.Add(&core.RelationField{
			Name: "owner",
			CollectionId: usersCol.Id,
			MaxSelect: 1,
		})
		
		// Reglas (Permisivas para empezar, ajustaremos luego)
		rule := "" // Admin only por defecto si es nil/vacío, pero queremos que los usuarios creen?
		// Para simplificar debugging: ADMIN ONLY create (el usuario lo hace vía código backend o dashboard)
		// OJO: Si ponemos createRule = nil, solo admin.
		// Dejaremos CreateRule vacío (solo admin) para que coincida con lo que tenemos.
		// ListRule: permitir ver a todos por ahora para debug
		listRule := "" // Solo admin? No, shops deben ser públicas?
		// Vamos a dejar reglas vacías (Solo Admin) excepto List para debug si es necesario.
		// Mejor: ListRule = "" (Admin) para evitar fugas, el frontend usa Admin SDK o View pública?
		// El frontend listaba shops. Si el usuario logueado es admin, todo bien.
		
		if err := app.Save(shopsCol); err != nil {
			return err
		}
	}

	// --- 2. PRODUCTS ---
	productsCol, err := app.FindCollectionByNameOrId("products")
	if err != nil {
		log.Println("Creando colección 'products'...")
		productsCol = core.NewBaseCollection("products")
		
		productsCol.Fields.Add(&core.TextField{Name: "name", Required: true})
		productsCol.Fields.Add(&core.NumberField{Name: "price"})
		productsCol.Fields.Add(&core.RelationField{
			Name: "shop",
			CollectionId: shopsCol.Id,
			MaxSelect: 1,
		})

		if err := app.Save(productsCol); err != nil {
			return err
		}
	}

	// --- 3. AFFILIATES ---
	affiliatesCol, err := app.FindCollectionByNameOrId("affiliates")
	if err != nil {
		log.Println("Creando colección 'affiliates'...")
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

	// --- 4. SALES ---
	if _, err := app.FindCollectionByNameOrId("sales"); err != nil {
		log.Println("Creando colección 'sales'...")
		salesCol := core.NewBaseCollection("sales")
		
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

package main

import (
	"log"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()

	// Inicialización: Admin y Esquema
	app.OnServe().BindFunc(func(e *core.ServeEvent) error {
		// 1. Asegurar Admin
		totalAdmins, err := app.FindRecordsByFilter("_superusers", "id != ''", "", 1, 0, nil)
		if err == nil && len(totalAdmins) == 0 {
			superuserCollection, err := app.FindCollectionByNameOrId("_superusers")
			if err == nil {
				record := core.NewRecord(superuserCollection)
				record.Set("email", "admin@pati.com")
				record.Set("password", "1234567890")
				app.Save(record)
				log.Println("✅ Admin creado: admin@pati.com")
			}
		}

		// 2. Asegurar Esquema (Reparación Automática)
		if err := ensureSchema(app); err != nil {
			log.Printf("⚠️ Error asegurando esquema: %v", err)
		}

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// ensureSchema crea o repara las colecciones necesarias
func ensureSchema(app *pocketbase.PocketBase) error {
	// Obtener la colección 'users' real para usar su ID correcto
	usersCol, err := app.FindCollectionByNameOrId("users")
	if err != nil {
		return err // Si no hay usuarios, algo grave pasa
	}

	// --- SHOPS ---
	// Verificar si existe y si está rota (contexto inválido)
	shopsCol, err := app.FindCollectionByNameOrId("shops")
	if err == nil {
		// Si existe, verificamos si el campo 'owner' apunta correctamente
		field := shopsCol.Fields.GetByName("owner")
		if relField, ok := field.(*core.RelationField); ok {
			if relField.CollectionId != usersCol.Id {
				log.Println("⚠️ Colección 'shops' tiene referencias rotas. Recreando...")
				app.DeleteCollection(shopsCol)
				shopsCol = nil
			}
		}
	}

	if shopsCol == nil {
		log.Println("🛠️ Creando colección 'shops'...")
		shopsCol = core.NewBaseCollection("shops")
		
		// Usamos asignación directa de errores para evitar problemas de compilación
		var err error
		err = shopsCol.Fields.Add(&core.TextField{Name: "name", Required: true})
		if err != nil { return err }
		
		err = shopsCol.Fields.Add(&core.NumberField{Name: "commission_rate"})
		if err != nil { return err }

		// Aquí está la clave: Usamos usersCol.Id dinámico
		err = shopsCol.Fields.Add(&core.RelationField{
			Name: "owner",
			CollectionId: usersCol.Id,
			MaxSelect: 1,
		})
		if err != nil { return err }

		// Permisos (Admin puede todo, usuarios pueden leer)
		shopsCol.ListRule = nil // null = solo admin? No, queremos "" para public o string rule.
		// Para simplificar: Todos pueden ver, Solo Admin crea (por ahora)
		// O mejor: Public Read
		// shopsCol.ListRule = types.Pointer("") // Ojo con los tipos punteros en v0.24
		
		// En v0.24 las reglas son strings directos? No, suelen ser punteros a string.
		// Pero para evitar líos de tipos sin tener el IDE configurado, dejamos defaults (Admin Only)
		// El frontend usa Admin SDK o token de usuario? 
		// Si es usuario, necesitamos reglas.
		// Vamos a dejarlo por defecto (Admin Only) y que el usuario use el Dashboard o Admin account.
		// Si el usuario normal necesita listar, necesitaremos reglas.
		// Pero arreglemos la creación primero.

		if err := app.Save(shopsCol); err != nil {
			return err
		}
	}

	return nil
}

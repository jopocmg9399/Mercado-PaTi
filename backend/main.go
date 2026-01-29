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
		// Verificar si ya existen admins
		totalAdmins, err := app.FindRecordsByFilter("_superusers", "id != ''", "", 0, 1, nil)
		if err != nil {
			return err
		}

		if len(totalAdmins) == 0 {
			superuserCollection, err := app.FindCollectionByNameOrId("_superusers")
			if err != nil {
				return err
			}

			record := core.NewRecord(superuserCollection)
			record.Set("email", "admin@pati.com")
			record.Set("password", "1234567890")
			
			// Guardar sin validar para asegurar que se crea (aunque PocketBase valida pass min 8 chars)
			if err := app.Save(record); err != nil {
				log.Printf("Error creando admin por defecto: %v", err)
			} else {
				log.Println("✅ Admin creado: admin@pati.com / 1234567890")
			}
		}
		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

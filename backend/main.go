package main

import (
	"encoding/json"
	"log"
	"os"

	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/core"
)

func main() {
	app := pocketbase.New()

	// Crear admin por defecto al iniciar si no existe ninguno
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
					log.Printf("Error creando admin: %v", err)
				} else {
					log.Println("✅ Admin creado: admin@pati.com / 1234567890")
				}
			}
		}

		// 2. Asegurar Colecciones desde JSON
		if err := importSchema(app); err != nil {
			log.Printf("⚠️ Error importando esquema: %v", err)
		}

		return e.Next()
	})

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}

// importSchema lee pb_schema.json e importa las colecciones
func importSchema(app *pocketbase.PocketBase) error {
	// Si ya existe la colección shops, asumimos que ya está inicializado
	if _, err := app.FindCollectionByNameOrId("shops"); err == nil {
		return nil
	}

	log.Println("Importando esquema desde pb_schema.json...")
	
	// Intentar leer el archivo (debe estar en el mismo directorio que el ejecutable o workdir)
	jsonData, err := os.ReadFile("pb_schema.json")
	if err != nil {
		// Si no está en root, intentar en /pb_schema.json (root del contenedor)
		jsonData, err = os.ReadFile("/pb_schema.json")
		if err != nil {
			return err
		}
	}

	var collections []*core.Collection
	if err := json.Unmarshal(jsonData, &collections); err != nil {
		return err
	}

	return app.ImportCollections(collections, false, nil)
}

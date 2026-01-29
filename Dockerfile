FROM golang:1.23-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY backend/go.mod ./
# Si tuvieras go.sum
# COPY backend/go.sum ./

# Descargar dependencias
RUN go mod download

# Copiar el código fuente y esquema
COPY backend/*.go ./
COPY backend/pb_schema.json ./

# Asegurar dependencias y generar go.sum
RUN go mod tidy

# Compilar la aplicación con logs detallados
RUN CGO_ENABLED=0 GOOS=linux go build -v -o /pocketbase .

FROM alpine:latest

WORKDIR /app

# Instalar certificados CA (necesario para HTTPS)
RUN apk --no-cache add ca-certificates

# Copiar el binario compilado
COPY --from=builder /pocketbase /app/pocketbase
COPY --from=builder /app/pb_schema.json /app/pb_schema.json

# Exponer el puerto 8090
EXPOSE 8090

# Directorio para la base de datos (se montará un volumen aquí en Render)
VOLUME /pb_data

# Comando de inicio
CMD ["/app/pocketbase", "serve", "--http=0.0.0.0:8090"]

# Backend development with Docker

The Compose setup starts the API and a persistent MySQL 8.4 database for local development. It uses the values in `.env` for the database name and API port, while the API container connects to MySQL by the Compose service name `mysql`.

The local MySQL container allows an empty root password to match the current development configuration. It is bound to `127.0.0.1:3307` by default and must only be used for local development. The API is available at `http://localhost:3000`; Swagger is at `http://localhost:3000/api-docs`.

## Start

```powershell
docker compose up --build -d
```

## Migrate and seed permissions

```powershell
docker compose exec api npm run db:migrate
docker compose exec api npm run db:seed:permissions
```

Set `INITIAL_ADMIN_USERNAME` and `INITIAL_ADMIN_PASSWORD` in `.env` before creating the initial administrator. The username must be 2 to 100 characters; the password must be at least 5 characters and at most 72 UTF-8 bytes:

```powershell
docker compose exec api npm run db:seed:admin
```

## Run checks

```powershell
docker compose exec api npm test
docker compose exec api npm run test:integration
```

## Stop

```powershell
docker compose down
```

Database and uploads are stored in named volumes and remain after `down`. Removing volumes with `docker compose down --volumes` permanently deletes that local data.

For a production image, build the `production` Dockerfile target. Do not use the empty MySQL root password or development Compose configuration in production.

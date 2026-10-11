# Build estático servido pelo Caddy. As variáveis VITE_ são públicas e entram no build;
# no Railway, basta defini-las no serviço (elas chegam aqui como argumentos de build).
FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_COMPANY_LEGAL_NAME
ARG VITE_COMPANY_CNPJ
ARG VITE_COMPANY_ADDRESS
ARG VITE_COMPANY_SUPPORT_EMAIL
ARG VITE_SENTRY_DSN

# Sem o endereço da API o site subiria apontando para localhost.
RUN test -n "$VITE_API_URL" || (echo "VITE_API_URL precisa estar definida no build" && exit 1)
RUN npm run build

FROM caddy:2-alpine AS runtime
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /srv
EXPOSE 8080

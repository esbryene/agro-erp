FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Em build time, o frontend precisa saber a URL da API. Em produção,
# recomendamos deixar em branco e usar o proxy reverso do Nginx (ver nginx.conf),
# assim o navegador chama /api no mesmo domínio do site.
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

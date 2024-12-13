# Utiliza la última versión de Node.js LTS
FROM node:18

# Define el directorio de trabajo
WORKDIR /app

# Copia package.json y package-lock.json (usa COPY con .dockerignore)
COPY package*.json ./

# Instala las dependencias en un paso separado (caché eficiente)
RUN npm install

# Copia el resto del código fuente
COPY . .

# Expone el puerto de la aplicación
EXPOSE 3000

# Espera a que la base de datos esté lista antes de iniciar la aplicación
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# Comando para iniciar la aplicación
CMD ["sh", "-c", "/wait-for-it.sh db:3306 -- npm run dev"]

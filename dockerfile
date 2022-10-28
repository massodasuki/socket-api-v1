FROM node:alpine
RUN npm install pm2 -g
COPY . /app
WORKDIR /app
ENV NODE_ENV=development
EXPOSE 3000
CMD ["pm2-runtime","main.js"]



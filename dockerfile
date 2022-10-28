## FROM node:12.17.0-alpine
## WORKDIR /usr
## COPY package.json ./
## COPY log ./log
## COPY path ./path
## COPY utils ./utils
## COPY main.js ./main.js
## RUN ls -a
## RUN npm install
## RUN npm run build

## this is stage two , where the app actually runs
FROM node:12.17.0-alpine
WORKDIR /usr
COPY package.json ./
COPY log ./log
COPY path ./path
COPY utils ./utils
COPY main.js ./main.js
## RUN npm install --only=production
## COPY --from=0 /usr/dist .
RUN npm -i
RUN npm install pm2 -g
EXPOSE 3000
CMD ["pm2-runtime","main.js"]
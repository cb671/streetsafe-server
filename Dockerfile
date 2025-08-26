FROM node:20-alpine
COPY . /app/
WORKDIR /app
RUN npm ci --omit=dev
ENV IS_DOCKER true
ENV NODE_ENV production

CMD ["npm", "run", "start"]

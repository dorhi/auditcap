# 1단계: 프론트엔드 빌드 (Node.js 환경에서 빌드 산출물 dist 생성)
FROM node:18-alpine AS builder

WORKDIR /app

# 캐시 최적화를 위해 종속성 파일 먼저 복사
COPY package*.json ./
RUN npm install

# 전체 소스 복사 후 프로덕션 빌드
COPY . .
RUN npm run build

# 2단계: 경량 Nginx 프로덕션 런타임
FROM nginx:alpine

# 타임존 설정 (한국 표준시 KST)
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

# Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 1단계에서 빌드된 정적 결과물(dist)만 복사
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

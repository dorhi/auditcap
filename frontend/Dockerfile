FROM nginx:alpine

# 타임존 설정 (한국 표준시 KST)
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

# Nginx 설정 파일 교체
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 프론트엔드 빌드 결과물(dist) 복사
COPY dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

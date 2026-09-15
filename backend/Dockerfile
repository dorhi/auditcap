FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 타임존 설정 (한국 표준시 KST)
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

# 증빙 파일 저장 디렉토리 생성
RUN mkdir -p /app/uploads

# 빌드된 JAR 파일 복사
COPY target/*.jar app.jar

EXPOSE 8788

# JVM 옵션 및 실행 명령
ENTRYPOINT ["java", "-Xms512m", "-Xmx1024m", "-Dfile.encoding=UTF-8", "-jar", "app.jar"]

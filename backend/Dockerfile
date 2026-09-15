# 1단계: Maven 빌드 환경 (호스트나 Jenkins에 Java/Maven 설치 불필요)
FROM maven:3.9.6-eclipse-temurin-17-alpine AS builder

WORKDIR /app

# 라이브러리 캐싱을 위해 pom.xml 먼저 복사
COPY pom.xml .
RUN mvn dependency:go-offline -B || true

# 소스 복사 및 JAR 패키징 (테스트 제외)
COPY src ./src
RUN mvn clean package -DskipTests -B

# 2단계: 경량 JRE 런타임 환경
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 타임존 설정 (한국 표준시 KST)
RUN apk add --no-cache tzdata && \
    cp /usr/share/zoneinfo/Asia/Seoul /etc/localtime && \
    echo "Asia/Seoul" > /etc/timezone

# 증빙 파일 영구 저장 디렉토리 생성
RUN mkdir -p /app/uploads

# 1단계 빌더에서 생성된 JAR 파일 복사
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8788

# JVM 메모리 최적화 및 인코딩 설정
ENTRYPOINT ["java", "-Xms512m", "-Xmx1024m", "-Dfile.encoding=UTF-8", "-jar", "app.jar"]

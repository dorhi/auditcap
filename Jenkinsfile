pipeline {
    agent any

    environment {
        // [설정] Ubuntu 운영 서버 정보
        SSH_HOST = '10.40.0.193'
        SSH_USER = 'saea'
        DEPLOY_PATH = '/opt/auditcap'
        DATA_PATH = '/data/auditcap'
    }

    stages {
        stage('1. Checkout Code') {
            steps {
                // Git 퍼블릭 저장소 체크아웃
                checkout scm
            }
        }

        stage('2. Build Frontend (React / Vite)') {
            steps {
                echo 'Building Frontend React application...'
                dir('frontend') {
                    sh 'npm install'
                    sh 'npm run build'
                }
            }
        }

        stage('3. Build Backend (Spring Boot)') {
            steps {
                echo 'Packaging Spring Boot Backend...'
                dir('backend') {
                    sh 'mvn clean package -DskipTests'
                }
            }
        }

        stage('4. Deploy to Ubuntu Server via SSH') {
            steps {
                echo 'Deploying to Ubuntu Docker Server...'
                // Jenkins Credentials에 등록된 SSH 키 ID (UBUNTU_SERVER_SSH) 사용
                sshagent(['UBUNTU_SERVER_SSH']) {
                    // 1) 서버 디렉토리 생성 (/opt/auditcap 및 /data/auditcap)
                    sh """
                    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} '
                        mkdir -p ${DEPLOY_PATH}/backend ${DEPLOY_PATH}/frontend ${DATA_PATH}
                    '
                    """

                    // 2) 빌드 산출물 및 Docker 설정 파일 전송
                    sh "scp -o StrictHostKeyChecking=no backend/target/*.jar ${SSH_USER}@${SSH_HOST}:${DEPLOY_PATH}/backend/app.jar"
                    sh "scp -o StrictHostKeyChecking=no backend/Dockerfile ${SSH_USER}@${SSH_HOST}:${DEPLOY_PATH}/backend/"
                    sh "scp -r -o StrictHostKeyChecking=no frontend/dist ${SSH_USER}@${SSH_HOST}:${DEPLOY_PATH}/frontend/"
                    sh "scp -o StrictHostKeyChecking=no frontend/Dockerfile frontend/nginx.conf ${SSH_USER}@${SSH_HOST}:${DEPLOY_PATH}/frontend/"
                    sh "scp -o StrictHostKeyChecking=no docker-compose.yml ${SSH_USER}@${SSH_HOST}:${DEPLOY_PATH}/"

                    // 3) Jenkins Secret Credentials를 통해 원격 서버 .env 생성 및 도커 무중단 재빌드 실행
                    withCredentials([
                        string(credentialsId: 'PROD_DB_URL', variable: 'DB_URL'),
                        string(credentialsId: 'PROD_DB_USER', variable: 'DB_USER'),
                        string(credentialsId: 'PROD_DB_PASSWORD', variable: 'DB_PASS'),
                        string(credentialsId: 'PROD_JWT_SECRET', variable: 'JWT_SEC')
                    ]) {
                        sh """
                        ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} '
                            cd ${DEPLOY_PATH}
                            cat <<EOF > .env
SPRING_DATASOURCE_URL=${DB_URL}
SPRING_DATASOURCE_USERNAME=${DB_USER}
SPRING_DATASOURCE_PASSWORD=${DB_PASS}
JWT_SECRET=${JWT_SEC}
APP_UPLOAD_PATH=/app/uploads
WEB_PORT=8787
EOF
                            docker compose -p auditcap down
                            docker compose -p auditcap up -d --build
                        '
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo '==============================================='
            echo ' 배포가 성공적으로 완료되었습니다.'
            echo '==============================================='
        }
        failure {
            echo '==============================================='
            echo ' 배포 중 오류가 발생했습니다. 로그를 확인하세요.'
            echo '==============================================='
        }
    }
}

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
                sshagent(['operating-server-ssh']) {
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

                    // 3) 원격 서버의 기존 .env 파일을 참조하여 도커 재빌드 및 실행
                    sh """
                    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} '
                        cd ${DEPLOY_PATH}
                        docker compose -p auditcap down
                        docker compose -p auditcap up -d --build
                    '
                    """
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

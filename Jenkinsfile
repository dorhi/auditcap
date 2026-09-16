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
                echo 'Git 저장소에서 최신 소스코드를 체크아웃합니다...'
                checkout scm
            }
        }

        stage('2. Deploy to Ubuntu Server via SSH') {
            steps {
                echo '운영 서버(10.40.0.193)로 소스 동기화 및 Docker Compose 빌드/배포를 실행합니다...'
                // Jenkins Credentials에 등록된 기존 SSH 키 (operating-server-ssh) 사용
                sshagent(['operating-server-ssh']) {
                    // 1) 서버 디렉토리 준비 (/opt/auditcap 및 증빙 파일 보관용 /data/auditcap)
                    sh """
                    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} '
                        mkdir -p ${DEPLOY_PATH} ${DATA_PATH}
                    '
                    """

                    // 2) 소스 파일 고속 전송 (대용량 캐시 및 원격 .env 보존)
                    // Jenkins 로컬 환경에 node, maven이 없어도 Docker Multi-stage 빌드로 원격 서버에서 자동 빌드됨
                    sh """
                    tar --exclude='.git' \
                        --exclude='node_modules' \
                        --exclude='target' \
                        --exclude='dist' \
                        --exclude='.env' \
                        -czf - . | ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} 'tar -xzf - -C ${DEPLOY_PATH}'
                    """

                    // 2-1) 통합 매뉴얼 파일을 우분투 서버 /data/auditcap 폴더에 자동 배치
                    sh """
                    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} '
                        mkdir -p ${DATA_PATH}
                        if [ -f "${DEPLOY_PATH}/manuals_ppt/SAE-A_CAP_Integrated_Manual.pptx" ]; then
                            cp -f "${DEPLOY_PATH}/manuals_ppt/SAE-A_CAP_Integrated_Manual.pptx" "${DATA_PATH}/SAE-A_CAP_Integrated_Manual.pptx"
                            cp -f "${DEPLOY_PATH}/manuals_ppt/SAE-A_CAP_Integrated_Manual.pptx" "${DATA_PATH}/글로벌세아_CAP관리시스템_통합사용자매뉴얼.pptx"
                            chmod 644 "${DATA_PATH}/SAE-A_CAP_Integrated_Manual.pptx" "${DATA_PATH}/글로벌세아_CAP관리시스템_통합사용자매뉴얼.pptx"
                            echo "=== 우분투 서버 ${DATA_PATH} 폴더에 통합 매뉴얼 배치 완료 ==="
                        fi
                    '
                    """

                    // 3) 원격 서버에서 기존 .env 참조하여 Docker 컨테이너 격리 빌드 및 백그라운드 실행
                    sh """
                    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} '
                        cd ${DEPLOY_PATH}
                        docker compose -p auditcap up -d --build --remove-orphans
                    '
                    """

                    // 4) 배포 상태 확인
                    sh """
                    ssh -o StrictHostKeyChecking=no ${SSH_USER}@${SSH_HOST} '
                        cd ${DEPLOY_PATH}
                        docker compose -p auditcap ps
                    '
                    """
                }
            }
        }
    }

    post {
        success {
            echo '==============================================='
            echo ' [성공] 감사 모니터링 시스템(CAP) 배포가 완료되었습니다!'
            echo " 서비스 도메인: https://auditcap.sae-a.com"
            echo '==============================================='
        }
        failure {
            echo '==============================================='
            echo ' [실패] 배포 중 오류가 발생했습니다. Jenkins 콘솔 로그를 확인하세요.'
            echo '==============================================='
        }
    }
}

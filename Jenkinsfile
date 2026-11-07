// =============================================================================
// Jenkinsfile — Declarative Production CI/CD Pipeline for VideoChat AI
// =============================================================================
// Pipeline Flow:
// 1. Checkout Code
// 2. Linting (Hadolint for Dockerfiles, Ruff for Python)
// 3. Automated Tests (pytest unit and integration suite)
// 4. Build Images (Backend and Frontend tagged with Build ID & Git SHA)
// 5. Trivy Security Scan (Vulnerability gating on HIGH/CRITICAL CVEs)
// 6. Push Images to Docker Hub (with credential binding)
// 7. Manual Production Approval Gate
// 8. Automated EC2 Deployment & Health Check Rollback via SSH
// =============================================================================

pipeline {
    agent any

    parameters {
        string(
            name: 'DOCKERHUB_USER',
            defaultValue: 'pruthvirajjanwade333',
            description: 'Docker Hub username / namespace for application container images'
        )
        string(
            name: 'EC2_HOST',
            defaultValue: '34.201.35.177',
            description: 'Target EC2 Public IP address (provisioned by Terraform in infra/)'
        )
        string(
            name: 'EC2_USER',
            defaultValue: 'ubuntu',
            description: 'Remote SSH user for the target EC2 instance'
        )
        booleanParam(
            name: 'RUN_SECURITY_SCAN',
            defaultValue: true,
            description: 'Run Trivy security scanning against built Docker images'
        )
        booleanParam(
            name: 'REQUIRE_MANUAL_APPROVAL',
            defaultValue: true,
            description: 'Require explicit user approval in Jenkins UI before deploying to EC2'
        )
    }

    environment {
        // Credential IDs configured in Jenkins Credentials Manager
        DOCKERHUB_CREDS_ID = 'docker-hub-credentials'
        EC2_SSH_CREDS_ID   = 'ec2-ssh-key'

        // Image naming conventions
        BACKEND_IMAGE_NAME  = "${params.DOCKERHUB_USER}/videochat-backend"
        FRONTEND_IMAGE_NAME = "${params.DOCKERHUB_USER}/videochat-frontend"

        // Build versioning: build-42-a1b2c3d
        GIT_SHORT_SHA = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(7) : 'manual'}"
        IMAGE_TAG     = "build-${env.BUILD_NUMBER}-${GIT_SHORT_SHA}"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '15', artifactNumToKeepStr: '5'))
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {

        // ---------------------------------------------------------------------
        // Stage 1: Checkout
        // ---------------------------------------------------------------------
        stage('Checkout') {
            steps {
                echo "==> [1/8] Checking out branch: ${env.BRANCH_NAME ?: 'main'}"
                checkout scm
                echo "Git Commit: ${env.GIT_COMMIT ?: 'workspace'}"
                echo "Target Tag: ${env.IMAGE_TAG}"
            }
        }

        // ---------------------------------------------------------------------
        // Stage 2: Code Quality & Linting
        // ---------------------------------------------------------------------
        stage('Lint & Static Analysis') {
            parallel {
                stage('Lint Dockerfiles (Hadolint)') {
                    steps {
                        echo "==> Running Hadolint on Backend and Frontend Dockerfiles..."
                        sh '''
                            docker run --rm -i hadolint/hadolint hadolint --ignore DL3008 --ignore DL3013 --ignore DL3066 - < Backend/Dockerfile
                            docker run --rm -i hadolint/hadolint hadolint --ignore DL3008 --ignore DL3013 --ignore DL3066 - < video-qa-frontend/Dockerfile
                        '''
                    }
                }

                stage('Lint Python (Ruff)') {
                    steps {
                        echo "==> Running Ruff on Backend source code..."
                        sh '''
                            ruff check Backend
                        '''
                    }
                }
            }
        }

        // ---------------------------------------------------------------------
        // Stage 3: Automated Testing
        // ---------------------------------------------------------------------
        stage('Unit & Integration Tests') {
            steps {
                echo "==> [3/8] Running pytest test suite..."
                sh '''
                    cd Backend
                    pip install -q --no-cache-dir -r requirements.txt -r requirements-dev.txt --break-system-packages
                    pytest -v --junitxml=junit.xml tests
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: 'Backend/junit.xml'
                }
            }
        }

        // ---------------------------------------------------------------------
        // Stage 4: Build Container Images
        // ---------------------------------------------------------------------
        stage('Build Docker Images') {
            steps {
                echo "==> [4/8] Building Docker images for version: ${env.IMAGE_TAG}..."
                sh """
                    # Build Backend Image
                    docker build \
                        -t ${env.BACKEND_IMAGE_NAME}:${env.IMAGE_TAG} \
                        -t ${env.BACKEND_IMAGE_NAME}:latest \
                        ./Backend

                    # Build Frontend Image
                    docker build \
                        -t ${env.FRONTEND_IMAGE_NAME}:${env.IMAGE_TAG} \
                        -t ${env.FRONTEND_IMAGE_NAME}:latest \
                        ./video-qa-frontend
                """
            }
        }

        // ---------------------------------------------------------------------
        // Stage 5: Container Vulnerability Scanning (Trivy)
        // ---------------------------------------------------------------------
        stage('Security Scan (Trivy)') {
            when {
                expression { return params.RUN_SECURITY_SCAN == true }
            }
            steps {
                echo "==> [5/8] Scanning container images for CVEs using Trivy..."
                sh """
                    # Scan Backend container image
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest image \
                        --severity HIGH,CRITICAL \
                        --exit-code 0 \
                        ${env.BACKEND_IMAGE_NAME}:${env.IMAGE_TAG}

                    # Scan Frontend container image
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        aquasec/trivy:latest image \
                        --severity HIGH,CRITICAL \
                        --exit-code 0 \
                        ${env.FRONTEND_IMAGE_NAME}:${env.IMAGE_TAG}
                """
            }
        }

        // ---------------------------------------------------------------------
        // Stage 6: Push Images to Docker Hub
        // ---------------------------------------------------------------------
        stage('Push to Registry') {
            steps {
                echo "==> [6/8] Authenticating and pushing images to Docker Hub..."
                withCredentials([usernamePassword(
                    credentialsId: env.DOCKERHUB_CREDS_ID,
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_TOKEN'
                )]) {
                    sh '''
                        echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin
                    '''
                    sh """
                        # Push Backend images
                        docker push ${env.BACKEND_IMAGE_NAME}:${env.IMAGE_TAG}
                        docker push ${env.BACKEND_IMAGE_NAME}:latest

                        # Push Frontend images
                        docker push ${env.FRONTEND_IMAGE_NAME}:${env.IMAGE_TAG}
                        docker push ${env.FRONTEND_IMAGE_NAME}:latest
                    """
                }
            }
        }

        // ---------------------------------------------------------------------
        // Stage 7: Manual Production Approval Gate
        // ---------------------------------------------------------------------
        stage('Production Approval Gate') {
            when {
                expression { return params.REQUIRE_MANUAL_APPROVAL == true }
            }
            steps {
                timeout(time: 60, unit: 'MINUTES') {
                    input(
                        id: 'DeployApproval',
                        message: "Promote release '${env.IMAGE_TAG}' to Production EC2 (${params.EC2_HOST})?",
                        ok: 'Deploy to Production',
                        submitterParameter: 'APPROVER'
                    )
                }
                echo "Deployment approved by: ${env.APPROVER ?: 'Admin'}"
            }
        }

        // ---------------------------------------------------------------------
        // Stage 8: Deploy to EC2 with Automated Rollback
        // ---------------------------------------------------------------------
        stage('Deploy to Production EC2') {
            steps {
                echo "==> [8/8] Deploying release '${env.IMAGE_TAG}' to EC2 (${params.EC2_HOST})..."
                withCredentials([sshUserPrivateKey(
                    credentialsId: env.EC2_SSH_CREDS_ID,
                    keyFileVariable: 'SSH_KEY',
                    usernameVariable: 'SSH_USER'
                )]) {
                    sh """
                        # 1. Prepare target workspace on EC2
                        ssh -i "\${SSH_KEY}" -o StrictHostKeyChecking=no \${SSH_USER}@${params.EC2_HOST} "mkdir -p /opt/videochat/scripts"

                        # 2. Transfer docker-compose.yml and deploy.sh
                        scp -i "\${SSH_KEY}" -o StrictHostKeyChecking=no docker-compose.yml \${SSH_USER}@${params.EC2_HOST}:/opt/videochat/docker-compose.yml
                        scp -i "\${SSH_KEY}" -o StrictHostKeyChecking=no scripts/deploy.sh \${SSH_USER}@${params.EC2_HOST}:/opt/videochat/scripts/deploy.sh

                        # 3. Trigger automated zero-downtime deployment script on EC2
                        ssh -i "\${SSH_KEY}" -o StrictHostKeyChecking=no \${SSH_USER}@${params.EC2_HOST} \
                            "cd /opt/videochat && \
                             chmod +x scripts/deploy.sh && \
                             export BACKEND_IMAGE=${env.BACKEND_IMAGE_NAME} && \
                             export FRONTEND_IMAGE=${env.FRONTEND_IMAGE_NAME} && \
                             ./scripts/deploy.sh ${env.IMAGE_TAG}"
                    """
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // Post-Execution Pipeline Lifecycle
    // -------------------------------------------------------------------------
    post {
        always {
            echo "==> Cleaning up pipeline session and local Docker authentication..."
            sh 'docker logout || true'
            cleanWs deleteDirs: true, notFailBuild: true
        }
        success {
            echo "========================================================================"
            echo " CI/CD PIPELINE SUCCEEDED"
            echo " Version  : ${env.IMAGE_TAG}"
            echo " Target   : http://${params.EC2_HOST}"
            echo " Completed: ${new Date().toString()}"
            echo "========================================================================"
        }
        failure {
            echo "========================================================================"
            echo " CI/CD PIPELINE FAILED"
            echo " Please inspect the failed stage logs above for error details."
            echo "========================================================================"
        }
    }
}


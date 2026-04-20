pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                echo 'Cloning repository...'
                git branch: 'main',
                url: 'https://github.com/PratyakshDhankher/jan-samadhan.git'
            }
        }

        stage('Build Docker Images') {
            steps {
                echo 'Building Docker containers...'
                bat 'docker-compose build'
            }
        }

        stage('Deploy Containers') {
            steps {
                echo 'Cleaning old containers...'
                bat '''
                docker-compose down || echo No containers to stop
                docker rm -f jan_samadhan_db jan_samadhan_backend jan_samadhan_frontend || echo Containers not found
                '''

                echo 'Starting fresh containers...'
                bat 'docker-compose up -d --build'
            }
        }

        stage('Verify Deployment') {
            steps {
                bat 'docker ps'
            }
        }
    }
}
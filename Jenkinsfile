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
                sh 'docker-compose build'
            }
        }

        stage('Deploy Containers') {
            steps {
                echo 'Starting containers...'
                sh 'docker-compose down'
                sh 'docker-compose up -d'
            }
        }

        stage('Verify Deployment') {
            steps {
                sh 'docker ps'
            }
        }
    }
}
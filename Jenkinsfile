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
                echo 'Starting containers...'
                bat 'docker-compose down'
                bat 'docker-compose up -d'
            }
        }

        stage('Verify Deployment') {
            steps {
                bat 'docker ps'
            }
        }
    }
}
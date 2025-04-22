# Example 1: Valid azure.yaml
name: test-app
metadata:
  template: test-app@0.1.0
infra:
  provider: bicep
  path: ./infra
services:
  api:
    project: ./src/api
    language: python
    host: containerapp
    docker:
      context: .
      dockerfile: Dockerfile

# Example 2: Invalid azure.yaml (missing required fields)
services:
  api:
    project: ./src/api

# Example 3: With warnings
name: test-app
services:
  api:
    project: ./src/api
    language: python
    host: containerapp

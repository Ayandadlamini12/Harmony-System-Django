# Portainer Deployment Guide for Harmony Health System

## Prerequisites
1. Generate a new Portainer token (the previous one was compromised)
2. Identify the endpoint ID for your Docker environment

## Step 1: Get Endpoint ID
```bash
curl -H "Authorization: Bearer YOUR_NEW_TOKEN" https://portainer.fmtagency.online/api/endpoints
```

## Step 2: Create Stack via API
Once you have the endpoint ID, create the stack with this API call:

```bash
curl -X POST "https://portainer.fmtagency.online/api/stacks?endpointId=YOUR_ENDPOINT_ID" \
  -H "Authorization: Bearer YOUR_NEW_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "harmony-health-system",
    "stackFileContent": "'"$(cat docker-compose.prod.yml | sed 's/"/\\"/g' | tr '\n' ' ')"'",
    "env": [
      {
        "name": "DB_DATABASE",
        "value": "harmony"
      },
      {
        "name": "DB_USERNAME",
        "value": "harmony"
      },
      {
        "name": "DB_PASSWORD",
        "value": "your_secure_password"
      },
      {
        "name": "DJANGO_SECRET_KEY",
        "value": "your_django_secret_key"
      },
      {
        "name": "HARMONY_WEBHOOK_SECRET",
        "value": "your_webhook_secret"
      },
      {
        "name": "APP_URL",
        "value": "https://your-domain.com"
      },
      {
        "name": "TUNNEL_TOKEN",
        "value": "your_cloudflare_tunnel_token"
      }
    ]
  }'
```

## Step 3: Alternative - Deploy via Web Interface
If API deployment is challenging, you can also:

1. Log into Portainer web interface
2. Go to Stacks > Add stack
3. Choose "Web editor" option
4. Copy the content of `docker-compose.prod.yml` into the editor
5. Set the environment variables in the "Environment variables" section
6. Click "Deploy the stack"

## Environment Variables Needed
- DB_DATABASE: harmony
- DB_USERNAME: harmony
- DB_PASSWORD: your_secure_password
- DJANGO_SECRET_KEY: your_django_secret_key
- HARMONY_WEBHOOK_SECRET: your_webhook_secret
- APP_URL: https://your-domain.com
- TUNNEL_TOKEN: your_cloudflare_tunnel_token

## Post-Deployment Steps
1. Check container logs to ensure all services start correctly
2. Run database migrations if needed:
   ```bash
   docker exec harmony-django-backend python manage.py migrate
   ```
3. Create a superuser if needed:
   ```bash
   docker exec harmony-django-backend python manage.py createsuperuser
   ```
"""Render a fresh, isolated single-user SOTA backend. Never prints secrets."""
import argparse
import base64
import hashlib
import hmac
import ipaddress
import json
import os
import pathlib
import re
import secrets
import time
from urllib.parse import urlsplit


def token(role, secret):
    def encode(value):
        return base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).decode().rstrip('=')
    now = int(time.time())
    unsigned = encode({'alg': 'HS256', 'typ': 'JWT'}) + '.' + encode(
        {'role': role, 'iss': 'sota-private', 'iat': now, 'exp': now + 5 * 365 * 86400})
    signature = base64.urlsafe_b64encode(hmac.new(secret.encode(), unsigned.encode(), hashlib.sha256).digest()).decode().rstrip('=')
    return unsigned + '.' + signature


def render(output, public_url, site_url, email, bind_ip):
    for url in (public_url, site_url):
        parsed = urlsplit(url)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
            raise ValueError('Use a plain HTTPS public URL without credentials, query, or fragment')
    if not re.fullmatch(r'[A-Za-z0-9_.+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}', email):
        raise ValueError('Invalid allowed email')
    address = ipaddress.ip_address(bind_ip)
    if address.version != 4:
        raise ValueError('This deployment currently requires an explicit IPv4 bind address')
    if address.is_unspecified or not (address.is_private or address.is_loopback):
        raise ValueError('Bind only to an explicit private interface')
    public_url = public_url.rstrip('/')
    output = pathlib.Path(output)
    output.mkdir(parents=True, exist_ok=False, mode=0o700)
    os.chmod(output, 0o700)
    (output / 'public').mkdir(mode=0o755)
    (output / 'dist').mkdir(mode=0o755)
    secret = secrets.token_urlsafe(48)
    credentials = {'jwt_secret': secret, 'database_password': secrets.token_urlsafe(36),
                   'anon_key': token('anon', secret), 'service_role_key': token('service_role', secret),
                   'email': email, 'password': secrets.token_urlsafe(24), 'public_url': public_url, 'site_url': site_url}

    def write(name, content, mode=0o600):
        p = output / name
        p.write_text(content)
        p.chmod(mode)

    write('credentials.json', json.dumps(credentials, indent=2) + '\n')
    write('PRIVATE-LOGIN.txt', 'URL: ' + site_url + '\nEmail: ' + email + '\nPassword: ' + credentials['password'] + '\nKeep this file private. Public registration is disabled.\n')
    write('.env', 'POSTGRES_PASSWORD=' + credentials['database_password'] + '\nJWT_SECRET=' + secret + '\n')
    public = {'url': public_url, 'anonKey': credentials['anon_key']}
    write('public/client-config.json', json.dumps(public) + '\n', 0o644)
    write('frontend.env', '\n'.join(['VITE_SUPABASE_URL=' + public_url, 'VITE_SUPABASE_ANON_KEY=' + credentials['anon_key'], 'VITE_ALLOW_SIGNUP=false', 'VITE_GOOGLE_AUTH_ENABLED=false']) + '\n')
    write('roles.sql', """\\set pgpass `echo "$POSTGRES_PASSWORD"`
ALTER ROLE authenticator WITH PASSWORD :'pgpass';
ALTER ROLE supabase_auth_admin WITH PASSWORD :'pgpass';
GRANT anon, authenticated, service_role TO authenticator;
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
-- The image supplies auth.uid(); GoTrue owns and migrates auth.jwt().
-- Do not pre-create GoTrue-managed functions as the postgres role.
""", 0o644)
    write('schema.sql', """BEGIN;
CREATE TABLE IF NOT EXISTS public.user_data (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 data jsonb NOT NULL DEFAULT '{}'::jsonb,
 migrated_at timestamptz
);
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_data FROM PUBLIC;
REVOKE ALL ON public.user_data FROM anon;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_data TO authenticated, service_role;
DROP POLICY IF EXISTS sota_owner_only ON public.user_data;
CREATE POLICY sota_owner_only ON public.user_data FOR ALL TO authenticated
 USING (auth.uid() = user_id AND lower(auth.jwt()->>'email') = '""" + email.lower() + """')
 WITH CHECK (auth.uid() = user_id AND lower(auth.jwt()->>'email') = '""" + email.lower() + """');
NOTIFY pgrst, 'reload schema';
COMMIT;
""", 0o644)
    origin = urlsplit(site_url)
    origin = origin.scheme + '://' + origin.netloc
    cors = {'name': 'cors', 'config': {'origins': [origin, 'https://beta.schooloftheancients.com'],
            'methods': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            'headers': ['Accept', 'Authorization', 'Content-Type', 'apikey', 'x-client-info', 'Prefer', 'Range', 'Range-Unit', 'Accept-Profile', 'Content-Profile', 'X-Supabase-Api-Version'],
            'exposed_headers': ['Content-Range', 'Range-Unit', 'Preference-Applied'], 'credentials': False, 'max_age': 3600}}
    auth_plugins = [cors, {'name': 'key-auth', 'config': {'key_names': ['apikey'], 'hide_credentials': False}}]
    kong = {'_format_version': '3.0', 'consumers': [
        {'username': 'anon', 'keyauth_credentials': [{'key': credentials['anon_key']}]},
        {'username': 'service_role', 'keyauth_credentials': [{'key': credentials['service_role_key']}]}],
        'services': [
            {'name': 'auth', 'url': 'http://auth:9999/', 'routes': [{'name': 'auth', 'paths': ['/auth/v1/'], 'strip_path': True}], 'plugins': auth_plugins},
            {'name': 'rest', 'url': 'http://rest:3000/', 'routes': [{'name': 'rest', 'paths': ['/rest/v1/'], 'strip_path': True}], 'plugins': auth_plugins},
            {'name': 'verify', 'url': 'http://auth:9999/verify', 'routes': [{'name': 'verify', 'paths': ['/auth/v1/verify'], 'strip_path': True}], 'plugins': [cors]},
            {'name': 'client-config', 'url': 'http://127.0.0.1:9', 'routes': [{'name': 'client-config', 'paths': ['/client-config'], 'strip_path': True, 'methods': ['GET', 'OPTIONS']}],
             'plugins': [cors, {'name': 'request-termination', 'config': {'status_code': 200, 'content_type': 'application/json', 'body': json.dumps(public)}}]}
        ]}
    write('kong.json', json.dumps(kong, indent=2) + '\n')
    gateway_b64 = base64.b64encode(json.dumps(kong).encode()).decode()
    with (output / '.env').open('a') as env:
        env.write('SOTA_GATEWAY_CONFIG_B64=' + gateway_b64 + '\n')
    common = {'restart': 'unless-stopped'}
    compose = {'name': 'sota-private', 'services': {
        'db': {**common, 'image': 'supabase/postgres:15.8.1.085', 'mem_limit': '1536m',
            'environment': {'POSTGRES_HOST': '/var/run/postgresql', 'POSTGRES_PORT': '5432', 'PGPORT': '5432', 'POSTGRES_DB': 'postgres', 'PGDATABASE': 'postgres', 'POSTGRES_PASSWORD': '${POSTGRES_PASSWORD}', 'PGPASSWORD': '${POSTGRES_PASSWORD}'},
            'volumes': ['sota-db:/var/lib/postgresql/data', 'sota-db-config:/etc/postgresql-custom', './roles.sql:/docker-entrypoint-initdb.d/init-scripts/99-sota-roles.sql:ro'],
            'healthcheck': {'test': ['CMD', 'pg_isready', '-U', 'postgres', '-h', 'localhost'], 'interval': '3s', 'timeout': '3s', 'retries': 30},
            'command': ['postgres', '-c', 'config_file=/etc/postgresql/postgresql.conf', '-c', 'log_min_messages=warning']},
        'auth': {**common, 'image': 'supabase/gotrue:v2.186.0', 'mem_limit': '384m',
            'depends_on': {'db': {'condition': 'service_healthy'}},
            'environment': {'GOTRUE_API_HOST': '0.0.0.0', 'GOTRUE_API_PORT': '9999', 'API_EXTERNAL_URL': public_url,
                'GOTRUE_DB_DRIVER': 'postgres', 'GOTRUE_DB_DATABASE_URL': 'postgres://supabase_auth_admin:${POSTGRES_PASSWORD}@db:5432/postgres',
                'GOTRUE_SITE_URL': site_url, 'GOTRUE_URI_ALLOW_LIST': site_url,
                'GOTRUE_DISABLE_SIGNUP': 'true', 'GOTRUE_EXTERNAL_EMAIL_ENABLED': 'true', 'GOTRUE_EXTERNAL_GOOGLE_ENABLED': 'false',
                'GOTRUE_EXTERNAL_PHONE_ENABLED': 'false', 'GOTRUE_EXTERNAL_ANONYMOUS_USERS_ENABLED': 'false',
                'GOTRUE_MAILER_AUTOCONFIRM': 'false', 'GOTRUE_JWT_SECRET': '${JWT_SECRET}', 'GOTRUE_JWT_EXP': '3600',
                'GOTRUE_JWT_ADMIN_ROLES': 'service_role', 'GOTRUE_JWT_AUD': 'authenticated', 'GOTRUE_JWT_DEFAULT_GROUP_NAME': 'authenticated',
                'GOTRUE_JWT_ISSUER': public_url + '/auth/v1', 'GOTRUE_LOG_LEVEL': 'warn'},
            'healthcheck': {'test': ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:9999/health'], 'interval': '3s', 'timeout': '3s', 'retries': 30}},
        'rest': {**common, 'image': 'postgrest/postgrest:v14.8', 'mem_limit': '256m',
            'depends_on': {'auth': {'condition': 'service_healthy'}},
            'environment': {'PGRST_DB_URI': 'postgres://authenticator:${POSTGRES_PASSWORD}@db:5432/postgres', 'PGRST_DB_SCHEMAS': 'public', 'PGRST_DB_ANON_ROLE': 'anon', 'PGRST_JWT_SECRET': '${JWT_SECRET}', 'PGRST_DB_MAX_ROWS': '100', 'PGRST_LOG_LEVEL': 'warn'}},
        'gateway': {**common, 'image': 'kong/kong:3.9.1', 'mem_limit': '512m',
            'depends_on': {'auth': {'condition': 'service_healthy'}, 'rest': {'condition': 'service_started'}},
            'ports': [bind_ip + ':8100:8000'],
            'entrypoint': ['/bin/sh', '-c', 'umask 077; printf %s "$$SOTA_GATEWAY_CONFIG_B64" | base64 -d > /tmp/sota-kong.json; exec /entrypoint.sh kong docker-start'],
            'ulimits': {'nofile': {'soft': 4096, 'hard': 65536}},
            'environment': {'SOTA_GATEWAY_CONFIG_B64': '${SOTA_GATEWAY_CONFIG_B64}', 'KONG_DATABASE': 'off', 'KONG_DECLARATIVE_CONFIG': '/tmp/sota-kong.json', 'KONG_PLUGINS': 'bundled', 'KONG_ADMIN_LISTEN': 'off', 'KONG_PROXY_LISTEN': '0.0.0.0:8000', 'KONG_PROXY_ACCESS_LOG': 'off', 'KONG_PROXY_ERROR_LOG': '/dev/stderr', 'KONG_NGINX_WORKER_PROCESSES': '1'},
            'healthcheck': {'test': ['CMD', 'kong', 'health'], 'interval': '3s', 'timeout': '3s', 'retries': 30}},
        'web': {**common, 'image': 'nginx@sha256:970364228b1e4f932abc22d321932816782cca8a20b85a77552a7cfe9acfb3b5', 'mem_limit': '128m', 'ports': [bind_ip + ':8101:80'],
            'volumes': ['./dist:/usr/share/nginx/html:ro', './nginx.conf:/etc/nginx/conf.d/default.conf:ro']}
    }, 'volumes': {'sota-db': {}, 'sota-db-config': {}}}
    write('compose.json', json.dumps(compose, indent=2) + '\n', 0o644)
    write('nginx.conf', 'server {\n listen 80;\n server_name _;\n root /usr/share/nginx/html;\n add_header X-Content-Type-Options nosniff always;\n add_header Referrer-Policy strict-origin-when-cross-origin always;\n location / { try_files $uri $uri/ /index.html; add_header Cache-Control "no-cache"; }\n}\n', 0o644)
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--public-url', required=True)
    parser.add_argument('--site-url', required=True)
    parser.add_argument('--allowed-email', required=True)
    parser.add_argument('--bind-ip', required=True)
    args = parser.parse_args()
    path = render(pathlib.Path(args.output), args.public_url, args.site_url, args.allowed_email, args.bind_ip)
    print('Rendered private SOTA instance at ' + str(path) + ' (credentials withheld)')

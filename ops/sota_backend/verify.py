"""Provision/test only the dedicated SOTA instance; never log credentials."""
import argparse
import base64
import hashlib
import hmac
import ipaddress
import json
import os
import pathlib
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from typing import Any


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def validate_target(instance, credentials, base_url):
    """Do not send a password or service credential to an arbitrary target."""
    candidate = base_url.rstrip('/')
    parsed = urllib.parse.urlsplit(candidate)
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('Verification URL must not contain credentials, query, or fragment')
    if parsed.scheme == 'https':
        if candidate != credentials['public_url'].rstrip('/'):
            raise ValueError('HTTPS verification must use the configured public URL')
        return
    if parsed.scheme != 'http':
        raise ValueError('Unsupported verification scheme')
    compose = json.loads((pathlib.Path(instance) / 'compose.json').read_text())
    mappings = compose['services']['gateway'].get('ports', [])
    expected = []
    for mapping in mappings:
        parts = mapping.split(':') if isinstance(mapping, str) else []
        if len(parts) != 3:
            continue
        address = ipaddress.ip_address(parts[0])
        if address.version == 4 and not address.is_unspecified and (address.is_private or address.is_loopback):
            expected.append('http://' + parts[0] + ':' + parts[1])
    if candidate not in expected:
        raise ValueError('HTTP verification must use the exact configured private gateway')


def verify_owner_storage(call, owner_id, access):
    """Never replace existing progress, even if a response is lost or races."""
    query = '/rest/v1/user_data?user_id=eq.' + owner_id
    status = 0
    prior: Any = []
    for _ in range(15):
        status, prior, _ = call(query, bearer=access)
        if status == 200:
            break
        time.sleep(1)
    if status != 200:
        raise RuntimeError('SOTA data schema is unavailable: HTTP ' + str(status))
    if prior:
        return {'owner_existing_data_read': True, 'owner_existing_data_preserved': True}, ['owner_write_existing_data']

    marker = {'deployment_verification': str(uuid.uuid4())}
    marker_filter = urllib.parse.quote(json.dumps(marker, separators=(',', ':')), safe='')
    cleanup_query = query + '&data=eq.' + marker_filter
    try:
        # Plain INSERT: a concurrent real owner row must cause 409, not an upsert.
        status, _, _ = call('/rest/v1/user_data', 'POST', {'user_id': owner_id, 'data': marker}, access,
                            extra_headers={'Prefer': 'return=representation'})
        if status == 409:
            return {'owner_concurrent_row_preserved': True}, ['owner_write_concurrent_insert']
        if status not in (200, 201):
            raise RuntimeError('Owner test insert failed: HTTP ' + str(status))
        status, rows, _ = call(query, bearer=access)
        return {'owner_write': True, 'owner_read_back': status == 200 and len(rows or []) == 1 and rows[0]['data'] == marker}, []
    finally:
        # This also handles a committed INSERT whose response timed out. Never
        # remove a row that another request changed after our test inserted it.
        status, _, _ = call(cleanup_query, 'DELETE', bearer=access)
        if status not in (200, 204):
            raise RuntimeError('Could not clean up the exact verification marker')


def verify(instance, base_url, provision=False):
    instance = pathlib.Path(instance).resolve(strict=True)
    if instance.name != 'sota-backend':
        raise ValueError('Refusing a non-SOTA instance directory')
    credentials = json.loads((instance / 'credentials.json').read_text())
    validate_target(instance, credentials, base_url)
    public_key = credentials['anon_key']
    service_key = credentials['service_role_key']
    checks = {}
    opener = urllib.request.build_opener(NoRedirect())

    def call(path, method='GET', data=None, bearer=None, use_key=True, extra_headers=None) -> tuple[int, Any, dict]:
        headers = {'User-Agent': 'SotaBackendVerification/1.0', 'Content-Type': 'application/json'}
        if use_key:
            headers['apikey'] = public_key
        if bearer:
            headers['Authorization'] = 'Bearer ' + bearer
        headers.update(extra_headers or {})
        request = urllib.request.Request(base_url.rstrip('/') + path,
                  data=json.dumps(data).encode() if data is not None else None, method=method, headers=headers)
        try:
            response = opener.open(request, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        raw = response.read()
        try:
            body = json.loads(raw) if raw else None
        except ValueError:
            body = None
        return response.code, body, dict(response.headers)

    if provision:
        subprocess.run(['docker', 'compose', '-f', str(instance / 'compose.json'), 'exec', '-T', 'db',
                        'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
                       input=(instance / 'schema.sql').read_text(), text=True, check=True,
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=instance)
        status, body, _ = call('/auth/v1/admin/users?page=1&per_page=100', bearer=service_key)
        if status != 200:
            raise RuntimeError('Cannot inspect the dedicated SOTA user registry: HTTP ' + str(status))
        matching = [u for u in body.get('users', []) if u.get('email', '').lower() == credentials['email'].lower()]
        if not matching:
            status, body, _ = call('/auth/v1/admin/users', 'POST', {
                'email': credentials['email'], 'password': credentials['password'], 'email_confirm': True}, service_key)
            if status not in (200, 201):
                raise RuntimeError('Cannot provision SOTA owner: HTTP ' + str(status))

    status = 0
    body: Any = None
    for _ in range(20):
        status, body, _ = call('/auth/v1/token?grant_type=password', 'POST',
                              {'email': credentials['email'], 'password': credentials['password']})
        if status == 200:
            break
        time.sleep(1)
    else:
        raise RuntimeError('Owner login failed: HTTP ' + str(status))
    access = body['access_token']
    owner_id = body['user']['id']
    refresh = body['refresh_token']
    checks['owner_login'] = body['user']['email'].lower() == credentials['email'].lower()
    status, body, _ = call('/auth/v1/signup', 'POST', {'email': 'not-allowed@example.invalid', 'password': 'not-a-real-login-password'})
    checks['public_signup_disabled'] = status in (400, 403, 422) and (body or {}).get('error_code') == 'signup_disabled'
    status, _, _ = call('/rest/v1/user_data?select=user_id', use_key=False)
    checks['gateway_key_required'] = status == 401
    status, _, _ = call('/rest/v1/user_data?select=user_id')
    checks['anonymous_data_denied'] = status in (401, 403)

    def signed_claims(claims):
        def enc(value):
            return base64.urlsafe_b64encode(json.dumps(value, separators=(',', ':')).encode()).decode().rstrip('=')
        unsigned = enc({'alg': 'HS256', 'typ': 'JWT'}) + '.' + enc(claims)
        signature = hmac.new(credentials['jwt_secret'].encode(), unsigned.encode(), hashlib.sha256).digest()
        return unsigned + '.' + base64.urlsafe_b64encode(signature).decode().rstrip('=')

    outsider_id = str(uuid.uuid4())
    outsider = signed_claims({'role': 'authenticated', 'aud': 'authenticated', 'sub': outsider_id,
                             'email': 'not-allowed@example.invalid', 'iat': int(time.time()), 'exp': int(time.time()) + 300})
    status, rows, _ = call('/rest/v1/user_data?select=user_id', bearer=outsider)
    checks['other_identity_cannot_read'] = status == 200 and rows == []
    status, _, _ = call('/rest/v1/user_data', 'POST', {'user_id': outsider_id, 'data': {}}, outsider)
    checks['other_identity_cannot_write'] = status in (401, 403)
    status, _, _ = call('/rest/v1/user_data', 'POST', {'user_id': outsider_id, 'data': {}}, access)
    checks['owner_cannot_write_another_row'] = status in (401, 403)
    storage_checks, skipped = verify_owner_storage(call, owner_id, access)
    checks.update(storage_checks)
    status, refreshed, _ = call('/auth/v1/token?grant_type=refresh_token', 'POST', {'refresh_token': refresh})
    checks['session_refresh'] = status == 200 and refreshed.get('user', {}).get('id') == owner_id
    if status == 200:
        call('/auth/v1/logout?scope=local', 'POST', bearer=refreshed['access_token'])
    status, users, _ = call('/auth/v1/admin/users?page=1&per_page=100', bearer=service_key)
    checks['only_owner_account'] = status == 200 and len(users.get('users', [])) == 1 and users['users'][0]['id'] == owner_id
    if not all(checks.values()):
        raise RuntimeError('Verification failed: ' + ', '.join(k for k, value in checks.items() if not value))
    report = {'base_url': base_url, 'checks': checks, 'skipped_checks': skipped, 'checked_at': int(time.time())}
    output = instance / ('public-verification.json' if base_url.startswith('https:') else 'local-verification.json')
    output.write_text(json.dumps(report, indent=2) + '\n')
    os.chmod(output, 0o600)
    print(json.dumps(report))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--instance', required=True)
    p.add_argument('--base-url', required=True)
    p.add_argument('--provision', action='store_true')
    args = p.parse_args()
    verify(args.instance, args.base_url, args.provision)

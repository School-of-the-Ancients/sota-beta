import base64
import json
import pathlib
import tempfile
import unittest

from ops.sota_backend.render import render


class RenderTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = pathlib.Path(self.temp.name) / 'instance'

    def build(self):
        return render(self.path, 'https://sim.thetopham.com/sota-api',
                      'https://sim.thetopham.com/sota/', 'owner@example.com', '192.168.0.35')

    def test_isolated_services_private_db_and_no_signup(self):
        self.build()
        compose = json.loads((self.path / 'compose.json').read_text())
        self.assertEqual(set(compose['services']), {'db', 'auth', 'rest', 'gateway', 'web'})
        self.assertEqual(compose['name'], 'sota-private')
        self.assertNotIn('ports', compose['services']['db'])
        self.assertNotIn('ports', compose['services']['auth'])
        self.assertNotIn('ports', compose['services']['rest'])
        self.assertEqual(compose['services']['gateway']['ports'], ['192.168.0.35:8100:8000'])
        self.assertEqual(compose['services']['web']['ports'], ['192.168.0.35:8101:80'])
        auth = compose['services']['auth']['environment']
        self.assertEqual(auth['GOTRUE_DISABLE_SIGNUP'], 'true')
        self.assertEqual(auth['GOTRUE_EXTERNAL_GOOGLE_ENABLED'], 'false')
        self.assertEqual(auth['GOTRUE_SITE_URL'], 'https://sim.thetopham.com/sota/')
        self.assertEqual(compose['volumes'], {'sota-db': {}, 'sota-db-config': {}})
        self.assertNotIn('volumes', compose['services']['gateway'])
        self.assertIn('umask 077', compose['services']['gateway']['entrypoint'][2])
        self.assertNotIn('CREATE OR REPLACE FUNCTION auth.jwt()', (self.path / 'roles.sql').read_text())

    def test_web_handles_cloudflare_tunnel_prefixes(self):
        self.build()
        config = (self.path / 'nginx.conf').read_text()
        self.assertIn('location /sota-api/', config)
        self.assertIn('proxy_pass http://gateway:8000/;', config)
        self.assertIn('rewrite ^/sota/(.*)$ /$1 break;', config)

    def test_rls_restricts_identity_and_row_owner(self):
        self.build()
        sql = (self.path / 'schema.sql').read_text()
        for fragment in ('ENABLE ROW LEVEL SECURITY', 'auth.uid() = user_id',
                         "owner@example.com", 'FROM anon', 'TO authenticated'):
            self.assertIn(fragment, sql)

    def test_public_config_contains_only_anon_credentials(self):
        self.build()
        private = json.loads((self.path / 'credentials.json').read_text())
        public = json.loads((self.path / 'public/client-config.json').read_text())
        self.assertEqual(set(public), {'url', 'anonKey'})
        payload = public['anonKey'].split('.')[1]
        claims = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)))
        self.assertEqual(claims['role'], 'anon')
        self.assertNotEqual(public['anonKey'], private['service_role_key'])
        self.assertEqual((self.path / 'credentials.json').stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.path.stat().st_mode & 0o777, 0o700)

    def test_existing_instance_is_not_overwritten(self):
        self.build()
        original = (self.path / 'credentials.json').read_bytes()
        with self.assertRaises(FileExistsError):
            self.build()
        self.assertEqual((self.path / 'credentials.json').read_bytes(), original)

    def test_rejects_insecure_public_url(self):
        with self.assertRaises(ValueError):
            render(self.path, 'http://example.com/api', 'https://example.com/',
                   'owner@example.com', '192.168.0.35')


if __name__ == '__main__':
    unittest.main()

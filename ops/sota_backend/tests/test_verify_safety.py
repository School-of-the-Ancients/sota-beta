import json
import pathlib
import tempfile
import unittest
import urllib.parse
from unittest.mock import Mock

from ops.sota_backend.verify import validate_target, verify_owner_storage
from ops.sota_backend.render import render


class VerifySafetyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.instance = pathlib.Path(self.temp.name)
        (self.instance / 'compose.json').write_text(json.dumps({'services': {'gateway': {'ports': ['192.168.0.35:8100:8000']}}}))
        self.credentials = {'public_url': 'https://example.com/sota-api'}

    def test_accepts_only_declared_public_or_local_endpoint(self):
        validate_target(self.instance, self.credentials, 'https://example.com/sota-api')
        validate_target(self.instance, self.credentials, 'http://192.168.0.35:8100')
        for target in ('https://attacker.example/sota-api', 'http://192.168.0.99:8100',
                       'https://example.com/sota-api?x=y', 'http://user:pass@192.168.0.35:8100'):
            with self.assertRaises(ValueError):
                validate_target(self.instance, self.credentials, target)

    def test_existing_progress_is_never_written_or_deleted(self):
        call = Mock(return_value=(200, [{'user_id': 'owner', 'data': {'progress': 'keep me'}}], {}))
        checks, skipped = verify_owner_storage(call, 'owner', 'access')
        self.assertTrue(all(checks.values()))
        self.assertIn('owner_write_existing_data', skipped)
        self.assertEqual(call.call_count, 1)
        self.assertEqual(call.call_args.args[0], '/rest/v1/user_data?user_id=eq.owner')

    def test_interrupted_fresh_insert_only_cleans_its_own_marker(self):
        requests = []
        def call(path, method='GET', data=None, *args, **kwargs):
            requests.append((path, method, data))
            if method == 'GET':
                return 200, [], {}
            if method == 'POST':
                raise TimeoutError('response lost after commit')
            return 204, None, {}
        with self.assertRaises(TimeoutError):
            verify_owner_storage(call, 'owner', 'access')
        path, method, _ = requests[-1]
        self.assertEqual(method, 'DELETE')
        self.assertIn('&data=eq.', path)
        self.assertIn('deployment_verification', urllib.parse.unquote(path))
        self.assertNotIn('on_conflict', requests[1][0])

    def test_concurrent_insert_is_not_overwritten(self):
        requests = []
        def call(path, method='GET', data=None, *args, **kwargs):
            requests.append((path, method))
            if method == 'GET':return 200, [], {}
            if method == 'POST':return 409, None, {}
            return 204, None, {}
        checks, skipped = verify_owner_storage(call, 'owner', 'access')
        self.assertTrue(checks['owner_concurrent_row_preserved'])
        self.assertIn('owner_write_concurrent_insert', skipped)
        self.assertNotIn('on_conflict', requests[1][0])
        self.assertIn('&data=eq.', requests[-1][0])

    def test_ipv6_is_explicitly_rejected(self):
        with self.assertRaises(ValueError):
            render(self.instance / 'ipv6', 'https://example.com/api', 'https://example.com/', 'owner@example.com', 'fd00::1')


if __name__ == '__main__':
    unittest.main()

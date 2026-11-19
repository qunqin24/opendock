"""Deployment regression tests, independent of SSH and the live server."""
import importlib.util
import io
import os
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('receiver', Path(__file__).parents[1] / 'deploy-receive.py')
receiver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(receiver)


class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'releases').mkdir()
        self.patch = patch.object(receiver, 'ROOT', self.root)
        self.patch.start()
        self.addCleanup(self.patch.stop)

    def releases(self):
        paths = []
        for i in range(5):
            p = self.root / 'releases' / f'release-{i}'
            p.mkdir()
            (p / 'index.html').write_text('OpenDock')
            os.utime(p, (i, i))
            paths.append(p)
        return paths

    def test_keeps_three_recent_and_rollback_target(self):
        paths = self.releases()
        receiver.prune_releases(paths[4], paths[0])
        self.assertTrue(paths[0].exists())
        self.assertFalse(paths[1].exists())
        self.assertTrue(all(p.exists() for p in paths[2:]))

    def test_does_not_delete_foreign_owned_bootstrap(self):
        paths = self.releases()
        with patch.object(receiver.os, 'geteuid', return_value=-1), patch.object(receiver.shutil, 'rmtree') as remove:
            receiver.prune_releases(paths[4], paths[3])
        remove.assert_not_called()
        self.assertTrue(all(p.exists() for p in paths))

    def test_permission_failure_is_warning_and_cleanup_continues(self):
        paths = self.releases()
        real_remove = receiver.shutil.rmtree

        def remove(path):
            if path == paths[1]:
                raise PermissionError('root-owned index.html')
            real_remove(path)

        with patch.object(receiver.shutil, 'rmtree', side_effect=remove), patch('sys.stderr', new_callable=io.StringIO) as stderr:
            receiver.prune_releases(paths[4], paths[3])
        self.assertIn('Warning:', stderr.getvalue())
        self.assertTrue(paths[1].exists())
        self.assertFalse(paths[0].exists())

    def archive(self):
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode='w:gz') as archive:
            for name in ('index.html', 'zh/index.html', '404.html', 'search-index.json'):
                member = tarfile.TarInfo(name)
                data = b'OpenDock'
                member.size = len(data)
                archive.addfile(member, io.BytesIO(data))
        stream.seek(0)
        return stream

    def test_successful_publish_stays_successful_when_pruning_fails(self):
        paths = self.releases()
        (self.root / 'current').symlink_to(paths[4].relative_to(self.root))
        with patch('sys.stdin') as stdin, patch.object(receiver.urllib.request, 'urlopen') as request, patch.object(receiver.shutil, 'rmtree', side_effect=PermissionError('denied')):
            stdin.buffer = self.archive()
            response = request.return_value.__enter__.return_value
            response.status = 200
            response.read.return_value = b'OpenDock'
            receiver.main()
        current = (self.root / 'current').resolve()
        self.assertNotEqual(current, paths[4])
        self.assertEqual((current / 'index.html').read_text(), 'OpenDock')

    def test_failed_health_check_rolls_back(self):
        paths = self.releases()
        (self.root / 'current').symlink_to(paths[4].relative_to(self.root))
        with patch('sys.stdin') as stdin, patch.object(receiver.urllib.request, 'urlopen', side_effect=OSError('offline')):
            stdin.buffer = self.archive()
            with self.assertRaises(OSError):
                receiver.main()
        self.assertEqual((self.root / 'current').resolve(), paths[4])
        self.assertEqual(len(list((self.root / 'releases').iterdir())), 5)


if __name__ == '__main__':
    unittest.main()

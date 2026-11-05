import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import yaml

SOURCE = Path(__file__).resolve().parents[1] / 'skills/video-studio/scripts/install_stack.py'
SPEC = importlib.util.spec_from_file_location('install_stack', SOURCE)
stack = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(stack)


class StackTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.staged = self.root / 'staged'
        self.destination = self.root / 'installed'
        self.helper = self.root / 'helper.py'
        self.helper.write_text('')
        self.group = {'repository': 'owner/repo', 'ref': 'a' * 40, 'paths': ['skills/example'], 'license_path': None}
        self.lock = {'version': 1, 'groups': [self.group]}

    def fixture(self, name='example', extra=''):
        folder = self.staged / name
        folder.mkdir(parents=True)
        (folder / 'SKILL.md').write_text('---\nname: ' + name + '\ndescription: An example video skill\n' + extra + '---\n\n# Workflow\nKeep the production instructions.\n')
        (folder / 'reference.txt').write_text('reference data')
        return folder

    def test_metadata_compatibility_preserves_workflow_and_explicit_invocation(self):
        folder = self.fixture(extra='version: 1.2.3\ndisable-model-invocation: true\n')
        original = (folder / 'SKILL.md').read_text()
        changes = stack.normalize(folder)
        after = (folder / 'SKILL.md').read_text()
        self.assertEqual(after.split('\n---\n', 1)[1], original.split('\n---\n', 1)[1])
        self.assertEqual(changes, ['disable-model-invocation', 'version'])
        front = yaml.safe_load(after.split('---')[1])
        self.assertEqual(front['metadata']['version'], '1.2.3')
        self.assertFalse(yaml.safe_load((folder / 'agents/openai.yaml').read_text())['policy']['allow_implicit_invocation'])
        self.assertEqual((folder / '.video-stack-upstream-skill.txt').read_text(), original)

    def test_install_records_exact_files_and_second_run_uses_no_network(self):
        self.fixture()
        result = stack.install(self.destination, self.lock, self.helper, self.staged)
        self.assertEqual(result, {'example': 'ready'})
        with patch.object(stack.subprocess, 'run', side_effect=AssertionError('download attempted')):
            self.assertEqual(stack.install(self.destination, self.lock, self.helper), {'example': 'ready'})

    def test_changed_or_unmanaged_skills_are_not_replaced(self):
        self.fixture()
        stack.install(self.destination, self.lock, self.helper, self.staged)
        file = self.destination / 'example/reference.txt'
        file.write_text('a local edit')
        self.assertEqual(stack.inspect(self.destination, self.lock), {'example': 'local-changes'})
        with self.assertRaisesRegex(ValueError, 'preserving existing'):
            stack.install(self.destination, self.lock, self.helper, self.staged)
        self.assertEqual(file.read_text(), 'a local edit')
        (self.destination / 'example' / stack.RECEIPT).unlink()
        self.assertEqual(stack.inspect(self.destination, self.lock), {'example': 'existing-unmanaged'})

    def test_invalid_staged_skill_leaves_destination_untouched(self):
        folder = self.fixture()
        (folder / 'SKILL.md').write_text('invalid')
        with self.assertRaises(ValueError):
            stack.install(self.destination, self.lock, self.helper, self.staged)
        self.assertFalse(self.destination.exists())

    def test_failed_copy_removes_only_directories_created_by_this_install(self):
        self.fixture()
        self.destination.mkdir()
        unrelated = self.destination / 'existing.txt'
        unrelated.write_text('keep')
        with patch.object(stack.shutil, 'copytree', side_effect=OSError('disk full')):
            with self.assertRaises(OSError):
                stack.install(self.destination, self.lock, self.helper, self.staged)
        self.assertFalse((self.destination / 'example').exists())
        self.assertEqual(unrelated.read_text(), 'keep')

    def test_lock_requires_exact_versions_unique_names_and_contained_paths(self):
        file = self.root / 'lock.json'
        for bad in [dict(self.group, ref='main'), dict(self.group, paths=['../bad']), dict(self.group, paths=['skills/example', 'other/example'])]:
            file.write_text(json.dumps({'version': 1, 'groups': [bad]}))
            with self.assertRaises(ValueError):
                stack.load_lock(file)


if __name__ == '__main__':
    unittest.main()

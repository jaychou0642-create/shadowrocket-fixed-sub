import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

from scripts import sync_ai_rules as sync


SOURCE_REF = "a" * 40
BASELINE_REF = "b" * 40


class SyncAIRulesTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.source = self.root / "v2fly"
        (self.source / "data").mkdir(parents=True)
        (self.source / "LICENSE").write_text(
            "MIT License\n\nCopyright (c) Test\n\n"
            "Permission is hereby granted, free of charge, to any person obtaining a copy.\n",
            encoding="utf-8",
        )
        self.baseline = self.root / "AI.txt"
        self.output = self.root / "AICustom.list"

    def tearDown(self):
        self.temp.cleanup()

    def write_source(self, name, text):
        path = self.source / "data" / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
        return path

    def write_baseline(self, text="DOMAIN-SUFFIX,covered.example\n"):
        self.baseline.write_text(text, encoding="utf-8")

    def generate(self):
        return sync.generate(self.source, SOURCE_REF, self.baseline, BASELINE_REF)

    def cli(self, *extra):
        return subprocess.run(
            [sys.executable, str(Path(sync.__file__)),
             "--source-dir", str(self.source), "--source-ref", SOURCE_REF,
             "--baseline-file", str(self.baseline), "--baseline-ref", BASELINE_REF,
             "--output", str(self.output), *extra],
            capture_output=True, text=True, env={**os.environ, "PYTHONDONTWRITEBYTECODE": "1"},
        )

    def test_recursive_include_and_cycle_and_missing_file(self):
        self.write_source("category-ai-!cn", "include:outer\n")
        self.write_source("outer", "include:nested\ndomain:example.com\n")
        self.write_source("nested", "full:api.example.com\n")
        self.assertEqual(
            sync.expand_source(self.source),
            [sync.Rule("DOMAIN", "api.example.com"),
             sync.Rule("DOMAIN-SUFFIX", "example.com")],
        )

        self.write_source("nested", "include:outer\n")
        with self.assertRaisesRegex(sync.InputError, "Include cycle"):
            sync.expand_source(self.source)

        self.write_source("category-ai-!cn", "include:absent\n")
        with self.assertRaises((FileNotFoundError, sync.InputError)):
            sync.expand_source(self.source)

    def test_domain_full_keyword_and_comments(self):
        self.write_source("category-ai-!cn", """
            # whole-line comment
            domain:Example.COM # inline comment
            full:API.Example.COM
            keyword:Copilot
        """)
        self.assertEqual(
            sync.expand_source(self.source),
            [sync.Rule("DOMAIN", "api.example.com"),
             sync.Rule("DOMAIN-KEYWORD", "copilot"),
             sync.Rule("DOMAIN-SUFFIX", "example.com")],
        )

    def test_attribute_include_selectors_filter_recursive_entries(self):
        self.write_source("child", "domain:cn.example @!cn\ndomain:global.example\n")
        self.write_source("category-ai-!cn", "include:child @!cn\n")
        self.assertEqual(
            sync.expand_source(self.source),
            [sync.Rule("DOMAIN-SUFFIX", "cn.example")],
        )

        self.write_source("category-ai-!cn", "include:child @-!cn\n")
        self.assertEqual(
            sync.expand_source(self.source),
            [sync.Rule("DOMAIN-SUFFIX", "global.example")],
        )

    def test_nested_attribute_selection_is_case_insensitive(self):
        self.write_source("category-ai-!cn", "include:child @Region=CN\n")
        self.write_source("child", "include:nested @region=cn\n")
        self.write_source(
            "nested",
            "full:api.cn.example @REGION=CN\nfull:api.us.example @Region=US\n",
        )
        self.assertEqual(
            sync.expand_source(self.source),
            [sync.Rule("DOMAIN", "api.cn.example")],
        )

    def test_global_affiliation_adds_rules_from_other_data_files(self):
        self.write_source("category-ai-!cn", "domain:direct.example\n")
        self.write_source("shared-list", "domain:shared.example &category-ai-!cn\n")
        self.assertEqual(
            sync.expand_source(self.source, "category-ai-!cn"),
            [sync.Rule("DOMAIN-SUFFIX", "direct.example"),
             sync.Rule("DOMAIN-SUFFIX", "shared.example")],
        )

    def test_affiliation_on_included_list_propagates_to_its_rules(self):
        self.write_source("category-ai-!cn", "include:child\n")
        self.write_source("child", "domain:child.example\n")
        self.write_source("external", "full:nested.example &child\n")
        self.assertEqual(
            sync.expand_source(self.source),
            [sync.Rule("DOMAIN", "nested.example"),
             sync.Rule("DOMAIN-SUFFIX", "child.example")],
        )

    def test_virtual_affiliation_list_needs_no_data_file(self):
        self.write_source("category-ai-!cn", "include:virtual-ai\n")
        self.write_source("shared-list", "domain:virtual.example &virtual-ai\n")
        self.assertIn(
            sync.Rule("DOMAIN-SUFFIX", "virtual.example"),
            sync.expand_source(self.source),
        )

    def test_multiple_affiliations_and_duplicate_domains_are_deduplicated(self):
        self.write_source("category-ai-!cn", "domain:duplicate.example\n")
        self.write_source("one", "domain:duplicate.example &category-ai-!cn &other\n")
        self.write_source("two", "domain:duplicate.example &other &category-ai-!cn\n")
        self.assertEqual(
            sync.expand_source(self.source),
            [sync.Rule("DOMAIN-SUFFIX", "duplicate.example")],
        )

    def test_attributes_are_preserved_before_include_selector_filtering(self):
        self.write_source("category-ai-!cn", "include:child @region=cn\n")
        self.write_source("child", "domain:base.example\n")
        self.write_source(
            "external",
            "domain:variant.example &child @region=cn\n"
            "domain:variant.example &child @region=us\n"
            "domain:only-cn.example &child @region=cn\n"
            "domain:only-us.example &child @region=us\n",
        )
        self.assertEqual(
            sync.expand_source(self.source),
            [sync.Rule("DOMAIN-SUFFIX", "only-cn.example"),
             sync.Rule("DOMAIN-SUFFIX", "variant.example")],
        )
        self.write_source("category-ai-!cn", "include:child @-region=cn\n")
        self.assertEqual(
            sync.expand_source(self.source),
            [sync.Rule("DOMAIN-SUFFIX", "base.example"),
             sync.Rule("DOMAIN-SUFFIX", "only-us.example"),
             sync.Rule("DOMAIN-SUFFIX", "variant.example")],
        )

    def test_affiliation_names_are_case_insensitive(self):
        self.write_source("category-ai-!cn", "domain:direct.example\n")
        self.write_source("other", "domain:Mixed.Example &CATEGORY-AI-!CN\n")
        self.assertIn(
            sync.Rule("DOMAIN-SUFFIX", "mixed.example"),
            sync.expand_source(self.source),
        )

    def test_include_line_with_affiliation_is_rejected(self):
        self.write_source("category-ai-!cn", "include:child &category-ai-!cn\n")
        self.write_source("child", "domain:child.example\n")
        with self.assertRaises(sync.InputError):
            sync.expand_source(self.source)

    def test_unknown_syntax_in_relevant_affiliation_file_fails_and_preserves_output(self):
        self.write_source("category-ai-!cn", "domain:valid.example\n")
        self.write_source("shared", "regexp:^unsupported\\.example$ &category-ai-!cn\n")
        self.write_baseline()
        self.output.write_text("old rules\n", encoding="utf-8")
        old = self.output.read_bytes()
        result = self.cli()
        self.assertEqual(result.returncode, 2)
        self.assertEqual(self.output.read_bytes(), old)

    def test_unrelated_unknown_regex_and_affiliation_do_not_change_ai_or_source_hash(self):
        self.write_source("category-ai-!cn", "domain:valid.example\n")
        unrelated = self.write_source(
            "unrelated", "regexp:^unsupported\\.example$\ndomain:noise.example &not-an-ai-list\n"
        )
        self.write_baseline()
        first = self.generate()
        unrelated.write_text(
            "regexp:^another-unsupported$\ndomain:other-noise.example &not-an-ai-list\n",
            encoding="utf-8",
        )
        second = self.generate()
        self.assertEqual(first, second)

    def test_irrelevant_lines_in_external_affiliation_file_do_not_change_hash(self):
        self.write_source("category-ai-!cn", "domain:valid.example\n")
        affiliate = self.write_source(
            "external",
            "domain:related.example &category-ai-!cn\n"
            "domain:noise.example &some-other-list\n",
        )
        self.write_baseline()
        first = self.generate()
        affiliate.write_text(
            "domain:inserted.example &another-unrelated-list\n"
            "domain:related.example &category-ai-!cn\n"
            "domain:changed.example &some-other-list\n",
            encoding="utf-8",
        )
        unchanged = self.generate()
        self.assertEqual(first, unchanged)

        affiliate.write_text(
            "domain:inserted.example &another-unrelated-list\n"
            "domain:updated.example &category-ai-!cn\n"
            "domain:changed.example &some-other-list\n",
            encoding="utf-8",
        )
        changed = self.generate()
        self.assertNotEqual(first, changed)
        self.assertNotIn("related.example", changed)
        self.assertIn("updated.example", changed)

    def test_exact_and_suffix_are_distinct_but_suffix_covers_descendants(self):
        self.write_source("category-ai-!cn", "full:example.com\ndomain:sub.example.com\n")
        self.write_baseline("DOMAIN,example.com\n")
        result = self.generate()
        self.assertIn("DOMAIN-SUFFIX,sub.example.com\n", result)
        self.assertNotIn("DOMAIN,example.com\n", result)

        self.write_baseline("DOMAIN-SUFFIX,example.com\n")
        result = self.generate()
        self.assertNotIn("DOMAIN,example.com\n", result)
        self.assertNotIn("DOMAIN-SUFFIX,sub.example.com\n", result)

    def test_keyword_and_wildcard_baseline_coverage(self):
        self.write_source("category-ai-!cn", """
            keyword:openai
            regexp:^chatgpt-async-webps-prod-\\S+-\\d+\\.webpubsub\\.azure\\.com$
            full:chatgpt-async-webps-prod-abc-42.webpubsub.azure.com
        """)
        self.write_baseline("DOMAIN-KEYWORD,openai\nDOMAIN-WILDCARD,chatgpt-async-webps-prod-*-*.webpubsub.azure.com\n")
        self.assertEqual(self.generate().split("# TOTAL: ")[-1].splitlines()[0], "0")

    def test_known_chatgpt_azure_regex_maps_to_compatible_wildcard(self):
        self.write_source("category-ai-!cn", "regexp:" + sync.AZURE_REGEX + "\n")
        self.write_baseline("DOMAIN-SUFFIX,unrelated.example\n")
        result = self.generate()
        self.assertIn("DOMAIN-WILDCARD," + sync.AZURE_WILDCARD + "\n", result)
        self.assertIn("Azure regexp compatibility: wildcard numeric suffix is not enforced.", result)

    def test_stable_generation_and_unchanged_output_preserves_mtime(self):
        self.write_source("category-ai-!cn", "domain:one.example\ndomain:two.example\n")
        self.write_baseline()
        first = self.generate()
        self.assertEqual(first, self.generate())
        self.output.write_text(first, encoding="utf-8")
        old_ns = self.output.stat().st_mtime_ns
        result = self.cli()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(old_ns, self.output.stat().st_mtime_ns)

    def test_commit_ref_only_changes_are_ignored_for_check_and_write(self):
        self.write_source("category-ai-!cn", "domain:valid.example\n")
        self.write_baseline()
        self.output.write_text(self.generate(), encoding="utf-8")
        old_ns = self.output.stat().st_mtime_ns
        changed_refs = ["--source-ref", "c" * 40, "--baseline-ref", "d" * 40]
        result = self.cli(*changed_refs)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(old_ns, self.output.stat().st_mtime_ns)
        result = self.cli("--check", *changed_refs)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_default_output_is_rooted_at_repository(self):
        self.write_source("category-ai-!cn", "domain:valid.example\n")
        self.write_baseline()
        expected = self.root / "rules" / "AICustom.list"
        fake_script = self.root / "scripts" / "sync_ai_rules.py"
        with mock.patch.object(sync, "__file__", str(fake_script)):
            self.assertEqual(sync.main([
                "--source-dir", str(self.source), "--source-ref", SOURCE_REF,
                "--baseline-file", str(self.baseline), "--baseline-ref", BASELINE_REF,
            ]), 0)
        self.assertTrue(expected.is_file())

    def test_generated_output_contains_source_license_notice(self):
        self.write_source("category-ai-!cn", "domain:valid.example\n")
        self.write_baseline()
        notice = (
            "MIT License\n\nCopyright (c) Test\n\n"
            "Permission is hereby granted, free of charge, to any person obtaining a copy.\n"
        )
        (self.source / "LICENSE").write_text(notice, encoding="utf-8")
        commented_notice = "\n".join(
            "# " + line if line else "#" for line in notice.strip().splitlines()
        )
        self.assertIn(commented_notice, self.generate())

    def test_unknown_source_syntax_regex_invalid_domain_and_empty_baseline_fail(self):
        invalid_sources = [
            "unknown:value.example\n",
            "regexp:^unsupported\\.example$\n",
            "domain:bad..example\n",
        ]
        self.write_baseline()
        for source in invalid_sources:
            with self.subTest(source=source):
                self.write_source("category-ai-!cn", source)
                with self.assertRaises(sync.InputError):
                    self.generate()
        self.write_source("category-ai-!cn", "domain:valid.example\n")
        self.write_baseline("# no entries\n")
        with self.assertRaisesRegex(sync.InputError, "Baseline is empty"):
            self.generate()

    def test_invalid_inputs_and_download_or_read_failure_preserve_old_output(self):
        self.output.write_text("old rules\n", encoding="utf-8")
        old = self.output.read_bytes()
        self.write_source("category-ai-!cn", "include:missing\n")
        self.write_baseline()
        result = self.cli()
        self.assertEqual(result.returncode, 2)
        self.assertEqual(old, self.output.read_bytes())

        self.write_source("category-ai-!cn", "domain:valid.example\n")
        self.baseline.unlink()
        result = self.cli()
        self.assertEqual(result.returncode, 2)
        self.assertEqual(old, self.output.read_bytes())

        self.baseline.write_text("# empty\n", encoding="utf-8")
        result = self.cli()
        self.assertEqual(result.returncode, 2)
        self.assertEqual(old, self.output.read_bytes())

        self.write_source("category-ai-!cn", "regexp:^unknown-regexp$\n")
        self.write_baseline()
        result = self.cli()
        self.assertEqual(result.returncode, 2)
        self.assertEqual(old, self.output.read_bytes())

        self.write_source("category-ai-!cn", "# empty upstream list\n")
        result = self.cli()
        self.assertEqual(result.returncode, 2)
        self.assertEqual(old, self.output.read_bytes())

    def test_check_reports_drift_without_writing(self):
        self.write_source("category-ai-!cn", "domain:valid.example\n")
        self.write_baseline()
        self.output.write_text("old rules\n", encoding="utf-8")
        old = self.output.read_bytes()
        result = self.cli("--check")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(old, self.output.read_bytes())

        self.output.write_bytes(self.generate().encode())
        result = self.cli("--check")
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_atomic_replace_failure_keeps_old_output_and_cleans_temporary(self):
        self.write_source("category-ai-!cn", "domain:new.example\n")
        self.write_baseline()
        self.output.write_text("old rules\n", encoding="utf-8")
        old = self.output.read_bytes()
        with mock.patch.object(sync.os, "replace", side_effect=OSError("replace failed")):
            self.assertEqual(sync.main([
                "--source-dir", str(self.source), "--source-ref", SOURCE_REF,
                "--baseline-file", str(self.baseline), "--baseline-ref", BASELINE_REF,
                "--output", str(self.output),
            ]), 2)
        self.assertEqual(old, self.output.read_bytes())
        self.assertEqual([self.output], list(self.root.glob("AICustom.list")))
        self.assertEqual([], list(self.root.glob(".AICustom.list.*")))


if __name__ == "__main__":
    unittest.main()

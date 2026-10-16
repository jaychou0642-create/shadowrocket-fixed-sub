#!/usr/bin/env python3
"""Build AICustom from pinned local inputs; no network access.

Public API: Rule(kind, value), expand_source(clone_root, entry=...) -> list[Rule],
parse_baseline(text) -> list[Rule], is_covered(rule, baseline) -> bool,
generate(source_dir, source_ref, baseline_file, baseline_ref) -> str.
Unknown syntax, including affiliation (&list), fails closed.
"""
from __future__ import annotations

import argparse
from dataclasses import dataclass
import fnmatch
import hashlib
from pathlib import Path
import re
import os
import sys
import tempfile


class InputError(ValueError):
    """An input cannot safely be represented."""


@dataclass(frozen=True, order=True)
class Rule:
    kind: str
    value: str


KINDS = {'DOMAIN', 'DOMAIN-SUFFIX', 'DOMAIN-KEYWORD', 'DOMAIN-WILDCARD'}
AZURE_REGEX = r'^chatgpt-async-webps-prod-\S+-\d+\.webpubsub\.azure\.com$'
AZURE_WILDCARD = 'chatgpt-async-webps-prod-*-*.webpubsub.azure.com'
NAME = re.compile(r'[a-zA-Z0-9_!.-]+\Z')
ATTR = re.compile(r'@(-?)([a-zA-Z0-9!]+)(?:=([a-zA-Z0-9_.-]+))?\Z')


def _domain(value: str, wildcard: bool = False) -> str:
    value = value.lower()
    if len(value) > 253 or not value or value.endswith('.'):
        raise InputError(f'Invalid domain: {value!r}')
    for label in value.split('.'):
        if wildcard:
            label = label.replace('*', 'a').replace('?', 'a')
        if (not label or len(label) > 63 or
                not re.fullmatch(r'[a-z0-9](?:[a-z0-9-]*[a-z0-9])?', label)):
            raise InputError(f'Invalid domain: {value!r}')
    return value


def _rule(kind: str, value: str) -> Rule:
    if kind not in KINDS:
        raise InputError(f'Unsupported rule type: {kind}')
    if kind == 'DOMAIN-KEYWORD':
        if not re.fullmatch(r'[a-zA-Z0-9_.-]+', value):
            raise InputError(f'Invalid keyword: {value!r}')
        value = value.lower()
    else:
        value = _domain(value, kind == 'DOMAIN-WILDCARD')
    return Rule(kind, value)


def _selectors(tokens: list[str], allow_negative: bool) -> list[tuple[bool, str, str | None]]:
    result = []
    for token in tokens:
        m = ATTR.fullmatch(token)
        if not m or (m[1] and not allow_negative):
            raise InputError(f'Unsupported attribute: {token!r}')
        result.append((bool(m[1]), m[2].lower(), m[3].lower() if m[3] is not None else None))
    return result


def _expand(source_dir: Path, entry: str) -> tuple[list[Rule], str]:
    data = source_dir / 'data'
    snapshots: dict[str, bytes] = {}

    def visit(name: str, stack: tuple[str, ...]):
        if not NAME.fullmatch(name) or name in {'.', '..'}:
            raise InputError(f'Invalid include name: {name!r}')
        if name in stack:
            raise InputError(f'Include cycle: {" -> ".join((*stack, name))}')
        path = data / name
        if path.is_symlink():
            raise InputError(f'Symlink source rejected: {name}')
        if name not in snapshots:
            snapshots[name] = path.read_bytes()
        raw = snapshots[name]
        result = []
        for number, line in enumerate(raw.decode('utf-8').splitlines(), 1):
            line = line.split('#', 1)[0].strip()
            if not line:
                continue
            parts = line.split()
            head = parts[0]
            try:
                kind, value = head.split(':', 1) if ':' in head else ('domain', head)
                if kind == 'include':
                    selectors = _selectors(parts[1:], True)
                    children = visit(value, (*stack, name))
                    for rule, attrs in children:
                        if all(((key in attrs and (val is None or attrs[key] == val)) != neg)
                               for neg, key, val in selectors):
                            result.append((rule, attrs))
                    continue
                attrs_list = _selectors(parts[1:], False)
                attrs = {}
                for _, key, val in attrs_list:
                    if key in attrs and attrs[key] != val:
                        raise InputError(f'Conflicting attribute values: {key}')
                    attrs[key] = val
                if kind == 'regexp':
                    if value != AZURE_REGEX:
                        raise InputError(f'Unsupported regexp: {value!r}')
                    rule = _rule('DOMAIN-WILDCARD', AZURE_WILDCARD)
                elif kind in {'domain', 'full', 'keyword'}:
                    rule = _rule({'domain': 'DOMAIN-SUFFIX', 'full': 'DOMAIN',
                                  'keyword': 'DOMAIN-KEYWORD'}[kind], value)
                else:
                    raise InputError(f'Unsupported source syntax: {head!r}')
                result.append((rule, attrs))
            except InputError as exc:
                raise InputError(f'{name}:{number}: {exc}') from exc
        return result

    entries = visit(entry, ())
    if not entries:
        raise InputError('Upstream expanded list is empty')
    digest = hashlib.sha256()
    for name, raw in sorted(snapshots.items()):
        # Length framing prevents ambiguity between paths and file contents.
        encoded = name.encode()
        digest.update(len(encoded).to_bytes(8, 'big') + encoded)
        digest.update(len(raw).to_bytes(8, 'big') + raw)
    return sorted({rule for rule, _ in entries}), digest.hexdigest()


def expand_source(source_dir: str | Path, entry: str = 'category-ai-!cn') -> list[Rule]:
    """source_dir is the clone root containing data/, never data/ itself."""
    return _expand(Path(source_dir), entry)[0]


def parse_baseline(text: str) -> list[Rule]:
    rules = set()
    for number, line in enumerate(text.splitlines(), 1):
        line = line.split('#', 1)[0].strip()
        if not line or line.startswith('//'):
            continue
        fields = [part.strip() for part in line.split(',')]
        if len(fields) != 2:
            raise InputError(f'Baseline line {number}: expected TYPE,value')
        rules.add(_rule(*fields))
    if not rules:
        raise InputError('Baseline is empty')
    return sorted(rules)


def is_covered(rule: Rule, baseline: list[Rule]) -> bool:
    for base in baseline:
        if base == rule:
            return True
        if base.kind == 'DOMAIN-SUFFIX' and rule.kind in {'DOMAIN', 'DOMAIN-SUFFIX'}:
            if rule.value == base.value or rule.value.endswith('.' + base.value):
                return True
        if base.kind == 'DOMAIN-KEYWORD':
            # A literal keyword in a fixed portion also covers every wildcard match.
            if base.value in rule.value:
                return True
        if base.kind == 'DOMAIN-WILDCARD' and rule.kind == 'DOMAIN':
            if fnmatch.fnmatchcase(rule.value, base.value):
                return True
    return False


def generate(source_dir: str | Path, source_ref: str, baseline_file: str | Path,
             baseline_ref: str) -> str:
    for ref in (source_ref, baseline_ref):
        if not re.fullmatch(r'[0-9a-fA-F]{40,64}', ref):
            raise InputError('Source and baseline refs must be full commit hashes')
    source, source_hash = _expand(Path(source_dir), 'category-ai-!cn')
    license_text = (Path(source_dir) / 'LICENSE').read_text(encoding='utf-8').strip()
    if not license_text or 'MIT License' not in license_text or 'Permission is hereby granted' not in license_text:
        raise InputError('Missing or unrecognized upstream MIT license notice')
    raw = Path(baseline_file).read_bytes()
    baseline = parse_baseline(raw.decode('utf-8'))
    supplemental = [rule for rule in source if not is_covered(rule, baseline)]
    header = [
        '# NAME: AICustom',
        '# Generated by scripts/sync_ai_rules.py; do not edit.',
        '# SOURCE: https://github.com/v2fly/domain-list-community',
        f'# SOURCE-COMMIT: {source_ref.lower()}',
        f'# SOURCE-SNAPSHOT-SHA256: {source_hash}',
        '# SOURCE-LICENSE: MIT (v2fly/domain-list-community/LICENSE)',
        '# BASELINE: https://github.com/iab0x00/ProxyRules/blob/main/Rule/AI.txt',
        f'# BASELINE-COMMIT: {baseline_ref.lower()}',
        f'# BASELINE-SHA256: {hashlib.sha256(raw).hexdigest()}',
        '# Supplemental rules not semantically covered by the separately referenced baseline.',
        '# Azure regexp compatibility: wildcard numeric suffix is not enforced.',
        f'# UPSTREAM-TOTAL: {len(source)}',
        f'# BASELINE-TOTAL: {len(baseline)}',
    ]
    header += [f'# {kind}: {sum(r.kind == kind for r in supplemental)}' for kind in sorted(KINDS)]
    header += [f'# TOTAL: {len(supplemental)}', '#', '# Upstream license notice:']
    header += ['# ' + line if line else '#' for line in license_text.splitlines()]
    header += ['']
    return '\n'.join(header + [f'{r.kind},{r.value}' for r in supplemental]) + '\n'


def equivalent_output(old: bytes | None, new: bytes) -> bool:
    """Ignore provenance-only ref movement when all generated content is stable."""
    if old is None:
        return False
    prefixes = (b'# SOURCE-COMMIT: ', b'# BASELINE-COMMIT: ')
    def normalized(data: bytes) -> list[bytes]:
        return [line for line in data.splitlines() if not line.startswith(prefixes)]
    return normalized(old) == normalized(new)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, required=True, help='Clone root containing data/')
    parser.add_argument('--source-ref', required=True)
    parser.add_argument('--baseline-file', type=Path, required=True)
    parser.add_argument('--baseline-ref', required=True)
    parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parents[1] / 'rules/AICustom.list')
    parser.add_argument('--check', action='store_true', help='Return 1 if output differs; do not write')
    args = parser.parse_args(argv)
    try:
        rendered = generate(args.source_dir, args.source_ref, args.baseline_file, args.baseline_ref).encode()
        old = args.output.read_bytes() if args.output.exists() else None
        if equivalent_output(old, rendered):
            print(f'Unchanged: {args.output}')
            return 0
        if args.check:
            print(f'Out of date: {args.output}')
            return 1
        args.output.parent.mkdir(parents=True, exist_ok=True)
        fd, temporary = tempfile.mkstemp(prefix='.' + args.output.name + '.', dir=args.output.parent)
        try:
            with os.fdopen(fd, 'wb') as stream:
                stream.write(rendered)
                stream.flush()
                os.fsync(stream.fileno())
            os.chmod(temporary, args.output.stat().st_mode & 0o777 if args.output.exists() else 0o644)
            os.replace(temporary, args.output)
            print(f'Updated: {args.output}')
        finally:
            if os.path.exists(temporary):
                os.unlink(temporary)
        return 0
    except (OSError, UnicodeError, InputError) as exc:
        print(f'sync_ai_rules: {exc}', file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())

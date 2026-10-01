#!/usr/bin/env python3
"""Generate the homepage-following Shadowrocket profile from the main profile."""

import argparse
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "configs/lazy_group_by_jaychou.conf"
TARGET = ROOT / "configs/lazy_group_proxy_by_jaychou.conf"
HEADER = (
    "# 小火箭·跟随首页版\n"
    "# 保留服务策略组和原默认直连分流；代理流量跟随首页选中的节点。\n\n"
)
NODE_GROUPS = {"代理", "所有节点手动", "AI手动", "香港手动", "未送中fallback"}
BUILTINS = {"PROXY", "DIRECT", "REJECT", "REJECT-DROP", "REJECT-TINYGIF"}


def section_spans(source):
    markers = list(re.finditer(r"^\[([^]\r\n]+)\][ \t]*\r?$", source, re.MULTILINE))
    spans = {}
    for index, marker in enumerate(markers):
        name = marker.group(1).lower()
        if name in spans:
            raise ValueError(f"Duplicate section: {name}")
        spans[name] = (marker.start(), markers[index + 1].start() if index + 1 < len(markers) else len(source))
    for required in ("proxy group", "rule"):
        if required not in spans:
            raise ValueError(f"Missing section: {required}")
    return spans


def rule_policy(line):
    """Locate the policy without dropping trailing options such as no-resolve."""
    if not line.strip() or line.lstrip().startswith(("#", ";")):
        return None
    fields = line.split(",")
    kind = fields[0].strip().upper()
    if kind in {"AND", "OR", "NOT"}:
        raise ValueError(f"Composite rules require explicit support: {line}")
    index = 1 if kind in {"FINAL", "MATCH"} else 2
    if len(fields) <= index or not fields[index].strip():
        raise ValueError(f"Missing rule policy: {line}")
    return fields, index


def generate(source):
    source = source.replace("\r\n", "\n")
    spans = section_spans(source)
    group_start, group_end = spans["proxy group"]
    rule_start, rule_end = spans["rule"]
    groups = {}
    for line in source[group_start:group_end].splitlines()[1:]:
        if not line.strip() or line.lstrip().startswith(("#", ";")):
            continue
        name, separator, value = line.partition("=")
        name = name.strip()
        if not separator or not name or name in groups:
            raise ValueError(f"Invalid or duplicate proxy group: {line}")
        groups[name] = [field.strip() for field in value.split(",")]

    def default_route(policy, seen=()):
        if policy in {"DIRECT", "PROXY"}:
            return policy
        if policy in BUILTINS:
            raise ValueError(f"Cannot simplify a group whose default is {policy}")
        if policy not in groups:
            return "PROXY"  # A concrete node becomes the homepage-selected node.
        if policy in seen:
            raise ValueError(f"Cyclic default selection: {' -> '.join((*seen, policy))}")
        fields = groups[policy]
        if fields[0].lower() != "select":
            return "PROXY"
        options = dict(field.split("=", 1) for field in fields[1:] if "=" in field)
        candidates = [field for field in fields[1:] if field and "=" not in field]
        if "policy-select-name" in options:
            selected = options["policy-select-name"]
            if selected not in candidates and not options.get("policy-regex-filter"):
                raise ValueError(f"Default policy is not a member of group {policy}: {selected}")
        elif candidates:
            index = int(options.get("select", "0"))
            if not 0 <= index < len(candidates):
                raise ValueError(f"Invalid default index for group {policy}: {index}")
            selected = candidates[index]
        else:
            return "PROXY"  # Regex-based node groups have no explicit node list.
        return default_route(selected, (*seen, policy))

    rule_lines = source[rule_start:rule_end].splitlines()
    referenced = set()
    for line in rule_lines[1:]:
        parsed = rule_policy(line)
        if parsed:
            fields, index = parsed
            referenced.add(fields[index].strip())
    retained = [name for name in groups if name in referenced and name not in NODE_GROUPS]
    if not retained:
        raise ValueError("No service groups referenced by rules")

    generated_groups = ["[Proxy Group]"]
    for name in retained:
        default = default_route(name)
        choices = "DIRECT,PROXY" if default == "DIRECT" else "PROXY,DIRECT"
        generated_groups.append(f"{name} = select,{choices},policy-select-name={default}")

    generated_rules = [rule_lines[0]]
    for line in rule_lines[1:]:
        parsed = rule_policy(line)
        if parsed:
            fields, index = parsed
            policy = fields[index].strip()
            if policy not in retained and policy not in BUILTINS:
                fields[index] = default_route(policy)
                line = ",".join(fields)
        generated_rules.append(line)

    replacements = [
        (group_start, group_end, "\n".join(generated_groups) + "\n\n"),
        (rule_start, rule_end, "\n".join(generated_rules) + "\n"),
    ]
    for start, end, replacement in sorted(replacements, reverse=True):
        source = source[:start] + replacement + source[end:]
    return HEADER + source


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Fail if the derived profile is out of date")
    args = parser.parse_args()
    try:
        content = generate(SOURCE.read_text(encoding="utf-8"))
    except ValueError as error:
        parser.exit(1, f"Cannot generate profile: {error}\n")
    current = TARGET.read_text(encoding="utf-8") if TARGET.exists() else None
    if current == content:
        print("Homepage-following profile is up to date.")
        return
    if args.check:
        parser.exit(1, "Homepage-following profile is out of date. Run scripts/sync_shadowrocket.py.\n")
    temporary = TARGET.with_suffix(".conf.tmp")
    temporary.write_text(content, encoding="utf-8")
    temporary.replace(TARGET)
    print(f"Updated {TARGET.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

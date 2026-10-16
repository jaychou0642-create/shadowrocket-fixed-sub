# Supplemental AI rules

`rules/AICustom.list` is generated from
[`v2fly/domain-list-community/data/category-ai-!cn`](https://github.com/v2fly/domain-list-community/blob/master/data/category-ai-!cn).
It supplements the separately referenced
[`iab0x00/ProxyRules/Rule/AI.txt`](https://github.com/iab0x00/ProxyRules/blob/main/Rule/AI.txt).
The existing rule-set URLs and policy assignments remain usable.

## Automatic updates

The **Sync supplemental AI rules** GitHub Actions workflow runs daily at
**06:17 Asia/Shanghai** (22:17 UTC the previous day). It also supports **Run
workflow**, and runs when its generator, tests, or workflow change on `main`.
Pull requests run the offline tests without publishing.

Each run reads a complete checkout of v2fly's `master` branch and ProxyRules'
`main` branch, matching the referenced rule URLs, and records the exact commits
used. It recursively expands v2fly includes, converts their rule
types, and removes rules already covered by the current `AI.txt`. It then checks
the generated output and commits only `rules/AICustom.list` when that file has
changed. Repeating a run against identical input content does not change its
timestamp or create another commit.

Downloads, parsing and tests must succeed before publishing. An unknown rule
type, unsupported regular expression, missing include or include cycle fails the
run; the published file is retained. Changes to domain matching semantics must
be handled explicitly in the generator and its tests. The existing ChatGPT Azure
regular expression has an explicitly documented wildcard conversion; its
numeric component is not enforced by that wildcard.

The workflow shares a publishing concurrency group with the existing profile
generator and retries normal pushes if `main` advances. It never force-pushes.
No subscription URLs, node credentials or local Shadowrocket data are needed.

GitHub schedules may run late. In public repositories, GitHub automatically
disables scheduled workflows after 60 days without repository activity; check
the Actions page and re-enable the workflow if that happens. See
[GitHub schedule documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

## Local regeneration

Use checkouts of the two public upstream repositories:

```sh
python3 scripts/sync_ai_rules.py \
  --source-dir /path/to/domain-list-community \
  --source-ref "$(git -C /path/to/domain-list-community rev-parse HEAD)" \
  --baseline-file /path/to/ProxyRules/Rule/AI.txt \
  --baseline-ref "$(git -C /path/to/ProxyRules rev-parse HEAD)"
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests
```

Add `--check` to verify that the output matches without changing it, or
`--output /path/to/preview.list` to inspect a separate generated file. The
generator uses Python's standard library and the supplied local inputs; it does
not install packages or fetch remote data.

Do not edit the generated file by hand: regeneration replaces its contents.
To roll back an update, revert its rule-file commit and pause the workflow until
the upstream or converter issue is corrected.

## Client refresh

Publishing an updated file does not replace a running client's cached rules.
Shadowrocket must fetch the rule-set URL again before using the new content.
Client refresh settings are separate from this repository workflow. This
automation does not switch nodes, refresh subscriptions or edit local settings.

import unittest

from scripts.sync_shadowrocket import generate


def profile(groups, rules):
    return (
        "[General]\ndns-server = system\nipv6 = true\n\n"
        f"[Proxy Group]\n{groups}\n\n[Rule]\n{rules}\n\n"
        "[Host]\nlocalhost = 127.0.0.1\n\n[MITM]\nenable = false\n"
    )


class SyncShadowrocketTests(unittest.TestCase):
    def test_service_defaults_and_node_groups(self):
        source = profile(
            "代理 = select,PROXY,所有节点手动,select=0\n"
            "所有节点手动 = select,Node A,Node B\n"
            "AI = select,代理,DIRECT,policy-select-name=代理\n"
            "苹果服务 = select,代理,DIRECT,policy-select-name=DIRECT",
            "DOMAIN-SUFFIX,ai.example,AI\nDOMAIN-SUFFIX,apple.example,苹果服务\n"
            "DOMAIN-SUFFIX,bank.example,DIRECT\nFINAL,代理",
        )
        result = generate(source)
        self.assertIn("AI = select,PROXY,DIRECT,policy-select-name=PROXY", result)
        self.assertIn("苹果服务 = select,DIRECT,PROXY,policy-select-name=DIRECT", result)
        self.assertIn("DOMAIN-SUFFIX,bank.example,DIRECT\nFINAL,PROXY", result)
        self.assertNotIn("所有节点手动", result)
        self.assertNotIn("代理 =", result)
        self.assertIn("[General]\ndns-server = system\nipv6 = true\n\n", result)
        self.assertIn("[Host]\nlocalhost = 127.0.0.1\n\n[MITM]\nenable = false\n", result)

    def test_added_services_removed_services_and_rule_options(self):
        result = generate(profile(
            "Old = select,PROXY\nNew = select,PROXY,DIRECT\nDomestic = select,PROXY,DIRECT,select=1",
            "# Keep this comment\nRULE-SET,https://example.com/new.list,New\n"
            "IP-CIDR,10.0.0.0/8,Domestic,no-resolve\nFINAL,PROXY",
        ))
        self.assertNotIn("Old =", result)
        self.assertIn("New = select,PROXY,DIRECT,policy-select-name=PROXY", result)
        self.assertIn("Domestic = select,DIRECT,PROXY,policy-select-name=DIRECT", result)
        self.assertIn("# Keep this comment\nRULE-SET,https://example.com/new.list,New", result)
        self.assertIn("IP-CIDR,10.0.0.0/8,Domestic,no-resolve", result)

    def test_indirect_direct_default_and_concrete_node_rules(self):
        result = generate(profile(
            "Helper = select,DIRECT,PROXY\nService = select,Helper,PROXY\nAI = select,Node A,DIRECT",
            "DOMAIN,service.example,Service\nDOMAIN,ai.example,AI\nFINAL,Node B",
        ))
        self.assertIn("Service = select,DIRECT,PROXY,policy-select-name=DIRECT", result)
        self.assertNotIn("Helper =", result)
        self.assertIn("AI = select,PROXY,DIRECT,policy-select-name=PROXY", result)
        self.assertIn("FINAL,PROXY", result)

    def test_reject_rules_are_preserved(self):
        result = generate(profile("AI = select,PROXY", "DOMAIN,ad.example,REJECT\nFINAL,AI"))
        self.assertIn("DOMAIN,ad.example,REJECT", result)

    def test_regex_selected_subscription_node_becomes_proxy(self):
        result = generate(profile(
            "所有节点手动 = select,policy-regex-filter=.*,policy-select-name=🇸🇬新加坡专线04|BGP|流媒体\n"
            "Telegram = select,所有节点手动,DIRECT,policy-select-name=所有节点手动",
            "FINAL,Telegram",
        ))
        self.assertIn("Telegram = select,PROXY,DIRECT,policy-select-name=PROXY", result)
        self.assertNotIn("新加坡", result)

    def test_cycle_invalid_default_and_composite_rules_fail(self):
        fixtures = [
            profile("AI = select,Helper\nHelper = select,AI", "FINAL,AI"),
            profile("AI = select,PROXY,policy-select-name=Missing", "FINAL,AI"),
            profile("AI = select,PROXY,DIRECT,select=4", "FINAL,AI"),
            profile("AI = select,PROXY", "AND,((DOMAIN,a.example),(DOMAIN,b.example)),AI"),
        ]
        for source in fixtures:
            with self.subTest(source=source), self.assertRaises(ValueError):
                generate(source)


if __name__ == "__main__":
    unittest.main()

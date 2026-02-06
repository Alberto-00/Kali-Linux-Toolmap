/**
 * Sidebar Constants & Shared Helpers
 * Timing values, CSS selectors/classes, taxonomy data, formatLabel
 */
(function () {
    'use strict';

    const TIMINGS = {
        hoverDelay: 280,
        transitionEnd: 260,
        paneActivation: 40,
        searchApply: 50,
        autoGrowInitial: 0,
        autoGrowShort: 100,
        autoGrowMedium: 220,
        autoGrowLong: 300,
        autoGrowVeryLong: 600,
        animationTracking: 500,
        hoverSetup: 150
    };

    const SELECTORS = {
        pathNodes: '.folder-leaf, .leaf, .section-title',
        containers: '.children, .children-nested',
        activeNodes: '.folder-leaf.active, .leaf.active, .section-title.active',
        searchHit: '.folder-leaf.search-hit, .leaf.search-hit',
        searchIntermediate: '.folder-leaf.search-path-intermediate, .leaf.search-path-intermediate'
    };

    const CLASSES = {
        active: 'active',
        inActivePath: 'in-active-path',
        hasActivePath: 'has-active-path',
        searchMode: 'search-mode',
        searchHit: 'search-hit',
        searchIntermediate: 'search-path-intermediate',
        open: 'open',
        collapsed: 'collapsed'
    };

    const QueryHelpers = {
        clearActive: (container) => {
            container.querySelectorAll(SELECTORS.activeNodes)
                .forEach(n => n.classList.remove(CLASSES.active));
        },
        clearSearchMarks: (container) => {
            container.querySelectorAll(SELECTORS.searchHit)
                .forEach(el => el.classList.remove(CLASSES.searchHit));
            container.querySelectorAll(SELECTORS.searchIntermediate)
                .forEach(el => el.classList.remove(CLASSES.searchIntermediate));
        }
    };

    const taxonomy = {
        "00_Common": {
            "Metasploit_Plugins": {},
            "Network": {},
            "Scripts": {},
            "Tools_Windows": {},
            "Wordlists": {}
        },
        "01_Information_Gathering": {
            "OSINT": {
                "People_Search": {},
                "Social_Media": {},
                "Email_Harvesting": {},
                "Domain_Intelligence": {}
            },
            "Recon": {
                "Infrastructure": {
                    "DNS_Subdomains": {},
                    "Port_Scanning": {},
                    "Service_Fingerprinting": {}
                },
                "Web": {
                    "Content_Discovery": {},
                    "Fingerprinting": {
                        "HTTP_Analysis": {},
                        "Visual_Recon": {},
                        "WAF": {}
                    },
                    "Params_Discovery": {}
                }
            },
            "Enumeration": {
                "Infrastructure": {
                    "SMTP": {},
                    "VoIP": {},
                    "Porta_113": {},
                    "SMB": {},
                    "SNMP": {},
                    "LDAP_AD": {},
                    "Database": {}
                },
                "Web": {
                    "API": {},
                    "CMS": {
                        "General": {},
                        "Joomla": {}
                    },
                    "Crawling": {
                        "Active": {}
                    }
                }
            },
            "Vulnerability_Scanning": {},
            "Network_Sniffing": {},
            "Social_Engineering": {}
        },
        "02_Exploitation": {
            "General": {},
            "Crypto": {},
            "Infrastructure": {
                "RTSP": {},
                "Database": {},
                "Network": {},
                "SSL_TLS": {}
            },
            "Web": {
                "CMS_Exploits": {
                    "Drupal": {},
                    "Joomla": {},
                    "WordPress": {}
                },
                "File_Upload": {},
                "Injection": {
                    "LFI": {},
                    "SQLi": {},
                    "XSS": {},
                    "XXE": {},
                    "Command_Injection": {},
                    "CSRF": {},
                    "SSTI": {}
                },
                "Deserialization": {},
                "JBoss_&_WildFly": {},
                "Proxy_MITM": {},
                "SSRF": {},
                "Next_js": {},
                "Tomcat": {}
            },
            "Wireless": {
                "WiFi": {},
                "Bluetooth": {},
                "RFID_NFC": {}
            }
        },
        "03_Post_Exploitation": {
            "AD_Windows": {
                "Credential_Dump": {},
                "Kerberos_ADCS_Relay": {},
                "Lateral_Movement": {},
                "Recon_Health": {},
                "Toolkits": {}
            },
            "Credentials": {
                "Dumping": {},
                "Cracking": {},
                "Brute_Force": {},
                "Spraying": {}
            },
            "Persistence": {},
            "Pivoting": {},
            "Privilege_Escalation": {
                "Linux": {},
                "Windows": {},
                "Multi_Platform": {}
            },
            "Reverse_Engineering": {}
        },
        "04_Red_Team": {
            "C2_Frameworks": {},
            "Evasion": {},
            "Payload_Generation": {},
        },
        "05_Forensics": {
            "Disk_Analysis": {},
            "Memory_Analysis": {},
            "Network_Forensics": {},
            "File_Carving": {},
            "Malware_Analysis": {}
        },
        "06_Miscellaneous": {
            "AI_MCP": {},
            "Utilities": {}
        }
    };

    const formatLabel = (text) => String(text).replace(/_/g, " ").replace(/^\d+_/, "");

    const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
    const hasChildrenNode = (n) => isObject(n) && Object.keys(n).length > 0;
    const isNodeVisible = (el) => !!(el && el.offsetParent !== null);

    function splitPath(slashPath) {
        if (!slashPath || typeof slashPath !== 'string') return [];
        return slashPath.split('/').filter(Boolean);
    }

    function getPhaseFromPath(slashPath) {
        if (!slashPath || typeof slashPath !== 'string') return null;
        return slashPath.split('/')[0] || null;
    }

    function getNodeByPath(obj, path) {
        return path.split('/').reduce((acc, k) => (acc && acc[k] != null ? acc[k] : undefined), obj);
    }

    function isSearchMode() {
        const sb = document.getElementById('sidebar');
        return !!(sb && sb.classList.contains(CLASSES.searchMode));
    }

    function phaseToColor(phase) {
        return window.TOOLMAP_CONSTANTS.PHASE_COLORS[phase] || 'hsl(var(--accent))';
    }

    function forceReflow(element) {
        if (!element || !element.offsetHeight) return;
        void element.offsetHeight;
    }

    window.SidebarConstants = {
        TIMINGS,
        SELECTORS,
        CLASSES,
        QueryHelpers,
        taxonomy,
        formatLabel,
        isObject,
        hasChildrenNode,
        isNodeVisible,
        splitPath,
        getPhaseFromPath,
        getNodeByPath,
        isSearchMode,
        phaseToColor,
        forceReflow
    };

    // Expose taxonomy globally (used by other parts of the app)
    window.taxonomy = taxonomy;
})();

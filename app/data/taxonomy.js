const taxonomy = {
    "00_Common": {
        "Metasploit_Plugins": {},
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
            "DNS_Subdomains": {},
            "Port_Scanning": {},
            "Service_Fingerprinting": {},
            "Web": {
                "Content_Discovery": {},
                "Fingerprinting": {
                    "Visual_Recon": {},
                    "WAF": {}
                },
                "Params_Discovery": {}
            }
        },
        "Enumeration": {
            "SMB": {},
            "SNMP": {},
            "LDAP_AD": {},
            "Database": {},
            "Web": {
                "API": {},
                "CMS": {
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
        "Infrastructure": {
            "RTSP": {},
            "Database": {}
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
                "XXE": {}
            },
            "Deserialization": {},
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
            "Recon_Health": {}
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
            "Windows": {}
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
    "06_Miscellaneous": {}
};
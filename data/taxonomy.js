const taxonomy = {
    "00_Common": {
        "Metasploit_Plugins": {},
        "Scripts": {},
        "Tools_Windows": {},
        "Wordlists": {}
    },
    "01_Information_Gathering": {
        "01_Recon": {
            "Infrastructure": {
                "DNS_Subdomains": {}
            },
            "Web": {
                "Content_Discovery": {},
                "Fingerprinting": {
                    "Visual_Recon": {},
                    "WAF": {}
                },
                "Params_Discovery": {}
            }
        },
        "02_Enumeration": {
            "Infrastructure": {
                "SMB": {}
            },
            "Web": {
                "API": {},
                "CMS": {
                    "Joomla": {}
                },
                "Crawling": {
                    "Active": {}
                }
            }
        }
    },
    "02_Exploitation": {
        "General": {},
        "Infrastructure": {
            "RTSP": {}
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
                "XSS": {},
                "XXE": {}
            },
            "Next_js": {},
            "Tomcat": {}
        }
    },
    "03_Post_Exploitation": {
        "AD_Windows": {
            "Kerberos_ADCS_Relay": {},
            "Recon_Health": {}
        },
        "Credentials": {
            "Credentials_Hunting": {},
            "Passwords_Cracking": {}
        },
        "Evasion": {},
        "Pivoting": {},
        "Privilege_Escalation": {
            "Linux": {}
        },
        "Reverse_Engineering": {}
    },
    "04_Miscellaneous": {}
};

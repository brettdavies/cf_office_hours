#!/usr/bin/env python3
"""
Anonymize PII in mentors.csv file.
- Replaces Full Name column with diverse names from US, Mexico, China, and India
- Replaces person's name in Bio with their new anonymized name
- Removes identifying information from Bio column (companies, websites, capitalized entities)
- Preserves honorifics in names
- Leaves Industry Expertise and Technology Expertise columns unchanged
"""

import csv
import re
import random

# Diverse name pools from different regions
HONORIFICS = ['Dr.', 'Prof.', 'Mr.', 'Ms.', 'Mrs.']

FIRST_NAMES = {
    'us': ['Michael', 'Jennifer', 'Robert', 'Sarah', 'David', 'Lisa', 'James', 'Emily', 'John', 'Amanda'],
    'mexico': ['Carlos', 'María', 'José', 'Gabriela', 'Luis', 'Ana', 'Miguel', 'Sofía', 'Diego', 'Isabella'],
    'china': ['Wei', 'Li', 'Ming', 'Yan', 'Chen', 'Hua', 'Jun', 'Xin', 'Jian', 'Mei'],
    'india': ['Raj', 'Priya', 'Amit', 'Anjali', 'Arjun', 'Kavya', 'Rohan', 'Neha', 'Vikram', 'Sanya']
}

LAST_NAMES = {
    'us': ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Martinez', 'Rodriguez'],
    'mexico': ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres'],
    'china': ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou'],
    'india': ['Sharma', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Gupta', 'Mehta', 'Rao', 'Iyer', 'Nair']
}

def generate_random_name(used_names):
    """Generate a random name from diverse regions, avoiding duplicates."""
    max_attempts = 1000
    for _ in range(max_attempts):
        region = random.choice(list(FIRST_NAMES.keys()))
        first = random.choice(FIRST_NAMES[region])
        last = random.choice(LAST_NAMES[region])
        full_name = f"{first} {last}"

        if full_name not in used_names:
            used_names.add(full_name)
            return first, last, full_name

    # Fallback if we somehow exhaust combinations
    fallback = f"Person {len(used_names) + 1}"
    return fallback, "", fallback

def extract_honorific(name):
    """Extract honorific from name if present."""
    name = name.strip()
    for honorific in HONORIFICS:
        if name.startswith(honorific):
            return honorific, name[len(honorific):].strip()
    return None, name

def anonymize_bio(bio, original_name, new_first_name, new_last_name, new_full_name):
    """Remove identifying information from bio text."""
    if not bio:
        return bio

    text = bio

    # First, replace the person's actual name with their new anonymized name
    # Remove honorific for matching purposes
    _, name_without_honorific = extract_honorific(original_name)

    # Split into first and last name parts
    name_parts = name_without_honorific.split()

    if len(name_parts) >= 2:
        first_name = name_parts[0]
        last_name = ' '.join(name_parts[1:])  # Handle multi-part last names

        # Replace full name
        text = re.sub(r'\b' + re.escape(name_without_honorific) + r'\b', new_full_name, text, flags=re.IGNORECASE)

        # Replace first name occurrences
        text = re.sub(r'\b' + re.escape(first_name) + r'\b', new_first_name, text, flags=re.IGNORECASE)

        # Replace last name occurrences
        text = re.sub(r'\b' + re.escape(last_name) + r'\b', new_last_name, text, flags=re.IGNORECASE)
    elif len(name_parts) == 1:
        # Single name
        text = re.sub(r'\b' + re.escape(name_parts[0]) + r'\b', new_full_name, text, flags=re.IGNORECASE)

    # First, replace known specific companies/products/institutions
    known_entities = {
        # Tech companies
        'Google': '[Technology Company]', 'Facebook': '[Technology Company]', 'Meta': '[Technology Company]',
        'Amazon': '[Technology Company]', 'Microsoft': '[Technology Company]', 'Apple': '[Technology Company]',
        'Netflix': '[Technology Company]', 'Tesla': '[Technology Company]', 'IBM': '[Technology Company]',
        'Oracle': '[Technology Company]', 'Salesforce': '[Technology Company]', 'Adobe': '[Technology Company]',
        'Intel': '[Technology Company]', 'NVIDIA': '[Technology Company]', 'Cisco': '[Technology Company]',
        'Twitter': '[Technology Company]', 'LinkedIn': '[Technology Company]', 'Uber': '[Technology Company]',
        'Lyft': '[Technology Company]', 'Airbnb': '[Technology Company]', 'Stripe': '[Technology Company]',
        'PayPal': '[Technology Company]', 'Square': '[Technology Company]', 'Snapchat': '[Technology Company]',
        'Pinterest': '[Technology Company]', 'Reddit': '[Technology Company]', 'Zoom': '[Technology Company]',
        'Slack': '[Technology Company]', 'Dropbox': '[Technology Company]', 'Box': '[Technology Company]',
        'Spotify': '[Technology Company]', 'Shopify': '[Technology Company]', 'Atlassian': '[Technology Company]',
        'ServiceNow': '[Technology Company]', 'Workday': '[Technology Company]', 'Zendesk': '[Technology Company]',
        'HubSpot': '[Technology Company]', 'Twilio': '[Technology Company]', 'Okta': '[Technology Company]',
        'Splunk': '[Technology Company]', 'Datadog': '[Technology Company]', 'Snowflake': '[Technology Company]',
        'Palantir': '[Technology Company]', 'Cloudflare': '[Technology Company]', 'MongoDB': '[Technology Company]',
        'Elastic': '[Technology Company]', 'Confluent': '[Technology Company]', 'HashiCorp': '[Technology Company]',
        'GitLab': '[Technology Company]', 'GitHub': '[Technology Company]', 'Bitbucket': '[Technology Company]',
        'Jira': '[Technology Company]', 'Confluence': '[Technology Company]', 'Asana': '[Technology Company]',
        'Monday': '[Technology Company]', 'Notion': '[Technology Company]', 'Airtable': '[Technology Company]',
        'Figma': '[Technology Company]', 'Canva': '[Technology Company]', 'Miro': '[Technology Company]',
        'Tableau': '[Technology Company]', 'Looker': '[Technology Company]', 'Domo': '[Technology Company]',
        'Qlik': '[Technology Company]', 'MicroStrategy': '[Technology Company]', 'SAS': '[Technology Company]',
        'Splunk': '[Technology Company]', 'New Relic': '[Technology Company]', 'AppDynamics': '[Technology Company]',
        'PagerDuty': '[Technology Company]', 'Opsgenie': '[Technology Company]', 'VictorOps': '[Technology Company]',
        'Docker': '[Technology Company]', 'Kubernetes': '[Technology Company]', 'Jenkins': '[Technology Company]',
        'CircleCI': '[Technology Company]', 'Travis': '[Technology Company]', 'Harness': '[Technology Company]',
        'LaunchDarkly': '[Technology Company]', 'Optimizely': '[Technology Company]', 'Amplitude': '[Technology Company]',
        'Mixpanel': '[Technology Company]', 'Segment': '[Technology Company]', 'Heap': '[Technology Company]',
        'FullStory': '[Technology Company]', 'LogRocket': '[Technology Company]', 'Sentry': '[Technology Company]',
        'Rollbar': '[Technology Company]', 'Bugsnag': '[Technology Company]', 'Honeybadger': '[Technology Company]',
        'Nielsen': '[Technology Company]', 'Gartner': '[Technology Company]', 'Forrester': '[Technology Company]',
        'VMware': '[Technology Company]', 'Dell': '[Technology Company]', 'HP': '[Technology Company]',
        'Lenovo': '[Technology Company]', 'Asus': '[Technology Company]', 'Acer': '[Technology Company]',
        'Samsung': '[Technology Company]', 'LG': '[Technology Company]', 'Sony': '[Technology Company]',
        'Panasonic': '[Technology Company]', 'Toshiba': '[Technology Company]', 'Hitachi': '[Technology Company]',
        'Fujitsu': '[Technology Company]', 'NEC': '[Technology Company]', 'Sharp': '[Technology Company]',
        'Motorola': '[Technology Company]', 'Nokia': '[Technology Company]', 'Ericsson': '[Technology Company]',
        'Alcatel': '[Technology Company]', 'Huawei': '[Technology Company]', 'ZTE': '[Technology Company]',
        'Xiaomi': '[Technology Company]', 'Oppo': '[Technology Company]', 'Vivo': '[Technology Company]',
        'OnePlus': '[Technology Company]', 'Realme': '[Technology Company]', 'Meizu': '[Technology Company]',
        'Everfest': '[Technology Company]', 'uShip': '[Technology Company]', 'Matterport': '[Technology Company]',
        'WastePlace': '[Technology Company]', 'ModuleMD': '[Technology Company]', 'CustomInk': '[Technology Company]',
        'BuyWithMe': '[Technology Company]', 'FamilyID': '[Technology Company]', 'WeWork': '[Technology Company]',
        'OpenDoor': '[Technology Company]', 'HotelTonight': '[Technology Company]', 'GoFundMe': '[Technology Company]',
        'CrowdStrike': '[Technology Company]', 'AppZen': '[Technology Company]', 'MapMyFitness': '[Technology Company]',
        'MapMyRun': '[Technology Company]', 'SunGard': '[Technology Company]', 'OrderMyGear': '[Technology Company]',
        'ProsperOps': '[Technology Company]', 'RedBumper': '[Technology Company]', 'FeedMagnet': '[Technology Company]',
        'EdSight': '[Technology Company]', 'ZeroBlock': '[Technology Company]', 'WestExec': '[Technology Company]',
        'NovaCentrix': '[Technology Company]', 'MachineCore': '[Technology Company]', 'BuildGroup': '[Technology Company]',
        'BreakingPoint': '[Technology Company]', 'ThermoAI': '[Technology Company]', 'SuperData': '[Technology Company]',
        'Seeoloz': '[Technology Company]', 'NXP': '[Technology Company]',

        # Financial institutions
        'Goldman Sachs': '[Financial Institution]', 'Morgan Stanley': '[Financial Institution]',
        'JPMorgan': '[Financial Institution]', 'Citigroup': '[Financial Institution]',
        'Bank of America': '[Financial Institution]', 'Wells Fargo': '[Financial Institution]',
        'Credit Suisse': '[Financial Institution]', 'Deutsche Bank': '[Financial Institution]',
        'Barclays': '[Financial Institution]', 'HSBC': '[Financial Institution]',
        'UBS': '[Financial Institution]', 'Citi': '[Financial Institution]',
        'Chase': '[Financial Institution]', 'Fidelity': '[Financial Institution]',
        'Vanguard': '[Financial Institution]', 'BlackRock': '[Financial Institution]',
        'State Street': '[Financial Institution]', 'Charles Schwab': '[Financial Institution]',
        'TD Ameritrade': '[Financial Institution]', 'E-Trade': '[Financial Institution]',
        'Robinhood': '[Financial Institution]', 'Coinbase': '[Financial Institution]',
        'Kraken': '[Financial Institution]', 'Gemini': '[Financial Institution]',
        'Binance': '[Financial Institution]', 'Bitfinex': '[Financial Institution]',

        # Consulting firms
        'McKinsey': '[Consulting Firm]', 'BCG': '[Consulting Firm]',
        'Bain': '[Consulting Firm]', 'Deloitte': '[Consulting Firm]',
        'PwC': '[Consulting Firm]', 'KPMG': '[Consulting Firm]',
        'EY': '[Consulting Firm]', 'Accenture': '[Consulting Firm]',
        'Booz Allen': '[Consulting Firm]', 'Oliver Wyman': '[Consulting Firm]',
        'AT Kearney': '[Consulting Firm]', 'Roland Berger': '[Consulting Firm]',

        # Insurance companies
        'Aflac': '[Insurance Company]', 'Allstate': '[Insurance Company]',
        'State Farm': '[Insurance Company]', 'Geico': '[Insurance Company]',
        'Progressive': '[Insurance Company]', 'Farmers': '[Insurance Company]',
        'Liberty Mutual': '[Insurance Company]', 'Travelers': '[Insurance Company]',
        'Nationwide': '[Insurance Company]', 'USAA': '[Insurance Company]',
        'MetLife': '[Insurance Company]', 'Prudential': '[Insurance Company]',
        'AIG': '[Insurance Company]', 'Chubb': '[Insurance Company]',
    }

    # Replace known entities (case-insensitive)
    for entity, replacement in known_entities.items():
        pattern = re.compile(r'\b' + re.escape(entity) + r'\b', re.IGNORECASE)
        text = pattern.sub(replacement, text)

    # Replace specific company/product names using regex patterns
    # Match CamelCase words (likely company/product names)
    camel_case_pattern = r'\b[A-Z][a-z]+[A-Z][a-z]*(?:[A-Z][a-z]*)*\b'

    def replace_camel_case(match):
        entity = match.group(0)
        # Keep common abbreviations
        if entity in {'PhD', 'MBA', 'CTO', 'CEO', 'CFO'}:
            return entity
        # Don't replace if it's part of our placeholder text
        if entity in {'Technology', 'Company', 'Financial', 'Institution', 'Consulting',
                     'Firm', 'Insurance', 'Investment', 'Network', 'University'}:
            return entity
        return '[Technology Company]'

    text = re.sub(camel_case_pattern, replace_camel_case, text)

    # Match all-caps acronyms (3+ letters, likely companies)
    acronym_pattern = r'\b[A-Z]{3,}\b'

    def replace_acronym(match):
        entity = match.group(0)
        # Keep common acronyms
        common_acronyms = {'MBA', 'PhD', 'CEO', 'CFO', 'CTO', 'COO', 'VP', 'SVP', 'EVP',
                          'CPA', 'CFA', 'JD', 'MD', 'RN', 'BS', 'BA', 'MS', 'MA',
                          'USA', 'NYC', 'IT', 'AI', 'ML', 'API', 'AWS', 'SaaS', 'BI',
                          'SEO', 'SQL', 'NoSQL', 'IoT', 'R&D', 'M&A', 'HR', 'PR',
                          'STEM', 'SBIR', 'STTR', 'NSF', 'CBM', 'ASA', 'MAAA', 'CRM',
                          'AUM', 'AVs', 'HVAC', 'DEC', 'HRTech', 'InsurTech', 'AgTech',
                          'MAU', 'FTE'}
        if entity in common_acronyms:
            return entity
        return '[Technology Company]'

    text = re.sub(acronym_pattern, replace_acronym, text)

    # Match multi-word capitalized phrases (e.g., "Rice University", "Goldman Sachs")
    multiword_pattern = r'\b(?:[A-Z][a-z]+\s+){1,4}(?:[A-Z][a-z]+|[A-Z]{2,})\b'

    def replace_multiword(match):
        entity = match.group(0)
        entity_lower = entity.lower()

        # Skip if it's just common words
        skip_patterns = [
            r'^(the|a|an|in|on|at|to|for|of|and|or|but)\s',
            r'\s(the|a|an|in|on|at|to|for|of|and|or|but)$'
        ]
        for pattern in skip_patterns:
            if re.search(pattern, entity_lower):
                return entity

        # Classify by type
        if any(word in entity_lower for word in ['university', 'college', 'school', 'institute']):
            return '[University]'
        if any(word in entity_lower for word in ['bank', 'financial', 'capital', 'ventures', 'partners', 'investment', 'fund', 'equity']):
            return '[Financial Institution]'
        if any(word in entity_lower for word in ['consulting', 'advisors', 'advisory']):
            return '[Consulting Firm]'
        if any(word in entity_lower for word in ['insurance', 'life']):
            return '[Insurance Company]'
        if 'angel' in entity_lower and 'network' in entity_lower:
            return '[Investment Network]'

        # Default to technology company
        return '[Technology Company]'

    text = re.sub(multiword_pattern, replace_multiword, text)

    # Replace URLs and websites
    text = re.sub(r'https?://[^\s,]+', '[website]', text)
    text = re.sub(r'www\.[^\s,]+', '[website]', text)

    # Replace email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[email]', text)

    # Replace phone numbers
    text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[phone]', text)
    text = re.sub(r'\(\d{3}\)\s*\d{3}[-.]?\d{4}', '[phone]', text)

    return text

def anonymize_csv(input_file, output_file):
    """Anonymize the mentors CSV file."""
    used_names = set()

    with open(input_file, 'r', encoding='utf-8-sig') as infile:
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames
        rows = []

        for row in reader:
            original_name = row.get('Full Name', '')

            # Generate new name
            honorific, name_without_honorific = extract_honorific(original_name)
            new_first, new_last, new_full = generate_random_name(used_names)

            # Apply honorific if present
            if honorific:
                new_name_with_honorific = f"{honorific} {new_full}"
            else:
                new_name_with_honorific = new_full

            # Update Full Name
            row['Full Name'] = new_name_with_honorific

            # Anonymize Bio
            if 'Bio' in row:
                row['Bio'] = anonymize_bio(row['Bio'], original_name, new_first, new_last, new_full)

            rows.append(row)

    # Write anonymized data
    with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"✓ Anonymized {len(rows)} records")
    print(f"✓ Generated {len(used_names)} unique names")
    print(f"✓ Output written to: {output_file}")

if __name__ == '__main__':
    input_file = 'mentors_orig.csv'
    output_file = 'mentors.csv'

    print("Starting anonymization...")
    anonymize_csv(input_file, output_file)
    print("Done!")

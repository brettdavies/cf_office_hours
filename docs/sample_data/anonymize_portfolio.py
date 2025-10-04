#!/usr/bin/env python3
"""
Anonymize portfolio_companies.csv
- Generate fun new company names (preserving Inc., LLC, etc.)
- Anonymize Description (remove company name, randomize dates, funding rounds, amounts, valuations)
- Remove newlines from Description
- Randomize Location, Stage, Sales Model (preserving distributions)
- Generate new Pitch and Website URLs from normalized names
"""

import csv
import re
import random
from collections import Counter

# Fun company name components
PREFIXES = [
    'Quantum', 'Stellar', 'Nexus', 'Apex', 'Vertex', 'Synergy', 'Fusion', 'Pinnacle',
    'Nova', 'Zenith', 'Prime', 'Atlas', 'Titan', 'Phoenix', 'Orion', 'Echo',
    'Pulse', 'Spark', 'Flux', 'Prism', 'Vortex', 'Ember', 'Horizon', 'Catalyst',
    'Lumina', 'Cipher', 'Matrix', 'Vector', 'Helix', 'Nexum', 'Axiom', 'Zenon'
]

SUFFIXES = [
    'Tech', 'Labs', 'Systems', 'Solutions', 'Dynamics', 'Works', 'Innovations',
    'Digital', 'Analytics', 'Networks', 'Platform', 'Data', 'Cloud', 'AI',
    'Robotics', 'Energy', 'Medical', 'Health', 'Finance', 'Security', 'Vision',
    'Media', 'Logic', 'Flow', 'Core', 'Hub', 'Link', 'Wave', 'Pulse', 'Sync'
]

STANDALONE_NAMES = [
    'Brightpath', 'Clearview', 'Swiftline', 'Truepoint', 'Mindshift', 'Skyward',
    'Groundwork', 'Firefly', 'Blueprint', 'Keystone', 'Milestone', 'Touchstone',
    'Cornerstone', 'Redwood', 'Bluestream', 'Greenfield', 'Whitespace', 'Blackstone',
    'Silverlake', 'Goldmine', 'Irongate', 'Steelbridge', 'Copperleaf', 'Platinum'
]

def generate_company_name(used_names):
    """Generate a unique company name."""
    max_attempts = 1000
    for _ in range(max_attempts):
        style = random.choice(['prefix_suffix', 'standalone'])

        if style == 'prefix_suffix':
            name = f"{random.choice(PREFIXES)} {random.choice(SUFFIXES)}"
        else:
            name = random.choice(STANDALONE_NAMES)

        if name not in used_names:
            used_names.add(name)
            return name

    # Fallback
    return f"Company {len(used_names) + 1}"

def preserve_suffix(original_name):
    """Extract Inc., LLC, etc. from original name."""
    suffixes = [r'\bInc\.?', r'\bLLC', r'\bLtd\.?', r'\bCorp\.?', r'\bCo\.?', r'\bGmbH', r'\bPLC']

    for suffix_pattern in suffixes:
        match = re.search(suffix_pattern, original_name, re.IGNORECASE)
        if match:
            return match.group(0)

    return None

def normalize_to_slug(name):
    """Convert name to URL slug (lowercase, no special chars, hyphens for spaces)."""
    # Remove Inc., LLC, etc.
    name = re.sub(r'\b(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?|GmbH|PLC)\b', '', name, flags=re.IGNORECASE)
    # Convert to lowercase
    slug = name.lower()
    # Remove special characters except spaces and hyphens
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    # Replace whitespace with hyphens
    slug = re.sub(r'\s+', '-', slug)
    # Remove multiple consecutive hyphens
    slug = re.sub(r'-+', '-', slug)
    # Strip leading/trailing hyphens
    slug = slug.strip('-')

    return slug

def randomize_amount(text):
    """Randomize dollar amounts by +/- 33%."""
    def replace_amount(match):
        amount_str = match.group(1).replace(',', '')
        suffix = match.group(2) if match.group(2) else ''

        try:
            amount = float(amount_str)

            # Handle existing suffix
            multiplier = 1
            if suffix.upper() == 'K':
                multiplier = 1_000
            elif suffix.upper() == 'M':
                multiplier = 1_000_000
            elif suffix.upper() == 'B':
                multiplier = 1_000_000_000
            elif suffix.upper() in ['T', 'TRILLION']:
                multiplier = 1_000_000_000_000

            amount = amount * multiplier

            # Randomize by +/- 33%
            factor = random.uniform(0.67, 1.33)
            new_amount = amount * factor

            # Format with appropriate suffix
            if new_amount >= 1_000_000_000_000:
                return f"${new_amount/1_000_000_000_000:.1f}T"
            elif new_amount >= 1_000_000_000:
                return f"${new_amount/1_000_000_000:.1f}B"
            elif new_amount >= 1_000_000:
                return f"${new_amount/1_000_000:.1f}M"
            elif new_amount >= 1_000:
                return f"${new_amount/1_000:.1f}K"
            else:
                return f"${new_amount:.0f}"
        except:
            return match.group(0)

    # Match dollar amounts with various formats
    text = re.sub(r'\$([0-9,]+(?:\.[0-9]+)?)\s*([BMKTbmkt]|[Mm]illion|[Bb]illion|[Tt]rillion)?', replace_amount, text, flags=re.IGNORECASE)

    return text

def randomize_dates(text):
    """Randomize years while keeping them plausible (2010-2025)."""
    def replace_year(match):
        year = int(match.group(0))
        if 2000 <= year <= 2025:
            # Randomize within a reasonable range
            min_year = max(2010, year-5)
            max_year = min(2025, year+5)
            # Ensure min_year <= max_year
            if min_year > max_year:
                min_year, max_year = max_year, min_year
            new_year = random.randint(min_year, max_year)
            return str(new_year)
        return match.group(0)

    text = re.sub(r'\b(20\d{2})\b', replace_year, text)

    return text

def randomize_funding_round(text):
    """Randomize funding rounds while keeping them plausible."""
    rounds = ['Angel', 'Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C']

    def replace_round(match):
        original = match.group(0)
        # Find current position in rounds
        for i, round_name in enumerate(rounds):
            if round_name.lower() in original.lower():
                # Pick a nearby round (+/- 1 position)
                new_index = max(0, min(len(rounds)-1, i + random.randint(-1, 1)))
                return rounds[new_index]
        return original

    text = re.sub(r'\b(Angel|Pre-Seed|Seed|Series [A-Z])\b', replace_round, text, flags=re.IGNORECASE)

    return text

def anonymize_description(description, original_name, new_name, new_website):
    """Anonymize the description field."""
    if not description:
        return description

    text = description

    # Remove newlines
    text = text.replace('\n', ' ').replace('\r', ' ')
    text = re.sub(r'\s+', ' ', text).strip()

    # Replace all URLs with the new website
    if new_website:
        text = re.sub(r'https?://[^\s,)\]]+', new_website, text)
        text = re.sub(r'www\.[^\s,)\]]+', new_website.replace('https://', ''), text)

    # Replace product names with special characters (e.g., "Cardi/o®", "Ai-Ris")
    # Find trademarked names
    text = re.sub(r'\b([A-Z][a-z]+)/([a-z])®', r'[Product]', text)

    # Replace company name mentions (handle variations)
    # Extract base name (without Inc., LLC, etc.)
    base_original = re.sub(r'\b(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?|GmbH|PLC)\b', '', original_name, flags=re.IGNORECASE).strip()
    base_new = re.sub(r'\b(Inc\.?|LLC|Ltd\.?|Corp\.?|Co\.?|GmbH|PLC)\b', '', new_name, flags=re.IGNORECASE).strip()

    # Replace full name
    text = re.sub(r'\b' + re.escape(original_name) + r'\b', new_name, text, flags=re.IGNORECASE)

    # Replace base name
    if base_original:
        text = re.sub(r'\b' + re.escape(base_original) + r'\b', base_new, text, flags=re.IGNORECASE)

    # Look for company/product names at the very beginning of description
    # Pattern: "At CompanyName," or "CompanyName is" at start
    beginning_patterns = [
        r'^At\s+([A-Z][a-z]+(?:-[A-Z][a-z]+)?),',  # "At Ai-Ris,"
        r'^([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\s+is\s+',  # "Ai-Ris is"
        r'^([A-Z][a-z]+(?:-[A-Z][a-z]+)?)\s+was\s+', # "Ai-Ris was"
    ]

    for pattern in beginning_patterns:
        match = re.search(pattern, text)
        if match:
            company_variant = match.group(1)
            # Replace this variant with base new name
            text = re.sub(r'\b' + re.escape(company_variant) + r'\b', base_new, text)

        # Try to find and replace abbreviations/acronyms
        # Create acronym from original name (e.g., "Advanced Bifurcation Systems" -> "ABS")
        # Handle names with numbers (e.g., "1 True Health" -> "1TH")
        words = base_original.split()
        if len(words) >= 2:
            # Try full acronym (include digits)
            acronym_parts = []
            for word in words:
                if word:
                    if word[0].isdigit():
                        acronym_parts.append(word[0])
                    elif word[0].isalpha():
                        acronym_parts.append(word[0].upper())

            acronym = ''.join(acronym_parts)

            if acronym and len(acronym) >= 2:
                # Create new acronym from new name
                new_words = base_new.split()
                new_acronym_parts = []
                for word in new_words:
                    if word:
                        if word[0].isdigit():
                            new_acronym_parts.append(word[0])
                        elif word[0].isalpha():
                            new_acronym_parts.append(word[0].upper())

                new_acronym = ''.join(new_acronym_parts)

                # Replace acronym in quotes or standalone
                text = re.sub(r'\b' + re.escape(acronym) + r'\b', new_acronym if new_acronym else base_new, text)
                text = re.sub(r'["""]' + re.escape(acronym) + r'["""]', f'"{new_acronym if new_acronym else base_new}"', text)

        # Also look for custom abbreviations in quotes at the start of the description
        # Pattern: Name variations in quotes near the beginning
        quote_pattern = r'["""]([A-Z0-9-]+)["""]'
        matches = re.findall(quote_pattern, text[:200])  # Check first 200 chars
        for match in matches:
            # If this looks like an abbreviation (all caps/numbers, reasonably short)
            if len(match) <= 10 and match.isupper():
                # Create a new abbreviation from new company name
                new_words = base_new.split()
                new_abbrev_parts = []
                for word in new_words:
                    if word and word[0].isalpha():
                        new_abbrev_parts.append(word[0].upper())
                new_abbrev = ''.join(new_abbrev_parts) if new_abbrev_parts else base_new[:3].upper()

                # Replace this abbreviation throughout
                text = re.sub(r'\b' + re.escape(match) + r'\b', new_abbrev, text)
                text = re.sub(r'["""]' + re.escape(match) + r'["""]', f'"{new_abbrev}"', text)

        # Also look for product names in quotes (e.g., "ORVis", "CodeWP")
        # Pattern: Quoted capitalized words/CamelCase
        product_quote_pattern = r'["""]([A-Z][a-zA-Z0-9/®™-]*)["""]'
        product_matches = re.findall(product_quote_pattern, text[:300])
        for match in product_matches:
            # Skip if it's already an abbreviation we processed
            if match.isupper() and len(match) <= 10:
                continue
            # Replace with [Product]
            text = re.sub(r'["""]' + re.escape(match) + r'["""]', '"[Product]"', text)

    # Replace proper nouns (product names, company names, etc.)
    # Look for capitalized words that aren't common words
    common_words = {
        'A', 'An', 'The', 'In', 'On', 'At', 'To', 'For', 'Of', 'And', 'Or', 'But', 'As',
        'By', 'With', 'From', 'About', 'Into', 'Through', 'During', 'Before', 'After',
        'Above', 'Below', 'Up', 'Down', 'Out', 'Off', 'Over', 'Under', 'Again', 'Further',
        'Then', 'Once', 'Here', 'There', 'When', 'Where', 'Why', 'How', 'All', 'Both',
        'Each', 'Few', 'More', 'Most', 'Other', 'Some', 'Such', 'No', 'Nor', 'Not', 'Only',
        'Own', 'Same', 'So', 'Than', 'Too', 'Very', 'Can', 'Will', 'Just', 'Should', 'Now',
        'Our', 'We', 'They', 'He', 'She', 'It', 'I', 'You', 'Your', 'Their', 'His', 'Her',
        'Its', 'My', 'This', 'That', 'These', 'Those', 'What', 'Which', 'Who', 'Whom',
        # Business terms
        'CEO', 'CTO', 'CFO', 'COO', 'VP', 'Director', 'Manager', 'President', 'Chief',
        'Senior', 'Junior', 'Lead', 'Head', 'Executive', 'Officer', 'Team', 'Company',
        'Business', 'Product', 'Service', 'Platform', 'Technology', 'Software', 'Hardware',
        'System', 'Solution', 'Tool', 'Application', 'App', 'Website', 'Site', 'Network',
        'Digital', 'Online', 'Mobile', 'Cloud', 'Data', 'AI', 'ML', 'Analytics',
        # Common tech terms
        'API', 'SDK', 'SaaS', 'PaaS', 'IaaS', 'IoT', 'VR', 'AR', 'XR', 'B2B', 'B2C',
        'B2G', 'SEO', 'SEM', 'CRM', 'ERP', 'CMS', 'SQL', 'NoSQL', 'AWS', 'Azure', 'GCP',
        # Places (don't replace)
        'Austin', 'Dallas', 'Houston', 'Texas', 'California', 'York', 'America', 'US',
        'USA', 'United', 'States', 'San', 'Francisco', 'Los', 'Angeles', 'Seattle',
        'Boston', 'Chicago', 'Denver', 'Atlanta', 'Miami', 'Phoenix', 'Portland',
        # Generic words
        'First', 'Last', 'Next', 'New', 'Old', 'Good', 'Better', 'Best', 'Great',
        'Leading', 'Top', 'World', 'Global', 'International', 'National', 'Local',
        'Enterprise', 'Consumer', 'Commercial', 'Industrial', 'Professional',
        'Advanced', 'Modern', 'Smart', 'Innovative', 'Revolutionary', 'Cutting',
        'Edge', 'State', 'Art', 'Industry', 'Market', 'Sector', 'Space', 'Field',
        'Area', 'Domain', 'Vertical', 'Horizontal', 'End', 'User', 'Customer',
        'Client', 'Partner', 'Vendor', 'Provider', 'Supplier', 'Developer',
        # Time/measure
        'Year', 'Years', 'Month', 'Months', 'Day', 'Days', 'Week', 'Weeks',
        'January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December',
        'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
        # Misc
        'Dr', 'Mr', 'Ms', 'Mrs', 'Prof', 'Inc', 'LLC', 'Ltd', 'Corp', 'Co'
    }

    def should_anonymize_word(word):
        """Determine if a capitalized word should be anonymized."""
        # Don't replace common words
        if word in common_words:
            return False

        # Don't replace if it's just a number
        if word.isdigit():
            return False

        # Don't replace very short words (likely acronyms we want to keep)
        if len(word) <= 2:
            return False

        # Don't replace if it starts with lowercase (shouldn't happen but safety check)
        if not word[0].isupper():
            return False

        # Anonymize if:
        # 1. It's CamelCase (e.g., "CodeWP", "WordPress", "DataViz")
        if re.match(r'^[A-Z][a-z]*[A-Z]', word):
            return True

        # 2. It's a capitalized word that's not in our common list and looks like a proper noun
        # (starts with capital, has lowercase letters)
        # BUT: Don't anonymize if it's likely a common word at start of sentence
        if re.match(r'^[A-Z][a-z]+$', word) and len(word) >= 4:
            # List of common words that might start sentences but shouldn't be anonymized
            sentence_starters = {
                'Following', 'Often', 'Despite', 'Instead', 'Thus', 'Based', 'Additionally',
                'However', 'Therefore', 'Furthermore', 'Moreover', 'Meanwhile', 'Currently',
                'Recently', 'Finally', 'Initially', 'Generally', 'Typically', 'Essentially',
                'Specifically', 'Particularly', 'Notably', 'Importantly', 'Fortunately',
                'Unfortunately', 'Existing', 'Since', 'While', 'Although', 'Because',
                'Through', 'During', 'After', 'Before', 'Within', 'Without', 'Beyond',
                'Americans', 'People', 'Users', 'Customers', 'Clients', 'Companies',
                'Businesses', 'Organizations', 'Individuals', 'Teams', 'Members',
                'Force', 'Navy', 'Army', 'Marines', 'Coast', 'Guard', 'Founded'
            }
            if word in sentence_starters:
                return False

            return True

        return False

    # Find all capitalized words and decide which to anonymize
    words = re.findall(r'\b[A-Z][a-zA-Z0-9]*\b', text)
    unique_proper_nouns = set()

    for word in words:
        if should_anonymize_word(word):
            unique_proper_nouns.add(word)

    # Common first and last names for randomization
    random_first_names = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Drew', 'Quinn', 'Blake', 'Parker']
    random_last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson']

    # Replace proper nouns with generic placeholders or random names
    for proper_noun in unique_proper_nouns:
        # Check if this word appears after a title (likely a person's name)
        title_pattern = r'\b(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s+' + re.escape(proper_noun) + r'\b'
        if re.search(title_pattern, text):
            # Replace with a random name
            random_name = random.choice(random_first_names if len(proper_noun) < 8 else random_last_names)
            text = re.sub(r'\b' + re.escape(proper_noun) + r'\b', random_name, text)
        else:
            # Replace with [Product] for company/product names
            text = re.sub(r'\b' + re.escape(proper_noun) + r'\b', '[Product]', text)

    # Randomize amounts, dates, and funding rounds
    text = randomize_amount(text)
    text = randomize_dates(text)
    text = randomize_funding_round(text)

    return text

def anonymize_csv(input_file, output_file):
    """Anonymize portfolio companies CSV."""

    # First pass: collect distributions
    with open(input_file, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)

        locations = []
        stages = []
        sales_models = []

        for row in reader:
            if row.get('Location'):
                locations.append(row['Location'])
            if row.get('Stage'):
                stages.append(row['Stage'])
            if row.get('Sales Model'):
                sales_models.append(row['Sales Model'])

    # Create shuffled lists to preserve distributions
    random.shuffle(locations)
    random.shuffle(stages)
    random.shuffle(sales_models)

    # Second pass: anonymize
    used_names = set()

    with open(input_file, 'r', encoding='utf-8-sig') as infile:
        reader = csv.DictReader(infile)
        fieldnames = reader.fieldnames
        rows = []

        loc_index = 0
        stage_index = 0
        sales_index = 0

        for row in reader:
            original_name = row.get('Name', '')

            # Generate new company name
            new_base_name = generate_company_name(used_names)
            suffix = preserve_suffix(original_name)
            new_name = f"{new_base_name}, {suffix}" if suffix else new_base_name

            row['Name'] = new_name

            # Generate new URLs
            slug = normalize_to_slug(new_name)
            new_website = f"https://{slug}.example"
            row['Website'] = new_website
            row['Pitch'] = f"https://pitch.vc/companies/{slug}"

            # Anonymize description (after generating new website)
            if 'Description' in row:
                row['Description'] = anonymize_description(row['Description'], original_name, new_name, new_website)

            # Randomize Location (preserving distribution)
            if 'Location' in row and locations and loc_index < len(locations):
                row['Location'] = locations[loc_index]
                loc_index += 1

            # Randomize Stage (preserving distribution)
            if 'Stage' in row and stages and stage_index < len(stages):
                row['Stage'] = stages[stage_index]
                stage_index += 1

            # Randomize Sales Model (preserving distribution)
            if 'Sales Model' in row and sales_models and sales_index < len(sales_models):
                row['Sales Model'] = sales_models[sales_index]
                sales_index += 1

            rows.append(row)

    # Write anonymized data
    with open(output_file, 'w', encoding='utf-8', newline='') as outfile:
        writer = csv.DictWriter(outfile, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    print(f"✓ Anonymized {len(rows)} companies")
    print(f"✓ Generated {len(used_names)} unique company names")
    print(f"✓ Output written to: {output_file}")

if __name__ == '__main__':
    input_file = 'portfolio_companies_orig.csv'
    output_file = 'portfolio_companies.csv'

    print("Starting anonymization of portfolio companies...")
    anonymize_csv(input_file, output_file)
    print("Done!")

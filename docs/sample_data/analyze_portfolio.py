#!/usr/bin/env python3
import csv
from collections import Counter

with open('portfolio_companies_orig.csv', 'r', encoding='utf-8-sig') as f:
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

    print("=== LOCATIONS ===")
    for loc, count in Counter(locations).most_common(20):
        print(f"{loc}: {count}")

    print("\n=== STAGES ===")
    for stage, count in Counter(stages).most_common():
        print(f"{stage}: {count}")

    print("\n=== SALES MODELS ===")
    for sm, count in Counter(sales_models).most_common():
        print(f"{sm}: {count}")

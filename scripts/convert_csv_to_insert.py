#!/usr/bin/env python3
"""
Script to convert CSV files to SQL INSERT statements for seed data.
This handles large CSV files with complex quoting and escaping automatically.
"""

import csv
import sys
import os
from pathlib import Path

def convert_csv_to_insert(csv_file_path, table_name, output_file_path=None):
    """
    Convert CSV file to SQL INSERT statements.

    Args:
        csv_file_path: Path to the CSV file
        table_name: Name of the table to insert into
        output_file_path: Optional path for output SQL file
    """
    csv_path = Path(csv_file_path)

    # Read the CSV file
    with open(csv_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)

        # Get column names from header
        columns = reader.fieldnames
        if not columns:
            print(f"Error: No columns found in {csv_file_path}")
            return

        # Generate INSERT statements
        insert_statements = []
        for row_num, row in enumerate(reader, start=2):  # Start at 2 because row 1 is header
            # Convert row values to SQL format
            values = []
            for col in columns:
                value = row[col]
                if value is None or value == '':
                    values.append('NULL')
                else:
                    # Escape single quotes and wrap in quotes for non-NULL values
                    escaped_value = value.replace("'", "''")
                    values.append(f"'{escaped_value}'")

            # Create INSERT statement
            columns_str = ', '.join(columns)
            values_str = ', '.join(values)
            insert_sql = f"INSERT INTO {table_name} ({columns_str}) VALUES ({values_str});"
            insert_statements.append(insert_sql)

    # Write to output file or stdout
    if output_file_path:
        output_path = Path(output_file_path)
        with open(output_path, 'w', encoding='utf-8') as sql_file:
            sql_file.write(f"-- Auto-generated INSERT statements from {csv_path.name}\n")
            sql_file.write(f"-- Converted {len(insert_statements)} rows\n\n")
            sql_file.write('\n'.join(insert_statements))
        print(f"Generated {len(insert_statements)} INSERT statements in {output_path}")
    else:
        print(f"-- Auto-generated INSERT statements from {csv_path.name}")
        print(f"-- Converted {len(insert_statements)} rows")
        print()
        print('\n'.join(insert_statements))

    return insert_statements

def main():
    if len(sys.argv) < 3:
        print("Usage: python convert_csv_to_insert.py <csv_file> <table_name> [output_file]")
        print("Example: python convert_csv_to_insert.py data/mentors.csv raw_mentors")
        print("Example: python convert_csv_to_insert.py data/mentors.csv raw_mentors mentors_inserts.sql")
        sys.exit(1)

    csv_file = sys.argv[1]
    table_name = sys.argv[2]
    output_file = sys.argv[3] if len(sys.argv) > 3 else None

    if not os.path.exists(csv_file):
        print(f"Error: CSV file '{csv_file}' not found")
        sys.exit(1)

    try:
        convert_csv_to_insert(csv_file, table_name, output_file)
    except Exception as e:
        print(f"Error converting CSV: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()

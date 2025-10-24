#!/bin/bash

# Fix action names back to what claude-test actually expects

echo "Fixing action names in test files..."
echo "==================================="

TEST_DIR="puppeteer-tests/functional"

# Function to fix a single file
fix_file() {
    local file=$1
    echo "Fixing: $(basename $file)"
    
    # Create a temporary file
    local temp_file="${file}.tmp"
    
    # Change navigate back to goto
    sed 's/"action": "navigate"/"action": "goto"/g' "$file" > "$temp_file"
    
    # Move temp file back
    mv "$temp_file" "$file"
}

# Fix all .test.json files
for test_file in $TEST_DIR/*.test.json; do
    if [ -f "$test_file" ]; then
        fix_file "$test_file"
    fi
done

echo ""
echo "✅ Action names fixed!"
echo ""
echo "Changed:"
echo "- 'navigate' → 'goto'"
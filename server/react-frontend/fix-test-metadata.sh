#!/bin/bash

# Fix test metadata that was incorrectly changed

echo "Fixing test metadata..."
echo "====================="

TEST_DIR="puppeteer-tests/functional"

# Function to fix a single file
fix_file() {
    local file=$1
    echo "Fixing: $(basename $file)"
    
    # Create a temporary file
    local temp_file="${file}.tmp"
    
    # First, read the file and check if it starts with "filename" instead of "name"
    if grep -q '^  "filename":' "$file"; then
        # Fix the root level "filename" back to "name"
        sed '1,3s/"filename":/"name":/' "$file" > "$temp_file"
        mv "$temp_file" "$file"
    fi
    
    # Also fix any assert variable fields that were incorrectly changed
    if grep -q '"assert".*"filename":' "$file"; then
        sed '/"assert":/,/}/s/"filename":/"name":/' "$file" > "$temp_file"
        mv "$temp_file" "$file"
    fi
}

# Fix all .test.json files
for test_file in $TEST_DIR/*.test.json; do
    if [ -f "$test_file" ]; then
        fix_file "$test_file"
    fi
done

echo ""
echo "✅ Test metadata fixed!"
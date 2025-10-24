#!/bin/bash

# Update all test files to use claude-test v0.1.0 syntax

echo "Updating test files to claude-test v0.1.0 syntax..."
echo "================================================="

TEST_DIR="puppeteer-tests/functional"

# Function to update a single file
update_file() {
    local file=$1
    echo "Updating: $(basename $file)"
    
    # Create a temporary file
    local temp_file="${file}.tmp"
    
    # Replace old syntax with new syntax
    sed -e 's/"action": "goto"/"action": "navigate"/g' \
        -e 's/"name": \(".*"\)/"filename": \1/g' \
        -e 's/"saveAs": \(".*"\)/"store": \1/g' \
        "$file" > "$temp_file"
    
    # Move temp file back
    mv "$temp_file" "$file"
}

# Update all .test.json files
for test_file in $TEST_DIR/*.test.json; do
    if [ -f "$test_file" ]; then
        update_file "$test_file"
    fi
done

echo ""
echo "✅ All test files updated!"
echo ""
echo "Summary of changes:"
echo "- 'goto' action → 'navigate'"
echo "- 'name' field → 'filename' (for screenshots)"
echo "- 'saveAs' field → 'store' (for evaluate)"
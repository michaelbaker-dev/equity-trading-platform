#!/bin/bash

# Simple test to verify claude-test is working

echo "Testing claude-test framework..."
echo "==============================="
echo ""

# Test 1: Check if claude-test is available
echo "1. Checking if claude-test is available..."
if command -v claude-test &> /dev/null; then
    echo "✅ claude-test command found"
else
    echo "❌ claude-test command not found"
    exit 1
fi

# Test 2: Show help
echo ""
echo "2. Getting claude-test help..."
claude-test help

# Test 3: Run simple framework test
echo ""
echo "3. Running simple framework test..."
claude-test run puppeteer-tests/functional/simple-framework-test.json --headed

# Test 4: Run framework verification test
echo ""
echo "4. Running framework verification test..."
claude-test run puppeteer-tests/functional/00-verify-framework.test.json --headed

echo ""
echo "Test complete!"
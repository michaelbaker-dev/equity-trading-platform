#!/bin/bash

echo "🚀 Equity Trading Platform - GitHub Push Helper"
echo "=============================================="
echo ""

# Check if we're in a git repository
if [ ! -d .git ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check git status
echo "📊 Current Git Status:"
git status --porcelain
if [ $? -eq 0 ] && [ -z "$(git status --porcelain)" ]; then
    echo "✅ Working tree is clean - all changes are committed"
else
    echo "⚠️  Warning: There are uncommitted changes"
fi

echo ""
echo "📋 Commit History:"
git log --oneline
echo ""

# Check for remote
if git remote | grep -q origin; then
    echo "🌐 Remote repository configured:"
    git remote -v
    echo ""
    echo "🚀 Ready to push! Run: git push -u origin main"
else
    echo "⚠️  No remote repository configured yet."
    echo ""
    echo "📝 Next steps:"
    echo "1. Create a new repository on GitHub"
    echo "2. Copy the repository URL (e.g., https://github.com/username/repo.git)"
    echo "3. Run: git remote add origin <your-repo-url>"
    echo "4. Run: git push -u origin main"
fi

echo ""
echo "📁 Repository Summary:"
echo "- Total commits: $(git rev-list --count HEAD)"
echo "- Total files: $(find . -type f ! -path './.git/*' ! -path './node_modules/*' | wc -l | tr -d ' ')"
echo "- Code lines: $(find . -name '*.go' -o -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo 'N/A')"
echo ""
echo "✨ Ready for GitHub!"
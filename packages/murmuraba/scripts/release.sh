#!/bin/bash

# Murmuraba Release Script
# This script runs lint, tests with coverage, bumps version and publishes to npm
# Only proceeds if all quality checks pass

set -e  # Exit on any error

echo "🚀 Starting Murmuraba Release Process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
        exit 1
    fi
}

# 1. Run lint check
echo -e "\n${YELLOW}📝 Running lint check...${NC}"
npm run lint
print_status $? "Lint check passed"

# 2. Run tests with coverage
echo -e "\n${YELLOW}🧪 Running tests with coverage...${NC}"
npm test -- --coverage

# Check coverage thresholds
COVERAGE_RESULT=$?
if [ $COVERAGE_RESULT -ne 0 ]; then
    echo -e "${RED}✗ Tests failed or coverage thresholds not met${NC}"
    echo -e "${RED}Required: 95% coverage for MurmurabaEngine API${NC}"
    exit 1
fi
print_status 0 "Tests passed with required coverage"

# 3. Build the package
echo -e "\n${YELLOW}🔨 Building package...${NC}"
npm run build
print_status $? "Build completed successfully"

# 4. Check if there are uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo -e "${RED}✗ There are uncommitted changes. Please commit them first.${NC}"
    exit 1
fi
print_status 0 "Working directory is clean"

# 5. Bump version
echo -e "\n${YELLOW}📦 Bumping version...${NC}"
echo "Current version: $(node -p "require('./package.json').version")"
echo "Select version bump type:"
echo "1) patch (x.x.X)"
echo "2) minor (x.X.0)"
echo "3) major (X.0.0)"
read -p "Enter choice (1-3): " VERSION_TYPE

case $VERSION_TYPE in
    1) npm version patch --no-git-tag-version ;;
    2) npm version minor --no-git-tag-version ;;
    3) npm version major --no-git-tag-version ;;
    *) echo -e "${RED}Invalid choice${NC}"; exit 1 ;;
esac

NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✓ Version bumped to $NEW_VERSION${NC}"

# 6. Commit version bump
echo -e "\n${YELLOW}💾 Committing version bump...${NC}"
git add package.json
git commit -m "chore: bump version to $NEW_VERSION"
print_status $? "Version bump committed"

# 7. Create git tag
echo -e "\n${YELLOW}🏷️  Creating git tag...${NC}"
git tag "v$NEW_VERSION"
print_status $? "Git tag created: v$NEW_VERSION"

# 8. Publish to npm
echo -e "\n${YELLOW}📤 Publishing to npm...${NC}"
npm publish
print_status $? "Published to npm successfully"

# 9. Push to git
echo -e "\n${YELLOW}📡 Pushing to git...${NC}"
git push && git push --tags
print_status $? "Pushed to git with tags"

echo -e "\n${GREEN}🎉 Release completed successfully!${NC}"
echo -e "${GREEN}Published version: $NEW_VERSION${NC}"
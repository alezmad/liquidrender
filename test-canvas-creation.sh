#!/bin/bash

# Test Canvas Creation End-to-End
# This script tests the complete onboarding flow and verifies canvas creation

set -e

BASE_URL="http://localhost:3000"
DB_URL="postgresql://turbostarter:turbostarter@localhost:5440/core"

echo "==================================="
echo "Canvas Creation End-to-End Test"
echo "==================================="
echo ""

# Step 1: Clean existing Knosia data
echo "📦 Step 1: Cleaning existing test data..."
cd /Users/agutierrez/Desktop/liquidrender/packages/db
DATABASE_URL="$DB_URL" npx tsx src/scripts/clean-knosia-data.ts 2>&1 | grep -E "(✅|Cleaning)"
echo ""

# Step 2: Verify database connection
echo "🔌 Step 2: Verifying database..."
PGPASSWORD=turbostarter psql -h localhost -p 5440 -U turbostarter -d core -c "SELECT 'Database connected: ' || current_database() || ' (user: ' || current_user || ')' as status;" -t
echo ""

# Step 3: Check dev server
echo "🌐 Step 3: Checking dev server..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Dev server is running on http://localhost:3000"
else
    echo "❌ Dev server is NOT running"
    exit 1
fi
echo ""

# Step 4: Verify auth users
echo "👤 Step 4: Verifying auth users..."
USER_COUNT=$(PGPASSWORD=turbostarter psql -h localhost -p 5440 -U turbostarter -d core -t -c "SELECT COUNT(*) FROM \"user\";")
echo "✅ Found $USER_COUNT users in database"
echo ""

# Step 5: Get organization ID
echo "🏢 Step 5: Getting organization ID..."
ORG_ID=$(PGPASSWORD=turbostarter psql -h localhost -p 5440 -U turbostarter -d core -t -c "SELECT id FROM organization LIMIT 1;" | xargs)
if [ -z "$ORG_ID" ]; then
    echo "⚠️  No organization found, creating one..."
    ORG_ID=$(uuidgen | tr '[:upper:]' '[:lower:]' | tr -d '-' | cut -c1-32)
    PGPASSWORD=turbostarter psql -h localhost -p 5440 -U turbostarter -d core -c "INSERT INTO organization (id, name, slug, created_at) VALUES ('$ORG_ID', 'Test Org', 'test-org-$(date +%s)', NOW());"
    echo "✅ Created organization: $ORG_ID"
else
    echo "✅ Using existing organization: $ORG_ID"
fi
echo ""

echo "==================================="
echo "Manual Testing Steps:"
echo "==================================="
echo ""
echo "1. Open browser: $BASE_URL/auth/login"
echo ""
echo "2. Login with:"
echo "   Email:    me+user@turbostarter.dev"
echo "   Password: Pa\$\$w0rd"
echo ""
echo "3. Navigate to: $BASE_URL/onboarding/connect"
echo ""
echo "4. Create a database connection:"
echo "   Type:     postgres"
echo "   Host:     localhost"
echo "   Port:     5440"
echo "   Database: core"
echo "   Username: turbostarter"
echo "   Password: turbostarter"
echo "   Schema:   public"
echo ""
echo "5. Click 'Test Connection' and wait for success"
echo ""
echo "6. Click 'Create Connection & Continue'"
echo ""
echo "7. Wait for analysis to complete (watch for progress)"
echo ""
echo "8. After analysis completes, run this to verify:"
echo ""
echo "   # Check analysis created"
echo "   PGPASSWORD=turbostarter psql -h localhost -p 5440 -U turbostarter -d core -c \\"
echo "     \"SELECT id, workspace_id, status, created_at FROM knosia_analysis ORDER BY created_at DESC LIMIT 1;\""
echo ""
echo "   # Check canvas created"
echo "   PGPASSWORD=turbostarter psql -h localhost -p 5440 -U turbostarter -d core -c \\"
echo "     \"SELECT id, name, workspace_id, status, created_at FROM knosia_workspace_canvas ORDER BY created_at DESC LIMIT 1;\""
echo ""
echo "==================================="
echo "Automated Verification Script"
echo "==================================="
echo ""
echo "Run this after completing onboarding:"
echo ""
cat > /tmp/verify-canvas.sh << 'VERIFY_EOF'
#!/bin/bash
DB_URL="postgresql://turbostarter:turbostarter@localhost:5440/core"

echo "==================================="
echo "Canvas Creation Verification"
echo "==================================="
echo ""

echo "📊 Analysis Record:"
PGPASSWORD=turbostarter psql -h localhost -p 5440 -U turbostarter -d core -c \
  "SELECT
    id,
    CASE WHEN workspace_id IS NULL THEN '❌ NULL' ELSE '✅ ' || workspace_id END as workspace_id,
    status,
    created_at
  FROM knosia_analysis
  ORDER BY created_at DESC
  LIMIT 1;"

echo ""
echo "🎨 Canvas Record:"
CANVAS_COUNT=$(PGPASSWORD=turbostarter psql -h localhost -p 5440 -U turbostarter -d core -t -c "SELECT COUNT(*) FROM knosia_workspace_canvas;")
if [ "$CANVAS_COUNT" -gt 0 ]; then
    PGPASSWORD=turbostarter psql -h localhost -p 5440 -U turbostarter -d core -c \
      "SELECT id, name, workspace_id, status, created_at FROM knosia_workspace_canvas ORDER BY created_at DESC LIMIT 1;"
    echo ""
    echo "✅ SUCCESS: Canvas was created!"
else
    echo "❌ FAILED: No canvas found in database"
    echo ""
    echo "Checking why canvas wasn't created:"
    PGPASSWORD=turbostarter psql -h localhost -p 5440 -U turbostarter -d core -c \
      "SELECT
        CASE WHEN workspace_id IS NULL THEN '❌ workspace_id is NULL' ELSE '✅ workspace_id present' END as check1,
        CASE WHEN status = 'completed' THEN '✅ analysis completed' ELSE '❌ analysis status: ' || status END as check2
      FROM knosia_analysis
      ORDER BY created_at DESC
      LIMIT 1;"
fi
VERIFY_EOF

chmod +x /tmp/verify-canvas.sh

echo "bash /tmp/verify-canvas.sh"
echo ""
echo "==================================="
echo "Environment Ready!"
echo "==================================="
echo ""
echo "Organization ID: $ORG_ID"
echo "Database:        $DB_URL"
echo "Web App:         $BASE_URL"
echo ""
echo "Start testing now! 🚀"
